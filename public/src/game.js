// ============================================================
// ⚙️ [SECTION 1: CONFIG] ゲーム設定・定数
// 役割: 歩行速度、重力、ジャンプ力、接続先URLなどの固定値
// ============================================================
// 例: GAME_SETTINGS, SOCKET_URL など
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

// ============================================================
// 📊 [SECTION 2: STATE] クライアント・ステート
// 役割: 自分のキャラ(hero)、他プレイヤー(players)、現在のチャンネル等の保持
// ============================================================
// 例: let hero; const players = {}; let selectedChannel = 1;
let others = {};      // 他のプレイヤーたち
let enemies = [];     // 敵キャラクターのリスト
let items = [];       // 落ちているアイテムのリスト
let platforms = [];   // 足場のデータ
let ladders = [];     // 梯子（ハシゴ）のデータ
let damageTexts = []; // 画面に表示するダメージ数字のリスト
window.keys = {};        // 🌟 押されているキーの状態を保存（windowを付けて全体で共有）
let frame = 0;           // ゲーム開始からの経過時間（フレーム数）
let zKeyPressed = false; // 攻撃ボタン(ZやX)の連続押し防止
let cKeyPressed = false; // ✨ ジャンプボタン(C)の連続押し防止
let ladderJumpTimer = 0; // 梯子からジャンプした直後に、すぐ梯子を掴まないためのタイマー

let myId = null; 
let currentMapId = 1; // マップIDの管理用（もし無ければ追加）

// ============================================================
// 🔊 [SECTION 3: RESOURCES] アセット・クラス定義
// 役割: Playerクラスの定義や、画像・音声の初期化
// ============================================================
// 例: class Player { ... }, class Monster { ... }
class Player {
  constructor(name = "", channel = 1) { // 🌟 チャンネル引数を追加
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
    this.dex = 5;  // 🌟 維持
    this.luk = 5;  // 🌟 維持
    this.ap = 0;   // 🌟 維持
    this.score = 0;
    this.level = 1;
    this.exp = 0;
    this.channel = channel; // 🌟 追加：自分が今どのチャンネルにいるかを記憶

    // 状態管理
    this.name = name;
    this.chat = null;
    this.isAttacking = 0;
    this.attackStartFrame = -999;
    this.invincible = 0;
    this.inventory = [];

    // 🌟 追加：ノックバック・硬直状態の管理
    this.isStunned = false; 
    this.stunTimer = 0;
  }

  // 移動のロジック
  move(vx) {
    // 🌟 追加：硬直中は移動不可
    if (this.isStunned) return;

    this.x += vx;
    if (vx > 0) this.dir = 1;
    if (vx < 0) this.dir = -1;
  }
  
  // 🌟 位置を一気に更新するメソッド
  updatePosition(dx, dy) {
    this.x += dx;
    this.y += dy;
    if (dx > 0) this.dir = 1;
    if (dx < 0) this.dir = -1;
  }

  // 🌟 修正：敵の位置(enemyX)を受け取ってノックバック方向を決める
  receiveDamage(amount, enemyX = null) {
    if (this.invincible > 0) return; // 無敵中なら何もしない

    this.hp -= amount;

    if (this.hp < 0) {
        this.hp = 0;
    }

    this.invincible = 60; // 1秒間無敵

    // 🌟 追加：ノックバックと硬直の発生
    if (!this.climbing) {
        this.dy = -8; // 上方向に跳ねる
        
        // 敵が右にいれば左へ、いなければ(または左なら)右へ飛ばす
        const knockbackDir = (enemyX !== null && this.x < enemyX) ? -1 : 1;
        this.x += knockbackDir * 30; 

        this.isStunned = true; // 操作不能開始
        this.stunTimer = 30;   // 約0.3秒の硬直
    }
    
    console.log(`${this.name}は ${amount} のダメージを受けた！ 残りHP: ${this.hp}`);
  }

  // 🌟 リスポーン（復活）のルール
  respawn() {
    this.hp = 100; 
    this.x = 50; 
    this.y = 390; 
    this.climbing = false;
    this.isStunned = false; // 🌟 復活時に硬直解除
    this.stunTimer = 0;
    console.log(`${this.name}(Ch:${this.channel})がリスポーンしました。`);
  }
  
  /**
   * 🌟 物理演算と硬直時間の更新
   */
  applyPhysics(platforms) {
    // 🌟 追加：硬直タイマーの更新
    if (this.stunTimer > 0) {
        this.stunTimer--;
        if (this.stunTimer <= 0) this.isStunned = false;
    }

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

    // B. 足場の判定
    if (platforms && !this.climbing && this.dy >= 0) {
      platforms.forEach(p => {
        const currentHeight = 60; 
        const charCenter = this.x + 20;
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

    return grounded; 
  }
  
  // 🌟 攻撃を開始するルール
  startAttack() {
    if (this.climbing || this.isStunned) return; // 🌟 硬直中は攻撃不可
    if (this.isAttacking > 0) return; 
    
    this.isAttacking = 20; 
    this.attackStartFrame = frame; 
  }
  
  // 🌟 攻撃が当たっているか判定
  checkHit(enemies) {
    if (this.isAttacking !== 13) return null; 

    let targetsInRange = [];
    enemies.forEach(en => {
      if (!en.alive || en.isFading || en.hp <= 0) return;

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
      return targetsInRange[0].enemy; 
    }
    return null;
  }
  
  // 🌟 敵との接触をチェック
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

      const isHit = (
        this.x < en.x + hitW + offsetX &&
        this.x + 60 > en.x + offsetX &&
        this.y < enemyVisualY + hitH &&
        this.y + 60 > enemyVisualY
      );

      if (isHit) {
        const dmg = Math.floor(Math.random() * 8) + 8;
        
        // 🌟 修正：敵の位置(en.x)を渡してノックバックを計算させる
        this.receiveDamage(dmg, en.x); 

        // サーバー通信とリスポーン判定
        socket.emit('player_damaged', { val: dmg, newHp: this.hp });
        if (this.hp <= 0) this.respawn();
      }
    });
  }
}

let hero = new Player("name1", 1); // 初期値としてCh1をセット

// ============================================================
// 🧠 [SECTION 4: LOGIC] 物理演算・更新ロジック
// 役割: 移動計算、衝突判定、座標の更新処理（描画前の計算）
// ============================================================
// 例: update() 関数内の座標計算、checkCollision() など
function setWhisperTarget(name) {
    // 自分自身の名前なら何もしない
    if (name === hero.name) return;
	
    const chatMode = document.getElementById('chat-mode');
    const value = `whisper:${name}`;
    
    // すでにその人の選択肢があるか確認
    let option = Array.from(chatMode.options).find(opt => opt.value === value);
    
    if (!option) {
        // 新しい選択肢を作成
        option = document.createElement('option');
        option.value = value;
        option.text = `内緒話：${name}`;
        option.style.color = '#99ffff';
        chatMode.add(option);
    }
    
    // その人を選択状態にする
    chatMode.value = value;
    
    // 入力欄にフォーカス
    document.getElementById('chat-in').focus();
}

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
            // 🌟 オレンジの枠内に敵がいるかチェック
            let target = hero.checkHit(enemies); 
            
            if (target) {
                // --- 【敵に当たった場合：オレンジの枠内】 ---
                const damage = Math.floor(Math.random() * 41) + 50; 
                
                // 🌟 音はここで鳴らさず、サーバーに「当たったはず」と送信します。
                // 実際の音は、下の socket.on('enemy_hit_sync') で鳴らします。
                socket.emit('attack', { id: target.id, power: damage, dir: hero.dir });

            } else {
                // --- 【敵がいなかった場合（空振り）：オレンジの枠外】 ---
                // 動作（アニメーション）だけ同期させるためにサーバーへ通知
                socket.emit('attack', { id: null, power: 0, dir: hero.dir });
            }
        }
    }

    // 敵との接触ダメージ判定（無敵管理含む）
    hero.checkEnemyCollision(enemies);
}

// ============================================================
// 🕹️ [SECTION 5: INPUT] 入力ハンドラ
// 役割: キーボード(keydown/up)操作の監視と移動フラグの切り替え
// ============================================================
// 例: window.addEventListener('keydown', ...)
window.onkeydown = e => window.keys[e.code] = true;
window.onkeyup = e => window.keys[e.code] = false;

const chatIn = document.getElementById('chat-in');
const msgBox = document.getElementById('msg-box');

const loginOverlay = document.getElementById('login-overlay');
const nameInput = document.getElementById('user-name-input');
const startBtn = document.getElementById('start-game-btn');

chatIn.onkeydown = e => {
    // 🌟 1. 日本語入力の「変換確定エンター」を無視するガード
    // これを入れないと、Chrome等で確定時と送信時で2回送られてしまいます
    if (e.isComposing || e.keyCode === 229) {
        return;
    }

    // 2. エンターキーが押され、かつ入力欄が空でない場合に実行
    if (e.key === 'Enter' && chatIn.value.trim() !== '') {
        const chatMode = document.getElementById('chat-mode');
        const selectedValue = chatMode.value;

        let type = 'all';
        let targetName = '';
        let val = chatIn.value;

        // --- 送信モードの判定ロジック ---
        
        if (selectedValue === 'all') {
            // 全体チャット
            type = 'all';
        } else if (selectedValue === 'group') {
            // グループチャット
            type = 'group';
        } else if (selectedValue === 'whisper') {
            // 🌟 「内緒話(新規入力)...」が選ばれている場合
            // 入力欄の「名前 本文」から分割する
            const parts = val.split(' ');
            if (parts.length >= 2) {
                targetName = parts[0];
                val = parts.slice(1).join(' ');
                type = 'whisper';
            } else {
                alert("「相手の名前 メッセージ」と入力してください");
                return;
            }
        } else if (selectedValue.startsWith('whisper:')) {
            // 🌟 専用の「内緒話：名前」が選ばれている場合
            // メニューの value (whisper:名前) から名前を取得
            type = 'whisper';
            targetName = selectedValue.split(':')[1];
        }

        // 🌟【自分への内緒話を禁止するガード】
        // 相手の名前が自分(hero.name)と同じだった場合、送信を中止します
        if (type === 'whisper' && targetName === hero.name) {
            alert("自分自身に内緒話は送れません！");
            chatIn.value = ''; // 入力内容をクリア
            return; 
        }

        // 3. サーバーへ送信
        socket.emit('chat', { 
            text: val, 
            type: type, 
            targetName: targetName 
        });

        // 4. 入力欄をクリアしてフォーカスを維持
        chatIn.value = '';
        chatIn.focus();
    }
};

// メニュー（セレクトボックス）が変更された時に呼ばれる関数
function onChatModeChange() {
    const chatMode = document.getElementById('chat-mode');
    
    // 「内緒話 (新規入力)」が選ばれたら
    if (chatMode.value === 'whisper') {
        // 名前を入力してもらうポップアップを出す
        const name = prompt("内緒話をしたい相手の名前を入力してください");
        
        // 🌟 修正ポイント：入力があった場合のみ処理を進める
        if (name && name.trim() !== "") {
            const trimmedName = name.trim();

            // 🌟 自分の名前（hero.name）だった場合は、何もせず全体に戻す
            if (trimmedName === hero.name) {
                alert("自分自身に内緒話は送れません"); // 理由を伝えるとより親切です
                chatMode.value = 'all';
                return;
            }

            // 自分以外なら、専用メニューを作る
            setWhisperTarget(trimmedName);
        } else {
            // キャンセルされた、または空欄なら「全体」に戻しておく
            chatMode.value = 'all';
        }
    }
}

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

/**
 * 移動とハシゴに関するロジック
 */
function handleMovementAndLadder(hero, ladders) {
    // 🌟 修正：硬直中（ノックバック中）は入力を受け付けない
    if (hero.isStunned) {
        // キー入力による水平速度をリセットし、以降の処理（移動・ハシゴ）をスキップ
        hero.vx = 0; 
        return; 
    }

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

if (nameInput && startBtn) {
    nameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            startBtn.click(); // エンターが押されたら下のonclickを動かす
        }
    });
}

/*
startBtn.onclick = () => {
    // 名前が未入力の場合は "Guest" とする
    const userName = nameInput.value.trim() || "Guest";
    
    // 🌟 入力欄からフォーカスを外す（スマホのキーボードを閉じる効果もあります）
    nameInput.blur();

    // 1. ログイン画面（オーバーレイ）を非表示にする
    loginOverlay.style.display = 'none';

    // 2. 自分のキャラクター（ローカルの hero オブジェクト）に情報をセット
    if (typeof hero !== 'undefined') {
        hero.name = userName;
        
        // 🌟 追加：選んだチャンネルを自分のキャラデータにも保存
        hero.channel = selectedChannel; 
        
        // 🌟 追加：選択したグループ番号(0-15)を自分のデータにも反映
        // これにより、自分の画面に表示される自分の姿が選んだキャラになります
        hero.group = selectedGroup;
        hero.charVar = selectedCharVar; 
    }

    // 3. サーバーに参加を伝える
    // 🌟 修正ポイント：名前、チャンネル、そして選んだ「group (0-15)」をセットで送信
    // これにより、サーバー側のデフォルト設定（p.group = 7 など）を上書きし、
    // 他のプレイヤーの画面にも、あなたが選んだキャラが表示されるようになります。
    socket.emit('join', { 
        name: userName, 
        channel: selectedChannel,
        group: selectedGroup 
    });

    // 🌟 重要：ブラウザの音制限を解除するためにここで AudioContext を再開
    // これを行わないと、他人が入室した時の通知音がブロックされる可能性があります。
    if (typeof audioCtx !== 'undefined' && audioCtx.state === 'suspended') {
        audioCtx.resume().then(() => {
            console.log("AudioContext active.");
        });
    }
    
    // BGMの再生（定義されている場合）
    if (typeof playBGM === 'function') {
        playBGM();
    }

    // 4. ゲームのメインループを開始
    // すでにループが走っている場合の二重起動防止は、update関数の設計に依存します。
    if (typeof update === 'function') {
        update();
    }

    console.log(`[START] Player: ${userName}, Channel: ${selectedChannel}, Group: ${selectedGroup}`);
};
*/

// ==========================================
// 🔐 ログイン・開始処理（既存ロジック踏襲版）
// ==========================================

// 1. 【修正】ボタンを押した時は「ログイン依頼」だけ飛ばす
startBtn.onclick = () => {
    const userName = nameInput.value.trim();
    const password = document.getElementById('user-pass-input').value; // HTMLで追加したID

    if (!userName || !password) {
        alert("名前とパスワードを入力してください");
        return;
    }

    // 入力欄からフォーカスを外す
    nameInput.blur();
    document.getElementById('user-pass-input').blur();

    // サーバーへログイン確認を依頼
    console.log("ログインリクエスト送信:", userName);
    socket.emit('login', { username: userName, password: password });
};

// ------------------------------------------
// 🔑 サーバーから「OK」が来たら、ステータスを反映して開始
// ------------------------------------------
socket.on('login_response', (data) => {
    if (data.success) {
	    myId = data.id; // 🌟 ここでサーバーから届いた「連番ID」を保存！
		
        console.log(`[LOGIN SUCCESS] Player: ${data.username}`);

        // --- ここからあなたの既存ロジックをそのまま実行 ---
        
        // 名前はDBに登録されている正確なものを使用
        const userName = data.username;

        // 1. ログイン画面（オーバーレイ）を非表示にする
        loginOverlay.style.display = 'none';

        // 2. 自分のキャラクター（ローカルの hero オブジェクト）に情報をセット
        if (typeof hero !== 'undefined') {
            hero.name = userName;
            
            // 🌟 修正：DBから届いたステータスを反映させる
            if (data.stats) {
                hero.level = data.stats.level;
                hero.hp    = data.stats.hp;
                hero.mp    = data.stats.mp;
                hero.gold  = data.stats.gold;
                // 座標をDB保存時のものに変更
                hero.x     = data.stats.x;
                hero.y     = data.stats.y;
                // 職業IDなども必要であれば反映
                hero.jobId = data.stats.job_id;
                
                console.log(`[RESTORE] Status: Lv.${hero.level}, Pos:(${hero.x}, ${hero.y})`);
            }

            // 選んだチャンネルを自分のキャラデータにも保存
            hero.channel = selectedChannel; 
            
            // 選択したグループ番号(0-15)を自分のデータにも反映
            hero.group = selectedGroup;
            hero.charVar = selectedCharVar; 
        }

        // 3. サーバーに参加を伝える
        // 🌟 修正：サーバー側(joinイベント)でもDBの座標を使えるよう、座標も送る
        socket.emit('join', { 
            name: userName, 
            channel: selectedChannel,
            group: selectedGroup,
            x: hero.x, // DBから読み込んだX
            y: hero.y  // DBから読み込んだY
        });

        // 🌟 重要：ブラウザの音制限を解除するためにここで AudioContext を再開
        if (typeof audioCtx !== 'undefined' && audioCtx.state === 'suspended') {
            audioCtx.resume().then(() => {
                console.log("AudioContext active.");
            });
        }
        
        // BGMの再生（定義されている場合）
        if (typeof playBGM === 'function') {
            playBGM();
        }

        // 4. ゲームのメインループを開始
        if (typeof update === 'function') {
            update();
        }

        console.log(`[START] Player: ${userName}, Channel: ${selectedChannel}, Group: ${selectedGroup}`);
        
        // --- ここまで ---
        
    } else {
        // ❌ ログイン失敗時
        alert(data.message);
    }
});

// 3. 【新規】新規登録ボタンの処理（念のためここにも置いておきます）
/*
const regBtn = document.getElementById('register-btn');
if (regBtn) {
    regBtn.onclick = () => {
        const username = nameInput.value.trim();
        const password = document.getElementById('user-pass-input').value;

        if (username.length < 2 || password.length < 4) {
            alert("名前は2文字以上、パスワードは4文字以上で入力してください");
            return;
        }
        socket.emit('register', { username, password });
    };
}

socket.on('register_response', (data) => {
    alert(data.message);
    if (data.success) {
        document.getElementById('user-pass-input').value = "";
    }
});
*/

// 現在選ばれているチャンネル番号（初期値は1）
let selectedChannel = 1;

// チャンネルボタンを押した時の処理
function selectChannel(ch) {
    selectedChannel = ch;
    
    // 全ボタンから active クラスを消して、押されたボタンだけに付ける
    const buttons = document.querySelectorAll('.ch-btn');
    buttons.forEach((btn, index) => {
        if (index === ch - 1) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    console.log(`チャンネル ${selectedChannel} が選択されました`);
}

// ============================================================
// 📡 [SECTION 6: NETWORK] 通信ハンドラ (Socket.io)
// 役割: サーバーへのデータ送信(emit)と、サーバーからの受信(on)
// ============================================================
// 例: socket.emit('move', ...), socket.on('updatePlayers', ...)
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

socket.on('chat', data => {
  // --- 1. 左下のログ表示 ---
  const div = document.createElement('div');
  
  // 色の設定
  let color = '#60a5fa'; // 通常
  if (data.type === 'group') color = '#ff80ff';   // グループ（ピンク）
  if (data.type === 'whisper') color = '#99ffff'; // 内緒話（水色）
  if (data.type === 'system') color = '#ffff99';  // システム（黄色）

  // 🌟 名前部分をクリックできるように改造
  // システムメッセージ以外は、クリックすると setWhisperTarget が動くようにします
  const isSystem = data.type === 'system';
  const nameSpan = isSystem 
    ? `<strong style="color:${color}">${data.name}:</strong>` 
    : `<strong style="color:${color}; cursor:pointer;" onclick="setWhisperTarget('${data.name}')">${data.name}:</strong>`;

  // ログにメッセージを追加
  div.innerHTML = `<span style="color:#888;font-size:10px;margin-right:4px;">${data.time || ''}</span>` +
                  nameSpan + 
                  ` <span style="color:${color}">${data.text}</span>`;
  
  if (msgBox) {
    msgBox.appendChild(div);
    msgBox.scrollTop = msgBox.scrollHeight;
  }

  // --- 2. 頭上の吹き出し表示の判定 ---
  if (data.type === 'whisper') return;

  const chatData = { text: data.text, timer: 120 };
  if (data.id === socket.id) {
    hero.chat = chatData;
  } else if (others[data.id]) {
    others[data.id].chat = chatData;
  }
});

socket.on('user_counts', (counts) => {
    for (let i = 1; i <= 5; i++) {
        const btn = document.getElementById(`ch-btn-${i}`);
        if (btn) {
            // 例: 「Ch 1 (3人)」のような表示にする
            btn.innerText = `Ch ${i} (${counts[i]}人)`;
        }
    }
});

// ============================================================
// 🎨 [SECTION 7: INITIALIZER] 起動・エントリーポイント
// 役割: ゲーム開始ボタンの処理、初期化、メインループの開始
// ============================================================
// 例: window.startGame = function() { ... }, requestAnimationFrame
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
    // 🌟 修正：heroオブジェクトの必要な情報を整理して送る
    // hero.climbing を含めることで、他プレイヤー視点でもハシゴ登りが見えるようになります
    socket.emit('move', {
        x: hero.x,
        y: hero.y,
		vx: hero.vx || 0,         // 🌟 歩行判定に必要
        dir: hero.dir,
		jumping: hero.jumping,     // 🌟 ジャンプアニメーションの判定用
        isAttacking: hero.isAttacking,
        climbing: hero.climbing, // 🌟 これを追加！
		invincible: hero.invincible, // 🌟 被弾・無敵状態を同期
        currentFrame: frame
    });

    // 🌟 修正：攻撃の「のっそり」対策
    // 攻撃が始まった瞬間（isAttackingが20になった瞬間）だけ、即座に攻撃イベントを発火
    if (hero.isAttacking === 20) {
        socket.emit('player_attack', { id: socket.id });
    }

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
// 📡 1. 通信と基本設定（ローカル・本番自動切り替え版）
// ==========================================

// --- 修正前 ---
// let hero = new Player("なまえ");

// --- 修正後 ---
// ログイン前はまだチャンネルが確定していないので、一旦デフォルト(1)で作るか、
// あるいは startBtn.onclick の中で作り直す形にします。

// ==========================================
// 🌍 3. 世界の状態（他のプレイヤー・敵・マップ）
// ==========================================

// ==========================================
// 🕹️ 4. 操作・システム用の管理変数
// ==========================================

// game.js 等のソケット受信部分

// game.js (または view.js) の socket.on が並んでいるあたり

// 🌟 修正後

// index.html の送信処理 (Enterキー)

// ==========================================
// 💬 チャット受信処理
// ==========================================

// game.js の socket.on が並んでいる場所に追加

/*
function attack() {
  if (hero.climbing) return; // 🌟 ハシゴ中なら、ここで処理を強制終了する
  if (hero.isAttacking > 0) return; // 連続攻撃防止
  hero.isAttacking = 18; 
  hero.attackStartFrame = frame;   // 🌟 ここで「今」の時間を刻印！
  socket.emit('move', hero);       // 🌟 刻印した瞬間のデータを全員に送る
}
*/

// ==========================================
// 🔄 補助関数
// ==========================================

// ==========================================
// 🔄 update関数から切り出した補助関数
// ==========================================

// game.js

// --- 修正前 ---
// const userName = prompt("名前?") || "Guest";
// hero.name = userName;
// socket.emit('join', userName);
// update();

// --- 修正後 ---

// --- 修正版 startBtn.onclick ---

// ==========================================
// 🔐 ユーザー登録・ログイン処理
// ==========================================

// 1. 新規登録ボタンの処理
const regBtn = document.getElementById('register-btn');
if (regBtn) {
    regBtn.onclick = () => {
        const username = document.getElementById('user-name-input').value;
        const password = document.getElementById('user-pass-input').value;

        if (username.length < 2 || password.length < 4) {
            alert("名前は2文字以上、パスワードは4文字以上で入力してください");
            return;
        }

        // サーバーの socket.on('register', ...) へ送信
        console.log("新規登録リクエスト送信:", username);
        socket.emit('register', { username: username, password: password });
    };
}

// 2. サーバーからの登録結果（register_response）を受け取る
socket.on('register_response', (data) => {
    // サーバー側で設定したメッセージを表示
    alert(data.message);
    
    if (data.success) {
        console.log("登録成功！そのままログインできます。");
        // 成功した場合はパスワード欄を空にするなどの処理
        document.getElementById('user-pass-input').value = "";
    }
});

// ------------------------------------------
// 💾 サーバーに今のステータスを送る関数
// ------------------------------------------
function saveGameData() {
    // ログイン前（myIdがない時）は送らない
    if (!myId || typeof hero === 'undefined') return;

    const saveData = {
        userId: myId,
        level: hero.level || 1,
        exp: hero.exp || 0,
        gold: hero.gold || 0,
        hp: hero.hp || 100,
        maxHp: hero.maxHp || 100, // 🌟 追記：最大HPを追加
        mp: hero.mp || 50,
        maxMp: hero.maxMp || 50,  // 🌟 追記：最大MPを追加
        mapId: currentMapId,
        x: hero.x,
        y: hero.y,
        // 🌟 追記：追加ステータス（STR, DEX, LUK, AP）を送信データに含める
        str: hero.str || 4,
        dex: hero.dex || 4,
        luk: hero.luk || 4,
        ap: hero.ap || 0
    };

    socket.emit('save_player_data', saveData);
    // console.log("オートセーブ実行:", saveData); // デバッグ用
}

// 🌟 10秒ごとに自動実行
setInterval(() => {
    if (myId && hero.name) {
        saveGameData();
    }
}, 10000);