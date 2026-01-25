// ==========================================
// 🎨 1. キャンバスの設定と描画品質
// ==========================================
const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d');

// ✨ ドット絵をくっきり表示させる設定
// 拡大・縮小したときに画像をぼかさず、ドットの質感を保持します
ctx.imageSmoothingEnabled = false;       // 標準設定
ctx.webkitImageSmoothingEnabled = false; // Safariや古いブラウザ用
ctx.msImageSmoothingEnabled = false;     // Internet Explorer用

// 🌟 ここから追加：高画質化（Retina/高画素ディスプレイ対応）
const dpr = window.devicePixelRatio || 1;
canvas.width = 800 * dpr;  // 本来の幅(800) × 密度
canvas.height = 600 * dpr; // 本来の高さ(600) × 密度
ctx.scale(dpr, dpr);       // 描画全体を拡大して帳尻を合わせる

// 🌟 重要：canvas.widthを変更すると smoothing 設定がリセットされる場合があるため
// ここでもう一度 OFF にしておくと確実です
ctx.imageSmoothingEnabled = false;

// ==========================================
// 📋 2. 表示に関する基本設定（VIEW_CONFIG）
// 役割：画面上の見た目や判定の基準となる数値をまとめて管理します
// ==========================================
const VIEW_CONFIG = {
  playerSize: 60,         // プレイヤーの基本サイズ
  groundY: 580,           // 地面とみなすY座標の基準
  chatTimer: 180,         // チャットの吹き出しを表示しておく時間（フレーム数）
  isGroundedMargin: 5     // 接地判定（地面に触れているか）の許容誤差
};

// ==========================================
// 👣 足元の高さ調整 (のめり込むならマイナスを大きくする)
// ==========================================
const GROUP_OFFSETS = {
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
    15: -3  // りす
};

// ==========================================
// 📋 1. モンスターの設定名簿（ここだけ管理すればOK！）
// ==========================================
const MONSTER_CONFIGS = [
    { 
        name: 'monster1', 
        move: 4, death: 3, idle: 1, 
        attack: 0, jump: 0, walk: 0 
    },
    { 
        name: 'monster2', 
        move: 4, death: 4, idle: 3, 
        attack: 0, jump: 0, walk: 0 
    },
    { 
        name: 'monster3', 
        move: 4, death: 7, idle: 3, 
        attack: 0, jump: 0, walk: 0 
    },
    { 
        name: 'monster4', 
        move: 4, death: 3, idle: 1, 
        attack: 0, jump: 0, walk: 0, 
        useImage: 'monster1' // 4番は1番の絵を流用
    },
	{ 
        name: 'monster5', 
        id: 'Char01', fileName: 'skeleton', // 🌟 新しいパス形式に対応
        move: 4, death: 18, idle: 18, attack: 22, jump: 14, walk: 18 
    },
	{ 
        name: 'monster6', 
        id: 'Char02', fileName: 'skeleton', // 🌟 新しいパス形式に対応
        move: 4, death: 18, idle: 18, attack: 22, jump: 14, walk: 18 
    },
	{ 
        name: 'monster7', 
        id: 'Char03', fileName: 'skeleton', // 🌟 新しいパス形式に対応
        move: 4, death: 18, idle: 18, attack: 22, jump: 14, walk: 18 
    },
	{ 
        name: 'monster8', 
        id: 'Char04', fileName: 'skeleton', // 🌟 新しいパス形式に対応
        move: 4, death: 18, idle: 18, attack: 22, jump: 14, walk: 18 
    },
	{ 
        name: 'monster9', 
        id: 'Char05', fileName: 'skeleton', // 🌟 新しいパス形式に対応
        move: 4, death: 18, idle: 18, attack: 22, jump: 14, walk: 18 
    },
	{ 
        name: 'monster10', 
        id: 'Char06', fileName: 'skeleton', // 🌟 新しいパス形式に対応
        move: 4, death: 18, idle: 18, attack: 22, jump: 14, walk: 18 
    },
	{ 
        name: 'monster11', 
        id: 'Char07', fileName: 'skeleton', // 🌟 新しいパス形式に対応
        move: 4, death: 18, idle: 18, attack: 22, jump: 14, walk: 18 
    },
	{ 
        name: 'monster12', 
        id: 'Char08', fileName: 'skeleton', // 🌟 新しいパス形式に対応
        move: 4, death: 18, idle: 18, attack: 22, jump: 14, walk: 18 
    },
	{ 
        name: 'monster13', 
        id: 'Char09', fileName: 'skeleton', // 🌟 新しいパス形式に対応
        move: 4, death: 18, idle: 18, attack: 22, jump: 14, walk: 18 
    },
	{ 
        name: 'monster14', 
        id: 'Char10', fileName: 'skeleton', // 🌟 新しいパス形式に対応
        move: 4, death: 18, idle: 18, attack: 22, jump: 14, walk: 18 
    },
	{ 
        name: 'monster15', 
        id: 'Char11', fileName: 'skeleton', // 🌟 新しいパス形式に対応
        move: 4, death: 18, idle: 18, attack: 22, jump: 14, walk: 18 
    },
	{ 
        name: 'monster16', 
        id: 'Char12', fileName: 'skeleton', // 🌟 新しいパス形式に対応
        move: 4, death: 18, idle: 18, attack: 22, jump: 14, walk: 18 
    },
	{ 
        name: 'monster17', 
        id: 'Char13', fileName: 'skeleton', // 🌟 新しいパス形式に対応
        move: 4, death: 18, idle: 18, attack: 22, jump: 14, walk: 18 
    },
	{ 
        name: 'monster18', 
        id: 'Char14', fileName: 'skeleton', // 🌟 新しいパス形式に対応
        move: 4, death: 18, idle: 18, attack: 22, jump: 14, walk: 18 
    },
	{ 
        name: 'monster19', 
        id: 'Char15', fileName: 'skeleton', // 🌟 新しいパス形式に対応
        move: 4, death: 18, idle: 18, attack: 22, jump: 14, walk: 18 
    },
	{ 
        name: 'monster20', 
        id: 'Char16', fileName: 'skeleton', // 🌟 新しいパス形式に対応
        move: 4, death: 18, idle: 18, attack: 22, jump: 14, walk: 18 
    },
	{ 
        name: 'monster21', 
        id: 'Char17', fileName: 'skeleton', // 🌟 新しいパス形式に対応
        move: 4, death: 18, idle: 18, attack: 22, jump: 14, walk: 18 
    },
	{ 
        name: 'monster22', 
        id: 'Char18', fileName: 'skeleton', // 🌟 新しいパス形式に対応
        move: 4, death: 18, idle: 18, attack: 22, jump: 14, walk: 18 
    },
	{ 
        name: 'monster23', 
        id: 'Char19', fileName: 'skeleton', // 🌟 新しいパス形式に対応
        move: 4, death: 18, idle: 18, attack: 22, jump: 14, walk: 18 
    },
	{ 
        name: 'monster24', 
        id: 'Char20', fileName: 'skeleton', // 🌟 新しいパス形式に対応
        move: 4, death: 18, idle: 18, attack: 22, jump: 14, walk: 18 
    },
	{ 
        name: 'monster25', 
        id: 'Char21', fileName: 'skeleton', // 🌟 新しいパス形式に対応
        move: 4, death: 18, idle: 18, attack: 22, jump: 14, walk: 18 
    },
	{ 
        name: 'monster26', 
        id: 'Char22', fileName: 'skeleton', // 🌟 新しいパス形式に対応
        move: 4, death: 18, idle: 18, attack: 22, jump: 14, walk: 18 
    },
	{ 
        name: 'monster27', 
        id: 'Char23', fileName: 'skeleton', // 🌟 新しいパス形式に対応
        move: 4, death: 18, idle: 18, attack: 22, jump: 14, walk: 18 
    },
	{ 
        name: 'monster28', 
        id: 'Char24', fileName: 'skeleton', // 🌟 新しいパス形式に対応
        move: 4, death: 18, idle: 18, attack: 22, jump: 14, walk: 18 
    },
	{ 
        name: 'monster29', 
        id: 'Char25', fileName: 'skeleton', // 🌟 新しいパス形式に対応
        move: 4, death: 18, idle: 18, attack: 22, jump: 14, walk: 18 
    },
];

// ==========================================
// 💰 アイテム・マスターデータ（これを中心に全てを動かす）
// ==========================================
const ITEM_CONFIG = {
    "money3": {
        "name": "100ゴールド",
        "spriteKey": "money3",
        "isAnimated": true,
        "src": "/item_assets/money3_", // 数値と.pngは自動補完
        "points": 100
    },
    "gold": {
        "name": "金塊",
        "spriteKey": "gold",
        "isAnimated": false,
        "src": "/item_assets/gold.png",
        "points": 500
    },
    "shield": {
        "name": "盾",
        "spriteKey": "shield",
        "isAnimated": false,
        "src": "/item_assets/shield.png",
        "points": 500
    },
    "money1": {
        "name": "10ゴールド",
        "spriteKey": "money1",
        "isAnimated": true,
        "src": "/item_assets/money1_",
        "points": 10
    },
	"money5": {
        "name": "金メダル",
        "spriteKey": "money5",
        "isAnimated": true,
        "src": "/item_assets/Gold_",
        "points": 10
    },
	"money6": {
        "name": "銀メダル",
        "spriteKey": "money6",
        "isAnimated": true,
        "src": "/item_assets/Silver_",
        "points": 10
    },
	"money7": {
        "name": "銅メダル",
        "spriteKey": "money7",
        "isAnimated": true,
        "src": "/item_assets/Bronze_",
        "points": 10
    },
	"gold_one": {
        "name": "ワンメダル(金)",
        "spriteKey": "gold_one",
        "isAnimated": true,
        "src": "/item_assets/GoldOne_",
        "points": 10
    },
	"gold_heart": {
        "name": "ハートメダル(金)",
        "spriteKey": "gold_heart",
        "isAnimated": true,
        "src": "/item_assets/GoldHeart_",
        "points": 10
    },
};

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
    // 🌟 【ここを追加】この下の return; がある限り、画像読み込みは動きません
    return;
    MONSTER_CONFIGS.forEach(m => {
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
        for (let i = 0; i < (m.death || 0); i++) {
            sprites[m.name + 'Death'][i].src = `${basePath}/Dead/${fName}-Dead_${i}.png`;
        }

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
    sprites.playerDown.src = '/player_down.png';
    for (let i = 0; i < 4; i++) {
        sprites.playerClimb[i].src = `/player_climb${i+1}.png`;
    }
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

// ==========================================
// 👤 プレイヤー・キャラクター設定
// ==========================================
const playerSprites = [];  // 画像データを格納する箱
const GROUP_COUNT   = 16;  // グループの総数 (00〜15)
const VAR_COUNT     = 15;  // 各グループ内のキャラ数 (01〜15)

// 🌟 現在選択中のキャラクター（ここを書き換えてキャラ変更）
let selectedGroup   = 5;   // 現在のグループ
let selectedCharVar = 6;   // 現在のキャラクター番号

// ==========================================
// 🏃 アクションとアニメーション枚数
// ==========================================
const ACTION_FRAMES = {
    "Dead":     45, 
    "Fly":      20, 
    "Hit":      50, 
    "Idle":     20, 
    "Jump":     20, 
    "Roll":     8, 
    "Stuned":   24, 
    "Throwing": 40, 
    "Walk":     20
};

// アクション名だけのリストを作成 ( ["Dead", "Fly", ... ] )
const ACTIONS = Object.keys(ACTION_FRAMES);

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
    // 🌟 【ここを追加】
    return;
	
    // 1. 🛑 異常な数値や読み込み済みチェック
    // グループ番号(g)やバリエーション(v)が範囲外なら何もしない
    if (groupIndex < 0 || groupIndex >= 16 || variantIndex < 1 || variantIndex > 15) return;
    // すでに読み込み済みなら、二重に読み込まないように終了する
    if (playerSprites[groupIndex][variantIndex] !== null) return;

    // 2. 📂 フォルダ名の準備 (01, 02 のように2桁に揃える)
    playerSprites[groupIndex][variantIndex] = {};
    const groupNum = String(groupIndex).padStart(2, '0');
    const varNum = String(variantIndex).padStart(2, '0');

    // 3. 🏃 各アクション（歩く、待機など）ごとに画像を検索
    ACTIONS.forEach(action => {
        playerSprites[groupIndex][variantIndex][action] = [];
        
        // 枚数が不明なので、最大50枚まで順番にファイルがあるか試す
        for (let i = 0; i < 50; i++) {
            const img = new Image();
            const frameNum = String(i).padStart(2, '0');
            
            // 🖼️ 画像の住所（パス）を組み立てる
            // 例: char_assets/group_00/Character01/walk/Characters-Character01-walk_00.png
            img.src = `char_assets/group_${groupNum}/Character${varNum}/${action}/Characters-Character${varNum}-${action}_${frameNum}.png`;

            // 成功：画像が見つかった場合
            img.onload = () => {
                // 配列の指定された番号に画像を保存
                playerSprites[groupIndex][variantIndex][action][i] = img; 
            };
            
            // 失敗：画像がなかった場合（例えば10枚目までしか無い時、11枚目以降はここを通る）
            img.onerror = () => {
                // 画面にエラーを出さず、静かに無視する（これで枚数不定でもOKになる）
            };
        }
    });
    
    console.log(`✅ グループ${groupNum} キャラ${varNum} の全アクションを読み込み開始しました`);
}

for (let g = 0; g < GROUP_COUNT; g++) {

	if (g !== 8) continue;
    // 🌟 ここにあった 「if (g !== 8) continue;」 を削除！
    // これで 00 から 15 まで全部読み込みに行きます。

    playerSprites[g] = [];
	// 🌟 【ここを追加】ここで止めることで、画像1枚1枚の読み込みをスキップします
    continue;
    for (let v = 1; v <= VAR_COUNT; v++) {
        playerSprites[g][v] = {}; 
        
        const groupNum = String(g).padStart(2, '0');
        const varNum = String(v).padStart(2, '0');

        ACTIONS.forEach(action => {
            playerSprites[g][v][action] = [];
            const count = ACTION_FRAMES[action];
            for (let i = 0; i < count; i++) {
                const img = new Image();
                const frameNum = String(i).padStart(2, '0');
                // パスも自動的に group_00, group_01... と切り替わります
                img.src = `char_assets/group_${groupNum}/Character${varNum}/${action}/Characters-Character${varNum}-${action}_${frameNum}.png`;
                playerSprites[g][v][action].push(img);
            }
        });
    }
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
// 🎨 1. メインの描画司令塔（drawGame）
// 役割：描画の順番を決め、各パーツの関数を呼び出す
// ==========================================
function drawGame(hero, others, enemies, items, platforms, ladders, damageTexts, frame) {
    // --- データの更新と画面クリア ---
    updateLogTimers(); // ログの寿命を計算
    chatMessages = chatMessages.filter(m => m.timer > 0); // チャット寿命

    ctx.clearRect(0, 0, 800, 600); // 画面を真っさらに

    // --- 描画レイヤー（下にあるものから順に） ---
    drawMap(platforms, ladders);        // 1. 地面・足場・ハシゴ
    drawItems(items, frame);            // 2. アイテム

    // 3. プレイヤー（他人 → 自分の順で描画して自分を最前面に）
    for (let id in others) {
        if (others[id]) drawPlayerObj(others[id], false, id);
    }
    drawPlayerObj(hero, true);

    drawEnemies(enemies, hero, frame);  // 4. 敵（モンスター）

    // 5. エフェクト・UI
    drawDamageTexts(damageTexts);       // ダメージ数字
    drawChatBubbles(hero, others);      // 吹き出し
    drawPickupEffects(hero, others);    // アイテム吸い込み演出
    drawItemLogsUI();                   // 画面右下の取得ログ

    drawUI(hero);                       // ステータスUIなど
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
        ctx.fillStyle = '#4a3728'; 
        ctx.fillRect(p.x, p.y, p.w, p.h); 
        ctx.fillStyle = '#6d4c41'; 
        ctx.fillRect(p.x, p.y, p.w, 4); 
    });

    // --- B. 最下層の地面 ---
    ctx.fillStyle = '#4a3728'; 
    ctx.fillRect(0, 565, 800, 35); 
    ctx.fillStyle = '#6d4c41'; 
    ctx.fillRect(0, 565, 800, 4); 

    // --- C. 🪜 ハシゴ (Ladders) ---
    ladders.forEach(l => { 
        const ladderW = 30;
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(l.x, l.y1, 4, l.y2 - l.y1);               // 左の柱
        ctx.fillRect(l.x + ladderW - 4, l.y1, 4, l.y2 - l.y1); // 右の柱
        ctx.fillStyle = '#cbd5e1';
        for (let hy = l.y1 + 10; hy < l.y2; hy += 15) {
            ctx.fillRect(l.x, hy, ladderW, 3);
        }
    });
}

/**
 * 👤 プレイヤーの描画処理（function形式）
 */
function drawPlayerObj(p, isMe, id) {
    if (!p) return;

    // 1. 🎭 キャラクター設定（見た目）の読み込み
    // 自分の場合は選んだ番号を、他人の場合はその人が選んでいる番号（なければ予備の5番と6番）を使います
    const g = isMe ? selectedGroup : (p.group !== undefined ? p.group : 5);
    const v = isMe ? selectedCharVar : (p.charVar !== undefined ? p.charVar : 6);

    // 使う画像がまだ読み込まれていなければ、ここで読み込みを開始（予約）します
    loadCharFrames(g, v);

    // 2. 🎮 操作状態と表示サイズの定義
    const currentKeys = window.keys || {}; // キー入力の状態を取得
    const drawW = 300, drawH = 190;        // 画像ファイル自体のサイズ（キャンバス上の枠）
    const pW = 40, pH = 65;               // 実際のキャラクターの当たり判定サイズ

    // 【修正後：おすすめ】
    // 自分のキャラ(hero)も他人のキャラ(p)も、
    // 「実際に横に動いている速度」を見て判断するように統一します。
    const speed = isMe ? hero.vx : (p.vx || 0);
    const isMoving = Math.abs(speed) > 0.1;

    // 🦶 地面に足がついているか？
    const isGrounded = !p.jumping;

    // 5. ⚔️ 攻撃アニメーションの経過時間を計算
    let currentImg; // この後、表示する画像をここに代入します
    // 攻撃を開始したフレームから、現在どれくらい時間が経ったかを計算します
    const diff = frame - (p.attackStartFrame || 0);

    // --- アクション別のアニメーション判定 ---
    // ⚔️ 攻撃（ヒット）アニメーションの処理
    if (p.isAttacking > 0) {
        const action = "Hit"; // 使うアクション名

        // 1. 📂 画像リスト(frames)の安全な取得
        // キャラクターの画像データが存在するかチェックします
        const characterData = (playerSprites[g] && playerSprites[g][v]);
        const frames = characterData ? characterData[action] : null;

        if (frames && frames.length > 0) {
            // 2. ⏱️ アニメーション時間の計算
            const maxDuration = 20; // 攻撃アニメーション全体の長さ（20フレーム）

            // 現在、何フレーム目まで進んだか（例：20 - 15 = 5フレーム経過）
            const currentStep = maxDuration - p.isAttacking;

            // 進捗率を 0.0 ～ 1.0 の間で出します（例：5/20 = 0.25）
            let progress = currentStep / maxDuration;

            // 3. ✨ 動きの「緩急」をつける (イージング)
            // Math.pow(x, 0.8) で、少しだけ最初を速く、後半をゆっくりにします
            // これにより、攻撃に「キレ」が生まれます
            let easingProgress = Math.pow(progress, 0.8);

            // 4. 🖼️ 表示する画像の番号(インデックス)を決定
            // 進捗率に画像の枚数を掛け算して、何番目の画像を表示するか決めます
            let atkIdx = Math.floor(easingProgress * (frames.length - 1));

            // 番号が画像枚数の範囲を超えないように固定（安全策）
            atkIdx = Math.max(0, Math.min(atkIdx, frames.length - 1));

            // 最後に、選ばれた画像を代入します
            currentImg = frames[atkIdx];
        }
    }
    // 🛌 伏せ状態（p.isDown）のときの画像表示
    else if (p.isDown) {
        const action = "Roll"; // 伏せポーズとして「Roll」フォルダの画像を使用する設定

        // 1. 📂 画像リストの取得
        // 指定されたグループ(g)とバリエーション(v)の中に「Roll」アクションがあるか確認
        const characterData = (playerSprites[g] && playerSprites[g][v]);
        const frames = characterData ? characterData[action] : null;

        // 2. 🖼️ 表示する画像の決定
        if (frames && frames.length > 0) {
            // 「Roll」画像がある場合：
            // アニメーションさせず、最初の1枚目（[0]）でピタッと止めます
            currentImg = frames[0];
        } else {
            // 「Roll」画像が見つからない場合：
            // 予備として用意されている「sprites.playerDown」を表示します（エラー防止）
            currentImg = sprites.playerDown;
        }
    }
    // 🪜 ハシゴ登り中（p.climbing）の画像表示
    else if (p.climbing) {
        const action = "Fly"; // ハシゴ用のアクションとして「Fly」フォルダの画像を使用

        // 1. 📂 画像リストの取得
        const characterData = (playerSprites[g] && playerSprites[g][v]);
        const frames = characterData ? characterData[action] : null;

        if (frames && frames.length > 0) {
            // 2. 🏃 「今、ハシゴを上り下りしているか？」の判定
            // 縦方向の速度（vy）が少しでもあれば「動いている」とみなします
            const isMovingClimb = (Math.abs(p.vy || 0) > 0.1);

            // 3. 🖼️ 表示する画像の番号を決定
            let climbIdx;
            if (isMovingClimb) {
                // 動いている時：5フレームごとに画像を切り替えてパラパラ動かす
                climbIdx = Math.floor(frame / 5) % frames.length;
            } else {
                // 止まっている時：0番目（最初の1枚）のポーズで固定する
                climbIdx = 0;
            }

            currentImg = frames[climbIdx];

        } else {
            // 🛟 予備：画像データがない場合のバックアップ
            currentImg = sprites.playerClimb[0];
        }
    }
    // 💫 無敵時間（p.invincible）の画像表示
    else if (p.invincible > 0) {
        const action = "Stuned"; // 無敵（ダメージ後）は「Stuned（気絶）」アクションを使用

        // 1. 📂 画像リストの取得
        const characterData = (playerSprites[g] && playerSprites[g][v]);
        const frames = characterData ? characterData[action] : null;

        // 2. 🖼️ 表示する画像の決定
        if (frames && frames.length > 0) {
            // 画像がある場合：
            // 「Math.floor(frame / 3)」なので、かなり速いスピードでパラパラ動かします
            // （3フレームごとに次の画像へ切り替え）
            const animIndex = Math.floor(frame / 3) % frames.length;
            currentImg = frames[animIndex];
        } else {
            // 🛟 予備：画像データがない場合のバックアップ
            // 通常時の画像（sprites.playerA）を代わりに表示します
            currentImg = sprites.playerA;
        }
    }
    // ☁️ 空中にいる（!isGrounded）ときの画像表示
    else if (!isGrounded) {
        const action = "Jump"; // ジャンプ用のアクションを使用

        // 1. 📂 画像リストの取得
        const characterData = (playerSprites[g] && playerSprites[g][v]);
        const frames = characterData ? characterData[action] : null;

        if (frames && frames.length > 0) {
            // 2. ⏱️ ジャンプ経過時間の取得
            // p.jumpFrame はジャンプしてから増え続けている数字です
            const jf = p.jumpFrame || 0;
            let jumpIdx;

            // 3. 🚀 上昇中と 🪂 下隔中の切り替え
            if (p.vy < 0) {
                // 【上昇中】速度(vy)がマイナスのとき
                // 最初のほうのコマ（0〜9番目）を 6フレーム間隔でループさせます
                jumpIdx = Math.floor(jf / 6) % 10;
            } else {
                // 【下降中】速度(vy)がプラス（落ちている）とき
                // 後半のコマ（10番目以降）を表示します
                jumpIdx = 10 + (Math.floor(jf / 6) % 10);
            }

            // 4. 🖼️ 安全に画像を取り出す
            // 計算した番号が、実際の画像枚数(frames.length)を超えないように調整します
            const finalIdx = Math.max(0, Math.min(jumpIdx, frames.length - 1));
            currentImg = frames[finalIdx];

        } else {
            // 🛟 予備：画像がない場合は通常の立ちポーズを表示
            currentImg = sprites.playerA;
        }
    }
    // 🏃 地面を歩いている（isMoving）ときの画像表示
    else if (isMoving) {
        const action = "Walk"; // 歩き用のアクションを使用

        // 1. 📂 画像リストの取得
        const characterData = (playerSprites[g] && playerSprites[g][v]);
        const frames = characterData ? characterData[action] : null;

        // 2. 🖼️ 表示する画像の決定
        if (frames && frames.length > 0) {
            // 画像がある場合：
            // 【注目！】Math.floor(frame / 1) 
            // 1フレーム（約0.016秒）ごとに画像が切り替わります。
            // つまり、持っている画像を「最速」でパラパラさせている状態です。
            const animIndex = Math.floor(frame / 1) % frames.length;
            currentImg = frames[animIndex];
        } else {
            // 🛟 予備：画像データがない場合のバックアップ
            // 通常の立ちポーズ（sprites.playerA）を表示します
            currentImg = sprites.playerA;
        }
    }
    // 🧍 待機状態（Idle）の画像表示
    // 上記のどの条件（移動中やジャンプ中など）にも当てはまらない場合に実行されます
    else {
        const action = "Idle"; // 待機用のアクション「Idle」を使用

        // 1. 📂 画像リストの取得
        const characterData = (playerSprites[g] && playerSprites[g][v]);
        const frames = characterData ? characterData[action] : null;

        // 2. 🖼️ 表示する画像の決定
        if (frames && frames.length > 0) {
            // 画像がある場合：
            // 6フレームごとに画像を切り替えます
            // 待機中も少しだけ手足や体が動く（呼吸しているように見える）設定です
            const animIndex = Math.floor(frame / 6) % frames.length;
            currentImg = frames[animIndex];
        } else {
            // 🛟 予備：画像データがない場合のバックアップ
            // 完全に止まった状態の画像（sprites.playerA）を表示します
            currentImg = sprites.playerA;
        }
    }

    // --- 🎨 実際の描画処理 ---

    // 1. ✨ 無敵時間の「点滅」エフェクト
    // 4フレームごとに「描画する・しない」を交互に切り替えて、キャラをチカチカさせます
    if (p.invincible > 0 && Math.floor(frame / 4) % 2 === 0) {
        return; // このフレームでは何も描かずに終了（＝消えて見える）
    }

    // 2. 🖼️ 画像が準備できているか確認
    if (currentImg && currentImg.complete) {
        ctx.save(); // 現在のキャンバス状態（回転やスケール）を保存

        // 3. 📏 足元の位置（高さ）を細かく調整
        // キャラクターの画像によって浮いて見えないよう、グループごとの補正値を足します
        let footOffset = 30 + (GROUP_OFFSETS[g] || 0);
        if (p.y > 530) footOffset -= 35; // 特定の地面にいる時だけさらに微調整

        // 4. 📍 描画する座標の計算
        // 当たり判定の中心と、画像の中心が重なるように計算します
        const drawX = p.x + (pW / 2) - (drawW / 2);
        const drawY = p.y + pH - drawH + footOffset;

        // 5. ↔️ 左右の向きを反映
        if (p.dir === -1) {
            // 左向きの場合：キャンバスを左右反転させて描画
            ctx.translate(drawX + drawW / 2, drawY + drawH / 2);
            ctx.scale(-1, 1); // 横方向にマイナス1倍（鏡合わせ）
            ctx.drawImage(currentImg, -drawW / 2, -drawH / 2, drawW, drawH);
        } else {
            // 右向きの場合：そのまま描画
            ctx.drawImage(currentImg, drawX, drawY, drawW, drawH);
        }

        ctx.restore(); // 鏡合わせなどの設定をリセットして元に戻す
    }

    // --- 📊 UI（HPバーと名前）の描画 ---

    // 1. 💚 他人のHPバーを表示 (自分自身には表示しない)
    if (!isMe) {
        const barW = 40, barH = 5;               // バーの横幅と高さ
        const barX = p.x + 20 - barW / 2;        // 横位置：キャラの中央に合わせる
        // 足元の基準点（地面なら565、空中ならp.y + 画像の高さ）
        // p.yが500より大きければ地面にいるとみなす簡易判定
        const currentBaseY = (p.y > 500) ? 565 : (p.y + 60); 
    
        // キャラの高さ（基本サイズ60に、ジャンプなどの補正 jumpY があれば加味）
        const currentDrawH = 60; 

        // これで計算すれば、他プレイヤーがどこにいてもエラーにならず、頭上に表示されます
        const barY = currentBaseY - currentDrawH - (p.jumpY || 0) - 25;

        // 残りHPの割合を計算 (0.0 ～ 1.0)
        const hpRate = Math.max(0, Math.min(1, p.hp / 100));

        // HPに合わせて色を変える (20%以下で赤、50%以下で黄、それ以外は緑)
        let hpColor = (hpRate <= 0.2) ? "#ff0000" : (hpRate <= 0.5 ? "#ffff00" : "#00ff00");

        // 黒い枠線（背景）を描く
        ctx.fillStyle = "black";
        ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);

        // 現在のHP分だけバーを塗りつぶす
        ctx.fillStyle = hpColor;
        ctx.fillRect(barX, barY, barW * hpRate, barH);
    }

    // 2. 📛 名前の表示
    const nameText = p.name || "Player";

    // 地面（y > 530）にいるかどうかで、名前を出す高さを微調整する
    let nameY = p.y + ((p.y > 530) ? 48 : 83);
    if (nameY < 25) nameY = 25; // 画面の一番上からはみ出さないようにガード

    // 3. 🏷️ 名前の背景（黒い半透明の四角）を描く
    ctx.font = "bold 14px Arial";
    const nameW = ctx.measureText(nameText).width + 10; // 文字の長さに合わせて背景を広げる

    ctx.fillStyle = "rgba(0, 0, 0, 0.5)"; // 半透明の黒
    ctx.fillRect(p.x + pW / 2 - nameW / 2, nameY - 15, nameW, 20);

    // 4. ✍️ 名前を白文字で書き込む
    ctx.fillStyle = "white";
    ctx.textAlign = "center"; // 文字を中央揃えにする
    ctx.fillText(nameText, p.x + pW / 2, nameY);
}

// ==========================================
// 👾 5. 敵の描画（drawEnemies）
// ==========================================
function drawEnemies(enemies, hero, frame) {
    enemies.forEach(en => {
        // 1. 🛑 描画すべきかどうかの判定
        // 死亡していて、かつ「消滅アニメ（Fading）」も終わっているなら何も描かない
        if (!en.alive && !en.isFading) return;

        // 2. 💫 被ダメージ時の「点滅」エフェクト
        // ノックバック速度(kbV)が大きく、かつ4フレームおきに描画をスキップしてチカチカさせます
        if (!en.isFading && Math.abs(en.kbV) > 2.0 && Math.floor(frame / 4) % 2 === 0) {
            return;
        }

        ctx.save(); // キャンバスの状態を保存

        // 3. ✨ 透明度（globalAlpha）のコントロール
        if (en.isFading) {
            // 【消滅中】倒れた後、約40フレームかけて徐々に薄くなって消えます
            ctx.globalAlpha = Math.max(0, 1 - (en.deathFrame / 40));
        } else if (en.spawnAlpha !== undefined) {
            // 【出現中】登場したばかりの時、ふわっと現れるための設定
            ctx.globalAlpha = en.spawnAlpha;
        }

        // 4. 🖼️ 画像とサイズの準備
        let img = null;
        // 画像がない場合に備えて、当たり判定と同じサイズを初期値にしておきます
        let drawW = en.w;
        let drawH = en.h;

        // 5. 💢 ダメージを受けているかの判定
        // ノックバックの勢いが強い場合「ダメージ中」とみなします
        const isDamaged = Math.abs(en.kbV) > 1.5;

        // --- 1. 画像判定 (アニメーションの選択) ---

        // 💀 敵が倒れて「消滅アニメーション中（isFading）」の場合の処理
        if (en.isFading) {
            // 📂 共通の死亡エフェクト画像（煙や爆発など）を取得
            const ds = sprites["commonDeath"];

            if (ds && ds.length > 0) {
                // ⏱️ アニメーションの速度計算
                // 全体の時間（40フレーム）を画像の枚数で割って、1枚あたりの表示時間を決めます
                // 例：4枚あれば、10フレームごとに次の画像へ切り替わります
                const frameInterval = 40 / ds.length;

                // 🖼️ 表示する画像の番号を決定
                // deathFrame（0からカウントアップ）を使い、最後の枚数を超えないように調整
                const animationIdx = Math.floor(en.deathFrame / frameInterval);
                const safeIdx = Math.min(animationIdx, ds.length - 1);

                img = ds[safeIdx];

                // 📏 エフェクト専用の表示サイズに固定
                // 敵の大きさに関わらず、消滅エフェクトはこのサイズで表示されます
                drawW = 271 * 0.5;
                drawH = 278 * 0.5;
            }
        }
        // ☁️ 敵がジャンプ中（en.jumpY が一定以上マイナス）の画像表示
        else if ((en.jumpY || 0) < -1) {
            // 📂 敵の種類に合わせたジャンプ用画像（例: "slimeJump"）を取得
            const jumps = sprites[en.type + "Jump"];

            if (jumps && jumps.length > 0) {
                // 1. 🖼️ 専用のジャンプ画像がある場合
                // 6フレームごとに画像を切り替えてアニメーションさせます
                const jumpIdx = Math.floor((en.jumpFrame || 0) / 6) % jumps.length;
                img = jumps[jumpIdx];

                // 📏 スマートなサイズ調整：
                // 元の画像サイズに 0.2 を掛けて、適切な大きさに縮小します
                // これにより、画像が横に潰れたり縦に伸びたりするのを防げます
                drawW = img.width * 0.2;
                drawH = img.height * 0.2;

            } else {
                // 2. 🛟 専用のジャンプ画像がない場合（バックアップ）
                // 「歩き（Walk）」画像の最初の1枚、それもなければ「基本ポーズ」を使います
                const walks = sprites[en.type + "Walk"];
                img = (walks && walks.length > 0) ? walks[0] : sprites[en.type];

                // 画像が見つかれば、同様に 0.2 倍のサイズで表示します
                if (img) {
                    drawW = img.width * 0.2;
                    drawH = img.height * 0.2;
                }
            }
        }
        // 😡 敵が「怒り状態（en.isEnraged）」のときの画像表示
        else if (en.isEnraged) {
            // 1. 📏 プレイヤー（hero）との距離を計算
            // heroが存在すれば距離を測り、いなければ「遠くにいる（999）」とみなします
            const dx = hero ? Math.abs(en.x - hero.x) : 999;
            const dy = hero ? Math.abs(en.y - hero.y) : 999;

            // 2. ⚔️ 接近中の「攻撃アニメーション」判定
            // 横に150、縦に100ピクセル以内にプレイヤーがいたら「攻撃ポーズ」をとります
            if (dx < 150 && dy < 100) {
                const atk = sprites[en.type + "Attack"];
                // 攻撃なので「/ 3」という速いスピードでアニメーションさせます
                img = (atk && atk.length > 0)
                    ? atk[Math.floor(frame / 3) % atk.length]
                    : sprites[en.type];
            }
            // 3. 🚶 遠くにいる時の「移動・待機」判定
            else {
                // 敵が立ち止まっている時間（waitTimer）があるかどうかでポーズを変えます
                const isWaiting = en.waitTimer > 0;
                const sKey = isWaiting ? en.type + "Idle" : en.type + "Walk";
                const anims = sprites[sKey];

                // 移動や待機は「/ 8」というゆったりしたスピードでアニメーションさせます
                img = (anims && anims.length > 0)
                    ? anims[Math.floor(frame / 8) % anims.length]
                    : sprites[en.type];
            }

            // 4. 📏 サイズの決定
            // 決定した画像を、元のサイズの 0.2倍にして表示します
            if (img) {
                drawW = img.width * 0.2;
                drawH = img.height * 0.2;
            }
        }
        // ⚔️ 敵が攻撃動作中（en.isAttacking > 0）の画像表示
        else if (en.isAttacking > 0) {
            // 📂 敵の種類に基づいた攻撃画像リストを取得
            const atk = sprites[en.type + "Attack"];

            if (atk && atk.length > 0) {
                // 1. ⏱️ アニメーションの進み具合を計算
                // 攻撃の全体時間を「22」と想定しています
                // 22から残り時間を引くことで、「開始から何フレーム経ったか」を出します
                const currentFrame = 22 - en.isAttacking;

                // 2. 🖼️ 表示する画像の番号を決定
                // 枚数を超えないように Math.min でしっかりガードしています
                const atkIdx = Math.max(0, Math.min(currentFrame, atk.length - 1));
                img = atk[atkIdx];
            }

            // 3. 📏 サイズの決定
            // 画像があれば、一貫して 0.2倍のサイズに調整します
            if (img) {
                drawW = img.width * 0.2;
                drawH = img.height * 0.2;
            }
        }
        // 🍃 敵の通常状態（特別なアクションをしていない時）の描画
        else {
            // 1. 💢 ダメージ中の表示
            if (isDamaged) {
                img = sprites[en.type + "Damage"]; // ダメージ用画像を取得

                // 🌟 特定の敵（monster3）だけはサイズを固定
                if (en.type === 'monster3') {
                    drawW = 258;
                    drawH = 172;
                } else if (img) {
                    // それ以外の敵は画像本来の0.2倍サイズ
                    drawW = img.width * 0.2;
                    drawH = img.height * 0.2;
                }
            }
            // 2. ⏳ 待機中（立ち止まっている時）の表示
            else if (en.waitTimer > 0) {
                const idles = sprites[en.type + "Idle"]; // 待機用のアニメーションリスト

                if (idles && idles.length > 0) {
                    // 🌟 monster1 以外は 12フレームごとに 3枚目までの画像でループ
                    // monster1 の場合は常に 0番目（最初の1枚）で固定
                    const animIdx = (en.type !== 'monster1')
                        ? (Math.floor(frame / 12) % Math.min(idles.length, 3))
                        : 0;
                    img = idles[animIdx];
                } else {
                    img = sprites[en.type]; // 待機画像がなければ基本ポーズ
                }

                if (img) {
                    drawW = img.width * 0.2;
                    drawH = img.height * 0.2;
                }
            }
            // 3. 🚶 移動中（歩いている時）の表示
            else {
                const walks = sprites[en.type + "Walk"];

                // 「/ 2」という非常に速いスピードでアニメーションさせます
                img = (walks && walks.length > 0)
                    ? walks[Math.floor(frame / 2) % walks.length]
                    : sprites[en.type];

                if (img) {
                    drawW = img.width * 0.2;
                    drawH = img.height * 0.2;
                }
            }
        }

        // --- 2. 描画位置の計算 (足元固定ロジック) ---

        // 🖼️ 画像が正しく読み込まれているかチェック
        if (img && img.complete && img.naturalWidth !== 0) {

            // 1. 📏 最終的な表示サイズの決定
            const s = en.scale || 1.0;
            const finalW = drawW * s; // 横幅（スケール倍率を反映）
            const finalH = drawH * s; // 高さ（スケール倍率を反映）

            // 2. 📍 横方向の中心位置
            // 当たり判定の真ん中を基準にします
            const baseX = en.x + en.w / 2;

            // 3. 🦶 足元の高さ調整（浮き沈み防止）
            // 敵の種類や地面にいるかどうかで、靴のソールの厚さを変えるような調整です
            let enemyFootOffset = 0;
            if (en.y > 500) { // 地面付近にいる場合
                if (en.type === 'monster3') enemyFootOffset = -60; // 大きい敵用の補正
                else if (en.type === 'monster5') enemyFootOffset = -65;
                else enemyFootOffset = -7; // 一般的な敵用の補正
            }

            // 4. 🌍 基準となる「地面の高さ」の計算
            // 地面にいる時は565pxのラインで固定し、空中の時は当たり判定の下側に合わせます
            const baseY = (en.type === 'monster3' || en.y > 500)
                ? 565
                : (en.y + en.h + enemyFootOffset);

            // ジャンプ中の上下移動（jumpY）を最後に加えます
            const finalY = baseY + (en.jumpY || 0);

            // 5. ↔️ 反転と描画
            ctx.translate(baseX, finalY); // 計算した基準点（足元の中央）へキャンバスを移動
            if (en.dir === 1) ctx.scale(-1, 1); // 向きが1なら左右反転

            // 🌟 【最重要ポイント】
            // 描画位置を「-finalH（マイナス高さ）」に設定することで、
            // 画像の「下端」がちょうど finalY（足元）に重なります。
            // これにより、キャラがどれだけ大きくても「地面にめり込まず」上に伸びるように描画されます。
            ctx.drawImage(img, -finalW / 2, -finalH, finalW, finalH);
        }

        ctx.restore(); // ctx.save() で保存した状態に戻す

        // --- 3. デバッグ枠（赤枠） ---
        // キャラクターの「本当の当たり判定」を画面に表示します
        // ジャンプ中もズレないように、位置（en.y）にジャンプ量（en.jumpY）を足しています
        const debugVisualY = en.y + (en.jumpY || 0);
        ctx.strokeStyle = "red";
        ctx.lineWidth = 1;
        // 当たり判定の四角を描画（開発中の確認用）
        ctx.strokeRect(en.x, debugVisualY, en.w, en.h);

        // --- 4. HPバー描画 ---
        // 敵が消滅中（isFading）でなければ、HPゲージを表示します
        if (!en.isFading) {
            // 📂 1. 最大HPの設定（敵の種類ごとに決める）
            let maxHp = (en.type === 'monster3') ? 2000 : (en.type === 'monster2' ? 500 : 200);

            // HPが少しでも減っている場合のみバーを表示
            if (en.hp < maxHp) {
                // ✨ 2. 「追いかけるHP」のアニメーション処理
                // displayHp は、減ったHPをゆっくり追いかけてくる白いバーのための変数です
                if (en.displayHp === undefined) en.displayHp = en.hp;

                // もし実際のHPより displayHp が多ければ、少しずつ（毎フレーム 2ずつ）減らします
                en.displayHp = (en.displayHp > en.hp) ? Math.max(en.hp, en.displayHp - 2) : en.hp;

                // 📏 3. 割合と位置の計算
                const hpRatio = Math.max(0, en.hp / maxHp);             // 実際のHP割合
                const displayRatio = Math.max(0, en.displayHp / maxHp); // 追いかけるバーの割合

                const barW = en.w, barH = 6, barX = en.x;
                const barY = debugVisualY - 12; // 頭のすぐ上に表示

                // 🎨 4. バーの重ね描き
                // (1) 背景（黒い枠）
                ctx.fillStyle = "rgba(15, 23, 42, 0.8)";
                ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);

                // (2) 土台（暗い色）
                ctx.fillStyle = "#1e293b";
                ctx.fillRect(barX, barY, barW, barH);

                // (3) ダメージ演出（追いかけてくる白いバー）
                if (displayRatio > hpRatio) {
                    ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
                    ctx.fillRect(barX, barY, barW * displayRatio, barH);
                }

                // (4) メインのHPバー（残量に応じて色を変える）
                // 50%超で緑、20%超で黄、20%以下で赤と黄の点滅（ピンチの演出！）
                let c1 = (hpRatio > 0.5) ? "#22c55e" :
                    (hpRatio > 0.2 ? "#facc15" :
                        (Math.floor(frame / 10) % 2 === 0 ? "#ef4444" : "#facc15"));

                ctx.fillStyle = c1;
                ctx.fillRect(barX, barY, barW * hpRatio, barH);
            }
        }
    });
}

// ==========================================
// 💥 6. テキスト・エフェクト関連
// ==========================================
function drawDamageTexts(damageTexts) {
    damageTexts.forEach(t => {
        ctx.save(); ctx.globalAlpha = t.timer / 40; ctx.textAlign = "center";
        ctx.fillStyle = t.type === 'player_hit' ? "#ff4444" : (t.isCritical ? "#fbbf24" : "white");
        ctx.font = "bold 20px sans-serif"; ctx.fillText(t.val, t.x, t.y); ctx.restore();
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
        const maxTime = 25;
        const t = Math.pow((maxTime - eff.timer) / maxTime, 2);

        ctx.save();
        
        // 🌟 修正1：座標リセット時にも DPR を考慮する
        // これまで：ctx.setTransform(1, 0, 0, 1, 0, 0);
        const dpr = window.devicePixelRatio || 1;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0); 

        let target = (eff.targetPlayerId === socket.id) ? hero : others[eff.targetPlayerId];
        if (!target) target = hero;

        // 軌道の計算
        const tx = target.x + 20;
        const ty = target.y;
        const midY = Math.min(target.y + 5, ty) - 50;
        const dx = (1 - t) * (1 - t) * eff.startX + 2 * (1 - t) * t * ((eff.startX + tx) / 2) + t * t * tx;
        const dy = (1 - t) * (1 - t) * (target.y + 5) + 2 * (1 - t) * t * midY + t * t * ty;

        ctx.globalAlpha = Math.max(0, 1 - t);
        ctx.translate(dx, dy);

        // 🌟 修正2：アイテム画像の描画品質を保つ
        ctx.imageSmoothingEnabled = true;

        const config = ITEM_CONFIG[eff.type] || ITEM_CONFIG["money1"];
        const img = config.isAnimated ? sprites.items[eff.type][0] : sprites.items[eff.type];

        if (img && img.complete) {
            // ここも比率を維持して描画すると綺麗です
            const nw = img.naturalWidth;
            const nh = img.naturalHeight;
            const targetHeight = 30; // エフェクト用サイズ
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
        const x = 800 - 20; 
        const y = 600 - 70 - ((itemLogs.length - 1 - i) * 25); 

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

function drawUI(hero) {
    // --- 基準となるバーの位置とサイズ ---
    const uiX = 20;
    const uiY = 40;
    const barW = 160;
    const barH = 16;

    // 1. 準備：遅れて減るHP（残像）の計算
    // 実際のHP(hero.hp)を hero.displayHp がゆっくり追いかけます
    if (hero.displayHp === undefined) hero.displayHp = hero.hp;

    if (hero.displayHp > hero.hp) {
        hero.displayHp -= 0.5; // 減少スピード（お好みで調整）
        if (hero.displayHp < hero.hp) hero.displayHp = hero.hp;
    } else if (hero.displayHp < hero.hp) {
        hero.displayHp = hero.hp; // 回復時はパッと合わせる
    }

    const maxHp = hero.maxHp || 100;
    const hpRatio = Math.max(0, hero.hp / maxHp);
    const displayRatio = Math.max(0, hero.displayHp / maxHp);

    // 2. 背景のパネル（半透明のダークネイビー）
    ctx.fillStyle = "rgba(15, 23, 42, 0.8)";
    ctx.beginPath();
    ctx.roundRect(uiX - 10, uiY - 25, barW + 20, 55, 10);
    ctx.fill();

    // 3. "PLAYER HP" の文字
    ctx.textAlign = "left";
    ctx.fillStyle = "#cbd5e1"; // シルバーに近い白
    ctx.font = "bold 12px sans-serif";
    ctx.fillText("PLAYER HP", uiX, uiY - 8);

    // 4. HPバーの土台（空の背景色）
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(uiX, uiY, barW, barH);

    // 5. 🌟 リッチ演出：ダメージの残像（白いバー）
    // 実際のHPより表示用HPが高い間だけ描画
    if (displayRatio > hpRatio) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
        ctx.fillRect(uiX, uiY, barW * displayRatio, barH);
    }

    // 6. 🌟 リッチ演出：メインのHPバー（グラデーションと色判定）
    let color1, color2;
    if (hpRatio > 0.5) {
        color1 = "#22c55e"; color2 = "#15803d"; // 緑（高HP）
    } else if (hpRatio > 0.2) {
        color1 = "#facc15"; color2 = "#a16207"; // 黄色（中HP）
    } else {
        color1 = "#ef4444"; color2 = "#991b1b"; // 赤（低HP）
    }

    // 上下方向のグラデーションを作成
    const grad = ctx.createLinearGradient(uiX, uiY, uiX, uiY + barH);
    grad.addColorStop(0, color1); // バーの上部
    grad.addColorStop(1, color2); // バーの下部（少し暗い）
    ctx.fillStyle = grad;
    ctx.fillRect(uiX, uiY, barW * hpRatio, barH);

    // 7. 外枠（グロス感のある薄いハイライト）
    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    ctx.lineWidth = 1;
    ctx.strokeRect(uiX, uiY, barW, barH);

    // 8. 数値のテキスト (100 / 100)
    ctx.fillStyle = "white";
    ctx.font = "bold 10px sans-serif";
    ctx.textAlign = "center";
    ctx.shadowColor = "black";
    ctx.shadowBlur = 2; // 文字の視認性を高める
    ctx.fillText(`${Math.ceil(hero.hp)} / ${maxHp}`, uiX + (barW / 2), uiY + 12);
    ctx.shadowBlur = 0; // 他の描画に影響しないようリセット

    // --- 9. カバンUI（画面右下） ---
    const inv = hero.inventory || [];
    const counts = {
        gold: inv.filter(t => t === 'gold').length,
        m1: inv.filter(t => t === 'money1').length,
        m3: inv.filter(t => t === 'money3').length
    };

    ctx.fillStyle = "rgba(15, 23, 42, 0.6)";
    ctx.beginPath();
    ctx.roundRect(550, 555, 240, 35, 8);
    ctx.fill();

    ctx.textAlign = "right";
    ctx.font = "bold 14px sans-serif";
    ctx.fillStyle = "white";
    ctx.fillText(`Bag: 🏆x${counts.gold} 💵x${counts.m1} 💰x${counts.m3}`, 780, 578);
}

// --- チャットの吹き出しを表示する仕組み ---
function drawChatBubble(p, text) {
    ctx.save();
    ctx.font = "14px sans-serif";
    const textWidth = ctx.measureText(text).width;
    const bw = textWidth + 20;
    const bh = 25;
    const bx = p.x + 20 - bw / 2; // p.w の代わりに 20(キャラの横中央) を使用

    // 🌟 頭の上にしっかり乗るように調整
    // 以前の -45 から -65 くらいにすると、頭上にきれいに配置されます
    const by = p.y - 85;

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
    items.forEach(item => {
        ctx.save();

        // 1. 浮遊アニメーションの計算（元の計算を維持）
        const offset = item.id || (item.x + item.y);
        const floatY = item.landed ? -Math.abs(Math.sin(frame * 0.05 + offset) * 12) : 0;

        // 2. 地面への着地高さの調整
        const itemY = (item.y > 500) ? (545 - 10) : item.y;

        // 🌟 中央揃えの基準点へ移動
        ctx.translate(item.x + 16, itemY + 16 + floatY);

        // 3. JSONデータから設定を読み込む
        const config = ITEM_CONFIG[item.type] || ITEM_CONFIG["money1"]; 
        
        let img = null;
        // 🛡️ 画像の読み込み状況を確認
        // loadItemImages() の return を消していれば、ここから画像が取得されます
        if (typeof sprites !== 'undefined' && sprites.items && sprites.items[config.spriteKey]) {
            if (config.isAnimated) {
                // アニメーションのコマ数を計算（10枚設定を維持）
                const animIdx = Math.floor((frame + (offset * 10)) / 10) % 10;
                img = sprites.items[config.spriteKey][animIdx];
            } else {
                img = sprites.items[config.spriteKey];
            }
        }

        // 4. 🌟 描画処理（画像優先、なければ四角）
        if (img && (img.complete || img.naturalWidth > 0)) {
            // ✅ 【画像がある場合】アップロードした素材を描画します
            const nw = img.naturalWidth;
            const nh = img.naturalHeight;
            const targetHeight = 32;
            const targetWidth = targetHeight * (nw / nh);

            ctx.imageSmoothingEnabled = true;
            ctx.drawImage(img, -targetWidth / 2, -targetHeight / 2, targetWidth, targetHeight);
            ctx.imageSmoothingEnabled = false;
        } else {
            // ⚠️ 【画像がない/読込中の場合】エラーにならないよう、保険として四角を描画
            ctx.fillStyle = "#fbbf24"; 
            ctx.beginPath();
            ctx.rect(-8, -8, 16, 16); 
            ctx.fill();
            
            ctx.strokeStyle = "white";
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        ctx.restore();
    });
}

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
socket.on('state', (data) => {
    if (!data) return;

    // --- A. 基本データの準備 ---
    const currentItems = data.items || [];
    const currentEnemies = data.enemies || []; // 敵データも取得
    const myHero = data.players[socket.id];

    // ==========================================
    // 🎁 1. アイテム取得時の特殊演出（エフェクト・ログ・音）
    // ==========================================
    if (data.lastPickedItems && data.lastPickedItems.length > 0) {
        data.lastPickedItems.forEach(picked => {
            
            // ① 吸い込みエフェクトの追加
            pickingUpEffects.push({
                type: picked.type,
                timer: 25,
                startX: picked.x,
                startY: (picked.y > 500) ? 545 : picked.y,
                targetPlayerId: picked.pickerId // 拾った人の位置へ飛んでいく
            });

            // ② アイテム取得ログの表示（自分が拾った時だけ）
if (picked.pickerId === socket.id) {
    // 🌟 ITEM_CONFIG から名前を取得（見つからない場合は 'アイテム' とする）
    const config = ITEM_CONFIG[picked.type] || { name: 'アイテム' };
    const itemName = config.name;
    
    itemLogs.push({
        text: `Bag: ${itemName} を手に入れました`,
        timer: 600 // 表示時間
    });
    
    // 🌟 ログが溜まりすぎないように調整（最新5件まで）
    if (itemLogs.length > 5) {
        itemLogs.shift();
    }
}

            // ③ 🔔 アイテム取得音（最重要：絶対保持）
            if (typeof playItemSound === 'function') {
                playItemSound();
            }
        });
    }

    // --- B. 次回の判定用にデータをバックアップ ---
    lastItemCount = currentItems.length;
    lastItemsData = JSON.parse(JSON.stringify(currentItems));

    // 自分自身のデータがない場合はここで終了
    if (!myHero) return; 

    // --- C. 他人のリストを作成（自分を除外） ---
    const others = {};
    for (let id in data.players) {
        if (id !== socket.id) {
            others[id] = data.players[id];
        }
    }

    // ==========================================
    // 🎨 2. ゲーム画面の描画実行
    // ==========================================
    if (typeof drawGame === 'function') {
        drawGame(
            myHero,            // 自分のデータ
            others,            // 他人のデータ
            currentEnemies,     // 敵のデータ
            currentItems,       // アイテムのデータ
            data.platforms || [], // 足場のデータ
            data.ladders || [],   // ハシゴのデータ
            damageTexts || [],    // ダメージテキスト（あれば）
            Math.floor(Date.now() / 16) // 現在のフレーム相当
        ); 
    }
});

// 🌟 キャラクター切り替え (Q/E)
window.addEventListener('keydown', (e) => {
    // ✅ 追加：もし入力欄（チャット等）を触っていたら、ここで処理を中断する
    if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;

    let changed = false;
    if (e.key === 'q' || e.key === 'Q') {
        selectedCharVar = selectedCharVar <= 1 ? 15 : selectedCharVar - 1;
        changed = true;
    }
    if (e.key === 'e' || e.key === 'E') {
        selectedCharVar = selectedCharVar >= 15 ? 1 : selectedCharVar + 1;
        changed = true;
    }
    if (changed) {
        socket.emit('change_char', { charVar: selectedCharVar });
    }
});

// 🌟 グループ切り替え (R/T)
window.addEventListener('keydown', (e) => {
    // ✅ 追加：入力欄を触っていたら無視
    if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;

    let groupChanged = false;
    if (e.key === 'r' || e.key === 'R') {
        selectedGroup = selectedGroup <= 0 ? 15 : selectedGroup - 1;
        groupChanged = true;
    }
    if (e.key === 't' || e.key === 'T') {
        selectedGroup = selectedGroup >= 15 ? 0 : selectedGroup + 1;
        groupChanged = true;
    }
    if (groupChanged) {
        socket.emit('change_group', { group: selectedGroup });
    }
});