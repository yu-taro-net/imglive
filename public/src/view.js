// ============================================================
// ⚙️ [SECTION 1: CONFIG] 設定・定数
// 役割: ゲーム全体のルールや見た目の数値を固定する場所
// ============================================================
const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d');

// 🌟 ここから追加：高画質化（Retina/高画素ディスプレイ対応）
const dpr = window.devicePixelRatio || 1;

const GROUP_COUNT   = 16;  // グループの総数 (00〜15)
const VAR_COUNT     = 15;  // 各グループ内のキャラ数 (01〜15)
const MAX_LOGS = 5;        // 画面に表示するログの最大数

window.isGameStarted = false;
window.hoveredItemForTooltip = null;

const VIEW_CONFIG = {
  // --- 画面の基本サイズ ---
  SCREEN_WIDTH: 800,
  SCREEN_HEIGHT: 600,

  // --- 地面と環境 ---
  groundY: 565,           // 地面の見た目上の高さ
  groundThreshold: 500,   // 地面にいると判定するしきい値(530?)
  isGroundedMargin: 5,    // 接地判定の許容誤差
  colorMapGround: '#4a3728', // 地面の土の色
  colorMapTop: '#6d4c41',    // 地面の表面の色

  // --- プレイヤーの表示設定 ---
  player: {
    baseSize: 60,         // 基本サイズ
    drawW: 300,           // 描画時の幅（旧マジックナンバー）
    drawH: 190,           // 描画時の高さ（旧マジックナンバー）
    hitboxW: 40,          // 当たり判定の幅
    hitboxH: 65,           // 当たり判定の高さ
	visualOffset: 30,       // 基本の高さ調整
    groundExtraOffset: -35  // 地面（最下層）にいる時の追加調整
  },

  // --- UI・エフェクト ---
  chatTimer: 180,         // 吹き出し表示時間
  hpBar: {
    width: 40,
    height: 5,
    offsetY: 25           //
  },
  
  playerName: {
    fontSize: "14px",
    offsetY_ground: 48,
    offsetY_air: 83,
    safeMargin: 25,    // ← 25 という数字に名前をつける
    paddingW: 10	//
  },
  
  // --- 獲得ログ ---
  log: {
    maxCount: 5,          // 最大表示数
    displayTime: 600      // 表示フレーム数
  },
  
  chat: {
    offsetY: -85,       // 吹き出しの高さ調整
    padding: 20,        // 左右の余白
    fontSize: "14px",
    backgroundColor: "rgba(255, 255, 255, 0.9)"
  },
  
  // --- 🪜 ハシゴ (Ladders) ---
  ladder: {
    width: 30,
    columnWidth: 4,
    stepInterval: 15,
    stepHeight: 3,
    colorSide: '#94a3b8',
    colorStep: '#cbd5e1'
  },
  
  // --- 👾 敵・モンスター (Enemies) ---
  enemy: {
    defaultScale: 0.2,            // 多くの敵画像（naturalWidth）にかける倍率
    deathAnimDuration: 40,        // 消滅エフェクトの総フレーム数
    commonDeathSize: { w: 135.5, h: 139 }, // 死亡エフェクトの表示サイズ
    enragedRangeX: 150,           // 激昂（怒り）判定の距離
    enragedRangeY: 100,
    hpBar: {
      height: 6,
      offsetY: -12,               // 敵の頭上からの位置
      colorHigh: "#22c55e",       // 緑
      colorMid: "#facc15",        // 黄
      colorLow: "#ef4444"         // 赤
    }
  },
  
  // --- 💰 アイテム (Items) ---
  item: {
    drawSize: 32,                 // 地面に落ちている時の表示サイズ
    floatSpeed: 0.05,             // 浮遊アニメの周期速度
    floatAmplitude: 12,           // 浮遊で上下に揺れる幅
    groundOffset: 20              // 地面(groundY)から浮かせる高さ
  },
  
  // --- 💥 ダメージテキスト (Damage Texts) ---
  damageText: {
    fontSize: "bold 20px sans-serif",
    duration: 40,
    colorPlayerHit: "#ff4444",
    colorCritical: "#fbbf24",
    colorDefault: "white"
  },
  
  // --- ✨ 吸い込みエフェクト (Pickup Effects) ---
  pickupEffect: {
    duration: 25,                 // 飛んでいく時間
    size: 30,                     // 飛んでいる時の画像サイズ
    arcHeight: 50                 // 放物線の頂点の高さ調整
  },
  
  // --- 📊 メインUI (Main Player Status UI) ---
  ui: {
    paddingX: 20,           // ✨ 追加：左端からの余白
    paddingY: 40,           // ✨ 追加：上端からの余白
    panelW: 160,            // ✨ 追加：背景パネルの幅
    panelH: 55,             // ✨ 追加：背景パネルの高さ
    borderRadius: 10,       // ✨ 追加：角の丸み
    panelColor: "rgba(15, 23, 42, 0.8)",
    hpBarWidth: 160,
    hpBarHeight: 16,
    hpEaseSpeed: 0.5,
    expBarWidth: 200,
    expBarHeight: 12,
    expBarColor: "#ffcc00",
    inventoryPanelPos: { x: 550, y: 555, w: 240, h: 35 }
  },
  
  // 👣 足元の高さ調整
  groupOffsets: {
    0:  -4, // あひる
    1:  -3, // あらいぐま
    2:  -4, // いぬ
    3:  -5, // うさぎ
    4:  -3, // カピバラ
    5:  -3, // きのこ
    6:  -6, // くま
    7:  -7, // コアラ
    8:   0, // ねこ
    9:  -8, // パンダ
    10: -3, // ビーバー
    11: -6, // ひよこ
    12: -5, // ぶた
    13:  0, // ペンギン
    14: -1, // ラクーン
    15: -3,  // りす
	// 👾 モンスター（ここに追加！）
    'monster1': -7,
    'monster3': -60,
    'monster5': -65,
    'tier1_1': -30, // 意味がないみたい
    'tier1_2': -30,
    'tier1_3': -30
  },
  
  // 🏃 アニメーション枚数
  actionFrames: {
    "Dead":     45, 
    "Fly":      20, 
    "Hit":      50, 
    "Idle":     20, 
    "Jump":     20, 
    //"Roll":     0, // 8
    "Stuned":   24, 
    "Throwing": 0, // 40
    "Walk":     20
  },
  
  // 🛠️ 開発・デバッグ用設定（ここに追加）
  debug: {
    onlyLoadSpecificChar: true, // 特定のキャラだけ読み込むかどうかのスイッチ
    //targetGroup: 0,             // あひるグループ
    //targetVar: 1                // 特定のバリエーション
  },
};

// アクション名だけのリストを作成 ( ["Dead", "Fly", ... ] )
const ACTIONS = Object.keys(VIEW_CONFIG.actionFrames);

// Before: canvas.width = 800 * dpr;
canvas.width = VIEW_CONFIG.SCREEN_WIDTH * dpr;
// Before: canvas.height = 600 * dpr;
canvas.height = VIEW_CONFIG.SCREEN_HEIGHT * dpr;
// Before: canvas.style.width = '800px';
canvas.style.width = VIEW_CONFIG.SCREEN_WIDTH + 'px';
// Before: canvas.style.height = '600px';
canvas.style.height = VIEW_CONFIG.SCREEN_HEIGHT + 'px';
ctx.scale(dpr, dpr);       // 描画全体を拡大して帳尻を合わせる

// ✨ ドット絵をくっきりさせる設定
// canvas.width を変えるとリセットされることがあるので、最後に1回書く
ctx.imageSmoothingEnabled = false;

// --- 🌟 キーとウィンドウIDのマッピング定義 ---
const keyMap = {
	's': 'status',      'e': 'equipment', 'i': 'inventory', 
	'k': 'skill',       'q': 'quest',     'w': 'worldmap', 
	'm': 'minimap',     'g': 'guild',     'o': 'options', 
	'h': 'help',        'f': 'friend',    'p': 'party', 
	'b': 'book',        'l': 'log',       'n': 'event', 
	'u': 'upgrade',     't': 'trade',     'j': 'journal', 
	'a': 'avatar',      'd': 'reserved_d','v': 'reserved_v'
	// 'extra' は特定のキー割り当てがないため、必要に応じてここに追加可能です
};

const DAMAGE_ASSETS = {
    '0': IMAGE_DOMAIN + 'damage_assets/00.png',
    '1': IMAGE_DOMAIN + 'damage_assets/01.png',
    '2': IMAGE_DOMAIN + 'damage_assets/02.png',
    '3': IMAGE_DOMAIN + 'damage_assets/03.png',
    '4': IMAGE_DOMAIN + 'damage_assets/04.png',
    '5': IMAGE_DOMAIN + 'damage_assets/05.png',
    '6': IMAGE_DOMAIN + 'damage_assets/06.png',
    '7': IMAGE_DOMAIN + 'damage_assets/07.png',
    '8': IMAGE_DOMAIN + 'damage_assets/08.png',
    '9': IMAGE_DOMAIN + 'damage_assets/09.png'
};

const DAMAGE_ASSETS1 = {
    '0': IMAGE_DOMAIN + 'damage_assets/10.png',
    '1': IMAGE_DOMAIN + 'damage_assets/11.png',
    '2': IMAGE_DOMAIN + 'damage_assets/12.png',
    '3': IMAGE_DOMAIN + 'damage_assets/13.png',
    '4': IMAGE_DOMAIN + 'damage_assets/14.png',
    '5': IMAGE_DOMAIN + 'damage_assets/15.png',
    '6': IMAGE_DOMAIN + 'damage_assets/16.png',
    '7': IMAGE_DOMAIN + 'damage_assets/17.png',
    '8': IMAGE_DOMAIN + 'damage_assets/18.png',
    '9': IMAGE_DOMAIN + 'damage_assets/19.png'
};

let imageSources = {};
let itemImages = {};

// ============================================================
// :::SOCKET_ON_INIT_ITEM_IMAGES::: 🎁 アイテム画像アセットの初期化とプリロード
// ============================================================
/**
 * 役割：
 * - サーバーから全アイテム画像のリスト（imageSources）を受信
 * - 実行環境に応じたベースパスの自動切り替え（ローカル vs imglive.net）
 * - CORS対策（crossOrigin）を施した画像オブジェクトの生成
 * - ブラウザへの画像キャッシュ（プリロード）の実行
 * - 読み込み成否のログ出力（デバッグ用）
 */
socket.on('init_item_images', (data) => {
    console.log("📩 サーバーから届いた生データ:", data);
    imageSources = data; 

    // 💻 ローカル環境（PC内開発）かどうかの判定フラグ
    const IS_LOCAL = (
        window.location.hostname === "localhost" || 
        window.location.hostname === "127.0.0.1" ||
        window.location.protocol === "file:"
    );

    // 🌐 どちらのサイトから開いても、アセットの取得先は「imglive.net」に固定する！
    const ASSET_BASE = IS_LOCAL 
        ? "" 
        : "https://imglive.net"; // 💡 ここを imglive.net に固定

    for (let key in data) {
        const img = new Image();
        img.crossOrigin = "anonymous"; // 🌟 imglive.net から画像を引っ張ってくるために必須（CORS対策）
        
        let path = data[key]; // 例: "/item_assets/sword.png"
        
        if (ASSET_BASE !== "") {
            // 先頭のスラッシュ重複や欠落を綺麗に整形して結合
            if (!path.startsWith('/')) {
                path = '/' + path;
            }
            img.src = ASSET_BASE + path; // 結果: https://imglive.net/item_assets/sword.png
        } else {
            img.src = path;
        }
        
        itemImages[key] = img;
        
        img.onload = () => console.log(`🖼️ アイテム画像読み込み成功: ${key} -> ${img.src}`);
        img.onerror = () => console.error(`❌ アイテム画像読み込み失敗: ${img.src}`);
    }
});

/*
const imageSources = {
    'gold': '/item_assets/gold.png',
    'sword': '/item_assets/sword.png',
    'shield': '/item_assets/shield.png',
    'treasure': '/item_assets/treasure.png',
    'sweets': '/item_assets/sweets.png',
    'money3': '/item_assets/money3.png',
    'money1': '/item_assets/money1.png'
};

for (const key in imageSources) {
    const img = new Image();
    img.src = imageSources[key];
    itemImages[key] = img;
    
    // 🐞 確認用：もし画像が届かなかったらコンソールに通知
    img.onerror = () => console.error(`⚠️ 画像が見つかりません: ${img.src}`);
}
*/

let itemCategories = {}; 

// ============================================================
// :::SOCKET_ON_INIT_ITEM_CATEGORIES::: 🎁 アイテムカテゴリ定義の同期
// ============================================================
/**
 * 役割：
 * - サーバーからアイテムのカテゴリ判別ルール（辞書データ）を受信
 * - クライアント側の分類テーブル（itemCategories）へ適用
 * - 同期完了のログ出力（受信件数の確認）
 */
socket.on('init_item_categories', (data) => {
    itemCategories = data;
    console.log("✅ カテゴリ判別ルールを同期しました:", Object.keys(itemCategories).length, "件");
});

/*
const itemCategories = {
    "gold": "ETC",
    "treasure": "ETC",
    "sweets": "USE", // 消耗品
    "sword": "EQUIP",      // 装備
    "shield": "EQUIP"      // 装備
};
*/

let itemDescriptions = {}; // 解説文用

// ============================================================
// :::SOCKET_ON_INIT_ITEM_DESCRIPTIONS::: 📝 アイテム解説文の同期
// ============================================================
/**
 * 役割：
 * - サーバーからアイテムの解説文データを受信
 * - 解説文テーブル（itemDescriptions）への格納
 * - 同期完了の通知（デバッグログ）
 */
socket.on('init_item_descriptions', (data) => {
    itemDescriptions = data;
    console.log("✅ 解説文同期完了");
});

// 🌟 アイテムの解説文（ここに追加するだけ！）
/*
const itemDescriptions = {
    'gold': 'ずっしりと重い純金の塊。換金用。',
    'treasure': '古びた宝箱から見つかった秘宝。',
    'sweets': '食べると疲れが吹き飛ぶ甘いお菓子。',
    'money1': '使い古された銅貨。',
    'money3': 'キラキラと輝く銀貨。'
};
*/

const STAT_NAMES = {
    str: "STR", dex: "DEX", int: "INT", luk: "LUK",
    maxHp: "最大HP", maxMp: "最大MP",
    atk: "攻撃力", matk: "魔力", def: "防御力",
    moveSpeed: "移動速度", jumpPower: "ジャンプ力"
};

// view.js
let ITEM_CONFIG = {}; // 📋 最初は空。サーバーから届いた瞬間に「あのリスト」に変身します

// ============================================================
// :::SOCKET_ON_INIT_ITEM_CONFIG::: ⚙️ アイテム設定（設計図）の同期とロード
// ============================================================
/**
 * 役割：
 * - サーバーからアイテムの全定義データを受信
 * - グローバルなアイテム設定（ITEM_CONFIG）を更新し、世界ルールを統一
 * - 画像プリロード処理（loadItemImages）のトリガー実行
 * - 設定内容のデバッグログ出力（グループ化表示）
 */
socket.on('init_item_config', (data) => {
    if (!data) return;

    // 🌟 サーバーから届いたデータを代入。これで手書きリストと全く同じになります
    ITEM_CONFIG = data;

    // 🌟 画像の読み込みも忘れずに実行！
    if (typeof loadItemImages === 'function') {
        loadItemImages();
    }

    // デバッグログ
    console.group("🔍 ITEM_CONFIG 同期完了");
    console.log("同期された中身:", ITEM_CONFIG);
    console.groupEnd();
});

// ==========================================
// ⚙️ 設定・フラグ（ここを false にするとデバッグ表示が消えます）
// ==========================================
let DEBUG_MODE = false; 

// ============================================================
// 📊 [SECTION 2: STATE] データ・変数
// 役割: 「今」のゲームの状態を保持する場所（※将来SQLと同期）
// ============================================================
let mouseX = 0;
let mouseY = 0;
let currentTab = "status";
let selectedSlotIndex = -1;
let inventoryVisualBuffer = [];
let levelUpEffects = [];
let isDiscarding = false;

let displayExp = 0; // 🌟 経験値をなめらかに表示するための変数
let displayHp = 0;  // 🌟 追加：なめらか表示用のHP変数
let lastExp = 0; // 🌟 これを書き足す：前回の経験値を覚えておくための変数
let recentlyPickedIds = new Set();

const damageImages = {};
let loadedCount = 0;

const playerSprites = [];  // 画像データを格納する箱
// 🌟 現在選択中のキャラクター（ここを書き換えてキャラ変更）
let selectedGroup   = 7;   // 現在のグループ
let selectedCharVar = 1;   // 現在のキャラクター番号

let itemLogs   = [];       // 獲得アイテムの履歴
let chatMessages = [];
let pickingUpEffects = []; // 🌟 吸い込まれるアニメーションを管理するリスト

// view.js の一番上のほうに記述
window.lastReceivedTime = Date.now();
window.isDisconnected = false;

// ============================================================
// :::CLASS_GAME_WINDOW::: 🖥️ GUIウィンドウの構造と操作判定
// ============================================================
/**
 * 役割：
 * - ウィンドウの座標（x, y）とサイズ（w, h）の保持
 * - ドラッグ移動状態（isDragging）の管理
 * - マウス操作の領域判定
 * - 閉じるボタン（isMouseOverClose）
 * - 移動用ヘッダー（isMouseOverHeader）
 * - ウィンドウ全体（isMouseOverWindow）
 */
class GameWindow {
    constructor(id, x, y, w, h) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.isOpen = false;
        this.isDragging = false;
        this.dragOffsetX = 0;
        this.dragOffsetY = 0;
    }

    // 閉じるボタンの判定
    isMouseOverClose(mx, my) {
        const btnX = this.x + this.w - 25;
        const btnY = this.y + 5;
        return mx >= btnX && mx <= btnX + 25 && my >= btnY && my <= btnY + 25;
    }

    // ヘッダー（移動用）の判定
    isMouseOverHeader(mx, my) {
        return mx >= this.x && mx <= this.x + this.w && my >= this.y && my <= this.y + 30;
    }

    // ウィンドウ全体の判定
    isMouseOverWindow(mx, my) {
        return mx >= this.x && mx <= this.x + this.w && my >= this.y && my <= this.y + this.h;
    }
}

// ============================================================
// :::GAME_WINDOWS_INIT::: 🖥️ 全GUIウィンドウの初期化とレイアウト定義
// ============================================================
/**
 * 役割：
 * - GameWindowクラスによる全画面UIインスタンスの生成
 * - 各ウィンドウの識別ID、初期座標(x, y)、サイズ(w, h)の管理
 * - カテゴリごとの構造化（ステータス、冒険、ソーシャル、システム）
 * - 将来的な拡張のための予約枠(reserved)の確保
 */
const gameWindows = {
    
	extra: new GameWindow("extra", 200, 200, 300, 200),
	
    // --- メインステータス・成長系 ---
    status:     new GameWindow("status", 50, 50, 300, 250),      // [S] ステータス
    equipment:  new GameWindow("equipment", 360, 50, 280, 320),   // [E] 装備
    inventory:  new GameWindow("inventory", 520, 150, 260, 380),  // [I] インベントリ
    skill:      new GameWindow("skill", 480, 100, 280, 400),      // [K] スキル
    avatar:     new GameWindow("avatar", 380, 70, 280, 320),     // [A] アバター
    upgrade:    new GameWindow("upgrade", 250, 150, 300, 350),   // [U] アップグレード
    
    // --- 冒険・ナビゲーション系 ---
    quest:      new GameWindow("quest", 100, 120, 350, 400),     // [Q] クエスト
    worldmap:   new GameWindow("worldmap", 50, 50, 700, 500),    // [W] ワールドマップ
    minimap:    new GameWindow("minimap", 10, 10, 200, 180),     // [M] ミニマップ
    journal:    new GameWindow("journal", 150, 100, 400, 450),   // [J] 日記
    book:       new GameWindow("book", 120, 80, 500, 400),        // [B] ブック
    
    // --- ソーシャル・コミュニティ系 ---
    guild:      new GameWindow("guild", 200, 100, 400, 450),     // [G] ギルド
    friend:     new GameWindow("friend", 550, 200, 220, 350),    // [F] フレンドリスト
    party:      new GameWindow("party", 550, 200, 220, 300),     // [P] パーティ
    trade:      new GameWindow("trade", 150, 150, 500, 300),     // [T] トレード
    
    // --- システム・ログ・通知系 ---
    log:        new GameWindow("log", 10, 400, 450, 150),        // [L] ログ
    event:      new GameWindow("event", 200, 50, 400, 500),      // [N] イベント
    options:    new GameWindow("options", 250, 180, 300, 250),   // [O] オプション
    help:       new GameWindow("help", 200, 150, 400, 350),      // [H] ヘルプ
    
    // --- 戦略的予約枠（未来の目玉用） ---
    reserved_d: new GameWindow("reserved_d", 100, 100, 300, 300), // [D] あえて開けておく
    reserved_v: new GameWindow("reserved_v", 100, 100, 300, 300)  // [V] あえて開けておく
};

// --- 1. 全ウィンドウスタック（Z-Index管理） ---
// 全てのIDをあらかじめ格納。後ろにあるほど手前。
// 初期状態では、常に表示しておきたい「log」や「minimap」を先頭（後ろ側）に置いています。
let windowStack = [
    "reserved_v", "reserved_d", "help", "options", "event", "log",
    "trade", "party", "friend", "guild", "book", "journal",
    "minimap", "worldmap", "quest", "upgrade", "avatar", "skill",
    "extra", "status", "equipment", "inventory" 
];

// ============================================================
// 🔊 [SECTION 3: RESOURCES] 素材・アセット
// 役割: 画像(Sprite)や音声(Sound)の読み込みと管理
// ============================================================
// ============================================================
// :::SPRITES_COLLECTION::: 🎨 ゲーム描画素材の保管庫（スプライト管理）
// ============================================================
/**
 * 役割：
 * - プレイヤーの全身、待機、歩行、跳躍、被ダメージ、攻撃、登り等の全アニメーション画像配列の保持
 * - アイテム描画用スプライトの動的格納庫（itemsオブジェクト）の定義
 */
const sprites = {
    // 👤 プレイヤー関連は今まで通り
    playerBody: new Image(),
    playerIdle: [], playerWalk: [], playerJump: [], playerDamage: [], 
    playerAttack1: [], playerAttack2: new Image(),
    playerClimb: [new Image(), new Image(), new Image(), new Image()],
    playerDown: new Image(),

    // 💰 アイテム箱（空っぽで準備）
    items: {}
};

let MONSTER_CONFIGS = []; // 最初は空。サーバーから受け取る

// ============================================================
// :::SOCKET_ON_INIT_MONSTER_CONFIGS::: 👹 モンスター設定の同期と戦闘準備
// ============================================================
/**
 * 役割：
 * - サーバーからモンスターの定義データ（ステータス、挙動等）を受信
 * - モンスター設定（MONSTER_CONFIGS）の更新による世界ルールの一致
 * - 静的画像（loadStaticImages）の読み込みのキック
 * - モンスターアニメーション等のロードトリガー（必要に応じて拡張）
 * - 同期完了のログ出力（件数の確認）
 */
socket.on('init_monster_configs', (data) => {
    if (!data) return;

    // 1. データを上書き
    MONSTER_CONFIGS = data;
	
	loadStaticImages();

    // 2. 🌟 モンスターの画像を読み込む関数があれば、ここで実行
    // 例: if (typeof loadMonsterSprites === 'function') loadMonsterSprites();

    console.log("✅ MONSTER_CONFIGS をサーバーと同期しました:", MONSTER_CONFIGS.length, "件");
});

// ============================================================
// :::MONSTER_SPRITES_GENERATOR::: 👹 モンスター用スプライト枠の自動生成
// ============================================================
/**
 * 役割：
 * - モンスター名簿（MONSTER_CONFIGS）に基づき、各モンスター用の画像オブジェクトを生成
 * - アニメーションに必要な枚数分（move, idle, attack等）の空配列を動的確保
 * - sprites保管庫への名前付きマッピング
 */
MONSTER_CONFIGS.forEach(m => {
    // 基本・ダメージ
    sprites[m.name] = new Image();
    sprites[m.name + 'Damage'] = new Image();

    // アニメーション用の配列を自動作成
    // (名簿に枚数が書いてあればその分だけ、なければ空の配列を作ります)
    sprites[m.name + 'Move']   = Array.from({ length: m.move  || 0 }, () => new Image());
    sprites[m.name + 'Idle']   = Array.from({ length: m.idle  || 0 }, () => new Image());
    sprites[m.name + 'Death']  = Array.from({ length: m.death || 0 }, () => new Image());
    
    // 🌟 追加分：Attack, Jump, Walk
    sprites[m.name + 'Attack'] = Array.from({ length: m.attack || 0 }, () => new Image());
    sprites[m.name + 'Jump']   = Array.from({ length: m.jump   || 0 }, () => new Image());
    sprites[m.name + 'Walk']   = Array.from({ length: m.walk   || 0 }, () => new Image());
});

// ============================================================
// :::DAMAGE_ASSETS_LOADER::: 💥 ダメージスキン用数字画像の読み込み
// ============================================================
/**
 * 役割：
 * - ダメージスキン名簿（DAMAGE_ASSETS）に基づき、各数字画像を読み込み
 * - すべての画像（全10種）が揃ったことを検知し完了ログを出力
 * - 完了後の画像オブジェクトを damageImages へマップ（例: damageImages['1']）
 */
Object.keys(DAMAGE_ASSETS).forEach(num => {
    const img = new Image();
    img.src = DAMAGE_ASSETS[num];
    img.onload = () => {
        loadedCount++;
        if (loadedCount === 10) {
            console.log("✅ ダメージスキン（全数字）読み込み完了");
        }
    };
    damageImages[num] = img; // damageImages['1'] で 01.png が呼び出せるようになる
});

/**
 * 🖼️ モンスター画像および静的リソースの読み込み
 * ご提示いただいたロジックを崩さず、エラー回避処理を追加しています。
 */
/*
function loadStaticImages() {
    // --- 💰 アイテム専用の読み込みエリア ---
    //if (typeof loadItemImages === 'function') loadItemImages();
	
	// 🛡️ 読み込みたいモンスターの ID リスト
    const allowedIds = ["Char01", "Char02", "Char03", "Char10", "Char13", "Char16", "Char19"];

    // MONSTER_CONFIGS が空の場合は実行しない
    if (!MONSTER_CONFIGS || MONSTER_CONFIGS.length === 0) return;

    MONSTER_CONFIGS.forEach(m => {
	    // 門番：リストに含まれていない ID なら無視
        if (!allowedIds.includes(m.id)) {
            return;
        }

        const basePath = `/char_assets_enemy/${m.id}`;
        const fName = 'skeleton';

        // --- 🚶 Walk (移動) ---
        // 🌟 修正：まず配列を初期化してから画像を push する
        sprites[m.name + 'Walk'] = [];
        for (let i = 0; i < (m.walk || 0); i++) {
            const img = new Image();
            img.src = `${basePath}/Walk/${fName}-Walk_${i}.png`;
            sprites[m.name + 'Walk'].push(img);
        }

        // --- ⚔️ Attack (攻撃) ---
        sprites[m.name + 'Attack'] = [];
        for (let i = 0; i < (m.attack || 0); i++) {
            const img = new Image();
            img.src = `${basePath}/Attack/${fName}-Attack_${i}.png`;
            sprites[m.name + 'Attack'].push(img);
        }

        // --- 💤 Idle (待機) ---
        sprites[m.name + 'Idle'] = [];
        for (let i = 0; i < (m.idle || 0); i++) {
            const img = new Image();
            img.src = `${basePath}/Idle/${fName}-Idle_${i}.png`;
            sprites[m.name + 'Idle'].push(img);
        }

        // --- 🦘 Jump (ジャンプ) ---
        sprites[m.name + 'Jump'] = [];
        for (let i = 0; i < (m.jump || 0); i++) {
            const img = new Image();
            img.src = `${basePath}/Jump/${fName}-Jump_${i}.png`;
            sprites[m.name + 'Jump'].push(img);
        }

        // --- 💀 Death (死亡) ---
        sprites[m.name + 'Death'] = [];
        for (let i = 0; i < (m.death || 0); i++) {
            const img = new Image();
            img.src = `${basePath}/Dead/${fName}-Dead_${i}.png`;
            sprites[m.name + 'Death'].push(img);
        }

        // ダメージ等の単体画像（描画ロジックに合わせて配列化）
        const baseImg = new Image();
        baseImg.src = `${basePath}/${fName}-Idle_0.png`;
        sprites[m.name] = [baseImg]; 

        const damageImg = new Image();
        damageImg.src = `${basePath}/Idle/${fName}-Idle_0.png`;
        sprites[m.name + 'Damage'] = [damageImg];
    });
	
	// --- 💀 共通の死亡エフェクト (DeathFx) ---
    sprites["commonDeath"] = [];
    for (let i = 0; i < 18; i++) {
        const img = new Image();
        img.src = `/char_assets_enemy/DeathFx/skeleton-animation_${i}.png`;
        sprites["commonDeath"].push(img);
    }
}
*/

// ============================================================
// :::UTIL_GET_BOTTOM_TRANSPARENT_PADDING::: 🖼️ 画像の足元余白（透明ピクセル）自動計測
// ============================================================
/**
 * 役割：
 * - Canvasを用いて画像の実体（非透明部分）をピクセル走査
 * - キャラクターの画像下端から、不透明ドットに当たるまでの余白量を算出
 * - 描画時にこの値を加味することで、足元が地面にしっかり接地するように補正
 * * 🌟 修正：manualOffset 引数を追加（正の値でより深く埋まり、負の値で浮きます）
 */
function getBottomTransparentPadding(img, manualOffset = 0) {
    try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        // 画像のピクセルデータを取得
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        let paddingY = 0;

        // 一番下の行から、上に向かって透明な行（余白）が何ピクセルあるかカウント
        for (let y = img.height - 1; y >= 0; y--) {
            let isRowEmpty = true;
            for (let x = 0; x < img.width; x++) {
                // アルファ値（不透明度）が0より大きい＝ドットが存在する
                const alpha = imgData[((y * img.width) + x) * 4 + 3];
                if (alpha > 0) { 
                    isRowEmpty = false; 
                    break; 
                }
            }
            if (isRowEmpty) { 
                paddingY++; 
            } else { 
                break; // キャラクターの足元にぶつかったら終了
            }
        }
        
        // 🌟 自動計測値に手動のオフセットを加算して返す
        return paddingY + manualOffset;
        
    } catch (e) {
        // 万が一エラーが起きてもゲームが止まらないように安全弁を用意
        return 0;
    }
}

// ============================================================
// :::LOAD_STATIC_IMAGES::: 🖼️ 全キャラクター・モンスター素材のロードと整地
// ============================================================
/**
 * 役割：
 * - MONSTER_CONFIGS を元に、キャラクター・敵のアセットを動的ロード
 * - Monster系(tile000.png形式)とChar系(skeleton-Name_0.png形式)のパス自動生成
 * - アニメーション枚数の動的決定（DB設定値の優先参照）
 * - 画像読み込み時の「足元透明余白」自動計測と記憶
 * - 共通エフェクト（deathFx）の初期化
 */
function loadStaticImages() {
    // 🌟 許可するID（Charシリーズは明示、Monsterシリーズは一括判定へ）
    const allowedCharIds = ["Char01", "Char02", "Char03", "Char10", "Char13", "Char16", "Char19"];

    if (!MONSTER_CONFIGS || MONSTER_CONFIGS.length === 0) return;

    MONSTER_CONFIGS.forEach(m => {
        // 🌟 "Monster" で始まるID、もしくは allowedCharIds に含まれる場合のみ読み込む
        let isMonsterType = m.id.startsWith("Monster");
        if (!isMonsterType && !allowedCharIds.includes(m.id)) return;

        const basePath = `${IMAGE_DOMAIN}char_assets_enemy/${m.id}`;
        
        // 🌟 ファイル名の接頭辞切り替え
        let fName = isMonsterType ? "tile" : "skeleton";

        // --- 各アクションの読み込みヘルパー関数 ---
        const loadSet = (actionName, folderName, fileSuffix) => {
            const key = m.name + actionName;
            sprites[key] = [];
            
            let count = 0;

            // 🌟 枚数の決定ロジック
            if (m.id === "Monster1") {
                // Monster1 は個別指定を維持
                if (actionName === 'Idle')   count = 27;
                if (actionName === 'Walk')   count = 20;
                if (actionName === 'Attack') count = 17;
                if (actionName === 'Death')  count = 27;
                if (actionName === 'Jump')   count = 0;
            } else {
                // 🌟 その他のMonsterおよびCharシリーズ：DB設定値を優先参照
                const lowerName = actionName.toLowerCase(); 
                const dbColName = "anim_" + lowerName;      
                
                count = m[dbColName] || m[lowerName] || 0;
            }

            for (let i = 0; i < count; i++) {
                const img = new Image();
                // 🌟 画像のドットデータを安全に読み取るためにCORS制限を解除
                img.crossOrigin = "anonymous"; 

                let fullPath;
                
                if (isMonsterType) {
                    // 👾 Monster系：tile000.png 形式
                    const num = String(i).padStart(3, '0');
                    fullPath = `${basePath}/${folderName}/${fName}${num}.png`;
                } else {
                    // 👤 Char系：skeleton-Attack_0.png 形式
                    fullPath = `${basePath}/${folderName}/${fName}-${fileSuffix}_${i}.png`;
                }
                
                img.src = fullPath;

                // 💡 画像がロードされた瞬間に、1回だけ足元の余白を測って記憶させる
                img.onload = () => {
                    img.autoPaddingY = getBottomTransparentPadding(img, 10);
                };

                sprites[key].push(img);
            }
        };

        // --- 実行（元の形式を維持） ---
        loadSet('Walk',   'Walk', 'Walk');
        loadSet('Attack', 'Attack', 'Attack');
        loadSet('Idle',   'Idle', 'Idle');
        loadSet('Jump',   'Jump', 'Jump');
        loadSet('Death',  'Death', 'Death'); 

        // ダメージ等の単体画像
        const idleKey = isMonsterType ? 'tile000' : `${fName}-Idle_0`;
        const baseImg = new Image();
        baseImg.src = `${basePath}/Idle/${idleKey}.png`;
        sprites[m.name] = [baseImg]; 

        const damageImg = new Image();
        damageImg.src = `${basePath}/Idle/${idleKey}.png`;
        sprites[m.name + 'Damage'] = [damageImg];
    });

    // --- 共通エフェクト ---
    sprites["commonDeath"] = [];
    for (let i = 0; i < 18; i++) {
        const img = new Image();
        img.src = `${IMAGE_DOMAIN}char_assets_enemy/DeathFx/skeleton-animation_${i}.png`;
        sprites["commonDeath"].push(img);
    }
}

//loadStaticImages();

// ============================================================
// :::LOAD_ITEM_IMAGES::: 🛡️ アイテム素材のロードと画像オブジェクト生成
// ============================================================
/**
 * 役割：
 * - ITEM_CONFIGに基づき、各アイテムの画像URLを構築（本番環境ドメインへの合流）
 * - アニメーションタイプ(isAnimated)と単体画像タイプの自動分岐
 * - 全画像への CORS対策(crossOrigin="anonymous") の適用
 * - アイテムの画像パス未指定時のスキップ処理（安全性向上）
 */
function loadItemImages() {
    Object.keys(ITEM_CONFIG).forEach(key => {
        const conf = ITEM_CONFIG[key];

        // 🛡️ 修正ポイント：srcが空、または画像が指定されていない場合は何もしない
        if (!conf || !conf.src || conf.src === "") {
            console.log(`Skipping: ${key} (No image path specified)`);
            return; // このアイテムの読み込みを飛ばす
        }

        // 🌐 【追加】本番環境（imglive.net）のURLを正しくガッチャンコする処理
        let baseSrc = conf.src;
        if (typeof IMAGE_DOMAIN !== 'undefined' && IMAGE_DOMAIN !== "") {
            // IMAGE_DOMAIN の末尾と conf.src の先頭でスラッシュ「/」が重複するのを防ぐ
            if (baseSrc.startsWith('/') && IMAGE_DOMAIN.endsWith('/')) {
                baseSrc = baseSrc.substring(1);
            }
            baseSrc = IMAGE_DOMAIN + baseSrc;
        }

        if (conf.isAnimated) {
            // アニメーション用
            sprites.items[key] = Array.from({ length: 10 }, (_, i) => {
                const img = new Image();
                img.crossOrigin = "anonymous"; // 🌟 imgtop.net から imglive.net の画像を描画するためのCORS対策
                img.src = `${baseSrc}${i + 1}.png`;
                return img;
            });
        } else {
            // 単体画像
            sprites.items[key] = new Image();
            sprites.items[key].crossOrigin = "anonymous"; // 🌟 imgtop.net から imglive.net の画像を描画するためのCORS対策
            sprites.items[key].src = baseSrc;
        }
    });
}

// ============================================================
// :::PLAYER_SPRITES_INITIALIZER::: 👤 プレイヤー用スプライト配列の初期化
// ============================================================
/**
 * 役割：
 * - 16個のグループ（g）と、各グループ内にある15個のバリエーション（v）を確保
 * - 未読み込み状態を示すために初期値を `null` に設定
 * - この後、画像データをロードしてここに格納する準備を整える
 */
for (let g = 0; g < 16; g++) {
    playerSprites[g] = [];
    for (let v = 1; v <= 15; v++) {
        playerSprites[g][v] = null; // まだ中身は空っぽ
    }
}

// ============================================================
// :::LOAD_CHAR_FRAMES::: 🏃 プレイヤーキャラクター全フレームのロード
// ============================================================
/**
 * 役割：
 * - 特定のグループ・キャラ番号に基づき、全アニメーションのアセットパスを生成
 * - `IMAGE_DOMAIN` を用いたサーバーからの画像リクエスト
 * - 画像ロード完了時の `playerSprites` への動的格納
 * - デバッグ用の読み込み成否ログおよびロード済みチェックによる重複防止
 */
function loadCharFrames(groupIndex, variantIndex) {
    // 🛡️ 引数が未定義の場合のデフォルト値（00/01）
    if (groupIndex === undefined) groupIndex = 0;
    if (variantIndex === undefined) variantIndex = 1;

    // 🛡️ 設定を見て、読み込みを制限するか決める
	/*
    if (VIEW_CONFIG.debug.onlyLoadSpecificChar) {
        if (groupIndex !== selectedGroup || 
            variantIndex !== selectedCharVar) {
            console.warn(`⚠️ 読み込みスキップ: デバッグ設定により (${groupIndex}/${variantIndex}) は除外されました`);
            return; 
        }
    }
	*/

    // 1. 🛑 異常な数値や読み込み済みチェック
    if (groupIndex < 0 || variantIndex < 1) return;
    
    if (!playerSprites[groupIndex]) playerSprites[groupIndex] = {};
    if (playerSprites[groupIndex][variantIndex] && Object.keys(playerSprites[groupIndex][variantIndex]).length > 0) return;

    // 2. 📂 フォルダ名の準備 (00, 01 のように2桁に揃える)
    playerSprites[groupIndex][variantIndex] = {};
    const groupNum = String(groupIndex).padStart(2, '0');
    const varNum = String(variantIndex).padStart(2, '0');

    // 3. 🏃 各アクションごとに画像を検索
    ACTIONS.forEach(action => {
        playerSprites[groupIndex][variantIndex][action] = [];
        const maxFrames = VIEW_CONFIG.actionFrames[action] || 1;
        
        if (maxFrames <= 0) return;

        for (let i = 0; i < maxFrames; i++) {
            const img = new Image();
            const frameNum = String(i).padStart(2, '0');
            
            // 🖼️ 修正：数値だけの階層パス（group_ / Character プレフィックスを削除）
            // 結果：char_assets/00/01/Idle/Characters-Character01-Idle_00.png
            img.src = `${IMAGE_DOMAIN}char_assets/${groupNum}/${varNum}/${action}/Characters-Character${varNum}-${action}_${frameNum}.png`;

            // 成功時
            img.onload = () => {
                playerSprites[groupIndex][variantIndex][action][i] = img; 
            };
            
            // 失敗時（デバッグ用にエラーを表示）
            img.onerror = () => {
                console.error(`❌ 画像が見つかりません: ${img.src}`);
            };
        }
    });
    
    console.log(`✅ グループ${groupNum} キャラ${varNum} の読み込みを開始しました`);
}

// ============================================================
// 🧠 [SECTION 4: LOGIC] 判定・共通計算
// 役割: 「正しい操作か？」のチェックや複雑な座標計算の関数
// ============================================================
let lastItemCount = 0;
let lastEnemiesHP = 0;
let lastEnemiesData = [];
let lastItemsData = []; // ✨ 前回のアイテム状態を保持

const getWin = (key) => gameWindows[key];
// ============================================================
// :::ANIM_UTILS::: 🎞️ アニメーション制御用ユーティリティ
// ============================================================
/**
 * 役割：
 * - getIdx: フレームカウンタから現在の表示すべき画像番号を算出（循環計算）
 * - clampIdx: 指定インデックスを配列範囲内に安全に収める
 * - getFrame: 画像が未ロード/空の場合に備え、予備画像(fallback)を返す安全な取得関数
 */
const AnimUtils = {
    /**
     * 現在のフレームから、アニメーションの「何番目の画像か」を計算する
     * @param {number} frame - 現在のフレーム
     * @param {number} speed - 切り替え速度（小さいほど速い）
     * @param {number} total - 画像の総枚数
     */
    getIdx: (frame, speed, total) => {
        if (!total || total === 0) return 0;
        return Math.floor(frame / speed) % total;
    },

    /**
     * 指定したインデックスが配列の範囲内に収まるようにガードする
     */
    clampIdx: (idx, frames) => {
        if (!frames || frames.length === 0) return 0;
        return Math.max(0, Math.min(idx, frames.length - 1));
    },
	
	/**
     * 画像配列から安全に1枚取り出す。
     * 画像がない場合は fallback（予備画像）を返す。
     */
    getFrame: (frames, index, fallback) => {
        if (frames && frames.length > 0) {
            // indexが範囲外にならないよう守りつつ返す
            const safeIdx = Math.max(0, Math.min(index, frames.length - 1));
            return frames[safeIdx];
        }
        return fallback; // 画像が1枚もなければ予備を返す
    }
};

// ============================================================
// :::GET_ACTION_FRAME::: 🎞️ アクション別・現在フレーム画像の取得
// ============================================================
/**
 * 役割：
 * - 指定されたアクション（Walk等）の画像配列を取得
 * - AnimUtils.getIdx で現在の表示すべきインデックスを算出
 * - AnimUtils.getFrame で安全に画像（またはfallback）を取得
 */
function getActionFrame(characterData, actionName, frame, speed, fallback) {
    const frames = characterData ? characterData[actionName] : null;
    const idx = AnimUtils.getIdx(frame, speed, frames?.length || 0);
    return AnimUtils.getFrame(frames, idx, fallback);
}

// ============================================================
// :::UPDATE_EXP_ANIMATION::: 📈 経験値増加の滑らか演出（補間処理）
// ============================================================
/**
 * 役割：
 * - 実際の経験値と表示上の経験値の差分（diff）を計算
 * - 現在値から目標値へ 10% ずつ近づけることで、滑らかなアニメーションを生成
 * - 差分が微小（0.1以下）になったら直接値を代入して微細な揺れをカット
 */
function updateExpAnimation(hero) {
    const diff = hero.exp - displayExp;
    if (Math.abs(diff) > 0.1) {
        displayExp += diff * 0.1;
    } else {
        displayExp = hero.exp;
    }
}

// ============================================================
// :::UPDATE_TIMERS::: ⏳ ログとチャットメッセージの生存期間管理
// ============================================================
/**
 * 役割：
 * - 取得ログのタイマーをカウントダウン（updateLogTimers）
 * - チャットメッセージの有効期限（timer > 0）によるフィルタリング
 * - 画面上の不要な情報が蓄積するのを防ぎ、メモリと可視性を維持
 */
function updateTimers() {
    updateLogTimers(); // 取得ログの寿命
    chatMessages = chatMessages.filter(m => m.timer > 0); // チャットの寿命
}

// ============================================================
// :::UPDATE_LOG_TIMERS::: 📜 アイテムログの寿命監視と自動消去
// ============================================================
/**
 * 役割：
 * - 全ログデータの寿命(log.timer)を 2 ずつ減少させる（描画サイクル連動）
 * - 寿命が尽きた（timer <= 0）ログを itemLogs から除外
 * - UIの視覚的なノイズを防ぎ、常に最新の通知だけを表示
 */
function updateLogTimers() {
    itemLogs.forEach(log => {
        if (log.timer > 0) log.timer -= 2; // 描画のたびに寿命を減らす
    });
    itemLogs = itemLogs.filter(l => l.timer > 0);
}

// ============================================================
// :::UPDATE_UI_STATE::: 📊 UI状態の更新とアニメーション計算
// ============================================================
/**
 * 役割：
 * - 実データ(hero.hp)と描画用データ(hero.displayHp)の同期
 * - 減算時(ダメージ)の滑らかなアニメーション制御（イージング）
 * - 加算時(回復)の即時反映
 * - UIの描画ロジックと計算ロジックの分離による管理効率化
 */
function updateUIState(hero) {
    if (!hero) return;

    // HPバーの追従計算（描画からここへ移動）
    if (hero.displayHp === undefined) hero.displayHp = hero.hp;

    if (hero.displayHp > hero.hp) {
        hero.displayHp -= VIEW_CONFIG.ui.hpEaseSpeed; 
        if (hero.displayHp < hero.hp) hero.displayHp = hero.hp;
    } else if (hero.displayHp < hero.hp) {
        hero.displayHp = hero.hp;
    }
}

// ============================================================
// 🕹️ [SECTION 5: INPUT] ユーザー操作
// 役割: キーボード・マウスのイベント監視と反応の入り口
// ============================================================
// ============================================================
// :::KEY_CHAR_SELECTOR::: 👤 キャラクター選択（Q/Eキー）操作の制御
// ============================================================
/**
 * 役割：
 * - ログイン前のキャラ選択機能（Q/Eキー操作）
 * - チャット入力中（INPUT/TEXTAREA）の誤作動防止
 * - ログイン済み（myIdあり）の場合のキャラ切り替えロック
 * - キャラ変更イベント（change_char）のサーバー送信
 */
window.addEventListener('keydown', (e) => {
    // ✅ 追加：もし入力欄（チャット等）を触っていたら、ここで処理を中断する
    if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;

    // 🌟 追加：ログイン済み（myIdがある）なら、あとからの切り替えを防止する
    if (typeof myId !== 'undefined' && myId) return;

    let changed = false;
    if (e.key === 'q' || e.key === 'Q') {
        //selectedCharVar = selectedCharVar <= 1 ? 15 : selectedCharVar - 1;
        //changed = true;
    }
    /*
    if (e.key === 'e' || e.key === 'E') {
        selectedCharVar = selectedCharVar >= 15 ? 1 : selectedCharVar + 1;
        groupChanged = true;
    }
    */
    if (changed) {
        socket.emit('change_char', { charVar: selectedCharVar });
    }
});

// ============================================================
// :::KEY_GROUP_SELECTOR::: 🔄 グループ切り替え（R/Tキー）操作の制御
// ============================================================
/**
 * 役割：
 * - R/Tキーによるグループ番号の循環変更（0 ↔ 15）
 * - 入力フォーム操作中（INPUT/TEXTAREA）のイベント無視による誤爆防止
 * - ローカル描画のための画像ロード（loadCharFrames）のキック
 * - サーバー同期（socket.emit）による他ユーザーへの状態通知
 */
window.addEventListener('keydown', (e) => {

	// 🌟 追記：接続が切れていたら、キー入力を一切受け付けない
    if (window.isDisconnected) {
        return; 
    }
	
    // ✅ 入力欄を触っていたら無視
    if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;

    // 🌟 追加：ログイン済み（myIdがある）なら、あとからの切り替えを防止する
    //if (typeof myId !== 'undefined' && myId) return;

    let groupChanged = false;

    // Rキー：前のグループへ (00 ↔ 15)
    if (e.key === 'r' || e.key === 'R') {
        selectedGroup = selectedGroup <= 0 ? 15 : selectedGroup - 1;
        groupChanged = true;
    }
    // Tキー：次のグループへ (00 ↔ 15)
    if (e.key === 't' || e.key === 'T') {
        selectedGroup = selectedGroup >= 15 ? 0 : selectedGroup + 1;
        groupChanged = true;
    }

    if (groupChanged) {
        // 1. 🖼️ 自分の画面で新しいグループの画像をロードする
        // キャラクター番号は 01 固定なのでそのまま第2引数に渡します
        loadCharFrames(selectedGroup, selectedCharVar);

        // 2. 📡 サーバーを通じて他ユーザーへ「自分の見た目が変わった」と通知
        // サーバー側が 'change_group' だけでなく 'change_char' で統一されている場合はそちらに合わせてください
        socket.emit('change_char', { 
            group: selectedGroup, 
            charVar: selectedCharVar 
        });

        console.log(`🔄 グループを ${selectedGroup} (キャラ ${selectedCharVar}) に切り替えました`);
    }
});

// ============================================================
// :::KEY_UI_CONTROLLER::: 🖥️ キー入力によるUI全ウィンドウ管理
// ============================================================
/**
 * 役割：
 * - ゲーム開始状態（isGameStarted）の確認による入力ガード
 * - 入力欄（INPUT/TEXTAREA）フォーカス時の操作ブロック
 * - キーマップ（keyMap）に基づいたウィンドウの開閉（isOpen反転）
 * - 最前面表示のためのスタック管理（windowStackの更新）
 * - 開閉時の効果音再生とデバッグ操作の受付
 * - エスケープキーによる一括クローズ処理
 */
window.addEventListener('keydown', (e) => {

	// 🌟 追記：接続が切れていたら、キー入力を一切受け付けない
    if (window.isDisconnected) {
        return; 
    }
    
	// 🌟 ログイン前（window.isGameStartedが設定されていない、またはfalse）なら何もしない
    if (!window.isGameStarted) {
        return;
    }
	
    // 1. ガード処理（入力フォームにフォーカスがある時は反応させない）
    if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;

    const key = e.key.toLowerCase(); // 大文字小文字を気にせず判定できるように

    // --- 🌟 2. 各ウィンドウの共通判定ロジック (22個一括対応) ---
    const targetId = keyMap[key];
    if (targetId && gameWindows[targetId]) {
        const win = gameWindows[targetId];

        // gameWindows内のisOpenを反転
        win.isOpen = !win.isOpen;
        
        // 🌟 追加：Optionsウィンドウが開いた瞬間だけリクエストを送る
        if (targetId === 'options' && win.isOpen) {
            console.log("Optionsを開いたのでIDを要求します");
            socket.emit('get_account_info'); 
        }
        
        // 🌟 開閉に関わらず、最後に触った(押した)方を最前面へ
        if (typeof windowStack !== 'undefined') {
            windowStack = windowStack.filter(v => v !== targetId);
            windowStack.push(targetId);
        }
        
        // 🔊 音の再生
        if (win.isOpen) {
            if (typeof playMenuUpSound === 'function') playMenuUpSound();
        } else {
            if (typeof playMenuDownSound === 'function') playMenuDownSound();
        }
        
        console.log(`${targetId} Window State:`, win.isOpen);
    }

    // --- 🌟 3. 特殊キー・デバッグキー判定 (既存ロジック踏襲) ---
    
    // デバッグ情報の表示切り替え (Dキーをデバッグ用として使う場合の例)
    /*
    if (key === 'd') {
        if (typeof showDebugWindow !== 'undefined') {
            showDebugWindow = !showDebugWindow;
            console.log("Debug Window:", showDebugWindow);
        }
    }
    */
    
    // 判定の可視化切り替え (Pキーをデバッグモード用として使う場合の例)
    /*
    if (key === 'p') {
        if (typeof DEBUG_MODE !== 'undefined') {
            DEBUG_MODE = !DEBUG_MODE;
            console.log("Visual Debug Mode (P-Key):", DEBUG_MODE);
        }
    }
    */

    // --- 🌟 4. エスケープ (全てのウィンドウを閉じる) ---
    if (e.key === 'Escape') {
        // いずれかのウィンドウが開いているかチェック
        const anyOpen = Object.values(gameWindows).some(win => win.isOpen);

        if (anyOpen) {
            // 全てのウィンドウを一括で閉じる
            Object.values(gameWindows).forEach(win => {
                win.isOpen = false;
            });
            
            if (typeof playMenuDownSound === 'function') playMenuDownSound();
            console.log("All windows closed via Escape");
        }
    }
});

// キャンバスのクリックイベント内（view.jsなどのクリック処理場所）
canvas.addEventListener('mousedown', (e) => {
    // オプションウィンドウが開いているかチェック
    if (gameWindows.options && gameWindows.options.isOpen) {
        const win = gameWindows.options;
        const mouseX = e.offsetX;
        const mouseY = e.offsetY;

        // [コピー]ボタンの範囲（文字の描画位置に合わせて調整してください）
        const btnX = win.x + 20 + 180;
        const btnY = win.y + 50;
        const btnW = 60; // ボタンの幅
        const btnH = 20; // ボタンの高さ

        if (mouseX >= btnX && mouseX <= btnX + btnW && mouseY >= btnY - 20 && mouseY <= btnY + btnH) {
            copyWikiIdToClipboard(win.wikiId);
        }
    }
});

function copyWikiIdToClipboard(text) {
    if (!text) {
        console.log("コピーするIDがありません");
        return;
    }

    navigator.clipboard.writeText(text).then(() => {
        alert("Wiki連携キーをコピーしました！");
    }).catch(err => {
        console.error("コピー失敗:", err);
    });
}

// ============================================================
// :::MOUSE_UP_HANDLER::: 🖱️ マウスリリースによるドラッグ状態の解除
// ============================================================
/**
 * 役割：
 * - 画面上のどこでマウスを離しても、ドラッグ処理を確実に終了させる
 * - gameWindows オブジェクト内の全ウィンドウの `isDragging` フラグを一括リセット
 * - 誤操作防止のため、ドラッグ関連状態のクリーンアップを行う
 */
window.addEventListener('mouseup', () => {
    // 🌟 1. 管理オブジェクト内の全てのウィンドウのドラッグ状態を解除
    Object.values(gameWindows).forEach(win => {
        win.isDragging = false;
    });

    // 🌟 2. 既存コードとの互換性のため、古いフラグも解除
    //isDragging = false;
    //isDraggingInv = false;
    //isDraggingE = false;

    // 🌟 3. アイテムスロットの選択状態などは維持（ドラッグ終了のみに専念）
    // canvas.style.cursor の制御が必要な場合はここで行います
});

// 🌟 1. 誰を選択しているかを一時的に保存する変数
window.selectedPlayer = null;

// ============================================================
// :::CONTEXT_MENU_TARGETING::: 🖱️ 右クリックによるプレイヤーターゲット判定
// ============================================================
const stageCanvas = document.getElementById('stage');

if (stageCanvas) {
    stageCanvas.addEventListener('contextmenu', function(e) {
        e.preventDefault();

        const rect = stageCanvas.getBoundingClientRect();
        const canvasX = ((e.clientX - rect.left) / rect.width) * 800;
        const canvasY = ((e.clientY - rect.top) / rect.height) * 600;

        let foundPlayer = null;
        for (let id in others) {
            const p = others[id];
            if (canvasX >= p.x - 30 && canvasX <= p.x + 70 &&
                canvasY >= p.y - 50 && canvasY <= p.y + 50) {
                foundPlayer = p;
                break;
            }
        }

        if (foundPlayer) {
            window.selectedPlayer = foundPlayer;
            console.log("【1. ターゲット特定】:", foundPlayer.name);

            // サーバーへ問い合わせ
            socket.emit('get_target_account_info', foundPlayer.name);

            // サーバーからの返信を待ち受け
            socket.once('target_account_info_response', (data) => {
                console.log("【2. サーバーからの回答】:", data);
                
                // データが空ならプレイヤー名で代用、存在すれば WikiID を使用
                const targetId = data.wikiId || foundPlayer.name;
                
                console.log("【3. 最終ID決定】:", targetId);
                alert("ターゲットIDを確認: " + targetId);
                
                const dummyEvent = {
                    preventDefault: () => {},
                    pageX: e.pageX,
                    pageY: e.pageY,
                    target: { textContent: data.wikiName || foundPlayer.name }
                };
                
                handleRightClick(dummyEvent, targetId);
            });
        } else {
            const menu = document.getElementById('player-context-menu');
            if (menu) menu.style.display = 'none';
            window.selectedPlayer = null;
        }
    });
}

// ============================================================
// :::HANDLE_PROFILE_CLICK::: 👤 プロフィールウィンドウ表示処理
// ============================================================
/**
 * 役割：
 * - 選択中のプレイヤー情報(window.selectedPlayer)を確認
 * - 名前、レベル等の情報をHTML要素へ反映（DOMバインディング）
 * - プロフィールウィンドウ(player-profile-window)を表示し、右クリックメニューを閉じる
 */
function handleProfileClick() {
    if (!window.selectedPlayer) return;

    const p = window.selectedPlayer;
    
    // HTMLの各要素にプレイヤーの情報をセットする
    document.getElementById('profile-name').innerText = p.name || "不明なプレイヤー";
    document.getElementById('profile-level').innerText = p.level || "??";
    // もし職業データなどがあればここに追加
    // document.getElementById('profile-job').innerText = p.job || "冒険者";

    // ウィンドウを表示する
    document.getElementById('player-profile-window').style.display = 'block';

    // 右クリックメニューは閉じる
    document.getElementById('player-context-menu').style.display = 'none';
}

// ============================================================
// :::CLOSE_PROFILE::: 👤 プロフィールウィンドウの閉鎖処理
// ============================================================
/**
 * 役割：
 * - プロフィールウィンドウ（DOM要素）のスタイルを `display: none` に変更
 * - プレイヤーが不要になった詳細表示を画面から消去し、メインのゲーム画面へ視線を戻す
 */
function closeProfile() {
    document.getElementById('player-profile-window').style.display = 'none';
}

// ============================================================
// :::CLICK_TO_CLOSE_MENU::: 🖱️ メニューの自動クローズ処理
// ============================================================
/**
 * 役割：
 * - 画面のどこをクリックしても、開いている右クリックメニューを非表示に切り替える
 * - 操作の完了後、画面をすっきりとした状態に戻すためのUIケア処理
 */
window.addEventListener('click', function(e) {
    const menu = document.getElementById('player-context-menu');
    
    // メニューが表示されているなら隠す
    if (menu.style.display === 'block') {
        menu.style.display = 'none';
        console.log("メニューを閉じました");
    }
});

// ============================================================
// :::MAKE_DRAGGABLE::: 🪟 ウィンドウのドラッグ移動機能
// ============================================================
/**
 * 役割：
 * - マウスダウン(onmousedown)でドラッグ開始地点と初期位置を記録
 * - CSSの配置（transform/margin）を絶対座標(px)へ移行して移動を許可
 * - マウスムーブ(mousemove)でマウス移動量分だけウィンドウを追従させる
 * - マウスアップ(mouseup)でドラッグ状態を終了し、カーソルを通常に戻す
 */
function makeDraggable(windowId, headerId) {
    const win = document.getElementById(windowId);
    const header = document.getElementById(headerId);
    
    if (!win || !header) {
        console.error("ドラッグ設定エラー: 要素が見つかりません", { windowId, headerId });
        return;
    }

    let isDragging = false;
    let startX, startY, startRect;

    // 1. マウスを押した時（取っ手を掴む）
    header.onmousedown = function(e) {
        isDragging = true;
        
        // ドラッグ開始時のウィンドウの絶対位置を保存
        startRect = win.getBoundingClientRect();
        
        // ドラッグ開始時のマウス座標を保存
        startX = e.clientX;
        startY = e.clientY;

        // 中央寄せ(transform)を解除し、現在の位置を px で固定
        win.style.transform = "none";
        win.style.margin = "0";
        win.style.left = startRect.left + "px";
        win.style.top = startRect.top + "px";
        win.style.zIndex = "10001";

        // マウスカーソルを「掴んでいる状態」にする
        document.body.style.cursor = "move";
        
        console.log("ドラッグ開始");
        e.stopPropagation();
        e.preventDefault(); // テキスト選択などを防ぐ
    };

    // 2. マウスを動かしている時
    document.addEventListener('mousemove', function(e) {
        if (!isDragging) return;

        // ドラッグ開始地点からのマウスの移動量を計算
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        // ウィンドウの新しい位置を反映
        win.style.left = (startRect.left + dx) + "px";
        win.style.top = (startRect.top + dy) + "px";
    }, { passive: true }); // パフォーマンス向上のため

    // 3. マウスを離した時
    document.addEventListener('mouseup', function() {
        if (isDragging) {
            console.log("ドラッグ終了");
            isDragging = false;
            document.body.style.cursor = "default";
        }
    });
}

// ============================================================
// :::UI_INITIALIZER::: 🚀 UIウィンドウのドラッグ機能初期化
// ============================================================
/**
 * 役割：
 * - DOM構築完了後、すべてのウィンドウUIに対してドラッグ移動機能を適用
 * - IDに基づき本体とヘッダーをペアリング
 * - プレイヤーがUIを自由な位置に配置できるよう設定
 */
window.addEventListener('DOMContentLoaded', () => {
    // 1. プロフィール
    makeDraggable('player-profile-window', 'profile-header');

    // 2. 自分の露店ウィンドウ
    makeDraggable('vending-window', 'vending-header');

    // 3. 他人の露店ウィンドウ
    makeDraggable('other-vending-window', 'other-vending-header');

    // 4. ショップ画面（本体のID, 取っ手のID）
    makeDraggable('shop-overlay', 'shop-header');
});

// ============================================================
// :::OPEN_DROP_FORM::: 🗑️ アイテム廃棄用入力フォームの展開と制御
// ============================================================
/**
 * 役割：
 * - 廃棄対象アイテムの所持数確認と、入力条件（最大所持数等）の設定
 * - 入力フォームの表示とフォーカス制御
 * - 数量確定時（Enter/ボタン）の送信、およびキャンセル（Escape/ボタン）処理
 * - 異常な入力（数値外や所持数オーバー）に対するガードとエラー表示
 */
function openDropForm(slotIndex, item) {
    const currentAmount = item.count || item.amount || 1;

    // 1個しかない場合は即座に送信して終了
    if (currentAmount <= 1) {
        socket.emit('dropItem', { index: slotIndex, amount: 1 });
        selectedSlotIndex = -1;
        return;
    }

    // 複数個ある場合は入力フォームを表示
    const form = document.getElementById('drop-form');
    const label = document.getElementById('drop-label');
    const input = document.getElementById('drop-input');
    const error = document.getElementById('drop-error');

    label.innerText = `${currentAmount}個持っています。何個捨てますか？`;
    error.innerText = "";
    input.style.border = "1px solid #ccc";
    input.value = currentAmount;
    input.max = currentAmount;
    input.min = 1;

    isDiscarding = true;
    form.style.display = 'block';
    form.style.pointerEvents = 'auto';
    canvas.style.cursor = "default";

    setTimeout(() => input.focus(), 10);

    const handleConfirm = () => {
        let dropAmount = parseInt(input.value);
        if (isNaN(dropAmount) || dropAmount <= 0) {
            error.innerText = "1個以上の数値を入力してください";
            input.style.border = "2px solid #ff4444";
            return;
        }
        if (dropAmount > currentAmount) {
            error.innerText = `そんなに持っていません！(最大${currentAmount}個)`;
            input.style.border = "2px solid #ff4444";
            return;
        }
        socket.emit('dropItem', { index: slotIndex, amount: dropAmount });
        closeForm();
    };

    const handleCancel = () => closeForm();

    const closeForm = () => {
        isDiscarding = false;
        selectedSlotIndex = -1;
        form.style.display = 'none';
        form.style.pointerEvents = 'none';
        input.onkeydown = null;
    };

    document.getElementById('drop-confirm').onclick = handleConfirm;
    document.getElementById('drop-cancel').onclick = handleCancel;

    input.onkeydown = (e) => {
        if (e.key === 'Enter') { e.preventDefault(); handleConfirm(); }
        else if (e.key === 'Escape') { handleCancel(); }
    };
}

// ============================================================
// :::MOUSE_CLICK_CONTROLLER::: 🖱️ Canvas上のクリック操作一括制御
// ============================================================
/**
 * 役割：
 * - 座標計算(getBoundingClientRect)に基づくクリック位置の正規化
 * - windowStack を用いたクリック優先順位の判定とウィンドウの前面化
 * - 状態に応じた処理の振り分け（閉じる、タブ切替、ステータスUP、ドラッグ開始）
 * - インベントリ操作（スワップ・出品モーダル起動・廃棄処理）
 * - 他プレイヤーの露店クリック判定（インタラクション開始）
 */
canvas.addEventListener('mousedown', (event) => {

	// 🌟 追記：接続が切れていたら、クリック操作を一切受け付けない
    if (window.isDisconnected) {
        return; 
    }
	
    const rect = canvas.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    // 🚩 DEBUG: クリックの起点ログ
    console.log(`[ClickEvent] Canvas(${Math.round(clickX)}, ${Math.round(clickY)})`);

    // 1. 🌟 重なりを考慮して、どのウィンドウがクリックされたか判定
    let priorityWindow = "none";
    
    for (let i = windowStack.length - 1; i >= 0; i--) {
        const name = windowStack[i];
        const win = gameWindows[name];
        
        if (win && win.isOpen) {
            if (clickX >= win.x && clickX <= win.x + win.w && 
                clickY >= win.y && clickY <= win.y + win.h) {
                priorityWindow = name;
                break; 
            }
        }
    }

    // 2. 🌟 ウィンドウを触った場合の共通処理
    if (priorityWindow !== "none") {
        console.log(`[ClickDebug] ウィンドウ「${priorityWindow}」を優先検知. 背後の判定は無視されます.`);
        const win = gameWindows[priorityWindow];

        windowStack = windowStack.filter(item => item !== priorityWindow);
        windowStack.push(priorityWindow);

        if (win.isMouseOverClose(clickX, clickY)) {
            win.isOpen = false;
            if (typeof playMenuDownSound === 'function') playMenuDownSound();
            return;
        }

        if (priorityWindow === "status") {
            if (clickY >= win.y + 35 && clickY <= win.y + 60) {
                if (clickX >= win.x + 20 && clickX <= win.x + 90) {
                    currentTab = "status";
                    if (typeof playTabSound === 'function') playTabSound();
                    return;
                }
                if (clickX >= win.x + 95 && clickX <= win.x + 165) {
                    currentTab = "ap";
                    if (typeof playTabSound === 'function') playTabSound();
                    return;
                }
            }
            if (currentTab === "ap") {
                const btnX = win.x + 150;
                const btnW = 100;
                const btnH = 25;
                const stats = ['str', 'dex', 'luk'];
                for (let i = 0; i < stats.length; i++) {
                    const btnY = win.y + 102 + (i * 30);
                    if (clickX >= btnX && clickX <= btnX + btnW && clickY >= btnY && clickY <= btnY + btnH) {
                        if (hero.ap > 0) {
                            socket.emit('upgrade_stat', { type: stats[i] });
                            if (typeof playMouseClickSound === 'function') playMouseClickSound();
                        }
                        return;
                    }
                }
            }
        }

        if (win.isMouseOverHeader(clickX, clickY)) {
            win.isDragging = true;
            win.dragOffsetX = clickX - win.x;
            win.dragOffsetY = clickY - win.y;
            return;
        }
        return; 
    }

    // 3. 🎒 どの窓も触っていない場合の操作 (自分のインベントリ判定)
    if (clickY >= 130 && clickY <= 170) {
        console.log(`[ClickDebug] インベントリ行(y:130-170)を検知.`);
        const index = Math.floor((clickX - 20) / 48);
        if (index >= 0 && index < 10) {
            console.log(`[ClickDebug] スロットIndex: ${index} をクリック.`);
            
            const item = inventoryVisualBuffer && inventoryVisualBuffer[index];
            const vendingWin = document.getElementById('vending-window');
            const isVendingOpen = vendingWin && vendingWin.style.display === 'block';

            // 🌟 露店出品モード (独自UI連携)
            if (item && isVendingOpen) {
                let baseName = item.name || item.item_name || "アイテム";
                if (typeof ITEM_CONFIG !== 'undefined' && ITEM_CONFIG[item.type]) {
                    baseName = ITEM_CONFIG[item.type].display_name || ITEM_CONFIG[item.type].name;
                }

                const checkStr = `${item.category} ${item.item_type} ${item.type}`.toLowerCase();
                const isEquip = checkStr.includes('weapon') || checkStr.includes('armor') || checkStr.includes('shield') || checkStr.includes('sword') || checkStr.includes('equip');
                
                let rankName = "";
                if (isEquip) {
                    const bonus = (item.totalALLStats || 0) - (item.totalFirstStats || 0);
                    if (bonus >= 30)      { rankName = "(神級)"; }
                    else if (bonus >= 25) { rankName = "(超伝説)"; }
                    else if (bonus >= 20) { rankName = "(極上)"; }
                    else if (bonus >= 15) { rankName = "(伝説)"; }
                    else if (bonus >= 10) { rankName = "(希少)"; }
                    else if (bonus >= 5)  { rankName = "(良品)"; }
                    else if (bonus >= 0)  { rankName = "(標準)"; }
                    else                  { rankName = "(粗悪)"; }
                }

                const displayPromptName = `${baseName}${rankName}`;
                const totalOwned = item.count || 1;

                // --- 独自UI(モーダル)の表示制御 ---
                const modal = document.getElementById('vending-quantity-modal');
                const qInput = document.getElementById('modal-quantity-input');
                const pInput = document.getElementById('modal-price-input');
                const confirmBtn = document.getElementById('modal-confirm-btn');
                const cancelBtn = document.getElementById('modal-cancel-btn');

                // モーダルに情報をセット
                document.getElementById('modal-item-name').innerText = displayPromptName;
                document.getElementById('modal-max-quantity').innerText = totalOwned;
                
                // 数量設定
                qInput.value = isEquip ? 1 : totalOwned;
                qInput.disabled = isEquip; // 装備品は1固定
                pInput.value = 1000; // デフォルト価格

                modal.style.display = 'block';

                // イベントのクリーンアップと再登録 (クロージャでindexとitemを保持)
                confirmBtn.onclick = null;
                cancelBtn.onclick = null;

                cancelBtn.onclick = () => {
                    modal.style.display = 'none';
                };

                confirmBtn.onclick = () => {
                    const sellCount = parseInt(qInput.value);
                    const price = parseInt(pInput.value);

                    if (isNaN(sellCount) || sellCount <= 0 || sellCount > totalOwned) {
                        alert("有効な数量を入力してください。");
                        return;
                    }
                    if (isNaN(price) || price < 0) {
                        alert("有効な価格を入力してください。");
                        return;
                    }

                    const iconPath = item.imageName ? `${IMAGE_DOMAIN}item_assets/${item.imageName}.png` : `${IMAGE_DOMAIN}item_assets/${item.type}.png`;
                    
                    const itemToSend = { 
                        ...item, 
                        name: displayPromptName, 
                        displayName: displayPromptName,
                        iconUrl: iconPath,
                        price: price,
                        count: sellCount,
                        originalIndex: index 
                    };

                    console.log(`[Vending] 出品確定: ${displayPromptName} x${sellCount} @${price}G`);

                    if (typeof addItemToVendingList === 'function') {
                        addItemToVendingList(itemToSend);
                        if (typeof playMouseClickSound === 'function') playMouseClickSound();
                    }
                    modal.style.display = 'none';
                };

                return; // プロンプトの代わりにモーダルを出したので、mousedownの残りの処理は行わない
            }

            // アイテム移動・スワップロジック
            if (selectedSlotIndex !== -1 && selectedSlotIndex !== index) {
                socket.emit('swapItems', { from: selectedSlotIndex, to: index });
                if (typeof playDropSound === 'function') playDropSound();
                selectedSlotIndex = -1;
                canvas.style.cursor = "grab"; 
            } else if (selectedSlotIndex === index) {
                selectedSlotIndex = -1; 
                canvas.style.cursor = "grab";
                if (typeof playDropSound === 'function') playDropSound();
            } else if (item) {
                selectedSlotIndex = index; 
                canvas.style.cursor = "grabbing"; 
                if (typeof playHoverSound === 'function') playHoverSound();
            }
            return; 
        }
    } else {
        if (selectedSlotIndex !== -1) {
            console.log(`[ClickDebug] インベントリ外をクリック. アイテムを捨てる判定へ.`);
            const item = inventoryVisualBuffer[selectedSlotIndex];
            if (item) {
                openDropForm(selectedSlotIndex, item);
                selectedSlotIndex = -1;
                canvas.style.cursor = "grab";
                return;
            }
        }
    }

    // 4. 🏪 他プレイヤーの露店看板クリック判定
    const targetPlayers = (typeof others !== 'undefined') ? others : (typeof players !== 'undefined') ? players : {};
    
    for (let id in targetPlayers) {
        const p = targetPlayers[id];

        if (p.is_vending && p.id !== hero.id) {
            if (p.vending_rect) {
                const r = p.vending_rect;
                const isInsideX = clickX >= r.x && clickX <= r.x + r.w;
                const isInsideY = clickY >= r.y && clickY <= r.y + r.h;

                if (isInsideX && isInsideY) {
                    console.log(`✅ [HIT] 露店看板へのクリックを検知しました！`);
                    if (typeof playMouseClickSound === 'function') playMouseClickSound();

                    if (typeof openOtherPlayerVending === 'function') {
                        openOtherPlayerVending(p); 
                    } else {
                        console.warn("⚠️ [Error] 関数 openOtherPlayerVending が未定義です。");
                    }
                    return; 
                }
            }
        }
    }
});

// ============================================================
// :::GET_PRIORITY_WINDOW::: 🖱️ 最前面ウィンドウと操作領域の特定
// ============================================================
/**
 * 役割：
 * - 各ウィンドウの表示状態(isOpen)と座標(x, y, w, h)から、マウス直下のウィンドウを抽出
 * - windowStackに基づき、重なり順で最も手前にあるものを優先
 * - ウィンドウ内の「ヘッダー領域(上部30px)」かどうかを判定
 * - 操作対象（ウィンドウIDと領域タイプ）をオブジェクトで返却
 */
function getPriorityWindow(mx, my) {
    // 1. 各ウィンドウの「全体」にマウスが乗っているか判定
    const isOverStats = (gameWindows.status.isOpen && 
        mx >= gameWindows.status.x && mx <= gameWindows.status.x + 300 && 
        my >= gameWindows.status.y && my <= gameWindows.status.y + 250);
        
    const isOverInv = (gameWindows.inventory.isOpen && 
        mx >= gameWindows.inventory.x && mx <= gameWindows.inventory.x + gameWindows.inventory.w && 
        my >= gameWindows.inventory.y && my <= gameWindows.inventory.y + gameWindows.inventory.h);
        
    const isOverExtra = (gameWindows.extra.isOpen && 
        mx >= gameWindows.extra.x && mx <= gameWindows.extra.x + gameWindows.extra.w && 
        my >= gameWindows.extra.y && my <= gameWindows.extra.y + gameWindows.extra.h);

    // 🌟 重なっている窓を特定（元のロジックを維持）
    let activeWindows = [];
    if (isOverStats) activeWindows.push("status");
    if (isOverInv) activeWindows.push("inventory");
    if (isOverExtra) activeWindows.push("extra");

    if (activeWindows.length > 0) {
        // stack の中で一番後ろ（＝手前）にあるものを特定
        for (let i = windowStack.length - 1; i >= 0; i--) {
            const winId = windowStack[i];
            if (activeWindows.includes(winId)) {
                
                // 🌟 追加：特定したウィンドウの「ヘッダー部分(上部30px)」にマウスがあるか判定
                const win = gameWindows[winId];
                // gameWindows.status のように個別に幅が指定されている場合を考慮
                const winW = (winId === "status") ? 300 : win.w;
                
                const isHeader = (my >= win.y && my <= win.y + 30);

                // 文字列だけでなく、情報を持たせたオブジェクトを返す
                return { id: winId, isHeader: isHeader };
            }
        }
    }
    return { id: "none", isHeader: false };
}

// ============================================================
// 📡 [SECTION 6: NETWORK] 通信・同期
// 役割: サーバー(Socket.io)とのパケット送受信
// ============================================================
// ============================================================
// :::SOCKET_CHAT_HANDLER::: 💬 チャットメッセージ受信と表示フィルタリング
// ============================================================
/**
 * 役割：
 * - 受信データの振り分け：内緒話やグループ会話などを画面上の吹き出しから除外
 * - 重なり防止：同一プレイヤーの既存の吹き出し(data.id)を検索・削除し、最新メッセージのみを保持
 * - 表示用データの格納：メッセージ内容(text)と生存時間(timer)を吹き出し描画リストに追加
 */
socket.on('chat', data => {
  // 🌟【修正】内緒話（whisper）の場合は、描画リストに追加しない
  // これにより、画面上の吹き出しとして描画されるのを防ぎます
  if (data.type === 'whisper' || data.type === 'group' || data.type === 'friend') return;

  // 🌟【追加：重なり防止】
  // 同じプレイヤー(data.id)の古い吹き出しが配列に残っていたら、新しいのを入れる前に削除する
  chatMessages = chatMessages.filter(msg => msg.id !== data.id);

  // id, text に加えて type も保存しておくと、後で描画時に色を変えられます
  chatMessages.push({ 
    id: data.id, 
    text: data.text, 
    type: data.type,
    timer: VIEW_CONFIG.chatTimer 
  });
});

// ============================================================
// :::SOCKET_YOUR_ID::: 🆔 自身のソケットID受信とHeroへの反映
// ============================================================
/**
 * 役割：
 * - サーバー接続時に割り当てられた一意のIDを受け取る
 * - 自身のゲーム内キャラクター（hero）へIDを保持させ、ネットワーク上での自身を定義する
 * - 通信プロトコルの最初の一歩として、プレイヤーの認識を確実にする
 */
socket.on('your_id', id => {
  console.log("My socket ID is:", id);
  // もし hero オブジェクトが既にあるなら ID を覚えさせる
  if (typeof hero !== 'undefined') hero.id = id;
});

// ============================================================
// :::HANDLE_SERVER_EVENTS::: 📥 サーバーイベント（アイテム取得）の演出処理
// ============================================================
/**
 * 役割：
 * - 取得されたアイテムリスト(data.lastPickedItems)の順次処理
 * - ステータスボーナス値に基づく「8段階レアリティ」のカラー判定
 * - 取得位置からプレイヤーへの吸い込みエフェクト(pickingUpEffects)の生成
 * - 取得時のフィードバック（サウンド再生）の実行
 */
function handleServerEvents(data) {
    if (!data.lastPickedItems || data.lastPickedItems.length === 0) return;

    data.lastPickedItems.forEach(picked => {
        // --- 🌟 ボーナス色の計算（詳細な8段階ランク判定） ---
        let bonusColor = '#ffffff'; // デフォルトは白
        if (picked.totalALLStats !== undefined && picked.totalFirstStats !== undefined) {
            const bonus = picked.totalALLStats - picked.totalFirstStats;
            
            // 灰 < 白 < 橙 < 青 < 紫 < 黄 < 緑 < 赤 の順に判定
            if (bonus >= 30) {
                bonusColor = "#ff0000"; // 神級 (赤)
            } else if (bonus >= 25) {
                bonusColor = "#00ff00"; // 超伝説 (緑)
            } else if (bonus >= 20) {
                bonusColor = "#ffff00"; // 極上 (黄)
            } else if (bonus >= 15) {
                bonusColor = "#ff00ff"; // 伝説 (紫)
            } else if (bonus >= 10) {
                bonusColor = "#00ccff"; // 希少 (青)
            } else if (bonus >= 5) {
                bonusColor = "#ff9900"; // 良品 (橙)
            } else if (bonus >= 0) {
                bonusColor = "#ffffff"; // 標準 (白)
            } else {
                bonusColor = "#aaaaaa"; // 粗悪 (灰)
            }
        }

        // ① 吸い込みエフェクトの追加
        pickingUpEffects.push({
            type: picked.type,
            timer: VIEW_CONFIG.pickupEffect.duration,
            startX: picked.x + 20,
            startY: (picked.y > VIEW_CONFIG.groundThreshold) 
                ? (VIEW_CONFIG.groundY - 20) 
                : picked.y,
            targetPlayerId: picked.pickerId,
            // 🌟 決定した詳細ランク色をエフェクト情報に追加
            effectColor: bonusColor 
        });

        // ② アイテム取得ログ（省略・維持）
        /*
        if (picked.pickerId === socket.id) {
            if (picked.type !== 'medal1') {
                const config = ITEM_CONFIG[picked.type] || { name: 'アイテム' };
                itemLogs.push({
                    text: `Bag: ${config.name} を手に入れました`,
                    timer: VIEW_CONFIG.log.displayTime
                });
                if (itemLogs.length > VIEW_CONFIG.log.maxCount) {
                    itemLogs.shift();
                }
            }
        }
        */

        // ③ 取得音の再生
        if (typeof playItemSound === 'function') {
            playItemSound();
        }
    });
}

// 1. 通知を保存しておくための配列（空のリスト）
let gameNotifications = [];

// ============================================================
// :::ADD_NOTIFICATION::: 🔔 通知ログの追加と表示管理
// ============================================================
/**
 * 役割：
 * - 通知メッセージ（text）と色（color）をリストに追加
 * - 表示期間(timer)と透明度(alpha)の初期化
 * - 画面占有を防ぐための最大件数（5件）制限
 */
function addNotification(text, color = "#ffffff") {
    gameNotifications.push({
        text: text,
        color: color,
        timer: 180, // 約3秒間表示
        alpha: 1.0  // 最初はくっきり表示
    });

    // メッセージが溜まりすぎると画面が埋まるので、5件までに制限
    if (gameNotifications.length > 5) {
        gameNotifications.shift(); // 一番古いものを消す
    }
    
    console.log("通知ログを追加しました:", text); // 確認用
}

// ============================================================
// :::DRAW_NOTIFICATION_AREA::: 🔔 通知エリアのレンダリング処理
// ============================================================
/**
 * 役割：
 * - 通知リストが空の場合は描画をスキップ
 * - 右寄せ（textAlign: right）配置と、影付きテキストの描画
 * - タイマーに応じたフェードアウト（alpha減少）処理
 * - 描画終了後の古い通知リストのクリーンアップ（filter）
 */
function drawNotificationArea(ctx, canvasWidth, canvasHeight) {
    if (gameNotifications.length === 0) return; // 通知がなければ何もしない

    const paddingRight = 20;
    const paddingBottom = 40; 
    const lineHeight = 25;

    ctx.save();
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "right"; // 右側に揃える

    gameNotifications.forEach((note, index) => {
        // 新しいものほど下に、古いものほど上に押し上げられる計算
        const y = canvasHeight - paddingBottom - ((gameNotifications.length - 1 - index) * lineHeight);
        const x = canvasWidth - paddingRight;

        ctx.globalAlpha = note.alpha;

        // 文字の影を描く（読みやすくするため）
        ctx.fillStyle = "black";
        ctx.fillText(note.text, x + 1, y + 1);

        // 文字の本体を描く
        ctx.fillStyle = note.color;
        ctx.fillText(note.text, x, y);

        // 時間を減らして、終わり際に少しずつ透明にする
        note.timer--;
        if (note.timer < 30) {
            note.alpha -= 0.03;
        }
    });

    ctx.restore();

    // 表示時間が終わった通知をリストから削除する
    gameNotifications = gameNotifications.filter(note => note.timer > 0);
}

// 🌟 ファイルの冒頭（socket.on の外）
if (typeof window.currentChannelId === 'undefined') {
    window.currentChannelId = null;
}
if (typeof window.prevPlayerIds === 'undefined') {
    window.prevPlayerIds = new Set();
}

// 🌟 追加：ログイン通知が出たばかりの人を一時的に記憶するセット（2重通知防止用）
if (typeof window.recentLoginIds === 'undefined') {
    window.recentLoginIds = new Set();
}

// ============================================================
// :::DRAW_NOTIFICATIONS_UI::: 🍁 メイプル風ミニウィンドウ通知の描画
// ============================================================
/**
 * 役割：
 * - 描画コンテキスト(ctx)の生存確認とエラーハンドリング
 * - ウィンドウの座標計算と、配列データの生存期間(timer/alpha)管理
 * - グラデーション背景、枠線、ハイライト、テキストの重畳描画
 * - メッセージのフェードアウト処理と、描画終了後のクリーンアップ(splice)
 */
function drawNotifications(ctx) {
    // 🚨 デバッグ1: そもそも関数が毎フレーム呼ばれているかチェック
    // (コンソールが埋まるのを防ぐため、通知がある時だけログを出します)
    if (gameNotifications && gameNotifications.length > 0) {
        console.log(`[DEBUG 1] drawNotificationsが実行されました。現在蓄積されている通知数: ${gameNotifications.length}件`);
    } else {
        return; // 通知が空ならここで終了
    }

    // 🚨 デバッグ2: 引数として渡された ctx (キャンバスのコンテキスト) が正常かチェック
    if (!ctx) {
        console.error("❌ [DEBUG 2] エラー: 引数 'ctx' が空っぽです！描画するためのコンテキストが渡されていません。");
        return;
    } else {
        // コンテキストが正常なら、念のため canvas オブジェクトが紐づいているか確認
        if (!ctx.canvas) {
            console.warn("⚠️ [DEBUG 2] 警告: ctx は存在しますが、ctx.canvas が未定義です。座標計算でエラーが起きる可能性があります。");
        }
    }

    // 🎨 メイプル風ミニウィンドウのサイズ・配置設定
    const winWidth = 230;
    const winHeight = 45;
    const gap = 6; 

    // 📍 座標の計算（ここでキャンバスの幅・高さが正しく取得できているか）
    const canvasWidth = ctx.canvas ? ctx.canvas.width : 800;  // フォールバック付き
    const canvasHeight = ctx.canvas ? ctx.canvas.height : 600; // フォールバック付き
    
    // 🌟 修正：Y座標が1135だと画面外に消えてしまうため、基準値を250px上に引き上げました
    const startX = canvasWidth - winWidth - 20; 
    let startY = canvasHeight - winHeight - 250; 

    // 💡 もし右側で他のUI（チャット等）と被る場合は、下の2行のコメントアウト(//)を外すと左上に強制固定できます
    // const startX = 20;
    // let startY = 120;

    // 配列の更新（タイマー減少とフェードアウト処理）
    for (let i = gameNotifications.length - 1; i >= 0; i--) {
        const notif = gameNotifications[i];
        notif.timer--;

        if (notif.timer <= 30) {
            notif.alpha = notif.timer / 30;
        }

        if (notif.timer <= 0) {
            gameNotifications.splice(i, 1);
            continue;
        }
    }

    // 🖌️ 通知ウィンドウを1件ずつレンダリング
    gameNotifications.forEach((notif, index) => {
        // 🚨 デバッグ3: 各通知データの中身と、計算された描画座標を監視
        const x = startX;
        const y = startY - (index * (winHeight + gap));
        console.log(`[DEBUG 3] 通知[${index}]を描画します。文字: "${notif.text}", 色: ${notif.color}, 透過度(alpha): ${notif.alpha}, 描画位置: (X: ${x}, Y: ${y})`);

        ctx.save();
        
        ctx.globalAlpha = notif.alpha; 

        // --------------------------------------------------------
        // 🍁 1. メイプル風ネイビーブルーの背景グラデーション
        // --------------------------------------------------------
        try {
            const gradient = ctx.createLinearGradient(x, y, x, y + winHeight);
            gradient.addColorStop(0, "rgba(13, 23, 44, 0.85)");  
            gradient.addColorStop(1, "rgba(31, 52, 90, 0.85)");  
            ctx.fillStyle = gradient;
            
            ctx.beginPath();
            if (ctx.roundRect) {
                ctx.roundRect(x, y, winWidth, winHeight, 4);
            } else {
                ctx.rect(x, y, winWidth, winHeight);
            }
            ctx.fill();
			ctx.fillStyle = "red";
            ctx.fillRect(x, y, 100, 40);
            // 🚨 デバッグ4: 背景の四角形（fill）がエラーなく通過したか
            // console.log(`[DEBUG 4] 背景四角形の描画処理を通過しました。`);
        } catch (err) {
            console.error("❌ [DEBUG 4] エラー: 背景ウィンドウの四角形描画中に例外が発生しました:", err.message);
        }

        // --------------------------------------------------------
        // 🍁 2. 外枠
        // --------------------------------------------------------
        ctx.strokeStyle = "rgba(16, 16, 16, 0.9)";
        ctx.lineWidth = 1;
        ctx.stroke();

        // --------------------------------------------------------
        // 🍁 3. 内側のハイライト
        // --------------------------------------------------------
        ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 1, y + 1, winWidth - 2, winHeight - 2);

        // --------------------------------------------------------
        // 🍁 4. メッセージテキストの描画
        // --------------------------------------------------------
        ctx.font = "bold 12px 'Arial', 'Hiragino Kaku Gothic ProN', sans-serif";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";

        // 黒いフチ
        ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
        ctx.fillText(notif.text, x + 15, y + (winHeight / 2) + 1);

        // メイン文字色
        ctx.fillStyle = notif.color;
        ctx.fillText(notif.text, x + 14, y + (winHeight / 2));

        ctx.restore();
    });
}

// ============================================================
// :::SOCKET_GLOBAL_NOTIFICATION::: 🌐 グローバル通知の受信と制御
// ============================================================
/**
 * 役割：
 * - 通知が自分自身によるものか判定し、重複を防止
 * - ログイン通知（LOGIN）と通常の通知を識別し、色を適切に割り当て（メイプル風イエロー等）
 * - 取得したメッセージを通知ログに追加し、音を鳴らしてプレイヤーに報知
 * - ログインの一時的なID記録（recentLoginIds）を行い、入室判定の整合性を保護
 */
socket.on('globalNotification', (data) => {
    // 🌟 通知の送信元（id）が自分自身だったら、何もせずに終了する
    if (data && data.senderId === socket.id) {
        return; 
    }

    if (data && data.message) {
        // 右下のログエリアに表示
        if (typeof addNotification === 'function') {
            // 🍁 LOGINタイプの場合はメイプル風イエロー(#FFF677)に、それ以外はサーバー指定色または白を適用
            const targetColor = (data.type === 'LOGIN') ? "#FFF677" : (data.color || "#FFFFFF");
            addNotification(data.message, targetColor);
        }
        
        // ログイン音を鳴らす
        if (typeof playInviteSound === 'function') {
            playInviteSound();
        }

        // 🌟 ログイン通知（type: 'LOGIN'）の場合、そのIDを一時的に記録する
        if (data.type === 'LOGIN' && data.senderId) {
            window.recentLoginIds.add(data.senderId);
            // 3秒後に解除（その後のチャンネル移動は「入室」として判定させるため）
            setTimeout(() => {
                window.recentLoginIds.delete(data.senderId);
            }, 500);
        }
    }
});

// 🌟 サーバーから届いたリストを保持するための変数（関数の外に置く）
let currentOnlinePlayers = [];

// ============================================================
// :::SOCKET_UPDATE_PLAYER_LIST::: 👥 オンラインプレイヤーリストの同期
// ============================================================
/**
 * 役割：
 * - サーバー側で管理されている現在のオンラインプレイヤー一覧を受信
 * - クライアント側のデータ保持変数(currentOnlinePlayers)を最新の情報へ書き換える
 * - プレイヤーの入退室情報を常に最新に保ち、UI等の表示整合性を守る
 */
socket.on('updatePlayerList', (playerList) => {
    currentOnlinePlayers = playerList;
});

// ============================================================
// :::DRAW_ONLINE_LIST::: 👥 オンラインプレイヤー名簿の描画
// ============================================================
/**
 * 役割：
 * - プレイヤーリストが存在しない場合は描画をスキップ
 * - 動的な背景ボックスのサイズ計算と半透明背景の描画
 * - タイトル（オンライン人数）と各プレイヤーの名前・チャンネル情報の配置
 * - 右寄せ・左寄せを使い分けた見やすいフォーマットでの描画
 */
function drawOnlineList(ctx) {
    if (!currentOnlinePlayers || currentOnlinePlayers.length === 0) return;

    // 表示位置の設定（右上のCH.表示の下あたり）
    const startX = VIEW_CONFIG.SCREEN_WIDTH - 140; // 右端から140px
    const startY = 80;                             // CH表示(通常30-50px)の下
    const lineHeight = 18;                         // 1行の高さ

    ctx.save();

    // 1. 半透明の背景ボックス
    ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
    const bgHeight = (currentOnlinePlayers.length + 1) * lineHeight + 10;
    ctx.fillRect(startX - 10, startY - 20, 130, bgHeight);

    // 2. タイトル "ONLINE (人数)"
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "right";
    ctx.fillStyle = "#FFD700"; // 金色
    ctx.fillText(`ONLINE (${currentOnlinePlayers.length})`, startX + 110, startY);

    // 3. 各プレイヤーの名前とチャンネル
    ctx.font = "11px sans-serif";
    currentOnlinePlayers.forEach((p, index) => {
        const y = startY + (index + 1) * lineHeight;
        
        // 名前（白）
        ctx.fillStyle = "white";
        ctx.textAlign = "right";
        ctx.fillText(`${p.name}`, startX + 110, y);

        // チャンネル番号（緑）を名前の左側に
        ctx.fillStyle = "#66FF66";
        ctx.textAlign = "left";
        ctx.fillText(`ch${p.channel}`, startX, y);
    });

    ctx.restore();
}

/*
// 🌟 サーバーからプレイヤーリストを受け取る
socket.on('updatePlayerList', (playerList) => {
    updateOnlineListUI(playerList);
});

// 🌟 一覧を画面に表示するための関数
function updateOnlineListUI(playerList) {
    // 画面に一覧を表示する要素がなければ作る（例：IDが 'online-list' の div）
    let listDiv = document.getElementById('online-list');
    
    if (!listDiv) {
        listDiv = document.createElement('div');
        listDiv.id = 'online-list';
        listDiv.style = "position:fixed; top:10px; left:10px; background:rgba(0,0,0,0.6); color:white; padding:10px; border-radius:5px; font-size:12px; pointer-events:none; z-index:1000;";
        document.body.appendChild(listDiv);
    }

    // 中身を書き換え
    let html = `<strong>ログイン中 (${playerList.length}名)</strong><br>`;
    playerList.forEach(p => {
        html += `[ch${p.channel}] ${p.name}<br>`;
    });
    listDiv.innerHTML = html;
}
*/

/*
socket.on('state', (data) => {
    // 1. 受信確認
    if (!data) return;
    
    handleServerEvents(data);

    // 🌟 【最優先】アイテムの判定
    const allItemsFromServer = data.items || [];
    const currentItems = allItemsFromServer.filter(it => !it.isPickedUp);
    const currentTotalCount = allItemsFromServer.length;

    // 🌟 自分のデータから現在のチャンネルを取得
    const myHeroData = data.players[socket.id];
    const serverChannel = myHeroData ? myHeroData.channel : null;

    // --- 🔊 ドロップ音・入室音の判定 (既存ロジックを完全維持) ---
    let isChannelJustChanged = false;
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

    const currentPlayerIdsInMyChannel = new Set();
    let hasNewArrival = false;
    if (myHeroData) {
        for (let id in data.players) {
            if (id === socket.id) continue;
            const p = data.players[id];
            if (p.channel === serverChannel) {
                currentPlayerIdsInMyChannel.add(id);
                if (!window.prevPlayerIds.has(id)) {
                    if (!isChannelJustChanged && !window.recentLoginIds.has(id)) {
                        hasNewArrival = true;
                        const arrivalName = p.name || "Player";
                        addNotification(`${arrivalName} が入室しました。`, "#66FF66");
                    }
                }
            }
        }
        if (hasNewArrival && !isChannelJustChanged) {
            if (typeof playInviteSound === 'function') playInviteSound();
        }
    }
    window.prevPlayerIds = currentPlayerIdsInMyChannel;

    //console.log("⭐️確認の表示1");
    
    // ✋ 自分のデータがない場合は終了
    if (!myHeroData) return;

    // 🌟 重要：上書きされる前の「詳細なインベントリ」をJSONコピーで完全に保護
    // upsertUserInventoryでは保存されない「性能数値」をここで保持します
    const oldInventory = (window.hero && window.hero.inventory) ? JSON.parse(JSON.stringify(window.hero.inventory)) : [];
    
    const myHero = myHeroData;

    // ==================================================
    // 🛡️ 【詳細消失対策：ID/スロット二重照合版】
    // ==================================================
    if (myHero.inventory && Array.isArray(myHero.inventory)) {
        
        //console.log("--- [GRID DRAW CHECK] ---", myHero.inventory);

        myHero.inventory.forEach((newItem) => {
            if (!newItem) return;

            // 🌟 紐付けキー(ID)の特定
            const newKey = newItem.equipment_id || newItem.instanceId;

            // 古いデータから同じ装備を探す（ID一致を最優先、次にスロット番号）
            const oldItem = oldInventory.find(old => {
                const oldKey = old.equipment_id || old.instanceId;
                const isIdMatch = (newKey && oldKey && String(newKey) === String(oldKey));
                const isSlotMatch = (newItem.slot_index === old.slot_index && newItem.id === old.id);
                return isIdMatch || isSlotMatch;
            });

            // 詳細データ（totalALLStats）が消えて届いた場合に復元
            if (oldItem) {
                const isDataLost = (typeof newItem.totalALLStats === 'undefined' || newItem.totalALLStats === 0);
                
                if (isDataLost && oldItem.totalALLStats > 0) {
                    // loadUserInventory の JOIN 結果に含まれるすべての詳細項目を復元
                    const props = [
                        'name', 'displayName', 'imageName', 'atk', 'matk', 'def',
                        'str', 'dex', 'int', 'luk', 'maxHp', 'maxMp', 
                        'totalFirstStats', 'totalALLStats'
                    ];

                    props.forEach(p => {
                        // 新しいデータに値がない、または 0 の場合のみ上書き
                        if (newItem[p] === undefined || newItem[p] === 0 || newItem[p] === "") {
                            newItem[p] = oldItem[p];
                        }
                    });

                    // ID項目の相互補完（サーバーとクライアントの名称差異を吸収）
                    if (!newItem.instanceId && oldItem.instanceId) newItem.instanceId = oldItem.instanceId;
                    if (!newItem.equipment_id && oldItem.equipment_id) newItem.equipment_id = oldItem.equipment_id;
                    if (!newItem.type && oldItem.type) newItem.type = oldItem.type;

                    console.log(`🔧 Slot:${newItem.slot_index} (ID:${newKey}) の詳細データを救出しました`);
                }
            }
        });

        // 描画用のバッファを最新（復元済み）の状態に更新
        if (typeof inventoryVisualBuffer !== 'undefined') {
            inventoryVisualBuffer = myHero.inventory;
        }
    }
    // ==================================================

    // 最後にグローバル変数を更新
    window.hero = myHero;
});
*/

// ============================================================
// :::SOCKET_EXP_LOG::: ⚡ 経験値獲得ログの受信と管理
// ============================================================
/**
 * 役割：
 * - サーバーからの経験値獲得量（data.amount）の受信
 * - 表示用メッセージの生成と itemLogs リストへの格納
 * - ログ表示件数（上限5件）の制限によるメモリとUIの最適化
 * - ログ蓄積状態のコンソール監視
 */
socket.on('exp_log', (data) => {
    console.log("経験値の電波を受信しました！", data);
    
    // アイテムログを表示する「本物の箱」にデータを入れます
    if (typeof itemLogs !== 'undefined') {
        itemLogs.push({
            //text: `✨ Exp: 経験値を ${data.amount} 獲得した！`,
            text: `経験値を得ました。 (+${data.amount})`,
            timer: 500 // 3秒間
        });

        // ログが溜まりすぎないように調整
        if (itemLogs.length > 5) {
            itemLogs.shift();
        }
        
        console.log("ログの箱に入れました。現在の数:", itemLogs.length);
    }
});

// ============================================================
// :::SOCKET_GOLD_LOG::: 💰 ゴールド獲得ログの受信と管理
// ============================================================
/**
 * 役割：
 * - サーバーからの獲得金額（data.amount）の受信
 * - 表示用メッセージの生成と itemLogs リストへの格納
 * - ログ表示件数（上限5件）の制限によるUI表示の最適化
 * - ログ蓄積状態のコンソール監視
 */
socket.on('gold_log', (data) => {
    console.log("お金の電波を受信しました！", data);
    
    if (typeof itemLogs !== 'undefined') {
        itemLogs.push({
            //text: `💰 Gold: ${data.amount} GOLD 手に入れました！`, // ← ここを書き換え
            text: `ゴールドを得ました。(+${data.amount})`, // ← ここを書き換え
            timer: 500 
        });

        if (itemLogs.length > 5) {
            itemLogs.shift();
        }
        
        console.log("お金ログを箱に入れました。");
    }
});

// ============================================================
// :::SOCKET_UPDATE_PLAYER_VISUAL::: 🎭 他プレイヤーの外見変更同期
// ============================================================
/**
 * 役割：
 * - 受信した見た目データ(group, charVar)に基づき、未読み込みのキャラ画像をロード
 * - 保持しているプレイヤーリスト(players)の情報を書き換え、描画内容を最新化
 * - プレイヤーが「着替えた！」という変化を画面上で瞬時に反映させる
 */
socket.on('update_player_visual', (data) => {
    // data = { id: "相手のID", group: 5, charVar: 1 } のような形式
    
    // 相手が選んだ新しいグループの画像をロードしておく（まだ読み込んでいない場合のみ動く）
    if (data.group !== undefined && data.charVar !== undefined) {
        loadCharFrames(data.group, data.charVar);
    }

    // クライアント側で保持している他プレイヤーリストの情報を書き換える
    if (players && players[data.id]) {
        players[data.id].group = data.group;
        players[data.id].charVar = data.charVar;
    }
});

// ============================================================
// :::SOCKET_INVENTORY_UPDATE::: 🎒 インベントリ情報の同期処理
// ============================================================
/**
 * 役割：
 * - サーバー側での持ち物変更通知を受信
 * - 描画用バッファ(inventoryVisualBuffer)の更新による即時反映
 * - キャラクター本体(hero)の所持データとの整合性維持
 * - インベントリUIの再描画トリガー(renderInventory)
 */
socket.on('inventory_update', (data) => {
    console.log("🎒 アイテム専用窓口で更新を受け取りました！");
    
    if (data && data.inventory) {
        // 1. 表示用のバッファを更新
        inventoryVisualBuffer = data.inventory;

        // 2. プレイヤー本体のデータも更新 (重要！)
        if (window.hero) {
            window.hero.inventory = data.inventory;
        }

        // 3. もしインベントリ画面を開いているなら、再描画関数を呼ぶ
        if (typeof renderInventory === 'function') {
            renderInventory();
        }
        
        console.log("✅ インベントリデータを同期しました:", data.inventory);
    }
});

// ============================================================
// :::SOCKET_PLAYER_DIE_SOUND::: 💀 プレイヤー死亡時のサウンド演出
// ============================================================
/**
 * 役割：
 * - サーバー側での死亡イベント通知を受信
 * - クライアント側で死亡時の効果音（playDieSound）をトリガーする
 * - 視覚だけでなく聴覚を通じたフィードバックにより、ゲーム体験の整合性を保つ
 */
socket.on('player_die_sound', () => {
    if (typeof playDieSound === 'function') playDieSound();
});

// ============================================================
// :::SOCKET_PLAYER_JOINED_SOUND::: 🔔 入室時のサウンド演出制御
// ============================================================
/**
 * 役割：
 * - サーバーからの「他のプレイヤー入室」イベントを受信
 * - 演出関数(playInviteSound)を呼び出し、音によるフィードバックを提供
 * - 現在は二重再生防止等のためコメントアウト中ですが、将来のトリガーポイントとして保持
 */
socket.on('player_joined_sound', () => {
    // 指定された playInviteSound() を実行
    if (typeof playInviteSound === 'function') {
	    // socket.on('state',で鳴らしている
        //playInviteSound();
    } else {
        console.warn("playInviteSound が定義されていません。");
    }
});

let myDebugData = null;
let serverItemCount = 0; // アイテム数を入れる変数
// サーバーからのデバッグ専用データを受信
let serverDebugInfo = {};

// ============================================================
// :::SOCKET_TSUCHIDA_DEBUG* ::: 🛠️ サーバーデバッグ情報の同期
// ============================================================
/**
 * 役割：
 * - プレイヤー自身のデバッグ用状態(myDebugData)の抽出・保存
 * - サーバー上のアイテム総数(serverItemCount)の同期
 * - デバッグ情報全体(serverDebugInfo)の保持
 * - 開発中の異常検知や挙動確認のための重要な観測地点
 */
socket.on('tsuchida_debug', (data) => {
    if (data && data.players && socket.id) {
        myDebugData = data.players[socket.id];
    }
    // ここでアイテム数を受け取っています
    if (data && typeof data.itemCount !== 'undefined') {
        serverItemCount = data.itemCount;
    }
	serverDebugInfo = data;
});

// ============================================================
// :::SOCKET_ENEMY_HIT_SYNC::: ⚔️ 敵の被弾・撃破時のサウンド演出
// ============================================================
/**
 * 役割：
 * - 自身の攻撃が命中したかどうかのフィルタリング(attackerIdチェック)
 * - サーバーのデータとローカルの敵リスト(enemies)の突合
 * - 撃破(isDead)か被弾かによるサウンドの出し分け
 * - プレイヤーの攻撃成功を聴覚でフィードバックする
 */
socket.on('enemy_hit_sync', (data) => {
    // 自分の攻撃が当たった時だけ音を鳴らす
    if (data.attackerId !== socket.id) return;

    // 敵のデータを特定
    const target = enemies.find(e => e.id === data.enemyId);
    if (!target) return;

    if (data.isDead) {
        // サーバーが「死んだ」と認めた時だけ死亡音
        if (typeof playEnemyDieSound === 'function') playEnemyDieSound(target);
    } else {
        // サーバーが「当たった（まだ生きてる）」と認めた時だけヒット音
        if (typeof playEnemyHitSound === 'function') playEnemyHitSound(target);
    }
});

// ============================================================
// :::SOCKET_ITEM_PICKUP_LOG::: 🎒 アイテム取得ログの受信と管理
// ============================================================
/**
 * 役割：
 * - 受信したアイテムデータから取得メッセージを構築（複数個対応）
 * - itemLogs リストへの正規化されたデータの格納
 * - 他のログイベント（EXP/GOLD）と足並みを揃えた生存期間(timer)設定
 * - 画面占有を防ぐためのログ件数(最大5件)のガード処理
 */
socket.on('item_pickup_log', (data) => {
    console.log("ログ受信成功:", data);

    // 1. メッセージを作成
    let logMsg = data.amount >= 2 
        ? `アイテムを得ました。(${data.itemName} ${data.amount}個)` 
        : `アイテムを得ました。(${data.itemName})`;

    if (typeof itemLogs !== 'undefined') {
        // 2. 🌟 exp_logと同じ形式（timer）でデータを追加します
        itemLogs.push({
            text: logMsg,
            timer: 500,        // 🌟 ここを time ではなく exp_log と同じ timer に合わせます
            color: '#ffeb3b'   // ゴールドの色
        });

        // 3. ログが溜まりすぎないように調整
        if (itemLogs.length > 5) {
            itemLogs.shift();
        }
        
        console.log("アイテムログを箱に入れました。現在の数:", itemLogs.length);
    }
});

// クライアント側：サーバーからの返事を受け取って表示を更新する
socket.on('account_info_response', (data) => {
	
    console.log("【確認】サーバーからデータが届いたよ！:", data);
	
    if (gameWindows.options) {
        gameWindows.options.wikiId = data.wikiId;
        // 【追加】ここで isLinked も保存します！
        gameWindows.options.isLinked = data.isLinked; 
        
        console.log("Wiki IDを受信成功:", data.wikiId, " / 連携状態:", data.isLinked);
    }
});

// ============================================================
// 🎨 [SECTION 7: RENDER] 描画エンジン
// 役割: Canvasへの描画処理とメインループ(60FPS)
// ============================================================
// ============================================================
// :::DRAW_GAME::: 🎨 ゲーム描画の総司令塔（レンダリングループ）
// ============================================================
/**
 * 役割：
 * - 描画パイプラインの管理：毎フレームの更新から描画までを統括
 * - 階層構造の維持：背景、キャラクター、UI、通知、デバッグ情報の順に重ねて描画
 * - 状態の更新：タイマー、経験値演出、UI状態の同期
 * - デバッグ支援：開発モード時の当たり判定可視化処理
 */
function drawGame(hero, others, enemies, items, platforms, ladders, damageTexts, frame) {
    // 1. データの事前更新（タイマー・経験値演出など）
    updateTimers();
    updateUIState(hero);
    updateExpAnimation(hero); // 🌟 経験値の数値を滑らかにする計算を分離
    
    // 2. 画面のリセット
    ctx.clearRect(0, 0, VIEW_CONFIG.SCREEN_WIDTH, VIEW_CONFIG.SCREEN_HEIGHT);

    // 3. 背景・マップの描画
    drawMap(platforms, ladders);

    // 4. 動体（エンティティ）の描画
    drawEntities(hero, others, enemies, items, frame);

    // 5. エフェクトの描画
    drawEffects(damageTexts, hero, others);

    // 6. UI（最前面）の描画
    drawUIOverlay(hero);
    
    // 7. 特殊UI表示（チャンネル表示・マウス追従アイテム）
    drawChannelHUD(hero);
	
	if (typeof drawOnlineList === 'function') {
        drawOnlineList(ctx);
    }
    
	drawHeldItem();
	
	// 🌟 ここに追加！一番手前に通知を出す
    if (typeof drawNotificationArea === 'function') {
        drawNotificationArea(ctx, VIEW_CONFIG.SCREEN_WIDTH, VIEW_CONFIG.SCREEN_HEIGHT);
    }
	
    // ==========================================
    // 🛠️ デバッグ表示（DEBUG_MODE が true の時のみ実行）
    // ==========================================
    if (DEBUG_MODE) {
        drawDebugLayer(hero, enemies, items, platforms);
    }
	
	// 🌟 追記：他プレイヤーの判定枠をメインCanvasに描く
    if (typeof others !== 'undefined') {
        // ctx は drawGame 内で使っているメインの Context を使用してください
        for (let id in others) {
            const p = others[id];
            
            ctx.strokeStyle = "red";
            ctx.lineWidth = 2;
            // キャラクターの座標(p.x, p.y)を中心に100pxの枠
            ctx.strokeRect(p.x - 30, p.y - 50, 100, 100);
            
            // 座標点（黄色いドット）
            ctx.fillStyle = "yellow";
            ctx.beginPath();
            ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
            ctx.fill();
        }
    }
	
	if (window.isDisconnected) {
    ctx.save();
    
    // 【重要】座標変換をすべてリセットする（これが無いとズレます）
    ctx.setTransform(1, 0, 0, 1, 0, 0); 
    
    // 画面全体を覆う黒い背景
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    // 実際のキャンバスの横幅と高さをそのまま使う
    ctx.fillRect(0, 0, canvas.width, canvas.height); 
    
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    
    // 文字サイズを調整
    ctx.font = "bold 40px sans-serif";
    
    // 現在のキャンバスの真ん中を取得
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    // 描画
    ctx.fillText("接続が切れました", centerX, centerY);
    
    ctx.restore();
}
}

// ============================================================
// :::DRAW_CHANNEL_HUD::: 📡 チャンネル表示（HUD）の描画
// ============================================================
/**
 * 役割：
 * - 現在のプレイヤー所属チャンネル(hero.channel)の取得と表示
 * - フォントスタイル（bold 16px）および右寄せ配置の管理
 * - 黒い縁取りによる背景色に依存しない高い視認性の確保
 * - 金色のグラデーション風カラーによるUIとしてのアクセント付け
 */
function drawChannelHUD(hero) {
    // heroが存在しない場合や、channelが設定されていない場合は「1」として表示する
    if (typeof hero !== 'undefined') {
        const channelNum = hero.channel || 1;

        ctx.save();
        // フォント設定（少し小さめの14px〜16pxにするとUIとして馴染みます）
        ctx.font = "bold 16px 'Arial', sans-serif";
        ctx.textAlign = "right"; 
        
        const x = VIEW_CONFIG.SCREEN_WIDTH - 20;
        const y = 35;
        const text = `CH.${channelNum}`;

        // 🖤 黒い縁取り（これでどんな背景でも見えます）
        ctx.strokeStyle = "black";
        ctx.lineWidth = 3;
        ctx.lineJoin = "round";
        ctx.strokeText(text, x, y);

        // 💛 メインの文字色（金色のグラデーション風）
        ctx.fillStyle = "#fbbf24"; 
        ctx.fillText(text, x, y);

        ctx.restore();
    }
}

// ============================================================
// :::DRAW_HELD_ITEM::: 🖐️ マウス追従アイテム（ドラッグ中）の描画
// ============================================================
/**
 * 役割：
 * - ドラッグ操作中（isDiscardingがfalse）かつアイテムが選択されているかを判定
 * - マウス座標(mouseX, mouseY)を基準にしたアイテム画像のレンダリング
 * - 半透明処理(globalAlpha = 0.6)による「掴んでいる感」の演出
 * - 描画コンテキストの保存・復元による環境汚染の防止
 */
function drawHeldItem() {
    // 捨てる動作中でなく、有効なスロットが選択されている場合
    if (!isDiscarding && typeof selectedSlotIndex !== 'undefined' && selectedSlotIndex !== -1) {
        if (inventoryVisualBuffer && inventoryVisualBuffer[selectedSlotIndex]) {
            const item = inventoryVisualBuffer[selectedSlotIndex];
            const itemImg = itemImages[item.type];
            
            if (itemImg) {
                ctx.save();
                ctx.globalAlpha = 0.6; // 掴んでいる感を出すための半透明
                // マウス座標を中心に描画
                ctx.drawImage(itemImg, mouseX - 15, mouseY - 15, 30, 30);
                ctx.restore();
            }
        }
    }
}

// ============================================================
// :::DRAW_DEBUG_LAYER::: 🛠️ 開発者用・当たり判定の可視化レイヤー
// ============================================================
/**
 * 役割：
 * - プレイヤー/敵/アイテムの当たり判定（矩形）を色分け表示
 * - サーバー側との地面判定（ライン）の可視化
 * - 攻撃判定エリアのリアルタイム追従描画
 * - 露店（vending_rect）の有効範囲をマゼンタで強調表示
 * - 開発中の異常検知を容易にし、物理挙動のデバッグ効率を最大化する
 */
function drawDebugLayer(hero, enemies, items, platforms) {
    ctx.save();

    // --- A. プレイヤーの判定（緑色） ---
    ctx.strokeStyle = "lime";
    ctx.lineWidth = 2;
    const visualCenterX = hero.x + 20; 
    const visualWidth = 20; 
    
    ctx.strokeRect(
        visualCenterX - visualWidth, 
        hero.y + 58, 
        visualWidth * 2, 
        4
    );

    // --- B. 足場の判定（赤色） ---
    platforms.forEach(p => {
        ctx.strokeStyle = "red";
        ctx.lineWidth = 2;
        ctx.strokeRect(p.x, p.y, p.w, 8);
        
        ctx.fillStyle = "rgba(255, 0, 0, 0.15)";
        const margin = 50; 
        ctx.fillRect(p.x - margin, p.y, p.w + (margin * 2), 20);
        
        ctx.strokeStyle = "rgba(255, 0, 0, 0.5)";
        ctx.strokeRect(p.x - margin, p.y, p.w + (margin * 2), 20);
    });

    // --- C. アイテムの判定（青色） ---
    if (items && items.length > 0) {
        items.forEach(it => {
            const itemSize = 32; 
            ctx.strokeStyle = "cyan";
            ctx.lineWidth = 1;
            ctx.strokeRect(it.x, it.y, itemSize, itemSize);

            ctx.fillStyle = "blue";
            ctx.beginPath();
            ctx.arc(it.x + itemSize/2, it.y + itemSize/2, 3, 0, Math.PI * 2);
            ctx.fill();

            ctx.beginPath();
            ctx.strokeStyle = "blue";
            ctx.moveTo(it.x, it.y + itemSize);
            ctx.lineTo(it.x + itemSize, it.y + itemSize);
            ctx.stroke();
            
            if (it.vy !== 0) {
                ctx.fillStyle = "white";
                ctx.font = "10px Arial";
                ctx.fillText(`vy: ${it.vy.toFixed(1)}`, it.x, it.y - 5);
            }
        });
    }
    
    // --- D. 敵の判定（赤色） ---
    if (enemies) {
        Object.values(enemies).forEach(en => {
            const debugVisualY = en.y + (en.jumpY || 0);
            ctx.strokeStyle = "red";
            ctx.lineWidth = 1;
            ctx.strokeRect(en.x, debugVisualY, en.w || 40, en.h || 40);
            
            ctx.fillStyle = "red";
            ctx.font = "10px Arial";
            ctx.fillText(`HP: ${en.hp}`, en.x, debugVisualY - 5);
        });
    }
    
    // --- E. 地面判定ラインの可視化 ---
    const serverGroundY = 565; 
    ctx.strokeStyle = "yellow";
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]); 
    ctx.beginPath();
    ctx.moveTo(0, serverGroundY);
    ctx.lineTo(VIEW_CONFIG.SCREEN_WIDTH, serverGroundY);
    ctx.stroke();
    
    ctx.fillStyle = "yellow";
    ctx.font = "bold 12px Arial";
    ctx.fillText(`サーバーの地面判定: ${serverGroundY}px`, 10, serverGroundY - 5);

    // --- F. 攻撃判定の可視化（オレンジ色） ---
    if (hero.isAttacking > 0) {
        ctx.save();
        ctx.strokeStyle = "orange";
        ctx.lineWidth = 3;
        ctx.fillStyle = "rgba(255, 165, 0, 0.3)";

        const atkWidth = 80;
        const atkHeight = 100; 
        const offsetX = (hero.dir === 1) ? 60 : -(atkWidth + 20);
        const atkX = hero.x + offsetX;

        let atkY;
        const groundThreshold = 450; 
        if (hero.y >= groundThreshold) {
            atkY = hero.y - 85; 
        } else {
            atkY = hero.y - 50;
        }

        ctx.strokeRect(atkX, atkY, atkWidth, atkHeight);
        ctx.fillRect(atkX, atkY, atkWidth, atkHeight);

        ctx.fillStyle = "white";
        ctx.font = "bold 12px Arial";
        ctx.fillText(`Attack: ${hero.isAttacking}`, atkX, atkY - 5);
        ctx.restore();
    }
	
	// --- G. 他プレイヤーの露店判定の可視化（マゼンタ色） ---
    // others は drawGame から渡される他プレイヤーのリストを想定
    if (typeof others !== 'undefined') {
        Object.values(others).forEach(p => {
            if (p.is_vending && p.vending_rect) {
                const r = p.vending_rect;
                
                // 判定エリアを枠線で表示
                ctx.strokeStyle = "magenta";
                ctx.lineWidth = 2;
                ctx.setLineDash([]); // 点線を解除
                ctx.strokeRect(r.x, r.y, r.w, r.h);

                // 塗りつぶし（半透明）
                ctx.fillStyle = "rgba(255, 0, 255, 0.2)";
                ctx.fillRect(r.x, r.y, r.w, r.h);

                // 座標情報のテキスト
                ctx.fillStyle = "magenta";
                ctx.font = "bold 10px Arial";
                ctx.fillText(`Shop: ${p.vending_title || 'No Title'}`, r.x, r.y - 15);
                ctx.fillText(`Rect: ${Math.round(r.x)},${Math.round(r.y)}`, r.x, r.y - 5);
            }
        });
    }

    ctx.restore();
}

// ============================================================
// :::DRAW_ENTITIES::: 🏃 動体（エンティティ）の一括レンダリング
// ============================================================
/**
 * 役割：
 * - 描画スタックの管理：敵→他プレイヤー→自分→アイテム→エフェクトの順に重なりを制御
 * - 条件付きレンダリング：同一チャンネル内のプレイヤーのみを表示し、露店状態に応じて看板を付与
 * - レベルアップエフェクトの生存管理：生存期間(timer)によるフェードアウトと配列からの自動削除
 * - キャラクター中心座標の計算およびエフェクトの追従描画
 */
function drawEntities(hero, others, enemies, items, frame) {
    // -------------------------------------------------------
    // 1. 敵（モンスター）を描画
    // -------------------------------------------------------
    drawEnemies(enemies, hero, frame);

    // -------------------------------------------------------
    // 2. 他のプレイヤーを描画
    // -------------------------------------------------------
    for (let id in others) {
        const p = others[id];
        
        if (p && id !== socket.id && p.channel === hero.channel) {
            drawPlayerObj(p, false, id);

            // 🏪 他人の露店看板を表示（開店中の場合のみ）
            if (p.is_vending) {
                drawVendingSign(p);
            }
        }
    }

    // -------------------------------------------------------
    // 3. 自分自身を描画
    // -------------------------------------------------------
    drawPlayerObj(hero, true);

    // 🏪 自分の露店看板を表示（自分が開店中の場合）
    if (hero && hero.is_vending) {
        drawVendingSign(hero);
    }

    // -------------------------------------------------------
    // 4. アイテム（地面に落ちているもの）を描画
    // -------------------------------------------------------
    drawItems(items, frame);
    
    // -------------------------------------------------------
    // 5. レベルアップエフェクトの同期描画
    // -------------------------------------------------------
    levelUpEffects.forEach((eff, index) => {
        const p = (hero && hero.id === eff.playerId) ? hero : (others ? others[eff.playerId] : null);
        
        if (p && p.channel === hero.channel) {
            ctx.save();
            
            ctx.font = "bold 60px 'Arial Black'"; 
            ctx.fillStyle = "#80FF00";   
            ctx.strokeStyle = "#004400"; 
            ctx.lineWidth = 4;
            ctx.textAlign = "center";

            let offset = 0;
            if (hero.id !== eff.playerId) {
                offset = 130; 
            }

            const drawX = (p.x + (p.w || 40) / 2) - offset;
            const drawY = p.y - 60 - (120 - eff.timer) * 0.8;

            ctx.strokeText("LEVEL UP !!", drawX, drawY);
            ctx.fillText("LEVEL UP !!", drawX, drawY);
            
            ctx.restore();
        }

        eff.timer--;
        if (eff.timer <= 0) {
            levelUpEffects.splice(index, 1);
        }
    });
}

// ============================================================
// :::DRAW_VENDING_SIGN::: 🏪 露店看板のレンダリングと判定領域設定
// ============================================================
/**
 * 役割：
 * - プレイヤーの開店状態(is_vending)の監視とレンダリングのトリガー
 * - タイトルテキストの長さに基づいた看板ボックス（ゴールド〜オレンジ）の自動調整
 * - 他プレイヤー表示時の座標ズレ補正（manualOffsetX）の適用
 * - 看板エリアのクリック判定用データ（p.vending_rect）のCanvasへの登録
 */
function drawVendingSign(p) {
    // 🌟 露店フラグを絶対条件にします
    if (!p || !p.is_vending) return;

    // 同期処理で守られた p.vending_title を参照
    const title = p.vending_title || ""; 

    ctx.save();
    
    // 文字の長さに合わせて看板のサイズを自動調整
    ctx.font = "bold 13px sans-serif";
    
    // 🌟 描画用の変数：中身が空の場合のみ、見た目上のフォールバックを表示
    let displayTitle = title;
    if (!title || title === "") {
        displayTitle = "Loading title..."; 
    }
    const textWidth = ctx.measureText(displayTitle).width;
    const padding = 10;
    const signW = textWidth + (padding * 2);
    const signH = 24;

    // 🛠 手動調整用パラメータ
    // hero.id と一致しない（他人である）場合のみ、手動で位置を戻します。
    // 右にずれている分を左に戻すため、マイナスの値を設定します。
    let manualOffsetX = 0;
    if (typeof hero !== 'undefined' && p.id !== hero.id) {
        // 🌟 レベルアップエフェクトと同様の調整値（右に寄る分を左に-130戻す）
        // まだずれる場合は、この数値を -140 や -120 などに微調整してください。
        manualOffsetX = -130; 
    }

    // 表示位置：キャラクターの頭上中央（手動オフセットを適用）
    const charCenter = p.x + (p.w || 40) / 2 + manualOffsetX;
    const signX = charCenter - (signW / 2);
    const signY = p.y - 55; // 頭上55pxの位置
    const rectY = signY - 17; // 四角形の描画開始位置

    // 看板の影（少し浮いている感じを出す）
    ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 2;

    // 看板の背景（ゴールド〜オレンジのグラデーション）
    const grad = ctx.createLinearGradient(signX, rectY, signX, rectY + signH);
    grad.addColorStop(0, "#FFD700"); // 上部：ゴールド
    grad.addColorStop(1, "#FFA500"); // 下部：オレンジ
    
    ctx.fillStyle = grad;
    ctx.strokeStyle = "#8B4513"; // フチ：濃い茶色
    ctx.lineWidth = 2;

    // 角丸ボックスの描画
    if (typeof ctx.roundRect === "function") {
        ctx.beginPath();
        ctx.roundRect(signX, rectY, signW, signH, 8);
        ctx.fill();
        ctx.stroke();
    } else {
        ctx.fillRect(signX, rectY, signW, signH);
        ctx.strokeRect(signX, rectY, signW, signH);
    }

    // 看板の文字
    ctx.shadowBlur = 0; // 文字には影をつけない
    ctx.fillStyle = "#3E2723"; // 文字色：深い焦げ茶
    
    // 💡 ズレ防止のため textAlign は left に固定し、計算済みの座標を使用
    ctx.textAlign = "left"; 
    
    // 🌟 内部データではなく表示用変数を使用
    ctx.fillText(displayTitle, signX + padding, signY); 

    // --- 💡 [追記] クリック判定用の座標データを保存 ---
    // 他のユーザーがこの看板をクリックしたかどうかを判定するために使用します。
    p.vending_rect = {
        x: signX,
        y: rectY,
        w: signW,
        h: signH
    };
	
    ctx.restore();
}

// ============================================================
// :::DRAW_EFFECTS::: ✨ 戦闘・交流・収集演出の統括レンダリング
// ============================================================
/**
 * 役割：
 * - 演出レイヤーの統合管理（ダメージ表示、吹き出し、吸い込み演出）
 * - 描画スタックの維持（キャラクターの上にこれらの演出を重ねる）
 * - 各演出コンポーネント（damageTexts, bubbles, pickup）の描画トリガー
 */
function drawEffects(damageTexts, hero, others) {
    drawDamageTexts(damageTexts);    // ダメージ数字
    drawChatBubbles(hero, others);   // チャット吹き出し
    drawPickupEffects(hero, others); // アイテム吸い込み
}

// ============================================================
// :::DRAW_SIMPLE_WINDOW::: 🍁 メイプル調UIウィンドウの描画
// ============================================================
/**
 * 役割：
 * - 青白いグラデーション背景と茶色の外枠を用いたメイプル調ウィンドウの描画
 * - タイトルバーのレンダリングおよび影付きテキストによる高い視認性の確保
 * - 閉じるボタン（円形・ホバー反応付き）のレンダリングとインタラクション処理
 * - ウィンドウ下部の装飾領域（所持金表示など）の確保
 */
function drawSimpleWindow(title, x, y, w, h) {
    // 🌟 描画状態を保存
    ctx.save();

    // --- 1. 外枠と背景（メイプル特有の青白いグラデーション） ---
    const bgGrad = ctx.createLinearGradient(x, y, x, y + h);
    bgGrad.addColorStop(0, "#e8f1f8"); // 上部：明るい白青
    bgGrad.addColorStop(1, "#99b6d6"); // 下部：落ち着いた青
    
    ctx.fillStyle = bgGrad;
    // メイプル風の濃い茶色の外枠
    ctx.strokeStyle = "#4d3d2d"; 
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 6); // 少し角を丸く
    ctx.fill();
    ctx.stroke();

    // 🌟 メイプル感を出す「内側の黄色い縁取り」
    ctx.strokeStyle = "#f9d448"; 
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);

    // --- 2. タイトルバー（濃い青の光沢グラデーション） ---
    const titleBarH = 30;
    const titleGrad = ctx.createLinearGradient(x, y, x, y + titleBarH);
    titleGrad.addColorStop(0, "#5b7da3"); // 上：明るめの青
    titleGrad.addColorStop(1, "#36557a"); // 下：濃い青
    
    ctx.fillStyle = titleGrad;
    ctx.beginPath();
    // タイトルバーも少し内側に配置して余白を作る
    ctx.roundRect(x + 4, y + 4, w - 8, titleBarH - 4, 3);
    ctx.fill();
    
    // タイトルバーの下の細い光（立体感）
    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    ctx.beginPath();
    ctx.moveTo(x + 5, y + titleBarH);
    ctx.lineTo(x + w - 5, y + titleBarH);
    ctx.stroke();

    // --- ❌ 閉じるボタンの判定と描画（ぷにっとした赤い円形デザイン） ---
    const btnSize = 18;
    const btnX = x + w - 24;
    const btnY = y + 8;

    // 🖱️ マウスホバーチェック
    const isHoveringClose = (mouseX >= btnX && mouseX <= btnX + btnSize &&
                             mouseY >= btnY && mouseY <= btnY + btnSize);

    // ホバー時は明るい赤、通常時はメイプル風の落ち着いた赤
    ctx.fillStyle = isHoveringClose ? "#ff6b6b" : "#d94a4a";
    ctx.beginPath();
    // 円形ボタンにして可愛く
    ctx.arc(btnX + btnSize/2, btnY + btnSize/2, btnSize/2, 0, Math.PI * 2);
    ctx.fill();

    // ボタンに小さなハイライトを追加（おもちゃのような質感）
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    ctx.beginPath();
    ctx.arc(btnX + btnSize/3.5, btnY + btnSize/3.5, btnSize/5, 0, Math.PI * 2);
    ctx.fill();

    // 🌟 閉じる文字「×」
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 12px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("×", btnX + btnSize/2, btnY + btnSize/2);
    // ---------------------------------

    // --- 3. タイトル文字（影付きの白文字で視認性アップ） ---
    ctx.textAlign = "left"; 
    ctx.textBaseline = "middle";
    ctx.font = "bold 14px 'MS PGothic', sans-serif";
    
    // 文字の影（少し下にずらす）
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillText(title, x + 13, y + titleBarH / 2 + 3);

    // 文字本体
    ctx.fillStyle = "#ffffff";
    ctx.fillText(title, x + 12, y + titleBarH / 2 + 2);

    // 🌟 ホバー時にカーソルを指マークに変える
    if (isHoveringClose) {
        canvas.style.cursor = "pointer";
    }

    // --- 4. ウィンドウ下部の装飾（所持金などを入れるスペース感） ---
    ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
    ctx.beginPath();
    ctx.roundRect(x + 6, y + h - 30, w - 12, 24, 4);
    ctx.fill();

    // 🌟 元の状態に戻す
    ctx.restore();
}

// ============================================================
// :::DRAW_GOLD_UI::: 💰 所持金表示UIのレンダリング
// ============================================================
/**
 * 役割：
 * - プレイヤーの所持ゴールド(hero.gold)の取得と表示
 * - 視覚的な階層化：暗い背景枠、コインアイコン、金色のテキストによる情報構成
 * - 数値のフォーマット管理（カンマ区切りによる可読性向上）
 * - UI要素（グラデーション、アイコン、テキスト）の描画順序の制御
 */
function drawGoldUI(hero) {
    if (!hero) return;

    ctx.save();

    // --- 1. 元の座標とサイズ感をベースに設定 ---
    const drawX = 25;
    const drawY = 90; 
    const barW = 150; 
    const barH = 32;

    // --- 2. 背景枠（グラデーション） ---
    const bgGrad = ctx.createLinearGradient(drawX, drawY, drawX, drawY + barH);
    bgGrad.addColorStop(0, "rgba(30, 30, 30, 0.9)"); 
    bgGrad.addColorStop(1, "rgba(0, 0, 0, 0.9)");   
    
    ctx.fillStyle = bgGrad;
    ctx.strokeStyle = "rgba(255, 215, 0, 0.7)"; 
    ctx.lineWidth = 2;

    if (typeof drawRoundedRect === 'function') {
        drawRoundedRect(ctx, drawX, drawY, barW, barH, 6);
        ctx.fill();
        ctx.stroke();
    } else {
        ctx.fillRect(drawX, drawY, barW, barH);
        ctx.strokeRect(drawX, drawY, barW, barH);
    }

    // --- 3. コインアイコン ---
    const iconX = drawX + 16;
    const iconY = drawY + barH / 2;
    
    ctx.beginPath();
    ctx.arc(iconX, iconY, 10, 0, Math.PI * 2);
    const coinGrad = ctx.createRadialGradient(iconX - 3, iconY - 3, 2, iconX, iconY, 10);
    coinGrad.addColorStop(0, "#fff7ad"); 
    coinGrad.addColorStop(1, "#ffd700"); 
    ctx.fillStyle = coinGrad;
    ctx.fill();
    ctx.strokeStyle = "#b8860b";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = "#8b4513";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("G", iconX, iconY);

    // --- 4. 元のスタイルを踏襲した数値表示 ---
    ctx.font = "bold 20px sans-serif"; 
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    
    const goldVal = hero.gold || 0;
    const goldText = goldVal.toLocaleString(); 
    
    ctx.strokeStyle = "black";
    ctx.lineWidth = 3;
    ctx.strokeText(goldText, drawX + barW - 12, drawY + barH / 2 + 1);
    
    ctx.fillStyle = "gold"; 
    ctx.fillText(goldText, drawX + barW - 12, drawY + barH / 2 + 1);

    ctx.restore();
}

// ============================================================
// :::DRAW_GAME_WINDOWS::: 🪟 ウィンドウ階層と描画の司令塔
// ============================================================
/**
 * 役割：
 * - windowStack に基づくウィンドウの描画順序（Z-Order）管理
 * - 各ウィンドウの表示状態(isOpen)チェック
 * - 共通描画コンテキストのリセットおよび描画関数の呼び出し
 * - メインステータスからシステム設定まで、多岐にわたるUIの一括統括
 */
function drawGameWindows(hero) {
    windowStack.forEach(windowName => {
        const win = gameWindows[windowName];
        if (!win || !win.isOpen) return;

        // 🌟 共通の描画リセット処理
        ctx.textAlign = "left";
        ctx.textBaseline = "alphabetic";
        
        if (!window.hoverFlags) {
            window.hoverFlags = { str: false, dex: false, luk: false };
        }

        // --- ウィンドウ別の描画関数呼び出し ---
        // 1. メインステータス・成長系
        if (windowName === "status") {
            if (hero) drawStatusWindow(); 
        } 
        else if (windowName === "equipment") {
            drawEquipmentWindow();
        }
        else if (windowName === "inventory") {
            drawInventoryWindow();
        } 
        else if (windowName === "skill") {
            drawSkillWindow();
        }
        else if (windowName === "avatar") {
            drawAvatarWindow();
        }
        else if (windowName === "upgrade") {
            drawUpgradeWindow();
        }

        // 2. 冒険・ナビゲーション系
        else if (windowName === "quest") {
            drawQuestWindow();
        }
        else if (windowName === "worldmap") {
            drawWorldMapWindow();
        }
        else if (windowName === "minimap") {
            drawMiniMapWindow();
        }
        else if (windowName === "journal") {
            drawJournalWindow();
        }
        else if (windowName === "book") {
            drawBookWindow();
        }

        // 3. ソーシャル・コミュニティ系
        else if (windowName === "guild") {
            drawGuildWindow();
        }
        else if (windowName === "friend") {
            drawFriendWindow();
        }
        else if (windowName === "party") {
            drawPartyWindow();
        }
        else if (windowName === "trade") {
            drawTradeWindow();
        }

        // 4. システム・ログ・通知系
        else if (windowName === "log") {
            drawLogWindow();
        }
        else if (windowName === "event") {
            drawEventWindow();
        }
        else if (windowName === "options") {
            drawOptionsWindow();
        }
        else if (windowName === "help") {
            drawHelpWindow();
        }

        // 5. 特殊・予約枠
        else if (windowName === "extra") {
            drawExtraWindow();
        }
        else if (windowName === "reserved_d") {
            drawReservedDWindow();
        }
        else if (windowName === "reserved_v") {
            drawReservedVWindow();
        }
    });
}

// ============================================================
// :::DRAW_UI_OVERLAY::: 🎨 UIレイヤー全体の総合レンダリング司令塔
// ============================================================
/**
 * 役割：
 * - UIの描画フロー管理：基本UI → 所持金 → インベントリ → ウィンドウ群 → ツールチップ
 * - ホバー判定の集約：インベントリ等のアイテムホバー情報を一元管理(hoveredItemForTooltip)
 * - レイヤー制御：メインキャンバス(ctx)でベースを描画し、最前面(tCtx)でツールチップを表示する2層構造の管理
 * - 安全性確保：heroデータの存在チェックによるレンダリングエラーの防止
 */
function drawUIOverlay(hero) {
    if (!hero) return; // 🌟 heroが空っぽの時は何もしない

    // 1. 基本UIパーツの描画（背面Canvas: ctx）
    drawItemLogsUI();
    drawTopStatusUI(hero);

    // 🌟 分離された所持金表示
    drawGoldUI(hero);

    // ==========================================
    // 🎒 インベントリグリッド（メインループ部分）
    // ==========================================
    // 🌟 接続が切れている場合は、ホバー判定をスキップするため null に固定
    if (window.isDisconnected) {
        window.hoveredItemForTooltip = null;
    } else {
        // 🌟 接続中の時だけホバー判定を計算
        window.hoveredItemForTooltip = null;
    }

    // インベントリの描画自体は接続状態に関わらず常に実行する
    if (hero && hero.inventory) {
        // グリッド背景などは背面に描画
        drawInventoryGrid(ctx, hero.inventory);

        // 🌟 接続中のみ詳細なホバー判定計算を行う
        if (!window.isDisconnected) {
            const startX = 20;
            const startY = 130;
            const slotSize = 40;
            const spacing = 8;

            hero.inventory.forEach((slot, index) => {
                if (!slot || !slot.type || slot.count <= 0) return;
                const x = startX + (index * (slotSize + spacing));
                const y = startY;

                // マウスがアイテムの上にあるか判定
                if (mouseX >= x && mouseX <= (x + slotSize) &&
                    mouseY >= y && mouseY <= (y + slotSize)) {
                    window.hoveredItemForTooltip = slot;
                }
            });
        }
    }

    // 🌟 整理：重なり順を管理する配列に基づいてウィンドウ群を描画（背面Canvas）
    drawGameWindows(hero);
    
    // ==========================================
    // ✨ ツールチップ描画の実行（最前面Canvas: tCtx）
    // ==========================================
    // 🌟 修正：切断時はツールチップを描画しないガードを追加
    if (!window.isDisconnected && typeof tCtx !== 'undefined') {
        // 2. もしインベントリ（または今後実装するショップ）でアイテムを触っていたら描画
        if (window.hoveredItemForTooltip) {
            drawItemTooltip(tCtx, window.hoveredItemForTooltip, mouseX, mouseY, hero);
        }
    }
}

// ============================================================
// :::DRAW_ITEM_TOOLTIP::: 🎨 アイテム詳細情報のツールチップ表示
// ============================================================
/**
 * 役割：
 * - ツールチップボックスの動的サイズ計算および半透明背景の描画
 * - アイテムランク（bonus）に基づく色の自動決定とglow演出
 * - 画像キャッシュを活用したアイテムアイコンのレンダリング
 * - 装備品の詳細ステータス（STR/DEX/etc）および強化回数の表示
 * - 描画パイプラインの安全管理（save/restoreによる汚染防止）
 */
function drawItemTooltip(ctx, slot, mouseX, mouseY, hero) {
    if (!slot) return;

    // 🛡️ 1. 現在のCanvas状態（フォント、色、座標系）をすべて保存
    ctx.save();

    // 装備判定の拡張
    const isEquipment = (
        slot.type === 'sword' || 
        slot.type === 'shield' || 
        slot.category === 'weapon1' || 
        slot.category === 'shield1' || 
        slot.category === 'armor1' ||
        ['sword', 'armor', 'shield'].includes(slot.item_type)
    );
    
    // --- 🌟 動的ステータス計算ロジック ---
    let totalFirstStats = slot.totalFirstStats;
    let totalALLStats = slot.totalALLStats;
    const statKeys = ['str', 'dex', 'int', 'luk', 'maxHp', 'maxMp', 'atk', 'matk', 'def'];

    if (isEquipment) {
        if (totalFirstStats === undefined && typeof ITEM_CATALOG !== 'undefined') {
            const catalogItem = ITEM_CATALOG[slot.id || slot.item_id];
            if (catalogItem) {
                totalFirstStats = statKeys.reduce((acc, key) => {
                    let val = (catalogItem[key] || 0);
                    if (key === 'maxHp' || key === 'maxMp') val = val / 10;
                    return acc + val;
                }, 0);
            }
        }
        if (totalALLStats === undefined) {
            totalALLStats = statKeys.reduce((acc, key) => {
                let val = (parseInt(slot[key]) || 0);
                if (key === 'maxHp' || key === 'maxMp') val = val / 10;
                return acc + val;
            }, 0);
        }
    }

    // --- ランク・名称解決 ---
    let reqLevel = (slot.lv !== undefined) ? parseInt(slot.lv) : 7;
    let starCount = (slot.star !== undefined) ? parseInt(slot.star) : 0;
    let successCount = (slot.successCount !== undefined) ? parseInt(slot.successCount) : 0;
    
    let categoryName = "";
    if (isEquipment) {
        const catMap = { "weapon1": "武器", "shield1": "盾", "armor1": "防具" };
        categoryName = catMap[slot.category] || (slot.type === 'sword' ? "片手剣" : "盾");
    }

    let baseItemName = "アイテム";
    if (typeof ITEM_CONFIG !== 'undefined' && ITEM_CONFIG[slot.type]) {
        baseItemName = ITEM_CONFIG[slot.type].display_name || ITEM_CONFIG[slot.type].name;
    } else {
        baseItemName = slot.name || (slot.type === 'shield' ? "盾" : (slot.type === 'sword' ? "剣" : slot.type));
    }
    if (isEquipment && successCount > 0) baseItemName = `${baseItemName} (+${successCount})`;

    let itemName = baseItemName;
    let statusText = "";
    let displayColor = "#ffffff";
    let glowColor = null;

    if (isEquipment && totalALLStats !== undefined && totalFirstStats !== undefined) {
        const bonus = totalALLStats - totalFirstStats;
        let rankName = "";
        if (bonus >= 30) { displayColor = "#ff0000"; rankName = "(神級)"; glowColor = displayColor; }
        else if (bonus >= 25) { displayColor = "#00ff00"; rankName = "(超伝説)"; glowColor = displayColor; }
        else if (bonus >= 20) { displayColor = "#ffff00"; rankName = "(極上)"; glowColor = displayColor; }
        else if (bonus >= 15) { displayColor = "#ff00ff"; rankName = "(伝説)"; glowColor = displayColor; }
        else if (bonus >= 10) { displayColor = "#00ccff"; rankName = "(希少)"; glowColor = displayColor; }
        else if (bonus >= 5) { displayColor = "#ff9900"; rankName = "(良品)"; }
        else if (bonus >= 0) { displayColor = "#ffffff"; rankName = "(標準)"; }
        else { displayColor = "#aaaaaa"; rankName = "(粗悪)"; }
        itemName = `${baseItemName}${rankName}`;
    } else {
        // ETC/消費アイテム・ショップ商品
        if (slot.description) {
            statusText = slot.description;
        } else if (typeof itemDescriptions !== 'undefined' && itemDescriptions[slot.type]) {
            statusText = itemDescriptions[slot.type];
        } else {
            statusText = `個数 : ${slot.count || slot.quantity || 1}`;
        }
    }

    // --- レイアウト計算 ---
    const padding = 12;
    const iconSize = 40; 
    const iconTextGap = 15;
    const lineHeight = 16;
    const activeStats = isEquipment ? statKeys.filter(k => {
        const val = parseInt(slot[k]);
        return !isNaN(val) && val !== 0; 
    }) : [];

    ctx.font = 'bold 14px sans-serif';
    const nameWidth = ctx.measureText(itemName).width;
    ctx.font = '12px sans-serif';
    const statusWidth = ctx.measureText(statusText).width;

    let boxWidth = padding + iconSize + iconTextGap + Math.max(nameWidth, statusWidth, 180) + padding;
    if (boxWidth < 240) boxWidth = 240;

    const reqLines = isEquipment ? (1 + (totalFirstStats !== undefined ? 1 : 0) + (totalALLStats !== undefined ? 1 : 0) + 1) : 0;
    let boxHeight = isEquipment ? 115 + (activeStats.length * lineHeight) + (reqLines * 12) : 65;

    let popupX = mouseX + 15;
    let popupY = mouseY + 15;

    // --- 描画開始 ---
    ctx.fillStyle = 'rgba(15, 15, 15, 0.95)';
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') { ctx.roundRect(popupX, popupY, boxWidth, boxHeight, 5); }
    else { ctx.rect(popupX, popupY, boxWidth, boxHeight); }
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();

    if (isEquipment && starCount > 0) {
        ctx.font = '14px sans-serif';
        ctx.fillStyle = '#ffff00';
        ctx.textAlign = 'center';
        ctx.fillText("★".repeat(starCount), popupX + boxWidth / 2, popupY + 18);
    }

    const contentTop = (isEquipment && starCount > 0) ? popupY + 32 : popupY + 15;
    const textStartX = popupX + padding + iconSize + iconTextGap;
    const rightValueX = popupX + boxWidth - 12;

    // --- 🖼️ アイコン描画ロジックの強化 ---
    let itemImg = slot.img || ((typeof itemImages !== 'undefined') ? itemImages[slot.type] : null);

    // 🌟 HTMLの露店リストから iconUrl が渡された場合の自動解決
    if (!itemImg && slot.iconUrl) {
        if (!window.itemImageCache) window.itemImageCache = {};
        if (window.itemImageCache[slot.iconUrl]) {
            itemImg = window.itemImageCache[slot.iconUrl];
        } else {
            const img = new Image();
            img.src = slot.iconUrl;
            window.itemImageCache[slot.iconUrl] = img;
            itemImg = img;
        }
    }

    if (itemImg && itemImg.complete && itemImg.naturalWidth !== 0) {
        ctx.save();
        if (glowColor) {
            ctx.shadowBlur = 15;
            ctx.shadowColor = glowColor;
        }
        ctx.drawImage(itemImg, popupX + padding, contentTop, iconSize, iconSize);
        ctx.restore();
    }

    // テキスト描画
    ctx.font = 'bold 15px sans-serif';
    ctx.fillStyle = displayColor;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(itemName, textStartX, contentTop);

    if (isEquipment) {
        ctx.font = '11px sans-serif';
        ctx.fillStyle = '#aaaaaa';
        ctx.fillText(`装備分類 : ${categoryName}`, textStartX, contentTop + 20);

        let currentReqY = contentTop + 35;
        const heroLevel = hero ? (hero.level || 0) : 0;
        ctx.font = 'bold 10px sans-serif';

        ctx.textAlign = 'left';
        ctx.fillStyle = (heroLevel < reqLevel) ? '#ff0000' : '#ffff00';
        ctx.fillText("・REQ LEV", textStartX, currentReqY);
        ctx.textAlign = 'right';
        ctx.fillText(reqLevel, rightValueX, currentReqY);
        currentReqY += 12;

        if (totalFirstStats !== undefined) {
            ctx.textAlign = 'left'; ctx.fillStyle = '#ffffff';
            ctx.fillText("・REQ First", textStartX, currentReqY);
            ctx.textAlign = 'right'; ctx.fillText(Math.floor(totalFirstStats), rightValueX, currentReqY);
            currentReqY += 12;
        }
        if (totalALLStats !== undefined) {
            ctx.textAlign = 'left'; ctx.fillStyle = '#ffffff';
            ctx.fillText("・REQ ALL", textStartX, currentReqY);
            ctx.textAlign = 'right'; ctx.fillText(Math.floor(totalALLStats), rightValueX, currentReqY);
            currentReqY += 12;
        }
        if (totalALLStats !== undefined && totalFirstStats !== undefined) {
            const bonus = totalALLStats - totalFirstStats;
            ctx.textAlign = 'left'; ctx.fillStyle = displayColor;
            ctx.fillText("・BONUS", textStartX, currentReqY);
            ctx.textAlign = 'right'; ctx.fillText((bonus >= 0 ? "+" : "") + Math.round(bonus * 10) / 10, rightValueX, currentReqY);
            currentReqY += 12;
        }

        let currentY = currentReqY + 5;
        ctx.font = '12px sans-serif';
        activeStats.forEach(key => {
            const labelMap = { str: "STR", dex: "DEX", int: "INT", luk: "LUK", maxHp: "最大HP", maxMp: "最大MP", atk: "攻撃力", matk: "魔力", def: "防御力" };
            ctx.textAlign = 'left'; ctx.fillStyle = '#ffffff';
            ctx.fillText(labelMap[key] || key.toUpperCase(), textStartX, currentY);
            ctx.textAlign = 'right';
            ctx.fillText(`+${slot[key]}`, rightValueX, currentY);
            currentY += lineHeight;
        });

        const total = slot.totalUpgrade || 7;
        const used = (slot.successCount || 0) + (slot.failCount || 0);
        ctx.textAlign = 'left'; ctx.fillStyle = '#ffff00';
        ctx.fillText(`アップグレード可能回数 : ${total - used}`, textStartX, currentY + 10);
    } else {
        ctx.textAlign = 'left';
        ctx.font = '12px sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(statusText, textStartX, contentTop + 30);
    }

    // 🛡️ 2. 元の状態に復元
    ctx.restore();
}

// ============================================================
// :::DRAW_STATUS_WINDOW::: 📊 キャラクター情報ウィンドウの描画とタブ切り替え
// ============================================================
/**
 * 役割：
 * - 共通ウィンドウ枠(drawSimpleWindow)の呼び出しによる一貫したUI構成
 * - タブ切り替え（ステータス/AP振り分け）の状態管理と描画
 * - 各コンテンツレンダリング関数への処理委譲
 * - タブ領域のインタラクション準備（描画順と状態保持）
 */
function drawStatusWindow() {
    const win = gameWindows.status;
    
    //canvas.style.cursor = "default";

    // 窓枠の描画
    drawSimpleWindow(
        currentTab === "status" ? "📊 Player Status" : "✨ AP Allocation", 
        win.x, win.y, win.w, win.h
    );
    
    // 🌟 drawSimpleWindow内で設定が変わる可能性があるため、再度リセット
    ctx.textAlign = "left";

    // タブ（ステータス / AP振り分け）の描画
    const tabY = win.y + 35;
    const tabW = 70;
    const tabH = 20;

    // ステータスタブ
    ctx.fillStyle = (currentTab === "status") ? "#555555" : "#222222";
    ctx.fillRect(win.x + 20, tabY, tabW, tabH);
    ctx.fillStyle = "#ffffff";
    ctx.font = "10px sans-serif";
    ctx.fillText("ステータス", win.x + 30, tabY + 14);

    // AP振り分けタブ
    ctx.fillStyle = (currentTab === "ap") ? "#555555" : "#222222";
    ctx.fillRect(win.x + 20 + tabW + 5, tabY, tabW, tabH);
    ctx.fillStyle = "#ffffff";
    ctx.fillText("AP振り分け", win.x + 20 + tabW + 15, tabY + 14);

    if (currentTab === "status") {
        renderStatusContent(win);
    } else {
        renderAPAllocationContent(win);
    }
}

// ============================================================
// :::RENDER_STATUS_CONTENT::: 📊 キャラクター情報のレンダリング
// ============================================================
/**
 * 役割：
 * - キャラクター名と区切り線の描画
 * - 各ステータス（LEVEL, HP, STR, DEX, LUK）のラベル付きリストレンダリング
 * - 条件付きカラーリング（HPの強調表示など）
 * - ホバー判定フラグの初期化（AP振り分け時のインタラクション用）
 */
function renderStatusContent(win) {
    ctx.textAlign = "left";
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 16px sans-serif";
    ctx.fillText(hero.name || "Adventurer", win.x + 20, win.y + 75);

    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    ctx.beginPath();
    ctx.moveTo(win.x + 20, win.y + 85);
    ctx.lineTo(win.x + win.w - 20, win.y + 85);
    ctx.stroke();

    ctx.font = "14px monospace";
    const startY = win.y + 110;
    const gap = 22;

    const labels = ["LEVEL", "HP", "STR", "DEX", "LUK"];
    const values = [hero.lv || 1, `${hero.hp} / ${hero.maxHp}`, hero.str || 0, hero.dex || 0, hero.luk || 0];

    labels.forEach((label, i) => {
        ctx.fillStyle = "#aaaaaa";
        ctx.fillText(label, win.x + 25, startY + (gap * i));
        ctx.fillStyle = (label === "HP") ? "#ff5555" : "#ffffff";
        ctx.fillText(`${values[i]}`, win.x + 110, startY + (gap * i));
    });

    // 経験値バー
	/*
    const barW = win.w - 50;
    const barX = win.x + 25;
    const barY = win.y + win.h - 35;
    ctx.fillStyle = "#333333";
    ctx.fillRect(barX, barY, barW, 10);
    const expRatio = Math.min(1, (hero.exp % 100) / 100);
    ctx.fillStyle = "#ffcc00";
    ctx.fillRect(barX, barY, barW * expRatio, 10);
    ctx.font = "10px sans-serif";
    ctx.fillText(`EXP: ${Math.floor(hero.exp)} / 100`, barX, barY - 5);
    */
	
    window.hoverFlags.str = window.hoverFlags.dex = window.hoverFlags.luk = false;
}

// ============================================================
// :::RENDER_AP_ALLOCATION::: ⚡ AP振り分けUIのレンダリングと操作判定
// ============================================================
/**
 * 役割：
 * - 残りAP(hero.ap)の表示
 * - 強化対象ステータス（STR, DEX, LUK）のリスト描画
 * - ボタンのホバー状態管理：マウス乗せによるカーソル変更と効果音(playMouseOver1Sound)のトリガー
 * - インタラクションの優先度管理：最前面ウィンドウ(topWindow)のみ操作を許可するZ-Order判定
 */
function renderAPAllocationContent(win) {
    ctx.textAlign = "left";
    ctx.fillStyle = "#ffcc00";
    ctx.font = "bold 16px sans-serif";
    ctx.fillText(`Available AP: ${hero.ap}`, win.x + 20, win.y + 80);

    const stats = [
        { key: 'str', label: 'STR', y: 120, btnY: 102 },
        { key: 'dex', label: 'DEX', y: 150, btnY: 132 },
        { key: 'luk', label: 'LUK', y: 180, btnY: 162 }
    ];

    const btnX = win.x + 150;
    const btnW = 100;
    const btnH = 25;

    // 重なり順を考慮したホバー判定ロジック
    const isStatusPriority = (() => {
        const overStats = (mouseX >= win.x && mouseX <= win.x + win.w && mouseY >= win.y && mouseY <= win.y + win.h);
        const topWindow = windowStack[windowStack.length - 1];
        return overStats && topWindow === "status";
    })();

    stats.forEach(s => {
        ctx.fillStyle = "#ffffff";
        ctx.font = "14px monospace";
        ctx.fillText(`${s.label}: ${hero[s.key] || 0}`, win.x + 25, win.y + s.y);

        const isHover = isStatusPriority && (mouseX >= btnX && mouseX <= btnX + btnW && mouseY >= win.y + s.btnY && mouseY <= win.y + s.btnY + btnH);
        
        if (isHover) {
            canvas.style.cursor = "pointer";
            if (!window.hoverFlags[s.key]) {
                if (typeof playMouseOver1Sound === 'function') playMouseOver1Sound();
                window.hoverFlags[s.key] = true;
            }
        } else {
            window.hoverFlags[s.key] = false;
        }

        ctx.fillStyle = isHover ? "#444444" : "#222222";
        ctx.strokeStyle = "#ffffff";
        ctx.strokeRect(btnX, win.y + s.btnY, btnW, btnH);
        ctx.fillRect(btnX, win.y + s.btnY, btnW, btnH);
        ctx.fillStyle = isHover ? "#ffff00" : "#ffffff";
        ctx.font = "12px sans-serif";
        ctx.fillText(`${s.label} UP (+1)`, btnX + 15, win.y + s.btnY + 17);
    });
}

// ============================================================
// :::DRAW_MAP::: 🗺️ マップ環境オブジェクトのレンダリング
// ============================================================
/**
 * 役割：
 * - 空中の足場レンダリング：設定値に応じた天面と側面の色分け
 * - 最下層の地面レンダリング：画面幅に応じた動的配置とレイヤー管理
 * - ハシゴの描画：柱（side）と横ざん（step）の反復描画による構築
 * - コンフィグ依存：色・サイズ情報を一括管理（VIEW_CONFIG）
 */
function drawMap(platforms, ladders) {
    // --- A. 空中の足場 (Platforms) ---
platforms.forEach(p => { 
    ctx.fillStyle = VIEW_CONFIG.colorMapGround; 
    ctx.fillRect(p.x, p.y, p.w, p.h); 
    ctx.fillStyle = VIEW_CONFIG.colorMapTop; 
    ctx.fillRect(p.x, p.y, p.w, VIEW_CONFIG.ladder.columnWidth); // 4 を置き換え
});

    // --- B. 最下層の地面 ---
    // Before: ctx.fillStyle = '#4a3728'; 
    ctx.fillStyle = VIEW_CONFIG.colorMapGround;
    // Before: ctx.fillRect(0, 565, 800, 35);
    ctx.fillRect(0, VIEW_CONFIG.groundY, VIEW_CONFIG.SCREEN_WIDTH, VIEW_CONFIG.SCREEN_HEIGHT - VIEW_CONFIG.groundY);

    // Before: ctx.fillStyle = '#6d4c41'; 
    ctx.fillStyle = VIEW_CONFIG.colorMapTop;
    // Before: ctx.fillRect(0, 565, 800, 4);
    ctx.fillRect(0, VIEW_CONFIG.groundY, VIEW_CONFIG.SCREEN_WIDTH, 4);

    // --- C. 🪜 ハシゴ (Ladders) ---
ladders.forEach(l => { 
    const ladderW = VIEW_CONFIG.ladder.width; // 30
    
    // 柱の描画
    ctx.fillStyle = VIEW_CONFIG.ladder.colorSide; // '#94a3b8'
    const colW = VIEW_CONFIG.ladder.columnWidth;  // 4
    ctx.fillRect(l.x, l.y1, colW, l.y2 - l.y1);   // 左の柱
    ctx.fillRect(l.x + ladderW - colW, l.y1, colW, l.y2 - l.y1); // 右の柱

    // 横ざん（ステップ）の描画
    ctx.fillStyle = VIEW_CONFIG.ladder.colorStep; // '#cbd5e1'
    const stepH = VIEW_CONFIG.ladder.stepHeight;  // 3
    for (let hy = l.y1 + VIEW_CONFIG.ladder.stepInterval; hy < l.y2; hy += VIEW_CONFIG.ladder.stepInterval) {
        ctx.fillRect(l.x, hy, ladderW, stepH);
    }
});
}

// ============================================================
// :::DRAW_PLAYER_OBJ::: 👤 キャラクター描画の司令塔（自分・他者共通）
// ============================================================
/**
 * 役割：
 * - チャンネル判定：自分と同じチャンネルのプレイヤーのみをレンダリング対象とする「門番」機能
 * - キャラクタースプライトの動的ロード管理：表示に必要なキャラデータが未定義の場合の自動ロード
 * - レンダリングの統合：calculatePlayerVisuals と renderPlayerSprite による座標・描画計算
 * - 状態に基づく描画スキップ：無敵時間(invincible)の点滅演出制御
 * - UIの統合：プレイヤー名やHPバー（drawPlayerUI）の同期表示
 */
function drawPlayerObj(p, isMe, id) {
    if (!p) return;
	
    // 🌟 チャンネルチェックの門番
    if (!isMe && typeof hero !== 'undefined') {
        const myChan = hero.channel || 1;
        const opChan = p.channel || 1;
        if (opChan !== myChan) return;
    }

    // 1. 🎭 キャラクター設定の読み込み
    const g = isMe ? selectedGroup : (p.group !== undefined ? p.group : 5);
    const v = isMe ? selectedCharVar : (p.charVar !== undefined ? p.charVar : 6);

    // 🌟 修正：その人の見た目(g, v)がまだロードされていない場合、ここでロードを実行
    // これにより getPlayerCurrentImg 内部の characterData が undefined になるのを防ぎます
    if (!playerSprites[g] || !playerSprites[g][v]) {
        loadCharFrames(g, v);
    }

    // 2. 🎨 描画準備（サイズ・座標の計算）
    const visualData = calculatePlayerVisuals(p, g, isMe);

    // 3. 🖼️ 表示する画像の決定（ロジックは踏襲）
    const currentImg = getPlayerCurrentImg(p, g, v, frame, sprites, playerSprites, isMe);

    // 4. ✍️ 実際の描画実行
    if (currentImg && !(p.invincible > 0 && Math.floor(frame / 4) % 2 === 0)) {
        renderPlayerSprite(ctx, p, currentImg, visualData);
    } else if (!isMe) {
        // 画像ロード待ちの他人のためのデバッグ表示（映らない原因切り分け用）
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.fillText("Loading image...", p.x, p.y - 10);
    }

    // 5. 📊 UI（HPバーと名前）の描画
    const pW = VIEW_CONFIG.player.hitboxW;
    drawPlayerUI(ctx, p, isMe, pW, frame);
}

// ============================================================
// :::CALCULATE_PLAYER_VISUALS::: 📏 キャラクター描画座標の計算
// ============================================================
/**
 * 役割：
 * - ヒットボックス座標(p.x, p.y)からの描画基準点算出
 * - キャラクターグループ(g)ごとのオフセット調整（見た目のズレ補正）
 * - 地面判定(groundThreshold)に基づく微細な高さ補正
 * - 描画用データオブジェクト（drawX, drawY, drawW, drawH）の生成
 */
function calculatePlayerVisuals(p, g, isMe) {
    const drawW = VIEW_CONFIG.player.drawW;
    const drawH = VIEW_CONFIG.player.drawH;
    const pW = VIEW_CONFIG.player.hitboxW;
    const pH = VIEW_CONFIG.player.hitboxH;

    // 足元の高さ調整ロジックを継承
    let footOffset = VIEW_CONFIG.player.visualOffset + (VIEW_CONFIG.groupOffsets[g] || 0);
    if (p.y > VIEW_CONFIG.groundThreshold) footOffset += VIEW_CONFIG.player.groundExtraOffset;

    const drawX = p.x + (pW / 2) - (drawW / 2);
    const drawY = p.y + pH - drawH + footOffset;

    return { drawX, drawY, drawW, drawH };
}

// ============================================================
// :::RENDER_PLAYER_SPRITE::: 🖌️ スプライト画像のCanvas転写処理
// ============================================================
/**
 * 役割：
 * - 描画コンテキスト(ctx)の保護（save/restoreによる状態維持）
 * - 左右反転処理：キャラクターの向き(p.dir)に応じた座標変換とスケール調整
 * - 画像レンダリング：キャッシュ済みのイメージと計算済み座標による描画実行
 */
function renderPlayerSprite(ctx, p, img, vData) {
    if (!img || !img.complete) return;

    ctx.save();
    if (p.dir === -1) {
        // 反転描画
        ctx.translate(vData.drawX + vData.drawW / 2, vData.drawY + vData.drawH / 2);
        ctx.scale(-1, 1);
        ctx.drawImage(img, -vData.drawW / 2, -vData.drawH / 2, vData.drawW, vData.drawH);
    } else {
        // 通常描画
        ctx.drawImage(img, vData.drawX, vData.drawY, vData.drawW, vData.drawH);
    }
    ctx.restore();
}

// ============================================================
// :::GET_PLAYER_CURRENT_IMG::: 🎬 アニメーション状態解析と画像特定
// ============================================================
/**
 * 役割：
 * - 状態管理の優先順位判定（攻撃 > ハシゴ > 無敵 > ジャンプ > 移動 > 待機）
 * - 状態に応じたフレームアニメーションの計算（イージング調整やループ計算）
 * - キャラクターデータ(playerSprites)と共通リソース(sprites)の統合
 * - 各種状態での描画フォールバック（画像が取得できない場合の安全対策）
 */
function getPlayerCurrentImg(p, g, v, frame, sprites, playerSprites, isMe) {
    // 🌟 修正：速度の取得を安定化
    const speed = isMe ? (typeof hero !== 'undefined' ? hero.vx : 0) : (p.vx || 0);
    const isMoving = Math.abs(speed) > 0.1;
    const isGrounded = !p.jumping;

    // 引数として渡された g と v を使ってデータにアクセス
    const characterData = (playerSprites[g] && playerSprites[g][v]);

    // --- 1. ⚔️ 攻撃中 (最優先) ---
    if (p.isAttacking > 0) {
        const frames = characterData ? characterData["Hit"] : null;
        if (frames && frames.length > 0) {
            const maxDuration = 40; 
            const currentStep = Math.max(0, maxDuration - p.isAttacking);
            let progress = currentStep / maxDuration;

            // 🌟 緩急（イージング）の調整
            let easingProgress = Math.pow(progress, 1.2); 

            let atkIdx = Math.floor(easingProgress * (frames.length - 1));
            atkIdx = Math.max(0, Math.min(atkIdx, frames.length - 1));

            return frames[atkIdx];
        }
    }

    // --- 2. 🌀 ダウン（ロール）中 ---
	/*
    if (p.isDown) {
        return AnimUtils.getFrame(characterData?.["Roll"], 0, sprites.playerDown);
    }
	*/

    // --- 3. 🪜 ハシゴ登り ---
    if (p.climbing) {
        const frames = characterData?.["Fly"];
        const isMovingClimb = (Math.abs(p.vy || 0) > 0.1);
        const idx = isMovingClimb ? AnimUtils.getIdx(frame, 5, frames?.length || 0) : 0;
        return AnimUtils.getFrame(frames, idx, sprites.playerClimb[0]);
    }

    // --- 4. 💫 無敵（スタン）状態 ---
    if (p.invincible > 0) {
        const frames = characterData?.["Stuned"];
        return AnimUtils.getFrame(frames, AnimUtils.getIdx(frame, 3, frames?.length || 0), sprites.playerA);
    }

    // --- 5. 🚀 ジャンプ中（空中） ---
    if (!isGrounded) {
        const frames = characterData?.["Jump"];
        const jf = p.jumpFrame || 0;
        const jumpIdx = (p.vy < 0) ? (Math.floor(jf / 6) % 10) : (10 + (Math.floor(jf / 6) % 10));
        return AnimUtils.getFrame(frames, jumpIdx, sprites.playerA);
    }

    // --- 6. 🏃 移動中 (歩き) ---
    if (isMoving) {
        return AnimUtils.getFrame(characterData?.["Walk"], AnimUtils.getIdx(frame, 1, characterData?.["Walk"]?.length || 0), sprites.playerA);
    }

    // --- 7. 🧘 待機状態 (Idle) ---
    const frames = characterData?.["Idle"];
    return AnimUtils.getFrame(
        frames, 
        AnimUtils.getIdx(frame, 6, frames?.length || 0), 
        sprites.playerA
    );

    // 最終バックアップ
    return sprites.playerA;
}

// ============================================================
// :::DRAW_PLAYER_UI::: 🏷️ キャラクター頭上UI（HPバー・名前）の表示
// ============================================================
/**
 * 役割：
 * - HPバーのレンダリング：他プレイヤーのみ対象、HP残量に応じた動的カラーリング
 * - 名前表示：背景の半透明処理による視認性確保、画面外への突き抜け防止処理
 * - レイアウト制御：地面と空中で表示座標を柔軟に切り替え（VIEW_CONFIG）
 * - 描画最適化：テキスト幅に基づく背景帯の動的サイズ決定
 */
function drawPlayerUI(ctx, p, isMe, pW, frame) {
    
    // --- 1. HPバーの描画 (自分以外のプレイヤーのみ表示) ---
    if (!isMe) {
        const barW = VIEW_CONFIG.hpBar.width; 
        const barH = VIEW_CONFIG.hpBar.height;
        
        const barX = p.x + (VIEW_CONFIG.player.hitboxW / 2) - (barW / 2);
        
        const currentBaseY = (p.y > VIEW_CONFIG.groundThreshold) 
            ? VIEW_CONFIG.groundY 
            : (p.y + VIEW_CONFIG.player.drawH * 0.4);
        
        const currentDrawH = 60; 
        const barY = currentBaseY - currentDrawH - (p.jumpY || 0) - 25;
        
        const hpRate = Math.max(0, Math.min(1, p.hp / 100));
        
        let hpColor = (hpRate <= 0.2) ? "#ff0000" : (hpRate <= 0.5 ? "#ffff00" : "#00ff00");
        
        ctx.fillStyle = "black";
        ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
        
        ctx.fillStyle = hpColor;
        ctx.fillRect(barX, barY, barW * hpRate, barH);
    }

    // --- 2. プレイヤー名の描画 (自分も他人も表示) ---
    // 【修正】p.isLinked が true の場合のみ "[W]" を表示する
    const badge = (p.isLinked) ? " [W]" : "";
    const nameText = (p.name || "Player") + badge;
    
    // 名前の表示高さを計算
    let nameY = p.y + ((p.y > VIEW_CONFIG.groundThreshold) 
        ? VIEW_CONFIG.playerName.offsetY_ground 
        : VIEW_CONFIG.playerName.offsetY_air);
    
    if (nameY < VIEW_CONFIG.playerName.safeMargin) {
        nameY = VIEW_CONFIG.playerName.safeMargin;
    }
    
    // フォントの設定
    ctx.font = `bold ${VIEW_CONFIG.playerName.fontSize} Arial`;
    
    // 背景の黒帯サイズ計算（nameText が変われば自動で幅も変わる）
    const nameW = ctx.measureText(nameText).width + VIEW_CONFIG.playerName.paddingW;
    
    // 名前の背景（半透明）
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(p.x + pW / 2 - nameW / 2, nameY - 15, nameW, 20);
    
    // 名前のテキストを描画
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.fillText(nameText, p.x + pW / 2, nameY);
}

// ============================================================
// :::DRAW_ENEMIES::: 👾 敵キャラクターの全軍レンダリング管理
// ============================================================
/**
 * 役割：
 * - 生存・消滅状態の管理：フェードイン/アウト処理と死亡演出のトリガー
 * - 状態演出：被ダメージ時の点滅（ノックバック演出）
 * - 座標計算：浮遊系(Floating)と地上系(Grounded)で基準位置を切り替え
 * - デバッグ支援：攻撃判定枠(Hitbox)の可視化とログ出力による描画エラー追跡
 * - UI統合：敵HPバー(drawEnemyHPBar)の同期描画
 */
function drawEnemies(enemies, hero, frame) {
    enemies.forEach(en => {
        
        // --- 1. 🛑 描画判定 ---
        if (!en.alive && !en.isFading) return;

        // --- 2. 💫 点滅エフェクト ---
        if (!en.isFading && Math.abs(en.kbV) > 2.0 && Math.floor(frame / 4) % 2 === 0) return;

        ctx.save();

        // --- 3. ✨ 透明度設定 ---
        if (en.isFading) {
            ctx.globalAlpha = Math.max(0, 1 - (en.deathFrame / VIEW_CONFIG.enemy.deathAnimDuration));
        } else if (en.spawnAlpha !== undefined) {
            ctx.globalAlpha = en.spawnAlpha;
        }

        // --- 4. 🖼️ 画像とサイズの準備 (footYを追加) ---
        let { img, drawW, drawH, footY } = getEnemyVisualData(en, sprites, frame, hero);

        const isMonsterType = (String(en.id).includes("Monster") || String(en.type).includes("Monster"));

        // 💀 死亡時ログ出力ロジック (既存を踏襲)
        if (en.isFading && isMonsterType) {
            const nameKey = en.name || en.type || "Monster";
            const deathKey = nameKey + "Death";
            const deathSprites = sprites[deathKey];
            
            if (en.deathFrame === 1) {
                let statusMsg = "";
                if (!deathSprites) statusMsg = `⚠️ [Error] ${deathKey} が sprites にありません (Name:${en.name})`;
                else if (deathSprites.length === 0) statusMsg = `⚠️ [Warning] ${deathKey} は空(0枚)です`;
                else statusMsg = `✅ [Info] ${deathKey} 再生開始 (${deathSprites.length}枚)`;
                
                if (typeof debugChat === 'function') debugChat(statusMsg);
                else if (typeof addChatLog === 'function') addChatLog(statusMsg, 'system');
                console.log(statusMsg);
            }
        }

        // --- 5. 📏 描画位置の計算と実行 ---
        if (img && img.complete && img.naturalWidth !== 0) {
            const baseX = en.x + en.w / 2;

            // 🌟 【修正：判定の強化】大文字小文字を区別せず 'monster16' かチェック
            const typeLower = String(en.type).toLowerCase();
            const isFloatingUnit = (typeLower === 'monster16');

            let baseY;
            if (isFloatingUnit) {
                // 🚀 浮遊系はサーバーの y 座標を信じ、地面吸着ロジックを完全にスルーする
                baseY = en.y + en.h;
            } else {
                // それ以外の地上系モンスター
                let enemyFootOffset = 0;
                if (en.y > VIEW_CONFIG.groundThreshold) {
                    enemyFootOffset = VIEW_CONFIG.groupOffsets[en.type] || -7;
                }

                // 地面基準か、空中（サーバーy）基準かを判定
                baseY = (typeLower === 'monster3' || en.y > VIEW_CONFIG.groundThreshold)
                    ? VIEW_CONFIG.groundY
                    : (en.y + en.h + enemyFootOffset);
            }

            const finalY = baseY + (en.jumpY || 0);

            // 描画のガタつきを防ぐため、整数座標に丸める
            ctx.translate(Math.round(baseX), Math.round(finalY));

            let shouldFlip = (en.dir === 1);
            if (isMonsterType) shouldFlip = !shouldFlip;
            if (shouldFlip) ctx.scale(-1, 1);

            // 🖼️ 画像の描画 (基準点 footY で位置を合わせる)
            ctx.drawImage(img, -drawW / 2, -footY, drawW, drawH);

            // 🔍 【攻撃判定枠（Attack Box）】
            if (en.isAttackingHitFrame) {
                ctx.save();
                ctx.strokeStyle = "rgba(255, 0, 0, 0.8)";
                ctx.lineWidth = 2;
                let swordRange = 60; 
                ctx.strokeRect(-drawW / 2 + drawW * 0.5, -footY, swordRange, drawH);
                ctx.fillStyle = "rgba(255, 0, 0, 0.2)";
                ctx.fillRect(-drawW / 2 + drawW * 0.5, -footY, swordRange, drawH);
                ctx.restore();
            }

            // 🔍 【攻撃カウント表示】
            if (en.isAttacking > 0) {
                ctx.save();
                if (shouldFlip) ctx.scale(-1, 1);
                ctx.fillStyle = "#ffffff";
                ctx.strokeStyle = "#000000";
                ctx.lineWidth = 3;
                ctx.font = "bold 16px Arial";
                ctx.textAlign = "center";
                const countText = `AtkCount: ${en.isAttacking}`;
                ctx.strokeText(countText, 0, -footY - 30);
                ctx.fillText(countText, 0, -footY - 30);
                ctx.restore();
            }

        } else {
            if (en.isFading && isMonsterType && en.deathFrame === 1) {
                const failMsg = `❌ [Fail] ${en.type} 描画条件未達 (img exists: ${!!img})`;
                if (typeof debugChat === 'function') debugChat(failMsg);
                else if (typeof addChatLog === 'function') addChatLog(failMsg, 'system');
            }
        }

        ctx.restore();

        // 💥 共通デスエフェクト
        if (en.isFading && !isMonsterType) {
            if (typeof drawCommonDeathEffect === 'function') drawCommonDeathEffect(en);
        }

        // 🏥 HPバー描画
        drawEnemyHPBar(en, frame);
    });
}

// ============================================================
// :::GET_VISUAL_FOOT_Y::: 📏 画像の足元（接地点）自動検出処理
// ============================================================
/**
 * 役割：
 * - キャンバス解析による実体ピクセルのスキャン
 * - アルファチャンネル閾値(>20)判定によるキャラクター足元の自動特定
 * - 計算結果のキャッシュ(img._footY)：初回解析後の高速化
 * - 安全装置：解析失敗時やデータ不備時のフォールバック(naturalHeight)実装
 */
function getVisualFootY(img) {
    if (img._footY !== undefined) return img._footY;

    try {
        const tempCanvas = document.createElement('canvas');
        const tCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
        tempCanvas.width = img.naturalWidth;
        tempCanvas.height = img.naturalHeight;
        tCtx.drawImage(img, 0, 0);

        const pixels = tCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height).data;
        
        for (let y = tempCanvas.height - 1; y >= 0; y--) {
            for (let x = 0; x < tempCanvas.width; x++) {
                const alpha = pixels[(y * tempCanvas.width + x) * 4 + 3];
                if (alpha > 20) {
                    img._footY = y; 
                    return y;
                }
            }
        }
    } catch (e) {
        console.warn("Foot detection failed:", e);
    }
    
    img._footY = img.naturalHeight;
    return img._footY;
}

// ============================================================
// :::GET_ENEMY_VISUAL_DATA::: 👾 敵キャラクターの視覚データ算出
// ============================================================
/**
 * 役割：
 * - 状態に基づくリソース特定（死亡・ジャンプ・攻撃・移動・待機・ダメージ）
 * - 描画データの最終化(finalize)：スケーリング、余白補正、浮遊オフセットの適用
 * - 状態優先順位の管理：状態によって異なるアニメーションフレームの計算
 * - 共通機能の集約：モンスタータイプと共通デスエフェクトの判定
 */
function getEnemyVisualData(en, sprites, frame, hero) {
    let img = null;
    const isDamaged = Math.abs(en.kbV) > 1.5;
    const isMonsterType = (String(en.id).includes("Monster") || String(en.type).includes("Monster"));
    const monsterScale = (en.scale || 1.0) * 0.25;

    // --- 内部処理用：画像決定後の共通サイズ計算関数 ---
    const finalize = (targetImg, scale) => {
        if (!targetImg) return { img: null, drawW: en.w, drawH: en.h, footY: en.h };
        const s = scale;
        const w = targetImg.naturalWidth * s;
        const h = targetImg.naturalHeight * s;
        
        // 💡 画像が記憶している「透明な余白」の数値を取得（なければ0）
        const autoPaddingY = targetImg.autoPaddingY || 0;
        
        // 🌟 画像の本来の縦幅から、透明な余白の分を引き算して足元を決定！
        const rawFoot = targetImg.naturalHeight - autoPaddingY;
        
        // 🌟 浮遊系の場合、さらに浮かせるためのオフセットを適用（既存のロジックを踏襲）
        const typeLower = String(en.type).toLowerCase();
        let floatOffset = (typeLower === 'monster16') ? -40 : 0; 

        return { img: targetImg, drawW: w, drawH: h, footY: (rawFoot * s) - floatOffset };
    };

    // --- 1. 💀 死亡・消滅アニメーション ---
    if (en.isFading) {
        if (isMonsterType) {
            const nameKey = en.name || en.type || "Monster";
            const ds = sprites[nameKey + "Death"];
            if (ds && ds.length > 0) {
                const progress = en.deathFrame / VIEW_CONFIG.enemy.deathAnimDuration;
                const safeIdx = Math.min(Math.floor(progress * ds.length), ds.length - 1);
                return finalize(ds[safeIdx], monsterScale);
            }
        } else {
            const ds = sprites["commonDeath"];
            if (ds && ds.length > 0) {
                const frameInterval = 40 / ds.length;
                const safeIdx = Math.min(Math.floor(en.deathFrame / frameInterval), ds.length - 1);
                img = ds[safeIdx];
                return { img, drawW: VIEW_CONFIG.enemy.commonDeathSize.w, drawH: VIEW_CONFIG.enemy.commonDeathSize.h, footY: VIEW_CONFIG.enemy.commonDeathSize.h };
            }
        }
        return finalize(img, monsterScale);
    }

    // --- 2. 🦘 ジャンプ中 ---
    if ((en.jumpY || 0) < -1) {
        const jumps = sprites[en.type + "Jump"];
        if (jumps && jumps.length > 0) {
            img = jumps[Math.floor((en.jumpFrame || 0) / 6) % jumps.length];
        } else {
            const walks = sprites[en.type + "Walk"];
            img = (walks && walks.length > 0) ? walks[0] : sprites[en.type];
        }
        return finalize(img, monsterScale);
    }

    // --- 3. 💢 激昂 ---
    if (en.isEnraged) {
        const dx = hero ? Math.abs(en.x - hero.x) : 999;
        const dy = hero ? Math.abs(en.y - hero.y) : 999;
        if (dx < VIEW_CONFIG.enemy.enragedRangeX && dy < VIEW_CONFIG.enemy.enragedRangeY) {
            const atk = sprites[en.type + "Attack"];
            img = (atk && atk.length > 0) ? atk[Math.floor(frame / 3) % atk.length] : sprites[en.type];
        } else {
            const sKey = en.waitTimer > 0 ? en.type + "Idle" : en.type + "Walk";
            const anims = sprites[sKey];
            img = (anims && anims.length > 0) ? anims[Math.floor(frame / 8) % anims.length] : sprites[en.type];
        }
        return finalize(img, monsterScale);
    }

    // --- 4. ⚔️ 攻撃中 ---
    if (en.isAttacking > 0) {
        const atk = sprites[en.type + "Attack"];
        if (atk && atk.length > 0) {
            const currentFrame = 22 - en.isAttacking;
            img = atk[Math.max(0, Math.min(currentFrame, atk.length - 1))];
        }
        return finalize(img, monsterScale);
    }

    // --- 5. 🤕 ダメージ ---
    if (isDamaged) {
        img = sprites[en.type + "Damage"];
        return finalize(img, monsterScale);
    }

    // --- 6. 💤 待機 ---
    if (en.waitTimer > 0) {
        const idles = sprites[en.type + "Idle"];
        if (idles && idles.length > 0) {
            let total = isMonsterType ? idles.length : Math.min(idles.length, 3);
            img = idles[AnimUtils.getIdx(frame, 12, total)];
        } else {
            img = sprites[en.type];
        }
        return finalize(img, monsterScale);
    }

    // --- 7. 🚶 通常移動 ---
    const walks = sprites[en.type + "Walk"];
    img = (walks && walks.length > 0) ? walks[Math.floor(frame / 2) % walks.length] : sprites[en.type];
    
    return finalize(img, monsterScale);
}

// ============================================================
// :::DRAW_ENEMY_HP_BAR::: 🏥 敵HPバーの描画と残像演出
// ============================================================
/**
 * 役割：
 * - ステータス表示の条件判定：満タン時は非表示、負傷時にバーを表示
 * - ダメージ演出：displayHp を用いた残像バーの減衰アニメーション（滑らかな追従）
 * - ステータス視覚化：HP比率に基づく色分け（Low HP時の点滅演出含む）
 * - 描画設定：VIEW_CONFIG を介した一貫したサイズ・オフセット管理
 */
function drawEnemyHPBar(en, frame) {
    if (en.isFading) return;

    // 🌟 修正ポイント：固定値 (2000, 500, 200) ではなく、
    // サーバーの Enemy クラスで設定された個別の maxHp を参照するようにします。
    let maxHp = en.maxHp || 200; 

    if (en.hp < maxHp) {
        if (en.displayHp === undefined) en.displayHp = en.hp;
        
        // ダメージ時の白いバーが追いつくアニメーションロジックを維持
        en.displayHp = (en.displayHp > en.hp) ? Math.max(en.hp, en.displayHp - 2) : en.hp;
        
        const hpRatio = Math.max(0, en.hp / maxHp);
        const displayRatio = Math.max(0, en.displayHp / maxHp);
        const debugVisualY = en.y + (en.jumpY || 0);
        const barW = en.w;
        const barH = VIEW_CONFIG.enemy.hpBar.height;
        const barX = en.x;
        const barY = debugVisualY + VIEW_CONFIG.enemy.hpBar.offsetY;

        // 背景と枠の描画
        ctx.fillStyle = "rgba(15, 23, 42, 0.8)";
        ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
        ctx.fillStyle = "#1e293b";
        ctx.fillRect(barX, barY, barW, barH);

        // ダメージ残像（白いバー）の描画
        if (displayRatio > hpRatio) {
            ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
            ctx.fillRect(barX, barY, barW * displayRatio, barH);
        }

        // 残りHPに応じた色決定ロジックを維持
        let c1 = (hpRatio > 0.5) ? VIEW_CONFIG.enemy.hpBar.colorHigh : 
                 (hpRatio > 0.2 ? VIEW_CONFIG.enemy.hpBar.colorMid : 
                 (Math.floor(frame / 10) % 2 === 0 ? VIEW_CONFIG.enemy.hpBar.colorLow : VIEW_CONFIG.enemy.hpBar.colorMid));
        
        ctx.fillStyle = c1;
        ctx.fillRect(barX, barY, barW * hpRatio, barH);
    }
}

// ============================================================
// :::DRAW_DAMAGE_TEXTS::: 💥 ダメージ数値の視覚化と演出処理
// ============================================================
/**
 * 役割：
 * - 描画パイプライン：タイマーによる透明度減衰(alpha)の適用
 * - 画像スキン描画：ダメージ数値を個別の数字画像(0-9)に分解し、間隔を調整して整列表示
 * - 演出：クリティカル時の赤色オーバーレイ(source-atop)と影処理
 * - 堅牢性：画像リソース欠損時のテキストベース描画（フォールバック）への切り替え
 */
function drawDamageTexts(damageTexts) {
    damageTexts.forEach(t => {
        ctx.save(); 
        
        // 1. 透明度の設定（タイマーに応じてふわっと消える）
        ctx.globalAlpha = t.timer / VIEW_CONFIG.damageText.duration; 

        // 🌟 判定：被ダメージ(player_hit)か、あるいは画像が使えない状況か
        let shouldDrawImage = (t.type !== 'player_hit');

        if (shouldDrawImage) {
            // 🌟 画像スキンの描画設定
            const damageStr = t.val.toString(); // 数字を1文字ずつ分解
            const charWidth = 24;  // 数字1文字の表示幅
            const charHeight = 32; // 数字1文字の表示高さ
            const spacing = -1;    // 間隔の微調整

            // 🌟 縁取りのON/OFF（現在はOFF）
            const useShadow = false; 

            // 全体の幅を計算して、中央揃えにするための開始X座標を割り出す
            const totalWidth = damageStr.length * (charWidth + spacing) - spacing;
            let currentX = t.x - totalWidth / 2;

            // 2. 1文字ずつ画像として描画
            let drawSuccess = true;
            
            // 🌟 描画順：左から右へループすることで、右側の数字が「後から描画」され、前面に重なります
            for (let char of damageStr) {
                const img = damageImages[char]; // 事前に読み込んだ画像(00.png〜09.png)
                
                if (img && img.complete && img.width > 0) {
                    
                    // --- ➕ 縁取り設定（useShadowがtrueの時のみ反映） ---
                    if (useShadow) {
                        ctx.shadowColor = "rgba(0, 0, 0, 0.8)"; 
                        ctx.shadowBlur = 4; 
                    }

                    // 画像を描画
                    ctx.drawImage(img, currentX, t.y - charHeight / 2, charWidth, charHeight);
                    
                    // --- ➕ 赤みの付与（合成描画） ---
                    ctx.save();
                    // 「描画された画像の形」にだけ色を乗せる設定
                    ctx.globalCompositeOperation = "source-atop";
                    // クリティカルなら赤を濃く(0.4)、通常ならごく薄く(0.15)
                    const redAlpha = t.isCritical ? 0.4 : 0.15;
                    ctx.fillStyle = `rgba(255, 0, 0, ${redAlpha})`;
                    ctx.fillRect(currentX, t.y - charHeight / 2, charWidth, charHeight);
                    ctx.restore();

                    // シャドウのリセット
                    if (useShadow) {
                        ctx.shadowBlur = 0;
                    }

                    // 次の文字のX座標を更新
                    currentX += (charWidth + spacing);
                } else {
                    drawSuccess = false; // 1枚でも画像がなければ失敗フラグ
                    break;
                }
            }
            
            // 画像描画に成功した場合は、この後のテキスト処理をスキップ
            if (drawSuccess) shouldDrawImage = true; 
            else shouldDrawImage = false;
        }

        // 🛡️ 3. 画像を使わない設定、または画像が読み込めていない場合のバックアップ
        if (!shouldDrawImage) {
            ctx.textAlign = "center";
            // 色の設定を VIEW_CONFIG から取得
            ctx.fillStyle = t.type === 'player_hit' 
                ? VIEW_CONFIG.damageText.colorPlayerHit 
                : (t.isCritical ? VIEW_CONFIG.damageText.colorCritical : VIEW_CONFIG.damageText.colorDefault);
            
            // フォントを VIEW_CONFIG から取得
            ctx.font = VIEW_CONFIG.damageText.fontSize; 
            ctx.fillText(t.val, t.x, t.y); 
        }

        ctx.restore();
    });
}

// ============================================================
// :::DRAW_CHAT_BUBBLES::: 💬 チャット吹き出しの表示とライフサイクル管理
// ============================================================
/**
 * 役割：
 * - メッセージの生存確認：chatMessages の各要素を巡回
 * - 発言者の特定：hero(自分)およびothers(他者)のID照合によるターゲット判定
 * - 描画の実行：対象プレイヤーの頭上への描画命令(drawChatBubble)
 * - タイマーの減算：吹き出しが消えるまでの時間管理
 */
function drawChatBubbles(hero, others) {
    chatMessages.forEach(msg => {
        let target = (hero.id === msg.id) ? hero : others[msg.id];
        if (target) { drawChatBubble(target, msg.text); }
        msg.timer--; 
    });
}

// ============================================================
// :::DRAW_PICKUP_EFFECTS::: 💎 アイテム収集時の吸い込みエフェクト
// ============================================================
/**
 * 役割：
 * - 演出ライフサイクル：タイマー監視によるエフェクトの生存管理(Filter)
 * - 軌道計算：ベジェ曲線(Quadratic Curve)を用いたアイテムの吸い込み移動
 * - 視覚演出：レアリティに基づく「二重グロー」の動的描画
 * - パフォーマンス制御：デバイスピクセル比(DPR)の正規化とキャッシュ画像のスムージング管理
 */
function drawPickupEffects(hero, others) {
    pickingUpEffects.forEach((eff) => {
        // 🌟 25 -> VIEW_CONFIG.pickupEffect.duration
        const maxTime = VIEW_CONFIG.pickupEffect.duration;
        
        // 🌟 【デバッグ行】エフェクト開始時(timerが最大値の時)だけ色を表示
        if (eff.timer === maxTime) {
            console.log(`[EffectStart] Drawing with Color: ${eff.effectColor}, Type: ${eff.type}`);
        }
        
        const t = Math.pow((maxTime - eff.timer) / maxTime, 2);

        ctx.save();
        
        // 🌟 座標リセット時にも DPR を考慮する
        const dpr = window.devicePixelRatio || 1;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0); 

        let target = (eff.targetPlayerId === socket.id) ? hero : others[eff.targetPlayerId];
        if (!target) target = hero;

        // 軌道の計算
        const tx = target.x + 20;
        const ty = target.y;
        
        // 🌟 50 -> VIEW_CONFIG.pickupEffect.arcHeight
        const midY = Math.min(target.y + 5, ty) - VIEW_CONFIG.pickupEffect.arcHeight;
        const dx = (1 - t) * (1 - t) * eff.startX + 2 * (1 - t) * t * ((eff.startX + tx) / 2) + t * t * tx;
        const dy = (1 - t) * (1 - t) * (target.y + 5) + 2 * (1 - t) * t * midY + t * t * ty;

        // 全体の透明度
        const alpha = Math.max(0, 1 - t);
        ctx.globalAlpha = alpha;
        ctx.translate(dx, dy);

        // 🌟 カテゴリー判定：EQUIP かつ、特定の除外色（白・灰・橙）ではない場合のみ発光
        const category = itemCategories[eff.type];
        // #ffffff (標準), #aaaaaa (粗悪), #ff9900 (良品) はグロー対象外とする
        const isExcludedColor = (eff.effectColor === '#ffffff' || eff.effectColor === '#aaaaaa' || eff.effectColor === '#ff9900');
        const showColorEffect = (category === "EQUIP") && eff.effectColor && !isExcludedColor;

        // アイテム画像の描画品質を保つ
        ctx.imageSmoothingEnabled = true;

        const config = ITEM_CONFIG[eff.type] || ITEM_CONFIG["money1"];
        const img = config.isAnimated ? sprites.items[eff.type][0] : sprites.items[eff.type];

        if (img && img.complete) {
            const nw = img.naturalWidth;
            const nh = img.naturalHeight;
            
            // 🌟 30 -> VIEW_CONFIG.pickupEffect.size (サイズは固定)
            const targetHeight = VIEW_CONFIG.pickupEffect.size; 
            const targetWidth = targetHeight * (nw / nh);
            
            // 🌟 修正ポイント：条件に一致したレアアイテムのみ、インベントリと同期した「二重グロー」を実行
            if (showColorEffect) {
                ctx.save();
                // 1回目：広範囲の強い光 (Blur: 20)
                ctx.shadowBlur = 20;
                ctx.shadowColor = eff.effectColor;
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = 0;
                ctx.drawImage(img, -targetWidth / 2, -targetHeight / 2, targetWidth, targetHeight);
                
                // 2回目：芯の強い光 (Blur: 5)
                ctx.shadowBlur = 5;
                ctx.drawImage(img, -targetWidth / 2, -targetHeight / 2, targetWidth, targetHeight);
                ctx.restore();
            } else {
                // 通常アイテム、および除外されたランクの装備品（グローなし）
                ctx.drawImage(img, -targetWidth / 2, -targetHeight / 2, targetWidth, targetHeight);
            }
        }

        ctx.imageSmoothingEnabled = false;
        ctx.restore();
        
        eff.timer--;
    });
    pickingUpEffects = pickingUpEffects.filter(eff => eff.timer > 0);
}

// ============================================================
// :::DRAW_ITEM_LOGS_UI::: 📜 アイテム獲得ログの画面表示管理
// ============================================================
/**
 * 役割：
 * - ライフサイクル管理：itemLogsのタイマー監視と配列フィルタリングによるクリーンアップ
 * - レイアウト制御：SCREEN_WIDTH/HEIGHTを基準とした、ログの積み上げ表示
 * - 視覚演出：出現時と消滅時のアルファ値フェード（滑らかな表示体験）
 * - 高解像度対応：DPRを考慮したテキストのシャープな描画
 */
function drawItemLogsUI() {
    if (itemLogs.length === 0) return;

    ctx.save();
    
    // 🌟 高画質モード（DPR）の倍率を考慮してリセット
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); 

    ctx.font = "bold 16px sans-serif"; 
    ctx.textAlign = "right";

    itemLogs.forEach((log, i) => {
        if (typeof log.timer !== 'number') log.timer = 600;

        // 🌟 ここが修正ポイント！
        // canvas.width (1600等) を使わず、固定の 800 と 600 を基準にします
        const x = VIEW_CONFIG.SCREEN_WIDTH - 20; 
        const y = VIEW_CONFIG.SCREEN_HEIGHT - 70 - ((itemLogs.length - 1 - i) * 25);

        let alpha = (log.timer > 560) ? (600 - log.timer) / 40 : (log.timer < 150 ? log.timer / 150 : 1.0);
        ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

        ctx.strokeStyle = "rgba(0, 0, 0, 0.7)";
        ctx.lineWidth = 3;
        ctx.strokeText(log.text, x, y);

        ctx.fillStyle = "white"; 
        ctx.fillText(log.text, x, y);

        log.timer -= 1; 
    });

    itemLogs = itemLogs.filter(l => l.timer > 0);
    ctx.restore();
}

// ============================================================
// :::DRAW_TOP_STATUS_UI::: 📊 プレイヤー・ステータスUIのレンダリング
// ============================================================
/**
 * 役割：
 * - 状態管理（補間）：現在のHP/EXP値を目標値へ向けて滑らかに移動させるアニメーション計算
 * - レイアウト描画：背景パネル、レベル表記、HPバー、EXPバーの配置
 * - データ同期：サーバーから受け取った hero.maxExp や hero.maxHp を分母として正確に描画
 * - フィードバック演出：HP低下時の色変化（グリーン→レッド）と数値のテキストレンダリング
 */
function drawTopStatusUI(hero) {
    if (!hero) return;

    // 🌟 1. なめらか表示の計算処理（HP）
    if (typeof displayHp === 'undefined') displayHp = hero.hp;
    const hpDiff = hero.hp - displayHp;
    if (Math.abs(hpDiff) > 0.1) {
        displayHp += hpDiff * 0.1;
    } else {
        displayHp = hero.hp;
    }

    // 🌟 2. なめらか表示の計算処理（EXP）
    // displayExp が未定義なら現在の hero.exp で初期化
    if (typeof displayExp === 'undefined') displayExp = hero.exp;
    const expDiff = (hero.exp || 0) - displayExp;
    if (Math.abs(expDiff) > 0.1) {
        displayExp += expDiff * 0.1;
    } else {
        displayExp = hero.exp;
    }

    // 🌟 3. 最大経験値の取得（テーブルは削除し、hero.maxExp を参照）
    // サーバー側で LEVEL_TABLE に基づいて計算された値がここに入ります。
    const nextMaxExp = hero.maxExp || 200;

    // 配置設定
    const x = 20; 
    const y = 20; 
    const barWidth = 200; 
    const barHeight = 18;
    const panelW = barWidth + 80;
    const panelH = 70;

    ctx.save();

    // 1. 背景パネル
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.beginPath();
    // ブラウザ互換性を考慮し、roundRectが使えない場合は通常の矩形
    if (ctx.roundRect) {
        ctx.roundRect(x, y, panelW, panelH, 10);
    } else {
        ctx.rect(x, y, panelW, panelH);
    }
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    ctx.stroke();

    // 2. LV表示
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 20px Arial";
    ctx.textAlign = "left";
    ctx.fillText(`Lv.${hero.level || 1}`, x + 15, y + 30);

    // 3. HPバー (displayHpを使用してなめらかに)
    const hpRate = Math.max(0, displayHp / (hero.maxHp || 100));
    const hpBarX = x + 70;
    const hpBarY = y + 15;
    
    ctx.fillStyle = "#333";
    ctx.fillRect(hpBarX, hpBarY, barWidth, barHeight);
    
    // バーの色判定
    ctx.fillStyle = hpRate > 0.3 ? "#2ecc71" : "#e74c3c";
    ctx.fillRect(hpBarX, hpBarY, barWidth * hpRate, barHeight);
    
    // HPテキスト
    ctx.fillStyle = "#fff";
    ctx.font = "12px Arial";
    ctx.textAlign = "center";
    ctx.fillText(`${Math.floor(hero.hp)} / ${hero.maxHp}`, hpBarX + barWidth/2, hpBarY + 14);

    // 4. EXPバー (hero.maxExp を分母に使用)
    const expRate = Math.min(1, displayExp / nextMaxExp); 
    const expBarY = y + 40;
    
    // EXP背景
    ctx.textAlign = "left";
    ctx.fillStyle = "#333";
    ctx.fillRect(hpBarX, expBarY, barWidth, barHeight - 4);
    
    // EXP中身
    ctx.fillStyle = "#f1c40f"; 
    ctx.fillRect(hpBarX, expBarY, barWidth * expRate, barHeight - 4);
    
    // EXPラベル
    ctx.fillStyle = "#fff";
    ctx.font = "bold 10px Arial";
    ctx.fillText("EXP", hpBarX - 30, expBarY + 10);

    // 🌟 EXPテキスト表示 (hero.exp / hero.maxExp)
    ctx.font = "10px Arial";
    ctx.textAlign = "right";
    // 描画上の値(Math.floor(displayExp))を使用して、なめらかに数字が増えるようにしています
    ctx.fillText(`${Math.floor(displayExp)} / ${nextMaxExp}`, hpBarX + barWidth - 5, expBarY + 10);

    ctx.restore();
}

// ============================================================
// :::DRAW_PLAYER_HP::: 🛡️ プレイヤーHPバーのレンダリング管理
// ============================================================
/**
 * 役割：
 * - ステータス表示：背景パネル、外枠、数値テキストの一括描画
 * - 動的フィードバック：HP比率に応じたカラーグラデーションの切り替え（緑→黄→赤）
 * - アニメーション演出：displayRatio を用いたダメージ残像（白バー）の滑らかな追従
 * - メンテナンス性：マジックナンバーを廃し、すべて VIEW_CONFIG に集約
 */
function drawPlayerHP(hero) {
    const uiX = VIEW_CONFIG.ui.paddingX;
    const uiY = VIEW_CONFIG.ui.paddingY;
    const barW = VIEW_CONFIG.ui.hpBarWidth;
    const barH = VIEW_CONFIG.ui.hpBarHeight;

    const maxHp = hero.maxHp || 100;
    const hpRatio = Math.max(0, hero.hp / maxHp);
    const displayRatio = Math.max(0, hero.displayHp / maxHp);

    // 2. 背景のパネル
    ctx.fillStyle = VIEW_CONFIG.ui.panelColor; 
    ctx.beginPath();

    // マジックナンバーを VIEW_CONFIG の項目に置き換え
    ctx.roundRect(
        uiX - 10,                     // パネルの開始位置（少し左に広げる）
        uiY - 25,                     // パネルの開始位置（少し上に広げる）
        VIEW_CONFIG.ui.panelW,        // 設定した幅 (160 + 20 = 180 くらいが目安)
        VIEW_CONFIG.ui.panelH,        // 設定した高さ (55)
        VIEW_CONFIG.ui.borderRadius   // 設定した角丸 (10)
    );
    ctx.fill();

    // 3. "PLAYER HP" の文字
    ctx.textAlign = "left";
    ctx.fillStyle = "#cbd5e1";
    ctx.font = "bold 12px sans-serif";
    ctx.fillText("PLAYER HP", uiX, uiY - 8);

    // 4. HPバーの土台
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(uiX, uiY, barW, barH);

    // 5. 🌟 リッチ演出：ダメージの残像
    if (displayRatio > hpRatio) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
        ctx.fillRect(uiX, uiY, barW * displayRatio, barH);
    }

    // 6. 🌟 リッチ演出：メインのHPバー
    let color1, color2;
    if (hpRatio > 0.5) {
        color1 = "#22c55e"; color2 = "#15803d";
    } else if (hpRatio > 0.2) {
        color1 = "#facc15"; color2 = "#a16207";
    } else {
        color1 = "#ef4444"; color2 = "#991b1b";
    }

    const grad = ctx.createLinearGradient(uiX, uiY, uiX, uiY + barH);
    grad.addColorStop(0, color1); 
    grad.addColorStop(1, color2); 
    ctx.fillStyle = grad;
    ctx.fillRect(uiX, uiY, barW * hpRatio, barH);

    // 7. 外枠
    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    ctx.lineWidth = 1;
    ctx.strokeRect(uiX, uiY, barW, barH);

    // 8. 数値のテキスト
    ctx.fillStyle = "white";
    ctx.font = "bold 10px sans-serif";
    ctx.textAlign = "center";
    ctx.shadowColor = "black";
    ctx.shadowBlur = 2; 
    ctx.fillText(`${Math.ceil(hero.hp)} / ${maxHp}`, uiX + (barW / 2), uiY + 12);
    ctx.shadowBlur = 0; 
}

/** 2. カバンUI（元のコードの9番に相当） */
/*
function drawBagUI(hero) {
    const inv = hero.inventory || [];
    const counts = {
        gold: inv.filter(t => t === 'gold').length,
        m1: inv.filter(t => t === 'money1').length,
        m3: inv.filter(t => t === 'money3').length
    };

    const invPos = VIEW_CONFIG.ui.inventoryPanelPos; 
    ctx.fillStyle = VIEW_CONFIG.ui.panelColor;
    ctx.beginPath();
    ctx.roundRect(invPos.x, invPos.y, invPos.w, invPos.h, 8);
    ctx.fill();

    ctx.textAlign = "right";
    ctx.font = "bold 14px sans-serif";
    ctx.fillStyle = "white";
    ctx.fillText(`Bag: 🏆x${counts.gold} 💵x${counts.m1} 💰x${counts.m3}`, 780, 578);
}
*/

/** 3. 経験値とデバッグ（元のコードの後半部分に相当） */
/*
function drawExpAndDebug(hero) {
    const expBarX = 20;
    const expBarY = 110; 
    const expBarW = VIEW_CONFIG.ui.expBarWidth; 
    const expBarH = VIEW_CONFIG.ui.expBarHeight;

    // 🌟 全体のズレを防止するため、描画開始時に基準をリセット
    ctx.textBaseline = "alphabetic"; 

    // 1. スコアとレベル
    ctx.textAlign = "left";
    ctx.fillStyle = "white";
    ctx.font = "bold 16px sans-serif";
    ctx.fillText(`Score: ${hero.score || 0}`, expBarX, expBarY - 25);
    ctx.fillText(`Lv. ${hero.level || 1}`, expBarX, expBarY - 5);

    // 2. 経験値バーの土台
    ctx.fillStyle = "black";
    ctx.fillRect(expBarX, expBarY, expBarW, expBarH);

    // 3. 経験値の計算
    const currentExp = displayExp || 0; 
    const maxExp = hero.maxExp || 100;
    const expRate = Math.min(1, currentExp / maxExp);

    // 4. 経験値の中身
    ctx.fillStyle = VIEW_CONFIG.ui.expBarColor;  
    ctx.fillRect(expBarX + 1, expBarY + 1, (expBarW - 2) * expRate, expBarH - 2);
    
    // 🌟 5. 経験値バーの中に数値を表示 (追加)
    ctx.save(); // 現在の設定（leftなど）を保存
    ctx.fillStyle = "white"; // 文字色
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "center"; // バーの中央に配置するため
    ctx.textBaseline = "middle"; // ⚠️ これがズレの原因だったので、ここでだけ使う
    
    // 整数で表示（アニメーション中の displayExp を四捨五入）
    const displayText = `${Math.round(currentExp)} / ${maxExp}`;
    
    // バーの中心（横：X + 幅の半分、縦：Y + 高さの半分）に描画
    ctx.fillText(displayText, expBarX + expBarW / 2, expBarY + expBarH / 2);
    ctx.restore(); // 保存していた設定に戻す（これで middle が解除される）

    // --- デバッグとRaw表示 ---
    // 🌟 他の描画に影響しないよう、基準をデフォルトに戻しておく
    ctx.textBaseline = "alphabetic"; 
    ctx.textAlign = "left"; 

    ctx.fillStyle = "white";
    ctx.font = "14px monospace";
    //ctx.fillText(`Raw EXP: ${hero.exp || 0}`, 20, 140); 
    //ctx.fillText(`Max EXP: ${hero.maxExp || 100}`, 20, 155);
    
    ctx.save(); 
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)"; 
    //ctx.fillRect(10, 150, 200, 60); 

    ctx.fillStyle = "#00ff00"; 
    ctx.font = "bold 16px monospace";
    ctx.textAlign = "left";

    //ctx.fillText(`DEBUG hero.exp: ${hero.exp}`, 20, 175);
    //ctx.fillText(`DEBUG hero.level: ${hero.level}`, 20, 195);

    ctx.restore(); 
}
*/

// ============================================================
// :::DRAW_CHAT_BUBBLE::: 💬 キャラクター頭上の吹き出しレンダリング
// ============================================================
/**
 * 役割：
 * - 動的レイアウト：テキスト幅(measureText)に基づいた吹き出しの横幅算出
 * - 描画ロジック：
 * 1. 背景（roundRect）：可読性を高める半透明の白パネル
 * 2. しっぽ（三角形）：キャラクターとメッセージを繋ぐ視覚的なガイド
 * 3. テキスト（fillText）：中央揃えによる配置
 * - 設定統合：VIEW_CONFIG を介したオフセット管理
 */
function drawChatBubble(p, text) {
    ctx.save();
    ctx.font = `${VIEW_CONFIG.chat.fontSize} sans-serif`;
    const textWidth = ctx.measureText(text).width;
    const bw = textWidth + VIEW_CONFIG.chat.padding;
    const bh = 25;
    const bx = p.x + 20 - bw / 2;
    const by = p.y + VIEW_CONFIG.chat.offsetY; // 👈 設定を参照！

    // 1. 背景
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, 5);
    ctx.fill();

    // 2. しっぽ
    ctx.beginPath();
    ctx.moveTo(bx + bw / 2 - 5, by + bh);
    ctx.lineTo(bx + bw / 2 + 5, by + bh);
    ctx.lineTo(bx + bw / 2, by + bh + 5);
    ctx.fill();

    // 3. 文字
    ctx.fillStyle = "black";
    ctx.textAlign = "center";
    ctx.fillText(text, bx + bw / 2, by + 17);
    ctx.restore();
}

// ============================================================
// :::DRAW_ITEMS::: 💎 フィールド上のドロップアイテム描画
// ============================================================
/**
 * 役割：
 * - アニメーション：Sine波による浮遊演出とアイテム固有の回転管理
 * - 描画パイプライン：
 * 1. 安全確認(isImageSafe)：画像ロード完了チェックによるクラッシュ防止
 * 2. レアリティ判定：ステータスボーナスに基づいた発光色の決定
 * 3. レンダリング：二重グロー(shadowBlur)を用いた豪華なエフェクト
 * - セーフティ：画像未ロード時のフォールバック（金色の矩形描画）
 */
function drawItems(items, frame) {
    if (!items || !Array.isArray(items)) return;

    items.forEach(item => {
        if (item.isPickedUp) return; 

        ctx.save();

        // 1. 浮遊アニメーション
        const offset = item.id || (item.x + item.y);
        const floatY = item.landed ? -Math.abs(Math.sin(frame * VIEW_CONFIG.item.floatSpeed + offset) * VIEW_CONFIG.item.floatAmplitude) : 0;

        // 2. 座標とサイズの準備
        const drawSize = VIEW_CONFIG.item.drawSize; // 32
        const halfSize = drawSize / 2;

        const centerX = item.x + halfSize;
        const centerY = item.y + halfSize;

        // 3. 移動と描画
        ctx.translate(centerX, centerY + floatY);

        // 2. 回転の処理
        if (item.rotateSpeed && item.rotateSpeed !== 0 && !item.landed) {
            item.angle = (item.angle || 0) - item.rotateSpeed;
            ctx.rotate(item.angle);
        } else {
            item.angle = 0;
            ctx.rotate(0);
        }

        const config = ITEM_CONFIG[item.type] || ITEM_CONFIG["money1"]; 
        let img = null;
        if (typeof sprites !== 'undefined' && sprites.items && sprites.items[config.name]) {
            img = config.isAnimated 
                  ? sprites.items[config.name][Math.floor((frame + (offset * 10)) / 10) % 10] 
                  : sprites.items[config.name];
        }

        // 🌟 【修正】一時的なロード中や404確定前の壊れた状態(broken)を完全に遮断する安全ガード
        const isImageSafe = img && 
                            img.complete && 
                            typeof img.naturalWidth === 'number' && 
                            img.naturalWidth > 0 && 
                            img.naturalHeight > 0;

        if (isImageSafe) {
            const targetHeight = drawSize;
            const targetWidth = targetHeight * (img.naturalWidth / img.naturalHeight);
            
            // --- 🌟 B. レア度に応じたグローカラーの判定 ---
            let glowColor = null;
            if ((item.type === 'sword' || item.type === 'shield') && 
                item.totalALLStats !== undefined && 
                item.totalFirstStats !== undefined) {
                
                const bonus = item.totalALLStats - item.totalFirstStats;
                
                // 10(青)以上のみグロー用の色を割り当てる
                if (bonus >= 30) {
                    glowColor = "#ff0000"; // 赤（神級）
                } else if (bonus >= 25) {
                    glowColor = "#00ff00"; // 緑（超伝説）
                } else if (bonus >= 20) {
                    glowColor = "#ffff00"; // 黄（極上）
                } else if (bonus >= 15) {
                    glowColor = "#ff00ff"; // 紫（伝説）
                } else if (bonus >= 10) {
                    glowColor = "#00ccff"; // 青（希少）
                }
            }

            // --- 描画実行 ---
            ctx.imageSmoothingEnabled = true;

            if (glowColor) {
                // 🌟 修正ポイント：二重描画で発光を強化
                // 1回目：広範囲の柔らかな光
                ctx.save();
                ctx.shadowBlur = 20; 
                ctx.shadowColor = glowColor;
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = 0;
                ctx.drawImage(img, -targetWidth / 2, -targetHeight / 2, targetWidth, targetHeight);
                
                // 2回目：芯の強い光（重ね描き）
                ctx.shadowBlur = 5;
                ctx.drawImage(img, -targetWidth / 2, -targetHeight / 2, targetWidth, targetHeight);
                ctx.restore();
            } else {
                // 通常アイテム（グローなし）
                // 🛑 3重の防壁(isImageSafe)を通過した画像のみがここを走るため、エラーは100%発生しなくなります
                ctx.drawImage(img, -targetWidth / 2, -targetHeight / 2, targetWidth, targetHeight);
            }

            ctx.imageSmoothingEnabled = false;
        } else {
            // 💡 読み込みが未完了、または404エラー等で画像が壊れている場合のセーフティ(ゲーム停止防止)
            // メイプルストーリーのメルやアイテムドロップの雰囲気を損なわないよう、小さな可愛い金色の矩形を代用描画します
            ctx.fillStyle = "#ffd700";
            ctx.fillRect(-8, -8, 16, 16);
        }

        ctx.restore();
    });
}

// ============================================================
// :::DRAW_INVENTORY_GRID::: 🎒 インベントリグリッドの描画管理
// ============================================================
/**
 * 役割：
 * - グリッド描画：インベントリスロット（背景・枠）の生成
 * - 画像管理：itemImages または config.src からの動的な画像読み込みと安全確認
 * - 演出管理：アイテムの統計値に基づいたレア度判定と、二重グロー効果(shadowBlur)による強調
 * - 個数表示：ETC/USEアイテムのスタック数テキスト描画（縁取り付き）
 */
function drawInventoryGrid(ctx, inventory) {
    if (!ctx || !inventory) return;

    const slotSize = 40;
    const padding = 8;
    const startX = 20;
    const startY = 130;

    // 🌟 重複チェック用のSet
    const alreadyDrawn = new Set();

    for (let i = 0; i < 10; i++) {
        const x = startX + (slotSize + padding) * i;
        const y = startY;

        // 枠の描画（背景スロット）
        ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
        ctx.lineWidth = 2;
        ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
        ctx.fillRect(x, y, slotSize, slotSize);
        ctx.strokeRect(x, y, slotSize, slotSize);

        const itemData = inventory[i];
        
        // 🌟 アイテムが存在する場合の処理
        if (itemData && itemData.type) {
            let type = itemData.type;
            let count = itemData.count || 0;

            // 1. まず、個数が0以下の不正なデータなら無視する
            if (count <= 0) continue;

            // 🌟 カテゴリーを取得
            const category = itemCategories[type];

            // 2. ETCアイテム（Gold, Treasureなど）は重複描画をチェックする
            if (category === 'ETC') {
                if (alreadyDrawn.has(type)) continue;
                alreadyDrawn.add(type);
            }

            const config = ITEM_CONFIG[type];
            if (config) {
                // 🌟 【修正】最優先で imglive.net 固定でロード済みの itemImages から直接画像を取得
                let displayImg = null;
                if (typeof itemImages !== 'undefined' && itemImages[type]) {
                    displayImg = itemImages[type];
                } else {
                    displayImg = config.isAnimated ? (config.images ? config.images[0] : null) : config.image;
                }

                // フォールバック（予備ルート）：もしロード済みになく、srcから動的生成する場合
                if (!displayImg && config.src) {
                    if (!config._tempImg) {
                        config._tempImg = new Image();
                        config._tempImg.crossOrigin = "anonymous"; // 🌟 CORS・グロー効果エラー対策
                        
                        let baseSrc = config.src;
                        if (typeof IMAGE_DOMAIN !== 'undefined' && IMAGE_DOMAIN !== "") {
                            // スラッシュの重複を防ぐクリーニング
                            if (baseSrc.startsWith('/') && IMAGE_DOMAIN.endsWith('/')) {
                                baseSrc = baseSrc.substring(1);
                            }
                            baseSrc = IMAGE_DOMAIN + baseSrc;
                        }
                        config._tempImg.src = baseSrc;
                    }
                    displayImg = config._tempImg;
                }

                // 描画実行（安全ガードを含める）
                if (displayImg && displayImg.complete && typeof displayImg.naturalWidth === 'number' && displayImg.naturalWidth > 0) {
                    const m = 5;
                    const imgX = x + m;
                    const imgY = y + m;
                    const imgW = slotSize - m * 2;
                    const imgH = slotSize - m * 2;
                    
                    // ==========================================
                    // 🌟 グローカラーの判定（装備品のみ）
                    // ==========================================
                    let glowColor = null;
                    if ((type === 'sword' || type === 'shield') && 
                        itemData.totalALLStats !== undefined && 
                        itemData.totalFirstStats !== undefined) {
                        
                        const bonus = itemData.totalALLStats - itemData.totalFirstStats;
                        if (bonus >= 30) glowColor = "#ff0000";      // 神級
                        else if (bonus >= 25) glowColor = "#00ff00"; // 超伝説
                        else if (bonus >= 20) glowColor = "#ffff00"; // 極上
                        else if (bonus >= 15) glowColor = "#ff00ff"; // 伝説
                        else if (bonus >= 10) glowColor = "#00ccff"; // 希少
                    }

                    ctx.save();
                    // 🌟 画像に対して強烈なグロー（発光）を適用
                    if (glowColor) {
                        // 【強化描画 1回目】広範囲に光を拡散させる
                        ctx.shadowBlur = 20; 
                        ctx.shadowColor = glowColor;
                        ctx.shadowOffsetX = 0;
                        ctx.shadowOffsetY = 0;
                        ctx.drawImage(displayImg, imgX, imgY, imgW, imgH);

                        // 【強化描画 2回目】中心の色を濃く、さらに発光を重ねる
                        ctx.shadowBlur = 5;
                        ctx.drawImage(displayImg, imgX, imgY, imgW, imgH);
                    } else {
                        // 通常アイテム
                        ctx.drawImage(displayImg, imgX, imgY, imgW, imgH);
                    }
                    ctx.restore();
                    
                    // 個数表示
                    const isStackItem = (category === 'ETC' || category === 'USE');
                    if ((isStackItem && count >= 1) || count > 1) {
                        ctx.save(); 
                        ctx.fillStyle = "white";
                        ctx.strokeStyle = "black";
                        ctx.lineWidth = 2;
                        ctx.font = "bold 14px Arial";
                        ctx.textAlign = "right";
                        ctx.strokeText(count, x + slotSize - 3, y + slotSize - 3);
                        ctx.fillText(count, x + slotSize - 3, y + slotSize - 3);
                        ctx.restore();
                    }
                }
            }
        }
    }
}

// ============================================================
// :::DRAW_DEBUG_INFO::: 🖥️ デバッグ情報モニタリングパネル
// ============================================================
/**
 * 役割：
 * - パネル描画：半透明の背景と枠線（枠線は視覚的な区切りとして機能）
 * - 状態監視：マウス座標(mouseX, mouseY)のリアルタイム表示
 * - プレイヤー追跡：socket.id を基にしたプレイヤー座標の取得と表示
 * - リソース監視：サーバー上の droppedItems 数をカウントし、メモリや通信状況のヒントを提供
 */
function drawDebugInfo() {
    // 1. 表示設定
    const padding = 10;
    const width = 180;
    const height = 85;
    const x = canvas.width - width - padding; // 画面右上に配置
    const y = padding;

    // 2. 半透明の背景（これがあると文字が読みやすいです）
    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.strokeStyle = "#00ff00"; // デバッグっぽく緑の枠線
    ctx.lineWidth = 1;
    ctx.fillRect(x, y, width, height);
    ctx.strokeRect(x, y, width, height);

    // 3. 文字の描画
    ctx.fillStyle = "#00ff00"; // 昔のパソコンのような緑色
    ctx.font = "12px monospace";
    ctx.textAlign = "left";

    let lineY = y + 20;
    ctx.fillText(`🖱️ Mouse : ${Math.round(mouseX)}, ${Math.round(mouseY)}`, x + 10, lineY);
    
    lineY += 20;
    // localPlayer のデータがある場合
    if (typeof players !== 'undefined' && socket.id && players[socket.id]) {
        const p = players[socket.id];
        ctx.fillText(`🏃 Player: ${Math.round(p.x)}, ${Math.round(p.y)}`, x + 10, lineY);
    } else {
        ctx.fillText(`🏃 Player: (座標取得中...)`, x + 10, lineY);
    }

    lineY += 20;
    // 🌟 server.jsのdroppedItemsと連動（アイテム数表示）
    const itemCount = (typeof droppedItems !== 'undefined') ? droppedItems.length : 0;
    ctx.fillText(`📦 Items : ${itemCount}個`, x + 10, lineY);

    ctx.restore();
}

// ============================================================
// :::DEBUG_LOOP::: 🔍 開発用デバッグ情報監視ループ
// ============================================================
/**
 * 役割：
 * - 継続的モニタリング：requestAnimationFrame による毎フレームのデバッグ描画実行
 * - 依存関係の解決：外部関数(drawDebugInfo, drawDebugWindow)の存在確認後の実行
 * - 状態安全チェック：プレイヤーやアイテムデータの存在を確認してから情報を渡す堅牢性
 */
function debugLoop() {
    // デバッグ表示を実行
    if (typeof drawDebugInfo === 'function') {
        drawDebugInfo();
    }
	if (typeof hero !== 'undefined' && typeof droppedItems !== 'undefined') {
        drawDebugWindow(ctx, mouseX, mouseY, hero, droppedItems);
    }
    // 次のフレームも実行
    requestAnimationFrame(debugLoop);
}

// 🚀 ページを読み込んだら、すぐにデバッグループを開始する
debugLoop();

// ============================================================
// :::SIMPLE_DEBUG_RENDER::: 🛠️ 簡易デバッグ情報の表示処理
// ============================================================
/**
 * 役割：
 * - パネル描画：半透明の背景による可読性の確保
 * - 入力モニタリング：現在のマウス座標のリアルタイム表示
 * - 同期監視：myDebugData（プレイヤー状態）および serverItemCount（ドロップアイテム数）の可視化
 * - ステータス通知：ログイン状態や通信状況のフィードバック
 */
function simpleDebugRender() {
    ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
    ctx.fillRect(10, 10, 250, 105); // 少し縦を広げました

    ctx.fillStyle = "#00ff00";
    ctx.font = "14px monospace";

    ctx.fillText(`🖱️ Mouse : ${Math.round(mouseX)}, ${Math.round(mouseY)}`, 20, 35);
    
    if (myDebugData) {
        ctx.fillText(`🏃 Player: ${Math.round(myDebugData.x)}, ${Math.round(myDebugData.y)}`, 20, 55);
        // 🌟 アイテム数を表示
        ctx.fillText(`📦 Items : ${serverItemCount} 個`, 20, 75);
        ctx.fillText(`✨ 専用通信：成功！`, 20, 95);
    } else {
        ctx.fillText(`🏃 Player: 通信待機中...`, 20, 55);
        ctx.fillText(`📢 ログインしてください`, 20, 95);
    }

    //requestAnimationFrame(simpleDebugRender);
}

// 実行
simpleDebugRender();

// ============================================================
// :::DRAW_DEBUG_WINDOW::: 📊 開発用デバッグ情報ウィンドウ
// ============================================================
/**
 * 役割：
 * - パネル描画：半透明の背景と枠線（デバッグ情報を際立たせる）
 * - 情報集約：マウス位置、プレイヤーのHP、位置座標、アイテム生成数、APを一覧表示
 * - 柔軟なレイアウト：drawLine関数を用いたテキスト行の動的生成
 */
function drawDebugWindow(ctx, mouseX, mouseY, hero, items) {
    if (!showDebugWindow) return;

    const x = 10; // 表示位置（左上）
    const y = 50;
    const w = 200;
    const h = 120;

    // --- 📦 ウィンドウの背景 ---
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)"; // 半透明の黒
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = "#00ff00"; // デバッグっぽい緑色
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);

    // --- 📝 テキスト情報 ---
    ctx.fillStyle = "#00ff00";
    ctx.font = "12px monospace";
    
    let line = 0;
    const lineHeight = 18;
    const drawLine = (text) => {
        ctx.fillText(text, x + 10, y + 25 + (line * lineHeight));
        line++;
    };

    drawLine(`[Mouse] X:${Math.floor(mouseX)} Y:${Math.floor(mouseY)}`);
    drawLine(`[Player] HP:${hero.hp}/${hero.maxHp}`);
    drawLine(`[Player] Pos: ${Math.floor(hero.x)}, ${Math.floor(hero.y)}`);
    drawLine(`[Items]  Count: ${items ? items.length : 0}`);
    drawLine(`[AP]     Remaining: ${hero.ap || 0}`);
}

// ============================================================
// :::DEBUG_WINDOW_STATE::: 🚩 デバッグ表示の可視化フラグ
// ============================================================
/**
 * 役割：
 * - 状態スイッチ：trueの場合はデバッグウィンドウを表示、falseで非表示に切り替える
 * - 安全定義：既に定義済みかを判定し、二重定義を防ぐ設計
 */
if (typeof showDebugWindow === 'undefined') {
    var showDebugWindow = true; 
}

// ============================================================
// :::DRAW_INVENTORY_WINDOW::: 🎒 インベントリウィンドウの呼び出し
// ============================================================
/**
 * 役割：
 * - 状態確認：gameWindows.inventory.isOpen を参照して開閉を判定
 * - 描画委譲：ウィンドウの座標・サイズ（x, y, w, h）を `drawSimpleWindow` に引き渡し
 * - 簡潔性：描画の詳細をカプセル化することで、メイン描画ループをスッキリと保つ
 */
function drawInventoryWindow() {
    if (!gameWindows.inventory.isOpen) return;

    // 400, 100 などの直接の数字を、変数名に変えるだけです
    if (typeof drawSimpleWindow === 'function') {
        drawSimpleWindow("🎒 Items & Equipment", gameWindows.inventory.x, gameWindows.inventory.y, gameWindows.inventory.w, gameWindows.inventory.h);
    }
}

// ============================================================
// :::DRAW_EXTRA_WINDOW::: 🛠️ デバッグメニューウィンドウの描画管理
// ============================================================
/**
 * 役割：
 * - 状態管理：gameWindows.extra.isOpen による開閉制御
 * - UI描画：drawSimpleWindow を介した標準化された枠組みの描画
 * - 情報モニタリング：マウス座標、プレイヤー状況、アイテム数、サーバー同期状態の可視化
 * - 堅牢性：try-catch による予期せぬデータエラーの遮断（ゲームの安定稼働を優先）
 */
function drawExtraWindow() {
    // ウィンドウが開いていない場合は何もしない
    if (!gameWindows.extra.isOpen) return;

    try {
        if (typeof ctx !== 'undefined' && typeof hero !== 'undefined') {
            // 🌟 共通関数 drawSimpleWindow を使用して枠とタイトルを描画
            // タイトルは元のデバッグ表示を意識して「🛠️ Debug Menu」としています
            if (typeof drawSimpleWindow === 'function') {
                drawSimpleWindow("🛠️ Debug Menu", gameWindows.extra.x, gameWindows.extra.y, gameWindows.extra.w, gameWindows.extra.h);
            }

            // --- 🎨 文字の描画設定（元のコードを踏襲） ---
            ctx.save();
            ctx.fillStyle = "#00ff00"; // デバッググリーンの色
            ctx.font = "14px monospace";
            
            let line = 0;
            const draw = (txt) => {
                // eWinX, eWinY を基準に、タイトルバー(30px)の下から描画を開始
                ctx.fillText(txt, gameWindows.extra.x + 15, gameWindows.extra.y + 50 + (line * 20));
                line++;
            };

            // --- 🔍 アイテム数の判定ロジック（元のコードを完全踏襲） ---
            let itemCount = 0;
            if (typeof droppedItems !== 'undefined' && droppedItems) {
                itemCount = Array.isArray(droppedItems) ? droppedItems.length : Object.keys(droppedItems).length;
            } else if (typeof items !== 'undefined' && items) {
                itemCount = Array.isArray(items) ? items.length : Object.keys(items).length;
            }

            // --- 📝 各情報の表示（元のコードを踏襲） ---
            draw(`[Mouse]  X:${Math.floor(mouseX)} Y:${Math.floor(mouseY)}`);
            draw(`[Player] HP:${hero.hp}/${hero.maxHp}`);
            draw(`[Pos]    X:${Math.floor(hero.x)} Y:${Math.floor(hero.y)}`);
            draw(`[Items]  Dropped: ${itemCount}`);
            
            // Server情報の安全なチェック
            const serverStatus = (typeof serverDebugInfo !== 'undefined' && serverDebugInfo.players) ? "Sync: OK" : "Sync: Waiting";
            draw(`[Server] ${serverStatus}`);
            
            draw(`[AP]     Points: ${hero.ap || 0}`);
            draw(`[Status] ${gameWindows.status.isOpen ? "UI:Open" : "UI:Closed"}`);

            ctx.restore();
        }
    } catch (err) {
        // エラー時は静かに終了（体調が優れない時はログも無視して大丈夫です）
    }
}

// ============================================================
// :::DRAW_WINDOWS::: 🪟 全ウィンドウのZ-Index描画制御
// ============================================================
/**
 * 役割：
 * - 階層管理：windowStackに従い、奥から手前へと順次ウィンドウを描画
 * - ディスパッチャー：winTypeに基づいて適切な描画関数を呼び出す司令塔
 * - 安全性：各描画関数内での isOpen チェックを前提としつつ、
 * 効率的なレンダリングパイプラインを形成
 */
function drawWindows() {
    // windowStackは「開いている/存在する」ウィンドウのIDが重なり順に並んだ配列
    // 配列の後ろにあるものほど、後から描画される（＝手前に表示される）
    windowStack.forEach(winType => {
        
        // 各ウィンドウID（winType）に応じて、個別の描画関数を呼び出す
        // ※各関数内で if (!gameWindows[winType].isOpen) return; している前提、
        // もしくはここで if (gameWindows[winType].isOpen) で囲むとより安全です。

        // --- メインステータス・成長系 ---
        if (winType === "status")    drawStatusWindow();    // [S] ステータス
        if (winType === "equipment") drawEquipmentWindow(); // [E] 装備
        if (winType === "inventory") drawInventoryWindow(); // [I] インベントリ
        if (winType === "skill")     drawSkillWindow();     // [K] スキル
        if (winType === "avatar")    drawAvatarWindow();    // [A] アバター
        if (winType === "upgrade")   drawUpgradeWindow();   // [U] アップグレード

        // --- 冒険・ナビゲーション系 ---
        if (winType === "quest")     drawQuestWindow();     // [Q] クエスト
        if (winType === "worldmap")  drawWorldMapWindow();  // [W] ワールドマップ
        if (winType === "minimap")   drawMiniMapWindow();   // [M] ミニマップ
        if (winType === "journal")   drawJournalWindow();   // [J] 日記
        if (winType === "book")      drawBookWindow();      // [B] ブック

        // --- ソーシャル・コミュニティ系 ---
        if (winType === "guild")     drawGuildWindow();     // [G] ギルド
        if (winType === "friend")    drawFriendWindow();    // [F] フレンドリスト
        if (winType === "party")     drawPartyWindow();     // [P] パーティ
        if (winType === "trade")     drawTradeWindow();     // [T] トレード

        // --- システム・ログ・通知系 ---
        if (winType === "log")       drawLogWindow();       // [L] ログ
        if (winType === "event")     drawEventWindow();     // [N] イベント
        if (winType === "options")   drawOptionsWindow();   // [O] オプション
        if (winType === "help")      drawHelpWindow();      // [H] ヘルプ

        // --- 特殊・戦略的予約枠 ---
        if (winType === "extra")      drawExtraWindow();     // 特殊枠
        if (winType === "reserved_d") drawReservedDWindow(); // [D] 予備
        if (winType === "reserved_v") drawReservedVWindow(); // [V] 予備
    });
}

// --- 📊 メインステータス・成長系 ---
/*
function drawStatusWindow() {
    const win = gameWindows.status;
    if (!win.isOpen) return;
    // Statusは既に詳細な実装があるため、既存のコードをここに統合してください
    drawSimpleWindow("📊 Player Status", win.x, win.y, win.w, win.h);
}
*/

// ============================================================
// :::DRAW_EQUIPMENT_WINDOW::: 🛡️ 装備ウィンドウの描画管理
// ============================================================
/**
 * 役割：
 * - 開閉状態の判定：win.isOpen に基づき、描画の要否を判断
 * - UI構築：装備ウィンドウのタイトルと外枠を `drawSimpleWindow` へ委譲
 * - シンプルな橋渡し：司令塔である drawWindows と UI描画の橋渡し役
 */
function drawEquipmentWindow() {
    const win = gameWindows.equipment;
    if (!win.isOpen) return;
    drawSimpleWindow("🛡️ Equipment", win.x, win.y, win.w, win.h);
}

/*
function drawInventoryWindow() {
    const win = gameWindows.inventory;
    if (!win.isOpen) return;
    // Inventoryは既存の drawNewInventoryWindow() 等があればそちらを呼び出してください
    drawSimpleWindow("🎒 Inventory", win.x, win.y, win.w, win.h);
}
*/

function drawSkillWindow() {
    const win = gameWindows.skill;
    if (!win.isOpen) return;
    drawSimpleWindow("📜 Skill", win.x, win.y, win.w, win.h);
}

function drawAvatarWindow() {
    const win = gameWindows.avatar;
    if (!win.isOpen) return;
    drawSimpleWindow("👕 Avatar", win.x, win.y, win.w, win.h);
}

function drawUpgradeWindow() {
    const win = gameWindows.upgrade;
    if (!win.isOpen) return;
    drawSimpleWindow("💎 Upgrade", win.x, win.y, win.w, win.h);
}

// --- 🗺️ 冒険・ナビゲーション系 ---
function drawQuestWindow() {
    const win = gameWindows.quest;
    if (!win.isOpen) return;
    drawSimpleWindow("❓ Quest", win.x, win.y, win.w, win.h);
}

function drawWorldMapWindow() {
    const win = gameWindows.worldmap;
    if (!win.isOpen) return;
    drawSimpleWindow("🗺️ World Map", win.x, win.y, win.w, win.h);
}

function drawMiniMapWindow() {
    const win = gameWindows.minimap;
    if (!win.isOpen) return;
    drawSimpleWindow("📍 Mini Map", win.x, win.y, win.w, win.h);
}

function drawJournalWindow() {
    const win = gameWindows.journal;
    if (!win.isOpen) return;
    drawSimpleWindow("📖 Journal", win.x, win.y, win.w, win.h);
}

function drawBookWindow() {
    const win = gameWindows.book;
    if (!win.isOpen) return;
    drawSimpleWindow("📕 Monster Book", win.x, win.y, win.w, win.h);
}

// --- 👥 ソーシャル・コミュニティ系 ---
function drawGuildWindow() {
    const win = gameWindows.guild;
    if (!win.isOpen) return;
    drawSimpleWindow("🏰 Guild", win.x, win.y, win.w, win.h);
}

function drawFriendWindow() {
    const win = gameWindows.friend;
    if (!win.isOpen) return;
    drawSimpleWindow("🤝 Friend List", win.x, win.y, win.w, win.h);
}

function drawPartyWindow() {
    const win = gameWindows.party;
    if (!win.isOpen) return;
    drawSimpleWindow("⚔️ Party", win.x, win.y, win.w, win.h);
}

function drawTradeWindow() {
    const win = gameWindows.trade;
    if (!win.isOpen) return;
    drawSimpleWindow("🤝 Trade", win.x, win.y, win.w, win.h);
}

// --- ⚙️ システム・ログ・通知系 ---
function drawLogWindow() {
    const win = gameWindows.log;
    if (!win.isOpen) return;
    drawSimpleWindow("📝 System Log", win.x, win.y, win.w, win.h);
}

function drawEventWindow() {
    const win = gameWindows.event;
    if (!win.isOpen) return;
    drawSimpleWindow("🎁 Event", win.x, win.y, win.w, win.h);
}

function drawOptionsWindow() {
    const win = gameWindows.options;
    if (!win.isOpen) return;

    // 🌟 1. 描画設定を保存
    ctx.save();

    // 2. ウィンドウの枠を描画
    drawSimpleWindow("⚙️ Options", win.x, win.y, win.w, win.h);

    // 3. この関数内だけのフォントや色を設定
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.font = "14px 'MS PGothic', sans-serif";
    ctx.fillStyle = "#ffffff";

    const textX = win.x + 20;
    const textY = win.y + 50;
    const wikiIdText = `Wiki連携キー: ${win.wikiId || "読み込み中..."}`;

    // 文字の描画
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillText(wikiIdText, textX + 1, textY + 1);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(wikiIdText, textX, textY);
    
    ctx.fillStyle = "#f9d448";
    ctx.fillText("[コピー]", textX + 180, textY);

    // 🌟 4. 描画設定を元に戻す（これで他のUIへの影響が消えます）
    ctx.restore();
}

function drawHelpWindow() {
    const win = gameWindows.help;
    if (!win.isOpen) return;
    drawSimpleWindow("❓ Help", win.x, win.y, win.w, win.h);
}

// --- 🌟 特殊・予約枠 ---
function drawExtraWindow() {
    const win = gameWindows.extra;
    if (!win.isOpen) return;
    drawSimpleWindow("✨ Extra", win.x, win.y, win.w, win.h);
}

function drawReservedDWindow() {
    const win = gameWindows.reserved_d;
    if (!win.isOpen) return;
    drawSimpleWindow("🛠️ Reserved (D)", win.x, win.y, win.w, win.h);
}

function drawReservedVWindow() {
    const win = gameWindows.reserved_v;
    if (!win.isOpen) return;
    drawSimpleWindow("🛠️ Reserved (V)", win.x, win.y, win.w, win.h);
}

// ============================================================
// :::CREATE_CHAR_SELECTOR::: 🎭 キャラクター選択画面の動的構築
// ============================================================
/**
 * 役割：
 * - UI構築：radial-gradient を用いたスタイリッシュなオーバーレイの生成
 * - アニメーション管理：各キャラクターボタンの個別アニメーション（setInterval）の実行と停止
 * - リソース最適化：各キャラのIdleフレーム（20枚）を事前にプリロード
 * - インタラクション：マウスホバー時のスケール拡大・発光演出
 * - フロー制御：ログイン情報を統合し、キャラクター情報をサーバーへ直接送信してゲームを開始
 */
const createCharSelector = () => {
    const overlay = document.createElement('div');
    overlay.id = 'char-selector-overlay';
    overlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: radial-gradient(circle, #222 0%, #050505 100%);
        display: flex; flex-direction: column;
        align-items: center; justify-content: center; z-index: 10000;
    `;

    const title = document.createElement('h2');
    title.innerText = "CHARACTER SELECT"; 
    title.style.cssText = "color: #fff; margin-bottom: 40px; font-family: sans-serif; letter-spacing: 6px; text-shadow: 0 0 10px rgba(0,255,204,0.5); font-weight: lighter;";
    overlay.appendChild(title);

    const grid = document.createElement('div');
    grid.style.cssText = `
        display: grid; grid-template-columns: repeat(4, 110px);
        grid-template-rows: repeat(4, 110px); gap: 20px;
    `;

    const animTimers = [];

    for (let i = 1; i <= 16; i++) {
        const btn = document.createElement('button');
        const folderIdStr = String(i - 1).padStart(2, '0'); 
        const displayNumStr = String(i).padStart(2, '0'); 
        const charFileNameId = "01"; 

        let currentFrame = 0;
        const totalFrames = 20;

        const getIdlePath = (frame) => {
            const frameStr = String(frame).padStart(2, '0');
            return `${IMAGE_DOMAIN}char_assets/${folderIdStr}/01/Idle/Characters-Character${charFileNameId}-Idle_${frameStr}.png`;
        };

        const preloadLinks = [];
        for (let f = 0; f < totalFrames; f++) {
            const img = new Image();
            img.src = getIdlePath(f);
            preloadLinks.push(img);
        }

        const nameTag = document.createElement('div');
        nameTag.innerText = `Chara ${displayNumStr}`; 
        nameTag.style.cssText = `
            position: absolute; top: 8px; left: 0; width: 100%;
            color: #888; font-size: 11px; text-align: center;
            transition: all 0.3s; font-family: 'Courier New', monospace;
            letter-spacing: 1px;
            z-index: 10;
        `;

        btn.style.cssText = `
            position: relative;
            width: 100%; height: 100%; cursor: pointer; 
            border: 1px solid #333; 
            background-color: rgba(30, 30, 30, 0.8); 
            transition: all 0.3s ease; border-radius: 8px;
            overflow: hidden;
            background-image: url('${getIdlePath(0)}');
            background-size: 180%;
            background-repeat: no-repeat;
            background-position: center bottom;
            image-rendering: pixelated;
            box-shadow: inset 0 0 15px rgba(0,0,0,0.6);
        `;

        const timer = setInterval(() => {
            currentFrame = (currentFrame + 1) % totalFrames;
            btn.style.backgroundImage = `url('${preloadLinks[currentFrame].src}')`;
        }, 100);
        animTimers.push(timer);

        btn.onmouseover = () => { 
            btn.style.backgroundColor = "#444"; 
            btn.style.borderColor = "#00ffcc";
            btn.style.transform = "scale(1.1) translateY(-5px)";
            btn.style.boxShadow = "0 5px 15px rgba(0, 255, 204, 0.3)";
            btn.style.backgroundSize = "200%";
            nameTag.style.color = "#00ffcc";
            nameTag.style.transform = "scale(1.1)";
        };

        btn.onmouseout = () => { 
            btn.style.backgroundColor = "rgba(30, 30, 30, 0.8)"; 
            btn.style.borderColor = "#333";
            btn.style.transform = "scale(1.0) translateY(0)";
            btn.style.boxShadow = "inset 0 0 15px rgba(0,0,0,0.6)";
            btn.style.backgroundSize = "180%";
            nameTag.style.color = "#888";
            nameTag.style.transform = "scale(1.0)";
        };

        btn.onclick = () => {
            // パネルのアニメーションタイマーを停止
            animTimers.forEach(t => clearInterval(t));

            // 1. 変数を更新（選択したキャラのIDをセット）
            selectedGroup = i - 1; 
            selectedCharVar = 1; 

            // 2. 🖼️ 画像データをロード（自身の画面用）
            loadCharFrames(selectedGroup, selectedCharVar);

            // 🌟 修正：ログイン情報を取得し、最初から「選択したキャラ」でログインリクエストを送る
            // これにより、他ユーザーから見た時に「7」を介さず直接このキャラで出現します
            const nameInput = document.getElementById('user-name-input');
            const passInput = document.getElementById('user-pass-input');
            const userName = nameInput ? nameInput.value.trim() : "";
            const password = passInput ? passInput.value : "";

            if (typeof socket !== 'undefined' && socket.connected) {
                socket.emit('login', { 
                    username: userName, 
                    password: password,
                    channel: selectedChannel,
                    group: selectedGroup,    // 👈 最初から選んだグループを送信
                    charVar: selectedCharVar
                });
                console.log(`🚀 ログイン送信: ${userName} (Chara ${selectedGroup})`);
            }
            
            // 4. ゲーム開始フラグを立てて、パネルを消去
            window.isGameStarted = true;
            console.log(`Loaded Folder: ${folderIdStr}, Displayed as: Chara ${displayNumStr}`);
            
            overlay.remove();
        };

        btn.appendChild(nameTag);
        grid.appendChild(btn);
    }

    overlay.appendChild(grid);
    document.body.appendChild(overlay);
};

// view.js の一番下に記述
socket.onAny((event, ...args) => {
    window.lastReceivedTime = Date.now();
    //window.isDisconnected = false;
});

// 実行
//createCharSelector();

// インスタンス化（既存の初期値をセット）
/*
const gameWindows = {
    status: new GameWindow("status", 100, 100, 300, 250),
    inventory: new GameWindow("inventory", 400, 100, 250, 350),
    extra: new GameWindow("extra", 200, 200, 300, 200)
};
*/

// ============================================================
// 分解する
// ============================================================
// ============================================================
// :::MOUSE_MOVE_HANDLER::: 🖱️ マウス移動とインタラクション判定
// ============================================================
/**
 * 役割：
 * - 座標計算：canvasの描画領域に基づいたローカル座標(mouseX, mouseY)の算出
 * - ドラッグ処理：開いているウィンドウのドラッグ座標更新と境界チェック
 * - カーソル制御：UI重なり順(Z-Index)を考慮した、適切なカーソル（pointer/move/grab）の動的切り替え
 * - 優先順位（レイヤー）：ウィンドウ > 露店 > アイテム の順で判定し、無駄な処理をスキップ
 */
canvas.addEventListener('mousemove', (e) => {

	// 🌟 追記：接続が切れていたら、一切の判定を行わずに標準カーソルにする
    if (window.isDisconnected) {
        canvas.style.cursor = "default";
        return;
    }
	
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;

    const screenW = rect.width;
    const screenH = rect.height;
    const offset = 8; // 外枠や影の遊び

    // ------------------------------------------
    // 📊 ドラッグ移動処理（全ウィンドウ共通）
    // ------------------------------------------
    Object.values(gameWindows).forEach(win => {
        if (win.isDragging) {
            let nextX = mouseX - win.dragOffsetX;
            let nextY = mouseY - win.dragOffsetY;

            // 左・上制限
            if (nextX < 0) nextX = 0;
            if (nextY < 0) nextY = 0;

            // 右・下制限（ウィンドウごとのサイズ win.w / win.h を使用）
            if (nextX > screenW - win.w - offset) nextX = screenW - win.w - offset;
            if (nextY > screenH - win.h - offset) nextY = screenH - win.h - offset;

            win.x = nextX;
            win.y = nextY;
        }
    });

    // ------------------------------------------
    // 🪟 ウィンドウ関連のカーソル判定
    // ------------------------------------------
    let foundWindow = false;

    // 前面にある窓から判定するため、逆順でループ
    const winList = Object.values(gameWindows).reverse();
    for (const win of winList) {
        if (win.isOpen) {
            // 閉じるボタン
            if (win.isMouseOverClose(mouseX, mouseY)) {
                canvas.style.cursor = "pointer";
                foundWindow = true;
                break;
            }
            // ヘッダー（移動）
            if (win.isMouseOverHeader(mouseX, mouseY)) {
                canvas.style.cursor = "move";
                foundWindow = true;
                break;
            }
            // ウィンドウ内（デフォルト）
            if (win.isMouseOverWindow(mouseX, mouseY)) {
                canvas.style.cursor = "default";
                foundWindow = true;
                break;
            }
        }
    }

    // 窓の上にカーソルがある場合は、これ以降の判定（アイテム等）をスキップ
    if (foundWindow) return;

    // ------------------------------------------
    // 🏪 露店看板の判定（新規追加ロジック）
    // ------------------------------------------
    let foundVending = false;
    // otherPlayers または others を安全に参照
    const targetList = (typeof otherPlayers !== 'undefined') ? otherPlayers : (typeof others !== 'undefined' ? others : {});

    for (let id in targetList) {
        const p = targetList[id];
        // 露店を開設しているプレイヤーが対象
        if (p.is_vending) {
            // 看板の当たり判定範囲（描画ロジックに合わせて調整してください）
            const signW = 120; 
            const signH = 40;  
            const signX = p.x - signW / 2;
            const signY = p.y - 80; // プレイヤー頭上の高さ

            if (mouseX >= signX && mouseX <= signX + signW &&
                mouseY >= signY && mouseY <= signY + signH) {
                canvas.style.cursor = "pointer";
                foundVending = true;
                break;
            }
        }
    }

    // 看板の上にいる場合はバッグ判定をスキップして終了
    if (foundVending) return;

    // ------------------------------------------
    // 📦 バッグ・アイテム判定（ロジックを完全踏襲）
    // ------------------------------------------
    if (isDiscarding) {
        canvas.style.cursor = "default";
    } else if (selectedSlotIndex !== -1) {
        canvas.style.cursor = "grabbing";
    } else if (mouseY >= 130 && mouseY <= 170) {
        const hoverIndex = Math.floor((mouseX - 20) / 48);
        if (hoverIndex >= 0 && hoverIndex < 10 && inventoryVisualBuffer[hoverIndex]) {
            canvas.style.cursor = "grab";
        } else {
            canvas.style.cursor = "default";
        }
    } else {
        canvas.style.cursor = "default";
    }
});

// 既存の怪しい設定を上書きして固定する
window.tCanvas = document.getElementById('tooltip-layer');
window.tCtx = window.tCanvas.getContext('2d');

// 🌟 サイズを強制再固定
window.tCanvas.width = 800;
window.tCanvas.height = 600;

/*
function drawDebug() {
    // 1. 前のフレームを消去
    tCtx.clearRect(0, 0, 800, 600);

    // 2. 左上に青い四角（レイヤーが生きている証拠）
    tCtx.fillStyle = "blue";
    tCtx.fillRect(10, 10, 30, 30);

    // 3. マウス位置に赤い点
    if (typeof window.mouseX !== 'undefined') {
        tCtx.beginPath();
        tCtx.arc(window.mouseX, window.mouseY, 10, 0, Math.PI * 2);
        tCtx.fillStyle = "red";
        tCtx.fill();
        tCtx.closePath();
    }

    requestAnimationFrame(drawDebug);
}
drawDebug();
*/

/*
// マウス位置を更新する専用の窓口
document.addEventListener('mousemove', (e) => {
    const rect = tCanvas.getBoundingClientRect();
    window.mouseX = e.clientX - rect.left;
    window.mouseY = e.clientY - rect.top;
});
*/

// ==========================================
// 📋 2. 表示に関する基本設定（VIEW_CONFIG）
// 役割：画面上の見た目や判定の基準となる数値をまとめて管理します
// ==========================================

// ==========================================
// 🛠️ AnimUtils: 計算を楽にする共通ツール
// ==========================================

// ==========================================
// 📦 画像コンテナの自動生成
// ==========================================

// 👾 モンスター用の箱を名簿から「自動で」作成

// 数字とファイルパスの対応表

// 画像オブジェクトを格納する箱

// すべての数字画像を読み込む

// ==========================================
// 🚀 3. 画像の読み込み（新パス形式：自動処理）
// ==========================================

/**
 * 🌟 自動画像読み込み関数（404エラー防止版）
 */

// 実行（これで読み込みが始まります）

// view.js の冒頭

// 🌟 ソースから直接入力（ここを修正すれば確実に動きます）


// 画像を一斉にロード

// ==========================================
// 👤 プレイヤー・キャラクター設定
// ==========================================

// ==========================================
// 📜 システム設定（ログなど）
// ==========================================

// view.js

// ==========================================
// 🎨 メインの描画司令塔
// ==========================================

// ==========================================
// 📈 補助：経験値の表示アニメーション計算
// ==========================================

// ==========================================
// 📡 補助：HUD・特殊UI描画
// ==========================================

// ==========================================
// 🛠️ 補助：デバッグ専用描画レイヤー
// ==========================================

// --- 以下、分割された専門関数 ---

// ==========================================
// 💥 6. テキスト・エフェクト関連
// ==========================================

// ==========================================
// 📊 UI描画の司令塔（ここですべてを呼び出す）
// ==========================================
/*
function drawUI(hero) {
    if (!hero) return; // 🌟 heroが空っぽの時は何もしない（これでエラーを防ぐ）

    // 1. HPバーの描画（背景パネルを含む）
    //drawPlayerHP(hero);

    // 2. カバンUIの描画
    //drawBagUI(hero);

    // 3. 経験値とレベル・デバッグ表示
    //drawExpAndDebug(hero);
	
	//drawTopStatusUI(hero);
}
*/

// view.js の一番下などに追加
/*
canvas.addEventListener('dblclick', (event) => {
    // 1. クリックされた場所（座標）を取得
    const rect = canvas.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    // 2. インベントリの範囲内かチェック (y座標が 130～170 の間くらい)
    if (clickY >= 130 && clickY <= 170) {
        const slotSize = 40;
        const padding = 8;
        const startX = 20;

        // 3. 何番目のスロットをクリックしたか計算
        const index = Math.floor((clickX - startX) / (slotSize + padding));

        // 0番目〜9番目の範囲内なら、サーバーに通知
        if (index >= 0 && index < 10) {
            console.log(index + "番目のアイテムを捨てます");
            socket.emit('dropItem', index); // サーバーに「この番号を捨てて」と送る
			if (typeof playDropSound === 'function') {
			    // stateで音が鳴るのでコメントアウト
                //playDropSound();
            }
        }
    }
});
*/

// ==========================================
// 判定用の変数（データの比較に使用）
// ==========================================

// ==========================================
// 📡 サーバーからのデータ（state）を受け取る窓口
// ==========================================
// view.js の socket.on('state', ...) の部分をこれに差し替えてください

// 🌟 関数の外側に「一瞬前のデータ」を保存する場所を作ります
//let inventoryVisualBuffer = null;

// 🌟 修正：itemLogs を「window.itemLogs」として扱うとより確実です

// 🌟 真似して作った「お金ログ」の受信処理

// ==========================================
// 🎒 アイテム取得時の右下ログ通知を受け取る
// ==========================================
/*
socket.on('item_pickup_log', (data) => {
    // 1. 表示するメッセージを作る
    let logMsg = "";
    if (data.amount >= 2) {
        logMsg = `${data.itemName}を${data.amount}個手に入れました`;
    } else {
        logMsg = `${data.itemName}を手に入れました`;
    }

    // 2. 右下ログ用の配列（itemLogs）にデータを追加する
    // view.js 内で itemLogs が定義されていることを前提としています
    if (typeof itemLogs !== 'undefined') {
        itemLogs.push({
            text: logMsg,
            time: Date.now(),
            color: '#ffeb3b' // ゴールドっぽい黄色
        });

        // ログが溜まりすぎないように古いものを消す（最大5件など）
        if (itemLogs.length > 5) {
            itemLogs.shift();
        }
    } else {
        // もし itemLogs が見つからない場合、コンソールで教えてくれるようにします
        console.error("右下ログ用の配列 'itemLogs' が見つかりません。");
    }
});
*/

/*
window.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'd') {
        showDebugWindow = !showDebugWindow; // DキーでON/OFF
        console.log("Debug Window:", showDebugWindow);
    }
});
*/

/*
// ダブルクリック（dblclick）
canvas.addEventListener('dblclick', (event) => {
    console.log("ダブルクリックを検知しました！");
    const rect = canvas.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    if (clickY >= 130 && clickY <= 170) {
        const index = Math.floor((clickX - 20) / 48);
        if (index >= 0 && index < 10) {
            console.log(`${index}番のアイテムをサーバーへ捨てるリクエスト送信`);
            socket.emit('dropItem', index); 
            selectedSlotIndex = -1;
        }
    }
});
*/

// 🌟 サーバーの通信とは「別ルート」でホバーを描画する専用ループ
// view.js 内の drawItemHoverLoop を修正
/*
function drawItemHoverLoop() {
    if (selectedSlotIndex === -1) {
        requestAnimationFrame(drawItemHoverLoop);
        return;
    }

    const item = inventoryVisualBuffer[selectedSlotIndex];
    if (item) {
        ctx.save();
        
        // 🌟 ここで透明度を設定（0.0が透明、1.0が不透明）
        // 0.6 にすると、後ろが少し透けて「掴んでいる感」が出ます
        ctx.globalAlpha = 0.6;

        const displaySize = 30; 
        const itemImg = itemImages[item.type];

        if (itemImg && itemImg.complete && itemImg.width > 0) {
            // 中心を合わせて描画
            ctx.drawImage(
                itemImg, 
                mouseX - (displaySize / 2), 
                mouseY - (displaySize / 2), 
                displaySize, 
                displaySize
            );
        } else {
            // 予備の枠も少し薄く出す
            ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
            ctx.strokeRect(mouseX - 15, mouseY - 15, 30, 30);
        }

        // 📝 文字も少しだけ薄くして、画像に合わせます
        //ctx.globalAlpha = 0.8; 
        //ctx.fillStyle = "white";
        //ctx.font = "bold 14px Arial";
        //ctx.textAlign = "center";
        //ctx.shadowBlur = 4;
        //ctx.shadowColor = "black";
        //ctx.fillText(item.type, mouseX, mouseY + 30);
        
        ctx.restore(); // 🌟 restoreを呼ぶことで、他の描画まで薄くなるのを防ぎます
    }
		
    requestAnimationFrame(drawItemHoverLoop);
}
*/

// 🌟 そして一番最後に、このループを最初に1回だけ動かします
//drawItemHoverLoop();

//inventoryVisualBuffer[0] = { type: 'My Sword', def: 50 };

// view.js の一番下（書き換え）

// デバッグウィンドウを表示するかどうかのスイッチ
//let showDebugWindow = true; 

// 🛠️ 開発用：現在のUIの状態を可視化する
/*
function drawUIDebugInfo() {
    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(10, canvas.height - 120, 200, 110); // 左下に黒い枠を表示

    ctx.fillStyle = "#00ff00"; // デバッグ文字は緑色
    ctx.font = "12px monospace";
    ctx.fillText("--- UI DEBUG ---", 20, canvas.height - 100);
    ctx.fillText(`Window Open : ${gameWindows.status.isOpen}`, 20, canvas.height - 85);
    ctx.fillText(`Current Tab : ${currentTab}`, 20, canvas.height - 70);
    ctx.fillText(`Available AP: ${apPoints}`, 20, canvas.height - 55);
    ctx.fillText(`Is Dragging : ${isDragging}`, 20, canvas.height - 40);
    ctx.fillText(`Win Pos     : ${Math.round(winX)}, ${Math.round(winY)}`, 20, canvas.height - 25);
    ctx.restore();
}
*/

// ==========================================
// 🛠️ デバッグ表示の強制実行コード
// ==========================================

// 2. 既存の描画に割り込んでデバッグを表示する
// このコードは 1秒間に 60回、画面の一番手前にデバッグ情報を上書きします。
// ==========================================
// 🛠️ デバッグ表示の修正版（アイテム数取得を強化）
// ==========================================
/*
function autoDebugRender() {
    try {
        if (typeof ctx !== 'undefined' && typeof hero !== 'undefined') {
            if (showDebugWindow) {
                const x = 10;
                const y = 50;
                const w = 220;
                const h = 160; // 少し広げました

                // 背景
                ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
                ctx.fillRect(x, y, w, h);
                ctx.strokeStyle = "#00ff00";
                ctx.lineWidth = 2;
                ctx.strokeRect(x, y, w, h);

                // 文字
                ctx.fillStyle = "#00ff00";
                ctx.font = "14px monospace";
                
                let line = 0;
                const draw = (txt) => {
                    ctx.fillText(txt, x + 10, y + 25 + (line * 20));
                    line++;
                };

                // --- アイテム数の判定ロジック ---
                //droppedItems, items, allItems のどれかにデータが入っているかチェック
                let itemCount = 0;
                if (typeof droppedItems !== 'undefined' && droppedItems) {
                    itemCount = Array.isArray(droppedItems) ? droppedItems.length : Object.keys(droppedItems).length;
                } else if (typeof items !== 'undefined' && items) {
                    itemCount = Array.isArray(items) ? items.length : Object.keys(items).length;
                }

                draw(`[Mouse]  X:${Math.floor(mouseX)} Y:${Math.floor(mouseY)}`);
                draw(`[Player] HP:${hero.hp}/${hero.maxHp}`);
                draw(`[Pos]    X:${Math.floor(hero.x)} Y:${Math.floor(hero.y)}`);
                draw(`[Items]  Dropped: ${itemCount}`); // 修正したカウントを表示
                draw(`[Server] ${serverDebugInfo.players ? "Sync: OK" : "Sync: Waiting"}`);
                draw(`[AP]     Points: ${hero.ap || 0}`);
                draw(`[Status] ${gameWindows.status.isOpen ? "UI:Open" : "UI:Closed"}`);
            }
        }
    } catch (err) {
        // エラーログ（疲れている時は無理に見なくて大丈夫です）
    }
    requestAnimationFrame(autoDebugRender);
}

// 実行開始
autoDebugRender();
*/

// 'D'キーで表示切り替え
/*
window.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'd') {
        showDebugWindow = !showDebugWindow;
        console.log("Debug Window:", showDebugWindow);
    }
});
*/

// ==========================================
// 🛡️ 究極の安定版：STRUPボタン・ホバー音システム
// ==========================================
/*
(function() {
    let wasHover = false; // 「前のフレームでマウスが乗っていたか」を記憶

    // ゲームのメイン描画（requestAnimationFrame）に同期させる
    function updateHoverSystem() {
        try {
            // ステータス画面が開いている時だけ処理
            if (typeof gameWindows.status.isOpen !== 'undefined' && gameWindows.status.isOpen) {
                
                // ボタンの当たり判定（座標のズレをなくすため毎回計算）
                const bX = winX + 160; 
                const bY = winY + 55;
                const bW = 40; 
                const bH = 20;

                // 今この瞬間のマウス座標と比較（1フレームに1回だけ判定）
                const isOver = (mouseX >= bX && mouseX <= bX + bW && 
                               mouseY >= bY && mouseY <= bY + bH);

                if (isOver) {
                    // 「さっきまで外にいて、今中に入った」瞬間だけ音を鳴らす
                    if (!wasHover) {
                        if (typeof playMouseOver1Sound === 'function') {
                            playMouseOver1Sound();
                        }
                        wasHover = true; // 旗を立てる
                    }
                } else {
                    // 外に出たら即座に旗を下ろす
                    wasHover = false;
                }
            } else {
                wasHover = false;
            }
        } catch (e) {
            // エラーを握りつぶしてゲームを止めない
        }
        // 画面の更新（60fps）に合わせて実行
        requestAnimationFrame(updateHoverSystem);
    }

    updateHoverSystem();
})();
*/

/*
window.addEventListener('keydown', (event) => {
    if (event.key === 'i' || event.key === 'I') {
        // インベントリのスイッチを反転させる
        isInventoryOpen = !isInventoryOpen;
        
        // コンソールに状態を出して確認（F12で見れます）
        console.log("Inventory Window State:", isInventoryOpen);
    }
});
*/

// 💡 補足：
// 元の autoDebugRender() 内にあった requestAnimationFrame(autoDebugRender); は不要になります。
// 代わりに、drawUIOverlay() などのメインの描画ループの中で 
// windowStack を通じて drawExtraWindow(); が呼ばれるようにしてください。

/**
 * 📺 画面上に現在のチャンネルを表示する
 */
 /*
function drawCurrentChannel() {
    // 自分のキャラ(hero)が存在し、チャンネル情報を持っているか確認
    if (typeof hero !== 'undefined' && hero.channel) {
        ctx.save(); // 現在の描画状態を保存

        // 文字のスタイル設定
        ctx.font = "bold 18px 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
        ctx.textAlign = "left";
        
        // 少し影をつけて見やすくする
        ctx.shadowColor = "rgba(0, 0, 0, 0.7)";
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;

        // 文字の色（少し目立つ色にすると良いです）
        ctx.fillStyle = "#fbbf24"; // 黄色っぽい色
        
        // 画面の左上に表示（座標 x: 20, y: 35 くらい）
        ctx.fillText(`📡 Channel: ${hero.channel}`, 20, 35);

        ctx.restore(); // 描画状態を元に戻す
    }
}
*/