// ==========================================
// 🎨 1. キャンバスの設定と描画品質
// ==========================================
const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d');
let mouseX = 0;
let mouseY = 0;
let isStatsWindowOpen = false; // ステータス画面が開いているか
let isInventoryOpen = false; // 🎒 インベントリ窓が開いているか
let currentTab = "status"; // 現在選ばれているタブ ("status" または "ap")
//let apPoints = 5;          // 割り振れる残りポイント（テスト用）
let isDragging = false;      // ドラッグ中かどうか
let winX = 100;              // ウィンドウの現在のX座標（初期値）
let winY = 100;              // ウィンドウの現在のY座標（初期値）
let dragOffsetX = 0;         // マウスとウィンドウの距離（X）
let dragOffsetY = 0;         // マウスとウィンドウの距離（Y）
let invWinX = 400;         // インベントリ窓のX
let invWinY = 100;         // インベントリ窓のY
let invWinW = 250;         // 幅
let invWinH = 350;         // 高さ
let isDraggingInv = false; // インベントリをドラッグ中か
let dragOffsetXInv = 0;
let dragOffsetYInv = 0;
// 1. 状態を保存する変数
let selectedSlotIndex = -1; 
let inventoryVisualBuffer = [];
let levelUpEffects = [];
let windowStack = ["inventory", "status"]; // 後ろにある要素ほど手前に描画される

// マウスが動いた時に、画面の左上に座標を出すだけのテスト
canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
    
    // --- 🖐️ ドラッグ移動の更新 ---
    if (isDragging) {
        winX = mouseX - dragOffsetX;
        winY = mouseY - dragOffsetY;
    }
    if (isDraggingInv) {
        invWinX = mouseX - dragOffsetXInv;
        invWinY = mouseY - dragOffsetYInv;
    }

    // ==========================================
    // 🪟 1. ステータスウィンドウUIのカーソル判定
    // ==========================================
    if (isStatsWindowOpen) {
        const winW = 300;
        const winH = 250; 
        
        // ×ボタンの範囲判定
        const btnX = winX + winW - 25;
        const btnY = winY + 5;

        if (mouseX >= btnX && mouseX <= btnX + 25 &&
            mouseY >= btnY && mouseY <= btnY + 25) {
            canvas.style.cursor = "pointer"; // 指マーク
            return; 
        }

        // タイトルバー（ドラッグ可能エリア）
        if (mouseX >= winX && mouseX <= winX + winW &&
            mouseY >= winY && mouseY <= winY + 30) {
            canvas.style.cursor = "move"; // 移動マーク
            return;
        }

        // ウィンドウの本体部分
        if (mouseX >= winX && mouseX <= winX + winW &&
            mouseY >= winY && mouseY <= winY + winH) {
            canvas.style.cursor = "default";
            return; 
        }
    }

    // ==========================================
    // 🎒 2. 新しいインベントリウィンドウのカーソル判定（追加）
    // ==========================================
    if (isInventoryOpen) {
        // ×ボタン
        const invCloseBtnX = invWinX + invWinW - 25;
        const invCloseBtnY = invWinY + 5;
        if (mouseX >= invCloseBtnX && mouseX <= invCloseBtnX + 25 &&
            mouseY >= invCloseBtnY && mouseY <= invCloseBtnY + 25) {
            canvas.style.cursor = "pointer";
            return;
        }

        // タイトルバー
        if (mouseX >= invWinX && mouseX <= invWinX + invWinW &&
            mouseY >= invWinY && mouseY <= invWinY + 30) {
            canvas.style.cursor = "move";
            return;
        }

        // ウィンドウ本体
        if (mouseX >= invWinX && mouseX <= invWinX + invWinW &&
            mouseY >= invWinY && mouseY <= invWinY + invWinH) {
            canvas.style.cursor = "default";
            return;
        }
    }

    // ==========================================
    // 📦 3. 既存のバッグ・アイテム操作のカーソル判定
    // ==========================================
    
    // 1. アイテムを現在掴んでいる（ホバー中）の場合
    if (selectedSlotIndex !== -1) {
        canvas.style.cursor = "grabbing"; // 「握った手」のマーク
    } 
    // 2. 何も掴んでいないが、バッグ（130〜170px）の上にマウスがある場合
    else if (mouseY >= 130 && mouseY <= 170) {
        const hoverIndex = Math.floor((mouseX - 20) / 48);
        
        // そのスロットにアイテムが存在するかチェック
        if (hoverIndex >= 0 && hoverIndex < 10 && inventoryVisualBuffer[hoverIndex]) {
            canvas.style.cursor = "grab"; // 「掴めるよ」のマーク
        } else {
            canvas.style.cursor = "default";
        }
    } 
    // 3. それ以外の場所
    else {
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
    targetGroup: 5,             // あひるグループ
    targetVar: 6                // 特定のバリエーション
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
    'shield': '/item_assets/shield.png',
    'money3': '/item_assets/money3.png',
    'money1': '/item_assets/money1.png'
};

// 画像を一斉にロード
for (const key in imageSources) {
    const img = new Image();
    img.src = imageSources[key];
    itemImages[key] = img;
    
    // 🐞 確認用：もし画像が届かなかったらコンソールに通知
    img.onerror = () => console.error(`⚠️ 画像が見つかりません: ${img.src}`);
}

// ==========================================
// 👤 プレイヤー・キャラクター設定
// ==========================================
const playerSprites = [];  // 画像データを格納する箱
const GROUP_COUNT   = 16;  // グループの総数 (00〜15)
const VAR_COUNT     = 15;  // 各グループ内のキャラ数 (01〜15)

// 🌟 現在選択中のキャラクター（ここを書き換えてキャラ変更）
let selectedGroup   = 5;   // 現在のグループ
let selectedCharVar = 6;   // 現在のキャラクター番号

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

// 🌟 キャラが必要になった時に呼び出す「画像読み込みの魔法」
function loadCharFrames(groupIndex, variantIndex) {
    // 🛡️ 修正：設定を見て、読み込みを制限するか決める
    if (VIEW_CONFIG.debug.onlyLoadSpecificChar) {
        if (groupIndex !== VIEW_CONFIG.debug.targetGroup || 
            variantIndex !== VIEW_CONFIG.debug.targetVar) {
            return; 
        }
    }

    // 1. 🛑 異常な数値や読み込み済みチェック
    if (groupIndex < 0 || groupIndex >= 16 || variantIndex < 1 || variantIndex > 15) return;
    
    // playerSpritesの階層が未定義なら作成する（エラー防止）
    if (!playerSprites[groupIndex]) playerSprites[groupIndex] = {};
    
    // すでに読み込み済みなら終了
    if (playerSprites[groupIndex][variantIndex] && Object.keys(playerSprites[groupIndex][variantIndex]).length > 0) return;

    // 2. 📂 フォルダ名の準備 (01, 02 のように2桁に揃える)
    playerSprites[groupIndex][variantIndex] = {};
    const groupNum = String(groupIndex).padStart(2, '0');
    const varNum = String(variantIndex).padStart(2, '0');

    // 3. 🏃 各アクション（歩く、待機など）ごとに画像を検索
    ACTIONS.forEach(action => {
        playerSprites[groupIndex][variantIndex][action] = [];
        
        // 🛡️ 修正ポイント：50枚チェックは重いので、一旦「8枚」に制限（必要なら増やせます）
        // 🌟 【ここを修正】ACTION_FRAMES からそのアクションの枚数を取得する
        // もしリストになければ、予備として 1 を使う設定です
        const maxFrames = VIEW_CONFIG.actionFrames[action] || 1;
		
		if (maxFrames <= 0) return;

        for (let i = 0; i < maxFrames; i++) {
            const img = new Image();
            const frameNum = String(i).padStart(2, '0');
            
            // 🖼️ 画像の住所（パス）
            img.src = `char_assets/group_${groupNum}/Character${varNum}/${action}/Characters-Character${varNum}-${action}_${frameNum}.png`;

            // 成功：画像が見つかった場合
            img.onload = () => {
                playerSprites[groupIndex][variantIndex][action][i] = img; 
            };
            
            // 失敗：画像がなかった場合
            img.onerror = () => {
                // 静かに無視
            };
        }
    });
    
    console.log(`✅ 限定読み込み：グループ${groupNum} キャラ${varNum} の読み込みを開始しました`);
}

let chatMessages = [];
let pickingUpEffects = []; // 🌟 吸い込まれるアニメーションを管理するリスト
socket.on('chat', data => {
  chatMessages.push({ id: data.id, text: data.text, timer: VIEW_CONFIG.chatTimer });
});

socket.on('your_id', id => {
  console.log("My socket ID is:", id);
  // もし hero オブジェクトが既にあるなら ID を覚えさせる
  if (typeof hero !== 'undefined') hero.id = id;
});

// ==========================================
// 🎨 1. メインの描画司令塔（整理後）
// 役割：各パーツの描画関数を正しい順番で呼び出す
// ==========================================
function drawGame(hero, others, enemies, items, platforms, ladders, damageTexts, frame) {
    // 1. データの事前更新（タイマーなど）
    updateTimers();
    updateUIState(hero); // ✨ ここに追加！描画の前にHPなどの計算を済ませます
	
	// 🌟 【ここを追加】表示用経験値を実際の経験値に近づける
    // (目標のexp - 現在の表示exp) * 0.1 ずつ近づけることで、なめらかに動きます
    const diff = hero.exp - displayExp;
    if (Math.abs(diff) > 0.1) {
        displayExp += diff * 0.1;
    } else {
        displayExp = hero.exp; // 差が小さくなったらピッタリ合わせる
    }
	
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
        // ① 吸い込みエフェクトの追加
        pickingUpEffects.push({
            type: picked.type,
            timer: VIEW_CONFIG.pickupEffect.duration,
            startX: picked.x,
            startY: (picked.y > VIEW_CONFIG.groundThreshold) 
                ? (VIEW_CONFIG.groundY - 20) 
                : picked.y,
            targetPlayerId: picked.pickerId 
        });

        // ② アイテム取得ログ（🌟 medal1 以外の時だけ表示するよう修正）
        if (picked.pickerId === socket.id) {
            // ここに条件を追加！
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
 * 🪟 シンプルなウィンドウを表示する関数
 * @param {string} title タイトル
 * @param {number} x 左上のX座標
 * @param {number} y 左上のY座標
 * @param {number} w 幅
 * @param {number} h 高さ
 */
// view.js 内の drawSimpleWindow を少し豪華にします
/**
 * 🪟 シンプルなウィンドウを表示する関数（ホバー反応付き）
 */
function drawSimpleWindow(title, x, y, w, h) {
    // 1. 外枠と背景
    ctx.fillStyle = "rgba(0, 0, 0, 0.9)";
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 10);
    ctx.fill();
    ctx.stroke();

    // 2. タイトルバー
    ctx.fillStyle = "#333333";
    ctx.beginPath();
    ctx.roundRect(x, y, w, 30, {tl: 10, tr: 10, bl: 0, br: 0});
    ctx.fill();

    // --- ❌ 閉じるボタンの判定と描画 ---
    const btnX = x + w - 25;
    const btnY = y + 5;
    const btnSize = 20;

    // 🖱️ マウスがボタンの上にあるかチェック
    const isHoveringClose = (mouseX >= btnX && mouseX <= btnX + btnSize &&
                             mouseY >= btnY && mouseY <= btnY + btnSize);

    // ホバー時は明るい赤(#ff6666)、通常時は元の赤(#ff4444)
    ctx.fillStyle = isHoveringClose ? "#ff6666" : "#ff4444";
    ctx.fillRect(btnX, btnY, btnSize, btnSize);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 14px sans-serif";
    ctx.fillText("×", btnX + 4, btnY + 15);
    // ---------------------------------

    // 3. タイトル文字
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 16px sans-serif";
    ctx.fillText(title, x + 10, y + 22);

    // 🌟 おまけ：ホバー時にカーソルを指マークに変える処理
    if (isHoveringClose) {
        canvas.style.cursor = "pointer";
    }
}

function drawUIOverlay(hero) {
    drawItemLogsUI(); 
    drawUI(hero);
    
    // 🌟 所持金の表示（固定UI）
    if (hero) {
        ctx.save();
        ctx.fillStyle = "gold";
        ctx.font = "bold 22px sans-serif";
        ctx.textAlign = "left";
        ctx.strokeStyle = "black";
        ctx.lineWidth = 3;
        const goldText = `GOLD: ${hero.gold || 0}`;
        const drawX = 25;
        const drawY = 110;
        ctx.strokeText(goldText, drawX, drawY);
        ctx.fillText(goldText, drawX, drawY);
        ctx.restore();
    }
    
    // 🌟 インベントリグリッド（固定UI）
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
                let text = "";
                let displayColor = "#ffffff";

                if (slot.type === 'shield') {
                    const def = slot.defense || 0;
                    let rankName = "";
                    if (def >= 14) { displayColor = "#ff00ff"; rankName = "(最高級)"; }
                    else if (def >= 11) { displayColor = "#ffcc00"; rankName = "(良品)"; }
                    else if (def <= 7) { displayColor = "#888888"; rankName = "(壊れかけ)"; }
                    text = `盾${rankName} (防御力:${def})`;
                } else if (slot.type === 'gold' || slot.type === 'medal1') {
                    text = `ゴールド (${slot.count})`;
                } else {
                    text = `${slot.type} (${slot.count})`;
                }

                ctx.font = 'bold 14px sans-serif';
                const textWidth = ctx.measureText(text).width;
                const popupX = mouseX + 10;
                const popupY = mouseY - 30;

                ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
                ctx.beginPath();
                ctx.roundRect(popupX, popupY, textWidth + 16, 28, 5);
                ctx.fill();
                ctx.strokeStyle = displayColor;
                ctx.lineWidth = 2; 
                ctx.stroke();
                ctx.fillStyle = displayColor;
                ctx.textBaseline = 'middle';
                ctx.fillText(text, popupX + 8, popupY + 14);
                ctx.restore();
            }
        });
    }

    // 🌟 重なり順を管理する配列に基づいて描画
    // windowStack = ["inventory", "status"] のような配列
    windowStack.forEach(windowName => {
        if (windowName === "status") {
            // --- 📊 Player Status ウィンドウの描画 ---
            if (isStatsWindowOpen && hero) {
                // ホバー音管理
                if (!window.hoverFlags) window.hoverFlags = { str: false, dex: false, luk: false };
                canvas.style.cursor = "default";

                const winW = 300;
                const winH = 250;
                drawSimpleWindow(currentTab === "status" ? "📊 Player Status" : "✨ AP Allocation", winX, winY, winW, winH);

                const tabY = winY + 35;
                const tabW = 70;
                const tabH = 20;

                // Statusタブ
                ctx.fillStyle = (currentTab === "status") ? "#555555" : "#222222";
                ctx.fillRect(winX + 20, tabY, tabW, tabH);
                ctx.fillStyle = "#ffffff";
                ctx.font = "10px sans-serif";
                ctx.fillText("ステータス", winX + 30, tabY + 14);

                // APタブ
                ctx.fillStyle = (currentTab === "ap") ? "#555555" : "#222222";
                ctx.fillRect(winX + 20 + tabW + 5, tabY, tabW, tabH);
                ctx.fillStyle = "#ffffff";
                ctx.fillText("AP振り分け", winX + 20 + tabW + 15, tabY + 14);

                if (currentTab === "status") {
                    ctx.fillStyle = "#ffffff";
                    ctx.font = "bold 16px sans-serif";
                    ctx.fillText(hero.name || "Adventurer", winX + 20, winY + 75);

                    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
                    ctx.beginPath();
                    ctx.moveTo(winX + 20, winY + 85);
                    ctx.lineTo(winX + winW - 20, winY + 85);
                    ctx.stroke();

                    ctx.font = "14px monospace";
                    const startY = winY + 110;
                    const gap = 22;

                    ctx.fillStyle = "#aaaaaa";
                    ctx.fillText("LEVEL", winX + 25, startY);
                    ctx.fillText("HP",    winX + 25, startY + gap);
                    ctx.fillText("STR",   winX + 25, startY + gap * 2);
                    ctx.fillText("DEX",   winX + 25, startY + gap * 3);
                    ctx.fillText("LUK",   winX + 25, startY + gap * 4);

                    ctx.fillStyle = "#ffffff";
                    ctx.fillText(`${hero.lv || 1}`, winX + 110, startY);
                    ctx.fillStyle = "#ff5555";
                    ctx.fillText(`${hero.hp} / ${hero.maxHp}`, winX + 110, startY + gap);
                    ctx.fillStyle = "#ffffff";
                    ctx.fillText(`${hero.str || 0}`, winX + 110, startY + gap * 2);
                    ctx.fillText(`${hero.dex || 0}`, winX + 110, startY + gap * 3);
                    ctx.fillText(`${hero.luk || 0}`, winX + 110, startY + gap * 4);

                    // 経験値バー
                    const barW = winW - 50;
                    const barX = winX + 25;
                    const barY = winY + winH - 35;
                    ctx.fillStyle = "#333333";
                    ctx.fillRect(barX, barY, barW, 10);
                    const expRatio = Math.min(1, (hero.exp % 100) / 100);
                    ctx.fillStyle = "#ffcc00";
                    ctx.fillRect(barX, barY, barW * expRatio, 10);
                    ctx.font = "10px sans-serif";
                    ctx.fillText(`EXP: ${Math.floor(hero.exp)} / 100`, barX, barY - 5);

                    window.hoverFlags.str = false;
                    window.hoverFlags.dex = false;
                    window.hoverFlags.luk = false;
                } else {
                    // ✨ AP割り振り画面
ctx.fillStyle = "#ffcc00";
ctx.font = "bold 16px sans-serif";
ctx.fillText(`Available AP: ${hero.ap}`, winX + 20, winY + 80);

ctx.fillStyle = "#ffffff";
ctx.font = "14px monospace";
ctx.fillText(`STR: ${hero.str}`, winX + 25, winY + 120);

const btnX = winX + 150;
const btnW = 100;
const btnH = 25;
const btnRight = btnX + btnW;

// 🌟 追加：マウス位置において、ステータス画面が最前面であるか判定
const isStatusPriority = (() => {
    const overStats = (isStatsWindowOpen && mouseX >= winX && mouseX <= winX + 300 && mouseY >= winY && mouseY <= winY + 250);
    const overInv = (isInventoryOpen && mouseX >= invWinX && mouseX <= invWinX + invWinW && mouseY >= invWinY && mouseY <= invWinY + invWinH);
    if (overStats && overInv) {
        return windowStack[windowStack.length - 1] === "status";
    }
    return overStats;
})();

// STR UP
const strBtnY = winY + 102;
// 🌟 修正：最前面（isStatusPriority）の時だけホバーを有効にする
const isStrHover = isStatusPriority && (mouseX >= btnX && mouseX <= btnRight && mouseY >= strBtnY && mouseY <= strBtnY + btnH);

if (isStrHover) {
    canvas.style.cursor = "pointer";
    if (!window.hoverFlags.str) {
        if (typeof playMouseOver1Sound === 'function') playMouseOver1Sound();
        window.hoverFlags.str = true;
    }
} else { window.hoverFlags.str = false; }

ctx.fillStyle = isStrHover ? "#444444" : "#222222";
ctx.strokeStyle = "#ffffff";
ctx.strokeRect(btnX, strBtnY, btnW, btnH);
ctx.fillRect(btnX, strBtnY, btnW, btnH);
ctx.fillStyle = isStrHover ? "#ffff00" : "#ffffff";
ctx.font = "12px sans-serif";
ctx.fillText("STR UP (+1)", btnX + 15, strBtnY + 17);

// DEX UP
const dexBtnY = winY + 132;
ctx.fillStyle = "#ffffff";
ctx.font = "14px monospace";
ctx.fillText(`DEX: ${hero.dex || 0}`, winX + 25, winY + 150);

// 🌟 修正：最前面（isStatusPriority）の時だけホバーを有効にする
const isDexHover = isStatusPriority && (mouseX >= btnX && mouseX <= btnRight && mouseY >= dexBtnY && mouseY <= dexBtnY + btnH);

if (isDexHover) {
    canvas.style.cursor = "pointer";
    if (!window.hoverFlags.dex) {
        if (typeof playMouseOver1Sound === 'function') playMouseOver1Sound();
        window.hoverFlags.dex = true;
    }
} else { window.hoverFlags.dex = false; }

ctx.fillStyle = isDexHover ? "#444444" : "#222222";
ctx.strokeRect(btnX, dexBtnY, btnW, btnH);
ctx.fillRect(btnX, dexBtnY, btnW, btnH);
ctx.fillStyle = isDexHover ? "#ffff00" : "#ffffff";
ctx.fillText("DEX UP (+1)", btnX + 15, dexBtnY + 17);

// LUK UP
const lukBtnY = winY + 162;
ctx.fillStyle = "#ffffff";
ctx.fillText(`LUK: ${hero.luk || 0}`, winX + 25, winY + 180);

// 🌟 修正：最前面（isStatusPriority）の時だけホバーを有効にする
const isLukHover = isStatusPriority && (mouseX >= btnX && mouseX <= btnRight && mouseY >= lukBtnY && mouseY <= lukBtnY + btnH);

if (isLukHover) {
    canvas.style.cursor = "pointer";
    if (!window.hoverFlags.luk) {
        if (typeof playMouseOver1Sound === 'function') playMouseOver1Sound();
        window.hoverFlags.luk = true;
    }
} else { window.hoverFlags.luk = false; }

ctx.fillStyle = isLukHover ? "#444444" : "#222222";
ctx.strokeRect(btnX, lukBtnY, btnW, btnH);
ctx.fillRect(btnX, lukBtnY, btnW, btnH);
ctx.fillStyle = isLukHover ? "#ffff00" : "#ffffff";
ctx.fillText("LUK UP (+1)", btnX + 15, lukBtnY + 17);
                }
            }
        } 
        else if (windowName === "inventory") {
            // 🌟 インベントリウィンドウの描画
            if (isInventoryOpen) {
                drawNewInventoryWindow(); 
            }
        }
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
            const maxDuration = 20;
            const currentStep = maxDuration - p.isAttacking;
            let progress = currentStep / maxDuration;
            let easingProgress = Math.pow(progress, 0.8);
            let atkIdx = Math.floor(easingProgress * (frames.length - 1));
            atkIdx = Math.max(0, Math.min(atkIdx, frames.length - 1));
            return frames[atkIdx];
        }
        // framesがない場合は、後続の判定へ流さずここで基本画像を返しても良いですが、
        // オリジナルの挙動を維持するため、そのまま下へ流します
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

        // --- 6. 🛠️ デバッグ枠描画 ---
        const debugVisualY = en.y + (en.jumpY || 0);
        ctx.strokeStyle = "red";
        ctx.lineWidth = 1;
        ctx.strokeRect(en.x, debugVisualY, en.w, en.h);

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
 * ダメージ数字を描画する
 */
function drawDamageTexts(damageTexts) {
    damageTexts.forEach(t => {
        ctx.save(); 
        // 40 を VIEW_CONFIG.damageText.duration に置き換え
        ctx.globalAlpha = t.timer / VIEW_CONFIG.damageText.duration; 
        ctx.textAlign = "center";
        
        // 色の設定を VIEW_CONFIG から取得
        ctx.fillStyle = t.type === 'player_hit' ? VIEW_CONFIG.damageText.colorPlayerHit : (t.isCritical ? VIEW_CONFIG.damageText.colorCritical : VIEW_CONFIG.damageText.colorDefault);
        
        // フォントを VIEW_CONFIG から取得
        ctx.font = VIEW_CONFIG.damageText.fontSize; 
        
        ctx.fillText(t.val, t.x, t.y); 
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

        ctx.globalAlpha = Math.max(0, 1 - t);
        ctx.translate(dx, dy);

        // アイテム画像の描画品質を保つ
        ctx.imageSmoothingEnabled = true;

        const config = ITEM_CONFIG[eff.type] || ITEM_CONFIG["money1"];
        const img = config.isAnimated ? sprites.items[eff.type][0] : sprites.items[eff.type];

        if (img && img.complete) {
            const nw = img.naturalWidth;
            const nh = img.naturalHeight;
            
            // 🌟 30 -> VIEW_CONFIG.pickupEffect.size
            const targetHeight = VIEW_CONFIG.pickupEffect.size; 
            const targetWidth = targetHeight * (nw / nh);
            
            ctx.drawImage(img, -targetWidth / 2, -targetHeight / 2, targetWidth, targetHeight);
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

// ==========================================
// 📊 UI描画の司令塔（ここですべてを呼び出す）
// ==========================================
function drawUI(hero) {
    if (!hero) return; // 🌟 heroが空っぽの時は何もしない（これでエラーを防ぐ）

    // 1. HPバーの描画（背景パネルを含む）
    drawPlayerHP(hero);

    // 2. カバンUIの描画
    //drawBagUI(hero);

    // 3. 経験値とレベル・デバッグ表示
    drawExpAndDebug(hero);
}

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
        const itemY = item.y;
        const drawSize = VIEW_CONFIG.item.drawSize; // 32
        const halfSize = drawSize / 2;

        // 🌟 判定：一番下の地面(565)の近くにいるかどうか
        const isOnGround = itemY > 500; 

        let adjustY = 0;
        if (isOnGround) {
            adjustY = itemY - halfSize - 3;
        } else {
            adjustY = itemY - halfSize + 28; 
        }

        // 3. 移動と描画
        // 1. アイテムの中心位置に移動
        ctx.translate(item.x + halfSize, adjustY + floatY);

        // 2. 回転の処理
        if (item.rotateSpeed && item.rotateSpeed !== 0 && !item.landed) {
            // 🔄 角度をマイナス方向に更新することで反時計回りにします
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
            
            // --- A. アイテム本体の描画 ---
            ctx.imageSmoothingEnabled = true;
            ctx.drawImage(img, -targetWidth / 2, -targetHeight / 2, targetWidth, targetHeight);
            ctx.imageSmoothingEnabled = false;

            // --- 🌟 B. レア度に応じたカラーフレームの描画（追加） ---
            if (item.type === 'shield') {
                const def = item.defense || 0;
                let frameColor = null;

                // 💜最高級と💛良品のみ色を設定し、壊れかけ（グレー）は除外しました
                if (def >= 14)      frameColor = "#ff00ff"; // 💜最高級
                else if (def >= 11) frameColor = "#ffcc00"; // 💛良品

                // frameColorがある場合（11以上）のみ枠を描画します
                if (frameColor) {
                    ctx.strokeStyle = frameColor;
                    ctx.lineWidth = 2.5; 
                    ctx.strokeRect(-targetWidth / 2, -targetHeight / 2, targetWidth, targetHeight);
                }
            }
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

    // 🌟 重複チェック用のSetはそのまま使いますが、使い方を変えます
    const alreadyDrawn = new Set();

    for (let i = 0; i < 10; i++) {
        const x = startX + (slotSize + padding) * i;
        const y = startY;

        // 枠の描画（ここは変更なし）
        ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
        ctx.lineWidth = 2;
        ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
        ctx.fillRect(x, y, slotSize, slotSize);
        ctx.strokeRect(x, y, slotSize, slotSize);

        const itemData = inventory[i];
        
        // 🌟 ここから修正
        if (itemData && itemData.type) {
            let type = itemData.type;
            let count = itemData.count || 0;

            // 1. まず、個数が0以下の不正なデータなら無視する
            if (count <= 0) continue;

            // 2. 装備品（Shieldなど）は重複を許し、Goldだけ重複をチェックする
            if (type === 'gold') {
                if (alreadyDrawn.has('gold')) continue;
                alreadyDrawn.add('gold');
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
                    ctx.drawImage(displayImg, x + m, y + m, slotSize - m * 2, slotSize - m * 2);
                    
                    // 🌟 修正：goldなら1個以上、それ以外なら2個以上で数字を出す設定
                    if ((type === 'gold' && count >= 1) || count > 1) {
                        ctx.fillStyle = "white";
                        ctx.strokeStyle = "black";
                        ctx.lineWidth = 2;
                        ctx.font = "bold 14px Arial";
                        ctx.textAlign = "right";
                        ctx.strokeText(count, x + slotSize - 3, y + slotSize - 3);
                        ctx.fillText(count, x + slotSize - 3, y + slotSize - 3);
                        ctx.textAlign = "left";
                    }
                }

                // ==========================================
                // 🛡️ 3. 【追加】盾のランクに応じて枠を「上塗り」する
                // 画像を描いた後で実行するので、中身は塗りつぶされません。
                // ==========================================
                if (type === 'shield') {
                    const def = itemData.defense || 0;
                    let frameColor = null;

                    // 💜最高級と💛良品のみ色を設定し、壊れかけ（グレー）は除外しました
                    if (def >= 14)      frameColor = "#ff00ff"; // 最高級
                    else if (def >= 11) frameColor = "#ffcc00"; // 良品

                    // frameColorがある場合（11以上）のみ枠を描画します
                    if (frameColor) {
                        ctx.save();
                        ctx.strokeStyle = frameColor;
                        ctx.lineWidth = 3; // レア枠は少し太くして強調
                        ctx.strokeRect(x, y, slotSize, slotSize); // 線だけを描く
                        ctx.restore();
                    }
                }
                // ==========================================
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

window.addEventListener('keydown', (e) => {
    // 1. ガード処理
    if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;

    const key = e.key.toLowerCase(); // 大文字小文字を気にせず判定できるように

    // 2. インベントリ (Iキー)
    if (key === 'i') {
        isInventoryOpen = !isInventoryOpen;
        
        // 🌟 開閉に関わらず、最後に触った(押した)方を最前面へ
        windowStack = windowStack.filter(v => v !== "inventory");
        windowStack.push("inventory");
        
        // 🔊 音の追加
        if (isInventoryOpen) {
            if (typeof playMenuUpSound === 'function') playMenuUpSound();
        } else {
            if (typeof playMenuDownSound === 'function') playMenuDownSound();
        }
        
        console.log("Inventory Window State:", isInventoryOpen);
    }

    // 3. ステータス (Oキー)
    if (key === 'o') {
        isStatsWindowOpen = !isStatsWindowOpen;

        // 🌟 開閉に関わらず、最後に触った(押した)方を最前面へ
        windowStack = windowStack.filter(v => v !== "status");
        windowStack.push("status");

        if (isStatsWindowOpen) {
            if (typeof playMenuUpSound === 'function') playMenuUpSound();
        } else {
            if (typeof playMenuDownSound === 'function') playMenuDownSound();
        }
    }
    
    // 4. デバッグ (Dキー)
    if (key === 'd') {
        showDebugWindow = !showDebugWindow;
        console.log("Debug Window:", showDebugWindow);
    }

    // 5. エスケープ
    if (e.key === 'Escape') {
        // どちらか一方でも開いていれば閉じる
        if (isStatsWindowOpen || isInventoryOpen) {
            isStatsWindowOpen = false;
            isInventoryOpen = false;
            if (typeof playMenuDownSound === 'function') playMenuDownSound();
        }
    }
});

window.addEventListener('mouseup', () => {
    isDragging = false;
	isDragging = false;
    isDraggingInv = false;
});

// ==========================================
// 🖱️ マウスクリック時の判定処理
// ==========================================
canvas.addEventListener('mousedown', (event) => {
    const rect = canvas.getBoundingClientRect();
    // 座標計算は元のコードを踏襲
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    // 1. 各ウィンドウの上にマウスがあるか判定
    const isOverStats = (isStatsWindowOpen && clickX >= winX && clickX <= winX + 300 && clickY >= winY && clickY <= winY + 250);
    const isOverInv = (isInventoryOpen && clickX >= invWinX && clickX <= invWinX + invWinW && clickY >= invWinY && clickY <= invWinY + invWinH);

    // 2. 🌟 重なりを考慮して、どちらのウィンドウを優先するか決定する
    let priorityWindow = "none";

    if (isOverStats && isOverInv) {
        // 両方重なっている場合は、windowStack の最後（手前）にある方を優先
        priorityWindow = windowStack[windowStack.length - 1];
    } else if (isOverStats) {
        priorityWindow = "status";
    } else if (isOverInv) {
        priorityWindow = "inventory";
    }

    // 3. 📊 Player Status の判定処理（優先された場合のみ実行）
    if (priorityWindow === "status") {
        // status を最前面に移動
        windowStack = windowStack.filter(item => item !== "status");
        windowStack.push("status");

        const winW = 300;
        const winH = 250;

        // --- ❌ 1. 閉じるボタンの判定 ---
        const closeBtnX = winX + winW - 25;
        const closeBtnY = winY + 5;
        if (clickX >= closeBtnX && clickX <= closeBtnX + 25 && clickY >= closeBtnY && clickY <= closeBtnY + 25) {
            isStatsWindowOpen = false;
            if (typeof playMenuDownSound === 'function') playMenuDownSound();
            return; // 🌟 処理終了（下のウィンドウや地面には届かない）
        }

        // --- 🗂️ 2. タブ切り替えの判定 ---
        if (clickY >= winY + 35 && clickY <= winY + 60) {
            if (clickX >= winX + 20 && clickX <= winX + 90) {
                currentTab = "status";
                if (typeof playTabSound === 'function') playTabSound();
                return;
            }
            if (clickX >= winX + 95 && clickX <= winX + 165) {
                currentTab = "ap";
                if (typeof playTabSound === 'function') playTabSound();
                return;
            }
        }

        // --- 🔘 3. AP強化ボタンの判定 ---
        if (currentTab === "ap") {
            const btnX = winX + 150;
            const btnW = 100;
            const btnH = 25;
            if (clickX >= btnX && clickX <= btnX + btnW && clickY >= winY + 102 && clickY <= winY + 102 + btnH) {
                if (hero.ap > 0) {
                    socket.emit('upgrade_stat', { type: 'str' });
                    if (typeof playMouseClickSound === 'function') playMouseClickSound();
                }
                return;
            }
            if (clickX >= btnX && clickX <= btnX + btnW && clickY >= winY + 132 && clickY <= winY + 132 + btnH) {
                if (hero.ap > 0) {
                    socket.emit('upgrade_stat', { type: 'dex' });
                    if (typeof playMouseClickSound === 'function') playMouseClickSound();
                }
                return;
            }
            if (clickX >= btnX && clickX <= btnX + btnW && clickY >= winY + 162 && clickY <= winY + 162 + btnH) {
                if (hero.ap > 0) {
                    socket.emit('upgrade_stat', { type: 'luk' });
                    if (typeof playMouseClickSound === 'function') playMouseClickSound();
                }
                return;
            }
        }

        // --- 🖐️ 4. タイトルバーのドラッグ開始判定 ---
        if (clickX >= winX && clickX <= winX + winW && clickY >= winY && clickY <= winY + 30) {
            isDragging = true;
            dragOffsetX = clickX - winX;
            dragOffsetY = clickY - winY;
            return;
        }

        // --- 🛡️ 5. ウィンドウ内クリックのガード ---
        return; 
    }

    // 4. 🎒 Inventory の判定処理（優先された場合のみ実行）
    if (priorityWindow === "inventory") {
        // inventory を最前面に移動
        windowStack = windowStack.filter(item => item !== "inventory");
        windowStack.push("inventory");

        // --- ❌ 閉じるボタンの判定 ---
        const invCloseBtnX = invWinX + invWinW - 25;
        const invCloseBtnY = invWinY + 5;
        if (clickX >= invCloseBtnX && clickX <= invCloseBtnX + 25 && clickY >= invCloseBtnY && clickY <= invCloseBtnY + 25) {
            isInventoryOpen = false;
            if (typeof playMenuDownSound === 'function') playMenuDownSound();
            return;
        }

        // --- 🖐️ タイトルバーのドラッグ判定 ---
        if (clickX >= invWinX && clickX <= invWinX + invWinW && clickY >= invWinY && clickY <= invWinY + 30) {
            isDraggingInv = true;
            dragOffsetXInv = clickX - invWinX;
            dragOffsetYInv = clickY - invWinY;
            return;
        }

        // --- 🛡️ ウィンドウ内クリックのガード ---
        return;
    }

    // 5. 🎒 どの窓も触っていない場合の「既存のバッグ・アイテム操作」
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
    } 
    else {
        if (selectedSlotIndex !== -1) {
            socket.emit('dropItem', selectedSlotIndex);
            selectedSlotIndex = -1;
            canvas.style.cursor = "default";
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
		/*
        ctx.globalAlpha = 0.8; 
        ctx.fillStyle = "white";
        ctx.font = "bold 14px Arial";
        ctx.textAlign = "center";
        ctx.shadowBlur = 4;
        ctx.shadowColor = "black";
        ctx.fillText(item.type, mouseX, mouseY + 30);
		*/
        
        ctx.restore(); // 🌟 restoreを呼ぶことで、他の描画まで薄くなるのを防ぎます
    }
		
    requestAnimationFrame(drawItemHoverLoop);
}

// 🌟 そして一番最後に、このループを最初に1回だけ動かします
drawItemHoverLoop();

// サーバーからの入室通知を受け取って音を鳴らす
socket.on('player_joined_sound', () => {
    // 指定された playInviteSound() を実行
    if (typeof playInviteSound === 'function') {
        playInviteSound();
    } else {
        console.warn("playInviteSound が定義されていません。");
    }
});

//inventoryVisualBuffer[0] = { type: 'My Sword', defense: 50 };

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
    ctx.fillText(`Window Open : ${isStatsWindowOpen}`, 20, canvas.height - 85);
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
                draw(`[Status] ${isStatsWindowOpen ? "UI:Open" : "UI:Closed"}`);
            }
        }
    } catch (err) {
        // エラーログ（疲れている時は無理に見なくて大丈夫です）
    }
    requestAnimationFrame(autoDebugRender);
}

// 実行開始
autoDebugRender();

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
            if (typeof isStatsWindowOpen !== 'undefined' && isStatsWindowOpen) {
                
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
function drawNewInventoryWindow() {
    if (!isInventoryOpen) return;

    // 400, 100 などの直接の数字を、変数名に変えるだけです
    if (typeof drawSimpleWindow === 'function') {
        drawSimpleWindow("🎒 Items & Equipment", invWinX, invWinY, invWinW, invWinH);
    }
}