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
	
	// 🔍 ここを追加：ちゃんとアイテムごとの画像がブラウザ側で準備されるかチェック
    console.log("🔍 受信した ITEM_CONFIG の中身:", ITEM_CONFIG);
    if (typeof sprites !== 'undefined' && sprites.items) {
        Object.keys(ITEM_CONFIG).forEach(key => {
            const itemConf = ITEM_CONFIG[key];
            if (!sprites.items[key] && itemConf.src) {
                const img = new Image();
                img.src = itemConf.src;
                sprites.items[key] = img; // 配列にするか単体のImageにするかは既存のルールに合わせます
                console.log(`🖼️ クライアント側でカード画像を手動ロード開始: ${key} -> ${itemConf.src}`);
            }
        });
    }

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
    status:     new GameWindow("status", 50, 50, 350, 350),      // [S] ステータス
    equipment:  new GameWindow("equipment", 360, 50, 166, 148),  // [E] 装備（コンパクト化に合わせてサイズ変更）
    inventory:  new GameWindow("inventory", 520, 150, 260, 380),  // [I] インベントリ
    skill:      new GameWindow("skill", 480, 100, 280, 400),      // [K] スキル
    avatar:     new GameWindow("avatar", 380, 70, 280, 320),     // [A] アバター
    upgrade:    new GameWindow("upgrade", 250, 150, 300, 350),   // [U] アップグレード
    
    // --- 冒険・ナビゲーション系 ---
    quest:      new GameWindow("quest", 100, 120, 350, 400),     // [Q] クエスト
    worldmap:   new GameWindow("worldmap", 50, 50, 700, 500),    // [W] ワールドマップ
    minimap:    new GameWindow("minimap", 10, 10, 200, 180),     // [M] ミニマップ
    journal:    new GameWindow("journal", 150, 100, 400, 450),   // [J] 日記
    book:       new GameWindow("book", 120, 80, 360, 500),       // [B] ブック
    
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
    reserved_v: new GameWindow("reserved_v", 100, 100, 300, 300),  // [V] あえて開けておく
    reserved_r: new GameWindow("reserved_r", 100, 100, 300, 300),  // [R] あえて開けておく
    reserved_y: new GameWindow("reserved_y", 100, 100, 300, 300)  // [Y] あえて開けておく
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
// :::ENEMY_PLAN::: 🗺️ ステップで登場する敵のプラン（ここで一元管理）
// ============================================================
const ENEMY_PLAN = [
    { plat: 0, id: 2010 }, 
    //{ plat: 0, id: 2160 }, 
    { plat: 1, id: 2050 }, 
    { plat: 1, id: 2020 }, 
    { plat: 2, id: 2080 }, 
    { plat: 2, id: 2080 }, 
    { plat: 2, id: 2080 },
    { plat: null, id: 2010 }
];

// ============================================================
// :::LOAD_STATIC_IMAGES::: 🖼️ 元の「一番軽い構造」を完全維持したプラン対応版
// ============================================================
function loadStaticImages() {
    const allowedCharIds = ["Char01", "Char02", "Char03", "Char10", "Char13", "Char16", "Char19"];

    if (!MONSTER_CONFIGS || MONSTER_CONFIGS.length === 0) return;

    // 🌟 1. ENEMY_PLAN からIDを抽出
    let activeEnemyIds = ENEMY_PLAN.map(p => String(p.id));

    // 🌟 2. 【追加】もし現在画面上（またはゲーム内）に配置されている敵のデータ（enemiesなど）があれば、そのIDも強制的に含める！
    // ※ グローバル変数として enemies が存在する場合の安全ガード付き
    if (typeof enemies !== 'undefined') {
        // enemies が配列の場合と、チャンネルなどでオブジェクトになっている場合の両方に対応
        let currentEnemiesList = [];
        if (Array.isArray(enemies)) {
            currentEnemiesList = enemies;
        } else if (typeof enemies === 'object' && enemies !== null) {
            // チャンネル別のオブジェクト構造に対応（chIdごとの配列をフラットにする）
            currentEnemiesList = Object.values(enemies).flat();
        }

        currentEnemiesList.forEach(e => {
            if (e && e.id) {
                activeEnemyIds.push(String(e.id));
            }
        });
    }

    // 重複を削除
    const planEnemyIds = [...new Set(activeEnemyIds)];

    // --- 以降の処理はそのまま（planEnemyIds を使ってロードする） ---
    MONSTER_CONFIGS.forEach(m => {
        let isMonsterType = m.id.startsWith("Monster") || planEnemyIds.includes(String(m.id));
        if (!isMonsterType && !allowedCharIds.includes(m.id)) return;

        if (isMonsterType) {
            if (m.id.startsWith("Monster")) {
                const monsterNum = parseInt(m.id.replace("Monster", ""), 10);
                if (!isNaN(monsterNum) && monsterNum > 10) return; 
            } else {
                if (!planEnemyIds.includes(String(m.id))) return;
            }
        }

        const basePath = `${IMAGE_DOMAIN}char_assets_enemy/${m.id}`;
        let fName = isMonsterType ? "tile" : "skeleton";

        const loadSet = (actionName, folderName) => {
            const key = m.name + actionName;
            sprites[key] = [];
            
            let count = 0;
            if (m.id === "Monster1") {
                if (actionName === 'Idle')   count = 27;
                if (actionName === 'Walk')   count = 20;
                if (actionName === 'Attack') count = 17;
                if (actionName === 'Death')  count = 27;
                if (actionName === 'Jump')   count = 0;
            } else {
                const lowerName = actionName.toLowerCase();      
                count = m["anim_" + lowerName] || m[lowerName] || 0;
            }

            for (let i = 0; i < count; i++) {
                const img = new Image();
                img.crossOrigin = "anonymous"; 
                let fullPath = isMonsterType 
                    ? `${basePath}/${folderName}/${fName}${String(i).padStart(3, '0')}.png`
                    : '';
                
                img.src = fullPath;
                img.onload = () => {
                    img.autoPaddingY = getBottomTransparentPadding(img, 10);
                };
                sprites[key].push(img);
            }
        };

        loadSet('Walk',   'Walk');
        loadSet('Attack', 'Attack');
        loadSet('Idle',   'Idle');
        loadSet('Jump',   'Jump');
        loadSet('Death',  'Death'); 

        const idleKey = isMonsterType ? 'tile000' : `${fName}-Idle_0`;
        const baseImg = new Image();
        baseImg.crossOrigin = "anonymous";
        baseImg.src = `${basePath}/Idle/${idleKey}.png`;
        sprites[m.name] = [baseImg]; 

        const damageImg = new Image();
        damageImg.crossOrigin = "anonymous";
        damageImg.src = `${basePath}/Idle/${idleKey}.png`;
        sprites[m.name + 'Damage'] = [damageImg];
    });

    // --- 共通エフェクト ---
    sprites["commonDeath"] = [];
    for (let i = 0; i < 18; i++) {
        const img = new Image();
        img.crossOrigin = "anonymous";
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

	// 🌟 追記：R/Tキーでの切り替えを完全に停止する
    if (e.key === 'r' || e.key === 'R' || e.key === 't' || e.key === 'T') {
        return;
    }

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
// :::KEY_UI_CONTROLLER::: 🖥️ キー入力によるUI全ウィンドウ管理（キーコンフィグ対応版）
// ============================================================
window.addEventListener('keydown', (e) => {
    if (window.isDisconnected) {
        return; 
    }
    
    if (!window.isGameStarted) {
        return;
    }
    
    if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;

    const key = e.key.toLowerCase();

    // 🌟 キー変更待ち状態のとき（ここで新しいキーを記録する）
    if (waitingForKeyChange) {
        if (e.key && e.key !== 'Escape') {
            const newKeyChar = e.key.toLowerCase();
            currentKeyConfig[waitingForKeyChange].key = newKeyChar;
            currentKeyConfig[waitingForKeyChange].keyName = e.key.toUpperCase();
            
            // keyMapを更新して即座に反映させる
            updateKeyMapFromConfig();
            
            console.log(`Key changed for ${waitingForKeyChange} to ${e.key.toUpperCase()}`);
        }
        waitingForKeyChange = null;
        e.preventDefault();
        return;
    }

    // --- 🌟 2. 各ウィンドウの共通判定ロジック (元々の keyMap 参照を維持) ---
    const targetId = keyMap[key];
    if (targetId && gameWindows[targetId]) {
        const win = gameWindows[targetId];

        win.isOpen = !win.isOpen;
        
        // 🌟 追加：もしインベントリウィンドウなら、HTML側の表示状態（display）も完全同期させる
        if (targetId === 'inventory') {
            const inventoryWindow = document.getElementById('inventory-window');
            if (inventoryWindow) {
                inventoryWindow.style.display = win.isOpen ? 'block' : 'none';
            }
            // 開いた瞬間にCanvasの解像度を整えたり再描画する場合の安全策
            if (win.isOpen) {
                if (typeof initInventoryCanvasResolution === 'function') initInventoryCanvasResolution();
                if (typeof drawBagGrid === 'function') drawBagGrid();
            }
        }
        
        if (targetId === 'options' && win.isOpen) {
            console.log("Optionsを開いたのでIDを要求します");
            if (typeof socket !== 'undefined' && socket.emit) {
                socket.emit('get_account_info'); 
            }
        }
        
        if (typeof windowStack !== 'undefined') {
            windowStack = windowStack.filter(v => v !== targetId);
            windowStack.push(targetId);
        }
        
        if (win.isOpen) {
            if (typeof playMenuUpSound === 'function') playMenuUpSound();
        } else {
            if (typeof playMenuDownSound === 'function') playMenuDownSound();
        }
        
        console.log(`${targetId} Window State:`, win.isOpen);
        e.preventDefault(); // ウィンドウを開くときのブラウザスクロール等を防ぐ
    }

    // --- 🌟 4. エスケープ (全てのウィンドウを閉じる) ---
    if (e.key === 'Escape') {
        const anyOpen = Object.values(gameWindows).some(win => win.isOpen);

        if (anyOpen) {
            Object.values(gameWindows).forEach(win => {
                win.isOpen = false;
            });
            
            // 🌟 追加：Escapeキーで全閉じする際、HTMLインベントリウィンドウもしっかり非表示にする
            const inventoryWindow = document.getElementById('inventory-window');
            if (inventoryWindow) {
                inventoryWindow.style.display = 'none';
            }
            
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
// :::CONTEXT_MENU_TARGETING::: 🖱️ 右クリックによるプレイヤーターゲット＆UI判定
// ============================================================
const stageCanvas = document.getElementById('stage');

if (stageCanvas) {
    stageCanvas.addEventListener('contextmenu', function(e) {
        e.preventDefault();

        const rect = stageCanvas.getBoundingClientRect();
        
        // ------------------------------------------------------------
        // 🌟 【追加】UI(使用中アイテム)のクリック判定を先に行う
        // ------------------------------------------------------------
        if (typeof hero !== 'undefined' && hero && hero._renderActiveItems && hero._renderActiveItems.length > 0) {
            // HUD判定用の座標計算 (クライアント座標からキャンバス内座標への変換)
            const hudCanvasX = ((e.clientX - rect.left) / rect.width) * VIEW_CONFIG.SCREEN_WIDTH; 
            const hudCanvasY = ((e.clientY - rect.top) / rect.height) * VIEW_CONFIG.SCREEN_HEIGHT; 

            const iconSize = 32;
            const spacing = 6;
            const rightMargin = 20;
            const topY = 20;

            let clickedActiveItemIndex = -1;

            // 🌟 画面上に綺麗に並んでいる `_renderActiveItems` をベースにヒット判定
            hero._renderActiveItems.forEach((item, index) => {
                const iconX = VIEW_CONFIG.SCREEN_WIDTH - rightMargin - ((hero._renderActiveItems.length - index) * (iconSize + spacing));
                const iconY = topY;

                // マウスがアイコンの矩形内にあるか
                if (hudCanvasX >= iconX && hudCanvasX <= iconX + iconSize &&
                    hudCanvasY >= iconY && hudCanvasY <= iconY + iconSize) {
                    clickedActiveItemIndex = index;
                }
            });

            // 💡 もしHUDのアイコン上で右クリックされていた場合は、削除処理をして終了する
            if (clickedActiveItemIndex !== -1) {
                const targetItem = hero._renderActiveItems[clickedActiveItemIndex];
                if (targetItem) {
                    console.log(`[UI] アクティブアイテム "${targetItem.name}" が右クリックで削除されました`);
                    
                    // 🛑 クライアント側で即座に同名のアイテムをすべてフィルターして画面から消す
                    hero.activeItems = hero.activeItems.filter(item => item.name !== targetItem.name);
                    
                    // サーバーへ「名前」で削除を通知（これで何回重ねて使っていても1発で消えます）
                    socket.emit('remove_active_item', { name: targetItem.name });
                }
                return; // 🛑 ここで処理を終了し、キャラクター判定には進まない
            }
        }
        // ------------------------------------------------------------


        // ------------------------------------------------------------
        // 🔽 既存のプレイヤーターゲット判定処理
        // ------------------------------------------------------------
        const canvasX = ((e.clientX - rect.left) / rect.width) * 800;
        const canvasY = ((e.clientY - rect.top) / rect.height) * 600;

        let foundPlayer = null;

        // 1. まず他プレイヤー(others)を探索
        for (let id in others) {
            const p = others[id];
            if (canvasX >= p.x - 30 && canvasX <= p.x + 70 &&
                canvasY >= p.y - 50 && canvasY <= p.y + 50) {
                foundPlayer = p;
                break;
            }
        }

        // 2. 他プレイヤーが見つからなければ、自分(hero)かどうかを判定
        if (!foundPlayer && typeof hero !== 'undefined') {
            if (canvasX >= hero.x - 30 && canvasX <= hero.x + 70 &&
                canvasY >= hero.y - 50 && canvasY <= hero.y + 50) {
                foundPlayer = hero; // 自分をターゲットとしてセット
            }
        }

        if (foundPlayer) {
            window.selectedPlayer = foundPlayer;
            console.log("【1. ターゲット特定】:", foundPlayer.name || "自分");

            // --- 自キャラかどうかで分岐処理 ---
            if (false) {
                const targetId = "SELF_" + (typeof myId !== 'undefined' ? myId : "player");
                
                const dummyEvent = {
                    preventDefault: () => {},
                    pageX: e.pageX,
                    pageY: e.pageY,
                    target: { textContent: foundPlayer.name || "自分" }
                };
                
                handleRightClick(dummyEvent, targetId);

            } else {
                // 他プレイヤーなら従来通りサーバーに問い合わせ
                socket.emit('get_target_account_info', foundPlayer.name);

                socket.once('target_account_info_response', (data) => {
                    console.log("【2. サーバーからの回答】:", data);
                    
                    const targetId = data.wikiId || foundPlayer.name;
                    console.log("【3. 最終ID決定】:", targetId);
                    
                    const dummyEvent = {
                        preventDefault: () => {},
                        pageX: e.pageX,
                        pageY: e.pageY,
                        target: { textContent: data.wikiName || foundPlayer.name }
                    };
                    
                    handleRightClick(dummyEvent, targetId);
                });
            }
        } else {
            // 何もクリックしていなければメニューを閉じる
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
    // 既存の要素のみにドラッグを適用する安全な関数
    const safeMakeDraggable = (winId, headId) => {
        if (document.getElementById(winId) && document.getElementById(headId)) {
            makeDraggable(winId, headId);
        } else {
            console.log(`ℹ️ まだ生成されていないか要素が見つかりません: ${winId}`);
        }
    };

    // それぞれのウィンドウに対して適用
    safeMakeDraggable('player-profile-window', 'profile-header');
    safeMakeDraggable('vending-window', 'vending-header');
    safeMakeDraggable('other-vending-window', 'other-vending-header');
    safeMakeDraggable('shop-overlay', 'shop-header');
    safeMakeDraggable('zukan-overlay', 'zukan-header');
    safeMakeDraggable('mzukan-overlay', 'mzukan-header');
});

// テスト用：即座にボタンを探してログに出す
const testBtn = document.getElementById('inventory-close-btn');
console.log("【強制テスト】閉じるボタンの検出:", testBtn);

if (testBtn) {
    testBtn.addEventListener('click', () => {
        console.log("🟢 成功！ボタンがクリックされました！");
        if (typeof toggleInventoryWindow === 'function') {
            toggleInventoryWindow(false);
        } else {
            console.log("❌ toggleInventoryWindow 関数が見つかりません");
        }
    });
}

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
// :::MOUSE_CLICK_CONTROLLER::: 🖱️ Canvas上のクリック操作一括制御（10スロット＆バッグ両対応版）
// ============================================================
canvas.addEventListener('mousedown', (event) => {

    // 🌟 接続が切れていたら、クリック操作を一切受け付けない
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

        // 🌟 ステータスウィンドウ内のクリック判定（新規APボタン対応版）
        if (priorityWindow === "status") {
            const startY = win.y + 55;
            const gap = 20;
            const halfWidth = (win.w - 28) / 2;
            const leftX = win.x + 14;

            const col1Labels = ["名前", "職業", "レベル", "ギルド", "HP", "MP", "経験値", "人気度", "STR", "DEX", "INT", "LUK"];
            
            for (let i = 0; i < col1Labels.length; i++) {
                const label = col1Labels[i];
                const currentY = startY + (gap * i);
                const isTargetStat = (label === "STR" || label === "DEX" || label === "INT" || label === "LUK");

                if (isTargetStat) {
                    const statKey = label.toLowerCase();
                    const btnW = 38;
                    const btnH = 16;
                    const btnX = leftX + halfWidth - 46;
                    const btnY = currentY - 12;

                    if (clickX >= btnX && clickX <= btnX + btnW && clickY >= btnY && clickY <= btnY + btnH) {
                        if (hero.ap > 0) {
                            socket.emit('upgrade_stat', { type: statKey });
                            if (typeof playMouseClickSound === 'function') playMouseClickSound();
                        } else {
                            if (typeof playMenuDownSound === 'function') playMenuDownSound();
                        }
                        return;
                    }
                }
            }
        }

        // 🌟 インベントリ（バッグ）ウィンドウが開いている場合の内部クリック判定
        if (priorityWindow === "inventory" && win.isOpen) {
            let bagX = win.x;
            let bagY = win.y;
            let cols = 5;
            let slotSize = 40;
            let spacing = 5;
            let startX = bagX + 20;
            let startY = bagY + 70;
            let scrollRow = win.scrollY || 0;
            let maxVisibleRows = 6;
            let maxTotalSlots = 50;

            let clickedSlotIndex = -1;
            let drawnIndex = 0;
            let startIndex = scrollRow * cols;
            let endIndex = startIndex + (cols * maxVisibleRows);

            let alreadyCheckedETC = new Set();

            for (let i = 0; i < maxTotalSlots; i++) {
                let item = (hero && hero.inventory) ? hero.inventory[i] : null;

                if (i < startIndex || i >= endIndex) {
                    continue;
                }

                let col = drawnIndex % cols;
                let row = Math.floor(drawnIndex / cols);
                let x = startX + col * (slotSize + spacing);
                let y = startY + row * (slotSize + spacing);

                if (clickX >= x && clickX <= x + slotSize && clickY >= y && clickY <= y + slotSize) {
                    if (item && item.type) {
                        let category = (typeof itemCategories !== 'undefined') ? itemCategories[item.type] : null;
                        if (category === 'ETC') {
                            if (alreadyCheckedETC.has(item.type)) {
                                // 重複スキップ
                            } else {
                                alreadyCheckedETC.add(item.type);
                            }
                        }
                    }
                    clickedSlotIndex = i;
                    break;
                }
                drawnIndex++;
            }

            // バッグ内の有効なスロットがクリックされた場合
            if (clickedSlotIndex !== -1) {
                console.log(`[ClickDebug] バッグスロットIndex: ${clickedSlotIndex} をクリック.`);
                
                const item = hero && hero.inventory && hero.inventory[clickedSlotIndex];
                const vendingWin = document.getElementById('vending-window');
                const isVendingOpen = vendingWin && vendingWin.style.display === 'block';

                // 🌟 露店出品モード (独自UI連携)
                if (item && isVendingOpen) {
                    let baseName = item.name || item.item_name || "アイテム";
                    if (typeof ITEM_CONFIG !== 'undefined' && ITEM_CONFIG[item.type]) {
                        baseName = ITEM_CONFIG[item.type].display_name || ITEM_CONFIG[item.type].name;
                    }

                    const checkStr = `${item.category || ''} ${item.item_type || ''} ${item.type}`.toLowerCase();
                    const isEquip = checkStr.includes('shield') || checkStr.includes('sword');
                    
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

                    const modal = document.getElementById('vending-quantity-modal');
                    const qInput = document.getElementById('modal-quantity-input');
                    const pInput = document.getElementById('modal-price-input');
                    const confirmBtn = document.getElementById('modal-confirm-btn');
                    const cancelBtn = document.getElementById('modal-cancel-btn');

                    document.getElementById('modal-item-name').innerText = displayPromptName;
                    document.getElementById('modal-max-quantity').innerText = totalOwned;
                    
                    qInput.value = isEquip ? 1 : totalOwned;
                    qInput.disabled = isEquip;
                    pInput.value = 1000;

                    modal.style.display = 'block';

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
                            originalIndex: clickedSlotIndex 
                        };

                        if (typeof addItemToVendingList === 'function') {
                            addItemToVendingList(itemToSend);
                            if (typeof playMouseClickSound === 'function') playMouseClickSound();
                        }
                        modal.style.display = 'none';
                    };

                    return;
                }

                // アイテム移動・スワップロジック
                if (typeof selectedSlotIndex !== 'undefined' && selectedSlotIndex !== -1 && selectedSlotIndex !== clickedSlotIndex) {
                    socket.emit('swapItems', { from: selectedSlotIndex, to: clickedSlotIndex });
                    if (typeof playDropSound === 'function') playDropSound();
                    selectedSlotIndex = -1;
                    canvas.style.cursor = "grab"; 
                } else if (typeof selectedSlotIndex !== 'undefined' && selectedSlotIndex === clickedSlotIndex) {
                    selectedSlotIndex = -1; 
                    canvas.style.cursor = "grab";
                    if (typeof playDropSound === 'function') playDropSound();
                } else if (item) {
                    selectedSlotIndex = clickedSlotIndex; 
                    canvas.style.cursor = "grabbing"; 
                    if (typeof playHoverSound === 'function') playHoverSound();
                }
                return;
            } else {
                if (typeof selectedSlotIndex !== 'undefined' && selectedSlotIndex !== -1) {
                    const item = hero.inventory[selectedSlotIndex];
                    if (item && typeof openDropForm === 'function') {
                        openDropForm(selectedSlotIndex, item);
                        selectedSlotIndex = -1;
                        canvas.style.cursor = "grab";
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

    // 3. 🎒 どの窓も触っていない場合の操作（10スロットインベントリ判定 ＆ ウィンドウ外ドロップ判定）
    if (clickY >= 130 && clickY <= 170) {
        console.log(`[ClickDebug] 10スロットインベントリ行(y:130-170)を検知.`);
        const index = Math.floor((clickX - 20) / 48);
        if (index >= 0 && index < 10) {
            console.log(`[ClickDebug] 10スロットインデックス: ${index} をクリック.`);
            
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
                const isEquip = checkStr.includes('shield') || checkStr.includes('sword');
                
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

                const modal = document.getElementById('vending-quantity-modal');
                const qInput = document.getElementById('modal-quantity-input');
                const pInput = document.getElementById('modal-price-input');
                const confirmBtn = document.getElementById('modal-confirm-btn');
                const cancelBtn = document.getElementById('modal-cancel-btn');

                document.getElementById('modal-item-name').innerText = displayPromptName;
                document.getElementById('modal-max-quantity').innerText = totalOwned;
                
                qInput.value = isEquip ? 1 : totalOwned;
                qInput.disabled = isEquip;
                pInput.value = 1000;

                modal.style.display = 'block';

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

                return;
            }

            // アイテム移動・スワップロジック（10スロット用）
            if (typeof selectedSlotIndex !== 'undefined' && selectedSlotIndex !== -1 && selectedSlotIndex !== index) {
                socket.emit('swapItems', { from: selectedSlotIndex, to: index });
                if (typeof playDropSound === 'function') playDropSound();
                selectedSlotIndex = -1;
                canvas.style.cursor = "grab"; 
            } else if (typeof selectedSlotIndex !== 'undefined' && selectedSlotIndex === index) {
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
        if (typeof selectedSlotIndex !== 'undefined' && selectedSlotIndex !== -1) {
            console.log(`[ClickDebug] インベントリ外をクリック. アイテムを捨てる判定へ.`);
            const item = inventoryVisualBuffer && inventoryVisualBuffer[selectedSlotIndex];
            if (item && typeof openDropForm === 'function') {
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
            effectColor: bonusColor,
            // 🌟 【ここを追加】モンスターカードのランクとIDを確実にエフェクトへ引き継ぐ
            cardId: picked.cardId,
            cardRank: picked.cardRank !== undefined ? picked.cardRank : picked.rank
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

// 吹き出しを閉じる関数
function closeMaplePopup() {
    const popup = document.getElementById('maple-popup-bubble');
    if (popup) {
        popup.style.display = 'none';
    }
}

// 🌐 グローバル通知の受信と制御
socket.on('globalNotification', (data) => {
    if (data && data.senderId === socket.id) {
        return; 
    }

    if (data && data.message) {
        // 右下のログエリアに表示
        if (typeof addNotification === 'function') {
            const targetColor = (data.type === 'LOGIN') ? "#FFF677" : (data.color || "#FFFFFF");
            addNotification(data.message, targetColor);
        }
        
        // ログイン音を鳴らす
        if (typeof playInviteSound === 'function') {
            playInviteSound();
        }

        // 🌟 画像のようなメイプル風吹き出しポップアップを表示する
        const popup = document.getElementById('maple-popup-bubble');
        const popupText = document.getElementById('maple-popup-text');
        
        if (popup && popupText) {
            popupText.textContent = data.message;
            popup.style.display = 'block';

            // （オプション）一定時間（例：5秒後）に自動で消したい場合はコメントアウトを外す
            /*
            clearTimeout(window._maplePopupTimer);
            window._maplePopupTimer = setTimeout(() => {
                closeMaplePopup();
            }, 5000);
            */
        }

        // 🌟 ログイン通知（type: 'LOGIN'）の場合、そのIDを一時的に記録する
        if (data.type === 'LOGIN' && data.senderId) {
            window.recentLoginIds.add(data.senderId);
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

if (typeof GLOBAL_UI_STATE === 'undefined') {
    GLOBAL_UI_STATE = {};
}
GLOBAL_UI_STATE.globalEventBtn = { x: 32, y: 0, w: 76, h: 28, hovered: false, pressed: false };

if (!window._canvasUIEventsAttached) {
    window._canvasUIEventsAttached = true;
    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const eb = GLOBAL_UI_STATE.globalEventBtn;
        if (eb) {
            eb.hovered = (mx >= eb.x && mx <= eb.x + eb.w && my >= eb.y && my <= eb.y + eb.h);
        }
    });
    canvas.addEventListener('mousedown', (e) => {
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const eb = GLOBAL_UI_STATE.globalEventBtn;
        if (eb && eb.hovered) {
            eb.pressed = true;
        }
    });
    window.addEventListener('mouseup', () => {
        if (GLOBAL_UI_STATE.globalEventBtn) {
            GLOBAL_UI_STATE.globalEventBtn.pressed = false;
        }
    });
}

function drawCanvasLeftEdgeEventButton(ctx) {
    const btnW = 76;
    const btnH = 26;
    const btnX = 20;
    const screenH = (typeof VIEW_CONFIG !== 'undefined' && VIEW_CONFIG.SCREEN_HEIGHT) 
        ? VIEW_CONFIG.SCREEN_HEIGHT 
        : (ctx.canvas ? ctx.canvas.height : 600);
    const baseY = screenH - 420;

    const eb = GLOBAL_UI_STATE.globalEventBtn || { hovered: false, pressed: false };
    const isHovered = eb.hovered;
    const isPressed = eb.pressed;

    // ホバー時は translateY(-1px) 相当のオフセット、アクティブ時は 0
    let drawY = base_offset(baseY, isHovered, isPressed);
    function base_offset(y, h, p) {
        if (p) return y; // active時は沈む分なし or 戻す
        return h ? y - 1 : y; // hover時は-1px
    }

    eb.x = btnX; eb.y = drawY; eb.w = btnW; eb.h = btnH;
    GLOBAL_UI_STATE.globalEventBtn = eb;

    ctx.save();

    // 影・グローの切り替え（pointShopBtnのbox-shadow再現）
    if (isPressed) {
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
    } else if (isHovered) {
        ctx.shadowColor = 'rgba(56, 189, 248, 0.4)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
    } else {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 2;
    }

    // グラデーション生成
    const grad = ctx.createLinearGradient(btnX, drawY, btnX, drawY + btnH);
    if (isHovered) {
        grad.addColorStop(0, 'rgba(51, 65, 85, 0.9)');
        grad.addColorStop(1, 'rgba(30, 41, 59, 0.95)');
    } else {
        grad.addColorStop(0, 'rgba(30, 41, 59, 0.8)');
        grad.addColorStop(1, 'rgba(15, 23, 42, 0.9)');
    }

    // 角丸背景を描画（radius: 5px）
    const r = 5;
    ctx.beginPath();
    if (ctx.roundRect) {
        ctx.roundRect(btnX, drawY, btnW, btnH, r);
    } else {
        ctx.rect(btnX, drawY, btnW, btnH);
    }
    ctx.fillStyle = grad;
    ctx.fill();

    // シャドウリセットして枠線・内側ハイライト描画
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    // メインボーダー
    ctx.strokeStyle = isHovered ? '#38bdf8' : 'rgba(96, 165, 250, 0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // 通常時のインセット風シャドウシミュレーション（inset 0 0 6px rgba(96,165,250,0.15)相当）
    if (!isHovered && !isPressed) {
        ctx.strokeStyle = 'rgba(96, 165, 250, 0.15)';
        ctx.lineWidth = 1;
        ctx.strokeRect(btnX + 1.5, drawY + 1.5, btnW - 3, btnH - 3);
    }

    // テキスト描画（font-weight: 600, color連動）
    ctx.fillStyle = isHovered ? '#ffffff' : '#60a5fa';
    ctx.font = '600 12px "Segoe UI", Tahoma, Geneva, Verdana, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🎁 イベント', btnX + btnW / 2, drawY + btnH / 2);

    ctx.restore();
}

// ============================================================
// :::DRAW_ONLINE_LIST::: 👥 オンラインプレイヤー名簿（折りたたみ機能付き）
// ============================================================

// アイコン画像のキャッシュと開閉状態の初期化
if (!window._onlineIconCache) {
    window._onlineIconCache = {};
    const iconPaths = {
        profile: "//imgv.jp/photo/Photo0/UserIcon/none_100x100.png",
        achievement: "//imgv.jp/photo/Photo0/MenuIcon_16x16/create3.png",
        gallery: "//imgv.jp/photo/Photo0/MenuIcon_16x16/gallery2.png"
    };

    for (let key in iconPaths) {
        const img = new Image();
        img.src = iconPaths[key];
        window._onlineIconCache[key] = img;
    }
}

// 🌟 リストの開閉状態（初期値は開いた状態: true）
if (typeof window._isOnlineListOpen === 'undefined') {
    window._isOnlineListOpen = true;
}

function drawOnlineList(ctx) {
    if (!currentOnlinePlayers || currentOnlinePlayers.length === 0) return;

    // 📐 レイアウト基準値
    const padding = 12;
    const headerHeight = 28;
    const rowHeight = 30; 
    const bgWidth = 240;
    
    // 🌟 開閉状態によって高さを切り替える
    const isOpen = window._isOnlineListOpen;
    const bgHeight = isOpen 
        ? headerHeight + (currentOnlinePlayers.length * rowHeight) + (padding * 2)
        : headerHeight; // 閉じているときはヘッダーの高さのみ

    const startX = VIEW_CONFIG.SCREEN_WIDTH - bgWidth - 15; 
    const startY = 80; 
    const cornerRadius = 10; 

    // マウス位置の判定
    let hoveredRowIndex = -1;
    let hoveredButtonType = -1; // -2: ヘッダー(開閉), 0: プロフ, 1: 成果, 2: ギャラリー
    let isHeaderHovered = false;

    const iconSize = 16;
    const btnGap = 6;
    const rightBtnAreaWidth = (iconSize * 2) + btnGap;
    const rightBtnStartX = startX + bgWidth - padding - rightBtnAreaWidth;

    if (typeof mouseX !== 'undefined' && typeof mouseY !== 'undefined') {
        if (mouseX >= startX && mouseX <= startX + bgWidth && mouseY >= startY && mouseY <= startY + bgHeight) {
            // ヘッダー部分にマウスがあるか
            if (mouseY >= startY && mouseY <= startY + headerHeight) {
                isHeaderHovered = true;
                hoveredButtonType = -2; // ヘッダークリック用
            } 
            // リストが開いていて、各プレイヤー行にマウスがある場合
            else if (isOpen) {
                currentOnlinePlayers.forEach((p, index) => {
                    const rowY = startY + headerHeight + padding + (index * rowHeight);
                    if (mouseY >= rowY && mouseY <= rowY + rowHeight) {
                        hoveredRowIndex = index;

                        const relX = mouseX - startX;
                        if (relX < rightBtnStartX - startX - 4) {
                            hoveredButtonType = 0; // 左側（プロフィール）
                        } else {
                            const btnRelX = mouseX - rightBtnStartX;
                            if (btnRelX >= 0 && btnRelX <= rightBtnAreaWidth) {
                                const bIdx = Math.floor(btnRelX / (iconSize + btnGap));
                                hoveredButtonType = Math.min(bIdx + 1, 2); // 1: 成果, 2: ギャラリー
                            }
                        }
                    }
                });
            }
        }
    }
    window._hoveredOnlineRow = hoveredRowIndex;
    window._hoveredOnlineBtn = hoveredButtonType;
    window._isHeaderHovered = isHeaderHovered;

    ctx.save();

    // 1. 背景パネル
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.beginPath();
    if (ctx.roundRect) {
        ctx.roundRect(startX, startY, bgWidth, bgHeight, cornerRadius);
    } else {
        ctx.rect(startX, startY, bgWidth, bgHeight);
    }
    ctx.fill();

    // 2. 枠線
    ctx.strokeStyle = isHeaderHovered ? "#38bdf8" : "rgba(255, 255, 255, 0.3)";
    ctx.lineWidth = isHeaderHovered ? 1.5 : 1;
    ctx.strokeRect(startX, startY, bgWidth, bgHeight);

    // 3. ヘッダー "ONLINE (人数) [▼/▲]"
    ctx.font = "bold 12px Arial";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = isHeaderHovered ? "#ffffff" : "#FFD700";
    
    ctx.shadowColor = "rgba(0, 0, 0, 0.7)";
    ctx.shadowBlur = 3;
    
    // 開閉アイコン（▼ または ▲）を添える
    const toggleIcon = isOpen ? "▲ 閉じる" : "▼ 開く";
    ctx.fillText(`ONLINE (${currentOnlinePlayers.length})`, startX + padding, startY + (headerHeight / 2) + 2);

    // 右側に開閉の状態を表示
    ctx.font = "10px Arial";
    ctx.textAlign = "right";
    ctx.fillStyle = isHeaderHovered ? "#38bdf8" : "#aaaaaa";
    ctx.fillText(toggleIcon, startX + bgWidth - padding, startY + (headerHeight / 2) + 2);

    ctx.shadowBlur = 0; // 影をリセット

    // 🌟 リストが閉じている場合はここで終了
    if (!isOpen) {
        ctx.restore();
        return;
    }

    // ヘッダー下のすっきりした区切り線
    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(startX + padding, startY + headerHeight);
    ctx.lineTo(startX + bgWidth - padding, startY + headerHeight);
    ctx.stroke();

    // 4. 各プレイヤーの描画ループ（開いているときのみ描画）
    currentOnlinePlayers.forEach((p, index) => {
        const rowY = startY + headerHeight + padding + (index * rowHeight);
        const isRowHovered = (window._hoveredOnlineRow === index);

        if (isRowHovered) {
            ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
            ctx.fillRect(startX + 6, rowY + 2, bgWidth - 12, rowHeight - 4);
        }

        const centerY = rowY + (rowHeight / 2);

        // ユーザーアイコン
        const userImg = window._onlineIconCache.profile;
        const iconRadius = 9; 
        const iconX = startX + padding + iconRadius;
        
        ctx.save();
        ctx.beginPath();
        ctx.arc(iconX, centerY, iconRadius, 0, Math.PI * 2);
        ctx.clip();

        if (userImg && userImg.complete && userImg.naturalWidth > 0) {
            ctx.drawImage(userImg, iconX - iconRadius, centerY - iconRadius, iconRadius * 2, iconRadius * 2);
        } else {
            ctx.fillStyle = "#333333";
            ctx.fillRect(iconX - iconRadius, centerY - iconRadius, iconRadius * 2, iconRadius * 2);
        }
        ctx.restore();

        ctx.strokeStyle = isRowHovered && window._hoveredOnlineBtn === 0 ? "#38bdf8" : "rgba(255, 255, 255, 0.3)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(iconX, centerY, iconRadius, 0, Math.PI * 2);
        ctx.stroke();

        // チャンネル番号
        ctx.font = "10px Arial";
        ctx.fillStyle = "#7dd3fc";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(`CH.${p.channel}`, startX + 34, centerY);

        // 🌟 各プレイヤーのレベル表記
        const playerLevel = p.level !== undefined ? p.level : (p.lv !== undefined ? p.lv : 1);
        ctx.fillStyle = "#fde047"; 
        ctx.fillText(`Lv.${playerLevel}`, startX + 78, centerY);

        // プレイヤー名
        const isAnyElementHovered = isRowHovered;
        ctx.font = isAnyElementHovered ? "bold 11px Arial" : "11px Arial";
        ctx.fillStyle = isAnyElementHovered ? "#ffffff" : "#e2e8f0";
        ctx.fillText(p.name, startX + 115, centerY);

        // 右側の2つのボタン（成果・ギャラリー）
        const rightIcons = [
            window._onlineIconCache.achievement,
            window._onlineIconCache.gallery
        ];

        rightIcons.forEach((iconImg, bIdx) => {
            const bx = rightBtnStartX + (bIdx * (iconSize + btnGap));
            const by = centerY - (iconSize / 2);
            const isBtnHovered = isRowHovered && (window._hoveredOnlineBtn === bIdx + 1);

            if (isBtnHovered) {
                ctx.fillStyle = "rgba(56, 189, 248, 0.3)";
                ctx.fillRect(bx - 3, by - 3, iconSize + 6, iconSize + 6);
                ctx.strokeStyle = "#38bdf8";
                ctx.lineWidth = 1;
                ctx.strokeRect(bx - 3, by - 3, iconSize + 6, iconSize + 6);
            }

            if (iconImg && iconImg.complete && iconImg.naturalWidth > 0) {
                ctx.drawImage(iconImg, bx, by, iconSize, iconSize);
            }
        });
    });

    ctx.restore();
}

// プロフィールウィンドウの開閉状態と対象プレイヤーの保持
if (typeof window._isProfileWindowOpen === 'undefined') {
    window._isProfileWindowOpen = false;
}
if (typeof window._selectedProfilePlayer === 'undefined') {
    window._selectedProfilePlayer = null;
}

canvas.addEventListener('click', (e) => {
    // 🌟 プロフィールウィンドウが開いている場合の操作判定
    if (window._isProfileWindowOpen && window._selectedProfilePlayer) {
        const bgWidth = 340;
        const bgHeight = 500; // 🌟 描画側と合わせるため、500に変更しました！
        const startX = (VIEW_CONFIG.SCREEN_WIDTH - bgWidth) / 2;
        const startY = (VIEW_CONFIG.SCREEN_HEIGHT - bgHeight) / 2;

        // 1. ×ボタン（閉じる）の判定
        const closeBtnX = startX + bgWidth - 28;
        const closeBtnY = startY + 10;
        if (mouseX >= closeBtnX && mouseX <= closeBtnX + 18 && mouseY >= closeBtnY && mouseY <= closeBtnY + 18) {
            window._isProfileWindowOpen = false;
            window._selectedProfilePlayer = null;
            return;
        }

        // 2. 人気度＋1ボタンの判定
        const popBtnX = startX + 185;
        const popBtnY = startY + 99;
        const popBtnW = 68;
        const popBtnH = 18;
        if (mouseX >= popBtnX && mouseX <= popBtnX + popBtnW && mouseY >= popBtnY && mouseY <= popBtnY + popBtnH) {
            const target = window._selectedProfilePlayer;
            target.popularity = (target.popularity || 0) + 1;
            console.log(`${target.name} の人気度が上昇！現在: ${target.popularity}`);
            return;
        }

        // 3. 下部アクションボタン（グループ・カード交換・アイテム交換）の判定
        const btnWidth = 92;
        const btnHeight = 32;
        const btnY = startY + bgHeight - 48;
        const btnGap = 8;
        
        const groupBtnX = startX + 16;
        const cardTradeBtnX = groupBtnX + btnWidth + btnGap;
        const tradeBtnX = cardTradeBtnX + btnWidth + btnGap;

        // ① グループ申し込み
        if (mouseX >= groupBtnX && mouseX <= groupBtnX + btnWidth && mouseY >= btnY && mouseY <= btnY + btnHeight) {
            const targetPlayer = window._selectedProfilePlayer;
            console.log(`${targetPlayer.name} へグループ申し込み`);
            if (typeof socket !== 'undefined' && targetPlayer.id) {
                socket.emit('sendGroupInvite', {
                    targetId: targetPlayer.id,
                    senderName: window.hero ? window.hero.name : "自分"
                });
            }
            return;
        }

        // ② カード交換申し込み
        if (mouseX >= cardTradeBtnX && mouseX <= cardTradeBtnX + btnWidth && mouseY >= btnY && mouseY <= btnY + btnHeight) {
            const targetPlayer = window._selectedProfilePlayer;
            console.log(`${targetPlayer.name} へカード交換申し込み`);
            
            window._isProfileWindowOpen = false;
            window._selectedProfilePlayer = null;
            return;
        }

        // ③ アイテム交換申し込み
        if (mouseX >= tradeBtnX && mouseX <= tradeBtnX + btnWidth && mouseY >= btnY && mouseY <= btnY + btnHeight) {
            const targetPlayer = window._selectedProfilePlayer;
            console.log(`${targetPlayer.name} へアイテム交換申し込み`);
            
            if (typeof socket !== 'undefined' && targetPlayer.id) {
                const myHero = window.hero;
                socket.emit('sendTradeRequest', {
                    targetId: targetPlayer.id,
                    senderName: myHero ? myHero.name : "自分",
                    model_id: myHero ? (myHero.model_id !== undefined ? myHero.model_id : (myHero.group || 0)) : 0,
                    charVar: myHero ? (myHero.charVar || 1) : 1
                });
            }

            const targetNameEl = document.getElementById("trade-target-name");
            if (targetNameEl) {
                targetNameEl.textContent = "";
            }

            const myNameEl = document.getElementById("trade-my-name");
            if (myNameEl) {
                myNameEl.textContent = (typeof hero !== 'undefined' && hero && hero.name) ? hero.name : "自分";
            }

            const tradeWindow = document.getElementById("trade-window");
            if (tradeWindow) {
                tradeWindow.style.display = "block";
                
                if (typeof initTradeSlots === 'function') initTradeSlots();
                if (typeof drawMyTradeAvatar === 'function') drawMyTradeAvatar(window.hero);
            }

            if (typeof addSystemMessage === 'function') {
                addSystemMessage(`${targetPlayer.name}との交換を申し込みました。相手の参加を待っています...`);
            }

            window._isProfileWindowOpen = false;
            window._selectedProfilePlayer = null;
            return;
        }

        return;
    }
    
    if (typeof window._isHeaderHovered !== 'undefined' && window._isHeaderHovered) {
        window._isOnlineListOpen = !window._isOnlineListOpen;
        return;
    }

    if (window._isOnlineListOpen && typeof window._hoveredOnlineRow !== 'undefined' && window._hoveredOnlineRow >= 0) {
        const targetPlayer = currentOnlinePlayers[window._hoveredOnlineRow];
        const actionType = window._hoveredOnlineBtn;

        if (targetPlayer && actionType >= 0) {
            if (actionType === 0) {
                window._selectedProfilePlayer = targetPlayer;
                window._isProfileWindowOpen = true;
                console.log(`${targetPlayer.name} のプロフィールウィンドウを開きます`);
            } else if (actionType === 1) {
                console.log(`${targetPlayer.name} の成果を開く`);
            } else if (actionType === 2) {
                console.log(`${targetPlayer.name} のギャラリーを開く`);
            }
        }
    }
});

// ============================================================
// :::DRAW_PROFILE_WINDOW::: 👤 拡張プレイヤープロフィールウィンドウ（BOOK仕様カード対応版）
// ============================================================
function drawProfileWindow(tCtx) {
    if (!window._isProfileWindowOpen || !window._selectedProfilePlayer) return;

    let p = window._selectedProfilePlayer;
    if (window.hero && (p === window.hero || (p.id && window.hero.id && p.id === window.hero.id))) {
        p = window.hero;
    }

    const bgWidth = 340;
    const bgHeight = 500; // 🌟 ランク1〜6のカード表示エリアの高さに合わせてウィンドウを拡張
    const startX = (VIEW_CONFIG.SCREEN_WIDTH - bgWidth) / 2;
    const startY = (VIEW_CONFIG.SCREEN_HEIGHT - bgHeight) / 2;
    const cornerRadius = 12;

    ctx.save();

    // 1. ウィンドウの背景パネル
    ctx.fillStyle = "rgba(15, 23, 42, 0.95)";
    ctx.beginPath();
    if (ctx.roundRect) {
        ctx.roundRect(startX, startY, bgWidth, bgHeight, cornerRadius);
    } else {
        ctx.rect(startX, startY, bgWidth, bgHeight);
    }
    ctx.fill();

    // 2. ウィンドウの枠線
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 3. タイトルバー部分
    ctx.fillStyle = "#1e293b";
    ctx.beginPath();
    if (ctx.roundRect) {
        ctx.roundRect(startX, startY, bgWidth, 36, [cornerRadius, cornerRadius, 0, 0]);
    } else {
        ctx.rect(startX, startY, bgWidth, 36);
    }
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 13px Arial";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText("プレイヤープロフィール", startX + 15, startY + 18);

    // 4. 閉じる「×」ボタンの描画
    const closeBtnX = startX + bgWidth - 28;
    const closeBtnY = startY + 10;
    ctx.fillStyle = "rgba(239, 68, 68, 0.8)";
    ctx.fillRect(closeBtnX, closeBtnY, 18, 18);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 11px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("×", closeBtnX + 9, closeBtnY + 9);

    // 5. プレイヤーアイコン
    const iconX = startX + 45;
    const iconY = startY + 75;
    const iconRadius = 24;

    ctx.save();
    ctx.beginPath();
    ctx.arc(iconX, iconY, iconRadius, 0, Math.PI * 2);
    ctx.clip();
    const userImg = window._onlineIconCache ? window._onlineIconCache.profile : null;
    if (userImg && userImg.complete && userImg.naturalWidth > 0) {
        ctx.drawImage(userImg, iconX - iconRadius, iconY - iconRadius, iconRadius * 2, iconRadius * 2);
    } else {
        ctx.fillStyle = "#333333";
        ctx.fillRect(iconX - iconRadius, iconY - iconRadius, iconRadius * 2, iconRadius * 2);
    }
    ctx.restore();

    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(iconX, iconY, iconRadius, 0, Math.PI * 2);
    ctx.stroke();

    // 6. 基本情報
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    
    ctx.font = "bold 15px Arial";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(p.name || "Player", startX + 82, startY + 48);

    ctx.font = "11px Arial";
    ctx.fillStyle = "#fde047";
    ctx.fillText(`Lv.${p.level !== undefined ? p.level : 1}`, startX + 82, startY + 68);

    ctx.fillStyle = "#7dd3fc";
    ctx.fillText(`CH.${p.channel || 1}`, startX + 130, startY + 68);

    const animalMap = {
        0: "あひる", 1: "あらいぐま", 2: "いぬ", 3: "うさぎ", 4: "カピバラ",
        5: "きのこ", 6: "くま", 7: "コアラ", 8: "ねこ", 9: "パンダ",
        10: "ビーバー", 11: "ひよこ", 12: "ぶた", 13: "ペンギン", 14: "ラクーン", 15: "りす"
    };

    const rawModelId = (p.model_id !== undefined && p.model_id !== null) ? p.model_id : "";
    const animalName = animalMap[String(rawModelId)] !== undefined ? animalMap[String(rawModelId)] : (rawModelId !== "" ? `ID:${rawModelId}` : "なし");

    const popularity = p.popularity !== undefined ? p.popularity : 0;
    const guildName = p.guild || "無所属";

    ctx.font = "11px Arial";
    ctx.fillStyle = "#cbd5e1";
    ctx.fillText(`🐾 アニマル: ${animalName}`, startX + 82, startY + 86);
    ctx.fillText(`⭐ 人気度: ${popularity}`, startX + 82, startY + 102);
    ctx.fillText(`🛡️ ギルド: ${guildName}`, startX + 82, startY + 118);

    // 人気度アップ小ボタン
    const popBtnX = startX + 185;
    const popBtnY = startY + 99;
    const popBtnW = 68;
    const popBtnH = 18;
    ctx.fillStyle = "rgba(74, 222, 128, 0.25)";
    ctx.fillRect(popBtnX, popBtnY, popBtnW, popBtnH);
    ctx.strokeStyle = "#4ade80";
    ctx.lineWidth = 1;
    ctx.strokeRect(popBtnX, popBtnY, popBtnW, popBtnH);
    ctx.font = "9px Arial";
    ctx.fillStyle = "#4ade80";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("👍 ＋1する", popBtnX + popBtnW / 2, popBtnY + popBtnH / 2);

    // 水平区切り線
    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(startX + 15, startY + 145);
    ctx.lineTo(startX + bgWidth - 15, startY + 145);
    ctx.stroke();

    // 7. 装備アイテムセクション
    ctx.font = "bold 12px Arial";
    ctx.fillStyle = "#f8fafc";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText("装備アイテム", startX + 20, startY + 155);

    const equipSlots = [
        { label: "剣", types: ["sword", "weapon"] },
        { label: "盾", types: ["shield"] },
        { label: "マント", types: ["cloak", "cape"] },
        { label: "ペンダント", types: ["pendant", "necklace"] },
        { label: "指輪", types: ["ring"] },
        { label: "ベルト", types: ["belt"] }
    ];

    const slotSize = 36;
    const slotGap = 8;
    const equipStartX = startX + 20;
    const equipStartY = startY + 175;

    let hoveredEquippedItem = null;
    let hoveredSlotInfo = null;

    equipSlots.forEach((slot, idx) => {
        const col = idx % 3; 
        const row = Math.floor(idx / 3); 

        const sx = equipStartX + col * (slotSize + slotGap + 12);
        const sy = equipStartY + row * (slotSize + slotGap);

        const absoluteSlotX = sx;
        const absoluteSlotY = sy;

        const isHover = (typeof mouseX !== 'undefined' && typeof mouseY !== 'undefined' &&
                         mouseX >= absoluteSlotX && mouseX <= absoluteSlotX + slotSize &&
                         mouseY >= absoluteSlotY && mouseY <= absoluteSlotY + slotSize);

        ctx.fillStyle = isHover ? "rgba(255, 255, 255, 0.15)" : "rgba(0, 0, 0, 0.4)";
        ctx.fillRect(sx, sy, slotSize, slotSize);
        ctx.strokeStyle = isHover ? "#fbbf24" : "rgba(255, 255, 255, 0.3)";
        ctx.lineWidth = isHover ? 1.5 : 1;
        ctx.strokeRect(sx, sy, slotSize, slotSize);

        let equippedItem = null;
        if (p.inventory && Array.isArray(p.inventory)) {
            equippedItem = p.inventory.find(inv => {
                if (!inv || !inv.isEquipped) return false;
                const invType = String(inv.type || inv.name || "").toLowerCase();
                return slot.types.some(t => invType.includes(t));
            });
        }

        if (isHover) {
            if (equippedItem) {
                hoveredEquippedItem = equippedItem;
            } else {
                hoveredSlotInfo = `未装備 (${slot.label})`;
            }
        }

        if (!equippedItem) {
            ctx.font = "9px Arial";
            ctx.fillStyle = "#94a3b8";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(slot.label, sx + slotSize / 2, sy + slotSize / 2);
        } else {
            const imageKey = equippedItem.image || equippedItem.type || equippedItem.name;
            let img = (typeof itemImages !== 'undefined') ? itemImages[imageKey] : null;

            if (img && img.complete && img.naturalWidth > 0) {
                const padding = 3;
                const imgW = slotSize - padding * 2;
                const imgH = slotSize - padding * 2;
                
                const glowCol = typeof getEquipGlowColor === 'function' ? getEquipGlowColor(equippedItem) : null;

                ctx.save();
                if (glowCol) {
                    ctx.shadowBlur = 8;
                    ctx.shadowColor = glowCol;
                    ctx.strokeStyle = glowCol;
                    ctx.lineWidth = 2;
                    if (ctx.roundRect) {
                        ctx.beginPath();
                        ctx.roundRect(sx + 2, sy + 2, slotSize - 4, slotSize - 4, 3);
                        ctx.stroke();
                    }
                } else {
                    ctx.shadowBlur = 3;
                    ctx.shadowColor = "rgba(0,0,0,0.4)";
                }

                ctx.drawImage(img, sx + padding, sy + padding, imgW, imgH);
                ctx.restore();
            } else {
                ctx.font = "8px Arial";
                ctx.fillStyle = "#facc15";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(equippedItem.name || "装備", sx + slotSize / 2, sy + slotSize / 2);
            }
        }
    });

    // ==========================================
    // 🌟 8. モンスターカードBOOK連動セクション（ランク1〜6）
    // ==========================================
    const cardSectionY = startY + 275;
    ctx.font = "bold 12px Arial";
    ctx.fillStyle = "#f8fafc";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText("モンスターカード図鑑 収集状況", startX + 20, cardSectionY);

    // ランク1〜6の定義（BOOK側のテーマカラーに対応）
    const bookRanks = [
        { id: 1, label: "銅", color: "#fb923c" },
        { id: 2, label: "銀", color: "#cbd5e1" },
        { id: 3, label: "金", color: "#fde047" },
        { id: 4, label: "Pt", color: "#ffffff" },
        { id: 5, label: "Dia", color: "#38bdf8" },
        { id: 6, label: "虹", color: "#ff77ff" }
    ];

    // プレイヤーのコレクションデータからランク1〜6のアンロック数を集計
    const rankCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    const targetCollection = p.playerCardCollection || playerCardCollection;
    
    if (targetCollection) {
        Object.keys(targetCollection).forEach(monsterKey => {
            const ranks = targetCollection[monsterKey];
            if (ranks) {
                for (let r = 1; r <= 6; r++) {
                    if (ranks[r] && ranks[r].unlocked) {
                        rankCounts[r]++;
                    }
                }
            }
        });
    }

    const cardBoxW = 46;
    const cardBoxH = 34;
    const cardBoxGap = 4;
    const cardStartX = startX + 20;
    const cardStartY = cardSectionY + 20;

    bookRanks.forEach((rInfo, idx) => {
        const bx = cardStartX + idx * (cardBoxW + cardBoxGap);
        const by = cardStartY;

        // 背景ボックス
        ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
        ctx.fillRect(bx, by, cardBoxW, cardBoxH);
        ctx.strokeStyle = rInfo.color;
        ctx.lineWidth = 1;
        ctx.strokeRect(bx, by, cardBoxW, cardBoxH);

        // ランク名
        ctx.font = "bold 9px Arial";
        ctx.fillStyle = rInfo.color;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText(rInfo.label, bx + cardBoxW / 2, by + 4);

        // アンロック数
        const count = rankCounts[rInfo.id] || 0;
        ctx.font = "bold 11px Arial";
        ctx.fillStyle = "#ffffff";
        ctx.fillText(count, bx + cardBoxW / 2, by + 17);
    });

    // ==========================================
    // 9. 下部アクションボタン（3つ並び）
    // ==========================================
    const btnWidth = 92;
    const btnHeight = 32;
    const btnY = startY + bgHeight - 48; // ウィンドウ下部に追従
    const btnGap = 8;
    
    const groupBtnX = startX + 16;
    const cardTradeBtnX = groupBtnX + btnWidth + btnGap;
    const tradeBtnX = cardTradeBtnX + btnWidth + btnGap;
    
    // ① グループ申し込みボタン
    ctx.fillStyle = "rgba(56, 189, 248, 0.2)";
    ctx.fillRect(groupBtnX, btnY, btnWidth, btnHeight);
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 1;
    ctx.strokeRect(groupBtnX, btnY, btnWidth, btnHeight);
    
    ctx.font = "bold 10px Arial";
    ctx.fillStyle = "#38bdf8";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("👥 グループ", groupBtnX + btnWidth / 2, btnY + btnHeight / 2);

    // ② カード交換申し込みボタン
    ctx.fillStyle = "rgba(168, 85, 247, 0.2)";
    ctx.fillRect(cardTradeBtnX, btnY, btnWidth, btnHeight);
    ctx.strokeStyle = "#a855f7";
    ctx.lineWidth = 1;
    ctx.strokeRect(cardTradeBtnX, btnY, btnWidth, btnHeight);

    ctx.fillStyle = "#a855f7";
    ctx.fillText("🃏 カード交換", cardTradeBtnX + btnWidth / 2, btnY + btnHeight / 2);

    // ③ アイテム交換申し込みボタン
    ctx.fillStyle = "rgba(250, 204, 21, 0.2)";
    ctx.fillRect(tradeBtnX, btnY, btnWidth, btnHeight);
    ctx.strokeStyle = "#facc15";
    ctx.lineWidth = 1;
    ctx.strokeRect(tradeBtnX, btnY, btnWidth, btnHeight);

    ctx.fillStyle = "#facc15";
    ctx.fillText("🔄 アイテム交換", tradeBtnX + btnWidth / 2, btnY + btnHeight / 2);

    // ==========================================
    // 10. マウスカーソル追尾型ポップアップの描画
    // ==========================================
    if (typeof mouseX !== 'undefined' && typeof mouseY !== 'undefined') {
        if (hoveredEquippedItem && typeof drawItemTooltip === 'function') {
            drawItemTooltip(tCtx, hoveredEquippedItem, mouseX + 12, mouseY + 12);
        } else if (hoveredSlotInfo) {
            ctx.save();
            ctx.font = "11px 'Segoe UI', sans-serif";
            const textMetrics = ctx.measureText(hoveredSlotInfo);
            const boxW = textMetrics.width + 12;
            const boxH = 20;
            
            const boxX = mouseX + 12;
            const boxY = mouseY + 12;

            ctx.fillStyle = "rgba(12, 17, 28, 0.92)";
            ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
            ctx.lineWidth = 1;
            
            if (ctx.roundRect) {
                ctx.beginPath();
                ctx.roundRect(boxX, boxY, boxW, boxH, 4);
                ctx.fill();
                ctx.stroke();
            } else {
                ctx.fillRect(boxX, boxY, boxW, boxH);
                ctx.strokeRect(boxX, boxY, boxW, boxH);
            }

            ctx.fillStyle = "#f8fafc";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(hoveredSlotInfo, boxX + boxW / 2, boxY + boxH / 2);
            ctx.restore();
        }
    }

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
    console.log("🎒 アイテム専用窓口で更新を受け取りました！", data);
    
    // 🌟 data が配列そのもの、あるいは data.inventory のどちらでも対応できるようにする
    const newInventory = Array.isArray(data) ? data : (data && data.inventory ? data.inventory : null);

    if (newInventory) {
        // 1. 表示用のバッファを更新
        inventoryVisualBuffer = newInventory;

        // 2. プレイヤー本体のデータも更新 (重要！)
        if (window.hero) {
            window.hero.inventory = newInventory;

            // ==========================================
            // 🛡️ 【追加】装備中のアイテムを検知して装備ウィンドウ用に振り分ける
            // ==========================================
            if (!window.hero.equipment) {
                window.hero.equipment = {};
            }

            // 一旦すべてリセット
            window.hero.equipment = {
                pendant: null,
                ring: null,
                belt: null,
                weapon: null,
                shield: null,
                cape: null
            };

            // インベントリから装備中（isEquipped または is_equipped === 1）のものを探してセット
            newInventory.forEach(item => {
                if (item && (item.isEquipped === true || item.is_equipped === 1)) {
                    const itemType = String(item.type || "").toLowerCase();
                    
                    if (itemType === 'sword') {
                        window.hero.equipment.weapon = item.type; // または item.name や item 自体
                    } else if (itemType === 'shield') {
                        window.hero.equipment.shield = item.type;
                    } else if (itemType === 'pendant') {
                        window.hero.equipment.pendant = item.type;
                    } else if (itemType === 'belt') {
                        window.hero.equipment.belt = item.type;
                    } else if (itemType === 'ring') {
                        window.hero.equipment.ring = item.type;
                    } else if (itemType === 'cape') {
                        window.hero.equipment.cape = item.type;
                    }
                }
            });
            console.log("🛡️ [Equip Sync] 装備ウィンドウ用のデータを同期しました:", window.hero.equipment);
        }

        // 3. もしインベントリ画面を開いているなら、再描画関数を呼ぶ
        if (typeof renderInventory === 'function') {
            renderInventory();
        }
        
        console.log("✅ インベントリデータを同期しました:", newInventory);
    } else {
        console.warn("⚠️ 予期せぬインベントリデータ形式です:", data);
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
    // 自分の攻撃が当たった時だけ処理
    if (data.attackerId !== socket.id) return;

    // 🌟 【修正】id ではなく unique_id で敵を探す
    const target = enemies.find(e => e.unique_id === data.enemyId);
    
    if (!target) {
        console.log(`⚠️ 敵が見つかりません (ID: ${data.enemyId})`);
        return;
    }

    // 🌟 【重要】ここで状態も更新する（もし他の同期処理がない場合）
    if (data.isDead) {
        target.alive = false;     // 死亡状態にする
        target.isFading = true;   // フェードアウト開始
        target.deathFrame = 0;    // 死亡アニメーション開始
        
        if (typeof playEnemyDieSound === 'function') playEnemyDieSound(target);
    } else {
        // まだ生きている場合（被弾時）
        if (typeof playEnemyHitSound === 'function') playEnemyHitSound(target);
    }
});

// モーダルのDOM要素を取得
const deathModal = document.getElementById('death-modal');
const respawnBtn = document.getElementById('respawn-button');
const deathMsg = document.getElementById('death-message');

// サーバーから死亡通知が来たとき
socket.on('show_death_dialog', (data) => {
    if (deathMsg) deathMsg.innerText = data.message; // メッセージを反映
    if (deathModal) deathModal.style.display = 'flex'; // モーダルを表示
});

// 🌟 復活ボタンが存在する場合のみイベントを登録する（エラー防止）
if (respawnBtn) {
    respawnBtn.addEventListener('click', () => {
        // サーバーに復活リクエストを送る
        socket.emit('request_respawn');
        
        // モーダルを隠す
        if (deathModal) deathModal.style.display = 'none';
    });
}

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

// ============================================================
// :::SOCKET_CARD_PICKUP_LOG::: 🃏 カード取得専用ログの受信と管理
// ============================================================
socket.on('card_pickup_log', (data) => {
    console.log("カードログ受信成功:", data);

    // ランクに応じたカラーやテキストの装飾（お好みで調整できます）
    let rankColor = '#ffeb3b'; // デフォルト金色
    if (data.cardRank === 6) rankColor = '#ff00ff'; // 虹色っぽく
    else if (data.cardRank === 5) rankColor = '#38bdf8'; // ダイヤモンド（スカイブルー）
    else if (data.cardRank === 4) rankColor = '#e2e8f0'; // プラチナ

    let logMsg = `🃏 ${data.monsterName} [${data.rankName}] を入手！（累計: ${data.count}枚）`;

    if (typeof itemLogs !== 'undefined') {
        itemLogs.push({
            text: logMsg,
            timer: 600,            // 少し長めに表示させても映えます
            color: rankColor       // レア度に応じたカラー
        });

        // ログが溜まりすぎないように調整（最大5件）
        if (itemLogs.length > 5) {
            itemLogs.shift();
        }
        
        console.log("カードログを箱に入れました。現在の数:", itemLogs.length);
    }
});

// クライアント側：サーバーからの返事を受け取って表示を更新する
socket.on('account_info_response', (data) => {
    console.log("【受信成功】サーバーからデータが届いた:", data);

    // 1. 設定画面（UI用）の更新
    if (gameWindows.options) {
        gameWindows.options.wikiId = data.wikiId;
        gameWindows.options.isLinked = data.isLinked; 
        gameWindows.options.isOnline = data.isOnline; 
    }

    // 2. 自キャラ（hero）の状態を更新
    if (typeof hero !== 'undefined') {
        hero.isLinked = data.isLinked;
        hero.isOnline = data.isOnline;
        console.log("【確認】heroのステータスを更新しました:", hero.isLinked);
    }

    // 💡 3. 【修正版】ループを使わず、直接IDを指定して同期する
    // players がオブジェクト `{ "socketID": { ... } }` であるなら、これで一発です
    if (typeof players !== 'undefined' && hero && hero.id) {
        if (players[hero.id]) {
            players[hero.id].isLinked = data.isLinked;
            players[hero.id].isOnline = data.isOnline;
        } else {
            console.warn("⚠️ プレイヤーリストに自分のIDが見つかりませんでした:", hero.id);
        }
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
	
	drawActiveItemHUD(hero);
	
	// 🌟 【HP・経験値バーの高さ（例: 24px）と外枠を完全統一してすぐ右に配置】
    // ※「バーの右端のX座標」「バーのY座標」「バーの高さ」を合わせて指定します
    drawBarMatchedAnalogClock(ctx, 310, 20, 72);
    
    // 7. 特殊UI表示（チャンネル表示・マウス追従アイテム）
    //drawChannelHUD(hero);
	
	if (typeof drawOnlineList === 'function') {
        drawOnlineList(ctx);
    }
	
	drawProfileWindow(tCtx);
    
	drawHeldItem();
	
	drawCanvasLeftEdgeEventButton(ctx);
	
	// 🌟 ここに追加！一番手前に通知を出す
    if (typeof drawNotificationArea === 'function') {
        drawNotificationArea(ctx, VIEW_CONFIG.SCREEN_WIDTH, VIEW_CONFIG.SCREEN_HEIGHT);
    }
	
	// ==========================================
    // 🌟 【ここに追加！】トレード中のツールチップ描画
    // ==========================================
    if (typeof renderTradeTooltips === 'function') {
        renderTradeTooltips(ctx, hero);
    }
	
    // ==========================================
    // 🛠️ デバッグ表示（DEBUG_MODE が true の時のみ実行）
    // ==========================================
    if (DEBUG_MODE) {
        drawDebugLayer(hero, enemies, items, platforms);
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
    }
	
	// 🌟 接続切れ時の描画（アニメーション付き）
    if (window.isDisconnected) {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0); // 座標リセット
        
        // 画面全体を覆う背景
        ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
        ctx.fillRect(0, 0, canvas.width, canvas.height); 
        
        // アニメーション用の透明度計算 (Math.sinでゆっくり明滅)
        const pulse = 0.5 + 0.4 * Math.abs(Math.sin(Date.now() / 500));
        ctx.globalAlpha = pulse;
        
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        // 💡 対策：影(shadow)の代わりに、黒い文字を少しずらして重ねることで
        // 動作を重くせずにきれいに縁取る方法が一番安全でアニメーションも止まりません！
        
        // 1. メインテキスト（黒の影用）
        ctx.fillStyle = "#000000";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = "bold 40px 'Segoe UI', sans-serif";
        ctx.fillText("接続が切れました", centerX + 2, centerY + 2);
        
        // 2. メインテキスト（白）
        ctx.fillStyle = "#ffffff";
        ctx.fillText("接続が切れました", centerX, centerY);
        
        // 3. サブテキスト（黒の影用）
        ctx.font = "20px 'Segoe UI', sans-serif";
        ctx.fillStyle = "#000000";
        ctx.fillText("ブラウザをリロード（再読み込み）してください", centerX + 2, centerY + 62);

        // 4. サブテキスト（白）
        ctx.fillStyle = "#ffffff";
        ctx.fillText("ブラウザをリロード（再読み込み）してください", centerX, centerY + 60);
        
        ctx.restore();
    }
}

// ============================================================
// :::DRAW_ACTIVE_ITEM_HUD::: 🧪 複数使用中アイテムの並び描画（特定アイテム限定版）
// ============================================================
function drawActiveItemHUD(hero) {
    if (typeof hero === 'undefined' || !hero) return;

    const activeItems = hero.activeItems || (hero.activeItem ? [hero.activeItem] : []);
    if (activeItems.length === 0) return;

    ctx.save();

    const iconSize = 32;       // アイコンのサイズ
    const spacing = 6;         // アイコン同士の間隔
    const rightMargin = 20;    // 画面右端からのマージン
    const topY = 20;           // 描画するY座標

    // 🌟 【特定アイテム限定のホワイトリスト】
    // ここに登録されているアイテム名（item.name）だけがHUDに描画されます
    const allowedActiveItems = [
        'speed',
        'clear'
    ];

    // 1. 描画対象のアイテムだけにフィルターをかける（存在しないものや許可されていないものを除外）
    const filteredItems = activeItems.filter(item => {
        const itemKey = item.name;
        if (!itemKey) return false;
        // ホワイトリストに含まれているかチェック
        return allowedActiveItems.includes(itemKey);
    });

    // 2. 🌟 新しく使ったものが右側（末尾）に来るように重複を排除しつつ順序を維持する
    const validItems = [];
    for (let i = filteredItems.length - 1; i >= 0; i--) {
        const item = filteredItems[i];
        // すでに配列に同じ名前のアイテムがなければ追加
        if (!validItems.some(existing => existing.name === item.name)) {
            validItems.unshift(item); // 前に追加していくことで元の時系列順を復元
        }
    }

    // 💡 画面上のクリック判定（右クリック削除）や他の場所から参照できるように、
    // heroオブジェクト等に現在の表示用リストを一時保存しておきます
    hero._renderActiveItems = validItems;

    if (validItems.length === 0) {
        ctx.restore();
        return;
    }

    // フィルター＆重複排除済みの有効なアイテム数をもとに右端から並べる
    validItems.forEach((item, index) => {
        const itemKey = item.name;

        if (typeof sprites !== 'undefined' && sprites.items && sprites.items[itemKey]) {
            const iconImg = sprites.items[itemKey];

            if (iconImg.complete && iconImg.naturalWidth > 0) {
                const iconX = VIEW_CONFIG.SCREEN_WIDTH - rightMargin - ((validItems.length - index) * (iconSize + spacing));
                const iconY = topY;

                // アイコンの背景・枠組み
                ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
                ctx.fillRect(iconX, iconY, iconSize, iconSize);
                ctx.strokeStyle = "#38bdf8";
                ctx.lineWidth = 1;
                ctx.strokeRect(iconX, iconY, iconSize, iconSize);

                // アイコン画像の描画
                ctx.drawImage(iconImg, iconX, iconY, iconSize, iconSize);
            }
        }
    });

    ctx.restore();
}

// サーバーから「使用中のアイテムが更新されたよ」という通知を受け取る
socket.on('active_items_update', (items) => {
    if (typeof hero !== 'undefined' && hero) {
        hero.activeItems = items;
    }
});

// ============================================================
// :::DRAW_CHANNEL_HUD::: 📡 チャンネル表示（HUD）の描画（グロー装飾版）
// ============================================================
/**
 * 役割：
 * - 現在のプレイヤー所属チャンネル(hero.channel)の取得と表示
 * - フォントスタイル（bold 16px）および右寄せ配置の管理
 * - 黒い縁取りによる高い視認性の確保
 * - 💛 ぼかし（シャドウ）を使ったグロー（発光）演出の追加
 */
function drawChannelHUD(hero) {
    // heroが存在しない場合や、channelが設定されていない場合は「1」として表示する
    if (typeof hero !== 'undefined') {
        const channelNum = hero.channel || 1;

        ctx.save();
        
        const x = VIEW_CONFIG.SCREEN_WIDTH - 20;
        const y = 35;
        const text = `CH.${channelNum}`;

        // フォント設定
        ctx.font = "bold 16px 'Arial', sans-serif";
        ctx.textAlign = "right"; 

        // 🌟 【グロー（発光）設定】
        // 発光させたい色（黄色やオレンジなど）をシャドウカラーに指定します
        ctx.shadowColor = "#fbbf24"; 
        ctx.shadowBlur = 8;          // 光の広がり具合（数字が大きいほどぼやけます）

        // 🖤 黒い縁取り（視認性の確保）
        ctx.strokeStyle = "black";
        ctx.lineWidth = 3;
        ctx.lineJoin = "round";
        ctx.strokeText(text, x, y);

        // 💛 メインの文字色（金色のグラデーション風 ＋ 発光）
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
function drawEntities(hero, others, enemies, items, frame) {

    // デバッグ：配列の中に何体いるか確認
    if (frame % 180 === 0) {
        const activeEnemies = enemies.filter(e => e.alive);
        console.log(`現在の敵の総数: ${enemies.length}, 生きている敵の数: ${activeEnemies.length}`);
    }
    
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

            // エモーション描画
            drawEmotionIcon(ctx, p);
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

    // エモーション描画
    drawEmotionIcon(ctx, hero);

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

VIEW_CONFIG.emotion = {
    offsetY: -65 // 💡 この数値を大きくすると下がり、小さくすると上がります（まずはここで一括調整）
};

// ============================================================
// :::DRAW_EMOTION_ICON::: 😊 エモーションアイコンの共通描画
// ============================================================
function drawEmotionIcon(ctx, entity) {
    if (!entity || !entity.emotionId || typeof emotionImages === 'undefined' || !emotionImages[entity.emotionId]) {
        return;
    }

    if (entity.emotionTimer === undefined) entity.emotionTimer = 180;
    entity.emotionTimer--;
    
    if (entity.emotionTimer <= 0) {
        entity.emotionId = null;
        return;
    }

    const emotionImg = emotionImages[entity.emotionId];
    const drawX = entity.x + 36; 

    // キャラクター本体の「描画用のY座標」を計算
    const g = entity.model_id !== undefined ? entity.model_id : (entity.group || 0);
    let footOffset = VIEW_CONFIG.player.visualOffset + (VIEW_CONFIG.groupOffsets[g] || 0);
    if (entity.y > VIEW_CONFIG.groundThreshold) {
        footOffset += VIEW_CONFIG.player.groundExtraOffset;
    }
    const spriteDrawY = entity.y + VIEW_CONFIG.player.hitboxH - VIEW_CONFIG.player.drawH + footOffset;

    // 🌟 設定ファイル（VIEW_CONFIG）のオフセットを引くことで、理想の位置に調整
    const emotionOffset = VIEW_CONFIG.emotion ? VIEW_CONFIG.emotion.offsetY : 15;
    const drawY = spriteDrawY - emotionOffset;
    
    // フェードイン・フェードアウトの計算
    const maxTimer = 180;
    const fadeDuration = 20;
    let alpha = 1.0;

    if (entity.emotionTimer < fadeDuration) {
        alpha = entity.emotionTimer / fadeDuration; // フェードアウト
    } else {
        const elapsed = maxTimer - entity.emotionTimer;
        if (elapsed < fadeDuration) {
            alpha = elapsed / fadeDuration; // フェードイン
        }
    }

    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    ctx.drawImage(emotionImg, drawX, drawY, 32, 32);
    ctx.restore();
}

// 現在招待を送ってきた相手の識別用（必要に応じて保持）
let currentInviterName = "";

/**
 * 💡 他ユーザーからグループ招待が届いたときに呼び出す関数
 * @param {string} inviterName 招待してきたプレイヤーの名前
 */
function showGroupInvitePopup(inviterName) {
    currentInviterName = inviterName || "プレイヤー";
    
    // テキストを動的に書き換える
    const textSpan = document.getElementById("group-invite-text");
    if (textSpan) {
        textSpan.textContent = `'${currentInviterName}'様からグループの招待です`;
    }

    // ポップアップを表示する
    const popup = document.getElementById("group-invite-popup");
    if (popup) {
        popup.style.display = "block";
    }
}

/**
 * ⭕ 招待を受諾したときの処理
 */
function acceptGroupInvite() {
    const popup = document.getElementById("group-invite-popup");
    if (popup) popup.style.display = "none";

    // 🌟 1. サーバーへ「受諾した」旨を伝える通信処理
    if (typeof socket !== 'undefined' && window._currentInviteData) {
        socket.emit('acceptGroupInvite', {
            targetId: window._currentInviteData.senderId // 招待を送ってきた人のID
        });
    }

    // 2. 名前の取得（currentInviterNameが定義されていなければ一時データから取得）
    const inviterName = typeof currentInviterName !== 'undefined' 
        ? currentInviterName 
        : (window._currentInviteData ? window._currentInviteData.senderName : "相手");

    console.log(`${inviterName}からのグループ招待を受諾しました`);
    
    // チャット欄などにシステムメッセージとして流す場合
    if (typeof addSystemMessage === 'function') {
        addSystemMessage(`${inviterName}のグループに参加しました。`);
    }

    // 使い終わった一時データをクリア
    window._currentInviteData = null;
}

/**
 * ❌ 招待を拒否したときの処理
 */
function rejectGroupInvite() {
    const popup = document.getElementById("group-invite-popup");
    if (popup) popup.style.display = "none";

    // 🌟 1. サーバーへ「拒否した」旨を伝える通信処理
    if (typeof socket !== 'undefined' && window._currentInviteData) {
        socket.emit('rejectGroupInvite', {
            targetId: window._currentInviteData.senderId // 招待を送ってきた人のID
        });
    }

    // 2. 名前の取得
    const inviterName = typeof currentInviterName !== 'undefined' 
        ? currentInviterName 
        : (window._currentInviteData ? window._currentInviteData.senderName : "相手");

    console.log(`${inviterName}からのグループ招待を拒否しました`);

    // 使い終わった一時データをクリア
    window._currentInviteData = null;
}

function acceptTradeRequest() {
    console.log("👉 acceptTradeRequest が実行されました");

    // 🔍 デバッグ：現在保持されているトレードデータの中身を丸ごと確認
    console.log("🔍 window._currentTradeData の中身:", window._currentTradeData);

    const popup = document.getElementById("trade-invite-popup");
    if (popup) popup.style.display = "none";

    // 1. サーバーへ受諾を通知
    if (typeof socket !== 'undefined' && window._currentTradeData) {
        console.log("📡 サーバーへ acceptTradeRequest を送信します。targetId:", window._currentTradeData.senderId);
        socket.emit('acceptTradeRequest', {
            targetId: window._currentTradeData.senderId
        });
    } else {
        console.warn("⚠️ socket または window._currentTradeData が存在しないため、サーバーへの送信がスキップされました");
    }

    // 2. トレード窓を開く
    const tradeWindow = document.getElementById("trade-window");
    if (tradeWindow) {
        tradeWindow.style.display = "block";
        console.log("🪟 #trade-window を display: block にしました");
    } else {
        console.warn("⚠️ #trade-window が見つかりませんでした");
    }

    // 3. 【左側】相手の名前をセット
    const targetNameEl = document.getElementById("trade-target-name");
    if (targetNameEl && window._currentTradeData) {
        targetNameEl.textContent = window._currentTradeData.senderName;
        console.log("👤 相手の名前をセットしました:", window._currentTradeData.senderName);
    } else {
        console.warn("⚠️ trade-target-name 要素、または window._currentTradeData がありません");
    }

    if (window._currentTradeData && typeof setupOpponentTrade === 'function') {
        console.log("🎨 setupOpponentTrade を実行します。渡すデータ:", window._currentTradeData);
        setupOpponentTrade(window._currentTradeData);
    } else {
        console.warn("⚠️ setupOpponentTrade 関数が存在しない、または window._currentTradeData がないためスキップされました");
    }

    // 4. 【右側】自分の名前とアバターをセット（player ではなく window.hero を使用）
    const myHero = typeof window.hero !== 'undefined' ? window.hero : null;
    console.log("🦸 取得した myHero (window.hero):", myHero);
    
    const myNameEl = document.getElementById("trade-my-name");
    if (myNameEl && myHero) {
        myNameEl.textContent = myHero.name || "自分";
    }

    if (myHero && typeof drawMyTradeAvatar === 'function') {
        drawMyTradeAvatar(myHero);
        console.log("🖼️ drawMyTradeAvatar を実行しました");
    } else {
        console.warn("⚠️ window.hero が見つからないため、自分のアバターを描画できませんでした");
    }

    // データをクリア
    console.log("🧹 window._currentTradeData をクリアします");
    window._currentTradeData = null;
	
	// 🌟 3x3スロットを初期化・表示する！
    if (typeof initTradeSlots === 'function') {
        initTradeSlots();
        console.log("✅ 3x3トレードスロットを初期化しました");
    }
}

/**
 * ❌ 交換申し込みを拒否したとき
 */
function rejectTradeRequest() {
    const popup = document.getElementById("trade-invite-popup");
    if (popup) popup.style.display = "none";

    if (typeof socket !== 'undefined' && window._currentTradeData) {
        socket.emit('rejectTradeRequest', {
            targetId: window._currentTradeData.senderId
        });
    }

    const requesterName = window._currentTradeData ? window._currentTradeData.senderName : "相手";
    console.log(`${requesterName}からの交換を拒否しました`);

    window._currentTradeData = null;
}

/**
 * ❌ 交換窓を閉じる（キャンセルする）ときの処理
 */
function closeTradeWindow() {
    const tradeWindow = document.getElementById("trade-window");
    if (tradeWindow) {
        tradeWindow.style.display = "none";
    }

    // 🌟 自分と相手の「白薄（オーバーレイ）」を強制的に非表示にしてリセット
    const myOverlay = document.getElementById('my-trade-overlay');
    const opponentOverlay = document.getElementById('opponent-trade-overlay');
    
    if (myOverlay) myOverlay.style.display = 'none';
    if (opponentOverlay) opponentOverlay.style.display = 'none';

    // もし相手と通信中であれば、サーバーにキャンセルを伝える
    if (typeof socket !== 'undefined' && window._currentTradeTargetId) {
        socket.emit('cancelTrade', {
            targetId: window._currentTradeTargetId
        });
    }

    if (typeof addSystemMessage === 'function') {
        addSystemMessage("交換をキャンセルしました。");
    }

    // トレード関連の保持データをクリア ＆ 陳列をリセット
    window._currentTradeTargetId = null;

    if (typeof resetTradeSlots === 'function') {
        resetTradeSlots();
    } else {
        myTradeSlots = [null, null, null, null, null, null, null, null, null];
        opponentTradeSlots = [null, null, null, null, null, null, null, null, null];
        updateMyTradeDisplay();
        updateOpponentTradeDisplay();
    }
}

// 💬 アラートの代わりにHTMLモーダルを表示する関数
function showTradeAlert(message) {
    const alertModal = document.getElementById('trade-alert-modal');
    const messageEl = document.getElementById('trade-alert-message');
    const okBtn = document.getElementById('trade-alert-ok-btn');

    if (!alertModal || !messageEl || !okBtn) {
        // 万が一HTML要素が見つからない場合のフォールバック
        alert(message);
        return;
    }

    messageEl.textContent = message;
    alertModal.style.display = 'block';

    okBtn.onclick = () => {
        alertModal.style.display = 'none';
    };
}

let myTradeCurrency = 0;       // 自分がトレードに出している金額
let opponentTradeCurrency = 0; // 相手がトレードに出している金額

// 自分の通貨入力ダイアログを開く関数（HTMLモーダル＆UIアラート版）
function openTradeCurrencyInput() {
    const modal = document.getElementById('trade-currency-modal');
    const titleEl = document.getElementById('trade-currency-title');
    const inputEl = document.getElementById('trade-currency-input');
    const confirmBtn = document.getElementById('trade-currency-confirm');
    const cancelBtn = document.getElementById('trade-currency-cancel');

    if (!modal) return;

    // タイトルを設定
    titleEl.textContent = "金額を入力";
    inputEl.value = myTradeCurrency;
    modal.style.display = 'block';
    inputEl.focus();
    inputEl.select();

    // イベント重複を防ぐために一度リセット
    confirmBtn.onclick = null;
    cancelBtn.onclick = null;

    // キャンセルボタン
    cancelBtn.onclick = () => {
        modal.style.display = 'none';
    };

    // 決定ボタン
    confirmBtn.onclick = () => {
        let amount = parseInt(inputEl.value, 10);
        
        if (isNaN(amount) || amount < 0) {
            showTradeAlert("有効な数値を入力してください。");
            return;
        }
        
        // 🌟 【ここを確認】所持金が格納されている実際の変数に合わせる
        // 例: hero や player オブジェクトの中に所持金がある場合
        const currentMeso = (typeof hero !== 'undefined' && hero.gold !== undefined) ? hero.gold : 0;
        
        if (amount > currentMeso) {
            showTradeAlert("所持金が足りません！");
            return;
        }
        
        // 一度置いた金額より少なくすることはできない！
        if (amount < myTradeCurrency) {
            showTradeAlert("一度トレードに提示した金額を減らすことはできません！");
            return;
        }
        
        myTradeCurrency = amount;
        updateTradeCurrencyDisplay(); // 自分の画面を更新
        
        // サーバーへ金額を送信する
        // 🌟 サーバーへ金額を送信する（targetId を追加！）
        if (typeof socket !== 'undefined') {
            socket.emit('updateTradeCurrency', { 
                currency: myTradeCurrency,
                targetId: window._currentTradePartnerId || null // ← これを追加！
            });
        }

        modal.style.display = 'none';
    };
}

// 通貨の表示を更新する関数（単位なし版）
function updateTradeCurrencyDisplay() {
    const myCurrencyEl = document.getElementById('trade-my-meso'); 
    if (myCurrencyEl) {
        myCurrencyEl.innerText = myTradeCurrency.toLocaleString();
    }
    
    const oppCurrencyEl = document.getElementById('trade-opponent-meso');
    if (oppCurrencyEl) {
        oppCurrencyEl.innerText = opponentTradeCurrency.toLocaleString();
    }
}

// 🤝 トレードの陳列データおよび画面を完全にリセットする関数
function resetTradeSlots() {
    // 自分のトレードスロットをすべて空にする
    myTradeSlots = [null, null, null, null, null, null, null, null, null];
    // 相手のトレードスロットも安全のためリセット
    opponentTradeSlots = [null, null, null, null, null, null, null, null, null];

    // 🌟 通貨（ゴールド等）の金額もリセット
    myTradeCurrency = 0;
    opponentTradeCurrency = 0;

    // 画面の見た目を更新して綺麗にする
    updateMyTradeDisplay();
    updateOpponentTradeDisplay();
    updateTradeCurrencyDisplay(); // 🌟 金額の表示も「0 Gold」などにリセット

    console.log("[Trade] トレードウィンドウが閉じられたため、陳列アイテムと通貨をリセットしました。");
}

// ============================================================
// :::DRAW_VENDING_SIGN::: 🏪 露店看板のレンダリング（メイプル風・固定特大サイズ版）
// ============================================================
/**
 * 役割：
 * - プレイヤーの開店状態(is_vending)の監視とレンダリングのトリガー
 * - タイトルテキストの長さに関わらず、キャラ約2体分の固定幅（160px ※計算値）箱を生成
 * - 他プレイヤー表示時の座標ズレ補正（manualOffsetX）の適用
 * - 看板エリアのクリック判定用データ（p.vending_rect）のCanvasへの登録
 * - 2行対応：長すぎるテキストは指定幅で折り返し、はみ出る分は「...」に省略
 */
function drawVendingSign(p) {
    // 🌟 露店フラグを絶対条件にします
    if (!p || !p.is_vending) return;

    // 同期処理で守られた p.vending_title を参照
    const title = p.vending_title || ""; 

    ctx.save();
    
    // 文字の長さに合わせて看板のサイズを自動調整（メイプル風のフォント設定）
    ctx.font = "12px sans-serif";
    
    // 🌟 描画用の変数：中身が空の場合のみ、見た目上のフォールバックを表示
    let displayTitle = title;
    if (!title || title === "") {
        displayTitle = "いらっしゃいませ！"; 
    }

    // 💡 はみ出る文字を「...」に省略する関数（最大幅を超えたら切り詰める）
    function getEllipsisText(text, maxWidth) {
        if (ctx.measureText(text).width <= maxWidth) return text;
        let truncated = text;
        while (truncated.length > 0 && ctx.measureText(truncated + "...").width > maxWidth) {
            truncated = truncated.slice(0, -1);
        }
        return truncated + "...";
    }

    // 🌟 📏 【サイズ固定】どんなタイトルでも常に固定幅・固定高さ
    const signW = 160; 
    const paddingH = 20;
    
    // 🌟 看板の高さ（2行表示に対応するため 80px）
    const signH = 80;

    // 🛠 手動調整用パラメータ
    let manualOffsetX = 0;
    if (typeof hero !== 'undefined' && p.id !== hero.id) {
        manualOffsetX = -130; 
    }

    // 表示位置：キャラクターの頭上
    const charCenter = p.x + (p.w || 40) / 2 + manualOffsetX;
    const signX = charCenter - (signW / 2);
    const signY = p.y - 125; // 頭上の位置
    const rectY = signY - 25; // 四角形の描画開始位置

    // ------------------------------------------------------------
    // 🌟 【メイプル風レトロフキ出しデザインへ変更】
    // ------------------------------------------------------------
    // 看板の影（ふんわりと浮いている上品な影）
    ctx.shadowColor = "rgba(0, 0, 0, 0.15)";
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 4;

    // 背景色：薄いブルーベリー/アイスブルー色
    ctx.fillStyle = "#F3F4FB"; 
    
    // フチ取り設定（濃いブルーグレー）
    ctx.strokeStyle = "#475569"; 
    ctx.lineWidth = 2;

    // 💡 尻尾（三角のツメ）つきの吹き出しパスを描く
    const radius = 4; // ドット風に見せるため角丸は小さめに
    const tailW = 20;  // 尻尾の幅
    const tailH = 12;  // 尻尾の高さ
    
    ctx.beginPath();
    ctx.moveTo(signX + radius, rectY);
    ctx.lineTo(signX + signW - radius, rectY);
    ctx.quadraticCurveTo(signX + signW, rectY, signX + signW, rectY + radius);
    ctx.lineTo(signX + signW, rectY + signH - radius);
    ctx.quadraticCurveTo(signX + signW, rectY + signH, signX + signW - radius, rectY + signH);
    
    // ▼ 尻尾の頂点（下部中央からピョコっと飛び出る）
    ctx.lineTo(signX + (signW / 2) + (tailW / 2), rectY + signH);
    ctx.lineTo(signX + (signW / 2), rectY + signH + tailH); // 尻尾の尖っている先
    ctx.lineTo(signX + (signW / 2) - (tailW / 2), rectY + signH);
    
    ctx.lineTo(signX + radius, rectY + signH);
    ctx.quadraticCurveTo(signX, rectY + signH, signX, rectY + signH - radius);
    ctx.lineTo(signX, rectY + radius);
    ctx.quadraticCurveTo(signX, rectY, signX + radius, rectY);
    
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // ------------------------------------------------------------

    // 🌟 【メイプル風UI装飾の描画】
    ctx.shadowBlur = 0; // 以降の描画には影をつけない

    // 下部インナーバーの境界線
    ctx.beginPath();
    ctx.moveTo(signX + 4, rectY + signH - 24);
    ctx.lineTo(signX + signW - 4, rectY + signH - 24);
    ctx.strokeStyle = "#CBD5E1";
    ctx.lineWidth = 1;
    ctx.stroke();

    // 🟡 左側のメルコインアイコン（黄色い丸とフチ）
    ctx.beginPath();
    ctx.arc(signX + 20, rectY + signH - 12, 8, 0, Math.PI * 2);
    ctx.fillStyle = "#EAB308"; // 黄色
    ctx.fill();
    ctx.strokeStyle = "#A16207";
    ctx.stroke();
    
    // 🔒 鍵アイコン等のプレースホルダー
    ctx.fillStyle = "#94A3B8";
    ctx.fillRect(signX + 38, rectY + signH - 18, 10, 12);

    // 🔵 中央のステータス/丸いUIボタン
    ctx.beginPath();
    ctx.arc(signX + 90, rectY + signH - 12, 8, 0, Math.PI * 2);
    ctx.fillStyle = "#FFFFFF";
    ctx.fill();
    ctx.strokeStyle = "#0EA5E9"; // メイプルブルーのフチ
    ctx.stroke();

    // 🟠 右下のオレンジ色の小さな三角形（インジケータ）
    ctx.beginPath();
    ctx.moveTo(signX + signW - 16, rectY + signH - 8);
    ctx.lineTo(signX + signW - 8, rectY + signH - 8);
    ctx.lineTo(signX + signW - 8, rectY + signH - 16);
    ctx.closePath();
    ctx.fillStyle = "#F97316";
    ctx.fill();

    // --- 看板の文字 ---
    ctx.fillStyle = "#0F172A"; // 文字色：くっきり見やすい濃い色
    ctx.textAlign = "left"; 
    
    // 💡 2行表示のロジック（固定幅から余白を引いた幅を基準に判定）
    const availableW = signW - (paddingH * 2);
    const lineHeight = 20; // 文字描画間隔をUIに合わせて調整

    if (ctx.measureText(displayTitle).width > availableW) {
        // ざっくり真ん中で文字を分割
        const midIndex = Math.floor(displayTitle.length / 2);
        const line1 = displayTitle.slice(0, midIndex).trim();
        const line2 = displayTitle.slice(midIndex).trim();

        // それぞれ省略処理をかける
        const safeLine1 = getEllipsisText(line1, availableW);
        const safeLine2 = getEllipsisText(line2, availableW);

        // 装飾エリアと被らないようにY座標を計算して描画
        ctx.fillText(safeLine1, signX + paddingH, signY - (lineHeight / 2) - 2);
        ctx.fillText(safeLine2, signX + paddingH, signY + (lineHeight / 2) - 2);
    } else {
        // 収まる場合は中央上部に1行で描画
        ctx.fillText(displayTitle, signX + paddingH, signY + 2);
    }

    // --- 💡 クリック判定用の座標データ（尻尾の高さまで含めて判定させる） ---
    p.vending_rect = {
        x: signX,
        y: rectY,
        w: signW,
        h: signH + tailH
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
function drawSimpleWindow1(title, x, y, w, h) {
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

/**
 * 🎨 drawGorgeousWindow (HTMLのモダンリッチ仕様をCanvasに再現)
 */
function drawSimpleWindow(title, x, y, w, h) {
    ctx.save();

    // --- 1. ウィンドウ全体の背景と外枠 ---
    // 本体背景（明るいモダングレー）
    ctx.fillStyle = "#f8fafc";
    // 外枠（高級感のあるダークスレート＆微かなシャドウ）
    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 1;
    
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 8);
    ctx.fill();
    ctx.stroke();

    // 外側に薄いグロー（影の代わり）を演出
    ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
    ctx.shadowBlur = 15;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 6;

    // --- 2. ヘッダー（重厚感のあるダークグラデーション） ---
    const headerH = 36;
    const headerGrad = ctx.createLinearGradient(x, y, x, y + headerH);
    headerGrad.addColorStop(0, "#1e293b"); // 上部：ダークスレート
    headerGrad.addColorStop(1, "#0f172a"); // 下部：さらに深い黒に近い紺
    
    ctx.fillStyle = headerGrad;
    ctx.beginPath();
    // 上側の角だけ丸くする
    ctx.roundRect(x, y, w, headerH, [8, 8, 0, 0]);
    ctx.fill();

    // ヘッダー下部の境界線
    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y + headerH);
    ctx.lineTo(x + w, y + headerH);
    ctx.stroke();

    // --- 3. 閉じるボタン（リッチな赤系グラデーション） ---
    const btnSize = 20;
    const btnX = x + w - 28;
    const btnY = y + 8;
    
    const isHoveringClose = (mouseX >= btnX && mouseX <= btnX + btnSize &&
                             mouseY >= btnY && mouseY <= btnY + btnSize);

    const btnGrad = ctx.createLinearGradient(btnX, btnY, btnX, btnY + btnSize);
    btnGrad.addColorStop(0, isHoveringClose ? "#f87171" : "#ef4444");
    btnGrad.addColorStop(1, isHoveringClose ? "#dc2626" : "#b91c1c");

    ctx.fillStyle = btnGrad;
    ctx.strokeStyle = "#991b1b";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(btnX, btnY, btnSize, btnSize, 4);
    ctx.fill();
    ctx.stroke();

    // 「×」文字
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("✕", btnX + btnSize / 2, btnY + btnSize / 2 + 0.5);

    // --- 4. ヘッダータイトル文字 ---
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.font = "bold 12px 'Segoe UI', Tahoma, sans-serif";
    
    // 文字の影
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillText(title, x + 15, y + headerH / 2 + 1);
    // 白文字本体
    ctx.fillStyle = "#f8fafc";
    ctx.fillText(title, x + 14, y + headerH / 2);

    if (isHoveringClose) canvas.style.cursor = "pointer";

    ctx.restore();
}

// ============================================================
// :::DRAW_GOLD_UI::: 💰 所持金表示UIのレンダリング（2.14G対応・プロ風デザイン）
// ============================================================
/**
 * 役割：
 * - 2,147,483,647（32bit上限）までの大容量ゴールドの安全な描画
 * - 桁数に応じたフォントサイズ自動スケーリングによるはみ出し防止
 * - プロのMMORPG風のリッチで引き締まったUIデザイン
 */
function drawGoldUI(hero) {
    if (!hero) return;

    ctx.save();

    // --- 1. 座標とサイズの設定（バッグ等の下部に配置する基準） ---
    // ※インベントリ内に組み込む場合は drawBagGrid の中から bagX, bagY をベースに呼び出してください
    const drawX = 20;
    const drawY = 95; 
    const barW = 185; // 10桁の数字がゆったり収まるように少し幅を拡張
    const barH = 30;
    const radius = 5; // すっきり見せるためのシャープな角丸

    // --- 2. プロ風の高級感ある背景枠（ダーク＆ゴールドフレーム） ---
    const bgGrad = ctx.createLinearGradient(drawX, drawY, drawX, drawY + barH);
    bgGrad.addColorStop(0, "rgba(18, 18, 24, 0.95)");  // 上部は引き締まったダークネイビー
    bgGrad.addColorStop(1, "rgba(8, 8, 12, 0.98)");     // 下部は重厚感のある黒
    
    ctx.fillStyle = bgGrad;
    ctx.strokeStyle = "rgba(212, 175, 55, 0.8)"; // 落ち着いたアンティークゴールドの枠線
    ctx.lineWidth = 1.5;

    // 角丸パス描画
    ctx.beginPath();
    ctx.moveTo(drawX + radius, drawY);
    ctx.lineTo(drawX + barW - radius, drawY);
    ctx.quadraticCurveTo(drawX + barW, drawY, drawX + barW, drawY + radius);
    ctx.lineTo(drawX + barW, drawY + barH - radius);
    ctx.quadraticCurveTo(drawX + barW, drawY + barH, drawX + barW - radius, drawY + barH);
    ctx.lineTo(drawX + radius, drawY + barH);
    ctx.quadraticCurveTo(drawX, drawY + barH, drawX, drawY + barH - radius);
    ctx.lineTo(drawX, drawY + radius);
    ctx.quadraticCurveTo(drawX, drawY, drawX + radius, drawY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // --- 3. 立体感のあるコインアイコン ---
    const iconX = drawX + 18; 
    const iconY = drawY + barH / 2;
    
    // コインの影
    ctx.shadowColor = "rgba(0, 0, 0, 0.7)";
    ctx.shadowBlur = 3;
    ctx.shadowOffsetY = 2;

    ctx.beginPath();
    ctx.arc(iconX, iconY, 9, 0, Math.PI * 2);
    const coinGrad = ctx.createRadialGradient(iconX - 2, iconY - 2, 1, iconX, iconY, 9);
    coinGrad.addColorStop(0, "#fff8c4"); 
    coinGrad.addColorStop(0.5, "#ffd700");
    coinGrad.addColorStop(1, "#cca100"); 
    ctx.fillStyle = coinGrad;
    ctx.fill();
    
    ctx.shadowBlur = 0; // 影をリセット
    ctx.shadowOffsetY = 0;

    ctx.strokeStyle = "#996515"; // コインの縁
    ctx.lineWidth = 1;
    ctx.stroke();

    // コイン内側の光沢リング
    ctx.beginPath();
    ctx.arc(iconX, iconY, 6, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
    ctx.stroke();

    // "G" テキスト
    ctx.fillStyle = "#5c3a00";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("G", iconX, iconY);

    // --- 4. 2.14G対応・可変フォントサイズによる数値表示 ---
    const goldVal = hero.gold || 0;
    const goldText = goldVal.toLocaleString() + " G"; 

    // 桁数（文字数）に応じてフォントサイズを自動調整し、はみ出しを防ぐ
    let fontSize = 16;
    if (goldText.length > 12) {
        fontSize = 13; // 21億などの最大値付近でも綺麗に収まるサイズ
    } else if (goldText.length > 9) {
        fontSize = 14;
    }

    ctx.font = `bold ${fontSize}px sans-serif`; 
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    
    // 視認性を高めるためのシャープな黒フチ
    ctx.strokeStyle = "rgba(0, 0, 0, 0.9)";
    ctx.lineWidth = 3;
    ctx.strokeText(goldText, drawX + barW - 12, drawY + barH / 2 + 0.5);
    
    // リッチなゴールドグラデーション文字
    const textGrad = ctx.createLinearGradient(0, drawY, 0, drawY + barH);
    textGrad.addColorStop(0, "#fffae6");
    textGrad.addColorStop(0.5, "#ffd700");
    textGrad.addColorStop(1, "#e6ac00");
    ctx.fillStyle = textGrad;
    
    ctx.fillText(goldText, drawX + barW - 12, drawY + barH / 2 + 0.5);

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
function drawUIOverlay(hero) {
    if (!hero) return;

    // 基本UIパーツの描画
    drawItemLogsUI();
    drawTopStatusUI(hero);
    drawGoldUI(hero);

    if (window.isDisconnected) {
        window.hoveredItemForTooltip = null;
    } else {
        window.hoveredItemForTooltip = null;
    }

    if (hero && hero.inventory) {
        drawInventoryGrid(ctx, hero.inventory);

        const startX = 20;
        const startY = 130;
        const slotSize = 40;
        const spacing = 8;

        // 🛡️ インベントリの上に「開いているウィンドウ」が被っているか一発判定
        const isAnyWindowCovering = !window.isDisconnected && isMouseOverAnyWindow(mouseX, mouseY);

        hero.inventory.forEach((slot, index) => {
            // 🌟 【超重要】画面上のホットバーは最初の10スロット（0〜9）までなので、それ以降は絶対に処理しない！
            if (index >= 10) return;

            if (!slot || !slot.type || slot.count <= 0) return;
            const x = startX + (index * (slotSize + spacing));
            const y = startY;

            if (slot.isEquipped) {
                ctx.save();
                
                // 🌟 プロ風ミニバッジのデザイン定数
                const badgeW = 16;
                const badgeH = 15;
                const badgeX = x + slotSize - badgeW - 2; // スロットの右上
                const badgeY = y + 2;
                const radius = 3; // 角丸の半径

                // 1. バッジの背景（半透明のダークカラーでアイコンとの視認性を確保）
                ctx.fillStyle = 'rgba(10, 15, 25, 0.85)';
                // 2. バッジの枠線（スタイリッシュなネオンシアン。ゴールドにしたい場合は '#ffd700' など）
                ctx.strokeStyle = '#00ffcc'; 
                ctx.lineWidth = 1;

                // 角丸四角形の描画
                ctx.beginPath();
                if (ctx.roundRect) {
                    ctx.roundRect(badgeX, badgeY, badgeW, badgeH, radius);
                } else {
                    ctx.rect(badgeX, badgeY, badgeW, badgeH); // フォールバック用
                }
                ctx.fill();
                ctx.stroke();

                // 3. 「E」文字の描画（中央寄せで美しく配置）
                ctx.font = 'bold 10px sans-serif';
                ctx.fillStyle = '#00ffcc'; // 文字色もシアンで統一
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('E', badgeX + badgeW / 2, badgeY + badgeH / 2 + 0.5);
                
                ctx.restore();
            }

            // 接続中で、かつ上にウィンドウが被っていない場合のみホバー判定を行う
            if (!window.isDisconnected && !isAnyWindowCovering) {
                if (mouseX >= x && mouseX <= (x + slotSize) &&
                    mouseY >= y && mouseY <= (y + slotSize)) {
                    window.hoveredItemForTooltip = slot;
                }
            }
        });
    }
	
	// ----------------------------------------------------
	// 🛡️ 【追加】装備ウィンドウのアイテムホバー判定（ステータス完全版）
	// ----------------------------------------------------
	const equipWin = typeof gameWindows !== 'undefined' ? (gameWindows["equip"] || gameWindows["equipment"]) : null;
	if (!window.isDisconnected && equipWin && equipWin.isOpen && equipWin.slotHitAreas) {
		// マウスが装備ウィンドウの範囲内にあるか軽く確認
		if (mouseX >= equipWin.x && mouseX <= equipWin.x + equipWin.w &&
			mouseY >= equipWin.y && mouseY <= equipWin.y + equipWin.h) {
			
			for (const slotArea of equipWin.slotHitAreas) {
				if (mouseX >= slotArea.x && mouseX <= slotArea.x + slotArea.w &&
					mouseY >= slotArea.y && mouseY <= slotArea.y + slotArea.h) {
					
					const heroEquips = (hero && hero.equipment) ? hero.equipment : {};
					const equippedItemType = heroEquips[slotArea.slotType];
					
					if (equippedItemType) {
						// 🌟 インベントリ（hero.inventory）の中から、この装備スロットに対応する「ステータス入り実体アイテム」を探す！
						let fullItemData = null;
						if (hero.inventory && Array.isArray(hero.inventory)) {
							fullItemData = hero.inventory.find(invItem => 
								invItem && invItem.isEquipped && (invItem.type === equippedItemType || invItem.slotType === slotArea.slotType)
							);
						}

						// 見つかればその実体データを、なければ最低限のオブジェクトをセット
						window.hoveredItemForTooltip = fullItemData || (typeof equippedItemType === 'object' ? equippedItemType : { type: equippedItemType, name: equippedItemType, count: 1 });
					}
					break;
				}
			}
		}
	}

    // ウィンドウ群の描画
    drawGameWindows(hero);
    
    // ツールチップ描画の実行
    if (!window.isDisconnected && typeof tCtx !== 'undefined') {
        if (window.hoveredItemForTooltip) {
            // スロットの位置ではなく、マウスのブラウザ画面上の生座標を渡す
            const clientX = window.rawClientX !== undefined ? window.rawClientX : mouseX;
            const clientY = window.rawClientY !== undefined ? window.rawClientY : mouseY;
            
            drawItemTooltip(tCtx, window.hoveredItemForTooltip, clientX, clientY, hero);
        }
    }
}

// ============================================================
// :::DRAW_ITEM_TOOLTIP::: 🎨 アイテム詳細情報のツールチップ表示 (REQ関係＋中央揃え・リッチ版)
// ============================================================
function drawItemTooltip(ctx, slot, mouseX, mouseY, hero) {

    if (!slot) return;

    // 🛡️ 1. 현재のCanvas状態をすべて保存
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // 装備判定の拡張
    const isEquipment = (
        slot.type === 'sword' || 
        slot.type === 'shield' || 
        slot.type === 'cape' || 
        ['sword', 'shield', 'cape', 'helmet', 'armor', 'gloves', 'shoes'].includes(slot.item_type)
    );
    
    // --- 🌟 動的ステータス計算ロジック ---
    let totalFirstStats = slot.totalFirstStats;
    let totalALLStats = slot.totalALLStats;
    const statKeys = ['str', 'dex', 'int', 'luk', 'maxHp', 'maxMp', 'atk', 'matk', 'def', 'pdef', 'mdef'];

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
    
    // 分類名の解決
    let categoryName = "装備";
    if (isEquipment) {
        const catMap = { 
            "weapon1": "武器", "shield1": "盾", "armor1": "防具", 
            "cape": "マント", "helmet": "兜", "gloves": "手袋", "shoes": "靴" 
        };
        categoryName = catMap[slot.category] || catMap[slot.item_type] || slot.categoryName || (slot.type === 'sword' ? "片手剣" : (slot.type === 'cape' ? "マント" : "装備"));
    } else {
        const itemCat = (typeof itemCategories !== 'undefined') ? itemCategories[slot.type] : slot.category;
        if (itemCat === 'ETC') categoryName = "ETC";
        else if (itemCat === 'USE') categoryName = "消費アイテム";
        else categoryName = "アイテム";
    }

    let baseItemName = slot.displayName || slot.display_name;
    const genericNames = ['盾', '剣', 'マント', 'sword', 'shield', 'cape', 'アイテム'];

    if (!baseItemName || genericNames.includes(baseItemName)) {
        const catalogId = slot.item_id || slot.itemId || slot.id;
        if (typeof ITEM_CATALOG !== 'undefined' && catalogId && ITEM_CATALOG[catalogId]) {
            baseItemName = ITEM_CATALOG[catalogId].display_name || ITEM_CATALOG[catalogId].name;
        } else if (slot.type === 'cape') {
            baseItemName = "イデタチのマント";
        } else if (slot.type === 'sword') {
            baseItemName = "マニアックソード";
        } else if (slot.type === 'shield') {
            baseItemName = "トリシールド";
        } else {
            baseItemName = slot.name || "アイテム";
        }
    }

    if (isEquipment && successCount > 0) {
        if (!baseItemName.includes("(+")) {
            baseItemName = `${baseItemName} (+${successCount})`;
        }
    }

    let itemName = baseItemName;
    let statusText = "";
    let displayColor = "#ffffff";
    let glowColor = null;

    if (isEquipment && totalALLStats !== undefined && totalFirstStats !== undefined) {
        const bonus = totalALLStats - totalFirstStats;
        if (bonus >= 30) { displayColor = "#ff0000"; glowColor = displayColor; }
        else if (bonus >= 25) { displayColor = "#00ff00"; glowColor = displayColor; }
        else if (bonus >= 20) { displayColor = "#ffff00"; glowColor = displayColor; }
        else if (bonus >= 15) { displayColor = "#ff00ff"; glowColor = displayColor; }
        else if (bonus >= 10) { displayColor = "#00ccff"; glowColor = displayColor; }
        else if (bonus >= 5) { displayColor = "#fb923c"; }
        else { displayColor = "#ffffff"; }
    } else {
        if (slot.description) {
            statusText = slot.description;
        } else if (typeof itemDescriptions !== 'undefined' && itemDescriptions[slot.type]) {
            statusText = itemDescriptions[slot.type];
        } else {
            statusText = `個数 : ${slot.count || slot.quantity || 1}`;
        }
    }

    let activeStats = isEquipment ? statKeys.filter(k => {
        let val = parseInt(slot[k]);
        return !isNaN(val) && val !== 0; 
    }) : [];

    // --- 📐 レイアウト定数 ---
    let padding = 16;      
    let iconSize = 48;     
    let lineHeight = 20;   
    let boxWidth = 270;    

    // --- ↕️ 高さの積み上げ計算 ---
    let currentHeight = padding;

    if (isEquipment) {
        if (starCount > 0) currentHeight += 16; 
        currentHeight += iconSize;             
        currentHeight += 12;                   
        currentHeight += 22;                   
        currentHeight += 18;                   
        currentHeight += 10;                   
        
        // REQ系行数 (REQ LEV, REQ First, REQ ALL, BONUS)
        let reqLinesCount = 1; 
        if (totalFirstStats !== undefined) reqLinesCount++;
        if (totalALLStats !== undefined) reqLinesCount++;
        if (totalALLStats !== undefined && totalFirstStats !== undefined) reqLinesCount++;
        currentHeight += (reqLinesCount * lineHeight + 10);

        currentHeight += 10;                   
        // ステータス行数
        currentHeight += (activeStats.length * lineHeight);
        
        currentHeight += 10;                   
        currentHeight += 20;                   
    } else {
        currentHeight += iconSize;
        currentHeight += 12;
        currentHeight += 22;
        currentHeight += 20; 
    }

    let boxHeight = currentHeight + padding;

    let popupX = mouseX + 16;
    let popupY = mouseY + 16;

    if (popupX + boxWidth > window.innerWidth) popupX = mouseX - boxWidth - 16;
    if (popupY + boxHeight > window.innerHeight) popupY = window.innerHeight - boxHeight - 10;

    // --- 🖼️ ウィンドウ背景の描画 ---
    ctx.save();
    let bgGrad = ctx.createLinearGradient(popupX, popupY, popupX, popupY + boxHeight);
    bgGrad.addColorStop(0, "rgba(15, 20, 30, 0.96)"); 
    bgGrad.addColorStop(1, "rgba(8, 11, 16, 0.98)"); 
    ctx.fillStyle = bgGrad;

    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') { 
        ctx.roundRect(popupX, popupY, boxWidth, boxHeight, 8); 
    } else { 
        ctx.rect(popupX, popupY, boxWidth, boxHeight); 
    }
    ctx.fill();

    ctx.strokeStyle = 'rgba(100, 150, 255, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.shadowBlur = 12;
    ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
    ctx.stroke();
    ctx.restore();

    let cursorY = popupY + padding;
    let centerX = popupX + boxWidth / 2;

    // 🌟 スター描画
    if (isEquipment && starCount > 0) {
        ctx.font = '12px sans-serif';
        ctx.fillStyle = '#facc15';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText("★".repeat(starCount), centerX, cursorY);
        cursorY += 16;
    }

    // --- アイコンスロット ---
    let iconSlotX = centerX - (iconSize / 2);
    let iconSlotY = cursorY;

    ctx.save();
    let slotGrad = ctx.createLinearGradient(iconSlotX, iconSlotY, iconSlotX, iconSlotY + iconSize);
    slotGrad.addColorStop(0, "rgba(25, 32, 44, 0.95)");
    slotGrad.addColorStop(1, "rgba(10, 14, 20, 0.95)");
    ctx.fillStyle = slotGrad;
    ctx.strokeStyle = "rgba(100, 116, 139, 0.5)";
    ctx.lineWidth = 1;

    if (typeof ctx.roundRect === 'function') {
        ctx.beginPath();
        ctx.roundRect(iconSlotX, iconSlotY, iconSize, iconSize, 6);
        ctx.fill();
        ctx.stroke();
    } else {
        ctx.fillRect(iconSlotX, iconSlotY, iconSize, iconSize);
        ctx.strokeRect(iconSlotX, iconSlotY, iconSize, iconSize);
    }
    ctx.restore();

    // アイコン画像描画
    let itemImg = slot.img || ((typeof itemImages !== 'undefined') ? itemImages[slot.type] : null);
    if (!itemImg && slot.iconUrl) {
        if (!window.itemImageCache) window.itemImageCache = {};
        if (window.itemImageCache[slot.iconUrl]) {
            itemImg = window.itemImageCache[slot.iconUrl];
        } else {
            let img = new Image();
            img.crossOrigin = "anonymous";
            img.src = slot.iconUrl;
            window.itemImageCache[slot.iconUrl] = img;
            itemImg = img;
        }
    }

    if (itemImg && itemImg.complete && typeof itemImg.naturalWidth === 'number' && itemImg.naturalWidth > 0) {
        let margin = 5;
        let imgX = iconSlotX + margin, imgY = iconSlotY + margin;
        let imgW = iconSize - (margin * 2), imgH = iconSize - (margin * 2);

        ctx.save();
        if (glowColor) {
            ctx.shadowBlur = 20; ctx.shadowColor = glowColor;
            ctx.drawImage(itemImg, imgX, imgY, imgW, imgH);
        } else {
            ctx.shadowBlur = 8; ctx.shadowColor = "rgba(255, 255, 255, 0.95)";
            ctx.drawImage(itemImg, imgX, imgY, imgW, imgH);
        }
        ctx.restore();
    }

    cursorY += iconSize + 12;

    // --- アイテム名 ---
    ctx.textBaseline = 'top';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillStyle = displayColor;
    ctx.textAlign = 'center';
    ctx.fillText(itemName, centerX, cursorY);
    cursorY += 22;

    if (isEquipment) {
        // --- 装備の分類 ---
        ctx.font = '11px sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(`装備の分類：${categoryName}`, centerX, cursorY);
        cursorY += 18;

        // 区切り線
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(popupX + padding, cursorY);
        ctx.lineTo(popupX + boxWidth - padding, cursorY);
        ctx.stroke();
        ctx.restore();

        cursorY += 10;

        // --- REQ関係 (すべて中央揃え) ---
        let heroLevel = hero ? (hero.level || 0) : 0;
        ctx.font = '12px sans-serif';

        // REQ LEV
        ctx.fillStyle = (heroLevel < reqLevel) ? '#f87171' : '#fbbf24';
        ctx.fillText(`REQ LEV：${reqLevel}`, centerX, cursorY);
        cursorY += lineHeight;

        // REQ First
        if (totalFirstStats !== undefined) {
            ctx.fillStyle = '#cbd5e1';
            ctx.fillText(`REQ First：${Math.floor(totalFirstStats)}`, centerX, cursorY);
            cursorY += lineHeight;
        }
        // REQ ALL
        if (totalALLStats !== undefined) {
            ctx.fillStyle = '#cbd5e1';
            ctx.fillText(`REQ ALL：${Math.floor(totalALLStats)}`, centerX, cursorY);
            cursorY += lineHeight;
        }
        // BONUS
        if (totalALLStats !== undefined && totalFirstStats !== undefined) {
            let bonus = totalALLStats - totalFirstStats;
            ctx.fillStyle = displayColor;
            ctx.fillText(`BONUS：${(bonus >= 0 ? "+" : "") + Math.round(bonus * 10) / 10}`, centerX, cursorY);
            cursorY += lineHeight;
        }

        // 区切り線
        cursorY += 4;
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(popupX + padding, cursorY);
        ctx.lineTo(popupX + boxWidth - padding, cursorY);
        ctx.stroke();
        ctx.restore();

        cursorY += 10;

        // --- アクティブステータス (例: LUK ：+2, 物理防御力：+6) ---
        activeStats.forEach(key => {
            let labelMap = { 
                str: "STR", dex: "DEX", int: "INT", luk: "LUK", 
                maxHp: "最大HP", maxMp: "最大MP", 
                atk: "攻撃力", matk: "魔力", def: "物理防御力", 
                pdef: "物理防御力", mdef: "魔法防御力" 
            };
            let label = labelMap[key] || key.toUpperCase();
            let val = slot[key];
            let valStr = (val > 0 ? `+${val}` : `${val}`);

            ctx.fillStyle = '#f8fafc';
            ctx.fillText(`${label}：${valStr}`, centerX, cursorY);
            cursorY += lineHeight;
        });

        // 区切り線
        cursorY += 2;
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(popupX + padding, cursorY);
        ctx.lineTo(popupX + boxWidth - padding, cursorY);
        ctx.stroke();
        ctx.restore();

        cursorY += 10;

        // --- アップグレード可能回数 ---
        let total = slot.totalUpgrade || 7;
        let used = (slot.successCount || 0) + (slot.failCount || 0);
        let remainUpgrade = Math.max(0, total - used);

        ctx.font = 'bold 11px sans-serif'; 
        ctx.fillStyle = '#facc15';
        ctx.fillText(`アップグレード可能回数：${remainUpgrade}`, centerX, cursorY);

    } else {
        // 通常アイテム
        ctx.font = '12px sans-serif';
        ctx.fillStyle = '#cbd5e1';
        ctx.fillText(statusText, centerX, cursorY);
    }

    // 🛡️ 2. 元の状態に復元
    ctx.restore();
}

// ============================================================
// :::IS_MOUSE_OVER_ANY_WINDOW::: 🖱️ ウィンドウとの重なり判定（共通関数）
// ============================================================
function isMouseOverAnyWindow(mouseX, mouseY) {
    if (typeof gameWindows === 'undefined') return false;

    for (const [key, win] of Object.entries(gameWindows)) {
        // ウィンドウが存在し、かつ開いている（isOpen === true）場合のみ判定
        if (win && win.isOpen) {
            const winX = win.x;
            const winY = win.y;
            const winW = win.w || 200;
            const winH = win.h || 300;

            // マウス座標がウィンドウの矩形内に入っているか
            if (mouseX >= winX && mouseX <= winX + winW &&
                mouseY >= winY && mouseY <= winY + winH) {
                return true; // どのウィンドウであれ重なっていれば true
            }
        }
    }
    return false;
}

// ============================================================
// ⚔️ 攻撃力およびステータス計算用ユーティリティ
// ============================================================
function calculateTotalAtk(hero) {
    const baseAtk = hero.atk || 13; 
    const weaponAtk = hero.weaponAtk || 0;
    const str = hero.str || 4;
    const strBonus = Math.floor(str * 0.2); 
    return baseAtk + weaponAtk + strBonus;
}

// ============================================================
// :::DRAW_STATUS_WINDOW::: 📊 キャラクター情報ウィンドウの描画と操作判定
// ============================================================
function drawStatusWindow() {
    const win = gameWindows.status;
    
    // 窓枠の描画（背景を上質なダークテーマ＆シャドウ調に）
    ctx.save();
    
    // ウィンドウ全体の背景＆枠線
    ctx.fillStyle = "rgba(15, 23, 42, 0.92)"; // ディープダークネイビー
    ctx.fillRect(win.x, win.y, win.w, win.h);
    
    ctx.strokeStyle = "rgba(51, 65, 85, 0.8)"; // 上品なエッジライン
    ctx.lineWidth = 1.5;
    ctx.strokeRect(win.x, win.y, win.w, win.h);

    // ヘッダー部分の背景装飾
    ctx.fillStyle = "rgba(30, 41, 59, 0.9)";
    ctx.fillRect(win.x + 1, win.y + 1, win.w - 2, 36);

    // タイトルテキスト
    ctx.font = "bold 12px 'Segoe UI', Tahoma, sans-serif";
    ctx.fillStyle = "#f8fafc";
    ctx.textAlign = "left";
    ctx.fillText("📊 Character Status", win.x + 12, win.y + 23);

    // --- 2カラム用のレイアウト設定 ---
    const startY = win.y + 62;
    const gap = 20; // 行間
    const halfWidth = (win.w - 28) / 2;
    const leftX = win.x + 14;
    const rightX = leftX + halfWidth + 8;

    // 🌟 ステータスの表示文字列を生成するヘルパー関数
    const formatStatWithBonus = (total, base, bonus) => {
        const b = bonus || 0;
        const bs = base !== undefined ? base : (total - b);
        return b > 0 ? `${total} (${bs}+${b})` : total;
    };

    // --- 経験値のパーセンテージ計算（小数点以下切り捨て） ---
    const currentExp = hero.exp || 0;
    const requiredExp = hero.requiredExp || hero.maxExp || 100; 
    const expPercent = requiredExp > 0 
        ? Math.floor(Math.min(100, Math.max(0, (currentExp / requiredExp) * 100))) 
        : 0;

    // --- カラム1（左側：12項目）のデータ定義 ---
    const col1Labels = ["名前", "職業", "レベル", "ギルド", "HP", "MP", "経験値", "人気度", "STR", "DEX", "INT", "LUK"];
    const col1Values = [
        hero.name || "Adventurer",
        hero.job || "初心者",
        hero.lv || hero.level || 1,
        hero.guild || "なし",
        `${hero.hp || 0} / ${hero.maxHp || 100}`,
        `${hero.mp || 0} / ${hero.maxMp || 100}`,
        `${currentExp} (${expPercent}%)`,
        hero.fame || 0,
        formatStatWithBonus(hero.str, hero.baseStr, hero.bonusStr),
        formatStatWithBonus(hero.dex, hero.baseDex, hero.bonusDex),
        formatStatWithBonus(hero.int, hero.baseInt, hero.bonusInt),
        formatStatWithBonus(hero.luk, hero.baseLuk, hero.bonusLuk)
    ];

    // --- カラム2（右側）：攻撃力を「攻撃力(内訳)」と「最小最大」の2行に分割 ---
    const finalAtkVal = hero.atk || 13;
    const baseAtkVal = hero.baseAtk !== undefined ? hero.baseAtk : 13;
    const weaponAtkVal = hero.weaponAtk || 0;

    // 1行目用：攻撃力の数値 ＋ 基礎+武器の内訳表示
    const atkDetailStr = weaponAtkVal > 0 
        ? `${finalAtkVal} (${baseAtkVal}+${weaponAtkVal})` 
        : `${finalAtkVal}`;

    // 2行目用：最小攻撃力 〜 最大攻撃力 のレンジ表示
    const minAtkVal = hero.minAtk !== undefined ? hero.minAtk : Math.floor(finalAtkVal * 0.7);
    const maxAtkVal = hero.maxAtk !== undefined ? hero.maxAtk : finalAtkVal;
    const atkRangeStr = `${minAtkVal} 〜 ${maxAtkVal}`;
    
    // ラベル構成：「攻撃力」と「ダメージレンジ」（お好みに応じて「攻撃範囲」などに変更も可能です）
    const col2Labels = ["攻撃力", "ダメージ", "物理防御力", "魔力", "魔法防御力", "命中率", "回避率", "器用さ", "移動速度", "ジャンプ力"];
    const col2Values = [
        atkDetailStr,
        atkRangeStr,
        hero.def || 0,
        hero.matk || 0,
        hero.mdef || 0,
        hero.acc || 0,
        hero.eva || 0,
        hero.craft || hero.dex || 0,
        hero.speed || 5.0,
        hero.jumpPower || 10.0
    ];

    // 最前面ウィンドウ判定
    const isStatusPriority = (() => {
        const overStats = (mouseX >= win.x && mouseX <= win.x + win.w && mouseY >= win.y && mouseY <= win.y + win.h);
        const topWindow = windowStack[windowStack.length - 1];
        return overStats && topWindow === "status";
    })();

    if (!window.hoverFlags) window.hoverFlags = {};

    // --- 1. カラム1（左側）の描画 ＆ ステータス行の「+1」ボタン配置 ---
    col1Labels.forEach((label, i) => {
        const currentY = startY + (gap * i);

        // ラベル名
        ctx.font = "500 11px 'Segoe UI', Tahoma, sans-serif";
        ctx.fillStyle = "#94a3b8"; // 洗練されたスレートグレー
        ctx.textAlign = "left";
        ctx.fillText(label, leftX, currentY);

        const isTargetStat = (label === "STR" || label === "DEX" || label === "INT" || label === "LUK");
        const statKey = label.toLowerCase();

        if (isTargetStat) {
            ctx.font = "600 12px 'Segoe UI', Tahoma, sans-serif";
            ctx.fillStyle = "#f1f5f9";
            ctx.textAlign = "right";
            
            const valEndX = leftX + halfWidth - 52;
            ctx.fillText(col1Values[i], valEndX, currentY);

            // 「+1」ボタンの座標
            const btnW = 38;
            const btnH = 16;
            const btnX = leftX + halfWidth - 46;
            const btnY = currentY - 12; 

            const isHover = isStatusPriority && (mouseX >= btnX && mouseX <= btnX + btnW && mouseY >= btnY && mouseY <= btnY + btnH);

            if (isHover) {
                canvas.style.cursor = "pointer";
                if (!window.hoverFlags[statKey]) {
                    if (typeof playMouseOver1Sound === 'function') playMouseOver1Sound();
                    window.hoverFlags[statKey] = true;
                }
            } else {
                window.hoverFlags[statKey] = false;
            }

            // ボタン描画（モダン・ダークアクセント）
            ctx.fillStyle = isHover ? "#3b82f6" : "#1e293b"; // ホバー時は洗練されたブルー
            ctx.strokeStyle = isHover ? "#60a5fa" : "#475569";
            ctx.lineWidth = 1;
            ctx.fillRect(btnX, btnY, btnW, btnH);
            ctx.strokeRect(btnX, btnY, btnW, btnH);

            ctx.fillStyle = isHover ? "#ffffff" : "#cbd5e1";
            ctx.font = "bold 10px 'Segoe UI', Tahoma, sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("+1", btnX + (btnW / 2), btnY + 12);
            ctx.textAlign = "left";

        } else {
            ctx.font = "600 12px 'Segoe UI', Tahoma, sans-serif";
            ctx.textAlign = "right";
            const valX = leftX + halfWidth - 6;

            if (label === "HP") {
                ctx.fillStyle = "#f87171"; // 明るく見やすいソフトレッド
            } else if (label === "MP") {
                ctx.fillStyle = "#60a5fa"; // ソフトブルー
            } else {
                ctx.fillStyle = "#f1f5f9"; // 基本のオフホワイト
            }

            ctx.fillText(col1Values[i], valX, currentY);
        }
    });

    // --- 2. カラム2（右側）の描画 ---
    col2Labels.forEach((label, i) => {
        const currentY = startY + (gap * i);

        ctx.font = "500 11px 'Segoe UI', Tahoma, sans-serif";
        ctx.fillStyle = "#94a3b8";
        ctx.textAlign = "left";
        ctx.fillText(label, rightX, currentY);

        // 文字列の長さに合わせてフォントサイズを微調整
        if (label === "攻撃力") {
            ctx.font = "600 11px 'Segoe UI', Tahoma, sans-serif";
        } else if (label === "ダメージ") {
            ctx.font = "600 11px 'Segoe UI', Tahoma, sans-serif";
        } else {
            ctx.font = "600 12px 'Segoe UI', Tahoma, sans-serif";
        }

        ctx.textAlign = "right";
        const valX = rightX + halfWidth - 6;

        if (label === "攻撃力" || label === "ダメージ" || label === "魔力") {
            ctx.fillStyle = "#34d399"; // エメラルドグリーン
        } else if (label === "移動速度" || label === "ジャンプ力") {
            ctx.fillStyle = "#60a5fa"; // スカイブルー
        } else {
            ctx.fillStyle = "#f1f5f9";
        }

        ctx.fillText(col2Values[i], valX, currentY);
    });

    // --- 3. 左右カラムを分ける中央のセパレーター線 ---
    ctx.strokeStyle = "rgba(51, 65, 85, 0.6)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    const dividerX = leftX + halfWidth + 4;
    ctx.moveTo(dividerX, win.y + 45);
    ctx.lineTo(dividerX, win.y + win.h - 25);
    ctx.stroke();

    // --- 4. 利用可能AP（Available AP）の表示エリア ---
    ctx.fillStyle = "rgba(30, 41, 59, 0.6)";
    ctx.fillRect(win.x + 1, win.y + win.h - 32, win.w - 2, 31);

    ctx.strokeStyle = "rgba(51, 65, 85, 0.8)";
    ctx.beginPath();
    ctx.moveTo(win.x, win.y + win.h - 32);
    ctx.lineTo(win.x + win.w, win.y + win.h - 32);
    ctx.stroke();

    ctx.fillStyle = "#fbbf24"; // リッチゴールド
    ctx.font = "bold 12px 'Segoe UI', Tahoma, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`Available AP: ${hero.ap || 0}`, win.x + 14, win.y + win.h - 12);

    ctx.restore();
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
function drawPlayerObj(p, isMe, id) {
    if (!p) return;
	
	//p.charVar = 1;   // スタイルIDを強制的に 1 にする
	
    // 🌟 チャンネルチェックの門番
    if (!isMe && typeof hero !== 'undefined') {
        const myChan = hero.channel || 1;
        const opChan = p.channel || 1;
        if (opChan !== myChan) return;
    }

    // 1. 🎭 キャラクター設定の決定 (ここを model_id 優先に修正)
    // サーバーから同期されている p.model_id を使用し、未定義ならグループID(p.group)へフォールバック
    const g = isMe ? (typeof selectedGroup !== 'undefined' ? selectedGroup : 0) : (p.model_id !== undefined ? p.model_id : (p.group || 0));
    const v = isMe ? (typeof selectedCharVar !== 'undefined' ? selectedCharVar : 1) : (p.charVar !== undefined ? p.charVar : 1);

    // 🌟 ロードチェック：g, v の組み合わせが未ロードなら実行
    if (!playerSprites[g] || !playerSprites[g][v]) {
        loadCharFrames(g, v);
    }

    // 2. 🎨 描画準備
    const visualData = calculatePlayerVisuals(p, g, isMe);

    // 3. 🖼️ 表示する画像の決定
    const currentImg = getPlayerCurrentImg(p, g, v, frame, sprites, playerSprites, isMe);

    // 4. 🖼️ 表示する画像の決定
    if (currentImg && !(p.invincible > 0 && Math.floor(frame / 4) % 2 === 0)) {
        
        // 実際の半透明・グロー処理は renderPlayerSprite 側に任せるためそのまま呼び出し
        renderPlayerSprite(ctx, p, currentImg, visualData);
        
    } else if (!isMe) {
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
function renderPlayerSprite(ctx, p, img, vData) {
    if (!img || !img.complete) return;

    ctx.save();

    // --- 🌟 無敵状態（ゴッドモード）なら半透明にする ---
    if (p.isInvincible) {
        ctx.globalAlpha = 0.5; // 0.0（完全透明）～ 1.0（不透明）でお好みで調整
    }

    // --- 🌟 視認性向上：グロー（影・縁取り）設定 ---
    ctx.shadowColor = "rgba(255, 255, 255, 1.0)"; 
    ctx.shadowBlur = 3;                       
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    // -------------------------------------------------

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

/**
 * 文字列から固有の数値を生成するハッシュ関数
 * キャラクターごとに異なるオフセット値を生み出すために使用します
 */
function hashCode(str) {
    let hash = 0;
    if (!str || str.length === 0) return hash;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0; // 32bit 整数に変換
    }
    return Math.abs(hash);
}

window.deathStates = {};

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
    // 🌟 速度の取得を安定化
    const speed = isMe ? (typeof hero !== 'undefined' ? hero.vx : 0) : (p.vx || 0);
    const isMoving = Math.abs(speed) > 0.1;
    const isGrounded = !p.jumping;

    // 引数として渡された g と v を使ってデータにアクセス
    const characterData = (playerSprites[g] && playerSprites[g][v]);
	
	// --- 0. 👻 死亡中 ---
    if (p.hp <= 0) {
        const frames = characterData?.["Dead"];
        if (frames && frames.length > 0) {
            
            // 💡 修正：p.id をキーにして deathStates に記録する
            if (!window.deathStates[p.id]) {
                window.deathStates[p.id] = frame; 
            }

            // 経過時間を計算
            const deathDuration = frame - window.deathStates[p.id];
            
            // アニメーション速度（3 を変更して調整）
            const animIdx = Math.floor(deathDuration / 3);
            
            // 最後まで行ったらそのコマで固定
            const idx = Math.min(animIdx, frames.length - 1);
            
            return frames[idx];
        }
        return sprites.playerA; 
    } else {
        // 💡 修正：生きている場合は、念のため死亡記録を消しておく
        // これで復活した時にまた最初から再生されます
        if (window.deathStates[p.id]) {
            delete window.deathStates[p.id];
        }
    }

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

    // 🌟 オンオフ切り替え用のフラグ（trueなら常にアニメーション、falseなら停止時は0コマ目で固定）
    const ALWAYS_ANIMATE_CLIMB = true; 

    const idx = (ALWAYS_ANIMATE_CLIMB || isMovingClimb) 
        ? AnimUtils.getIdx(frame, 5, frames?.length || 0) 
        : 0;

    return AnimUtils.getFrame(frames, idx, sprites.playerClimb[0]);
}

    // --- 4. 💫 無敵（スタン）状態 ---
    if (p.invincible > 0 && !p.isInvincible) {
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
    
    // 💡 昔のメイプルのようにキャラごとに待機モーションのタイミングをバラつかせるため、
    // キャラクターの固有ID（p.idや名前など）をハッシュ化した値をオフセットとして加算します。
    // （※お使いの環境のプレイヤーブルオブジェクト構造に合わせて `p.id` の部分は適宜書き換えてください）
    const uniqueId = p.id || (g + "_" + v); // IDがない場合はグループと番号から生成
    const offset = hashCode(String(uniqueId));
    
    return AnimUtils.getFrame(
        frames, 
        AnimUtils.getIdx(frame + offset, 6, frames?.length || 0), 
        sprites.playerA
    );

    // 最終バックアップ
    return sprites.playerA;
}

// ★ バッジ用の画像オブジェクトを生成して読み込みます
// 💡 const ではなく window.badgeImg にする
window.badgeImg = new Image();
window.isBadgeLoaded = false; 

window.badgeImg.onload = () => { 
    window.isBadgeLoaded = true; 
};
window.badgeImg.src = '//imglive.net/badge.png';

// ============================================================
// :::DRAW_PLAYER_UI::: 🏷️ キャラクター頭上UI（HPバー・名前）の表示
// ============================================================
function drawPlayerUI(ctx, p, isMe, pW, frame) {

    // 💡 自分(isMe)なら hero を、他人なら p を参照するステータス判定
    const currentLinked = isMe ? (typeof hero !== 'undefined' && hero.isLinked) : (p.isLinked || false);
    const currentOnline = isMe ? (typeof hero !== 'undefined' && hero.isOnline) : (p.isOnline || false);

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

    // --- 2. プレイヤー名とバッジ画像の描画 (自分も他人も表示) ---
    const rawName = p.name || "Player";
    
    // フォントの設定
    ctx.font = `bold ${VIEW_CONFIG.playerName.fontSize} Arial`;
    
    const imgW = 16;
    const imgH = 16;
    
    const badgeW = currentLinked ? (imgW + 4) : 0;
    const nameWidth = ctx.measureText(rawName).width;
    
    // 背景帯の合計幅
    const totalW = nameWidth + badgeW + VIEW_CONFIG.playerName.paddingW;
    
    // 名本のベース位置を計算
    let nameY = p.y + ((p.y > VIEW_CONFIG.groundThreshold) 
        ? VIEW_CONFIG.playerName.offsetY_ground 
        : VIEW_CONFIG.playerName.offsetY_air);
    
    if (nameY < VIEW_CONFIG.playerName.safeMargin) {
        nameY = VIEW_CONFIG.playerName.safeMargin;
    }
    
    // --- 3. 角丸の背景を描画（高さを22pxに少し広げ、位置を調整） ---
    const bgX = p.x + pW / 2 - totalW / 2;
    const bgH = 22; // 高さを少し持たせてはみ出しを防ぐ
    const bgY = nameY - 12; // 基準位置に対して背景を上下中央に配置
    const bgW = totalW;
    const radius = 4; // 角の丸み

    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.beginPath();
    ctx.moveTo(bgX + radius, bgY);
    ctx.lineTo(bgX + bgW - radius, bgY);
    ctx.quadraticCurveTo(bgX + bgW, bgY, bgX + bgW, bgY + radius);
    ctx.lineTo(bgX + bgW, bgY + bgH - radius);
    ctx.quadraticCurveTo(bgX + bgW, bgY + bgH, bgX + bgW - radius, bgY + bgH);
    ctx.lineTo(bgX + radius, bgY + bgH);
    ctx.quadraticCurveTo(bgX, bgY + bgH, bgX, bgY + bgH - radius);
    ctx.lineTo(bgX, bgY + radius);
    ctx.quadraticCurveTo(bgX, bgY, bgX + radius, bgY);
    ctx.closePath();
    ctx.fill();
    
    // --- 4. バッジ画像と名前テキストの描画 ---
    let currentX = p.x + pW / 2 - totalW / 2 + (VIEW_CONFIG.playerName.paddingW / 2);
    
    // 🔤 垂直基準を "middle"（中央揃え）にすることで、背景の縦中央に完全に合わせる
    ctx.textBaseline = "middle";

    // 背景の縦中央座標を計算
    const centerY = bgY + (bgH / 2);

    if (currentLinked && window.badgeImg && (window.badgeImg.complete || window.isBadgeLoaded)) {
        // バッジも背景の中央に配置（画像サイズ16x16なので中心から-8px）
        ctx.drawImage(window.badgeImg, currentX, centerY - (imgH / 2), imgW, imgH);
        currentX += imgW + 4; 
    }
    
    // --- 5. 名前のテキスト描画 ---
    ctx.fillStyle = currentOnline ? "#ffd700" : "#ffffff";
    ctx.textAlign = "left"; 
    // 文字も背景の完全な縦中央（centerY）に配置
	// 調整2026-9-2
    ctx.fillText(rawName, currentX, centerY - 1);
    
    // 他の描画に影響を与えないようベースラインをデフォルトに戻す
    ctx.textBaseline = "alphabetic";
}

// モンスターの数を保持する変数（ファイルの先頭付近で安全に初期化）
if (typeof window.lastEnemyCount === 'undefined') {
    window.lastEnemyCount = 0;
}

// 🌟 ファイルの先頭（drawEnemiesの外）に置いておくメモ帳
if (typeof window.enemyAuraCache === 'undefined') {
    window.enemyAuraCache = {};
}

/**
 * 🕰️ アナログ時計のなかにデジタル表記（HH:MM）を融合させた描画関数
 * @param {CanvasRenderingContext2D} ctx 
 * @param {number} x 配置するX座標
 * @param {number} y 配置するY座標
 * @param {number} size 時計ボックス全体のサイズ（デフォルト72px）
 */
function drawBarMatchedAnalogClock(ctx, x, y, size = 72) {
    if (typeof ctx === 'undefined') return;

    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();

    ctx.save();

    // 1. ボックスの外枠と背景
    const radius = size / 2 - 5;

    const bgGrad = ctx.createLinearGradient(x, y, x, y + size);
    bgGrad.addColorStop(0, "rgba(30, 41, 59, 0.95)");
    bgGrad.addColorStop(1, "rgba(15, 23, 42, 0.95)");

    ctx.fillStyle = bgGrad;
    ctx.strokeStyle = "rgba(100, 116, 139, 0.8)";
    ctx.lineWidth = 1.5;

    const boxRadius = 6;
    ctx.beginPath();
    if (ctx.roundRect) {
        ctx.roundRect(x, y, size, size, boxRadius);
    } else {
        ctx.rect(x, y, size, size);
    }
    ctx.fill();
    ctx.stroke();

    // 2. 時計の中心座標
    const centerX = x + size / 2;
    const centerY = y + size / 2;

    // 3. 文字盤の目盛り（12, 3, 6, 9時）
    ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 4; i++) {
        const angle = (i * Math.PI) / 2;
        const innerR = radius - 7;
        const outerR = radius - 2;
        ctx.beginPath();
        ctx.moveTo(centerX + Math.cos(angle) * innerR, centerY + Math.sin(angle) * innerR);
        ctx.lineTo(centerX + Math.cos(angle) * outerR, centerY + Math.sin(angle) * outerR);
        ctx.stroke();
    }

    // 4. 針の角度計算
    const secondAngle = (seconds * Math.PI) / 30 - Math.PI / 2;
    const minuteAngle = (minutes * Math.PI) / 30 + (seconds * Math.PI) / 1800 - Math.PI / 2;
    const hourAngle = ((hours % 12) * Math.PI) / 6 + (minutes * Math.PI) / 360 - Math.PI / 2;

    // 時針
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(centerX + Math.cos(hourAngle) * (radius * 0.45), centerY + Math.sin(hourAngle) * (radius * 0.45));
    ctx.stroke();

    // 分針
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(centerX + Math.cos(minuteAngle) * (radius * 0.7), centerY + Math.sin(minuteAngle) * (radius * 0.7));
    ctx.stroke();

    // 秒針（赤のアクセント）
    ctx.strokeStyle = "#f87171";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(centerX + Math.cos(secondAngle) * (radius * 0.8), centerY + Math.sin(secondAngle) * (radius * 0.8));
    ctx.stroke();

    // 中心ポッチ
    ctx.beginPath();
    ctx.arc(centerX, centerY, 2, 0, Math.PI * 2);
    ctx.fillStyle = "#facc15";
    ctx.fill();

    // 🌟 5. デジタル表記の追加（文字盤の下部に小さく HH:MM を表示）
    const dispHours = String(hours).padStart(2, '0');
    const dispMinutes = String(minutes).padStart(2, '0');
    const timeText = `${dispHours}:${dispMinutes}`;

    ctx.font = "bold 10px 'Segoe UI', monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // 読みやすくするためにテキストの背景にわずかに暗い帯または影を引く
    ctx.fillStyle = "rgba(15, 23, 42, 0.8)";
    ctx.fillRect(centerX - 18, centerY + (radius * 0.35), 36, 14);

    ctx.fillStyle = "#38bdf8"; // デジタル部分はスカイブルーで計器感アップ
    ctx.fillText(timeText, centerX, centerY + (radius * 0.35) + 7);

    ctx.restore();
}

// ============================================================
// ⚙️ 【設定】オーラの有効/無効をここで一発切り替え
// ============================================================
const ENABLE_ENEMY_AURAS = true; // false にすればオーラ機能を丸ごとOFFにできます

// ============================================================
// 🌟 【変更】サーバーから送られてきた auraType をそのまま取得する関数
// ============================================================
function getOrAssignEnemyAura(en) {
    // サーバー（initMonsters）で決定され、通信で送られてきた en.auraType をそのまま使う！
    // データがない場合の安全策として 'none' を返す
    return (en && en.auraType) ? en.auraType : 'none';
}

// ============================================================
// 🎨 【別関数化】オーラのグロー描画を適用する関数
// ============================================================
function applyEnemyAuraEffect(auraType, drawFunction) {
    // 機能がOFF、または 'none' の場合はそのまま普通に描画する
    if (!ENABLE_ENEMY_AURAS || auraType === 'none') {
        drawFunction();
        return;
    }

    ctx.save();

    const baseAlpha = ctx.globalAlpha;
    if (baseAlpha <= 0) {
        ctx.restore();
        return;
    }

    // 🌟 オーラのカラー（CSSカラー）
    let glowColor = "#ffffff";
    if (auraType === 'gold') glowColor = "#ffcc00";
    else if (auraType === 'red') glowColor = "#ff4444";
    else if (auraType === 'blue') glowColor = "#00ccff";

    // 1. 背後にオーラの光（シャドウ）を落とす
    // ※光量を強くするため、不透明度を高めに調整（baseAlpha * 0.9）
    ctx.globalAlpha = baseAlpha * 0.9; 
    
    // ※光量を強くするため、shadowBlurを 10 から 20 に拡大して発光感をアップ
    ctx.shadowBlur = 20;
    ctx.shadowColor = glowColor;

    // 🌟 構造をそのまま踏襲：影のグロー効果を出すための1回目の描画
    ctx.save();
    drawFunction();
    ctx.restore();

    ctx.restore(); // 一度ここで状態を完全にリセット

    // 2. 最後に通常通り、くっきりとした本体を1回だけ描画する
    drawFunction();
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

	// 2026-9-5停止
	//console.log("🎨 描画ループ開始！ 現在の敵の数:", enemies.length);
	
	// 🌟 10秒ごと（60FPSなら約600フレーム）にログを出す
    if (frame % 600 === 0) {
        console.log("--- ⏰ 10秒ごとの敵配列スナップショット ---");
        console.table(enemies);
    }
	
	// 描画ループの中など
if (enemies.length !== window.lastEnemyCount) {
    //console.log(`⚠️ 敵の数が変化しました: ${window.lastEnemyCount} → ${enemies.length}`);
	const aliveEnemies = enemies.filter(e => e && e.alive);
	console.log("⚠️ 現在の生存している敵の数:", aliveEnemies.length);
	// もしここで 7 と出るなら、なぜ配列の長さが 8 なのに生きているのが 7 なのかがわかります
	console.log("死んでいる敵:", enemies.filter(e => !e.alive));
    window.lastEnemyCount = enemies.length;
}
	
	// --- 🚨 【強制可視化テスト】 🚨 ---
    // 画像もエフェクトも無視して、とりあえず赤い四角を強制描画する
    enemies.forEach(en => {
		// --- 🚨 【最終診断】 🚨 ---
        // 強制的に生存フラグを立てて、消える原因を探る
        if (!en.alive) {
             //console.log(`❌ ID:${en.id} が消えた理由: alive=${en.alive}, hp=${en.hp}, isFading=${en.isFading}`);
             //en.alive = true; // 強制的に生き返らせる
        }
        //ctx.save();
        //ctx.fillStyle = "red"; // モンスターの場所に赤い四角を描く
        //ctx.fillRect(en.x, en.y, 50, 50); 
        //ctx.restore();
    });
    // ----------------------------------
	
    enemies.forEach(en => {
	
		// 💡 🌟ここに強制ロードのチェックを仕込みます！
        if (en && en.id) {
            const enemyName = en.name || en.type; // 敵の名前またはタイプ
            const checkKey = enemyName + (en.action || 'Idle');
            
            // まだスプライト（画像配列）が存在しない、または空の場合
            if (!sprites[checkKey] || sprites[checkKey].length === 0) {
                // リロード直後などで消えている画像を今すぐロードする！
                loadSingleEnemyImages(en);
            }
        }
        
        // --- 1. 🛑 描画判定 ---
        if (!en.alive && !en.isFading) return;

        // --- 2. 💫 点滅エフェクト ---
        if (!en.isFading && Math.abs(en.kbV) > 2.0 && Math.floor(frame / 4) % 2 === 0) return;

        ctx.save();

        // --- 3. ✨ 透明度設定 ---
        if (en.isFading) {
            // 死亡演出中は deathFrame を使う
            ctx.globalAlpha = Math.max(0, 1 - (en.deathFrame / VIEW_CONFIG.enemy.deathAnimDuration));
        } else {
            // 🌟 修正：spawnAlpha ではなく opacity を使うように変更！
            // opacity があればそれを使う、なければ 1 (不透明) にする
            ctx.globalAlpha = (en.opacity !== undefined) ? en.opacity : 1;
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

            // 🌟 オーラの決定と、別関数を使った描画のラップ
            const auraType = getOrAssignEnemyAura(en);

            applyEnemyAuraEffect(auraType, () => {
                // 🖼️ 画像の描画 (基準点 footY で位置を合わせる)
                ctx.drawImage(img, -drawW / 2, -footY, drawW, drawH);
            });

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

function loadSingleEnemyImages(enemy) {
    // すでにロード中やロード済みなら二重でやらないためのガード
    const actionKey = enemy.name + 'Idle';
    if (sprites[actionKey] && sprites[actionKey].length > 0) return;

    // MONSTER_CONFIGS から該当する設定を探す
    const m = MONSTER_CONFIGS.find(conf => String(conf.id) === String(enemy.id) || conf.name === enemy.name);
    if (!m) return; // コンフィグが見つからない場合はスキップ

    const basePath = `${IMAGE_DOMAIN}char_assets_enemy/${m.id}`;
    let fName = m.id.startsWith("Monster") || /^\d+$/.test(String(m.id)) ? "tile" : "skeleton";

    const loadSet = (actionName, folderName) => {
        const key = m.name + actionName;
        if (sprites[key] && sprites[key].length > 0) return;
        
        sprites[key] = [];
        let count = 0;

        if (m.id === "Monster1") {
            if (actionName === 'Idle')   count = 27;
            if (actionName === 'Walk')   count = 20;
            if (actionName === 'Attack') count = 17;
            if (actionName === 'Death')  count = 27;
            if (actionName === 'Jump')   count = 0;
        } else {
            const lowerName = actionName.toLowerCase();      
            count = m["anim_" + lowerName] || m[lowerName] || 0;
        }

        for (let i = 0; i < count; i++) {
            const img = new Image();
            img.crossOrigin = "anonymous"; 
            img.src = `${basePath}/${folderName}/${fName}${String(i).padStart(3, '0')}.png`;
            img.onload = () => {
                img.autoPaddingY = getBottomTransparentPadding(img, 10);
            };
            sprites[key].push(img);
        }
    };

    // 各アクションの画像を読み込む
    loadSet('Walk',   'Walk');
    loadSet('Attack', 'Attack');
    loadSet('Idle',   'Idle');
    loadSet('Jump',   'Jump');
    loadSet('Death',  'Death'); 

    // ベースの1枚絵も念のため
    const idleKey = (m.id.startsWith("Monster") || /^\d+$/.test(String(m.id))) ? 'tile000' : `${fName}-Idle_0`;
    const baseImg = new Image();
    baseImg.crossOrigin = "anonymous";
    baseImg.src = `${basePath}/Idle/${idleKey}.png`;
    sprites[m.name] = [baseImg];
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

	if (frame % 180 === 0) {
		console.log(`🔍 [Debug] ID:${en.id} HP:${en.hp} / Max:${en.maxHp}`);
	}
	
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
// :::DRAW_PICKUP_EFFECTS::: 💎 アイテム収集時の吸い込みエフェクト（図鑑・フィールド完全同期版）
// ============================================================
function drawPickupEffects(hero, others) {
    if (!pickingUpEffects || !Array.isArray(pickingUpEffects)) return;

    pickingUpEffects.forEach((eff) => {
        const maxTime = VIEW_CONFIG.pickupEffect.duration;
        
        if (eff.timer === maxTime) {
            console.log(`[EffectStart] Drawing with Color: ${eff.effectColor}, Type: ${eff.type}, Rank: ${eff.cardRank}`);
        }
        
        const t = Math.pow((maxTime - eff.timer) / maxTime, 2);

        ctx.save();
        
        const dpr = window.devicePixelRatio || 1;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0); 

        let target = (eff.targetPlayerId === socket.id) ? hero : others[eff.targetPlayerId];
        if (!target) target = hero;

        const tx = target.x + 20;
        const ty = target.y;
        
        const midY = Math.min(target.y + 5, ty) - VIEW_CONFIG.pickupEffect.arcHeight;
        const dx = (1 - t) * (1 - t) * eff.startX + 2 * (1 - t) * t * ((eff.startX + tx) / 2) + t * t * tx;
        const dy = (1 - t) * (1 - t) * (target.y + 5) + 2 * (1 - t) * t * midY + t * t * ty;

        const alpha = Math.max(0, 1 - t);
        ctx.globalAlpha = alpha;
        ctx.translate(dx, dy);

        const category = typeof itemCategories !== 'undefined' ? itemCategories[eff.type] : "ETC";
        const isExcludedColor = (eff.effectColor === '#ffffff' || eff.effectColor === '#aaaaaa' || eff.effectColor === '#ff9900');
        const showColorEffect = (category === "EQUIP") && eff.effectColor && !isExcludedColor;

        ctx.imageSmoothingEnabled = true;

        // 🌟 【完全防御】未登録のアイテムでも絶対にエラーにさせない安全ガード
        const rawConfig = typeof ITEM_CONFIG !== 'undefined' ? ITEM_CONFIG[eff.type] : null;
        const config = rawConfig || { name: eff.type, isAnimated: false };
        
        let img = null;
        const spriteName = config.name || eff.type;
        if (typeof sprites !== 'undefined' && sprites.items && sprites.items[spriteName]) {
            const itemSprite = sprites.items[spriteName];
            img = config.isAnimated && Array.isArray(itemSprite) ? itemSprite[0] : itemSprite;
        }

        const isImageSafe = img && 
                            img.complete && 
                            typeof img.naturalWidth === 'number' && 
                            img.naturalWidth > 0 && 
                            img.naturalHeight > 0;

        if (isImageSafe) {
            // 🌟 モンスターカードかどうかの判定（フィールド側と完全に統一）
            const isMonsterCard = eff.cardId || (eff.type && eff.type.toLowerCase().startsWith('monster'));

            if (isMonsterCard) {
                // --- 🃏 吸い込み中のモンスターカード（図鑑＆フィールドと完全同一のランク別プレミアムデザイン） ---
                ctx.imageSmoothingEnabled = false; // ドット絵をシャープに保つ

                const cardW = 32;  
                const cardH = 44;

                const cardX = -cardW / 2;
                const cardY = -cardH / 2;
                const cutSize = 5;  
                const outerRadius = 2;  

                // 📐 角丸付き斜めカットパス生成関数（図鑑・フィールドと完全共通）
                const makeRoundedBevelPath = (x, y, w, h, cut, r) => {
                    ctx.beginPath();
                    ctx.moveTo(x, y + cut);
                    ctx.lineTo(x + cut, y);
                    ctx.lineTo(x + w - r, y);
                    ctx.arcTo(x + w, y, x + w, y + r, r);
                    ctx.lineTo(x + w, y + h - r);
                    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
                    ctx.lineTo(x + r, y + h);
                    ctx.arcTo(x, y + h, x, y + h - r, r);
                    ctx.closePath();
                };

                const rank = eff.cardRank || 1;

                // 🌟 【図鑑・フィールドと完全共通のランク別カラーテーマ定義】
                let theme = {
                    glowColor: "#f59e0b",      
                    lightBorder: "#fef08a",    
                    gradTop: "#fde047",        
                    gradMid: "#eab308",        
                    gradBottom: "#a16207",     
                    innerTop: "#fef3c7",       
                    innerMid: "#fde68a",       
                    innerBottom: "#d1c4a9",
                    isDiamond: false,
                    isPlatinum: false,
                    isRainbow: false
                };

                if (rank === 1) {
                    theme = { glowColor: "#b45309", lightBorder: "#fed7aa", gradTop: "#fb923c", gradMid: "#c2410c", gradBottom: "#7c2d12", innerTop: "#ffedd5", innerMid: "#fed7aa", innerBottom: "#c2410c", isDiamond: false, isPlatinum: false, isRainbow: false };
                } else if (rank === 2) {
                    theme = { glowColor: "#94a3b8", lightBorder: "#e2e8f0", gradTop: "#cbd5e1", gradMid: "#64748b", gradBottom: "#334155", innerTop: "#f1f5f9", innerMid: "#cbd5e1", innerBottom: "#64748b", isDiamond: false, isPlatinum: false, isRainbow: false };
                } else if (rank === 3) {
                    theme = { glowColor: "#f59e0b", lightBorder: "#fef08a", gradTop: "#fde047", gradMid: "#eab308", gradBottom: "#a16207", innerTop: "#fef3c7", innerMid: "#fde68a", innerBottom: "#d1c4a9", isDiamond: false, isPlatinum: false, isRainbow: false };
                } else if (rank === 4) {
                    theme = { glowColor: "#e2e8f0", lightBorder: "#ffffff", gradTop: "#ffffff", gradMid: "#cbd5e1", gradBottom: "#64748b", innerTop: "#ffffff", innerMid: "#e2e8f0", innerBottom: "#cbd5e1", isDiamond: false, isPlatinum: true, isRainbow: false };
                } else if (rank === 5) {
                    theme = { glowColor: "#6ee7b7", lightBorder: "#ffffff", gradTop: "#7dd3fc", gradMid: "#0d9488", gradBottom: "#042f2e", innerTop: "#ffffff", innerMid: "#2dd4bf", innerBottom: "#0f766e", isDiamond: true, isPlatinum: false, isRainbow: false };
                } else if (rank >= 6) {
                    const frameGlobal = typeof frame !== 'undefined' ? frame : 0;
                    const hue = (frameGlobal * 3) % 360;
                    theme = {
                        glowColor: `hsl(${hue}, 100%, 65%)`,
                        lightBorder: "#ffffff",
                        gradTop: `hsl(${hue}, 90%, 75%)`,
                        gradMid: `hsl(${(hue + 60) % 360}, 90%, 50%)`,
                        gradBottom: `hsl(${(hue + 120) % 360}, 90%, 30%)`,
                        innerTop: "#ffffff",
                        innerMid: `hsl(${hue}, 70%, 90%)`,
                        innerBottom: `hsl(${(hue + 60) % 360}, 50%, 80%)`,
                        isDiamond: false,
                        isPlatinum: false,
                        isRainbow: true
                    };
                }

                // 0. 外側の輝き・グロー演出（フィールド描画と完全同期）
                ctx.save();
                ctx.strokeStyle = theme.glowColor;
                ctx.lineWidth = 3.5;
                ctx.globalAlpha = 0.35;
                makeRoundedBevelPath(cardX - 1, cardY - 1, cardW + 2, cardH + 2, cutSize + 1, outerRadius + 1);
                ctx.stroke();

                ctx.lineWidth = 2;
                ctx.globalAlpha = 0.6;
                makeRoundedBevelPath(cardX - 0.5, cardY - 0.5, cardW + 1, cardH + 1, cutSize, outerRadius);
                ctx.stroke();
                ctx.restore();

                // 1. フレーム（枠）のグラデーション描画
                const frameGrad = ctx.createLinearGradient(cardX, cardY, cardX, cardY + cardH);
                if (theme.isRainbow) {
                    frameGrad.addColorStop(0.00, "rgba(255, 120, 120, 1.0)");
                    frameGrad.addColorStop(0.16, "rgba(255, 200, 90,  1.0)");
                    frameGrad.addColorStop(0.33, "rgba(255, 255, 120, 1.0)");
                    frameGrad.addColorStop(0.50, "rgba(90,  255, 150, 1.0)");
                    frameGrad.addColorStop(0.66, "rgba(90,  230, 255, 1.0)");
                    frameGrad.addColorStop(0.83, "rgba(200, 120, 255, 1.0)");
                    frameGrad.addColorStop(1.00, "rgba(255, 120, 210, 1.0)");
                } else if (theme.isDiamond) {
                    frameGrad.addColorStop(0.00, "#7dd3fc");
                    frameGrad.addColorStop(0.50, "#0284c7");
                    frameGrad.addColorStop(1.00, "#0369a1");
                } else {
                    frameGrad.addColorStop(0, theme.gradTop); 
                    frameGrad.addColorStop(0.5, theme.gradMid); 
                    frameGrad.addColorStop(1, theme.gradBottom); 
                }
                
                ctx.fillStyle = frameGrad;
                makeRoundedBevelPath(cardX, cardY, cardW, cardH, cutSize, outerRadius);
                ctx.fill();

                ctx.lineWidth = 1.0;
                ctx.strokeStyle = theme.lightBorder;
                makeRoundedBevelPath(cardX, cardY, cardW, cardH, cutSize, outerRadius);
                ctx.stroke();

                // 2. 内側エリアの生成
                const innerMargin = 1.5; 
                const innerX = cardX + innerMargin;
                const innerY = cardY + innerMargin;
                const innerW = cardW - innerMargin * 2;
                const innerH = cardH - innerMargin * 2;
                const innerCut = Math.max(0, cutSize - innerMargin);
                const innerRadius = Math.max(0, outerRadius - innerMargin);

                const makeInnerRoundedBevelPath = (x, y, w, h, cut, r) => {
                    ctx.beginPath();
                    if (cut > 0) {
                        ctx.moveTo(x, y + cut);
                        ctx.lineTo(x + cut, y);
                    } else {
                        ctx.moveTo(x, y);
                    }
                    ctx.lineTo(x + w - r, y);
                    if (r > 0) ctx.arcTo(x + w, y, x + w, y + r, r);
                    else ctx.lineTo(x+w,y);
                    ctx.lineTo(x + w, y + h - r);
                    if (r > 0) ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
                    else ctx.lineTo(x+w,y+h);
                    ctx.lineTo(x + r, y + h);
                    if (r > 0) ctx.arcTo(x, y + h, x, y + h - r, r);
                    else ctx.lineTo(x,y+h);
                    ctx.closePath();
                };

                const innerGrad = ctx.createLinearGradient(innerX + innerW, innerY, innerX, innerY + innerH);
                if (theme.isRainbow) {
                    innerGrad.addColorStop(0.00, "rgba(255, 120, 120, 1.0)");
                    innerGrad.addColorStop(0.16, "rgba(255, 200, 90,  1.0)");
                    innerGrad.addColorStop(0.33, "rgba(255, 255, 120, 1.0)");
                    innerGrad.addColorStop(0.50, "rgba(90,  255, 150, 1.0)");
                    innerGrad.addColorStop(0.66, "rgba(90,  230, 255, 1.0)");
                    innerGrad.addColorStop(0.83, "rgba(200, 120, 255, 1.0)");
                    innerGrad.addColorStop(1.00, "rgba(255, 120, 210, 1.0)");
                } else if (theme.isDiamond) {
                    innerGrad.addColorStop(0.00, "#e0f2fe");
                    innerGrad.addColorStop(0.25, "#bae6fd");
                    innerGrad.addColorStop(0.50, "#38bdf8");
                    innerGrad.addColorStop(0.75, "#0284c7");
                    innerGrad.addColorStop(1.00, "#0369a1");
                } else {
                    innerGrad.addColorStop(0, theme.innerTop); 
                    innerGrad.addColorStop(0.5, theme.innerMid); 
                    innerGrad.addColorStop(1, theme.innerBottom);    
                }
                
                ctx.fillStyle = innerGrad;
                makeInnerRoundedBevelPath(innerX, innerY, innerW, innerH, innerCut, innerRadius);
                ctx.fill();

                // 3. モンスター画像描画（クリッピング ＆ 左右反転 ＆ フィールドと同一のスケーリング）
                ctx.save();
                makeInnerRoundedBevelPath(innerX, innerY, innerW, innerH, innerCut, innerRadius);
                ctx.clip();

                const imgWidth = img.naturalWidth || img.width;
                const imgHeight = img.naturalHeight || img.height;
                const imgAspect = imgWidth / imgHeight;

                const centerX_img = Math.round(innerX + innerW / 2);
                const centerY_img = Math.round(innerY + innerH / 2);
                ctx.translate(centerX_img, centerY_img);
                ctx.scale(-1, 1); // 左右反転

                const baseSize = Math.min(innerW, innerH);
                let drawImgW, drawImgH;
                if (imgAspect > 1) {
                    drawImgW = Math.round(baseSize * 1.35);
                    drawImgH = Math.round(drawImgW / imgAspect);
                } else if (imgAspect < 1) {
                    drawImgH = Math.round(baseSize * 1.40);
                    drawImgW = Math.round(drawImgH * imgAspect);
                } else {
                    drawImgW = Math.round(baseSize * 1.35);
                    drawImgH = Math.round(baseSize * 1.35);
                }

                ctx.drawImage(
                    img, 
                    -Math.round(drawImgW / 2), 
                    -Math.round(drawImgH / 2), 
                    drawImgW, 
                    drawImgH
                );

                ctx.restore(); // クリッピング・反転の復元

                // ==========================================
                // ★ ダイヤモンド専用：太くまろやかに広がる光の帯
                // ==========================================
                if (theme.isDiamond) {
                    ctx.save();
                    makeInnerRoundedBevelPath(innerX, innerY, innerW, innerH, innerCut, innerRadius);
                    ctx.clip();

                    const shineGrad = ctx.createLinearGradient(innerX + innerW * 0.9, innerY + innerH * 0.1, innerX + innerW * 0.1, innerY + innerH * 0.9);
                    shineGrad.addColorStop(0.00, "rgba(255, 255, 255, 0.0)");
                    shineGrad.addColorStop(0.25, "rgba(255, 255, 255, 0.02)");
                    shineGrad.addColorStop(0.40, "rgba(255, 255, 255, 0.30)"); 
                    shineGrad.addColorStop(0.50, "rgba(255, 255, 255, 0.60)"); 
                    shineGrad.addColorStop(0.60, "rgba(255, 255, 255, 0.30)"); 
                    shineGrad.addColorStop(0.75, "rgba(255, 255, 255, 0.02)");
                    shineGrad.addColorStop(1.00, "rgba(255, 255, 255, 0.0)");

                    ctx.fillStyle = shineGrad;
                    ctx.fillRect(innerX, innerY, innerW, innerH);
                    ctx.restore();
                }

                // ==========================================
                // ★ ランク6（レインボー）専用：ほんのりと気高い最高峰オーラ
                // ==========================================
                if (theme.isRainbow) {
                    ctx.save();
                    ctx.shadowColor = "rgba(255, 255, 255, 0.7)"; 
                    ctx.shadowBlur = 18;                          
                    ctx.shadowOffsetX = 0;
                    ctx.shadowOffsetY = 0;

                    makeInnerRoundedBevelPath(innerX, innerY, innerW, innerH, innerCut, innerRadius);
                    ctx.strokeStyle = "rgba(255, 255, 255, 0.45)"; 
                    ctx.lineWidth = 1.0;
                    ctx.stroke();
                    ctx.restore();
                }

                // ==========================================
                // ★ プラチナ専用：ほんのちょっぴり白い上品な光沢
                // ==========================================
                if (theme.isPlatinum) {
                    ctx.save();
                    makeInnerRoundedBevelPath(innerX, innerY, innerW, innerH, innerCut, innerRadius);
                    ctx.clip();

                    const platShine = ctx.createLinearGradient(innerX, innerY, innerX + innerW, innerY + innerH);
                    platShine.addColorStop(0.00, "rgba(255, 255, 255, 0.35)"); 
                    platShine.addColorStop(0.35, "rgba(255, 255, 255, 0.45)"); 
                    platShine.addColorStop(0.55, "rgba(255, 255, 255, 0.10)");
                    platShine.addColorStop(1.00, "rgba(255, 255, 255, 0.0)");

                    ctx.fillStyle = platShine;
                    ctx.fillRect(innerX, innerY, innerW, innerH);
                    ctx.restore();
                }

                // 4. カード表面のツヤ（ハイライト反射）
                ctx.save();
                makeRoundedBevelPath(cardX, cardY, cardW, cardH, cutSize, outerRadius);
                ctx.clip();

                const sheenGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
                sheenGrad.addColorStop(0, "rgba(255, 255, 255, 0.40)"); 
                sheenGrad.addColorStop(0.3, "rgba(255, 255, 255, 0.0)");
                sheenGrad.addColorStop(1, "rgba(255, 255, 255, 0.0)");

                ctx.fillStyle = sheenGrad;
                ctx.fillRect(cardX, cardY, cardW, cardH);
                ctx.restore();

            } else {
                // --- 通常アイテムの吸い込み描画 ---
                const nw = img.naturalWidth;
                const nh = img.naturalHeight;
                
                const targetHeight = VIEW_CONFIG.pickupEffect.size; 
                const targetWidth = targetHeight * (nw / nh);
                
                if (showColorEffect) {
                    ctx.save();
                    ctx.shadowBlur = 20;
                    ctx.shadowColor = eff.effectColor;
                    ctx.shadowOffsetX = 0;
                    ctx.shadowOffsetY = 0;
                    ctx.drawImage(img, -targetWidth / 2, -targetHeight / 2, targetWidth, targetHeight);
                    
                    ctx.shadowBlur = 5;
                    ctx.drawImage(img, -targetWidth / 2, -targetHeight / 2, targetWidth, targetHeight);
                    ctx.restore();
                } else {
                    ctx.drawImage(img, -targetWidth / 2, -targetHeight / 2, targetWidth, targetHeight);
                }
            }
        } else {
            // 💡 画像未ロード時の安全フォールバック（金色の四角形）
            ctx.fillStyle = "#ffd700";
            ctx.fillRect(-8, -8, 16, 16);
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
    if (typeof displayExp === 'undefined') displayExp = hero.exp;
    const expDiff = (hero.exp || 0) - displayExp;
    if (Math.abs(expDiff) > 0.1) {
        displayExp += expDiff * 0.1;
    } else {
        displayExp = hero.exp;
    }

    const nextMaxExp = hero.maxExp || 200;

    // 配置設定
    const x = 20; 
    const y = 20; 
    const barWidth = 200; 
    const barHeight = 18;
    const panelW = barWidth + 80;
    const panelH = 70;

    // 🌟 角丸の半径（ちょっぴり丸めるための数値：3px）
    const cornerRadius = 3;

    // 🌟 HPバーの一時的な変色（フラグ）のカウントダウン処理
    let isFlashing = false;
    if (hero && hero.hpFlashTimer && hero.hpFlashTimer > 0) {
        isFlashing = true;
        hero.hpFlashTimer--;
    }

    ctx.save();

    // 1. 背景パネル
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.beginPath();
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
    ctx.textBaseline = "alphabetic";
    ctx.fillText(`Lv.${hero.level || 1}`, x + 15, y + 30);

    // ==========================================
    // 3. HPバー
    // ==========================================
    const hpRate = Math.max(0, displayHp / (hero.maxHp || 100));
    const hpBarX = x + 70;
    const hpBarY = y + 15;
    
    // HPバー背景
    ctx.fillStyle = "#222222";
    ctx.beginPath();
    if (ctx.roundRect) {
        ctx.roundRect(hpBarX, hpBarY, barWidth, barHeight, cornerRadius);
    } else {
        ctx.rect(hpBarX, hpBarY, barWidth, barHeight);
    }
    ctx.fill();
    
    // HPバー中身（🌟 回復フラグが立っている間は真っ白に光らせる！）
    const currentHpW = Math.max(0, barWidth * hpRate);
    if (currentHpW > 0) {
        if (isFlashing) {
            ctx.fillStyle = "#ffffff"; // 光っている間は白く変色
        } else {
            ctx.fillStyle = hpRate > 0.3 ? "#2ecc71" : "#e74c3c"; // 通常時の色
        }

        ctx.beginPath();
        if (ctx.roundRect) {
            // 中身の幅が角丸の直径より小さい場合の保険としてMath.maxを使用
            ctx.roundRect(hpBarX, hpBarY, Math.max(cornerRadius, currentHpW), barHeight, cornerRadius);
        } else {
            ctx.rect(hpBarX, hpBarY, currentHpW, barHeight);
        }
        ctx.fill();

        // 光沢ハイライト
        ctx.save();
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(hpBarX, hpBarY, Math.max(cornerRadius, currentHpW), barHeight, cornerRadius);
        } else {
            ctx.rect(hpBarX, hpBarY, currentHpW, barHeight);
        }
        ctx.clip();
        
        ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
        ctx.beginPath();
        ctx.moveTo(hpBarX, hpBarY);
        ctx.lineTo(hpBarX + currentHpW, hpBarY);
        ctx.lineTo(hpBarX + currentHpW, hpBarY + (barHeight / 2.5));
        ctx.lineTo(hpBarX, hpBarY + (barHeight / 2.5));
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }
    
    // HPバー枠線
    ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (ctx.roundRect) {
        ctx.roundRect(hpBarX, hpBarY, barWidth, barHeight, cornerRadius);
    } else {
        ctx.rect(hpBarX, hpBarY, barWidth, barHeight);
    }
    ctx.stroke();

    // 10分割目盛り
    ctx.strokeStyle = "rgba(0, 0, 0, 0.4)";
    ctx.lineWidth = 1;
    const hpTickStart = hpBarY + (barHeight / 2);
    for (let i = 1; i < 10; i++) {
        const tickX = hpBarX + (barWidth / 10) * i;
        ctx.beginPath();
        ctx.moveTo(tickX, hpTickStart);
        ctx.lineTo(tickX, hpBarY + barHeight);
        ctx.stroke();
    }
    
    // HPテキスト
    ctx.fillStyle = "#fff";
    ctx.font = "bold 12px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(0, 0, 0, 0.7)";
    ctx.shadowBlur = 3;
    ctx.fillText(`${Math.floor(hero.hp)} / ${hero.maxHp}`, hpBarX + barWidth / 2, hpBarY + barHeight / 2);
    ctx.shadowBlur = 0;

    // ==========================================
    // 4. EXPバー
    // ==========================================
    const expRate = Math.min(1, displayExp / nextMaxExp); 
    const expBarH = barHeight - 4;
    const expBarY = y + 40;
    
    // EXP背景
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#222222";
    ctx.beginPath();
    if (ctx.roundRect) {
        ctx.roundRect(hpBarX, expBarY, barWidth, expBarH, cornerRadius);
    } else {
        ctx.rect(hpBarX, expBarY, barWidth, expBarH);
    }
    ctx.fill();
    
    // EXP中身
    const currentExpW = Math.max(0, barWidth * expRate);
    if (currentExpW > 0) {
        ctx.fillStyle = "#f1c40f"; 
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(hpBarX, expBarY, Math.max(cornerRadius, currentExpW), expBarH, cornerRadius);
        } else {
            ctx.rect(hpBarX, expBarY, currentExpW, expBarH);
        }
        ctx.fill();

        // 光沢ハイライト
        ctx.save();
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(hpBarX, expBarY, Math.max(cornerRadius, currentExpW), expBarH, cornerRadius);
        } else {
            ctx.rect(hpBarX, expBarY, currentExpW, expBarH);
        }
        ctx.clip();
        
        ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
        ctx.beginPath();
        ctx.moveTo(hpBarX, expBarY);
        ctx.lineTo(hpBarX + currentExpW, expBarY);
        ctx.lineTo(hpBarX + currentExpW, expBarY + (expBarH / 2.5));
        ctx.lineTo(hpBarX, expBarY + (expBarH / 2.5));
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }
    
    // EXP枠線
    ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (ctx.roundRect) {
        ctx.roundRect(hpBarX, expBarY, barWidth, expBarH, cornerRadius);
    } else {
        ctx.rect(hpBarX, expBarY, barWidth, expBarH);
    }
    ctx.stroke();

    // 10分割目盛り
    ctx.strokeStyle = "rgba(0, 0, 0, 0.4)";
    ctx.lineWidth = 1;
    const expTickStart = expBarY + (expBarH / 2);
    for (let i = 1; i < 10; i++) {
        const tickX = hpBarX + (barWidth / 10) * i;
        ctx.beginPath();
        ctx.moveTo(tickX, expTickStart);
        ctx.lineTo(tickX, expBarY + expBarH);
        ctx.stroke();
    }
    
    // EXPラベル
    ctx.fillStyle = "#fff";
    ctx.font = "bold 10px Arial";
    ctx.shadowColor = "rgba(0, 0, 0, 0.7)";
    ctx.shadowBlur = 3;
    ctx.fillText("EXP", hpBarX - 30, expBarY + 11);

    // EXPテキスト
    const expPercent = Math.min(100, (displayExp / nextMaxExp) * 100).toFixed(1);
    ctx.font = "bold 11px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`${Math.floor(displayExp)} / ${nextMaxExp} (${expPercent}%)`, hpBarX + barWidth / 2, expBarY + expBarH / 2);
    ctx.shadowBlur = 0;

    ctx.restore();
    
    // 🌟 アラートタイマーが動いていたら、画面中央に文字を浮かび上がらせる
    if (typeof window.healAlertTimer !== 'undefined' && window.healAlertTimer > 0) {
        window.healAlertTimer--; // 1フレームずつ減らす

        ctx.save();
        ctx.font = "bold 24px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        // 画面の中央あたりの座標（あるいはキャラの頭上など）
        const centerX = ctx.canvas.width / 2;
        const centerY = ctx.canvas.height / 2 - 50; // 少し上に配置

        // ふんわり上に浮かび上がる演出（タイマーに合わせてY座標を上にずらす）
        const floatOffsetY = (60 - window.healAlertTimer) * 0.5;

        // 文字のフチ（黒）
        ctx.fillStyle = "black";
        ctx.fillText(window.healAlertText, centerX, centerY - floatOffsetY);

        // 文字本体（鮮やかな黄緑色など）
        ctx.fillStyle = "#00ff66";
        ctx.fillText(window.healAlertText, centerX, centerY - floatOffsetY);

        ctx.restore();
    }
}

socket.on('player_healed', (data) => {
    if (typeof hero !== 'undefined' && hero) {
        hero.hp = data.hp;
        
        // 既存の文字用アラート
        //window.healAlertText = `+${data.healAmount} HP RECOVERED!`;
        //window.healAlertTimer = 60; 

        // 🌟 HPバーを一時的に変色させるフラグ（60フレーム ＝ 約1秒間持続）
        hero.hpFlashTimer = 60; 
    }
});

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
function drawPlayerHP20260913(hero) {
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
// :::DRAW_CHAT_BUBBLE::: 💬 キャラクター頭上の吹き出しレンダリング（位置完全同期版）
// ============================================================
/**
 * 役割：
 * - 動的レイアウト：テキスト幅に応じた流体的な横幅算出
 * - 座標の厳密化：地面・足場の判定（groundExtraOffset）をキャラクター描画と完全に同期
 * - 視覚効果：ドロップシャドウによる背景からの浮遊感と、シャープな枠線
 */
function drawChatBubble(p, text) {
    ctx.save();
    
    // 1. フォント設定とメトリクス取得
    const fontSize = VIEW_CONFIG.chat.fontSize || 12;
    ctx.font = `500 ${fontSize}px 'Segoe UI', sans-serif`;
    const textWidth = ctx.measureText(text).width;

    const paddingX = 14;
    const bw = textWidth + (paddingX * 2);
    const bh = 26;

    // 🌟 2. エモーション描画と同様の「キャラクターの正確な足元・描画Y座標」を計算
    const g = p.model_id !== undefined ? p.model_id : (p.group || 0);
    let footOffset = VIEW_CONFIG.player.visualOffset + (VIEW_CONFIG.groupOffsets[g] || 0);
    if (p.y > VIEW_CONFIG.groundThreshold) {
        footOffset += VIEW_CONFIG.player.groundExtraOffset;
    }
    // キャラクターの頭頂部（あるいはスプライトの上の基準位置）を算出
    const spriteDrawY = p.y + VIEW_CONFIG.player.hitboxH - VIEW_CONFIG.player.drawH + footOffset;

    // 3. 吹き出しの位置決定（configのオフセット量を適用）
    const chatOffsetY = VIEW_CONFIG.chat.offsetY || 65; // 設定値がなければデフォルト65等
    const bx = p.x + 20 - bw / 2;
    const by = spriteDrawY + 70 - bh; // 頭上からさらにオフセット分上に配置

    // 4. 視覚的レイヤー（ドロップシャドウで背景マップから文字を切り離す）
    ctx.shadowColor = "rgba(0, 0, 0, 0.25)";
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 3;

    // 5. 背景パネルと上質な極細の枠線
    ctx.fillStyle = "rgba(255, 255, 255, 0.96)";
    ctx.strokeStyle = "rgba(0, 0, 0, 0.15)";
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, 6);
    ctx.fill();
    ctx.stroke();

    // 6. 以降の描画（しっぽ・文字）にはシャドウを継承させない
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // 7. しっぽ（キャラクターと吹き出しを繋ぐポインター）
    const tailWidth = 8;
    const tailHeight = 5;
    const centerX = bx + bw / 2;
    
    ctx.fillStyle = "rgba(255, 255, 255, 0.96)";
    ctx.beginPath();
    ctx.moveTo(centerX - tailWidth / 2, by + bh);
    ctx.lineTo(centerX + tailWidth / 2, by + bh);
    ctx.lineTo(centerX, by + bh + tailHeight);
    ctx.closePath();
    ctx.fill();

    // 8. テキスト描画（垂直・水平ともに完全な中央揃え）
    ctx.fillStyle = "#222222";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    
    ctx.fillText(text, centerX, by + bh / 2);

    ctx.restore();
}

// ============================================================
// :::LOAD_CATALOG::: 🗄️ DB読み込み・カタログ成形・ステータス計算
// ============================================================
async function loadItemCatalogFromDB() {
    try {
        const formattedCatalog = {};
        
        // 各カテゴリの名簿を構築するための一時的な箱
        const newEquipNames = {};
        const newConsumeNames = {};
        const newEtcNames = {};
        const newCardNames = {}; // 🌟 モンスターカード名簿用の箱

        // itemCategoriesを構築するための一時的な箱
        const newItemCategories = {};

        // 画像パス構築のための一時的な箱
        const newItemImages = {};

        // 解説文構築のための一時的な箱
        const newItemDescriptions = {};

        // --- A. 🛡️ 装備品 (item_equip_catalog) の読み込み ---
        const [equipResults] = await pool.query("SELECT * FROM item_equip_catalog");
        equipResults.forEach(row => {
            formattedCatalog[row.item_id] = {
                ...row,
                displayName: row.display_name || row.name,
                mainCategory: 'EQUIP', 
                isTradeable: Boolean(row.isTradeable),
                int: row.int 
            };

            if (row.name && row.display_name) {
                newEquipNames[row.name] = row.display_name;
            }

            if (row.name) {
                newItemCategories[row.name] = "EQUIP";
                newItemImages[row.name] = row.image_name ? `/item_assets/${row.image_name}.png` : `/item_assets/${row.name}.png`;
                newItemDescriptions[row.name] = row.description || "特別な効果はないようだ。";
            }
        });

        // --- B. 💊 消費アイテム (item_consume_catalog) の読み込み ---
        const [consumeResults] = await pool.query("SELECT * FROM item_consume_catalog");
        consumeResults.forEach(row => {
            formattedCatalog[row.item_id] = {
                ...row,
                displayName: row.display_name || row.name,
                mainCategory: 'CONSUME',
                isTradeable: row.isTradeable !== undefined ? Boolean(row.isTradeable) : true
            };

            if (row.name && row.display_name) {
                newConsumeNames[row.name] = row.display_name;
            }

            if (row.name) {
                newItemCategories[row.name] = "USE";
                newItemImages[row.name] = row.image_name ? `/item_assets/${row.image_name}.png` : `/item_assets/${row.name}.png`;
                newItemDescriptions[row.name] = row.description || "特別な効果はないようだ。";
            }
        });

        // --- C. 🍁 ETCアイテム (item_etc_catalog) の読み込み ---
        const [etcResults] = await pool.query("SELECT * FROM item_etc_catalog");
        etcResults.forEach(row => {
            formattedCatalog[row.item_id] = {
                ...row,
                displayName: row.display_name || row.name,
                mainCategory: 'ETC',
                isTradeable: row.isTradeable !== undefined ? Boolean(row.isTradeable) : true
            };

            if (row.name && row.display_name) {
                newEtcNames[row.name] = row.display_name;
            }

            if (row.name) {
                newItemCategories[row.name] = "ETC";
                newItemImages[row.name] = row.image_name ? `/item_assets/${row.image_name}.png` : `/item_assets/${row.name}.png`;
                newItemDescriptions[row.name] = row.description || "特別な効果はないようだ。";
            }
        });
        
        // --- D. 🃏 モンスターカード (monster_card_catalog) の読み込み ---
        const [cardResults] = await pool.query("SELECT * FROM monster_card_catalog");
        console.log("🔍 DBから取得したカード一覧:", cardResults);

        cardResults.forEach(row => {
            formattedCatalog[row.item_id] = {
                ...row,
                displayName: row.display_name || row.monster_key,
                mainCategory: 'MONSTER_CARD',
                isTradeable: true
            };

            if (row.monster_key && row.display_name) {
                newCardNames[row.monster_key] = row.display_name;
            }

            if (row.monster_key) {
                // 🌟 モンスターのキー（例: 'monster1' -> 'Monster1'）に変換してご指定のパスを組み立て
                const capitalizedKey = row.monster_key.charAt(0).toUpperCase() + row.monster_key.slice(1);

                newItemCategories[row.monster_key] = "ETC";
                newItemImages[row.monster_key] = `/card_assets/${capitalizedKey}.png`;
                newItemDescriptions[row.monster_key] = row.description || "モンスターの生態が記された貴重なカード。";
            }
        });

        // 1. メモリ上のカタログと各名簿を更新
        ITEM_CATALOG = formattedCatalog;
        EQUIP_NAMES = newEquipNames;
        CONSUME_NAMES = newConsumeNames;
        ETC_NAMES = newEtcNames;
        ITEM_NAMES_CARD = newCardNames; 

        itemCategories = newItemCategories;
        ITEM_IMAGES = newItemImages;
        ITEM_DESCRIPTIONS = newItemDescriptions;

        SERVER_ITEM_NAMES = {
            ...EQUIP_NAMES,
            ...CONSUME_NAMES,
            ...ETC_NAMES,
            ...newCardNames
        };

        // --- 🌟 ITEM_NAMES 形式を動的に生成 ---
        const nextItemNames = {};
        Object.entries(SERVER_ITEM_NAMES).forEach(([key, disp]) => {
            nextItemNames[key] = {
                disp: disp,
                type: itemCategories[key] || "ETC"
            };
        });
        ITEM_NAMES = nextItemNames;

        // --- 🌟 STATIC_ITEMS 形式を動的に生成（isAnimated: false） ---
        STATIC_ITEMS = Object.fromEntries(
            Object.entries(ITEM_NAMES).map(([key, info]) => [
                key,
                {
                    type: info.type,
                    name: key,
                    display_name: info.disp,
                    src: ITEM_IMAGES[key], 
                    isAnimated: false
                }
            ])
        );

        // --- 🌟 🎬 アニメーション項目の定義 ---
        const ANIMATED_ITEMS = {
            "medal1":     { "type": "ETC", "name": "medal1", "display_name": "メダル1", "src": "item_assets/GoldOne_", "isAnimated": true },
            "money5":     { "type": "ETC", "name": "money5", "display_name": "金メダル1", "src": "item_assets/Gold_", "isAnimated": true },
            "money6":     { "type": "ETC", "name": "money6", "display_name": "銀メダル1", "src": "item_assets/Silver_", "isAnimated": true },
            "normal_gold":   { "type": "ETC", "name": "normal_gold", "display_name": "ふつうのお金", "src": "item_assets/GoldOne_", "isAnimated": true },
            "gold_heart": { "type": "ETC", "name": "gold_heart", "display_name": "ハートメダル(金)1", "src": "item_assets/GoldHeart_", "isAnimated": true },
        };

        // --- 🌟 📦 送信用に合体させる ---
        ITEM_CONFIG = { ...ANIMATED_ITEMS, ...STATIC_ITEMS };

        // --- 🛡️ 描画側 (sprites.items) への流し込み（修正版） ---
        if (typeof sprites !== 'undefined' && sprites.items) {
            Object.keys(ITEM_CONFIG).forEach(key => {
                const data = ITEM_CONFIG[key];
                if (!sprites.items[key]) {
                    const img = new Image();
                    img.src = data.src;
                    
                    if (data.isAnimated) {
                        // アニメーションアイテムは従来通り配列として保持
                        sprites.items[key] = [img]; 
                    } else {
                        // 🌟 通常アイテム・モンスターカードは「単体 Image オブジェクト」として登録！
                        sprites.items[key] = img; 
                    }
                }
            });
        }

        // 2. 合計ステータスの計算を実行
        const targetKeys = ['str', 'dex', 'int', 'luk', 'maxHp', 'maxMp', 'atk', 'matk', 'def'];

        Object.keys(ITEM_CATALOG).forEach(id => {
            const item = ITEM_CATALOG[id];
            
            if (item.mainCategory === 'EQUIP') {
                const sum = targetKeys.reduce((acc, key) => {
                    let val = (item[key] || 0);
                    if (key === 'maxHp' || key === 'maxMp') {
                        val = val / 10;
                    }
                    return acc + val;
                }, 0);
                
                item.totalFirstStats = sum;
            } else {
                item.totalFirstStats = 0;
            }
        });

        console.log("✅ ITEM_CATALOG, ITEM_NAMES, STATIC_ITEMS, ITEM_CONFIG の同期が完了しました");
        console.log(`現在の画像パス登録数: ${Object.keys(ITEM_IMAGES).length}件`);
        console.log(`現在の設定(ITEM_CONFIG)登録数: ${Object.keys(ITEM_CONFIG).length}件`);
        
    } catch (err) {
        console.error("❌ アイテムカタログの取得に失敗:", err);
        throw err;
    }
}


// ============================================================
// :::DRAW_ITEMS::: 💎 フィールド上のドロップアイテム描画 (図鑑カードデザイン完全同期版)
// ============================================================
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

        // 🌟 【完全防御】ITEM_CONFIGに登録がなくても絶対にエラーにさせない
        const rawConfig = ITEM_CONFIG[item.type];
        const config = rawConfig || { 
            name: item.type, 
            display_name: item.name || "不明なアイテム", 
            src: "", 
            isAnimated: false 
        };

        let img = null;
        if (typeof sprites !== 'undefined' && sprites.items && config.name && sprites.items[config.name]) {
            img = config.isAnimated && Array.isArray(sprites.items[config.name])
                    ? sprites.items[config.name][Math.floor((frame + (offset * 10)) / 10) % 10] 
                    : sprites.items[config.name];
        }

        // 🌟 一時的なロード中や壊れた状態の遮断
        const isImageSafe = img && 
                            img.complete && 
                            typeof img.naturalWidth === 'number' && 
                            img.naturalWidth > 0 && 
                            img.naturalHeight > 0;

        if (isImageSafe) {
            // 🌟 モンスターカードかどうかの判定
            const isMonsterCard = item.cardId || (item.type && item.type.toLowerCase().startsWith('monster'));

            if (isMonsterCard) {
                // --- 🃏 フィールド上のモンスターカード（図鑑ウィンドウと完全同一のランク別プレミアムデザイン） ---
                ctx.imageSmoothingEnabled = false; // ドット絵をシャープに保つ

                // 図鑑側の比率（baseItemSize基準の比率）に合わせたサイズ調整
                const cardW = 32;  
                const cardH = 44;

                const cardX = -cardW / 2;
                const cardY = -cardH / 2;
                const cutSize = 5;  
                const outerRadius = 2;  

                // 📐 角丸付き斜めカットパス生成関数（図鑑と共通）
                const makeRoundedBevelPath = (x, y, w, h, cut, r) => {
                    ctx.beginPath();
                    ctx.moveTo(x, y + cut);
                    ctx.lineTo(x + cut, y);
                    ctx.lineTo(x + w - r, y);
                    ctx.arcTo(x + w, y, x + w, y + r, r);
                    ctx.lineTo(x + w, y + h - r);
                    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
                    ctx.lineTo(x + r, y + h);
                    ctx.arcTo(x, y + h, x, y + h - r, r);
                    ctx.closePath();
                };

                const rank = item.cardRank || 1;

                // 🌟 【図鑑と完全共通のランク別カラーテーマ定義】
                let theme = {
                    glowColor: "#f59e0b",      
                    lightBorder: "#fef08a",    
                    gradTop: "#fde047",        
                    gradMid: "#eab308",        
                    gradBottom: "#a16207",     
                    innerTop: "#fef3c7",       
                    innerMid: "#fde68a",       
                    innerBottom: "#d1c4a9",
                    isDiamond: false,
                    isPlatinum: false,
                    isRainbow: false
                };

                if (rank === 1) {
                    theme = { glowColor: "#b45309", lightBorder: "#fed7aa", gradTop: "#fb923c", gradMid: "#c2410c", gradBottom: "#7c2d12", innerTop: "#ffedd5", innerMid: "#fed7aa", innerBottom: "#c2410c", isDiamond: false, isPlatinum: false, isRainbow: false };
                } else if (rank === 2) {
                    theme = { glowColor: "#94a3b8", lightBorder: "#e2e8f0", gradTop: "#cbd5e1", gradMid: "#64748b", gradBottom: "#334155", innerTop: "#f1f5f9", innerMid: "#cbd5e1", innerBottom: "#64748b", isDiamond: false, isPlatinum: false, isRainbow: false };
                } else if (rank === 3) {
                    theme = { glowColor: "#f59e0b", lightBorder: "#fef08a", gradTop: "#fde047", gradMid: "#eab308", gradBottom: "#a16207", innerTop: "#fef3c7", innerMid: "#fde68a", innerBottom: "#d1c4a9", isDiamond: false, isPlatinum: false, isRainbow: false };
                } else if (rank === 4) {
                    theme = { glowColor: "#e2e8f0", lightBorder: "#ffffff", gradTop: "#ffffff", gradMid: "#cbd5e1", gradBottom: "#64748b", innerTop: "#ffffff", innerMid: "#e2e8f0", innerBottom: "#cbd5e1", isDiamond: false, isPlatinum: true, isRainbow: false };
                } else if (rank === 5) {
                    theme = { glowColor: "#6ee7b7", lightBorder: "#ffffff", gradTop: "#7dd3fc", gradMid: "#0d9488", gradBottom: "#042f2e", innerTop: "#ffffff", innerMid: "#2dd4bf", innerBottom: "#0f766e", isDiamond: true, isPlatinum: false, isRainbow: false };
                } else if (rank >= 6) {
                    const hue = (frame * 3) % 360;
                    theme = {
                        glowColor: `hsl(${hue}, 100%, 65%)`,
                        lightBorder: "#ffffff",
                        gradTop: `hsl(${hue}, 90%, 75%)`,
                        gradMid: `hsl(${(hue + 60) % 360}, 90%, 50%)`,
                        gradBottom: `hsl(${(hue + 120) % 360}, 90%, 30%)`,
                        innerTop: "#ffffff",
                        innerMid: `hsl(${hue}, 70%, 90%)`,
                        innerBottom: `hsl(${(hue + 60) % 360}, 50%, 80%)`,
                        isDiamond: false,
                        isPlatinum: false,
                        isRainbow: true
                    };
                }

                // 0. 外側の輝き・グロー演出（図鑑と同等）
                ctx.save();
                ctx.strokeStyle = theme.glowColor;
                ctx.lineWidth = 3.5;
                ctx.globalAlpha = 0.35;
                makeRoundedBevelPath(cardX - 1, cardY - 1, cardW + 2, cardH + 2, cutSize + 1, outerRadius + 1);
                ctx.stroke();

                ctx.lineWidth = 2;
                ctx.globalAlpha = 0.6;
                makeRoundedBevelPath(cardX - 0.5, cardY - 0.5, cardW + 1, cardH + 1, cutSize, outerRadius);
                ctx.stroke();
                ctx.restore();

                // 1. フレーム（枠）のグラデーション描画
                const frameGrad = ctx.createLinearGradient(cardX, cardY, cardX, cardY + cardH);
                if (theme.isRainbow) {
                    frameGrad.addColorStop(0.00, "rgba(255, 120, 120, 1.0)");
                    frameGrad.addColorStop(0.16, "rgba(255, 200, 90,  1.0)");
                    frameGrad.addColorStop(0.33, "rgba(255, 255, 120, 1.0)");
                    frameGrad.addColorStop(0.50, "rgba(90,  255, 150, 1.0)");
                    frameGrad.addColorStop(0.66, "rgba(90,  230, 255, 1.0)");
                    frameGrad.addColorStop(0.83, "rgba(200, 120, 255, 1.0)");
                    frameGrad.addColorStop(1.00, "rgba(255, 120, 210, 1.0)");
                } else if (theme.isDiamond) {
                    frameGrad.addColorStop(0.00, "#7dd3fc");
                    frameGrad.addColorStop(0.50, "#0284c7");
                    frameGrad.addColorStop(1.00, "#0369a1");
                } else {
                    frameGrad.addColorStop(0, theme.gradTop); 
                    frameGrad.addColorStop(0.5, theme.gradMid); 
                    frameGrad.addColorStop(1, theme.gradBottom); 
                }
                
                ctx.fillStyle = frameGrad;
                makeRoundedBevelPath(cardX, cardY, cardW, cardH, cutSize, outerRadius);
                ctx.fill();

                ctx.lineWidth = 1.0;
                ctx.strokeStyle = theme.lightBorder;
                makeRoundedBevelPath(cardX, cardY, cardW, cardH, cutSize, outerRadius);
                ctx.stroke();

                // 2. 内側エリアの生成
                const innerMargin = 1.5; 
                const innerX = cardX + innerMargin;
                const innerY = cardY + innerMargin;
                const innerW = cardW - innerMargin * 2;
                const innerH = cardH - innerMargin * 2;
                const innerCut = Math.max(0, cutSize - innerMargin);
                const innerRadius = Math.max(0, outerRadius - innerMargin);

                const makeInnerRoundedBevelPath = (x, y, w, h, cut, r) => {
                    ctx.beginPath();
                    if (cut > 0) {
                        ctx.moveTo(x, y + cut);
                        ctx.lineTo(x + cut, y);
                    } else {
                        ctx.moveTo(x, y);
                    }
                    ctx.lineTo(x + w - r, y);
                    if (r > 0) ctx.arcTo(x + w, y, x + w, y + r, r);
                    else ctx.lineTo(x+w,y);
                    ctx.lineTo(x + w, y + h - r);
                    if (r > 0) ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
                    else ctx.lineTo(x+w,y+h);
                    ctx.lineTo(x + r, y + h);
                    if (r > 0) ctx.arcTo(x, y + h, x, y + h - r, r);
                    else ctx.lineTo(x,y+h);
                    ctx.closePath();
                };

                const innerGrad = ctx.createLinearGradient(innerX + innerW, innerY, innerX, innerY + innerH);
                if (theme.isRainbow) {
                    innerGrad.addColorStop(0.00, "rgba(255, 120, 120, 1.0)");
                    innerGrad.addColorStop(0.16, "rgba(255, 200, 90,  1.0)");
                    innerGrad.addColorStop(0.33, "rgba(255, 255, 120, 1.0)");
                    innerGrad.addColorStop(0.50, "rgba(90,  255, 150, 1.0)");
                    innerGrad.addColorStop(0.66, "rgba(90,  230, 255, 1.0)");
                    innerGrad.addColorStop(0.83, "rgba(200, 120, 255, 1.0)");
                    innerGrad.addColorStop(1.00, "rgba(255, 120, 210, 1.0)");
                } else if (theme.isDiamond) {
                    innerGrad.addColorStop(0.00, "#e0f2fe");
                    innerGrad.addColorStop(0.25, "#bae6fd");
                    innerGrad.addColorStop(0.50, "#38bdf8");
                    innerGrad.addColorStop(0.75, "#0284c7");
                    innerGrad.addColorStop(1.00, "#0369a1");
                } else {
                    innerGrad.addColorStop(0, theme.innerTop); 
                    innerGrad.addColorStop(0.5, theme.innerMid); 
                    innerGrad.addColorStop(1, theme.innerBottom);    
                }
                
                ctx.fillStyle = innerGrad;
                makeInnerRoundedBevelPath(innerX, innerY, innerW, innerH, innerCut, innerRadius);
                ctx.fill();

                // 3. モンスター画像描画（クリッピング ＆ 左右反転 ＆ 図鑑準拠のスケーリング）
                ctx.save();
                makeInnerRoundedBevelPath(innerX, innerY, innerW, innerH, innerCut, innerRadius);
                ctx.clip();

                const imgWidth = img.naturalWidth || img.width;
                const imgHeight = img.naturalHeight || img.height;
                const imgAspect = imgWidth / imgHeight;

                const centerX_img = Math.round(innerX + innerW / 2);
                const centerY_img = Math.round(innerY + innerH / 2);
                ctx.translate(centerX_img, centerY_img);
                ctx.scale(-1, 1); // 左右反転

                const baseSize = Math.min(innerW, innerH);
                let drawImgW, drawImgH;
                if (imgAspect > 1) {
                    drawImgW = Math.round(baseSize * 1.35);
                    drawImgH = Math.round(drawImgW / imgAspect);
                } else if (imgAspect < 1) {
                    drawImgH = Math.round(baseSize * 1.40);
                    drawImgW = Math.round(drawImgH * imgAspect);
                } else {
                    drawImgW = Math.round(baseSize * 1.35);
                    drawImgH = Math.round(baseSize * 1.35);
                }

                ctx.drawImage(
                    img, 
                    -Math.round(drawImgW / 2), 
                    -Math.round(drawImgH / 2), 
                    drawImgW, 
                    drawImgH
                );

                ctx.restore(); // クリッピング・反転の復元

                // ==========================================
                // ★ ダイヤモンド専用：太くまろやかに広がる光の帯
                // ==========================================
                if (theme.isDiamond) {
                    ctx.save();
                    makeInnerRoundedBevelPath(innerX, innerY, innerW, innerH, innerCut, innerRadius);
                    ctx.clip();

                    const shineGrad = ctx.createLinearGradient(innerX + innerW * 0.9, innerY + innerH * 0.1, innerX + innerW * 0.1, innerY + innerH * 0.9);
                    shineGrad.addColorStop(0.00, "rgba(255, 255, 255, 0.0)");
                    shineGrad.addColorStop(0.25, "rgba(255, 255, 255, 0.02)");
                    shineGrad.addColorStop(0.40, "rgba(255, 255, 255, 0.30)"); 
                    shineGrad.addColorStop(0.50, "rgba(255, 255, 255, 0.60)"); 
                    shineGrad.addColorStop(0.60, "rgba(255, 255, 255, 0.30)"); 
                    shineGrad.addColorStop(0.75, "rgba(255, 255, 255, 0.02)");
                    shineGrad.addColorStop(1.00, "rgba(255, 255, 255, 0.0)");

                    ctx.fillStyle = shineGrad;
                    ctx.fillRect(innerX, innerY, innerW, innerH);
                    ctx.restore();
                }

                // ==========================================
                // ★ ランク6（レインボー）専用：十字を使わない、ほんのりと気高い最高峰オーラ
                // ==========================================
                if (theme.isRainbow) {
                    ctx.save();
                    ctx.shadowColor = "rgba(255, 255, 255, 0.7)"; 
                    ctx.shadowBlur = 18;                          
                    ctx.shadowOffsetX = 0;
                    ctx.shadowOffsetY = 0;

                    makeInnerRoundedBevelPath(innerX, innerY, innerW, innerH, innerCut, innerRadius);
                    ctx.strokeStyle = "rgba(255, 255, 255, 0.45)"; 
                    ctx.lineWidth = 1.0;
                    ctx.stroke();
                    ctx.restore();
                }

                // ==========================================
                // ★ プラチナ専用：ほんのちょっぴり白い上品な光沢
                // ==========================================
                if (theme.isPlatinum) {
                    ctx.save();
                    makeInnerRoundedBevelPath(innerX, innerY, innerW, innerH, innerCut, innerRadius);
                    ctx.clip();

                    const platShine = ctx.createLinearGradient(innerX, innerY, innerX + innerW, innerY + innerH);
                    platShine.addColorStop(0.00, "rgba(255, 255, 255, 0.35)"); 
                    platShine.addColorStop(0.35, "rgba(255, 255, 255, 0.45)"); 
                    platShine.addColorStop(0.55, "rgba(255, 255, 255, 0.10)");
                    platShine.addColorStop(1.00, "rgba(255, 255, 255, 0.0)");

                    ctx.fillStyle = platShine;
                    ctx.fillRect(innerX, innerY, innerW, innerH);
                    ctx.restore();
                }

                // 4. カード表面のツヤ（ハイライト反射）
                ctx.save();
                makeRoundedBevelPath(cardX, cardY, cardW, cardH, cutSize, outerRadius);
                ctx.clip();

                const sheenGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
                sheenGrad.addColorStop(0, "rgba(255, 255, 255, 0.40)"); 
                sheenGrad.addColorStop(0.3, "rgba(255, 255, 255, 0.0)");
                sheenGrad.addColorStop(1, "rgba(255, 255, 255, 0.0)");

                ctx.fillStyle = sheenGrad;
                ctx.fillRect(cardX, cardY, cardW, cardH);
                ctx.restore();

            } else {
                // --- 通常アイテムの描画処理 ---
                const targetHeight = drawSize;
                const targetWidth = targetHeight * (img.naturalWidth / img.naturalHeight);
                
                let glowColor = null;
                if ((item.type === 'sword' || item.type === 'shield') && 
                    item.totalALLStats !== undefined && 
                    item.totalFirstStats !== undefined) {
                    
                    const bonus = item.totalALLStats - item.totalFirstStats;
                    
                    if (bonus >= 30) {
                        glowColor = "#ff0000"; 
                    } else if (bonus >= 25) {
                        glowColor = "#00ff00"; 
                    } else if (bonus >= 20) {
                        glowColor = "#ffff00"; 
                    } else if (bonus >= 15) {
                        glowColor = "#ff00ff"; 
                    } else if (bonus >= 10) {
                        glowColor = "#00ccff"; 
                    }
                }

                ctx.imageSmoothingEnabled = true;

                if (glowColor) {
                    ctx.save();
                    ctx.shadowBlur = 20; 
                    ctx.shadowColor = glowColor;
                    ctx.shadowOffsetX = 0;
                    ctx.shadowOffsetY = 0;
                    ctx.drawImage(img, -targetWidth / 2, -targetHeight / 2, targetWidth, targetHeight);
                    
                    ctx.shadowBlur = 5;
                    ctx.drawImage(img, -targetWidth / 2, -targetHeight / 2, targetWidth, targetHeight);
                    ctx.restore();
                } else {
                    ctx.drawImage(img, -targetWidth / 2, -targetHeight / 2, targetWidth, targetHeight);
                }

                ctx.imageSmoothingEnabled = false;
            }
        } else {
            // 💡 フォールバック（黄色い四角）
            if (item.type && (item.type.toLowerCase().includes('monster') || item.type === 'monster_card' || item.cardId)) {
                console.warn(`⚠️ [Item Fallback Debug] アイテム '${item.type}' (名前: ${item.name}) が黄色い四角で描画されました。`, {
                    configExists: !!rawConfig,
                    configSrc: config.src,
                    imgExists: !!img,
                    imgComplete: img ? img.complete : 'N/A',
                    imgSrc: img ? img.src : 'N/A',
                    naturalWidth: img ? img.naturalWidth : 'N/A',
                    naturalHeight: img ? img.naturalHeight : 'N/A'
                });
            }

            ctx.fillStyle = "#ffd700";
            ctx.fillRect(-8, -8, 16, 16);
        }

        ctx.restore();
    });
}

// --- ホットバー専用のキャッシュ用キャンバス ---
let _hotbarCacheCanvas = null;
let _hotbarCacheCtx = null;
let _lastHotbarStateKey = "";

/**
 * 🎒 ホットバー／ショートカット用インベントリ描画（バッグ側と完全統一の高精細版）
 */
function drawInventoryGrid(ctx, inventory) {
    if (!ctx || !inventory) return;

    const slotSize = 40;
    const padding = 8;
    const startX = 20;
    const startY = 130;
    const totalSlots = 10;
    const slotPadding = 6;

    let mX = (typeof mouseX !== 'undefined') ? mouseX : -1;
    let mY = (typeof mouseY !== 'undefined') ? mouseY : -1;

    // ホバーされているスロットのインデックスを判定
    let hoveredSlotIndex = -1;
    for (let i = 0; i < totalSlots; i++) {
        const x = startX + (slotSize + padding) * i;
        const y = startY;
        if (!window.isDisconnected && mX >= x && mX <= x + slotSize && mY >= y && mY <= y + slotSize) {
            hoveredSlotIndex = i;
            break;
        }
    }

    // キャッシュキーの生成（アイテムの種類、個数、装備状態、レア度、ホバー状態の変化を検知）
    let inventoryStateStr = "";
    for (let i = 0; i < totalSlots; i++) {
        let item = inventory[i];
        if (item && item.type) {
            inventoryStateStr += `${i}:${item.type}_${item.count || 0}_${item.isEquipped ? 1 : 0}_${item.totalALLStats || 0},`;
        } else {
            inventoryStateStr += `${i}:empty,`;
        }
    }
    let currentStateKey = `${inventoryStateStr}_${hoveredSlotIndex}`;

    let dpr = window.devicePixelRatio || 1;
    let gridWidth = totalSlots * slotSize + (totalSlots - 1) * padding + (slotPadding * 2); 
    let gridHeight = slotSize + (slotPadding * 2); 

    if (!_hotbarCacheCanvas) {
        _hotbarCacheCanvas = document.createElement('canvas');
        _hotbarCacheCtx = _hotbarCacheCanvas.getContext('2d');
    }

    if (_hotbarCacheCanvas.width !== gridWidth * dpr || _hotbarCacheCanvas.height !== gridHeight * dpr) {
        _hotbarCacheCanvas.width = gridWidth * dpr;
        _hotbarCacheCanvas.height = gridHeight * dpr;
        _lastHotbarStateKey = "";
    }

    // --- 状態が変わった時だけ裏で重い描画を実行し、キャッシュを更新 ---
    if (currentStateKey !== _lastHotbarStateKey) {
        _lastHotbarStateKey = currentStateKey;

        let bc = _hotbarCacheCtx;
        bc.save();
        bc.setTransform(dpr, 0, 0, dpr, 0, 0);
        bc.imageSmoothingEnabled = true;
        bc.imageSmoothingQuality = 'high';

        bc.clearRect(0, 0, gridWidth, gridHeight);

        const cStartX = slotPadding;
        const cStartY = slotPadding;
        const alreadyDrawn = new Set();

        for (let i = 0; i < totalSlots; i++) {
            const x = cStartX + (slotSize + padding) * i;
            const y = cStartY;

            const itemData = inventory[i];
            const isHovered = (i === hoveredSlotIndex);

            // 🌟 レア度によるグローカラーの判定（アイテム用）
            let glowColor = null;
            if (itemData && itemData.type && (itemData.count || 0) > 0) {
                if ((itemData.type === 'sword' || itemData.type === 'shield') && 
                    itemData.totalALLStats !== undefined && 
                    itemData.totalFirstStats !== undefined) {
                    
                    let bonus = itemData.totalALLStats - itemData.totalFirstStats;
                    if (bonus >= 30) glowColor = "#ff0000";      // 神級
                    else if (bonus >= 25) glowColor = "#00ff00"; // 超伝説
                    else if (bonus >= 20) glowColor = "#ffff00"; // 極上
                    else if (bonus >= 15) glowColor = "#ff00ff"; // 伝説
                    else if (bonus >= 10) glowColor = "#00ccff"; // 希少
                }
            }

            // 🎯 1. スロット背景＆枠：常にレア度カラーを反映させずノーマル（null）で描画
            let cachedSlotImg = getCachedBagSlotImage(slotSize, null, isHovered);
            bc.drawImage(cachedSlotImg, x - slotPadding, y - slotPadding);

            // 2. アイテムがいれば中身を描画
            if (itemData && itemData.type) {
                let type = itemData.type;
                let count = itemData.count || 0;

                if (count > 0) {
                    let category = (typeof itemCategories !== 'undefined') ? itemCategories[type] : null;

                    let isDuplicateETC = false;
                    if (category === 'ETC') {
                        if (alreadyDrawn.has(type)) {
                            isDuplicateETC = true;
                        } else {
                            alreadyDrawn.add(type);
                        }
                    }

                    if (!isDuplicateETC) {
                        let displayImg = null;
                        if (itemData.image) {
                            displayImg = itemData.image;
                        } else if (typeof itemImages !== 'undefined' && itemImages[type]) {
                            displayImg = itemImages[type];
                        } else if (typeof ITEM_CONFIG !== 'undefined' && ITEM_CONFIG[type]) {
                            let config = ITEM_CONFIG[type];
                            displayImg = config.isAnimated ? (config.images ? config.images[0] : null) : config.image;

                            if (!displayImg && config.src) {
                                if (!config._tempImg) {
                                    config._tempImg = new Image();
                                    config._tempImg.crossOrigin = "anonymous";
                                    let baseSrc = config.src;
                                    if (typeof IMAGE_DOMAIN !== 'undefined' && IMAGE_DOMAIN !== "") {
                                        if (baseSrc.startsWith('/') && IMAGE_DOMAIN.endsWith('/')) {
                                            baseSrc = baseSrc.substring(1);
                                        }
                                        baseSrc = IMAGE_DOMAIN + baseSrc;
                                    }
                                    config._tempImg.src = baseSrc;
                                }
                                displayImg = config._tempImg;
                            }
                        }

                        // アイテム画像の描画（🌟 アイテム自体のグロー発光は維持）
                        if (displayImg && displayImg.complete && typeof displayImg.naturalWidth === 'number' && displayImg.naturalWidth > 0) {
                            let m = 5;
                            let imgX = x + m;
                            let imgY = y + m;
                            let imgW = slotSize - m * 2;
                            let imgH = slotSize - m * 2;

                            bc.save();
                            if (glowColor) {
                                bc.shadowBlur = 24; 
                                bc.shadowColor = glowColor;
                                bc.shadowOffsetX = 0;
                                bc.shadowOffsetY = 0;
                                bc.drawImage(displayImg, imgX, imgY, imgW, imgH);

                                bc.shadowBlur = 8;
                                bc.drawImage(displayImg, imgX, imgY, imgW, imgH);
                            } else {
                                bc.shadowBlur = 8;
                                bc.shadowColor = "rgba(255, 255, 255, 0.95)";
                                bc.shadowOffsetX = 0;
                                bc.shadowOffsetY = 0;
                                bc.drawImage(displayImg, imgX, imgY, imgW, imgH);
                                
                                bc.shadowBlur = 3;
                                bc.shadowColor = "rgba(255, 255, 255, 0.8)";
                                bc.drawImage(displayImg, imgX, imgY, imgW, imgH);

                                bc.shadowBlur = 0;
                                bc.drawImage(displayImg, imgX, imgY, imgW, imgH);
                            }
                            bc.restore();

                            // 3. 装備中バッジ（E）
                            if (itemData.isEquipped) {
                                bc.save();
                                const badgeW = 16;
                                const badgeH = 15;
                                const badgeX = x + slotSize - badgeW - 2;
                                const badgeY = y + 2;
                                const radius = 3;

                                bc.fillStyle = 'rgba(10, 15, 25, 0.85)';
                                bc.strokeStyle = '#34d399'; 
                                bc.lineWidth = 1;

                                bc.beginPath();
                                if (bc.roundRect) {
                                    bc.roundRect(badgeX, badgeY, badgeW, badgeH, radius);
                                } else {
                                    bc.rect(badgeX, badgeY, badgeW, badgeH);
                                }
                                bc.fill();
                                bc.stroke();

                                bc.font = 'bold 10px "Segoe UI", sans-serif';
                                bc.fillStyle = '#34d399';
                                bc.textAlign = 'center';
                                bc.textBaseline = 'middle';
                                bc.fillText('E', badgeX + badgeW / 2, badgeY + badgeH / 2 + 0.5);
                                bc.restore();
                            }

                            // 4. 個数表示バッジ
                            const isStackItem = (category === 'ETC' || category === 'USE');
                            if ((isStackItem && count >= 1) || count > 1) {
                                bc.save();
                                let countStr = String(count);
                                let fontSize = countStr.length >= 4 ? 9 : (countStr.length === 3 ? 10 : 11);
                                bc.font = `bold ${fontSize}px 'Segoe UI', sans-serif`;
                                bc.textAlign = "right";
                                bc.textBaseline = "middle";

                                let padX = 5;
                                let badgeW = Math.max(18, countStr.length * 7 + padX * 2);
                                let badgeH = 15;
                                
                                let badgeX = (x + slotSize) - badgeW - 2;
                                let badgeY = (y + slotSize) - badgeH - 2;
                                let radius = 3.5;

                                bc.shadowColor = "rgba(0, 0, 0, 0.4)";
                                bc.shadowBlur = 3;
                                bc.shadowOffsetY = 1;

                                bc.fillStyle = "rgba(10, 15, 25, 0.85)";
                                bc.strokeStyle = "rgba(100, 116, 139, 0.6)";
                                bc.lineWidth = 1;

                                bc.beginPath();
                                if (bc.roundRect) {
                                    bc.roundRect(badgeX, badgeY, badgeW, badgeH, radius);
                                } else {
                                    bc.rect(badgeX, badgeY, badgeW, badgeH);
                                }
                                bc.fill();
                                bc.stroke();

                                bc.shadowBlur = 0;
                                bc.shadowOffsetY = 0;

                                bc.fillStyle = "#ffffff";
                                bc.fillText(countStr, badgeX + badgeW - padX, badgeY + badgeH / 2 + 0.5);
                                bc.restore();
                            }
                        }
                    }
                }
            }
        }
        bc.restore();
    }

    // 🚀 メイン画面への高精細一括描画
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(_hotbarCacheCanvas, 0, 0, gridWidth * dpr, gridHeight * dpr, startX - slotPadding, startY - slotPadding, gridWidth, gridHeight);
    ctx.restore();
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

// スクロールバーのドラッグ状態管理用
let isDraggingScrollbar = false;
let scrollbarDragStartY = 0;
let scrollbarStartScrollY = 0;
let dragStartY = 0;

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
	
    // 🌟 ここでスクロール位置を安全に初期化（未定義なら 0 にする）
    gameWindows.inventory.scrollY = gameWindows.inventory.scrollY || 0;

    // 1. ウィンドウの基本枠を描画
    if (typeof drawSimpleWindow === 'function') {
        drawSimpleWindow("🎒 Items & Equipment", gameWindows.inventory.x, gameWindows.inventory.y, gameWindows.inventory.w, gameWindows.inventory.h);
    }

    // 2. バッグ専用のタブを描画する（装備・消費・ETC）
    drawBagTabs();

    // 3. バッグ専用のアイテムグリッドを描画する
    drawBagGrid();
}

/**
 * 🎒 バッグ専用：タブを描画する関数
 */
function drawBagTabs() {
    if (typeof ctx === 'undefined') return;

    let bagX = gameWindows.inventory.x;
    let bagY = gameWindows.inventory.y;
    
    // タブの定義（bagTabs という独立した変数名）
    let bagTabs = [
        { id: "equip", label: "装備", offsetX: 15 },
        { id: "consume", label: "消費", offsetX: 80 },
        { id: "etc", label: "ETC", offsetX: 145 }
    ];

    let tabY = bagY + 35;
    let tabW = 60;
    let tabH = 22;

    for (let i = 0; i < bagTabs.length; i++) {
        let tab = bagTabs[i];
        let tX = bagX + tab.offsetX;

        // 現在選択中のタブかどうか（currentTab は inventory の設定を利用）
        let isSelected = (gameWindows.inventory.currentTab === tab.id);

        if (isSelected) {
            // 選択中のタブ：少し手前に浮き出るようなリッチな配色
            ctx.fillStyle = "#3b3b4f";
            ctx.fillRect(tX, tabY, tabW, tabH + 2);
            ctx.strokeStyle = "#7a7a9e";
            ctx.strokeRect(tX, tabY, tabW, tabH + 2);
            ctx.fillStyle = "#ffffff";
        } else {
            // 非選択のタブ
            ctx.fillStyle = "#22222f";
            ctx.fillRect(tX, tabY + 2, tabW, tabH - 2);
            ctx.strokeStyle = "#444455";
            ctx.strokeRect(tX, tabY + 2, tabW, tabH - 2);
            ctx.fillStyle = "#9999aa";
        }

        // タブの文字
        ctx.font = "11px sans-serif";
        ctx.fillText(tab.label, tX + 16, tabY + 16);
    }
}

const inventoryWindow = document.getElementById('inventory-window');
const windowHeader = inventoryWindow.querySelector('.window-header');

let isDragging = false;
let startX = 0;
let startY = 0;

// タイトルバーを押した瞬間
windowHeader.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return; // 左クリックのみ反応

    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;

    // 1. 現在の画面上の位置（viewport基準）をそのまま取得
    const rect = inventoryWindow.getBoundingClientRect();

    // 2. position: fixed なので、rect.left / top をそのまま style に代入できる
    inventoryWindow.style.left = `${rect.left}px`;
    inventoryWindow.style.top = `${rect.top}px`;

    // 3. 中央寄せに使っていた transform を解除
    inventoryWindow.style.transform = 'none';

    // 4. 移動計算用の基準位置を保存
    initialLeft = rect.left;
    initialTop = rect.top;

    e.stopPropagation();
    e.preventDefault();
});

// マウスを動かしている最中（画面全体で監視）
document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    // 以前計算した initialLeft/Top を基準に移動
    inventoryWindow.style.left = `${initialLeft + dx}px`;
    inventoryWindow.style.top = `${initialTop + dy}px`;
});

// マウスを離したとき
document.addEventListener('mouseup', () => {
    isDragging = false;
});

// 🎒 スロットの背景・枠・ハイライトをキャッシュするための保持用変数
// varで宣言することで巻き上げ（Hoisting）が効き、定義前に関数から呼ばれてもReferenceErrorになりません
var _cachedBagSlotImages = _cachedBagSlotImages || {};

function getCachedBagSlotImage(slotSize, glowColor, isHovered) {
    const cacheKey = `${slotSize}_${glowColor || 'default'}_${isHovered ? 'h' : 'n'}`;
    if (_cachedBagSlotImages[cacheKey]) {
        return _cachedBagSlotImages[cacheKey];
    }

    // パディング（外側のドロップシャドウやボーダーのはみ出し分を考慮）
    const padding = 6;
    const canvasSize = slotSize + padding * 2;
    
    const canvas = document.createElement('canvas');
    canvas.width = canvasSize;
    canvas.height = canvasSize;
    const ctx2d = canvas.getContext('2d');

    const x = padding;
    const y = padding;

    // --- 1. スロットカラーの決定 ---
    let slotBgColor = "rgba(12, 17, 26, 0.99)";      // デフォルト背景（漆黒）
    let slotCenterColor = "rgba(32, 41, 60, 0.98)";   // デフォルト中央用
    let slotBorderColor = "rgba(71, 85, 105, 0.85)";   // デフォルト枠

    if (glowColor === '#ff0000') { // 神級
        slotBgColor = "rgba(45, 12, 15, 0.95)";
        slotCenterColor = "rgba(85, 25, 32, 0.95)";
        slotBorderColor = "#ff4444";
    } else if (glowColor === '#00ff00') { // 超伝説
        slotBgColor = "rgba(12, 35, 20, 0.95)";
        slotCenterColor = "rgba(25, 75, 42, 0.95)";
        slotBorderColor = "#44ff44";
    } else if (glowColor === '#ffff00') { // 極上
        slotBgColor = "rgba(35, 32, 12, 0.95)";
        slotCenterColor = "rgba(75, 68, 25, 0.95)";
        slotBorderColor = "#ffdd44";
    } else if (glowColor === '#ff00ff') { // 伝説
        slotBgColor = "rgba(35, 12, 35, 0.95)";
        slotCenterColor = "rgba(75, 25, 75, 0.95)";
        slotBorderColor = "#ff44ff";
    } else if (glowColor === '#00ccff') { // 希少
        slotBgColor = "rgba(12, 28, 42, 0.95)";
        slotCenterColor = "rgba(25, 60, 90, 0.95)";
        slotBorderColor = "#44ccff";
    }

    // --- 2. 高級感のあるスロット背景＆多層枠の描画 ---
    ctx2d.save();
    
    // ① 外側のドロップシャドウ
    ctx2d.shadowColor = "rgba(0, 0, 0, 0.7)";
    ctx2d.shadowBlur = 6;
    ctx2d.shadowOffsetX = 0;
    ctx2d.shadowOffsetY = 2;

    // ② 重厚なダークグラデーション
    let slotGrad = ctx2d.createLinearGradient(x, y, x, y + slotSize);
    if (glowColor) {
        slotGrad.addColorStop(0, slotCenterColor);
        slotGrad.addColorStop(1, slotBgColor);
    } else {
        slotGrad.addColorStop(0, "rgba(32, 41, 60, 0.98)");
        slotGrad.addColorStop(1, "rgba(12, 17, 26, 0.99)");
    }
    ctx2d.fillStyle = slotGrad;

    // ③ 上品なメタルボーダー
    ctx2d.strokeStyle = glowColor ? slotBorderColor : "rgba(71, 85, 105, 0.85)";
    ctx2d.lineWidth = glowColor ? 2 : 1.2;

    if (ctx2d.roundRect) {
        ctx2d.beginPath();
        ctx2d.roundRect(x, y, slotSize, slotSize, 4);
        ctx2d.fill();
        ctx2d.stroke();
    } else {
        ctx2d.fillRect(x, y, slotSize, slotSize);
        ctx2d.strokeRect(x, y, slotSize, slotSize);
    }
    ctx2d.restore();

    // --- 3. 物理的な光の反射（トップハイライト＆インナーシャドウ） ---
    ctx2d.save();
    if (ctx2d.roundRect) {
        ctx2d.beginPath();
        ctx2d.roundRect(x + 1, y + 1, slotSize - 2, slotSize - 2, 3);
        ctx2d.clip();
    }

    let topLight = ctx2d.createLinearGradient(x, y, x, y + slotSize * 0.5);
    topLight.addColorStop(0, "rgba(255, 255, 255, 0.22)");
    topLight.addColorStop(1, "rgba(255, 255, 255, 0.0)");
    ctx2d.fillStyle = topLight;
    ctx2d.fillRect(x, y, slotSize, slotSize * 0.5);

;
    let bottomShadow = ctx2d.createLinearGradient(x, y + slotSize * 0.5, x, y + slotSize);
    bottomShadow.addColorStop(0, "rgba(0, 0, 0, 0.0)");
    bottomShadow.addColorStop(1, "rgba(0, 0, 0, 0.45)");
    ctx2d.fillStyle = bottomShadow;
    ctx2d.fillRect(x, y + slotSize * 0.5, slotSize, slotSize * 0.5);

    if (isHovered) {
        ctx2d.fillStyle = "rgba(255, 255, 255, 0.15)";
        ctx2d.fillRect(x, y, slotSize, slotSize);
    }

    ctx2d.restore();

    _cachedBagSlotImages[cacheKey] = canvas;
    return canvas;
}

// --- インベントリ専用のキャッシュ用キャンバス（高解像度対応） ---
let _bagCacheCanvas = null;
let _bagCacheCtx = null;
let _lastBagStateKey = "";

/**
 * 🎒 バッグ専用：アイテムグリッドを描画する関数（高精細・キャッシュ最適化版）
 */
function drawBagGrid() {
    if (typeof ctx === 'undefined') return;

    let bagX = gameWindows.inventory.x;
    let bagY = gameWindows.inventory.y;
    let bagW = gameWindows.inventory.w || 240;
    
    let cols = 5;
    let slotSize = 40;
    let spacing = 5;
    let startX = bagX + 20;
    let startY = bagY + 70;

    let bagSource = (window.hero && window.hero.inventory) ? window.hero.inventory : 
                    ((typeof inventoryVisualBuffer !== 'undefined') ? inventoryVisualBuffer : []);

    let scrollRow = gameWindows.inventory.scrollY || 0;
    let maxVisibleRows = 6;
    let maxTotalSlots = 50;

    let startIndex = scrollRow * cols;
    let endIndex = startIndex + (cols * maxVisibleRows);

    let mX = (typeof mouseX !== 'undefined') ? mouseX : -1;
    let mY = (typeof mouseY !== 'undefined') ? mouseY : -1;

    let goldVal = (window.hero && window.hero.gold) ? window.hero.gold : 0;

    // ホバーインデックスの特定
    let hoveredSlotIndex = -1;
    for (let i = 0; i < maxTotalSlots; i++) {
        if (i < startIndex || i >= endIndex) continue;
        let drawnIdx = i - startIndex;
        let col = drawnIdx % cols;
        let row = Math.floor(drawnIdx / cols);
        let x = startX + col * (slotSize + spacing);
        let y = startY + row * (slotSize + spacing);
        if (!window.isDisconnected && mX >= x && mX <= x + slotSize && mY >= y && mY <= y + slotSize) {
            hoveredSlotIndex = i;
            break;
        }
    }

    let itemsStateStr = bagSource.slice(startIndex, endIndex).map(item => item ? `${item.type}_${item.count}_${item.isEquipped}_${item.totalALLStats || 0}` : 'empty').join(',');
    let currentStateKey = `${scrollRow}_${goldVal}_${itemsStateStr}_${hoveredSlotIndex}`;

    // 🌟 メイン画面のデバイスピクセル比（Retina対応など）を取得して高解像度化
    let dpr = window.devicePixelRatio || 1;
    let cacheWidth = 300;
    let cacheHeight = 400;

    // オフスクリーンキャンバスの初期化（解像度をDPR倍にしてぼやけを防ぐ）
    if (!_bagCacheCanvas) {
        _bagCacheCanvas = document.createElement('canvas');
        _bagCacheCtx = _bagCacheCanvas.getContext('2d');
    }

    if (_bagCacheCanvas.width !== cacheWidth * dpr || _bagCacheCanvas.height !== cacheHeight * dpr) {
        _bagCacheCanvas.width = cacheWidth * dpr;
        _bagCacheCanvas.height = cacheHeight * dpr;
        _lastBagStateKey = ""; // サイズ変更時はキャッシュを強制リフレッシュ
    }

    // --- 状態が変わった時だけ裏で重い描画を実行し、キャッシュを更新 ---
    if (currentStateKey !== _lastBagStateKey) {
        _lastBagStateKey = currentStateKey;
        
        let bc = _bagCacheCtx;
        bc.save();
        
        // DPRにあわせてスケールを調整
        bc.setTransform(dpr, 0, 0, dpr, 0, 0);
        bc.imageSmoothingEnabled = true;
        bc.imageSmoothingQuality = 'high';

        bc.clearRect(0, 0, cacheWidth, cacheHeight);

        let cBagX = 0; 
        let cBagY = 0;
        let cStartX = 20;
        let cStartY = 70;
        let drawnIndex = 0;
        let alreadyDrawn = new Set();
        let padding = 6;

        for (let i = 0; i < maxTotalSlots; i++) {
            let item = bagSource[i];

            if (i < startIndex || i >= endIndex) {
                continue;
            }

            let col = drawnIndex % cols;
            let row = Math.floor(drawnIndex / cols);
            
            let x = cStartX + col * (slotSize + spacing);
            let y = cStartY + row * (slotSize + spacing);

            let isHovered = (i === hoveredSlotIndex);

            // 1. レア度の判定（アイテム側のグローカラー用）
            let glowColor = null;
            if (item && item.type && item.count > 0) {
                if ((item.type === 'sword' || item.type === 'shield') && 
                    item.totalALLStats !== undefined && 
                    item.totalFirstStats !== undefined) {
                    
                    let bonus = item.totalALLStats - item.totalFirstStats;
                    if (bonus >= 30) {
                        glowColor = "#ff0000"; // 神級
                    } else if (bonus >= 25) {
                        glowColor = "#00ff00"; // 超伝説
                    } else if (bonus >= 20) {
                        glowColor = "#ffff00"; // 極上
                    } else if (bonus >= 15) {
                        glowColor = "#ff00ff"; // 伝説
                    } else if (bonus >= 10) {
                        glowColor = "#00ccff"; // 希少
                    }
                }
            }

            // 🌟 2. スロット背景＆枠：常にレア度カラーを反映させずノーマル（null）で描画
            let cachedSlotImg = getCachedBagSlotImage(slotSize, null, isHovered);
            bc.drawImage(cachedSlotImg, x - padding, y - padding);

            // 3. アイテムがいれば中身を描画
            if (item && item.type) {
                let type = item.type;
                let count = item.count || 0;

                if (count > 0) {
                    let category = (typeof itemCategories !== 'undefined') ? itemCategories[type] : null;

                    let isDuplicateETC = false;
                    if (category === 'ETC') {
                        if (alreadyDrawn.has(type)) {
                            isDuplicateETC = true;
                        } else {
                            alreadyDrawn.add(type);
                        }
                    }

                    if (!isDuplicateETC) {
                        let displayImg = null;
                        if (item.image) {
                            displayImg = item.image;
                        } else if (typeof itemImages !== 'undefined' && itemImages[type]) {
                            displayImg = itemImages[type];
                        } else if (typeof ITEM_CONFIG !== 'undefined' && ITEM_CONFIG[type]) {
                            let config = ITEM_CONFIG[type];
                            displayImg = config.isAnimated ? (config.images ? config.images[0] : null) : config.image;

                            if (!displayImg && config.src) {
                                if (!config._tempImg) {
                                    config._tempImg = new Image();
                                    config._tempImg.crossOrigin = "anonymous";
                                    let baseSrc = config.src;
                                    if (typeof IMAGE_DOMAIN !== 'undefined' && IMAGE_DOMAIN !== "") {
                                        if (baseSrc.startsWith('/') && IMAGE_DOMAIN.endsWith('/')) {
                                            baseSrc = baseSrc.substring(1);
                                        }
                                        baseSrc = IMAGE_DOMAIN + baseSrc;
                                    }
                                    config._tempImg.src = baseSrc;
                                }
                                displayImg = config._tempImg;
                            }
                        }

                        // 画像の描画（🌟 アイテム自体のグロー発光は維持）
                        if (displayImg && displayImg.complete && typeof displayImg.naturalWidth === 'number' && displayImg.naturalWidth > 0) {
                            let m = 5;
                            let imgX = x + m;
                            let imgY = y + m;
                            let imgW = slotSize - m * 2;
                            let imgH = slotSize - m * 2;

                            bc.save();
                            if (glowColor) {
                                bc.shadowBlur = 24; 
                                bc.shadowColor = glowColor;
                                bc.shadowOffsetX = 0;
                                bc.shadowOffsetY = 0;
                                bc.drawImage(displayImg, imgX, imgY, imgW, imgH);

                                bc.shadowBlur = 8;
                                bc.drawImage(displayImg, imgX, imgY, imgW, imgH);
                            } else {
                                // 通常アイテムの白縁（ふちどり）表現
                                bc.shadowBlur = 6;
                                bc.shadowColor = "rgba(255, 255, 255, 0.9)";
                                bc.shadowOffsetX = 0;
                                bc.shadowOffsetY = 0;
                                bc.drawImage(displayImg, imgX, imgY, imgW, imgH);
                                
                                bc.shadowBlur = 2;
                                bc.shadowColor = "rgba(255, 255, 255, 1.0)";
                                bc.drawImage(displayImg, imgX, imgY, imgW, imgH);

                                bc.shadowBlur = 0;
                                bc.drawImage(displayImg, imgX, imgY, imgW, imgH);
                            }
                            bc.restore();

                            // 装備中バッジ（E）
                            if (item.isEquipped) {
                                bc.save();
                                const badgeW = 16;
                                const badgeH = 15;
                                const badgeX = x + slotSize - badgeW - 2;
                                const badgeY = y + 2;
                                const radius = 3;

                                bc.fillStyle = 'rgba(10, 15, 25, 0.85)';
                                bc.strokeStyle = '#34d399'; 
                                bc.lineWidth = 1;

                                bc.beginPath();
                                if (bc.roundRect) {
                                    bc.roundRect(badgeX, badgeY, badgeW, badgeH, radius);
                                } else {
                                    bc.rect(badgeX, badgeY, badgeW, badgeH);
                                }
                                bc.fill();
                                bc.stroke();

                                bc.font = 'bold 10px "Segoe UI", sans-serif';
                                bc.fillStyle = '#34d399';
                                bc.textAlign = 'center';
                                bc.textBaseline = 'middle';
                                bc.fillText('E', badgeX + badgeW / 2, badgeY + badgeH / 2 + 0.5);
                                bc.restore();
                            }

                            // 個数表示バッジ
                            const isStackItem = (category === 'ETC' || category === 'USE');
                            if ((isStackItem && count >= 1) || count > 1) {
                                bc.save();
                                let countStr = String(count);
                                let fontSize = countStr.length >= 4 ? 9 : (countStr.length === 3 ? 10 : 11);
                                bc.font = `bold ${fontSize}px 'Segoe UI', sans-serif`;
                                bc.textAlign = "right";
                                bc.textBaseline = "middle";

                                let padX = 5;
                                let badgeW = Math.max(18, countStr.length * 7 + padX * 2);
                                let badgeH = 15;
                                
                                let badgeX = (x + slotSize) - badgeW - 2;
                                let badgeY = (y + slotSize) - badgeH - 2;
                                let radius = 3.5;

                                bc.shadowColor = "rgba(0, 0, 0, 0.4)";
                                bc.shadowBlur = 3;
                                bc.shadowOffsetY = 1;

                                bc.fillStyle = "rgba(10, 15, 25, 0.85)";
                                bc.strokeStyle = "rgba(100, 116, 139, 0.6)";
                                bc.lineWidth = 1;

                                bc.beginPath();
                                if (bc.roundRect) {
                                    bc.roundRect(badgeX, badgeY, badgeW, badgeH, radius);
                                } else {
                                    bc.rect(badgeX, badgeY, badgeW, badgeH);
                                }
                                bc.fill();
                                bc.stroke();

                                bc.shadowBlur = 0;
                                bc.shadowOffsetY = 0;

                                bc.fillStyle = "#ffffff";
                                bc.fillText(countStr, badgeX + badgeW - padX, badgeY + badgeH / 2 + 0.5);
                                bc.restore();
                            }
                        }
                    }
                }
            }
            drawnIndex++;
        }

        // --- 4. スクロールバーの描画（キャッシュ内） ---
        let scrollBarX = cBagX + bagW - 18; 
        let scrollBarY = cStartY;
        let scrollBarW = 8;
        let scrollBarH = maxVisibleRows * (slotSize + spacing) - spacing; 

        bc.fillStyle = "rgba(15, 23, 42, 0.8)";
        bc.fillRect(scrollBarX, scrollBarY, scrollBarW, scrollBarH);
        bc.strokeStyle = "rgba(51, 65, 85, 0.6)";
        bc.lineWidth = 1;
        bc.strokeRect(scrollBarX, scrollBarY, scrollBarW, scrollBarH);

        let maxScrollRow = 4; 
        let knobH = Math.max(20, scrollBarH / (maxScrollRow + 1)); 
        let availableMove = scrollBarH - knobH; 
        
        let knobY = scrollBarY;
        if (maxScrollRow > 0) {
            let scrollRatio = Math.min(1, Math.max(0, scrollRow / maxScrollRow));
            knobY += scrollRatio * availableMove;
        }

        bc.fillStyle = "#475569";
        bc.fillRect(scrollBarX + 1, knobY, scrollBarW - 2, knobH);
        bc.strokeStyle = "#64748b";
        bc.strokeRect(scrollBarX + 1, knobY, scrollBarW - 2, knobH);

        // --- 5. 所持金UIの描画（キャッシュ内） ---
        if (window.hero) {
            const goldBarW = 215; 
            const goldBarH = 28;  
            const goldDrawX = cBagX + 20;
            const goldDrawY = cStartY + maxVisibleRows * (slotSize + spacing); 
            const radius = 6;

            bc.save();
            const bgGrad = bc.createLinearGradient(goldDrawX, goldDrawY, goldDrawX, goldDrawY + goldBarH);
            bgGrad.addColorStop(0, "rgba(30, 41, 59, 0.95)"); 
            bgGrad.addColorStop(1, "rgba(15, 23, 42, 0.95)");    
            
            bc.fillStyle = bgGrad;
            bc.strokeStyle = "rgba(51, 65, 85, 0.8)"; 
            bc.lineWidth = 1;

            bc.beginPath();
            if (bc.roundRect) {
                bc.roundRect(goldDrawX, goldDrawY, goldBarW, goldBarH, radius);
            } else {
                bc.rect(goldDrawX, goldDrawY, goldBarW, goldBarH);
            }
            bc.fill();
            bc.stroke();

            const iconX = goldDrawX + 16;
            const iconY = goldDrawY + goldBarH / 2;
            
            bc.shadowColor = "rgba(0, 0, 0, 0.4)";
            bc.shadowBlur = 4;
            bc.shadowOffsetY = 2;

            bc.beginPath();
            bc.arc(iconX, iconY, 8.5, 0, Math.PI * 2);
            const coinGrad = bc.createRadialGradient(iconX - 2, iconY - 2, 1.5, iconX, iconY, 8.5);
            coinGrad.addColorStop(0, "#fef08a");
            coinGrad.addColorStop(1, "#fbbf24");
            bc.fillStyle = coinGrad;
            bc.fill();
            
            bc.shadowBlur = 0;
            bc.shadowOffsetY = 0;

            bc.strokeStyle = "#d97706";
            bc.lineWidth = 1;
            bc.stroke();

            bc.fillStyle = "#78350f";
            bc.font = "bold 10px 'Segoe UI', sans-serif";
            bc.textAlign = "center";
            bc.textBaseline = "middle";
            bc.fillText("G", iconX, iconY);

            bc.font = "bold 14px 'Segoe UI', sans-serif"; 
            bc.textAlign = "right";
            bc.textBaseline = "middle";
            
            const goldText = goldVal.toLocaleString() + " G"; 
            
            bc.strokeStyle = "#0f172a";
            bc.lineWidth = 3;
            bc.strokeText(goldText, goldDrawX + goldBarW - 12, goldDrawY + goldBarH / 2);
            
            bc.fillStyle = "#fef08a";
            bc.fillText(goldText, goldDrawX + goldBarW - 12, goldDrawY + goldBarH / 2);

            bc.restore();
        }

        bc.restore();
    }
	
	// 🚀 インベントリ専用HTML Canvasへの描画
    const targetCanvas = document.getElementById('inventoryCanvas');
    if (targetCanvas) {
        const targetCtx = targetCanvas.getContext('2d');
        targetCtx.save();
        targetCtx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
        
        // アンチエイリアスを有効にしてくっきり描画させる
        targetCtx.imageSmoothingEnabled = true;
        targetCtx.imageSmoothingQuality = 'high';
        
        // キャッシュ（高解像度）をターゲットCanvasのCSSサイズ（300x400）に合わせて綺麗に流し込む
        targetCtx.drawImage(
            _bagCacheCanvas, 
            0, 0, _bagCacheCanvas.width, _bagCacheCanvas.height, 
            0, 0, 300, 400 // CSS上の表示サイズに合わせる
        );

        // ==========================================================
        // 🌟 【追加】inventoryCanvas内でアイテムを掴んで追尾させる描画処理
        // ==========================================================
        if (typeof selectedSlotIndex !== 'undefined' && selectedSlotIndex !== -1) {
            const heldItem = bagSource[selectedSlotIndex];
            if (heldItem && heldItem.type) {
                const localMouseX = mX - bagX;
                const localMouseY = mY - bagY;

                const iconDrawSize = 32;
                const drawX = localMouseX - iconDrawSize / 2;
                const drawY = localMouseY - iconDrawSize / 2;

                let displayImg = null;
                if (heldItem.image) {
                    displayImg = heldItem.image;
                } else if (typeof itemImages !== 'undefined' && itemImages[heldItem.type]) {
                    displayImg = itemImages[heldItem.type];
                } else if (typeof ITEM_CONFIG !== 'undefined' && ITEM_CONFIG[heldItem.type]) {
                    let config = ITEM_CONFIG[heldItem.type];
                    displayImg = config.isAnimated ? (config.images ? config.images[0] : null) : config.image;
                }

                if (displayImg && displayImg.complete && displayImg.naturalWidth > 0) {
                    targetCtx.save();
                    targetCtx.globalAlpha = 0.65; // うっすら表示
                    targetCtx.imageSmoothingEnabled = true;
                    targetCtx.imageSmoothingQuality = 'high';
                    targetCtx.drawImage(displayImg, drawX, drawY, iconDrawSize, iconDrawSize);
                    targetCtx.restore();
                }
            }
        }

        targetCtx.restore();
    }
	
    // ツールチップ用のホバーアイテム設定
    if (hoveredSlotIndex !== -1 && bagSource[hoveredSlotIndex]) {
        window.hoveredItemForTooltip = bagSource[hoveredSlotIndex];
    }
}

// ============================================================
// :::INVENTORY_CANVAS_CONTROLLER::: 🖱️ インベントリキャンバス上の操作一括制御（ダブルクリック対応版）
// ============================================================
const inventoryCanvas = document.getElementById('inventoryCanvas');

// ダブルクリック判定用の変数（重複定義を防ぐため typeof でガード）
if (typeof lastBagClickTime === 'undefined') {
    var lastBagClickTime = 0;
    var lastBagClickIndex = -1;
}

if (inventoryCanvas) {
    // 🌟 mousedown を inventoryCanvas に紐付け
    inventoryCanvas.addEventListener('mousedown', (event) => {
        if (window.isDisconnected) return;

        const rect = inventoryCanvas.getBoundingClientRect();
        
        // mousemove と同じ考え方で、インベントリ内の正確なローカル座標を算出
        const clickX = event.clientX - rect.left + (gameWindows.inventory ? gameWindows.inventory.x : 0);
        const clickY = event.clientY - rect.top + (gameWindows.inventory ? gameWindows.inventory.y : 0);

        console.log(`[InventoryClick] (${Math.round(clickX)}, ${Math.round(clickY)})`);

        // インベントリウィンドウが開いているか確認
        const win = gameWindows && gameWindows.inventory;
        if (!win || !win.isOpen) return;

        let bagX = win.x;
        let bagY = win.y;
        let cols = 5;
        let slotSize = 40;
        let spacing = 5;
        let startX = bagX + 20;
        let startY = bagY + 70;
        let scrollRow = win.scrollY || 0;
        let maxVisibleRows = 6;
        let maxTotalSlots = 50;

        let clickedSlotIndex = -1;
        let drawnIndex = 0;
        let startIndex = scrollRow * cols;
        let endIndex = startIndex + (cols * maxVisibleRows);

        let alreadyCheckedETC = new Set();

        for (let i = 0; i < maxTotalSlots; i++) {
            let item = (hero && hero.inventory) ? hero.inventory[i] : null;

            if (i < startIndex || i >= endIndex) {
                continue;
            }

            let col = drawnIndex % cols;
            let row = Math.floor(drawnIndex / cols);
            let x = startX + col * (slotSize + spacing);
            let y = startY + row * (slotSize + spacing);

            if (clickX >= x && clickX <= x + slotSize && clickY >= y && clickY <= y + slotSize) {
                if (item && item.type) {
                    let category = (typeof itemCategories !== 'undefined') ? itemCategories[item.type] : null;
                    if (category === 'ETC') {
                        if (!alreadyCheckedETC.has(item.type)) {
                            alreadyCheckedETC.add(item.type);
                        }
                    }
                }
                clickedSlotIndex = i;
                break;
            }
            drawnIndex++;
        }

        // バッグ内のスロットがクリックされた場合
        if (clickedSlotIndex !== -1) {
            console.log(`[ClickDebug] バッグスロットIndex: ${clickedSlotIndex} をクリック.`);
            
            const item = hero && hero.inventory && hero.inventory[clickedSlotIndex];
            const vendingWin = document.getElementById('vending-window');
            const isVendingOpen = vendingWin && vendingWin.style.display === 'block';

            // 🌟 露店出品モードの処理
            if (item && isVendingOpen) {
                let baseName = item.name || item.item_name || "アイテム";
                if (typeof ITEM_CONFIG !== 'undefined' && ITEM_CONFIG[item.type]) {
                    baseName = ITEM_CONFIG[item.type].display_name || ITEM_CONFIG[item.type].name;
                }

                const checkStr = `${item.category || ''} ${item.item_type || ''} ${item.type}`.toLowerCase();
                const isEquip = checkStr.includes('shield') || checkStr.includes('sword');
                
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

                const modal = document.getElementById('vending-quantity-modal');
                const qInput = document.getElementById('modal-quantity-input');
                const pInput = document.getElementById('modal-price-input');
                const confirmBtn = document.getElementById('modal-confirm-btn');
                const cancelBtn = document.getElementById('modal-cancel-btn');

                if (modal) {
                    document.getElementById('modal-item-name').innerText = displayPromptName;
                    document.getElementById('modal-max-quantity').innerText = totalOwned;
                    
                    qInput.value = isEquip ? 1 : totalOwned;
                    qInput.disabled = isEquip;
                    pInput.value = 1000;

                    modal.style.display = 'block';

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
                            originalIndex: clickedSlotIndex 
                        };

                        if (typeof addItemToVendingList === 'function') {
                            addItemToVendingList(itemToSend);
                            if (typeof playMouseClickSound === 'function') playMouseClickSound();
                        }
                        modal.style.display = 'none';
                    };
                }
                return;
            }

            // ------------------------------------------------------------
            // 🌟 【新規追加】ダブルクリックの判定処理 (露店モードオフ時)
            // ------------------------------------------------------------
            const currentTime = Date.now();
            const timeDiff = currentTime - lastBagClickTime;

            if (lastBagClickIndex === clickedSlotIndex && timeDiff < 400 && timeDiff > 50) {
                console.log(`[Doubleclick] バッグスロット ${clickedSlotIndex} のダブルクリックを検知！`);

                if (!item) {
                    lastBagClickTime = 0;
                    lastBagClickIndex = -1;
                    return;
                }

                // 4. トレードウィンドウが開いている場合の割り込み処理
                const tradeEl = document.getElementById('trade-window');
                const isTradeOpen = (tradeEl && tradeEl.style.display !== 'none' && tradeEl.style.display !== '');
                
                if (isTradeOpen) {
                    const targetNameEl = document.getElementById('trade-target-name');
                    const hasOpponent = targetNameEl && targetNameEl.innerText.trim() !== "";

                    if (!hasOpponent) {
                        console.log("⚠️ 相手が入室するまでアイテムを陳列することはできません。");
                        lastBagClickTime = 0;
                        lastBagClickIndex = -1;
                        return;
                    }

                    const alreadyExists = myTradeSlots.some(slot => slot && slot.slot_index === clickedSlotIndex);
                    if (alreadyExists) {
                        console.log("⚠️ このアイテムはすでにトレードスロットに陳列されています！");
                        lastBagClickTime = 0;
                        lastBagClickIndex = -1;
                        return;
                    }

                    const emptySlotIndex = myTradeSlots.findIndex(slot => slot === null);
                    if (emptySlotIndex === -1) {
                        console.log("⚠️ トレードスロットがいっぱいです（最大9個まで）！");
                        lastBagClickTime = 0;
                        lastBagClickIndex = -1;
                        return;
                    }

                    console.log(`[Trade] トレードスロットへアイテムを追加します: スロット ${clickedSlotIndex}`);
                    
                    myTradeSlots[emptySlotIndex] = { ...item, slot_index: clickedSlotIndex };
                    updateMyTradeDisplay();
                    // 🌟 修正：サーバー側が確実に宛先を特定できるように、もしあれば targetId や partnerId を添えてあげる
socket.emit('updateTradeOffer', { 
    tradeSlots: myTradeSlots,
    targetId: window._currentTradePartnerId || null // 相手のIDを一緒に乗せる
});

                    selectedSlotIndex = -1;
                    lastBagClickTime = 0;
                    lastBagClickIndex = -1;
                    return;
                }

                // アイテムの装備品判定
                const itemName = (item.name || "").toLowerCase();
                const itemType = (item.type || "").toLowerCase();
                const isEquipment = itemType === 'sword' || itemType === 'shield' || 
                                     itemName.includes('剣') || itemName.includes('盾') ||
                                     itemName.includes('sword') || itemName.includes('shield');

                if (isEquipment) {
                    console.log(`[Equip] スロット ${clickedSlotIndex} の装備品を脱着します: ${itemName}`);
                    socket.emit('equipItem', { slotIndex: clickedSlotIndex });
                } else {
                    const targetItemName = item.name || item.type || "";
                    console.log(`[ItemUse] スロット ${clickedSlotIndex} の消費アイテムを使用します: ${targetItemName}`);
                    socket.emit('useConsumableItem', { 
                        slotIndex: clickedSlotIndex, 
                        item: item, 
                        itemName: targetItemName 
                    });
                }
                
                if (typeof playEquipSound === 'function') playEquipSound();

                selectedSlotIndex = -1;
                lastBagClickTime = 0;
                lastBagClickIndex = -1;
                inventoryCanvas.style.cursor = "grab";
                return;
            } else {
                // 1回目のクリックとして記録
                lastBagClickTime = currentTime;
                lastBagClickIndex = clickedSlotIndex;
            }
            // ------------------------------------------------------------

            // 🌟 【最重要】アイテムを掴む・スワップするロジック
            if (typeof selectedSlotIndex !== 'undefined' && selectedSlotIndex !== -1 && selectedSlotIndex !== clickedSlotIndex) {
                socket.emit('swapItems', { from: selectedSlotIndex, to: clickedSlotIndex });
                if (typeof playDropSound === 'function') playDropSound();
                selectedSlotIndex = -1;
                inventoryCanvas.style.cursor = "grab"; 
            } else if (typeof selectedSlotIndex !== 'undefined' && selectedSlotIndex === clickedSlotIndex) {
                selectedSlotIndex = -1; 
                inventoryCanvas.style.cursor = "grab";
                if (typeof playDropSound === 'function') playDropSound();
            } else if (item) {
                selectedSlotIndex = clickedSlotIndex; 
                inventoryCanvas.style.cursor = "grabbing"; 
                if (typeof playHoverSound === 'function') playHoverSound();
            }
            return;
        } else {
            // インベントリの枠外をクリックした場合（アイテムを捨てる判定など）
            lastBagClickIndex = -1; // 枠外をクリックしたらダブルクリック判定をリセット
            if (typeof selectedSlotIndex !== 'undefined' && selectedSlotIndex !== -1) {
                const item = hero && hero.inventory && hero.inventory[selectedSlotIndex];
                if (item && typeof openDropForm === 'function') {
                    openDropForm(selectedSlotIndex, item);
                    selectedSlotIndex = -1;
                    inventoryCanvas.style.cursor = "grab";
                    return;
                }
            }
        }
    });

    inventoryCanvas.addEventListener('mousemove', (event) => {
        const rect = inventoryCanvas.getBoundingClientRect();
        
        mouseX = event.clientX - rect.left + gameWindows.inventory.x;
        mouseY = event.clientY - rect.top + gameWindows.inventory.y;
        
        const container = document.getElementById('inventory-canvas-area');
        
        if (container) {
            const containerRect = container.getBoundingClientRect();
            
            // 🌟 ウィンドウの座標を考慮しつつ、
            // 「マウスカーソルとツールチップが綺麗に離れて追従する」ための自然なオフセット（例: +15pxずつなど）を加えます
            // ※もし「もっと左・上」に寄せたい場合は、ここの数値をマイナスに調整してください
            const HOVER_OFFSET_X = -340; 
            const HOVER_OFFSET_Y = -75;

            window.rawClientX = event.clientX - (containerRect.left - rect.left) + HOVER_OFFSET_X;
            window.rawClientY = event.clientY - (containerRect.top - rect.top) + HOVER_OFFSET_Y;
        } else {
            window.rawClientX = event.clientX;
            window.rawClientY = event.clientY;
        }
        
        drawBagGrid();
    });

    inventoryCanvas.addEventListener('mouseleave', () => {
        mouseX = -1;
        mouseY = -1;
        window.rawClientX = undefined;
        window.rawClientY = undefined;
        window.hoveredItemForTooltip = null; 
        drawBagGrid();
    });
}

/**
 * 🖱️ バッグ専用：タブがクリックされたかを判定し、切り替える関数
 */
function handleBagTabClick(mx, my) {
    if (!gameWindows.inventory.isOpen) return false;

    let bagX = gameWindows.inventory.x;
    let bagY = gameWindows.inventory.y;

    let tabY = bagY + 35;
    let tabW = 60;
    let tabH = 22;

    let bagTabList = [
        { id: "equip", offsetX: 15 },
        { id: "consume", offsetX: 80 },
        { id: "etc", offsetX: 145 }
    ];

    for (let i = 0; i < bagTabList.length; i++) {
        let tab = bagTabList[i];
        let tX = bagX + tab.offsetX;

        if (mx >= tX && mx <= tX + tabW && my >= tabY && my <= tabY + tabH) {
            gameWindows.inventory.currentTab = tab.id;
            return true;
        }
    }

    return false;
}

/**
 * 🖱️ バッグ専用：アイテムグリッドのどのスロットがクリックされたかを判定する関数
 */
function handleBagSlotClick(mx, my) {
    if (!gameWindows.inventory.isOpen) return -1;

    let bagX = gameWindows.inventory.x;
    let bagY = gameWindows.inventory.y;

    let cols = 5;
    let slotSize = 40;
    let startX = bagX + 20;
    let startY = bagY + 70;

    let bagSource = (typeof inventoryVisualBuffer !== 'undefined') ? inventoryVisualBuffer : [];
    let currentTab = gameWindows.inventory.currentTab;

    let slotIndex = 0;

    for (let i = 0; i < bagSource.length; i++) {
        let item = bagSource[i];

        if (item && item.type !== currentTab) {
            continue;
        }

        let col = slotIndex % cols;
        let row = Math.floor(slotIndex / cols);
        let x = startX + col * (slotSize + 5);
        let y = startY + row * (slotSize + 5);

        if (mx >= x && mx <= x + slotSize && my >= y && my <= y + slotSize) {
            return i;
        }

        slotIndex++;
        if (slotIndex >= 25) break;
    }

    return -1;
}

// クリック時の統合処理
function handleBagMouseDown(mx, my) {
    // 🌟 0. スクロールバー（ドラッグ開始判定）
    if (handleBagScrollbarClick(mx, my)) {
        return; 
    }

    // 1. タブ
    if (handleBagTabClick(mx, my)) {
        console.log("バッグのタブが切り替わりました:", gameWindows.inventory.currentTab);
        return;
    }

    // 2. グリッド
    let clickedSlotIndex = handleBagSlotClick(mx, my);
    if (clickedSlotIndex !== -1) {
        console.log("クリックされたスロットのインデックス:", clickedSlotIndex);
    }
}

/**
 * 🖱️ バッグ専用：スクロールバーがクリックされたとき ＆ ドラッグ開始処理
 */
function handleBagScrollbarClick(mx, my) {
    if (!gameWindows || !gameWindows.inventory || !gameWindows.inventory.isOpen) return false;

    let bagX = gameWindows.inventory.x;
    let bagY = gameWindows.inventory.y;
    let slotSize = 40;
    let maxVisibleRows = 6;
    let startY = bagY + 70;

    let scrollBarX = bagX + gameWindows.inventory.w - 18;
    let scrollBarY = startY;
    let scrollBarW = 8;
    let scrollBarH = maxVisibleRows * (slotSize + 5) - 5;

    // クリック判定を少し広げて押しやすくする
    let testHitX1 = scrollBarX - 10;
    let testHitX2 = scrollBarX + scrollBarW + 10;
    let testHitY1 = scrollBarY - 5;
    let testHitY2 = scrollBarY + scrollBarH + 5;

    if (mx >= testHitX1 && mx <= testHitX2 && my >= testHitY1 && my <= testHitY2) {
        // 🌟 ドラッグ開始フラグをONにし、位置を即座に更新
        isDraggingScrollbar = true;
        updateScrollByMouseY(my, scrollBarY, scrollBarH);
        return true;
    }

    return false;
}

/**
 * 🖱️ マウス移動時の処理（ドラッグ中ならスクロールを追従させる）
 */
window.addEventListener('mousemove', (event) => {
    if (!isDraggingScrollbar) return;
    if (!gameWindows || !gameWindows.inventory || !gameWindows.inventory.isOpen) {
        isDraggingScrollbar = false;
        return;
    }

    let targetCanvas = document.querySelector('canvas');
    if (!targetCanvas) return;

    let rect = targetCanvas.getBoundingClientRect();
    let my = event.clientY - rect.top;

    let bagX = gameWindows.inventory.x;
    let bagY = gameWindows.inventory.y;
    let slotSize = 40;
    let maxVisibleRows = 6;
    let startY = bagY + 70;
    let scrollBarY = startY;
    let scrollBarH = maxVisibleRows * (slotSize + 5) - 5;

    // ドラッグ中にスクロール位置をリアルタイム更新
    updateScrollByMouseY(my, scrollBarY, scrollBarH);
});

/**
 * 🖱️ マウスボタンを離したとき（ドラッグ終了）
 */
window.addEventListener('mouseup', () => {
    isDraggingScrollbar = false;
});

/**
 * 📊 マウスのY座標からスクロール位置（scrollY）を計算して更新する共通関数
 */
function updateScrollByMouseY(my, scrollBarY, scrollBarH) {
    let clickRatio = (my - scrollBarY) / scrollBarH;
    clickRatio = Math.max(0, Math.min(1, clickRatio));
    
    let maxScrollRow = 4; // 最大スクロール行数（0〜4）
    gameWindows.inventory.scrollY = Math.round(clickRatio * maxScrollRow);
}

function initInventoryCanvasResolution() {
    const canvas = document.getElementById('inventoryCanvas');
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    
    // 表示サイズ（CSS上の大きさ）
    const displayWidth = 300;
    const displayHeight = 400;

    // 内部の描画ピクセル数をDPR倍にして高精細化する
    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;

    const ctx = canvas.getContext('2d');
    // 描画倍率をスケーリングしておく
    ctx.scale(dpr, dpr);
}

// 起動時に一度呼ぶ
initInventoryCanvasResolution();

// ============================================================
// 🖱️ マウスホイールイベント（キャンバス内限定・完全共存版）
// ============================================================
/*
window.addEventListener('wheel', (event) => {
    if (!gameWindows || !gameWindows.inventory || !gameWindows.inventory.isOpen) return;

    const targetElement = event.target;

    // 1. ショップや図鑑などのHTMLウィンドウが開いていて、その上にある場合はそちらを優先
    const shopOverlay = document.getElementById('shop-overlay');
    const mzukanOverlay = document.getElementById('mzukan-overlay');
    const zukanOverlay = document.getElementById('zukan-overlay');

    const isShopOpen = shopOverlay && shopOverlay.style.display !== 'none';
    const isMzukanOpen = mzukanOverlay && mzukanOverlay.style.display !== 'none';
    const isZukanOpen = zukanOverlay && zukanOverlay.style.display !== 'none';

    if (
        (isShopOpen && targetElement.closest('#shop-overlay')) ||
        (isMzukanOpen && targetElement.closest('#mzukan-overlay')) ||
        (isZukanOpen && targetElement.closest('#zukan-overlay'))
    ) {
        return; // 他のHTMLウィンドウのスクロールを邪魔しない
    }

    // 2. 🌟 マウスがゲームのメインキャンバス（#stage）の外にある場合は何もしない（ブラウザ自体のスクロールを許可）
    if (targetElement.id !== 'stage') {
        return;
    }

    // --- ここから下は「ショップ等の外」かつ「#stageキャンバスの上」にマウスがある状態 ---
    event.preventDefault();

    gameWindows.inventory.scrollY = gameWindows.inventory.scrollY || 0;
    let maxScrollRow = 4;

    if (event.deltaY > 0) {
        gameWindows.inventory.scrollY = Math.min(gameWindows.inventory.scrollY + 1, maxScrollRow);
    } else {
        gameWindows.inventory.scrollY = Math.max(gameWindows.inventory.scrollY - 1, 0);
    }
}, { passive: false });
*/

// ============================================================
// 🖱️ マウスホイールイベント（ちょうど良いスピード調整版）
// ============================================================
if (typeof window._scrollAccumulator === 'undefined') {
    window._scrollAccumulator = 0;
}

window.addEventListener('wheel', (event) => {
    const inventoryWindow = document.getElementById('inventory-window');
    
    // 1. インベントリウィンドウが存在しない、または非表示なら何もしない
    if (!inventoryWindow || inventoryWindow.style.display === 'none') {
        return;
    }

    const targetElement = event.target;

    // 2. マウスがインベントリの内部にあるか判定
    if (!inventoryWindow.contains(targetElement)) {
        return; 
    }

    event.preventDefault(); // ページ全体の予期せぬスクロールを防止

    // gameWindows.inventory と scrollY の安全確保
    if (typeof gameWindows === 'undefined') window.gameWindows = {};
    if (!gameWindows.inventory) gameWindows.inventory = {};
    gameWindows.inventory.scrollY = gameWindows.inventory.scrollY || 0;
    
    let maxScrollRow = 4; // スクロール可能な最大行数

    // 🌟 【ここがポイント】ホイールの感度（標準的な1ノッチで反応するように調整）
    // 数字を小さくすると軽くなり、大きくすると重くなります（おすすめは 30〜50 前後）
    const scrollThreshold = 40; 

    window._scrollAccumulator += event.deltaY;

    if (window._scrollAccumulator >= scrollThreshold) {
        // 下に1行スクロール
        gameWindows.inventory.scrollY = Math.min(gameWindows.inventory.scrollY + 1, maxScrollRow);
        window._scrollAccumulator = 0; // リセット
    } else if (window._scrollAccumulator <= -scrollThreshold) {
        // 上に1行スクロール
        gameWindows.inventory.scrollY = Math.max(gameWindows.inventory.scrollY - 1, 0);
        window._scrollAccumulator = 0; // リセット
    }
}, { passive: false });

// ============================================================
// :::INVENTORY_MOUSE_MOVE::: 📦 インベントリのウィンドウ対応マウス移動判定（デバッグ版）
// ============================================================
window.addEventListener('mousemove', (e) => {
    if (window.isDisconnected) return;

    const inventoryWindow = document.getElementById('inventory-window');
    const targetCanvas = document.getElementById('inventoryCanvas');

    // 1. 存在・非表示チェック
    if (!inventoryWindow || inventoryWindow.style.display === 'none' || !targetCanvas) {
        return; // ここで引っかかっている場合は、ID名や display の値が違います
    }

    // 2. マウスがインベントリウィンドウの内部にあるか判定
    const targetElement = e.target;
    if (!inventoryWindow.contains(targetElement)) {
        return; // 🛑 【原因候補A】ここで弾かれている場合、inventoryWindow の範囲判定がDOMの構造とズレています
    }

	// 2026-9-20停止
    //console.log("🟢 [DEBUG] マウスがインベントリ領域内に入りました！ target:", targetElement);

    // 3. inventoryCanvas基準のローカル座標を算出
    const rect = targetCanvas.getBoundingClientRect();
    const localX = e.clientX - rect.left;
    const localY = e.clientY - rect.top;
	
	// 2026-9-20停止
    //console.log(`📍 [DEBUG] 座標計算 -> localX: ${localX.toFixed(1)}, localY: ${localY.toFixed(1)} (clientX: ${e.clientX}, rect.left: ${rect.left.toFixed(1)})`);

    const invWin = gameWindows["inventory"];
    if (!invWin) {
        console.log("❌ [DEBUG] gameWindows['inventory'] が見つかりません！");
        return;
    }

    // 閉じるボタンやヘッダーの判定
    if (invWin.isMouseOverClose && invWin.isMouseOverClose(localX, localY)) {
        console.log("🔴 [DEBUG] 閉じるボタンの上です");
        targetCanvas.style.cursor = "pointer";
        return;
    }
    if (invWin.isMouseOverHeader && invWin.isMouseOverHeader(localX, localY)) {
        console.log("🟠 [DEBUG] ヘッダーの上です");
        targetCanvas.style.cursor = "move";
        return;
    }

    // 4. バッグ内スロットの判定
    let cols = 5;
    let slotSize = 40;
    let spacing = 5;
    let startX = 20;
    let startY = 70;
    let scrollRow = invWin.scrollY || 0;
    let maxVisibleRows = 6;
    let maxTotalSlots = 50;

    let drawnIndex = 0;
    let startIndex = scrollRow * cols;
    let endIndex = startIndex + (cols * maxVisibleRows);
    let isOverBagItem = false;
    let alreadyCheckedETC = new Set();

    for (let i = 0; i < maxTotalSlots; i++) {
        if (i < startIndex || i >= endIndex) {
            continue;
        }

        let item = (hero && hero.inventory) ? hero.inventory[i] : null;
        let col = drawnIndex % cols;
        let row = Math.floor(drawnIndex / cols);
        let x = startX + col * (slotSize + spacing);
        let y = startY + row * (slotSize + spacing);

        // スロットの範囲内かチェック
        if (localX >= x && localX <= x + slotSize && localY >= y && localY <= y + slotSize) {
		
			// 2026-9-20停止
            //console.log(`🎯 [DEBUG] スロット #${i} (行列: ${col},${row}) の上にヒットしました！ item:`, item);
            if (item) {
                let category = (typeof itemCategories !== 'undefined') ? itemCategories[item.type] : null;
                // 2026-9-20停止
				//console.log(`🏷️ [DEBUG] アイテム情報 -> type: ${item.type}, category: ${category}`);
                if (category === 'ETC') {
                    if (!alreadyCheckedETC.has(item.type)) {
                        alreadyCheckedETC.add(item.type);
                        isOverBagItem = true;
                    }
                } else {
                    isOverBagItem = true;
                }
            } else {
                console.log(`📭 [DEBUG] スロット #${i} は空です`);
            }
            break;
        }
        drawnIndex++;
    }

	// 2026-9-20停止
    //console.log(`✨ [DEBUG] 最終判定 -> isOverBagItem: ${isOverBagItem}, selectedSlotIndex: ${selectedSlotIndex}`);

    // カーソルの切り替え
    if (isOverBagItem || selectedSlotIndex !== -1) {
        targetCanvas.style.cursor = selectedSlotIndex !== -1 ? "grabbing" : "grab";
		// 2026-9-20停止
        //console.log("👉 [DEBUG] カーソルを grab に変更しました");
    } else {
        targetCanvas.style.cursor = "default";
    }
});

// ============================================================
// ⌨️ キーボード全体でのブラウザスクロール防止
// ============================================================
window.addEventListener('keydown', (event) => {
    // 上下キー（ArrowUp, ArrowDown）が押されたら、インベントリの有無に関わらずブラウザのスクロールを常に止める
    if (['ArrowUp', 'ArrowDown', 'Space'].includes(event.code)) {
        // ※もしフォーム入力中などで邪魔になる場合は除外できますが、通常ゲーム画面ならこれで完全に止まります
        event.preventDefault();
    }
}, { passive: false });

/**
 * 🖱️ キーボードイベント
 */
window.addEventListener('keydown', (event) => {
    if (!gameWindows || !gameWindows.inventory || !gameWindows.inventory.isOpen) return;

    gameWindows.inventory.scrollY = gameWindows.inventory.scrollY || 0;
    let maxScrollRow = 4;

    if (event.key === 'ArrowDown') {
        gameWindows.inventory.scrollY = Math.min(gameWindows.inventory.scrollY + 1, maxScrollRow);
    } else if (event.key === 'ArrowUp') {
        gameWindows.inventory.scrollY = Math.max(gameWindows.inventory.scrollY - 1, 0);
    }
});

/**
 * 🖱️ マウスダウンイベント（座標のズレを解消した実測値ベース）
 */
window.addEventListener('mousedown', (event) => {
    if (!gameWindows || !gameWindows.inventory || !gameWindows.inventory.isOpen) return;

    let targetCanvas = event.target;
    if (!targetCanvas || targetCanvas.tagName !== 'CANVAS') {
        targetCanvas = document.querySelector('canvas');
    }

    if (targetCanvas) {
        let rect = targetCanvas.getBoundingClientRect();
        let mx = event.clientX - rect.left;
        let my = event.clientY - rect.top;

        handleBagMouseDown(mx, my);
    } else {
        handleBagMouseDown(event.clientX, event.clientY);
    }
});

// ============================================================
// 🎒 インベントリの開閉を完全に一元管理する関数
// ============================================================
function toggleInventoryWindow(forceOpen) {
    if (!gameWindows) window.gameWindows = {};
    if (!gameWindows.inventory) gameWindows.inventory = {};

    // 開閉状態を決定（強制指定がなければ反転）
    const nextState = (typeof forceOpen === 'boolean') ? forceOpen : !gameWindows.inventory.isOpen;
    
    // 1. JS側のフラグを同期
    gameWindows.inventory.isOpen = nextState;

    // 2. HTMLウィンドウの表示/非表示を同期
    const inventoryWindow = document.getElementById('inventory-window');
    if (inventoryWindow) {
        inventoryWindow.style.display = nextState ? 'block' : 'none';
    }

    // 3. 開いたときにCanvasの解像度を整える
    if (nextState) {
        if (typeof initInventoryCanvasResolution === 'function') initInventoryCanvasResolution();
        if (typeof drawBagGrid === 'function') drawBagGrid();
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
// :::DRAW_EQUIPMENT_WINDOW::: 🛡️ 装備ウィンドウの描画管理（マウス追尾ポップアップ版）
// ============================================================
const EQUIPMENT_SLOTS = [
    // 上段：メイン装備（剣・盾・マント）
    { x: 14,  y: 44,  type: 'weapon',  label: '剣', name: '武器' },
    { x: 62,  y: 44,  type: 'shield',  label: '盾', name: '盾' },
    { x: 110, y: 44,  type: 'cape',    label: 'マ', name: 'マント' },
    
    // 下段：アクセサリー系（ペンダント・指輪・帯）
    { x: 14,  y: 92,  type: 'pendant', label: 'ペ', name: 'ペンダント' },
    { x: 62,  y: 92,  type: 'ring',    label: '指', name: '指輪' },
    { x: 110, y: 92,  type: 'belt',    label: '帯', name: 'ベルト' }
];

// 🌟 レア度カラー算出関数（パフォーマンスとスコープの観点から外側に配置）
function getEquipGlowColor(item) {
    if (!item) return null;
    const statKeys = ['str', 'dex', 'int', 'luk', 'maxHp', 'maxMp', 'atk', 'matk', 'def'];
    let totalFirst = item.totalFirstStats;
    let totalAll = item.totalALLStats;

    if (totalFirst === undefined && typeof ITEM_CATALOG !== 'undefined') {
        const catItem = ITEM_CATALOG[item.id || item.item_id];
        if (catItem) {
            totalFirst = statKeys.reduce((acc, k) => acc + (Number(catItem[k]) || 0), 0);
        }
    }
    if (totalAll === undefined) {
        totalAll = statKeys.reduce((acc, k) => acc + (Number(item[k]) || 0), 0);
    }

    if (totalAll !== undefined && totalFirst !== undefined) {
        const bonus = totalAll - totalFirst;
        if (bonus >= 30) return "#ff4d4d";
        if (bonus >= 25) return "#4ade80";
        if (bonus >= 20) return "#facc15";
        if (bonus >= 15) return "#e879f9";
        if (bonus >= 10) return "#38bdf8";
    }
    return null;
}

function drawEquipmentWindow() {
    const win = gameWindows.equipment;
    if (!win.isOpen) return;

    const targetCtx = typeof ctx !== 'undefined' ? ctx : (window.ctx || null);
    if (!targetCtx) return;

    const slotSize = 42;

    // ウィンドウサイズ（幅 166px、高さ 148px）
    if (!win.w) win.w = 166;
    if (!win.h) win.h = 148;

    // 1. メインウィンドウ背景
    targetCtx.save();
    let winGrad = targetCtx.createLinearGradient(win.x, win.y, win.x, win.y + win.h);
    winGrad.addColorStop(0, "rgba(18, 24, 38, 0.95)");
    winGrad.addColorStop(1, "rgba(10, 13, 20, 0.95)");
    targetCtx.fillStyle = winGrad;
    
    if (targetCtx.roundRect) {
        targetCtx.beginPath();
        targetCtx.roundRect(win.x, win.y, win.w, win.h, 8);
        targetCtx.fill();
    } else {
        targetCtx.fillRect(win.x, win.y, win.w, win.h);
    }

    targetCtx.strokeStyle = "rgba(255, 255, 255, 0.18)";
    targetCtx.lineWidth = 1;
    if (targetCtx.roundRect) {
        targetCtx.beginPath();
        targetCtx.roundRect(win.x, win.y, win.w, win.h, 8);
        targetCtx.stroke();
    } else {
        targetCtx.strokeRect(win.x, win.y, win.w, win.h);
    }
    targetCtx.restore();

    // ヘッダー部
    const headerH = 28;
    targetCtx.fillStyle = "rgba(30, 40, 60, 0.6)";
    targetCtx.fillRect(win.x + 1, win.y + 1, win.w - 2, headerH);

    targetCtx.fillStyle = "#f8fafc";
    targetCtx.font = "bold 12px 'Segoe UI', sans-serif";
    targetCtx.textAlign = "left";
    targetCtx.textBaseline = "middle";
    targetCtx.fillText("🛡️ EQUIPMENT", win.x + 12, win.y + headerH / 2);

    // 閉じるボタン [X]
    const closeBtnX = win.x + win.w - 22;
    const closeBtnY = win.y + 5;
    const closeBtnW = 18;
    const closeBtnH = 18;
    
    targetCtx.fillStyle = win.isMouseOverClose(mouseX, mouseY) ? "#ef4444" : "rgba(255,255,255,0.1)";
    if (targetCtx.roundRect) {
        targetCtx.beginPath();
        targetCtx.roundRect(closeBtnX, closeBtnY, closeBtnW, closeBtnH, 4);
        targetCtx.fill();
    } else {
        targetCtx.fillRect(closeBtnX, closeBtnY, closeBtnW, closeBtnH);
    }

    targetCtx.fillStyle = "#ffffff";
    targetCtx.font = "bold 10px sans-serif";
    targetCtx.textAlign = "center";
    targetCtx.textBaseline = "middle";
    targetCtx.fillText("✕", closeBtnX + closeBtnW/2, closeBtnY + closeBtnH/2);

    win.closeButtonArea = { x: closeBtnX, y: closeBtnY, w: closeBtnW, h: closeBtnH };

    // ------------------------------------------------
    // 2. スロット配置エリアのインナーパネル
    // ------------------------------------------------
    targetCtx.save();
    targetCtx.translate(win.x, win.y);

    targetCtx.fillStyle = "rgba(8, 11, 16, 0.6)";
    targetCtx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    targetCtx.lineWidth = 1;
    if (targetCtx.roundRect) {
        targetCtx.beginPath();
        targetCtx.roundRect(10, 38, win.w - 20, 98, 6);
        targetCtx.fill();
        targetCtx.stroke();
    }

    const heroEquips = (hero && hero.equipment) ? hero.equipment : {};
    const hitAreas = [];

    // ホバーされた未装備スロットのテキストを保持
    let hoveredSlotName = null;

    EQUIPMENT_SLOTS.forEach(slot => {
        const { x, y, type, label, name } = slot;

        targetCtx.fillStyle = "rgba(20, 27, 40, 0.7)";
        targetCtx.strokeStyle = "rgba(255, 255, 255, 0.2)";
        targetCtx.lineWidth = 1;
        
        const isHover = mouseX >= win.x + x && mouseX <= win.x + x + slotSize &&
                        mouseY >= win.y + y && mouseY <= win.y + y + slotSize;
        
        if (isHover) {
            targetCtx.fillStyle = "rgba(255, 255, 255, 0.15)";
            targetCtx.strokeStyle = "#fbbf24";
            if (!heroEquips[type]) {
                hoveredSlotName = name;
            }
        }

        if (targetCtx.roundRect) {
            targetCtx.beginPath();
            targetCtx.roundRect(x, y, slotSize, slotSize, 5);
            targetCtx.fill();
            targetCtx.stroke();
        } else {
            targetCtx.fillRect(x, y, slotSize, slotSize);
            targetCtx.strokeRect(x, y, slotSize, slotSize);
        }

        const itemType = heroEquips[type];
        if (!itemType) {
            targetCtx.fillStyle = "rgba(255, 255, 255, 0.35)";
            targetCtx.font = "10px 'Segoe UI', sans-serif";
            targetCtx.textAlign = "center";
            targetCtx.textBaseline = "middle";
            targetCtx.fillText(label, x + slotSize/2, y + slotSize/2);
        } else {
            let equippedItemData = null;
            if (hero.inventory && Array.isArray(hero.inventory)) {
                equippedItemData = hero.inventory.find(inv => 
                    inv && inv.isEquipped && (inv.type === itemType || inv.slotType === type)
                );
            }

            let img = (typeof itemImages !== 'undefined') ? itemImages[itemType] : null;

            if (img && img.complete && img.naturalWidth > 0) {
                const padding = 4;
                const imgW = slotSize - padding * 2;
                const imgH = slotSize - padding * 2;
                
                const glowCol = getEquipGlowColor(equippedItemData);

                targetCtx.save();
                if (glowCol) {
                    targetCtx.shadowBlur = 10;
                    targetCtx.shadowColor = glowCol;
                    targetCtx.strokeStyle = glowCol;
                    targetCtx.lineWidth = 2;
                    if (targetCtx.roundRect) {
                        targetCtx.beginPath();
                        targetCtx.roundRect(x + 2, y + 2, slotSize - 4, slotSize - 4, 4);
                        targetCtx.stroke();
                    }
                } else {
                    targetCtx.shadowBlur = 3;
                    targetCtx.shadowColor = "rgba(0,0,0,0.4)";
                }

                targetCtx.drawImage(img, x + padding, y + padding, imgW, imgH);
                targetCtx.restore();
            }
        }

        hitAreas.push({
            type: 'equipmentSlot',
            slotType: type,
            x: win.x + x,
            y: win.y + y,
            w: slotSize,
            h: slotSize
        });
    });

    targetCtx.restore(); // 一度ウィンドウ内の平行移動を解除

    // 3. マウスカーソル追尾型ポップアップの描画（ウィンドウ外にもはみ出せるよう全体座標で計算）
    if (hoveredSlotName && typeof mouseX !== 'undefined' && typeof mouseY !== 'undefined') {
        targetCtx.save();
        targetCtx.font = "11px 'Segoe UI', sans-serif";
        const textMetrics = targetCtx.measureText(hoveredSlotName);
        const boxW = textMetrics.width + 12;
        const boxH = 20;
        
        // カーソルの右下（少しオフセットした位置）に追尾
        const boxX = mouseX + 12;
        const boxY = mouseY + 12;

        targetCtx.fillStyle = "rgba(12, 17, 28, 0.92)";
        targetCtx.strokeStyle = "rgba(255, 255, 255, 0.25)";
        targetCtx.lineWidth = 1;
        
        if (targetCtx.roundRect) {
            targetCtx.beginPath();
            targetCtx.roundRect(boxX, boxY, boxW, boxH, 4);
            targetCtx.fill();
            targetCtx.stroke();
        } else {
            targetCtx.fillRect(boxX, boxY, boxW, boxH);
            targetCtx.strokeRect(boxX, boxY, boxW, boxH);
        }

        targetCtx.fillStyle = "#f8fafc";
        targetCtx.textAlign = "center";
        targetCtx.textBaseline = "middle";
        targetCtx.fillText(hoveredSlotName, boxX + boxW / 2, boxY + boxH / 2);
        targetCtx.restore();
    }

    win.slotHitAreas = hitAreas;
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

// マップボタンの当たり判定やクリック処理用（必要に応じて別ファイルやイベントで参照してください）
let worldMapButtons = [];

function drawWorldMapWindow() {
    const win = gameWindows.worldmap;
    if (!win.isOpen) return;

    // 1. ウィンドウ本体の描画
    drawSimpleWindow("🗺️ World Map - エリア選択", win.x, win.y, win.w, win.h);

    // 2. 12マップ分のグリッド設定 (4列 × 3行)
    const cols = 4;
    const rows = 3;
    const startX = win.x + 35;
    const startY = win.y + 65;
    const btnWidth = 140;
    const btnHeight = 92;
    const gapX = 18;
    const gapY = 16;

    // クリック判定用に配列をリセット
    worldMapButtons = [];

    // マウス座標（グローバル変数 mouseX, mouseY がある前提。無い場合は適宜修正してください）
    const mx = typeof mouseX !== 'undefined' ? mouseX : -1;
    const my = typeof mouseY !== 'undefined' ? mouseY : -1;

    ctx.save();
    for (let i = 0; i < 12; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const bx = startX + col * (btnWidth + gapX);
        const by = startY + row * (btnHeight + gapY);

        // ホバー判定
        const isHovered = mx >= bx && mx <= bx + btnWidth && my >= by && my <= by + btnHeight;

        // ボタン情報を保持（クリック時のマップ移動などに使えます）
        worldMapButtons.push({ mapId: i + 1, x: bx, y: by, w: btnWidth, h: btnHeight });

        // 🌟 マップカードの背景グラデーション
        const grad = ctx.createLinearGradient(bx, by, bx, by + btnHeight);
        if (isHovered) {
            grad.addColorStop(0, 'rgba(51, 65, 85, 0.95)');
            grad.addColorStop(1, 'rgba(30, 41, 59, 0.95)');
            ctx.strokeStyle = '#38bdf8'; // ホバー時はシアンに光る
            ctx.lineWidth = 2;
            ctx.shadowColor = 'rgba(56, 189, 248, 0.5)';
            ctx.shadowBlur = 10;
        } else {
            grad.addColorStop(0, 'rgba(30, 41, 59, 0.85)');
            grad.addColorStop(1, 'rgba(15, 23, 42, 0.95)');
            ctx.strokeStyle = 'rgba(96, 165, 250, 0.3)';
            ctx.lineWidth = 1;
            ctx.shadowBlur = 0;
        }

        // カード本体の描画（角丸）
        ctx.fillStyle = grad;
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(bx, by, btnWidth, btnHeight, 8);
        } else {
            ctx.rect(bx, by, btnWidth, btnHeight); // roundRect非対応ブラウザ用フォールバック
        }
        ctx.fill();
        ctx.stroke();

        ctx.shadowBlur = 0; // 影をリセット

        // マップ名テキスト
        ctx.fillStyle = isHovered ? '#ffffff' : '#93c5fd';
        ctx.font = 'bold 15px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`マップ ${i + 1}`, bx + btnWidth / 2, by + btnHeight / 2 - 8);

        // サブテキスト（難易度やステータス感の演出用）
        ctx.fillStyle = '#64748b';
        ctx.font = '11px sans-serif';
        ctx.fillText(`Area 0${i + 1}`, bx + btnWidth / 2, by + btnHeight / 2 + 16);
    }
    ctx.restore();
}

function drawMiniMapWindow(hero) {
    const win = gameWindows?.minimap;
    if (!win || !win.isOpen) return;

    // 基本ウィンドウ枠（タイトルバー込み）
    if (typeof drawSimpleWindow === 'function') {
        drawSimpleWindow("📍 Mini Map", win.x, win.y, win.w, win.h);
    } else {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(win.x, win.y, win.w, win.h);
    }

    const headerHeight = 26;
    const padding = 8;
    const mapArea = {
        x: win.x + padding,
        y: win.y + headerHeight + padding,
        w: Math.max(40, win.w - padding * 2),
        h: Math.max(40, win.h - headerHeight - padding * 2)
    };

    ctx.save();
    
    // 領域外への描画はみ出しを防止
    ctx.beginPath();
    ctx.rect(mapArea.x, mapArea.y, mapArea.w, mapArea.h);
    ctx.clip();

    // 暗いRPG風ミニマップ背景
    ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
    ctx.fillRect(mapArea.x, mapArea.y, mapArea.w, mapArea.h);

    // マップデータ安全取得 ＋ 空データならデフォルトフォールバック
    let currentMap = (typeof MAP_DATA !== 'undefined' && MAP_DATA) ? MAP_DATA : null;
    if (!currentMap || !Array.isArray(currentMap.platforms) || currentMap.platforms.length === 0) {
        currentMap = {
            platforms: [
                { x: 50,  y: 450, w: 180, h: 20 },
                { x: 300, y: 300, w: 200, h: 20 }, 
                { x: 550, y: 150, w: 200, h: 20 } 
            ],
            ladders: [{ x: 580, y1: 130, y2: 565 }]
        };
    }

    // 実際の要素からワールドの端を動적算出
    let maxW = 800;
    let maxH = 600;
    if (Array.isArray(currentMap.platforms)) {
        for (const p of currentMap.platforms) {
            maxW = Math.max(maxW, (p.x || 0) + (p.w || 0) + 40);
            maxH = Math.max(maxH, (p.y || 0) + (p.h || 0) + 40);
        }
    }
    if (Array.isArray(currentMap.ladders)) {
        for (const l of currentMap.ladders) {
            maxW = Math.max(maxW, (l.x || 0) + 40);
            maxH = Math.max(maxH, Math.max(l.y1 || 0, l.y2 || 0) + 40);
        }
    }
    const groundYSetting = SETTINGS?.SYSTEM?.GROUND_Y || 565;
    maxH = Math.max(maxH, groundYSetting + 50);

    const WORLD_W = currentMap.width || maxW;
    const WORLD_H = currentMap.height || maxH;

    const scaleX = mapArea.w / WORLD_W;
    const scaleY = mapArea.h / WORLD_H;

    // 地面
    const gx = mapArea.x;
    const gy = mapArea.y + groundYSetting * scaleY;
    const gw = mapArea.w;
    const gh = Math.max(4, (WORLD_H - groundYSetting + 40) * scaleY);

    ctx.fillStyle = '#334155';
    ctx.fillRect(gx, gy, gw, gh);
    ctx.fillStyle = '#64748b';
    ctx.fillRect(gx, gy, gw, Math.max(2, gh * 0.18));

    // はしご
    if (Array.isArray(currentMap.ladders)) {
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.55)';
        ctx.lineWidth = Math.max(1.5, 2 * scaleX);
        for (const l of currentMap.ladders) {
            const lx = mapArea.x + (l.x || 0) * scaleX;
            const ly1 = mapArea.y + (l.y1 || 0) * scaleY;
            const ly2 = mapArea.y + (l.y2 || 0) * scaleY;
            ctx.beginPath();
            ctx.moveTo(lx, ly1);
            ctx.lineTo(lx, ly2);
            ctx.stroke();
        }
    }

    // 足場
    if (Array.isArray(currentMap.platforms)) {
        ctx.fillStyle = '#cbd5e1';
        for (const p of currentMap.platforms) {
            const px = mapArea.x + (p.x || 0) * scaleX;
            const py = mapArea.y + (p.y || 0) * scaleY;
            const pw = Math.max(3, (p.w || 50) * scaleX);
            const ph = Math.max(3, (p.h || 10) * scaleY);
            ctx.fillRect(px, py, pw, ph);
        }
    }

    // 🌟 ネスト構造対応のプレイヤー検出 & 手動オフセット調整
    const rawHero = hero 
        || (typeof player !== 'undefined' ? player : null)
        || (typeof localPlayer !== 'undefined' ? localPlayer : null)
        || (typeof myPlayer !== 'undefined' ? myPlayer : null)
        || (typeof window !== 'undefined' ? (window.player || window.hero || window.localPlayer) : null);

    const hxVal = rawHero ? (rawHero.x ?? rawHero.pos?.x ?? rawHero.position?.x) : undefined;
    const hyVal = rawHero ? (rawHero.y ?? rawHero.pos?.y ?? rawHero.position?.y) : undefined;

    if (rawHero && typeof hxVal === 'number' && typeof hyVal === 'number') {
        // 🔧 【手動調整用】足場にぴったり乗せるためのピクセル補正
        const manualOffsetX = 0;
        const manualOffsetY = 25; // 浮きが気になる場合はここを調整（プラスで下へ、マイナスで上へ：例: 15〜25など）

        const targetX = hxVal + manualOffsetX;
        const targetY = hyVal + manualOffsetY;

        const hx = mapArea.x + targetX * scaleX;
        const hy = mapArea.y + targetY * scaleY;

        ctx.fillStyle = '#f43f5e'; // ピンクドット
        ctx.beginPath();
        ctx.arc(hx, hy, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    ctx.restore();

    // ミニマップ内周りのボーダー
    ctx.save();
    ctx.strokeStyle = 'rgba(100, 116, 139, 0.8)';
    ctx.lineWidth = 1;
    ctx.strokeRect(mapArea.x, mapArea.y, mapArea.w, mapArea.h);
    ctx.restore();
}

function drawJournalWindow() {
    const win = gameWindows.journal;
    if (!win.isOpen) return;
    drawSimpleWindow("📖 Journal", win.x, win.y, win.w, win.h);
}

// モンスターごとの「黒枠付き画像」を保存しておく倉庫
const monsterOutlineCache = {};

// ============================================================
// 🎨 事前計算用キャッシュ（初期化時に一度だけ作る、または使い回す）
// ============================================================
const slotCacheCanvas = document.createElement('canvas');
slotCacheCanvas.width = 42;
slotCacheCanvas.height = 42;
const cacheCtx = slotCacheCanvas.getContext('2d');

// 角丸付き斜めカットパスの共通ヘルパー
const makeRoundedBevelPath = (c, x, y, w, h, cut, r) => {
    c.beginPath();
    c.moveTo(x, y + cut);
    c.lineTo(x + cut, y);
    c.lineTo(x + w - r, y);
    c.arcTo(x + w, y, x + w, y + r, r);
    c.lineTo(x + w, y + h - r);
    c.arcTo(x + w, y + h, x + w - r, y + h, r);
    c.lineTo(x + r, y + h);
    c.arcTo(x, y + h, x, y + h - r, r);
    c.closePath();
};

// ============================================================
// :::DRAW_BOOK_WINDOW::: 📕 モンスター図鑑（キー完全同期・マウス操作対応版）
// ============================================================
const _staticMonsterKeys = Array.from({ length: 102 }, (_, i) => `monster${i + 1}`);

// マウス操作用の状態管理変数
let isDraggingBookScroll = false;
let bookScrollDragStartY = 0;
let bookScrollStartScrollY = 0;

const _bookCardPath = (c, x, y, w, h, cut, r) => {
    c.beginPath();
    c.moveTo(x, y + cut);
    c.lineTo(x + cut, y);
    c.lineTo(x + w - r, y);
    if (r > 0) c.arcTo(x + w, y, x + w, y + r, r);
    else c.lineTo(x + w, y);
    c.lineTo(x + w, y + h - r);
    if (r > 0) c.arcTo(x + w, y + h, x + w - r, y + h, r);
    else c.lineTo(x + w, y + h);
    c.lineTo(x + r, y + h);
    if (r > 0) c.arcTo(x, y + h, x, y + h - r, r);
    else c.lineTo(x, y + h);
    c.closePath();
};


// ==========================================
// カードBOOKキャッシュ用変数（ファイル上部の適切な位置に置いてください）
// ==========================================
let _bookContentCacheCanvas = null;
let _bookCacheLastDataHash = "";

function drawBookWindow() {

    console.log("📖 カードBOOK描画中...");
    
    const win = gameWindows.book;
    if (!win.isOpen) return;

    if (typeof playerCardCollection === 'undefined') {
        return;
    }

    // 1. ベースウィンドウ
    drawHeavyBookWindow("📕 Monster Collection Book", win.x, win.y, win.w, win.h);

    ctx.save();

    // 2. レイアウト計算 ＆ スクロールバー領域の確保
    const paddingX = 12;
    const headerH = 40;  
    const footerH = 30;  
    const scrollbarW = 12; 
    
    const contentX = win.x + paddingX;
    const contentY = win.y + headerH;
    const contentW = win.w - (paddingX * 2) - scrollbarW - 6; 
    const contentH = win.h - headerH - footerH - 6;

    // クリッピング領域（本文のみ）
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(contentX, contentY, contentW, contentH, 4);
    } else {
        ctx.rect(contentX, contentY, contentW, contentH);
    }
    ctx.clip(); 

    const startX = 4;  
    const startY = 10;
    
    const baseItemSize = typeof drawSize !== 'undefined' ? drawSize : 40; 
    
    const slotsPerRow = 6;  
    const hGap = 4;         
    const vGapRow = 12;     
    
    const cardW = baseItemSize * 0.88; 
    const cardH = baseItemSize * 1.15;
    
    const blockPadTop = 26; 
    const blockPadBottom = 14; 
    
    const innerCardBlockWidth = (slotsPerRow * baseItemSize) + (slotsPerRow - 1) * hGap;
    const availableWidth = contentW - 8; 
    const monsterBlockWidth = availableWidth; 
    const monsterBlockHeight = cardH + blockPadTop + blockPadBottom; 
    const blockPadX = (monsterBlockWidth - innerCardBlockWidth) / 2;

    // メインキャンバスのドット絵補間を無効化
    ctx.imageSmoothingEnabled = false;

    const cutSize = 5;      
    const outerRadius = 2;  

    // No.1〜No.102の固定スロット配列
    const TOTAL_BOOK_SLOTS = 102;
    
    if (typeof _cachedBookMonsterKeys === 'undefined' || !_cachedBookMonsterKeys) {
        const slots = new Array(TOTAL_BOOK_SLOTS);
        for (let i = 0; i < TOTAL_BOOK_SLOTS; i++) {
            slots[i] = `empty_slot_${i + 1}`;
        }

        Object.keys(playerCardCollection).forEach(key => {
            const match = key.match(/(\d+)/);
            if (match) {
                const num = parseInt(match[1], 10);
                if (num >= 1 && num <= TOTAL_BOOK_SLOTS) {
                    slots[num - 1] = key; 
                }
            }
        });
        _cachedBookMonsterKeys = slots;
    }
    const monsterKeys = _cachedBookMonsterKeys;

    if (typeof win.scrollY === 'undefined') win.scrollY = 0;

    const blockTotalHeight = monsterBlockHeight + vGapRow;
    const totalContentHeight = monsterKeys.length * blockTotalHeight + 20;
    const maxScrollY = Math.max(0, Math.ceil((totalContentHeight - contentH) / blockTotalHeight));
    
    // スクロール位置のクランプ
    win.scrollY = Math.max(0, Math.min(win.scrollY, maxScrollY));

    // 所持数の集計
    let ownedMonsterCount = 0;
    monsterKeys.forEach(monsterKey => {
        if (!monsterKey.startsWith('empty_slot_')) {
            const ranks = playerCardCollection[monsterKey];
            if (ranks) {
                const hasAnyCard = Object.values(ranks).some(r => r && r.unlocked);
                if (hasAnyCard) {
                    ownedMonsterCount++;
                }
            }
        }
    });

    // ==========================================
    // 3. 安全なハッシュ生成によるキャッシュ判定（JSON.stringify不使用）
    // ==========================================
    let currentDataHash = "";
    monsterKeys.forEach(monsterKey => {
        if (!monsterKey.startsWith('empty_slot_') && playerCardCollection[monsterKey]) {
            const ranks = playerCardCollection[monsterKey];
            for (let r = 1; r <= 6; r++) {
                if (ranks[r]) {
                    currentDataHash += `${r}:${ranks[r].unlocked ? 1 : 0}:${ranks[r].count || 0}|`;
                }
            }
        }
    });

    if (!_bookContentCacheCanvas || _bookCacheLastDataHash !== currentDataHash) {
        _bookCacheLastDataHash = currentDataHash;
        
        if (!_bookContentCacheCanvas) {
            _bookContentCacheCanvas = document.createElement('canvas');
        }
        _bookContentCacheCanvas.width = contentW;
        _bookContentCacheCanvas.height = totalContentHeight;
        const c = _bookContentCacheCanvas.getContext('2d');
        
        // キャッシュ側の基本設定
        c.imageSmoothingEnabled = false;
        if (typeof c.webkitImageSmoothingEnabled !== 'undefined') c.webkitImageSmoothingEnabled = false;
        if (typeof c.mozImageSmoothingEnabled !== 'undefined') c.mozImageSmoothingEnabled = false;
        if (typeof c.msImageSmoothingEnabled !== 'undefined') c.msImageSmoothingEnabled = false;

        // 全モンスターブロックをキャッシュに描き込む
        monsterKeys.forEach((monsterKey, globalIndex) => {
            const blockX = startX; 
            const blockY = startY + (globalIndex * blockTotalHeight);
            const isEmptyBlock = monsterKey.startsWith('empty_slot_');
            const slotNumber = globalIndex + 1;

            // モンスターブロック下敷き
            c.fillStyle = isEmptyBlock ? "rgba(15, 12, 10, 0.6)" : "rgba(22, 16, 11, 0.92)";
            c.strokeStyle = isEmptyBlock ? "rgba(100, 90, 80, 0.15)" : "rgba(190, 150, 100, 0.25)";
            c.lineWidth = 1;
            c.beginPath();
            if (typeof c.roundRect === 'function') {
                c.roundRect(blockX, blockY, monsterBlockWidth, monsterBlockHeight, 6);
            } else {
                c.rect(blockX, blockY, monsterBlockWidth, monsterBlockHeight);
            }
            c.fill();
            c.stroke();

            // モンスター名
            c.fillStyle = isEmptyBlock ? "#6b7280" : "#fde047"; 
            c.font = "bold 11px sans-serif";
            c.textAlign = "center";
            
            let displayName = `No. ${slotNumber}`;
            if (!isEmptyBlock) {
                if (typeof SERVER_ITEM_NAMES !== 'undefined' && SERVER_ITEM_NAMES[monsterKey]) {
                     displayName = SERVER_ITEM_NAMES[monsterKey].replace('カード', '').trim();
                } else if (typeof getMonsterDisplayName === 'function') {
                     displayName = getMonsterDisplayName(monsterKey);
                } else {
                     displayName = monsterKey; 
                }
            } else {
                displayName = `--- ??? [${slotNumber}] ---`;
            }
            
            c.fillText(displayName, blockX + monsterBlockWidth / 2, blockY + 16);

            // 6つのランクスロットを描画
            const rankList = [1, 2, 3, 4, 5, 6];
            const firstSlotX = blockX + blockPadX;
            const slotsStartY = blockY + blockPadTop; 

            rankList.forEach((rank, rankIndex) => {
                const slotX = firstSlotX + rankIndex * (baseItemSize + hGap);
                const slotY = slotsStartY;

                const cardDrawX = slotX + (baseItemSize - cardW) / 2;
                const cardDrawY = slotY + (baseItemSize - cardH) / 2;

                const ranks = !isEmptyBlock ? playerCardCollection[monsterKey] : null;
                const rankCard = ranks ? ranks[rank] : null; 
                const isUnlocked = rankCard && rankCard.unlocked;

                if (isUnlocked) {
                    let theme = {
                        glowColor: "#f59e0b", lightBorder: "#fef08a",
                        gradTop: "#fde047", gradMid: "#eab308", gradBottom: "#a16207",
                        innerTop: "#fef3c7", innerMid: "#fde68a", innerBottom: "#d1c4a9",
                        isDiamond: false,
                        isRainbow: false
                    };

                    if (rank === 1) {
                        // ブロンズ（銅）
                        theme = { glowColor: "#b45309", lightBorder: "#fed7aa", gradTop: "#fb923c", gradMid: "#c2410c", gradBottom: "#7c2d12", innerTop: "#ffedd5", innerMid: "#fed7aa", innerBottom: "#c2410c", isDiamond: false, isRainbow: false };
                    } else if (rank === 2) {
                        // シルバー（銀）
                        theme = { 
                            glowColor: "#94a3b8", 
                            lightBorder: "#e2e8f0", 
                            gradTop: "#cbd5e1", 
                            gradMid: "#64748b", 
                            gradBottom: "#334155", 
                            innerTop: "#f1f5f9", 
                            innerMid: "#cbd5e1", 
                            innerBottom: "#64748b", 
                            isDiamond: false, 
                            isRainbow: false 
                        };
                    } else if (rank === 3) {
                        // ゴールド（金）
                        theme = { glowColor: "#f59e0b", lightBorder: "#fef08a", gradTop: "#fde047", gradMid: "#eab308", gradBottom: "#a16207", innerTop: "#fef3c7", innerMid: "#fde68a", innerBottom: "#d1c4a9", isDiamond: false, isRainbow: false };
                    } else if (rank === 4) {
                        // 【プラチナ】シルバーよりワントーン明るい、気品のあるプラチナホワイト
                        theme = { 
                            glowColor: "#e2e8f0", 
                            lightBorder: "#ffffff", 
                            gradTop: "#ffffff",   // 一番上をピュアホワイトに近づける
                            gradMid: "#cbd5e1",   // 中間を明るいシルバー
                            gradBottom: "#64748b",// 下部を引き締める
                            innerTop: "#ffffff",  
                            innerMid: "#e2e8f0",  
                            innerBottom: "#cbd5e1", // インナーも全体的に少しトーンを明るく
                            isDiamond: false, 
                            isPlatinum: true, 
                            isRainbow: false 
                        };
                    } else if (rank === 5) {
    // 【高光量・ダイヤモンド】発光感とまばゆさを強めたハイエンドテーマ
    theme = { 
        glowColor: "#6ee7b7", // 発光感を強めた明るいミントシアンの光彩
        lightBorder: "#ffffff", // 縁取りを眩しい純白にしてハイライト感を強調
        gradTop: "#7dd3fc",   // 上部はより明るく輝くスカイブルー
        gradMid: "#0d9488",   // 深みのある青緑で奥行きをキープ
        gradBottom: "#042f2e",// 重厚なダークカラーで光のコントラストを最大化
        innerTop: "#ffffff",  // 内部のトップも純白で強い発光を表現
        innerMid: "#2dd4bf",  // 鮮やかなシアンの輝き
        innerBottom: "#0f766e", // 奥行きを感じさせる深い青緑
        isDiamond: true,  
        isRainbow: false 
    };
} else if (rank === 6) {
    // 【高光量・レインボー】眩い輝きとあふれるオーラをまとった最高レアテーマ
    theme = { 
        glowColor: "#ffeedd", // 暖かみと強烈な発光感を感じさせるホワイトゴールド・レインボーの光彩
        lightBorder: "#ffffff", // 眩い純白の縁取りで最高峰のハイライトを表現
        gradTop: "#ffffff",   // 頂点からまばゆい純白の光があふれ出す
        gradMid: "#ff77ff",   // 鮮やかさを増したマゼンタ・パープル・シアンのグラデーション
        gradBottom: "#220044",// 深みのあるダークパープルで光のコントラストを極限まで引き立てる
        innerTop: "#ffffff",  // 内部の起点も強烈な白発光
        innerMid: "#00ffff",  // 鮮烈なシアン（青緑）の輝きをプラス
        innerBottom: "#ffdd00",// 底部に向かってリッチなゴールド〜イエローへ変化
        isDiamond: false,  
        isRainbow: true       // レインボーアニメーション／特殊描画フラグ
    };
}

                    c.strokeStyle = theme.glowColor;
                    c.lineWidth = 3.5;
                    c.globalAlpha = 0.35;
                    _bookCardPath(c, cardDrawX - 1, cardDrawY - 1, cardW + 2, cardH + 2, cutSize + 1, outerRadius + 1);
                    c.stroke();

                    c.lineWidth = 2;
                    c.globalAlpha = 0.6;
                    _bookCardPath(c, cardDrawX - 0.5, cardDrawY - 0.5, cardW + 1, cardH + 1, cutSize, outerRadius);
                    c.stroke();
                    
                    c.globalAlpha = 1.0;

                    const frameGrad = c.createLinearGradient(cardDrawX, cardDrawY, cardDrawX, cardDrawY + cardH);
                    // ==========================================
// ★ フレーム（枠）側のレインボー
// ==========================================
if (theme.isRainbow) {
    frameGrad.addColorStop(0.00, "rgba(255, 120, 120, 1.0)");
    frameGrad.addColorStop(0.16, "rgba(255, 200, 90,  1.0)");
    frameGrad.addColorStop(0.33, "rgba(255, 255, 120, 1.0)");
    frameGrad.addColorStop(0.50, "rgba(90,  255, 150, 1.0)");
    frameGrad.addColorStop(0.66, "rgba(90,  230, 255, 1.0)");
    frameGrad.addColorStop(0.83, "rgba(200, 120, 255, 1.0)");
    frameGrad.addColorStop(1.00, "rgba(255, 120, 210, 1.0)");
} else if (theme.isDiamond) {
                        frameGrad.addColorStop(0.00, "#7dd3fc");
                        frameGrad.addColorStop(0.50, "#0284c7");
                        frameGrad.addColorStop(1.00, "#0369a1");
                    } else {
                        frameGrad.addColorStop(0, theme.gradTop); 
                        frameGrad.addColorStop(0.5, theme.gradMid); 
                        frameGrad.addColorStop(1, theme.gradBottom); 
                    }
                    c.fillStyle = frameGrad;
                    _bookCardPath(c, cardDrawX, cardDrawY, cardW, cardH, cutSize, outerRadius);
                    c.fill();

                    c.strokeStyle = theme.lightBorder;
                    c.lineWidth = 1;
                    _bookCardPath(c, cardDrawX, cardDrawY, cardW, cardH, cutSize, outerRadius);
                    c.stroke();

                    const innerMargin = 1.5; 
                    const innerX = cardDrawX + innerMargin;
                    const innerY = cardDrawY + innerMargin;
                    const innerW = cardW - innerMargin * 2;
                    const innerH = cardH - innerMargin * 2;
                    const innerCut = Math.max(0, cutSize - innerMargin);
                    const innerRadius = Math.max(0, outerRadius - innerMargin);

                    const innerGrad = c.createLinearGradient(innerX + innerW, innerY, innerX, innerY + innerH);
                    // ==========================================
// ★ フレーム（枠）側のレインボー
// ==========================================
if (theme.isRainbow) {
    frameGrad.addColorStop(0.00, "rgba(255, 120, 120, 1.0)");
    frameGrad.addColorStop(0.16, "rgba(255, 200, 90,  1.0)");
    frameGrad.addColorStop(0.33, "rgba(255, 255, 120, 1.0)");
    frameGrad.addColorStop(0.50, "rgba(90,  255, 150, 1.0)");
    frameGrad.addColorStop(0.66, "rgba(90,  230, 255, 1.0)");
    frameGrad.addColorStop(0.83, "rgba(200, 120, 255, 1.0)");
    frameGrad.addColorStop(1.00, "rgba(255, 120, 210, 1.0)");
} else if (theme.isDiamond) {
                        // ダイヤモンド用：深みと透明感のあるリッチなブルーグラデーション
                        innerGrad.addColorStop(0.00, "#e0f2fe");
                        innerGrad.addColorStop(0.25, "#bae6fd");
                        innerGrad.addColorStop(0.50, "#38bdf8");
                        innerGrad.addColorStop(0.75, "#0284c7");
                        innerGrad.addColorStop(1.00, "#0369a1");
                    } else {
                        innerGrad.addColorStop(0, theme.innerTop); 
                        innerGrad.addColorStop(0.5, theme.innerMid); 
                        innerGrad.addColorStop(1, theme.innerBottom);     
                    }
                    c.fillStyle = innerGrad;
                    _bookCardPath(c, innerX, innerY, innerW, innerH, innerCut, innerRadius);
                    c.fill();

                    const spriteName = monsterKey; 
                    if (typeof sprites !== 'undefined' && sprites.items && sprites.items[spriteName]) {
                        const img = sprites.items[spriteName];
                        if (img && img.complete && img.naturalWidth > 0) {
                            c.save();
                            _bookCardPath(c, innerX, innerY, innerW, innerH, innerCut, innerRadius);
                            c.clip(); 
                            
                            const centerX = Math.round(innerX + innerW / 2);
                            const centerY = Math.round(innerY + innerH / 2);
                            c.translate(centerX, centerY);
                            c.scale(-1, 1);
                            
                            const imgWidth = img.naturalWidth || img.width;
                            const imgHeight = img.naturalHeight || img.height;
                            const imgAspect = imgWidth / imgHeight;
                            
                            let drawImgW, drawImgH;
                            const baseSize = Math.min(innerW, innerH);
                            if (imgAspect > 1) {
                                drawImgW = Math.round(baseSize * 1.35);
                                drawImgH = Math.round(drawImgW / imgAspect);
                            } else if (imgAspect < 1) {
                                drawImgH = Math.round(baseSize * 1.40);
                                drawImgW = Math.round(drawImgH * imgAspect);
                            } else {
                                drawImgW = Math.round(baseSize * 1.35);
                                drawImgH = Math.round(baseSize * 1.35);
                            }

                            if (!img._crispCacheCanvas) {
                                img._crispCacheCanvas = document.createElement('canvas');
                                img._crispCacheCanvas.width = drawImgW;
                                img._crispCacheCanvas.height = drawImgH;
                                
                                const rc = img._crispCacheCanvas.getContext('2d');
                                rc.imageSmoothingEnabled = true;
                                rc.imageSmoothingQuality = 'high';
                                if (typeof rc.webkitImageSmoothingEnabled !== 'undefined') rc.webkitImageSmoothingEnabled = true;
                                if (typeof rc.mozImageSmoothingEnabled !== 'undefined') rc.mozImageSmoothingEnabled = true;
                                
                                rc.drawImage(img, 0, 0, imgWidth, imgHeight, 0, 0, drawImgW, drawImgH);
                            }

                            c.drawImage(
                                img._crispCacheCanvas, 
                                -Math.round(drawImgW / 2), 
                                -Math.round(drawImgH / 2), 
                                drawImgW, 
                                drawImgH
                            );
                            
                            c.restore();
                        }
                    }

                    // ==========================================
                    // ★ ダイヤモンド専用：太くまろやかに広がる光の帯
                    // ==========================================
                    if (theme.isDiamond) {
                        c.save();
                        _bookCardPath(c, innerX, innerY, innerW, innerH, innerCut, innerRadius);
                        c.clip();

                        // 斜めのグラデーション範囲
                        const shineGrad = c.createLinearGradient(innerX + innerW * 0.9, innerY + innerH * 0.1, innerX + innerW * 0.1, innerY + innerH * 0.9);
                        
                        // 中央の「光の帯の幅」を広く取るグラデーション
                        shineGrad.addColorStop(0.00, "rgba(255, 255, 255, 0.0)");
                        shineGrad.addColorStop(0.25, "rgba(255, 255, 255, 0.02)");
                        shineGrad.addColorStop(0.40, "rgba(255, 255, 255, 0.30)"); // 光の帯の入り口
                        shineGrad.addColorStop(0.50, "rgba(255, 255, 255, 0.60)"); // 中央の強いピーク
                        shineGrad.addColorStop(0.60, "rgba(255, 255, 255, 0.30)"); // 光の帯の出口（幅を太くキープ）
                        shineGrad.addColorStop(0.75, "rgba(255, 255, 255, 0.02)");
                        shineGrad.addColorStop(1.00, "rgba(255, 255, 255, 0.0)");

                        c.fillStyle = shineGrad;
                        c.fillRect(innerX, innerY, innerW, innerH);
                        c.restore();
                    }
					
					// ==========================================
// ★ ランク6（レインボー）専用：十字を使わない、ほんのりと気高い最高峰オーラ
// ==========================================
if (theme.isRainbow) {
    c.save();
    
    // 1. 他のランク（ダイヤモンド等）よりも一回り大きく、ふんわりと広がる上品な外周オーラ
    // （シアンやゴールドの優しい光を広い半径でぼかす）
    c.shadowColor = "rgba(255, 255, 255, 0.7)"; // 純白と虹色が混ざり合う柔らかい光
    c.shadowBlur = 18;                         // ランク5よりも広めに、かつ優しくぼかす
    c.shadowOffsetX = 0;
    c.shadowOffsetY = 0;

    // 2. カードの輪郭に沿って、主張しすぎない「極薄のプレミアムエッジ」を重ねる
    // 完全に真っ白にするのではなく、ほんのり虹色のニュアンスを含んだ光のフチ
    _bookCardPath(c, innerX, innerY, innerW, innerH, innerCut, innerRadius);
    c.strokeStyle = "rgba(255, 255, 255, 0.45)"; // 主張を抑え、下地の色と完全に調和させる
    c.lineWidth = 1.0;
    c.stroke();

    c.restore();
}
					
					// ==========================================
                    // ★ プラチナ専用：ほんのちょっぴり白い上品な光沢
                    // ==========================================
                    if (theme.isPlatinum) {
                        c.save();
                        _bookCardPath(c, innerX, innerY, innerW, innerH, innerCut, innerRadius);
                        c.clip();

                        // シルバーと差別化しつつ、白飛びさせない絶妙な白のグラデーション
                        const platShine = c.createLinearGradient(innerX, innerY, innerX + innerW, innerY + innerH);
                        platShine.addColorStop(0.00, "rgba(255, 255, 255, 0.35)"); // 少しだけ白の存在感をアップ
                        platShine.addColorStop(0.35, "rgba(255, 255, 255, 0.45)"); // ふんわり明るいハイライト
                        platShine.addColorStop(0.55, "rgba(255, 255, 255, 0.10)");
                        platShine.addColorStop(1.00, "rgba(255, 255, 255, 0.0)");

                        c.fillStyle = platShine;
                        c.fillRect(innerX, innerY, innerW, innerH);
                        c.restore();
                    }

                    // ==========================================
                    // ★ 完全ドット直描きによるクッキリ個数表示
                    // ==========================================
                    if (rankCard.count > 0) {
                        const countStr = `x${rankCard.count}`;
                        
                        const charW = 4; 
                        const charH = 5; 
                        const charGap = 1; 
                        const totalTextW = countStr.length * charW + (countStr.length - 1) * charGap;
                        
                        const labelW = totalTextW + 6;
                        const labelH = 11; 
                        const labelX = cardDrawX + cardW - labelW - 2;
                        const labelY = cardDrawY + cardH - labelH - 2;

                        c.fillStyle = "rgba(5, 3, 2, 0.95)";
                        c.strokeStyle = theme.glowColor;
                        c.lineWidth = 1;

                        c.beginPath();
                        if (typeof c.roundRect === 'function') {
                            c.roundRect(labelX, labelY, labelW, labelH, 2);
                        } else {
                            c.rect(labelX, labelY, labelW, labelH);
                        }
                        c.fill();
                        c.stroke();

                        const fontMap = {
                            'x': [1,0,1, 0,1,0, 0,1,0, 0,1,0, 1,0,1],
                            '0': [1,1,1, 1,0,1, 1,0,1, 1,0,1, 1,1,1],
                            '1': [0,1,0, 1,1,0, 0,1,0, 0,1,0, 1,1,1],
                            '2': [1,1,1, 0,0,1, 1,1,1, 1,0,0, 1,1,1],
                            '3': [1,1,1, 0,0,1, 1,1,1, 0,0,1, 1,1,1],
                            '4': [1,0,1, 1,0,1, 1,1,1, 0,0,1, 0,0,1],
                            '5': [1,1,1, 1,0,0, 1,1,1, 0,0,1, 1,1,1],
                            '6': [1,1,1, 1,0,0, 1,1,1, 1,0,1, 1,1,1],
                            '7': [1,1,1, 0,0,1, 0,1,0, 0,1,0, 0,1,0],
                            '8': [1,1,1, 1,0,1, 1,1,1, 1,0,1, 1,1,1],
                            '9': [1,1,1, 1,0,1, 1,1,1, 0,0,1, 1,1,1]
                        };

                        let drawCursorX = labelX + 3;
                        let drawCursorY = labelY + 3;

                        for (let i = 0; i < countStr.length; i++) {
                            const char = countStr[i];
                            const pattern = fontMap[char] || fontMap['0'];
                            
                            c.fillStyle = "#ffffff"; 
                            
                            for (let py = 0; py < charH; py++) {
                                for (let px = 0; px < 3; px++) {
                                    if (pattern[py * 3 + px] === 1) {
                                        c.fillRect(Math.round(drawCursorX + px), Math.round(drawCursorY + py), 1, 1);
                                    }
                                }
                            }
                            drawCursorX += charW + charGap;
                        }
                    }

                } else {
                    const cachedImg = getUnopenedCardImage(cardW, cardH, cutSize, outerRadius);
                    c.drawImage(cachedImg, cardDrawX - 5, cardDrawY - 5);
                }
            });
        });
    }

    // メイン画面へキャッシュされたコンテンツをスクロール位置に合わせて描画
    if (_bookContentCacheCanvas) {
        const srcY = win.scrollY * blockTotalHeight;
        ctx.drawImage(
            _bookContentCacheCanvas,
            0, srcY, contentW, contentH,
            contentX, contentY, contentW, contentH
        );
    }

    // クリッピングを解除してUI（スクロールバー・フッター）を描画
    ctx.restore(); 

    // ==========================================
    // 4. スクロールバー ＆ 上下ボタンの描画
    // ==========================================
    const sbX = contentX + contentW + 6;
    const sbY = contentY;
    const sbH = contentH;
    const btnSize = 14; 

    ctx.fillStyle = "rgba(10, 8, 6, 0.7)";
    ctx.strokeStyle = "rgba(150, 120, 80, 0.3)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(sbX, sbY, scrollbarW, sbH, 3);
    } else {
        ctx.rect(sbX, sbY, scrollbarW, sbH);
    }
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#d4b572";
    ctx.font = "9px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("▲", sbX + scrollbarW / 2, sbY + btnSize / 2);
    ctx.fillText("▼", sbX + scrollbarW / 2, sbY + sbH - btnSize / 2);

    const trackStartY = sbY + btnSize + 2;
    const trackHeight = sbH - (btnSize * 2) - 4;
    
    if (maxScrollY > 0) {
        const thumbH = Math.max(20, trackHeight * (contentH / totalContentHeight));
        const scrollRatio = win.scrollY / maxScrollY;
        const thumbY = trackStartY + (trackHeight - thumbH) * scrollRatio;

        ctx.fillStyle = "rgba(212, 181, 114, 0.65)";
        ctx.strokeStyle = "rgba(253, 224, 71, 0.4)";
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
            ctx.roundRect(sbX + 2, thumbY, scrollbarW - 4, thumbH, 2);
        } else {
            ctx.rect(sbX + 2, thumbY, scrollbarW - 4, thumbH);
        }
        ctx.fill();
        ctx.stroke();
    }

    // ==========================================
    // 5. フッターカウンターの描画
    // ==========================================
    const footerY = win.y + win.h - footerH - 6;
    const footerW = win.w - (paddingX * 2);
    const footerX = win.x + paddingX;

    ctx.fillStyle = "rgba(15, 11, 8, 0.85)";
    ctx.strokeStyle = "rgba(180, 140, 90, 0.3)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(footerX, footerY, footerW, 22, 3);
    } else {
        ctx.rect(footerX, footerY, footerW, 22);
    }
    ctx.fill();
    ctx.stroke();

    const completionRate = Math.floor((ownedMonsterCount / TOTAL_BOOK_SLOTS) * 100);
    const counterText = `Collection: ${ownedMonsterCount} / ${TOTAL_BOOK_SLOTS} (${completionRate}%)`;

    ctx.fillStyle = "#fde047";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(counterText, footerX + footerW / 2, footerY + 11);
}

function _drawSparkle(c, x, y, color) {
    c.save();
    c.fillStyle = color;
    c.shadowColor = color;
    c.shadowBlur = 6;
    // 小さな十字のきらめき
    c.fillRect(x - 4, y - 1, 8, 2);
    c.fillRect(x - 1, y - 4, 2, 8);
    c.restore();
}

// ------------------------------------------------------------
// 📚 重厚なアンティーク手帳ウィンドウ背景描画ヘルパー
// ------------------------------------------------------------
function drawHeavyBookWindow(title, x, y, w, h) {
    ctx.save();

    ctx.shadowBlur = 15;
    ctx.shadowColor = "rgba(0, 0, 0, 0.7)";

    const borderGrad = ctx.createLinearGradient(x, y, x, y + h);
    borderGrad.addColorStop(0, "#d4af37"); 
    borderGrad.addColorStop(0.15, "#856514");
    borderGrad.addColorStop(0.5, "#42310a");
    borderGrad.addColorStop(0.85, "#856514");
    borderGrad.addColorStop(1, "#d4af37");

    ctx.fillStyle = borderGrad;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 8);
    ctx.fill();

    const innerX = x + 3;
    const innerY = y + 3;
    const innerW = w - 6;
    const innerH = h - 6;

    const leatherGrad = ctx.createRadialGradient(
        x + w / 2, y + h / 2, 20,
        x + w / 2, y + h / 2, Math.max(w, h) * 0.8
    );
    leatherGrad.addColorStop(0, "#3d291d"); 
    leatherGrad.addColorStop(1, "#18100b"); 

    ctx.shadowColor = "transparent";
    ctx.fillStyle = leatherGrad;
    ctx.beginPath();
    ctx.roundRect(innerX, innerY, innerW, innerH, 6);
    ctx.fill();

    const titleBarH = 34;
    const barGrad = ctx.createLinearGradient(innerX, innerY, innerX, innerY + titleBarH);
    barGrad.addColorStop(0, "rgba(70, 50, 35, 0.85)");
    barGrad.addColorStop(1, "rgba(35, 24, 16, 0.95)");

    ctx.fillStyle = barGrad;
    ctx.beginPath();
    ctx.roundRect(innerX + 4, innerY + 4, innerW - 8, titleBarH, 4);
    ctx.fill();

    ctx.strokeStyle = "rgba(212, 175, 55, 0.4)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(innerX + 12, innerY + titleBarH + 4);
    ctx.lineTo(innerX + innerW - 12, innerY + titleBarH + 4);
    ctx.stroke();

    ctx.shadowBlur = 4;
    ctx.shadowColor = "#000000";
    ctx.fillStyle = "#fde047";
    ctx.font = "bold 13px 'Arial Black', Gadget, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(title, innerX + 16, innerY + 22);

    ctx.restore();
}

// ============================================================
// 📚 BOOK用スクロール設定（ホイール・マウス操作・スピード調整版）
// ============================================================
if (typeof window !== 'undefined' && !window._bookScrollInitialized) {
    window._bookScrollInitialized = true;
    
    // ホイールの蓄積量を記憶する変数
    if (typeof window._bookScrollAccumulator === 'undefined') {
        window._bookScrollAccumulator = 0;
    }
    
    // ホイールスクロール（ブラウザスクロール抑制対応版）
    window.addEventListener('wheel', (e) => {
        if (typeof gameWindows !== 'undefined' && gameWindows.book && gameWindows.book.isOpen) {
            const win = gameWindows.book;
            
            // マウスカーソルがBOOKウィンドウの範囲内にあるか判定
            const mouseX = e.offsetX !== undefined ? e.offsetX : (e.clientX - (typeof canvas !== 'undefined' ? canvas.getBoundingClientRect().left : 0));
            const mouseY = e.offsetY !== undefined ? e.offsetY : (e.clientY - (typeof canvas !== 'undefined' ? canvas.getBoundingClientRect().top : 0));

            const isInsideBook = (mouseX >= win.x && mouseX <= win.x + win.w && mouseY >= win.y && mouseY <= win.y + win.h);

            if (isInsideBook) {
                // BOOK上でのホイール操作時は、背後のブラウザスクロールを完全に防ぐ
                e.preventDefault();

                if (typeof win.scrollY === 'undefined') win.scrollY = 0;
                
                // 最大スクロール値の計算
                const blockTotalHeight = (typeof drawSize !== 'undefined' ? drawSize : 40) * 1.15 + 26 + 14 + 12;
                const headerH = 40;
                const footerH = 30;
                const contentH = win.h - headerH - footerH - 6;
                const totalContentHeight = 102 * blockTotalHeight;
                const maxScrollY = Math.max(0, Math.ceil((totalContentHeight - contentH) / blockTotalHeight));

                // 🌟 【スピード調整ポイント】感度のしきい値（インベントリと同じ「40」に設定）
                // 数値が大きいほど重く、小さいほど軽くなります
                const scrollThreshold = 40;
                window._bookScrollAccumulator += e.deltaY;

                if (window._bookScrollAccumulator >= scrollThreshold) {
                    // 下に1行（または1ブロック）進める
                    win.scrollY = Math.min(maxScrollY, win.scrollY + 1);
                    window._bookScrollAccumulator = 0; // リセット
                } else if (window._bookScrollAccumulator <= -scrollThreshold) {
                    // 上に1行（または1ブロック）戻す
                    win.scrollY = Math.max(0, win.scrollY - 1);
                    window._bookScrollAccumulator = 0; // リセット
                }
            }
        }
    }, { passive: false }); // passive: false にすることで e.preventDefault() を有効化

    // マウスダウン（スクロールバーのクリック・ドラッグ開始）
    window.addEventListener('mousedown', (e) => {
        if (typeof gameWindows === 'undefined' || !gameWindows.book || !gameWindows.book.isOpen) return;
        
        const mouseX = e.offsetX !== undefined ? e.offsetX : (e.clientX - (typeof canvas !== 'undefined' ? canvas.getBoundingClientRect().left : 0));
        const mouseY = e.offsetY !== undefined ? e.offsetY : (e.clientY - (typeof canvas !== 'undefined' ? canvas.getBoundingClientRect().top : 0));
        
        const win = gameWindows.book;
        const paddingX = 12;
        const headerH = 40;  
        const footerH = 30;  
        const scrollbarW = 12; 
        
        const contentX = win.x + paddingX;
        const contentY = win.y + headerH;
        const contentW = win.w - (paddingX * 2) - scrollbarW - 6; 
        const contentH = win.h - headerH - footerH - 6; 

        const sbX = contentX + contentW + 6;
        const sbY = contentY;
        const sbH = contentH;
        const btnSize = 14;

        if (mouseX < sbX || mouseX > sbX + scrollbarW || mouseY < sbY || mouseY > sbY + sbH) {
            return;
        }

        // スクロールバー操作時はテキスト選択などのブラウザデフォルト挙動を防ぐ
        e.preventDefault();

        const blockTotalHeight = (typeof drawSize !== 'undefined' ? drawSize : 40) * 1.15 + 26 + 14 + 12;
        const totalContentHeight = 102 * blockTotalHeight;
        const maxScrollY = Math.max(0, Math.ceil((totalContentHeight - contentH) / blockTotalHeight));

        // ▲ボタン
        if (mouseY >= sbY && mouseY <= sbY + btnSize) {
            win.scrollY = Math.max(0, win.scrollY - 1);
            return;
        }
        // ▼ボタン
        if (mouseY >= sbY + sbH - btnSize && mouseY <= sbY + sbH) {
            win.scrollY = Math.min(maxScrollY, win.scrollY + 1);
            return;
        }

        const trackStartY = sbY + btnSize + 2;
        const trackHeight = sbH - (btnSize * 2) - 4;
        
        if (maxScrollY > 0) {
            const thumbH = Math.max(20, trackHeight * (contentH / totalContentHeight));
            const scrollRatio = maxScrollY > 0 ? win.scrollY / maxScrollY : 0;
            const thumbY = trackStartY + (trackHeight - thumbH) * scrollRatio;

            if (mouseY >= thumbY && mouseY <= thumbY + thumbH) {
                isDraggingBookScroll = true;
                bookScrollDragStartY = mouseY;
                bookScrollStartScrollY = win.scrollY;
            } else {
                const clickRatio = Math.max(0, Math.min(1, (mouseY - trackStartY - thumbH / 2) / (trackHeight - thumbH)));
                win.scrollY = Math.round(clickRatio * maxScrollY);
            }
        }
    });

    // マウスムーブ（ドラッグ中のスクロール移動）
    window.addEventListener('mousemove', (e) => {
        if (!isDraggingBookScroll) return;
        const win = gameWindows.book;
        if (!win || !win.isOpen) return;

        e.preventDefault();

        const mouseY = e.offsetY !== undefined ? e.offsetY : (e.clientY - (typeof canvas !== 'undefined' ? canvas.getBoundingClientRect().top : 0));
        const contentH = win.h - 40 - 30 - 6;
        const blockTotalHeight = (typeof drawSize !== 'undefined' ? drawSize : 40) * 1.15 + 26 + 14 + 12;
        const totalContentHeight = 102 * blockTotalHeight;
        const maxScrollY = Math.max(0, Math.ceil((totalContentHeight - contentH) / blockTotalHeight));

        const btnSize = 14;
        const trackHeight = contentH - (btnSize * 2) - 4;
        const thumbH = Math.max(20, trackHeight * (contentH / totalContentHeight));
        const effectiveTrackHeight = trackHeight - thumbH;

        if (effectiveTrackHeight > 0) {
            const deltaY = mouseY - bookScrollDragStartY;
            const deltaScrollRatio = deltaY / effectiveTrackHeight;
            const newScrollY = bookScrollStartScrollY + (deltaScrollRatio * maxScrollY);
            win.scrollY = Math.max(0, Math.min(maxScrollY, Math.round(newScrollY)));
        }
    });

    // マウスアップ（ドラッグ終了）
    window.addEventListener('mouseup', () => {
        isDraggingBookScroll = false;
    });
}

// キャッシュ生成用関数群
const _cachedUnlockedCardImages = {};
function getUnlockedCardImage(rank, w, h, cut, r) {
    if (_cachedUnlockedCardImages[rank]) return _cachedUnlockedCardImages[rank];

    const canvas = document.createElement('canvas');
    canvas.width = w + 6;
    canvas.height = h + 6;
    const c = canvas.getContext('2d');

    const cardDrawX = 3;
    const cardDrawY = 3;

    let glowColor, lightBorder, cTop, cMid, cBot;
    if (rank === 1) { glowColor = "#b45309"; lightBorder = "#fed7aa"; cTop = "#fdba74"; cMid = "#c2410c"; cBot = "#7c2d12"; }
    else if (rank === 2) { glowColor = "#94a3b8"; lightBorder = "#ffffff"; cTop = "#f8fafc"; cMid = "#94a3b8"; cBot = "#334155"; }
    else if (rank === 3) { glowColor = "#f59e0b"; lightBorder = "#fef08a"; cTop = "#fde047"; cMid = "#d97706"; cBot = "#78350f"; }
    else if (rank === 4) { glowColor = "#38bdf8"; lightBorder = "#bae6fd"; cTop = "#7dd3fc"; cMid = "#0284c7"; cBot = "#0369a1"; }
    else if (rank === 5) { glowColor = "#c084fc"; lightBorder = "#f3e8ff"; cTop = "#f0abfc"; cMid = "#9333ea"; cBot = "#581c87"; }
    else { glowColor = "#f43f5e"; lightBorder = "#ffffff"; cTop = "#fda4af"; cMid = "#e11d48"; cBot = "#881337"; }

    c.strokeStyle = glowColor;
    c.lineWidth = 2;
    c.globalAlpha = 0.6;
    _bookCardPath(c, cardDrawX - 0.5, cardDrawY - 0.5, w + 1, h + 1, cut, r);
    c.stroke();
    c.globalAlpha = 1.0;

    const frameGrad = c.createLinearGradient(cardDrawX, cardDrawY, cardDrawX, cardDrawY + h);
    frameGrad.addColorStop(0, cTop); 
    frameGrad.addColorStop(0.5, cMid); 
    frameGrad.addColorStop(1, cBot); 
    c.fillStyle = frameGrad;
    _bookCardPath(c, cardDrawX, cardDrawY, w, h, cut, r);
    c.fill();

    c.strokeStyle = lightBorder;
    c.lineWidth = 1;
    _bookCardPath(c, cardDrawX, cardDrawY, w, h, cut, r);
    c.stroke();

    const innerMargin = 1.5; 
    const innerX = cardDrawX + innerMargin;
    const innerY = cardDrawY + innerMargin;
    const innerW = w - innerMargin * 2;
    const innerH = h - innerMargin * 2;
    const innerCut = Math.max(0, cut - innerMargin);
    const innerRadius = Math.max(0, r - innerMargin);

    const innerGrad = c.createLinearGradient(innerX, innerY, innerX, innerY + innerH);
    innerGrad.addColorStop(0, "#ffffff"); 
    innerGrad.addColorStop(0.5, cTop); 
    innerGrad.addColorStop(1, cMid);     
    c.fillStyle = innerGrad;
    _bookCardPath(c, innerX, innerY, innerW, innerH, innerCut, innerRadius);
    c.fill();

    _cachedUnlockedCardImages[rank] = canvas;
    return canvas;
}

let _cachedUnopenedCardImage = null;
function getUnopenedCardImage(w, h, cut, r) {
    if (_cachedUnopenedCardImage && _cachedUnopenedCardImage.width === w + 10) {
        return _cachedUnopenedCardImage;
    }

    const canvas = document.createElement('canvas');
    canvas.width = w + 10; 
    canvas.height = h + 10;
    const c = canvas.getContext('2d');

    const cardDrawX = 5;
    const cardDrawY = 5;

    const frameGrad = c.createLinearGradient(cardDrawX, cardDrawY, cardDrawX, cardDrawY + h);
    frameGrad.addColorStop(0, "#826953");  
    frameGrad.addColorStop(0.5, "#594738"); 
    frameGrad.addColorStop(1, "#382b21");  

    c.fillStyle = frameGrad;
    _bookCardPath(c, cardDrawX, cardDrawY, w, h, cut, r);
    c.fill();

    c.lineWidth = 1;
    c.strokeStyle = "#b09375";
    _bookCardPath(c, cardDrawX, cardDrawY, w, h, cut, r);
    c.stroke();

    const innerMargin = 1.5; 
    const innerX = cardDrawX + innerMargin;
    const innerY = cardDrawY + innerMargin;
    const innerW = w - innerMargin * 2;
    const innerH = h - innerMargin * 2;
    const innerCut = Math.max(0, cut - innerMargin);
    const innerRadius = Math.max(0, r - innerMargin);

    const pitGrad = c.createLinearGradient(innerX, innerY, innerX, innerY + innerH);
    pitGrad.addColorStop(0, "#382c23"); 
    pitGrad.addColorStop(1, "#493b30");

    c.fillStyle = pitGrad;
    _bookCardPath(c, innerX, innerY, innerW, innerH, innerCut, innerRadius);
    c.fill();

    c.lineWidth = 1;
    c.strokeStyle = "#1a130f";
    _bookCardPath(c, innerX, innerY, innerW, innerH, innerCut, innerRadius);
    c.stroke();

    c.fillStyle = "rgba(215, 190, 160, 0.75)";
    c.font = "bold 11px sans-serif";
    c.textAlign = "center";
    c.textBaseline = "middle";
    
    // 🌟 視覚的な中心に合わせるため、Y座標に「+2」のオフセットを追加
    c.fillText("?", cardDrawX + w / 2, cardDrawY + h / 2 + 2);

    _cachedUnopenedCardImage = canvas;
    return canvas;
}

socket.on('card_collection_update', (collectionData) => {
    playerCardCollection = collectionData;
});

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

// ============================================================
// :::KEY_CONFIG_DATA::: ⌨️ キーコンフィグのデータと初期キーマップの定義
// ============================================================
let currentKeyConfig = {
    status:      { label: 'ステータス',     key: 's', keyName: 'S' },
    equipment:   { label: '装備',         key: 'e', keyName: 'E' },
    inventory:   { label: 'インベントリ',   key: 'i', keyName: 'I' },
    skill:       { label: 'スキル',       key: 'k', keyName: 'K' },
    avatar:      { label: 'アバター',     key: 'a', keyName: 'A' },
    upgrade:     { label: 'アップグレード', key: 'u', keyName: 'U' },
    quest:       { label: 'クエスト',     key: 'q', keyName: 'Q' },
    worldmap:    { label: 'ワールドマップ', key: 'w', keyName: 'W' },
    minimap:     { label: 'ミニマップ',   key: 'm', keyName: 'M' },
    journal:     { label: '日記',         key: 'j', keyName: 'J' },
    book:        { label: 'ブック',       key: 'b', keyName: 'B' },
    guild:       { label: 'ギルド',       key: 'g', keyName: 'G' },
    friend:      { label: 'フレンドリスト', key: 'f', keyName: 'F' },
    party:       { label: 'パーティ',     key: 'p', keyName: 'P' },
    trade:       { label: 'トレード',     key: 't', keyName: 'T' },
    log:         { label: 'ログ',         key: 'l', keyName: 'L' },
    event:       { label: 'イベント',     key: 'n', keyName: 'N' },
    options:     { label: 'オプション',   key: 'o', keyName: 'O' },
    help:        { label: 'ヘルプ',       key: 'h', keyName: 'H' },
    extra:       { label: 'エクストラ',   key: 'x', keyName: 'X' }
};

let waitingForKeyChange = null; 
let isKeyConfigOpen = false;
let optionsHitAreas = [];

// 💡 確実に安全に keyMap を初期化・更新する関数
function updateKeyMapFromConfig() {
    // window.keyMap が未定義なら確実にオブジェクトとして生成
    if (typeof window.keyMap !== 'object' || window.keyMap === null) {
        window.keyMap = {};
    } else {
        // 既存のプロパティをクリア
        for (const k in window.keyMap) {
            delete window.keyMap[k];
        }
    }

    // 再マッピング
    for (const [actionKey, config] of Object.entries(currentKeyConfig)) {
        if (config && config.key) {
            window.keyMap[config.key.toLowerCase()] = actionKey;
        }
    }
}

// グローバルスコープにも keyMap を紐付け
if (typeof window.keyMap === 'undefined') {
    window.keyMap = {};
}

// 初回起動時にマッピングを作成
updateKeyMapFromConfig();


// ============================================================
// :::DRAW_OPTIONS_WINDOW::: ⚙️ オプション画面（キーコンフィグ対応版）
// ============================================================
function drawOptionsWindow() {
    const win = gameWindows.options;
    if (!win.isOpen) return;

    const targetCtx = typeof ctx !== 'undefined' ? ctx : (window.ctx || null);
    if (!targetCtx) return;

    targetCtx.save();
    drawSimpleWindow("⚙️ Options", win.x, win.y, win.w, win.h);
    optionsHitAreas = [];

    // --- 【サブ画面：キーコンフィグ設定画面】 ---
    if (isKeyConfigOpen) {
        targetCtx.textAlign = "left";
        targetCtx.textBaseline = "top";
        targetCtx.font = "12px 'MS PGothic', sans-serif";

        let startY = win.y + 35;
        const startX = win.x + 15;

        targetCtx.fillStyle = "#fbbf24";
        targetCtx.fillText("【 キーコンフィグ設定 】", startX, startY);
        startY += 20;

        if (waitingForKeyChange) {
            targetCtx.fillStyle = "#ef4444";
            targetCtx.fillText("変更するキーを押してください...", startX, startY);
        } else {
            targetCtx.fillStyle = "#94a3b8";
            targetCtx.fillText("変更したい項目をクリックしてね", startX, startY);
        }
        startY += 18;

        for (const [actionKey, config] of Object.entries(currentKeyConfig)) {
            targetCtx.fillStyle = "rgba(30, 41, 59, 0.6)";
            targetCtx.strokeStyle = "rgba(255, 255, 255, 0.15)";
            targetCtx.lineWidth = 1;
            
            const rowX = startX;
            const rowY = startY;
            const rowW = win.w - 30;
            const rowH = 20;

            if (targetCtx.roundRect) {
                targetCtx.beginPath();
                targetCtx.roundRect(rowX, rowY, rowW, rowH, 2);
                targetCtx.fill();
                targetCtx.stroke();
            } else {
                targetCtx.fillRect(rowX, rowY, rowW, rowH);
                targetCtx.strokeRect(rowX, rowY, rowW, rowH);
            }

            targetCtx.fillStyle = "#ffffff";
            targetCtx.fillText(config.label, rowX + 6, rowY + 3);

            const keyBoxW = 40;
            const keyBoxH = 14;
            const keyBoxX = rowX + rowW - keyBoxW - 5;
            const keyBoxY = rowY + 3;

            targetCtx.fillStyle = (waitingForKeyChange === actionKey) ? "#ef4444" : "rgba(15, 23, 42, 0.8)";
            targetCtx.strokeStyle = "#38bdf8";
            targetCtx.strokeRect(keyBoxX, keyBoxY, keyBoxW, keyBoxH);
            targetCtx.fillRect(keyBoxX, keyBoxY, keyBoxW, keyBoxH);

            targetCtx.fillStyle = "#f8fafc";
            targetCtx.textAlign = "center";
            targetCtx.fillText(config.keyName, keyBoxX + keyBoxW / 2, keyBoxY + 1);
            targetCtx.textAlign = "left";

            optionsHitAreas.push({
                type: 'keyConfigItem',
                action: actionKey,
                x: rowX, y: rowY, w: rowW, h: rowH
            });

            startY += 21;
        }

        const backBtnX = win.x + 15;
        const backBtnY = win.y + win.h - 28;
        const backBtnW = 60;
        const backBtnH = 20;

        targetCtx.fillStyle = "rgba(71, 85, 105, 0.8)";
        targetCtx.fillRect(backBtnX, backBtnY, backBtnW, backBtnH);
        targetCtx.fillStyle = "#ffffff";
        targetCtx.textAlign = "center";
        targetCtx.fillText("◀ 戻る", backBtnX + backBtnW / 2, backBtnY + 3);

        optionsHitAreas.push({
            type: 'backToOptions',
            x: backBtnX, y: backBtnY, w: backBtnW, h: backBtnH
        });

        targetCtx.restore();
        return;
    }

    // --- 【通常オプション画面】 ---
    targetCtx.textAlign = "left";
    targetCtx.textBaseline = "top";
    targetCtx.font = "14px 'MS PGothic', sans-serif";
    targetCtx.fillStyle = "#ffffff";

    const textX = win.x + 20;
    const textY = win.y + 50;
    const wikiIdText = `Wiki連携キー: ${win.wikiId || "読み込み中..."}`;

    targetCtx.fillStyle = "rgba(0, 0, 0, 0.5)";
    targetCtx.fillText(wikiIdText, textX + 1, textY + 1);
    targetCtx.fillStyle = "#ffffff";
    targetCtx.fillText(wikiIdText, textX, textY);
    
    targetCtx.fillStyle = "#f9d448";
    targetCtx.fillText("[コピー]", textX + 180, textY);

    optionsHitAreas.push({
        type: 'copyWikiId',
        x: textX + 180, y: textY, w: 50, h: 20
    });

    const cfgBtnX = win.x + 20;
    const cfgBtnY = win.y + 90;
    const cfgBtnW = win.w - 40;
    const cfgBtnH = 30;

    targetCtx.fillStyle = "rgba(30, 41, 59, 0.9)";
    targetCtx.strokeStyle = "rgba(255, 255, 255, 0.2)";
    targetCtx.lineWidth = 1;
    if (targetCtx.roundRect) {
        targetCtx.beginPath();
        targetCtx.roundRect(cfgBtnX, cfgBtnY, cfgBtnW, cfgBtnH, 5);
        targetCtx.fill();
        targetCtx.stroke();
    } else {
        targetCtx.fillRect(cfgBtnX, cfgBtnY, cfgBtnW, cfgBtnH);
        targetCtx.strokeRect(cfgBtnX, cfgBtnY, cfgBtnW, cfgBtnH);
    }

    targetCtx.fillStyle = "#38bdf8";
    targetCtx.textAlign = "center";
    targetCtx.fillText("⌨️ キーボードコンフィグ設定", cfgBtnX + cfgBtnW / 2, cfgBtnY + 7);

    optionsHitAreas.push({
        type: 'openKeyConfig',
        x: cfgBtnX, y: cfgBtnY, w: cfgBtnW, h: cfgBtnH
    });

    targetCtx.restore();
}


// ============================================================
// :::OPTIONS_CLICK_HANDLER::: 🖱️ オプション画面のクリック処理
// ============================================================
function handleOptionsClick(clickX, clickY) {
    const win = gameWindows.options;
    if (!win.isOpen) return false;

    for (const area of optionsHitAreas) {
        if (clickX >= area.x && clickX <= area.x + area.w &&
            clickY >= area.y && clickY <= area.y + area.h) {
            
            if (area.type === 'openKeyConfig') {
                isKeyConfigOpen = true;
                return true;
            } else if (area.type === 'backToOptions') {
                isKeyConfigOpen = false;
                waitingForKeyChange = null;
                return true;
            } else if (area.type === 'keyConfigItem') {
                waitingForKeyChange = area.action;
                return true;
            } else if (area.type === 'copyWikiId') {
                if (win.wikiId && navigator.clipboard) {
                    navigator.clipboard.writeText(win.wikiId);
                }
                return true;
            }
        }
    }
    return false;
}

// ============================================================
// :::OPTIONS_CLICK_HANDLER::: 🖱️ オプション画面のクリック処理
// ============================================================
function handleOptionsClick(clickX, clickY) {
    const win = gameWindows.options;
    if (!win.isOpen) return false;

    for (const area of optionsHitAreas) {
        if (clickX >= area.x && clickX <= area.x + area.w &&
            clickY >= area.y && clickY <= area.y + area.h) {
            
            if (area.type === 'openKeyConfig') {
                isKeyConfigOpen = true;
                return true;
            } else if (area.type === 'backToOptions') {
                isKeyConfigOpen = false;
                waitingForKeyChange = null;
                return true;
            } else if (area.type === 'keyConfigItem') {
                waitingForKeyChange = area.action;
                return true;
            } else if (area.type === 'copyWikiId') {
                if (win.wikiId && navigator.clipboard) {
                    navigator.clipboard.writeText(win.wikiId);
                }
                return true;
            }
        }
    }
    return false;
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
    // すべてのアニメーションタイマーを停止
    animTimers.forEach(t => clearInterval(t));
    
    // 選択したモデルIDと、初期スタイルID「1」を渡す
    const selectedModelId = i - 1;
    const initialStyleId = 1; // 🌟 ここで明示的に定義
    
    console.log(`🎭 キャラクター選択: Model=${selectedModelId}, Style=${initialStyleId}`);

    // 関数へ渡す
    selectCharacterAndLogin(selectedModelId, initialStyleId);
    
    // オーバーレイを削除
    overlay.remove();
};

        btn.appendChild(nameTag);
        grid.appendChild(btn);
    }

    overlay.appendChild(grid);
    document.body.appendChild(overlay);
};

const createCharSelector2 = (currentModelId) => {
    const overlay = document.createElement('div');
    overlay.id = 'char-selector-overlay';
    overlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: radial-gradient(circle, #222 0%, #050505 100%);
        display: flex; flex-direction: column;
        align-items: center; justify-content: center; z-index: 10000;
    `;

    const title = document.createElement('h2');
    title.innerText = "CHARACTER STYLE SELECT"; 
    title.style.cssText = "color: #fff; margin-bottom: 40px; font-family: sans-serif; letter-spacing: 6px; text-shadow: 0 0 10px rgba(0,255,204,0.5); font-weight: lighter;";
    overlay.appendChild(title);

    const grid = document.createElement('div');
    grid.style.cssText = `
        display: grid; grid-template-columns: repeat(4, 110px);
        grid-template-rows: repeat(4, 110px); gap: 20px;
    `;

    const animTimers = [];

    for (let i = 1; i <= 15; i++) {
        const btn = document.createElement('button');
        const folderIdStr = String(i).padStart(2, '0'); 
        const displayNumStr = String(i).padStart(2, '0'); 
		const modelDir = String(currentModelId).padStart(2, '0');
        const charFileNameId = "01"; 

        let currentFrame = 0;
        const totalFrames = 20;

        const getIdlePath = (frame) => {
            const frameStr = String(frame).padStart(2, '0');
            //return `${IMAGE_DOMAIN}char_assets/${folderIdStr}/01/Idle/Characters-Character${charFileNameId}-Idle_${frameStr}.png`;
            return `${IMAGE_DOMAIN}char_assets/${modelDir}/${folderIdStr}/Idle/Characters-Character${folderIdStr}-Idle_${frameStr}.png`;
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
    // すべてのアニメーションタイマーを停止
    animTimers.forEach(t => clearInterval(t));
    
    // 選択したモデルIDと、初期スタイルID「1」を渡す
    const selectedModelId = currentModelId;
    const initialStyleId = i; // 🌟 ここで明示的に定義
    
    console.log(`🎭 キャラクター選択: Model=${selectedModelId}, Style=${initialStyleId}`);

    // 関数へ渡す
    selectCharacterAndLogin(selectedModelId, initialStyleId);
    
    // オーバーレイを削除
    overlay.remove();
};

        btn.appendChild(nameTag);
        grid.appendChild(btn);
    }

    overlay.appendChild(grid);
    document.body.appendChild(overlay);
};

/**
 * 修正後の役割：
 * - ログイン済みかどうかを判定し、ログインなら変更リクエスト、そうでなければ通常ログインを送信
 */
const selectCharacterAndLogin = (groupIndex, styleIndex) => {
    console.log("🔥 [着火] キャラ選択を実行しました");
	
	// 🔊 キャラ選択・決定時の効果音を再生
    if (typeof playLoginSound === 'function') {
        playLoginSound();
    }
    
    selectedGroup = groupIndex;
    selectedCharVar = styleIndex;

    if (typeof loadCharFrames === 'function') {
        loadCharFrames(selectedGroup, selectedCharVar);
    }

    // ログイン済み(ゲーム中)かどうかの判定
    const isAlreadyLoggedIn = window.isGameStarted;

    if (typeof socket !== 'undefined' && socket.connected) {
        if (isAlreadyLoggedIn) {
            // 🌟 【パターンA】ゲーム中なら「アバター変更」リクエストを送る
            socket.emit('change_model', { 
                modelId: selectedGroup,
				styleId: selectedCharVar
            });
            console.log(`✨ アバター変更リクエスト送信: Model ID ${selectedGroup}`);
        } else {
            // 🌟 【パターンB】ログイン前なら「ログイン」リクエストを送る
            const nameInput = document.getElementById('user-name-input');
            const passInput = document.getElementById('user-pass-input');
            
            socket.emit('login', {
                username: nameInput ? nameInput.value.trim() : "",
                password: passInput ? passInput.value : "",
                channel: typeof selectedChannel !== 'undefined' ? selectedChannel : 1,
                group: selectedGroup,
                charVar: selectedCharVar,
                model_id: selectedGroup 
            });
            console.log("🚀 ログインリクエスト送信");
        }
    }

    // ゲーム開始フラグは初回ログイン時のみ立てる
    if (!isAlreadyLoggedIn) {
        window.isGameStarted = true;
    }
};

socket.on('request_char_select', () => {
    // 既存のキャラ選択関数を再実行
    if (typeof createCharSelector === 'function') {
        createCharSelector();
    }
});

socket.on('request_char_select2', (data) => {
    // 🌟 値がない場合、現在の hero の情報を参照して補完する
    let modelId = data ? data.modelId : null;
    
    if (modelId === null || modelId === undefined) {
        // もしデータがなければ、クライアント側で把握している hero から取得
        if (typeof hero !== 'undefined' && hero.model_id !== undefined) {
            modelId = hero.model_id;
        } else {
            modelId = 8; // 最悪のケースのデフォルト値
        }
    }

    if (typeof createCharSelector2 === 'function') {
        createCharSelector2(modelId);
    }
});

// view.js の一番下に記述
socket.onAny((event, ...args) => {
    window.lastReceivedTime = Date.now();
    //window.isDisconnected = false;
});

socket.on('model_changed', (data) => {
    console.log("📩 サーバーから model_changed を受信:", data);

    // 1. プレイヤーリスト(players)を更新
    if (players[data.playerId]) {
        players[data.playerId].model_id = data.modelId;
        //players[data.playerId].style_id = data.styleId; // 🌟 スタイルも更新
        players[data.playerId].style_id = data.modelId; // 🌟 スタイルも更新
        players[data.playerId].charVar = data.modelId;
		
        console.log(`🔄 プレイヤー ${data.playerId} の見た目を更新しました: Model=${data.modelId}, Style=${data.styleId}`);
        
        // 2. もし独自にキャラの画像パスをプリロードしている場合は、ここで再読み込みが必要かもしれません
        // 必要であれば、ここで描画フラグを立てるか描画関数を呼び出します
        // e.g., updatePlayerSprite(data.playerId);
    } else {
        console.warn(`⚠️ プレイヤー ${data.playerId} はローカルのplayersリストに存在しません`);
    }
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
// :::MOUSE_MOVE_HANDLER::: 🖱️ マウス移動とインタラクション判定（バッグ＆装備対応版）
// ============================================================
canvas.addEventListener('mousemove', (e) => {

    if (window.isDisconnected) {
        canvas.style.cursor = "default";
        return;
    }
    
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;

    const screenW = rect.width;
    const screenH = rect.height;
    const offset = 8;

    // ------------------------------------------
    // 📊 ドラッグ移動処理（全ウィンドウ共通）
    // ------------------------------------------
    Object.values(gameWindows).forEach(win => {
        if (win.isDragging) {
            let nextX = mouseX - win.dragOffsetX;
            let nextY = mouseY - win.dragOffsetY;

            if (nextX < 0) nextX = 0;
            if (nextY < 0) nextY = 0;
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
    let isOverBagItem = false;

    // 1. まずバッグウィンドウ（inventory）のアイテムスロット上にあるかチェック
    const invWin = gameWindows["inventory"];
    if (invWin && invWin.isOpen) {
        if (mouseX >= invWin.x && mouseX <= invWin.x + invWin.w && 
            mouseY >= invWin.y && mouseY <= invWin.y + invWin.h) {
            
            // 閉じるボタンやヘッダーに重なっていないか確認
            if (invWin.isMouseOverClose(mouseX, mouseY)) {
                canvas.style.cursor = "pointer";
                return;
            }
            if (invWin.isMouseOverHeader(mouseX, mouseY)) {
                canvas.style.cursor = "move";
                return;
            }

            // バッグ内のスロット座標計算
            let bagX = invWin.x;
            let bagY = invWin.y;
            let cols = 5;
            let slotSize = 40;
            let spacing = 5;
            let startX = bagX + 20;
            let startY = bagY + 70;
            let scrollRow = invWin.scrollY || 0;
            let maxVisibleRows = 6;
            let maxTotalSlots = 50;

            let drawnIndex = 0;
            let startIndex = scrollRow * cols;
            let endIndex = startIndex + (cols * maxVisibleRows);
            let alreadyCheckedETC = new Set();

            for (let i = 0; i < maxTotalSlots; i++) {
                let item = (hero && hero.inventory) ? hero.inventory[i] : null;
                if (i < startIndex || i >= endIndex) continue;

                let col = drawnIndex % cols;
                let row = Math.floor(drawnIndex / cols);
                let x = startX + col * (slotSize + spacing);
                let y = startY + row * (slotSize + spacing);

                if (mouseX >= x && mouseX <= x + slotSize && mouseY >= y && mouseY <= y + slotSize) {
                    if (item) {
                        let category = (typeof itemCategories !== 'undefined') ? itemCategories[item.type] : null;
                        if (category === 'ETC') {
                            if (!alreadyCheckedETC.has(item.type)) {
                                alreadyCheckedETC.add(item.type);
                                isOverBagItem = true;
                            }
                        } else {
                            isOverBagItem = true;
                        }
                    }
                    break;
                }
                drawnIndex++;
            }

            if (isOverBagItem || selectedSlotIndex !== -1) {
                canvas.style.cursor = selectedSlotIndex !== -1 ? "grabbing" : "grab";
                return;
            }
        }
    }

    // 1.5. 次に装備ウィンドウ（equipment）の装備スロット上にあるかチェック
    const equipWin = gameWindows["equipment"];
    let isOverEquipItem = false;
    
    if (equipWin && equipWin.isOpen) {
        if (mouseX >= equipWin.x && mouseX <= equipWin.x + equipWin.w && 
            mouseY >= equipWin.y && mouseY <= equipWin.y + equipWin.h) {
            
            // 閉じるボタンやヘッダーに重なっていないか確認
            if (equipWin.isMouseOverClose(mouseX, mouseY)) {
                canvas.style.cursor = "pointer";
                return;
            }
            if (equipWin.isMouseOverHeader(mouseX, mouseY)) {
                canvas.style.cursor = "move";
                return;
            }

            // 🌟 描画関数が作ってくれた `slotHitAreas` を利用して厳密に判定！
            if (equipWin.slotHitAreas && Array.isArray(equipWin.slotHitAreas)) {
                for (const slotArea of equipWin.slotHitAreas) {
                    if (mouseX >= slotArea.x && mouseX <= slotArea.x + slotArea.w &&
                        mouseY >= slotArea.y && mouseY <= slotArea.y + slotArea.h) {
                        
                        const heroEquips = (hero && hero.equipment) ? hero.equipment : {};
                        const itemType = heroEquips[slotArea.slotType];
                        
                        if (itemType) {
                            isOverEquipItem = true;
                        }
                        break;
                    }
                }
            }

            if (isOverEquipItem) {
                canvas.style.cursor = "pointer";
                return;
            }
        }
    }

    // 2. その他のウィンドウ（ステータスなど）の判定
    const winList = Object.values(gameWindows).reverse();
    for (const win of winList) {
        if (win.isOpen) {
            if (win.isMouseOverClose(mouseX, mouseY)) {
                canvas.style.cursor = "pointer";
                foundWindow = true;
                break;
            }
            if (win.isMouseOverHeader(mouseX, mouseY)) {
                canvas.style.cursor = "move";
                foundWindow = true;
                break;
            }
            if (win.isMouseOverWindow(mouseX, mouseY)) {
                canvas.style.cursor = "default";
                foundWindow = true;
                break;
            }
        }
    }

    if (foundWindow) return;

    // ------------------------------------------
    // 🧪 右上のアクティブアイテムHUDのホバー判定 ＆ ツールチップ表示
    // ------------------------------------------
    let foundActiveItemHUD = false;
    const tooltip = document.getElementById('item-tooltip');

    if (tooltip && typeof hero !== 'undefined' && hero && hero._renderActiveItems && hero._renderActiveItems.length > 0) {
        let isWindowCoveringHUD = false; 
        for (const win of Object.values(gameWindows)) {
            if (win && win.isOpen) {
                if (win.x < VIEW_CONFIG.SCREEN_WIDTH - 20 && win.x + win.w > VIEW_CONFIG.SCREEN_WIDTH - 200 &&
                    win.y < 80 && win.y + win.h > 0) {
                    isWindowCoveringHUD = true;
                    break;
                }
            }
        }

        if (!isWindowCoveringHUD) {
            const iconSize = 32;
            const spacing = 6;
            const rightMargin = 20;
            const topY = 20;

            let hoveredItem = null;

            hero._renderActiveItems.forEach((item, index) => {
                const iconX = VIEW_CONFIG.SCREEN_WIDTH - rightMargin - ((hero._renderActiveItems.length - index) * (iconSize + spacing));
                const iconY = topY;

                if (mouseX >= iconX && mouseX <= iconX + iconSize &&
                    mouseY >= iconY && mouseY <= iconY + iconSize) {
                    hoveredItem = item;
                }
            });

            if (hoveredItem) {
                canvas.style.cursor = "pointer";
                foundActiveItemHUD = true;

                const itemNames = {
                    'speed': 'スピードアップ (移動速度増加)',
                    'clear': 'クリアエフェクト'
                };
                const displayName = itemNames[hoveredItem.name] || hoveredItem.name;

                tooltip.innerText = displayName;
                tooltip.style.display = 'block';
                tooltip.style.left = (e.clientX + 12) + 'px';
                tooltip.style.top = (e.clientY + 12) + 'px';
            }
        }
    }

    if (!foundActiveItemHUD && tooltip) {
        tooltip.style.display = 'none';
    }

    if (foundActiveItemHUD) return;

    // ------------------------------------------
    // 🏪 露店看板の判定
    // ------------------------------------------
    let foundVending = false;
    const targetList = (typeof otherPlayers !== 'undefined') ? otherPlayers : (typeof others !== 'undefined' ? others : {});

    for (let id in targetList) {
        const p = targetList[id];
        if (p.is_vending) {
            const signW = 120; 
            const signH = 40;  
            const signX = p.x - signW / 2;
            const signY = p.y - 80;

            if (mouseX >= signX && mouseX <= signX + signW &&
                mouseY >= signY && mouseY <= signY + signH) {
                canvas.style.cursor = "pointer";
                foundVending = true;
                break;
            }
        }
    }

    if (foundVending) return;

    // ------------------------------------------
    // 📦 10スロットインベントリ・アイテム判定
    // ------------------------------------------
    let isAnyWindowCovering = false;
    for (const win of Object.values(gameWindows)) {
        if (win && win.isOpen) {
            if (mouseX >= win.x && mouseX <= win.x + (win.w || 200) &&
                mouseY >= win.y && mouseY <= win.y + (win.h || 300)) {
                isAnyWindowCovering = true;
                break;
            }
        }
    }

    if (isDiscarding) {
        canvas.style.cursor = "default";
    } else if (selectedSlotIndex !== -1) {
        canvas.style.cursor = "grabbing";
    } 
    else if (!isAnyWindowCovering && mouseY >= 130 && mouseY <= 170) {
        const hoverIndex = Math.floor((mouseX - 20) / 48);
        if (hoverIndex >= 0 && hoverIndex < 10 && inventoryVisualBuffer && inventoryVisualBuffer[hoverIndex]) {
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

// ============================================================
// :::DOUBLE_CLICK_CONTROLLER::: 🖱️ 10スロット ＆ 50スロットバッグのダブルクリック判定
// ============================================================
if (typeof lastClickTime === 'undefined') {
    var lastClickTime = 0;
    var lastClickIndex = -1;
    var lastClickWindow = ''; // どこをクリックしたかを区別 ('top_bar' or 'bag_window')
}

// ============================================================
// :::DOUBLE_CLICK_CONTROLLER::: 🖱️ 10スロット ＆ 50スロットバッグのダブルクリック判定
// ============================================================
if (typeof lastClickTime === 'undefined') {
    var lastClickTime = 0;
    var lastClickIndex = -1;
    var lastClickWindow = ''; // どこをクリックしたかを区別 ('top_bar' or 'bag_window')
}

// 🌟 トレード用アイテム配列の定義（まだ定義していなければここで初期化）
/*
if (typeof myTradeSlots === 'undefined') {
    var myTradeSlots = [null, null, null, null, null, null, null, null, null];
}

// 🌟 自分のトレードスロット（3x3）の見た目を更新する関数
function updateMyTradeDisplay() {
    const myGrid = document.getElementById('my-slot-grid');
    if (!myGrid) return;
    
    const slots = myGrid.children;
    for (let i = 0; i < 9; i++) {
        const slotEl = slots[i];
        if (!slotEl) continue;
        
        const item = myTradeSlots[i];
        slotEl.innerHTML = ''; // 一度中身をクリア
        slotEl.style.position = 'relative'; // 個数表示用
        
        if (item) {
            const img = document.createElement('img');
            
            // 🌟 教えていただいた確実なパス生成ロジック
            const imgName = item.image_name || item.type || item.id;
            img.src = `${IMAGE_DOMAIN}item_assets/${imgName}.png`;
            
            img.style.width = '32px';
            img.style.height = '32px';
            img.style.margin = '4px';
            img.style.display = 'block';
			
			// 🌟 ここを追加！ドット絵をくっきり表示する魔法のCSS
            img.style.imageRendering = 'pixelated';
            img.style.imageRendering = '-moz-crisp-edges';
            img.style.imageRendering = 'crisp-edges';
			
            slotEl.appendChild(img);
            
            // ついでに個数（count）が1より多ければ、右下に個数を表示
            if (item.count && item.count > 1) {
                const countBadge = document.createElement('span');
                countBadge.innerText = item.count;
                countBadge.style.cssText = "position: absolute; bottom: 2px; right: 4px; font-size: 10px; font-weight: bold; color: white; text-shadow: 1px 1px 1px black;";
                slotEl.appendChild(countBadge);
            }
        }
    }
}
*/

// ============================================================
// :::TRADE_SYSTEM::: 🤝 トレード用配列 ＆ 描画関数（カーソル制御・完全同期版）
// ============================================================
if (typeof myTradeSlots === 'undefined') {
    var myTradeSlots = [null, null, null, null, null, null, null, null, null];
}

// 自分のトレードスロット更新関数
function updateMyTradeDisplay() {
    const myGrid = document.getElementById('my-slot-grid');
    if (!myGrid) return;
    
    const slots = myGrid.children;
    for (let i = 0; i < 9; i++) {
        const slotEl = slots[i];
        if (!slotEl) continue;
        
        const item = myTradeSlots[i];
        slotEl.innerHTML = '';
        slotEl.style.position = 'relative';
        slotEl.style.width = '48px';
        slotEl.style.height = '48px';
        slotEl.style.boxSizing = 'border-box';
        
        // 🌟 カーソル制御: アイテムの有無で切り替え
        if (item && item.type) {
            slotEl.style.cursor = 'pointer'; // 陳列されている場合は人差し指
        } else {
            slotEl.style.cursor = 'default'; // 空きスロットはデフォルト（通常の矢印）
        }
        
        // 🌟 1. 先にこのアイテムのレア度（グローカラー）を1箇所で完全に計算・決定する
        let sharedGlowColor = null;
        if (item && item.type) {
            if (item.glowColor) {
                sharedGlowColor = item.glowColor;
            } else if ((item.type === 'sword' || item.type === 'shield') && 
                       item.totalALLStats !== undefined && 
                       item.totalFirstStats !== undefined) {
                
                let bonus = item.totalALLStats - item.totalFirstStats;
                if (bonus >= 30) {
                    sharedGlowColor = "rgba(255, 0, 0, 0.8)";       // 神級（赤）
                } else if (bonus >= 25) {
                    sharedGlowColor = "rgba(0, 255, 0, 0.8)";       // 超伝説（緑）
                } else if (bonus >= 20) {
                    sharedGlowColor = "rgba(255, 255, 0, 0.8)";     // 極上（黄）
                } else if (bonus >= 15) {
                    sharedGlowColor = "rgba(255, 0, 255, 0.8)";     // 伝説（紫）
                } else if (bonus >= 10) {
                    sharedGlowColor = "rgba(0, 204, 255, 0.8)";     // 希少（青）
                }
            }
        }

        // 🌟 2. 背景スロットの描画（共通化したグローカラーを渡すので1個目から正確に光る）
        if (typeof getCachedBagSlotImage === 'function') {
            const slotBgCanvas = getCachedBagSlotImage(40, sharedGlowColor, false, true);
            slotEl.style.backgroundImage = `url(${slotBgCanvas.toDataURL()})`;
            slotEl.style.backgroundSize = 'cover';
        }
        
        // 🌟 3. アイテム画像の作成と輪郭発光の適用
        if (item && item.type) {
            const img = document.createElement('img');
            let imgName = item.image_name || item.type || item.id;
            img.src = `${IMAGE_DOMAIN}item_assets/${imgName}.png`;

            // バッグと同じ 30px × 30px にサイズ統一
            img.style.width = '30px';
            img.style.height = '30px';
            img.style.position = 'absolute';
            img.style.top = '50%';
            img.style.left = '50%';
            img.style.transform = 'translate(-50%, -50%)';
            img.style.display = 'block';
            
            // ドット絵くっきり設定
            img.style.imageRendering = 'pixelated';
            img.style.imageRendering = '-moz-crisp-edges';
            img.style.imageRendering = 'crisp-edges';

            // レア度に応じたグロー（影）をアイテムの輪郭に沿って反映
            if (sharedGlowColor) {
                img.style.filter = `drop-shadow(0 0 4px ${sharedGlowColor}) drop-shadow(0 0 8px ${sharedGlowColor})`;
            } else {
                img.style.filter = 'drop-shadow(0 0 2px rgba(255,255,255,0.8))';
            }

            slotEl.appendChild(img);
            
            // 個数表示（縦横バランス最適化版）
            if (item.count && item.count > 1) {
                const countBadge = document.createElement('span');
                let countStr = String(item.count);
                let fontSize = countStr.length >= 4 ? 9 : (countStr.length === 3 ? 10 : 11);
                
                countBadge.innerText = countStr;
                countBadge.style.cssText = `
                    position: absolute;
                    bottom: 2px;
                    right: 2px;
                    height: 14px;
                    padding: 0 3px;
                    font-size: ${fontSize}px;
                    font-family: 'Segoe UI', -apple-system, sans-serif;
                    font-weight: bold;
                    color: #ffffff;
                    background-color: rgba(10, 15, 25, 0.85);
                    border: 1px solid rgba(100, 116, 139, 0.6);
                    border-radius: 3px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
                    box-sizing: border-box;
                    pointer-events: none;
                    transform: scale(0.8, 0.95);
                    transform-origin: bottom right;
                `;
                slotEl.appendChild(countBadge);
            }
        }
    }
}

// 相手のトレードスロットデータ
if (typeof opponentTradeSlots === 'undefined') {
    var opponentTradeSlots = [null, null, null, null, null, null, null, null, null];
}

// 相手のトレードスロット更新関数（自分側と完全に同じロジック）
function updateOpponentTradeDisplay() {
    const oppGrid = document.getElementById('opponent-slot-grid');
    if (!oppGrid) return;
    
    const slots = oppGrid.children;
    for (let i = 0; i < 9; i++) {
        const slotEl = slots[i];
        if (!slotEl) continue;
        
        const item = opponentTradeSlots[i];
        slotEl.innerHTML = '';
        slotEl.style.position = 'relative';
        slotEl.style.width = '48px';
        slotEl.style.height = '48px';
        slotEl.style.boxSizing = 'border-box';
        
        // 🌟 カーソル制御: アイテムの有無で切り替え
        if (item && item.type) {
            slotEl.style.cursor = 'pointer'; // 陳列されている場合は人差し指
        } else {
            slotEl.style.cursor = 'default'; // 空きスロットはデフォルト
        }
        
        // 1. レア度カラーの共通計算
        let sharedGlowColor = null;
        if (item && item.type) {
            if (item.glowColor) {
                sharedGlowColor = item.glowColor;
            } else if ((item.type === 'sword' || item.type === 'shield') && 
                       item.totalALLStats !== undefined && 
                       item.totalFirstStats !== undefined) {
                
                let bonus = item.totalALLStats - item.totalFirstStats;
                if (bonus >= 30) {
                    sharedGlowColor = "rgba(255, 0, 0, 0.8)";
                } else if (bonus >= 25) {
                    sharedGlowColor = "rgba(0, 255, 0, 0.8)";
                } else if (bonus >= 20) {
                    sharedGlowColor = "rgba(255, 255, 0, 0.8)";
                } else if (bonus >= 15) {
                    sharedGlowColor = "rgba(255, 0, 255, 0.8)";
                } else if (bonus >= 10) {
                    sharedGlowColor = "rgba(0, 204, 255, 0.8)";
                }
            }
        }

        // 2. 背景スロットの描画
        if (typeof getCachedBagSlotImage === 'function') {
            const slotBgCanvas = getCachedBagSlotImage(40, sharedGlowColor, false, true);
            slotEl.style.backgroundImage = `url(${slotBgCanvas.toDataURL()})`;
            slotEl.style.backgroundSize = 'cover';
        }
        
        // 3. アイテム画像の描画
        if (item && item.type) {
            const img = document.createElement('img');
            let imgName = item.image_name || item.type || item.id;
            img.src = `${IMAGE_DOMAIN}item_assets/${imgName}.png`;

            img.style.width = '30px';
            img.style.height = '30px';
            img.style.position = 'absolute';
            img.style.top = '50%';
            img.style.left = '50%';
            img.style.transform = 'translate(-50%, -50%)';
            img.style.display = 'block';
            
            img.style.imageRendering = 'pixelated';
            img.style.imageRendering = '-moz-crisp-edges';
            img.style.imageRendering = 'crisp-edges';

            if (sharedGlowColor) {
                img.style.filter = `drop-shadow(0 0 4px ${sharedGlowColor}) drop-shadow(0 0 8px ${sharedGlowColor})`;
            } else {
                img.style.filter = 'drop-shadow(0 0 2px rgba(255,255,255,0.8))';
            }

            slotEl.appendChild(img);
            
            // 個数表示（縦横バランス最適化版）
            if (item.count && item.count > 1) {
                const countBadge = document.createElement('span');
                let countStr = String(item.count);
                let fontSize = countStr.length >= 4 ? 9 : (countStr.length === 3 ? 10 : 11);
                
                countBadge.innerText = countStr;
                countBadge.style.cssText = `
                    position: absolute;
                    bottom: 2px;
                    right: 2px;
                    height: 14px;
                    padding: 0 3px;
                    font-size: ${fontSize}px;
                    font-family: 'Segoe UI', -apple-system, sans-serif;
                    font-weight: bold;
                    color: #ffffff;
                    background-color: rgba(10, 15, 25, 0.85);
                    border: 1px solid rgba(100, 116, 139, 0.6);
                    border-radius: 3px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
                    box-sizing: border-box;
                    pointer-events: none;
                    transform: scale(0.8, 0.95);
                    transform-origin: bottom right;
                `;
                slotEl.appendChild(countBadge);
            }
        }
    }
}

// ============================================================
// :::MOUSE_POSITION_TRACKER::: 🖱️ マウス座標の追跡用変数 & リスナー
// ============================================================
let currentMouseX = 0;
let currentMouseY = 0;

canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    currentMouseX = event.clientX - rect.left;
    currentMouseY = event.clientY - rect.top;
});

// ============================================================
// :::DOUBLE_CLICK_CONTROLLER::: 🖱️ 10スロット ＆ 50スロットバッグのダブルクリック判定
// ============================================================
if (typeof lastClickTime === 'undefined') {
    var lastClickTime = 0;
    var lastClickIndex = -1;
    var lastClickWindow = ''; // どこをクリックしたかを区別 ('top_bar' or 'bag_window')
}

canvas.addEventListener('click', (event) => {
    const rect = canvas.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    let targetIndex = -1;
    let clickedWindowType = '';

    // ------------------------------------------------------------
    // 1. 画面上部の10スロット（固定枠）の判定
    // ------------------------------------------------------------
    if (clickY >= 130 && clickY <= 170) {
        const index = Math.floor((clickX - 20) / 48);
        if (index >= 0 && index < 10) {
            targetIndex = index;
            clickedWindowType = 'top_bar';
        }
    }

    // ------------------------------------------------------------
    // 2. 50スロットバッグウィンドウが開いている場合の判定
    // ------------------------------------------------------------
    const inventoryWin = (typeof gameWindows !== 'undefined') ? gameWindows["inventory"] : null;
    if (targetIndex === -1 && inventoryWin && inventoryWin.isOpen) {
        let bagX = inventoryWin.x;
        let bagY = inventoryWin.y;
        let cols = 5;
        let slotSize = 40;
        let spacing = 5;
        let startX = bagX + 20;
        let startY = bagY + 70;
        let scrollRow = inventoryWin.scrollY || 0;
        let maxVisibleRows = 6;
        let maxTotalSlots = 50;

        let drawnIndex = 0;
        let startIndex = scrollRow * cols;
        let endIndex = startIndex + (cols * maxVisibleRows);

        for (let i = 0; i < maxTotalSlots; i++) {
            if (i < startIndex || i >= endIndex) {
                continue;
            }

            let col = drawnIndex % cols;
            let row = Math.floor(drawnIndex / cols);
            let x = startX + col * (slotSize + spacing);
            let y = startY + row * (slotSize + spacing);

            if (clickX >= x && clickX <= x + slotSize && clickY >= y && clickY <= y + slotSize) {
                targetIndex = i; // 0 〜 49 の正確なインデックス
                clickedWindowType = 'bag_window';
                break;
            }
            drawnIndex++;
        }
    }

    // ------------------------------------------------------------
    // 3. ダブルクリックの実行判定 (共通ロジック)
    // ------------------------------------------------------------
    if (targetIndex !== -1) {
        const currentTime = Date.now();
        const timeDiff = currentTime - lastClickTime;

        // 🌟 「同じウィンドウの同じスロット」を「400ミリ秒以内」に2回クリックしたか？
        if (lastClickIndex === targetIndex && lastClickWindow === clickedWindowType && timeDiff < 400 && timeDiff > 50) {
            console.log(`[Doubleclick] (${clickedWindowType}) スロット ${targetIndex} のダブルクリックを検知！`);

            // ヒーローのインベントリ配列からアイテムを取得（10枠・50枠どちらも hero.inventory を参照）
            const item = (hero && hero.inventory) ? hero.inventory[targetIndex] : (typeof inventoryVisualBuffer !== 'undefined' ? inventoryVisualBuffer[targetIndex] : null);
            
            if (!item) {
                lastClickTime = 0;
                lastClickIndex = -1;
                lastClickWindow = '';
                return;
            }

            console.log(`${targetIndex}番のアイテム:`, item);

            // ------------------------------------------------------------
            // 🌟 4. トレードウィンドウが開いている場合の割り込み処理
            // ------------------------------------------------------------
            const tradeEl = document.getElementById('trade-window');
            const isTradeOpen = (tradeEl && tradeEl.style.display !== 'none' && tradeEl.style.display !== '');
            
            if (isTradeOpen) {
                // 相手が入室しているかチェック
                const targetNameEl = document.getElementById('trade-target-name');
                const hasOpponent = targetNameEl && targetNameEl.innerText.trim() !== "";

                if (!hasOpponent) {
                    console.log("⚠️ 相手が入室するまでアイテムを陳列することはできません。");
                    lastClickTime = 0;
                    lastClickIndex = -1;
                    lastClickWindow = '';
                    return;
                }

                // すでに同じインベントリスロットのアイテムがトレード枠に置いてあるかチェック
                const alreadyExists = myTradeSlots.some(slot => slot && slot.slot_index === targetIndex);
                if (alreadyExists) {
                    console.log("⚠️ このアイテムはすでにトレードスロットに陳列されています！");
                    lastClickTime = 0;
                    lastClickIndex = -1;
                    lastClickWindow = '';
                    return;
                }

                // 🌟 トレードスロット（9枠）がすべて埋まっていないかチェック
                const emptySlotIndex = myTradeSlots.findIndex(slot => slot === null);
                if (emptySlotIndex === -1) {
                    console.log("⚠️ トレードスロットがいっぱいです（最大9個まで）！");
                    lastClickTime = 0;
                    lastClickIndex = -1;
                    lastClickWindow = '';
                    return;
                }

                console.log(`[Trade] トレードスロットへアイテムを追加します: スロット ${targetIndex}`);
                
                // 空いているスロットにアイテムを登録して画面を更新
                myTradeSlots[emptySlotIndex] = item;
                updateMyTradeDisplay();
                
                // 🌟 サーバーへ自分のトレード枠の中身を送信する
                // 🌟 【修正】サーバーへ送るときに、保存しておいた相手のID（targetId）を一緒に乗せる！
socket.emit('updateTradeOffer', { 
    tradeSlots: myTradeSlots,
    targetId: window._currentTradePartnerId || null // ← ここを追加
});

                selectedSlotIndex = -1;

                // 判定をリセットして終了
                lastClickTime = 0;
                lastClickIndex = -1;
                lastClickWindow = '';
                return;
            }

            // アイテムの識別名やカテゴリを取得
            const itemName = (item.name || "").toLowerCase();
            const itemType = (item.type || "").toLowerCase();

            // 🛡️ より強力な装備品判定
            const isEquipment = itemType === 'sword' || itemType === 'shield' || 
                                itemName.includes('剣') || itemName.includes('盾') ||
                                itemName.includes('sword') || itemName.includes('shield');

            if (isEquipment) {
                // 🌟 1. 装備品なら装備用のsocketを送信
                console.log(`[Equip] スロット ${targetIndex} の装備品を脱着します: ${itemName}`);
                socket.emit('equipItem', { slotIndex: targetIndex });
            } else {
                // 🧪 2. 装備品以外（消費アイテムなど）
                const targetItemName = item.name || item.type || "";
                console.log(`[ItemUse] スロット ${targetIndex} の消費アイテムを使用します: ${targetItemName}`);
                
                socket.emit('useConsumableItem', { 
                    slotIndex: targetIndex, 
                    item: item, 
                    itemName: targetItemName 
                });
            }
            
            if (typeof playEquipSound === 'function') playEquipSound();

            selectedSlotIndex = -1;

            // 判定をリセット
            lastClickTime = 0;
            lastClickIndex = -1;
            lastClickWindow = '';
        } else {
            // 1回目のクリックとして記録
            lastClickTime = currentTime;
            lastClickIndex = targetIndex;
            lastClickWindow = clickedWindowType;
        }
    } else {
        // 有効なインベントリ枠外をクリックした場合はリセット
        lastClickIndex = -1;
        lastClickWindow = '';
    }
});

// ============================================================
// :::TRADE_TOOLTIP_RENDERER::: 🎨 ツールチップ描画処理（相手の変数名自動対応版）
// ============================================================
let hoveredTradeItem = null;
let tooltipMouseX = 0;
let tooltipMouseY = 0;

function setupTradeGridListeners() {
    const myGrid = document.getElementById('my-slot-grid');
    const oppGrid = document.getElementById('opponent-slot-grid');

    // 🌟 1. 自分のトレード枠の紐付け
    if (myGrid && !myGrid.dataset.listenerAttached) {
        myGrid.dataset.listenerAttached = "true";
        
        myGrid.addEventListener('mousemove', (e) => {
            const rect = myGrid.getBoundingClientRect();
            const localX = e.clientX - rect.left;
            const localY = e.clientY - rect.top;
            const col = Math.floor(localX / (rect.width / 3));
            const row = Math.floor(localY / (rect.height / 3));
            const slotIndex = row * 3 + col;

            const currentMySlots = typeof myTradeSlots !== 'undefined' ? myTradeSlots : [];
            if (currentMySlots[slotIndex]) {
                hoveredTradeItem = currentMySlots[slotIndex];
                tooltipMouseX = e.clientX;
                tooltipMouseY = e.clientY;
            } else {
                hoveredTradeItem = null;
            }
        });

        myGrid.addEventListener('mouseleave', () => {
            hoveredTradeItem = null;
        });
    }

    // 🌟 2. 相手のトレード枠の紐付け（複数の変数名を自動で探す安全設計）
    if (oppGrid && !oppGrid.dataset.listenerAttached) {
        oppGrid.dataset.listenerAttached = "true";
        
        oppGrid.addEventListener('mousemove', (e) => {
            const rect = oppGrid.getBoundingClientRect();
            const localX = e.clientX - rect.left;
            const localY = e.clientY - rect.top;
            const col = Math.floor(localX / (rect.width / 3));
            const row = Math.floor(localY / (rect.height / 3));
            const slotIndex = row * 3 + col;

            // 相手のアイテムが入っていそうなグローバル変数を片っ端からチェック
            const currentOppSlots = 
                (typeof opponentTradeSlots !== 'undefined' && opponentTradeSlots) ? opponentTradeSlots :
                (typeof otherTradeSlots !== 'undefined' && otherTradeSlots) ? otherTradeSlots :
                (typeof partnerTradeSlots !== 'undefined' && partnerTradeSlots) ? partnerTradeSlots :
                (typeof targetTradeSlots !== 'undefined' && targetTradeSlots) ? targetTradeSlots : [];

            if (currentOppSlots[slotIndex]) {
                hoveredTradeItem = currentOppSlots[slotIndex];
                tooltipMouseX = e.clientX;
                tooltipMouseY = e.clientY;
            } else {
                hoveredTradeItem = null;
            }
        });

        oppGrid.addEventListener('mouseleave', () => {
            hoveredTradeItem = null;
        });
    }
}

// 毎フレームの描画ループ（drawGame内）で呼び出す関数
function renderTradeTooltips(ctx, hero) {
    const tradeEl = document.getElementById('trade-window');
    const isTradeOpen = (tradeEl && tradeEl.style.display !== 'none' && tradeEl.style.display !== '');

    if (!isTradeOpen) {
        hoveredTradeItem = null;
        return;
    }

    setupTradeGridListeners();

    if (!hoveredTradeItem || typeof drawItemTooltip !== 'function') {
        return;
    }

    const canvasRect = canvas.getBoundingClientRect();
    const renderX = tooltipMouseX - canvasRect.left;
    const renderY = tooltipMouseY - canvasRect.top;

    drawItemTooltip(tCtx, hoveredTradeItem, renderX, renderY, hero);
}

// 相手がトレード枠を変更したときに関係データを受け取る
socket.on('syncOpponentTrade', (data) => {
    if (data && data.tradeSlots) {
        opponentTradeSlots = data.tradeSlots;
        updateOpponentTradeDisplay(); // 相手の画面を更新
    }
});

// 相手の切断などによりトレードがキャンセルされたとき
socket.on('tradeCancelled', (data) => {
    console.log("⚠️ 相手が切断したため、トレードがキャンセルされました。");
    
    // トレードウィンドウを非表示にする
    const tradeEl = document.getElementById('trade-window');
    if (tradeEl) tradeEl.style.display = 'none';
    
    // 自分側のトレードスロットや相手のスロット配列をクリアしておく
    if (typeof myTradeSlots !== 'undefined') myTradeSlots = [null, null, null, null, null, null, null, null, null];
    if (typeof opponentTradeSlots !== 'undefined') opponentTradeSlots = [null, null, null, null, null, null, null, null, null];
    
    // 必要なら画面表示もリフレッシュ
    if (typeof updateMyTradeDisplay === 'function') updateMyTradeDisplay();
    if (typeof updateOpponentTradeDisplay === 'function') updateOpponentTradeDisplay();
});

// ============================================================
// :::TRADE_WINDOW_DRAG::: 🖱️ トレードウィンドウのドラッグ移動機能
// ============================================================
function initTradeWindowDrag() {
    const tradeWindow = document.getElementById('trade-window');
    const tradeHeader = document.getElementById('trade-header');

    if (!tradeWindow || !tradeHeader) return;

    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let initialLeft = 0;
    let initialTop = 0;

    tradeHeader.addEventListener('mousedown', (e) => {
        // ボタンや閉じるボタンを押した時はドラッグを開始しない
        if (e.target.tagName === 'BUTTON') return;

        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;

        // 現在の中央配置（transform）を解除し、現在のピクセル座標を絶対位置に固定する
        const rect = tradeWindow.getBoundingClientRect();
        tradeWindow.style.transform = 'none';
        tradeWindow.style.left = rect.left + 'px';
        tradeWindow.style.top = rect.top + 'px';

        initialLeft = rect.left;
        initialTop = rect.top;

        // テキスト選択などを防ぐ
        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;

        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;

        tradeWindow.style.left = (initialLeft + deltaX) + 'px';
        tradeWindow.style.top = (initialTop + deltaY) + 'px';
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
    });
}

// ページ読み込み完了時やスクリプト実行時に有効化
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    initTradeWindowDrag();
} else {
    document.addEventListener('DOMContentLoaded', initTradeWindowDrag);
}

// ============================================================
// :::GOLD_UI_CONTROLLER::: 💰 所持金UIのクリック判定
// ============================================================
canvas.addEventListener('click', (event) => {
    const rect = canvas.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    const drawX = 25;
    const drawY = 90;
    const barW = 150;
    const barH = 32;

    if (clickX >= drawX && clickX <= drawX + barW &&
        clickY >= drawY && clickY <= drawY + barH) {
        
        console.log("💰 所持金UIがクリックされました！");

        if (typeof socket !== 'undefined') {
            socket.emit('chat', { text: '/dropgold 100' });
        }
    }
});

// 🛡️ 装備着脱などでステータスが更新された時の受け取り
// 🖥️ クライアント側の受信処理の例
socket.on('player_status_update', (data) => {
    if (!hero) return;

    // 🌟 サーバーから送られてきたすべてのステータス（baseStrやbonusStrを含む）を hero に反映！
    Object.assign(hero, data);

    console.log('[StatusUpdate Received]', hero);
});

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