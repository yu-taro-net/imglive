// ==========================================
// ⚙️ 1. ゲーム全体の共通設定
// ==========================================
const GAME_SETTINGS = {
    WALK_SPEED: 5,  // ← ここを 10 にすれば足が速くなる
    GRAVITY: 0.5,
    JUMP_POWER: -15, // ← ここを -20 にすれば高く跳べる
    ATTACK_RANGE: 100,
	LADDER_SPEED: 3  // 🌟 これを追加！
};

// ==========================================
// 📡 1. 通信と基本設定
// ==========================================
// game.js の 1行目あたり
const socket = io({
    reconnection: true,        // 自動再接続を有効にする
    reconnectionAttempts: 5,   // 5回まで頑張る
    timeout: 10000             // 10秒待ってみる
});

class Player {
  constructor(name = "") {
    this.x = 50;
    this.y = 540;
    this.dy = 0;
    this.dir = 1;
    this.hp = 100;
    this.name = name;
    this.chat = null;
    this.jumping = true;
    this.isAttacking = 0;
    this.attackStartFrame = -999;
    this.invincible = 0;
    this.score = 0;
    this.inventory = [];
  }

  // 移動のロジックをここに持たせる
  move(vx) {
    this.x += vx;
    if (vx > 0) this.dir = 1;
    if (vx < 0) this.dir = -1;
  }
  
  // 🌟 追加：位置を一気に更新するメソッド
  updatePosition(dx, dy) {
    this.x += dx;
    this.y += dy;
    // 向きの更新もついでにやってしまう
    if (dx > 0) this.dir = 1;
    if (dx < 0) this.dir = -1;
  }

  // ダメージを受ける処理もここに
  receiveDamage(amount) {
    if (this.invincible > 0) return;
    this.hp -= amount;
    this.invincible = 60; // 1秒間無敵など
  }
}

// 自分のキャラをインスタンス化
let hero = new Player("なまえ");

// ==========================================
// 🌍 3. 世界の状態（他のプレイヤー・敵・マップ）
// ==========================================
let others = {};      // 他のプレイヤーたち
let enemies = [];     // 敵キャラクターのリスト
let items = [];       // 落ちているアイテムのリスト
let platforms = [];   // 足場のデータ
let ladders = [];     // 梯子（ハシゴ）のデータ
let damageTexts = []; // 画面に表示するダメージ数字のリスト

// ==========================================
// 🕹️ 4. 操作・システム用の管理変数
// ==========================================
window.keys = {};        // 🌟 押されているキーの状態を保存（windowを付けて全体で共有）
let frame = 0;           // ゲーム開始からの経過時間（フレーム数）
let zKeyPressed = false; // 攻撃ボタン(ZやX)の連続押し防止
let cKeyPressed = false; // ✨ ジャンプボタン(C)の連続押し防止
let ladderJumpTimer = 0; // 梯子からジャンプした直後に、すぐ梯子を掴まないためのタイマー

socket.on('state', s => {
  enemies = s.enemies; 
  others = s.players; 
  platforms = s.platforms; 
  ladders = s.ladders;
  items = s.items.map(si => { 
      const existing = items.find(it => it.id === si.id); 
      return existing ? existing : si; 
  });
  
  // 🌟 自分のデータを最新状態に「完全同期」させる
  const myData = s.players[socket.id];
  if (myData) {
      // 既存のデータ
      hero.inventory = myData.inventory || [];
      hero.score = myData.score || 0;

      // 🌟 ここが「たまらない」を直す重要ポイント！
      // サーバーの最新値を強制的にheroに上書きします
      hero.level = myData.level;
      hero.exp = myData.exp;
      hero.maxExp = myData.maxExp || 100;

      // HPなども同期しておくと、より安定します
      hero.hp = myData.hp;
  }
  delete others[socket.id];
});

socket.on('damage_effect', data => {
  damageTexts.push({ x: data.x + (Math.random()*20-10), y: data.y, val: data.val, timer: 40, vy: data.type === 'player_hit' ? -3 : -2, isCritical: data.isCritical, type: data.type });
});

// 🌟 修正後
window.onkeydown = e => window.keys[e.code] = true;
window.onkeyup = e => window.keys[e.code] = false;

const chatIn = document.getElementById('chat-in');
const msgBox = document.getElementById('msg-box');

chatIn.onkeydown = e => {
  if (e.key === 'Enter' && chatIn.value.trim() !== '') {
    socket.emit('chat', chatIn.value);
    chatIn.value = ''; chatIn.blur();
  }
};

socket.on('chat', data => {
  const div = document.createElement('div');
  div.innerHTML = `<strong style="color:#60a5fa">${data.name}:</strong> ${data.text}`;
  msgBox.appendChild(div);
  msgBox.scrollTop = msgBox.scrollHeight;
  const chatData = { text: data.text, timer: 120 };
  if (data.id === socket.id) hero.chat = chatData;
  else if (others[data.id]) others[data.id].chat = chatData;
});

function attack() {
  if (hero.climbing) return; // 🌟 ハシゴ中なら、ここで処理を強制終了する
  if (hero.isAttacking > 0) return; // 連続攻撃防止
  hero.isAttacking = 18; 
  hero.attackStartFrame = frame;   // 🌟 ここで「今」の時間を刻印！
  socket.emit('move', hero);       // 🌟 刻印した瞬間のデータを全員に送る
}

// ==========================================
// ⌨️ キーボード操作を受け付ける専用の関数
// ==========================================
function handlePlayerInput(hero, items, ladders, chatIn) {
    // A. チャット入力中は操作を無効化
    if (document.activeElement === chatIn) return;

    // B. 伏せ判定（地面にいて、ハシゴ中でなく、下キー）
    hero.isDown = (!hero.climbing && !hero.jumping && (keys['KeyS'] || keys['ArrowDown']));

    // C. 左右移動（ハシゴ中・伏せ中でない時）
if (!hero.climbing && !hero.isDown) {
    if (keys['ArrowLeft']) {
        // 🌟 修正：メソッドを使って「左に歩け」と命令する
        hero.updatePosition(-GAME_SETTINGS.WALK_SPEED, 0);
        hero.vx = -GAME_SETTINGS.WALK_SPEED; 
    } else if (keys['ArrowRight']) {
        // 🌟 修正：メソッドを使って「右に歩け」と命令する
        hero.updatePosition(GAME_SETTINGS.WALK_SPEED, 0);
        hero.vx = GAME_SETTINGS.WALK_SPEED; 
    } else {
        hero.vx = 0;
    }
} else {
    hero.vx = 0;
}

    // D. 🪜 ハシゴ操作
    const l = (ladders && ladders.length > 0) ? ladders[0] : null;
    let isTouchingLadder = false;
    if (l) {
        const distX = Math.abs((hero.x + 30) - (l.x + 15));
        const isInsideY = (hero.y + 60 > l.y1 && hero.y < l.y2);
        if (distX < 20 && isInsideY) isTouchingLadder = true;
    }

    // ハシゴのてっぺんにいるかどうかの判定
const isAtLadderTop = (() => {
    if (!l) return false; // ハシゴ(l)が存在しない場合は判定しない

    // 1. 左右の位置チェック（ハシゴの真横にいるか）
    // hero.x + 30 はプレイヤーの中心付近、l.x + 15 はハシゴの中心付近を指します
    const horizontalDiff = Math.abs((hero.x + 30) - (l.x + 15));
    const isHorizontalClose = horizontalDiff < 30; // 30ピクセル以内ならOK

    // 2. 上下の位置チェック（ハシゴの一番上の横棒 l.y1 と足元の高さが合っているか）
    // hero.y + 60 はプレイヤーの足元の高さを指します
    const verticalDiff = Math.abs((hero.y + 60) - l.y1);
    const isVerticalAtTop = verticalDiff < 20; // 20ピクセル以内ならOK

    // 左右も上下も位置が合っていれば「ハシゴのてっぺんにいる」とみなす
    return isHorizontalClose && isVerticalAtTop;
})();

    // ハシゴに触れている、またはハシゴの降り口にいる、かつジャンプ直後ではない場合
if ((isTouchingLadder || isAtLadderTop) && ladderJumpTimer === 0) {

    // 【1. 登り・降りの開始判定】
    // 上下キーのいずれかが押されたらハシゴモードに入る
    if (keys['KeyW'] || keys['ArrowUp'] || keys['KeyS'] || keys['ArrowDown']) {
        
        // 特殊判定：ハシゴのてっぺん(地面)で「下」を押した場合
        // 少しだけ座標を下に下げて、ハシゴに掴まった状態に移行させる
        if (!hero.climbing && (keys['KeyS'] || keys['ArrowDown']) && isAtLadderTop) {
            hero.y += 15;
        }

        // 【2. ハシゴへの吸着と固定】
        hero.x = l.x + 15 - 30; // プレイヤーの横位置をハシゴの中心にピッタリ合わせる
        hero.climbing = true;   // ハシゴ登り中フラグをON
        hero.dy = 0;            // 縦の加速度をリセット（重力で落ちないように）
        hero.jumping = false;   // ジャンプ状態を解除

        // 【3. 実際の移動処理】
        if (keys['KeyW'] || keys['ArrowUp']) {
            hero.y -= GAME_SETTINGS.LADDER_SPEED; // 上へ移動
        } else if (keys['KeyS'] || keys['ArrowDown']) {
            hero.y += GAME_SETTINGS.LADDER_SPEED; // 下へ移動
        }

    } else if (hero.climbing) {
        // キーを離しているがハシゴに掴まっている状態
        // その場でピタッと止まるように速度を0にする
        hero.dy = 0;
    }

} else {
    // ハシゴから離れた、またはジャンプして飛び出した場合
    hero.climbing = false;
}

    // E. ジャンプ (Cキー)
    if (keys['KeyC']) {
        if (hero.climbing) {
            if (!cKeyPressed && (keys['ArrowLeft'] || keys['ArrowRight'])) {
                if (typeof playJumpSound === 'function') playJumpSound();
                ladderJumpTimer = 15;
                if (keys['ArrowLeft']) { hero.x -= 25; hero.dir = -1; }
                else { hero.x += 25; hero.dir = 1; }
                hero.dy = GAME_SETTINGS.JUMP_POWER;
                hero.jumping = true;
                hero.jumpFrame = 0; // 🌟 追加：ハシゴからのジャンプリセット
                hero.climbing = false;
                cKeyPressed = true;
            }
        } else if (!hero.jumping && !cKeyPressed) {
            if (typeof playJumpSound === 'function') playJumpSound();
            hero.y -= 5;
            hero.dy = GAME_SETTINGS.JUMP_POWER;
            hero.jumping = true;
            hero.jumpFrame = 0; // 🌟 追加：地面からのジャンプリセット
            cKeyPressed = true;
        }
    } else {
        cKeyPressed = false;
    }

    // --- E. 攻撃(Xキー) ---
    if (keys['KeyX']) {
      // 🌟 修正ポイント：条件に「!hero.climbing」を確実に含める
      // これにより、ハシゴ中（climbing === true）は攻撃が発動しなくなります
      if (hero.isAttacking === 0 && !zKeyPressed && !hero.climbing) { 
        attack(); // 攻撃実行
        hero.isAttacking = 20; 
        hero.attackStartFrame = frame;
        zKeyPressed = true;
      }
    } else {
      zKeyPressed = false; 
    }

    // G. アイテム取得 (Zキー)
    if (keys['KeyZ']) {
        if (!zKeyPressed) {
            const target = items.find(it => {
                const d = Math.sqrt(Math.pow(hero.x + 30 - (it.x + 15), 2) + Math.pow(hero.y + 30 - (it.y + 15), 2));
                return d < 45;
            });
            if (target) {
                socket.emit('pickup', target.id);
                hero.inventory.push(target.type);
                if (typeof playItemSound === 'function') playItemSound();
            }
            zKeyPressed = true;
        }
    } else {
        zKeyPressed = false;
    }
}

/**
 * ゲームのメインループ（1秒間に約60回実行される心臓部）
 */
// ==========================================
// 🔄 ゲームループのメイン処理
// ==========================================
function update() {

  // 🌟 1. チャット入力中はすべての処理をスキップ
  /*
  if (document.activeElement === chatIn) {
    requestAnimationFrame(update); 
    return; 
  }
  */
  frame++; // フレームカウント（アニメーション同期用）

  // ==========================================
  // 2. アイテムの物理挙動
  // ==========================================
  items.forEach(item => {
    if (!item.landed) { 
      item.x += item.vx || 0; 
      item.y += item.vy || 0; 
      item.vy = (item.vy || 0) + 0.4; // 重力
      item.vx *= 0.98; // 空気抵抗

      // 地面着地
      if (item.y > 570) { 
        item.y = 570; 
        item.landed = true; 
      }

      // 足場着地
      platforms.forEach(p => {
        if (item.vy > 0 && 
            item.x + 15 > p.x && item.x < p.x + p.w && 
            item.y + 30 >= p.y && item.y + 30 <= p.y + p.h) {
          item.y = p.y - 30; 
          item.landed = true;
        }
      });
    }
  });

  // ==========================================
  // 3. エフェクト・演出の更新
  // ==========================================
  // ダメージ数字
  damageTexts = damageTexts.filter(t => { 
    t.y += t.vy;   
    t.vy += 0.1;   
    t.timer--;     
    return t.timer > 0; 
  });

  // 💬 チャット吹き出しの表示時間管理
// hero.chat が存在し、かつタイマーが 0 より大きい場合のみ実行します
if (hero.chat && hero.chat.timer > 0) {
    // タイマーの数字を 1 ずつ減らします（カウントダウン）
    // 通常、1秒間に約60回実行されるので、60減ると1秒経過したことになります
    hero.chat.timer--;

    // もしタイマーが 0 になったら、メッセージを消す処理を入れることもあります
    // if (hero.chat.timer === 0) hero.chat.message = ""; 
}

  // ハシゴ再接触禁止タイマー
  if (ladderJumpTimer > 0) ladderJumpTimer--;

  // ==========================================
  // 4. ⌨️ キーボード入力の処理（外部関数化）
  // ==========================================
  handlePlayerInput(hero, items, ladders, chatIn);

  // ==========================================
// 5. 物理移動と接地判定（最終解決版）
// ==========================================
// 重力の適用（ハシゴ中は無効）
if (!hero.climbing) {
  // 以前の (typeof gravity !== 'undefined' ? gravity : 0.5) を GAME_SETTINGS に置き換えます
  hero.dy += GAME_SETTINGS.GRAVITY; 
} else {
  hero.dy = 0; 
}
hero.y += hero.dy;

  let isTouchingAnything = false; 

  // --- A. 地面(y=540)の判定 ---
  if (hero.y >= 540) {
    hero.y = 540;
    hero.dy = 0;
    isTouchingAnything = true;
  }

  // --- B. 足場の着地チェック ---
  platforms.forEach(p => {
    // キャラ画像の高さに合わせて自動計算（デフォルト60）
    const currentHeight = (hero.img && hero.img.height) ? hero.img.height : 60;

    if (!hero.climbing && hero.dy >= 0) {
      if (hero.x + 40 > p.x && hero.x + 20 < p.x + p.w) {
        // 足場の上端判定
        if (hero.y + currentHeight >= p.y - 10 && hero.y + currentHeight <= p.y + 30) {
          hero.y = p.y - currentHeight; 
          hero.dy = 0; 
          isTouchingAnything = true;
          // console.log("足場に着地しました"); 
        }
      }
    }
  });

  // --- C. ジャンプ・落下状態の確定 ---
  if (isTouchingAnything) {
    hero.jumping = false; 
    hero.dy = 0;          
    hero.jumpFrame = 0;   // 🌟 追加：地面にいたら0固定
  } 
  else if (!hero.climbing) {
    hero.jumping = true;  
    // 🌟 追加：空中にいる間だけカウントを進める
    hero.jumpFrame = (hero.jumpFrame || 0) + 1; 
  }

  // ==========================================
  // 6. 戦闘・当たり判定
  // ==========================================
  // 自分の攻撃モーション
  if (hero.isAttacking > 0) {
    hero.isAttacking--; 
    // 指定フレーム（13）でヒット判定を出す
    if (hero.isAttacking === 13) {
      applyHammerDamage(); 
    }
  }

  // 敵からの接触ダメージ判定
  if (hero.invincible > 0) {
    hero.invincible--; 
  } else {
    enemies.forEach(en => {
      if (!en.alive || en.isFading) return;
      
      // 🌟 1. 敵の見た目上のY座標（ジャンプ込み）を計算
      const enemyVisualY = en.y + (en.jumpY || 0);
      
      // 🌟 2. 攻撃アニメーションに合わせた当たり判定サイズの決定
      let hitW = en.w;
      let hitH = en.h;
      let offsetX = 0;

      // 敵が攻撃中の場合のみ、サイズを拡張する
      if (en.isAttacking > 0) {
          const atkSprites = (typeof sprites !== 'undefined') ? sprites[en.type + "Attack"] : null;
          if (atkSprites && atkSprites.length > 0) {
              // 攻撃の進捗（22から1へカウントダウン）に合わせて現在のコマを特定
              const progress = 22 - en.isAttacking;
              const img = atkSprites[Math.max(0, Math.min(progress, atkSprites.length - 1))];
              
              if (img) {
                  const s = en.scale || 1.0;
                  // 画像本来のサイズを判定サイズにする（0.2は描画倍率）
                  hitW = img.width * 0.2 * s;
                  hitH = img.height * 0.2 * s;
                  
                  // 左向き（dir: -1）の場合は、増えた幅の分だけ左側にオフセットをずらす
                  if (en.dir === -1) {
                      offsetX = -(hitW - en.w);
                  }
              }
          }
      }

      // 🌟 3. 四角形による接触判定（距離計算から、より正確な矩形判定へ変更）
      // プレイヤーのサイズを 60x60 と仮定
      const isHit = (
        hero.x < en.x + hitW + offsetX &&
        hero.x + 60 > en.x + offsetX &&
        hero.y < enemyVisualY + hitH &&
        hero.y + 60 > enemyVisualY
      );
      
      // 接触判定が成功した場合
      if (isHit) {
        const dmg = Math.floor(Math.random() * 8) + 8; 
        hero.hp -= dmg; 
        hero.invincible = 60; // 無敵時間

        // ハシゴに乗っていない時だけノックバック
        if (!hero.climbing) {
          hero.dy = -8; 
          hero.x += (hero.x < en.x) ? -30 : 30; 
        }

        socket.emit('player_damaged', { val: dmg, newHp: hero.hp }); // 🌟 newHpも送るように修正

        if (hero.hp <= 0) { // 死亡・リスポーン
          hero.hp = 100; 
          hero.x = 50; 
          hero.y = 390; 
          hero.climbing = false; 
        }
      }
    });
  }

  // ==========================================
  // 7. 同期と描画
  // ==========================================
  socket.emit('move', hero); // サーバーへ自分の位置を報告

  if (typeof drawGame === 'function') {
    drawGame(hero, others, enemies, items, platforms, ladders, damageTexts, frame);
  }

  // 🌟 エラー防止用の最終接地保証
  if (typeof isTouchingAnything !== 'undefined' && isTouchingAnything) {
    hero.jumping = false;
    hero.dy = 0;
  }

  requestAnimationFrame(update); // 次のフレームへ
}

function applyHammerDamage() {
  let targetsInRange = [];

  enemies.forEach(en => {
    if (!en.alive || en.isFading || en.hp <= 0) return;

    // 自分のハンマーの判定位置
    const hitBoxX = (hero.dir === -1) ? hero.x - 40 : hero.x + 80;
    const hitBoxY = hero.y; 

    // 🌟 大事な修正ポイント
    // 敵の「現在の高さ」をジャンプ分(jumpY)を含めて計算します
    const currentEnemyY = en.y + (en.jumpY || 0);

    // 横の距離
    const dx = hitBoxX - (en.x + en.w / 2);
    // 縦の距離（地面の en.y ではなく、今の高さ currentEnemyY を使う）
    const dy = hitBoxY - (currentEnemyY + en.h / 2);
    
    // 三平方の定理で正確な距離を出す
    const dist = Math.sqrt(dx * dx + dy * dy);

    // 距離が100以内なら「射程内」
    if (dist < GAME_SETTINGS.ATTACK_RANGE) { 
      targetsInRange.push({ enemy: en, dist: dist });
    }
  });

  // 1. 🌟 攻撃範囲内にターゲット（敵）がいるかチェック
if (targetsInRange.length > 0) {
    
    // 2. 📍 一番近い敵を特定する
    // 距離(dist)が短い順に並べ替えて、0番目（最短）の敵を選びます
    targetsInRange.sort((a, b) => a.dist - b.dist);
    const targetEnemy = targetsInRange[0].enemy;

    // 3. 🎲 ダメージ量の計算
    // 50 ～ 90 の間でランダムな数字を作ります
    // (Math.random() * 41 は 0～40、それに 50 を足すので 50～90 になります)
    const damage = Math.floor(Math.random() * 41) + 50; 
    
    // 4. 🔊 効果音の判定
    // 敵の残りHPとダメージを比較して、鳴らす音を切り替えます
    if (targetEnemy.hp - damage <= 0) {
        // 敵が倒れる時の音（関数が存在する場合のみ実行）
        if (typeof playEnemyDieSound === 'function') playEnemyDieSound(targetEnemy);
    } else {
        // 敵が攻撃を食らった時の音（関数が存在する場合のみ実行）
        if (typeof playEnemyHitSound === 'function') playEnemyHitSound(targetEnemy);
    }

    // 5. 📡 サーバーへ攻撃情報を送信
    // 「どの敵に」「どれだけのパワーで」「どの向きから」攻撃したかを送ります
    socket.emit('attack', { 
        id: targetEnemy.id, 
        power: damage, 
        dir: hero.dir 
    });
}
}

// game.js のどこか（window.addEventListener('keydown', ... の中）に追加
window.addEventListener('keydown', e => {
    window.keys[e.key] = true;

    // 🌟 修正：Xキーが押された「その瞬間」に攻撃関数を呼ぶ
    if (e.key.toLowerCase() === 'x') {
        attack(); 
    }
});

// 1. ⌨️ 名前を入力してもらう
// prompt() で入力画面を出し、もし空欄やキャンセルなら "Guest" を代入します
const userName = prompt("名前?") || "Guest";

// 2. 👤 自分のキャラクター(hero)に名前をセットする
hero.name = userName;

// 3. 📡 サーバーに「この名前で参加するよ」と送る
// 'join' という合図（イベント）と一緒に名前を送信します
socket.emit('join', userName);

// 4. 🎮 ゲーム画面の更新（ループ）を開始する
// これにより、キャラクターの描画や移動の計算が動き出します
update();