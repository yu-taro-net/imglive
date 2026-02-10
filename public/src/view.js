// ==========================================
// 🎨 1. キャンバスの設定と描画品質
// ==========================================
const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d');
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
    'monster5': -65
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
    const allowedIds = ["Char01", "Char02", "Char03", "Char16"];

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

        // ② アイテム取得ログ（自分が拾った時だけ）
        if (picked.pickerId === socket.id) {
            const config = ITEM_CONFIG[picked.type] || { name: 'アイテム' };
            itemLogs.push({
                text: `Bag: ${config.name} を手に入れました`,
                timer: VIEW_CONFIG.log.displayTime
            });
            
            if (itemLogs.length > VIEW_CONFIG.log.maxCount) {
                itemLogs.shift();
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
    // アイテム（地面に落ちているもの）
    drawItems(items, frame);

    // 他のプレイヤー
    for (let id in others) {
        if (others[id]) drawPlayerObj(others[id], false, id);
    }

    // 自分自身（他人の上に重なるように後に描画）
    drawPlayerObj(hero, true);

    // 敵（モンスター）
    drawEnemies(enemies, hero, frame);
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
 * 📊 画面に固定される情報（HPバーやログ）
 */
function drawUIOverlay(hero) {
    drawItemLogsUI(); // 画面右下の取得ログ
    drawUI(hero);     // 左上のステータスバー
    
    // 🌟 ここに追加！
    if (hero && hero.inventory) {
        drawInventoryGrid(ctx, hero.inventory);
    }
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
    drawBagUI(hero);

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

    // 1. スコアとレベル
    ctx.textAlign = "left";
    ctx.fillStyle = "white";
    ctx.font = "bold 16px sans-serif";
    ctx.fillText(`Score: ${hero.score || 0}`, expBarX, expBarY - 25);
    ctx.fillText(`Lv. ${hero.level || 1}`, expBarX, expBarY - 5);

    // 2. 経験値バーの土台
    ctx.fillStyle = "black";
    ctx.fillRect(expBarX, expBarY, expBarW, expBarH);

    // 3. 経験値の計算（なめらかに動く displayExp を使う）
    const currentExp = displayExp || 0; // 🌟 ここを hero.exp から displayExp に変更
    const maxExp = hero.maxExp || 100;
    const expRate = Math.min(1, currentExp / maxExp);

    // 4. 経験値の中身
    ctx.fillStyle = VIEW_CONFIG.ui.expBarColor;  
    ctx.fillRect(expBarX + 1, expBarY + 1, (expBarW - 2) * expRate, expBarH - 2);
    
    // --- デバッグとRaw表示 ---
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
    items.forEach(item => {
        ctx.save();

        // 1. 浮遊アニメーションの計算（VIEW_CONFIGを使用）
        const offset = item.id || (item.x + item.y);
        // 0.05 -> floatSpeed, 12 -> floatAmplitude
        const floatY = item.landed ? -Math.abs(Math.sin(frame * VIEW_CONFIG.item.floatSpeed + offset) * VIEW_CONFIG.item.floatAmplitude) : 0;

        // 2. 地面への着地高さの調整
        // 500 -> groundThreshold, 20 -> groundOffset
        const itemY = (item.y > VIEW_CONFIG.groundThreshold) ? (VIEW_CONFIG.groundY - VIEW_CONFIG.item.groundOffset) : item.y;

        // 🌟 中央揃えの基準点へ移動 (32 / 2 = 16 なので、drawSize / 2 を使用)
        const halfSize = VIEW_CONFIG.item.drawSize / 2;
        ctx.translate(item.x + halfSize, itemY + halfSize + floatY);

        // 3. JSONデータから設定を読み込む
        const config = ITEM_CONFIG[item.type] || ITEM_CONFIG["money1"]; 
        
        let img = null;
        if (typeof sprites !== 'undefined' && sprites.items && sprites.items[config.spriteKey]) {
            if (config.isAnimated) {
                const animIdx = Math.floor((frame + (offset * 10)) / 10) % 10;
                img = sprites.items[config.spriteKey][animIdx];
            } else {
                img = sprites.items[config.spriteKey];
            }
        }

        // 4. 🌟 描画処理
        if (img && (img.complete || img.naturalWidth > 0)) {
            const nw = img.naturalWidth;
            const nh = img.naturalHeight;
            const targetHeight = VIEW_CONFIG.item.drawSize; // 32
            const targetWidth = targetHeight * (nw / nh);

            ctx.imageSmoothingEnabled = true;
            ctx.drawImage(img, -targetWidth / 2, -targetHeight / 2, targetWidth, targetHeight);
            ctx.imageSmoothingEnabled = false;
        } else {
            // 保険の四角形描画 (サイズ 16 は drawSize 32 の半分として計算)
            const fallbackSize = VIEW_CONFIG.item.drawSize / 2;
            ctx.fillStyle = "#fbbf24"; 
            ctx.beginPath();
            ctx.rect(-fallbackSize / 2, -fallbackSize / 2, fallbackSize, fallbackSize); 
            ctx.fill();
            
            ctx.strokeStyle = "white";
            ctx.lineWidth = 1;
            ctx.stroke();
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

    // 🌟 【一瞬の隣表示を防止】
    // すでに描画したアイテムの名前を記録して、2回目は描かないようにします
    const alreadyDrawn = new Set();

    for (let i = 0; i < 10; i++) {
        const x = startX + (slotSize + padding) * i;
        const y = startY;

        // 1. 枠の描画
        ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
        ctx.lineWidth = 2;
        ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
        ctx.fillRect(x, y, slotSize, slotSize);
        ctx.strokeRect(x, y, slotSize, slotSize);

        const itemData = inventory[i];
        if (itemData) {
            let type = typeof itemData === 'object' ? itemData.type : String(itemData);
            let count = itemData.count || 1;

            // 🌟 【ここが核心】
            // もし「gold」がすでに前のスロットで描画されていたら、
            // このスロット（新しい方）では無視して描きません。
            if (type === 'gold' && alreadyDrawn.has(type)) {
                continue; 
            }
            alreadyDrawn.add(type);

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

                if (displayImg && displayImg.complete && displayImg.width > 0) {
                    const m = 5;
                    ctx.drawImage(displayImg, x + m, y + m, slotSize - m * 2, slotSize - m * 2);
                    
                    if (count > 1) {
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
            }
        }
    }
}

// view.js の一番下などに追加
canvas.addEventListener('mousedown', (event) => {
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
        }
    }
});

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
let inventoryVisualBuffer = null;

socket.on('state', (data) => {
    if (!data) return;
    
    handleServerEvents(data);

    const currentItems = data.items || [];
    const currentEnemies = data.enemies || [];
    const myHero = data.players[socket.id];

    if (!myHero) return; 

    // 🌟 【残像ガード：修正版】
    // Goldだけでなく、Shield（配列スロット）の残像も消すための強化判定
    const isInventoryEmpty = !myHero.inventory || 
                             myHero.inventory.length === 0 || 
                             myHero.inventory.every(slot => !slot || slot.count <= 0);

    if (isInventoryEmpty) {
        // 🌟 ここで記憶を完全にリセット！
        // これでShieldを捨てた瞬間も、スロットがパッと空になります。
        inventoryVisualBuffer = []; 
        myHero.inventory = [];
    } 
    else if (myHero.inventory && myHero.inventory.length > 0) {
        inventoryVisualBuffer = JSON.parse(JSON.stringify(myHero.inventory));
    }

    // --- バックアップ処理 ---
    lastItemCount = currentItems.length;
    lastItemsData = JSON.parse(JSON.stringify(currentItems));

    const others = {};
    for (let id in data.players) {
        if (id !== socket.id) {
            others[id] = data.players[id];
        }
    }

    // 🎨 2. 描画実行
    if (typeof drawGame === 'function') {
        drawGame(
            myHero,            // 🌟 修正された最新のデータが渡されます
            others,
            currentEnemies,
            currentItems,
            data.platforms || [],
            data.ladders || [],
            damageTexts || [],
            Math.floor(Date.now() / 16)
        ); 
    }
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