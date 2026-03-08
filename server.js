// ==========================================
// 📦 1. 必要な道具（モジュール）を揃える
// ==========================================

// Webサーバーを作るための定番フレームワーク
const express = require('express');

// MySQLデータベースとやり取りするためのライブラリ
const mysql = require('mysql2');

// expressのメイン機能を「app」として使えるようにする
const app = express();

// HTTPサーバーを立てる（Socket.ioを動かすために必要）
const http = require('http').createServer(app);

// 【重要】リアルタイム通信（Socket.io）の設定
const io = require('socket.io')(http, {
  cors: {
    // セキュリティ設定：許可されたサイト（URL）からのみ接続を受け付ける
    // ※ ロリポップ環境と自分のPC（localhost）の両方を許可しています
    origin: [
        "https://imglive.net", 
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ],
    // データのやり取り方法（GETとPOST）を許可
    methods: ["GET", "POST"],
    // クッキーなどの認証情報を送受信できるようにする
    credentials: true
  }
});

// ファイルの保存場所やパスを正しく扱うための便利な道具
const path = require('path');

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
/**
 * サーバーの状況を、コンソールとチャット画面の両方に通知する関数
 * @param {string} message - 表示したいメッセージ
 * @param {string|boolean} type - ログの種類（info, error, success, db など）
 */
function debugChat(message, type = 'info') {
    try {
        // 現在の時刻を取得（例: 14:30:05）
        const time = new Date().toLocaleTimeString();
        
        // 🛡️ 【安全装置】もし type に true/false が入ってきても壊れないようにする
        let safeType = type;
        if (typeof type === 'boolean') {
            // trueなら'error'、falseなら'info'として扱う
            safeType = type ? 'error' : 'info';
        }
        // もし中身が空っぽ（nullなど）なら 'info' にしておく
        safeType = safeType || 'info';

        // 📝 見た目（アイコンと色）の初期設定
        let icon = '🤖'; // デフォルトアイコン
        let color = '\x1b[36m'; // デフォルトの色（水色）

        // 🚦 種類（Type）に合わせてアイコンと色を切り替える
        switch (safeType) {
            case 'error':   icon = '🚨'; color = '\x1b[31m'; break; // 赤
            case 'success': icon = '🎊'; color = '\x1b[32m'; break; // 緑
            case 'warn':    icon = '⚠️'; color = '\x1b[33m'; break; // 黄
            case 'db':      icon = '🗄️'; color = '\x1b[35m'; break; // 紫（DB操作用）
            default:        icon = 'ℹ️'; color = '\x1b[36m'; safeType = 'info'; break;
        }

        // 📡 ブラウザ側のチャット画面に「システムログ」として送信
        io.emit('chat', {
            id: 'SYSTEM_LOG',
            name: `${icon} ${safeType.toUpperCase()}`, // 例: 🚨 ERROR
            text: `[${time}] ${message}`               // 例: [14:30:05] 接続失敗
        });

        // 💻 サーバー側の黒い画面（コンソール）にも色付きで表示
        console.log(`${color}[${safeType.toUpperCase()}] ${message}\x1b[0m`);

    } catch (e) {
        // 万が一、この関数自体でエラーが起きても止まらないように保護
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
    ATTACK_FRAME: 100,      // 攻撃の持続時間
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

// 1. アイテムの分類ルールを決める
const itemCategories = {
    "gold": "ETC",
    "treasure": "ETC",
    "sweets": "USE", // 消耗品
    "sword": "EQUIP",      // 装備
    "shield": "EQUIP"      // 装備
};

const ITEM_CATALOG = {
    101: {
        name: "sword",
		category: "weapon", // 装備部位
        lv: 5,              // 必要レベル
		
        str: 5,             // 力
        dex: 2,             // 素早さ
        int: 0,             // 知力
        luk: 0,             // 幸運
        maxHp: 0,           // 最大HP
        maxMp: 0,           // 最大MP
		
        atk: 10,            // 攻撃力
		matk: 0,            // 魔力
        def: 0,             // 防御力
		
        moveSpeed: 0,       // 移動速度
        jumpPower: 0,       // ジャンプ力
        atkSpeed: 1,        // 攻撃速度（段階）
		
        star: 0,            // スターフォース
        maxStar: 0,         // スターフォース
        dropRate: 0,        // アイテムドロップ率
        totalUpgrade: 7,    // 全体のスロット
        successCount: 0,    // 成功した数（アイテム表記は +3）
        failCount: 0,       // 失敗した数
		
		isTradeable: true,   // 交換可能かどうか
		
		totalFirstStats: 0,
		totalALLStats: 0
    },
	102: {
        name: "shield",
		category: "shield", // 装備部位
        lv: 5,              // 必要レベル
		
        str: 1,             // 力
        dex: 1,             // 素早さ
        int: 1,             // 知力
        luk: 1,             // 幸運
        maxHp: 10,           // 最大HP
        maxMp: 10,           // 最大MP
		
        atk: 0,            // 攻撃力
		matk: 0,            // 魔力
        def: 10,             // 防御力
		
        moveSpeed: 0,       // 移動速度
        jumpPower: 0,       // ジャンプ力
        atkSpeed: 1,        // 攻撃速度（段階）
		
        star: 0,            // スターフォース
        maxStar: 0,         // スターフォース
        dropRate: 0,        // アイテムドロップ率
        totalUpgrade: 7,    // 全体のスロット
        successCount: 0,    // 成功した数（アイテム表記は +3）
        failCount: 0,       // 失敗した数
		
		isTradeable: true,   // 交換可能かどうか
		
		totalFirstStats: 0,
		totalALLStats: 0
    },
    // ... 他のアイテム
};

// ITEM_CATALOG の定義のすぐ下にこれを貼り付けてください
Object.keys(ITEM_CATALOG).forEach(id => {
    const item = ITEM_CATALOG[id];
    
    // 合計対象にするステータスのリスト
    const targetKeys = ['str', 'dex', 'int', 'luk', 'maxHp', 'maxMp', 'atk', 'matk', 'def'];
    
    // 1つずつ足していく
    const sum = targetKeys.reduce((acc, key) => {
        let val = (item[key] || 0);

        // 🌟 maxHp または maxMp の場合は数値を 10 分の 1 にして加算
        if (key === 'maxHp' || key === 'maxMp') {
            val = val / 10;
        }

        return acc + val;
    }, 0);
    
    // 計算結果をカタログの各アイテムに上書き代入
    item.totalFirstStats = sum;
});

// 確認用ログ（不要なら消してください）
console.log("ITEM_CATALOGの初期化完了: sword合計=" + ITEM_CATALOG[101].totalFirstStats);

// 🌟 【修正】サーバー側で名前を確実に解決する（sword を追加）
const SERVER_ITEM_NAMES = {
    'gold': '金塊',
    'shield': 'トリシールド',
    'treasure': 'ひみつの宝箱',
    'sweets': 'おいしいケーキ',
    'money7': '銅メダル',
    'sword': 'マニアックソード' // 🌟 追加
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
  ladders: [{ x: 580, y1: 130, y2: 565 }] // はしご
};

// --- 📖 モンスター図鑑 (JSON形式) ---
// scale: 1.0 が標準。1.5なら1.5倍、0.5なら半分になります。
const ENEMY_CATALOG = {
  /*
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
  */
  20: { type: 'monster20', w: 773,  h: 589,  hp: 200,  speed: 1.5, scale: 1.0, name: 'エネミー16'}, 
  /*
  21: { type: 'monster21', w: 506,  h: 522,  hp: 200,  speed: 1.5, scale: 1.0, name: 'エネミー17'}, 
  22: { type: 'monster22', w: 582,  h: 302,  hp: 200,  speed: 1.5, scale: 1.0, name: 'エネミー18'}, 
  23: { type: 'monster23', w: 227,  h: 337,  hp: 200,  speed: 1.5, scale: 1.0, name: 'エネミー19'}, 
  24: { type: 'monster24', w: 707,  h: 555,  hp: 200,  speed: 1.5, scale: 1.0, name: 'エネミー20'}, 
  25: { type: 'monster25', w: 596,  h: 428,  hp: 200,  speed: 1.5, scale: 1.0, name: 'エネミー21'}, 
  26: { type: 'monster26', w: 571,  h: 355,  hp: 200,  speed: 1.5, scale: 1.0, name: 'エネミー22'}, 
  27: { type: 'monster27', w: 766,  h: 542,  hp: 200,  speed: 1.5, scale: 1.0, name: 'エネミー23'}, 
  28: { type: 'monster28', w: 527,  h: 381,  hp: 200,  speed: 1.5, scale: 1.0, name: 'エネミー24'}, 
  29: { type: 'monster29', w: 487,  h: 327,  hp: 200,  speed: 1.5, scale: 1.0, name: 'エネミー25'},
  */
  30: { type: 'tier1_1', w: 438,  h: 214,  hp: 200,  speed: 1.5, scale: 1.0, name: 'Char10', exp: 4, atk: 5,  money: 10 }, 
  31: { type: 'tier1_2', w: 322,  h: 242,  hp: 200,  speed: 1.5, scale: 1.0, name: 'Char13', exp: 5, atk: 8,  money: 25 }, 
  32: { type: 'tier1_3', w: 227,  h: 337,  hp: 200,  speed: 1.5, scale: 1.0, name: 'Char19', exp: 6, atk: 30, money: 100 },
};

// ==========================================
// 👾 敵キャラクターのクラス（仕組みの部分）
// ==========================================
class Enemy {
  constructor(id, platIndex) {
    this.id = id;
    this.platIndex = platIndex; 
    
    // ジャンプ関連の初期化
    this.jumpY = 0;
    this.jumpV = 0;
    this.jumpFrame = 0;

    this.reset();
  }

  // ==========================================
  // 🔄 状態リセット（初期化）
  // ==========================================
  reset() {
    // 1. 表示・生存フラグ
    this.alive       = true;
    this.opacity     = 1;
    this.spawnAlpha    = 0;
    this.isFading      = false;
    this.deathFrame    = 0;

    // 2. 動作・タイマー
    this.kbV           = 0;
    this.isAttacking   = 0;
    this.isEnraged     = false;
    this.respawnTimer = 0;
    this.waitTimer     = 0;
    this.offset       = 0;
    this.dir = Math.random() < 0.5 ? 1 : -1;

    // 3. ステータス読み込み
    const config = ENEMY_CATALOG[this.id] || ENEMY_CATALOG[1];
    const tierName = config.tier || 'tier1';
    const stats    = TIER_STATS[tierName];

    this.type  = config.type;
    this.scale = config.scale || 0.2;
    this.maxHp = config.hp    || stats.hp;
    this.hp    = config.hp    || stats.hp;
    this.str   = config.str   || stats.str;
    this.def   = config.def   || stats.def;
    this.speed = config.speed || stats.speed;
    this.exp   = config.exp   || stats.exp;
    this.money = config.money || stats.money;
    this.atk   = config.atk   || 5;

    // 4. サイズ計算
    this.w = config.w * this.scale * 0.2;
    this.h = config.h * this.scale * 0.2;

    // 5. 初期座標の決定
    this.initPosition();
  }

  // 初期位置を決める内部処理
  initPosition() {
    const randomOffset = Math.floor(Math.random() * 61) - 30;
    const p = (this.platIndex !== null) ? MAP_DATA.platforms[this.platIndex] : null;

    if (p) {
      this.offset = Math.floor(Math.random() * (p.w - this.w));
      this.x = p.x + this.offset;
      this.y = p.y - this.h;
    } else {
      this.x = 550 + randomOffset;
      this.y = SETTINGS.SYSTEM.GROUND_Y - this.h;
    }
  }

  // ======================================================
  // ⚙️ フレームごとの更新処理
  // ======================================================
  update() {
    // 出現時のフェードイン
    if (this.spawnAlpha < 1) this.spawnAlpha += 0.05;

    // 1. 死亡・消滅・復活の管理
    if (this.handleDeathAndRespawn()) return;

    // 2. 物理計算（ノックバック・ジャンプ）
    this.applyKnockback();
    this.applyJumpPhysics();

    // 3. AI行動（移動ロジック）
    this.updateAI();

    // 4. 最終的な表示座標の計算
    this.calculateFinalPosition();
  }

  // --- 内部処理用メソッド（updateを小分けにしたもの） ---

  // 💀 死亡・復活管理
  handleDeathAndRespawn() {
    if (this.isFading) {
      if (++this.deathFrame > 40) {
        this.alive = false;
        this.isFading = false;
        this.respawnTimer = (this.platIndex === null) ? 300 : 150;
      }
      return true;
    }

    if (!this.alive) {
      if (--this.respawnTimer <= 0) {
        this.reset();
        if (this.platIndex !== null) this.opacity = 0;
      }
      return true;
    }
    return false;
  }

  // 💥 ノックバック
  applyKnockback() {
    if (Math.abs(this.kbV) < 0.1) {
      this.kbV = 0;
      return;
    }

    const p = (this.platIndex !== null) ? MAP_DATA.platforms[this.platIndex] : null;

    if (!p) {
      this.x += this.kbV;
      this.x = Math.max(0, Math.min(800 - this.w, this.x));
    } else {
      this.offset += this.kbV;
      this.offset = Math.max(0, Math.min(p.w - this.w, this.offset));
    }
    this.kbV *= 0.85;
  }

  // 🌟 ジャンプ
  applyJumpPhysics() {
    const isFloating = [30, 31, 32].includes(this.id);

    if (this.jumpY < 0 || this.jumpV !== 0) {
      this.jumpV += 0.5;
      this.jumpY += this.jumpV;
      if (this.jumpY >= 0) {
        this.jumpY = 0;
        this.jumpV = 0;
      }
    } else if (!isFloating && Math.random() < 0.01) {
      this.jumpV = -7;
    }
  }

  // 🐾 AI移動ロジック
  updateAI() {
    if (this.waitTimer > 0) {
      this.waitTimer--;
      return;
    }

    const playersArray = Object.values(players || {});
    const target = playersArray[0];

    if (this.isEnraged && target) {
      this.moveTowardsTarget(target);
    } else {
      this.movePatrol();
      // 巡回中の気まぐれ
      if (Math.random() < 0.01) {
        this.waitTimer = Math.floor(Math.random() * 200) + 50;
        this.dir *= (Math.random() > 0.5 ? 1 : -1);
      }
    }
  }

  // プレイヤーを追いかける
  moveTowardsTarget(target) {
    this.dir = (target.x < this.x) ? -1 : 1;
    const moveStep = this.speed * 1.5 * this.dir;
    const p = (this.platIndex !== null) ? MAP_DATA.platforms[this.platIndex] : null;

    if (!p) {
      let nextX = this.x + moveStep;
      if (Math.abs(target.x - this.x) < Math.abs(moveStep)) nextX = target.x;
      if (nextX > 400 && nextX < 800 - this.w) this.x = nextX;
    } else {
      this.offset += moveStep;
      if (this.offset < 0 || this.offset > p.w - this.w) {
        this.offset = Math.max(0, Math.min(p.w - this.w, this.offset));
        this.waitTimer = 60;
      }
      this.x = p.x + this.offset;
    }
  }

  // 巡回移動
  movePatrol() {
    const p = (this.platIndex !== null) ? MAP_DATA.platforms[this.platIndex] : null;

    if (!p) {
      this.x += this.speed * this.dir;
      if (this.x < SETTINGS.SYSTEM.ENEMY_MIN_X) { this.x = SETTINGS.SYSTEM.ENEMY_MIN_X; this.dir = 1; }
      if (this.x > SETTINGS.SYSTEM.ENEMY_MAX_X - this.w) { this.x = SETTINGS.SYSTEM.ENEMY_MAX_X - this.w; this.dir = -1; }
    } else {
      this.offset += this.speed * this.dir;
      if (this.offset <= 0) { this.offset = 0.5; this.dir = 1; this.waitTimer = 40; }
      else if (this.offset >= p.w - this.w) { this.offset = p.w - this.w - 0.5; this.dir = -1; this.waitTimer = 40; }
    }
  }

  // 🎯 最終座標の決定
  calculateFinalPosition() {
    const isFloating = [30, 31, 32].includes(this.id);
    const floatOffset = isFloating ? 12 : 0;
    const p = (this.platIndex !== null) ? MAP_DATA.platforms[this.platIndex] : null;

    if (!p) {
      this.y = SETTINGS.SYSTEM.GROUND_Y - this.h - floatOffset;
    } else {
      if (this.opacity < 1) this.opacity += 0.02;
      this.x = p.x + this.offset;
      this.y = p.y - this.h - floatOffset;
    }
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
  "big2":  { "medal1": 80, "shield": 90,　"sword": 90, "gold": 80, "default": 100 },
  "small": { "gold_heart": 40, "money6": 50,  "default": 50 },
  "tier1": { "medal1": 80, "treasure": 80, "sweets": 80, "gold_heart": 40, "shield": 20, "default": 80 },
};

// 🌟 レベルアップに必要な経験値のリスト（テーブル）
// index 0は使わず、index 1 = Lv1→2に必要な経験値 ... と設定します
const LEVEL_TABLE = [0, 12, 20, 35, 60, 100, 150, 210, 280, 360, 450];

/**
 * 🌟 経験値を加算してレベルアップをチェックする専用の関数
 * レベルアップ時に最大HPを増加し、体力を全回復させます。
 */
function addExperience(player, amount, socket) {
    // 🛡️ ガード：プレイヤーがいない、または加算量が数値でない場合は即終了
    if (!player || isNaN(amount)) return;

    try {
        // 数値であることを保証して計算
        player.exp = (Number(player.exp) || 0) + Number(amount);
    } catch (e) {
        console.error("❌ 経験値計算中にエラー:", e);
    }

    // 2. 現在のレベルに応じた必要経験値をテーブルから取得
    let requiredExp = LEVEL_TABLE[player.level] || (player.level * 100);
    player.maxExp = requiredExp;

    debugChat(`[EXP] ${player.name}: +${amount} (Total: ${player.exp} / Next: ${requiredExp})`);

    // 3. レベルアップ判定（whileを使うと、一気に2レベル上がる場合にも対応できます）
    while (player.exp >= requiredExp) {
        player.exp -= requiredExp; // 経験値を引いて余りを繰り越す
        player.level = (Number(player.level) || 1) + 1;
        
        // 🌟 AP（能力ポイント）の加算
        player.ap = (Number(player.ap) || 0) + 5; 

        // 🌟 【追加】最大HPの増加（例：1レベルにつき20アップ）
        player.maxHp = (Number(player.maxHp) || 100) + 20;
        
        // 🌟 【追加】HPを全回復（レベルアップの恩恵）
        player.hp = player.maxHp;
        
        // 🌟 ここが重要！ サーバーから「レベルアップしたよ！」と全員に合図を送る
        io.emit('level_up_effect', { 
            playerId: player.id 
        });
        
        // 次のレベルの必要量を再取得
        requiredExp = LEVEL_TABLE[player.level] || (player.level * 100);
        player.maxExp = requiredExp;

        console.log(`[LEVEL UP] ${player.name} が Lv.${player.level} になりました！ (MaxHP: ${player.maxHp})`);
        debugChat(`🎊${player.name}がレベル${player.level}に上がりました！最大HPが${player.maxHp}に増加し、体力が全回復しました！`);
    }

    // 必要に応じてここでDB保存処理など
}

/**
 * 🎁 アイテムドロップ生成 (spawnDropItems)
 * 既存のロジック・確率・変数名を完全に維持したリファクタリング版
 */
function spawnDropItems(enemy) {
    try {
        // --- 1. 基本チェック ---
        if (!enemy || !droppedItems) return;

        // --- 2. ドロップテーブルの決定 ---
        const setting = DROP_DATABASE[enemy.type] || { table: "small" };
        const chances = DROP_CHANCE_TABLES[setting.table];
        if (!chances) return;

        // --- 3. ドロップするアイテムの抽選 ---
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

        // --- 4. アイテムの生成と配置 ---
        const fixedSpawnY = enemy.y + (enemy.h || 32) - 50;
        const centerX = enemy.x + (enemy.w || 32) / 2;

        itemsToDrop.forEach((type, i) => {
    // 配置計算
    const spread = 15;
    const offsetX = (i - (itemsToDrop.length - 1) / 2) * spread;

    // アイテムの個別性能鑑定 (既存のロジック)
    const stats = identifyItem(type);

    // 🌟 カタログ取得の判定をより確実に
    const catalogId = (type === 'sword') ? 101 : (type === 'shield' ? 102 : null);
    const catalogBase = (catalogId && typeof ITEM_CATALOG !== 'undefined' && ITEM_CATALOG[catalogId]) 
                        ? ITEM_CATALOG[catalogId] 
                        : null;

    // アイテムオブジェクトの組み立て
    const newItem = {
        id: Date.now() + Math.random() + i,
        x: centerX + offsetX,
        y: fixedSpawnY,
        vx: 0,
        vy: -4 - Math.random() * 2,
        type: type,

        // 🌟 ここで強制的に値を代入
        // カタログがあればそのレベル、なければ 50 を入れる
        lv: (catalogBase && catalogBase.lv !== undefined) ? catalogBase.lv : 50,
        
        category: (catalogBase && catalogBase.category) ? catalogBase.category : (type === 'sword' ? "weapon" : (type === 'shield' ? "shield" : "")),
        totalUpgrade: (catalogBase && catalogBase.totalUpgrade !== undefined) ? catalogBase.totalUpgrade : 7,
        star: (catalogBase && catalogBase.star !== undefined) ? catalogBase.star : 0,
        successCount: 0,
        failCount: 0,
        isTradeable: (catalogBase && catalogBase.isTradeable !== undefined) ? catalogBase.isTradeable : true,

        // ステータス (鑑定結果 stats を優先、なければカタログ)
        atk: (stats.atk !== undefined) ? stats.atk : (catalogBase ? catalogBase.atk : 0),
        def: (stats.def !== undefined) ? stats.def : (catalogBase ? catalogBase.def : 0),
        matk: (stats.matk !== undefined) ? stats.matk : (catalogBase ? catalogBase.matk : 0),

        // 詳細ステータス (0で上書きされないよう慎重に代入)
        str: (stats.str !== undefined) ? stats.str : (catalogBase ? catalogBase.str : 0),
        dex: (stats.dex !== undefined) ? stats.dex : (catalogBase ? catalogBase.dex : 0),
        int: (stats.int !== undefined) ? stats.int : (catalogBase ? catalogBase.int : 0),
        luk: (stats.luk !== undefined) ? stats.luk : (catalogBase ? catalogBase.luk : 0),
        maxHp: (stats.maxHp !== undefined) ? stats.maxHp : (catalogBase ? catalogBase.maxHp : 0),
        maxMp: (stats.maxMp !== undefined) ? stats.maxMp : (catalogBase ? catalogBase.maxMp : 0),

        // 表示名と色
        name: (type === 'sword' ? "剣" : (type === 'shield' ? "盾" : type)) + stats.qualityLabel,
        color: stats.itemColor,

        phase: Math.random() * Math.PI * 2,
        landed: false,
		totalFirstStats: (catalogBase && catalogBase.totalFirstStats !== undefined) 
                             ? catalogBase.totalFirstStats 
                             : 0,
		// 🌟 ここで各ステータスをすべて足し合わせる（HP/MPは1/10にする）
        totalALLStats: (
            ((stats.atk !== undefined) ? stats.atk : (catalogBase ? catalogBase.atk : 0)) +
            ((stats.def !== undefined) ? stats.def : (catalogBase ? catalogBase.def : 0)) +
            ((stats.matk !== undefined) ? stats.matk : (catalogBase ? catalogBase.matk : 0)) +
            ((stats.str !== undefined) ? stats.str : (catalogBase ? catalogBase.str : 0)) +
            ((stats.dex !== undefined) ? stats.dex : (catalogBase ? catalogBase.dex : 0)) +
            ((stats.int !== undefined) ? stats.int : (catalogBase ? catalogBase.int : 0)) +
            ((stats.luk !== undefined) ? stats.luk : (catalogBase ? catalogBase.luk : 0)) +
            // 🌟 maxHp を 10 分の 1 にして加算
            (((stats.maxHp !== undefined) ? stats.maxHp : (catalogBase ? catalogBase.maxHp : 0)) / 10) +
            // 🌟 maxMp を 10 分の 1 にして加算
            (((stats.maxMp !== undefined) ? stats.maxMp : (catalogBase ? catalogBase.maxMp : 0)) / 10)
        )
    };

    // 特殊処理（メダル・金塊）
    if (type === 'medal1') {
        newItem.goldValue = enemy.money;
    } else if (type === 'gold_one') {
        newItem.goldValue = Math.floor(enemy.money * 1.5);
    } else if (type === 'gold_heart') {
        newItem.goldValue = enemy.money * 3;
    }

    droppedItems.push(newItem);
});

    } catch (error) {
        console.error("❌ spawnDropItemsエラー:", error);
    }
}

/**
 * 🔍 アイテム鑑定サブ関数（完全±5変動・0固定版）
 * ランクに関わらず、すべてのステータスを基準値から ±5 の範囲でランダムに決定します。
 * 元々の基準値が 0 の項目は、変動させずに 0 のまま維持します。
 */
function identifyItem(type) {
    const catalogId = (type === 'sword') ? 101 : (type === 'shield' ? 102 : null);
    const base = (typeof ITEM_CATALOG !== 'undefined' && catalogId && ITEM_CATALOG[catalogId]) 
                ? ITEM_CATALOG[catalogId] 
                : { atk: 10, def: 0 };

    if (type !== 'sword' && type !== 'shield') {
        return { ...base, itemColor: "#ffffff", qualityLabel: "" };
    }

    let res = { ...base, itemColor: "#ffffff", qualityLabel: "" };

    // --- 1. ランク決定ロジック（表示上のランクのみ決定） ---
    const roll = Math.random() * 100;
    if (roll < 5) {
        res.qualityLabel = "(超絶良品)";
        res.itemColor = "#ff00ff";
    } else if (roll < 15) {
        res.qualityLabel = "(最良品)";
        res.itemColor = "#ffcc00";
    } else if (roll < 40) {
        res.qualityLabel = "(良品)";
        res.itemColor = "#00ff00";
    } else if (roll < 70) {
        res.qualityLabel = ""; // (標準品)
        res.itemColor = "#ffffff";
    } else {
        res.qualityLabel = "(粗悪品)";
        res.itemColor = "#888888";
    }

    // --- 2. ステータス計算（基準値が0より大きい場合のみ ±5 変動） ---
    const targetKeys = ['atk', 'def', 'str', 'dex', 'int', 'luk', 'maxHp', 'maxMp', 'matk'];

    targetKeys.forEach(key => {
        const baseVal = base[key] || 0;

        // 🌟 修正：基準値が 0 より大きい場合のみ計算を行う
        if (baseVal > 0) {
            // HPとMPは10単位の重み(±50)、それ以外は1(±5)
            const multiplier = (key === 'maxHp' || key === 'maxMp') ? 10 : 1;
            
            // -5.4 〜 +5.4 の範囲で少数をランダム生成
            const range = 5.4;
            const drift = (Math.random() * (range * 2) - range) * multiplier;
            
            let newVal = baseVal + drift;

            // 整形処理
            if (key === 'maxHp' || key === 'maxMp') {
                newVal = Math.round(newVal / 10) * 10;
            } else {
                newVal = Math.round(newVal);
            }

            // 0 以下のマイナスになったら 0 に固定
            res[key] = Math.max(0, newVal);
        } else {
            // 🌟 基準値が 0 または undefined の場合は 0 固定
            res[key] = 0;
        }
    });

    // ログ出力（形式を完全維持）
    LOG.ITEM(`🎁 [鑑定:${res.qualityLabel}] ${type} Atk:${res.atk} Matk:${res.matk || 0} Def:${res.def} Str:${res.str || 0} Dex:${res.dex || 0} Int:${res.int || 0} Luk:${res.luk || 0} HP:${res.maxHp || 0} MP:${res.maxMp || 0}`);
    
    return res;
}

// ==========================================
// 📞 イベントハンドラ（各アクションの具体的な中身）
// ==========================================

/**
 * 👤 1. プレイヤーが参加したときの処理（チャンネル対応版）
 * --------------------------------------------------
 * 元々のDB保存機能や詳細なステータス設定を維持したまま、
 * 選択されたチャンネル情報をプレイヤーデータに追加します。
 */
function handleJoin(socket, name, channel) { // 🌟 引数に channel を追加
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
        channel: channel, // 🌟 【追加】選んだチャンネル(1〜5)を保存
        x: 50,
        y: 500, // game.jsと合わせるなら540でもOK
        dir: 1,
        score: 0,
        inventory: [],
        isAttacking: 0,
        
        // レベル継続処理（既存のデータがあれば引き継ぐ）
        level: (players[socket.id] ? players[socket.id].level : 1),
        exp: (players[socket.id] && players[socket.id].exp !== undefined) ? players[socket.id].exp : 0,
        maxExp: 100,

        // --- ⚔️ 今日決めた緻密なステータスを追加 ⚔️ ---
        str: 50,      // 初期攻撃力
        dex: 4,       // 初期命中率
        luk: 4,       // 初期幸運
        ap: 0,        // 振り分け可能な能力ポイント
        // ------------------------------------------

        // サイズ・HP設定（SETTINGSから取得）
        w: SETTINGS.PLAYER.DEFAULT_W * (SETTINGS.PLAYER.SCALE || 1.0),
        h: SETTINGS.PLAYER.DEFAULT_H * (SETTINGS.PLAYER.SCALE || 1.0),
        scale: SETTINGS.PLAYER.SCALE || 1.0,
        hp: SETTINGS.PLAYER.MAX_HP,
        maxHp: SETTINGS.PLAYER.MAX_HP,
        lastPickupTime: 0,
    };
}

/**
 * 2. プレイヤーが攻撃したときの処理（デバッグ枠同期＆連撃改善版）
 */
function handleAttack(socket, data) {
    const p = players[socket.id];
    if (!p) return; // プレイヤーがいなければ中止

    // 【ログ】ボタンが押されたことをサーバーが認識
    console.log(`[1.通信確認] ${p.name} が攻撃しました`);

    // ハシゴを登っている間は攻撃できない
    if (p.isClimbing) return;

    // 🌟【連撃改善】
    // 以前の「if (p.isAttacking > SETTINGS.PLAYER.ATTACK_FRAME - 5) return;」を削除しました。
    // これにより、前回の攻撃モーションが終わるのを待たずに、次のダメージ判定が可能になります。

    // 🚩 サーバー側で「攻撃アニメーション中」のフラグを立てる（最新の攻撃で上書き）
    p.isAttacking = SETTINGS.PLAYER.ATTACK_FRAME;

    let targetsInRange = [];

    // --- ① 範囲内の敵をリストアップ ---
// 🌟 高さを 100 に拡大！
const atkWidth = 80;  
const atkHeight = 100; 

// 左右のオフセット（これまでのベストな数値を維持）
const offsetX = (p.dir === 1) ? 60 : -(atkWidth + 20);

let atkY;
const groundThreshold = 450; 

// 🌟 高さを 20 増やした分、atkY も 20 ずつ引き上げます
if (p.y >= groundThreshold) {
    // 一番下の地面にいる時：-65 から -85 に変更（上方向へさらに拡張）
    atkY = p.y - 85; 
} else {
    // 空中の足場にいる時：-30 から -50 に変更（上方向へさらに拡張）
    atkY = p.y - 50;
}

const atkBox = {
    x: p.x + offsetX,
    y: atkY,
    w: atkWidth,
    h: atkHeight
};

    enemies.forEach((target) => {
        // 敵が生きていて、消えかかっていない場合のみ計算
        if (target.alive && !target.isFading) {
            
            // 敵の判定サイズと座標（ジャンプを考慮）
            const enemyW = target.w || 40;
            const enemyH = target.h || 40;
            const enemyY = target.y + (target.jumpY || 0);

            // 🌟 矩形同士の衝突判定（オレンジの枠の中に入っているか）
            const isHit = atkBox.x < target.x + enemyW &&
                          atkBox.x + atkBox.w > target.x &&
                          atkBox.y < enemyY + enemyH &&
                          atkBox.y + atkBox.h > enemyY;

            if (isHit) {
                // 距離は後のソート用に保持（中心間の距離）
                const dist = Math.sqrt(Math.pow(target.x - p.x, 2) + Math.pow(target.y - p.y, 2));
                targetsInRange.push({ enemy: target, dist: dist });
            }
        }
    });

    // --- ② 最も近い敵「だけ」にダメージを与える ---
    if (targetsInRange.length > 0) {
        // 距離が近い順に並び替えて、一番近い敵を選ぶ
        targetsInRange.sort((a, b) => a.dist - b.dist);
        const nearest = targetsInRange[0].enemy;

        // 🌟 判定：このダメージ計算の直前の状態を保持
        const wasAlive = nearest.alive;
        const damage = p.str || data.power || 4; 
        
        nearest.hp -= damage; // 敵のHPを減らす

        // 🌟 【確定死亡判定】
        const isFatalBlow = (nearest.hp <= 0 && wasAlive);

        // 🌟 【音の同期用】全員に「ヒット通知」を送る（isDeadフラグ付き）
        io.emit('enemy_hit_sync', { 
            enemyId: nearest.id, 
            attackerId: socket.id,
            isDead: isFatalBlow 
        });
        
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
            x: nearest.x + (nearest.w || 40) / 2,
            y: nearest.y,
            val: damage,
            isCritical: damage >= (p.str * 1.5), 
            type: 'enemy_hit'
        });

        // --- 💀 死亡判定と報酬処理 ---
        if (isFatalBlow) {
            nearest.alive = false; // 死亡フラグ

            const rewardExp = nearest.exp || 10; 

            socket.emit('exp_log', { amount: rewardExp }); 

            // 経験値をモンスターに応じた量だけ追加
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
        if (player.lastPickupTime && (now - player.lastPickupTime < 150)) {
            return; 
        }

        // 🛡️ ガード：アイテムリスト自体が存在するか確認
        if (!droppedItems) return;

        const item = droppedItems.find(it => it.id === itemId);
        
        // 🛡️ ガード：アイテムが見つからない、または既に拾われている場合は終了
        if (!item || item.isPickedUp) return;
        
        // --- 🌟 デバッグログ（現在の状態を確認するために維持） ---
        if (item.id === itemId) {
            const dx_debug = Math.abs(player.x - item.x);
            const dy_debug = Math.abs(player.y - item.y);
            console.log(`--- [拾う判定のチェック] ---`);
            console.log(`横の差: ${Math.floor(dx_debug)} (基準:${SETTINGS.ITEM.PICKUP_RANGE_X})`);
            console.log(`縦の差: ${Math.floor(dy_debug)} (基準:${SETTINGS.ITEM.PICKUP_RANGE_Y})`);
            if (item.timer) console.log(`タイマー残数: ${item.timer}`);
        }

        // 🌟 距離判定（ここを let にして書き換え可能にします）
        let dx = Math.abs(player.x - item.x);
        let dy = Math.abs(player.y - item.y);

        // --- 🌟 タイムラグ＆移動対策 🌟 ---
        // アイテムが着地する前（空中に跳ねている間）は距離を無視する
        // これにより、移動しながら捨てても、高さが離れていても即座に拾えます。
        if (!item.landed) {
            dx = 0;
            dy = 0;
        }

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
                    pickerId: socket.id,
                    // --- 🌟 ここが重要！計算に必要な数値をエフェクト用データに含める ---
                    totalALLStats: removedItem.totalALLStats || 0,
                    totalFirstStats: removedItem.totalFirstStats || 0
                });
            }

            // カバンの初期化（なければ10枠確保）
            if (!player.inventory) player.inventory = Array(10).fill(null); 

            // 🌟 【判定A】カバンに入るアイテムのリスト（sweetsを追加）
            const inventoryTypes = ['shield', 'gold', 'treasure', 'money7', 'sword', 'sweets'];

            if (inventoryTypes.includes(removedItem.type)) {
                let stacked = false;
                const actualCount = removedItem.count || removedItem.amount || 1;

                // 🌟 名前解決
                let itemName = SERVER_ITEM_NAMES[removedItem.type] || 'アイテム';

                const pickupMsg = actualCount >= 2 
                    ? `${itemName}を${actualCount}個手に入れました` 
                    : `${itemName}を手に入れました`;

                // --- 🌟 重ね合わせ(Stack)の処理 ---
                const category = itemCategories[removedItem.type];

                if (category === 'ETC' || category === 'USE') {
                    const stackIndex = player.inventory.findIndex(slot => {
                        return slot && slot.type === removedItem.type;
                    });

                    if (stackIndex !== -1) {
                        player.inventory[stackIndex].count = (player.inventory[stackIndex].count || 0) + actualCount;
                        stacked = true;

                        console.log(`[Stack OK] ${itemName}(${category})をスロット ${stackIndex} にまとめました`);
                        
                        socket.emit('chat', {
                            id: 'SYSTEM_LOG',
                            name: '🎊 入手',
                            text: `[${new Date().toLocaleTimeString()}] ${pickupMsg}`
                        });

                        socket.emit('item_pickup_log', { 
                            amount: actualCount, 
                            itemName: itemName 
                        });
                    }
                }

                // --- 新規格納の処理 (装備品、または新しいスタックアイテム) ---
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
                            ...removedItem,
                            type: removedItem.type, 
                            count: actualCount, 
                            
                            atk: (removedItem.atk !== undefined) ? removedItem.atk : ((removedItem.type === 'sword') ? 10 : 0), 
                            def: (removedItem.def !== undefined) ? removedItem.def : ((removedItem.type === 'shield') ? 5 : 0)
                        };

                        console.log(`[PICKUP OK] ${itemName} をスロット ${emptySlotIndex} に格納しました`);

                        socket.emit('chat', {
                            id: 'SYSTEM_LOG',
                            name: '🎊 入手',
                            text: `[${new Date().toLocaleTimeString()}] ${pickupMsg}`
                        });

                        socket.emit('item_pickup_log', { 
                            amount: actualCount, 
                            itemName: itemName 
                        });

                    } else {
                        console.log("カバンがいっぱいです！");
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
        // 🚨 安全装置が発動
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
 * 5. チャット送信（同一チャンネル内限定版）
 */
function handleChat(socket, text) {
    const p = players[socket.id];
    
    // プレイヤーが存在し、かつチャンネル情報を持っている場合
    if (p && p.channel) {
        const channelRoom = `room_ch_${p.channel}`;
        
        // 🌟 io.to(ルーム名).emit を使うことで、その部屋にいる人にだけ送る
        io.to(channelRoom).emit('chat', { 
            id: socket.id, 
            name: p.name || "Guest", 
            text: text 
        });
        
        // ログにもどのチャンネルでの発言か出すとデバッグしやすいです
        console.log(`[Ch ${p.channel}] ${p.name}: ${text}`);
    } else {
        // 念のため、チャンネル情報がない場合のフォールバック（全員送信）
        io.emit('chat', { 
            id: socket.id, 
            name: p?.name || "Guest", 
            text: text 
        });
    }
}

/**
 * 📡 状態送信用の共通関数（チャンネルごとに個別の世界状況を伝える）
 */
function sendState() {
    try {
        if (!players) return;

        // 🌟 1番から5番のチャンネルに対して送信
        for (let i = 1; i <= 5; i++) {
            // 🌟 【修正ポイント】join時と同じ名前 `room_ch_数字` にします
            const roomName = `room_ch_${i}`;

            // 👥 そのチャンネルにいるプレイヤーだけを抽出
            const roomPlayers = {};
            for (let id in players) {
                if (players[id].channel === i) {
                    roomPlayers[id] = players[id];
                }
            }

            // 📡 この部屋（roomName）に入っている人だけに、足場や敵の情報を送る
            io.to(roomName).emit('state', {
                players: roomPlayers,
                items: droppedItems,
                enemies: enemies.map(en => ({
                    ...en,
                    jumpY: en.jumpY || 0,
                    isJumping: (en.jumpY || 0) !== 0
                })),
                platforms: MAP_DATA.platforms, // 🧱 これで足場が復活します
                ladders: MAP_DATA.ladders,     // 🪜 これでハシゴが復活します
                lastPickedItems: lastPickedItems
            });
        }

        // リセット処理
        lastPickedItems = [];

    } catch (error) {
        console.error("❌ [CRITICAL] sendState関数内でエラーが発生しました:", error);
    }
}

/**
 * 📊 チャンネルごとの人数を集計して全ユーザーに送る
 */
function broadcastUserCounts() {
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    
    // 全プレイヤーをループしてカウント
    for (let id in players) {
        const ch = players[id].channel;
        if (counts[ch] !== undefined) {
            counts[ch]++;
        }
    }
    
    // 全員に現在の人数分布を放送
    io.emit('user_counts', counts);
}

// 既存の setInterval の中（updatePlayersなどの後）に追加
setInterval(() => {
    // ...既存の処理...
    broadcastUserCounts(); // 🌟 人数情報を放送
}, 1000); // 1秒に1回くらいで十分です

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

        // ==========================================
// 👤 プレイヤーの参加・変更セクション
// ==========================================

// --- 1. 参加処理の修正（既存ロジック踏襲・クライアント選択反映版） ---
socket.on('join', data => {
    try { 
        // 🌟 データの取り出し
        const userName = (typeof data === 'object') ? data.name : data;
        
        // 🎨 【修正】クライアントがボタンで選んだグループ番号を取得
        // data がオブジェクトで group プロパティがあればそれを使用、なければデフォルトで 0
        let selectedGroup = (typeof data === 'object' && data.group !== undefined) ? parseInt(data.group) : 0;

        // チャンネル番号を数値として取得（1〜5 の範囲）
        let channel = (typeof data === 'object') ? parseInt(data.channel) : 1;
        if (isNaN(channel) || channel < 1 || channel > 5) channel = 1;

        // 🌟 【最重要】合言葉（部屋名）を統一
        const roomName = `room_ch_${channel}`; 
        socket.join(roomName);

        // 元々の処理を呼び出す
        handleJoin(socket, userName); 
        
        // 🌟 プレイヤーデータへの書き込み
        const p = players[socket.id];
        if (p) {
            p.channel = channel; 

            // 🎨 【修正】固定値の 7 を廃止し、クライアントから届いた選択値を反映
            p.group = selectedGroup;
            p.charVar = 1; 
            
            debugChat(`👋 ${userName} さんが チャンネル ${channel} に参加しました（キャラID: ${p.group}）`);
            LOG.SYS(`[入室データ確認] ${JSON.stringify(p)}`);
        }
    } 
    catch (e) { 
        debugChat(`❌ joinエラー: ${e.message}`, 'error'); 
    }
});

// --- 2. 【新規追加】見た目の変更を全ユーザーに同期する ---
// view.js の socket.emit('change_char', ...) を受けて動作します
socket.on('change_char', (data) => {
    const p = players[socket.id];
    if (p) {
        // 1. サーバー側のメモリに最新の見た目を保存
        p.group = data.group;
        p.charVar = data.charVar;

        // 2. 📡 同じチャンネル（ルーム）にいる他の全プレイヤーに通知
        // 自分以外（broadcast）の、同じ部屋（to）の人たちへ送ります
        const roomName = `room_ch_${p.channel}`;
        socket.to(roomName).emit('update_player_visual', {
            id: socket.id,
            group: data.group,
            charVar: data.charVar
        });

        LOG.SYS(`🎨 Player[${p.name}] が見た目を変更: Group ${data.group}`);
    }
});

        // 2. 移動
        socket.on('move', (data) => {
    const p = players[socket.id];
    if (p) {
        p.x = data.x;
        p.y = data.y;
		p.vx = data.vx;        // 🌟 これを保存
        p.dir = data.dir;
		p.jumping = data.jumping; // 🌟 追加
        p.isAttacking = data.isAttacking;
		p.invincible = data.invincible; // 🌟 サーバー側で保持
        p.climbing = data.climbing; // 🌟 dataから受け取ってプレイヤー情報に反映
    }
});

// 攻撃イベントの中継（攻撃のキレを良くするため）
socket.on('player_attack', (data) => {
    socket.broadcast.emit('player_attack', data);
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

        // ==========================================
// 💬 6. チャット受信（メイン処理）
// ==========================================
socket.on('chat', text => {
    try {
        const p = players[socket.id];
        if (!p) return;

        // 🌟 まずはコマンドとして処理できるか試す
        const isCommand = executeAdminCommand(socket, p, text);

        // 🌟 コマンドでなければ、通常のチャットとして処理
        if (!isCommand) {
            handleChat(socket, text);
        }
        
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

        // 📥 10. アイテムを捨てた時 (dropItem) - 複数個対応版
socket.on('dropItem', (data) => {
    try {
        const player = players[socket.id];
        // 🛡️ ガード：プレイヤーが存在しない、またはカバンが空なら何もしません
        if (!player || !player.inventory) return;

        // 🌟 データの受け取り（オブジェクト形式と数値形式の両方に対応）
        const index = (typeof data === 'object') ? data.index : data;
        const requestedAmount = (typeof data === 'object') ? data.amount : null;

        // ✅ 指定された番号のアイテムが、カバンの中に本当にあるか確認
        if (player.inventory[index]) {
            const itemToDrop = player.inventory[index];

            // 🌟 持っている最大個数を確認
            const maxCount = itemToDrop.count || itemToDrop.amount || 1;
            
            // 🌟 実際に捨てる個数を決定（指定があればその数、なければ全量）
            const actualDropCount = (requestedAmount !== null) 
                ? Math.min(Math.max(1, requestedAmount), maxCount) 
                : maxCount;

            // 🌟 名前解決（SERVER_ITEM_NAMES は既存のものを使用）
            let itemName = SERVER_ITEM_NAMES[itemToDrop.type] || 'アイテム';

            // 🌟 ログ用メッセージを作成
            const dropLogMsg = actualDropCount >= 2 
                ? `${itemName}を${actualDropCount}個捨てました` 
                : `${itemName}を捨てました`;

            // 🌟 サーバー側の ITEM_CATALOG からベースデータを特定
            const catalogId = (itemToDrop.type === 'sword') ? 101 : (itemToDrop.type === 'shield' ? 102 : null);
            const catalogBase = (catalogId && typeof ITEM_CATALOG !== 'undefined') ? ITEM_CATALOG[catalogId] : {};

            // 🌟 地面に置くための新しいアイテムデータを作成
            const newItem = {
                id: Math.floor(Math.random() * 1000000),
                type: itemToDrop.type,
                x: player.x,
                y: player.y + 12,
                vx: 0,
                vy: -12, // 真上に打ち出す力
                landed: false,
                
                // 🌟 ITEM_CATALOG および元々持っていた情報を完全に引き継ぐ
                lv: itemToDrop.lv !== undefined ? itemToDrop.lv : (catalogBase.lv || 0),
                category: itemToDrop.category || catalogBase.category || "",
                
                // ステータス（個体差がある場合は持っていた値を優先）
                str: itemToDrop.str !== undefined ? itemToDrop.str : (catalogBase.str || 0),
                dex: itemToDrop.dex !== undefined ? itemToDrop.dex : (catalogBase.dex || 0),
                int: itemToDrop.int !== undefined ? itemToDrop.int : (catalogBase.int || 0),
                luk: itemToDrop.luk !== undefined ? itemToDrop.luk : (catalogBase.luk || 0),
                maxHp: itemToDrop.maxHp !== undefined ? itemToDrop.maxHp : (catalogBase.maxHp || 0),
                maxMp: itemToDrop.maxMp !== undefined ? itemToDrop.maxMp : (catalogBase.maxMp || 0),
                
                atk: itemToDrop.atk !== undefined ? itemToDrop.atk : (catalogBase.atk || 0),
                matk: itemToDrop.matk !== undefined ? itemToDrop.matk : (catalogBase.matk || 0),
                def: itemToDrop.def !== undefined ? itemToDrop.def : (catalogBase.def || 0),
                
                // 強化情報
                star: itemToDrop.star || 0,
                successCount: itemToDrop.successCount || 0,
                failCount: itemToDrop.failCount || 0,
                totalUpgrade: itemToDrop.totalUpgrade !== undefined ? itemToDrop.totalUpgrade : (catalogBase.totalUpgrade || 7),

                count: actualDropCount, // 🌟 決定した個数分だけ地面に生成
                value: (itemToDrop.type === 'money3' ? 100 : 10),
                isStatic: true,
                angle: 0,
                rotateSpeed: 0.15,
                isTradeable: itemToDrop.isTradeable !== undefined ? itemToDrop.isTradeable : (catalogBase.isTradeable !== undefined ? catalogBase.isTradeable : true),
				totalFirstStats: (itemToDrop.totalFirstStats !== undefined) 
                     ? itemToDrop.totalFirstStats 
                     : (catalogBase.totalFirstStats || 0),
				totalALLStats: (
    (itemToDrop.str !== undefined ? itemToDrop.str : (catalogBase.str || 0)) +
    (itemToDrop.dex !== undefined ? itemToDrop.dex : (catalogBase.dex || 0)) +
    (itemToDrop.int !== undefined ? itemToDrop.int : (catalogBase.int || 0)) +
    (itemToDrop.luk !== undefined ? itemToDrop.luk : (catalogBase.luk || 0)) +
    // 🌟 maxHp を 10 分の 1 にして加算
    ((itemToDrop.maxHp !== undefined ? itemToDrop.maxHp : (catalogBase.maxHp || 0)) / 10) +
    // 🌟 maxMp を 10 分の 1 にして加算
    ((itemToDrop.maxMp !== undefined ? itemToDrop.maxMp : (catalogBase.maxMp || 0)) / 10) +
    (itemToDrop.atk !== undefined ? itemToDrop.atk : (catalogBase.atk || 0)) +
    (itemToDrop.matk !== undefined ? itemToDrop.matk : (catalogBase.matk || 0)) +
    (itemToDrop.def !== undefined ? itemToDrop.def : (catalogBase.def || 0))
)
            };

            // 🗺️ 世界のアイテムリストに追加
            if (Array.isArray(droppedItems)) {
                droppedItems.push(newItem);
                
                // 🌟 プレイヤー本人のチャット欄にもシステム通知として表示
                socket.emit('chat', {
                    id: 'SYSTEM_LOG',
                    name: '🗑️ 廃棄',
                    text: `[${new Date().toLocaleTimeString()}] ${dropLogMsg}`
                });
            }

            // ✂️ 🌟 カバンの更新
            if (actualDropCount < maxCount) {
                // 一部だけ捨てる場合：カバンの個数を減らす
                if (itemToDrop.count !== undefined) {
                    itemToDrop.count -= actualDropCount;
                } else if (itemToDrop.amount !== undefined) {
                    itemToDrop.amount -= actualDropCount;
                } else {
                    player.inventory[index] = null;
                }
            } else {
                // 全部捨てる場合
                player.inventory[index] = null;
            }

            // クライアントへ最新の状態を送信
            socket.emit('inventory_update', player.inventory);
            sendState();
        }
    } catch (e) {
        // 🛡️ 安全装置
        if (typeof debugChat === 'function') {
            debugChat(`❌ dropItemエラー: ${e.message}`, 'error');
        } else {
            console.error(`❌ dropItemエラー: ${e.message}`);
        }
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
// 🛠️ コマンド実行エンジン（チャットから分離）
// ==========================================
function executeAdminCommand(socket, p, text) {
    // 🔍 【コマンド1】ステータス詳細
    if (text === '/check') {
        LOG.SYS(`--- 🔍 ${p.name}の状態 ---`);
        LOG.SYS(`HP: ${p.hp}/${p.maxHp} | Lv: ${p.level} | Gold: ${p.gold}`);
        LOG.SYS(`位置: (${Math.round(p.x)}, ${Math.round(p.y)})`);
        LOG.SYS(`現在のモンスター数: ${enemies.length}体`);
        return true; // 処理完了
    }

    // 💖 【コマンド2】全回復
    if (text === '/heal') {
        p.hp = p.maxHp || 100;
        LOG.SUCCESS(`💖 ${p.name} を全回復しました！`);
        sendState();
        return true;
    }

    // 🆙 【コマンド3】レベルアップテスト
    if (text === '/level') {
        p.level += 1;
        p.maxHp += 20;
        p.hp = p.maxHp;
        LOG.SUCCESS(`🆙 テスト：Lv.${p.level} にアップ！(HP+20)`);
        sendState();
        return true;
    }

    // 💰 【コマンド4】金策テスト
    if (text === '/money') {
        p.gold = (p.gold || 0) + 1000;
        LOG.SUCCESS(`💰 テスト：1000G 付与（現在: ${p.gold}G）`);
        sendState();
        return true;
    }

    // 👹 【コマンド5】モンスター召喚
    if (text === '/spawn') {
        const newEnemy = {
            id: Date.now(),
            x: p.x + 100,
            y: p.y - 50,
            hp: 50,
            maxHp: 50,
            name: "テスト用スライム",
            type: "slime",
            alive: true,
            state: 'idle',
            vx: 0,
            vy: 0
        };
        enemies.push(newEnemy);
        LOG.SUCCESS(`👹 ${newEnemy.name} を召喚しました！`);
        io.emit('enemies_update', enemies); 
        sendState();
        return true;
    }

    // 🎁 【コマンド6】テスト用アイテムをドロップ
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
        
        if (typeof droppedItems !== 'undefined') {
            droppedItems.push(newItem);
            LOG.SUCCESS(`🎁 テスト用アイテム(100G)をドロップしました`);
            sendState();
        } else {
            LOG.ERR("アイテム管理用の変数が見つかりません");
        }
        return true;
    }

    return false; // どのコマンドにも該当しなかった
}

// ==========================================
// 🛠️ 各更新処理の定義（関数化）
// ==========================================

/**
 * 👾 敵(Enemies)の状態更新
 */
function updateEnemies() {
    enemies.forEach((e, index) => {
        try {
            // 🛡️ ガード：データ破損チェック
            if (!e || typeof e.update !== 'function') return;

            e.update(); // 動きの計算

            // ダメージ点滅タイマー
            if (e.damageTimer > 0) e.damageTimer--;

            // 攻撃アニメーション管理
            if (e.isAttacking > 0) {
                e.isAttacking--;
            } else if (e.isEnraged) {
                // 🌟 怒り状態なら1%の確率で攻撃開始
                if (Math.random() < 0.01) e.isAttacking = 22;
            }
        } catch (err) {
            console.error(`[ENEMY ERROR] index:${index}, ID:${e.id}`, err);
        }
    });
}

/**
 * 👤 プレイヤー(Players)の更新管理
 */
function updatePlayers() {
    for (let id in players) {
        const p = players[id];

        // 1. 攻撃タイマーの管理（既存ロジック）
        if (p.isAttacking > 0) {
            p.isAttacking--;
        }

        // 2. 🌟 アニメーションフレームの更新（共通カウント）
        // サーバー側では 0〜49 までをループさせます
        if (typeof p.frame === 'undefined') p.frame = 0;
        
        p.frame++;
        if (p.frame >= 50) {
            p.frame = 0;
        }

        // 💡 補足：攻撃を開始した瞬間に p.frame = 0 にリセットする処理を、
        // socket.on('attack') などの攻撃発生イベント側に入れておくと、
        // 攻撃の振り出しが全員でピタッと一致します。
    }
}

/**
 * 💎 アイテムの物理計算（サーバーとクライアントで数値を完全一致させた版）
 */
function updateItems() {
    droppedItems.forEach((it) => {
        if (!it || it.landed) return;

        // 1. 移動計算 (数値は SETTINGS から取るのがベスト)
        it.vx = it.vx || 0;
        it.vy = it.vy || 0;
        it.x += it.vx;
        it.y += it.vy;
        it.vy += 0.5;  // 重力を 0.5 に統一
        it.vx *= 0.98; // 摩擦を 0.98 に統一

        const groundY = 565; // あなたが見つけた正解の数値
        const itemSize = 32;
        const offset = 10;   // 足場判定の遊びを統一

        // 2. 地面着地
        if (it.y + itemSize > groundY && it.vy > 0) {
            it.y = groundY - itemSize;
            handleItemLanding(it, groundY); // handleItemLanding内で landed=true にする
            return;
        }

        // 3. 足場着地
        if (MAP_DATA && MAP_DATA.platforms) {
            for (const p of MAP_DATA.platforms) {
                const isInsideX = (it.x + (itemSize - offset) > p.x) && (it.x + offset < p.x + p.w);
                const isTouchingTop = (it.vy > 0 && (it.y + itemSize) >= p.y && (it.y + itemSize) <= p.y + 15);

                if (isInsideX && isTouchingTop) {
                    it.y = p.y - itemSize;
                    handleItemLanding(it, p.y);
                    return;
                }
            }
        }
    });
}

/**
 * 📐 アイテムと足場の衝突判定ロジック
 */
function checkPlatformLanding(it, p) {
    const itemRightEdge = it.x + SETTINGS.ITEM.SIZE;
    const itemLeftEdge = it.x;
    
    return (
        it.vy > 0 && 
        itemRightEdge > p.x && 
        itemLeftEdge < p.x + p.w && 
        it.y + SETTINGS.ITEM.SIZE >= p.y && 
        it.y + SETTINGS.ITEM.SIZE <= p.y + 15
    );
}

/**
 * 🔊 アイテム着地時の共通処理
 */
function handleItemLanding(it, groundY) {
    it.y = groundY - SETTINGS.ITEM.SIZE + SETTINGS.ITEM.SINK_Y;
    it.landed = true;
    it.vy = 0;
    it.vx = 0;
    io.emit('item_landed_sound');
}

// server.js の末尾など
function checkAttack(p, en) {
    const atkWidth = 80;  
    const atkHeight = 60;
    const offsetX = (p.dir === 1) ? 20 : -(atkWidth + 20);
    
    const atkBox = {
        x: p.x + offsetX,
        y: p.y - 10,
        w: atkWidth,
        h: atkHeight
    };

    const enemyY = en.y + (en.jumpY || 0);

    return (
        atkBox.x < en.x + (en.w || 40) &&
        atkBox.x + atkBox.w > en.x &&
        atkBox.y < enemyY + (en.h || 40) &&
        atkBox.y + atkBox.h > enemyY
    );
}

/**
 * 🔄 メイン更新ループ（デバッグ送信機能を含む）
 * 各エンティティの更新と、デバッグ情報の送信を一つのループで行います。
 */
setInterval(() => {
    
    // --- 1. ゲーム状態の更新処理 ---
    updateEnemies();   // 👾 敵の状態更新
    updatePlayers();   // 👤 プレイヤーのタイマー管理
    updateItems();     // 💎 落ちているアイテムの物理計算
    
    // 📡 全クライアントへ最新状態を送信
    sendState();

    // --- 2. デバッグ情報の送信処理（旧 setInterval からの統合） ---
    // どの名前でアイテムが管理されていても捕まえられるようにします
    let count = 0;
    if (typeof items !== 'undefined') {
        count = Object.keys(items).length;
    } else if (typeof allItems !== 'undefined') {
        count = Object.keys(allItems).length;
    } else if (typeof droppedItems !== 'undefined') {
        // server.js内では配列の場合があるため、安全に判定
        count = Array.isArray(droppedItems) ? droppedItems.length : Object.keys(droppedItems).length;
    }

    // プレイヤー情報が存在すれば、デバッグ用チャンネルで送信
    if (typeof players !== 'undefined') {
        io.emit('tsuchida_debug', { 
            players: players,
            itemCount: count // 捕まえたアイテム数を送る
        });
    }

}, SETTINGS.SYSTEM.TICK_RATE);

http.listen(PORT, () => console.log('Server is running...'));