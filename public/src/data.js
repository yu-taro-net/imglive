// ==========================================
// ⚙️ 共通設定（サーバー・クライアント共通）
// ==========================================
const GLOBAL_SETTINGS = {
    SYSTEM: {
        GROUND_Y: 540,  // 地面の高さ（ここを直せば全部直るようにする）
        WIDTH: 800,
        HEIGHT: 600
    }
};

// ==========================================
// 📋 1. モンスターの設定名簿（ここだけ管理すればOK！）
// ==========================================
const MONSTER_CONFIGS = [
    { 
        name: 'tier1_1', id: 'Char10', // Char10
        fileName: 'skeleton',
        idle: 18, attack: 18, jump: 0, walk: 18, hp: 20, def: 2,
        exp: 15  // 🌟 基準(10)より少し多めにするなど自由自在！
    },
    { 
        name: 'tier1_2', id: 'Char13', // Char13
        fileName: 'skeleton',
        idle: 18, attack: 18, jump: 0, walk: 18, hp: 50, def: 5,
        exp: 40  // 🌟 ちょっと強い敵は多めに
    },
    { 
        name: 'tier1_3', id: 'Char19', // Char19
        fileName: 'skeleton',
        idle: 18, attack: 22, jump: 0, walk: 18, hp: 200, def: 15,
        exp: 150 // 🌟 ボス級はどっさり！
    },
    { 
        name: 'monster1', 
        death: 3, idle: 1, 
        attack: 0, jump: 0, walk: 0,
        hp: 20,  // 🌟 ついでにHPもここで管理すると緻密になります
        def: 2   // 🌟 ここに防御力を追加！
    },
    { 
        name: 'monster2', 
        death: 4, idle: 3, 
        attack: 0, jump: 0, walk: 0,
        hp: 50,
        def: 5   // 🌟 monster2は少し硬め
    },
    { 
        name: 'monster3', 
        death: 7, idle: 3, 
        attack: 0, jump: 0, walk: 0,
        hp: 200,
        def: 15  // 🌟 monster3（ボス級）はかなり硬い
    },
    { 
        name: 'monster4', 
        death: 3, idle: 1, 
        attack: 0, jump: 0, walk: 0, 
        useImage: 'monster1' // 4番は1番の絵を流用
    },
	{ 
        name: 'monster5', 
        id: 'Char01', fileName: 'skeleton', // 🌟 新しいパス形式に対応
        death: 18, idle: 18, attack: 22, jump: 14, walk: 18 
    },
	{ 
        name: 'monster6', 
        id: 'Char02', fileName: 'skeleton', // 🌟 新しいパス形式に対応
        death: 18, idle: 18, attack: 22, jump: 14, walk: 18 
    },
	{ 
        name: 'monster7', 
        id: 'Char03', fileName: 'skeleton', // 🌟 新しいパス形式に対応
        death: 18, idle: 18, attack: 22, jump: 14, walk: 18 
    },
	{ 
        name: 'monster8', 
        id: 'Char04', fileName: 'skeleton', // 🌟 新しいパス形式に対応
        death: 18, idle: 18, attack: 22, jump: 14, walk: 18 
    },
	{ 
        name: 'monster9', 
        id: 'Char05', fileName: 'skeleton', // 🌟 新しいパス形式に対応
        death: 18, idle: 18, attack: 22, jump: 14, walk: 18 
    },
	{ 
        name: 'monster10', 
        id: 'Char06', fileName: 'skeleton', // 🌟 新しいパス形式に対応
        death: 18, idle: 18, attack: 22, jump: 14, walk: 18 
    },
	{ 
        name: 'monster11', 
        id: 'Char07', fileName: 'skeleton', // 🌟 新しいパス形式に対応
        death: 18, idle: 18, attack: 22, jump: 14, walk: 18 
    },
	{ 
        name: 'monster12', 
        id: 'Char08', fileName: 'skeleton', // 🌟 新しいパス形式に対応
        death: 18, idle: 18, attack: 22, jump: 14, walk: 18 
    },
	{ 
        name: 'monster13', 
        id: 'Char09', fileName: 'skeleton', // 🌟 新しいパス形式に対応
        death: 18, idle: 18, attack: 22, jump: 14, walk: 18 
    },
	{ 
        name: 'monster14', 
        id: 'Char10', fileName: 'skeleton', // 🌟 新しいパス形式に対応
        death: 18, idle: 18, attack: 22, jump: 14, walk: 18 
    },
	{ 
        name: 'monster15', 
        id: 'Char11', fileName: 'skeleton', // 🌟 新しいパス形式に対応
        death: 18, idle: 18, attack: 22, jump: 14, walk: 18 
    },
	{ 
        name: 'monster16', 
        id: 'Char12', fileName: 'skeleton', // 🌟 新しいパス形式に対応
        death: 18, idle: 18, attack: 22, jump: 14, walk: 18 
    },
	{ 
        name: 'monster17', 
        id: 'Char13', fileName: 'skeleton', // 🌟 新しいパス形式に対応
        death: 18, idle: 18, attack: 22, jump: 14, walk: 18 
    },
	{ 
        name: 'monster18', 
        id: 'Char14', fileName: 'skeleton', // 🌟 新しいパス形式に対応
        death: 18, idle: 18, attack: 22, jump: 14, walk: 18 
    },
	{ 
        name: 'monster19', 
        id: 'Char15', fileName: 'skeleton', // 🌟 新しいパス形式に対応
        death: 18, idle: 18, attack: 22, jump: 14, walk: 18 
    },
	{ 
        name: 'monster20', 
        id: 'Char16', fileName: 'skeleton', // 🌟 新しいパス形式に対応
        death: 18, idle: 18, attack: 22, jump: 14, walk: 18 
    },
	{ 
        name: 'monster21', 
        id: 'Char17', fileName: 'skeleton', // 🌟 新しいパス形式に対応
        death: 18, idle: 18, attack: 22, jump: 14, walk: 18 
    },
	{ 
        name: 'monster22', 
        id: 'Char18', fileName: 'skeleton', // 🌟 新しいパス形式に対応
        death: 18, idle: 18, attack: 22, jump: 14, walk: 18 
    },
	{ 
        name: 'monster23', 
        id: 'Char19', fileName: 'skeleton', // 🌟 新しいパス形式に対応
        death: 18, idle: 18, attack: 22, jump: 14, walk: 18 
    },
	{ 
        name: 'monster24', 
        id: 'Char20', fileName: 'skeleton', // 🌟 新しいパス形式に対応
        death: 18, idle: 18, attack: 22, jump: 14, walk: 18 
    },
	{ 
        name: 'monster25', 
        id: 'Char21', fileName: 'skeleton', // 🌟 新しいパス形式に対応
        death: 18, idle: 18, attack: 22, jump: 14, walk: 18 
    },
	{ 
        name: 'monster26', 
        id: 'Char22', fileName: 'skeleton', // 🌟 新しいパス形式に対応
        death: 18, idle: 18, attack: 22, jump: 14, walk: 18 
    },
	{ 
        name: 'monster27', 
        id: 'Char23', fileName: 'skeleton', // 🌟 新しいパス形式に対応
        death: 18, idle: 18, attack: 22, jump: 14, walk: 18 
    },
	{ 
        name: 'monster28', 
        id: 'Char24', fileName: 'skeleton', // 🌟 新しいパス形式に対応
        death: 18, idle: 18, attack: 22, jump: 14, walk: 18 
    },
	{ 
        name: 'monster29', 
        id: 'Char25', fileName: 'skeleton', // 🌟 新しいパス形式に対応
        death: 18, idle: 18, attack: 22, jump: 14, walk: 18 
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
        //"src": "/item_assets/money3_", // 数値と.pngは自動補完
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
        //"src": "/item_assets/money1_",
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