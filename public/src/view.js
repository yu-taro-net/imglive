// ==========================================
// 🎨 1. キャンバスの設定と描画品質
// ==========================================
const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d');
let mouseX = 0;
let mouseY = 0;
let currentTab = "status"; // 現在選ばれているタブ ("status" または "ap")
//let apPoints = 5;          // 割り振れる残りポイント（テスト用）

// 🌟【重要】既存のコードが「isInventoryOpen」などの名前を使っている場合、
// 壊れないように「エイリアス（別名）」を作っておくと安全です。
const getWin = (key) => gameWindows[key];

// 1. 状態を保存する変数
let selectedSlotIndex = -1; 
let inventoryVisualBuffer = [];
let levelUpEffects = [];
let isDiscarding = false; // 捨て個数の入力中なら true にする

// ウィンドウの設計図
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

// インスタンス化（既存の初期値をセット）
/*
const gameWindows = {
    status: new GameWindow("status", 100, 100, 300, 250),
    inventory: new GameWindow("inventory", 400, 100, 250, 350),
    extra: new GameWindow("extra", 200, 200, 300, 200)
};
*/

// 全ウィンドウのインスタンス化 (id, x, y, w, h)
// id: 識別用ID, x/y: 初期座標, w/h: ウィンドウサイズ
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

// マウスが動いた時の処理
canvas.addEventListener('mousemove', (e) => {
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

// 🌟 ここから追加：高画質化（Retina/高画素ディスプレイ対応）
const dpr = window.devicePixelRatio || 1;

// ✨ ドット絵をくっきりさせる設定
// canvas.width を変えるとリセットされることがあるので、最後に1回書く
ctx.imageSmoothingEnabled = false;

// ==========================================
// 📋 2. 表示に関する基本設定（VIEW_CONFIG）
// 役割：画面上の見た目や判定の基準となる数値をまとめて管理します
// ==========================================
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
    "Roll":     0, // 8
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

// ==========================================
// 🛠️ AnimUtils: 計算を楽にする共通ツール
// ==========================================
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

let displayExp = 0; // 🌟 経験値をなめらかに表示するための変数
let displayHp = 0;  // 🌟 追加：なめらか表示用のHP変数
let lastExp = 0; // 🌟 これを書き足す：前回の経験値を覚えておくための変数
let recentlyPickedIds = new Set();

/**
 * 特定のアクション（Walk, Idleなど）の現在のフレームを1枚返すだけの便利関数
 */
function getActionFrame(characterData, actionName, frame, speed, fallback) {
    const frames = characterData ? characterData[actionName] : null;
    const idx = AnimUtils.getIdx(frame, speed, frames?.length || 0);
    return AnimUtils.getFrame(frames, idx, fallback);
}

// Before: canvas.width = 800 * dpr;
canvas.width = VIEW_CONFIG.SCREEN_WIDTH * dpr;
// Before: canvas.height = 600 * dpr;
canvas.height = VIEW_CONFIG.SCREEN_HEIGHT * dpr;
// Before: canvas.style.width = '800px';
canvas.style.width = VIEW_CONFIG.SCREEN_WIDTH + 'px';
// Before: canvas.style.height = '600px';
canvas.style.height = VIEW_CONFIG.SCREEN_HEIGHT + 'px';
ctx.scale(dpr, dpr);       // 描画全体を拡大して帳尻を合わせる

// ==========================================
// 📦 画像コンテナの自動生成
// ==========================================
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

// 👾 モンスター用の箱を名簿から「自動で」作成
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

// 数字とファイルパスの対応表
const DAMAGE_ASSETS = {
    '0': 'damage_assets/00.png',
    '1': 'damage_assets/01.png',
    '2': 'damage_assets/02.png',
    '3': 'damage_assets/03.png',
    '4': 'damage_assets/04.png',
    '5': 'damage_assets/05.png',
    '6': 'damage_assets/06.png',
    '7': 'damage_assets/07.png',
    '8': 'damage_assets/08.png',
    '9': 'damage_assets/09.png'
};

const DAMAGE_ASSETS1 = {
    '0': 'damage_assets/10.png',
    '1': 'damage_assets/11.png',
    '2': 'damage_assets/12.png',
    '3': 'damage_assets/13.png',
    '4': 'damage_assets/14.png',
    '5': 'damage_assets/15.png',
    '6': 'damage_assets/16.png',
    '7': 'damage_assets/17.png',
    '8': 'damage_assets/18.png',
    '9': 'damage_assets/19.png'
};

// 画像オブジェクトを格納する箱
const damageImages = {};
let loadedCount = 0;

// すべての数字画像を読み込む
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

// ==========================================
// 🚀 3. 画像の読み込み（新パス形式：自動処理）
// ==========================================
function loadStaticImages() {
    // --- 💰 アイテム専用の読み込みエリア (ここを独立) ---
    loadItemImages();
	
	// 🛡️ 読み込みたいモンスターの ID リスト（ここに足すだけでOK）
    const allowedIds = ["Char01", "Char02", "Char03", "Char10", "Char13", "Char16", "Char19"];

    MONSTER_CONFIGS.forEach(m => {
	    // 門番：リストに含まれていない ID なら無視（読み込まない）
        if (!allowedIds.includes(m.id)) {
            return;
        }
        // 基本となるフォルダパスを作成
        // 例: /char_assets_enemy/Char01/
        const basePath = `/char_assets_enemy/${m.id}`;
        const fName = m.fileName;

        // --- 🚶 Walk (移動) ---
        for (let i = 0; i < (m.walk || 0); i++) {
            // 例: /char_assets_enemy/Char01/Walk/skeleton-Walk_0.png
            sprites[m.name + 'Walk'][i].src = `${basePath}/Walk/${fName}-Walk_${i}.png`;
        }

        // --- ⚔️ Attack (攻撃) ---
        for (let i = 0; i < (m.attack || 0); i++) {
            sprites[m.name + 'Attack'][i].src = `${basePath}/Attack/${fName}-Attack_${i}.png`;
        }

        // --- 💀 Death (死亡) ---
		/*
        for (let i = 0; i < (m.death || 0); i++) {
            sprites[m.name + 'Death'][i].src = `${basePath}/Dead/${fName}-Dead_${i}.png`;
        }
        */
		
        // --- 💤 Idle (待機) ---
        for (let i = 0; i < (m.idle || 0); i++) {
            sprites[m.name + 'Idle'][i].src = `${basePath}/Idle/${fName}-Idle_${i}.png`;
        }

        // --- 🦘 Jump (ジャンプ) ---
        for (let i = 0; i < (m.jump || 0); i++) {
            sprites[m.name + 'Jump'][i].src = `${basePath}/Jump/${fName}-Jump_${i}.png`;
        }

        // ダメージ等の単体画像（もしあれば）
        sprites[m.name].src = `${basePath}/${fName}-Idle_0.png`; // 暫定でIdleの0番
        sprites[m.name + 'Damage'].src = `${basePath}/Idle/${fName}-Idle_0.png`;
    });
	
	// --- 💀 共通の死亡エフェクト (DeathFx) ---
    // モンスター固有のDeath画像がない場合や、共通演出として使いたい場合用
    sprites["commonDeath"] = []; // 配列を初期化
    for (let i = 0; i < 18; i++) {
        const img = new Image();
        img.src = `/char_assets_enemy/DeathFx/skeleton-animation_${i}.png`;
        sprites["commonDeath"].push(img);
    }

    // --- 👤 プレイヤー共通 ---
	/*
    sprites.playerDown.src = '/player_down.png';
    for (let i = 0; i < 4; i++) {
        sprites.playerClimb[i].src = `/player_climb${i+1}.png`;
    }
    */
}

/**
 * 🌟 自動画像読み込み関数（404エラー防止版）
 */
function loadItemImages() {
    Object.keys(ITEM_CONFIG).forEach(key => {
        const conf = ITEM_CONFIG[key];

        // 🛡️ 修正ポイント：srcが空、または画像が指定されていない場合は何もしない
        if (!conf || !conf.src || conf.src === "") {
            console.log(`Skipping: ${key} (No image path specified)`);
            return; // このアイテムの読み込みを飛ばす
        }

        if (conf.isAnimated) {
            // アニメーション用
            sprites.items[key] = Array.from({ length: 10 }, (_, i) => {
                const img = new Image();
                img.src = `${conf.src}${i + 1}.png`;
                return img;
            });
        } else {
            // 単体画像
            sprites.items[key] = new Image();
            sprites.items[key].src = conf.src;
        }
    });
}

// 実行（これで読み込みが始まります）
loadStaticImages();

// view.js の冒頭
const itemImages = {};

// 🌟 ソースから直接入力（ここを修正すれば確実に動きます）
const imageSources = {
    'gold': '/item_assets/gold.png',
    'sword': '/item_assets/sword.png',
    'shield': '/item_assets/shield.png',
    'treasure': '/item_assets/treasure.png',
    'sweets': '/item_assets/sweets.png',
    'money3': '/item_assets/money3.png',
    'money1': '/item_assets/money1.png'
};

const itemCategories = {
    "gold": "ETC",
    "treasure": "ETC",
    "sweets": "USE", // 消耗品
    "sword": "EQUIP",      // 装備
    "shield": "EQUIP"      // 装備
};

// 🌟 アイテムの解説文（ここに追加するだけ！）
const itemDescriptions = {
    'gold': 'ずっしりと重い純金の塊。換金用。',
    'treasure': '古びた宝箱から見つかった秘宝。',
    'sweets': '食べると疲れが吹き飛ぶ甘いお菓子。',
    'money1': '使い古された銅貨。',
    'money3': 'キラキラと輝く銀貨。'
};

// 画像を一斉にロード
for (const key in imageSources) {
    const img = new Image();
    img.src = imageSources[key];
    itemImages[key] = img;
    
    // 🐞 確認用：もし画像が届かなかったらコンソールに通知
    img.onerror = () => console.error(`⚠️ 画像が見つかりません: ${img.src}`);
}

const STAT_NAMES = {
    str: "STR", dex: "DEX", int: "INT", luk: "LUK",
    maxHp: "最大HP", maxMp: "最大MP",
    atk: "攻撃力", matk: "魔力", def: "防御力",
    moveSpeed: "移動速度", jumpPower: "ジャンプ力"
};

// ==========================================
// 👤 プレイヤー・キャラクター設定
// ==========================================
const playerSprites = [];  // 画像データを格納する箱
const GROUP_COUNT   = 16;  // グループの総数 (00〜15)
const VAR_COUNT     = 15;  // 各グループ内のキャラ数 (01〜15)

// 🌟 現在選択中のキャラクター（ここを書き換えてキャラ変更）
let selectedGroup   = 7;   // 現在のグループ
let selectedCharVar = 1;   // 現在のキャラクター番号

// アクション名だけのリストを作成 ( ["Dead", "Fly", ... ] )
const ACTIONS = Object.keys(VIEW_CONFIG.actionFrames);

// ==========================================
// 📜 システム設定（ログなど）
// ==========================================
let itemLogs   = [];       // 獲得アイテムの履歴
const MAX_LOGS = 5;        // 画面に表示するログの最大数

for (let g = 0; g < 16; g++) {
    playerSprites[g] = [];
    for (let v = 1; v <= 15; v++) {
        playerSprites[g][v] = null; // まだ中身は空っぽ
    }
}

// ==========================================
// 🌟 3. 画像読み込みの魔法（ロジック踏襲・パス修正版）
// ==========================================
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
            img.src = `char_assets/${groupNum}/${varNum}/${action}/Characters-Character${varNum}-${action}_${frameNum}.png`;

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

let chatMessages = [];
let pickingUpEffects = []; // 🌟 吸い込まれるアニメーションを管理するリスト
// view.js
socket.on('chat', data => {
  // 🌟【修正】内緒話（whisper）の場合は、描画リストに追加しない
  // これにより、画面上の吹き出しとして描画されるのを防ぎます
  if (data.type === 'whisper' || data.type === 'group') return;

  // id, text に加えて type も保存しておくと、後で描画時に色を変えられます
  chatMessages.push({ 
    id: data.id, 
    text: data.text, 
    type: data.type,
    timer: VIEW_CONFIG.chatTimer 
  });
});

socket.on('your_id', id => {
  console.log("My socket ID is:", id);
  // もし hero オブジェクトが既にあるなら ID を覚えさせる
  if (typeof hero !== 'undefined') hero.id = id;
});

// ==========================================
// ⚙️ 設定・フラグ（ここを false にするとデバッグ表示が消えます）
// ==========================================
let DEBUG_MODE = false; 

// ==========================================
// 🎨 1. メインの描画司令塔
// ==========================================
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
    drawSpecialHUD(hero);
    
    // ==========================================
    // 🛠️ デバッグ表示（DEBUG_MODE が true の時のみ実行）
    // ==========================================
    if (DEBUG_MODE) {
        drawDebugLayer(hero, enemies, items, platforms);
    }
}

// ==========================================
// 📈 補助：経験値の表示アニメーション計算
// ==========================================
function updateExpAnimation(hero) {
    const diff = hero.exp - displayExp;
    if (Math.abs(diff) > 0.1) {
        displayExp += diff * 0.1;
    } else {
        displayExp = hero.exp;
    }
}

// ==========================================
// 📡 補助：HUD・特殊UI描画
// ==========================================
function drawSpecialHUD(hero) {
    // --- チャンネルを【右上】に表示 ---
    if (hero && hero.channel) {
        ctx.save();
        ctx.font = "bold 18px 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
        ctx.textAlign = "right"; 
        
        ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;

        ctx.fillStyle = "#fbbf24"; 
        ctx.fillText(`📡 Channel: ${hero.channel}`, VIEW_CONFIG.SCREEN_WIDTH - 20, 35);
        ctx.restore();
    }
    
    // --- 掴んでいるアイテムをマウスに追従させて描画 ---
    if (!isDiscarding && typeof selectedSlotIndex !== 'undefined' && selectedSlotIndex !== -1) {
        if (inventoryVisualBuffer && inventoryVisualBuffer[selectedSlotIndex]) {
            const item = inventoryVisualBuffer[selectedSlotIndex];
            const itemImg = itemImages[item.type];
            if (itemImg) {
                ctx.save();
                ctx.globalAlpha = 0.6;
                ctx.drawImage(itemImg, mouseX - 15, mouseY - 15, 30, 30);
                ctx.restore();
            }
        }
    }
}

// ==========================================
// 🛠️ 補助：デバッグ専用描画レイヤー
// ==========================================
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

    ctx.restore();
}

/**
 * サーバーからの通知（アイテム取得など）を処理する専門の関数
 */
function handleServerEvents(data) {
    /*
    const hero = data.players[socket.id];
    if (hero) {
        // 前回の記録があり、かつ増えている場合だけログを出す
        if (lastExp !== 0 && hero.exp > lastExp) {
            const diff = hero.exp - lastExp;
            itemLogs.push({
                text: `Exp: 経験値を ${diff} 獲得した！`,
                timer: VIEW_CONFIG.log.displayTime
            });

            if (itemLogs.length > VIEW_CONFIG.log.maxCount) {
                itemLogs.shift();
            }
        }
        lastExp = hero.exp; // 今回の経験値を記憶する
    }
    */
    
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

/**
 * ⏳ タイマーやメッセージの管理
 */
function updateTimers() {
    updateLogTimers(); // 取得ログの寿命
    chatMessages = chatMessages.filter(m => m.timer > 0); // チャットの寿命
}

/**
 * 🏃 キャラクターやアイテムなどの「動くもの」を一括管理
 */
function drawEntities(hero, others, enemies, items, frame) {
    // 1. 敵（モンスター）を一番奥に描く
    drawEnemies(enemies, hero, frame);

    // 2. 他のプレイヤー
    for (let id in others) {
        if (others[id]) drawPlayerObj(others[id], false, id);
    }

    // 3. 自分自身（他人の上に重なるように描画）
    drawPlayerObj(hero, true);

    // 🌟 4. アイテム（地面に落ちているもの）を一番「手前」に描く！
    // これにより、自分の足元に落ちたアイテムがキャラに隠れず見えるようになります。
    drawItems(items, frame);
	
	levelUpEffects.forEach((eff, index) => {
        const p = (hero && hero.id === eff.playerId) ? hero : (others ? others[eff.playerId] : null);
        
        if (p) {
            ctx.save();
            ctx.font = "bold 60px 'Arial Black'"; 
            
            // 🌟 メイプル風のカラーデザインに変更
            ctx.fillStyle = "#80FF00";   // 内側：明るいライムグリーン
            ctx.strokeStyle = "#004400"; // 縁取り：濃い緑
            ctx.lineWidth = 4;
            ctx.textAlign = "center";

            // 🌟 土田さんの「130」の調整ロジックをそのまま維持
            let offset = 0;
            if (hero.id !== eff.playerId) {
                offset = 130; 
            }

            // X座標：(左端 + 幅の半分) - 調整用オフセット
            const drawX = (p.x + (p.w || 40) / 2) - offset;
            
            // Y座標：頭上
            const drawY = p.y - 60 - (120 - eff.timer) * 0.8;

            ctx.strokeText("LEVEL UP !!", drawX, drawY);
            ctx.fillText("LEVEL UP !!", drawX, drawY);
            ctx.restore();
        }
        eff.timer--;
        if (eff.timer <= 0) levelUpEffects.splice(index, 1);
    });
}

/**
 * 💥 ダメージ数字や吹き出しなどのエフェクト
 */
function drawEffects(damageTexts, hero, others) {
    drawDamageTexts(damageTexts);    // ダメージ数字
    drawChatBubbles(hero, others);   // チャット吹き出し
    drawPickupEffects(hero, others); // アイテム吸い込み
}

/**
 * 🪟 シンプルなウィンドウを表示する関数（ホバー反応付き・文字ズレ防止・リッチデザイン版）
 */
function drawSimpleWindow(title, x, y, w, h) {
    // 🌟 描画状態を保存（関数の外の設定に影響されない・させないため）
    ctx.save();

    // --- 1. 外枠と背景（グラデーションで深みを追加） ---
    const bgGrad = ctx.createLinearGradient(x, y, x, y + h);
    bgGrad.addColorStop(0, "rgba(20, 20, 40, 0.95)"); // 上部：深い紺
    bgGrad.addColorStop(1, "rgba(0, 0, 0, 0.95)");    // 下部：黒
    
    ctx.fillStyle = bgGrad;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 10);
    ctx.fill();
    ctx.stroke();

    // 内側の細い光の縁（これを入れるだけで高級感が出ます）
    ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);

    // --- 2. タイトルバー（少し光沢感のある帯） ---
    const titleGrad = ctx.createLinearGradient(x, y, x, y + 30);
    titleGrad.addColorStop(0, "#444444");
    titleGrad.addColorStop(1, "#222222");
    
    ctx.fillStyle = titleGrad;
    ctx.beginPath();
    ctx.roundRect(x, y, w, 30, {tl: 10, tr: 10, bl: 0, br: 0});
    ctx.fill();
    
    // タイトルバーの下線
    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    ctx.beginPath();
    ctx.moveTo(x, y + 30);
    ctx.lineTo(x + w, y + 30);
    ctx.stroke();

    // --- ❌ 閉じるボタンの判定と描画 ---
    const btnX = x + w - 25;
    const btnY = y + 5;
    const btnSize = 20;

    // 🖱️ マウスがボタンの上にあるかチェック
    const isHoveringClose = (mouseX >= btnX && mouseX <= btnX + btnSize &&
                             mouseY >= btnY && mouseY <= btnY + btnSize);

    // ホバー時は明るい赤(#ff6666)、通常時は元の赤(#ff4444)
    ctx.fillStyle = isHoveringClose ? "#ff6666" : "#ff4444";
    // ボタンを少し丸角にして可愛く
    ctx.beginPath();
    ctx.roundRect(btnX, btnY, btnSize, btnSize, 4);
    ctx.fill();

    // 🌟 ボタンの文字を描く前に設定をリセット
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "center"; // ❌は中央の方が綺麗なのでcenterに
    ctx.textBaseline = "middle";
    ctx.fillText("×", btnX + btnSize/2, btnY + btnSize/2 + 1);
    // ---------------------------------

    // --- 3. タイトル文字（文字に影をつけて読みやすく） ---
    // 🌟 重要：ここで「左揃え」であることを明示（ズレ防止）
    ctx.textAlign = "left"; 
    ctx.textBaseline = "alphabetic";
    
    // 文字の影（1pxずらして黒で描画）
    ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
    ctx.font = "bold 16px sans-serif";
    ctx.fillText(title, x + 11, y + 23);

    // 文字本体
    ctx.fillStyle = "#ffffff";
    ctx.fillText(title, x + 10, y + 22);

    // 🌟 おまけ：ホバー時にカーソルを指マークに変える処理
    if (isHoveringClose) {
        canvas.style.cursor = "pointer";
    }

    // 🌟 保存していた元の状態に戻す
    ctx.restore();
}

/**
 * 💰 所持金（ゴールド）のリッチ表示を独立させた関数
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

/**
 * 🪟 重なり順を管理する配列に基づいて各ウィンドウを描画する関数
 * (元のif-elseロジックと描画順を完全に踏襲)
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

/**
 * 🎨 UIオーバーレイのメイン描画関数
 */
function drawUIOverlay(hero) {
    if (!hero) return; // 🌟 heroが空っぽの時は何もしない（これでエラーを防ぐ）
	
    // 1. 基本UIパーツの描画
    drawItemLogsUI();
    drawTopStatusUI(hero);

    // 🌟 分離された所持金表示（必要に応じて呼び出し）
    drawGoldUI(hero);

    // ==========================================
    // 🎒 インベントリグリッド（メインループ部分）
    // ==========================================
    if (hero && hero.inventory) {
        drawInventoryGrid(ctx, hero.inventory);

        const startX = 20;
        const startY = 130;
        const slotSize = 40;
        const spacing = 8;

        hero.inventory.forEach((slot, index) => {
            if (!slot || !slot.type || slot.count <= 0) return;
            const x = startX + (index * (slotSize + spacing));
            const y = startY;

            if (mouseX >= x && mouseX <= (x + slotSize) &&
                mouseY >= y && mouseY <= (y + slotSize)) {

                ctx.save();
                // 整理したツールチップ関数を呼び出す
                drawItemTooltip(ctx, slot, mouseX, mouseY, hero);
                ctx.restore();
            }
        });
    }

    // 🌟 整理：重なり順を管理する配列に基づいてウィンドウ群を描画
    drawGameWindows(hero);
}

// ==========================================
// 🎨 アイテム詳細ツールチップ描画関数 (BONUS 8段階評価版)
// ==========================================
function drawItemTooltip(ctx, slot, mouseX, mouseY, hero) {
    const isEquipment = (slot.type === 'sword' || slot.type === 'shield');
    
    // --- 1. ロジック踏襲：ステータス・ランク・名称解決 ---
    let reqLevel = (slot.lv !== undefined) ? parseInt(slot.lv) : 0;
    let starCount = (slot.star !== undefined) ? parseInt(slot.star) : 0;
    let successCount = (slot.successCount !== undefined) ? parseInt(slot.successCount) : 0;
    let categoryName = "";
    if (isEquipment) {
        const catMap = { "weapon": "武器", "shield": "盾", "armor": "防具" };
        categoryName = catMap[slot.category] || (slot.type === 'sword' ? "片手剣" : "盾");
    }

    let baseItemName = "アイテム";
    if (typeof ITEM_CONFIG !== 'undefined' && ITEM_CONFIG[slot.type]) {
        baseItemName = ITEM_CONFIG[slot.type].name;
    } else {
        baseItemName = slot.type === 'shield' ? "盾" : (slot.type === 'sword' ? "剣" : slot.type);
    }
    if (isEquipment && successCount > 0) baseItemName = `${baseItemName} (+${successCount})`;

    let itemName = baseItemName;
    let statusText = "";
    let displayColor = "#ffffff";
    let glowColor = null; // 🌟 グロー用カラー変数

    // 🌟 判定：ボーナス値に基づいた 8段階のランク・色判定
    if (isEquipment && slot.totalALLStats !== undefined && slot.totalFirstStats !== undefined) {
        const bonus = slot.totalALLStats - slot.totalFirstStats;
        let rankName = "";

        // 灰 < 白 < 橙 < 青 < 紫 < 黄 < 緑 < 赤 の順に判定
        if (bonus >= 30) {
            displayColor = "#ff0000"; rankName = "(神級)";
            glowColor = displayColor; // 神級は赤く光る
        } else if (bonus >= 25) {
            displayColor = "#00ff00"; rankName = "(超伝説)";
            glowColor = displayColor; // 超伝説は緑に光る
        } else if (bonus >= 20) {
            displayColor = "#ffff00"; rankName = "(極上)";
            glowColor = displayColor; // 極上は黄色に光る
        } else if (bonus >= 15) {
            displayColor = "#ff00ff"; rankName = "(伝説)";
            glowColor = displayColor; // 伝説は紫に光る
        } else if (bonus >= 10) {
            displayColor = "#00ccff"; rankName = "(希少)";
            glowColor = displayColor; // 希少は青く光る
        } else if (bonus >= 5) {
            displayColor = "#ff9900"; rankName = "(良品)";
        } else if (bonus >= 0) {
            displayColor = "#ffffff"; rankName = "(標準)";
        } else {
            displayColor = "#aaaaaa"; rankName = "(粗悪)"; 
        }
        itemName = `${baseItemName}${rankName}`;

    } else {
        // ETC/消費アイテム
        if (typeof itemDescriptions !== 'undefined' && itemDescriptions[slot.type]) {
            statusText = itemDescriptions[slot.type];
        } else {
            statusText = `個数 : ${slot.count}`;
        }
    }

    // --- 2. レイアウト計算 ---
    const padding = 12;
    const iconSize = 40; 
    const iconTextGap = 15;
    const lineHeight = 16;
    const statsToShow = ['str', 'dex', 'int', 'luk', 'maxHp', 'maxMp', 'atk', 'matk', 'def'];
    const activeStats = isEquipment ? statsToShow.filter(k => {
        const val = parseInt(slot[k]);
        return !isNaN(val) && val !== 0; 
    }) : [];

    ctx.font = 'bold 14px sans-serif';
    const nameWidth = ctx.measureText(itemName).width;
    ctx.font = '12px sans-serif';
    const statusWidth = ctx.measureText(statusText).width;

    // 横幅を 240px 以上に設定
    let boxWidth = padding + iconSize + iconTextGap + Math.max(nameWidth, statusWidth, 180) + padding;
    if (boxWidth < 240) boxWidth = 240;

    // 高さ計算
    const reqLines = isEquipment ? (1 + (slot.totalFirstStats !== undefined ? 1 : 0) + (slot.totalALLStats !== undefined ? 1 : 0) + 1) : 0;
    let boxHeight = isEquipment ? 115 + (activeStats.length * lineHeight) + (reqLines * 12) : 65;

    let popupX = mouseX + 15;
    let popupY = mouseY + 15;
    if (popupX + boxWidth > canvas.width) popupX = mouseX - boxWidth - 10;
    if (popupY + boxHeight > canvas.height) popupY = mouseY - boxHeight - 10;
    if (popupX < 5) popupX = 5;
    if (popupY < 5) popupY = 5;

    // --- 3. 枠の描画 ---
    ctx.save();
    ctx.fillStyle = 'rgba(15, 15, 15, 0.95)';
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') { ctx.roundRect(popupX, popupY, boxWidth, boxHeight, 5); }
    else { ctx.rect(popupX, popupY, boxWidth, boxHeight); }
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    // スターフォース
    if (isEquipment && starCount > 0) {
        ctx.font = '14px sans-serif';
        ctx.fillStyle = '#ffff00';
        ctx.textAlign = 'center';
        ctx.fillText("★".repeat(starCount), popupX + boxWidth / 2, popupY + 18);
    }

    const contentTop = (isEquipment && starCount > 0) ? popupY + 32 : popupY + 15;
    const textStartX = popupX + padding + iconSize + iconTextGap;
    const rightValueX = popupX + boxWidth - 12;

    // 🌟 修正ポイント：アイコン描画（グロー効果）
    let itemImg = itemImages[slot.type];
    if (itemImg && itemImg.complete && itemImg.naturalWidth !== 0) {
        ctx.save();
        if (glowColor) {
            // インベントリ同様、2回重ねて描画し発色を強める
            ctx.shadowBlur = 15;
            ctx.shadowColor = glowColor;
            ctx.drawImage(itemImg, popupX + padding, contentTop, iconSize, iconSize);
            
            ctx.shadowBlur = 5; // 芯の光
            ctx.drawImage(itemImg, popupX + padding, contentTop, iconSize, iconSize);
        } else {
            ctx.drawImage(itemImg, popupX + padding, contentTop, iconSize, iconSize);
        }
        ctx.restore();
    }

    // アイテム名描画 (ランクの色を適用)
    ctx.font = 'bold 15px sans-serif';
    ctx.fillStyle = displayColor;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(itemName, textStartX, contentTop);

    // --- 4. 詳細・ステータス描画 ---
    if (isEquipment) {
        // 装備分類
        ctx.font = '11px sans-serif';
        ctx.fillStyle = '#aaaaaa';
        ctx.fillText(`装備分類 : ${categoryName}`, textStartX, contentTop + 20);

        // REQエリア
        let currentReqY = contentTop + 35;
        const heroLevel = hero ? (hero.level || 0) : 0;
        ctx.font = 'bold 10px sans-serif';

        // REQ LEV
        ctx.textAlign = 'left';
        ctx.fillStyle = (heroLevel < reqLevel) ? '#ff0000' : '#ffff00';
        ctx.fillText("・REQ LEV", textStartX, currentReqY);
        ctx.textAlign = 'right';
        ctx.fillText(reqLevel, rightValueX, currentReqY);
        currentReqY += 12;

        // REQ First
        if (slot.totalFirstStats !== undefined) {
            ctx.textAlign = 'left'; ctx.fillStyle = '#ffffff';
            ctx.fillText("・REQ First", textStartX, currentReqY);
            ctx.textAlign = 'right'; ctx.fillText(slot.totalFirstStats, rightValueX, currentReqY);
            currentReqY += 12;
        }
        // REQ ALL
        if (slot.totalALLStats !== undefined) {
            ctx.textAlign = 'left'; ctx.fillStyle = '#ffffff';
            ctx.fillText("・REQ ALL", textStartX, currentReqY);
            ctx.textAlign = 'right'; ctx.fillText(slot.totalALLStats, rightValueX, currentReqY);
            currentReqY += 12;
        }
        
        // BONUS表示
        if (slot.totalALLStats !== undefined && slot.totalFirstStats !== undefined) {
            const bonus = slot.totalALLStats - slot.totalFirstStats;
            const displayBonus = Math.round(bonus * 10) / 10;

            ctx.textAlign = 'left'; 
            ctx.fillStyle = displayColor; // ボーナス値自体もランク色で
            ctx.fillText("・BONUS", textStartX, currentReqY);
            ctx.textAlign = 'right'; 
            ctx.fillText((bonus >= 0 ? "+" : "") + displayBonus, rightValueX, currentReqY);
            currentReqY += 12;
        }

        // ステータス一覧
        let currentY = currentReqY + 5;
        ctx.font = '12px sans-serif';
        activeStats.forEach(key => {
            const labelMap = { str: "STR", dex: "DEX", int: "INT", luk: "LUK", maxHp: "最大HP", maxMp: "最大MP", atk: "攻撃力", matk: "魔力", def: "防御力" };
            const label = (typeof STAT_NAMES !== 'undefined' && STAT_NAMES[key]) ? STAT_NAMES[key] : (labelMap[key] || key.toUpperCase());

            ctx.textAlign = 'left'; ctx.fillStyle = '#ffffff';
            ctx.fillText(label, textStartX, currentY);
            ctx.textAlign = 'right';
            ctx.fillText(`+${slot[key]}`, rightValueX, currentY);
            currentY += lineHeight;
        });

        // 強化可能回数
        const total = slot.totalUpgrade || 7;
        const used = (slot.successCount || 0) + (slot.failCount || 0);
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.beginPath();
        ctx.moveTo(textStartX, currentY + 5);
        ctx.lineTo(popupX + boxWidth - 10, currentY + 5);
        ctx.stroke();
        ctx.restore();

        ctx.textAlign = 'left'; ctx.fillStyle = '#ffff00';
        ctx.fillText(`アップグレード可能回数 : ${total - used}`, textStartX, currentY + 12);

    } else {
        // ETC/消費アイテム
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.beginPath();
        ctx.moveTo(textStartX, contentTop + 25);
        ctx.lineTo(popupX + boxWidth - 10, contentTop + 25);
        ctx.stroke();
        ctx.restore();

        ctx.textAlign = 'left';
        ctx.font = '12px sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(statusText, textStartX, contentTop + 32);
    }
}

// --- 📊 独立させた Player Status ウィンドウ描画関数 ---
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

// --- Statusの中身描画用サブ関数 ---
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

// --- AP振り分けの中身描画用サブ関数 ---
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

// ==========================================
// 📦 2. ログの寿命管理
// ==========================================
function updateLogTimers() {
    itemLogs.forEach(log => {
        if (log.timer > 0) log.timer -= 2; // 描画のたびに寿命を減らす
    });
    itemLogs = itemLogs.filter(l => l.timer > 0);
}

// ==========================================
// 🖼️ 3. マップ（足場・地面・ハシゴ）の描画
// ==========================================
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

/**
 * 👤 プレイヤーの描画司令塔
 * 役割：1人分のプレイヤーを描画するための手順を管理する
 */
function drawPlayerObj(p, isMe, id) {
    if (!p) return;

    // 1. 🎭 キャラクター設定の読み込み
    const g = isMe ? selectedGroup : (p.group !== undefined ? p.group : 5);
    const v = isMe ? selectedCharVar : (p.charVar !== undefined ? p.charVar : 6);
    loadCharFrames(g, v);

    // 2. 🎨 描画準備（サイズ・座標の計算）
    const visualData = calculatePlayerVisuals(p, g, isMe);

    // 3. 🖼️ 表示する画像の決定
    const currentImg = getPlayerCurrentImg(p, g, v, frame, sprites, playerSprites, isMe);

    // 4. ✍️ 実際の描画実行（無敵点滅チェック含む）
    if (!(p.invincible > 0 && Math.floor(frame / 4) % 2 === 0)) {
        renderPlayerSprite(ctx, p, currentImg, visualData);
    }

    // 5. 📊 UI（HPバーと名前）の描画
    const pW = VIEW_CONFIG.player.hitboxW;
    drawPlayerUI(ctx, p, isMe, pW, frame);
}

// --- 以下、分割された専門関数 ---

/**
 * 📏 描画座標とオフセットの計算専門
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

/**
 * 🖌️ Canvasへの転写専門
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

/**
 * プレイヤーの状態に基づいて、表示する画像(currentImg)を決定する専門の関数
 */
function getPlayerCurrentImg(p, g, v, frame, sprites, playerSprites, isMe) {
    const speed = isMe ? hero.vx : (p.vx || 0);
    const isMoving = Math.abs(speed) > 0.1;
    const isGrounded = !p.jumping;
    const characterData = (playerSprites[g] && playerSprites[g][v]);

    // --- 1. ⚔️ 攻撃中 (最優先) ---
if (p.isAttacking > 0) {
    const frames = characterData ? characterData["Hit"] : null;
    if (frames && frames.length > 0) {
        // 🌟 画像が40枚あるので、持続時間を40に合わせます
        // (サーバー側の SETTINGS.PLAYER.ATTACK_FRAME も 40 にしてください)
        const maxDuration = 40; 
        
        // 現在が何ステップ目か (0 ～ 39)
        const currentStep = Math.max(0, maxDuration - p.isAttacking);
        
        // 進捗率 (0.0 ～ 1.0)
        let progress = currentStep / maxDuration;

        // 🌟 緩急（イージング）の調整
        // 指数を 0.8 から 1.5 程度に上げると、
        // 「最初はゆっくり溜めて、後半で一気に振り抜く」鋭い動きになります。
        // お好みで 1.0 (等速) ～ 2.0 (溜めが強い) の間で調整してみてください。
        let easingProgress = Math.pow(progress, 1.2); 

        // 画像のインデックスを決定
        let atkIdx = Math.floor(easingProgress * (frames.length - 1));
        
        // 範囲内に収める（ガード処理）
        atkIdx = Math.max(0, Math.min(atkIdx, frames.length - 1));

        return frames[atkIdx];
    }
}

    // --- 2. 🌀 ダウン（ロール）中 ---
    if (p.isDown) {
        return AnimUtils.getFrame(characterData?.["Roll"], 0, sprites.playerDown);
    }

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

    // どの条件にも合致しない場合の最終バックアップ
    return sprites.playerA;
}

/**
 * プレイヤーのHPバーと名前を描画する専門の関数
 */
function drawPlayerUI(ctx, p, isMe, pW, frame) {
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
    const nameText = p.name || "Player";
    let nameY = p.y + ((p.y > VIEW_CONFIG.groundThreshold) ? VIEW_CONFIG.playerName.offsetY_ground : VIEW_CONFIG.playerName.offsetY_air);
    if (nameY < VIEW_CONFIG.playerName.safeMargin) nameY = VIEW_CONFIG.playerName.safeMargin;
    ctx.font = `bold ${VIEW_CONFIG.playerName.fontSize} Arial`; // ついでにフォントサイズも設定から取得
    const nameW = ctx.measureText(nameText).width + VIEW_CONFIG.playerName.paddingW;
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(p.x + pW / 2 - nameW / 2, nameY - 15, nameW, 20);
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.fillText(nameText, p.x + pW / 2, nameY);
}

// ==========================================
// 👾 5. 敵の描画（drawEnemies）
// ==========================================
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

        // --- 4. 🖼️ 画像とサイズの準備 (外出しした関数を呼び出し) ---
        const { img, drawW, drawH } = getEnemyVisualData(en, sprites, frame, hero);

        // --- 5. 📏 描画位置の計算と実行 ---
        if (img && img.complete && img.naturalWidth !== 0) {
            const s = en.scale || 1.0;
            const finalW = drawW * s;
            const finalH = drawH * s;
            const baseX = en.x + en.w / 2;

            let enemyFootOffset = 0;
            if (en.y > VIEW_CONFIG.groundThreshold) {
                // 設定リストから取得し、なければ -7 を使う
                enemyFootOffset = VIEW_CONFIG.groupOffsets[en.type] || -7;
            }

            const baseY = (en.type === 'monster3' || en.y > VIEW_CONFIG.groundThreshold)
                ? VIEW_CONFIG.groundY
                : (en.y + en.h + enemyFootOffset);

            const finalY = baseY + (en.jumpY || 0);

            ctx.translate(baseX, finalY);
            if (en.dir === 1) ctx.scale(-1, 1);
            ctx.drawImage(img, -finalW / 2, -finalH, finalW, finalH);
        }

        ctx.restore();

        // --- 7. 🏥 HPバー描画 (外出しした関数を呼び出し) ---
        drawEnemyHPBar(en, frame);
    });
}

/**
 * 敵の状態に基づいて、表示する画像とサイズを決定する関数
 */
function getEnemyVisualData(en, sprites, frame, hero) {
    let img = null;
    let drawW = en.w;
    let drawH = en.h;
    const isDamaged = Math.abs(en.kbV) > 1.5;

    // --- 1. 💀 死亡・消滅アニメーション (最優先) ---
    if (en.isFading) {
        const ds = sprites["commonDeath"];
        if (ds && ds.length > 0) {
            const frameInterval = 40 / ds.length;
            const animationIdx = Math.floor(en.deathFrame / frameInterval);
            const safeIdx = Math.min(animationIdx, ds.length - 1);
            img = ds[safeIdx];
            drawW = VIEW_CONFIG.enemy.commonDeathSize.w;
            drawH = VIEW_CONFIG.enemy.commonDeathSize.h;
        }
        return { img, drawW, drawH }; // 確定したら即座に返す
    }

    // --- 2. 🦘 ジャンプ中 ---
    if ((en.jumpY || 0) < -1) {
        const jumps = sprites[en.type + "Jump"];
        if (jumps && jumps.length > 0) {
            const jumpIdx = Math.floor((en.jumpFrame || 0) / 6) % jumps.length;
            img = jumps[jumpIdx];
        } else {
            const walks = sprites[en.type + "Walk"];
            img = (walks && walks.length > 0) ? walks[0] : sprites[en.type];
        }
        if (img) {
            drawW = img.width * 0.2;
            drawH = img.height * 0.2;
        }
        return { img, drawW, drawH };
    }

    // --- 3. 💢 激昂（エンレージ）状態 ---
    if (en.isEnraged) {
        const dx = hero ? Math.abs(en.x - hero.x) : 999;
        const dy = hero ? Math.abs(en.y - hero.y) : 999;

        if (dx < VIEW_CONFIG.enemy.enragedRangeX && dy < VIEW_CONFIG.enemy.enragedRangeY) {
            // 近距離：攻撃
            const atk = sprites[en.type + "Attack"];
            img = (atk && atk.length > 0) ? atk[Math.floor(frame / 3) % atk.length] : sprites[en.type];
        } else {
            // 遠距離：待機 or 移動
            const isWaiting = en.waitTimer > 0;
            const sKey = isWaiting ? en.type + "Idle" : en.type + "Walk";
            const anims = sprites[sKey];
            img = (anims && anims.length > 0) ? anims[Math.floor(frame / 8) % anims.length] : sprites[en.type];
        }
        if (img) {
            drawW = img.width * 0.2;
            drawH = img.height * 0.2;
        }
        return { img, drawW, drawH };
    }

    // --- 4. ⚔️ 通常の攻撃中 ---
    if (en.isAttacking > 0) {
        const atk = sprites[en.type + "Attack"];
        if (atk && atk.length > 0) {
            const currentFrame = 22 - en.isAttacking;
            const atkIdx = Math.max(0, Math.min(currentFrame, atk.length - 1));
            img = atk[atkIdx];
        }
        if (img) {
            drawW = img.width * 0.2;
            drawH = img.height * 0.2;
        }
        return { img, drawW, drawH };
    }

    // --- 5. 🤕 ダメージを受けている ---
    if (isDamaged) {
        img = sprites[en.type + "Damage"];
        if (img && img.complete) {
            // monster3も、他の敵も、画像本来のサイズに 0.2倍（VIEW_CONFIG.enemy.defaultScale）をかける方式に統一
            drawW = img.width * VIEW_CONFIG.enemy.defaultScale;
            drawH = img.height * VIEW_CONFIG.enemy.defaultScale;
        }
        return { img, drawW, drawH };
    }

    // --- 6. 💤 待機中 ---
    if (en.waitTimer > 0) {
        const idles = sprites[en.type + "Idle"];
        if (idles && idles.length > 0) {
            // 【修正後】
            const total = (en.type !== 'monster1') ? Math.min(idles.length, 3) : 1;
            img = idles[AnimUtils.getIdx(frame, 12, total)];
        } else {
            img = sprites[en.type];
        }
        if (img) {
            drawW = img.width * 0.2;
            drawH = img.height * 0.2;
        }
        return { img, drawW, drawH };
    }

    // --- 7. 🚶 通常の移動 (歩き) ---
    const walks = sprites[en.type + "Walk"];
    img = (walks && walks.length > 0) ? walks[Math.floor(frame / 2) % walks.length] : sprites[en.type];
    if (img) {
        drawW = img.width * 0.2;
        drawH = img.height * 0.2;
    }

    return { img, drawW, drawH };
}

/**
 * 敵のHPバーを描画する（ロジック完全維持）
 */
function drawEnemyHPBar(en, frame) {
    if (en.isFading) return;
    let maxHp = (en.type === 'monster3') ? 2000 : (en.type === 'monster2' ? 500 : 200);
    if (en.hp < maxHp) {
        if (en.displayHp === undefined) en.displayHp = en.hp;
        en.displayHp = (en.displayHp > en.hp) ? Math.max(en.hp, en.displayHp - 2) : en.hp;
        const hpRatio = Math.max(0, en.hp / maxHp);
        const displayRatio = Math.max(0, en.displayHp / maxHp);
        const debugVisualY = en.y + (en.jumpY || 0);
        const barW = en.w;
        const barH = VIEW_CONFIG.enemy.hpBar.height;
        const barX = en.x;
        const barY = debugVisualY + VIEW_CONFIG.enemy.hpBar.offsetY;

        ctx.fillStyle = "rgba(15, 23, 42, 0.8)";
        ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
        ctx.fillStyle = "#1e293b";
        ctx.fillRect(barX, barY, barW, barH);
        if (displayRatio > hpRatio) {
            ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
            ctx.fillRect(barX, barY, barW * displayRatio, barH);
        }
        let c1 = (hpRatio > 0.5) ? VIEW_CONFIG.enemy.hpBar.colorHigh : 
         (hpRatio > 0.2 ? VIEW_CONFIG.enemy.hpBar.colorMid : 
         (Math.floor(frame / 10) % 2 === 0 ? VIEW_CONFIG.enemy.hpBar.colorLow : VIEW_CONFIG.enemy.hpBar.colorMid));
        ctx.fillStyle = c1;
        ctx.fillRect(barX, barY, barW * hpRatio, barH);
    }
}

// ==========================================
// 💥 6. テキスト・エフェクト関連
// ==========================================
/**
 * ダメージ数字を描画する（画像スキン対応版・被ダメ時はテキスト）
 * 縁取りスイッチと赤み付与を搭載
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

function drawChatBubbles(hero, others) {
    chatMessages.forEach(msg => {
        let target = (hero.id === msg.id) ? hero : others[msg.id];
        if (target) { drawChatBubble(target, msg.text); }
        msg.timer--; 
    });
}

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

// ==========================================
// 📜 7. アイテムログUI
// ==========================================
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

/**
 * UIに関連する数値の更新（計算）だけを行う関数
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

/**
 * 画面上部のステータスUIを描画する
 * LEVEL_TABLEに基づいてMAXEXPを動的に変更し、HPとEXPの両方をなめらかに表示します。
 */
function drawTopStatusUI(hero) {
    if (!hero) return;

    // 🌟 1. なめらか表示の計算処理（displayHp を hero.hp に近づける）
    if (typeof displayHp === 'undefined') displayHp = hero.hp;
    const hpDiff = hero.hp - displayHp;
    if (Math.abs(hpDiff) > 0.1) {
        displayHp += hpDiff * 0.1; // ここの 0.1 を小さくするとよりゆっくり動きます
    } else {
        displayHp = hero.hp;
    }

    // 🌟 レベルごとの必要経験値テーブル
    const LEVEL_TABLE = [0, 12, 20, 35, 60, 100, 150, 210, 280, 360, 450];

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
    ctx.roundRect(x, y, panelW, panelH, 10);
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
    
    // バーの色判定（実際のHPではなく表示上の割合で色を変える）
    ctx.fillStyle = hpRate > 0.3 ? "#2ecc71" : "#e74c3c";
    ctx.fillRect(hpBarX, hpBarY, barWidth * hpRate, barHeight);
    
    // HPテキスト（数値は現在の正確な値を表示）
    ctx.fillStyle = "#fff";
    ctx.font = "12px Arial";
    ctx.textAlign = "center";
    ctx.fillText(`${Math.floor(hero.hp)} / ${hero.maxHp}`, hpBarX + barWidth/2, hpBarY + 14);

    // 4. EXPバー (LEVEL_TABLEを参照して修正)
    const currentLv = hero.level || 1;
    const nextMaxExp = LEVEL_TABLE[currentLv] || LEVEL_TABLE[LEVEL_TABLE.length - 1];
    
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

    // テキスト表示
    ctx.font = "10px Arial";
    ctx.textAlign = "right";
    ctx.fillText(`${Math.floor(displayExp)} / ${nextMaxExp}`, hpBarX + barWidth - 5, expBarY + 10);

    ctx.restore();
}

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

/** 1. HPバー関連（元のコードの2〜8番に相当） */
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

/** 3. 経験値とデバッグ（元のコードの後半部分に相当） */
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

// --- チャットの吹き出しを表示する仕組み ---
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
        if (typeof sprites !== 'undefined' && sprites.items && sprites.items[config.spriteKey]) {
            img = config.isAnimated 
                  ? sprites.items[config.spriteKey][Math.floor((frame + (offset * 10)) / 10) % 10] 
                  : sprites.items[config.spriteKey];
        }

        if (img && (img.complete || img.naturalWidth > 0)) {
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
                ctx.drawImage(img, -targetWidth / 2, -targetHeight / 2, targetWidth, targetHeight);
            }

            ctx.imageSmoothingEnabled = false;
        }

        ctx.restore();
    });
}

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
                let displayImg = config.isAnimated ? (config.images ? config.images[0] : null) : config.image;

                if (!displayImg && config.src) {
                    if (!config._tempImg) {
                        config._tempImg = new Image();
                        config._tempImg.src = config.src;
                    }
                    displayImg = config._tempImg;
                }

                // 描画実行
                if (displayImg && displayImg.complete && displayImg.width > 0) {
                    const m = 5;
                    const imgX = x + m;
                    const imgY = y + m;
                    const imgW = slotSize - m * 2;
                    const imgH = slotSize - m * 2;
                    
                    // ==========================================
                    // 🌟 修正ポイント：グローカラーの判定（装備品のみ）
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
let lastItemCount = 0;
let lastEnemiesHP = 0;
let lastEnemiesData = [];
let lastItemsData = []; // ✨ 前回のアイテム状態を保持

// ==========================================
// 📡 サーバーからのデータ（state）を受け取る窓口
// ==========================================
// view.js の socket.on('state', ...) の部分をこれに差し替えてください

// 🌟 関数の外側に「一瞬前のデータ」を保存する場所を作ります
//let inventoryVisualBuffer = null;

socket.on('state', (data) => {
    // 1. 受信確認（これは表示されるはずです）
    //console.log("🔥 受信チェック！");
    if (!data) return;
    
    handleServerEvents(data);

    // 🌟 【最優先】アイテムの判定を「myHero」のチェックより上で行う！
    // これにより、自分のデータが届いていなくても音の判定だけは確実に行われます。
    const allItemsFromServer = data.items || [];
    const currentItems = allItemsFromServer.filter(it => !it.isPickedUp);
    const currentTotalCount = allItemsFromServer.length;

    // 初回のみ window.lastCount を今の数で初期化
    if (typeof window.lastCount === 'undefined') {
        window.lastCount = currentTotalCount;
    }

    // 🌟 判定：数が増えていたら文字を出す
    if (currentTotalCount > window.lastCount) {
        console.log("🌟 AAA：アイテムドロップ検知！"); 
        if (typeof playDropSound === 'function') {
            playDropSound();
        }
    }
    // 記憶を更新
    window.lastCount = currentTotalCount;
	
	console.log("⭐️確認の表示1");

    // --------------------------------------------------
    // ✋ ここから下は「自分のデータがある時だけ」実行する（ブレーキ）
    // --------------------------------------------------
    const myHero = data.players[socket.id];
    if (!myHero) {
        // 自分のデータがない場合、描画はできませんが、音の処理は終わっているのでここで終了してOK
        return; 
    }
	
	//console.log("⭐️確認の表示2");
	
	/*
    // インベントリの残像処理（土田さんの元のロジックを維持）
    if (myHero.inventory) {
        myHero.inventory = myHero.inventory.filter(slot => 
            slot && slot.type !== null && slot.type !== undefined && slot.count > 0
        );
    }
    const isActuallyEmpty = !myHero.inventory || myHero.inventory.length === 0;
    if (isActuallyEmpty) {
        inventoryVisualBuffer = [];
        myHero.inventory = [];
    } else {
        inventoryVisualBuffer = JSON.parse(JSON.stringify(myHero.inventory));
    }

    // 描画用のデータ準備
    const currentEnemies = data.enemies || [];
    const others = {};
    for (let id in data.players) {
        if (id !== socket.id) {
            others[id] = data.players[id];
        }
    }

    // 🎨 106行目付近：描画実行
    if (typeof drawGame === 'function') {
        drawGame(
            myHero,            
            others,
            currentEnemies,
            currentItems,
            data.platforms || [],
            data.ladders || [],
            damageTexts || [],
            Math.floor(Date.now() / 16)
        ); 

        // 🐞 描画側のデバッグログ
        if (selectedSlotIndex !== -1) {
            console.log("描画チェック開始: 選択スロット =" + selectedSlotIndex);
            
            if (myHero && myHero.inventory) {
                const item = myHero.inventory[selectedSlotIndex];
                if (item) {
                    console.log("アイテム発見！描画します: " + item.type);
                    
                    ctx.save();
                    ctx.setTransform(1, 0, 0, 1, 0, 0); // 座標をリセット
                    ctx.globalAlpha = 0.8;
                    ctx.fillStyle = "red"; // 確実に見えるように一旦「赤」
                    ctx.fillRect(mouseX - 15, mouseY - 15, 30, 30);
                    
                    ctx.fillStyle = "white";
                    ctx.font = "bold 16px Arial";
                    ctx.fillText(item.type, mouseX + 20, mouseY);
                    ctx.restore();
                } else {
                    console.log("選択したスロットは空です");
                }
            } else {
                console.log("myHero または inventory が見つかりません");
            }
        }
    }
	*/
});

// 🌟 修正：itemLogs を「window.itemLogs」として扱うとより確実です
socket.on('exp_log', (data) => {
    console.log("経験値の電波を受信しました！", data);
    
    // アイテムログを表示する「本物の箱」にデータを入れます
    if (typeof itemLogs !== 'undefined') {
        itemLogs.push({
            text: `✨ Exp: 経験値を ${data.amount} 獲得した！`,
            timer: 500 // 3秒間
        });

        // ログが溜まりすぎないように調整
        if (itemLogs.length > 5) {
            itemLogs.shift();
        }
        
        console.log("ログの箱に入れました。現在の数:", itemLogs.length);
    }
});

// 🌟 真似して作った「お金ログ」の受信処理
socket.on('gold_log', (data) => {
    console.log("お金の電波を受信しました！", data);
    
    if (typeof itemLogs !== 'undefined') {
        itemLogs.push({
            text: `💰 Gold: ${data.amount} GOLD 手に入れました！`, // ← ここを書き換え
            timer: 500 
        });

        if (itemLogs.length > 5) {
            itemLogs.shift();
        }
        
        console.log("お金ログを箱に入れました。");
    }
});

// 🌟 サーバーから「他のプレイヤーの見た目が更新された」通知を受け取る
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

socket.on('inventory_update', (newInventory) => {
    console.log("アイテム専用窓口で更新を受け取りました！");
    inventoryVisualBuffer = newInventory; 
});

socket.on('player_die_sound', () => {
    if (typeof playDieSound === 'function') playDieSound();
});

/*
window.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'd') {
        showDebugWindow = !showDebugWindow; // DキーでON/OFF
        console.log("Debug Window:", showDebugWindow);
    }
});
*/

// 🌟 キャラクター切り替え (Q/E)
window.addEventListener('keydown', (e) => {
    // ✅ 追加：もし入力欄（チャット等）を触っていたら、ここで処理を中断する
    if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;

    let changed = false;
    if (e.key === 'q' || e.key === 'Q') {
        //selectedCharVar = selectedCharVar <= 1 ? 15 : selectedCharVar - 1;
        //changed = true;
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
    // ✅ 入力欄を触っていたら無視
    if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;

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

window.addEventListener('keydown', (e) => {
    // 1. ガード処理（入力フォームにフォーカスがある時は反応させない）
    if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;

    const key = e.key.toLowerCase(); // 大文字小文字を気にせず判定できるように

    // --- 🌟 2. 各ウィンドウの共通判定ロジック (22個一括対応) ---
    const targetId = keyMap[key];
    if (targetId && gameWindows[targetId]) {
        const win = gameWindows[targetId];

        // gameWindows内のisOpenを反転
        win.isOpen = !win.isOpen;
        
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

// ==========================================
// 🖱️ マウスを離した時の処理（ドラッグ終了）
// ==========================================
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

// ==========================================
// 🗑️ アイテムを地面に捨てる処理 (外部分離)
// ==========================================
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

// ==========================================
// 🖱️ マウスクリック時の判定処理 (22ウィンドウ対応版)
// ==========================================
canvas.addEventListener('mousedown', (event) => {
    const rect = canvas.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    // 1. 🌟 重なりを考慮して、どのウィンドウがクリックされたか判定
    let priorityWindow = "none";
    
    // windowStackを後ろから（＝手前に表示されている順に）チェック
    for (let i = windowStack.length - 1; i >= 0; i--) {
        const name = windowStack[i];
        const win = gameWindows[name];
        
        if (win && win.isOpen) {
            if (clickX >= win.x && clickX <= win.x + win.w && 
                clickY >= win.y && clickY <= win.y + win.h) {
                priorityWindow = name;
                break; // 一番手前の窓が見つかったら終了
            }
        }
    }

    // 2. 🌟 ウィンドウを触った場合の共通処理
    if (priorityWindow !== "none") {
        const win = gameWindows[priorityWindow];

        // 触った窓を最前面に移動
        windowStack = windowStack.filter(item => item !== priorityWindow);
        windowStack.push(priorityWindow);

        // --- ❌ 共通：閉じるボタンの判定 ---
        if (win.isMouseOverClose(clickX, clickY)) {
            win.isOpen = false;
            if (typeof playMenuDownSound === 'function') playMenuDownSound();
            return;
        }

        // --- 📊 Status 専用の判定処理 ---
        if (priorityWindow === "status") {
            // タブ切り替え
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
            // AP強化ボタン
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

        // --- 🖐️ 共通：ドラッグ開始判定 (全ウィンドウ共通) ---
        if (win.isMouseOverHeader(clickX, clickY)) {
            win.isDragging = true;
            win.dragOffsetX = clickX - win.x;
            win.dragOffsetY = clickY - win.y;
            return;
        }
        return; // 窓を触っている間は下のゲーム世界をクリックさせない
    }

    // 3. 🎒 どの窓も触っていない場合の操作（アイテムスロット・捨て処理）
    if (clickY >= 130 && clickY <= 170) {
        const index = Math.floor((clickX - 20) / 48);
        if (index >= 0 && index < 10) {
            if (selectedSlotIndex !== -1 && selectedSlotIndex !== index) {
                socket.emit('swapItems', { from: selectedSlotIndex, to: index });
                if (typeof playDropSound === 'function') playDropSound();
                selectedSlotIndex = -1;
                canvas.style.cursor = "grab"; 
            } else if (selectedSlotIndex === index) {
                selectedSlotIndex = -1; 
                canvas.style.cursor = "grab";
                if (typeof playDropSound === 'function') playDropSound();
            } else if (inventoryVisualBuffer && inventoryVisualBuffer[index]) {
                selectedSlotIndex = index; 
                canvas.style.cursor = "grabbing"; 
                if (typeof playHoverSound === 'function') playHoverSound();
            }
        }
    } else {
        // --- 🗑️ アイテムを地面に捨てる処理 ---
        if (selectedSlotIndex !== -1) {
            const item = inventoryVisualBuffer[selectedSlotIndex];
            if (item) {
                // 🌟 分離した関数を呼び出す
                openDropForm(selectedSlotIndex, item);
            }
        }
    }
});

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

// サーバーからの入室通知を受け取って音を鳴らす
socket.on('player_joined_sound', () => {
    // 指定された playInviteSound() を実行
    if (typeof playInviteSound === 'function') {
        playInviteSound();
    } else {
        console.warn("playInviteSound が定義されていません。");
    }
});

//inventoryVisualBuffer[0] = { type: 'My Sword', def: 50 };

// 🛠️ view.js デバッグ表示の強化版
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

// 🌟 常にデバッグ情報を描き続けるための専用ループ
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

// view.js の一番下（書き換え）
let myDebugData = null;
let serverItemCount = 0; // アイテム数を入れる変数
// サーバーからのデバッグ専用データを受信
let serverDebugInfo = {};

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

// 🌟 【新規追加】サーバーから「命中・撃破」の確定通知を受けて音を鳴らす
// これを socket.on('updatePlayers', ...) 等が並んでいる場所に追加してください
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

// デバッグウィンドウを表示するかどうかのスイッチ
//let showDebugWindow = true; 

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

// 1. 表示スイッチ（すでにある場合は飛ばしてください）
if (typeof showDebugWindow === 'undefined') {
    var showDebugWindow = true; 
}

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

// 🎒 新しいインベントリウィンドウを描画する関数
function drawInventoryWindow() {
    if (!gameWindows.inventory.isOpen) return;

    // 400, 100 などの直接の数字を、変数名に変えるだけです
    if (typeof drawSimpleWindow === 'function') {
        drawSimpleWindow("🎒 Items & Equipment", gameWindows.inventory.x, gameWindows.inventory.y, gameWindows.inventory.w, gameWindows.inventory.h);
    }
}

// ==========================================
// 📦 Extraメニューウィンドウ（デバッグ表示用）
// ==========================================
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

// 💡 補足：
// 元の autoDebugRender() 内にあった requestAnimationFrame(autoDebugRender); は不要になります。
// 代わりに、drawUIOverlay() などのメインの描画ループの中で 
// windowStack を通じて drawExtraWindow(); が呼ばれるようにしてください。

/**
 * 全てのゲームウィンドウを重なり順（Z-Index）に基づいて一括描画する関数
 * メインループ（update/draw）から毎フレーム呼び出されることを想定
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
    drawSimpleWindow("⚙️ Options", win.x, win.y, win.w, win.h);
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

// ==========================================
// 🎒 アイテム取得時の右下ログ通知（確実に表示版）
// ==========================================
socket.on('item_pickup_log', (data) => {
    console.log("ログ受信成功:", data);

    // 1. メッセージを作成
    let logMsg = data.amount >= 2 
        ? `${data.itemName}を${data.amount}個手に入れました` 
        : `${data.itemName}を手に入れました`;

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

// --- キャラクター選択パネルの作成 ---
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

    // 🌟 全てのタイマーを管理するリスト
    const animTimers = [];

    for (let i = 1; i <= 16; i++) {
        const btn = document.createElement('button');
        
        // 🌟 実際のフォルダ名用 (00, 01, ... 15)
        const folderIdStr = String(i - 1).padStart(2, '0'); 
        
        // 🌟 画面表示用 (01, 02, ... 16)
        const displayNumStr = String(i).padStart(2, '0'); 
        
        // 🌟 画像ファイル名は "01" で固定
        const charFileNameId = "01"; 

        // 🌟 アニメーション用の内部変数
        let currentFrame = 0;
        const totalFrames = 20;

        // パスを生成する関数
        const getIdlePath = (frame) => {
            const frameStr = String(frame).padStart(2, '0');
            return `char_assets/${folderIdStr}/01/Idle/Characters-Character${charFileNameId}-Idle_${frameStr}.png`;
        };

        // 🌟 【修正：点滅防止】全フレームを事前にプリロードする
        // new Image() にパスを代入することでブラウザのキャッシュに保存させます
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

        // 🌟 アニメーションタイマー設定 (100msごとにコマ送り)
        const timer = setInterval(() => {
            currentFrame = (currentFrame + 1) % totalFrames;
            // 🌟 プリロード済みのImageオブジェクトからパスを取得することで、
            // サーバー通信を発生させず即座に表示を切り替えます
            btn.style.backgroundImage = `url('${preloadLinks[currentFrame].src}')`;
        }, 100);
        animTimers.push(timer); // 後で一括解除できるように保存

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
            // 🌟 全てのタイマーをクリアしてメモリ解放
            animTimers.forEach(t => clearInterval(t));

            selectedGroup = i - 1; 
            selectedCharVar = 1; 
            loadCharFrames(selectedGroup, selectedCharVar);
            console.log(`Loaded Folder: ${folderIdStr}, Displayed as: Chara ${displayNumStr}`);
            overlay.remove();
        };

        btn.appendChild(nameTag);
        grid.appendChild(btn);
    }

    overlay.appendChild(grid);
    document.body.appendChild(overlay);
};

// 実行
createCharSelector();