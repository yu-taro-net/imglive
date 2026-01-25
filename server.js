// ==========================================
// 📦 1. モジュールの読み込み
// ==========================================
const express = require('express');
const app     = express();
const http    = require('http').createServer(app);
const io      = require('socket.io')(http);
const path    = require('path'); // ファイルパス操作用（絶対パスの指定などに必要）

// ==========================================
// ⚙️ 2. サーバーの基本設定
// ==========================================
// ポート番号の設定（環境変数 PORT があればそれを使い、なければ 3000番を使用）
const PORT = process.env.PORT || 3000;

// 「public」フォルダ内のファイルを自動で公開する設定
// これにより、index.html や view.js がブラウザから読み込めるようになります
app.use(express.static(path.join(__dirname, 'public')));

// ==========================================
// 🚀 3. サーバーの起動
// ==========================================
// ※ この下に socket.io の通信処理（io.on('connection', ...) など）を記述します
// ※ 最後に http.listen(PORT, ...) で待ち受けを開始します

// ==========================================
// 🛠️ 【初心者用】ゲームの設定エリア
// ここを書き換えるだけで、ゲームのバランスが変わります
// ==========================================
const SETTINGS = {
  CANVAS: { WIDTH: 800, HEIGHT: 600 },
  SYSTEM: { 
    GROUND_Y: 565,        // 一番下の地面の高さ
    GRAVITY: 0.5,         // 重力の強さ
    FRICTION: 0.98,       // 空中摩擦（1に近いほど止まらない）
    TICK_RATE: 40         // 更新間隔（ミリ秒）
  },
  PLAYER: {
    DEFAULT_W: 300,        // キャラクターの幅
    DEFAULT_H: 190,        // キャラクターの高さ
    SCALE: 1.0,
    MAX_HP: 100,          // 最大体力
    ATTACK_FRAME: 10      // 攻撃の持続時間
  },
  ITEM: {
    SIZE: 32,             // アイテムの見た目サイズ
    COLLISION_OFFSET: 15, // 当たり判定の幅（半分）
    SINK_Y: 0            // 地面に少し埋まる深さ（大きくすると深く埋まる）
  }
};

// マップの構造データ
const MAP_DATA = {
  platforms: [
    { x: 50,  y: 450, w: 180, h: 20 },
    { x: 300, y: 300, w: 200, h: 20 }, 
    { x: 550, y: 150, w: 200, h: 20 } 
  ],
  ladders: [{ x: 580, y1: 130, y2: 600 }] // はしご
};

// --- 📖 モンスター図鑑 (JSON形式) ---
// scale: 1.0 が標準。1.5なら1.5倍、0.5なら半分になります。
const ENEMY_CATALOG = {
  1: { type: 'monster1', w: 35,  h: 34,  hp: 200,  speed: 1.5, scale: 1.0, name: '青デンデン'},
  2: { type: 'monster2', w: 56,  h: 52,  hp: 500,  speed: 0.8, scale: 1.5, name: '緑キノコ'},
  3: { type: 'monster3', w: 179, h: 158, hp: 2000, speed: 0.5, scale: 1.0, name: 'ストーンゴーレム'},
  4: { type: 'monster4', w: 35,  h: 34,  hp: 200,  speed: 1.5, scale: 1.0, name: '青デンデン2'},
  5: { type: 'monster5', w: 612,  h: 291,  hp: 200,  speed: 1.5, scale: 1.0, name: 'エネミー1'}, 
  6: { type: 'monster6', w: 471,  h: 375,  hp: 200,  speed: 1.5, scale: 1.0, name: 'エネミー2'}, 
  7: { type: 'monster7', w: 546,  h: 289,  hp: 200,  speed: 1.5, scale: 1.0, name: 'エネミー3'}, 
  8: { type: 'monster8', w: 464,  h: 304,  hp: 200,  speed: 1.5, scale: 1.0, name: 'エネミー4'}, 
  9: { type: 'monster9', w: 461,  h: 501,  hp: 200,  speed: 1.5, scale: 1.0, name: 'エネミー5'}, 
  10: { type: 'monster10', w: 514,  h: 362,  hp: 200,  speed: 1.5, scale: 1.0, name: 'エネミー6'}, 
  11: { type: 'monster11', w: 421,  h: 307,  hp: 200,  speed: 1.5, scale: 1.0, name: 'エネミー7'}, 
  12: { type: 'monster12', w: 693,  h: 454,  hp: 200,  speed: 1.5, scale: 1.0, name: 'エネミー8'}, 
  13: { type: 'monster13', w: 471,  h: 335,  hp: 200,  speed: 1.5, scale: 1.0, name: 'エネミー9'}, 
  14: { type: 'monster14', w: 438,  h: 214,  hp: 200,  speed: 1.5, scale: 1.0, name: 'エネミー10'}, 
  15: { type: 'monster15', w: 468,  h: 376,  hp: 200,  speed: 1.5, scale: 1.0, name: 'エネミー11'}, 
  16: { type: 'monster16', w: 693,  h: 510,  hp: 200,  speed: 1.5, scale: 1.0, name: 'エネミー12'}, 
  17: { type: 'monster17', w: 322,  h: 242,  hp: 200,  speed: 1.5, scale: 1.0, name: 'エネミー13'}, 
  18: { type: 'monster18', w: 693,  h: 459,  hp: 200,  speed: 1.5, scale: 1.0, name: 'エネミー14'}, 
  19: { type: 'monster19', w: 533,  h: 403,  hp: 200,  speed: 1.5, scale: 1.0, name: 'エネミー15'}, 
  20: { type: 'monster20', w: 773,  h: 589,  hp: 200,  speed: 1.5, scale: 1.0, name: 'エネミー16'}, 
  21: { type: 'monster21', w: 506,  h: 522,  hp: 200,  speed: 1.5, scale: 1.0, name: 'エネミー17'}, 
  22: { type: 'monster22', w: 582,  h: 302,  hp: 200,  speed: 1.5, scale: 1.0, name: 'エネミー18'}, 
  23: { type: 'monster23', w: 227,  h: 337,  hp: 200,  speed: 1.5, scale: 1.0, name: 'エネミー19'}, 
  24: { type: 'monster24', w: 707,  h: 555,  hp: 200,  speed: 1.5, scale: 1.0, name: 'エネミー20'}, 
  25: { type: 'monster25', w: 596,  h: 428,  hp: 200,  speed: 1.5, scale: 1.0, name: 'エネミー21'}, 
  26: { type: 'monster26', w: 571,  h: 355,  hp: 200,  speed: 1.5, scale: 1.0, name: 'エネミー22'}, 
  27: { type: 'monster27', w: 766,  h: 542,  hp: 200,  speed: 1.5, scale: 1.0, name: 'エネミー23'}, 
  28: { type: 'monster28', w: 527,  h: 381,  hp: 200,  speed: 1.5, scale: 1.0, name: 'エネミー24'}, 
  29: { type: 'monster29', w: 487,  h: 327,  hp: 200,  speed: 1.5, scale: 1.0, name: 'エネミー25'}
};

// ==========================================
// 👾 敵キャラクターのクラス（仕組みの部分）
// ==========================================
class Enemy {
  // constructor（コンストラクター）は、新しい敵が作られた瞬間に一度だけ動く「初期化」の関数です
  constructor(id, platIndex) {
    // this.id: この敵を区別するための固有の番号（名前カードのようなもの）を保存します
    this.id = id;

    // this.platIndex: この敵がどの足場（プラットフォーム）に出現するか、その番号を保存します
    this.platIndex = platIndex; 

    // this.reset(): 敵の体力(HP)や位置(x, y)を初期状態に戻すための別の関数を呼び出しています
    // これにより、死んだ後に復活させたり、最初に配置したりするのが楽になります
    this.reset();
  }

  // ==========================================
  // 🔄 敵キャラクターの状態リセット（初期化）
  // ==========================================
  reset() {
    // 1. 🌟 表示・生存に関するフラグ
    this.alive        = true;   // 生存フラグ
    this.opacity      = 1;      // 不透明度（1 = はっきり見える）
    this.spawnAlpha   = 0;      // 出現時のフェードイン用
    this.isFading     = false;  // 死亡時の消滅アニメ中か
    this.deathFrame   = 0;      // 死亡アニメーションの経過

    // 2. 🌟 動作・タイマーに関する設定
    this.kbV          = 0;      // ノックバック速度
    this.isAttacking  = 0;      // 攻撃アニメーションの残り時間
    this.isEnraged    = false;  // 怒り状態か
    this.respawnTimer = 0;      // 復活までの待ち時間
    this.waitTimer    = 0;      // 移動の合間の待機時間
    this.offset       = 0;      // 足場内での相対位置
    this.dir = Math.random() < 0.5 ? 1 : -1; // 向きをランダムに決定

    // 3. 🌟 モンスター情報の読み込み（カタログから参照）
    // カタログに自分のIDがなければ1番のデータを予備として使う
    const config = ENEMY_CATALOG[this.id] || ENEMY_CATALOG[1];

    this.type  = config.type;              // 敵の種類（名前）
    this.scale = config.scale || 0.2;      // 表示倍率
    this.hp    = config.hp;                // 体力
    this.speed = config.speed;             // 移動スピード

    // 4. 🌟 サイズの計算（倍率を考慮）
    // scaleだけでなく、さらに0.2を掛けて微調整しています
    this.w = config.w * this.scale * 0.2;
    this.h = config.h * this.scale * 0.2;

    // 5. 📍 出現位置（座標）の決定
    const randomOffset = Math.floor(Math.random() * 61) - 30; // -30 ～ +30

    if (this.platIndex !== null) {
      // 【足場（プラットフォーム）の上に配置する場合】
      const p = MAP_DATA.platforms[this.platIndex];
      if (p) {
        // 足場の横幅(p.w)の中に収まるようにランダムな位置(offset)を決める
        this.offset = Math.floor(Math.random() * (p.w - this.w));
        this.x = p.x + this.offset;
        this.y = p.y - this.h; // 足場の上にのせる
      }
    } else {
      // 【地面に配置する場合】
      this.x = 550 + randomOffset;
      this.y = SETTINGS.SYSTEM.GROUND_Y - this.h; // 地面の高さに合わせる
    }
  }

  // ==========================================
  // ⚙️ フレームごとの更新処理
  // ==========================================
  update() {
    // --- 出現時のフェードイン効果 ---
    if (this.spawnAlpha < 1) {
      this.spawnAlpha += 0.05;
    }

    // === 💀 1. 共通：消滅演出・リスポーン管理 ===
    if (this.isFading) {
      if (++this.deathFrame > 40) {
        this.alive = false;
        this.isFading = false;
        this.respawnTimer = (this.platIndex === null) ? 300 : 150;
      }
      return; 
    }

    if (!this.alive) { 
      if (--this.respawnTimer <= 0) { 
        this.reset(); 
        if (this.platIndex !== null) this.opacity = 0; 
      }
      return; 
    }

    // === 💥 2. ノックバック計算 ===
    if (Math.abs(this.kbV) > 0.1) {
      if (this.platIndex === null) {
        this.x += this.kbV;
        this.x = Math.max(0, Math.min(800 - this.w, this.x));
      } else {
        const p = MAP_DATA.platforms[this.platIndex];
        if (p) {
          this.offset += this.kbV;
          this.offset = Math.max(0, Math.min(p.w - this.w, this.offset));
        }
      }
      this.kbV *= 0.85;
    } else {
      this.kbV = 0;
    }
	
    // === 🌟 3. ジャンプの物理計算 (エラー修正済み) ===
    if (this.jumpY === undefined) this.jumpY = 0;
    if (this.jumpV === undefined) this.jumpV = 0;
    if (this.jumpFrame === undefined) this.jumpFrame = 0;

    // 地面にいない、または上向きの速度がある場合（ジャンプ中）
    if (this.jumpY < 0 || this.jumpV !== 0) {
      this.jumpV += 0.5; // 重力
      this.jumpY += this.jumpV;
      this.jumpFrame++; // 🌟 ジャンプ中のアニメーションコマを進める

      if (this.jumpY >= 0) {
        this.jumpY = 0;
        this.jumpV = 0;
        this.jumpFrame = 0; // 着地したらコマをリセット
      }
    }

    // 🌟 ジャンプの開始判定 (en ではなく this を使う)
    // 0.01 (1%) の確率でジャンプ
    if (this.jumpY === 0 && Math.random() < 0.01) { 
      this.jumpV = -7;   // ジャンプ初速
      this.jumpFrame = 0; // 🌟 ジャンプした瞬間にアニメーションを0コマ目にリセット
    }

    // === 🐾 🐾 3. 行動ロジック (自動移動・反転・追尾) ===
    if (this.waitTimer > 0) {
      this.waitTimer--;
    } else {
      // --- 🌟 A. 怒り状態（追尾モード） ---
      if (this.isEnraged && Object.keys(players).length > 0) {
        const target = Object.values(players)[0];
        if (target) {
          // プレイヤーの方向を向く
          this.dir = (target.x < this.x) ? -1 : 1;
          
          const diffX = target.x - this.x;
          const moveStep = this.speed * 1.5 * this.dir; // 通常の1.5倍速
          
          let nextX = this.x + moveStep;
          if (Math.abs(diffX) < Math.abs(moveStep)) {
            nextX = target.x; // 重なる直前ならピタリと合わせる
          }

          if (this.platIndex === null) {
            // 【地面追尾】：400-800の範囲制限
            if (nextX > 400 && nextX < 800 - this.w) {
              this.x = nextX;
            }
          } else {
            // 【足場追尾】：崖っぷち判定あり
            const p = MAP_DATA.platforms[this.platIndex];
            let nextOffset = this.offset + (nextX - this.x);
            
            if (nextOffset < 0 || nextOffset > p.w - this.w) {
              // 崖で止めて、1.5秒間「ふんっ！」と背を向ける（waitTimer）
              if (nextOffset < 0) this.offset = 0;
              if (nextOffset > p.w - this.w) this.offset = p.w - this.w;
              this.x = p.x + this.offset;
              this.waitTimer = 60; 
            } else {
              this.offset = nextOffset;
              this.x = p.x + this.offset;
            }
          }
        }
      } 
      // --- 🌟 B. 通常状態（巡回モード） ---
      else if (this.platIndex === null) {
        // 地面の巡回（400-800）
        this.x += this.speed * this.dir;
        if (this.x < 400)          { this.x = 400;         this.dir =  1; }
        if (this.x > 800 - this.w) { this.x = 800 - this.w; this.dir = -1; }
      } else {
        // 足場の巡回
        const p = MAP_DATA.platforms[this.platIndex];
        if (p) {
          this.offset += this.speed * this.dir;
          if (this.offset <= 0) { 
            this.offset = 0.5; this.dir = 1; this.waitTimer = 40; 
          } else if (this.offset >= p.w - this.w) { 
            this.offset = p.w - this.w - 0.5; this.dir = -1; this.waitTimer = 40;
          }
        }
      }

      // 気まぐれな停止と反転（通常時のみ 1% の確率で発生）
      if (!this.isEnraged && Math.random() < 0.01) { 
        this.waitTimer = Math.floor(Math.random() * 200) + 50; 
        this.dir *= (Math.random() > 0.5 ? 1 : -1); 
      }
    }

    // === 🎯 4. 最終座標の確定 (足場データとの同期) ===
    if (this.platIndex === null) {
      // 地面の高さ固定
      this.y = SETTINGS.SYSTEM.GROUND_Y - this.h;
    } else {
      // 足場の位置に合わせて座標更新
      const p = MAP_DATA.platforms[this.platIndex];
      if (p) {
        if (this.opacity < 1) this.opacity += 0.02; // 足場への出現フェードイン
        this.x = p.x + this.offset;
        this.y = p.y - this.h;
      }
    }
  }
}

// ==========================================
// 🌐 サーバー全体の管理データ
// ==========================================
let players = {};         // 参加中のプレイヤーたち
let droppedItems = [];    // 画面に落ちているアイテム
let lastPickedItems = []; // 🌟 拾われた情報を一時保存する箱（ここがベスト！）

// モンスター名とIDを紐付ける名簿
const ENEMY_ID = {
  A_DENDEN: 1,
  M_KINOKO: 2,
  GOLEM: 3
};

// --- 👾 モンスターの配置設定 ---
const ENEMY_PLAN = [
  { plat: 0,    id: 5 }, 
  { plat: 1,    id: 6 }, 
  { plat: 1,    id: 6 }, 
  { plat: 2,    id: 7 }, 
  { plat: null, id: 20 }
];

// --- ⚙️ 自動生成システム ---
// ここで Enemy クラスを実体化（インスタンス化）します
let enemies = ENEMY_PLAN.map(p => new Enemy(p.id, p.plat));

// ==========================================
// 🌟 モンスターごとのドロップ設定
// ==========================================
const DROP_DATABASE = {
  "monster1":  { table: "small"},
  "monster2":  { table: "small"  },
  "monster3":  { table: "small"  },
  "monster20": { table: "big"  },
};

const DROP_CHANCE_TABLES = {
  "big":   { "gold_heart": 40, "money5": 20, "gold_one": 5, "default": 50 }, // 50%でドロップ、そのうち20%で金塊
  "big2":  { "shield": 90, "money5": 80, "default": 50 },
  "small": { "gold_heart": 40, "money6": 50,  "default": 50 }
};

io.on('connection', socket => {
    // --- ★追加：接続した瞬間に、そのプレイヤー本人にIDを教える ---
    socket.emit('your_id', socket.id);
    console.log(`User connected: ${socket.id}`);

    // プレイヤー参加
    socket.on('join', n => {
        players[socket.id] = {
            id: socket.id,
            name: n, x: 50, y: 500, dir: 1, score: 0, inventory: [], isAttacking: 0,

            // 🌟 ここを以下のように書き換えます
            w: SETTINGS.PLAYER.DEFAULT_W * (SETTINGS.PLAYER.SCALE || 1.0),
            h: SETTINGS.PLAYER.DEFAULT_H * (SETTINGS.PLAYER.SCALE || 1.0),
            scale: SETTINGS.PLAYER.SCALE || 1.0,

            hp: SETTINGS.PLAYER.MAX_HP, maxHp: SETTINGS.PLAYER.MAX_HP
        };
    });

    // 🌟 キャラクター番号の変更を受け取る
    socket.on('change_char', (data) => {
        if (players[socket.id]) {
            players[socket.id].charVar = data.charVar;
            // 全員に「この人のキャラが変わったよ」と即座に伝えるなら以下（任意）
            io.emit('update_players', players);
        }
    });

    // 🌟 グループ番号の変更を受け取る
    socket.on('change_group', (data) => {
        if (players[socket.id]) {
            players[socket.id].group = data.group;
            io.emit('update_players', players);
        }
    });

    // 移動同期
    socket.on('move', d => { if (players[socket.id]) Object.assign(players[socket.id], d); });

    // 攻撃処理
    // ⚔️ 攻撃処理（一番近い敵1体だけに当たるバージョン）
    // ⚔️ 攻撃イベント：一番近い敵1体を狙い撃ちする
    // ⚔️ 攻撃イベント：【決定版】絶対に1回につき1体しか叩かない設定
    socket.on('attack', data => {
        const p = players[socket.id];
        if (!p) return;

        if (p.isClimbing) return;

        // ラグ対策：攻撃の「余韻」の時間は、新しいダメージ計算を拒否する
        if (p.isAttacking > 0 && p.isAttacking < SETTINGS.PLAYER.ATTACK_FRAME) return;
        if (p.isAttacking === SETTINGS.PLAYER.ATTACK_FRAME) return; // 🌟この行を「一時的に」追加してチェック

        // 攻撃開始！タイマーをセット
        p.isAttacking = SETTINGS.PLAYER.ATTACK_FRAME;

        let targetsInRange = [];

        // --- ① 範囲内の敵をリストアップ ---
        enemies.forEach((target) => {
            if (target.alive && !target.isFading) {
                // 🌟 敵の中心点を計算（target.wが小さくなっているので、ここも自動で調整されます）
                const enemyCenterX = target.x;
                const enemyCenterY = target.y;
                const dx = enemyCenterX - p.x;
                const dy = Math.abs(p.y - enemyCenterY);

                // 🌟 【ここが重要】攻撃判定を広げます
                // 自分の幅(p.w)は変えず、後ろに足す固定値を「+80」くらいに大きくします
                const hitRangeX = (p.w / 2) + 80;
                const hitRangeY = 100; // 高さは100あれば十分当たります

                // 🌟 前方にいるかどうかの判定（30px程度の余裕を持たせる）
                const isFront = (p.dir === 1 && dx > -30) || (p.dir === -1 && dx < 30);

                if (Math.abs(dx) < hitRangeX && dy < hitRangeY && isFront) {
                    targetsInRange.push({ enemy: target, dist: Math.abs(dx) });
                }
            }
        });

        // --- ② 最も近い敵「だけ」にダメージを与える ---
        if (targetsInRange.length > 0) {
            targetsInRange.sort((a, b) => a.dist - b.dist);
            const nearest = targetsInRange[0].enemy;

            // ダメージ実行
            const damage = data.power || 20;
            nearest.hp -= damage;

            // 🌟 これを追加！一度でも攻撃されたら「怒りモード」を永続ONにする
            nearest.isEnraged = true;

            // 🌟 ダメージを受けてから攻撃するまでの「タメ」を作る
            // すぐに攻撃せず、少しの間（例：10フレーム＝約0.4秒）をおいてから
            // 攻撃モーションに入るように予約します
            if (nearest.isAttacking <= 0) {
                setTimeout(() => {
                    if (nearest && nearest.hp > 0) {
                        nearest.isAttacking = 22;
                    }
                }, 1000); // 400ミリ秒（0.4秒）待ってから攻撃開始
            }

            nearest.kbV = p.dir * (nearest.type === 'golem' ? 6 : 12);
            nearest.dir = (p.x < nearest.x) ? -1 : 1;

            io.emit('damage_effect', {
                x: nearest.x + nearest.w / 2,
                y: nearest.y,
                val: damage,
                isCritical: damage >= 85,
                type: 'enemy_hit'
            });

            // --- 💀 死亡判定とドロップ処理 ---
            if (nearest.hp <= 0) {
                nearest.hp = 0;
                nearest.alive = false;
                nearest.isFading = true;
                nearest.deathFrame = 0;

                // 1. 🌟 データベースから設定を読み込む
                const setting = DROP_DATABASE[nearest.type] || { table: "small" };
                const chances = DROP_CHANCE_TABLES[setting.table];

                // 2. 🌟 抽選処理（パーセント方式に修正）
                let itemsToDrop = [];

                // 🌟 A. まず「何か落とすか（default）」を100基準で判定
                const dropRoll = Math.random() * 100;
                if (dropRoll <= (chances.default || 100)) {
                    
                    // 🌟 B. 各アイテムの当選判定も100基準で回す
                    for (let type in chances) {
                        if (type === "default") continue;

                        const chancePercent = chances[type]; // ここが「20」なら20%
                        if (Math.random() * 100 < chancePercent) {
                            itemsToDrop.push(type); // 当選！
                        }
                    }
                }

                // 3. 🌟 当選したアイテムを噴水状に飛ばす（演出ロジックは完全維持）
                const dropCount = itemsToDrop.length;
                // 足元から50px上の高さを計算
                const fixedSpawnY = nearest.y + (nearest.h || 0) - 50;

                for (let i = 0; i < dropCount; i++) {
                    // 🌟 メイプル風：左右に広く散らばるように角度を設定 (-135度〜-45度の広い範囲)
                    const angle = (-140 + (100 / (dropCount + 1)) * (i + 1)) * (Math.PI / 180);

                    // 🌟 メイプル風：高さ（勢い）に少しだけランダムな幅を出す
                    // 4〜8くらいの範囲でバラつかせると、ジャラジャラ感が出ます
                    const speed = 4 + Math.random() * 4;

                    droppedItems.push({
                        id: Date.now() + Math.random() + i,
                        // x座標は敵の真ん中、y座標は「固定した高さ」を使用
                        x: nearest.x + nearest.w / 2,
                        y: fixedSpawnY,
                        vx: Math.cos(angle) * speed,
                        vy: Math.sin(angle) * speed,
                        type: itemsToDrop[i],
                        phase: Math.random() * Math.PI * 2,
                        landed: false
                    });
                }
            }

            // 🌟 【ここが最重要！】
            // ダメージを与えたら、この瞬間に return して「attack」処理を完全に終わらせる。
            // これにより、たとえリストに他の敵が残っていても、2体目を叩くことは物理的に不可能になります。
            return;
        }
    });

    // --- 💰 アイテム拾得（pickup）の処理（修正完了版） ---
socket.on('pickup', itemId => {
    const player = players[socket.id];
    if (!player) return;

    // 1. 🔍 地面のアイテムリストから対象を探す
    const idx = droppedItems.findIndex(it => it.id === itemId);

    // 🌟 アイテムが見つかった（まだ誰にも拾われていない）場合のみ実行
    if (idx !== -1) {
        // 2. ✂️ 即座にリストから抜き取る（これで物理的に2回目は発生しません）
        const item = droppedItems.splice(idx, 1)[0];

        if (item) {
            // 3. 📝 演出用に記録
            lastPickedItems.push({
                type: item.type,
                x: item.x,
                y: item.y,
                pickerId: socket.id
            });

            // 4. 🎁 報酬を与える
            player.inventory.push(item.type);
            const points = (item.type === 'gold') ? 500 : (item.type === 'money3' ? 100 : 10);
            player.score += points;
            
            // 5. 📡 【ここを修正】正しい変数名（MAP_DATA）を使って全員に通知
            // これによりエラーが出なくなり、アイテムが画面からパッと消えるようになります
            io.emit('state', { 
                players: players, 
                items: droppedItems, 
                enemies: enemies, 
                platforms: MAP_DATA.platforms, // 🌟 変数名を修正
                ladders: MAP_DATA.ladders      // 🌟 変数名を修正
            });
        }
    }
});

    // ダメージ同期
    socket.on('player_damaged', data => {
        if (players[socket.id]) {
            players[socket.id].hp = data.newHp;
            io.emit('damage_effect', { x: players[socket.id].x + 30, y: players[socket.id].y, val: data.val, isCritical: false, type: 'player_hit' });
        }
    });

    // チャット（名前を含めて全員に送信）
    socket.on('chat', text => {
        io.emit('chat', { id: socket.id, name: players[socket.id]?.name || "Guest", text: text });
    });

    // 切断処理
    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
        delete players[socket.id];
    });
});

// ==========================================
// 🔄 メイン更新ループ（時間経過による変化を全プレイヤーに同期）
// ==========================================
setInterval(() => { 
  
  // --- 👾 1. 敵(Enemies)の状態更新 ---
  enemies.forEach(e => {
    // 動きの計算を実行
    e.update();
    
    // ダメージを受けた時の「点滅タイマー」を1ずつ減らす
    if (e.damageTimer > 0) {
      e.damageTimer--;
    }

    // 攻撃アニメーションの管理
    if (e.isAttacking > 0) {
      // 攻撃中ならタイマーを減らす
      e.isAttacking--;
    } else if (e.isEnraged) {
      // 🌟 怒り状態なら、1%の確率でランダムに攻撃を開始する
      if (Math.random() < 0.01) e.isAttacking = 22;
    }
  });
  
  // --- 👤 2. プレイヤー(Players)のタイマー管理 ---
  for (let id in players) {
    // 攻撃後の硬直時間（余韻）を1ずつ減らす
    if (players[id].isAttacking > 0) {
      players[id].isAttacking--;
    }
  }
  
  // --- 💎 3. 落ちているアイテム(Items)の物理計算 ---
  droppedItems.forEach(it => {
    if (!it.landed) {
      // 空中にある場合は移動と重力を計算
      it.x += it.vx; 
      it.y += it.vy; 
      it.vy += SETTINGS.SYSTEM.GRAVITY; // 重力で下に加速
      it.vx *= SETTINGS.SYSTEM.FRICTION; // 空気抵抗で横移動を減速

      // 【判定 A】足場(Platforms)との着地
      MAP_DATA.platforms.forEach(p => {
        if (it.vy > 0 && 
            it.x + SETTINGS.ITEM.COLLISION_OFFSET > p.x && 
            it.x < p.x + p.w && 
            it.y + SETTINGS.ITEM.SIZE >= p.y && 
            it.y + SETTINGS.ITEM.SIZE <= p.y + 10) { 
          
          // 着地位置を固定し、動きを止める
          it.y = p.y - SETTINGS.ITEM.SIZE + SETTINGS.ITEM.SINK_Y; 
          it.landed = true; 
          it.vy = 0; 
          it.vx = 0;
        }
      });

      // 【判定 B】一番下の地面(Ground)との着地
      if (!it.landed && it.y + SETTINGS.ITEM.SIZE >= SETTINGS.SYSTEM.GROUND_Y) { 
        it.y = SETTINGS.SYSTEM.GROUND_Y - SETTINGS.ITEM.SIZE + SETTINGS.ITEM.SINK_Y; 
        it.landed = true; 
        it.vy = 0; 
        it.vx = 0; 
      }
    }
  });

  // --- 📡 4. 全プレイヤーへ最新の状態を一斉送信(Broadcast) ---
// 'state' という名前の電波（イベント）に乗せて、ゲームの状況をパケットにして送ります
io.emit('state', { 
    // 👥 プレイヤー情報：全員の座標、名前、HPなど
    players: players,

    // 💰 アイテム情報：地面に落ちているすべてのドロップアイテム
    items: droppedItems,

    // 👾 モンスター情報：
    // .map を使って、送信する直前に「ジャンプの状態」を計算して付け足しています
    enemies: enemies.map(en => ({
        ...en,                 // 既存のステータス（id, x, y, hpなど）をすべてコピー
        jumpY: en.jumpY || 0,  // 現在のジャンプの高さ（データがなければ0）
        isJumping: (en.jumpY || 0) !== 0 // 0以外なら「ジャンプ中である」という判定をその場で作る
    })),

    // 🗺️ マップ構造：足場とハシゴの配置データ
    platforms: MAP_DATA.platforms, 
    ladders: MAP_DATA.ladders,

    // 🎁 アイテム取得確定情報：
    // 誰かがアイテムを拾ったという最新の確定通知
    lastPickedItems: lastPickedItems 
});

  // 🌟 送信が終わったら、取得情報をリセット
  lastPickedItems = []; 

}, SETTINGS.SYSTEM.TICK_RATE); // 設定された間隔（例: 40ms）ごとに実行

http.listen(PORT, () => console.log('Server is running...'));