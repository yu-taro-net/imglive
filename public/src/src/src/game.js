// ============================================================
// :::SET_DOMAIN::: 🌐 画像・アセット参照用ドメイン基点設定
// ============================================================
const IMAGE_DOMAIN = (
    window.location.hostname === "localhost" || 
    window.location.protocol === "file:" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname === "mysite.secret.jp" || // 🌟 ここを追加！
    window.location.hostname === "imglive.net"           // 以前使っていた本番環境も追加
) 
? ""                        // 💻 ローカル・本番どちらも相対パスで読み込む
: "https://mysite.secret.jp/imglive/";   // 🌐 それ以外の場合は古い固定ドメインへ（必要に応じて調整）

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

const GLOBAL_SETTINGS = {
    SYSTEM: {
        GROUND_Y: 540,  // 地面の高さ（ここを直せば全部直るようにする）
        WIDTH: 800,
        HEIGHT: 600
    }
};

// 今開いているドメインが 'localhost' かどうかを判定
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// ============================================================
// :::SET_SOCKET_URL::: 📞 通信先サーバーURLの環境分岐設定
// ============================================================
const SOCKET_URL = isLocal 
    ? "http://localhost:3000" 
    : "https://satisfied-nourishment-production.up.railway.app";

// ============================================================
// :::INIT_SOCKET::: 📞 通信インスタンス初期化・接続設定
// ============================================================
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

let lastReceivedTime = Date.now(); // 最後に通信した時間
let isDisconnected = false;        // 切断されているかどうかのフラグ

// ============================================================
// 🔊 [SECTION 3: RESOURCES] アセット・クラス定義
// 役割: Playerクラスの定義や、画像・音声の初期化
// ============================================================
// ============================================================
// :::CLASS_PLAYER::: 👤 プレイヤーの定義・ステータス・物理・行動管理
// ============================================================
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
// ============================================================
// :::SET_WHISPER_TARGET::: 💬 内緒話の宛先選択・UI更新処理
// ============================================================
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

// ============================================================
// :::UPDATE_ITEMS_PHYSICS::: 💎 ドロップアイテムの物理計算・着地判定
// ============================================================
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

// ============================================================
// :::FINALIZE_LANDING::: 💎 アイテム着地確定・状態永続化・同期放送
// ============================================================
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

// ============================================================
// :::UPDATE_EFFECTS::: ✨ エフェクト・演出・タイマーの更新管理
// ============================================================
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

// ============================================================
// :::UPDATE_PLAYER_COMBAT::: ⚔️ 攻撃判定・ダメージ同期・接触管理
// ============================================================
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

// --- 履歴管理用の変数を定義（関数の外に置くことで保持されます） ---
let chatHistory = [];
let historyIndex = -1;

// ============================================================
// :::HANDLE_CHAT_INPUT::: 💬 チャット入力制御・履歴・送信ロジック
// ============================================================
/**
 * 役割：
 * - 日本語入力（IME）の誤作動防止ガード
 * - 上下キーによるチャット送信履歴の呼び出し
 * - エンターキーによるメッセージ送信（全体/グループ/友人/内緒話）
 * - 送信モードの動的判定と自己宛先防止ガード
 */
chatIn.onkeydown = e => {
    // 🌟 1. 日本語入力の「変換確定エンター」を無視するガード
    if (e.isComposing || e.keyCode === 229) {
        return;
    }

    // --- 🌟 追加：上下キーで履歴を遡る処理 ---
    if (e.key === 'ArrowUp') {
        if (chatHistory.length > 0 && historyIndex < chatHistory.length - 1) {
            e.preventDefault(); // カーソルが文頭に移動するのを防止
            historyIndex++;
            chatIn.value = chatHistory[historyIndex];
        }
    } else if (e.key === 'ArrowDown') {
        if (historyIndex > 0) {
            e.preventDefault();
            historyIndex--;
            chatIn.value = chatHistory[historyIndex];
        } else if (historyIndex === 0) {
            historyIndex = -1;
            chatIn.value = ""; // 一番新しい位置に戻ったら空にする
        }
    }

    // 2. エンターキーが押され、かつ入力欄が空でない場合に実行
    // 🌟 修正：.trim() !== '' を削除し、スペースのみでも送信可能にしました
    if (e.key === 'Enter' && chatIn.value !== '') {
        const chatMode = document.getElementById('chat-mode');
        const selectedValue = chatMode.value;

        let type = 'all';
        let targetName = '';
        let fullInputVal = chatIn.value; // 🌟 履歴保存用に現在の全入力を保持
        let val = chatIn.value;

        // --- 🌟 追加：発言を履歴に格納 ---
        chatHistory.unshift(fullInputVal); // 配列の先頭に追加
        if (chatHistory.length > 20) chatHistory.pop(); // 最大20件まで保持
        historyIndex = -1; // 参照位置をリセット

        // --- 送信モードの判定ロジック ---
        
        if (selectedValue === 'all') {
            // 全体チャット
            type = 'all';
        } else if (selectedValue === 'group') {
            // グループチャット
            type = 'group';
        } else if (selectedValue === 'friend') {
            // 🌟 友達チャット
            type = 'friend';
        } else if (selectedValue === 'whisper') {
            // 🌟 「内緒話(新規入力)...」が選ばれている場合
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
            type = 'whisper';
            targetName = selectedValue.split(':')[1];
        }

        // 🌟【自分への内緒話を禁止するガード】
        if (type === 'whisper' && targetName === (typeof hero !== 'undefined' ? hero.name : "")) {
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

// ==========================================
// 💬 チャットモード変更処理 (オリジナルUI・深緑版)
// ==========================================

// ============================================================
// :::ON_CHAT_MODE_CHANGE::: 💬 チャット送信先モード切替・UI更新処理
// ============================================================
/**
 * 役割：
 * - 選択したチャットモード（全体/グループ/内緒話など）の色をUIに適用
 * - 「内緒話 (新規入力)」選択時のオーバーレイ表示と入力制御
 */
function onChatModeChange() {
    const chatMode = document.getElementById('chat-mode');
    if (!chatMode) return;

    // 選択されたオプションの色をプルダウン全体に反映
    const selectedOption = chatMode.options[chatMode.selectedIndex];
    chatMode.style.color = selectedOption.style.color;

    // 「内緒話 (新規入力)」が選ばれたら
    if (chatMode.value === 'whisper') {
        const overlay = document.getElementById('whisper-overlay');
        const input = document.getElementById('whisper-target-name');
        const error = document.getElementById('whisper-error');

        if (overlay && input) {
            overlay.style.display = 'block';
            input.value = ""; 
            input.style.border = "1px solid #2e7d32"; // 枠線を緑に戻す
            if (error) error.innerText = ""; 
            input.focus(); 
        }
    }
}

// ============================================================
// :::SUBMIT_WHISPER_NAME::: 💬 内緒話の相手確定・宛先設定処理
// ============================================================
/**
 * 役割：
 * - 宛先名が正当か検証（空入力ガード、自己宛先禁止ガード）
 * - バリデーションエラー時のUI表示
 * - 宛先設定関数 `setWhisperTarget` の呼び出しとウィンドウのクローズ
 */
function submitWhisperName() {
    const chatMode = document.getElementById('chat-mode');
    const nameInput = document.getElementById('whisper-target-name');
    const errorDiv = document.getElementById('whisper-error');
    const name = nameInput.value.trim();

    // 1. 空チェック
    if (!name) {
        if (errorDiv) errorDiv.innerText = "名前を入力してください";
        nameInput.style.border = "2px solid #ff5252";
        return;
    }

    // 2. 自分自身の名前チェック
    const myName = (typeof hero !== 'undefined' ? hero.name : "");
    if (name === myName) {
        if (errorDiv) errorDiv.innerText = "自分自身に内緒話は送れません";
        nameInput.style.border = "2px solid #ff5252";
        return;
    }

    // 自分以外なら、専用メニューを作る関数を呼び出す
    if (typeof setWhisperTarget === 'function') {
        setWhisperTarget(name);
    }
    
    closeWhisperWindow();
}

// ============================================================
// :::CLOSE_WHISPER_WINDOW::: 💬 内緒話UIの閉幕・モード復元処理
// ============================================================
/**
 * 役割：
 * - 内緒話入力ウィンドウ（オーバーレイ）の非表示化
 * - 選択モードの「全体チャット(all)」への安全な復元
 * - UIカラーのデフォルト値（#60a5fa）へのリセット
 */
function closeWhisperWindow() {
    const overlay = document.getElementById('whisper-overlay');
    const chatMode = document.getElementById('chat-mode');

    if (overlay) overlay.style.display = 'none';

    // 入力せずに閉じた場合、モードを「全体(all)」に戻す
    if (chatMode && chatMode.value === 'whisper') {
        chatMode.value = 'all';
        chatMode.style.color = "#60a5fa"; 
    }
}

// ============================================================
// :::HANDLE_PLAYER_INPUT::: ⌨️ キー入力の集中管理・操作制御
// ============================================================
/**
 * 役割：
 * - チャット入力中かどうかの状態判定による操作ロック
 * - プレイヤー状態（伏せ等）の更新
 * - 移動・ハシゴ・アクション（ジャンプ・攻撃・アイテム取得）の処理振り分け
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

// ============================================================
// :::HANDLE_MOVEMENT_AND_LADDER::: 🏃 プレイヤーの移動・ハシゴ制御
// ============================================================
/**
 * 役割：
 * - 露店中・硬直中（Stun）の操作ガード
 * - 左右移動の処理と伏せ状態の判定
 * - ハシゴの接触判定・中心への吸着・昇降ロジックの管理
 */
function handleMovementAndLadder(hero, ladders) {

    // 🌟 追加：露店を開いている間は移動・ハシゴ操作を禁止
    if (hero.is_vending) return;
	
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

// ============================================================
// :::HANDLE_ACTIONS::: ⚔️ アクション制御（ジャンプ・攻撃・回収）
// ============================================================
/**
 * 役割：
 * - ジャンプ：ハシゴからの飛び降りジャンプ、地面からのジャンプ処理
 * - 攻撃：キー押しっぱなしによる連続攻撃の開始処理
 * - 回収：Zキー押しっぱなしによるアイテムの高速回収処理（タイマー管理）
 * - 状態ガード：露店中はアクション不可
 */
function handleActions(hero, items) {

    if (hero.is_vending) return; // 露店中はアクション（ジャンプ・攻撃・拾う）不可
	
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

// ============================================================
// :::SETUP_START_BUTTON_HOTKEY::: 🚀 名前入力欄のエンター送信設定
// ============================================================
/**
 * 役割：
 * - プレイヤーが名前を入力した際、エンターキーを押すだけで
 *   スタートボタンのクリック動作を誘発させる
 */
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

// ============================================================
// :::LOGIN_SYSTEM_INITIALIZER::: 🔐 ログイン機能の安全な初期化
// ============================================================
const initLoginSystem = () => {
    // ボタンと入力欄をここで確実に取得
    const startBtn = document.getElementById('start-game-btn');
    const nameInput = document.getElementById('user-name-input');
    const passwordInput = document.getElementById('user-pass-input');

    // まだ要素が準備できていなければ0.1秒後に再試行（これが安定の秘訣です）
    if (!startBtn || !nameInput || !passwordInput) {
        setTimeout(initLoginSystem, 100);
        return;
    }

    // --- ここから下が「うまくいく」と分かっているあなたのコード ---
    startBtn.onclick = () => {
        const userName = nameInput.value.trim();
        const password = passwordInput.value;
        const loginError = document.getElementById('login-error');

        // --- 1. 入力チェック ---
        if (!userName || !password) {
            if (loginError) {
                loginError.innerText = "名前とパスワードを入力してください";
                loginError.style.color = "#ff4444";
            }
            if (!userName) nameInput.style.border = "2px solid #ff4444";
            if (!password) passwordInput.style.border = "2px solid #ff4444";
            return;
        }

        // --- 2. 正常な場合はスタイルをリセット ---
        nameInput.style.border = "1px solid #ccc";
        passwordInput.style.border = "1px solid #ccc";
        if (loginError) loginError.innerText = "";

        // --- 3. フォーカスを外す ---
        nameInput.blur();
        passwordInput.blur();
        
        // 🌟 サーバーへのログイン送信
        if (typeof socket !== 'undefined' && socket.connected) {
            socket.emit('login', { 
                username: userName, 
                password: password,
                channel: typeof selectedChannel !== 'undefined' ? selectedChannel : 1,
                group: typeof selectedGroup !== 'undefined' ? selectedGroup : 0, 
                charVar: typeof selectedCharVar !== 'undefined' ? selectedCharVar : 1
            });
            console.log("🚀 認証リクエスト送信... 名前/メアド:", userName, "チャンネル:", selectedChannel);
        }
    };

    // 💡 ついでにショートカット（Enterキー）も有効化しておきます
    passwordInput.onkeydown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            startBtn.onclick();
        }
    };
    nameInput.onkeydown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            startBtn.onclick();
        }
    };

    console.log("✅ ログインボタンの紐付けが完了しました");
};

// 実行開始
initLoginSystem();

// ============================================================
// :::SETUP_LOGIN_HOTKEY::: 🔑 パスワード入力欄のログイン・ショートカット
// ============================================================
/**
 * 役割：
 * - パスワード入力中にエンターキーが押された際、
 *   ログインボタン（startBtn）の処理を強制実行させる
 */
const passInputEl = document.getElementById('user-pass-input');
if (passInputEl) {
    passInputEl.onkeydown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            startBtn.onclick(); // ログインボタンの処理を実行
        }
    };
}

// ============================================================
// :::SETUP_NAME_INPUT_NAVIGATION::: 🚀 名前入力からパスワード欄への道案内
// ============================================================
/**
 * 役割：
 * - 名前入力後にエンターキーが押された際、
 *   パスワード入力欄へ自動的にフォーカスを移動させる
 */
if (nameInput) {
    nameInput.onkeydown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const pf = document.getElementById('user-pass-input');
            if (pf) pf.focus();
        }
    };
}

// ============================================================
// :::UPDATE_CHANNEL_UI::: 📺 チャンネルボタンの現在地UI更新
// ============================================================
/**
 * 役割：
 * - チャンネル選択ボタン群の状態（activeクラス）をリセット
 * - 現在のチャンネル番号と一致するボタンを検出し、強調表示させる
 */
function updateChannelUI(currentChannel) {
    const channelBox = document.querySelector('.channel-box');
    if (!channelBox) return;

    const buttons = channelBox.querySelectorAll('button');
    buttons.forEach(btn => {
        // ボタンの onclick 属性（例: "changeChannel(1)"）に現在のch番号が含まれるか確認
        const onclickText = btn.getAttribute('onclick');
        if (onclickText && onclickText.includes(`changeChannel(${currentChannel})`)) {
            btn.classList.add('active'); // 一致したら光らせる
        } else {
            btn.classList.remove('active'); // それ以外は消す
        }
    });
}

// ゲーム全体で共有するツールチップ用変数
window.currentHoverSlot = null; // 現在マウスが乗っているアイテム情報
window.rawMouseX = 0;           // ブラウザ上の生のマウスX
window.rawMouseY = 0;           // ブラウザ上の生のマウスY

// ------------------------------------------
// 🛡️ ツールチップ描画エンジン（左右100px・下部150px拡張・完全踏襲版）
// ------------------------------------------
let tooltipCtx = null;

// --- ⚙️ 調整用定数（ソース上で変更可能） ---
const sideMargin = 100;     // 🌟 左右の拡張分
const bottomMargin = 200;   // 🌟 下方向の拡張分
const SHOW_DEBUG = false;    // 🌟 trueでデバッグ表示ON / falseで非表示
// ----------------------------------------------

// ============================================================
// :::SET_MOUSE_TRACKING::: 🖱️ マウス座標のリアルタイム監視
// ============================================================
/**
 * 役割：
 * - 画面上のマウス位置（clientX/Y）を監視
 * - windowオブジェクトのグローバル変数として常に最新の座標を保持
 */
document.addEventListener('mousemove', (e) => {
    window.rawMouseX = e.clientX;
    window.rawMouseY = e.clientY;
});

// 画像オブジェクトのキャッシュ
const tooltipImageCache = {};

// ============================================================
// :::RENDER_TOOLTIP::: 💡 ツールチップの投影・レンダリング制御
// ============================================================
/**
 * 役割：
 * - ツールチップ用レイヤーの物理サイズ・解像度（DPR）の同期管理
 * - マウス座標の精密なスケーリングと原点補正
 * - ホバー中アイテムの画像キャッシュ解決と描画関数の呼び出し
 * - デバッグ用のUI範囲可視化機能
 */
function renderTooltip() {
    const tCanvas = document.getElementById('tooltip-layer');
    const stageCanvas = document.getElementById('stage');
    
    if (!tCanvas || !stageCanvas) return;
    
    tooltipCtx = tCanvas.getContext('2d');
    
    const baseWidth = 800;
    const baseHeight = 600;

    // 🌟 拡張サイズの計算
    const extendedWidth = baseWidth + (sideMargin * 2);
    const extendedHeight = baseHeight + bottomMargin; // 下方向に150px拡張

    // 🌟 内部解像度（DPR 2倍想定）を同期
    const targetInternalWidth = extendedWidth * 2;
    const targetInternalHeight = extendedHeight * 2;

    if (tCanvas.width !== targetInternalWidth || tCanvas.height !== targetInternalHeight) {
        tCanvas.width = targetInternalWidth;
        tCanvas.height = targetInternalHeight;
    }

    // 🌟 配置修正
    if (tCanvas.parentElement !== stageCanvas.parentElement) {
        stageCanvas.parentElement.appendChild(tCanvas);
    }

    // 🌟 物理配置とサイズ設定
    tCanvas.style.zIndex = "2147483647"; 
    tCanvas.style.pointerEvents = "none";
    tCanvas.style.position = "absolute"; 
    tCanvas.style.top = "0px";           
    tCanvas.style.left = `-${sideMargin}px`; 
    tCanvas.style.width = `${extendedWidth}px`; 
    tCanvas.style.height = `${extendedHeight}px`; // 🌟 高さも拡張
    tCanvas.style.transform = "none";    
    tCanvas.style.margin = "0";

    tCanvas.style.border = SHOW_DEBUG ? "2px solid yellow" : "none"; 
    tCanvas.style.display = "block";
    tCanvas.style.visibility = "visible";

    // 🌟 描画スケーリングと原点補正
    tooltipCtx.setTransform(1, 0, 0, 1, 0, 0); 
    tooltipCtx.clearRect(0, 0, tCanvas.width, tCanvas.height); 
    
    tooltipCtx.scale(2, 2); 
    tooltipCtx.translate(sideMargin, 0);

    // --- デバッグ用の描画 ---
    if (SHOW_DEBUG) {
        tooltipCtx.fillStyle = "blue";
        tooltipCtx.fillRect(10, 10, 40, 40);

        // Stage範囲（本来の画面枠 800x600）を赤い線で可視化
        tooltipCtx.strokeStyle = "red";
        tooltipCtx.lineWidth = 1;
        tooltipCtx.strokeRect(0, 0, baseWidth, baseHeight);

        // 拡張した下部エリア（150px分）を緑の線で可視化
        tooltipCtx.strokeStyle = "green";
        tooltipCtx.strokeRect(0, baseHeight, baseWidth, bottomMargin);
    }

    // 座標計算
    const rect = tCanvas.getBoundingClientRect();
    
    // 🌟 画面伸縮率の算出（拡張後のサイズを基準にする）
    const scaleX = extendedWidth / (rect.width || extendedWidth);
    const scaleY = extendedHeight / (rect.height || extendedHeight);
    
    // 🌟 マウス座標を計算
    const canvasX = (window.rawMouseX - rect.left) * scaleX - sideMargin;
    const canvasY = (window.rawMouseY - rect.top) * scaleY;

    if (typeof window.rawMouseX !== 'undefined') {
        
        // 🌟 【全プロパティ手動流し込み & 画像解決】
        if (window.currentHoverSlot) {
            const item = window.currentHoverSlot;
            //const master = ITEM_MASTER[String(item.id)];
            
            //if (master) {
            //    Object.assign(item, master);
            //}

            const imgName = item.image_name || item.type || item.id;
            const imgPath = `${IMAGE_DOMAIN}item_assets/${imgName}.png`;

            if (!tooltipImageCache[imgPath]) {
                const img = new Image();
                img.src = imgPath;
                tooltipImageCache[imgPath] = img;
            }
            item.img = tooltipImageCache[imgPath]; 
        }

        if (SHOW_DEBUG) {
            tooltipCtx.beginPath();
            tooltipCtx.arc(canvasX, canvasY, 10, 0, Math.PI * 2); 
            tooltipCtx.fillStyle = "red";
            tooltipCtx.fill();

            tooltipCtx.fillStyle = "yellow";
            tooltipCtx.font = "bold 14px sans-serif"; 
            tooltipCtx.fillText(`(${Math.round(canvasX)},${Math.round(canvasY)})`, canvasX + 20, canvasY);
        }
        
        // 🌟 【本番描画】
        if (window.currentHoverSlot && typeof drawItemTooltip === 'function') {
            drawItemTooltip(tooltipCtx, window.currentHoverSlot, canvasX, canvasY, window.hero);
        }
    }
    
    requestAnimationFrame(renderTooltip);
}

// 描画開始
renderTooltip();

// ============================================================
// :::AUTO_LOGIN_INIT::: 🔄 トークンによる自動ログイン試行
// ============================================================
/**
 * 役割：
 * - localStorageから `game_token` を読み取り
 * - トークンが存在する場合、サーバーへ `auto_login` を要求し、
 *   プレイヤーをログイン画面の手間なしにゲームへ復帰させる
 */
const savedToken = localStorage.getItem('game_token');
if (savedToken) {
    console.log("🔍 保存されたトークンを発見！自動ログインを試行します...");
    // サーバーへ自動ログインを依頼
    socket.emit('auto_login', { token: savedToken });
}

// ============================================================
// :::ON_LOGIN_RESPONSE::: 🔑 ログイン認証応答・ゲーム開始・状態遷移
// ============================================================
/**
 * 役割：
 * - ログイン成功時のトークン保存と認証情報の同期
 * - 画面遷移（ログインUI非表示 → キャラ選択UI呼び出し）
 * - ステータス情報の更新（hp, mp, gold, level等）
 * - ゲーム開始時の `join` 通知とサウンド/ループ処理の起動（isGameStarted状態依存）
 * - ログイン失敗時のエラーUI表示とリトライ制御
 */
 /*
socket.on('login_response', (data) => {
    const loginError = document.getElementById('login-error');
    const passwordInput = document.getElementById('user-pass-input');
    const nameInput = document.getElementById('user-name-input'); 
	
	if (data.success && data.stats) {
        console.log("ログイン成功、モデルID:", data.stats.model_id);
        //alert("現在のモデルIDは: " + data.stats.model_id + " です");
    }

    if (data.success) {
	    // 🌟 【ここに追加】ログイン保持用トークンの保存
        if (data.token) {
            localStorage.setItem('game_token', data.token);
            console.log("✅ トークンを保存しました");
        }
		
        myId = socket.id; 
        console.log(`[LOGIN SUCCESS] Player: ${data.username} (Internal ID: ${socket.id})`);

        if (loginError) loginError.innerText = "";
        if (nameInput) nameInput.style.border = "1px solid #ccc";
        if (passwordInput) passwordInput.style.border = "1px solid #ccc";

        // 🚀 【救出処理・同期】
        const tCanvas = document.getElementById('tooltip-layer');
        const stageCanvas = document.getElementById('stage');
        if (tCanvas && stageCanvas) {
            stageCanvas.parentElement.appendChild(tCanvas); 
            console.log("🌟 Tooltip Layer synced with Stage!");
        }

        // ========================================================
        // 🌟 【修正の核心】ID・パスワードが合っているので、ここで画面遷移！
        // ========================================================
        // 1. まだキャラクターを選んでいない場合（ゲーム開始前）のみパネルを開く
        if (!window.isGameStarted) {
            // ログインパネルをここで隠す
            const loginOverlay = document.getElementById('login-overlay');
            if (loginOverlay) loginOverlay.style.display = 'none';

            // キャラクター選択画面を安全に呼び出す
            createCharSelector();
        }
        // ========================================================

        // 💡 サーバーから返ってきたアカウント基本データを hero やグローバルに退避
        const userName = data.username;
        if (typeof hero !== 'undefined') {
            hero.name = userName;
            if (data.stats) {
                hero.level = data.stats.level || 1;
                hero.hp    = data.stats.hp || 100;
                hero.mp    = data.stats.mp || 50;
                hero.gold  = data.stats.gold || 0;
                hero.x     = data.stats.x || 100;
                hero.y     = data.stats.y || 400;
                hero.jobId = data.stats.job_id || 0;
            }
            hero.channel = data.channel || selectedChannel; 
            
            // 選択画面での初期表示用（まだ確定ではない）
            hero.group = typeof selectedGroup !== 'undefined' ? selectedGroup : 0;
            hero.charVar = typeof selectedCharVar !== 'undefined' ? selectedCharVar : 1; 

            if (typeof updateChannelUI === 'function') {
                updateChannelUI(hero.channel);
            }
        }

        // ========================================================
        // 🌟 【ここが重要】ここではゲームをまだ開始（emit / update）しない！
        // ========================================================
        // ※ もし以前の『キャラ選択完了後のボタン処理』側（createCharSelector内）に 
        // socket.emit('join') や playBGM()、update() がすでに記述されている場合は、
        // この login_response 側からは削除（あるいは実行をスキップ）するのが正解です。
        //
        // もし「選択画面のボタン側」にまだ引っ越しさせていない場合は、
        // 以下の条件文によって「すでにキャラ選択が終わって開始フラグが立った状態の2回目」だけ
        // 実行されるようにガードをかけて暴発を防ぎます。
        // ========================================================
        if (window.isGameStarted) {
            socket.emit('join', { 
                name: userName, 
                channel: hero.channel,
                group: typeof selectedGroup !== 'undefined' ? selectedGroup : hero.group,
                x: hero.x,
                y: hero.y
            });
			
			// 💡 【ここに追加します】
            // ゲーム世界に降り立った瞬間に、サーバーへ自分の最新ステータス（is_onlineなど）を問い合わせる通信を送信！
            socket.emit('get_account_info');

            if (typeof audioCtx !== 'undefined' && audioCtx.state === 'suspended') {
                audioCtx.resume();
            }
            
            if (typeof playBGM === 'function') {
                playBGM();
            }

            if (typeof update === 'function') {
                update();
            }
        }

    } else {
        // ❌ 認証に失敗した場合は、画面を隠さずにそのまま残してエラー枠線を表示
        if (loginError) {
            loginError.innerText = data.message;
            loginError.style.color = "#ff4444";
        }
        if (nameInput) nameInput.style.border = "2px solid #ff4444";
        if (passwordInput) {
            passwordInput.style.border = "2px solid #ff4444";
            passwordInput.value = "";
            setTimeout(() => passwordInput.focus(), 10);
        }
    }
});
*/

// :::ON_AUTH_RESPONSE::: 🔒 ログイン認証のみ（詳細データ未着）
socket.on('auth_response', (data) => {
    console.log("🔒 認証成功。キャラクター選択画面へ");
	
	//alert(data.model_id);
    
    // ログインパネルを隠す
    const loginOverlay = document.getElementById('login-overlay');
    if (loginOverlay) loginOverlay.style.display = 'none';

    // 🚀 【救出処理・同期】
    const tCanvas = document.getElementById('tooltip-layer');
    const stageCanvas = document.getElementById('stage');
    if (tCanvas && stageCanvas) {
        stageCanvas.parentElement.appendChild(tCanvas); 
    }

	if (data.model_id !== -1) {
        selectCharacterAndLogin(data.model_id);
    } else {
        // -1 なら選択画面を出す
        createCharSelector();
    }
	
    // キャラクター選択画面を呼び出す
    //createCharSelector();
});

// :::ON_LOGIN_DATA::: 🚀 本番ログインデータ受信・ゲーム開始・状態遷移
socket.on('login_data', (data) => {

	console.log("🏁 [重要] login_data 到着:", data);
	
    const loginError = document.getElementById('login-error');
    
    if (!data.success) {
        if (loginError) loginError.innerText = data.message;
        return;
    }

    // 💡 トークン保存
    if (data.token) localStorage.setItem('game_token', data.token);
    myId = socket.id;

    // 💡 モデルIDが -1 以外なら選択画面をスキップして即開始
    if (data.stats && data.stats.model_id !== -1) {
        console.log("🌟 キャラクター選択済み (ModelID: " + data.stats.model_id + ")。自動開始します。");
        window.isGameStarted = true;
        selectedGroup = data.stats.model_id;
        
        // ログインパネルを念のため隠す
        const loginOverlay = document.getElementById('login-overlay');
        if (loginOverlay) loginOverlay.style.display = 'none';
    }

    // 💡 hero やグローバルへのデータ退避
    const userName = data.username;
    if (typeof hero !== 'undefined') {
        hero.name = userName;
        if (data.stats) {
            hero.level = data.stats.level || 1;
            hero.hp    = data.stats.hp || 100;
            hero.mp    = data.stats.mp || 50;
            hero.gold  = data.stats.gold || 0;
            hero.x     = data.stats.x || 100;
            hero.y     = data.stats.y || 400;
            hero.jobId = data.stats.job_id || 0;
        }
        hero.channel = data.channel || 1;
        if (typeof updateChannelUI === 'function') updateChannelUI(hero.channel);
    }

    // 🌟 ゲーム開始処理（自動ログイン時もここが実行される）
    if (window.isGameStarted) {
        socket.emit('join', { 
            name: userName, 
            channel: hero.channel,
            group: selectedGroup,
            x: hero.x,
            y: hero.y
        });
        
        socket.emit('get_account_info');

        if (typeof audioCtx !== 'undefined' && audioCtx.state === 'suspended') audioCtx.resume();
        if (typeof playBGM === 'function') playBGM();
        if (typeof update === 'function') update();
        
        console.log("✅ ゲームセッションを開始しました");
    }
});

// ============================================================
// :::UPDATE_CHANNEL_BUTTONS::: 📺 チャンネルボタンのアクティブ表示管理
// ============================================================
/**
 * 役割：
 * - チャンネル選択ボタン群の `active` クラスをリセット
 * - `onclick` 属性に指定されたチャンネル番号と一致するボタンを検出し、
 *   現在選択中であることを示すために `active` クラスを付与する
 */
function updateChannelButtons(currentChannel) {
    const buttons = document.querySelectorAll('.channel-box button');
    buttons.forEach(btn => {
        // ボタンのテキスト（CH.1など）から数字を抽出、またはonclickの引数と比較
        if (btn.getAttribute('onclick') === `changeChannel(${currentChannel})`) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

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

// ============================================================
// :::SELECT_CHANNEL::: 🌐 チャンネル選択のロジックとUI同期
// ============================================================
/**
 * 役割：
 * - 選択されたチャンネル番号を `selectedChannel` に保存
 * - UIのボタン群（.ch-btn）から既存の `active` クラスをリセット
 * - 選択されたチャンネルのボタンに `active` クラスを付与して強調表示
 */
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
// :::ON_CHANGE_CHANNEL_RESPONSE::: 📡 チャンネル移動後の世界同期処理
// ============================================================
/**
 * 役割：
 * - サーバーからの移動完了通知を受け取り、自身のチャンネル属性を更新
 * - 移動先の部屋にいる全プレイヤーリストを同期
 * - リスト更新の際、自分自身(socket.id)を除外（othersオブジェクトの再構築）
 */
socket.on('change_channel_response', (data) => {
    if (data.success) {
        // -------------------------------------------------------
        // 1. チャンネル情報の更新
        // -------------------------------------------------------
        hero.channel = data.channel;

        // -------------------------------------------------------
        // 2. 住人リストの同期（自分自身を除外して「お掃除」完了！）
        // -------------------------------------------------------
        // 🌟 住人リストを丸ごと入れ替える際、自分(socket.id)だけは
        // 描画対象（others）に入れないようにフィルタリングします
        others = {};
        if (data.roomPlayers) {
            for (let id in data.roomPlayers) {
                if (id !== socket.id) {
                    others[id] = data.roomPlayers[id];
                }
            }
        }

        console.log(`チャンネル ${data.channel} の住人と同期しました`, others);
    }
});

// game.js
/*
function changeChannel(newChannelId) {
    console.log(`チャンネル ${newChannelId} へ移動リクエスト中...`);
    
    // userIdを送らず、行きたいチャンネル番号だけ送る
    socket.emit('request_change_channel', {
        targetChannel: newChannelId
    });
}
*/

// ============================================================
// :::ON_PLAYER_MOVED_CHANNEL::: 📡 プレイヤーのチャンネル移動イベント処理
// ============================================================
/**
 * 役割：
 * - サーバーからのチャンネル移動通知を解析
 * - 自分自身（myId）の移動であれば、hero.channelの更新とothersのクリアを行う
 * - 他プレイヤーであれば、チャンネル情報を更新し、
 *   もし自分と同じチャンネルでなくなった場合はothers名簿から削除（お掃除）する
 */
socket.on('player_moved_channel', (data) => {
    console.log("【1.受信チェック】データが届きました:", data);
    const { userId, newChannel } = data;

    // 自分のID(myId)が何になっているか確認
    console.log(`【2.比較チェック】自分のID: ${myId} / 届いたID: ${userId}`);

    // もし myId が null だったり、数値の 10 だったりするとここで失敗します
    if (userId === myId) {
        if (typeof hero !== 'undefined') {
            hero.channel = newChannel;
            console.log("【3.更新完了】hero.channelを更新しました！現在の値:", hero.channel);
            
            // 🌟 自分が移動したなら、今までの部屋の住人(others)は見えなくなるべきなのでリセット
            others = {};
        } else {
            console.error("【エラー】heroという変数が見つかりません");
        }
    } else {
        console.log("【4.判定】自分以外の移動通知なので、自分のhero.channelは更新しません");
    }
    
    // -------------------------------------------------------
    // 5. 他のプレイヤー(others)の名簿を更新・お掃除
    // -------------------------------------------------------
    if (typeof others !== 'undefined' && others[userId]) {
        // データの更新自体は行う
        others[userId].channel = newChannel;

        // 🌟 もし移動先のチャンネルが「自分と同じ」でないなら、画面から消去する！
        if (newChannel !== hero.channel) {
            delete others[userId];
            console.log(`【5.お掃除】別の部屋へ行ったプレイヤー(${userId})を名簿から削除しました`);
        }
    }
});

// ============================================================
// :::CHANGE_CHANNEL::: 🔄 チャンネル切り替え処理の司令塔
// ============================================================
/**
 * 役割：
 * - 既に現在のチャンネルと同じ場合は処理を中断（ガード節）
 * - サーバーへ移動リクエストを送信
 * - チャンネルボタンのUIを即座に更新
 * - heroのチャンネル情報を最新化
 */
function changeChannel(number) {
    // 🌟 1. すでにそのチャンネルにいる場合は何もしない（無駄な通信を防ぐ）
    if (typeof hero !== 'undefined' && hero.channel === number) {
        console.log(`すでに CH.${number} に接続しています。`);
        return;
    }

    console.log(`チャンネル ${number} へ移動中...`);

    // 🌟 2. サーバーに移動リクエストを送る
    socket.emit('change_channel', { newChannel: number });

    // 🌟 3. UI（ボタンの見た目）を即座に更新する
    // これにより、クリックした瞬間にボタンが黄色く光ります
    updateChannelUI(number);

    // 🌟 4. キャラクターの保持しているチャンネル情報を更新
    if (typeof hero !== 'undefined') {
        hero.channel = number;
    }
}

/*
// サーバーからの応答を受け取った時の処理
socket.on('change_channel_response', (data) => {
    if (data.success) {
        hero.channel = data.channel; // 自分のチャンネル情報を更新
        
        // 画面上の他プレイヤーを一旦全員消去する（別の部屋の人たちなので）
        others = {}; 
        
        console.log(`チャンネル ${data.channel} に切り替わりました！`);
    }
});
*/

/*
socket.on('player_joined', (newPlayerData) => {
    console.log("新入りのID:", newPlayerData.id, "自分のID:", myId); // 🌟ここをチェック！
    if (newPlayerData.id === myId) return;
    
    others[newPlayerData.id] = newPlayerData;
    console.log("現在の全プレイヤーリスト:", others);
});
*/

// ============================================================
// :::REGISTER_AND_LOAD_PLAYER::: 👤 プレイヤーの新規登録と画像プリロード
// ============================================================
/**
 * 役割：
 * - プレイヤーデータを others オブジェクトへ登録
 * - 描画に必要な外見グループ(g)とバリエーション(v)を判定
 * - キャラクターの描画フレームを先行してロードし、描画準備を整える
 */
function registerAndLoadPlayer(playerData) {
    // 1. others に登録
    others[playerData.id] = playerData;

    // 🌟 2. 重要！その人の見た目(g, v)をロードしておく
    // これにより getPlayerCurrentImg の中で playerSprites[g][v] が使えるようになります
    if (playerData.group !== undefined && playerData.charVar !== undefined) {
        loadCharFrames(playerData.group, playerData.charVar);
    }
}

// ============================================================
// :::ON_PLAYER_JOINED::: 🔔 新規プレイヤー参加の受信処理
// ============================================================
/**
 * 役割：
 * - サーバーから送られてきた「プレイヤーが参加した」という通知を受信
 * - 登録と画像ロードの専用窓口（:::REGISTER_AND_LOAD_PLAYER:::）を呼び出し、
 *   新しい旅人をスムーズに迎え入れる
 */
socket.on('player_joined', (data) => {
    console.log(data.name + "が来たので画像をロードします");
    registerAndLoadPlayer(data);
});

// ============================================================
// :::ON_CHANGE_CHANNEL_RESPONSE::: 📡 チャンネル移動後の世界再構築
// ============================================================
/**
 * 役割：
 * - チャンネル移動成功時、旧世界の住人名簿（others）を全クリア
 * - 新しい世界の住人リスト（data.roomPlayers）を走査
 * - 各プレイヤーに対し、個別の登録・画像ロード準備処理を適用
 */
socket.on('change_channel_response', (data) => {
    if (data.success) {
        others = {}; // 一旦クリア
        for (let id in data.roomPlayers) {
            registerAndLoadPlayer(data.roomPlayers[id]);
        }
    }
});

// ============================================================
// 📡 [SECTION 6: NETWORK] 通信ハンドラ (Socket.io)
// 役割: サーバーへのデータ送信(emit)と、サーバーからの受信(on)
// ============================================================
// ============================================================
// :::ON_SERVER_STATE::: 🌐 サーバーからの世界状態同期・詳細救出
// ============================================================
/**
 * 役割：
 * - サーバーからの最新状態（state）を受信・反映
 * - チャンネル移動・アイテムドロップ音の判定処理
 * - プレイヤー入室通知の判定と管理
 * - 周辺環境（others, enemies, platforms等）のチャンネル別フィルタリング
 * - 🛡️ 重要：アイテム詳細消失対策（旧データとのマージによる復元）
 * - heroへの最終的なプロパティ同期と描画バッファの更新
 */
socket.on('state', (data) => {
    // -------------------------------------------------------
    // 1. 基本チェックと共通処理
    // -------------------------------------------------------
    if (!data) return;
    
    // 既存のサーバーイベントハンドラ（必要に応じて実行）
    if (typeof handleServerEvents === 'function') handleServerEvents(data);

    // -------------------------------------------------------
    // 2. 自分のデータ（myData）の特定とチャンネル判定
    // -------------------------------------------------------
    const myHeroData = data.players[socket.id];
    if (!myHeroData) return;

    const serverChannel = myHeroData.channel;

    // -------------------------------------------------------
    // 3. 音・通知の判定（チャンネル・アイテム・入室）
    // -------------------------------------------------------
    const allItemsFromServer = data.items || [];
    const currentTotalCount = allItemsFromServer.length;
    let isChannelJustChanged = false;

    // チャンネル切り替え・アイテムドロップ音判定
    if (serverChannel !== window.currentChannelId || typeof window.lastCount === 'undefined') {
        window.lastCount = currentTotalCount;
        window.currentChannelId = serverChannel;
        isChannelJustChanged = true; 
        console.log("📥 チャンネル切り替え検知：基準値を同期しました");
    } else {
        if (currentTotalCount > window.lastCount) {
            console.log("🌟 AAA：アイテムドロップ検知！"); 
            if (typeof playDropSound === 'function') playDropSound(); 
        }
        window.lastCount = currentTotalCount;
    }

    // 他プレイヤーの入室通知・入室音判定
    const currentPlayerIdsInMyChannel = new Set();
    let hasNewArrival = false;
    
    for (let id in data.players) {
        if (id === socket.id) continue;
        const p = data.players[id];
        if (p.channel === serverChannel) {
            currentPlayerIdsInMyChannel.add(id);
            if (!window.prevPlayerIds.has(id)) {
                if (!isChannelJustChanged && !window.recentLoginIds.has(id)) {
                    hasNewArrival = true;
                    const arrivalName = p.name || "Player";
                    if (typeof addNotification === 'function') {
                        addNotification(`${arrivalName} が入室しました。`, "#66FF66");
                    }
                }
            }
        }
    }
    if (hasNewArrival && !isChannelJustChanged) {
        if (typeof playInviteSound === 'function') playInviteSound();
    }
    window.prevPlayerIds = currentPlayerIdsInMyChannel;

    // -------------------------------------------------------
    // 4. 周辺環境（自分以外）のフィルタリング更新
    // -------------------------------------------------------
    enemies   = data.enemies;   
    platforms = data.platforms; 
    ladders   = data.ladders;   

    // 他プレイヤー情報（同チャンネルのみ）
    others = {}; 
    for (let id in data.players) {
        if (id !== socket.id && data.players[id].channel === serverChannel) {
            others[id] = data.players[id];
        }
    }

    // -------------------------------------------------------
    // 5. アイテムのガタつき防止（既存アニメ状態の維持）
    // -------------------------------------------------------
    items = allItemsFromServer.filter(it => !it.isPickedUp).map(si => { 
        const existing = items.find(it => it.id === si.id); 
        return existing ? existing : si; 
    });

    // -------------------------------------------------------
    // 6. 🛡️ 重要：詳細消失対策（インベントリと店名の保護）
    // -------------------------------------------------------
    // 上書きされる前のデータを退避
    const oldInventory = (window.hero && window.hero.inventory) ? JSON.parse(JSON.stringify(window.hero.inventory)) : [];
    const oldVendingTitle = (window.hero && window.hero.vending_title) ? window.hero.vending_title : "";

    // A. 露店タイトルの保護（サーバーから届いた値が空なら以前の値を維持）
    if (!myHeroData.vending_title && oldVendingTitle) {
        myHeroData.vending_title = oldVendingTitle;
    }

    // B. インベントリの詳細項目復元
    if (myHeroData.inventory && Array.isArray(myHeroData.inventory)) {
        myHeroData.inventory.forEach((newItem) => {
            if (!newItem) return;

            const newKey = newItem.equipment_id || newItem.instanceId;
            const oldItem = oldInventory.find(old => {
                // ✨ 修正点1: 比較対象の old が存在しない場合はスキップ
                if (!old) return false;

                const oldKey = old.equipment_id || old.instanceId;
                const isIdMatch = (newKey && oldKey && String(newKey) === String(oldKey));
                const isSlotMatch = (newItem.slot_index === old.slot_index && newItem.id === old.id);
                return isIdMatch || isSlotMatch;
            });

            // ✨ 修正点2: oldItem が見つかった場合（＝過去のデータに存在する場合）のみ詳細を復元
            if (oldItem) {
                const isDataLost = (typeof newItem.totalALLStats === 'undefined' || newItem.totalALLStats === 0);
                if (isDataLost && oldItem.totalALLStats > 0) {
                    const props = [
                        'name', 'displayName', 'imageName', 'atk', 'matk', 'def',
                        'str', 'dex', 'int', 'luk', 'maxHp', 'maxMp', 
                        'totalFirstStats', 'totalALLStats'
                    ];
                    props.forEach(p => {
                        if (newItem[p] === undefined || newItem[p] === 0 || newItem[p] === "") {
                            newItem[p] = oldItem[p];
                        }
                    });
                    if (!newItem.instanceId && oldItem.instanceId) newItem.instanceId = oldItem.instanceId;
                    if (!newItem.equipment_id && oldItem.equipment_id) newItem.equipment_id = oldItem.equipment_id;
                    if (!newItem.type && oldItem.type) newItem.type = oldItem.type;
                    console.log(`🔧 Slot:${newItem.slot_index} (ID:${newKey}) の詳細を救出しました`);
                }
            }
        });
    }

    // -------------------------------------------------------
    // 7. 最終同期（window.hero の更新）
    // -------------------------------------------------------
    // myHeroData の値を hero に反映
    hero.inventory     = myHeroData.inventory || [];
    hero.gold          = (myHeroData.gold !== undefined) ? myHeroData.gold : hero.gold; // 所持金同期を追加
    hero.score         = myHeroData.score || 0;
    hero.channel       = myHeroData.channel;
    hero.level         = myHeroData.level;
    hero.exp           = myHeroData.exp;
    hero.maxExp         = myHeroData.maxExp || 100;
    hero.hp            = myHeroData.hp;
    hero.maxHp         = myHeroData.maxHp || 100;
    hero.str           = myHeroData.str || 50;
    hero.dex           = myHeroData.dex;
    hero.luk           = myHeroData.luk;
    hero.ap            = (myHeroData.ap !== undefined) ? myHeroData.ap : 0;

    // ✨ 🌟 露店状態と店名をここで最終確定
    hero.is_vending    = !!myHeroData.is_vending; 
    hero.vending_title = myHeroData.vending_title || ""; 

    // グローバル変数全体を最新に
    window.hero = hero;

    // 描画バッファの更新
    if (typeof inventoryVisualBuffer !== 'undefined') {
        inventoryVisualBuffer = window.hero.inventory;
    }
});

// ============================================================
// :::ON_PLAYER_UPDATE::: 💰 プレイヤー個別のステータス・所持金更新
// ============================================================
/**
 * 役割：
 * - サーバーからのプレイヤー個別更新通知を受信
 * - 自分のID(socket.id)と一致する場合、hero オブジェクトの値を最新化
 * - ショップ画面などのUIにある所持金表示を `toLocaleString()` を使って綺麗に更新
 */
socket.on('player_update', (updatedPlayer) => {
    // 1. 自分の情報の時だけ hero 変数を更新
    if (updatedPlayer.id === socket.id) {
        // hero.js や view.js で使っている変数 hero を更新
        hero.gold = updatedPlayer.gold; 
        
        // 🌟 ショップが開いているなら、所持金表示を最新にする
        const goldDisplay = document.getElementById('shop-user-gold');
        if (goldDisplay) {
            // 引数名の updatedPlayer.gold を使います
            goldDisplay.innerText = updatedPlayer.gold.toLocaleString();
        }
    }
});

// ============================================================
// :::ON_DAMAGE_EFFECT::: 💥 ダメージ数値・演出の生成処理
// ============================================================
/**
 * 役割：
 * - サーバーからのダメージ通知（位置、値、クリティカル判定など）を受信
 * - 演出用配列 `damageTexts` に新しいエフェクトオブジェクトを生成
 * - クリティカル判定やダメージの種類に応じた挙動の初期化
 */
socket.on('damage_effect', data => {
  damageTexts.push({ x: data.x + (Math.random()*20-10), y: data.y, val: data.val, timer: 40, vy: data.type === 'player_hit' ? -3 : -2, isCritical: data.isCritical, type: data.type });
});

// ============================================================
// :::ON_LEVEL_UP_EFFECT::: 🎊 レベルアップ祝賀演出の管理
// ============================================================
/**
 * 役割：
 * - サーバーからのレベルアップ通知を受信
 * - 祝賀サウンドの再生（playLevelUpSound）
 * - 画面上の演出用リスト `levelUpEffects` へのデータ登録
 */
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

// ============================================================
// :::ON_CHAT::: 💬 チャットログ・吹き出しの受信管理
// ============================================================
/**
 * 役割：
 * - サーバーからのチャットデータ受信
 * - タイプ別（全体・グループ・友達・内緒話・システム）のUI表示とカラーリング
 * - 名前クリックによる内緒話先設定（`setWhisperTarget`）のUI構築
 * - 頭上の吹き出し生成と、古い吹き出しの即時リセット（nullクリア）
 */
socket.on('chat', data => {
  // --- 1. 左下のログ表示 ---
  const div = document.createElement('div');
  
  // 🌟 色の設定
  let color = '#ffffff'; // デフォルト（通常・全体）を白に設定
  
  // 🌟 判定：特定のタイプがある場合に色を上書き
  if (data.type === 'group') color = '#ff80ff';   // グループ（ピンク）
  if (data.type === 'system') color = '#ffff99';  // システム（黄色）
  if (data.type === 'friend') color = '#ff9900';  // 🌟 友達（メイプルオレンジ）
  
  // 🌟 メイプル風内緒話の判定
  const isWhisper = data.type === 'whisper' || data.isWhisper;
  if (isWhisper) {
      // サーバー側から送られてくるメイプルグリーン（#00ff00）を適用
      color = data.color || '#00ff00'; 
  }

  // 🌟 名前部分をクリックできるように改造
  const isSystem = data.type === 'system';
  
  // 🌟 メイプル仕様：内緒話の時は名前の後のコロン（:）を表示しない
  const separator = isWhisper ? '' : ':';

  const nameSpan = isSystem 
    ? `<strong style="color:${color}">${data.name}${separator}</strong>` 
    : `<strong style="color:${color}; cursor:pointer; ${isWhisper ? 'font-weight:bold;' : ''}" onclick="setWhisperTarget('${data.name}')">${data.name}${separator}</strong>`;

  // ログにメッセージを追加
  // 🌟 名前(nameSpan)も本文も、上記で判定した color (友達ならオレンジ) が適用されます
  div.innerHTML = `<span style="color:#888;font-size:10px;margin-right:4px;">${data.time || ''}</span>` +
                  nameSpan + 
                  ` <span style="color:${color}; ${isWhisper ? 'font-weight:bold;' : ''}">${data.text}</span>`;
  
  if (msgBox) {
    msgBox.appendChild(div);
    msgBox.scrollTop = msgBox.scrollHeight;
  }

  // --- 2. 頭上の吹き出し表示の判定 ---
  // 🌟 修正ポイント：内緒話だけでなく、グループや友達チャットの場合もここで中断（吹き出しを出さない）
  if (isWhisper || data.type === 'group' || data.type === 'friend') {
      return; 
  }

  // 🌟 吹き出し用データ作成
  const chatData = { text: data.text, timer: 120 };

  // 🌟 修正：新しい吹き出しを出す前に null を代入して古いものを即座に消去する
  if (data.id === socket.id) {
    hero.chat = null; // 一旦クリア
    setTimeout(() => { hero.chat = chatData; }, 0); // 即時セット
  } else if (others[data.id]) {
    others[data.id].chat = null; // 一旦クリア
    setTimeout(() => { others[data.id].chat = chatData; }, 0); // 即時セット
  }
});

// ============================================================
// :::ON_USER_COUNTS::: 📊 チャンネル人口のリアルタイム同期
// ============================================================
/**
 * 役割：
 * - サーバーからチャンネルごとの接続人数（counts）を受信
 * - チャンネルボタン（ch-btn-1〜5）のテキストを「Ch X (Y人)」という形式で更新
 * - UIを通じて各世界の混雑状況をプレイヤーに伝える
 */
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
// :::RENDER_SHOP_UI::: 🛒 ショップUIの再描画と経済管理
// ============================================================
/**
 * 役割：
 * - ショップオーバーレイの更新（商品リスト、売却リスト）
 * - サーバーデータ（hero.inventory/gold）との整合性同期
 * - アイテムランク（bonus stats）に基づいたUIフィルタと輝き（glow）の生成
 * - 安全なID文字列処理による売買関数の実行基盤の構築
 */
function renderShopUI(data) {

    console.log("--- 🛒 renderShopUI 実行開始 ---");
    console.log("📥 届いたデータ(data):", data);
    
    // サーバーから届いた最新情報を hero オブジェクトに同期
    if (data) {
        if (data.myItems) {
            hero.inventory = data.myItems;
            console.log("✅ hero.inventory を同期しました。");
        }
        if (data.gold !== undefined) {
            hero.gold = data.gold;
            console.log("✅ hero.gold を同期しました:", hero.gold);
        }
    }

    const shopOverlay = document.getElementById('shop-overlay');
    const itemList = document.getElementById('shop-item-list');
    const sellList = document.getElementById('user-sell-list');
    const goldDisplay = document.getElementById('shop-user-gold');

    if (!shopOverlay || !itemList || !sellList) {
        console.error("❌ ショップのDOM要素が見つかりません。");
        return;
    }

    // 1. 所持金を表示
    if (typeof hero !== 'undefined') {
        goldDisplay.innerText = (hero.gold || 0).toLocaleString();
    }

    // 2. 商品リストを生成（購入リスト）
    itemList.innerHTML = ''; 
    console.log(`📝 商品リスト生成開始（全 ${data.inventory.length} 件）`);

    data.inventory.forEach((item) => {
        const row = document.createElement('div');
        row.style = "display: flex; align-items: center; padding: 3px; border-bottom: 1px solid #333; background: rgba(0,0,0,0.2); margin-bottom: 2px; cursor: default;";
        
        const actualItemId = item.item_id || item.id;
        const imgName = item.image_name || item.type || actualItemId;
        const imgPath = `${IMAGE_DOMAIN}item_assets/${imgName}.png`;

        // 🌟 アイテム名の安全な処理（シングルクォート対策）
const safeBuyName = (item.display_name || item.name || "アイテム");

// 🌟 重要: buyItem の引数に 'アイテム種別' と '表示名' を追加
row.innerHTML = `
    <div class="shop-item-row-div" 
         ondblclick="buyItem('${String(actualItemId)}', '${item.type || item.item_type}', '${safeBuyName}')" 
         onclick="selectShopItem(this)">
        <div style="width: 38px; height: 38px; min-width: 38px; background: #ffffff; border: 1px solid #ddd; margin-right: 12px; display: flex; align-items: center; justify-content: center; border-radius: 4px; overflow: hidden; pointer-events: none;">
            <img src="${imgPath}" style="max-width: 30px; max-height: 30px; image-rendering: pixelated;" onerror="this.src='assets/items/default.png'">
        </div>
        <div style="flex-grow: 1; font-family: sans-serif; pointer-events: none;">
            <div style="font-weight: bold; color: #000; font-size: 13px;">${item.display_name || item.name}</div>
            <div style="font-size: 11px; color: #333;">${(item.price || 0).toLocaleString()} メル</div>
        </div>
    </div>
    <button onclick="buyItem('${String(actualItemId)}', '${item.type || item.item_type}', '${safeBuyName}')" 
            style="display:none; background: linear-gradient(to bottom, #ffebad, #ffc44d); border: 1px solid #e6a700; color: #000; padding: 4px 12px; cursor: pointer; border-radius: 5px; font-weight: bold; font-family: inherit; font-size: 11px; box-shadow: 0 1px 0 rgba(255,255,255,0.5) inset; transition: filter 0.2s;">
        買う
    </button>
`;

        row.onmouseenter = () => { window.currentHoverSlot = item; };
        row.onmouseleave = () => { window.currentHoverSlot = null; };
        itemList.appendChild(row);
    });

    // 3. 自分の所持アイテムリストを生成（売却リスト）
    sellList.innerHTML = ''; 
    const myItems = hero.inventory || [];
    console.log(`📝 所持アイテムリスト生成開始（全 ${myItems.length} 件）`);

    myItems.forEach((item, index) => {
        if (!item) return;

        const row = document.createElement('div');
        row.style = "display: flex; align-items: center; padding: 3px; border-bottom: 1px solid #333; background: rgba(0,0,0,0.2); margin-bottom: 2px; cursor: default;";
        
        const imgName = item.image_name || item.type || item.id;
        const imgPath = `${IMAGE_DOMAIN}item_assets/${imgName}.png`;
        
        let itemName = item.display_name || item.name || "";
        let displayPrice = 0;
        let iconGlowStyle = "";

        // オリジナルの名称出し分けロジックを維持
        if (imgName === 'sweets') { itemName = "おいしいケーキ"; displayPrice = 50; }
        else if (imgName === 'scroll_star') { itemName = "スターの書"; displayPrice = 25000; }
        else if (imgName === 'gold') { itemName = "金塊"; displayPrice = 500; }
        else if (imgName === 'treasure') { itemName = "ひみつの宝箱"; displayPrice = 2500; }
        else if (imgName === 'sword') { itemName = "マニアックソード"; displayPrice = 250; }
        else if (imgName === 'shield') { itemName = "トリシールド"; displayPrice = 150; }
        else {
            displayPrice = Math.floor((item.price || 0) * 0.5);
        }

        const isEquipment = (
            item.type === 'sword' || 
            item.type === 'shield' || 
            item.category === 'weapon1' || 
            item.category === 'shield1' || 
            item.category === 'armor1' ||
            ['sword', 'armor', 'shield'].includes(item.item_type)
        );

        // オリジナルのランク判定ロジックを維持
        if (isEquipment && item.totalALLStats !== undefined && item.totalFirstStats !== undefined) {
            const bonus = item.totalALLStats - item.totalFirstStats;
            let rankName = "";
            let rankGlowColor = "";

            if (bonus >= 30)       { rankGlowColor = "#ff0000"; rankName = "(神級)"; }
            else if (bonus >= 25) { rankGlowColor = "#00ff00"; rankName = "(超伝説)"; }
            else if (bonus >= 20) { rankGlowColor = "#ffff00"; rankName = "(極上)"; }
            else if (bonus >= 15) { rankGlowColor = "#ff00ff"; rankName = "(伝説)"; }
            else if (bonus >= 10) { rankGlowColor = "#00ccff"; rankName = "(希少)"; }
            else if (bonus >= 5)  { rankGlowColor = "#ff9900"; rankName = "(良品)"; }
            else if (bonus >= 0)  { rankGlowColor = "";        rankName = "(標準)"; }
            else                  { rankGlowColor = "";        rankName = "(粗悪)"; }

            if (!itemName.includes("(")) itemName = `${itemName}${rankName}`;
            if (rankGlowColor) {
                iconGlowStyle = `filter: drop-shadow(0 0 5px ${rankGlowColor});`;
            }
        }

        // 🌟 修正ポイント: 装備固有IDがあれば優先し、カタログIDをフォールバックに
        const sendId = item.equipment_id || item.instanceId || item.id || item.item_id;
        const targetSlot = (item.slot_index !== undefined) ? item.slot_index : index;
        const safeItemName = itemName;

        // 🌟 修正箇所: item.instanceId (または equipment_id) があれば装備品とみなす
const isEquip = !!(item.instanceId || item.equipment_id);

// 🌟 重要: ${String(sendId)} をシングルクォートで囲い、完全に文字列として送信
// 🌟 第4引数に所持数、第5引数に装備フラグを追加
row.innerHTML = `
    <div class="sell-item-row-div" 
         onclick="event.stopPropagation(); selectSellItem(event, this)"
         ondblclick="sellItem('${String(sendId)}', ${targetSlot}, '${safeItemName}', ${item.count || 1}, ${isEquip})">
        <div style="width: 38px; height: 38px; min-width: 38px; background: #ffffff; border: 1px solid #ddd; margin-right: 12px; display: flex; align-items: center; justify-content: center; border-radius: 4px; overflow: hidden; position: relative; pointer-events: none;">
            <img src="${imgPath}" style="max-width: 30px; max-height: 30px; image-rendering: pixelated; ${iconGlowStyle}" onerror="this.src='assets/items/default.png'">
            <span style="position: absolute; bottom: 0; right: 0; font-size: 9px; background: rgba(0,0,0,0.7); color: white; padding: 0 3px; border-radius: 2px; font-family: sans-serif; line-height: 1.5;">
                ${item.count || 1}
            </span>
        </div>
        <div style="flex-grow: 1; font-family: sans-serif; pointer-events: none; text-align: left;">
            <div style="font-weight: bold; color: #000; font-size: 13px;">${itemName}</div>
            <div style="font-size: 11px; color: #333;">${displayPrice.toLocaleString()} メル</div>
        </div>
    </div>
    <button onclick="sellItem('${String(sendId)}', ${targetSlot}, '${safeItemName}', ${item.count || 1}, ${isEquip})" 
            style="display:none; background: linear-gradient(to bottom, #ffebad, #ffc44d); border: 1px solid #e6a700; color: #000; padding: 4px 12px; cursor: pointer; border-radius: 5px; font-weight: bold; font-family: inherit; font-size: 11px; box-shadow: 0 1px 0 rgba(255,255,255,0.5) inset; transition: filter 0.2s;">
        売る
    </button>
`;

        row.onmouseenter = () => { window.currentHoverSlot = item; };
        row.onmouseleave = () => { window.currentHoverSlot = null; };

        sellList.appendChild(row);
    });

    console.log("🏁 ショップUIの更新が完了しました。");
}

// ============================================================
// :::ON_OPEN_SHOP_UI::: 🛒 ショップウィンドウの起動トリガー
// ============================================================
/**
 * 役割：
 * - サーバーからショップ画面を開く命令を受信
 * - 届いた商品データを `lastShopData` としてキャッシュ（再描画用に保持）
 * - ショップオーバーレイを可視化し、描画処理（:::RENDER_SHOP_UI:::）を呼び出す
 */
socket.on('open_shop_ui', (data) => {
    console.log("--- 🛒 [DEBUG: ShopUI開始] ---");
    window.lastShopData = data; // データをグローバルに保持
    document.getElementById('shop-overlay').style.display = 'block';
    renderShopUI(data);
});

// ============================================================
// :::ON_UPDATE_SHOP::: 🛒 取引完了後のショップUI自動同期
// ============================================================
/**
 * 役割：
 * - サーバーからの在庫・所持金更新通知を受信
 * - ショップ画面が表示されているか判定（ガード節）
 * - ショップデータをキャッシュ（lastShopData）に上書き
 * - ショップUI描画関数（:::RENDER_SHOP_UI:::）を呼び出し、最新の状態を表示
 */
socket.on('update_shop', (newData) => {
    // ショップが開いている時だけ描画を更新
    if (document.getElementById('shop-overlay').style.display === 'block') {
        window.lastShopData = newData;
        renderShopUI(newData);
    }
});

// ============================================================
// :::SELECT_SHOP_ITEM::: 🛒 ショップ商品選択時のハイライト処理
// ============================================================
/**
 * 役割：
 * - 既に選択されている他アイテムのハイライトをすべて解除（排他制御）
 * - クリックされたアイテムの要素（element）に 'selected' クラスを付与
 */
function selectShopItem(element) {
    // 1. 一旦、全部の「選択中」を解除する
    document.querySelectorAll('.shop-item-row-div').forEach(el => {
        el.classList.remove('selected');
    });
    // 2. 今クリックしたやつだけ「選択中」にする
    element.classList.add('selected');
}

// ============================================================
// :::DESELECT_ALL_ITEMS::: 🛒 ショップ選択状態の全解除処理
// ============================================================
/**
 * 役割：
 * - ショップ内の全商品要素から 'selected' クラスを除去
 * - 選択状態を強制的にリセットし、UIをクリーンな状態へ戻す
 */
function deselectAllItems() {
    document.querySelectorAll('.shop-item-row-div').forEach(el => {
        el.classList.remove('selected');
    });
}

// ============================================================
// :::SELECT_SELL_ITEM::: 💰 売却アイテム選択時のハイライト処理
// ============================================================
/**
 * 役割：
 * - 既に選択されている他の売却アイテムのハイライトを全解除
 * - クリックされた売却要素（element）に 'selected' クラスを付与
 * - 必要に応じて購入リスト側の選択状態も同時にリセットし、
 *   「ショップ内で常に1つの選択状態」を保証する制御を行う
 */
function selectSellItem(event, element) {
    // 1. 他の売却アイテムの選択（selectedクラス）をすべて解除
    document.querySelectorAll('.sell-item-row-div').forEach(el => {
        el.classList.remove('selected');
    });

    // 2. クリックされた要素に selected クラスを付与
    element.classList.add('selected');

    // (任意) 購入側の選択も解除して、画面全体で1つだけ選ばれている状態にする場合
    // document.querySelectorAll('.shop-item-row-div').forEach(el => el.classList.remove('selected'));

    console.log("💰 売却アイテムを選択しました");
}

// ============================================================
// :::SELL_ITEM::: 💰 アイテム売却確認とリクエスト送信
// ============================================================
/**
 * 役割：
 * - 売却確認ダイアログの表示とメッセージ設定
 * - 装備品/一般アイテムに応じた個数入力UI（qtyArea）の制御
 * - 入力された売却個数のバリデーション（範囲チェック）
 * - サーバーへの売却リクエスト（socket.emit）の発行
 */
function sellItem(itemId, slotIndex, displayName, currentCount = 1, isEquipment = false) {
    console.log("1. sellItem関数が呼ばれました。ID:", itemId, "Slot:", slotIndex, "装備:", isEquipment);

    const overlay = document.getElementById('sell-confirm');
    const message = document.getElementById('sell-confirm-message');
    const btnYes = document.getElementById('sell-confirm-yes');
    const btnNo = document.getElementById('sell-confirm-no');
    
    // 🌟 個数入力エリア全体（ラベルと入力欄を囲む親要素）と入力欄自体を取得
    const qtyArea = document.getElementById('sell-quantity-area'); 
    const inputQty = document.getElementById('sell-quantity');

    // メッセージをセット
    if (message) {
        message.innerText = `${displayName} を売却しますか？`;
    }

    // 🌟 装備品判定による表示切り替え
    if (isEquipment) {
        // 装備品なら個数入力エリアを隠し、個数を1に固定
        if (qtyArea) qtyArea.style.display = 'none';
        if (inputQty) {
            inputQty.value = "1";
            inputQty.max = 1;
        }
    } else {
        // ETCや消費アイテムなら個数入力エリアを表示し、最大数をセット
        if (qtyArea) qtyArea.style.display = 'block';
        if (inputQty) {
            inputQty.value = "1";
            inputQty.max = currentCount;
            inputQty.focus();
        }
    }

    // ダイアログを表示
    overlay.style.display = 'flex';

    // 「はい」ボタンの処理
    btnYes.onclick = () => {
        // 🌟 装備品なら強制的に1、そうでなければ入力値を取得
        const quantity = isEquipment ? 1 : (inputQty ? parseInt(inputQty.value) : 1);

        // バリデーション（装備品以外の場合のみチェック）
        if (!isEquipment && (isNaN(quantity) || quantity <= 0 || quantity > currentCount)) {
            alert(`1個から${currentCount}個の間で入力してください。`);
            return;
        }

        overlay.style.display = 'none'; // 閉じる
        
        if (typeof socket === 'undefined') {
            console.error("エラー: socketが見つかりません");
            return;
        }

        console.log(`2. サーバーへ売却リクエストを送ります... (${quantity}個)`);
        
        socket.emit('sell_request', { 
            itemId: itemId, 
            slotIndex: slotIndex,
            quantity: quantity
        });
    };

    // 「いいえ」ボタンの処理
    btnNo.onclick = () => {
        console.log("売却がキャンセルされました");
        overlay.style.display = 'none'; // 閉じる
    };
}

// ============================================================
// :::BUY_ITEM::: 🛒 アイテム購入確認とリクエスト送信
// ============================================================
/**
 * 役割：
 * - 購入確認ダイアログの表示と商品名の表示
 * - 装備品/一般品に応じた個数入力UIの制御（装備は個数固定、一般品は可変）
 * - バリデーションチェック（不正な数量の除外）
 * - サーバーへの購入リクエスト（socket.emit）の発行
 */
function buyItem(itemId, itemType, displayName) {
    console.log("1. buyItem関数が呼ばれました。ID:", itemId, "Type:", itemType);

    const overlay = document.getElementById('custom-confirm');
    const message = document.getElementById('confirm-message'); // メッセージ用要素
    const btnYes = document.getElementById('confirm-yes');
    const btnNo = document.getElementById('confirm-no');
    
    // 🌟 追加：個数入力エリア(親)と入力欄(input)の取得
    const qtyArea = document.getElementById('confirm-quantity-area');
    const inputQty = document.getElementById('buy-quantity');

    // メッセージをセット（アイテム名を表示する場合）
    if (message) {
        message.innerText = `${displayName} を購入しますか？`;
    }

    // 🌟 修正ポイント：装備品判定による表示切り替え
    const isEquipment = (itemType === 'sword' || itemType === 'shield');

    if (isEquipment) {
        // 装備品なら個数エリアを隠し、値は1に固定
        if (qtyArea) qtyArea.style.display = 'none';
        if (inputQty) {
            inputQty.value = "1";
            inputQty.max = 1;
        }
    } else {
        // 消費・ETCなら個数エリアを表示し、入力可能にする
        if (qtyArea) qtyArea.style.display = 'block';
        if (inputQty) {
            inputQty.value = "1";
            inputQty.max = 99; // 最大購入数制限
            inputQty.focus();
        }
    }

    // ダイアログを表示
    overlay.style.display = 'flex';

    // 「はい」ボタンの処理
    btnYes.onclick = () => {
        // 🌟 装備品なら強制的に1、そうでなければ入力値を取得
        const quantity = isEquipment ? 1 : (inputQty ? parseInt(inputQty.value) : 1);

        // 🌟 バリデーションチェック（装備品以外の場合）
        if (!isEquipment && (isNaN(quantity) || quantity <= 0)) {
            alert("購入する個数を正しく入力してください。");
            return;
        }

        overlay.style.display = 'none'; // 閉じる
        
        if (typeof socket === 'undefined') {
            console.error("エラー: socketが見つかりません");
            return;
        }

        console.log(`2. サーバーへ購入リクエストを送ります... (ID: ${itemId}, 個数: ${quantity})`);
        
        // 🌟 itemIdとquantityをサーバーへ送信
        socket.emit('buy_request', { 
            itemId: itemId,
            quantity: quantity 
        });
    };

    // 「いいえ」ボタンの処理
    btnNo.onclick = () => {
        console.log("購入がキャンセルされました");
        overlay.style.display = 'none'; // 閉じる
    };
}

// ============================================================
// 🎨 [SECTION 7: INITIALIZER] 起動・エントリーポイント
// 役割: ゲーム開始ボタンの処理、初期化、メインループの開始
// ============================================================
// ============================================================
// :::GAME_UPDATE_LOOP::: 💓 ゲームメインループ・心臓部
// ============================================================
// 読み込み済みかどうかのフラグ
let hasRequestedAccountInfo = false;

function update() {

	// 🌟 接続が切れていたら「位置計算」と「サーバー送信」をスキップする
    if (window.isDisconnected) {
        // 描画処理だけは実行する（「接続が切れました」画面を出すため）
        if (typeof drawGame === 'function') {
            drawGame(hero, others, enemies, items, platforms, ladders, damageTexts, frame);
        }
        requestAnimationFrame(update); // 次のフレームへ
        return; // ⚠️ ここで処理を中断し、以下の移動・戦闘・送信処理には行かない
    }
	
    frame++; // フレームカウント（アニメーション同期用）
	
	// 🌟 ここを追加：現在時刻と最後に通信した時刻を比較
    if (Date.now() - window.lastReceivedTime > 3000) {
        window.isDisconnected = true;
    }

    // まだリクエストしていなければ、1回だけ送信
    if (!hasRequestedAccountInfo && typeof socket !== 'undefined') {
        socket.emit('get_account_info');
        hasRequestedAccountInfo = true;
    }
    
    // 🌟 【追加】ここで常にオプション設定とheroを同期させる
    if (typeof hero !== 'undefined' && gameWindows.options) {
        hero.isLinked = gameWindows.options.isLinked;
    }
	if (typeof hero !== 'undefined' && gameWindows.options) {
        hero.isOnline = gameWindows.options.isOnline;
    }
    // ----------------------------------------------------

    // --- 🌟 修正：モーダル表示中かどうかの判定を追加 ---
    const quantityModal = document.getElementById('vending-quantity-modal');
    const isModalOpen = quantityModal && quantityModal.style.display !== 'none';
    // ----------------------------------------------

    // 1. 各要素の状態更新（切り出した関数を順番に実行）
    updateItemsPhysics();      // アイテムの物理挙動
    updateEffectsAndTimers();  // エフェクト・タイマーの更新

    // 2. プレイヤーの入力処理
    if (!isModalOpen) {
        handlePlayerInput(hero, items, ladders, document.getElementById('chat-in'));
    } else {
        // モーダル操作中にキャラが滑っていかないように速度をゼロに固定
        hero.vx = 0;
    }

    // 3. 物理移動と接地判定
    let isTouchingAnything = hero.applyPhysics(platforms);

    // 4. 戦闘・当たり判定
    if (!isModalOpen) {
        updatePlayerCombat();
    }

    // 5. サーバー同期と描画
    // 🌟 修正：heroオブジェクトの必要な情報を整理して送る
    socket.emit('move', {
        x: hero.x,
        y: hero.y,
        vx: hero.vx || 0,
        dir: hero.dir,
        jumping: hero.jumping,
        isAttacking: hero.isAttacking,
        climbing: hero.climbing,
        invincible: hero.invincible,
        
        // --- 🌟 追加：連携情報をサーバー経由で他プレイヤーへ共有 ---
        isLinked: hero.isLinked,
        isOnline: hero.isOnline,
        
        // 露店関連の同期
        is_vending: hero.is_vending,
        vending_title: hero.vending_title,
        
        currentFrame: frame
    });

    // 🌟 攻撃の「のっそり」対策
    if (!isModalOpen && hero.isAttacking === 20) {
        socket.emit('player_attack', { id: socket.id });
    }

    // --- [描画処理：ここから] ---
    if (typeof drawGame === 'function') {
        drawGame(hero, others, enemies, items, platforms, ladders, damageTexts, frame);
    }

    if (typeof drawNotifications === 'function' && typeof ctx !== 'undefined') {
        drawNotifications(ctx);
    }

    if (typeof tCtx !== 'undefined') {
        if (typeof hoveringSlot !== 'undefined' && hoveringSlot) {
			drawItemTooltip(tCtx, hoveringSlot, window.mouseX, window.mouseY, hero);
		}
    }
    // --- [描画処理：ここまで] ---

    // 6. エラー防止用の最終接地保証
    if (typeof isTouchingAnything !== 'undefined' && isTouchingAnything) {
        hero.jumping = false;
        hero.dy = 0;
    }

    requestAnimationFrame(update); // 次のフレームへ
}

// 20秒（20,000ミリ秒）ごとにアカウント情報を要求するタイマー
setInterval(() => {
    if (typeof socket !== 'undefined' && socket.connected) {
        socket.emit('get_account_info');
        console.log("定期的なアカウント情報更新リクエストを送信しました");
    }
}, 20000); // 20000ms = 20秒

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

// ------------------------------------------
// 📝 1. 新規登録ボタンの処理 (UI統一版)
// ------------------------------------------
const regBtn = document.getElementById('register-btn');

// ============================================================
// :::REG_BTN_CLICK::: 📝 新規ユーザー登録・バリデーション処理
// ============================================================
/**
 * 役割：
 * - 登録ボタンクリック時の入力値検証（文字数チェック）
 * - エラーメッセージの表示・入力欄のスタイル制御（赤枠など）
 * - 入力不備時の即時フィードバック（ユーザー体験の向上）
 * - バリデーション通過後のサーバー通信（socket.emit('register')）
 */
if (regBtn) {
    regBtn.onclick = () => {
        // 各要素の取得
        const nameInput = document.getElementById('user-name-input');
        const passInput = document.getElementById('user-pass-input');
        const loginError = document.getElementById('login-error');

        const username = nameInput.value.trim();
        const password = passInput.value;

        // --- 🌟 修正点: 名前制限を2文字以上6文字以下に変更 ---
        const isNameInvalid = username.length < 2 || username.length > 6;
        const isPassInvalid = password.length < 4;

        if (isNameInvalid || isPassInvalid) {
            if (loginError) {
                loginError.innerText = "名前は2〜6文字、パスワードは4文字以上で入力してください";
                loginError.style.color = "#ff4444";
            }

            // 条件を満たしていない入力欄を赤枠にする (既存ロジック踏襲)
            if (isNameInvalid) {
                nameInput.style.border = "2px solid #ff4444";
            } else {
                nameInput.style.border = "1px solid #ccc";
            }

            if (isPassInvalid) {
                passInput.style.border = "2px solid #ff4444";
            } else {
                passInput.style.border = "1px solid #ccc";
            }
            
            return;
        }

        // --- ✅ バリデーション通過時：スタイルをリセット ---
        nameInput.style.border = "1px solid #ccc";
        passInput.style.border = "1px solid #ccc";
        if (loginError) loginError.innerText = "";

        // サーバーの socket.on('register', ...) へ送信 (既存ロジック)
        console.log("新規登録リクエスト送信:", username);
        socket.emit('register', { username: username, password: password });
    };
}

// ============================================================
// :::ON_REGISTER_RESPONSE::: 📝 サーバーからの登録結果処理
// ============================================================
/**
 * 役割：
 * - サーバーからの登録結果データ（success, message）を受信
 * - 成功時：成功メッセージ表示（水色）、入力欄リセット、名前欄へフォーカス
 * - 失敗時：エラーメッセージ表示（赤色）、入力欄の赤枠強調
 * - UI要素（login-errorなど）の有無に応じたフォールバック対応
 */
socket.on('register_response', (data) => {
    // 🌟 openDropForm と同じようにエラー表示用の要素を取得
    const loginError = document.getElementById('login-error');
    const passwordInput = document.getElementById('user-pass-input');
    // 名前入力欄も枠線制御のために取得（変数名は環境に合わせて調整してください）
    const nameInput = document.getElementById('user-name-input') || document.querySelector('input[type="text"]');

    // --- 🌟 既存の alert(data.message) を UI 更新に置き換え ---
    if (loginError) {
        loginError.innerText = data.message;
        
        if (data.success) {
            // ✅ 登録成功時：文字色を成功カラー（水色）に変更
            loginError.style.color = "#00ffcc"; 
            
            // 枠線を通常に戻す
            if (nameInput) nameInput.style.border = "1px solid #ccc";
            if (passwordInput) passwordInput.style.border = "1px solid #ccc";

            // --- 既存ロジック：成功した場合はパスワード欄を空にする ---
            console.log("登録成功！そのままログインできます。");
            if (passwordInput) {
                passwordInput.value = "";
                // 次にログインしやすいよう名前にフォーカス
                if (nameInput) nameInput.focus();
            }
        } else {
            // ❌ 登録失敗時：文字色をエラーカラー（赤）に変更
            loginError.style.color = "#ff4444";
            
            // 失敗した項目の枠線を赤くして強調 (openDropForm 踏襲)
            if (nameInput) nameInput.style.border = "2px solid #ff4444";
            if (passwordInput) passwordInput.style.border = "2px solid #ff4444";
        }
    } else {
        // 万が一要素がない場合のみ、フォールバックとして alert を残す
        alert(data.message);
    }
});

// ============================================================
// :::VENDING_STATE_GUARD::: 🏪 露店モードの安全な状態管理
// ============================================================
/**
 * 役割：
 * - is_vending の getter/setter を定義し、状態変更を監視
 * - 0.1秒以内の連続切り替えをブロック（デバウンス制御による点滅防止）
 * - 閉店（false）時のUIクリーンアップ（メインウィンドウ非表示、データリセット）
 * - 露店モード終了時の正常性確認とログ出力
 */
if (typeof hero !== 'undefined') {
    let _isVending = hero.is_vending;
    let lastToggleTime = 0;

    Object.defineProperty(hero, 'is_vending', {
        get: function() {
            return _isVending;
        },
        set: function(value) {
            const now = Date.now();

            // 🛡️ 超高頻度（0.1秒以内）の書き換えは、バグによる「点滅」とみなしてブロック
            if (now - lastToggleTime < 100) {
                return;
            }

            // 既に同じ値なら何もしない（再描画カット）
            if (_isVending === value) return;

            // --- 閉店（false）時の特別処理 ---
            if (value === false) {
                // ここで「看板ウィンドウ」を物理的に隠す処理を念のため呼ぶ
                const vWin = document.getElementById('vending-main-window'); // あなたの環境のIDに合わせてください
                if (vWin) vWin.style.display = 'none';
                
                // リストもクリアして、次回の「点滅防止比較」をリセット
                const itemsContainer = document.getElementById('other-vending-items');
                if (itemsContainer) itemsContainer.dataset.lastPureHash = "";
            }

            _isVending = value;
            lastToggleTime = now;
            
            console.log(value ? "🏪 露店モード開始" : "🚶 露店モード終了（正常）");
        },
        configurable: true
    });
}

// ============================================================
// :::ON_VENDING_OPENED::: 🏪 露店開店通知の受信と同期
// ============================================================
/**
 * 役割：
 * - 露店開店データ（店名、アイテムリスト、座標）を受信
 * - 自キャラ（hero）または他者（others/otherPlayers）の露店状態を更新
 * - 商品リスト（vending_items）を保持し、看板クリック時の表示準備を整える
 * - 最新の座標情報を反映し、プレイヤーの同期精度を担保する
 */
socket.on('vending_opened', (data) => {
    const shopTitle = data.vending_title || data.title || "いらっしゃいませ！";
    console.log(`露店開店の通知を受信: ${shopTitle} (ID: ${data.id})`);

    if (data.id === socket.id) {
        // 🌟 自分の看板を出す
        if (typeof hero !== 'undefined') {
            hero.is_vending = true;
            hero.vending_title = shopTitle;
            // 自分のアイテムリストも同期（任意）
            hero.vending_items = data.items || [];
        }
    } else {
        // 🌟 他人の看板を出す
        // 環境に合わせて otherPlayers か others を安全に取得
        const targetList = (typeof otherPlayers !== 'undefined') ? otherPlayers : (typeof others !== 'undefined' ? others : {});
        const targetPlayer = targetList[data.id];
        
        if (targetPlayer) {
            targetPlayer.is_vending = true;
            targetPlayer.vending_title = shopTitle;
            
            // 🔥 【追加箇所】サーバーから届いた陳列アイテムを保存
            // これにより、看板クリック時にこのリストを参照して表示できるようになります
            targetPlayer.vending_items = data.items || [];
            
            // 座標の同期（データがある場合のみ）
            if (data.x !== undefined) targetPlayer.x = data.x;
            if (data.y !== undefined) targetPlayer.y = data.y;
            
            console.log(`プレイヤー ${data.id} の露店状態とアイテムリスト(${targetPlayer.vending_items.length}件)を反映しました: ${shopTitle}`);
        }
    }
});

// ============================================================
// :::ON_VENDING_CLOSED::: 🏪 露店閉店通知の受信とUIの終了処理
// ============================================================
/**
 * 役割：
 * - 閉店通知を受信し、購入者の閲覧ウィンドウを強制クローズ
 * - 完売（sold_out）や中止（manual）に応じた通知モーダルの表示
 * - 閲覧状態のクリーンアップ（currentVendingOwnerIdのリセット）
 * - 店主側（自分）のステータスリセットとUI（開店ボタン）の復旧
 * - 他店主のステータス消去（targetPlayer.is_vending = false）
 */
socket.on('vending_closed', (data) => {
    console.log(`露店閉店の通知を受信 (ID: ${data.id}, 理由: ${data.reason || 'manual/disconnect'})`);

    // --- 🛒 購入者側の強制終了ロジック ---
    // 今開いている露店の店主ID(data.id)が、通知された閉店IDと一致する場合
    if (typeof window.currentVendingOwnerId !== 'undefined' && window.currentVendingOwnerId === data.id) {
        const otherVendingWin = document.getElementById('other-vending-window');
        
        // 🌟 ウィンドウが表示されている場合のみ、通知を出して閉じる
        if (otherVendingWin && otherVendingWin.style.display !== 'none') {
            otherVendingWin.style.display = 'none';

            // ✅ 独自UIでメッセージを出し分け表示
            const noticeModal = document.getElementById('vending-notice-modal');
            const noticeText = document.getElementById('vending-notice-text');
            const closeBtn = document.getElementById('vending-notice-close-btn');

            if (noticeModal && noticeText) {
                // 理由(reason)に基づいてテキストをセット
                if (data.reason === 'sold_out') {
                    noticeText.innerText = "全ての商品が売り切れました。";
                    noticeText.style.color = "#ffcc00"; // 完売はゴールド系の色
                } else {
                    noticeText.innerText = "販売者が販売を中止しました。";
                    noticeText.style.color = "#ffffff";
                }

                noticeModal.style.display = 'block';

                // 閉じるボタンの処理
                closeBtn.onclick = () => {
                    noticeModal.style.display = 'none';
                };
            }
        }
        
        // 閲覧状態のリセット
        window.currentVendingOwnerId = null;
        window.currentHoverSlot = null; // ツールチップのクリア
    }
    // ------------------------------------

    if (data.id === socket.id) {
        // 自分の状態をリセット
        if (typeof hero !== 'undefined') {
            hero.is_vending = false;
            hero.vending_title = "";
            hero.vending_items = []; // アイテムデータもクリア
        }
        
        // 自分の管理ウィンドウも開いていれば閉じる
        const myVendingWin = document.getElementById('vending-window');
        if (myVendingWin) {
            myVendingWin.style.display = 'none';
        }

        // --- 🌟 追加：ボタンのUI状態を元に戻す ---
        const btn = document.getElementById('vending-confirm-btn');
        if (btn) {
            btn.innerText = "この内容で露店を開く";
            btn.disabled = false;
            btn.style.removeProperty('background');
            btn.style.removeProperty('border-color');
            btn.style.cursor = "pointer";
        }
        // ------------------------------------

    } else {
        // 他人の状態をリセット
        const targetList = (typeof otherPlayers !== 'undefined') ? otherPlayers : (typeof others !== 'undefined' ? others : {});
        const targetPlayer = targetList[data.id];
        
        if (targetPlayer) {
            targetPlayer.is_vending = false;
            targetPlayer.vending_title = "";
            targetPlayer.vending_items = []; // アイテムデータもクリア
        }
    }
});

// ============================================================
// :::ON_REQUEST_OPEN_VENDING_UI::: 🏪 露店管理UIの起動処理
// ============================================================
/**
 * 役割：
 * - サーバーの要求（露店開設）を受け取り、管理ウィンドウを表示
 * - 店名入力欄（vending-title-input）への自動フォーカス
 * - 開設UIの初期化とプレイヤーへのUX提供
 */
socket.on('request_open_vending_ui', () => {
    // 1. 露店管理ウィンドウを表示する
    const win = document.getElementById('vending-window');
    if (win) {
        win.style.display = 'block';
    }

    // 2. 入力欄に初期値をセットし、フォーカスを合わせる
    const titleInput = document.getElementById('vending-title-input');
    if (titleInput) {
        //titleInput.value = "いらっしゃいませ！";
        titleInput.focus(); 
    }
    
    console.log("[Vending] 露店開設UIを表示しました。");
});

// ============================================================
// :::OPEN_VENDING_MENU::: 🏪 露店管理メニューの表示
// ============================================================
/**
 * 役割：
 * - 露店管理ウィンドウ（vending-window）を可視化
 * - インベントリから陳列可能なアイテムリストへの同期処理を統合
 * - 開店のためのUI準備を統括
 */
function openVendingMenu() {
    const win = document.getElementById('vending-window');
    if (win) {
        win.style.display = 'block';
        // インベントリからアイテムリストを同期させる処理をここに入れると便利です
        console.log("露店メニューを表示しました");
    }
}

// ============================================================
// :::GET_VENDING_ITEMS_DATA::: 🛒 露店アイテムデータの抽出（荷造り）
// ============================================================
/**
 * 役割：
 * - 露店ウィンドウで一時保管（バッファ）されているアイテム群を取得
 * - サーバー側へ送信するためにデータを整形・抽出
 */
function getVendingItemsData() {
    console.log("📤 サーバー送信用のアイテムデータを抽出します:", vendingItemsBuffer);
    return vendingItemsBuffer; 
}

// ============================================================
// :::START_VENDING::: 🚀 露店販売開始処理・経済活動の起動
// ============================================================
/**
 * 役割：
 * - 開店前のアイテムリスト存在チェック（バリデーション）
 * - プレイヤー状態（hero.is_vending）の更新と店名同期
 * - 陳列アイテムデータの取得（荷造り）
 * - サーバーへの開店通知（open_vending）および状態同期（move）
 * - 開店中UIへの切り替え（ボタン無効化・グレーアウト）
 */
function startVending() {
    const listContainer = document.getElementById('vending-item-list');
    const btn = document.getElementById('vending-confirm-btn'); // ボタンのID
    const titleInput = document.getElementById('vending-title-input'); // 店名入力欄のID
    
    // 🛒 1. チェック: リストにアイテムがあるか？ (既存ロジックを完全踏襲)
    if (!listContainer || listContainer.children.length === 0 || 
        listContainer.innerHTML.includes("アイテムがありません")) {
        alert("販売するアイテムをリストに追加してください");
        return;
    }

    // 🌟 2. 状態を更新
    // 確実な送信のため、一度変数(inputTitle)に格納します
    let inputTitle = "いらっしゃいませ！";
    if (typeof hero !== 'undefined') {
        hero.is_vending = true; 
        
        // 🌟 入力欄から店名を取得
        inputTitle = (titleInput && titleInput.value.trim() !== "") 
                        ? titleInput.value 
                        : "いらっしゃいませ！";
        hero.vending_title = inputTitle;
    }

    // 🛒 3. 陳列アイテムのデータを取得
    const vendingItems = typeof getVendingItemsData === 'function' ? getVendingItemsData() : []; 

    // 📡 4. サーバーへ確定情報を送る
    if (typeof socket !== 'undefined' && typeof hero !== 'undefined') {
        // A. 露店システムへの開店通知
        socket.emit('open_vending', {
            title: inputTitle,
            items: vendingItems
        });

        // 🌟 B. 看板を周囲に即時反映させるための強制同期
        // open_vendingだけでは看板が出ない場合があるため、moveイベントで状態を確定させます
        socket.emit('move', {
            x: hero.x, y: hero.y, vx: hero.vx, dir: hero.dir,
            jumping: hero.jumping, isAttacking: hero.isAttacking,
            invincible: hero.invincible, climbing: hero.climbing,
            is_vending: true,
            vending_title: inputTitle 
        });
    }

    // 🌟 5. ボタンのテキストと色を切り替え
    if (btn) {
        btn.innerText = "露店を開いています";
        btn.disabled = true; // 開店中はボタンを無効化
        
        // 🎨 既存のCSSに負けないよう important を付与してグレーアウト
        btn.style.setProperty('background', '#888888', 'important');
        btn.style.setProperty('border-color', '#666666', 'important');
        btn.style.cursor = "default";
    }
    
    console.log("露店を開始しました。陳列数:", listContainer.children.length, "店名:", inputTitle);
}

// ============================================================
// :::CLOSE_VENDING_MENU::: ❌ 露店管理メニューの閉鎖と経済活動の清算
// ============================================================
/**
 * 役割：
 * - 露店管理ウィンドウ（vending-window）の非表示化
 * - プレイヤー状態（is_vending, vending_title）のリセット
 * - サーバーへの閉店通知（close_vending）および周辺同期（move）の発行
 * - UI要素（開店ボタン）の初期状態への復旧
 */
function closeVendingMenu() {
    const win = document.getElementById('vending-window');
    const btn = document.getElementById('vending-confirm-btn');

    if (win) {
        win.style.display = 'none';
        
        if (typeof hero !== 'undefined') {
            hero.is_vending = false;
            hero.vending_title = ""; 
        }

        if (typeof socket !== 'undefined' && typeof hero !== 'undefined') {
            socket.emit('close_vending');

            // 閉店状態を周囲に即時同期
            socket.emit('move', {
                x: hero.x, y: hero.y, vx: hero.vx, dir: hero.dir,
                jumping: hero.jumping, isAttacking: hero.isAttacking,
                invincible: hero.invincible, climbing: hero.climbing,
                is_vending: false,
                vending_title: "" 
            });
        }

        if (btn) {
            btn.innerText = "この内容で露店を開く";
            btn.disabled = false;
            // JSで付与した強制スタイルを解除
            btn.style.removeProperty('background');
            btn.style.removeProperty('border-color');
            btn.style.cursor = "pointer";
        }
    }
}

// ============================================================
// :::CLOSE_VENDING_MENU::: ❌ 露店管理メニューの閉鎖と経済活動の清算
// ============================================================
/**
 * 役割：
 * - 露店管理ウィンドウ（vending-window）の非表示化
 * - プレイヤー状態（is_vending, vending_title）のリセット
 * - サーバーへの閉店通知（close_vending）および周辺同期（move）の発行
 * - UI要素（開店ボタン）のスタイル（background/border）をCSS定義に戻して復旧
 */
function closeVendingMenu() {
    const win = document.getElementById('vending-window');
    const btn = document.getElementById('vending-confirm-btn');

    if (win) {
        // 1. HTMLウィンドウを非表示にする
        win.style.display = 'none';
        
        // 2. 露店フラグをオフにする
        if (typeof hero !== 'undefined') {
            hero.is_vending = false;
            hero.vending_title = ""; // 自分の画面から即座に消去
        }

        // 3. サーバーに閉店を通知
        if (typeof socket !== 'undefined' && typeof hero !== 'undefined') {
            socket.emit('close_vending'); // 閉店専用イベント

            // move同期でも閉店を送信（既存の同期ロジックを維持）
            socket.emit('move', {
                x: hero.x, y: hero.y, vx: hero.vx, dir: hero.dir,
                jumping: hero.jumping, isAttacking: hero.isAttacking,
                invincible: hero.invincible, climbing: hero.climbing,
                is_vending: false,
                vending_title: "" 
            });
        }

        // 🌟 4. ボタンの状態を元に戻す
        if (btn) {
            btn.innerText = "この内容で露店を開く";
            btn.disabled = false;
            
            // 🎨 修正：JSで付与した強制スタイルを削除して、元のCSS（オレンジ）に戻します
            btn.style.removeProperty('background');
            btn.style.removeProperty('border-color');
            btn.style.cursor = "pointer";
        }

        console.log("[UI] 露店を終了し、ボタンをリセットしました。");
    }
}

// ============================================================
// :::OPEN_OTHER_PLAYER_VENDING::: 🏪 他者の露店閲覧・データ要求
// ============================================================
/**
 * 役割：
 * - サーバーへ特定のプレイヤーの露店商品リストを要求（socket.emit）
 * - 閲覧ウィンドウの表示と店名の反映
 * - 商品読み込み中（Loading）のUI表示によるUX改善
 * - 開店SEの再生
 */
function openOtherPlayerVending(p) {
    console.log(`[Vending] ${p.vending_title} (Owner: ${p.id}) のデータを読み込みます...`);

    // 1. サーバーへ最新の商品リストを要求する
    if (socket) {
        socket.emit('request_vending_data', { ownerId: p.id });
    }

    // 2. UIの枠組みを表示
    const otherVendingWin = document.getElementById('other-vending-window');
    const itemsContainer = document.getElementById('other-vending-items'); // 商品リストを表示する場所

    if (otherVendingWin) {
        otherVendingWin.style.display = 'block';
        
        // 店名などをUIにセット
        const titleEl = otherVendingWin.querySelector('.vending-title-display');
        if (titleEl) titleEl.innerText = p.vending_title || "無名の露店";

        // 🌟 データが届くまでの間、リストを「読み込み中...」にする
        if (itemsContainer) {
            itemsContainer.innerHTML = '<p style="text-align: center; padding: 20px; color: #ccc; font-size: 12px;">商品を読み込み中...</p>';
        }
    }

    // 3. SEの再生
    if (typeof playMenuUpSound === 'function') {
        playMenuUpSound();
    }
}

// ============================================================
// :::SOCKET_ON_VENDING_DATA_RES::: 📡 露店商品データの受信とUI描画
// ============================================================
/**
 * 役割：
 * - サーバーからの商品リスト受信とデータの整合性チェック
 * - 入室時や外部要因による描画漏れ・消失の自動修復
 * - 高速更新を防ぐ防波堤（タイムスタンプ・ハッシュ比較）
 * - アイテムランク（神級〜粗悪）の判定と装飾
 * - 価格帯に応じた色分け（メイプルカラー再現）
 * - 購入用ダブルクリックイベントの各行への登録
 */
socket.on('vending_data_res', (data) => {

    const itemsContainer = document.getElementById('other-vending-items');
    if (!itemsContainer) {
        console.error("❌ [ERROR] 'other-vending-items' が消失しています。");
        return;
    }

    const now = Date.now();
    const lastUpdate = parseInt(itemsContainer.dataset.lastTick || 0);

    // --- 🌟 改善：入室時の描画漏れ対策 ---
    if (now - lastUpdate > 1000) {
        itemsContainer.dataset.lastPureHash = ""; 
        console.log("🔄 [VENDING] 再入室を検知。キャッシュをリセットして描画を強制します。");
    }

    // --- 🛡️ 物理防波堤：0.3秒以内の連続更新は物理的に無視する ---
    if (now - lastUpdate < 300) { 
        return; 
    }
    itemsContainer.dataset.lastTick = now;

    // --- 🛡️ 消失プロテクト：外部（game.js等）からの非表示を強制復帰 ---
    const parentWindow = itemsContainer.closest('.vending-window') || itemsContainer.parentElement;
    if (parentWindow) {
        const currentStyle = window.getComputedStyle(parentWindow).display;
        if (currentStyle === 'none') {
            console.warn("⚠️ 外部干渉によるウィンドウ消失を検知。表示を強制維持します。");
            parentWindow.style.setProperty('display', 'block', 'important');
        }
    }

    // 判定ロジックのイメージ（該当箇所の修正例）
const bugItem = (data.items || []).find(i => {
    if (!i) return false;
    // 名前が深い階層に入っている場合を考慮し、判定を緩和する
    const hasName = i.display_name || i.name || (i.data && (i.data.display_name || i.data.name));
    return !hasName; // 名前が見つからない場合に true（異常）と判定する仕組みになっています
});
    
    console.log("%c🏪 [VENDING_RECEIVE] データ受信", "background: #2ecc71; color: white; padding: 2px 5px;", data);

    window.currentVendingOwnerId = data.ownerId;
    const items = data.items || [];

    // --- 🛡️ 強化版点滅防止ガード：純粋な「商品データ」のみで比較 ---
    const pureDataHash = items.map(i => {
        const id = i.item_id || i.id || (i.data && i.data.item_id);
        const price = i.price || 0;
        const count = i.count || i.quantity || 1;
        return `${id}_${price}_${count}`;
    }).join('|');

    if (itemsContainer.dataset.lastPureHash === pureDataHash) {
        return;
    }
    itemsContainer.dataset.lastPureHash = pureDataHash;

    // 🌟 1. リストの初期化（条件付き）
    if (items.length === 0) {
        if (!itemsContainer.querySelector('.empty-vending-msg')) {
            itemsContainer.innerHTML = '<p class="empty-vending-msg" style="text-align: center; padding: 20px; color: #999; font-size: 12px;">商品は売り切れ、またはありません。</p>';
        }
        return;
    }

    // --- 🌟 改善：アイテムがある場合、既存の「読み込み中...」などのテキストを完全に掃除 ---
    const hasNonItemNodes = Array.from(itemsContainer.childNodes).some(node => {
        return node.nodeType === Node.TEXT_NODE || (node.nodeType === Node.ELEMENT_NODE && !node.classList.contains('shop-item-row-div'));
    });

    if (hasNonItemNodes) {
        itemsContainer.innerHTML = ''; 
    }

    const currentRows = itemsContainer.querySelectorAll('.shop-item-row-div');

    // 2. 届いたアイテムをループして更新
    items.forEach((item, index) => {
        const idCheck = {
            item_id: item.item_id,
            data_item_id: item.data?.item_id,
            itemData_id: item.itemData?.item_id,
            raw_id: item.id
        };
        const targetItemId = Number(idCheck.item_id || idCheck.data_item_id || idCheck.itemData_id || idCheck.raw_id || 0);

        const dbDisplayName = (item.data && item.data.display_name) || item.display_name;
        const dbImageName = (item.data && item.data.image_name) || item.image_name;

        // --- 🌟 DOMの再利用ロジック ---
        let itemRow = currentRows[index];
        if (!itemRow) {
            itemRow = document.createElement('div');
            itemRow.className = 'shop-item-row-div';
            
            Object.assign(itemRow.style, {
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "1px solid #eee",
                padding: "8px",
                cursor: "pointer",
                transition: "background 0.1s"
            });
            itemRow.title = "ダブルクリックで購入";
            itemsContainer.appendChild(itemRow);
        }

        // --- 🌟 名称と画像の決定ロジック ---
        let displayName = dbDisplayName || item.displayName || item.name || (item.data && item.data.name) || "不明なアイテム";
        let forcedIconPath = null;

        if (targetItemId === 201) {
            displayName = dbDisplayName || "おいしいケーキ";
            forcedIconPath = `${IMAGE_DOMAIN}item_assets/${dbImageName || "sweets"}.png`;
        }

        const rawType = item.item_type || item.type || (item.data && item.data.type) || item.category || "item";
        const finalType = String(rawType).toLowerCase();

        // --- 🏷️ ランク判定・グロー効果ロジック ---
        let iconGlowStyle = ""; 
        const isEquipment = (
            item.type === 'sword' || item.type === 'shield' || 
            item.category === 'weapon1' || item.category === 'shield1' || 
            item.category === 'armor1' || ['sword', 'armor', 'shield'].includes(item.item_type)
        );

        const currentAllStats = item.totalALLStats ?? (item.data && item.data.totalALLStats);
        const currentFirstStats = item.totalFirstStats ?? (item.data && item.data.totalFirstStats);

        if (isEquipment && currentAllStats !== undefined && currentFirstStats !== undefined) {
            const bonus = currentAllStats - currentFirstStats;
            let rankGlowColor = "";
            let rankName = "";
            if (bonus >= 30) { rankGlowColor = "#ff0000"; rankName = "(神級)"; }
            else if (bonus >= 25) { rankGlowColor = "#00ff00"; rankName = "(超伝説)"; }
            else if (bonus >= 20) { rankGlowColor = "#ffff00"; rankName = "(極上)"; }
            else if (bonus >= 15) { rankGlowColor = "#ff00ff"; rankName = "(伝説)"; }
            else if (bonus >= 10) { rankGlowColor = "#00ccff"; rankName = "(希少)"; }
            else if (bonus >= 5)  { rankGlowColor = "#ff9900"; rankName = "(良品)"; }
            else if (bonus >= 0)  { rankGlowColor = ""; rankName = "(標準)"; }
            else { rankGlowColor = ""; rankName = "(粗悪)"; }

            if (!displayName.includes("(")) displayName = `${displayName}${rankName}`;
            if (rankGlowColor) { iconGlowStyle = `filter: drop-shadow(0 0 4px ${rankGlowColor});`; }
        }

        // --- 🌟 メイプルストーリー再現：桁数別価格カラーロジック ---
        const rawPrice = Number(item.price || 0);
        let priceColor = "#0000FF"; // 10k未満：青

        if (rawPrice >= 1000000000) {
            priceColor = "#4B0082"; // 1000m以上：濃い紫色
        } else if (rawPrice >= 100000000) {
            priceColor = "#A020F0"; // 100m以上：紫色
        } else if (rawPrice >= 10000000) {
            priceColor = "#FF0000"; // 10m以上：赤色
        } else if (rawPrice >= 1000000) {
            priceColor = "#32CD32"; // 1m以上：黄緑色
        } else if (rawPrice >= 10000) {
            priceColor = "#00CED1"; // 10k以上：水色
        }

        const price = item.price ? item.price.toLocaleString() : "0";
        const count = item.count || item.quantity || 1;
        
        let iconPath = forcedIconPath || item.iconUrl;
        if (!iconPath) {
            const finalImgName = dbImageName || item.type || finalType;
            iconPath = `${IMAGE_DOMAIN}item_assets/${finalImgName}${String(finalImgName).includes('.') ? '' : '.png'}`;
        }

        const newHTML = `
            <div style="display: flex; align-items: center; gap: 10px; flex: 1;">
                <div style="width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.03); border-radius: 4px;">
                    <img src="${iconPath}" 
                         onerror="this.onerror=null; this.src='assets/items/default.png';" 
                         style="max-width: 28px; max-height: 28px; image-rendering: pixelated; ${iconGlowStyle}">
                </div>
                <div style="display: flex; flex-direction: column; gap: 2px;">
                    <span style="color: #333; font-weight: bold; font-size: 12px;">
                        ${displayName} 
                        ${(!isEquipment && count > 1) ? `<span style="color: #777; font-weight: normal; font-size: 10px;">(${count}個)</span>` : ''}
                    </span>
                    <div style="display: flex; align-items: center; gap: 3px;">
                        <span style="color: ${priceColor}; font-weight: bold; font-size: 11px;">${price}</span>
                        <span style="color: #888; font-size: 9px; font-weight: bold;">メル</span>
                    </div>
                </div>
            </div>
            <div style="color: #bbb; font-size: 9px; pointer-events: none;">Double Click</div>
        `;

        if (itemRow.innerHTML.trim() !== newHTML.trim()) {
            itemRow.innerHTML = newHTML;
        }
        
        // --- 🖱️ イベント登録 ---
        itemRow.ondblclick = () => {
            if (typeof buyFromVending === 'function') {
                buyFromVending(data.ownerId, item.db_id || item.id);
            }
        };
        
        itemRow.onmouseenter = (e) => { 
            itemRow.style.background = "rgba(255, 204, 0, 0.15)";
            
            if (typeof window !== 'undefined') {
                window.hoveringSlot = item;
                
                // 🌟 ツールチップを描画するCanvas要素を取得（ID名は実際のCanvasに合わせてください）
                const gameCanvas = document.getElementById('game-canvas') || document.querySelector('canvas');
                if (gameCanvas) {
                    const rect = gameCanvas.getBoundingClientRect();
                    // Canvasの左上からの相対座標（ローカル座標）に変換してセットする
                    window.mouseX = e.clientX - rect.left;
                    window.mouseY = e.clientY - rect.top;
                } else {
                    window.mouseX = e.clientX;
                    window.mouseY = e.clientY;
                }
            }
        };

        itemRow.onmousemove = (e) => {
            if (typeof window !== 'undefined') {
                const gameCanvas = document.getElementById('game-canvas') || document.querySelector('canvas');
                if (gameCanvas) {
                    const rect = gameCanvas.getBoundingClientRect();
                    window.mouseX = e.clientX - rect.left;
                    window.mouseY = e.clientY - rect.top;
                } else {
                    window.mouseX = e.clientX;
                    window.mouseY = e.clientY;
                }
            }
        };
        
        itemRow.onmouseleave = () => { 
            itemRow.style.background = "transparent"; 
            
            if (typeof window !== 'undefined' && window.hoveringSlot === item) {
                window.hoveringSlot = null;
            }
        };
    });

    // 余分な行を削除
    if (currentRows.length > items.length) {
        for (let i = items.length; i < currentRows.length; i++) {
            currentRows[i].remove();
        }
    }
});

// ============================================================
// :::BUY_FROM_VENDING::: 🛒 露店購入プロセスの実行と決済確認
// ============================================================
/**
 * 役割：
 * - 取引開始のデバッグログ出力（OwnerID/dbIdの追跡）
 * - 自店舗購入（セルフ購入）の不正防止・安全装置
 * - 購入確認モーダルの表示と、ユーザーの意思確認（承認/キャンセル）の制御
 * - サーバーへの購入リクエスト（vending_buy_req）の発行
 * - UIが存在しない場合の標準ダイアログへのフォールバック
 */
function buyFromVending(ownerId, dbId) {
    // 1. 関数が呼ばれた瞬間に青いログを出す
    console.log("%c🚀 [VENDING_DEBUG] buyFromVendingが呼び出されました", "background: blue; color: white; padding: 2px 5px;");
    console.log("├─ 受信OwnerID:", ownerId);
    console.log("├─ 受信dbId:", dbId);
    console.log("└─ 現在のsocket.id:", socket ? socket.id : "socket未定義");

    // 自分の店なら中断
    if (ownerId === socket.id) {
        console.warn("⚠️ [VENDING_DEBUG] 自店舗購入のため中断しました。");
        alert("自分の店でアイテムを買うことはできません。");
        return;
    }

    // 🌟 オリジナルUIモーダルの制御
    const modal = document.getElementById('vending-buy-confirm-modal');
    const confirmBtn = document.getElementById('buy-confirm-btn');
    const cancelBtn = document.getElementById('buy-cancel-btn');

    if (modal) {
        // モーダルを表示
        modal.style.display = 'block';
        console.log("├─ 購入確認モーダルを表示しました。");

        // ✅ 「購入する」ボタンが押された時
        confirmBtn.onclick = () => {
            console.log("├─ 購入確認ダイアログの結果: 承認 (OK)");
            
            // 3. サーバー送信直前のデータをログ
            console.log("%c✉️ [VENDING_DEBUG] サーバーへ 'vending_buy_req' を送信します...", "color: cyan; font-weight: bold;");
            
            socket.emit('vending_buy_req', {
                ownerId: ownerId,
                dbId: dbId
            });

            modal.style.display = 'none'; // モーダルを閉じる
        };

        // ❌ 「キャンセル」ボタンが押された時
        cancelBtn.onclick = () => {
            console.log("├─ 購入確認ダイアログの結果: キャンセル");
            console.log("└─ 購入がキャンセルされました。");
            
            modal.style.display = 'none'; // モーダルを閉じる
        };
    } else {
        // 万が一HTML要素が見つからない場合のフォールバック（従来のconfirm）
        console.error("⚠️ [VENDING_DEBUG] 確認モーダルが見つかりません。標準ダイアログを使用します。");
        if (confirm("このアイテムを購入しますか？")) {
            socket.emit('vending_buy_req', { ownerId, dbId });
        }
    }
}

// サーバーから「モデルIDの保存成功」通知を受け取る
socket.on('update_model_success', (data) => {
    // 💡 取得確認のログとアラート
    console.log("✅ サーバーから保存成功通知を受信しました:", data);
    //alert("キャラクターの設定が完了しました！冒険に出発しましょう。");
	alert("現在のモデルIDは: " + data.model_id + " です");

    // ここでゲーム開始に必要な処理があれば呼び出す
    // 例:
    // window.isGameStarted = true;
    // socket.emit('join', { ... });
});

// ============================================================
// :::SOCKET_ON_VENDING_BUY_SUCCESS::: 💰 露店購入の成功と所持金清算
// ============================================================
/**
 * 役割：
 * - サーバーからの購入成功通知（vending_buy_success）の受信
 * - プレイヤー所持金（myPlayer.gold）の最新化と同期
 * - インベントリやUIの整合性を維持するための再同期指示
 */
socket.on('vending_buy_success', (data) => {
    console.log("💰 購入成功。最新の所持金を受け取りました:", data.newMoney);

    // 1. メモリ上のプレイヤーデータを更新
    // あなたのコードで 'drawGoldUI' に渡しているオブジェクトを更新します
    if (typeof myPlayer !== 'undefined' && myPlayer) {
        myPlayer.gold = data.newMoney; 
        // これで次回の drawGoldUI(myPlayer) 実行時に新しい数値が描画されます
    }

    // 2. エラー（null is not an object）対策：
    // もしインベントリの再描画などを関数で行っている場合、
    // アイテムが消えたことによる参照エラーを防ぐために、
    // アイテムリストの整合性をチェックするか、安全な再読み込みを推奨します
    // 例: requestInventoryUpdate();
});

// ============================================================
// :::SOCKET_ON_VENDING_ITEM_SOLD::: 📢 売却成功通知と在庫・報酬の同期
// ============================================================
/**
 * 役割：
 * - 売却成功のログ出力と買い手名の表示
 * - プレイヤー所持金（myPlayer.gold）の最新化とUI更新
 * - 売れたアイテムを露店リスト（バッファとDOM）から即時削除（removeItemFromVending）
 * - 成功メッセージのプレイヤー通知（showSystemMessage）
 */
socket.on('vending_item_sold', (data) => {
    // 1. ログ出力 (data.dbId はサーバーから送られてくる売れたアイテムのID)
    console.log(`%c📢 商品売却成功: ${data.buyerName} が購入しました (ID: ${data.dbId})`, "color: #27ae60; font-weight: bold;");

    // 2. 所持金の更新
    if (typeof myPlayer !== 'undefined' && myPlayer) {
        myPlayer.gold = data.newMoney;
        // 所持金表示UIがあれば更新（例: updateMoneyUI() など）
    }

    // 3. 🌟 重要：売れたアイテムを露店販売リストから即座に削除
    // これにより、バッファ(vendingItemsBuffer)と表示(DOM)の両方が同期されます
    if (data.dbId) {
        removeItemFromVending(data.dbId);
		//markItemAsSold(data.dbId);
    }

    // 4. 通知メッセージの表示
    if (typeof showSystemMessage === 'function') {
        showSystemMessage(`${data.buyerName} さんにアイテムが売れました！`, "#27ae60");
    }
});

// ============================================================
// :::SOCKET_ON_SYSTEM_MESSAGE::: 📡 システムメッセージの受信と通知
// ============================================================
/**
 * 役割：
 * - サーバーからのメッセージ（テキストと色）を受信
 * - 既存の通知システム（addNotification）へ情報を引き渡し
 * - 「いっぱいです」等の重要警告に対し、プレイヤーへ強力なアラート（alert）を表示
 */
socket.on('system_message', (data) => {
    // 1. 既存の通知システムがあれば表示（addNotificationなど）
    if (typeof addNotification === 'function') {
        addNotification(data.text, data.color || "#FFFFFF");
    }

    // 2. 「いっぱいです」というキーワードが含まれている場合、アラートを表示
    if (data.text && data.text.includes("いっぱいです")) {
        alert("🎒 インベントリ制限\n\n" + data.text);
    }
});

socket.on('login_error', (data) => {
    // 警告メッセージを表示する処理
    alert(data.message); 
    // または、これまで作った「接続が切れました」と同じ仕組みで表示
    showErrorMessage(data.message);
});

// ==========================================
// 📦 露店データ管理用バッファ
// ==========================================
let vendingItemsBuffer = []; // サーバー送信用のデータを保持する箱

// ============================================================
// :::REMOVE_ITEM_FROM_VENDING::: 🗑️ 露店リストからのアイテム削除と同期
// ============================================================
/**
 * 役割：
 * - 販売リスト配列から指定IDのアイテムをフィルタリング除去
 * - 対応するHTML要素（DOM）を画面から削除
 * - ツールチップ（currentHoverSlot）のクリアによるゴミデータの防止
 * - リストが空になった際の初期メッセージの復帰
 */
function removeItemFromVending(itemId) {
    // 1. 配列から削除
    vendingItemsBuffer = vendingItemsBuffer.filter(i => (i.db_id || i.id) != itemId);
    
    // 2. 画面(DOM)から削除
    const el = document.getElementById(`vending-item-${itemId}`);
    if (el) el.remove();
    
    // 3. ホバー中のツールチップをクリア
    window.currentHoverSlot = null;

    // リストが空になったらメッセージを戻す（任意）
    const listContainer = document.getElementById('vending-item-list');
    if (listContainer && vendingItemsBuffer.length === 0) {
        listContainer.innerHTML = '<p style="color: #999; text-align: center; padding: 10px;">アイテムがありません</p>';
    }
    
    console.log(`[Vending] ID:${itemId} をリストから削除しました。残りの数: ${vendingItemsBuffer.length}`);
}

// ============================================================
// :::MARK_ITEM_AS_SOLD::: ✅ 売却済みアイテムの演出と在庫更新
// ============================================================
/**
 * 役割：
 * - 売却されたアイテムのDOMを視覚的にグレーアウト・透過処理
 * - 削除ボタンを「[売却済]」ラベルに差し替え、インタラクションを遮断
 * - メモリ上のバッファ（vendingItemsBuffer）からは削除し、データ整合性を維持
 */
function markItemAsSold(itemId) {
    const targetId = String(itemId);
    const itemEl = document.getElementById(`vending-item-${targetId}`);

    if (itemEl) {
        // 1. クリックやホバーを無効化
        itemEl.style.pointerEvents = "none";
        // 2. 見た目を薄くする（透過）
        itemEl.style.opacity = "0.5";
        itemEl.style.background = "#f0f0f0";
        
        // 3. 削除ボタンを「売却済」ラベルに差し替える
        const deleteBtn = itemEl.querySelector('button');
        if (deleteBtn) {
            deleteBtn.outerHTML = `<span style="color: #888; font-weight: bold; font-size: 10px; padding: 2px 5px;">[売却済]</span>`;
        }
        
        console.log(`✅ アイテム ${targetId} を売却済み表示にしました。`);
    }

    // バッファからは削除（店を開き直したときは消えてOKなため）
    vendingItemsBuffer = vendingItemsBuffer.filter(i => String(i.db_id || i.id) !== targetId);
}

// ============================================================
// :::ADD_ITEM_TO_VENDING_LIST::: 🏪 露店への商品陳列・データ供給
// ============================================================
/**
 * 役割：
 * - アイテムデータの検証と、販売バッファ（vendingItemsBuffer）への安全な登録
 * - 画像アセットのパス解決と、読み込みエラー時のフォールバック処理
 * - 装備品ランクに応じたグローエフェクト（神級〜粗悪）の適用
 * - メイプルストーリー伝統の価格帯別カラーリング（10k〜1000m以上）
 * - 陳列棚（UI）へのDOM生成とイベント登録（ホバー・削除）
 */
function addItemToVendingList(item) {
    const listContainer = document.getElementById('vending-item-list');
    
    // ==========================================
    // 🔍 完璧デバッグセクション (そのまま維持 + 追跡強化)
    // ==========================================
    console.group(`🏪 露店追加デバッグ: ${item?.name || '不明なアイテム'}`);
    console.log("1. 受信データ:", item);

    // 画像パス解決のロジック
    let finalIconPath = "";
    let solveMethod = "";

    if (item?.iconUrl && item.iconUrl !== "") {
        finalIconPath = item.iconUrl;
        solveMethod = "iconUrlから取得";
    } else if (item?.image_name) {
        finalIconPath = `${IMAGE_DOMAIN}item_assets/${item.image_name}`;
        solveMethod = "image_nameから生成";
    } else if (item?.type) {
        finalIconPath = `${IMAGE_DOMAIN}item_assets/${item.type}.png`;
        solveMethod = `⚠️ image_name不在のため type('${item.type}') から生成`;
    }

    console.log(`2. パス解決トレース: ${solveMethod}`);
    console.log(`3. 最終解決URL: "${finalIconPath}"`);
    
    if (finalIconPath) {
        const imgTest = new Image();
        imgTest.onload = () => {
            console.log("✅ 画像読み込み成功:", imgTest.src);
            console.log(`   サイズ: ${imgTest.width}x${imgTest.height}px`);
        };
        imgTest.onerror = () => {
            console.error("❌ 画像読み込み失敗！パスが間違っているかファイルが存在しません。");
            console.error("   ブラウザが試行した絶対パス:", imgTest.src);
        };
        imgTest.src = finalIconPath;
    } else {
        console.warn("⚠️ 有効な画像パス（iconUrl, image_name, type）が特定できません。");
    }
    console.groupEnd();

    if (!listContainer || !item) return;

    // --- 【追加箇所】配列バッファへのデータ格納 ---
    const itemId = item.db_id || item.id;
    const isAlreadyIn = vendingItemsBuffer.some(i => (i.db_id || i.id) === itemId);
    if (isAlreadyIn) {
        console.warn("⚠️ このアイテムは既にリストに含まれています。");
        return;
    }
    vendingItemsBuffer.push(item); 
    // ------------------------------------------

    if (listContainer.innerHTML.includes("アイテムがありません")) {
        listContainer.innerHTML = '';
    }

    const existing = document.getElementById(`vending-item-${itemId}`);
    if (existing) return;

    // 🏷️ アイテム名の判定とランク判定
    let displayName = item.displayName || item.name || item.item_name || item.itemName || "名称不明アイテム";
    let iconGlowStyle = ""; 

    const isEquipment = (
        item.type === 'sword' || 
        item.type === 'shield' || 
        item.category === 'weapon1' || 
        item.category === 'shield1' || 
        item.category === 'armor1' ||
        ['sword', 'armor', 'shield'].includes(item.item_type)
    );

    if (isEquipment && item.totalALLStats !== undefined && item.totalFirstStats !== undefined) {
        const bonus = item.totalALLStats - item.totalFirstStats;
        let rankName = "";
        let rankGlowColor = "";

        if (bonus >= 30)      { rankGlowColor = "#ff0000"; rankName = "(神級)"; }
        else if (bonus >= 25) { rankGlowColor = "#00ff00"; rankName = "(超伝説)"; }
        else if (bonus >= 20) { rankGlowColor = "#ffff00"; rankName = "(極上)"; }
        else if (bonus >= 15) { rankGlowColor = "#ff00ff"; rankName = "(伝説)"; }
        else if (bonus >= 10) { rankGlowColor = "#00ccff"; rankName = "(希少)"; }
        else if (bonus >= 5)  { rankGlowColor = "#ff9900"; rankName = "(良品)"; }
        else if (bonus >= 0)  { rankGlowColor = "";        rankName = "(標準)"; }
        else                  { rankGlowColor = "";        rankName = "(粗悪)"; }

        if (!displayName.includes("(")) displayName = `${displayName}${rankName}`;
        if (rankGlowColor) {
            iconGlowStyle = `filter: drop-shadow(0 0 4px ${rankGlowColor});`;
        }
    } else {
        displayName = displayName.replace(/\(標準\)$/, "");
    }

    // --- 🌟 メイプルストーリー伝統：価格による色分けロジック ---
    const rawPrice = Number(item.price || 0);
    let priceColor = "#0000FF"; // デフォルト：10k未満は青

    if (rawPrice >= 1000000000) {
        priceColor = "#4B0082"; // 1000m以上：濃い紫色 (Indigo/Deep Purple)
    } else if (rawPrice >= 100000000) {
        priceColor = "#A020F0"; // 100m以上：紫色 (Purple)
    } else if (rawPrice >= 10000000) {
        priceColor = "#FF0000"; // 10m以上：赤色 (Red)
    } else if (rawPrice >= 1000000) {
        priceColor = "#32CD32"; // 1m以上：黄緑色 (LimeGreen)
    } else if (rawPrice >= 10000) {
        priceColor = "#00CED1"; // 10k以上：水色 (DarkTurquoise/Cyan)
    }

    const displayPrice = item.price ? item.price.toLocaleString() : "0";

    // 🖼️ 要素の作成
    const itemEl = document.createElement('div');
    itemEl.id = `vending-item-${itemId}`;
    itemEl.style = "display: flex; justify-content: space-between; padding: 5px; border-bottom: 1px solid #eee; font-size: 12px; align-items: center; cursor: default;";
    
    itemEl.onmouseenter = () => { window.currentHoverSlot = item; };
    itemEl.onmouseleave = () => { window.currentHoverSlot = null; };

    // HTML構造 (修正点: 価格部分に priceColor を適用)
    itemEl.innerHTML = `
        <div style="display: flex; align-items: center; pointer-events: none; flex: 1;">
            <div style="width: 24px; height: 24px; margin-right: 8px; display: flex; align-items: center; justify-content: center; overflow: visible;">
                ${finalIconPath ? `
                    <img src="${finalIconPath}" 
                         onerror="this.src='assets/items/default.png'" 
                         style="max-width: 24px; max-height: 24px; image-rendering: pixelated; ${iconGlowStyle}">
                ` : `
                    <div style="width: 16px; height: 16px; background: #ccc; border-radius: 2px;"></div>
                `}
            </div>
            <div style="display: flex; flex-direction: column;">
                <span style="color: #333; font-weight: bold;">${displayName}</span>
                <span style="color: #444; font-size: 10px;">価格: <span style="color: ${priceColor}; font-weight: bold;">${displayPrice}</span> メル</span>
            </div>
            ${(!isEquipment && (item.count || item.quantity)) ? `<span style="color: #888; margin-left: 8px; font-size: 11px;">[${item.count || item.quantity}個]</span>` : ''}
        </div>
        <button onclick="removeItemFromVending('${itemId}')" 
                style="font-size: 10px; color: red; border: none; background: none; cursor: pointer; padding: 2px 5px;">[削除]</button>
    `;
    
    listContainer.appendChild(itemEl);
    console.log(`${displayName} を価格 ${displayPrice} メルで販売リストに追加しました。現在のバッファ:`, vendingItemsBuffer);
}

// ============================================================
// :::SAVE_GAME_DATA::: 💾 プレイヤーデータのサーバー同期（セーブ）
// ============================================================
/**
 * 役割：
 * - ログイン状態（myId, hero）の確認
 * - キャラクターの成長情報（Level, Exp, Stats）を抽出
 * - 現在の生存状況（HP, MP, Position）のパッケージ化
 * - サーバーへの保存リクエスト（save_player_data）の発行
 */
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
    console.log("オートセーブ実行:", saveData); // デバッグ用
}

// ============================================================
// :::AUTO_SAVE_INTERVAL::: ⏳ 冒険の自動記録（オートセーブ）
// ============================================================
/**
 * 役割：
 * - 10秒（10000ms）間隔で定期的にセーブ処理を駆動
 * - ログイン済み（myIdかつhero.nameが存在する）状態のみをセーブ対象とする
 */
setInterval(() => {
    if (myId && hero.name) {
        saveGameData();
    }
}, 10000);

// 全ての通信を監視する最強のデバッグコード
/*
socket.onAny((event, ...args) => {
    console.log(`📡 [受信したイベント]: ${event}`, args);
});
*/