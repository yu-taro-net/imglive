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

// 🛠️ デバッグ支援：さらに直感的なログに変更
const LOG = {
    SYS:  (txt) => debugChat(txt, 'info'),    // 青色：システム動作
    DB:   (txt) => debugChat(txt, 'db'),      // 紫色：データベース接続
    ERR:  (txt) => debugChat(txt, 'error'),   // 赤色：重大なエラー
    SUCCESS: (txt) => debugChat(txt, 'success'), // 緑色：レベルアップやドロップ
    WARN: (txt) => debugChat(txt, 'warn'),     // 黄色：ちょっとした警告
	ITEM: (txt) => debugChat(txt, 'success') // 🎁 アイテム用（緑色）
};

// ==========================================
// 📢 【最強のデバッグ関数・改】（安全装置つき）
// ==========================================
function debugChat(message, type = 'info') {
    try {
        const time = new Date().toLocaleTimeString();
        
        // 🛡️ 土田さんのための安全装置：もし type に true が来ても 'error' として扱う
        let safeType = type;
        if (typeof type === 'boolean') {
            safeType = type ? 'error' : 'info';
        }
        safeType = safeType || 'info';

        let icon = '🤖';
        let color = '\x1b[36m';

        switch (safeType) {
            case 'error':   icon = '🚨'; color = '\x1b[31m'; break;
            case 'success': icon = '🎊'; color = '\x1b[32m'; break;
            case 'warn':    icon = '⚠️'; color = '\x1b[33m'; break;
            case 'db':      icon = '🗄️'; color = '\x1b[35m'; break;
            default:        icon = 'ℹ️'; color = '\x1b[36m'; safeType = 'info'; break;
        }

        io.emit('chat', {
            id: 'SYSTEM_LOG',
            name: `${icon} ${safeType.toUpperCase()}`,
            text: `[${time}] ${message}`
        });

        console.log(`${color}[${safeType.toUpperCase()}] ${message}\x1b[0m`);
    } catch (e) {
        console.error("🚨 debugChat内部で深刻なエラー:", e);
    }
}

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
      debugChat(`⚠️ DB接続失敗。2秒後に再試行します...`, 'error');
      setTimeout(handleDisconnect, 2000); // 失敗したら2秒後にやり直し
      return;
    }
    LOG.DB('✅ MySQLデータベースに無事つながりました！');
  });

  // 🌟 接続中のエラー（突然の切断など）を監視
  connection.on('error', err => {
    console.error('MySQL実行時エラー:', err);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
      debugChat('📡 DB接続が切れました。再接続中...', 'error');
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

// 🛡️ 盾のレア度確率設定（合計が100以下になるようにします）
const SHIELD_CHANCE = {
    LEGENDARY: 5,  // 💜 最高級が出る確率 (%)
    RARE:      15, // 💛 良品が出る確率 (%)
    // 残りの 80% は通常・壊れかけになります
};

// ==========================================
// 📊 Tier（階級）別・基準ステータス表
// ==========================================
const TIER_STATS = {
    tier1: { hp: 20,    str: 2,   def: 1,   speed: 1.0, exp: 10,   money: 5 },   // 素材3種
    tier2: { hp: 100,   str: 10,  def: 5,   speed: 1.2, exp: 35,   money: 20 },  // 素材4種
    tier3: { hp: 500,   str: 25,  def: 12,  speed: 1.5, exp: 120,  money: 100 }, // 素材3種
    tier4: { hp: 1200,  str: 45,  def: 25,  speed: 1.8, exp: 300,  money: 250 }, // 素材4種
    tier5: { hp: 3000,  str: 80,  def: 40,  speed: 2.0, exp: 850,  money: 600 }, // 素材3種
    tier6: { hp: 7000,  str: 150, def: 80,  speed: 2.5, exp: 2000, money: 1500 },// 素材3種
    tier7: { hp: 20000, str: 400, def: 150, speed: 0.8, exp: 5000, money: 5000 } // 素材1種（魔王はあえて遅く、威圧的に）
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
  29: { type: 'monster29', w: 487,  h: 327,  hp: 200,  speed: 1.5, scale: 1.0, name: 'エネミー25'},
  30: { type: 'tier1_1', w: 438,  h: 214,  hp: 200,  speed: 1.5, scale: 1.0, name: 'Char10', exp: 4, atk: 5,  money: 10 }, 
  31: { type: 'tier1_2', w: 322,  h: 242,  hp: 200,  speed: 1.5, scale: 1.0, name: 'Char13', exp: 5, atk: 8,  money: 25 }, 
  32: { type: 'tier1_3', w: 227,  h: 337,  hp: 200,  speed: 1.5, scale: 1.0, name: 'Char19', exp: 6, atk: 30, money: 100 },
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
    this.alive         = true;   // 生存フラグ
    this.opacity       = 1;      // 不透明度（1 = はっきり見える）
    this.spawnAlpha    = 0;      // 出現時のフェードイン用
    this.isFading      = false;  // 死亡時の消滅アニメ中か
    this.deathFrame    = 0;      // 死亡アニメーションの経過

    // 2. 🌟 動作・タイマーに関する設定
    this.kbV           = 0;      // ノックバック速度
    this.isAttacking   = 0;      // 攻撃アニメーションの残り時間
    this.isEnraged     = false;  // 怒り状態か
    this.respawnTimer = 0;      // 復活までの待ち時間
    this.waitTimer    = 0;      // 移動の合間の待機時間
    this.offset       = 0;      // 足場内での相対位置
    this.dir = Math.random() < 0.5 ? 1 : -1; // 向きをランダムに決定

    // 3. 🌟 モンスター情報の読み込み（カタログから参照）
    // カタログに自分のIDがなければ1番のデータを予備として使う
    const config = ENEMY_CATALOG[this.id] || ENEMY_CATALOG[1];

    // --- ⚔️ Tier（階級）システムとの連携 ---
    const tierName = config.tier || 'tier1';   // カタログに設定がない場合は tier1 を使う
    const stats    = TIER_STATS[tierName];    // 貼り付けた Tier 表から能力値を参照

    this.type  = config.type;                  // 敵の種類（名前）
    this.scale = config.scale || 0.2;          // 表示倍率

    // 🌟 Tier 表に基づいた緻密なステータス設定
    this.maxHp = config.hp    || stats.hp;    // 最大体力（カタログ個別設定を優先、なければ Tier 基準）
    this.hp    = config.hp    || stats.hp;    // 現在の体力
    this.str   = config.str   || stats.str;   // 攻撃力
    this.def   = config.def   || stats.def;   // 防御力
    this.speed = config.speed || stats.speed; // 移動スピード
    this.exp   = config.exp   || stats.exp;   // 獲得経験値
    this.money = config.money || stats.money; // ドロップ金額
    // ------------------------------------
	
	// ⚔️ 【追加】攻撃力をカタログからコピー
	this.atk   = config.atk   || 5;

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
    
    // === 🌟 3. ジャンプの物理計算 (浮遊モンスター ID:30,31,32 は除外) ===
    
    // 地面にいない、または上向きの速度がある場合（ジャンプ中）
    if (this.jumpY < 0 || this.jumpV !== 0) {
      this.jumpV += 0.5; // 重力
      this.jumpY += this.jumpV;
      this.jumpFrame++; 

      if (this.jumpY >= 0) {
        this.jumpY = 0;
        this.jumpV = 0;
        this.jumpFrame = 0; 
      }
    }

    // 🌟 ジャンプの開始判定 (特定のモンスターID 30, 31, 32 を除外)
    if (this.jumpY === 0 && ![30, 31, 32].includes(this.id) && Math.random() < 0.01) { 
      this.jumpV = -7;    
      this.jumpFrame = 0; 
    }

    // === 🐾 🐾 3. 行動ロジック (自動移動・反転・追尾) ===
    if (this.waitTimer > 0) {
      this.waitTimer--;
    } else {
      // --- 🌟 A. 怒り状態（追尾モード） ---
      if (this.isEnraged && Object.keys(players).length > 0) {
        const target = Object.values(players)[0];
        if (target) {
          this.dir = (target.x < this.x) ? -1 : 1;
          const diffX = target.x - this.x;
          const moveStep = this.speed * 1.5 * this.dir;
          
          let nextX = this.x + moveStep;
          if (Math.abs(diffX) < Math.abs(moveStep)) {
            nextX = target.x;
          }

          if (this.platIndex === null) {
            if (nextX > 400 && nextX < 800 - this.w) {
              this.x = nextX;
            }
          } else {
            const p = MAP_DATA.platforms[this.platIndex];
            let nextOffset = this.offset + (nextX - this.x);
            
            if (nextOffset < 0 || nextOffset > p.w - this.w) {
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

      if (!this.isEnraged && Math.random() < 0.01) { 
        this.waitTimer = Math.floor(Math.random() * 200) + 50; 
        this.dir *= (Math.random() > 0.5 ? 1 : -1); 
      }
    }

    // === 🎯 4. 最終座標の確定 (足場データとの同期 + 🌟浮遊処理) ===
    const isFloating = [30, 31, 32].includes(this.id);
    const floatHeight = 12; // どれくらい浮かせるか（ピクセル）

    if (this.platIndex === null) {
      // 地面の高さ固定（浮遊モンスターは floatHeight 分だけ引く）
      this.y = SETTINGS.SYSTEM.GROUND_Y - this.h - (isFloating ? floatHeight : 0);
    } else {
      const p = MAP_DATA.platforms[this.platIndex];
      if (p) {
        if (this.opacity < 1) this.opacity += 0.02;
        this.x = p.x + this.offset;
        // 足場の上でも浮遊モンスターは floatHeight 分だけ引く
        this.y = p.y - this.h - (isFloating ? floatHeight : 0);
      }
    }

    // 🌟 ジャンプ中の高さを足す（浮遊中もジャンプ計算自体は生かしておく場合のため）
    this.y += (this.jumpY || 0);
  }
}

// ==========================================
// 🌐 サーバー全体の管理データ
// ==========================================
let players = {};         // 参加中のプレイヤーたち
let droppedItems = [];    // 画面に落ちているアイテム
let lastPickedItems = []; // 🌟 拾われた情報を一時保存する箱（ここがベスト！）

// モンスター名とIDを紐付ける名簿
/*
const ENEMY_ID = {
  A_DENDEN: 1,
  M_KINOKO: 2,
  GOLEM: 3
};
*/

// --- 👾 モンスターの配置設定 ---
/*
const ENEMY_PLAN = [
  { plat: 0,    id: 5 }, 
  { plat: 1,    id: 6 }, 
  { plat: 1,    id: 6 }, 
  { plat: 2,    id: 7 }, 
  { plat: null, id: 20 }
];
*/

const ENEMY_PLAN = [
  { plat: 0,    id: 30 }, 
  { plat: 1,    id: 31 }, 
  { plat: 1,    id: 31 }, 
  { plat: 2,    id: 32 }, 
  { plat: null, id: 20 }
];

// --- ⚙️ 自動生成システム ---
// ここで Enemy クラスを実体化（インスタンス化）します
let enemies = ENEMY_PLAN.map(p => new Enemy(p.id, p.plat));

// ==========================================
// 🌟 モンスターごとのドロップ設定
// ==========================================
const DROP_DATABASE = {
  "tier1_1":  { table: "big2"},
  "tier1_2":  { table: "tier1"  },
  "tier1_3":  { table: "tier1"  },
  //"monster20": { table: "big2"  },
};

const DROP_CHANCE_TABLES = {
  "big":   { "gold_heart": 40, "money5": 20, "gold_one": 5, "default": 50 }, // 50%でドロップ、そのうち20%で金塊
  "big2":  { "medal1": 80, "shield": 90, "gold": 80, "default": 100 },
  "small": { "gold_heart": 40, "money6": 50,  "default": 50 },
  "tier1": { "medal1": 80, "gold_heart": 40, "shield": 20, "default": 80 },
};

// 🌟 レベルアップに必要な経験値のリスト（テーブル）
// index 0は使わず、index 1 = Lv1→2に必要な経験値 ... と設定します
const LEVEL_TABLE = [0, 12, 20, 35, 60, 100, 150, 210, 280, 360, 450];

// 🌟 経験値を加算してレベルアップをチェックする専用の関数
function addExperience(player, amount, socket) {
    // 🛡️ ガード：プレイヤーがいない、または加算量が数値でない場合は即終了
    if (!player || isNaN(amount)) return;

    try {
        // 数値であることを保証して計算
        player.exp = (Number(player.exp) || 0) + Number(amount);
        // ... (以下のレベルアップ判定ロジック)
    } catch (e) {
        console.error("❌ 経験値計算中にエラー:", e);
    }

    // 2. 現在のレベルに応じた必要経験値をテーブルから取得
    // 万が一レベルがテーブルの範囲を超えた場合は、最後の値を参照するか大きな数にします
    let requiredExp = LEVEL_TABLE[player.level] || (player.level * 100);
    player.maxExp = requiredExp;

    debugChat(`[EXP] ${player.name}: +${amount} (Total: ${player.exp} / Next: ${requiredExp})`);

    // 3. レベルアップ判定（whileを使うと、一気に2レベル上がる場合にも対応できます）
    while (player.exp >= requiredExp) {
        player.exp -= requiredExp; // 経験値を引いて余りを繰り越す
        player.level = (Number(player.level) || 1) + 1;
        
		player.ap = (Number(player.ap) || 0) + 5; // 安全のために数値変換を入れるとより良いです
		
		// 🌟 ここが重要！ サーバーから「レベルアップしたよ！」と全員に合図を送る
        io.emit('level_up_effect', { 
            playerId: player.id 
        });
		
        // 次のレベルの必要量を再取得
        requiredExp = LEVEL_TABLE[player.level] || (player.level * 100);
        player.maxExp = requiredExp;

        console.log(`[LEVEL UP] ${player.name} が Lv.${player.level} になりました！`);
		debugChat(`🎊${player.name}がレベル${player.level}に上がりました！`);
    }

    // 本来ならここでDB保存関数を呼ぶとさらにスッキリします
}

function spawnDropItems(enemy) {
    try {
        if (!enemy || !droppedItems) return;

        const setting = DROP_DATABASE[enemy.type] || { table: "small" };
        const chances = DROP_CHANCE_TABLES[setting.table];
        if (!chances) return;

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

        if (itemsToDrop.length === 0) return;

        const fixedSpawnY = enemy.y + (enemy.h || 32) - 50;
        
        itemsToDrop.forEach((type, i) => {
            const spread = 15;
            const offsetX = (i - (itemsToDrop.length - 1) / 2) * spread;

            // --- 1. まず先に、鑑定用のデータ（色や品質）を計算する ---
            let itemColor = "#ffffff"; 
            let qualityLabel = "";
            let defenseValue = 0;

            if (type === 'shield') {
                // ==========================================
                // 📊 確率調整用パラメータ（合計が100%を超えないように設定）
                // ==========================================
                const CHANCE_LEGENDARY = 5;  // 💜 最高級が出る確率 (5%)
                const CHANCE_RARE      = 15; // 💛 良品が出る確率 (15%)
                const CHANCE_BROKEN    = 20; // 🩶 壊れかけが出る確率 (20%)
                // 残りの 60% は通常品になります
                // ==========================================

                const roll = Math.random() * 100;

                if (roll < CHANCE_LEGENDARY) {
                    // --- 💜 最高級 (防御力: 14 ～ 15) ---
                    itemColor = "#ff00ff";
                    qualityLabel = "(最高級)";
                    defenseValue = Math.floor(Math.random() * 2) + 14; 
                } 
                else if (roll < (CHANCE_LEGENDARY + CHANCE_RARE)) {
                    // --- 💛 良品 (防御力: 11 ～ 13) ---
                    itemColor = "#ffcc00";
                    qualityLabel = "(良品)";
                    defenseValue = Math.floor(Math.random() * 3) + 11;
                } 
                else if (roll < (CHANCE_LEGENDARY + CHANCE_RARE + CHANCE_BROKEN)) {
                    // --- 🩶 壊れかけ (防御力: 1 ～ 7) ---
                    itemColor = "#888888";
                    qualityLabel = "(壊れかけ)";
                    defenseValue = Math.floor(Math.random() * 7) + 1;
                } 
                else {
                    // --- ⚪ 通常品 (防御力: 8 ～ 10) ---
                    itemColor = "#ffffff";
                    qualityLabel = "";
                    defenseValue = Math.floor(Math.random() * 3) + 8;
                }

                // ここで計算が終わったので、ログを出してもOK
                LOG.ITEM(`🎁 [鑑定完了] 盾${qualityLabel} 防御:${defenseValue}`);
            }

            // --- 2. 計算したデータを使って、newItem を作成する（ここが正しい順番です） ---
            const newItem = {
                id: Date.now() + Math.random() + i,
                x: enemy.x + (enemy.w || 32) / 2 + offsetX, 
                y: fixedSpawnY,
                vx: 0,                                     
                vy: -4 - Math.random() * 2,
                type: type,
                // 上で計算した qualityLabel や itemColor をここで流し込む
                name: (type === 'shield' ? "盾" : type) + qualityLabel, 
                color: itemColor, 
                defense: defenseValue, 
                phase: Math.random() * Math.PI * 2,
                landed: false
            };

            if (type === 'medal1') {
                newItem.goldValue = enemy.money || 10; 
                LOG.ITEM(`[DROP] ${enemy.name || 'Enemy'}からメダルドロップ: ${newItem.goldValue}G`);
            }

            droppedItems.push(newItem);
        });

    } catch (error) {
        // エラー内容を詳しく出す
        console.error("❌ spawnDropItemsエラー:", error);
    }
}

// ==========================================
// 📞 イベントハンドラ（各アクションの具体的な中身）
// ==========================================

// 1. プレイヤーが参加したときの処理
function handleJoin(socket, name) {
    try {
        if (connection && connection.state !== 'disconnected') {
            const sql = 'INSERT INTO players2 (name) VALUES (?)';
            connection.query(sql, [name], (err, result) => {
                if (err) console.error('DB保存失敗:', err);
                else console.log(`✅ DB記録成功: ${name}`);
            });
        }
    } catch (e) {
        console.error("❌ handleJoin内での予期せぬエラー:", e);
    }

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

    // --- ⚔️ 今日決めた緻密なステータスを追加 ⚔️ ---
    str: 50,      // 初期攻撃力
    dex: 4,      // 初期命中率
    luk: 4,
    ap: 0,       // 振り分け可能な能力ポイント
    // ------------------------------------------

    w: SETTINGS.PLAYER.DEFAULT_W * (SETTINGS.PLAYER.SCALE || 1.0),
    h: SETTINGS.PLAYER.DEFAULT_H * (SETTINGS.PLAYER.SCALE || 1.0),
    scale: SETTINGS.PLAYER.SCALE || 1.0,
    hp: SETTINGS.PLAYER.MAX_HP,
    maxHp: SETTINGS.PLAYER.MAX_HP,
    lastPickupTime: 0,
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

        // 🌟 【ここを修正】p.str を一番左に持ってくることで、サーバーの数値を最優先にします。
        // これにより data.power (クライアントの20など) が送られてきても無視されます。
        const damage = p.str || data.power || 4; 
        
        nearest.hp -= damage; // 敵のHPを減らす
        
        console.log(`[2.命中確認] ${nearest.type}に${damage}ダメージ(攻撃力:${p.str})。残りHP: ${nearest.hp}`);

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
            isCritical: damage >= (p.str * 1.5), // 攻撃力の1.5倍以上ならクリティカル扱い
            type: 'enemy_hit'
        });

        // --- 💀 死亡判定と報酬処理 ---
        if (nearest.hp <= 0 && nearest.alive) {
            nearest.alive = false; // 死亡フラグ

            // 🌟 固定の 10 ではなく、モンスターが持っている exp を使うように変更
            const rewardExp = nearest.exp || 10; 

            socket.emit('exp_log', { amount: rewardExp }); 

            // 🌟 経験値をモンスターに応じた量だけ追加
            addExperience(p, rewardExp, socket);
            
            console.log(`[EXP DEBUG] ログ送信完了: ${p.name} に ${rewardExp} EXP`);
            
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
 * 3. アイテムを拾ったときの処理（安全装置付き）
 * --------------------------------------------------
 * 役割：地面のアイテムを拾い、カバンや財布へ振り分けます。
 * エラーが起きてもサーバーを落とさないよう、がっちり保護しています。
 */
function handlePickup(socket, itemId) {
    // 🛡️ 安全装置：関数全体を大きな try-catch で囲みます
    try {
        const player = players[socket.id];
        
        // 🛡️ ガード：プレイヤーが存在しない、またはitemIdが空の場合は何もしない
        if (!player || !itemId) return;

        // クールタイムのチェック
        const now = Date.now();
        if (player.lastPickupTime && (now - player.lastPickupTime < 200)) {
            return; 
        }

        // 🛡️ ガード：アイテムリスト自体が存在するか確認
        if (!droppedItems) return;

        const item = droppedItems.find(it => it.id === itemId);
        
        // 🛡️ ガード：アイテムが見つからない、または既に拾われている場合は終了
        if (!item || item.isPickedUp) return;

        // 距離判定（ここまでの計算は維持）
        const dx = Math.abs(player.x - item.x);
        const dy = Math.abs(player.y - item.y);

        if (dx > SETTINGS.ITEM.PICKUP_RANGE_X || dy > SETTINGS.ITEM.PICKUP_RANGE_Y) {
            return;
        }

        // 拾う権利を確定
        item.isPickedUp = true;
        player.lastPickupTime = now;

        const idx = droppedItems.findIndex(it => it.id === itemId);
        if (idx !== -1) {
            const removedItem = droppedItems.splice(idx, 1)[0];

            // 🛡️ ガード：取り出した瞬間にデータが壊れていた場合の対策
            if (!removedItem) return;

            // 🌟 金額・メダルの処理
            if (removedItem.type === 'medal1' || removedItem.goldValue) {
                const baseAmount = removedItem.goldValue || 10; 
                const fluctuation = 0.8 + (Math.random() * 0.4);
                const amount = Math.floor(baseAmount * fluctuation);

                player.gold = (player.gold || 0) + amount;
                
                debugChat(`[MONEY] ${player.name || 'Player'} が ${amount}G 獲得！ (合計:${player.gold}G)`);
                
                socket.emit('gold_log', { amount: amount });
                io.emit('player_update', player);
            }

            // エフェクト同期用のリストへ追加
            if (typeof lastPickedItems !== 'undefined') {
                lastPickedItems.push({
                    type: removedItem.type,
                    x: (removedItem.x && removedItem.x !== 0) ? removedItem.x : player.x,
                    y: (removedItem.y && removedItem.y !== 0) ? removedItem.y : player.y,
                    pickerId: socket.id
                });
            }

            // カバンの初期化（なければ10枠確保）
            if (!player.inventory) player.inventory = Array(10).fill(null); 

            // 装備品やスタックアイテムの処理
            if (removedItem.type === 'shield' || removedItem.type === 'gold') {
                let stacked = false;
                const actualCount = removedItem.count || removedItem.amount || 1;

                // --- 重ね合わせ(Stack)の処理 ---
                if (removedItem.type === 'gold') {
                    const goldIndex = player.inventory.findIndex(slot => {
                        return slot && slot.type === 'gold';
                    });

                    if (goldIndex !== -1) {
                        player.inventory[goldIndex].count = (player.inventory[goldIndex].count || 0) + actualCount;
                        stacked = true;
                        console.log(`[Stack OK] ゴールドをスロット ${goldIndex} にまとめました`);
                    }
                }

                // --- 新規格納の処理 ---
                if (!stacked) {
                    let emptySlotIndex = -1;
                    for (let i = 0; i < 10; i++) {
                        if (player.inventory[i] === null || player.inventory[i] === undefined) {
                            emptySlotIndex = i;
                            break;
                        }
                    }

                    if (emptySlotIndex !== -1) {
                        player.inventory[emptySlotIndex] = { 
                            type: removedItem.type, 
                            count: actualCount, 
                            defense: removedItem.defense || 0
                        };
                        console.log(`[PICKUP OK] スロット ${emptySlotIndex} に格納しました`);
                    } else {
                        console.log("カバンがいっぱいです！");
                        // 必要であればここでアイテムを地面に戻す処理を追加
                    }
                }

            } else {
                // その他のアイテム（スコア加算）
                const points = (removedItem.type === 'money3' ? 100 : 10);
                player.score = (player.score || 0) + points;
            }

            // クライアント側（本人）へ最新のカバン情報を送信
            socket.emit('inventory_update', player.inventory);
            
            // 全員へ状態を同期
            if (typeof sendState === 'function') {
                sendState(); 
            }
        }
    } catch (error) {
        // 🚨 安全装置が発動：エラー内容だけを表示し、サーバーを落としません
        console.error("❌ [CRITICAL] handlePickup内でエラーが発生しました:", error);
    }
}

/**
 * 4. プレイヤーのダメージ同期と復活処理（安全装置付き）
 * --------------------------------------------------
 * 役割：モンスターからのダメージを計算し、HPが0になったら初期位置にリスポーンさせます。
 * データの欠損や計算ミスがあっても、サーバーが止まらないよう保護しています。
 */
function handlePlayerDamaged(socket, data) {
    // 🛡️ 安全装置：関数全体をtry-catchで保護
    try {
        const p = players[socket.id];
        if (!p) return;

        // 🌟 修正：monsterId が送られてこない場合でも、一番近い敵の攻撃力を参照する
        let attacker = enemies.find(en => en.id === data.monsterId);
        
        // もし ID で見つからなければ、近くにいる「生きている敵」を一人探す
        if (!attacker) {
            attacker = enemies.find(en => en.alive && Math.abs(en.x - p.x) < 100);
        }
        
        // カタログの atk (50など) を優先し、なければ 10 にする
        const damageValue = attacker ? (attacker.atk || 5) : 10;
        
        debugChat(`[ダメージ判定] 攻撃者: ${attacker ? attacker.type : '不明'}, ダメージ: ${damageValue}`, 'error');

        // 🛡️ 数値のガード：HPが万が一 NaN(非数) にならないよう Number() で保証し、
        // 計算結果がマイナスになっても Math.max(0, ...) で「0」で止まるようにします。
        const currentHp = Number(p.hp) || 100;
        p.hp = Math.max(0, currentHp - damageValue);

        // 復活処理 (既存のコードを維持)
        if (p.hp <= 0) {
            console.log(`[RESPAWN] ${p.name} が倒れましたが、復活しました！`);

            // 🌟 追記：死亡した瞬間にクライアントへ通知を送り、playDieSound() を発動させる
            socket.emit('player_die_sound');

            // 最大HPの設定があればそれを使い、なければ100にします
            p.hp = p.maxHp || 100;
            p.x = 50;
            p.y = 500;
            
            // 🛡️ 復活時は即座に状態を送信して位置を同期
            sendState();
        }

        // エフェクト表示
        io.emit('damage_effect', { 
            x: (Number(p.x) || 0) + 30, 
            y: (Number(p.y) || 0), 
            val: damageValue, 
            isCritical: false, 
            type: 'player_hit' 
        });

    } catch (e) {
        // 🚨 致命的なエラーが起きてもサーバーを落とさず、ログだけ残します
        console.error("❌ [CRITICAL] handlePlayerDamaged内でエラー:", e);
    }
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
 * 📡 状態送信用の共通関数（全プレイヤーに現在の世界状況を伝える）
 * --------------------------------------------------
 * 役割：プレイヤー、アイテム、敵の最新データを一つのパケットにまとめて
 * 全員に一斉送信します。エラーが起きてもサーバーを落とさない安全装置付き。
 */
function sendState() {
    // 🛡️ 安全装置（try-catch）：万が一この中でエラーが起きてもサーバーを停止させません
    try {
        // 1. データの存在確認（playersなどが空っぽでエラーになるのを防ぐ）
        if (!players) return;

        // 2. 📡 全プレイヤーへ送信（io.emit）
        io.emit('state', {
            // 👥 【プレイヤー】全員の座標、名前、所持金、HPなど
            players: players,

            // 💰 【アイテム】地面に落ちているすべてのアイテム（金貨や装備）
            items: droppedItems,

            // 👾 【モンスター】ジャンプ判定を「送信する瞬間に」追加して送信
            enemies: enemies.map(en => ({
                ...en,                          // id, x, y, hp などの基本情報をコピー
                jumpY: en.jumpY || 0,           // 現在のジャンプの高さ
                isJumping: (en.jumpY || 0) !== 0 // 0でなければ「ジャンプ中」として判定
            })),

            // 🗺️ 【マップ構造】足場（platforms）とハシゴ（ladders）の配置情報
            platforms: MAP_DATA.platforms,
            ladders: MAP_DATA.ladders,

            // 🎁 【アイテム取得ログ】誰が何を拾ったかの最新エフェクト情報
            lastPickedItems: lastPickedItems
        });

        // 📝 デバッグログ：アイテムが拾われた時だけ、コンソールにこっそり表示
        if (lastPickedItems.length > 0) {
            console.log(`[DEBUG] アイテム取得データを送信しました: ${lastPickedItems.length}件`);
        }

        // 🌟 【リセット】送信が完了したので、アイテム取得確定情報を空にします
        // これを忘れると、同じアイテムを何度も拾った演出が出てしまいます
        lastPickedItems = [];

    } catch (error) {
        // 🚨 安全装置の発動：エラーが起きた場合はここに飛んできます
        // サーバーは止めずに、エラーの内容だけを記録します
        console.error("❌ [CRITICAL] sendState関数内でエラーが発生しました:", error);
    }
}

// ==========================================
// 📞 ソケット通信の入り口（debugChat 搭載版）
// ==========================================
io.on('connection', socket => {
    // 🛡️ 通信の根本を try-catch で保護
    try {
	    // 新しいプレイヤーが接続したことを、接続した本人「以外」の全員に通知
        socket.broadcast.emit('player_joined_sound');
	
        // 接続時にIDを通知
        socket.emit('your_id', socket.id);
        debugChat(`🔌 新しい接続: ${socket.id}`);

        // 1. 参加
        socket.on('join', n => {
            try { 
                handleJoin(socket, n); 
                debugChat(`👋 ${n} さんが参加しました`);

                // 🌟 ここを追加！参加した直後のプレイヤーデータをのぞき見する
                const p = players[socket.id];
                if (p) {
                    LOG.SYS(`[入室データ確認] ${JSON.stringify(p)}`);
                }
            } 
            catch (e) { 
                debugChat(`❌ joinエラー: ${e.message}`, 'error'); 
            }
        });

        // 2. 移動
        socket.on('move', d => {
            try {
                if (players[socket.id]) {
                    // 🌟 修正：ブラウザから受け取るのは「位置」と「移動速度」と「向き」だけにする
                    const { x, y, dir, vx, vy, isJumping, isClimbing } = d;
                    Object.assign(players[socket.id], {
                        x, y, dir, vx, vy, isJumping, isClimbing
                    });
                }
            } catch (e) { 
                // 移動は頻度が高いため、エラー時のみチャットに通知（isError: true）
                debugChat(`❌ moveエラー: ${e.message}`, 'error'); 
            }
        });

        // 3. 攻撃
        socket.on('attack', data => {
            try {
                handleAttack(socket, data);
            } catch (e) {
                debugChat(`❌ 攻撃処理エラー: ${e.message}`, 'error');
            }
        });

        // 4. アイテム拾得
        socket.on('pickup', itemId => {
            try { handlePickup(socket, itemId); } 
            catch (e) { debugChat(`❌ pickupエラー: ${e.message}`, 'error'); }
        });

        // 5. 被ダメージ
        socket.on('player_damaged', data => {
            try { handlePlayerDamaged(socket, data); } 
            catch (e) { debugChat(`❌ damagedエラー: ${e.message}`, 'error'); }
        });

        // 6. チャット（デバッグ機能・超強化版）
        socket.on('chat', text => {
            try {
                const p = players[socket.id];
                if (!p) return;

                // 🔍 【コマンド1】ステータス詳細
                if (text === '/check') {
                    LOG.SYS(`--- 🔍 ${p.name}の状態 ---`);
                    LOG.SYS(`HP: ${p.hp}/${p.maxHp} | Lv: ${p.level} | Gold: ${p.gold}`);
                    LOG.SYS(`位置: (${Math.round(p.x)}, ${Math.round(p.y)})`);
					LOG.SYS(`現在のモンスター数: ${enemies.length}体`);
                    return;
                }

                // 💖 【コマンド2】全回復
                if (text === '/heal') {
                    p.hp = p.maxHp || 100;
                    LOG.SUCCESS(`💖 ${p.name} を全回復しました！`);
                    sendState();
                    return;
                }

                // 🆙 【コマンド3】レベルアップテスト
                if (text === '/level') {
                    p.level += 1;
                    p.maxHp += 20;
                    p.hp = p.maxHp;
                    LOG.SUCCESS(`🆙 テスト：Lv.${p.level} にアップ！(HP+20)`);
                    sendState();
                    return;
                }

                // 💰 【コマンド4】金策テスト
                if (text === '/money') {
                    p.gold = (p.gold || 0) + 1000;
                    LOG.SUCCESS(`💰 テスト：1000G 付与（現在: ${p.gold}G）`);
                    sendState();
                    return;
                }

                // 👹 【コマンド5】モンスター召喚（自分の目の前に出す）
                if (text === '/spawn') {
                    const newEnemy = {
                        id: Date.now(),      // ユニークなID
                        x: p.x + 100,        // 自分の少し右に出す（重ならないように）
                        y: p.y - 50,         // 少し上から降ってくるように
                        hp: 50,
                        maxHp: 50,
                        name: "テスト用スライム",
                        type: "slime",
                        alive: true,
                        state: 'idle',       // 状態を追加
                        vx: 0,
                        vy: 0
                    };

                    // 1. サーバーのモンスター配列に追加
                    enemies.push(newEnemy);

                    // 2. ログで成功を知らせる
                    LOG.SUCCESS(`👹 ${newEnemy.name} を召喚しました！`);

                    // 3. 🌟 【重要】ブラウザ側に「新しい敵が増えたよ！」と即座に通知する
                    // sendState() だけでも良いですが、io.emit で「敵リスト」を直接送ると確実です
                    io.emit('enemies_update', enemies); 
                    sendState(); 
                    
                    return;
                }
				
				// 🎁 【新コマンド】テスト用アイテムを目の前に出す
                if (text === '/item') {
                    const newItem = {
                        id: Date.now(),
                        x: p.x,
                        y: p.y - 50,
                        type: 'gold',
                        amount: 100,
                        vx: (Math.random() - 0.5) * 10,
                        vy: -10,
                        landed: false
                    };
                    
                    // 🌟 ここを 'items' から 'droppedItems' に修正
                    if (typeof droppedItems !== 'undefined') {
                        droppedItems.push(newItem);
                    } else {
                        // もし droppedItems でもなければ、今使っている変数名に合わせます
                        LOG.ERR("アイテム管理用の変数が見つかりません");
                        return;
                    }

                    LOG.SUCCESS(`🎁 テスト用アイテム(100G)をドロップしました`);
                    sendState();
                    return;
                }

                // 普通のチャット処理
                handleChat(socket, text);
                
            } catch (e) { 
                debugChat(`❌ chatエラー: ${e.message}`, 'error'); 
            }
        });

        // 7. 切断
        socket.on('disconnect', () => {
            try {
                const name = players[socket.id] ? players[socket.id].name : socket.id;
                debugChat(`📴 切断されました: ${name}`);
                delete players[socket.id];
            } catch (e) { debugChat(`❌ disconnectエラー: ${e.message}`, 'error'); }
        });

        // 8. キャラ変更
        socket.on('change_char', data => {
            try {
                if (players[socket.id]) {
                    players[socket.id].charVar = data.charVar;
                    io.emit('update_players', players);
                    debugChat(`🎭 キャラ変更: ${players[socket.id].name}`);
                }
            } catch (e) { debugChat(`❌ change_charエラー: ${e.message}`, 'error'); }
        });

        // 9. グループ変更
        socket.on('change_group', data => {
            try {
                if (players[socket.id]) {
                    players[socket.id].group = data.group;
                    io.emit('update_players', players);
                    debugChat(`👥 グループ変更: ${players[socket.id].name} -> ${data.group}`);
                }
            } catch (e) { debugChat(`❌ change_groupエラー: ${e.message}`, 'error'); }
        });

        // 📥 10. アイテムを捨てた時 (dropItem)
        socket.on('dropItem', (index) => {
            try {
                const player = players[socket.id];
                // 🛡️ ガード：プレイヤーが存在しない、またはカバンが空なら何もしません
                if (!player || !player.inventory) return;

                // ✅ 指定された番号のアイテムが、カバンの中に本当にあるか確認
                if (player.inventory[index]) {
                    const itemToDrop = player.inventory[index];

                    // 🌟 地面に置くための新しいアイテムデータを作成
                    const newItem = {
                        id: Math.floor(Math.random() * 1000000),
                        type: itemToDrop.type,
                        x: player.x,
                        y: player.y + 12,
                        vx: 0,
                        vy: -12, // 真上に打ち出す力
                        landed: false,
                        defense: itemToDrop.defense,
                        count: itemToDrop.count || 1,
                        value: (itemToDrop.type === 'money3' ? 100 : 10),
                        isStatic: true,
                        angle: 0,
                        rotateSpeed: 0.15
                    };

                    // 🗺️ 世界のアイテムリストに追加
                    if (Array.isArray(droppedItems)) {
                        droppedItems.push(newItem);
                        debugChat(`🗑️ [DROP] ${newItem.type} を捨てました`);
                    }

                    // ✂️ カバンから削除
                    player.inventory[index] = null;
                    socket.emit('inventory_update', player.inventory);
                    sendState();
                }
            } catch (e) {
                debugChat(`❌ dropItemエラー: ${e.message}`, 'error');
            }
        });

        // 🔄 11. アイテム入れ替え (swapItems)
        socket.on('swapItems', (data) => {
            try {
                const player = players[socket.id];
                if (!player || !player.inventory) return;

                const from = data.from;
                const to = data.to;

                // 範囲チェック（緻密なロジックを維持）
                if (from >= 0 && from < 10 && to >= 0 && to < 10) {
                    const temp = player.inventory[from];
                    player.inventory[from] = player.inventory[to];
                    player.inventory[to] = temp;

                    socket.emit('inventory_update', player.inventory);
                    sendState();
                    debugChat(`🔄 [SWAP] ${from}番と${to}番を入れ替え`);
                }
            } catch (e) {
                debugChat(`❌ swapItemsエラー: ${e.message}`, 'error');
            }
        });
		
		// 🌟 ステータス強化のリクエストを受け取る
socket.on('upgrade_stat', (data) => {
    const player = players[socket.id];
    if (!player || player.ap <= 0) return; // APがなければ何もしない

    if (data.type === 'str') {
        player.ap -= 1;
        player.str += 1;
        console.log(`[成長] ${player.name}: STR -> ${player.str}`);
    } 
    // 🌟 ここから追加
    else if (data.type === 'dex') {
        player.ap -= 1;
        player.dex = (player.dex || 0) + 1; // 万が一未定義でも大丈夫なように
        console.log(`[成長] ${player.name}: DEX -> ${player.dex}`);
    } 
    else if (data.type === 'luk') {
        player.ap -= 1;
        player.luk = (player.luk || 0) + 1;
        console.log(`[成長] ${player.name}: LUK -> ${player.luk}`);
    }
});

    } catch (globalError) {
        // 🚨 接続時の根本的なエラーをキャッチ
        debugChat(`🚨 Socket接続処理で重大な不具合: ${globalError.message}`, 'error');
    }
});

// ==========================================
// 🔄 メイン更新ループ（時間経過による変化を全プレイヤーに同期）
// ==========================================
setInterval(() => {

    // --- 👾 1. 敵(Enemies)の状態更新（安全装置付き） ---
    enemies.forEach((e, index) => {
        // 🛡️ 安全装置：1体の敵のエラーが全体に響かないようにします
        try {
            // 🛡️ ガード：そもそも敵のデータが壊れていないかチェック
            if (!e || typeof e.update !== 'function') return;

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

        } catch (err) {
            // 🚨 特定の敵でエラーが出ても、ログを残して次の敵の処理へ進みます
            // これにより、ゲーム全体が止まる（クラッシュする）のを防ぎます
            console.error(`[ENEMY ERROR] 敵(index:${index}, ID:${e.id})の更新に失敗しました:`, err);
        }
    });

    // --- 👤 2. プレイヤー(Players)のタイマー管理 ---
    for (let id in players) {
        // 攻撃後の硬直時間（余韻）を1ずつ減らす
        if (players[id].isAttacking > 0) {
            players[id].isAttacking--;
        }
    }

    // --- 💎 3. 落ちているアイテム(Items)の物理計算（安全装置付き） ---
    droppedItems.forEach((it, index) => {
        // 🛡️ 安全装置：アイテム1つの計算ミスでサーバーを止めない
        try {
            // 🛡️ ガード：アイテムデータが壊れていないか、座標が正常かチェック
            if (!it || isNaN(it.x) || isNaN(it.y)) {
                console.warn(`[ITEM WARN] 不正な座標のアイテムをスキップしました (index: ${index})`);
                return;
            }

            if (!it.landed) {
                // 空中にある場合は移動と重力を計算
                it.x += (it.vx || 0);
                it.y += (it.vy || 0);
                it.vy += SETTINGS.SYSTEM.GRAVITY;   // 重力で下に加速
                it.vx *= SETTINGS.SYSTEM.FRICTION;  // 空気抵抗で横移動を減速

                // 【判定 A】足場(Platforms)との着地
                if (MAP_DATA && MAP_DATA.platforms) {
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

                            // 🔊 全員に通知
                            io.emit('item_landed_sound');
                            
                            // 📝 デバッグ用：足場に着地したことを記録
                            // console.log(`[DEBUG] アイテムが足場に着地: y=${Math.round(it.y)}`);
                        }
                    });
                }

                // 【判定 B】一番下の地面(Ground)との着地
                if (!it.landed && it.y + SETTINGS.ITEM.SIZE >= SETTINGS.SYSTEM.GROUND_Y) {
                    it.y = SETTINGS.SYSTEM.GROUND_Y - SETTINGS.ITEM.SIZE + SETTINGS.ITEM.SINK_Y;
                    it.landed = true;
                    it.vy = 0;
                    it.vx = 0;

                    // 🔊 全員に通知
                    io.emit('item_landed_sound');

                    // 📝 デバッグ用：地面に着地したことを記録
                    // console.log(`[DEBUG] アイテムが地面に着地: y=${Math.round(it.y)}`);
                }
            }
        } catch (err) {
            // 🚨 エラーが起きてもログを出して続行
            debugChat(`⚠️ アイテムの動きの計算でエラーが発生しました: ${err.message}`, 'error');
        }
    });

    sendState()

}, SETTINGS.SYSTEM.TICK_RATE); // 設定された間隔（例: 40ms）ごとに実行

// server.js の一番下（書き換え）
setInterval(() => {
    // どの名前でアイテムが管理されていても捕まえられるようにします
    let count = 0;
    if (typeof items !== 'undefined') {
        count = Object.keys(items).length;
    } else if (typeof allItems !== 'undefined') {
        count = Object.keys(allItems).length;
    } else if (typeof droppedItems !== 'undefined') {
        count = Object.keys(droppedItems).length;
    }

    if (typeof players !== 'undefined') {
        io.emit('tsuchida_debug', { 
            players: players,
            itemCount: count // 捕まえたアイテム数を送る
        });
    }
}, 100);

http.listen(PORT, () => console.log('Server is running...'));