// ==========================================
// 📦 1. モジュールの読み込み
// ==========================================
const express = require('express');
const mysql = require('mysql2');
const app     = express();
const http    = require('http').createServer(app);
const io = require('socket.io')(http, {
  cors: {
    // ロリポップのURLと、ローカルテスト用のURLを両方許可する
    origin: [
        "https://imglive.net", 
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ],
    methods: ["GET", "POST"],
    credentials: true
  }
});
const path    = require('path'); // ファイルパス操作用（絶対パスの指定などに必要）

// ==========================================
// 🗄️ MySQLへの接続（ここが土田さんの言った部分です！）
// ==========================================
/*
const connection = mysql.createConnection(process.env.MYSQL_URL || {
    host: 'localhost',
    port: 8889,      // 🌟 MAMPのMySQLは通常「8889」を使います
    user: 'root',
    password: 'root',  // 🌟 MAMPの初期パスワードは「root」です
    database: 'my_game'   // 🌟 MAMPのphpMyAdminで「test」というDBを作っておく必要があります
});
*/
// ==========================================
// 🗄️ MySQLへの接続（改良版：自動再接続つき）
// ==========================================

// 1. 接続情報を変数にまとめる（Railwayの環境変数を優先）
const dbConfig = process.env.MYSQL_URL || 'mysql://root:yWwJPVjrLsQDapTxfyBUHPkigNLFYpDg@ballast.proxy.rlwy.net:53684/railway';

let connection;

function handleDisconnect() {
  // 接続の作成
  connection = mysql.createConnection(dbConfig);

  // 接続実行
  connection.connect(err => {
    if (err) {
      console.error('MySQL接続エラー。2秒後に再試行します...:', err.stack);
      setTimeout(handleDisconnect, 2000); // 失敗したら2秒後にやり直し
      return;
    }
    console.log('MySQLに無事つながりました！');
  });

  // 🌟 接続中のエラー（突然の切断など）を監視
  connection.on('error', err => {
    console.error('MySQL実行時エラー:', err);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
      console.log('接続が切れました。再接続を開始します...');
      handleDisconnect(); // 切断されたら自動で繋ぎ直す
    } else {
      throw err; // それ以外の重大なエラーは投げる
    }
  });
}

// 最初の呼び出し
handleDisconnect();

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
    TICK_RATE: 40,         // 更新間隔（ミリ秒）
	// --- 🌟 追加：敵の移動制限範囲 ---
    ENEMY_MIN_X: 400,
    ENEMY_MAX_X: 800
  },
  PLAYER: {
    DEFAULT_W: 300,        // キャラクターの幅
    DEFAULT_H: 190,        // キャラクターの高さ
    SCALE: 1.0,
    MAX_HP: 100,          // 最大体力
    ATTACK_FRAME: 10,      // 攻撃の持続時間
	ATTACK_RANGE_X: 80,  // 横方向のリーチ
    ATTACK_RANGE_Y: 100  // 縦方向の判定幅
  },
  ITEM: {
    SIZE: 32,             // アイテムの見た目サイズ
    COLLISION_OFFSET: 15, // 当たり判定の幅（半分）
    SINK_Y: 0,            // 地面に少し埋まる深さ（大きくすると深く埋まる）
	PICKUP_RANGE_X: 60,   // 横方向にどのくらい近づけば拾えるか
    PICKUP_RANGE_Y: 40    // 縦方向にどのくらい近づけば拾えるか
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
	
	this.jumpY = 0;     // ジャンプによる高さのズレ
    this.jumpV = 0;     // ジャンプの垂直速度
    this.jumpFrame = 0; // ジャンプアニメーションのコマ数

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
	/*
    if (this.jumpY === undefined) this.jumpY = 0;
    if (this.jumpV === undefined) this.jumpV = 0;
    if (this.jumpFrame === undefined) this.jumpFrame = 0;
    */
	
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
        // 地面の巡回（設定値を使用）
        this.x += this.speed * this.dir;
        if (this.x < SETTINGS.SYSTEM.ENEMY_MIN_X) { 
            this.x = SETTINGS.SYSTEM.ENEMY_MIN_X; 
            this.dir = 1; 
        }
        if (this.x > SETTINGS.SYSTEM.ENEMY_MAX_X - this.w) { 
            this.x = SETTINGS.SYSTEM.ENEMY_MAX_X - this.w; 
            this.dir = -1; 
        }
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
  "monster20": { table: "big2"  },
};

const DROP_CHANCE_TABLES = {
  "big":   { "gold_heart": 40, "money5": 20, "gold_one": 5, "default": 50 }, // 50%でドロップ、そのうち20%で金塊
  "big2":  { "shield": 90, "gold": 80, "default": 100 },
  "small": { "gold_heart": 40, "money6": 50,  "default": 50 }
};

// 🌟 経験値を加算してレベルアップをチェックする専用の関数
function addExperience(player, amount) {
    if (!player) return;

    // 経験値を加算
    player.exp = (Number(player.exp) || 0) + amount;
    player.maxExp = 100;

    console.log(`[EXP] ${player.name}: +${amount} (Total: ${player.exp})`);

    // レベルアップ判定
    if (player.exp >= player.maxExp) {
        player.level = (Number(player.level) || 1) + 1;
        player.exp = 0;
        console.log(`[LEVEL UP] ${player.name} が Lv.${player.level} になりました！`);
    }

    // 本来ならここでDB保存関数を呼ぶとさらにスッキリします
}

// 💰 敵を倒した時にアイテムを生成する専用の関数
function spawnDropItems(enemy) {
    const setting = DROP_DATABASE[enemy.type] || { table: "small" };
    const chances = DROP_CHANCE_TABLES[setting.table];
    let itemsToDrop = [];

    const dropRoll = Math.random() * 100;
    if (dropRoll <= (chances.default || 100)) {
        for (let type in chances) {
            if (type === "default") continue;
            if (Math.random() * 100 < chances[type]) {
                itemsToDrop.push(type);
            }
        }
    }

    const fixedSpawnY = enemy.y + (enemy.h || 0) - 50;
    itemsToDrop.forEach((type, i) => {
        const angle = (-140 + (100 / (itemsToDrop.length + 1)) * (i + 1)) * (Math.PI / 180);
        const speed = 4 + Math.random() * 4;
        droppedItems.push({
            id: Date.now() + Math.random() + i,
            x: enemy.x + enemy.w / 2,
            y: fixedSpawnY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            type: type,
            phase: Math.random() * Math.PI * 2,
            landed: false
        });
    });
}

// ==========================================
// 📞 イベントハンドラ（各アクションの具体的な中身）
// ==========================================

// 1. プレイヤーが参加したときの処理
function handleJoin(socket, name) {
    // 🌟 データベースに名前を保存
    const sql = 'INSERT INTO players2 (name) VALUES (?)';
    connection.query(sql, [name], (err, result) => {
        if (err) {
            console.error('player2への保存に失敗しました:', err);
        } else {
            console.log(`✅ DB保存成功: ${name} さんを記録しました！`);
        }
    });

    // 🌟 プレイヤーデータの作成
    players[socket.id] = {
        id: socket.id,
        name: name,
        x: 50,
        y: 500,
        dir: 1,
        score: 0,
        inventory: [],
        isAttacking: 0,
        level: (players[socket.id] ? players[socket.id].level : 1),
        exp: (players[socket.id] && players[socket.id].exp !== undefined) ? players[socket.id].exp : 0,
        maxExp: 100,
        w: SETTINGS.PLAYER.DEFAULT_W * (SETTINGS.PLAYER.SCALE || 1.0),
        h: SETTINGS.PLAYER.DEFAULT_H * (SETTINGS.PLAYER.SCALE || 1.0),
        scale: SETTINGS.PLAYER.SCALE || 1.0,
        hp: SETTINGS.PLAYER.MAX_HP,
        maxHp: SETTINGS.PLAYER.MAX_HP
    };
}

/**
 * 2. プレイヤーが攻撃したときの処理
 */
function handleAttack(socket, data) {
    const p = players[socket.id];
    if (!p) return; // プレイヤーがいなければ中止

    // 【ログ】ボタンが押されたことをサーバーが認識
    console.log(`[1.通信確認] ${p.name} が攻撃しました`);

    // ハシゴを登っている間は攻撃できない
    if (p.isClimbing) return;

    // 【二重攻撃防止】攻撃アニメーションが終わるまでは、次のダメージ計算をしない（ラグ対策）
    //if (p.isAttacking > 0 && p.isAttacking < SETTINGS.PLAYER.ATTACK_FRAME) return;
    //if (p.isAttacking === SETTINGS.PLAYER.ATTACK_FRAME) return;
	if (p.isAttacking > SETTINGS.PLAYER.ATTACK_FRAME - 5) return;

    // 🚩 サーバー側で「攻撃アニメーション中」のフラグを立てる
    p.isAttacking = SETTINGS.PLAYER.ATTACK_FRAME;

    let targetsInRange = [];

    // --- ① 範囲内の敵をリストアップ ---
    enemies.forEach((target) => {
        // 敵が生きていて、消えかかっていない場合のみ計算
        if (target.alive && !target.isFading) {
            const enemyCenterX = target.x;
            const enemyCenterY = target.y;
            const dx = enemyCenterX - p.x; // 横の距離
            const dy = Math.abs(p.y - enemyCenterY); // 縦の距離

            // 攻撃が届く「箱」の大きさを設定
            const hitRangeX = (p.w / 2) + SETTINGS.PLAYER.ATTACK_RANGE_X;
            const hitRangeY = SETTINGS.PLAYER.ATTACK_RANGE_Y;

            // ちゃんと敵の方を向いているか判定（右向きなら右に、左向きなら左に敵がいるか）
            const isFront = (p.dir === 1 && dx > -30) || (p.dir === -1 && dx < 30);

            // 「縦・横・向き」がすべて一致したら、攻撃対象リストに入れる
            if (Math.abs(dx) < hitRangeX && dy < hitRangeY && isFront) {
                targetsInRange.push({ enemy: target, dist: Math.abs(dx) });
            }
        }
    });

    // --- ② 最も近い敵「だけ」にダメージを与える ---
    if (targetsInRange.length > 0) {
        // 距離が近い順に並び替えて、一番近い敵を選ぶ
        targetsInRange.sort((a, b) => a.dist - b.dist);
        const nearest = targetsInRange[0].enemy;

        // ダメージを計算（指定がなければ基本20ダメージ）
        const damage = data.power || 20;
        nearest.hp -= damage; // 敵のHPを減らす
        
        console.log(`[2.命中確認] ${nearest.type}に${damage}ダメージ。残りHP: ${nearest.hp}`);

        // 攻撃された敵を「怒り状態」にして反撃の準備をさせる
        nearest.isEnraged = true;

        // 1秒後に敵が反撃してくる予約
        if (nearest.isAttacking <= 0) {
            setTimeout(() => {
                if (nearest && nearest.hp > 0) {
                    nearest.isAttacking = 22;
                }
            }, 1000);
        }

        // 敵をノックバック（後ろに弾き飛ばす）
        nearest.kbV = p.dir * (nearest.type === 'monster3' ? 6 : 12);
        nearest.dir = (p.x < nearest.x) ? -1 : 1; // 敵をプレイヤーの方に向かせる

        // 画面に「バシッ！」というダメージエフェクトを送る
        io.emit('damage_effect', {
            x: nearest.x + nearest.w / 2,
            y: nearest.y,
            val: damage,
            isCritical: damage >= 85,
            type: 'enemy_hit'
        });

        // --- 💀 死亡判定と報酬処理 ---
        if (nearest.hp <= 0 && nearest.alive) {
            nearest.alive = false; // 死亡フラグ
            
			socket.emit('exp_log', { amount: 10 }); 

            // 🌟 経験値を10追加（ここが土田さんの頑張ったポイント！）
            addExperience(p, 10);
			
			console.log(`[EXP DEBUG] ログ送信完了: ${p.name} に 10 EXP`);
            
            // アイテムを地面に落とす
            spawnDropItems(nearest);
            
            nearest.hp = 0;
            nearest.isFading = true; // 徐々に消える演出
            nearest.deathFrame = 0;
            
            // スコアを加算
            p.score = (Number(p.score) || 0) + 100;
            
            console.log(`[DEBUG] 最終確定EXP: ${p.exp}`);
        }
    }
}

/**
 * 3. アイテムを拾ったときの処理
 */
function handlePickup(socket, itemId) {
    const player = players[socket.id];
    if (!player) return;

    // 🌟 1. find ではなく、直接そのアイテムを見つける
    const item = droppedItems.find(it => it.id === itemId);

    // 🌟 2. アイテムが存在しない、または「すでに拾われ中」なら即終了
    if (!item || item.isPickedUp) return;

    const dx = Math.abs(player.x - item.x);
    const dy = Math.abs(player.y - item.y);

    if (dx > SETTINGS.ITEM.PICKUP_RANGE_X || dy > SETTINGS.ITEM.PICKUP_RANGE_Y) {
        return;
    }

    // 🌟 3. 【最重要】ここで即座にロックをかける！
    // splice で消えるのを待たずに、このメモリ上のオブジェクトを「使用済み」にします。
    item.isPickedUp = true;

    // 🌟 4. その後でリストから削除する
    const idx = droppedItems.findIndex(it => it.id === itemId);
    if (idx !== -1) {
        const removedItem = droppedItems.splice(idx, 1)[0];

        if (removedItem) {
            lastPickedItems.push({
                type: removedItem.type,
                x: removedItem.x,
                y: removedItem.y,
                pickerId: socket.id
            });

            // --- 🎁 報酬を与える処理 (server.js) ---
if (!player.inventory) player.inventory = [];

if (removedItem.type === 'shield' || removedItem.type === 'gold') {
    
    // 🌟 1. まず「スタックできるか」だけを徹底的に調べる
    let stacked = false;
    
    if (removedItem.type === 'gold') {
        const goldIndex = player.inventory.findIndex(slot => {
            if (!slot) return false;
            const type = (typeof slot === 'object') ? slot.type : slot;
            return type === 'gold';
        });

        if (goldIndex !== -1) {
            // 見つかった！既存の場所を更新するだけ
            let existing = player.inventory[goldIndex];
            if (typeof existing !== 'object') {
                player.inventory[goldIndex] = { type: 'gold', count: 2 };
            } else {
                player.inventory[goldIndex].count = (player.inventory[goldIndex].count || 1) + 1;
            }
            stacked = true; // スタック完了フラグ
            console.log(`[Stack OK] スロット ${goldIndex} にまとめました`);
        }
    }

    // 🌟 2. 【重要】スタックされなかった場合のみ、かつ、カバンに空きがある時だけ push する
    if (!stacked) {
        if (player.inventory.length < 10) {
            player.inventory.push({ type: removedItem.type, count: 1 });
            console.log(`[New Item] 新しいスロットに格納しました`);
        }
    }

} else {
    // スコアアイテム
    const points = (removedItem.type === 'money3' ? 100 : 10);
    player.score += points;
}
            
            sendState();
        }
    }
}

/**
 * 4. プレイヤーのダメージ同期と復活処理
 */
function handlePlayerDamaged(socket, data) {
    const p = players[socket.id];
    if (!p) return;

    // HPを更新
    p.hp = data.newHp;

    // 🌟 【追加】もしHPが0以下になったら復活させる
    if (p.hp <= 0) {
        console.log(`[RESPAWN] ${p.name} が倒れましたが、復活しました！`);
        p.hp = 100;     // HPを満タンにする
        p.x = 50;       // スタート地点に戻す
        p.y = 500;      // スタート地点に戻す
        
        // 画面に「復活したよ」と通知するために、すぐに最新状態を送る
        sendState();
    }

    // ダメージエフェクトの表示
    io.emit('damage_effect', { 
        x: p.x + 30, 
        y: p.y, 
        val: data.val, 
        isCritical: false, 
        type: 'player_hit' 
    });
}

/**
 * 5. チャット送信
 */
function handleChat(socket, text) {
    const p = players[socket.id];
    io.emit('chat', { 
        id: socket.id, 
        name: p?.name || "Guest", 
        text: text 
    });
}

/**
 * 状態送信用の共通関数（pickup以外でも使えるように）
 */
function sendState() {
    io.emit('state', { 
        players: players, 
        items: droppedItems, 
        enemies: enemies, 
        platforms: MAP_DATA.platforms,
        ladders: MAP_DATA.ladders
    });
}

io.on('connection', socket => {
    // 接続時にIDを通知
    socket.emit('your_id', socket.id);
    console.log(`User connected: ${socket.id}`);

    // 1. 参加
    socket.on('join', n => handleJoin(socket, n));

    // server.js 内の socket.on('move') を修正
socket.on('move', d => { 
    if (players[socket.id]) {
        // 🌟 修正：ブラウザから受け取るのは「位置」と「移動速度」と「向き」だけにする
        // isAttacking はサーバー側で管理するため、ここからは除外します
        const { x, y, dir, vx, vy, isJumping, isClimbing } = d;
        
        Object.assign(players[socket.id], { 
            x, y, dir, vx, vy, isJumping, isClimbing
        });
    }
});
	
    // 3. 攻撃
    socket.on('attack', data => handleAttack(socket, data));

    // 4. アイテム拾得
    socket.on('pickup', itemId => handlePickup(socket, itemId));

    // 5. 被ダメージ
    socket.on('player_damaged', data => handlePlayerDamaged(socket, data));

    // 6. チャット
    socket.on('chat', text => handleChat(socket, text));

    // 7. 切断
    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
        delete players[socket.id];
    });

    // --- 既存のキャラ変更・グループ変更を維持する場合 ---
    socket.on('change_char', data => {
        if (players[socket.id]) {
            players[socket.id].charVar = data.charVar;
            io.emit('update_players', players);
        }
    });
    socket.on('change_group', data => {
        if (players[socket.id]) {
            players[socket.id].group = data.group;
            io.emit('update_players', players);
        }
    });
	socket.on('dropItem', (index) => {
    const player = players[socket.id];
    if (!player || !player.inventory) return;

    if (player.inventory[index]) {
        const itemToDrop = player.inventory[index];

        // 🌟 徹底的に「初期アイテム」のふりをする
        const newItem = {
            // IDを数字だけにしてみる（もし初期アイテムがそうなら）
            id: Math.floor(Math.random() * 1000000), 
            type: itemToDrop.type,
            x: player.x + 60, 
            y: player.y,
            // 初期アイテムが必要としているかもしれない項目を全部入れる
            value: (itemToDrop.type === 'money3' ? 100 : 10),
            isStatic: true // 「動かないアイテム」という設定がある場合
        };

        if (Array.isArray(droppedItems)) {
            droppedItems.push(newItem);
            console.log("地面に追加完了:", newItem);
        }

        player.inventory.splice(index, 1);
        sendState();
    }
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