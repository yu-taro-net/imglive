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
// 📡 1. 通信と基本設定（ローカル・本番自動切り替え版）
// ==========================================

// 今開いているドメインが 'localhost' かどうかを判定
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// ローカルなら自分のPC、そうでなければRailwayのURLを使う
const SOCKET_URL = isLocal 
    ? "http://localhost:3000" 
    : "https://satisfied-nourishment-production.up.railway.app";

const socket = io(SOCKET_URL, {
    reconnection: true,
    reconnectionAttempts: 5,
    timeout: 10000
});

console.log(`接続先: ${SOCKET_URL}`); // 確認用にコンソールに表示

class Player {
  constructor(name = "") {
    // 位置と移動
    this.x = 50;
    this.y = 540;
    this.dy = 0;
    this.dir = 1;
    this.jumping = true;

    // ⚔️ 基本ステータス（サーバーと同期）
    this.hp = 100;
    this.maxHp = 100;
    this.str = 50;
    this.dex = 5;  // 🌟 追加
    this.luk = 5;  // 🌟 追加
    this.ap = 0;   // 🌟 追加
    this.score = 0;
    this.level = 1;
    this.exp = 0;

    // 状態管理
    this.name = name;
    this.chat = null;
    this.isAttacking = 0;
    this.attackStartFrame = -999;
    this.invincible = 0;
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

  // game.js の Playerクラスの中
receiveDamage(amount) {
    if (this.invincible > 0) return; // 無敵中なら何もしない

    this.hp -= amount;

    // 🌟 追加：HPが0より小さくならないようにガードする
    if (this.hp < 0) {
        this.hp = 0;
    }

    this.invincible = 60; // 1秒間無敵
    
    console.log(`${this.name}は ${amount} のダメージを受けた！ 残りHP: ${this.hp}`);
}

// 🌟 追加：リスポーン（復活）のルールを定義する
  respawn() {
    this.hp = 100;    // HPを全回復
    this.x = 50;     // 初期位置X
    this.y = 390;    // 初期位置Y
    this.climbing = false; // ハシゴ状態を解除
    console.log(`${this.name}がリスポーンしました。`);
  }
  
  /**
   * 🌟 修正版：足場データを受け取って、接地判定まで一気にやる
   * ロジックの構造はそのままに、判定を中央に寄せました。
   */
  applyPhysics(platforms) {
    if (!this.climbing) {
      this.dy += GAME_SETTINGS.GRAVITY;
    } else {
      this.dy = 0;
    }
    this.y += this.dy;

    let grounded = false;

    // A. 地面の判定
    const GROUND_Y_LIMIT = GLOBAL_SETTINGS.SYSTEM.GROUND_Y; 
    if (this.y >= GROUND_Y_LIMIT) {
        this.y = GROUND_Y_LIMIT;
        this.dy = 0;
        grounded = true;
    }

    // B. 足場の判定（メインループから引っ越してきた部分）
    if (platforms && !this.climbing && this.dy >= 0) {
      platforms.forEach(p => {
        const currentHeight = 60; // プレイヤーの基本高さ
        
        // ⭐ 修正：左右対称の判定を「中央」に寄せる
        // キャラクターの画像中心 (this.x + 30) を基準にします
        const charCenter = this.x + 20;
        // 中心から左右にどれだけの幅で足を乗せるか（20pxに設定 = 合計40px幅）
        const footWidth = 20;

        if (charCenter + footWidth > p.x && charCenter - footWidth < p.x + p.w) {
          if (this.y + currentHeight >= p.y - 10 && this.y + currentHeight <= p.y + 30) {
            this.y = p.y - currentHeight;
            this.dy = 0;
            grounded = true;
          }
        }
      });
    }

    // C. ジャンプ・落下状態の更新
    if (grounded) {
      this.jumping = false;
      this.jumpFrame = 0;
    } else if (!this.climbing) {
      this.jumping = true;
      this.jumpFrame = (this.jumpFrame || 0) + 1;
    }

    return grounded; // 地面か足場にいたら true を返す
  }
  
  // 🌟 追加：攻撃を開始するルール
  startAttack() {
    if (this.climbing) return;      // ハシゴ中は攻撃不可
    if (this.isAttacking > 0) return; // 連続攻撃防止
    
    this.isAttacking = 20;          // 攻撃モーションの時間
    this.attackStartFrame = frame;  // 現在のフレームを記録
  }
  
  // 🌟 追加：攻撃が当たっているか判定する
  checkHit(enemies) {
    if (this.isAttacking !== 13) return null; // 13フレーム目以外は何もしない

    let targetsInRange = [];
    enemies.forEach(en => {
      if (!en.alive || en.isFading || en.hp <= 0) return;

      // ハンマーの判定位置
      const hitBoxX = (this.dir === -1) ? this.x - 40 : this.x + 80;
      const hitBoxY = this.y; 

      const currentEnemyY = en.y + (en.jumpY || 0);

      const dx = hitBoxX - (en.x + en.w / 2);
      const dy = hitBoxY - (currentEnemyY + en.h / 2);
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < GAME_SETTINGS.ATTACK_RANGE) { 
        targetsInRange.push({ enemy: en, dist: dist });
      }
    });

    if (targetsInRange.length > 0) {
      targetsInRange.sort((a, b) => a.dist - b.dist);
      return targetsInRange[0].enemy; // 一番近い敵を返す
    }
    return null;
  }
  
  // 🌟 追加：敵との接触をチェックして、当たっていればダメージを受ける
  checkEnemyCollision(enemies) {
    if (this.invincible > 0) {
      this.invincible--;
      return;
    }

    enemies.forEach(en => {
      if (!en.alive || en.isFading) return;

      const enemyVisualY = en.y + (en.jumpY || 0);
      let hitW = en.w;
      let hitH = en.h;
      let offsetX = 0;

      // 敵の攻撃中の当たり判定サイズ計算
      if (en.isAttacking > 0 && typeof sprites !== 'undefined') {
        const atkSprites = sprites[en.type + "Attack"];
        if (atkSprites && atkSprites.length > 0) {
          const progress = 22 - en.isAttacking;
          const img = atkSprites[Math.max(0, Math.min(progress, atkSprites.length - 1))];
          if (img) {
            const s = en.scale || 1.0;
            hitW = img.width * 0.2 * s;
            hitH = img.height * 0.2 * s;
            if (en.dir === -1) offsetX = -(hitW - en.w);
          }
        }
      }

      // 矩形による接触判定
      const isHit = (
        this.x < en.x + hitW + offsetX &&
        this.x + 60 > en.x + offsetX &&
        this.y < enemyVisualY + hitH &&
        this.y + 60 > enemyVisualY
      );

      if (isHit) {
        const dmg = Math.floor(Math.random() * 8) + 8;
        this.receiveDamage(dmg); // クラス内の既存メソッドを呼び出す

        // ノックバック処理
        if (!this.climbing) {
          this.dy = -8;
          this.x += (this.x < en.x) ? -30 : 30;
        }

        // サーバー通信とリスポーン判定
        socket.emit('player_damaged', { val: dmg, newHp: this.hp });
        if (this.hp <= 0) this.respawn();
      }
    });
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

// 📡 サーバーから「現在の世界の状態（state）」が届いた時の処理
socket.on('state', s => {
    // -------------------------------------------------------
    // 1. 周辺環境（自分以外）のデータを最新にする
    // -------------------------------------------------------
    enemies   = s.enemies;   // 敵の位置やHPを更新
    others    = s.players;   // 他のプレイヤー全員の位置や状態を更新
    platforms = s.platforms; // 足場（床）の情報を更新
    ladders   = s.ladders;   // ハシゴの情報を更新

    // -------------------------------------------------------
    // 2. アイテム情報の更新（既存のアニメ状態を守りながら）
    // -------------------------------------------------------
    items = s.items.map(si => { 
        // 今画面にあるアイテム(existing)の中に、同じIDのものがあるか探す
        const existing = items.find(it => it.id === si.id); 
        
        // もし既にあるなら、座標などの新しい数値(si)ではなく、
        // 今の見た目状態(existing)を優先して、ガタつきを防ぐ
        return existing ? existing : si; 
    });

    // -------------------------------------------------------
    // 3. 自分のデータ（hero）をサーバーの値と「完全同期」させる
    // -------------------------------------------------------
    // サーバーが持っているプレイヤー名簿の中から「自分のID」のデータを探す
    const myData = s.players[socket.id];

    if (myData) {
        // --- A. 基本情報の同期 ---
        hero.inventory = myData.inventory || []; // 所持品リスト
        hero.score     = myData.score || 0;     // スコア

        // --- B. 成長要素（レベル・経験値）の同期 ---
        hero.level  = myData.level;              // 現在のレベル
        hero.exp    = myData.exp;                // 現在の経験値
        hero.maxExp = myData.maxExp || 100;      // 次のレベルまでに必要な経験値

        // --- C. 生命力（HP）の同期 ---
        hero.hp    = myData.hp;                  // 現在の体力
        hero.maxHp = myData.maxHp || 100;        // 体力の最大値

        // --- D. ステータス（能力値）の同期 ---
        hero.str = myData.str || 50;             // 攻撃力（STR）
        hero.dex = myData.dex;                   // 器用さ（DEX）
        hero.luk = myData.luk;                   // 運（LUK）
        
        // AP（ステータスに振り分けられる未割り当てポイント）
        // 値が「0」の時も正しく反映されるよう、undefinedチェックを行っています
        hero.ap = (myData.ap !== undefined) ? myData.ap : 0;
    }

    // -------------------------------------------------------
    // 4. 仕上げ
    // -------------------------------------------------------
    // 'others'リストには自分も含まれてしまっているので、
    // 他人だけを描画するために、自分自身のデータはリストから削除しておく
    delete others[socket.id];
});

// game.js 等のソケット受信部分
socket.on('player_update', (updatedPlayer) => {
    // 自分のIDと一致するデータの時、自分自身の情報を更新する
    if (updatedPlayer.id === socket.id) {
        // hero は view.js 等で使っているプレイヤー変数名に合わせてください
        hero.gold = updatedPlayer.gold; 
    }
});

socket.on('damage_effect', data => {
  damageTexts.push({ x: data.x + (Math.random()*20-10), y: data.y, val: data.val, timer: 40, vy: data.type === 'player_hit' ? -3 : -2, isCritical: data.isCritical, type: data.type });
});

// game.js (または view.js) の socket.on が並んでいるあたり
socket.on('level_up_effect', (data) => {
    // 1. 音を鳴らす
    if (typeof playLevelUpSound === 'function') {
        playLevelUpSound();
    }

    // 2. 文字表示用のデータをリストに追加する
    // data.playerId が送られてくる想定です
    if (data && data.playerId) {
        levelUpEffects.push({
            playerId: data.playerId,
            timer: 120 // 表示時間
        });
    }

    console.log("🎊 レベルアップ演出（音と文字の準備）を実行しました");
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

/*
function attack() {
  if (hero.climbing) return; // 🌟 ハシゴ中なら、ここで処理を強制終了する
  if (hero.isAttacking > 0) return; // 連続攻撃防止
  hero.isAttacking = 18; 
  hero.attackStartFrame = frame;   // 🌟 ここで「今」の時間を刻印！
  socket.emit('move', hero);       // 🌟 刻印した瞬間のデータを全員に送る
}
*/

/**
 * ⌨️ キーボード操作を受け付けるメイン関数
 */
function handlePlayerInput(hero, items, ladders, chatIn) {
    // A. チャット入力中は操作を無効化
    if (document.activeElement === chatIn) return;

    // B. 基本状態の更新（伏せ判定）
    hero.isDown = (!hero.climbing && !hero.jumping && (keys['KeyS'] || keys['ArrowDown']));

    // C & D. 移動とハシゴの処理
    handleMovementAndLadder(hero, ladders);

    // E, F, G. アクションの処理（ジャンプ・攻撃・取得）
    handleActions(hero, items);
}

// ==========================================
// 🔄 補助関数
// ==========================================

/**
 * 移動とハシゴに関するロジック
 */
function handleMovementAndLadder(hero, ladders) {
    // 左右移動（ハシゴ中・伏せ中でない時）
    if (!hero.climbing && !hero.isDown) {
        if (keys['ArrowLeft']) {
            hero.updatePosition(-GAME_SETTINGS.WALK_SPEED, 0);
            hero.vx = -GAME_SETTINGS.WALK_SPEED;
        } else if (keys['ArrowRight']) {
            hero.updatePosition(GAME_SETTINGS.WALK_SPEED, 0);
            hero.vx = GAME_SETTINGS.WALK_SPEED;
        } else {
            hero.vx = 0;
        }
    } else {
        hero.vx = 0;
    }

    // 🪜 ハシゴ判定
    const l = (ladders && ladders.length > 0) ? ladders[0] : null;
    let isTouchingLadder = false;
    if (l) {
        const distX = Math.abs((hero.x + 30) - (l.x + 15));
        const isInsideY = (hero.y + 60 > l.y1 && hero.y < l.y2);
        if (distX < 20 && isInsideY) isTouchingLadder = true;
    }

    // ハシゴのてっぺん判定（即時関数ロジックを維持）
    const isAtLadderTop = (() => {
        if (!l) return false;
        const horizontalDiff = Math.abs((hero.x + 30) - (l.x + 15));
        const isHorizontalClose = horizontalDiff < 30;
        const verticalDiff = Math.abs((hero.y + 60) - l.y1);
        const isVerticalAtTop = verticalDiff < 20;
        return isHorizontalClose && isVerticalAtTop;
    })();

    // ハシゴの昇降処理
    if ((isTouchingLadder || isAtLadderTop) && ladderJumpTimer === 0) {
        if (keys['KeyW'] || keys['ArrowUp'] || keys['KeyS'] || keys['ArrowDown']) {
            if (!hero.climbing && (keys['KeyS'] || keys['ArrowDown']) && isAtLadderTop) {
                hero.y += 15;
            }
            hero.x = l.x + 15 - 30; // ハシゴの中心に吸着
            hero.climbing = true;
            hero.dy = 0;
            hero.jumping = false;

            if (keys['KeyW'] || keys['ArrowUp']) {
                hero.updatePosition(0, -GAME_SETTINGS.LADDER_SPEED);
            } else if (keys['KeyS'] || keys['ArrowDown']) {
                hero.updatePosition(0, GAME_SETTINGS.LADDER_SPEED);
            }
        } else if (hero.climbing) {
            hero.dy = 0;
        }
    } else {
        hero.climbing = false;
    }
}

/**
 * ジャンプ・攻撃・アイテム取得のロジック
 * 押しっぱなしでの「連続攻撃」と「連続取得（爆速設定）」を完全にサポート
 */
function handleActions(hero, items) {
    // ==========================================
    // E. ジャンプ (Cキー)
    // ==========================================
    if (keys['KeyC']) {
        if (hero.climbing) {
            // ハシゴからの飛び降りジャンプ
            if (!cKeyPressed && (keys['ArrowLeft'] || keys['ArrowRight'])) {
                if (typeof playJumpSound === 'function') playJumpSound();
                ladderJumpTimer = 15;
                if (keys['ArrowLeft']) { hero.x -= 25; hero.dir = -1; }
                else { hero.x += 25; hero.dir = 1; }
                hero.dy = GAME_SETTINGS.JUMP_POWER;
                hero.jumping = true;
                hero.jumpFrame = 0;
                hero.climbing = false;
                cKeyPressed = true;
            }
        } else if (!hero.jumping && !cKeyPressed) {
            // 地面からの通常のジャンプ
            if (typeof playJumpSound === 'function') playJumpSound();
            hero.y -= 5;
            hero.dy = GAME_SETTINGS.JUMP_POWER;
            hero.jumping = true;
            hero.jumpFrame = 0;
            cKeyPressed = true;
        }
    } else {
        cKeyPressed = false;
    }

    // ==========================================
    // F. 攻撃 (Xキー)
    // ==========================================
    // 🌟 押しっぱなし対応：Playerクラス内部の攻撃中判定に任せて連続実行
    if (keys['KeyX']) {
        hero.startAttack(); 
    }

    // ==========================================
    // G. アイテム取得 (Zキー)
    // ==========================================
    // 🌟 タイマー管理による「押しっぱなし高速取得」
    if (typeof window.zKeyTimer === 'undefined') window.zKeyTimer = 0;
    if (window.zKeyTimer > 0) window.zKeyTimer--; // 毎フレームカウントダウン

    if (keys['KeyZ']) {
        if (window.zKeyTimer <= 0) {
            const target = items.find(it => {
                // 距離計算ロジックを維持 (hero.x + 30 はキャラ中心)
                const d = Math.sqrt(
                    Math.pow((hero.x + 30) - (it.x + 15), 2) + 
                    Math.pow((hero.y + 30) - (it.y + 15), 2)
                );
                return d < 45;
            });

            if (target) {
                socket.emit('pickup', target.id);
                // 🌟 取得間隔を「3」に設定（超高速）
                // 押しっぱなしで周囲のアイテムを次々と回収します
                window.zKeyTimer = 3; 
            }
        }
    }
}

/**
 * ゲームのメインループ（1秒間に約60回実行される心臓部）
 */
function update() {
    frame++; // フレームカウント（アニメーション同期用）

    // 1. 各要素の状態更新（切り出した関数を順番に実行）
    updateItemsPhysics();      // アイテムの物理挙動
    updateEffectsAndTimers();  // エフェクト・タイマーの更新

    // 2. プレイヤーの入力処理
    handlePlayerInput(hero, items, ladders, document.getElementById('chat-in'));

    // 3. 物理移動と接地判定
    // heroに「今ある足場」を教えて、計算を全部任せる
    let isTouchingAnything = hero.applyPhysics(platforms);

    // 4. 戦闘・当たり判定
    updatePlayerCombat();

    // 5. サーバー同期と描画
    socket.emit('move', hero); // 自分の位置を報告

    if (typeof drawGame === 'function') {
        drawGame(hero, others, enemies, items, platforms, ladders, damageTexts, frame);
    }

    // 6. エラー防止用の最終接地保証（元のロジックを維持）
    if (typeof isTouchingAnything !== 'undefined' && isTouchingAnything) {
        hero.jumping = false;
        hero.dy = 0;
    }

    requestAnimationFrame(update); // 次のフレームへ
}

// ==========================================
// 🔄 update関数から切り出した補助関数
// ==========================================

function updateItemsPhysics() {
    items.forEach(item => {
        // すでに着地しているアイテムは計算をスキップ（フリーズ防止の最重要ポイント）
        if (item.landed) return; 

        // 1. 移動計算
        item.x += item.vx || 0; 
        item.y += item.vy || 0; 
        item.vy = (item.vy || 0) + 0.5; 
        item.vx *= 0.98; 

        const groundY = 565;
        const itemSize = 32;

        // 2. 地面着地
        if (item.y + itemSize > groundY && item.vy > 0) { 
            item.y = groundY - itemSize; 
            item.landed = true; // 先にフラグを立てる
            item.vy = 0;
            item.vx = 0;
            // 通知は一回だけ（io.emitが必要ならここ）
            return; 
        }

        // 3. 足場着地
        // forEachではなく、一つ見つかったら止める find などが理想ですが、
        // 既存の形式を活かすなら return で抜けるようにします。
        for (const p of platforms) {
            const offset = 10; 
            const itemBottom = item.y + itemSize;

            // X方向の判定：アイテムが「しっかり」足場に乗っているか
            const isInsideX = (item.x + (itemSize - offset) > p.x) && (item.x + offset < p.x + p.w);
            // Y方向の判定：足場の表面に触れたか
            const isTouchingTop = (item.vy > 0 && itemBottom >= p.y && itemBottom <= p.y + 15);

            if (isInsideX && isTouchingTop) {
                item.y = p.y - itemSize; 
                item.landed = true; // 着地確定
                item.vy = 0;
                item.vx = 0;
                break; // このアイテムのループを抜ける（他の足場は見ない）
            }
        }
    });
}

/**
 * 🌟 着地を確定させ、DBや全クライアントに位置を同期する
 */
function finalizeLanding(item) {
    item.landed = true;
    item.vy = 0;
    item.vx = 0;
    
    // サーバー側のDB更新処理をここで呼ぶ必要があります
    // (例: updateItemLocationInDB(item.id, item.x, item.y);)
    
    // 全員に「この位置で着地したよ」と知らせる
    io.emit('item_sync_position', {
        id: item.id,
        x: item.x,
        y: item.y,
        landed: true
    });
}

/**
 * 3. エフェクト・演出・タイマーの更新
 */
function updateEffectsAndTimers() {
    // ダメージ数字の浮上と消滅
    damageTexts = damageTexts.filter(t => { 
        t.y += t.vy;   
        t.vy += 0.1;   
        t.timer--;     
        return t.timer > 0; 
    });

    // チャット吹き出しの表示時間管理
    if (hero.chat && hero.chat.timer > 0) {
        hero.chat.timer--;
    }

    // ハシゴ再接触禁止タイマー
    if (ladderJumpTimer > 0) ladderJumpTimer--;
}

/**
 * 6. 戦闘・当たり判定（攻撃と被ダメージ）
 */
function updatePlayerCombat() {
    // 自分の攻撃処理
    if (hero.isAttacking > 0) {
        hero.isAttacking--; 
        
        // 攻撃判定が発生するフレーム（13フレーム目）
        if (hero.isAttacking === 13) {
            let target = hero.checkHit(enemies); 
            
            if (target) {
                // --- 【敵に当たった場合】 ---
                const damage = Math.floor(Math.random() * 41) + 50; 
                
                // 死亡判定とSE再生
                if (target.hp - damage <= 0) {
                    if (typeof playEnemyDieSound === 'function') playEnemyDieSound(target);
                } else {
                    if (typeof playEnemyHitSound === 'function') playEnemyHitSound(target);
                }
                
                // サーバーに「攻撃が当たった」情報を送信（ダメージあり）
                socket.emit('attack', { id: target.id, power: damage, dir: hero.dir });

            } else {
                // --- 【敵がいなかった場合（空振り）】 ---
                // 🌟 ここを追加：敵がいなくても、攻撃したという「動作」だけをサーバーに伝える
                // idをnull、powerを0にすることで、ダメージを与えずにモーションだけ同期させます
                socket.emit('attack', { id: null, power: 0, dir: hero.dir });
            }
        }
    }

    // 敵との接触ダメージ判定（無敵管理含む）
    hero.checkEnemyCollision(enemies);
}

// 🌟 キャラクター切り替え (Q/E)
window.addEventListener('keydown', (e) => {
    // ✅ 追加：もし入力欄（チャット等）を触っていたら、ここで処理を中断する
    if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;

    let changed = false;
    if (e.key === 'q' || e.key === 'Q') {
        selectedCharVar = selectedCharVar <= 1 ? 15 : selectedCharVar - 1;
        changed = true;
    }
	/*
    if (e.key === 'e' || e.key === 'E') {
        selectedCharVar = selectedCharVar >= 15 ? 1 : selectedCharVar + 1;
        changed = true;
    }
	*/
    if (changed) {
        socket.emit('change_char', { charVar: selectedCharVar });
    }
});

// 🌟 グループ切り替え (R/T)
window.addEventListener('keydown', (e) => {
    // ✅ 追加：入力欄を触っていたら無視
    if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;

    let groupChanged = false;
    if (e.key === 'r' || e.key === 'R') {
        selectedGroup = selectedGroup <= 0 ? 15 : selectedGroup - 1;
        groupChanged = true;
    }
    if (e.key === 't' || e.key === 'T') {
        selectedGroup = selectedGroup >= 15 ? 0 : selectedGroup + 1;
        groupChanged = true;
    }
    if (groupChanged) {
        socket.emit('change_group', { group: selectedGroup });
    }
});

// game.js

// --- 修正前 ---
// const userName = prompt("名前?") || "Guest";
// hero.name = userName;
// socket.emit('join', userName);
// update();

// --- 修正後 ---
const loginOverlay = document.getElementById('login-overlay');
const nameInput = document.getElementById('user-name-input');
const startBtn = document.getElementById('start-game-btn');

if (nameInput && startBtn) {
    nameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            startBtn.click(); // エンターが押されたら下のonclickを動かす
        }
    });
}

// ボタンが押された時の処理
startBtn.onclick = () => {
    const userName = nameInput.value.trim() || "Guest";
	
	// 🌟 【ここを追加！】入力欄からフォーカスを外す（チカチカを消す）
    nameInput.blur();

    // 1. ログイン画面を消す
    loginOverlay.style.display = 'none';

    // 2. 自分のキャラクターに名前をセット
    if (typeof hero !== 'undefined') {
        hero.name = userName;
    }

    // 3. サーバーに参加を伝える
    socket.emit('join', userName);

    // 🌟 重要：ブラウザの音制限を解除するためにここでAudioContextを再開
    if (typeof audioCtx !== 'undefined' && audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    // もしBGMを鳴らしたいならここで呼ぶ
    if (typeof playBGM === 'function') playBGM();

    // 4. ゲームのループを開始
    update();
};