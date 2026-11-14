// ============================================================
// :::SET_DOMAIN::: 🌐 画像・アセット参照用ドメイン基点設定
// ============================================================
const IMAGE_DOMAIN = (
    window.location.hostname === "localhost" || 
    window.location.protocol === "file:" ||
    window.location.hostname === "127.0.0.1"
) 
? ""                         // 💻 ローカル時は何も付け足さない（空文字）
: "https://imglive.net/";    // 🌐 本番時は、どのドメインから開いても常に imglive.net を参照する！

// ============================================================
// ⚙️ [SECTION 1: CONFIG] ゲーム設定・定数
// 役割: 歩行速度、重力、ジャンプ力、接続先URLなどの固定値
// ============================================================
// 例: GAME_SETTINGS, SOCKET_URL など
// ==========================================
// ⚙️ 1. ゲーム全体の共通設定
// ==========================================
const GAME_SETTINGS = {
    WALK_SPEED: 5,  // ← ここを 10 にすれば足が速くなる
    GRAVITY: 0.5,
    JUMP_POWER: -15, // ← ここを -20 にすれば高く跳べる
    ATTACK_RANGE: 100,
	LADDER_SPEED: 3  // 🌟 これを追加！
};

const GLOBAL_SETTINGS = {
    SYSTEM: {
        GROUND_Y: 540,  // 地面の高さ（ここを直せば全部直るようにする）
        WIDTH: 800,
        HEIGHT: 600
    }
};

// 🌟 露店データの復元中かどうかを表すフラグを定義する
window.isRestoringVending = false;

// 今開いているドメインが 'localhost' かどうかを判定
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// ============================================================
// :::KEY_CONFIG_DATA::: ⌨️ キーコンフィグのデータと初期キーマップの定義
// ============================================================
let currentKeyConfig = {
    // 💡 初期配置するアクション（キー名は常に大文字で統一すると安全です）
    pickup:    { label: '拾う',       key: 'pickup',    keyName: 'Z' },
    attack:    { label: '攻撃',       key: 'attack',    keyName: 'X' },
    jump:      { label: 'ジャンプ',   key: 'jump',      keyName: 'C' },
    
    status:        { label: 'ステータス',     key: 's', keyName: 'S' },
    equipment:     { label: '装備',           key: 'e', keyName: 'E' },
    inventory:     { label: 'インベントリ',     key: 'i', keyName: 'I' },
    skill:         { label: 'スキル',         key: 'k', keyName: 'K' },
    avatar:        { label: 'アバター',       key: 'a', keyName: 'A' },
    upgrade:       { label: 'アップグレード', key: 'u', keyName: 'U' },
    quest:         { label: 'クエスト',       key: 'q', keyName: 'Q' },
    worldmap:      { label: 'ワールドマップ', key: 'w', keyName: 'W' },
    minimap:       { label: 'ミニマップ',     key: 'm', keyName: 'M' },
    journal:       { label: '日記',           key: 'j', keyName: 'J' },
    book:          { label: 'ブック',         key: 'b', keyName: 'B' },
    guild:         { label: 'ギルド',         key: 'g', keyName: 'G' },
    friend:        { label: 'フレンドリスト', key: 'f', keyName: 'F' },
    party:         { label: 'パーティ',       key: 'p', keyName: 'P' },
    trade:         { label: 'トレード',       key: 't', keyName: 'T' },
    log:           { label: 'ログ',           key: 'l', keyName: 'L' },
    event:         { label: 'イベント',       key: 'n', keyName: null }, // 最初からプール
    options:       { label: 'オプション',     key: 'o', keyName: 'O' },
    help:          { label: 'ヘルプ',         key: 'h', keyName: 'H' }
};

// ============================================================
// :::SET_SOCKET_URL::: 📞 通信先サーバーURLの環境分岐設定
// ============================================================
const SOCKET_URL = isLocal 
    ? "http://localhost:3000" 
    : "https://satisfied-nourishment-production.up.railway.app";

// ============================================================
// :::INIT_SOCKET::: 📞 通信インスタンス初期化・接続設定
// ============================================================
const socket = io(SOCKET_URL, {
    reconnection: true,
    reconnectionAttempts: 5,
    timeout: 10000
});

console.log(`接続先: ${SOCKET_URL}`); // 確認用にコンソールに表示

// ============================================================
// 🌟 システムメッセージをチャット欄（#msg-box）に追加する完全版関数
// ============================================================
function addSystemMessage(text) {
    const msgBox = document.getElementById('msg-box');
    if (!msgBox) {
        console.warn("⚠️ [UI] メッセージボックス (#msg-box) が見つかりませんでした。テキスト:", text);
        return;
    }

    // 1. 1行分のコンテナを作成
    const messageDiv = document.createElement('div');
    messageDiv.className = 'system-message-row';
    messageDiv.style.cssText = `
        display: flex;
        align-items: baseline;
        gap: 6px;
        margin: 3px 0;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        font-size: 12px;
        line-height: 1.4;
        word-break: break-all;
    `;

    // 2. 現在時刻を取得（例: [14:35]）
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const timeStr = `[${hours}:${minutes}]`;

    // タイムスタンプ要素
    const timeSpan = document.createElement('span');
    timeSpan.innerText = timeStr;
    timeSpan.style.cssText = `
        color: #64748b;
        font-size: 11px;
        font-family: monospace;
        flex-shrink: 0;
    `;

    // 3. バッジ要素（システム通知であることを示す「[通知]」などのタグ）
    const badgeSpan = document.createElement('span');
    badgeSpan.innerText = '[System]';
    badgeSpan.style.cssText = `
        background: rgba(250, 204, 21, 0.15);
        color: #fde047;
        border: 1px solid rgba(250, 204, 21, 0.4);
        padding: 1px 4px;
        border-radius: 3px;
        font-size: 10px;
        font-weight: bold;
        flex-shrink: 0;
    `;

    // 4. メッセージ本文要素
    const textSpan = document.createElement('span');
    textSpan.innerText = text;
    textSpan.style.cssText = `
        color: #fef08a; /* ほんのりゴールドがかった見やすい明るい黄文字 */
        text-shadow: 0 0 4px rgba(250, 204, 21, 0.2);
    `;

    // 要素を組み立ててメッセージボックスに追加
    messageDiv.appendChild(timeSpan);
    messageDiv.appendChild(badgeSpan);
    messageDiv.appendChild(textSpan);

    msgBox.appendChild(messageDiv);

    // 5. 常に最新のメッセージが一番下に見えるように自動スクロール
    msgBox.scrollTop = msgBox.scrollHeight;

    // （おまけ）もしメッセージが溜まりすぎて重くならないよう、古いものを自動削除したい場合はここに記述可能
    // 例：100件を超えたら古いものを消すなど
    while (msgBox.children.length > 100) {
        msgBox.removeChild(msgBox.firstChild);
    }
}

// 🌟 画面中央にスタイリッシュなHTMLアラートを表示する関数
function showCustomAlert(message, isSuccess = true) {
    // すでに存在していれば使い回す、なければ新規作成
    let alertBox = document.getElementById('custom-game-alert');
    if (!alertBox) {
        alertBox = document.createElement('div');
        alertBox.id = 'custom-game-alert';
        // サイバー・MMO風のスタイリッシュなCSSを適用
        alertBox.style.cssText = `
            position: fixed;
            top: 20%;
            left: 50%;
            transform: translate(-50%, -50%) scale(0.9);
            background: rgba(15, 23, 42, 0.95);
            border: 2px solid ${isSuccess ? '#38bdf8' : '#f43f5e'};
            color: #ffffff;
            padding: 15px 30px;
            border-radius: 8px;
            font-family: 'Segoe UI', sans-serif;
            font-size: 14px;
            font-weight: bold;
            box-shadow: 0 0 25px ${isSuccess ? 'rgba(56, 189, 248, 0.5)' : 'rgba(244, 63, 94, 0.5)'};
            z-index: 99999;
            opacity: 0;
            transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
            pointer-events: none;
            text-align: center;
            letter-spacing: 1px;
        `;
        document.body.appendChild(alertBox);
    }

    // 枠の色やメッセージを設定
    alertBox.style.borderColor = isSuccess ? '#38bdf8' : '#f43f5e';
    alertBox.style.boxShadow = isSuccess ? '0 0 25px rgba(56, 189, 248, 0.5)' : '0 0 25px rgba(244, 63, 94, 0.5)';
    alertBox.innerText = message;

    // 表示アニメーション（フワッと浮き出る）
    requestAnimationFrame(() => {
        alertBox.style.opacity = '1';
        alertBox.style.transform = 'translate(-50%, -50%) scale(1)';
    });

    // 2.5秒後に自動でフワッと消す
    clearTimeout(alertBox.hideTimer);
    alertBox.hideTimer = setTimeout(() => {
        alertBox.style.opacity = '0';
        alertBox.style.transform = 'translate(-50%, -50%) scale(0.9)';
    }, 2500);
}

// ==========================================
// 🌟 2. 相手からのグループ招待を受信する処理（ここに配置！）
// ==========================================
socket.on('receiveGroupInvite', (data) => {
    const inviterName = data.senderName || "誰か";
    
    const textEl = document.getElementById('group-invite-text');
    if (textEl) {
        textEl.innerText = `'${inviterName}'様からグループの招待です`;
    }
    
    const popupEl = document.getElementById('group-invite-popup');
    if (popupEl) {
        popupEl.style.display = 'block';
    }
    
    window._currentInviteData = data;
});

// 🔄 交換申し込みを受信したとき（ひとつにまとめる）
socket.on('receiveTradeRequest', (data) => {
    const requesterName = data.senderName || "誰か";
    console.log(`${requesterName} から交換の申し込みが届きました！`, data);
    
    // 1. 交換用ポップアップのテキストを書き換える（要素があれば）
    const textEl = document.getElementById('trade-invite-text');
    if (textEl) {
        textEl.innerText = `'${requesterName}'様から交換の申し込みです`;
    }
    
    // 2. 交換用ポップアップを表示する
    const popupEl = document.getElementById('trade-invite-popup');
    if (popupEl) {
        popupEl.style.display = 'block';
    }
    
    // 3. 返信用にデータを一時保存（🌟 model_id や charVar も含めた data を丸ごと保存！）
    window._currentTradeData = data;
});

// 🔄 相手にトレードをキャンセルされたとき
if (typeof socket !== 'undefined') {
    socket.on('tradeCancelled', () => {
        const tradeWindow = document.getElementById("trade-window");
        if (tradeWindow) {
            tradeWindow.style.display = "none";
        }
        if (typeof addSystemMessage === 'function') {
            addSystemMessage("相手が交換をキャンセルしました。");
        }
        window._currentTradeTargetId = null;
    });
}

// ============================================================
// 🤝 フレンド申請の受信・受諾・拒否クライアント処理
// ============================================================
let pendingFriendSenderId = null; // 申請してきた相手のIDを一時保持

if (typeof socket !== 'undefined') {
    // サーバーから「フレンド申請が届いたよ」という通知を受け取ったとき
    socket.on('friend_request_received', (data) => {
        console.log("==========================================");
        console.log("📥 [CLIENT DEBUG] 'friend_request_received' を受信しました！");
        console.log("📥 [CLIENT DEBUG] 受け取ったデータ:", data);
        
        pendingFriendSenderId = data.senderId;

        const textEl = document.getElementById('friend-invite-text');
        console.log("📥 [CLIENT DEBUG] #friend-invite-text 要素:", textEl);
        if (textEl) {
            textEl.textContent = `'${data.senderUsername}'様からフレンド申請です`;
            console.log("📥 [CLIENT DEBUG] テキスト書き換え成功:", textEl.textContent);
        } else {
            console.error("❌ [CLIENT ERROR] #friend-invite-text がDOMに見つかりません！");
        }

        const popup = document.getElementById('friend-invite-popup');
        console.log("📥 [CLIENT DEBUG] #friend-invite-popup 要素:", popup);
        if (popup) {
            popup.style.display = 'block';
            console.log("📥 [CLIENT DEBUG] ポップアップを表示状態(display: block)にしました！");
        } else {
            console.error("❌ [CLIENT ERROR] #friend-invite-popup がDOMに見つかりません！");
        }
        console.log("==========================================");
    });

    // （オプション）相手が承認されたときの通知を受け取る場合
    socket.on('friend_request_accepted', (data) => {
        if (typeof addSystemMessage === 'function') {
            addSystemMessage(`${data.friendUsername} さんとフレンドになりました！`);
        }
    });
}

// ⭕ 画面上の受諾ボタンが押されたとき
function acceptFriendRequestUI() {
    if (!pendingFriendSenderId) return;

    if (typeof socket !== 'undefined') {
        // サーバーへ承認イベントを送信
        socket.emit('accept_friend_request', { senderId: pendingFriendSenderId });
    }

    // ポップアップを隠す
    const popup = document.getElementById('friend-invite-popup');
    if (popup) popup.style.display = 'none';
    pendingFriendSenderId = null;

    if (typeof addSystemMessage === 'function') {
        addSystemMessage("フレンド申請を承認しました。");
    }
}

// ❌ 画面上の拒否ボタンが押されたとき
function rejectFriendRequestUI() {
    // ポップアップを隠す
    const popup = document.getElementById('friend-invite-popup');
    if (popup) popup.style.display = 'none';
    
    const senderIdToReject = pendingFriendSenderId;
    pendingFriendSenderId = null;
    
    // 必要であればサーバーへ拒否を伝えるイベントを送ることも可能（今回は単に閉じてもOK）
    if (typeof socket !== 'undefined' && senderIdToReject) {
         socket.emit('reject_friend_request', { senderId: senderIdToReject });
    }

    if (typeof addSystemMessage === 'function') {
        addSystemMessage("フレンド申請を拒否しました。");
    }
}

// 現在表示しているプロセスのターゲットIDを保持する変数
let currentProfileUserId = null;

// 1. 「＋1する」ボタンが押されたときの処理
const popBtn = document.getElementById('profile-pop-btn');
if (popBtn) {
    popBtn.addEventListener('click', () => {
        console.log("🖱️ ＋1するボタンが押されました！ currentProfileUserId =", currentProfileUserId);

        if (!currentProfileUserId) {
            console.warn("⚠️ 相手のユーザーIDが設定されていません！");
            return;
        }

        if (typeof socket !== 'undefined' && socket.emit) {
            console.log("🚀 サーバーへ increase_fame を送信します targetId:", currentProfileUserId);
            socket.emit('increase_fame', { targetId: currentProfileUserId });
        } else {
            console.error("❌ socketが定義されていません！");
        }
    });
}

// ============================================================
// 2. サーバーから結果を受け取るリスナー（プロフィール即時反映＆アラート対応版）
// ============================================================
socket.on('fame_response', (data) => {
    if (data.success) {
        // ① チャット欄（#msg-box）にシステムメッセージを残す
        if (typeof addSystemMessage === 'function') {
            addSystemMessage(data.message);
        }
        
        // ② 画面中央に自作のカッコいいHTMLアラートをポップアップさせる！
        showCustomAlert(data.message, true);

        // ③ 🌟 開いているプロフィール画面の人気度（#profile-popularity）を即時＋１する！
        const popSpan = document.getElementById('profile-popularity');
        if (popSpan) {
            let currentFame = parseInt(popSpan.innerText, 10) || 0;
            currentFame += 1;
            popSpan.innerText = currentFame;

            // 演出として数値を一瞬青く光らせる
            popSpan.style.color = '#38bdf8';
            setTimeout(() => {
                popSpan.style.color = '';
            }, 1000);
        }

    } else {
        const errorText = `❌ ${data.message}`;

        // ① チャット欄に残す
        if (typeof addSystemMessage === 'function') {
            addSystemMessage(errorText);
        }

        // ② 画面中央に失敗用の赤枠カスタムアラートをポップアップさせる！
        showCustomAlert(errorText, false);
    }
});

// ============================================================
// 3. 相手が人気度を上げられたときのリアルタイム通知＆プロフィール即時反映
// ============================================================
socket.on('fame_increased', (data) => {
    // ① 開いているプロフィール画面の数値（#profile-popularity）をリアルタイムで更新
    const popSpan = document.getElementById('profile-popularity');
    if (popSpan) {
        if (data.newFame !== undefined) {
            popSpan.innerText = data.newFame;
        } else {
            let currentFame = parseInt(popSpan.innerText, 10) || 0;
            popSpan.innerText = currentFame + 1;
        }

        // 上がった瞬間に数値を青く光らせる演出
        popSpan.style.color = '#38bdf8';
        setTimeout(() => {
            popSpan.style.color = '';
        }, 1500);
    }

    // ② チャット欄（#msg-box）にシステムメッセージを残す
    if (typeof addSystemMessage === 'function') {
        addSystemMessage(`⭐ ${data.fromUsername} さんから人気度を上げられました！ (現在の人気度: ${data.newFame})`);
    }

    // ③ 必要であれば画面中央にカスタムアラートも出す
    if (typeof showCustomAlert === 'function') {
        showCustomAlert(`⭐ ${data.fromUsername} さんから人気度を上げられました！`, true);
    }
});

// ============================================================
// 📊 [SECTION 2: STATE] クライアント・ステート
// 役割: 自分のキャラ(hero)、他プレイヤー(players)、現在のチャンネル等の保持
// ============================================================
// 例: let hero; const players = {}; let selectedChannel = 1;
let others = {};      // 他のプレイヤーたち
let enemies = [];     // 敵キャラクターのリスト
let items = [];       // 落ちているアイテムのリスト
let platforms = [];   // 足場のデータ
let ladders = [];     // 梯子（ハシゴ）のデータ
let damageTexts = []; // 画面に表示するダメージ数字のリスト
window.keys = {};        // 🌟 押されているキーの状態を保存（windowを付けて全体で共有）
let frame = 0;           // ゲーム開始からの経過時間（フレーム数）
let zKeyPressed = false; // 攻撃ボタン(ZやX)の連続押し防止
let cKeyPressed = false; // ✨ ジャンプボタン(C)の連続押し防止
let ladderJumpTimer = 0; // 梯子からジャンプした直後に、すぐ梯子を掴まないためのタイマー

let myId = null; 
let currentMapId = 1; // マップIDの管理用（もし無ければ追加）

let lastReceivedTime = Date.now(); // 最後に通信した時間
let isDisconnected = false;        // 切断されているかどうかのフラグ

// ============================================================
// 🌟 状態管理用変数
// ============================================================
let poolActions = []; // 予備ボックス内のアクション配列
let selectedPoolAction = null; // プールから選択中のアクション（互換用）
let activeDragging = null; // 現在「掴んでホバー中」の要素情報 { source: 'pool' | 'keyboard', actionKey, label, index }

// ============================================================
// 1. キーボード全体のレイアウトデータ（デフォルト割り当て除外版）
// ============================================================
const keyboardLayoutData = [
    // 数字列
    [
        { key: 'ESC', w: 1 }, { key: '1', w: 1 }, { key: '2', w: 1 }, { key: '3', w: 1 }, 
        { key: '4', w: 1 }, { key: '5', w: 1 }, { key: '6', w: 1 }, { key: '7', w: 1 }, 
        { key: '8', w: 1 }, { key: '9', w: 1 }, { key: '0', w: 1 }
    ],
    // QWERTY列（Wのデフォルト割り当てを削除）
    [
        { key: 'TAB', w: 1.5 }, { key: 'Q', w: 1 }, { key: 'W', w: 1 }, 
        { key: 'E', w: 1 }, { key: 'R', w: 1 }, { key: 'T', w: 1 }, { key: 'Y', w: 1 }, 
        { key: 'U', w: 1 }, { key: 'I', w: 1 }, { key: 'O', w: 1 }, { key: 'P', w: 1 }
    ],
    // ASDF列（ホームポジションのA, S, Dのデフォルト割り当てを削除）
    [
        { key: 'CAPS', w: 1.8 }, { key: 'A', w: 1 }, 
        { key: 'S', w: 1 }, { key: 'D', w: 1 }, 
        { key: 'F', w: 1 }, { key: 'G', w: 1 }, { key: 'H', w: 1 }, 
        { key: 'J', w: 1 }, { key: 'K', w: 1 }, { key: 'L', w: 1 }
    ],
    // ZXCV列
    [
        { key: 'SHIFT', w: 2.2 }, { key: 'Z', w: 1 }, { key: 'X', w: 1 }, 
        { key: 'C', w: 1 }, { key: 'V', w: 1 }, { key: 'B', w: 1 }, 
        { key: 'N', w: 1 }, { key: 'M', w: 1 }
    ],
    // 最下段（スペースキーや矢印キーのデフォルト割り当てを削除）
    [
        { key: 'CTRL', w: 1.5 }, { key: 'ALT', w: 1.5 }, 
        { key: 'SPACE', w: 3.5 },
        { key: '←', w: 1 },
        { key: '↑', w: 1 },
        { key: '↓', w: 1 },
        { key: '→', w: 1 }
    ]
];

// ============================================================
// 🎮 キーボード入力を監視してコンフィグ通りにアクションを実行するシステム
// ============================================================

document.addEventListener('keydown', (e) => {
    // 💡もし現在、他のテキスト入力欄にフォーカスしている場合は誤作動を防ぐため無視する
    if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
        return;
    }

    // 押されたキーの名前を取得（例: 'z', 'Z', ' ', 'ArrowUp', など）
    const pressedKey = e.key;
    const pressedKeyUpper = pressedKey.toUpperCase();

    // currentKeyConfig を総当たりして、どの ação（アクション）に割り当てられているか探す
    let matchedActionKey = null;

    for (const [actionKey, config] of Object.entries(currentKeyConfig)) {
        if (!config.keyName) continue;

        let assignedKey = config.keyName;

        // 表記ゆれの吸収（スペースや矢印キーなどの対応）
        if (assignedKey.toLowerCase() === 'space' && pressedKey === ' ') {
            matchedActionKey = actionKey;
            break;
        }
        if (assignedKey.toUpperCase() === pressedKeyUpper) {
            matchedActionKey = actionKey;
            break;
        }
    }

    // 一致するアクションが見つかった場合
    if (matchedActionKey) {
        // デフォルトのブラウザ挙動（ページのスクロールなど）を防ぎたい場合はコメントアウトを外す
        // e.preventDefault(); 

        executeGameAction(matchedActionKey);
    }
});

// ============================================================
// 🎯 アクションが実行されたときの処理を振り分ける関数
// ============================================================
function executeGameAction(actionKey) {
    console.log(`🚀 アクション実行: [${actionKey}] がトリガーされました！`);

    // ここに実際のゲーム側の処理（関数やウィンドウの開閉）を紐付けます
    switch (actionKey) {
        case 'pickup':
            // 例: 足元のアイテムを拾う処理
            // playerPickUpItem();
            break;
        case 'attack':
            // 例: 攻撃処理
            // playerAttack();
            break;
        case 'jump':
            // 例: ジャンプ処理
            // playerJump();
            break;
        case 'status':
            // 例: ステータス画面の開閉
            // toggleWindow('status');
			drawStatusWindow();
            break;
        case 'inventory':
            // 例: インベントリ画面の開閉
            // toggleWindow('inventory');
            break;
        // 必要に応じて他のアクションも追加できます
        default:
            console.log(`ℹ️ アクション「${actionKey}」に対する処理が未定義です。`);
            break;
    }
}

// ============================================================
// 🌟 2. 予備ボックスを描画する関数（重複完全防止フィルター付き・スマート版）
// ============================================================
function renderPool() {
    const poolContainer = document.getElementById('keyboard-pool-container');
    if (!poolContainer) return;

    poolContainer.innerHTML = '';

    if (typeof poolActions === 'undefined') return;

    // プールエリア自体のクリックイベント（余白クリックで戻す対応）
    if (poolContainer.dataset.clickInitialized !== "true") {
        poolContainer.dataset.clickInitialized = "true";
        poolContainer.addEventListener('click', (e) => {
            if (e.target === poolContainer && activeDragging) {
                e.stopPropagation();
                cancelGrab();
            }
        });
    }

    // 🌟 【超重要】現在、メインキーボード側のどこかのキーに割り当てられている（keyNameが存在する）アクション名をすべて集める
    const assignedActionKeys = new Set();
    if (typeof currentKeyConfig !== 'undefined' && currentKeyConfig) {
        for (const [actionKey, config] of Object.entries(currentKeyConfig)) {
            // キー名が設定されている（＝メイン側に配置されている）ものは除外対象とする
            if (config && config.keyName && config.keyName !== '') {
                assignedActionKeys.add(actionKey);
            }
        }
    }

    // プール内のアイテムを回して描画する
    poolActions.forEach((poolItem, index) => {
        const actionIdentifier = poolItem.actionKey || poolItem.key;

        // 🌟 【完全ガード】メインキーボード側にすでに配置されているアクションなら、プール側への描画を一切スキップ！
        if (actionIdentifier && assignedActionKeys.has(actionIdentifier)) {
            return; 
        }

        const itemEl = document.createElement('div');
        itemEl.className = 'key-cap';
        itemEl.style.width = '48px';
        itemEl.style.height = '48px';
        itemEl.style.cursor = 'pointer';
        itemEl.style.display = 'flex';
        itemEl.style.alignItems = 'center';
        itemEl.style.justifyContent = 'center';
        itemEl.style.textAlign = 'center';
        itemEl.style.padding = '4px';
        itemEl.style.boxSizing = 'border-box';

        // 現在掴んでいるアイテムならハイライトする
        if (activeDragging && activeDragging.source === 'pool' && activeDragging.index === index) {
            itemEl.style.borderColor = '#ff00ff';
            itemEl.style.background = 'rgba(255, 0, 255, 0.2)';
        }

        // 🌟 📦マークを取り除き、ラベル名のみをスマートに配置
        itemEl.innerHTML = `
            <span class="key-action-name" style="font-size: 11px; line-height: 1.2; word-break: break-all;">${poolItem.label}</span>
        `;

        itemEl.addEventListener('click', (e) => {
            e.stopPropagation();

            if (activeDragging) {
                cancelGrab();
                return;
            }

            startGrab({
                source: 'pool',
                index: index,
                actionKey: actionIdentifier,
                label: poolItem.label
            }, e.clientX, e.clientY);
        });

        poolContainer.appendChild(itemEl);
    });
}

// ============================================================
// 🌟 3. キーボードを描画する関数（クリック配置・掴み取り対応版・完全同期修正版）
// ============================================================
function renderKeyboard() {
    const container = document.getElementById('keyboard-visual-container');
    if (!container) return;
    
    container.innerHTML = '';
    const baseWidth = 48;

    if (typeof keyboardLayoutData === 'undefined') return;

    keyboardLayoutData.forEach(rowKeys => {
        const rowEl = document.createElement('div');
        rowEl.className = 'keyboard-row';

        rowKeys.forEach(kData => {
            const keyEl = document.createElement('div');
            keyEl.className = 'key-cap';
            keyEl.style.width = `${kData.w * baseWidth}px`;
            keyEl.dataset.keyName = kData.key;

            const textEl = document.createElement('span');
            textEl.className = 'key-label';
            textEl.textContent = kData.key;
            keyEl.appendChild(textEl);

            let assignedActionKey = null;
            let assignedLabel = null;

            // 💡 現在のコンフィグ（currentKeyConfig）から、このキーに割り当てられているものを逆引きする
            if (typeof currentKeyConfig !== 'undefined') {
                for (const [actionKey, config] of Object.entries(currentKeyConfig)) {
                    if (!config.keyName) continue;
                    
                    let configKeyName = config.keyName;
                    if (configKeyName === 'ArrowUp') configKeyName = '↑';
                    if (configKeyName === 'ArrowDown') configKeyName = '↓';
                    if (configKeyName === 'ArrowLeft') configKeyName = '←';
                    if (configKeyName === 'ArrowRight') configKeyName = '→';
                    if (configKeyName.toLowerCase() === 'space') configKeyName = 'SPACE';

                    if (configKeyName.toUpperCase() === kData.key.toUpperCase()) {
                        assignedActionKey = actionKey;
                        assignedLabel = config.label;
                        break;
                    }
                }
            }

            // 💡【修正点】レイアウト側の初期データ（kData.action等）に頼らず、現在のコンフィグ結果のみを正とする！
            const effectiveAction = assignedActionKey;
            const effectiveLabel = assignedLabel;

            // 有効な機能が割り当てられている場合のみ描画する
            if (effectiveLabel) {
                keyEl.style.borderColor = '#00ffcc';
                textEl.style.color = '#00ffcc';
                keyEl.style.cursor = 'grab'; 
                
                const labelEl = document.createElement('span');
                labelEl.className = 'key-action-name';
                labelEl.textContent = effectiveLabel;
                keyEl.appendChild(labelEl);
                
                if (effectiveAction) {
                    keyEl.id = `key-action-${effectiveAction}`;
                }
            } else {
                // 機能が割り当てられていない空のキー
                keyEl.style.borderColor = '';
                textEl.style.color = '';
                keyEl.style.cursor = 'default';
            }

            // 🌟 キーボードのキーをクリックしたときの処理
            keyEl.addEventListener('click', (e) => {
                e.stopPropagation();

                // パターンA：すでに何かを掴んでいて、そこに配置する場合
                if (activeDragging) {
                    placeGrabbedAction(kData.key);
                } 
                // パターンB：何も掴んでいなくて、このキーに機能がある場合 ➔ クリックして「掴む」
                else if (effectiveLabel) {
                    let targetActionKey = assignedActionKey;
                    if (!targetActionKey) {
                        for (const [aKey, config] of Object.entries(currentKeyConfig)) {
                            if (aKey === effectiveAction) {
                                targetActionKey = aKey;
                                break;
                            }
                        }
                    }

                    // キーボード上から一旦剥がして掴む
                    //if (typeof currentKeyConfig !== 'undefined' && currentKeyConfig[targetActionKey || effectiveAction]) {
                    //    currentKeyConfig[targetActionKey || effectiveAction].keyName = null;
                    //}

                    startGrab({
                        source: 'keyboard',
                        actionKey: targetActionKey || effectiveAction,
                        label: effectiveLabel
                    }, e.clientX, e.clientY);
                }
            });

            rowEl.appendChild(keyEl);
        });

        container.appendChild(rowEl);
    });
}

// ============================================================
// 🌟 4. 「掴んでホバーする」ための共通エンジン（通常時と完全一致版）
// ============================================================
function startGrab(dragData, clientX, clientY) {
    activeDragging = dragData;

    // 強制的に grabbing にするCSSクラスを追加
    let grabStyleEl = document.getElementById('force-grabbing-style');
    if (!grabStyleEl) {
        grabStyleEl = document.createElement('style');
        grabStyleEl.id = 'force-grabbing-style';
        document.head.appendChild(grabStyleEl);
    }
    grabStyleEl.innerHTML = `*, *:hover { cursor: grabbing !important; }`;

    // マウスに追従するゴースト要素を生成
    const ghost = document.createElement('div');
    ghost.id = 'drag-ghost-element';
    ghost.className = 'key-cap';
    ghost.style.position = 'fixed';
    ghost.style.width = '48px';
    ghost.style.height = '48px';
    ghost.style.pointerEvents = 'none'; // 当たり判定を無効化
    ghost.style.zIndex = '99999';
    ghost.style.opacity = '0.9';
    ghost.style.borderColor = '#00ffcc';
    ghost.style.background = '#1a1a2e';
    ghost.style.boxShadow = '0 8px 16px rgba(0,0,0,0.5)';
    
    ghost.style.left = `${clientX - 24}px`;
    ghost.style.top = `${clientY - 24}px`;

    // 💡【修正】通常時のキーボード描画と同じ構造・クラスを再現し、文字の大きさや位置を固定
    ghost.innerHTML = `
        <span class="key-action-name" style="color: #00ffcc;">${dragData.label}</span>
    `;
    document.body.appendChild(ghost);

    document.addEventListener('mousemove', onGrabMouseMove);
    
    renderPool();
    renderKeyboard();
}

// 🌐 掴んだ状態でマウスを動かしている時のハンドラー（requestAnimationFrameで爆速・滑らか追従）
let latestMouseX = 0;
let latestMouseY = 0;
let isRafPending = false;

function onGrabMouseMove(e) {
    latestMouseX = e.clientX;
    latestMouseY = e.clientY;

    // 💡【改善】requestAnimationFrameを使って、画面の描画タイミング（リフレッシュレート）に完全同期させる
    if (!isRafPending) {
        isRafPending = true;
        requestAnimationFrame(() => {
            const ghost = document.getElementById('drag-ghost-element');
            if (ghost) {
                // 幅・高さ(48px)の半分(24px)を引いてカーソルの真中心に合わせる
                ghost.style.left = `${latestMouseX - 24}px`;
                ghost.style.top = `${latestMouseY - 24}px`;
            }
            isRafPending = false;
        });
    }
}

// ============================================================
// 🌟 プールに安全にアクションを追加する共通関数（重複絶対に防止）
// ============================================================
function addActionToPool(actionKey, label) {
    // すでにプール内（poolActions）に存在するかチェック
    const exists = poolActions.some(item => item.actionKey === actionKey);
    if (!exists) {
        poolActions.push({
            actionKey: actionKey,
            label: label
        });
    }
}

// ============================================================
// 🌐 別の場所をクリックして配置を完了させる関数（押し出し・重複完全防止版）
// ============================================================
function placeGrabbedAction(targetKeyName) {
    if (!activeDragging) return;

    if (targetKeyName && typeof currentKeyConfig !== 'undefined') {
        let existingActionKey = null;
        let existingLabel = null;

        for (const [aKey, config] of Object.entries(currentKeyConfig)) {
            if (!config.keyName) continue;
            
            let configKeyName = config.keyName;
            if (configKeyName === 'ArrowUp') configKeyName = '↑';
            if (configKeyName === 'ArrowDown') configKeyName = '↓';
            if (configKeyName === 'ArrowLeft') configKeyName = '←';
            if (configKeyName === 'ArrowRight') configKeyName = '→';
            if (configKeyName.toLowerCase() === 'space') configKeyName = 'SPACE';

            if (configKeyName.toUpperCase() === targetKeyName.toUpperCase()) {
                existingActionKey = aKey;
                existingLabel = config.label;
                break;
            }
        }

        // もし既に別のコンテンツが嵌め込まれていた場合 ➔ 予備ボックス（プール）へ押し出す！
        if (existingActionKey && existingLabel) {
            // 🌟 【修正】すでにプール内に同じアクションが存在しない場合のみ追加する（重複ガード）
            const alreadyInPool = poolActions.some(item => item.actionKey === existingActionKey);
            if (!alreadyInPool) {
                poolActions.push({
                    actionKey: existingActionKey,
                    label: existingLabel
                });
            }
            
            currentKeyConfig[existingActionKey].keyName = null; // キーボード側からは一旦外す
            console.log(`📦 元々あった「${existingLabel}」をプールへ押し出しました`);
        }

        // 1. プールからの配置だった場合
        if (activeDragging.source === 'pool') {
            if (currentKeyConfig[activeDragging.actionKey]) {
                currentKeyConfig[activeDragging.actionKey].keyName = targetKeyName;
            }
            poolActions.splice(activeDragging.index, 1);
        } 
        // 2. キーボード同士の移動だった場合
        else if (activeDragging.source === 'keyboard') {
            if (currentKeyConfig[activeDragging.actionKey]) {
                currentKeyConfig[activeDragging.actionKey].keyName = targetKeyName;
            }
        }

        console.log(`✨ キー「${targetKeyName}」に「${activeDragging.label}」を配置しました！`);
    }

    cleanupGrab();
    renderKeyboard();
    renderPool();
    
    updateKeyMapFromConfig();
	
	// 🌟 【追加】キー配置が変わったので即座にサーバーへオートセーブする！
    saveGameData();
}

// ============================================================
// 🌐 掴み状態をキャンセルして元に戻す（プールに戻す等）関数（重複防止版）
// ============================================================
function cancelGrab() {
    if (!activeDragging) return;

    if (activeDragging.source === 'keyboard') {
        if (typeof currentKeyConfig !== 'undefined' && currentKeyConfig[activeDragging.actionKey]) {
            // 🌟 【修正】すでにプール内に同じアクションが存在しない場合のみ追加する（重複ガード）
            const alreadyInPool = poolActions.some(item => item.actionKey === activeDragging.actionKey);
            if (!alreadyInPool) {
                poolActions.push({
                    actionKey: activeDragging.actionKey,
                    label: activeDragging.label
                });
            }
            
            currentKeyConfig[activeDragging.actionKey].keyName = null;
        }
    }
    console.log(`📦 アクション「${activeDragging.label}」の掴みを解除しました`);

    cleanupGrab();
    renderKeyboard();
    renderPool();
	
	// 🌟 【追加】キャンセルして配置が変わったので即座にサーバーへオートセーブする！
    saveGameData();
}

// 🌐 掴み状態の終了処理（強制カーソル用CSSを削除）
function cleanupGrab() {
    document.removeEventListener('mousemove', onGrabMouseMove);
    
    // 💡【強力な対策】追加した強制CSSを削除してカーソルを元に戻す
    const grabStyleEl = document.getElementById('force-grabbing-style');
    if (grabStyleEl) {
        grabStyleEl.remove();
    }

    const ghost = document.getElementById('drag-ghost-element');
    if (ghost) ghost.remove();
    activeDragging = null;
}

// 🌟 5. プール側へのドロップ処理の初期化（互換用ダミー）
function setupPoolDropArea() {
    // クリック制御に移行したため空でもOK
}

// ============================================================
// 6. 自前のクリック監視（開閉対応版）
// ============================================================
if (document.getElementById('stage')) {
    document.getElementById('stage').addEventListener('click', (event) => {
        if (typeof gameWindows === 'undefined' || !gameWindows.options || !gameWindows.options.isOpen) {
            return;
        }

        const rect = document.getElementById('stage').getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const clickY = event.clientY - rect.top;

        if (typeof optionsHitAreas !== 'undefined') {
            for (const area of optionsHitAreas) {
                // 1. 「キーボードコンフィグ設定」ボタンが押されたとき（開く）
                if (area.type === 'openKeyConfig') {
                    if (clickX >= area.x && clickX <= area.x + area.w &&
                        clickY >= area.y && clickY <= area.y + area.h) {
                        
                        gameWindows.options.isOpen = true;
                        cleanupGrab(); // 開いたときはリセット
                        
                        renderKeyboard();
                        if (typeof renderPool === 'function') {
                            renderPool(); 
                        }
                        
                        const modal = document.getElementById('keyconfig-modal');
                        if (modal) modal.style.display = 'block';
                        
                        setupKeyConfigDraggable();
                        
                        if (typeof isKeyConfigOpen !== 'undefined') {
                            isKeyConfigOpen = true;
                        }
                    }
                }
                
                // 2. 「戻る」ボタンが押されたとき（閉じる）
                if (area.type === 'backToOptions') {
                    if (clickX >= area.x && clickX <= area.x + area.w &&
                        clickY >= area.y && clickY <= area.y + area.h) {
                        
                        if (typeof isKeyConfigOpen !== 'undefined') {
                            isKeyConfigOpen = false;
                        }
                        if (typeof waitingForKeyChange !== 'undefined') {
                            waitingForKeyChange = null;
                        }
                        cleanupGrab();
                        
                        const modal = document.getElementById('keyconfig-modal');
                        if (modal) modal.style.display = 'none';

                        console.log("✨ キーボード設定ウィンドウを閉じました！");
                    }
                }
            }
        }
    });
}

// ============================================================
// 7. ドラッグ＆ドロップ（ウィンドウ移動用 - 非ネスト版）
// ============================================================
function setupKeyConfigDraggable() {
    const modal = document.getElementById('keyconfig-modal');
    const header = document.getElementById('keyconfig-header');
    if (!modal || !header) return;

    if (modal.dataset.draggableInitialized === "true") return;
    modal.dataset.draggableInitialized = "true";

    header.addEventListener('mousedown', onWindowMouseDown);

    const closeBtn = document.getElementById('keyconfig-close-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
            if (typeof isKeyConfigOpen !== 'undefined') isKeyConfigOpen = false;
            cleanupGrab();
        });
    }
}

// 🪟 ウィンドウを掴み始めたときのハンドラー
function onWindowMouseDown(e) {
    const modal = document.getElementById('keyconfig-modal');
    if (!modal) return;

    const rect = modal.getBoundingClientRect();
    const initialX = rect.left;
    const initialY = rect.top;

    modal.style.position = 'absolute';
    modal.style.transform = 'none'; 
    modal.style.left = initialX + 'px';
    modal.style.top = initialY + 'px';

    // ウィンドウ移動に必要なコンテキストを保持
    window._windowDragContext = {
        modal: modal,
        startX: e.clientX,
        startY: e.clientY,
        initialX: initialX,
        initialY: initialY
    };

    document.addEventListener('mousemove', onWindowMouseMove);
    document.addEventListener('mouseup', onWindowMouseUp);
}

// 🪟 ウィンドウ移動中のハンドラー
function onWindowMouseMove(e) {
    if (!window._windowDragContext) return;
    const { modal, startX, startY, initialX, initialY } = window._windowDragContext;

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    modal.style.left = (initialX + dx) + 'px';
    modal.style.top = (initialY + dy) + 'px';
}

// 🪟 ウィンドウのドラッグを終了したときのハンドラー
function onWindowMouseUp() {
    window._windowDragContext = null;
    document.removeEventListener('mousemove', onWindowMouseMove);
    document.removeEventListener('mouseup', onWindowMouseUp);
}

// ============================================================
// 🔊 [SECTION 3: RESOURCES] アセット・クラス定義
// 役割: Playerクラスの定義や、画像・音声の初期化
// ============================================================
// ============================================================
// :::CLASS_PLAYER::: 👤 プレイヤーの定義・ステータス・物理・行動管理
// ============================================================
class Player {
  constructor(name = "", channel = 1) { // 🌟 チャンネル引数を追加
    // 位置と移動
    this.x = 50;
    this.y = 540;
    this.dy = 0;
    this.dir = 1;
    this.jumping = true;

    // 🌟 【追加】移動速度とジャンプ力の初期値（ステータスや装備で変動可能に）
    this.speed = 5.0;       // デフォルトの移動速度
    this.jumpPower = 10.0;  // デフォルトのジャンプ初速

    // ⚔️ 基本ステータス（サーバーと同期）
    this.hp = 100;
    this.maxHp = 100;
    this.str = 50;
    this.dex = 5;  // 🌟 維持
    this.luk = 5;  // 🌟 維持
    this.ap = 0;   // 🌟 維持
    this.score = 0;
    this.level = 1;
    this.exp = 0;
    this.channel = channel; // 🌟 追加：自分が今どのチャンネルにいるかを記憶

	this.dbId = null;
	
    // 状態管理
    this.name = name;
    this.chat = null;
    this.isAttacking = 0;
    this.attackStartFrame = -999;
    this.invincible = 0;
    this.inventory = [];

    // 🌟 追加：ノックバック・硬直状態の管理
    this.isStunned = false; 
    this.stunTimer = 0;
    
    this.isInvincible = false; // 最初は無敵ではありません

    // 🌟 【追加】立ち止まり回復用のタイマーと直前のX座標記録
    this.idleTimer = 0;
    this.lastX = this.x;
  }

  // 🌟 【修正】移動のロジック（this.speed を反映）
  move(direction) { // 互換性のため引数を direction(-1 or 1) または vx に調整
    if (this.isStunned) return;

    // 呼び出し側が速度のかかった値(vx)を渡しているか、方向(-1, 1)を渡しているかで分岐
    // ここでは this.speed をベースに移動量を計算します
    const moveVelocity = (typeof direction === 'number' && Math.abs(direction) === 1) 
        ? direction * this.speed 
        : direction; // 従来通り直接vxが渡ってきた場合への配慮

    this.x += moveVelocity;
    if (moveVelocity > 0) this.dir = 1;
    if (moveVelocity < 0) this.dir = -1;
  }
  
  // 🌟 位置を一気に更新するメソッド
  updatePosition(dx, dy) {
    this.x += dx;
    this.y += dy;
    if (dx > 0) this.dir = 1;
    if (dx < 0) this.dir = -1;
  }

  // 🌟 ジャンプを実行するメソッド（新しく追加すると便利です）
  jump() {
    if (this.climbing || this.isStunned || this.jumping) return;
    
    // 🌟 ここで jumpPower を上方向の初速として適用！
    this.dy = -this.jumpPower;
    this.jumping = true;
  }

  // 🌟 修正：敵の位置(enemyX)を受け取ってノックバック方向を決める
  receiveDamage(amount, enemyX = null) {
    // 🌟 管理者無敵なら、ダメージ処理そのものを完全に無視する
    if (this.isInvincible) return; 

    if (this.hp <= 0) return;
    if (this.invincible > 0) return; // 被弾による無敵中なら何もしない

    this.hp -= amount;

    if (this.hp < 0) {
        this.hp = 0;
    }

    this.invincible = 60; // 1秒間無敵

    // 🌟 ノックバックと硬直の発生（ここも管理者無敵なら通らない）
    if (!this.climbing) {
        this.dy = -8; 
        
        const knockbackDir = (enemyX !== null && this.x < enemyX) ? -1 : 1;
        this.x += knockbackDir * 30; 

        this.isStunned = true; 
        this.stunTimer = 30;   
    }
    
    console.log(`${this.name}は ${amount} のダメージを受けた！ 残りHP: ${this.hp}`);
  }

  // 🌟 リスポーン（復活）のルール
  respawn() {
    this.hp = 100; 
    this.x = 50; 
    this.y = 390; 
    this.climbing = false;
    this.isStunned = false; // 🌟 復活時に硬直解除
    this.stunTimer = 0;
    console.log(`${this.name}(Ch:${this.channel})がリスポーンしました。`);
  }
  
  /**
   * 🌟 物理演算と硬直時間の更新
   */
  applyPhysics(platforms) {
    // 🌟 追加：硬直タイマーの更新
    if (this.stunTimer > 0) {
        this.stunTimer--;
        if (this.stunTimer <= 0) this.isStunned = false;
    }

    if (!this.climbing) {
      this.dy += GAME_SETTINGS.GRAVITY;
    } else {
      this.dy = 0;
    }
    this.y += this.dy;

    let grounded = false;

    // A. 地面の判定
    const GROUND_Y_LIMIT = GLOBAL_SETTINGS.SYSTEM.GROUND_Y; 
    if (this.y >= GROUND_Y_LIMIT) {
        this.y = GROUND_Y_LIMIT;
        this.dy = 0;
        grounded = true;
    }

    // B. 足場の判定
    if (platforms && !this.climbing && this.dy >= 0) {
      platforms.forEach(p => {
        const currentHeight = 60; 
        const charCenter = this.x + 20;
        const footWidth = 20;

        if (charCenter + footWidth > p.x && charCenter - footWidth < p.x + p.w) {
          if (this.y + currentHeight >= p.y - 10 && this.y + currentHeight <= p.y + 30) {
            this.y = p.y - currentHeight;
            this.dy = 0;
            grounded = true;
          }
        }
      });
    }

    // C. ジャンプ・落下状態の更新
    if (grounded) {
      this.jumping = false;
      this.jumpFrame = 0;
    } else if (!this.climbing) {
      this.jumping = true;
      this.jumpFrame = (this.jumpFrame || 0) + 1;
    }

    // 🌟 追加：立ち止まり時のHP自動回復判定
    // 地面にいて、HPが満タン未満で、硬直中でない状態のとき
    if (grounded && this.hp < this.maxHp && !this.isStunned) {
        // 前回のフレームから位置（X座標）が変わっていないかチェック
        if (Math.abs(this.x - this.lastX) < 0.01) {
            this.idleTimer++;
            // 約1秒（60フレーム）静止し続けたら回復開始
            if (this.idleTimer > 60) {
                this.hp += 0.2; // 毎フレームの回復量（お好みで調整してください）
                if (this.hp > this.maxHp) {
                    this.hp = this.maxHp;
                }
            }
        } else {
            // 動いたらタイマーをリセット
            this.idleTimer = 0;
        }
    } else {
        this.idleTimer = 0;
    }
    // 現在のX座標を次フレームの比較用に保存
    this.lastX = this.x;

    return grounded; 
  }
  
  // 🌟 攻撃を開始するルール
  startAttack() {
    if (this.climbing || this.isStunned) return; // 🌟 硬直中は攻撃不可
    if (this.isAttacking > 0) return; 
    
    this.isAttacking = 20; 
    this.attackStartFrame = frame; 
    
    if (typeof playAttackSound === 'function') {
        playAttackSound();
    }
  }
  
  // 🌟 攻撃が当たっているか判定
  checkHit(enemies) {
    if (this.isAttacking !== 13) return null; 

    let targetsInRange = [];
    enemies.forEach(en => {
      if (!en.alive || en.isFading || en.hp <= 0) return;

      const hitBoxX = (this.dir === -1) ? this.x - 40 : this.x + 80;
      const hitBoxY = this.y; 

      const currentEnemyY = en.y + (en.jumpY || 0);

      const dx = hitBoxX - (en.x + en.w / 2);
      const dy = hitBoxY - (currentEnemyY + en.h / 2);
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < GAME_SETTINGS.ATTACK_RANGE) { 
        targetsInRange.push({ enemy: en, dist: dist });
      }
    });

    if (targetsInRange.length > 0) {
      targetsInRange.sort((a, b) => a.dist - b.dist);
      return targetsInRange[0].enemy; 
    }
    return null;
  }
  
  // 🌟 敵との接触をチェック
  checkEnemyCollision(enemies) {
    if (this.invincible > 0) {
      this.invincible--;
      return;
    }

    enemies.forEach(en => {
      if (!en.alive || en.isFading) return;

      const enemyVisualY = en.y + (en.jumpY || 0);
      let hitW = en.w;
      let hitH = en.h;
      let offsetX = 0;

      if (en.isAttacking > 0 && typeof sprites !== 'undefined') {
        const atkSprites = sprites[en.type + "Attack"];
        if (atkSprites && atkSprites.length > 0) {
          const progress = 22 - en.isAttacking;
          const img = atkSprites[Math.max(0, Math.min(progress, atkSprites.length - 1))];
          if (img) {
            const s = en.scale || 1.0;
            hitW = img.width * 0.2 * s;
            hitH = img.height * 0.2 * s;
            if (en.dir === -1) offsetX = -(hitW - en.w);
          }
        }
      }

      const isHit = (
        this.x < en.x + hitW + offsetX &&
        this.x + 60 > en.x + offsetX &&
        this.y < enemyVisualY + hitH &&
        this.y + 60 > enemyVisualY
      );

      if (isHit) {
        // 🌟 ここで管理者無敵をチェック！
        if (this.isInvincible) {
            console.log("🛡️ 無敵のため衝突を無視しました");
            return; // 衝突したことにしない（＝スタンもしない、ダメージも受けない）
        }

        const dmg = Math.floor(Math.random() * 8) + 8;
        
        // 🌟 修正：敵の位置(en.x)を渡してノックバックを計算させる
        this.receiveDamage(dmg, en.x); 

        // サーバー通信とリスポーン判定
        socket.emit('player_damaged', { val: dmg, newHp: this.hp });
        if (this.hp <= 0) {
            console.log("死亡しました。復活待機中...");
        }
      }
    });
  }
}

let hero = new Player("name1", 1); // 初期値としてCh1をセット

// ============================================================
// 🧠 [SECTION 4: LOGIC] 物理演算・更新ロジック
// 役割: 移動計算、衝突判定、座標の更新処理（描画前の計算）
// ============================================================
// ============================================================
// :::SET_WHISPER_TARGET::: 💬 内緒話の宛先選択・UI更新処理
// ============================================================
function setWhisperTarget(name) {
    // 自分自身の名前なら何もしない
    if (name === hero.name) return;
    
    const value = `whisper:${name}`;
    const labelText = `内緒話：${name}`;
    
    // 1. 隠しフィールドに値をセット
    const hiddenInput = document.getElementById('chat-mode-value');
    if (hiddenInput) {
        hiddenInput.value = value;
    }
    
    // 2. 選択中の表示ラベルを更新
    const label = document.getElementById('chat-mode-label');
    if (label) {
        label.textContent = labelText;
    }
    
    // 3. ドロップダウンメニュー側にも、その人の選択肢がなければ動的に追加する
    const optionsContainer = document.getElementById('chat-mode-options');
    if (optionsContainer) {
        // すでに同じ宛先の選択肢があるか探す
        let targetOption = Array.from(optionsContainer.children).find(opt => opt.getAttribute('onclick') && opt.getAttribute('onclick').includes(value));
        
        if (!targetOption) {
            // なければ新しく選択肢要素を作成して追加
            targetOption = document.createElement('div');
            targetOption.className = 'custom-option whisper-dynamic-option';
            targetOption.textContent = labelText;
            targetOption.style.color = '#99ffff'; // 内緒話用の色
            
            // クリックされたときの処理を設定
            targetOption.onclick = function() {
                selectChatMode(value, labelText);
            };
            
            optionsContainer.appendChild(targetOption);
        }
    }
    
    // 4. 入力欄にフォーカス
    const chatIn = document.getElementById('chat-in');
    if (chatIn) {
        chatIn.focus();
    }
}

// ============================================================
// :::UPDATE_ITEMS_PHYSICS::: 💎 ドロップアイテムの物理計算・着地判定
// ============================================================
function updateItemsPhysics() {
    items.forEach(item => {
        // すでに着地しているアイテムは計算をスキップ（フリーズ防止の最重要ポイント）
        if (item.landed) return; 

        // 1. 移動計算
        item.x += item.vx || 0; 
        item.y += item.vy || 0; 
        item.vy = (item.vy || 0) + 0.5; 
        item.vx *= 0.98; 

        const groundY = 565;
        const itemSize = 32;

        // 2. 地面着地
        if (item.y + itemSize > groundY && item.vy > 0) { 
            item.y = groundY - itemSize; 
            item.landed = true; // 先にフラグを立てる
            item.vy = 0;
            item.vx = 0;
            // 通知は一回だけ（io.emitが必要ならここ）
            return; 
        }

        // 3. 足場着地
        // forEachではなく、一つ見つかったら止める find などが理想ですが、
        // 既存の形式を活かすなら return で抜けるようにします。
        for (const p of platforms) {
            const offset = 10; 
            const itemBottom = item.y + itemSize;

            // X方向の判定：アイテムが「しっかり」足場に乗っているか
            const isInsideX = (item.x + (itemSize - offset) > p.x) && (item.x + offset < p.x + p.w);
            // Y方向の判定：足場の表面に触れたか
            const isTouchingTop = (item.vy > 0 && itemBottom >= p.y && itemBottom <= p.y + 15);

            if (isInsideX && isTouchingTop) {
                item.y = p.y - itemSize; 
                item.landed = true; // 着地確定
                item.vy = 0;
                item.vx = 0;
                break; // このアイテムのループを抜ける（他の足場は見ない）
            }
        }
    });
}

// ============================================================
// :::FINALIZE_LANDING::: 💎 アイテム着地確定・状態永続化・同期放送
// ============================================================
function finalizeLanding(item) {
    item.landed = true;
    item.vy = 0;
    item.vx = 0;
    
    // サーバー側のDB更新処理をここで呼ぶ必要があります
    // (例: updateItemLocationInDB(item.id, item.x, item.y);)
    
    // 全員に「この位置で着地したよ」と知らせる
    io.emit('item_sync_position', {
        id: item.id,
        x: item.x,
        y: item.y,
        landed: true
    });
}

// ============================================================
// :::UPDATE_EFFECTS::: ✨ エフェクト・演出・タイマーの更新管理
// ============================================================
function updateEffectsAndTimers() {
    // ダメージ数字の浮上と消滅
    damageTexts = damageTexts.filter(t => { 
        t.y += t.vy;   
        t.vy += 0.1;   
        t.timer--;     
        return t.timer > 0; 
    });

    // チャット吹き出しの表示時間管理
    if (hero.chat && hero.chat.timer > 0) {
        hero.chat.timer--;
    }

    // ハシゴ再接触禁止タイマー
    if (ladderJumpTimer > 0) ladderJumpTimer--;
}

// ============================================================
// :::UPDATE_PLAYER_COMBAT::: ⚔️ 攻撃判定・ダメージ同期・接触管理
// ============================================================
function updatePlayerCombat() {
    // 自分の攻撃処理
    if (hero.isAttacking > 0) {
        hero.isAttacking--; 
        
        // 攻撃判定が発生するフレーム（13フレーム目）
        if (hero.isAttacking === 13) {
            // 🌟 オレンジの枠内に敵がいるかチェック
            let target = hero.checkHit(enemies); 
            
            if (target) {
                // --- 【敵に当たった場合：オレンジの枠内】 ---
                const damage = Math.floor(Math.random() * 41) + 50; 
                
                // 🌟 音はここで鳴らさず、サーバーに「当たったはず」と送信します。
                // 実際の音は、下の socket.on('enemy_hit_sync') で鳴らします。
                socket.emit('attack', { id: target.id, power: damage, dir: hero.dir });

            } else {
                // --- 【敵がいなかった場合（空振り）：オレンジの枠外】 ---
                // 動作（アニメーション）だけ同期させるためにサーバーへ通知
                socket.emit('attack', { id: null, power: 0, dir: hero.dir });
            }
        }
    }

    // 敵との接触ダメージ判定（無敵管理含む）
    hero.checkEnemyCollision(enemies);
}

// 1. 画像の事前読み込み
const emotionImages = [];
for (let i = 1; i <= 8; i++) {
    const img = new Image();
    const fileName = String(i).padStart(2, '0') + '.png';
    img.src = `${IMAGE_DOMAIN}emotion_assets/${fileName}`;
    emotionImages[i] = img;
}

let isPickerInitialized = false;
let selectedEmotionFile = null;

// 2. ボタンを押したときの開閉処理（フェード対応版）
function toggleEmotionPicker(event) {
    if (event) event.stopPropagation();

    // 🌟 表情ボタンが押されたら、チャットモードのメニューを強制的に閉じる
    const chatModeWrapper = document.getElementById('custom-chat-mode');
    const options = document.getElementById('chat-mode-options');
    if (options && options.classList.contains('is-open')) {
        options.classList.remove('is-open');
        if (chatModeWrapper) chatModeWrapper.classList.remove('is-active');
    }

    // 🌟 表情ボタンが押されたら、ステータス選択のメニューも強制的に閉じる
    const statusModeWrapper = document.getElementById('custom-status-mode');
    const statusOptions = document.getElementById('status-mode-options');
    if (statusOptions && statusOptions.classList.contains('is-open')) {
        statusOptions.classList.remove('is-open');
        if (statusModeWrapper) statusModeWrapper.classList.remove('is-active');
    }

    const popup = document.getElementById('emotion-picker-popup');
    if (!popup) {
        console.error("エラー: 'emotion-picker-popup' が見つかりません。");
        return;
    }

    // 初回のみサムネイルを生成
    if (!isPickerInitialized) {
        for (let i = 1; i <= 8; i++) {
            const fileName = String(i).padStart(2, '0') + '.png';
            const thumbImg = document.createElement('img');
            thumbImg.src = `${IMAGE_DOMAIN}emotion_assets/${fileName}`;
            thumbImg.className = 'emotion-thumb';
            thumbImg.alt = `表情 ${i}`;
            
            thumbImg.onclick = function() {
                selectEmotion(i, fileName);
            };
            
            popup.appendChild(thumbImg);
        }
        isPickerInitialized = true;
    }

    // クラスの有無でフェードイン・フェードアウトを切り替え
    if (popup.classList.contains('is-open')) {
        popup.classList.remove('is-open');
    } else {
        popup.classList.add('is-open');
    }
}

// 3. 画像を選んだときの処理
function selectEmotion(emotionId, fileName) {
    selectedEmotionFile = fileName;
    
    if (emotionId >= 1 && emotionId <= 8) {
        if (typeof hero !== 'undefined') {
            hero.emotionId = emotionId;
            hero.emotionTimer = 180; // 180フレーム（約3秒）
        }
    }

    console.log(`選択された表情: ${fileName} (ID: ${emotionId})`);
    
    // ポップアップを閉じる（クラスを外す）
    const popup = document.getElementById('emotion-picker-popup');
    if (popup) {
        popup.classList.remove('is-open');
    }
}

// 4. ポップアップ以外の場所をクリックしたら閉じる
window.addEventListener('click', function(event) {
    const popup = document.getElementById('emotion-picker-popup');
    const btn = document.getElementById('emotion-btn');
    
    if (popup && popup.classList.contains('is-open')) {
        if (!popup.contains(event.target) && !btn.contains(event.target)) {
            popup.classList.remove('is-open');
        }
    }
});

// ============================================================
// 🕹️ [SECTION 5: INPUT] 入力ハンドラ
// 役割: キーボード(keydown/up)操作の監視と移動フラグの切り替え
// ============================================================
// 例: window.addEventListener('keydown', ...)
window.onkeydown = e => window.keys[e.code] = true;
window.onkeyup = e => window.keys[e.code] = false;

const chatIn = document.getElementById('chat-in');
const msgBox = document.getElementById('msg-box');

const loginOverlay = document.getElementById('login-overlay');
const nameInput = document.getElementById('user-name-input');
const startBtn = document.getElementById('start-game-btn');

// --- 履歴管理用の変数を定義（関数の外に置くことで保持されます） ---
let chatHistory = [];
let historyIndex = -1;

// ============================================================
// :::HANDLE_CHAT_INPUT::: 💬 チャット入力制御・履歴・送信ロジック
// ============================================================
/**
 * 役割：
 * - 日本語入力（IME）の誤作動防止ガード
 * - 上下キーによるチャット送信履歴の呼び出し
 * - エンターキーによるメッセージ送信（全体/グループ/友人/内緒話）
 * - 送信モードの動的判定と自己宛先防止ガード
 */
chatIn.onkeydown = e => {
    // 🌟 1. 日本語入力の「変換確定エンター」を無視するガード
    if (e.isComposing || e.keyCode === 229) {
        return;
    }

    // --- 🌟 追加：上下キーで履歴を遡る処理 ---
    if (e.key === 'ArrowUp') {
        if (chatHistory.length > 0 && historyIndex < chatHistory.length - 1) {
            e.preventDefault(); // カーソルが文頭に移動するのを防止
            historyIndex++;
            chatIn.value = chatHistory[historyIndex];
        }
    } else if (e.key === 'ArrowDown') {
        if (historyIndex > 0) {
            e.preventDefault();
            historyIndex--;
            chatIn.value = chatHistory[historyIndex];
        } else if (historyIndex === 0) {
            historyIndex = -1;
            chatIn.value = ""; // 一番新しい位置に戻ったら空にする
        }
    }

    // 2. エンターキーが押され、かつ入力欄が空でない場合に実行
    // 🌟 修正：.trim() !== '' を削除し、スペースのみでも送信可能にしました
    if (e.key === 'Enter' && chatIn.value !== '') {
        const fullInputVal = chatIn.value; // 🌟 履歴保存用に現在の全入力を保持
        const val = chatIn.value.trim();

        // --- /emotion コマンドの処理部分 ---
        if (val.startsWith('/emotion')) {
            const args = val.split(' ');
            const emotionId = parseInt(args[1], 10);

            // 1〜8の有効な番号が指定されている場合
            if (emotionId >= 1 && emotionId <= 8) {
                if (typeof hero !== 'undefined') {
                    hero.emotionId = emotionId;
                    hero.emotionTimer = 180; // 🌟 追加：180フレーム（約3秒）表示するタイマー
                }
            } else if (args[1] === '0' || !args[1]) {
                // /emotion 0 または /emotion のみの場合は非表示にリセット
                if (typeof hero !== 'undefined') {
                    hero.emotionId = null;
                    hero.emotionTimer = 0; // 🌟 追加：タイマーもリセット
                }
            }

            chatHistory.unshift(fullInputVal);
            if (chatHistory.length > 20) chatHistory.pop();
            historyIndex = -1;

            chatIn.value = '';
            chatIn.focus();
            return;
        }
        // ------------------------------------------------------------------

        const hiddenInput = document.getElementById('chat-mode-value');
        const selectedValue = hiddenInput ? hiddenInput.value : 'all';

        let type = 'all';
        let targetName = '';
        let chatVal = chatIn.value;

        // --- 🌟 追加：発言を履歴に格納 ---
        chatHistory.unshift(fullInputVal); // 配列の先頭に追加
        if (chatHistory.length > 20) chatHistory.pop(); // 最大20件まで保持
        historyIndex = -1; // 参照位置をリセット

        // --- 送信モードの判定ロジック ---
        
        if (selectedValue === 'all') {
            // 全体チャット
            type = 'all';
        } else if (selectedValue === 'group') {
            // グループチャット
            type = 'group';
        } else if (selectedValue === 'friend') {
            // 🌟 友達チャット
            type = 'friend';
        } else if (selectedValue === 'whisper') {
            // 🌟 「内緒話(新規入力)...」が選ばれている場合
            const parts = chatVal.split(' ');
            if (parts.length >= 2) {
                targetName = parts[0];
                chatVal = parts.slice(1).join(' ');
                type = 'whisper';
            } else {
                alert("「相手の名前 メッセージ」と入力してください");
                return;
            }
        } else if (selectedValue.startsWith('whisper:')) {
            // 🌟 専用の「内緒話：名前」が選ばれている場合
            type = 'whisper';
            targetName = selectedValue.split(':')[1];
        }

        // 🌟【自分への内緒話を禁止するガード】
        if (type === 'whisper' && targetName === (typeof hero !== 'undefined' ? hero.name : "")) {
            alert("自分自身に内緒話は送れません！");
            chatIn.value = ''; // 入力内容をクリア
            return; 
        }

        // 3. サーバーへ送信
        socket.emit('chat', { 
            text: chatVal, 
            type: type, 
            targetName: targetName 
        });

        // 4. 入力欄をクリアしてフォーカスを維持
        chatIn.value = '';
        chatIn.focus();
    }
};

// ==========================================
// 💬 チャットモード変更処理 (オリジナルUI・深緑版)
// ==========================================

// --- チャットモード・カスタムメニューの開閉（プロ風アニメーション連動） ---
function toggleChatModeDropdown(event) {
    if (event) event.stopPropagation();

    // 感情ポップアップやステータス選択メニューが開いていれば閉じる（競合防止）
    const emotionPopup = document.getElementById('emotion-picker-popup');
    if (emotionPopup) emotionPopup.classList.remove('is-open');
    
    const statusOptions = document.getElementById('status-mode-options');
    const statusWrapper = document.getElementById('custom-status-mode');
    if (statusOptions) statusOptions.classList.remove('is-open');
    if (statusWrapper) statusWrapper.classList.remove('is-active');

    const wrapper = document.getElementById('custom-chat-mode');
    const options = document.getElementById('chat-mode-options');
    
    if (options && wrapper) {
        options.classList.toggle('is-open');
        wrapper.classList.toggle('is-active', options.classList.contains('is-open'));
    }
}

// --- チャットモードを選択したときの処理 ---
function selectChatMode(value, labelText) {
    const hiddenInput = document.getElementById('chat-mode-value');
    if (hiddenInput) {
        hiddenInput.value = value;
    }

    const label = document.getElementById('chat-mode-label');
    if (label) {
        label.textContent = labelText;
    }

    const options = document.getElementById('chat-mode-options');
    const wrapper = document.getElementById('custom-chat-mode');
    
    if (options) {
        options.classList.remove('is-open');
    }
    if (wrapper) {
        wrapper.classList.remove('is-active');
    }

    onChatModeChange(value);
}

// --- 💬 チャット送信先モード切替・UI更新処理 ---
function onChatModeChange(value) {
    const mode = value || (document.getElementById('chat-mode-value') ? document.getElementById('chat-mode-value').value : 'all');

    if (mode === 'whisper') {
        const overlay = document.getElementById('whisper-overlay');
        const input = document.getElementById('whisper-target-name');
        const error = document.getElementById('whisper-error');

        if (overlay && input) {
            overlay.style.display = 'block';
            input.value = ""; 
            input.style.border = "1px solid #2e7d32";
            if (error) error.innerText = ""; 
            input.focus(); 
        }
    }
}


// ==========================================
// 💬 ステータスモード変更処理（チャットモードと完全同期）
// ==========================================

// --- ステータス選択・カスタムメニューの開閉 ---
function toggleStatusModeDropdown(event) {
    if (event) event.stopPropagation();

    // 感情ポップアップやチャットモードメニューが開いていれば閉じる（競合防止）
    const emotionPopup = document.getElementById('emotion-picker-popup');
    if (emotionPopup) emotionPopup.classList.remove('is-open');
    
    const chatOptions = document.getElementById('chat-mode-options');
    const chatWrapper = document.getElementById('custom-chat-mode');
    if (chatOptions) chatOptions.classList.remove('is-open');
    if (chatWrapper) chatWrapper.classList.remove('is-active');

    const wrapper = document.getElementById('custom-status-mode');
    const options = document.getElementById('status-mode-options');
    
    if (options && wrapper) {
        options.classList.toggle('is-open');
        wrapper.classList.toggle('is-active', options.classList.contains('is-open'));
    }
}

// --- ステータスを選択したときの処理 ---
function selectPlayerStatus(value, labelText) {
    const hiddenInput = document.getElementById('status-mode-value');
    if (hiddenInput) {
        hiddenInput.value = value;
    }

    const label = document.getElementById('status-mode-label');
    if (label) {
        label.textContent = labelText;
    }

    const options = document.getElementById('status-mode-options');
    const wrapper = document.getElementById('custom-status-mode');
    
    if (options) {
        options.classList.remove('is-open');
    }
    if (wrapper) {
        wrapper.classList.remove('is-active');
    }

    // ステータス変更のサーバー送信等の反映
    if (typeof hero !== 'undefined' && hero) {
        hero.currentStatus = (value === '通常') ? '' : value;
        if (typeof socket !== 'undefined' && socket) {
            socket.emit('update_status', { status: hero.currentStatus });
        }
    }
}


// ==========================================
// 🌐 画面外クリック時の共通クローズ処理
// ==========================================
window.addEventListener('click', function(event) {
    // チャットモードメニューを閉じる判定
    const chatModeWrapper = document.getElementById('custom-chat-mode');
    const chatOptions = document.getElementById('chat-mode-options');
    if (chatOptions && chatOptions.classList.contains('is-open')) {
        if (!chatModeWrapper.contains(event.target)) {
            chatOptions.classList.remove('is-open');
            if (chatModeWrapper) chatModeWrapper.classList.remove('is-active');
        }
    }

    // ステータスモードメニューを閉じる判定
    const statusModeWrapper = document.getElementById('custom-status-mode');
    const statusOptions = document.getElementById('status-mode-options');
    if (statusOptions && statusOptions.classList.contains('is-open')) {
        if (!statusModeWrapper.contains(event.target)) {
            statusOptions.classList.remove('is-open');
            if (statusModeWrapper) statusModeWrapper.classList.remove('is-active');
        }
    }
});

// ============================================================
// :::SUBMIT_WHISPER_NAME::: 💬 内緒話の相手確定・宛先設定処理
// ============================================================
/**
 * 役割：
 * - 宛先名が正当か検証（空入力ガード、自己宛先禁止ガード）
 * - バリデーションエラー時のUI表示
 * - 宛先設定関数 `setWhisperTarget` の呼び出しとウィンドウのクローズ
 */
function submitWhisperName() {
    // ❌ 削除：const chatMode = document.getElementById('chat-mode'); （使われていないため削除）
    
    const nameInput = document.getElementById('whisper-target-name');
    const errorDiv = document.getElementById('whisper-error');
    const name = nameInput.value.trim();

    // 1. 空チェック
    if (!name) {
        if (errorDiv) errorDiv.innerText = "名前を入力してください";
        nameInput.style.border = "2px solid #ff5252";
        return;
    }

    // 2. 自分自身の名前チェック
    const myName = (typeof hero !== 'undefined' ? hero.name : "");
    if (name === myName) {
        if (errorDiv) errorDiv.innerText = "自分自身に内緒話は送れません";
        nameInput.style.border = "2px solid #ff5252";
        return;
    }

    // 自分以外なら、専用メニューを作る関数を呼び出す
    if (typeof setWhisperTarget === 'function') {
        setWhisperTarget(name);
    }
    
    closeWhisperWindow();
}

// ============================================================
// :::CLOSE_WHISPER_WINDOW::: 💬 内緒話UIの閉幕・モード復元処理
// ============================================================
/**
 * 役割：
 * - 内緒話入力ウィンドウ（オーバーレイ）の非表示化
 * - 選択モードの「全体チャット(all)」への安全な復元
 */
function closeWhisperWindow() {
    const overlay = document.getElementById('whisper-overlay');
    if (overlay) overlay.style.display = 'none';

    const hiddenInput = document.getElementById('chat-mode-value');
    
    // 入力せずに閉じた場合、モードを「全体(all)」に戻す
    if (hiddenInput && hiddenInput.value === 'whisper') {
        hiddenInput.value = 'all'; // 隠しデータの値をリセット
        
        // UIの表示ラベルも「全体」に戻す
        const label = document.getElementById('chat-mode-label');
        if (label) {
            label.textContent = '全体';
        }
    }
}

// ============================================================
// :::HANDLE_PLAYER_INPUT::: ⌨️ キー入力の集中管理・操作制御
// ============================================================
/**
 * 役割：
 * - チャット入力中かどうかの状態判定による操作ロック
 * - プレイヤー状態（伏せ等）の更新
 * - 移動・ハシゴ・アクション（ジャンプ・攻撃・アイテム取得）の処理振り分け
 */
function handlePlayerInput(hero, items, ladders, chatIn) {
    // A. チャット入力中は操作を無効化
    if (document.activeElement === chatIn) return;

    // B. 基本状態の更新（伏せ判定）
    hero.isDown = (!hero.climbing && !hero.jumping && keys['ArrowDown']);

    // C & D. 移動とハシゴの処理
    handleMovementAndLadder(hero, ladders);

    // E, F, G. アクションの処理（ジャンプ・攻撃・取得）
    handleActions(hero, items);
}

// ============================================================
// :::HANDLE_MOVEMENT_AND_LADDER::: 🏃 プレイヤーの移動・ハシゴ制御
// ============================================================
/**
 * 役割：
 * - 露店中・硬直中（Stun）の操作ガード
 *   （※有人露店中は移動禁止、無人露店中は移動許可）
 * - 左右移動の処理と伏せ状態の判定
 * - ハシゴの接触判定・中心への吸着・昇降ロジックの管理
 */
function handleMovementAndLadder(hero, ladders) {

    // 🌟 【修正】有人露店（player）を開いている間だけ移動・ハシゴ操作を禁止する
    // ※ 無人露店（monster）の場合は、店を出しながらでも自由に歩き回れます！
    if (hero.is_vending && hero.vending_mode === 'player') return;
	
    // 🌟 修正：硬直中（ノックバック中）は入力を受け付けない
    if (hero.isStunned) {
        // キー入力による水平速度をリセットし、以降の処理（移動・ハシゴ）をスキップ
        hero.vx = 0; 
        return; 
    }

    // 🌟 プレイヤー独自の speed（未設定なら GAME_SETTINGS.WALK_SPEED をフォールバック）を用いる
    const currentWalkSpeed = hero.speed !== undefined ? hero.speed : GAME_SETTINGS.WALK_SPEED;

    // 左右移動（ハシゴ中・伏せ中でない時）
    if (!hero.climbing && !hero.isDown) {
        if (keys['ArrowLeft']) {
            hero.updatePosition(-currentWalkSpeed, 0);
            hero.vx = -currentWalkSpeed;
        } else if (keys['ArrowRight']) {
            hero.updatePosition(currentWalkSpeed, 0);
            hero.vx = currentWalkSpeed;
        } else {
            hero.vx = 0;
        }
    } else {
        hero.vx = 0;
    }

    // 🪜 ハシゴ判定
    const l = (ladders && ladders.length > 0) ? ladders[0] : null;
    let isTouchingLadder = false;
    if (l) {
        const distX = Math.abs((hero.x + 30) - (l.x + 15));
        const isInsideY = (hero.y + 60 > l.y1 && hero.y < l.y2);
        if (distX < 20 && isInsideY) isTouchingLadder = true;
    }

    // ハシゴのてっぺん判定（即時関数ロジックを維持）
    const isAtLadderTop = (() => {
        if (!l) return false;
        const horizontalDiff = Math.abs((hero.x + 30) - (l.x + 15));
        const isHorizontalClose = horizontalDiff < 30;
        const verticalDiff = Math.abs((hero.y + 60) - l.y1);
        const isVerticalAtTop = verticalDiff < 20;
        return isHorizontalClose && isVerticalAtTop;
    })();

    // 🪜 ハシゴの昇降処理（Wキーおよび通常のSキー入力を外し、上下矢印キーを基本にする）
    if ((isTouchingLadder || isAtLadderTop) && ladderJumpTimer === 0) {
        // 🌟 キー条件から通常の KeyS を外し、ArrowUp / ArrowDown、もしくは「てっぺんでの KeyS」のみにする
        const isTriggerKey = keys['ArrowUp'] || keys['ArrowDown'] || (keys['KeyS'] && isAtLadderTop);

        if (isTriggerKey) {
            if (!hero.climbing && keys['KeyS'] && isAtLadderTop) {
                hero.y += 15;
            }
            hero.x = l.x + 15 - 30; // ハシゴの中心に吸着
            hero.climbing = true;
            hero.dy = 0;
            hero.jumping = false;

            if (keys['ArrowUp']) {
                hero.updatePosition(0, -GAME_SETTINGS.LADDER_SPEED);
            } else if (keys['ArrowDown'] || (keys['KeyS'] && isAtLadderTop)) {
                hero.updatePosition(0, GAME_SETTINGS.LADDER_SPEED);
            }
        } else if (hero.climbing) {
            hero.dy = 0;
            hero.updatePosition(0, 0); // 上下キーを離しているときはピタッと停止
        }
    } else {
        hero.climbing = false;
    }
}

// ============================================================
// 💡 ヘルパー関数：指定されたアクションキーが押されているかを判定
// ============================================================
function isActionPressed(actionName) {
    if (typeof window.keyMap === 'undefined') return false;

    for (const [keyName, mappedAction] of Object.entries(window.keyMap)) {
        if (mappedAction === actionName) {
            // keyName が大文字・小文字、あるいは 'KeyC' などの形式に対応
            const cleanKey = keyName.toLowerCase();
            
            // 押し状態を keys 配列からチェック（多様なフォーマットをカバー）
            if (
                keys[keyName] || 
                keys[cleanKey] || 
                keys[`Key${cleanKey.toUpperCase()}`] ||
                (cleanKey === 'space' && (keys['Space'] || keys[' ']))
            ) {
                return true;
            }
        }
    }
    return false;
}

// ============================================================
// :::HANDLE_ACTIONS::: ⚔️ アクション制御（ジャンプ・攻撃・回収・キーコンフィグ完全連動版）
// ============================================================
/**
 * 役割：
 * - ジャンプ：ハシゴからの飛び降りジャンプ、地面からのジャンプ処理（動的キー対応）
 * - 攻撃：キー押しっぱなしによる連続攻撃の開始処理（動的キー対応）
 * - 回収：Zキー押しっぱなしによるアイテムの高速回収処理（タイマー管理・動的キー対応）
 * - 状態ガード：有人露店中のみアクション不可（無人露店中はアクション可能）
 */
function handleActions(hero, items) {

    // 🌟 有人露店（player）を開いている間だけアクションを不可にする
    // ※ 無人露店（monster）の場合は、店番をモンスターに任せて自由にジャンプ・攻撃・回収ができます！
    if (hero.is_vending && hero.vending_mode === 'player') return;

    // 各アクションの判定を変数に保持（外出したヘルパー関数を利用）
    const jumpPressed = isActionPressed('jump');
    const attackPressed = isActionPressed('attack');
    const pickupPressed = isActionPressed('pickup');
	
    // ==========================================
    // E. ジャンプ (動的キー対応)
    // ==========================================
    if (jumpPressed) {
        const currentJumpPower = hero.jumpPower !== undefined ? hero.jumpPower : GAME_SETTINGS.JUMP_POWER;

        if (hero.climbing) {
            // ハシゴからの飛び降りジャンプ
            if (!cKeyPressed && (keys['ArrowLeft'] || keys['ArrowRight'])) {
                if (typeof playJumpSound === 'function') playJumpSound();
                ladderJumpTimer = 15;
                if (keys['ArrowLeft']) { hero.x -= 25; hero.dir = -1; }
                else { hero.x += 25; hero.dir = 1; }
                
                // 🌟 マイナスをつけて上方向に力を加える！
                hero.dy = -currentJumpPower;
                hero.jumping = true;
                hero.jumpFrame = 0;
                hero.climbing = false;
                cKeyPressed = true;
            }
        } else if (!hero.jumping && !cKeyPressed) {
            // 地面からの通常のジャンプ
            if (typeof playJumpSound === 'function') playJumpSound();
            hero.y -= 5;
            
            // 🌟 マイナスをつけて上方向に力を加える！
            hero.dy = -currentJumpPower;
            hero.jumping = true;
            hero.jumpFrame = 0;
            cKeyPressed = true;
        }
    } else {
        cKeyPressed = false;
    }

    // ==========================================
    // F. 攻撃 (動的キー対応)
    // ==========================================
    // 🌟 押しっぱなし対応：Playerクラス内部の攻撃中判定に任せて連続実行
    if (attackPressed) {
        hero.startAttack(); 
    }

    // ==========================================
    // G. アイテム取得 (動的キー対応)
    // ==========================================
    // 🌟 タイマー管理による「押しっぱなし高速取得」
    if (typeof window.zKeyTimer === 'undefined') window.zKeyTimer = 0;
    if (window.zKeyTimer > 0) window.zKeyTimer--; // 毎フレームカウントダウン

    if (pickupPressed) {
        if (window.zKeyTimer <= 0) {
            const target = items.find(it => {
                // 距離計算ロジックを維持 (hero.x + 30 はキャラ中心)
                const d = Math.sqrt(
                    Math.pow((hero.x + 30) - (it.x + 15), 2) + 
                    Math.pow((hero.y + 30) - (it.y + 15), 2)
                );
                return d < 45;
            });

            if (target) {
                socket.emit('pickup', target.id);
                // 🌟 取得間隔を「3」に設定（超高速）
                // 押しっぱなしで周囲のアイテムを次々と回収します
                window.zKeyTimer = 3; 
            }
        }
    }
}

// ============================================================
// :::SETUP_START_BUTTON_HOTKEY::: 🚀 名前入力欄のエンター送信設定
// ============================================================
/**
 * 役割：
 * - プレイヤーが名前を入力した際、エンターキーを押すだけで
 *   スタートボタンのクリック動作を誘発させる
 */
if (nameInput && startBtn) {
    nameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            startBtn.click(); // エンターが押されたら下のonclickを動かす
        }
    });
}

/*
startBtn.onclick = () => {
    // 名前が未入力の場合は "Guest" とする
    const userName = nameInput.value.trim() || "Guest";
    
    // 🌟 入力欄からフォーカスを外す（スマホのキーボードを閉じる効果もあります）
    nameInput.blur();

    // 1. ログイン画面（オーバーレイ）を非表示にする
    loginOverlay.style.display = 'none';

    // 2. 自分のキャラクター（ローカルの hero オブジェクト）に情報をセット
    if (typeof hero !== 'undefined') {
        hero.name = userName;
        
        // 🌟 追加：選んだチャンネルを自分のキャラデータにも保存
        hero.channel = selectedChannel; 
        
        // 🌟 追加：選択したグループ番号(0-15)を自分のデータにも反映
        // これにより、自分の画面に表示される自分の姿が選んだキャラになります
        hero.group = selectedGroup;
        hero.charVar = selectedCharVar; 
    }

    // 3. サーバーに参加を伝える
    // 🌟 修正ポイント：名前、チャンネル、そして選んだ「group (0-15)」をセットで送信
    // これにより、サーバー側のデフォルト設定（p.group = 7 など）を上書きし、
    // 他のプレイヤーの画面にも、あなたが選んだキャラが表示されるようになります。
    socket.emit('join', { 
        name: userName, 
        channel: selectedChannel,
        group: selectedGroup 
    });

    // 🌟 重要：ブラウザの音制限を解除するためにここで AudioContext を再開
    // これを行わないと、他人が入室した時の通知音がブロックされる可能性があります。
    if (typeof audioCtx !== 'undefined' && audioCtx.state === 'suspended') {
        audioCtx.resume().then(() => {
            console.log("AudioContext active.");
        });
    }
    
    // BGMの再生（定義されている場合）
    if (typeof playBGM === 'function') {
        playBGM();
    }

    // 4. ゲームのメインループを開始
    // すでにループが走っている場合の二重起動防止は、update関数の設計に依存します。
    if (typeof update === 'function') {
        update();
    }

    console.log(`[START] Player: ${userName}, Channel: ${selectedChannel}, Group: ${selectedGroup}`);
};
*/

// ==========================================
// 🔐 ネットワークフィード永続化＆管理システム
// ==========================================

// 1. ログのHTML要素を作るヘルパー関数
function createLogElement(message, type, timeStr) {
    const color = type === 'login' ? '#4CAF50' : '#ff6b6b';

    const newLog = document.createElement('div');
    newLog.setAttribute('data-log-type', type);
    newLog.style.cssText = `color: ${color}; display: flex; align-items: center; gap: 6px;`;
    newLog.innerHTML = `<span style="font-size: 9px; opacity: 0.7; font-family: monospace;">[${timeStr}]</span> ${message}`;
    
    return newLog;
}

// 2. 保存されているログを読み込んで画面に復元する関数
function loadSavedLogs() {
    const logContainer = document.getElementById('login-activity-log');
    if (!logContainer) return;

    const savedLogs = JSON.parse(localStorage.getItem('network_feed_logs') || '[]');

    // 既存の中身をクリアして、保存データを流し込む
    logContainer.innerHTML = '';

    savedLogs.forEach(logData => {
        const logElement = createLogElement(logData.message, logData.type, logData.timeStr);
        logContainer.appendChild(logElement);
    });
}

// 3. 画面にあるログをすべて集めて localStorage に保存する関数
function saveLogsToStorage() {
    const logContainer = document.getElementById('login-activity-log');
    if (!logContainer) return;

    const logsData = [];
    const logElements = logContainer.children;

    for (let el of logElements) {
        const text = el.innerText;
        const timeMatch = text.match(/\[(.*?)\]/);
        const timeStr = timeMatch ? timeMatch[1] : '00:00';
        const message = text.replace(/\[.*?\]\s*/, '');
        const type = el.getAttribute('data-log-type') || (el.style.color.includes('ff6b6b') ? 'logout' : 'login');

        logsData.push({ message, type, timeStr });
    }

    localStorage.setItem('network_feed_logs', JSON.stringify(logsData));
}

// 4. ログを追加して保存する関数
function addNetworkLog(message, type = 'login') {
    const logContainer = document.getElementById('login-activity-log');
    if (!logContainer) return;

    const now = new Date();
    const timeStr = now.toTimeString().slice(0, 5);

    const newLog = createLogElement(message, type, timeStr);
    newLog.style.opacity = '0';
    newLog.style.transform = 'translateY(-5px)';
    newLog.style.transition = 'all 0.3s ease';

    logContainer.insertBefore(newLog, logContainer.firstChild);

    setTimeout(() => {
        newLog.style.opacity = '1';
        newLog.style.transform = 'translateY(0)';
    }, 10);

    const logs = logContainer.children;
    if (logs.length > 20) {
        logContainer.removeChild(logs[logs.length - 1]);
    }

    saveLogsToStorage();
}


// ============================================================
// :::LOGIN_SYSTEM_INITIALIZER::: 🔐 ログイン＆登録システムの初期化
// ============================================================
const initLoginSystem = () => {
    const startBtn = document.getElementById('start-game-btn');
    const registerBtn = document.getElementById('register-btn');
    const nameInput = document.getElementById('user-name-input');
    const passwordInput = document.getElementById('user-pass-input');
    const loginError = document.getElementById('login-error');
    const logContainer = document.getElementById('login-activity-log'); // ログエリアの存在もチェック

    if (!startBtn || !registerBtn || !nameInput || !passwordInput || !logContainer) {
        setTimeout(initLoginSystem, 100);
        return;
    }

    // ★ここで要素が確実に見つかったタイミングで、保存されたログを画面に復元！
    loadSavedLogs();

    // --- 1. ログインボタンの処理 ---
    startBtn.onclick = () => {
        const userName = nameInput.value.trim();
        const password = passwordInput.value;

        if (!userName || !password) {
            if (loginError) {
                loginError.innerText = "名前とパスワードを入力してください";
                loginError.style.color = "#ff4444";
            }
            if (!userName) nameInput.style.border = "2px solid #ff4444";
            if (!password) passwordInput.style.border = "2px solid #ff4444";
            return;
        }

        nameInput.style.border = "1px solid #ccc";
        passwordInput.style.border = "1px solid #ccc";
        if (loginError) loginError.innerText = "";

        nameInput.blur();
        passwordInput.blur();
		
		localStorage.setItem('current_username', userName);
        
        // ネットワークフィードに自分のログインログを追加＆保存
        addNetworkLog(`${userName} がログインしました`, 'login');

        if (typeof socket !== 'undefined' && socket.connected) {
            socket.emit('login', { 
                username: userName, 
                password: password,
                channel: typeof selectedChannel !== 'undefined' ? selectedChannel : 1,
                group: typeof selectedGroup !== 'undefined' ? selectedGroup : 0, 
                charVar: typeof selectedCharVar !== 'undefined' ? selectedCharVar : 1
            });
            console.log("🚀 認証リクエスト送信... 名前:", userName);
        }
    };

    // --- 2. 新規登録ボタンの処理 ---
    registerBtn.onclick = () => {
        const userName = nameInput.value.trim();
        const password = passwordInput.value;

        const isNameInvalid = userName.length < 2 || userName.length > 6;
        const isPassInvalid = password.length < 4;

        if (isNameInvalid || isPassInvalid) {
            if (loginError) {
                loginError.innerText = "名前は2〜6文字、パスワードは4文字以上で入力してください";
                loginError.style.color = "#ff4444";
            }
            nameInput.style.border = isNameInvalid ? "2px solid #ff4444" : "1px solid #ccc";
            passwordInput.style.border = isPassInvalid ? "2px solid #ff4444" : "1px solid #ccc";
            return;
        }

        nameInput.style.border = "1px solid #ccc";
        passwordInput.style.border = "1px solid #ccc";
        if (loginError) loginError.innerText = "";

        console.log("新規登録リクエスト送信:", userName);
        socket.emit('register', { username: userName, password: password });
    };

    // --- 3. サーバーからの新規登録レスポンス ---
    if (!window.hasRegisteredListener) {
        window.hasRegisteredListener = true;
        socket.on('register_response', (data) => {
            if (!loginError) return;

            loginError.innerText = data.message;
            if (data.success) {
                loginError.style.color = "#00ffcc";
                loginError.innerText = "✨ 登録完了しました！下の「Login」ボタンを押してゲームを開始してください。";
                
                nameInput.style.border = "1px solid #ccc";
                passwordInput.style.border = "1px solid #ccc";

                if (startBtn) {
                    const originalBorder = startBtn.style.border;
                    const originalShadow = startBtn.style.boxShadow;
                    
                    startBtn.style.border = "2px solid #00ffcc";
                    startBtn.style.boxShadow = "0 0 12px rgba(0, 255, 204, 0.6)";
                    
                    setTimeout(() => {
                        startBtn.style.border = originalBorder;
                        startBtn.style.boxShadow = originalShadow;
                    }, 4000);
                }
            } else {
                loginError.style.color = "#ff4444";
                nameInput.style.border = "2px solid #ff4444";
                passwordInput.style.border = "1px solid #ccc";
            }
        });
    }

    // --- 4. Enterキー対応 ---
    const handleEnter = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            startBtn.onclick();
        }
    };
    passwordInput.onkeydown = handleEnter;
    nameInput.onkeydown = handleEnter;

    console.log("✅ ログイン・登録システムの初期化が完了しました");
};

// 実行開始
initLoginSystem();

// ============================================================
// :::SETUP_LOGIN_HOTKEY::: 🔑 パスワード入力欄のログイン・ショートカット
// ============================================================
/**
 * 役割：
 * - パスワード入力中にエンターキーが押された際、
 *   ログインボタン（startBtn）の処理を強制実行させる
 */
const passInputEl = document.getElementById('user-pass-input');
if (passInputEl) {
    passInputEl.onkeydown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            startBtn.onclick(); // ログインボタンの処理を実行
        }
    };
}

// ============================================================
// :::SETUP_NAME_INPUT_NAVIGATION::: 🚀 名前入力からパスワード欄への道案内
// ============================================================
/**
 * 役割：
 * - 名前入力後にエンターキーが押された際、
 *   パスワード入力欄へ自動的にフォーカスを移動させる
 */
if (nameInput) {
    nameInput.onkeydown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const pf = document.getElementById('user-pass-input');
            if (pf) pf.focus();
        }
    };
}

// ============================================================
// :::UPDATE_CHANNEL_UI::: 📺 チャンネルボタンの現在地UI更新
// ============================================================
/**
 * 役割：
 * - チャンネル選択ボタン群の状態（activeクラス）をリセット
 * - 現在のチャンネル番号と一致するボタンを検出し、強調表示させる
 */
function updateChannelUI(currentChannel) {
    const channelBox = document.querySelector('.channel-box');
    if (!channelBox) return;

    const buttons = channelBox.querySelectorAll('button');
    buttons.forEach(btn => {
        // ボタンの onclick 属性（例: "changeChannel(1)"）に現在のch番号が含まれるか確認
        const onclickText = btn.getAttribute('onclick');
        if (onclickText && onclickText.includes(`changeChannel(${currentChannel})`)) {
            btn.classList.add('active'); // 一致したら光らせる
        } else {
            btn.classList.remove('active'); // それ以外は消す
        }
    });
}

// ゲーム全体で共有するツールチップ用変数
window.currentHoverSlot = null; // 現在マウスが乗っているアイテム情報
window.rawMouseX = 0;           // ブラウザ上の生のマウスX
window.rawMouseY = 0;           // ブラウザ上の生のマウスY

// ------------------------------------------
// 🛡️ ツールチップ描画エンジン（左右100px・下部150px拡張・完全踏襲版）
// ------------------------------------------
let tooltipCtx = null;

// --- ⚙️ 調整用定数（ソース上で変更可能） ---
const sideMargin = 100;     // 🌟 左右の拡張分
const bottomMargin = 200;   // 🌟 下方向の拡張分
const SHOW_DEBUG = false;    // 🌟 trueでデバッグ表示ON / falseで非表示
// ----------------------------------------------

// ============================================================
// :::SET_MOUSE_TRACKING::: 🖱️ マウス座標のリアルタイム監視
// ============================================================
/**
 * 役割：
 * - 画面上のマウス位置（clientX/Y）を監視
 * - windowオブジェクトのグローバル変数として常に最新の座標を保持
 */
document.addEventListener('mousemove', (e) => {
    window.rawMouseX = e.clientX;
    window.rawMouseY = e.clientY;
});

// 画像オブジェクトのキャッシュ
const tooltipImageCache = {};

// ============================================================
// :::RENDER_TOOLTIP::: 💡 ツールチップの投影・レンダリング制御
// ============================================================
/**
 * 役割：
 * - ツールチップ用レイヤーの物理サイズ・解像度（DPR）の同期管理
 * - マウス座標の精密なスケーリングと原点補正
 * - ホバー中アイテムの画像キャッシュ解決と描画関数の呼び出し
 * - デバッグ用のUI範囲可視化機能
 */
function renderTooltip() {
    const tCanvas = document.getElementById('tooltip-layer');
    const stageCanvas = document.getElementById('stage');
    
    if (!tCanvas || !stageCanvas) return;
    
    tooltipCtx = tCanvas.getContext('2d');
    
    const baseWidth = 1200;
    const baseHeight = 690;

    // 🌟 拡張サイズの計算
    const extendedWidth = baseWidth + (sideMargin * 2);
    const extendedHeight = baseHeight + bottomMargin; // 下方向に150px拡張

    // 🌟 内部解像度（DPR 2倍想定）を同期
    const targetInternalWidth = extendedWidth * 2;
    const targetInternalHeight = extendedHeight * 2;

    if (tCanvas.width !== targetInternalWidth || tCanvas.height !== targetInternalHeight) {
        tCanvas.width = targetInternalWidth;
        tCanvas.height = targetInternalHeight;
    }

    // 🌟 配置修正
    if (tCanvas.parentElement !== stageCanvas.parentElement) {
        stageCanvas.parentElement.appendChild(tCanvas);
    }

    // 🌟 物理配置とサイズ設定
    tCanvas.style.zIndex = "2147483647"; 
    tCanvas.style.pointerEvents = "none";
    tCanvas.style.position = "absolute"; 
    tCanvas.style.top = "0px";           
    tCanvas.style.left = `-${sideMargin}px`; 
    tCanvas.style.width = `${extendedWidth}px`; 
    tCanvas.style.height = `${extendedHeight}px`; // 🌟 高さも拡張
    tCanvas.style.transform = "none";    
    tCanvas.style.margin = "0";

    tCanvas.style.border = SHOW_DEBUG ? "2px solid yellow" : "none"; 
    tCanvas.style.display = "block";
    tCanvas.style.visibility = "visible";

    // 🌟 描画スケーリングと原点補正
    tooltipCtx.setTransform(1, 0, 0, 1, 0, 0); 
    tooltipCtx.clearRect(0, 0, tCanvas.width, tCanvas.height); 
    
    tooltipCtx.scale(2, 2); 
    tooltipCtx.translate(sideMargin, 0);

    // --- デバッグ用の描画 ---
    if (SHOW_DEBUG) {
        tooltipCtx.fillStyle = "blue";
        tooltipCtx.fillRect(10, 10, 40, 40);

        // Stage範囲（本来の画面枠 800x600）を赤い線で可視化
        tooltipCtx.strokeStyle = "red";
        tooltipCtx.lineWidth = 1;
        tooltipCtx.strokeRect(0, 0, baseWidth, baseHeight);

        // 拡張した下部エリア（150px分）を緑の線で可視化
        tooltipCtx.strokeStyle = "green";
        tooltipCtx.strokeRect(0, baseHeight, baseWidth, bottomMargin);
    }

    // 座標計算
    const rect = tCanvas.getBoundingClientRect();
    
    // 🌟 画面伸縮率の算出（拡張後のサイズを基準にする）
    const scaleX = extendedWidth / (rect.width || extendedWidth);
    const scaleY = extendedHeight / (rect.height || extendedHeight);
    
    // 🌟 マウス座標を計算
    const canvasX = (window.rawMouseX - rect.left) * scaleX - sideMargin;
    const canvasY = (window.rawMouseY - rect.top) * scaleY;

    if (typeof window.rawMouseX !== 'undefined') {
        
        // 🌟 【全プロパティ手動流し込み & 画像解決】
        if (window.currentHoverSlot) {
            const item = window.currentHoverSlot;
            //const master = ITEM_MASTER[String(item.id)];
            
            //if (master) {
            //    Object.assign(item, master);
            //}

            const imgName = item.image_name || item.type || item.id;
            const imgPath = `${IMAGE_DOMAIN}item_assets/${imgName}.png`;

            if (!tooltipImageCache[imgPath]) {
                const img = new Image();
                img.src = imgPath;
                tooltipImageCache[imgPath] = img;
            }
            item.img = tooltipImageCache[imgPath]; 
        }

        if (SHOW_DEBUG) {
            tooltipCtx.beginPath();
            tooltipCtx.arc(canvasX, canvasY, 10, 0, Math.PI * 2); 
            tooltipCtx.fillStyle = "red";
            tooltipCtx.fill();

            tooltipCtx.fillStyle = "yellow";
            tooltipCtx.font = "bold 14px sans-serif"; 
            tooltipCtx.fillText(`(${Math.round(canvasX)},${Math.round(canvasY)})`, canvasX + 20, canvasY);
        }
        
        // 🌟 【本番描画】
        if (window.currentHoverSlot && typeof drawItemTooltip === 'function') {
            drawItemTooltip(tooltipCtx, window.currentHoverSlot, canvasX, canvasY, window.hero);
        }
    }
    
    requestAnimationFrame(renderTooltip);
}

// 描画開始
renderTooltip();

// ============================================================
// ファイルの最上部、あるいは関数定義の外側のスペース
// ============================================================

// 🌐 【グローバル設定】HTML上のUI要素上でもマウス座標を完全に追尾させる
if (!window._globalTooltipMouseListenerInitialized) {
    window._globalTooltipMouseListenerInitialized = true;
    document.addEventListener('mousemove', (e) => {
        if (window.hoveringSlot) {
            const gameCanvas = document.getElementById('game-canvas') || document.querySelector('canvas');
            let currentX, currentY;
            
            if (gameCanvas) {
                const rect = gameCanvas.getBoundingClientRect();
                currentX = e.clientX - rect.left;
                currentY = e.clientY - rect.top;
            } else {
                currentX = e.clientX;
                currentY = e.clientY;
            }

            window.mouseX = currentX;
            window.mouseY = currentY;
            if (typeof mouseX !== 'undefined') mouseX = currentX;
            if (typeof mouseY !== 'undefined') mouseY = currentY;
        }
    });
}

// ... 以降に各種関数 (openOtherPlayerVending や gameLoop など) が続く形 ...

// ============================================================
// :::AUTO_LOGIN_INIT::: 🔄 トークンによる自動ログイン試行
// ============================================================
/**
 * 役割：
 * - localStorageから `game_token` を読み取り
 * - トークンが存在する場合、サーバーへ `auto_login` を要求し、
 *   プレイヤーをログイン画面の手間なしにゲームへ復帰させる
 */
const savedToken = localStorage.getItem('game_token');
if (savedToken) {
    console.log("🔍 保存されたトークンを発見！自動ログインを試行します...");
    // サーバーへ自動ログインを依頼
    socket.emit('auto_login', { token: savedToken });
}

socket.on('player_update_godmode', (data) => {
    // 自分のプレイヤーオブジェクトに、受け取ったフラグを反映させる
    if (typeof hero !== 'undefined') {
        hero.isInvincible = data.isInvincible;
        console.log(`クライアント側：無敵状態を ${data.isInvincible} に同期しました`);
    }
});

// サーバーからスピード変更の通知を受け取ったら、自分の hero.speed を書き換える
socket.on('update_player_speed', (data) => {
    if (typeof hero !== 'undefined' && hero) {
        hero.speed = data.speed;
        console.log(`✨ クライアント側：スピードが ${data.speed} に同期されました！`);
    }
});

// サーバーからジャンプ力変更の通知を受け取る
socket.on('update_player_jump', (data) => {
    if (typeof hero !== 'undefined' && hero) {
        hero.jumpPower = data.jumpPower;
        console.log(`✨ クライアント側：ジャンプ力が ${data.jumpPower} に同期されました！`);
    }
});

// ============================================================
// :::ON_LOGIN_RESPONSE::: 🔑 ログイン認証応答・ゲーム開始・状態遷移
// ============================================================
/**
 * 役割：
 * - ログイン成功時のトークン保存と認証情報の同期
 * - 画面遷移（ログインUI非表示 → キャラ選択UI呼び出し）
 * - ステータス情報の更新（hp, mp, gold, level等）
 * - ゲーム開始時の `join` 通知とサウンド/ループ処理の起動（isGameStarted状態依存）
 * - ログイン失敗時のエラーUI表示とリトライ制御
 */
socket.on('login_response', (data) => {
    if (data.success) {
        //handleLoginSuccess(data);
    } else {
        handleLoginError(data.message);
    }
});

function handleLoginError(message) {
    const loginError = document.getElementById('login-error');
    const passwordInput = document.getElementById('user-pass-input');
    const nameInput = document.getElementById('user-name-input');

    if (loginError) {
        loginError.innerText = message || "ログインに失敗しました";
        loginError.style.color = "#ff4444";
    }
    
    // UIを赤枠にする
    if (nameInput) nameInput.style.border = "2px solid #ff4444";
    if (passwordInput) {
        passwordInput.style.border = "2px solid #ff4444";
        passwordInput.value = ""; // パスワードをクリア
        setTimeout(() => passwordInput.focus(), 10);
    }
}

function handleLoginSuccess(data) {
    // 1. トークン保存
    if (data.token) {
        localStorage.setItem('game_token', data.token);
    }

    myId = socket.id;
    
    // 2. UIリセット
    const loginError = document.getElementById('login-error');
    const passwordInput = document.getElementById('user-pass-input');
    const nameInput = document.getElementById('user-name-input');
    if (loginError) loginError.innerText = "";
    if (nameInput) nameInput.style.border = "1px solid #ccc";
    if (passwordInput) passwordInput.style.border = "1px solid #ccc";

    // 3. 画面遷移（キャラ選択）
    if (!window.isGameStarted) {
        const loginOverlay = document.getElementById('login-overlay');
        if (loginOverlay) loginOverlay.style.display = 'none';
        createCharSelector();
    }

    // 4. データ同期 (heroへの代入)
    if (typeof hero !== 'undefined') {
        hero.name = data.username;
        if (data.stats) {
            Object.assign(hero, {
                level: data.stats.level || 1,
                hp: data.stats.hp || 100,
                mp: data.stats.mp || 50,
                gold: data.stats.gold || 0,
                x: data.stats.x || 100,
                y: data.stats.y || 400,
                jobId: data.stats.job_id || 0
            });
        }
        hero.channel = data.channel || (typeof selectedChannel !== 'undefined' ? selectedChannel : 1);
        if (typeof updateChannelUI === 'function') updateChannelUI(hero.channel);
    }

    // 5. ゲーム開始後の処理
    if (window.isGameStarted) {
		// 2026-8-28停止
        //socket.emit('join', { name: data.username, channel: hero.channel, group: hero.group, x: hero.x, y: hero.y });
        socket.emit('get_account_info');

        if (typeof audioCtx !== 'undefined' && audioCtx.state === 'suspended') audioCtx.resume();		
        if (typeof playBGM === 'function') playBGM();
        if (typeof update === 'function') update();
    }
}

// :::ON_AUTH_RESPONSE::: 🔒 ログイン認証のみ（詳細データ未着）
socket.on('auth_response', (data) => {
    console.log("🔒 認証成功。キャラクター選択画面へ");
	
	//alert(data.model_id);
    
    // ログインパネルを隠す
    const loginOverlay = document.getElementById('login-overlay');
    if (loginOverlay) loginOverlay.style.display = 'none';

    // 🚀 【救出処理・同期】
    const tCanvas = document.getElementById('tooltip-layer');
    const stageCanvas = document.getElementById('stage');
    if (tCanvas && stageCanvas) {
        stageCanvas.parentElement.appendChild(tCanvas); 
    }

	if (data.model_id !== -1) {
        selectCharacterAndLogin(data.model_id, data.style_id);
    } else {
        // -1 なら選択画面を出す
        createCharSelector();
    }
	
    // キャラクター選択画面を呼び出す
    //createCharSelector();
});

window.isGameLoopRunning = false; // ループが動いているかを管理するフラグ

// ============================================================
// :::ON_LOGIN_DATA::: 🚀 本番ログインデータ受信・ゲーム開始・状態遷移
// ============================================================
socket.on('login_data', (data) => {

    // 💡 受信データ全体をログに出す
    console.log("📥 [Debug] 受信した login_data:", data);
    
    // 💡 特定のキーが存在するか確認してログに出す
    console.log("🔎 is_linked は含まれているか?:", 'is_linked' in data);
    console.log("🔎 is_online は含まれているか?:", 'is_online' in data);
    
    // 💡 もし含まれていなければ、送られてきた全キーをリストアップする
    if (!('is_linked' in data)) {
        console.warn("⚠️ 警告: is_linked が見当たりません。送られてきたキー一覧:", Object.keys(data));
    }

    console.log("🏁 [重要] login_data 到着:", data);
    
    // 💡 ログイン判定が完了したので、読み込みカバーを強制的に非表示にする
    const loadingCover = document.getElementById('loading-cover');
    if (loadingCover) loadingCover.style.display = 'none';

    const loginError = document.getElementById('login-error');
    const loginOverlay = document.getElementById('login-overlay');
    
    // 💡 ログイン失敗時の処理
    if (!data.success) {
        if (loginError) loginError.innerText = data.message;
        
        // 失敗した場合はログイン画面を再表示（CSSのimportantを上書き）
        if (loginOverlay) loginOverlay.style.setProperty('display', 'flex', 'important');
        
        // 不要になったトークンは削除
        localStorage.removeItem('game_token');
        return;
    }

    // 💡 トークン保存
    if (data.token) localStorage.setItem('game_token', data.token);
    myId = socket.id;

    // 💡 モデルIDが -1 以外なら選択画面をスキップして即開始
    if (data.stats && data.stats.model_id !== -1) {
        console.log("🌟 キャラクター選択済み (ModelID: " + data.stats.model_id + ")。自動開始します。");
        window.isGameStarted = true;
        selectedGroup = data.stats.model_id;
        selectedCharVar = data.stats.style_id;
        
        // ログインパネルを隠す（CSSのimportantを上書きして非表示）
        if (loginOverlay) loginOverlay.style.setProperty('display', 'none', 'important');
    } else {
        // キャラクター未選択の場合、ログインパネルは出したままにする
        console.log("👤 キャラクター選択が必要です。");
    }

    // 💡 hero やグローバルへのデータ退避
    const userName = data.username;
    if (typeof hero !== 'undefined') {
        hero.name = userName;
        
        // 🌟 サーバーから送られてきた連携・オンライン状態を即時反映
        hero.isLinked = data.is_linked;
        hero.isOnline = data.is_online;
        
        // 🌟 【追加】hero に人気度（popularity）を反映
        hero.popularity = data.popularity !== undefined ? data.popularity : (data.stats && data.stats.popularity !== undefined ? data.stats.popularity : 0);
        
        console.log("【ログイン処理】受け取ったデータ:", data);
        console.log("【ログイン処理】更新後のhero:", hero);
        
        // 描画ループが参照している players[socket.id] にも値をセットする
        if (typeof players !== 'undefined' && players[socket.id]) {
            players[socket.id].isLinked = data.is_linked;
            players[socket.id].isOnline = data.is_online;
            
            // 🌟 【追加】players[socket.id] にも人気度（popularity）を反映
            players[socket.id].popularity = hero.popularity;
            
            if (data.stats) {
                players[socket.id].speed = data.stats.speed || 5.0;
                players[socket.id].jumpPower = data.stats.jumpPower || 10.0;
                players[socket.id].atk = data.stats.atk || 13;
                players[socket.id].baseAtk = data.stats.baseAtk || 13;
                players[socket.id].weaponAtk = data.stats.weaponAtk || 0;
            }
            console.log("✅ players[socket.id] を同期しました:", players[socket.id].isLinked);
        }
        
        if (data.stats) {
            hero.level = data.stats.level || 1;
            hero.exp   = data.stats.exp || 0;
            hero.requiredExp = data.stats.requiredExp || 100; // 💡 次のレベルに必要な経験値
            hero.hp    = data.stats.hp || 100;
            hero.maxHp = data.stats.max_hp || 100;
            
            // 🌟 サーバーから送られてきたHP/MPのベース値とボーナス値を hero に反映
            hero.baseMaxHp = data.stats.baseMaxHp !== undefined ? data.stats.baseMaxHp : hero.maxHp;
            hero.bonusMaxHp = data.stats.bonusMaxHp !== undefined ? data.stats.bonusMaxHp : 0;

            hero.mp    = data.stats.mp || 50;
            hero.maxMp = data.stats.max_mp || 50;

            hero.baseMaxMp = data.stats.baseMaxMp !== undefined ? data.stats.baseMaxMp : hero.maxMp;
            hero.bonusMaxMp = data.stats.bonusMaxMp !== undefined ? data.stats.bonusMaxMp : 0;

            hero.gold  = data.stats.gold || 0;
            hero.x     = data.stats.x || 100;
            hero.y     = data.stats.y || 400;
            hero.jobId = data.stats.job_id || 0;
            
            // 🌟 サーバーから送られてきた攻撃力の詳細を hero に反映
            hero.atk = data.stats.atk || 13;
            hero.baseAtk = data.stats.baseAtk || 13;
            hero.weaponAtk = data.stats.weaponAtk || 0;

            // 🌟 サーバーから送られてきた移動速度とジャンプ力を hero に反映
            hero.speed = data.stats.speed || 5.0;
            hero.jumpPower = data.stats.jumpPower || 10.0;

            // 🌟 ログイン時にデータベースから素のステータスを受け取る
            hero.baseStr = data.stats.baseStr !== undefined ? data.stats.baseStr : (data.stats.str || 4);
            hero.baseDex = data.stats.baseDex !== undefined ? data.stats.baseDex : (data.stats.dex || 4);
            hero.baseLuk = data.stats.baseLuk !== undefined ? data.stats.baseLuk : (data.stats.luk || 4);
            hero.ap      = data.stats.ap !== undefined ? data.stats.ap : 0;

            // 🌟 装備品のボーナスを再計算して `〇〇(〇+〇)` の形式に反映させる関数を呼び出す
            if (typeof recalcPlayerStats === 'function') {
                recalcPlayerStats();
            } else {
                hero.str = hero.baseStr;
                hero.dex = hero.baseDex;
                hero.luk = hero.baseLuk;
            }
        }
        hero.channel = data.channel || 1;
        if (typeof updateChannelUI === 'function') updateChannelUI(hero.channel);
    }

    // 🌟 ゲーム開始処理
    if (window.isGameStarted) {
        socket.emit('join', { 
            name: userName, 
            channel: hero.channel,
            group: selectedGroup,
            charVar: selectedCharVar,
            x: hero.x,
            y: hero.y
        });
        
        socket.emit('get_account_info');
        
        // 🌟 ログインしてゲームが始まった瞬間にフレンドリストも要求する！
        socket.emit('get_friend_list');

        if (typeof audioCtx !== 'undefined' && audioCtx.state === 'suspended') audioCtx.resume();
        if (typeof playBGM === 'function') playBGM();

        // すでにループが動いていなければ、1回だけ起動する
        if (typeof update === 'function' && !window.isGameLoopRunning) {
            window.isGameLoopRunning = true; 
            update(); 
            console.log("✅ ゲームループを1回だけ起動しました");
        } else {
            console.log("⚠️ すでにループは動いています");
        }
        
        console.log("✅ ゲームセッションを開始しました");
    }

    // ==========================================
    // 🌟 ログイン時にキーコンフィグを復元する処理
    // ==========================================
    if (data.keyConfig) {
        currentKeyConfig = data.keyConfig;
        console.log("📂 サーバーからキーコンフィグを復元しました:", currentKeyConfig);
    } else if (data.stats && data.stats.keyConfig) {
        currentKeyConfig = data.stats.keyConfig;
        console.log("📂 サーバー(stats)からキーコンフィグを復元しました:", currentKeyConfig);
    }

    // 🔄 復元した設定をゲーム側の keyMap に即座に反映させる！
    if (typeof updateKeyMapFromConfig === 'function') {
        updateKeyMapFromConfig();
    }

    // もしキーコンフィグ画面のUIなどが定義されていれば再描画
    if (typeof renderKeyboard === 'function') {
        renderKeyboard();
    }
});

// ============================================================
// :::UPDATE_CHANNEL_BUTTONS::: 📺 チャンネルボタンのアクティブ表示管理
// ============================================================
/**
 * 役割：
 * - チャンネル選択ボタン群の `active` クラスをリセット
 * - `onclick` 属性に指定されたチャンネル番号と一致するボタンを検出し、
 *   現在選択中であることを示すために `active` クラスを付与する
 */
function updateChannelButtons(currentChannel) {
    const buttons = document.querySelectorAll('.channel-box button');
    buttons.forEach(btn => {
        // ボタンのテキスト（CH.1など）から数字を抽出、またはonclickの引数と比較
        if (btn.getAttribute('onclick') === `changeChannel(${currentChannel})`) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

// 3. 【新規】新規登録ボタンの処理（念のためここにも置いておきます）
/*
const regBtn = document.getElementById('register-btn');
if (regBtn) {
    regBtn.onclick = () => {
        const username = nameInput.value.trim();
        const password = document.getElementById('user-pass-input').value;

        if (username.length < 2 || password.length < 4) {
            alert("名前は2文字以上、パスワードは4文字以上で入力してください");
            return;
        }
        socket.emit('register', { username, password });
    };
}

socket.on('register_response', (data) => {
    alert(data.message);
    if (data.success) {
        document.getElementById('user-pass-input').value = "";
    }
});
*/

// 現在選ばれているチャンネル番号（初期値は1）
let selectedChannel = 1;

// ============================================================
// :::SELECT_CHANNEL::: 🌐 チャンネル選択のロジックとUI同期
// ============================================================
/**
 * 役割：
 * - 選択されたチャンネル番号を `selectedChannel` に保存
 * - UIのボタン群（.ch-btn）から既存の `active` クラスをリセット
 * - 選択されたチャンネルのボタンに `active` クラスを付与して強調表示
 */
function selectChannel(ch) {
    selectedChannel = ch;
    
    // 全ボタンから active クラスを消して、押されたボタンだけに付ける
    const buttons = document.querySelectorAll('.ch-btn');
    buttons.forEach((btn, index) => {
        if (index === ch - 1) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
	
	if (typeof playChannelSound === 'function') {
        playChannelSound();
    }
	
    console.log(`チャンネル ${selectedChannel} が選択されました`);
}

// ============================================================
// :::ON_CHANGE_CHANNEL_RESPONSE::: 📡 チャンネル移動後の世界同期処理
// ============================================================
/**
 * 役割：
 * - サーバーからの移動完了通知を受け取り、自身のチャンネル属性を更新
 * - 移動先の部屋にいる全プレイヤーリストを同期
 * - リスト更新の際、自分自身(socket.id)を除外（othersオブジェクトの再構築）
 */
socket.on('change_channel_response', (data) => {
    if (data.success) {
        // -------------------------------------------------------
        // 1. チャンネル情報の更新
        // -------------------------------------------------------
        hero.channel = data.channel;

        // -------------------------------------------------------
        // 2. 住人リストの同期（自分自身を除外して「お掃除」完了！）
        // -------------------------------------------------------
        // 🌟 住人リストを丸ごと入れ替える際、自分(socket.id)だけは
        // 描画対象（others）に入れないようにフィルタリングします
        others = {};
        if (data.roomPlayers) {
            for (let id in data.roomPlayers) {
                if (id !== socket.id) {
                    others[id] = data.roomPlayers[id];
                }
            }
        }

        console.log(`チャンネル ${data.channel} の住人と同期しました`, others);
    }
});

// game.js
/*
function changeChannel(newChannelId) {
    console.log(`チャンネル ${newChannelId} へ移動リクエスト中...`);
    
    // userIdを送らず、行きたいチャンネル番号だけ送る
    socket.emit('request_change_channel', {
        targetChannel: newChannelId
    });
}
*/

// ============================================================
// :::ON_PLAYER_MOVED_CHANNEL::: 📡 プレイヤーのチャンネル移動イベント処理
// ============================================================
/**
 * 役割：
 * - サーバーからのチャンネル移動通知を解析
 * - 自分自身（myId）の移動であれば、hero.channelの更新とothersのクリアを行う
 * - 他プレイヤーであれば、チャンネル情報を更新し、
 *   もし自分と同じチャンネルでなくなった場合はothers名簿から削除（お掃除）する
 */
socket.on('player_moved_channel', (data) => {
    console.log("【1.受信チェック】データが届きました:", data);
    const { userId, newChannel } = data;

    // 自分のID(myId)が何になっているか確認
    console.log(`【2.比較チェック】自分のID: ${myId} / 届いたID: ${userId}`);

    // もし myId が null だったり、数値の 10 だったりするとここで失敗します
    if (userId === myId) {
        if (typeof hero !== 'undefined') {
            hero.channel = newChannel;
            console.log("【3.更新完了】hero.channelを更新しました！現在の値:", hero.channel);
            
            // 🌟 自分が移動したなら、今までの部屋の住人(others)は見えなくなるべきなのでリセット
            others = {};
        } else {
            console.error("【エラー】heroという変数が見つかりません");
        }
    } else {
        console.log("【4.判定】自分以外の移動通知なので、自分のhero.channelは更新しません");
    }
    
    // -------------------------------------------------------
    // 5. 他のプレイヤー(others)の名簿を更新・お掃除
    // -------------------------------------------------------
    if (typeof others !== 'undefined' && others[userId]) {
        // データの更新自体は行う
        others[userId].channel = newChannel;

        // 🌟 もし移動先のチャンネルが「自分と同じ」でないなら、画面から消去する！
        if (newChannel !== hero.channel) {
            delete others[userId];
            console.log(`【5.お掃除】別の部屋へ行ったプレイヤー(${userId})を名簿から削除しました`);
        }
    }
});

// ============================================================
// :::CHANGE_CHANNEL::: 🔄 チャンネル切り替え処理の司令塔
// ============================================================
/**
 * 役割：
 * - 既に現在のチャンネルと同じ場合は処理を中断（ガード節）
 * - 移動先のチャンネルに切り替える前に、古い露店リストをクリアする
 * - サーバーへ移動リクエストを送信
 * - チャンネルボタンのUIを即座に更新
 * - heroのチャンネル情報を最新化
 */
function changeChannel(number) {
    // 🌟 1. すでにそのチャンネルにいる場合は何もしない（無駄な通信を防ぐ）
    if (typeof hero !== 'undefined' && hero.channel === number) {
        console.log(`すでに CH.${number} に接続しています。`);
        return;
    }

    console.log(`チャンネル ${number} へ移動中...`);
	
    if (typeof playChannelSound === 'function') {
        playChannelSound();
    }

    // 🌟 1.5. 【超重要】チャンネルを切り替える前に、画面上の露店リスト（activeOfflineShops）を一度完全クリアする！
    if (typeof activeOfflineShops !== 'undefined') {
        activeOfflineShops.length = 0; // 配列を空にして前チャンネルの露店残骸を一掃
        console.log("🧹 チャンネル移動のため、画面上の露店リスト（activeOfflineShops）をクリアしました。");
    }

    // 🌟 2. サーバーに移動リクエストを送る
    socket.emit('change_channel', { newChannel: number });

    // 🌟 3. UI（ボタンの見た目）を即座に更新する
    // これにより、クリックした瞬間にボタンが黄色く光ります
    updateChannelUI(number);

    // 🌟 4. キャラクターの保持しているチャンネル情報を更新
    if (typeof hero !== 'undefined') {
        hero.channel = number;
    }
}

/*
// サーバーからの応答を受け取った時の処理
socket.on('change_channel_response', (data) => {
    if (data.success) {
        hero.channel = data.channel; // 自分のチャンネル情報を更新
        
        // 画面上の他プレイヤーを一旦全員消去する（別の部屋の人たちなので）
        others = {}; 
        
        console.log(`チャンネル ${data.channel} に切り替わりました！`);
    }
});
*/

/*
socket.on('player_joined', (newPlayerData) => {
    console.log("新入りのID:", newPlayerData.id, "自分のID:", myId); // 🌟ここをチェック！
    if (newPlayerData.id === myId) return;
    
    others[newPlayerData.id] = newPlayerData;
    console.log("現在の全プレイヤーリスト:", others);
});
*/

// ============================================================
// :::REGISTER_AND_LOAD_PLAYER::: 👤 プレイヤーの新規登録と画像プリロード
// ============================================================
/**
 * 役割：
 * - プレイヤーデータを others オブジェクトへ登録
 * - 描画に必要な外見グループ(g)とバリエーション(v)を判定
 * - キャラクターの描画フレームを先行してロードし、描画準備を整える
 */
function registerAndLoadPlayer(playerData) {
    // 1. others に登録
    others[playerData.id] = playerData;

    // 🌟 2. 重要！その人の見た目(g, v)をロードしておく
    // これにより getPlayerCurrentImg の中で playerSprites[g][v] が使えるようになります
    if (playerData.group !== undefined && playerData.charVar !== undefined) {
        loadCharFrames(playerData.group, playerData.charVar);
    }
}

// ============================================================
// :::ON_PLAYER_JOINED::: 🔔 新規プレイヤー参加の受信処理
// ============================================================
/**
 * 役割：
 * - サーバーから送られてきた「プレイヤーが参加した」という通知を受信
 * - 登録と画像ロードの専用窓口（:::REGISTER_AND_LOAD_PLAYER:::）を呼び出し、
 *   新しい旅人をスムーズに迎え入れる
 */
socket.on('player_joined', (data) => {
    console.log(data.name + "が来たので画像をロードします");
    registerAndLoadPlayer(data);
});

// ============================================================
// :::ON_CHANGE_CHANNEL_RESPONSE::: 📡 チャンネル移動後の世界再構築
// ============================================================
/**
 * 役割：
 * - チャンネル移動成功時、旧世界の住人名簿（others）を全クリア
 * - 新しい世界の住人リスト（data.roomPlayers）を走査
 * - 各プレイヤーに対し、個別の登録・画像ロード準備処理を適用
 */
socket.on('change_channel_response', (data) => {
    if (data.success) {
        others = {}; // 一旦クリア
        for (let id in data.roomPlayers) {
            registerAndLoadPlayer(data.roomPlayers[id]);
        }
    }
});

// ============================================================
// 📡 [SECTION 6: NETWORK] 通信ハンドラ (Socket.io)
// 役割: サーバーへのデータ送信(emit)と、サーバーからの受信(on)
// ============================================================
// ============================================================
// :::ON_SERVER_STATE::: 🌐 サーバーからの世界状態同期・詳細救出
// ============================================================
/**
 * 役割：
 * - サーバーからの最新状態（state）を受信・反映
 * - チャンネル移動・アイテムドロップ音の判定処理
 * - プレイヤー入室通知の判定と管理（ピンク吹き出し連動）
 * - 周辺環境（others, enemies, platforms等）のチャンネル別フィルタリング
 * - 🛡️ 重要：アイテム詳細消失対策（旧データとのマージによる復元）
 * - heroへの最終的なプロパティ同期と描画バッファの更新
 */
socket.on('state', (data) => {
    // -------------------------------------------------------
    // 1. 基本チェックと共通処理
    // -------------------------------------------------------
    if (!data) return;
    
    // 既存のサーバーイベントハンドラ（必要に応じて実行）
    if (typeof handleServerEvents === 'function') handleServerEvents(data);

    // -------------------------------------------------------
    // 2. 自分のデータ（myData）の特定とチャンネル判定
    // -------------------------------------------------------
    const myHeroData = data.players[socket.id];
    if (!myHeroData) return;

    const serverChannel = myHeroData.channel;

    // -------------------------------------------------------
    // 3. 音・通知の判定（チャンネル・アイテム・入室）
    // -------------------------------------------------------
    const allItemsFromServer = data.items || [];
    const currentTotalCount = allItemsFromServer.length;
    let isChannelJustChanged = false;

    // チャンネル切り替え・アイテムドロップ音判定
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

    // 他プレイヤーの入室通知・入室音判定
    const currentPlayerIdsInMyChannel = new Set();
    let hasNewArrival = false;
    let arrivalPlayerName = "";
    
    for (let id in data.players) {
        if (id === socket.id) continue;
        const p = data.players[id];
        if (p.channel === serverChannel) {
            currentPlayerIdsInMyChannel.add(id);
            if (!window.prevPlayerIds.has(id)) {
                if (!isChannelJustChanged && !window.recentLoginIds.has(id)) {
                    hasNewArrival = true;
                    arrivalPlayerName = p.name || "Player";
                    
                    // 🌟 メイプル風ピンクの吹き出し通知へ反映
                    const popup = document.getElementById('maple-popup-bubble');
                    const popupText = document.getElementById('maple-popup-text');
                    if (popup && popupText) {
                        popupText.textContent = `${arrivalPlayerName} 様と同じチャンネルです。`;
                        popup.style.display = 'block';
                    }

                    // 念のため右下ログにも残す場合
                    if (typeof addNotification === 'function') {
                        addNotification(`${arrivalPlayerName} が入室しました。`, "#66FF66");
                    }
                }
            }
        }
    }
    if (hasNewArrival && !isChannelJustChanged) {
        if (typeof playInviteSound === 'function') playInviteSound();
        
        // 🌟 赤い丸インジケーターも軽く反応させる
        const alertDot = document.getElementById('maple-notice-dot');
        if (alertDot) {
            alertDot.style.boxShadow = '0 0 10px #ff2222, 0 0 4px #ffffff';
            setTimeout(() => {
                alertDot.style.boxShadow = '0 0 5px #ef4444';
            }, 600);
        }
    }
    window.prevPlayerIds = currentPlayerIdsInMyChannel;

    // -------------------------------------------------------
    // 4. 周辺環境（自分以外）のフィルタリング更新
    // -------------------------------------------------------
    //enemies   = data.enemies;   
    platforms = data.platforms; 
    ladders   = data.ladders;   

    // 他プレイヤー情報（同チャンネルのみ）
    others = {}; 
    for (let id in data.players) {
        if (id !== socket.id && data.players[id].channel === serverChannel) {
            others[id] = data.players[id];
        }
    }

    // -------------------------------------------------------
    // 5. アイテムのガタつき防止（既存アニメ状態の維持）
    // -------------------------------------------------------
    items = allItemsFromServer.filter(it => !it.isPickedUp).map(si => { 
        const existing = items.find(it => it.id === si.id); 
        return existing ? existing : si; 
    });

    // -------------------------------------------------------
    // 6. 🛡️ 重要：詳細消失対策（インベントリと店名の保護）
    // -------------------------------------------------------
    // 上書きされる前のデータを退避
    const oldInventory = (window.hero && window.hero.inventory) ? JSON.parse(JSON.stringify(window.hero.inventory)) : [];
    const oldVendingTitle = (window.hero && window.hero.vending_title) ? window.hero.vending_title : "";

    // A. 露店タイトルの保護（サーバーから届いた値が空なら以前の値を維持）
    if (!myHeroData.vending_title && oldVendingTitle) {
        myHeroData.vending_title = oldVendingTitle;
    }

    // 🌟 【超重要ガード】今まさに整理中（ガード中）であれば、サーバー側の古いインベントリで上書きさせない！
    if (typeof isOrganizingGuard !== 'undefined' && isOrganizingGuard) {
        console.log("🛡️ [State Guard] 整理ガード中のため、サーバーからの古いインベントリ上書きをスキップします。");
        if (window.hero && window.hero.inventory) {
            myHeroData.inventory = window.hero.inventory;
        }
    } else {
        // B. インベントリの詳細項目復元（通常時）
        if (myHeroData.inventory && Array.isArray(myHeroData.inventory)) {
            myHeroData.inventory.forEach((newItem) => {
                if (!newItem) return;

                const newKey = newItem.equipment_id || newItem.instanceId;
                const oldItem = oldInventory.find(old => {
                    if (!old) return false;

                    const oldKey = old.equipment_id || old.instanceId;
                    const isIdMatch = (newKey && oldKey && String(newKey) === String(oldKey));
                    const isSlotMatch = (newItem.slot_index === old.slot_index && newItem.id === old.id);
                    return isIdMatch || isSlotMatch;
                });

                if (oldItem) {
                    const isDataLost = (typeof newItem.totalALLStats === 'undefined' || newItem.totalALLStats === 0);
                    if (isDataLost && oldItem.totalALLStats > 0) {
                        const props = [
                            'name', 'displayName', 'imageName', 'atk', 'matk', 'def',
                            'str', 'dex', 'int', 'luk', 'maxHp', 'maxMp', 
                            'totalFirstStats', 'totalALLStats'
                      ];
                      props.forEach(p => {
                          if (newItem[p] === undefined || newItem[p] === 0 || newItem[p] === "") {
                              newItem[p] = oldItem[p];
                          }
                      });
                      if (!newItem.instanceId && oldItem.instanceId) newItem.instanceId = oldItem.instanceId;
                      if (!newItem.equipment_id && oldItem.equipment_id) newItem.equipment_id = oldItem.equipment_id;
                      if (!newItem.type && oldItem.type) newItem.type = oldItem.type;
                      console.log(`🔧 Slot:${newItem.slot_index} (ID:${newKey}) の詳細を救出しました`);
                  }
              }
          });
      }
    }

    // -------------------------------------------------------
    // 7. 最終同期（window.hero の更新）
    // -------------------------------------------------------
    hero.inventory       = myHeroData.inventory || [];
    hero.gold            = (myHeroData.gold !== undefined) ? myHeroData.gold : hero.gold;
    hero.score           = myHeroData.score || 0;
    hero.channel         = myHeroData.channel;
    hero.level           = myHeroData.level;
    hero.exp             = myHeroData.exp;
    hero.maxExp          = myHeroData.maxExp || 100;
    hero.requiredExp     = myHeroData.requiredExp || hero.requiredExp || 100; // 💡 追加：必要経験値の同期
    hero.hp              = myHeroData.hp;
	
	// 🌟 ここにアニマル（model_id）の同期を追加！
	// 🌟 修正後： サーバーから届いた値が undefined でない時だけ上書きし、無い時は今の値を維持する
    if (myHeroData.model_id !== undefined && myHeroData.model_id !== null) {
        hero.model_id = myHeroData.model_id;
    }

	// 停止 2026-9-24
	//console.log("サーバーから届いた model_id:", myHeroData.model_id);
	
    // 🌟 1. まずインベントリから「各種ステータスボーナスおよびHP/MP装備ボーナス」を正確に集計する
    let bonusStr = 0;
    let bonusDex = 0;
    let bonusLuk = 0;
    let bonusInt = 0;
    let totalWeaponAtk = 0; // 💡 追加：装備による武器攻撃力の集計
    let bonusMaxHp = 0;     // 🌟 追加：装備によるHPボーナスの集計
    let bonusMaxMp = 0;     // 🌟 追加：装備によるMPボーナスの集計

    if (hero.inventory && Array.isArray(hero.inventory)) {
        hero.inventory.forEach(item => {
            if (item && item.isEquipped) {
                bonusStr += item.str || 0;
                bonusDex += item.dex || 0;
                bonusLuk += item.luk || 0;
                bonusInt += item.int || 0;
                totalWeaponAtk += Number(item.atk) || Number(item.power) || 0; // 💡 武器攻撃力を加算
                bonusMaxHp += Number(item.maxHp) || Number(item.hp) || 0;     // 🌟 HPボーナスを加算
                bonusMaxMp += Number(item.maxMp) || Number(item.mp) || 0;     // 🌟 MPボーナスを加算
            }
        });
    }

    // 画面表示用のボーナス値にセット
    hero.bonusStr = bonusStr;
    hero.bonusDex = bonusDex;
    hero.bonusLuk = bonusLuk;
    hero.bonusInt = bonusInt;
    hero.weaponAtk = totalWeaponAtk; // 💡 武器攻撃力ボーナスをセット
    hero.bonusMaxHp = bonusMaxHp;    // 🌟 HPボーナスをセット
    hero.bonusMaxMp = bonusMaxMp;    // 🌟 MPボーナスをセット

    // 🌟 2. サーバーから届いた値（ベース値または合計値）を安全に保持
    const rawStr = (myHeroData.str !== undefined) ? myHeroData.str : (hero.str || 50);
    const rawDex = (myHeroData.dex !== undefined) ? myHeroData.dex : (hero.dex || 0);
    const rawLuk = (myHeroData.luk !== undefined) ? myHeroData.luk : (hero.luk || 0);
    const rawInt = (myHeroData.int !== undefined) ? myHeroData.int : (hero.int || 0);
    const rawAtk = (myHeroData.atk !== undefined) ? myHeroData.atk : (hero.atk || 13); // 💡 サーバからの合計ATK
    const rawMaxHp = (myHeroData.maxHp !== undefined) ? myHeroData.maxHp : (myHeroData.max_hp !== undefined ? myHeroData.max_hp : (hero.maxHp || 100));
    const rawMaxMp = (myHeroData.maxMp !== undefined) ? myHeroData.maxMp : (myHeroData.max_mp !== undefined ? myHeroData.max_mp : (hero.maxMp || 50));

    // 🌟 3. ステータスおよびHP/MPのベース値と合計値を正確に同期・逆算
    hero.str = rawStr;
    hero.baseStr = Math.max(0, rawStr - bonusStr);

    hero.dex = rawDex;
    hero.baseDex = Math.max(0, rawDex - bonusDex);

    hero.luk = rawLuk;
    hero.baseLuk = Math.max(0, rawLuk - bonusLuk);

    hero.int = rawInt;
    hero.baseInt = Math.max(0, rawInt - bonusInt);

    // 💡 攻撃力の逆算と反映
    hero.atk = rawAtk;
    hero.baseAtk = (myHeroData.baseAtk !== undefined) ? myHeroData.baseAtk : Math.max(13, rawAtk - totalWeaponAtk);

    // 💡 HP/MPのベース値と合計値の反映・逆算
    hero.baseMaxHp = (myHeroData.baseMaxHp !== undefined) ? myHeroData.baseMaxHp : Math.max(10, rawMaxHp - bonusMaxHp);
    hero.maxHp = hero.baseMaxHp + bonusMaxHp;

    hero.baseMaxMp = (myHeroData.baseMaxMp !== undefined) ? myHeroData.baseMaxMp : Math.max(10, rawMaxMp - bonusMaxMp);
    hero.maxMp = hero.baseMaxMp + bonusMaxMp;

    hero.ap              = (myHeroData.ap !== undefined) ? myHeroData.ap : 0;

    // ✨ 🌟 露店状態と店名をここで最終確定
    hero.is_vending      = !!myHeroData.is_vending; 
    hero.vending_title = myHeroData.vending_title || ""; 

    // グローバル変数全体を最新に
    window.hero = hero;

    // 描画バッファの更新
    if (typeof inventoryVisualBuffer !== 'undefined') {
        inventoryVisualBuffer = window.hero.inventory;
    }
});

// サーバーから新しいインベントリを受け取って画面を更新する
socket.on('updateInventory', (newInventory) => {
    if (window.hero) {
        window.hero.inventory = newInventory;
    }
    if (typeof inventoryVisualBuffer !== 'undefined') {
        inventoryVisualBuffer = newInventory;
    }
    console.log("🎒 インベントリが更新されました！", newInventory);
    
    // もし画面のインベントリUIを再描画する関数（例: drawInventoryやrenderInventoryなど）があればここで呼ぶ
    // if (typeof renderInventory === 'function') renderInventory();
});

// ============================================================
// :::ON_PLAYER_UPDATE::: 💰 プレイヤー個別のステータス・所持金更新
// ============================================================
/**
 * 役割：
 * - サーバーからのプレイヤー個別更新通知を受信
 * - 自分のID(socket.id)と一致する場合、hero オブジェクトの値を最新化
 * - ショップ画面などのUIにある所持金表示を `toLocaleString()` を使って綺麗に更新
 */
socket.on('player_update', (updatedPlayer) => {
    // 1. 自分の情報の時だけ hero 変数を更新
    if (updatedPlayer.id === socket.id) {
        // hero.js や view.js で使っている変数 hero を更新
        hero.gold = updatedPlayer.gold; 
        
        // 🌟 ショップが開いているなら、所持金表示を最新にする
        const goldDisplay = document.getElementById('shop-user-gold');
        if (goldDisplay) {
            // 引数名の updatedPlayer.gold を使います
            goldDisplay.innerText = updatedPlayer.gold.toLocaleString();
        }
    }
});

// ============================================================
// :::ON_DAMAGE_EFFECT::: 💥 ダメージ数値・演出の生成処理
// ============================================================
/**
 * 役割：
 * - サーバーからのダメージ通知（位置、値、クリティカル判定など）を受信
 * - 演出用配列 `damageTexts` に新しいエフェクトオブジェクトを生成
 * - クリティカル判定やダメージの種類に応じた挙動の初期化
 */
socket.on('damage_effect', data => {
  damageTexts.push({ x: data.x + (Math.random()*20-10), y: data.y, val: data.val, timer: 40, vy: data.type === 'player_hit' ? -3 : -2, isCritical: data.isCritical, type: data.type });
});

// ============================================================
// :::ON_LEVEL_UP_EFFECT::: 🎊 レベルアップ祝賀演出の管理
// ============================================================
/**
 * 役割：
 * - サーバーからのレベルアップ通知を受信
 * - 祝賀サウンドの再生（playLevelUpSound）
 * - 画面上の演出用リスト `levelUpEffects` へのデータ登録
 */
socket.on('level_up_effect', (data) => {
    // 1. 音を鳴らす
    if (typeof playLevelUpSound === 'function') {
        playLevelUpSound();
    }

    // 2. 文字表示用のデータをリストに追加する
    // data.playerId が送られてくる想定です
    if (data && data.playerId) {
        levelUpEffects.push({
            playerId: data.playerId,
            timer: 120 // 表示時間
        });
    }

    console.log("🎊 レベルアップ演出（音と文字の準備）を実行しました");
});

// ============================================================
// :::ON_CHAT::: 💬 チャットログ・吹き出しの受信管理（全デザイン統一版）
// ============================================================
socket.on('chat', data => {
  const msgBox = document.getElementById('msg-box');
  if (!msgBox) return;

  // 🌟 1. サーバーからのデバッグ・システムログ（id: 'SYSTEM_LOG'）の処理
  if (data.id === 'SYSTEM_LOG') {
    const badgeText = data.name || '🤖 SYSTEM';
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'system-message-row';
    messageDiv.style.cssText = `
        display: flex;
        align-items: baseline;
        gap: 6px;
        margin: 3px 0;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        font-size: 12px;
        line-height: 1.4;
        word-break: break-all;
    `;

    // タイムスタンプ要素（統一デザイン）
    const timeSpan = document.createElement('span');
    const timeStr = data.time ? `[${data.time}]` : `[${new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}]`;
    timeSpan.innerText = timeStr;
    timeSpan.style.cssText = `
        color: #64748b;
        font-size: 11px;
        font-family: monospace;
        flex-shrink: 0;
    `;

    // システムバッジ要素
    const badgeSpan = document.createElement('span');
    badgeSpan.innerText = badgeText;
    badgeSpan.style.cssText = `
        background: rgba(250, 204, 21, 0.15);
        color: #fde047;
        border: 1px solid rgba(250, 204, 21, 0.4);
        padding: 1px 4px;
        border-radius: 3px;
        font-size: 10px;
        font-weight: bold;
        flex-shrink: 0;
    `;

    // メッセージ本文要素
    const textSpan = document.createElement('span');
    textSpan.innerHTML = data.text; 

    messageDiv.appendChild(timeSpan);
    messageDiv.appendChild(badgeSpan);
    messageDiv.appendChild(textSpan);

    msgBox.appendChild(messageDiv);
    msgBox.scrollTop = msgBox.scrollHeight;

    while (msgBox.children.length > 100) {
        msgBox.removeChild(msgBox.firstChild);
    }
    return;
  }

  // --- 2. 通常のプレイヤーチャット / 友達 / グループ / 内緒話の処理 ---
  const messageDiv = document.createElement('div');
  messageDiv.style.cssText = `
      display: flex;
      align-items: baseline;
      gap: 6px;
      margin: 3px 0;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 12px;
      line-height: 1.4;
      word-break: break-all;
  `;

  // 🌟 統一されたタイムスタンプ要素
  const timeSpan = document.createElement('span');
  const timeStr = data.time ? `[${data.time}]` : `[${new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}]`;
  timeSpan.innerText = timeStr;
  timeSpan.style.cssText = `
      color: #64748b;
      font-size: 11px;
      font-family: monospace;
      flex-shrink: 0;
  `;

  // 🌟 色とタイプの判定
  let color = '#ffffff'; 
  if (data.type === 'group') color = '#ff80ff';   // グループ（ピンク）
  if (data.type === 'system') color = '#ffff99';  // システム（黄色）
  if (data.type === 'friend') color = '#ff9900';  // 友達（オレンジ）
  
  const isWhisper = data.type === 'whisper' || data.isWhisper;
  if (isWhisper) {
      color = data.color || '#00ff00'; // 内緒話（緑）
  }

  const isSystem = data.type === 'system';
  const separator = isWhisper ? '' : ':';

  // 🌟 名前部分の構築
  const nameSpan = document.createElement('strong');
  nameSpan.style.cssText = `color: ${color}; ${isWhisper ? 'font-weight: bold;' : ''}`;
  if (!isSystem) {
      nameSpan.style.cursor = 'pointer';
      nameSpan.onclick = () => setWhisperTarget(data.name.replace(/\s*\[CH\.\d+\].*$/, '').trim());
  }
  nameSpan.innerText = `${data.name}${separator}`;

  // 🌟 メッセージ本文の構築
  const textSpan = document.createElement('span');
  textSpan.style.cssText = `color: ${color}; ${isWhisper ? 'font-weight: bold;' : ''}`;
  textSpan.innerText = data.text;

  // 要素を組み立てて追加
  messageDiv.appendChild(timeSpan);
  messageDiv.appendChild(nameSpan);
  messageDiv.appendChild(textSpan);

  msgBox.appendChild(messageDiv);
  msgBox.scrollTop = msgBox.scrollHeight;

  // メモリ保護（100件制限）
  while (msgBox.children.length > 100) {
      msgBox.removeChild(msgBox.firstChild);
  }

  // --- 3. 頭上の吹き出し表示の判定 ---
  if (isWhisper || data.type === 'group' || data.type === 'friend') {
      return; 
  }

  const chatData = { text: data.text, timer: 120 };

  if (data.id === socket.id) {
    hero.chat = null; 
    setTimeout(() => { hero.chat = chatData; }, 0); 
  } else if (others[data.id]) {
    others[data.id].chat = null; 
    setTimeout(() => { others[data.id].chat = chatData; }, 0); 
  }
});

// ============================================================
// :::ON_USER_COUNTS::: 📊 チャンネル人口のリアルタイム同期
// ============================================================
/**
 * 役割：
 * - サーバーからチャンネルごとの接続人数（counts）を受信
 * - チャンネルボタン（ch-btn-1〜5）のテキストを「Ch X (Y人)」という形式で更新
 * - UIを通じて各世界の混雑状況をプレイヤーに伝える
 */
socket.on('user_counts', (counts) => {
    for (let i = 1; i <= 5; i++) {
        const btn = document.getElementById(`ch-btn-${i}`);
        if (btn) {
            // 例: 「Ch 1 (3人)」のような表示にする
            btn.innerText = `Ch ${i} (${counts[i]}人)`;
        }
    }
});

// ============================================================
// :::RENDER_SHOP_UI::: 🛒 ショップUIの再描画と経済管理 (ゴージャスリッチ版)
// ============================================================
/**
 * 役割：
 * - ショップオーバーレイの更新（商品リスト、売却リスト）
 * - サーバーデータ（hero.inventory/gold）との整合性同期
 * - アイテムランク（bonus stats）に基づいたUIフィルタと輝き（glow）の生成
 * - 安全なID文字列処理による売買関数の実行基盤の構築
 */
function renderShopUI(data) {

    console.log("--- 🛒 renderShopUI 実行開始 ---");
    console.log("📥 届いたデータ(data):", data);
    
    // サーバーから届いた最新情報を hero オブジェクトに同期
    if (data) {
        if (data.myItems) {
            hero.inventory = data.myItems;
            console.log("✅ hero.inventory を同期しました。");
        }
        if (data.gold !== undefined) {
            hero.gold = data.gold;
            console.log("✅ hero.gold を同期しました:", hero.gold);
        }
    }

    const shopOverlay = document.getElementById('shop-overlay');
    const itemList = document.getElementById('shop-item-list');
    const sellList = document.getElementById('user-sell-list');
    const goldDisplay = document.getElementById('shop-user-gold');

    if (!shopOverlay || !itemList || !sellList) {
        console.error("❌ ショップのDOM要素が見つかりません。");
        return;
    }

    // 1. 所持金を表示
    if (typeof hero !== 'undefined') {
        goldDisplay.innerText = (hero.gold || 0).toLocaleString();
    }

    // 🌟 1. お店の商品リスト（data.inventory）から「ID -> 名前・価格」のカタログ辞書を自動生成する
    const catalogMap = {};
    if (data && data.inventory) {
        data.inventory.forEach(catItem => {
            catalogMap[String(catItem.id)] = {
                name: catItem.name,
                price: catItem.price,
                image_name: catItem.image_name
            };
        });
    }

    // 2. 商品リストを生成（購入リスト）
    itemList.innerHTML = ''; 
    console.log(`📝 商品リスト生成開始（全 ${data.inventory.length} 件）`);

    data.inventory.forEach((item) => {
        const row = document.createElement('div');
        // 🌟 プロ仕様：洗練された行デザイン（なめらかなトランジション、ホバー演出）
        row.style.cssText = "display: flex; align-items: center; padding: 6px 8px; border-bottom: 1px solid #f1f5f9; background: #ffffff; margin-bottom: 2px; cursor: default; transition: all 0.15s ease;";
        
        row.onmouseover = () => { row.style.background = '#f8fafc'; };
        row.onmouseout = () => { row.style.background = '#ffffff'; };
        
        const actualItemId = item.item_id || item.id;
        const imgName = item.image_name || item.type || actualItemId;
        const imgPath = `${IMAGE_DOMAIN}item_assets/${imgName}.png`;

        // 🌟 アイテム名の安全な処理（シングルクォート対策）
        const safeBuyName = (item.display_name || item.name || "アイテム");

        // 🌟 重要: buyItem の引数に 'アイテム種別' と '表示名' を追加（ロジック完全維持）
        row.innerHTML = `
            <div class="shop-item-row-div" 
                 ondblclick="buyItem('${String(actualItemId)}', '${item.type || item.item_type}', '${safeBuyName}')" 
                 onclick="selectShopItem(this)"
                 style="display: flex; align-items: center; width: 100%; cursor: pointer;">
                <div style="width: 36px; height: 36px; min-width: 36px; background: radial-gradient(circle, #f8fafc 0%, #e2e8f0 100%); border: 1px solid #cbd5e1; margin-right: 10px; display: flex; align-items: center; justify-content: center; border-radius: 6px; overflow: hidden; pointer-events: none; box-shadow: inset 0 1px 2px rgba(255,255,255,0.8);">
                    <img src="${imgPath}" style="max-width: 28px; max-height: 28px; object-fit: contain; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.15));" onerror="this.src='assets/items/default.png'">
                </div>
                <div style="flex-grow: 1; font-family: 'Segoe UI', Tahoma, sans-serif; pointer-events: none;">
                    <div style="font-weight: 700; color: #0f172a; font-size: 12px; letter-spacing: 0.2px;">${item.display_name || item.name}</div>
                    <div style="font-size: 11px; color: #d97706; font-weight: 600; margin-top: 1px;">${(item.price || 0).toLocaleString()} <span style="font-size: 9px; color: #64748b;">メル</span></div>
                </div>
            </div>
            <button onclick="buyItem('${String(actualItemId)}', '${item.type || item.item_type}', '${safeBuyName}')" 
                    style="display:none; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); border: 1px solid #b45309; color: white; padding: 4px 10px; cursor: pointer; border-radius: 5px; font-weight: bold; font-family: inherit; font-size: 11px; box-shadow: 0 1px 2px rgba(217,119,6,0.3); transition: all 0.15s;">
                買う
            </button>
        `;

        row.onmouseenter = () => { window.currentHoverSlot = item; };
        row.onmouseleave = () => { window.currentHoverSlot = null; };
        itemList.appendChild(row);
    });

    // 3. 自分の所持アイテムリストを生成（売却リスト）
    sellList.innerHTML = ''; 
    const myItems = hero.inventory || [];
    console.log(`📝 所持アイテムリスト生成開始（全 ${myItems.length} 件）`);

    myItems.forEach((item, index) => {
        if (!item) return;
        
        console.log(`📦 [Debug] スロット ${index} のアイテムデータ:`, item);

        const row = document.createElement('div');
        // 🌟 プロ仕様：洗練された行デザイン
        row.style.cssText = "display: flex; align-items: center; padding: 6px 8px; border-bottom: 1px solid #f1f5f9; background: #ffffff; margin-bottom: 2px; cursor: default; transition: all 0.15s ease;";
        
        row.onmouseover = () => { row.style.background = '#f8fafc'; };
        row.onmouseout = () => { row.style.background = '#ffffff'; };
        
        // カタログ辞書から該当アイテムの情報を検索（item.id または item.item_id または item.type をキーにする）
        const lookupKey = String(item.id || item.item_id || "");
        const catalogMatch = catalogMap[lookupKey];

        // 🌟 修正：item.displayName、item.name、辞書データ、フォールバックの順で確実に名称を取得
        let itemName = item.displayName || item.name || (catalogMatch ? catalogMatch.name : null);

        if (!itemName || itemName === item.type) {
            // フォールバック維持
        }

        let displayPrice = 0;
        let iconGlowStyle = "";

        // 価格の決定（アイテム自体のprice、またはカタログ辞書のpriceを使用し、売却価格は半額にする）
        const rawPrice = item.price !== undefined && item.price !== null ? Number(item.price) : (catalogMatch ? catalogMatch.price : 0);
        if (rawPrice > 0) {
            displayPrice = Math.floor(rawPrice * 0.5);
        } else {
            displayPrice = 0;
        }

        const isEquipment = (
            item.type === 'sword' || 
            item.type === 'shield' || 
            ['sword', 'shield'].includes(item.item_type)
        );

        // ランク判定ロジックはそのまま完全維持
        if (isEquipment && item.totalALLStats !== undefined && item.totalFirstStats !== undefined) {
            const bonus = item.totalALLStats - item.totalFirstStats;
            let rankName = "";
            let rankGlowColor = "";

            if (bonus >= 30)      { rankGlowColor = "#ef4444"; rankName = "(神級)"; }
            else if (bonus >= 25) { rankGlowColor = "#22c55e"; rankName = "(超伝説)"; }
            else if (bonus >= 20) { rankGlowColor = "#eab308"; rankName = "(極上)"; }
            else if (bonus >= 15) { rankGlowColor = "#a855f7"; rankName = "(伝説)"; }
            else if (bonus >= 10) { rankGlowColor = "#06b6d4"; rankName = "(希少)"; }
            else if (bonus >= 5)  { rankGlowColor = "#f97316"; rankName = "(良品)"; }
            else if (bonus >= 0)  { rankGlowColor = "";        rankName = "(標準)"; }
            else                  { rankGlowColor = "";        rankName = "(粗悪)"; }

            if (!itemName.includes("(")) itemName = `${itemName} <span style="font-size:10px; font-weight:bold; color:${rankGlowColor || '#64748b'};">${rankName}</span>`;
            if (rankGlowColor) {
                iconGlowStyle = `filter: drop-shadow(0 0 4px ${rankGlowColor});`;
            }
        }

        const sendId = item.equipment_id || item.instanceId || item.id || item.item_id;
        const targetSlot = (item.slot_index !== undefined) ? item.slot_index : index;
        const safeItemName = itemName.replace(/<[^>]*>?/gm, ''); // タグを除いた安全な文字列

        const isEquip = !!(item.instanceId || item.equipment_id);
        const imgName = catalogMatch ? catalogMatch.image_name : (item.image_name || item.type || item.id);
        const imgPath = `${IMAGE_DOMAIN}item_assets/${imgName}.png`;

        row.innerHTML = `
            <div class="sell-item-row-div" 
                 onclick="event.stopPropagation(); selectSellItem(event, this)"
                 ondblclick="sellItem('${String(sendId)}', ${targetSlot}, '${safeItemName}', ${item.count || 1}, ${isEquip})"
                 style="display: flex; align-items: center; width: 100%; cursor: pointer;">
                <div style="width: 36px; height: 36px; min-width: 36px; background: radial-gradient(circle, #f8fafc 0%, #e2e8f0 100%); border: 1px solid #cbd5e1; margin-right: 10px; display: flex; align-items: center; justify-content: center; border-radius: 6px; overflow: hidden; position: relative; pointer-events: none; box-shadow: inset 0 1px 2px rgba(255,255,255,0.8);">
                    <img src="${imgPath}" style="max-width: 28px; max-height: 28px; object-fit: contain; ${iconGlowStyle}" onerror="this.src='assets/items/default.png'">
                    <span style="position: absolute; bottom: 1px; right: 1px; font-size: 8px; background: rgba(15,23,42,0.85); color: white; padding: 0 3px; border-radius: 3px; font-family: 'Segoe UI', Tahoma, sans-serif; font-weight: bold; line-height: 1.4;">
                        ${item.count || 1}
                    </span>
                </div>
                <div style="flex-grow: 1; font-family: 'Segoe UI', Tahoma, sans-serif; pointer-events: none; text-align: left;">
                    <div style="font-weight: 700; color: #0f172a; font-size: 12px; letter-spacing: 0.2px;">${itemName}</div>
                    <div style="font-size: 11px; color: #16a34a; font-weight: 600; margin-top: 1px;">${displayPrice.toLocaleString()} <span style="font-size: 9px; color: #64748b;">メル</span></div>
                </div>
            </div>
            <button onclick="sellItem('${String(sendId)}', ${targetSlot}, '${safeItemName}', ${item.count || 1}, ${isEquip})" 
                    style="display:none; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); border: 1px solid #1e40af; color: white; padding: 4px 10px; cursor: pointer; border-radius: 5px; font-weight: bold; font-family: inherit; font-size: 11px; box-shadow: 0 1px 2px rgba(59,130,246,0.3); transition: all 0.15s;">
                売る
            </button>
        `;

        row.onmouseenter = () => { window.currentHoverSlot = item; };
        row.onmouseleave = () => { window.currentHoverSlot = null; };

        sellList.appendChild(row);
    });

    console.log("🏁 ショップUIの更新が完了しました。");
}

// ============================================================
// :::ON_OPEN_SHOP_UI::: 🛒 ショップウィンドウの起動トリガー
// ============================================================
/**
 * 役割：
 * - サーバーからショップ画面を開く命令を受信
 * - 届いた商品データを `lastShopData` としてキャッシュ（再描画用に保持）
 * - ショップオーバーレイを可視化し、描画処理（:::RENDER_SHOP_UI:::）を呼び出す
 */
socket.on('open_shop_ui', (data) => {
    console.log("--- 🛒 [DEBUG: ShopUI開始] ---");
    window.lastShopData = data; // データをグローバルに保持
    document.getElementById('shop-overlay').style.display = 'block';
    renderShopUI(data);
});

// ============================================================
// :::ON_UPDATE_SHOP::: 🛒 取引完了後のショップUI自動同期
// ============================================================
/**
 * 役割：
 * - サーバーからの在庫・所持金更新通知を受信
 * - ショップ画面が表示されているか判定（ガード節）
 * - ショップデータをキャッシュ（lastShopData）に上書き
 * - ショップUI描画関数（:::RENDER_SHOP_UI:::）を呼び出し、最新の状態を表示
 */
socket.on('update_shop', (newData) => {
    // ショップが開いている時だけ描画を更新
    if (document.getElementById('shop-overlay').style.display === 'block') {
        window.lastShopData = newData;
        renderShopUI(newData);
    }
});

// 💡 図鑑データを保持するための変数
let currentZukanItems = [];

// 💡 既存のソケット通信リスナー
socket.on('open_zukan', (data) => {
    console.log("📥 [Debug] 受信した図鑑データ:", data);
    
    // データを保存
    currentZukanItems = data.items || [];
    
    // ウィンドウを開く
    const overlay = document.getElementById('zukan-overlay');
    overlay.style.display = 'flex';
    
    // 初期状態（全体）で描画
    renderZukanList('all');
});

// 💡 リストを再描画する関数（フィルタリング機能付き）
function renderZukanList(category) {
    const container = document.getElementById('zukan-list-content');
    container.innerHTML = ''; // クリア

    if (currentZukanItems.length === 0) {
        container.innerHTML = "<div style='color:red; padding:10px;'>データがありません！</div>";
        return;
    }

    // フィルタリング処理（categoryが'all'ならそのまま、それ以外ならtypeで絞り込み）
    // ※DBの item.type と、タブの data-category が一致している前提です
    const filteredItems = (category === 'all') 
        ? currentZukanItems 
        : currentZukanItems.filter(item => item.type === category);

    filteredItems.forEach(item => {
    const row = document.createElement('div');
    row.className = "shop-item-row-div zukan-row";
    
    // 画像パスが空の場合の予備（デフォルト画像）
    //const imgSrc = item.image_path ? `/images/items/${item.image_name}.png` : '/images/default_icon.png';
	const imgSrc = `${IMAGE_DOMAIN}item_assets/${item.image_name}.png`;
	
    row.innerHTML = `
        <img src="${imgSrc}" class="zukan-thumb" alt="icon">
        <div style="width:50px; font-size:10px; color:#888;">ID:${item.item_id}</div>
        <div style="flex-grow:1; font-weight:bold;">${item.display_name}</div>
        <div style="font-size:10px; color:#666; width:80px; text-align:right;">${item.name}</div>
    `;
    
    row.onclick = () => console.log("🔍 クリックしたアイテム詳細:", item);
	// 💡 マウスを乗せた瞬間に、薄いデータとカタログデータを合体させる！
row.onmouseenter = () => {
    // 1. カタログが存在するか確認（エラー回避）
    const catalog = (typeof window.ITEM_CATALOG !== 'undefined') ? window.ITEM_CATALOG : {};
    
    // 2. カタログから、そのアイテムの「詳細データ」を探す
    const master = catalog[item.item_id] || {};
    
    // 3. 【結合！】スプレッド構文で2つを1つにする
    // master(下) + item(上) で、itemが優先されるように合体
    const richItem = { ...master, ...item };
    
    // 4. ツールチップ描画用の変数にセット
    window.currentHoverSlot = richItem; 
};
	row.onmouseleave = () => { window.currentHoverSlot = null; };
    container.appendChild(row);
});
}

// 💡 タブクリック時のイベント設定（一度だけ実行）
document.querySelectorAll('.zukan-tab-item').forEach(tab => {
    tab.addEventListener('click', (e) => {
        // activeクラスの切り替え
        document.querySelectorAll('.zukan-tab-item').forEach(t => t.classList.remove('active'));
        e.target.classList.add('active');

        // カテゴリを取得して再描画
        const category = e.target.getAttribute('data-category');
        renderZukanList(category);
    });
});

// ============================================================
// 📖 エネミー図鑑 (/mzukan) のクライアント側処理 (2ペイン分割対応版)
// ============================================================

// オーラの色コード変換補助
function getAuraColorCode(auraType) {
    if (auraType === 'gold') return '#d97706';
    if (auraType === 'red') return '#dc2626';
    if (auraType === 'blue') return '#2563eb';
    return '#6b7280';
}

// ============================================================
// 📖 エネミー図鑑 (/mzukan) - ゴージャスリッチ・完全版
// ============================================================
socket.on('open_mzukan', (data) => {
    let enemies = data.enemies || [];
    
    const dropDatabase = data.dropDatabase || {};
    const dropChanceTables = data.dropChanceTables || {};
    const itemCatalogMap = data.itemCatalogMap || {};
    const enemyAuraDropTables = data.enemyAuraDropTables || {};

    const tbody = document.getElementById('mzukan-table-body');
    const modal = document.getElementById('mzukan-overlay');
    const detailPane = document.getElementById('mzukan-detail-pane');

    if (!tbody || !modal) {
        console.error("❌ エネミー図鑑のHTML要素が見つかりません。");
        return;
    }

    tbody.innerHTML = '';
    
    if (detailPane) {
        detailPane.innerHTML = `<div style="color: #64748b; font-size: 13px; text-align: center; padding: 40px;">👈 左のリストからモンスターを選択してください</div>`;
    }

    const monsterFolderMap = {};
    for (let i = 1; i <= 102; i++) {
        const enemyId = 2000 + (i * 10);
        monsterFolderMap[enemyId] = i;
    }

    enemies = enemies.filter(en => monsterFolderMap[en.enemy_id] !== undefined);

    enemies.forEach((en, index) => {
        const tr = document.createElement('tr');
        
        // 🌟 プロ仕様：リッチなベーススタイル（微小なボーダー、なめらかなトランジション）
        tr.style.cssText = "border-bottom: 1px solid #f1f5f9; cursor: pointer; transition: all 0.2s ease; background: #ffffff;";
        
        tr.onmouseover = () => { 
            if (!tr.classList.contains('selected')) {
                tr.style.background = '#f8fafc';
                tr.style.transform = 'translateX(2px)';
            }
        };
        tr.onmouseout = () => { 
            if (!tr.classList.contains('selected')) {
                tr.style.background = 'white';
                tr.style.transform = 'translateX(0)';
            }
        };

        const rowColor = en.is_boss ? '#e11d48' : '#0f172a';
        const mNum = monsterFolderMap[en.enemy_id];
        
        let imageHtml = '-';
        let imgPath = '';
        if (mNum !== undefined) {
            imgPath = `${IMAGE_DOMAIN}char_assets_enemy/Monster${mNum}/Idle/tile000.png`;
            // 🌟 プロ仕様：ガラスモフィズム調の高級サムネイルフレーム
            imageHtml = `
                <div style="width: 42px; height: 42px; display: flex; align-items: center; justify-content: center; background: radial-gradient(circle, #f8fafc 0%, #e2e8f0 100%); border: 1px solid #cbd5e1; border-radius: 6px; box-sizing: border-box; overflow: hidden; box-shadow: inset 0 1px 3px rgba(255,255,255,0.9);">
                    <img src="${imgPath}" alt="${en.name}" style="width: 36px; height: 36px; object-fit: contain; filter: drop-shadow(0 2px 3px rgba(0,0,0,0.15));" onerror="this.style.display='none'">
                </div>
            `;
        }

        // 🌟 プロ仕様：情報階層の美しさを極めたテーブル行HTML
        tr.innerHTML = `
            <td style="padding: 8px 6px 8px 10px; text-align: center; width: 50px;">${imageHtml}</td>
            <td style="padding: 8px 6px;">
                <div style="font-weight: 800; font-size: 11px; color: ${rowColor}; display: flex; align-items: center; gap: 5px; letter-spacing: 0.2px;">
                    ${en.type} 
                    ${en.is_boss ? '<span style="font-size: 7px; background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%); color: #991b1b; border: 1px solid #f87171; padding: 1px 4px; border-radius: 3px; font-weight: bold; letter-spacing: 0.5px; box-shadow: 0 1px 2px rgba(239,68,68,0.2);">BOSS</span>' : ''}
                </div>
                <div style="font-size: 10px; color: #475569; margin-top: 2px; font-weight: 500;">
                    ${en.name} <span style="color: #94a3b8; font-size: 8px; font-family: monospace;">#${en.enemy_id}</span>
                </div>
            </td>
            <td style="padding: 8px 10px 8px 6px; text-align: right; width: 50px;">
                <div style="background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%); border: 1px solid #cbd5e1; color: #334155; padding: 3px 7px; border-radius: 5px; display: inline-block; font-size: 10px; font-weight: bold; box-shadow: inset 0 1px 2px rgba(255,255,255,0.8);">
                    Lv.${en.level}
                </div>
            </td>
        `;

        tr.addEventListener('click', () => {
            document.querySelectorAll('#mzukan-table-body tr').forEach(row => {
                row.classList.remove('selected');
                row.style.background = 'white';
                row.style.borderLeft = 'none';
                row.style.boxShadow = 'none';
            });

            tr.classList.add('selected');
            // 🌟 プロ仕様：選択時は上品なインディゴブルーのグラデーション ＋ 左アクセントバー ＋ 微小なシャドウ
            tr.style.background = 'linear-gradient(90deg, #eff6ff 0%, #dbeafe 100%)';
            tr.style.borderLeft = '4px solid #3b82f6';
            tr.style.boxShadow = 'inset 0 1px 3px rgba(59,130,246,0.1)';

            if (detailPane) {
                const auraColor = getAuraColorCode(en.auraType);

                const getEntries = (tableObj) => Object.entries(tableObj || {}).filter(([k]) => k !== "drop_rate" && k !== "normal_gold");

                const dropSetting = dropDatabase[en.type] || { table: "Drop3" };
                const normalEntries = getEntries(dropChanceTables[dropSetting.table]);
                
                const typeDropTables = enemyAuraDropTables[en.type] || {};
                const goldEntries = getEntries(typeDropTables['gold']);
                const redEntries = getEntries(typeDropTables['red']);
                const blueEntries = getEntries(typeDropTables['blue']);

                const renderDropBox = (title, entries, themeColor, badgeBg, badgeBorder) => {
                    let contentHtml = '';
                    if (entries.length === 0) {
                        contentHtml = '<div style="color: #94a3b8; font-size: 9px; text-align: center; padding: 10px 0;">なし</div>';
                    } else {
                        contentHtml = entries.map(([itemName, chance]) => {
                            const catalogInfo = itemCatalogMap[itemName] || {};
                            const displayName = catalogInfo.displayName || itemName;
                            const imageName = catalogInfo.imageName;

                            let itemThumbHtml = '';
                            if (imageName) {
                                const fileName = imageName.includes('.') ? imageName : `${imageName}.png`;
                                const itemImgPath = `${IMAGE_DOMAIN}item_assets/${fileName}`;
                                itemThumbHtml = `<img src="${itemImgPath}" style="width: 16px; height: 16px; object-fit: contain;" onerror="this.style.display='none'">`;
                            }

                            return `
                                <div style="display: flex; align-items: center; justify-content: space-between; background: #ffffff; border: 1px solid #e2e8f0; padding: 2px 6px; border-radius: 3px; margin-bottom: 2px; font-size: 9px; gap: 4px;">
                                    <div style="display: flex; align-items: center; gap: 4px; min-width: 0; flex-grow: 1;">
                                        <div style="width: 18px; height: 18px; display: flex; align-items: center; justify-content: center; background: #f8fafc; border-radius: 2px; flex-shrink: 0;">
                                            ${itemThumbHtml}
                                        </div>
                                        <span style="color: #1f2937; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; width: 100%;" title="${displayName}">${displayName}</span>
                                    </div>
                                    <span style="color: ${themeColor}; font-weight: bold; background: ${badgeBg}; border: 1px solid ${badgeBorder}; padding: 1px 3px; border-radius: 2px; flex-shrink: 0; white-space: nowrap;">${chance}%</span>
                                </div>
                            `;
                        }).join('');
                    }

                    return `
                        <div style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 5px; padding: 5px; display: flex; flex-direction: column; height: 85px; box-sizing: border-box;">
                            <div style="font-size: 9px; font-weight: bold; color: ${themeColor}; margin-bottom: 3px; border-bottom: 1px solid #f1f5f9; padding-bottom: 2px; flex-shrink: 0;">
                                ${title}
                            </div>
                            <div style="flex-grow: 1; overflow-y: auto; padding-right: 1px;">
                                ${contentHtml}
                            </div>
                        </div>
                    `;
                };

                const normalBox = renderDropBox('🎯 通常ドロップ', normalEntries, '#1d4ed8', '#eff6ff', '#bfdbfe');
                const goldBox   = renderDropBox('🌟 ゴールドオーラ', goldEntries, '#d97706', '#fef3c7', '#fde68a');
                const redBox    = renderDropBox('🔥 レッドオーラ', redEntries, '#dc2626', '#fee2e2', '#fca5a5');
                const blueBox   = renderDropBox('💧 ブルーオーラ', blueEntries, '#2563eb', '#eff6ff', '#bfdbfe');

                const hasAura = en.auraType && en.auraType !== 'none';
                const auraRowHtml = hasAura ? `<div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 2px 4px; border-radius: 3px; grid-column: span 3; display: flex; justify-content: space-between; align-items: center;"><span>オーラ:</span> <span style="color: ${auraColor}; font-weight: bold;">${en.auraType}</span></div>` : '';

                detailPane.innerHTML = `
                    <div style="width: 100%; text-align: left; background: #f8fafc; padding: 10px; border-radius: 8px; border: 1px solid #cbd5e1; box-sizing: border-box; display: flex; flex-direction: column; gap: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                        
                        <div style="display: flex; gap: 10px; background: #ffffff; border: 1px solid #e2e8f0; padding: 8px; border-radius: 6px; align-items: stretch; flex-shrink: 0;">
                            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); border: 1px solid #cbd5e1; border-radius: 6px; padding: 2px; width: 110px; min-width: 110px; height: 110px; box-shadow: inset 0 1px 3px rgba(255,255,255,0.8); flex-shrink: 0;">
                                <img src="${imgPath}" style="max-width: 100px; max-height: 100px; object-fit: contain; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.15));" onerror="this.style.display='none'">
                            </div>

                            <div style="display: flex; flex-direction: column; justify-content: space-between; flex-grow: 1; overflow: hidden;">
                                <div>
                                    <h3 style="margin: 0; font-size: 14px; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: bold;">${en.name}</h3>
                                    <div style="display: flex; gap: 4px; margin-top: 2px;">
                                        <span style="font-size: 9px; background: #e2e8f0; padding: 1px 5px; border-radius: 3px; color: #334155; font-weight: 500;">${en.type}</span>
                                        <span style="font-size: 9px; background: ${en.is_boss ? '#fee2e2' : '#f1f5f9'}; color: ${en.is_boss ? '#991b1b' : '#334151'}; border: 1px solid ${en.is_boss ? '#fca5a5' : '#cbd5e1'}; padding: 1px 5px; border-radius: 3px; font-weight: 500;">${en.is_boss ? '👑 ボス' : '通常'}</span>
                                    </div>
                                </div>

                                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 3px; font-size: 9px; color: #334155; margin-top: 3px;">
                                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 2px 4px; border-radius: 3px; display: flex; justify-content: space-between;"><span>ID:</span> <span style="font-weight: bold; color: #1e293b;">${en.enemy_id}</span></div>
                                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 2px 4px; border-radius: 3px; display: flex; justify-content: space-between;"><span>Lv:</span> <span style="font-weight: bold; color: #1e293b;">${en.level}</span></div>
                                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 2px 4px; border-radius: 3px; display: flex; justify-content: space-between;"><span>HP:</span> <span style="font-weight: bold; color: #1e293b;">${en.hp}</span></div>
                                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 2px 4px; border-radius: 3px; display: flex; justify-content: space-between;"><span>ATK:</span> <span style="font-weight: bold; color: #1e293b;">${en.atk}</span></div>
                                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 2px 4px; border-radius: 3px; display: flex; justify-content: space-between;"><span>EXP:</span> <span style="font-weight: bold; color: #1e293b;">${en.exp}</span></div>
                                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 2px 4px; border-radius: 3px; display: flex; justify-content: space-between;"><span>Money:</span> <span style="font-weight: bold; color: #d97706;">${en.money ?? 0}G</span></div>
                                    ${auraRowHtml}
                                </div>
                            </div>
                        </div>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; flex-shrink: 0;">
                            ${normalBox}
                            ${goldBox}
                            ${redBox}
                            ${blueBox}
                        </div>

                    </div>
                `;
            }
        });

        tbody.appendChild(tr);

        if (index === 0) {
            tr.click();
        }
    });

    modal.style.display = 'block';
    console.log(`📖 エネミー図鑑ウィンドウを開きました (${enemies.length}件)`);
});

// 4. 閉じるボタン [×] を押したときにウィンドウを隠す処理
document.addEventListener('click', (event) => {
    if (event.target && event.target.id === 'mzukan-close-btn') {
        event.stopPropagation(); // 👈 他のドラッグイベントなどの誤作動を防ぐ！
        
        const modal = document.getElementById('mzukan-overlay');
        if (modal) {
            modal.style.display = 'none';
            // もしドラッグで位置を動かすための transform や style.top/left が残っていたらリセットする場合：
            // modal.style.transform = 'translate(-50%, -50%)'; 
            // modal.style.top = '50%';
            // modal.style.left = '50%';
            
            console.log("📖 エネミー図鑑ウィンドウを閉じました。");
        }
    }
});

// 共通のラッパー適用関数（先ほどのコードを流用）
const applyDragWrapper = (targetId, headerId) => {
    const target = document.getElementById(targetId);
    const header = document.getElementById(headerId);
    if (!target || !header || document.getElementById(`${targetId}-wrapper`)) return;

    const wrapper = document.createElement('div');
    wrapper.id = `${targetId}-wrapper`;
    
    Object.assign(wrapper.style, {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: '9999',
        margin: '0'
    });

    target.parentNode.insertBefore(wrapper, target);
    wrapper.appendChild(target);
    
    Object.assign(target.style, { position: 'relative', left: '0', top: '0', margin: '0', transform: 'none' });
    Object.assign(header.style, { cursor: 'move', userSelect: 'none' });

    header.addEventListener('mousedown', (e) => {
        const rect = wrapper.getBoundingClientRect();
        wrapper.style.left = `${rect.left}px`;
        wrapper.style.top = `${rect.top}px`;
        wrapper.style.transform = 'none';

        const offsetX = e.clientX - rect.left;
        const offsetY = e.clientY - rect.top;

        const onMouseMove = (ev) => {
            wrapper.style.left = `${ev.clientX - offsetX}px`;
            wrapper.style.top = `${ev.clientY - offsetY}px`;
        };
        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        e.stopPropagation();
    });
};

// --- ここで対象を増やします ---
window.addEventListener('load', () => {
    setTimeout(() => {
        applyDragWrapper('shop-overlay', 'shop-header');
        applyDragWrapper('vending-window', 'vending-header');
        applyDragWrapper('other-vending-window', 'other-vending-header');
        applyDragWrapper('player-profile-window', 'profile-header');
        applyDragWrapper('zukan-overlay', 'zukan-header');
        applyDragWrapper('mzukan-overlay', 'mzukan-header');
    }, 1000);
});

// --- 📡 クライアント受信アンテナ ---

// 1. 新しいモンスターがスポーンした瞬間の処理
socket.on('spawn_monster', (monsterData) => {
    // 💡 データの整合性をチェック
    if (monsterData.x === undefined || monsterData.y === undefined) {
        console.error("❌ サーバーから座標が送られてきていません！", monsterData);
        return; // 座標がないなら召喚しない
    }

    // 💡 【超重要】サーバーから送られてきた name や type を確実に使ってロードを走らせる
    const targetName = monsterData.name || monsterData.type;
    if (targetName) {
        ensureEnemySpritesLoaded(targetName, monsterData.id);
    }

    // 💡 確実に「スポーン直後」であることを明示
    monsterData.isJustSpawned = true; 
    monsterData.opacity = 0; // 描画ガードを二重にする

    // 二重生成防止
    const exists = enemies.find(e => e.unique_id === monsterData.unique_id);
    if (!exists) {
        enemies.push(monsterData); 
        console.log(`🆕 モンスター召喚: ${monsterData.id} 位置(${monsterData.x}, ${monsterData.y})`);
        
        // 🔊 モンスター召喚時の効果音を再生
        if (typeof playSummonSound === 'function') {
            playSummonSound();
        }
    }
});

// 📌 指定した敵の画像がなければ、その場で個別ロードする関数
function ensureEnemySpritesLoaded(monsterName, monsterId) {
    // すでにIdle画像が存在していれば、ロード済みなので何もしない
    if (sprites[monsterName + 'Idle'] && sprites[monsterName + 'Idle'].length > 0) {
        return;
    }

    // MONSTER_CONFIGS から該当する設定を探す
    const m = MONSTER_CONFIGS.find(conf => String(conf.id) === String(monsterId) || conf.name === monsterName);
    if (!m) {
        console.warn(`⚠️ 召喚された敵のコンフィグが見つかりません: ID=${monsterId}`);
        return;
    }

    console.log(`📥 新規の敵 [${m.name} (ID: ${m.id})] が召喚されたため、画像を動的ロードします`);

    let isMonsterType = m.id.startsWith("Monster") || /^\d+$/.test(String(m.id));
    const basePath = `${IMAGE_DOMAIN}char_assets_enemy/${m.id}`;
    let fName = isMonsterType ? "tile" : "skeleton";

    // アクションごとのロードヘルパー
    const loadSet = (actionName, folderName) => {
        const key = m.name + actionName;
        if (sprites[key]) return;
        
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
            const dbColName = "anim_" + lowerName;      
            count = m[dbColName] || m[lowerName] || 0;
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

    // 各アクションをロード
    loadSet('Walk',   'Walk');
    loadSet('Attack', 'Attack');
    loadSet('Idle',   'Idle');
    loadSet('Jump',   'Jump');
    loadSet('Death',  'Death'); 

    // 単体画像（ベース・ダメージ用）
    const idleKey = isMonsterType ? 'tile000' : `${fName}-Idle_0`;
    if (!sprites[m.name]) {
        const baseImg = new Image();
        baseImg.crossOrigin = "anonymous";
        baseImg.src = `${basePath}/Idle/${idleKey}.png`;
        sprites[m.name] = [baseImg]; 
    }
    if (!sprites[m.name + 'Damage']) {
        const damageImg = new Image();
        damageImg.crossOrigin = "anonymous";
        damageImg.src = `${basePath}/Idle/${idleKey}.png`;
        sprites[m.name + 'Damage'] = [damageImg];
    }
}

// 2. サーバーから来る「現在の敵リスト」を同期する処理（最重要！）
socket.on('update_enemies', (data) => {
    // 💡 これが最も確実な方法です。サーバーから送られてきた「敵リスト」を
    // クライアントの「描画リスト(globalEnemies)」にそのまま代入（同期）します。
    // これにより、表示のズレが完全になくなります。
    
    // データが配列ならそのまま代入
    if (Array.isArray(data)) {
        enemies = data; 
    }
});

/*
socket.on('spawn_monster', (monsterData) => {
    console.log("✨ データ受信:", monsterData);

	console.log("DEBUG: Push前の配列の長さ:", enemies.length);
	
    // 1. まず生成する
    const newEnemy = new Enemy(monsterData.enemy_id, null);

    // 2. サーバーから届いた値で「上書き」する（これが重要！）
    newEnemy.x = monsterData.x;
    newEnemy.y = monsterData.y;
    newEnemy.hp = monsterData.currentHp;
    newEnemy.maxHp = monsterData.currentHp;
    
    // 3. サイズもサーバーから届いたものに修正する
    // クラス内で勝手に小さくされてしまったので、ここで戻します
    newEnemy.w = monsterData.w * monsterData.scale; // 265 * 1 = 265
    newEnemy.h = monsterData.h * monsterData.scale; // 218 * 1 = 218
    
    // 4. その他パラメータも同期
    newEnemy.atk = monsterData.atk;
    newEnemy.exp = monsterData.exp;
    newEnemy.money = monsterData.money;
    newEnemy.type = monsterData.type;

    // 5. 配列に追加
    enemies.push(newEnemy);
	
	console.log("DEBUG: Push後の配列の長さ:", enemies.length);

    console.log("👾 敵を召喚完了！サイズ:", newEnemy.w, "x", newEnemy.h);
});
*/

// ============================================================
// :::SELECT_SHOP_ITEM::: 🛒 ショップ商品選択時のハイライト処理
// ============================================================
/**
 * 役割：
 * - 既に選択されている他アイテムのハイライトをすべて解除（排他制御）
 * - クリックされたアイテムの要素（element）に 'selected' クラスを付与
 */
function selectShopItem(element) {
    // 1. 一旦、全部の「選択中」を解除する
    document.querySelectorAll('.shop-item-row-div').forEach(el => {
        el.classList.remove('selected');
    });
    // 2. 今クリックしたやつだけ「選択中」にする
    element.classList.add('selected');
}

// ============================================================
// :::DESELECT_ALL_ITEMS::: 🛒 ショップ選択状態の全解除処理
// ============================================================
/**
 * 役割：
 * - ショップ内の全商品要素から 'selected' クラスを除去
 * - 選択状態を強制的にリセットし、UIをクリーンな状態へ戻す
 */
function deselectAllItems() {
    document.querySelectorAll('.shop-item-row-div').forEach(el => {
        el.classList.remove('selected');
    });
}

// ============================================================
// :::SELECT_SELL_ITEM::: 💰 売却アイテム選択時のハイライト処理
// ============================================================
/**
 * 役割：
 * - 既に選択されている他の売却アイテムのハイライトを全解除
 * - クリックされた売却要素（element）に 'selected' クラスを付与
 * - 必要に応じて購入リスト側の選択状態も同時にリセットし、
 *   「ショップ内で常に1つの選択状態」を保証する制御を行う
 */
function selectSellItem(event, element) {
    // 1. 他の売却アイテムの選択（selectedクラス）をすべて解除
    document.querySelectorAll('.sell-item-row-div').forEach(el => {
        el.classList.remove('selected');
    });

    // 2. クリックされた要素に selected クラスを付与
    element.classList.add('selected');

    // (任意) 購入側の選択も解除して、画面全体で1つだけ選ばれている状態にする場合
    // document.querySelectorAll('.shop-item-row-div').forEach(el => el.classList.remove('selected'));

    console.log("💰 売却アイテムを選択しました");
}

// ============================================================
// :::SELL_ITEM::: 💰 アイテム売却確認とリクエスト送信
// ============================================================
/**
 * 役割：
 * - 売却確認ダイアログの表示とメッセージ設定
 * - 装備品/一般アイテムに応じた個数入力UI（qtyArea）の制御
 * - 入力された売却個数のバリデーション（範囲チェック）
 * - サーバーへの売却リクエスト（socket.emit）の発行
 */
function sellItem(itemId, slotIndex, displayName, currentCount = 1, isEquipment = false) {
    console.log("1. sellItem関数が呼ばれました。ID:", itemId, "Slot:", slotIndex, "装備:", isEquipment);

    const overlay = document.getElementById('sell-confirm');
    const message = document.getElementById('sell-confirm-message');
    const btnYes = document.getElementById('sell-confirm-yes');
    const btnNo = document.getElementById('sell-confirm-no');
    
    // 🌟 個数入力エリア全体（ラベルと入力欄を囲む親要素）と入力欄自体を取得
    const qtyArea = document.getElementById('sell-quantity-area'); 
    const inputQty = document.getElementById('sell-quantity');

    // メッセージをセット
    if (message) {
        message.innerText = `${displayName} を売却しますか？`;
    }

    // 🌟 装備品判定による表示切り替え
    if (isEquipment) {
        // 装備品なら個数入力エリアを隠し、個数を1に固定
        if (qtyArea) qtyArea.style.display = 'none';
        if (inputQty) {
            inputQty.value = "1";
            inputQty.max = 1;
        }
    } else {
        // ETCや消費アイテムなら個数入力エリアを表示し、最大数をセット
        if (qtyArea) qtyArea.style.display = 'block';
        if (inputQty) {
            inputQty.value = "1";
            inputQty.max = currentCount;
            inputQty.focus();
        }
    }

    // ダイアログを表示
    overlay.style.display = 'flex';

    // 「はい」ボタンの処理
    btnYes.onclick = () => {
        // 🌟 装備品なら強制的に1、そうでなければ入力値を取得
        const quantity = isEquipment ? 1 : (inputQty ? parseInt(inputQty.value) : 1);

        // バリデーション（装備品以外の場合のみチェック）
        if (!isEquipment && (isNaN(quantity) || quantity <= 0 || quantity > currentCount)) {
            alert(`1個から${currentCount}個の間で入力してください。`);
            return;
        }

        overlay.style.display = 'none'; // 閉じる
        
        if (typeof socket === 'undefined') {
            console.error("エラー: socketが見つかりません");
            return;
        }
		
        if (typeof playBuySound === 'function') {
            playBuySound();
        }

        console.log(`2. サーバーへ売却リクエストを送ります... (${quantity}個)`);
        
        socket.emit('sell_request', { 
            itemId: itemId, 
            slotIndex: slotIndex,
            quantity: quantity
        });
    };

    // 「いいえ」ボタンの処理
    btnNo.onclick = () => {
        console.log("売却がキャンセルされました");
        overlay.style.display = 'none'; // 閉じる
    };
}

// ============================================================
// :::BUY_ITEM::: 🛒 アイテム購入確認とリクエスト送信
// ============================================================
function buyItem(itemId, itemType, displayName) {
    console.log("1. buyItem関数が呼ばれました。ID:", itemId, "Type:", itemType);

    const overlay = document.getElementById('custom-confirm');
    const message = document.getElementById('confirm-message');
    const btnYes = document.getElementById('confirm-yes');
    const btnNo = document.getElementById('confirm-no');
    
    const qtyArea = document.getElementById('confirm-quantity-area');
    const inputQty = document.getElementById('buy-quantity');

    if (message) {
        message.innerText = `${displayName} を購入しますか？`;
    }

    const isEquipment = (itemType === 'sword' || itemType === 'shield');

    if (isEquipment) {
        if (qtyArea) qtyArea.style.display = 'none';
        if (inputQty) {
            inputQty.value = "1";
            inputQty.max = 1;
        }
    } else {
        if (qtyArea) qtyArea.style.display = 'block';
        if (inputQty) {
            inputQty.value = "1";
            inputQty.max = 99;
            inputQty.focus();
        }
    }

    overlay.style.display = 'flex';

    // 「はい」ボタンの処理
    btnYes.onclick = () => {
        const quantity = isEquipment ? 1 : (inputQty ? parseInt(inputQty.value) : 1);

        if (!isEquipment && (isNaN(quantity) || quantity <= 0)) {
            alert("購入する個数を正しく入力してください。");
            return;
        }

        overlay.style.display = 'none'; // 確認ダイアログは一旦閉じる
        
        if (typeof socket === 'undefined') {
            console.error("エラー: socketが見つかりません");
            return;
        }

        // ❌ ここにあった playBuySound() は削除します（買えるか分からないため）

        console.log(`2. サーバーへ購入リクエストを送ります... (ID: ${itemId}, 個数: ${quantity})`);
        
        socket.emit('buy_request', { 
            itemId: itemId,
            quantity: quantity 
        });
    };

    btnNo.onclick = () => {
        console.log("購入がキャンセルされました");
        overlay.style.display = 'none';
    };
}

// ============================================================
// :::SHOP_SOCKET_LISTENERS::: 🛒 ショップ関連のサーバー通信受信
// ============================================================
if (typeof socket !== 'undefined') {
    // 🌟 購入が成功したときだけ効果音を鳴らす
    socket.off('shop_purchase_success');
    socket.on('shop_purchase_success', () => {
        console.log("購入成功！効果音を鳴らします。");
        if (typeof playBuySound === 'function') {
            playBuySound(); // ここで初めて「ジャキーン！」等の購入音が鳴る
        }
    });

    // 🌟 サーバーから「メル不足・バッグ一杯」などの購入失敗通知を受け取る
    socket.off('shop_purchase_failed'); // 多重登録防止
    socket.on('shop_purchase_failed', (data) => {
        // メッセージの内容を分岐
        let alertText = "アイテムを購入できませんでした。";
        if (data.reason === 'not_enough_gold') {
            alertText = "メルが足りないよ。";
        } else if (data.reason === 'inventory_full') {
            alertText = "バッグがいっぱいだね。";
        }

        // 昔のメイプル風のシステムダイアログ（alertや、専用の中央ポップアップ）を表示
        // ※ もし専用のダイアログ関数があればそれに差し替えてもOKです
        alert(alertText); 
    });
}

// 🌟 露店購入時の専用アラート（所持金不足など）を受け取るリスナー
socket.on('vending_alert', (data) => {
    if (data.type === 'NOT_ENOUGH_GOLD') {
        showGameAlert("💰 所持金不足", data.text);
    } else {
        showGameAlert("⚠️ お知らせ", data.text);
    }
});

// 🌟 メイプル風カスタムアラートを表示するヘルパー関数
function showGameAlert(title, message) {
    // 既存のアラートがあれば削除
    const existingAlert = document.getElementById('game-custom-alert');
    if (existingAlert) existingAlert.remove();

    const alertBox = document.createElement('div');
    alertBox.id = 'game-custom-alert';
    alertBox.style.cssText = `
        position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
        width: 280px; background: #eceff1; border: 2px solid #334155; border-radius: 6px;
        box-shadow: 0 20px 40px rgba(0,0,0,0.6); z-index: 20000;
        font-family: 'Segoe UI', Tahoma, sans-serif; overflow: hidden;
    `;

    alertBox.innerHTML = `
        <div style="background: linear-gradient(180deg, #384e77 0%, #1a2942 100%); padding: 6px 12px; color: #ffffff; font-weight: bold; font-size: 11px; display: flex; justify-content: space-between; align-items: center;">
            <span>${title}</span>
            <button onclick="document.getElementById('game-custom-alert').remove()" style="background: #dc2626; color: white; border: none; width: 16px; height: 16px; border-radius: 3px; cursor: pointer; font-size: 10px; font-weight: bold; display: flex; align-items: center; justify-content: center;">✕</button>
        </div>
        <div style="padding: 16px; background: #f8fafc; text-align: center; font-size: 12px; color: #1e293b; font-weight: 600;">
            ${message}
        </div>
        <div style="padding: 8px; background: #dfe4ea; text-align: center; border-top: 1px solid #94a3b8;">
            <button onclick="document.getElementById('game-custom-alert').remove()" style="background: linear-gradient(180deg, #fbbf24 0%, #d97706 100%); color: white; border: 1px solid #b45309; padding: 4px 16px; border-radius: 4px; font-size: 11px; font-weight: bold; cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">OK</button>
        </div>
    `;

    document.body.appendChild(alertBox);
}

// ============================================================
// :::VENDING_REVENUE_LISTENER::: 💰 露店売上金のリアルタイム受取通知リスナー
// ============================================================
if (typeof socket !== 'undefined' && socket) {
    if (!window._vendingRevenueSocketInitialized) {
        window._vendingRevenueSocketInitialized = true;

        socket.on('vending_revenue_updated', (data) => {
            console.log("💰 [Vending] 売上金が更新されました:", data);

            const goldSpan = document.getElementById('vending-unclaimed-gold');
            if (goldSpan) {
                // サーバーから送られてきた最新の未受取売上金をそのまま反映する
                const unclaimed = Number(data.unclaimedGold || 0);
                goldSpan.innerText = unclaimed.toLocaleString();
            }

            // オプション：商品が売れたことをシステムメッセージ等で軽く知らせる場合
            if (typeof showFloatingText === 'function' && data.earnedGold) {
                // 必要に応じて画面上に「売上 +〇〇メル！」などの演出を入れることもできます
            }
        });
    }
}

// ============================================================
// 🎨 [SECTION 7: INITIALIZER] 起動・エントリーポイント
// 役割: ゲーム開始ボタンの処理、初期化、メインループの開始
// ============================================================
// ============================================================
// :::GAME_UPDATE_LOOP::: 💓 ゲームメインループ・心臓部
// ============================================================
// 読み込み済みかどうかのフラグ
let hasRequestedAccountInfo = false;
let hoveredEquipItem = null;
let hoveredEquipMouseX = 0;
let hoveredEquipMouseY = 0;

function update() {

    // 🌟 接続が切れていたら「位置計算」と「サーバー送信」をスキップする
    if (window.isDisconnected) {
        // 描画処理だけは実行する（「接続が切れました」画面を出すため）
        if (typeof drawGame === 'function') {
            drawGame(hero, others, enemies, items, platforms, ladders, damageTexts, frame);
        }
        requestAnimationFrame(update); // 次のフレームへ
        return; // ⚠️ ここで処理を中断し、以下の移動・戦闘・送信処理には行かない
    }
    
    frame++; // フレームカウント（アニメーション同期用）
    
    // 🌟 ここを追加：現在時刻と最後に通信した時刻を比較
    if (Date.now() - window.lastReceivedTime > 3000) {
        window.isDisconnected = true;
    }

    // まだリクエストしていなければ、1回だけ送信
    if (!hasRequestedAccountInfo && typeof socket !== 'undefined') {
        socket.emit('get_account_info');
        hasRequestedAccountInfo = true;
    }
    
    // 🌟 【追加】ここで常にオプション設定とheroを同期させる
    if (typeof hero !== 'undefined' && gameWindows.options) {
        //hero.isLinked = gameWindows.options.isLinked;
    }
    if (typeof hero !== 'undefined' && gameWindows.options) {
        //hero.isOnline = gameWindows.options.isOnline;
    }
    // ----------------------------------------------------

    // --- 🌟 修正：モーダル表示中かどうかの判定を追加 ---
    const quantityModal = document.getElementById('vending-quantity-modal');
    const isModalOpen = quantityModal && quantityModal.style.display !== 'none';
    // ----------------------------------------------

    // 1. 各要素の状態更新（切り出した関数を順番に実行）
    updateItemsPhysics();      // アイテムの物理挙動
    updateEffectsAndTimers();  // エフェクト・タイマーの更新

    // 2. プレイヤーの入力処理
    if (!isModalOpen) {
        handlePlayerInput(hero, items, ladders, document.getElementById('chat-in'));
    } else {
        // モーダル操作中にキャラが滑っていかないように速度をゼロに固定
        hero.vx = 0;
    }

    // 3. 物理移動と接地判定
    let isTouchingAnything = hero.applyPhysics(platforms);
	
	// 6. エラー防止用の最終接地保証
    if (typeof isTouchingAnything !== 'undefined' && isTouchingAnything) {
        hero.jumping = false;
        hero.dy = 0;
    }

    // 🌟 【修正】立ち止まっているときのHP自動回復（サーバーへ回復リクエストを送る方式）
    if (isTouchingAnything && hero.hp < hero.maxHp && !hero.isStunned) {
        if (!hero.vx || Math.abs(hero.vx) === 0) {
            hero.idleTimer = (hero.idleTimer || 0) + 1;
            
            // 約1秒（60フレーム）静止し続けたらサーバーに回復を依頼する
            if (hero.idleTimer >= 60) {
                if (typeof socket !== 'undefined') {
                    // サーバー側に回復処理をリクエスト（既存の player_healed イベントと連動させます）
                    socket.emit('request_idle_heal'); 
                }
                hero.idleTimer = 0; // タイマーをリセット
            }
        } else {
            hero.idleTimer = 0;
        }
    } else {
        hero.idleTimer = 0;
    }

    // 4. 戦闘・当たり判定
    if (!isModalOpen) {
        updatePlayerCombat();
    }

    // 5. サーバー同期と描画
    // 🌟 修正：heroオブジェクトの必要な情報を整理して送る
    socket.emit('move', {
        x: hero.x,
        y: hero.y,
        vx: hero.vx || 0,
        dir: hero.dir,
        jumping: hero.jumping,
        isAttacking: hero.isAttacking,
        climbing: hero.climbing,
        invincible: hero.invincible,
        
        // --- 🌟 追加：連携情報をサーバー経由で他プレイヤーへ共有 ---
        isLinked: hero.isLinked,
        isOnline: hero.isOnline,
        
        // 露店関連の同期
        is_vending: hero.is_vending,
        vending_title: hero.vending_title,
        
        // 🌟 追加：自分のエモーションIDをサーバー経由で他プレイヤーへ共有
        emotionId: hero.emotionId || null,
        
        currentFrame: frame
    });

    // 🌟 攻撃の「のっそり」対策
    if (!isModalOpen && hero.isAttacking === 20) {
        socket.emit('player_attack', { id: socket.id });
    }

    // --- [描画処理：ここから] ---
    if (typeof drawGame === 'function') {
        drawGame(hero, others, enemies, items, platforms, ladders, damageTexts, frame);
    }
	
	// 🌟 ここに露店管理ウィンドウのプレビュー更新処理を追加！
    updateVendingUIFrame();
	
	// 🪙 【追加】ショップ閲覧ウィンドウが開いている間、所持金表示を常に最新に同期・更新する
    if (typeof updateUserMoneyDisplay === 'function') {
        updateUserMoneyDisplay();
    }

    requestAnimationFrame(update); // 次のフレームへ
}

/*
// 🌍 現在ワールドに存在する露店の看板データを保持する配列
let activeOfflineShops = [];

// 1. サーバーからの開店・閉店通知を受け取る
if (typeof socket !== 'undefined') {
    // 露店が開いたときの通知
    socket.on('vending_opened', (data) => {
        // data には { id, vending_title, title, x, y, items } が入ってきます
        const shopId = data.id;
        const shopTitle = data.vending_title || data.title || "いらっしゃいませ！";

        // 既にリストにあるかチェック
        let existingIndex = activeOfflineShops.findIndex(shop => shop.owner_id === shopId);
        if (existingIndex !== -1) {
            activeOfflineShops[existingIndex].title = shopTitle;
            activeOfflineShops[existingIndex].x = data.x;
            activeOfflineShops[existingIndex].y = data.y;
        } else {
            activeOfflineShops.push({
                owner_id: shopId,
                title: shopTitle,
                x: data.x,
                y: data.y
            });
        }
        console.log("露店の看板データを同期しました。現在の店舗数:", activeOfflineShops.length);
    });

    // 露店が閉じた（完売や手動終了）ときの通知
    socket.on('vending_closed', (data) => {
        // data.id は閉店したプレイヤーのID
        activeOfflineShops = activeOfflineShops.filter(shop => shop.owner_id !== data.id);
        console.log("露店が閉店したため、看板を削除しました。残りの店舗数:", activeOfflineShops.length);
    });
}
*/

// 🌟 現在選択中の店番モンスター（初期値はデフォルトのモンスター）
let selectedVendingMonsterType = "Monster1";

// ============================================================
// :::RENDER_OFFLINE_VENDING_SIGNS::: ⛺ 無人露店の小屋（ウィンドウ連動切替版）
// ============================================================
function renderOfflineVendingSigns(ctx, frame) {
    if (!activeOfflineShops || activeOfflineShops.length === 0) return;

    const DEFAULT_VENDING_MONSTER = "Monster5"; 
    const VENDING_PADDING_W = 65; 

    if (typeof window._vendingSizeCache === 'undefined') {
        window._vendingSizeCache = {};
    }

    // コイン画像用キャッシュの初期化
    if (typeof window._moneyIconImg === 'undefined') {
        window._moneyIconImg = new Image();
        window._moneyIconImg.src = "/item_assets/money-1.png";
    }

    const myCurrentChannel = (typeof hero !== 'undefined' && hero.channel !== undefined) ? Number(hero.channel) : 1;

    activeOfflineShops.forEach(shop => {
        let shopTargetChannel = Number(shop.channel ?? shop.channelId ?? shop.ch ?? 1);

        // 🌟 チャンネルガード
        if (myCurrentChannel !== shopTargetChannel) {
            shop.rect = null; 
            shop.vending_rect = null;
            return; 
        }

        const isMyStore = (typeof hero !== 'undefined' && (shop.owner_id === hero.dbId || shop.dbId === hero.dbId));

        // 🌟 【自動判定】自分がこの店舗のオーナーであり、かつ現在vending-windowを開いているかどうか
        // ※ゲーム内のウィンドウ管理変数やDOMの存在に合わせて柔軟に判定できるようにしています
        // 🌟 確実に「明示的にtrueに設定されている時」だけ開いている判定にする
		const isOpenWindowFlag = (window.isVendingWindowOpen === true);
        const isEditingMyStore = isMyStore && isOpenWindowFlag;

        // オーダー中（ウィンドウが開いている時）は「真実として赤丸をメイン」にする
        // 🌟 修正後：他人の店であってもサーバーから isEditing が来ていれば赤丸にする！
		const isShopBeingEdited = shop.isEditing || (isMyStore && window.isVendingWindowOpen === true);
		const SHOW_RED_MARK = isShopBeingEdited;

        let rawMonsterType = shop.monsterType || DEFAULT_VENDING_MONSTER;
        let strType = String(rawMonsterType).trim();
        if (/^\d+$/.test(strType)) {
            strType = "Monster" + strType;
        }
        const VENDING_MONSTER_TYPE = strType; 

        const shopX = Math.round(shop.x || 0);
        const shopY = Math.round(shop.y || 0);

        ctx.save();

        const monsterConf = (typeof MONSTER_CONFIGS !== 'undefined' && Array.isArray(MONSTER_CONFIGS)) 
            ? MONSTER_CONFIGS.find(conf => 
                String(conf.id) === VENDING_MONSTER_TYPE || 
                String(conf.id) === String(rawMonsterType)
              ) 
            : null;

        const vendorEnemy = {
            id: VENDING_MONSTER_TYPE,
            type: VENDING_MONSTER_TYPE,
            name: VENDING_MONSTER_TYPE,
            scale: monsterConf ? (monsterConf.scale || 1.0) : 1.0,
            x: shopX,
            y: shopY,
            w: monsterConf ? (monsterConf.w || 50) : 50,
            h: monsterConf ? (monsterConf.h || 50) : 50,
            kbV: 0,
            isFading: false,
            waitTimer: 999
        };

        const checkKey = VENDING_MONSTER_TYPE + "Idle";
        if (typeof sprites !== 'undefined' && (!sprites[checkKey] || sprites[checkKey].length === 0)) {
            if (typeof ensureEnemySpritesLoaded === 'function') {
                ensureEnemySpritesLoaded(VENDING_MONSTER_TYPE, VENDING_MONSTER_TYPE);
            }
        }

        const currentFrame = (typeof frame !== 'undefined') ? frame : (window.gameFrame || 0);
        let { img, drawW, drawH, footY } = getEnemyVisualData(vendorEnemy, sprites, currentFrame, null);

        const isImageReady = (img && img.complete && img.naturalWidth !== 0);
        if (!isImageReady) {
            shop.rect = null;
            shop.vending_rect = null;
            ctx.restore();
            return; 
        }

        let baseY;
        if (shopY > VIEW_CONFIG.groundThreshold) {
            baseY = VIEW_CONFIG.groundY;
        } else {
            let targetPlatformY = shopY;
            if (typeof platforms !== 'undefined' && Array.isArray(platforms)) {
                const matchedPlat = platforms.find(p => 
                    shopX >= p.x && shopX <= p.x + p.w && shopY >= p.y - 70 && shopY <= p.y + 10
                );
                if (matchedPlat) {
                    targetPlatformY = matchedPlat.y;
                }
            }
            baseY = targetPlatformY;
        }

        let cacheKeyName = VENDING_MONSTER_TYPE;
        if (!window._vendingSizeCache[cacheKeyName]) {
            let effectiveWidth = (drawW > 0) ? drawW : (monsterConf ? monsterConf.w : 40);
            let effectiveHeight = (img && footY) ? footY : (monsterConf ? monsterConf.h : 50);

            try {
                const natW = img.naturalWidth;
                const natH = img.naturalHeight;
                const offCanvas = document.createElement('canvas');
                offCanvas.width = natW;
                offCanvas.height = natH;
                const offCtx = offCanvas.getContext('2d');
                offCtx.imageSmoothingEnabled = false;
                offCtx.drawImage(img, 0, 0, natW, natH);

                const imgData = offCtx.getImageData(0, 0, natW, natH);
                const data = imgData.data;
                let minX = natW, maxX = 0;
                let minY = natH, maxY = 0;
                let hasPixels = false;

                for (let y = 0; y < natH; y++) {
                    for (let x = 0; x < natW; x++) {
                        const alpha = data[(y * natW + x) * 4 + 3];
                        if (alpha > 15) {
                            if (x < minX) minX = x;
                            if (x > maxX) maxX = x;
                            if (y < minY) minY = y;
                            if (y > maxY) maxY = y;
                            hasPixels = true;
                        }
                    }
                }
                if (hasPixels) {
                    const cropW = maxX - minX + 1;
                    const cropH = maxY - minY + 1;
                    effectiveWidth = Math.round(cropW * (drawW / natW));
                    effectiveHeight = Math.round(cropH * (drawH / natH));
                }
            } catch (e) {}

            if (drawW > 0) {
                window._vendingSizeCache[cacheKeyName] = { w: effectiveWidth, h: effectiveHeight };
            }
        }

        const cachedSize = window._vendingSizeCache[cacheKeyName] || { 
            w: (drawW > 0 ? drawW : 40), 
            h: (monsterConf ? monsterConf.h : 50) 
        };

        const effectiveWidth = cachedSize.w;
        const effectiveHeight = cachedSize.h;

        const kioskWidth = Math.min(245, Math.max(175, Math.round(effectiveWidth + VENDING_PADDING_W))); 
        const halfKiosk = Math.round(kioskWidth / 2);
        
        const boardWidth = kioskWidth + 12; 
        const boardHeight = 50; 
        const barHeight = 30;   
        
        const kioskInsideHeight = effectiveHeight + boardHeight + barHeight + 12;
        const roofHeight = 34;   
        
        const leftX = shopX - halfKiosk;
        const rightX = shopX + halfKiosk;
        const bottomY = baseY;
        
        const roofBaseY = bottomY - kioskInsideHeight; 
        const roofApexY = roofBaseY - roofHeight;      

        const boardX = shopX - Math.round(boardWidth / 2);
        const boardY = roofBaseY + 6; 
        const barY = boardY + boardHeight;

        // ==========================================
        // 1️⃣ 足元のウッドステージ（横ストライプ仕様）
        // ==========================================
        const stageInset = 12; 
        const stageLeftX = leftX + stageInset;
        const stageRightX = rightX - stageInset;

        ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
        ctx.beginPath();
        ctx.ellipse(shopX, bottomY - 1, Math.max(22, (effectiveWidth / 2) - 2), 5, 0, 0, Math.PI * 2);
        ctx.fill();

        const stageTopY = bottomY - 10;
        const stageH = 10;
        const stageW = (stageRightX + 6) - (stageLeftX - 6);

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(stageLeftX - 6, bottomY);
        ctx.lineTo(stageRightX + 6, bottomY);
        ctx.lineTo(stageRightX + 3, stageTopY);
        ctx.lineTo(stageLeftX - 3, stageTopY);
        ctx.closePath();
        ctx.clip();

        const stageGrad = ctx.createLinearGradient(stageLeftX - 6, stageTopY, stageLeftX - 6, bottomY);
        stageGrad.addColorStop(0, "#7ab2d6");
        stageGrad.addColorStop(0.5, "#5087b0");
        stageGrad.addColorStop(1, "#284660");
        ctx.fillStyle = stageGrad;
        ctx.fillRect(stageLeftX - 10, stageTopY - 2, stageW + 20, stageH + 4);

        ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
        for (let sy = stageTopY + 3; sy < bottomY; sy += 3) {
            ctx.fillRect(stageLeftX - 10, sy, stageW + 20, 1);
        }
        ctx.fillStyle = "rgba(0, 0, 0, 0.15)";
        for (let sy = stageTopY + 4; sy < bottomY; sy += 3) {
            ctx.fillRect(stageLeftX - 10, sy, stageW + 20, 1);
        }
        ctx.restore();

        ctx.strokeStyle = "#1b3142";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(stageLeftX - 6, bottomY);
        ctx.lineTo(stageRightX + 6, bottomY);
        ctx.lineTo(stageRightX + 3, stageTopY);
        ctx.lineTo(stageLeftX - 3, stageTopY);
        ctx.closePath();
        ctx.stroke();

        // ==========================================
        // 2️⃣ 木目ヘルパー関数
        // ==========================================
        const drawTexturedWood = (x, y, w, h, baseColor1, baseColor2) => {
            const grad = ctx.createLinearGradient(x, y, x + w, y);
            grad.addColorStop(0, baseColor1);
            grad.addColorStop(0.5, baseColor2);
            grad.addColorStop(1, baseColor1);
            ctx.fillStyle = grad;
            ctx.fillRect(x, y, w, h);

            ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
            for (let px = x + 3; px < x + w; px += 5) {
                ctx.fillRect(px, y, 1, h);
            }
            ctx.fillStyle = "rgba(0, 0, 0, 0.15)";
            for (let px = x + 5; px < x + w; px += 5) {
                ctx.fillRect(px, y, 1, h);
            }
        };

        // ==========================================
        // 3️⃣ 左右の柱（縦ストライプ仕様）
        // ==========================================
        const pillarWidth = 10;
        const pillarHeight = kioskInsideHeight - 10;
        const pillarInnerOffset = 18; 
        
        const leftPillarX = leftX + pillarInnerOffset;
        const rightPillarX = rightX - pillarWidth - pillarInnerOffset;

        const drawPillarWithVerticalStripes = (px, py, pw, ph) => {
            ctx.save();
            ctx.beginPath();
            ctx.rect(px, py, pw, ph);
            ctx.clip();

            const pGrad = ctx.createLinearGradient(px, py, px + pw, py);
            pGrad.addColorStop(0, "#365c7d");
            pGrad.addColorStop(0.5, "#72a2c9");
            pGrad.addColorStop(1, "#365c7d");
            ctx.fillStyle = pGrad;
            ctx.fillRect(px, py, pw, ph);

            ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
            for (let x = px + 3; x < px + pw; x += 4) {
                ctx.fillRect(x, py, 1, ph);
            }
            ctx.fillStyle = "rgba(0, 0, 0, 0.15)";
            for (let x = px + 5; x < px + pw; x += 4) {
                ctx.fillRect(x, py, 1, ph);
            }
            ctx.restore();

            ctx.strokeStyle = "#152433";
            ctx.lineWidth = 1.5;
            ctx.strokeRect(px, py, pw, ph);
        };

        drawPillarWithVerticalStripes(leftPillarX, roofBaseY, pillarWidth, pillarHeight);
        drawPillarWithVerticalStripes(rightPillarX, roofBaseY, pillarWidth, pillarHeight);

        // ==========================================
        // 4️⃣ 屋根下・看板上の余白壁（斜めストライプ）
        // ==========================================
        const wallX = leftX + 4;
        const wallY = roofBaseY;
        const wallW = kioskWidth - 8;
        const wallH = boardY - roofBaseY;

        ctx.save();
        ctx.beginPath();
        ctx.rect(wallX, wallY, wallW, wallH);
        ctx.clip();

        const wallGrad = ctx.createLinearGradient(wallX, wallY, wallX + wallW, wallY);
        wallGrad.addColorStop(0, "#365c7d");
        wallGrad.addColorStop(0.5, "#72a2c9");
        wallGrad.addColorStop(1, "#365c7d");
        ctx.fillStyle = wallGrad;
        ctx.fillRect(wallX, wallY, wallW, wallH);

        ctx.lineWidth = 1.5;
        for (let offset = -wallH; offset < wallW + wallH; offset += 6) {
            ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
            ctx.beginPath();
            ctx.moveTo(wallX + offset, wallY);
            ctx.lineTo(wallX + offset - wallH, wallY + wallH);
            ctx.stroke();

            ctx.strokeStyle = "rgba(0, 0, 0, 0.18)";
            ctx.beginPath();
            ctx.moveTo(wallX + offset + 2, wallY);
            ctx.lineTo(wallX + offset + 2 - wallH, wallY + wallH);
            ctx.stroke();
        }
        ctx.restore();

        ctx.strokeStyle = "#152433";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(wallX, wallY, wallW, wallH);

        // ==========================================
        // 5️⃣ 店番キャラクター / モンスター
        // ==========================================
        ctx.save();
        ctx.translate(shopX, baseY);

        const shopUniqueId = Number(shop.id || shop.owner_id || 0);
        const switchInterval = 300; 
        const timeSeed = Math.floor((currentFrame + shopUniqueId * 73) / switchInterval);
        const isFacingLeft = (timeSeed % 2 === 0);

        if (isFacingLeft) {
            ctx.scale(-1, 1);
        }

        ctx.drawImage(img, Math.round(-drawW / 2), Math.round(-footY), drawW, drawH);
        ctx.restore();

        // ==========================================
        // 6️⃣ 屋根（への字・斜めストライプ）＆隙間埋めガセット壁
        // ==========================================
        const rLeft = leftX - 18;
        const rRight = rightX + 18;
        const rThick = 12; 

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(shopX, roofApexY + rThick);
        ctx.lineTo(rRight, roofBaseY);
        ctx.lineTo(rLeft, roofBaseY);
        ctx.closePath();
        ctx.clip();

        const infillGrad = ctx.createLinearGradient(leftX, roofBaseY - roofHeight, leftX, roofBaseY);
        infillGrad.addColorStop(0, "#72a2c9");
        infillGrad.addColorStop(1, "#365c7d");
        ctx.fillStyle = infillGrad;
        ctx.fillRect(leftX - 20, roofBaseY - roofHeight, kioskWidth + 40, roofHeight + 5);

        ctx.lineWidth = 1.5;
        for (let offset = -roofHeight; offset < kioskWidth + roofHeight; offset += 6) {
            ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
            ctx.beginPath();
            ctx.moveTo(leftX + offset, roofBaseY - roofHeight);
            ctx.lineTo(leftX + offset - roofHeight, roofBaseY);
            ctx.stroke();

            ctx.strokeStyle = "rgba(0, 0, 0, 0.18)";
            ctx.beginPath();
            ctx.moveTo(leftX + offset + 2, roofBaseY - roofHeight);
            ctx.lineTo(leftX + offset + 2 - roofHeight, roofBaseY);
            ctx.stroke();
        }
        ctx.restore();

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(shopX, roofApexY);
        ctx.lineTo(rRight, roofBaseY);
        ctx.lineTo(rRight - 2, roofBaseY + rThick);
        ctx.lineTo(shopX, roofApexY + rThick);
        ctx.lineTo(rLeft + 2, roofBaseY + rThick);
        ctx.lineTo(rLeft, roofBaseY);
        ctx.closePath();
        ctx.clip();

        const roofGrad = ctx.createLinearGradient(0, roofApexY, 0, roofBaseY + rThick);
        roofGrad.addColorStop(0, "#bde0fe");
        roofGrad.addColorStop(0.5, "#7ab2d6");
        roofGrad.addColorStop(1, "#32536e");
        ctx.fillStyle = roofGrad;
        ctx.fillRect(rLeft - 10, roofApexY - 5, (rRight - rLeft) + 20, roofHeight + rThick + 10);

        ctx.lineWidth = 1.5;
        for (let offset = -50; offset < (rRight - rLeft) + 100; offset += 6) {
            ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
            ctx.beginPath();
            ctx.moveTo(rLeft + offset, roofApexY - 10);
            ctx.lineTo(rLeft + offset - 40, roofBaseY + roofHeight + 10);
            ctx.stroke();

            ctx.strokeStyle = "rgba(0, 0, 0, 0.18)";
            ctx.beginPath();
            ctx.moveTo(rLeft + offset + 2, roofApexY - 10);
            ctx.lineTo(rLeft + offset + 2 - 40, roofBaseY + roofHeight + 10);
            ctx.stroke();
        }
        ctx.restore();

        ctx.strokeStyle = "#152433";
        ctx.lineWidth = 2;
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(shopX, roofApexY);
        ctx.lineTo(rRight, roofBaseY);
        ctx.lineTo(rRight - 2, roofBaseY + rThick);
        ctx.lineTo(shopX, roofApexY + rThick);
        ctx.lineTo(rLeft + 2, roofBaseY + rThick);
        ctx.lineTo(rLeft, roofBaseY);
        ctx.closePath();
        ctx.stroke();

        // ==========================================
        // 7️⃣ 看板エリア（窪み・溝表現 ＆ 微調整された上下左右均等配置）
        // ==========================================
        ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
        ctx.fillRect(boardX + 1, boardY + 2, boardWidth, boardHeight);

        ctx.save();
        ctx.beginPath();
        ctx.rect(boardX, boardY, boardWidth, boardHeight);
        ctx.clip();
        const bFrameGrad = ctx.createLinearGradient(boardX, boardY, boardX + boardWidth, boardY);
        bFrameGrad.addColorStop(0, "#365c7d");
        bFrameGrad.addColorStop(0.5, "#72a2c9");
        bFrameGrad.addColorStop(1, "#365c7d");
        ctx.fillStyle = bFrameGrad;
        ctx.fillRect(boardX, boardY, boardWidth, boardHeight);
        ctx.lineWidth = 1.5;
        for (let offset = -boardHeight; offset < boardWidth + boardHeight; offset += 6) {
            ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
            ctx.beginPath();
            ctx.moveTo(boardX + offset, boardY);
            ctx.lineTo(boardX + offset - boardHeight, boardY + boardHeight);
            ctx.stroke();
            ctx.strokeStyle = "rgba(0, 0, 0, 0.18)";
            ctx.beginPath();
            ctx.moveTo(boardX + offset + 2, boardY);
            ctx.lineTo(boardX + offset + 2 - boardHeight, boardY + boardHeight);
            ctx.stroke();
        }
        ctx.restore();

        ctx.strokeStyle = "#152433";
        ctx.lineWidth = 2;
        ctx.strokeRect(boardX, boardY, boardWidth, boardHeight);

        const innerBoardX = boardX + 6; 
        const innerBoardY = boardY + 4;
        const innerBoardW = boardWidth - 12;
        const innerBoardH = boardHeight - 8;

        // 看板の凹み（溝）
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(innerBoardX - 2, innerBoardY - 2, innerBoardW + 4, innerBoardH + 4);

        ctx.save();
        ctx.beginPath();
        ctx.rect(innerBoardX - 1, innerBoardY - 1, innerBoardW + 2, innerBoardH + 2);
        ctx.clip();

        const boardBgGrad = ctx.createLinearGradient(innerBoardX, innerBoardY, innerBoardX + innerBoardW, innerBoardY);
        boardBgGrad.addColorStop(0, "#cbd5e1");
        boardBgGrad.addColorStop(0.5, "#f1f5f9");
        boardBgGrad.addColorStop(1, "#cbd5e1");
        ctx.fillStyle = boardBgGrad;
        ctx.fillRect(innerBoardX - 1, innerBoardY - 1, innerBoardW + 2, innerBoardH + 2);

        ctx.lineWidth = 1;
        for (let offset = -innerBoardH; offset < innerBoardW + innerBoardH; offset += 6) {
            ctx.strokeStyle = "rgba(148, 163, 184, 0.35)";
            ctx.beginPath();
            ctx.moveTo(innerBoardX - 1 + offset, innerBoardY - 1);
            ctx.lineTo(innerBoardX - 1 + offset - innerBoardH, innerBoardY - 1 + innerBoardH + 2);
            ctx.stroke();
        }
        ctx.restore();

        ctx.strokeStyle = "rgba(15, 23, 42, 0.4)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(innerBoardX, innerBoardY + innerBoardH);
        ctx.lineTo(innerBoardX, innerBoardY);
        ctx.lineTo(innerBoardX + innerBoardW, innerBoardY);
        ctx.stroke();

        ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
        ctx.beginPath();
        ctx.moveTo(innerBoardX, innerBoardY + innerBoardH);
        ctx.lineTo(innerBoardX + innerBoardW, innerBoardY + innerBoardH);
        ctx.lineTo(innerBoardX + innerBoardW, innerBoardY);
        ctx.stroke();

        // --- 看板のテキスト描画 ---
        ctx.textAlign = "left";
        ctx.textBaseline = "alphabetic";
        ctx.font = "bold 12px 'Segoe UI', Tahoma, sans-serif";

        let rawTitle = shop.title || "書など";
        let lines = [];
        if (rawTitle.includes('\n')) {
            lines = rawTitle.split('\n').slice(0, 2);
        } else {
            let maxLen = 13;
            if (rawTitle.length > maxLen) {
                lines.push(rawTitle.substring(0, maxLen));
                lines.push(rawTitle.substring(maxLen, maxLen * 2));
            } else {
                lines.push(rawTitle);
            }
        }

        let textLeftMargin = innerBoardX + 10; 
        let y1 = innerBoardY + 18;             
        let y2 = innerBoardY + 33;             

        // 1行目
        ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
        ctx.fillText(lines[0], textLeftMargin, y1 + 1);
        ctx.fillStyle = "#0f172a";
        ctx.fillText(lines[0], textLeftMargin, y1);

        // 2行目がある場合
        if (lines.length > 1) {
            ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
            ctx.fillText(lines[1], textLeftMargin, y2 + 1);
            ctx.fillStyle = "#0f172a";
            ctx.fillText(lines[1], textLeftMargin, y2);
        }

        ctx.fillStyle = "#2563eb";
        ctx.beginPath();
        ctx.moveTo(innerBoardX + innerBoardW - 8, innerBoardY + innerBoardH - 2);
        ctx.lineTo(innerBoardX + innerBoardW - 2, innerBoardY + innerBoardH - 2);
        ctx.lineTo(innerBoardX + innerBoardW - 2, innerBoardY + innerBoardH - 8);
        ctx.closePath();
        ctx.fill();

        // ==========================================
        // 8️⃣ 下部バー
        // ==========================================
        ctx.save();
        ctx.beginPath();
        ctx.rect(boardX, barY, boardWidth, barHeight);
        ctx.clip();

        const barBgGrad = ctx.createLinearGradient(boardX, barY, boardX + boardWidth, barY);
        barBgGrad.addColorStop(0, "#365c7d");
        barBgGrad.addColorStop(0.5, "#72a2c9");
        barBgGrad.addColorStop(1, "#365c7d");
        ctx.fillStyle = barBgGrad;
        ctx.fillRect(boardX, barY, boardWidth, barHeight);

        ctx.lineWidth = 1.5;
        for (let offset = -barHeight; offset < boardWidth + barHeight; offset += 6) {
            ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
            ctx.beginPath();
            ctx.moveTo(boardX + offset, barY);
            ctx.lineTo(boardX + offset - barHeight, barY + barHeight);
            ctx.stroke();

            ctx.strokeStyle = "rgba(0, 0, 0, 0.18)";
            ctx.beginPath();
            ctx.moveTo(boardX + offset + 2, barY);
            ctx.lineTo(boardX + offset + 2 - barHeight, barY + barHeight);
            ctx.stroke();
        }
        ctx.restore();

        ctx.strokeStyle = "#456f94";
        ctx.lineWidth = 2;
        ctx.strokeRect(boardX, barY, boardWidth, barHeight);

        const drawFixPlate = (fx, fy) => {
            ctx.fillStyle = "#284660";
            ctx.strokeStyle = "#152433";
            ctx.lineWidth = 1;
            ctx.fillRect(fx - 4, fy, 8, barHeight);
            ctx.strokeRect(fx - 4, fy, 8, barHeight);
            
            ctx.fillStyle = "#0f172a";
            ctx.beginPath();
            ctx.arc(fx, fy + 8, 1.5, 0, Math.PI * 2);
            ctx.arc(fx, fy + barHeight - 8, 1.5, 0, Math.PI * 2);
            ctx.fill();
        };
        drawFixPlate(boardX + 4, barY);
        drawFixPlate(boardX + boardWidth - 4, barY);

        // --- 🌟 コインアイコン（money-1.png ＋ グローホワイト発光エフェクト） ---
        const coinX = boardX + 32;
        const iconCenterY = barY + (barHeight / 2); 
        const iconSize = 16; 

        ctx.save();
        ctx.shadowColor = "#ffffff";
        ctx.shadowBlur = 8;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        if (window._moneyIconImg && window._moneyIconImg.complete && window._moneyIconImg.naturalWidth !== 0) {
            ctx.drawImage(
                window._moneyIconImg, 
                Math.round(coinX - iconSize / 2), 
                Math.round(iconCenterY - iconSize / 2), 
                iconSize, 
                iconSize
            );
        } else {
            ctx.beginPath();
            ctx.arc(coinX, iconCenterY, 7, 0, Math.PI * 2);
            ctx.fillStyle = "#facc15";
            ctx.fill();
            ctx.strokeStyle = "#854d0e";
            ctx.lineWidth = 1.2;
            ctx.stroke();
        }
        ctx.restore();

        // --- 🌟 鍵アイコン（フックを含めた全体の重心が中央に合うよう下に微調整） ---
        const lockX = boardX + 64; 
        const lockW = 12;
        const lockH = 10;
        const lockBodyTop = Math.round(iconCenterY - (lockH / 2) + 2); 

        ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
        ctx.fillRect(lockX - (lockW / 2), lockBodyTop + 2, lockW, lockH);

        const lockBodyGrad = ctx.createLinearGradient(lockX - (lockW / 2), lockBodyTop, lockX + (lockW / 2), lockBodyTop + lockH);
        lockBodyGrad.addColorStop(0, "#ffffff");
        lockBodyGrad.addColorStop(0.5, "#f1f5f9");
        lockBodyGrad.addColorStop(1, "#cbd5e1");
        ctx.fillStyle = lockBodyGrad;
        ctx.strokeStyle = "#64748b";
        ctx.lineWidth = 1.2;
        ctx.fillRect(lockX - (lockW / 2), lockBodyTop, lockW, lockH);
        ctx.strokeRect(lockX - (lockW / 2), lockBodyTop, lockW, lockH);

        ctx.fillStyle = "#94a3b8";
        ctx.beginPath();
        ctx.arc(lockX, lockBodyTop + 4.5, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(lockX - 0.75, lockBodyTop + 4.5, 1.5, 3);

        ctx.strokeStyle = "#cbd5e1";
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.arc(lockX, lockBodyTop, 4, Math.PI, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = "#94a3b8";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(lockX, lockBodyTop, 4, Math.PI * 1.2, Math.PI * 1.8);
        ctx.stroke();

        // ==========================================
        // 🌟 右側の操作パネル（ウィンドウ連動型：青丸 ⇔ 赤禁止マーク）
        // ==========================================
        const panelW = 60;
        const panelH = barHeight - 8;
        const panelX = boardX + boardWidth - panelW - 12;
        const panelY = barY + 4;

        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#cbd5e1";
        ctx.lineWidth = 1;
        if (ctx.roundRect) {
            ctx.beginPath();
            ctx.roundRect(panelX, panelY, panelW, panelH, 3);
            ctx.fill();
            ctx.stroke();
        } else {
            ctx.fillRect(panelX, panelY, panelW, panelH);
            ctx.strokeRect(panelX, panelY, panelW, panelH);
        }

        const leftCircleX = panelX + 18;
        const rightCircleX = panelX + 42;
        const circleCenterY = panelY + (panelH / 2); 

        if (SHOW_RED_MARK) {
            // --- 🔴 ウィンドウが開いている時（赤丸がメイン・赤禁止マーク） ---
            ctx.save();
            ctx.globalAlpha = 0.2; // 左の青丸はうっすら待機
            ctx.beginPath();
            ctx.arc(leftCircleX, circleCenterY, 5, 0, Math.PI * 2);
            ctx.strokeStyle = "#0284c7"; 
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.restore();

            // 右の赤丸をくっきり表示し、斜線を引いて「禁止マーク」にする
            ctx.beginPath();
            ctx.arc(rightCircleX, circleCenterY, 5, 0, Math.PI * 2);
            ctx.strokeStyle = "#dc2626"; 
            ctx.lineWidth = 1.8;
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(rightCircleX - 3.5, circleCenterY - 3.5);
            ctx.lineTo(rightCircleX + 3.5, circleCenterY + 3.5);
            ctx.strokeStyle = "#dc2626";
            ctx.lineWidth = 1.5;
            ctx.stroke();

        } else {
            // --- 🔵 ウィンドウが閉じている時（通常営業：青丸がメイン） ---
            // 左の青丸をくっきり表示
            ctx.beginPath();
            ctx.arc(leftCircleX, circleCenterY, 5, 0, Math.PI * 2);
            ctx.strokeStyle = "#0284c7"; 
            ctx.lineWidth = 1.8;
            ctx.stroke();

            ctx.save();
            ctx.globalAlpha = 0.2; // 右の赤丸はうっすら待機
            ctx.beginPath();
            ctx.arc(rightCircleX, circleCenterY, 5, 0, Math.PI * 2);
            ctx.strokeStyle = "#dc2626"; 
            ctx.lineWidth = 1.5;
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(rightCircleX - 3.5, circleCenterY - 3.5);
            ctx.lineTo(rightCircleX + 3.5, circleCenterY + 3.5);
            ctx.strokeStyle = "#dc2626";
            ctx.lineWidth = 1.2;
            ctx.stroke();
            ctx.restore();
        }

        // ==========================================
        // 9️⃣ ネームプレート
        // ==========================================
        const ownerName = shop.name || shop.owner_name || shop.username || shop.ownerName || "プレイヤー";
        const merchantText = isMyStore ? `🏠 ${ownerName}の雇用商人` : `${ownerName}の雇用商人`;
        
        const fontSize = (typeof VIEW_CONFIG !== 'undefined' && VIEW_CONFIG.playerName) ? VIEW_CONFIG.playerName.fontSize : "12px";
        ctx.font = `bold ${fontSize} Arial`;
        
        const textWidth = ctx.measureText(merchantText).width;
        const paddingW = (typeof VIEW_CONFIG !== 'undefined' && VIEW_CONFIG.playerName) ? VIEW_CONFIG.playerName.paddingW : 16;
        const totalW = textWidth + paddingW;
        
        const bgW = totalW;
        const bgH = 20; 
        const bgX = shopX - Math.round(bgW / 2);
        const bgY = bottomY + 3; 
        const radius = 4; 

        ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
        ctx.beginPath();
        ctx.roundRect(bgX, bgY, bgW, bgH, radius);
        ctx.fill();
        
        ctx.textBaseline = "middle";
        const centerY = bgY + (bgH / 2);

        ctx.fillStyle = "#ffffff"; 
        ctx.textAlign = "center";
        ctx.fillText(merchantText, shopX, centerY - 1);
        
        ctx.textBaseline = "alphabetic";

        // ==========================================
        // 🌟 クリック・ホバー判定用矩形の登録
        // ==========================================
        shop.rect = {
            x: leftX - 18,
            y: roofApexY - 10,
            w: kioskWidth + 36,
            h: bottomY - (roofApexY - 10)
        };
        shop.vending_rect = shop.rect;

        ctx.restore();
    });
}

// ============================================================
// :::OPEN_MONSTER_SELECTOR_FOR_VENDING::: 👾 雇用商人変更用のモンスター選択画面（即時反映・修正版）
// ============================================================
function openMonsterSelectorForVending() {
    // 既存の選択モーダルがあれば二重生成しないように削除
    const existingModal = document.getElementById('vending-monster-select-modal');
    if (existingModal) existingModal.remove();

    // モーダル要素の作成
    const modal = document.createElement('div');
    modal.id = 'vending-monster-select-modal';
    modal.style.cssText = `
        position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
        width: 340px; max-height: 420px; background: #eceff1; border: 2px solid #334155;
        border-radius: 6px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); z-index: 10001;
        display: flex; flex-direction: column; overflow: hidden; font-family: 'Segoe UI', sans-serif;
    `;

    // ヘッダー
    const header = document.createElement('div');
    header.style.cssText = `
        background: linear-gradient(180deg, #384e77 0%, #1a2942 100%);
        padding: 6px 10px; display: flex; justify-content: space-between; align-items: center; color: white; font-weight: bold; font-size: 11px;
    `;
    header.innerHTML = `<span>👾 店番モンスターを選択</span><button onclick="document.getElementById('vending-monster-select-modal').remove()" style="background: #dc2626; color: white; border: none; width: 16px; height: 16px; border-radius: 3px; cursor: pointer; font-size: 9px;">✕</button>`;
    modal.appendChild(header);

    // モンスター一覧のリストコンテナ
    const listContainer = document.createElement('div');
    listContainer.style.cssText = `
        padding: 8px; overflow-y: auto; max-height: 360px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; background: #dfe4ea;
    `;

    // 現在選択されているモンスターIDを特定（変数がない場合は hero からフォールバック取得）
    const activeMonsterId = (typeof currentVendingMonsterId !== 'undefined' ? currentVendingMonsterId : 
                            (typeof selectedVendingMonsterType !== 'undefined' ? selectedVendingMonsterType : 
                            (typeof hero !== 'undefined' ? hero.monsterType : null)));

    // MONSTER_CONFIGS から選択肢を動的生成
    if (typeof MONSTER_CONFIGS !== 'undefined' && Array.isArray(MONSTER_CONFIGS)) {
        MONSTER_CONFIGS.forEach(conf => {
            const itemBox = document.createElement('div');
            
            // 🌟 選択中かどうかの判定
            const isSelected = (String(conf.id) === String(activeMonsterId));

            itemBox.style.cssText = `
                background: ${isSelected ? '#fde68a' : '#ffffff'}; 
                border: ${isSelected ? '2px solid #d97706' : '1px solid #94a3b8'}; 
                border-radius: 4px; padding: 6px;
                display: flex; flex-direction: column; align-items: center; cursor: pointer; gap: 4px; transition: background 0.1s;
            `;

            // ホバー時の挙動（選択中なら黄色味をキープ、未選択なら薄い黄色に）
            itemBox.onmouseover = () => itemBox.style.background = isSelected ? '#fcd34d' : '#fef3c7';
            itemBox.onmouseout = () => itemBox.style.background = isSelected ? '#fde68a' : '#ffffff';

            // ポップアップのリスト項目をクリックしたときの処理
            itemBox.onclick = () => {
                console.group("🕵️‍♂️ [DEBUG: モンスター選択クリック解析]");
                console.log("1. 選択されたモンスターID (conf.id):", conf.id);
                console.log("2. hero の状態:", typeof hero !== 'undefined' ? hero : "未定義");
                console.log("3. hero.is_vending:", typeof hero !== 'undefined' ? hero.is_vending : "N/A");
                console.log("4. active_venders の状態:", typeof active_venders !== 'undefined' ? active_venders : "未定義");
                console.log("5. activeOfflineShops の状態:", typeof activeOfflineShops !== 'undefined' ? activeOfflineShops : "未定義");

                // 1. 変数に保存
                selectedVendingMonsterType = conf.id;
                currentVendingMonsterId = conf.id; 
                
                // 🌟 2. 【即時反映】主人公のデータも一緒に更新
                if (typeof hero !== 'undefined') {
                    hero.monsterType = conf.id;
                    console.log("✅ hero.monsterType を更新しました:", hero.monsterType);
                } else {
                    console.warn("⚠️ hero が未定義のため更新スキップ");
                }

                // 🌟 3. 【即時反映】もし active_venders があれば内部データも更新
                if (typeof active_venders !== 'undefined') {
                    let updatedCount = 0;
                    for (const key in active_venders) {
                        const v = active_venders[key];
                        if (typeof hero !== 'undefined' && (String(v.dbId) === String(hero.dbId) || key === socket.id)) {
                            v.monsterType = conf.id;
                            updatedCount++;
                            console.log(`✨ active_venders[${key}] の monsterType を直接書き換えました:`, v.monsterType);
                        }
                    }
                    console.log(`🔍 active_venders で更新された店舗数: ${updatedCount}件`);
                }

                // 🌟 3.5. 【追加の安全網】activeOfflineShops 側のデータもここで同期更新
                if (typeof activeOfflineShops !== 'undefined' && Array.isArray(activeOfflineShops) && typeof hero !== 'undefined') {
                    activeOfflineShops.forEach((shop, index) => {
                        const isMine = (
                            String(shop.owner_id) === String(hero.dbId) || 
                            String(shop.id) === String(hero.dbId) || 
                            String(shop.socket_id) === (typeof socket !== 'undefined' ? socket.id : null) ||
                            shop.name === hero.name
                        );
                        if (isMine) {
                            shop.monsterType = conf.id;
                            console.log(`✨ activeOfflineShops[${index}] の monsterType も同期更新しました:`, shop.monsterType);
                        }
                    });
                }

                // 🌟 4. 【サーバー通知】露店を開いている状態であれば、必ずサーバーへ変更を通知する！
                const resolvedDbId = (typeof hero !== 'undefined' && hero.dbId) || 
                                     (typeof p !== 'undefined' && p.dbId) || 
                                     (window.myDbId);

                if (typeof socket !== 'undefined' && resolvedDbId) {
                    console.log("📡 サーバーへ 'update_vending_monster' を送信します:", { monsterType: conf.id, dbId: resolvedDbId });
                    socket.emit('update_vending_monster', { 
                        monsterType: conf.id,
                        dbId: resolvedDbId 
                    });
                } else {
                    console.warn("⚠️ [VENDING] データベースID(dbId)が見つからないため、サーバーへの更新通知ができませんでした！ hero:", typeof hero !== 'undefined' ? hero : "未定義");
                }

                // 5. モーダル内のメインプレビューを即座にそのモンスターの姿に切り替える
                if (typeof renderVendingMerchantPreview === 'function') {
                    renderVendingMerchantPreview(conf.id, "vending-merchant-preview-canvas");
                    console.log("🎨 プレビューを再描画しました");
                }
                
                console.groupEnd();

                // 6. 選択画面のポップアップを閉じる
                modal.remove();
            };

            // モンスター名表示
            const nameLabel = document.createElement('span');
            nameLabel.style.cssText = `font-size: 9px; font-weight: ${isSelected ? 'bold' : 'normal'}; color: ${isSelected ? '#92400e' : '#334155'}; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 100%; pointer-events: none;`;
            nameLabel.textContent = conf.id;

            itemBox.appendChild(nameLabel);
            listContainer.appendChild(itemBox);
        });
    }

    modal.appendChild(listContainer);
    document.body.appendChild(modal);
}

// 🌟 プレビュー画面を新しいモンスターで描き直す関数
function updateVendingPreview(monsterType) {
    selectedVendingMonsterType = monsterType;
    
    const previewCanvas = document.getElementById('vending-merchant-preview-canvas');
    if (!previewCanvas) return;
    const pCtx = previewCanvas.getContext('2d');
    
    // キャンバスをクリア
    pCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);

    // 選択されたモンスターの設定を検索
    const conf = MONSTER_CONFIGS.find(c => String(c.id) === String(monsterType));
    if (!conf) return;

    // ダミーの敵オブジェクトを作って、既存の描画システムを流用する
    const previewEnemy = {
        id: monsterType,
        type: monsterType,
        name: monsterType,
        scale: conf.scale || 1.0,
        w: conf.w || 50,
        h: conf.h || 50
    };

    // プレビュー用にスプライトを取得して中央に描画
    const currentFrame = window.gameFrame || 0;
    const { img, drawW, drawH, footY } = getEnemyVisualData(previewEnemy, sprites, currentFrame, null);

    if (img && img.complete && img.naturalWidth !== 0) {
        pCtx.save();
        // 40x40 のプレビューの中心に合わせる
        pCtx.translate(20, 30); 
        pCtx.drawImage(img, Math.round(-drawW / 2), Math.round(-footY), drawW, drawH);
        pCtx.restore();
    }
}

// ============================================================
// 🛒 不在時売上の確認ダイアログ表示処理（売却時刻表示対応版）
// ============================================================
socket.on('show_offline_sales_dialog', (data) => {
    // 既にあれば重複して作らないようにする
    if (document.getElementById('offlineSalesModal')) return;

    const modalBg = document.createElement('div');
    modalBg.id = 'offlineSalesModal';
    modalBg.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        pointer-events: none; z-index: 99999; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    `;

    const modalBox = document.createElement('div');
    modalBox.style.cssText = `
        position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
        background: #eceff1; color: #1e293b; border: 2px solid #334155; border-radius: 6px;
        width: 440px; max-width: 90%; box-shadow: 0 20px 50px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.6);
        overflow: hidden; z-index: 100000; pointer-events: auto;
    `;

    // 👑 ヘッダー
    const header = document.createElement('div');
    header.style.cssText = `
        display: flex; justify-content: space-between; align-items: center;
        background: linear-gradient(180deg, #384e77 0%, #1a2942 100%);
        padding: 6px 12px; cursor: move; border-bottom: 1px solid #111827;
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.2); color: #ffffff;
    `;
    header.innerHTML = `
        <div style="display: flex; align-items: center; gap: 6px;">
            <span style="font-size: 13px;">🛒</span>
            <span style="font-weight: 700; text-shadow: 1px 1px 2px rgba(0,0,0,0.8); font-size: 12px; letter-spacing: 0.3px;">お帰りなさい！</span>
        </div>
    `;
    modalBox.appendChild(header);

    // 🌟 メインコンテンツ部分
    const content = document.createElement('div');
    content.style.cssText = "padding: 12px; background: #dfe4ea; display: flex; flex-direction: column; gap: 10px;";

    const subtitle = document.createElement('p');
    subtitle.innerText = "不在の間に、以下の商品が売れました：";
    subtitle.style.cssText = "font-size: 11px; color: #475569; font-weight: bold; margin: 0;";
    content.appendChild(subtitle);

    const listContainer = document.createElement('div');
    listContainer.style.cssText = `
        background: #ffffff; padding: 6px; border: 1px solid #94a3b8; border-radius: 4px;
        max-height: 180px; overflow-y: auto; text-align: left; font-size: 11px; color: #1e293b;
        box-shadow: inset 0 2px 4px rgba(0,0,0,0.05); display: flex; flex-direction: column; gap: 6px;
    `;

    data.sales.forEach(s => {
        const itemRow = document.createElement('div');
        itemRow.style.cssText = `
            display: flex; align-items: center; gap: 8px;
            border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; cursor: default;
        `;

        // 🖼️ アイテムのアイコン（サムネイル）コンテナ
        const iconWrapper = document.createElement('div');
        iconWrapper.style.cssText = `
            width: 32px; height: 32px; background: #2d3748; border: 1px solid #718096;
            border-radius: 4px; display: flex; align-items: center; justify-content: center;
            flex-shrink: 0; position: relative; overflow: hidden;
        `;

        const possibleKeys = [
            s.image_name,
            s.image,
            s.display_name,
            s.itemName,
            s.item_type,
            s.item_id
        ];

        let imgObj = null;
        let resolvedKey = null;

        if (typeof itemImages !== 'undefined') {
            for (const key of possibleKeys) {
                if (!key) continue;
                const found = itemImages[key];
                if (found) {
                    imgObj = found;
                    resolvedKey = key;
                    break;
                }
            }
        }

        if (imgObj && imgObj.complete && imgObj.naturalWidth > 0) {
            const img = document.createElement("img");
            img.src = imgObj.src;
            img.style.cssText = `
                width: 28px; height: 28px; object-fit: contain;
                image-rendering: -webkit-optimize-contrast;
                image-rendering: crisp-edges;
                image-rendering: pixelated;
            `;
            iconWrapper.appendChild(img);
        } else {
            const span = document.createElement("span");
            span.style.cssText = "font-size: 9px; color: #cbd5e1;";
            span.textContent = "📦";
            iconWrapper.appendChild(span);
        }

        itemRow.appendChild(iconWrapper);

        // 📝 テキスト情報（🕒 売却時刻のフォーマット処理を追加）
        let formattedTime = "";
        if (s.created_at) {
            try {
                const dateObj = new Date(s.created_at);
                if (!isNaN(dateObj.getTime())) {
                    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                    const day = String(dateObj.getDate()).padStart(2, '0');
                    const hours = String(dateObj.getHours()).padStart(2, '0');
                    const minutes = String(dateObj.getMinutes()).padStart(2, '0');
                    formattedTime = `<span style="color: #64748b; font-size: 10px; float: right;">🕒 ${month}/${day} ${hours}:${minutes}</span>`;
                }
            } catch (e) {
                // 日付パース失敗時はそのままフォールバック
            }
        }

        const textInfo = document.createElement('div');
        textInfo.style.cssText = "flex-grow: 1; line-height: 1.3;";
        textInfo.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span>👤 <b>${s.buyerName}</b></span>
                ${formattedTime}
            </div>
            📦 <b>${s.itemName} x${s.quantity}</b> を <span style="color: #b45309; font-weight: bold;">${s.totalPrice.toLocaleString()}メル</span> で購入
        `;
        itemRow.appendChild(textInfo);

        // 🖱️ ホバー時にツールチップ（詳細ポップアップ）を表示する処理
        itemRow.onmouseenter = (e) => {
            if (typeof activeHoverEquipment !== 'undefined') {
                activeHoverEquipment = {
                    ...s,
                    image: resolvedKey || s.itemName,
                    name: s.itemName,
                    count: s.quantity || 1
                };
            }
        };

        itemRow.onmouseleave = () => {
            if (typeof activeHoverEquipment !== 'undefined') {
                activeHoverEquipment = null;
            }
        };

        listContainer.appendChild(itemRow);
    });

    content.appendChild(listContainer);

    const totalDiv = document.createElement('div');
    totalDiv.style.cssText = "font-size: 12px; font-weight: bold; color: #047857; background: #f0fdf4; border: 1px solid #bbf7d0; padding: 6px; border-radius: 4px; text-align: center;";
    totalDiv.innerText = `💰 総売上: +${data.totalEarnings.toLocaleString()} メル`;
    content.appendChild(totalDiv);

    const okBtn = document.createElement('button');
    okBtn.innerText = "確認する";
    okBtn.style.cssText = `
        width: 100%; padding: 7px; font-size: 12px; font-weight: bold; cursor: pointer;
        background: linear-gradient(180deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%);
        color: #ffffff; border: 1px solid #b45309; border-radius: 4px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.4);
        text-shadow: 0 1px 1px rgba(0,0,0,0.3); transition: all 0.15s;
    `;
    
    okBtn.onclick = () => {
        if (typeof activeHoverEquipment !== 'undefined') {
            activeHoverEquipment = null;
        }
        modalBg.remove();
    };
    content.appendChild(okBtn);

    modalBox.appendChild(content);
    modalBg.appendChild(modalBox);
    document.body.appendChild(modalBg);

    // 🖱️ ドラッグ移動ロジック
    let isDragging = false;
    let startX, startY;

    header.onmousedown = (e) => {
        isDragging = true;
        const rect = modalBox.getBoundingClientRect();
        modalBox.style.transform = 'none';
        modalBox.style.left = `${rect.left}px`;
        modalBox.style.top = `${rect.top}px`;

        startX = e.clientX - rect.left;
        startY = e.clientY - rect.top;
        e.preventDefault();
    };

    document.onmousemove = (e) => {
        if (!isDragging) return;
        modalBox.style.left = `${e.clientX - startX}px`;
        modalBox.style.top = `${e.clientY - startY}px`;
    };

    document.onmouseup = () => {
        isDragging = false;
    };
});

// ============================================================
// :::UPDATE_USER_MONEY_DISPLAY::: 🪙 ショップ閲覧画面の所持金を最新に更新する
// ============================================================
function updateUserMoneyDisplay() {
    const userMoneyDisplay = document.getElementById('user-money-display');
    if (!userMoneyDisplay) return;

    let myMoney = 0;
    if (typeof hero !== 'undefined' && hero) {
        myMoney = hero.gold 
               ?? (hero.player_stats && hero.player_stats.gold) 
               ?? (hero.stats && hero.stats.gold) 
               ?? 0;
    }
    userMoneyDisplay.innerText = Number(myMoney).toLocaleString();
}

// ============================================================
// 🌟 売上金が0メルのときにボタンを無効化する制御用スクリプト
// ============================================================

// 売上金を受け取ろうとしたときのラッパー関数
function tryClaimVendingGold() {
    const goldElem = document.getElementById('vending-unclaimed-gold');
    if (!goldElem) return;
    
    // カンマなどを除外して数値化
    const currentGold = parseInt(goldElem.textContent.replace(/,/g, ''), 10) || 0;
    
    // 0メル以下の場合は何もしない（ガード）
    if (currentGold <= 0) {
        return; 
    }
    
    // 既存の受け取り関数を呼び出す
    if (typeof claimVendingGold === 'function') {
        claimVendingGold();
    }
}

// 未受取金額の変更やウィンドウを開いたときにボタンの状態を更新する関数
function updateClaimButtonState() {
    const goldElem = document.getElementById('vending-unclaimed-gold');
    const btnElem = document.getElementById('vending-claim-gold-btn');
    if (!goldElem || !btnElem) return;

    const currentGold = parseInt(goldElem.textContent.replace(/,/g, ''), 10) || 0;

    if (currentGold <= 0) {
        // 0メルのとき：無効状態（グレーアウト・半透明・カーソル変更）
        btnElem.style.background = "linear-gradient(180deg, #cbd5e1 0%, #94a3b8 100%)";
        btnElem.style.borderColor = "#64748b";
        btnElem.style.color = "#475569";
        btnElem.style.cursor = "default";
        btnElem.style.opacity = "0.6";
        btnElem.title = "受け取れる売上金がありません";
    } else {
        // 1メル以上のとき：有効状態（通常のグリーン）
        btnElem.style.background = "linear-gradient(180deg, #34d399 0%, #059669 100%)";
        btnElem.style.borderColor = "#047857";
        btnElem.style.color = "#ffffff";
        btnElem.style.cursor = "pointer";
        btnElem.style.opacity = "1.0";
        btnElem.title = "";
    }
}

// 定期監視または画面更新時にステータスを反映するためのMutationObserver
const unclaimedGoldSpan = document.getElementById('vending-unclaimed-gold');
if (unclaimedGoldSpan) {
    const observer = new MutationObserver(() => {
        updateClaimButtonState();
    });
    observer.observe(unclaimedGoldSpan, { childList: true, characterData: true, subtree: true });
}

// 初回ロード時にも反映
window.addEventListener('DOMContentLoaded', () => {
    updateClaimButtonState();
});

// 20秒（20,000ミリ秒）ごとにアカウント情報を要求するタイマー
/*
setInterval(() => {
    if (typeof socket !== 'undefined' && socket.connected) {
        socket.emit('get_account_info');
        console.log("定期的なアカウント情報更新リクエストを送信しました");
    }
}, 20000); // 20000ms = 20秒
*/

// ==========================================
// 📡 1. 通信と基本設定（ローカル・本番自動切り替え版）
// ==========================================

// --- 修正前 ---
// let hero = new Player("なまえ");

// --- 修正後 ---
// ログイン前はまだチャンネルが確定していないので、一旦デフォルト(1)で作るか、
// あるいは startBtn.onclick の中で作り直す形にします。

// ==========================================
// 🌍 3. 世界の状態（他のプレイヤー・敵・マップ）
// ==========================================

// ==========================================
// 🕹️ 4. 操作・システム用の管理変数
// ==========================================

// game.js 等のソケット受信部分

// game.js (または view.js) の socket.on が並んでいるあたり

// 🌟 修正後

// index.html の送信処理 (Enterキー)

// ==========================================
// 💬 チャット受信処理
// ==========================================

// game.js の socket.on が並んでいる場所に追加

/*
function attack() {
  if (hero.climbing) return; // 🌟 ハシゴ中なら、ここで処理を強制終了する
  if (hero.isAttacking > 0) return; // 連続攻撃防止
  hero.isAttacking = 18; 
  hero.attackStartFrame = frame;   // 🌟 ここで「今」の時間を刻印！
  socket.emit('move', hero);       // 🌟 刻印した瞬間のデータを全員に送る
}
*/

// ==========================================
// 🔄 補助関数
// ==========================================

// ==========================================
// 🔄 update関数から切り出した補助関数
// ==========================================

// game.js

// --- 修正前 ---
// const userName = prompt("名前?") || "Guest";
// hero.name = userName;
// socket.emit('join', userName);
// update();

// --- 修正後 ---

// --- 修正版 startBtn.onclick ---

// ==========================================
// 🔐 ユーザー登録・ログイン処理
// ==========================================

// ------------------------------------------
// 📝 1. 新規登録ボタンの処理 (UI統一版)
// ------------------------------------------
const regBtn = document.getElementById('register-btn');

// ============================================================
// :::REG_BTN_CLICK::: 📝 新規ユーザー登録・バリデーション処理
// ============================================================
/**
 * 役割：
 * - 登録ボタンクリック時の入力値検証（文字数チェック）
 * - エラーメッセージの表示・入力欄のスタイル制御（赤枠など）
 * - 入力不備時の即時フィードバック（ユーザー体験の向上）
 * - バリデーション通過後のサーバー通信（socket.emit('register')）
 */
if (regBtn) {
    regBtn.onclick = () => {
        // 各要素の取得
        const nameInput = document.getElementById('user-name-input');
        const passInput = document.getElementById('user-pass-input');
        const loginError = document.getElementById('login-error');

        const username = nameInput.value.trim();
        const password = passInput.value;

        // --- 🌟 修正点: 名前制限を2文字以上6文字以下に変更 ---
        const isNameInvalid = username.length < 2 || username.length > 6;
        const isPassInvalid = password.length < 4;

        if (isNameInvalid || isPassInvalid) {
            if (loginError) {
                loginError.innerText = "名前は2〜6文字、パスワードは4文字以上で入力してください";
                loginError.style.color = "#ff4444";
            }

            // 条件を満たしていない入力欄を赤枠にする (既存ロジック踏襲)
            if (isNameInvalid) {
                nameInput.style.border = "2px solid #ff4444";
            } else {
                nameInput.style.border = "1px solid #ccc";
            }

            if (isPassInvalid) {
                passInput.style.border = "2px solid #ff4444";
            } else {
                passInput.style.border = "1px solid #ccc";
            }
            
            return;
        }

        // --- ✅ バリデーション通過時：スタイルをリセット ---
        nameInput.style.border = "1px solid #ccc";
        passInput.style.border = "1px solid #ccc";
        if (loginError) loginError.innerText = "";

        // サーバーの socket.on('register', ...) へ送信 (既存ロジック)
        console.log("新規登録リクエスト送信:", username);
        socket.emit('register', { username: username, password: password });
    };
}

// ============================================================
// :::ON_REGISTER_RESPONSE::: 📝 サーバーからの登録結果処理（離脱防止・誘導強化版）
// ============================================================
socket.on('register_response', (data) => {
    const loginError = document.getElementById('login-error');
    const passwordInput = document.getElementById('user-pass-input');
    const nameInput = document.getElementById('user-name-input') || document.querySelector('input[type="text"]');
    
    // 🌟 ログイン（またはスタート）ボタンを取得して案内用エフェクトの対象にする
    const loginBtn = document.getElementById('start-game-btn');

    if (loginError) {
        if (data.success) {
            // ✅ 登録成功時：親切な案内メッセージとサクセスカラー（水色・エメラルド）
            loginError.innerText = "✨ 登録完了！下の「Login」ボタンからゲームを始めてください。";
            loginError.style.color = "#00ffcc"; 
            
            // 枠線を通常に戻す
            if (nameInput) nameInput.style.border = "1px solid #ccc";
            if (passwordInput) passwordInput.style.border = "1px solid #ccc";

            if (passwordInput) {
                passwordInput.value = "";
                // パスワードを空にしたあと、名前入力をフォーカス
                if (nameInput) nameInput.focus();
            }

            // 🌟 【離脱防止の工夫】登録が終わったユーザーに「次に押すべきボタン」を視覚的に教える
            if (loginBtn) {
                const originalBorder = loginBtn.style.border;
                const originalShadow = loginBtn.style.boxShadow;
                
                // ボタンを明るく光らせてアピール
                loginBtn.style.border = "2px solid #00ffcc";
                loginBtn.style.boxShadow = "0 0 12px rgba(0, 255, 204, 0.6)";
                
                // 数秒後に元に戻す
                setTimeout(() => {
                    loginBtn.style.border = originalBorder;
                    loginBtn.style.boxShadow = originalShadow;
                }, 4000);
            }

        } else {
            // ❌ 登録失敗時：エラーメッセージ表示（赤）
            loginError.innerText = data.message;
            loginError.style.color = "#ff4444";
            
            if (nameInput) nameInput.style.border = "2px solid #ff4444";
            if (passwordInput) passwordInput.style.border = "2px solid #ff4444";
        }
    } else {
        alert(data.message);
    }
});

// ============================================================
// :::VENDING_STATE_GUARD::: 🏪 露店モードの安全な状態管理
// ============================================================
/**
 * 役割：
 * - is_vending の getter/setter を定義し、状態変更を監視
 * - 0.1秒以内の連続切り替えをブロック（デバウンス制御による点滅防止）
 * - 閉店（false）時のUIクリーンアップ（メインウィンドウ非表示、データリセット）
 * - 露店モード終了時の正常性確認とログ出力
 */
if (typeof hero !== 'undefined') {
    let _isVending = hero.is_vending;
    let lastToggleTime = 0;

    Object.defineProperty(hero, 'is_vending', {
        get: function() {
            return _isVending;
        },
        set: function(value) {
            const now = Date.now();

            // 🛡️ 超高頻度（0.1秒以内）の書き換えは、バグによる「点滅」とみなしてブロック
            if (now - lastToggleTime < 100) {
                return;
            }

            // 既に同じ値なら何もしない（再描画カット）
            if (_isVending === value) return;

            // --- 閉店（false）時の特別処理 ---
            if (value === false) {
                // ここで「看板ウィンドウ」を物理的に隠す処理を念のため呼ぶ
                const vWin = document.getElementById('vending-main-window'); // あなたの環境のIDに合わせてください
                if (vWin) vWin.style.display = 'none';
                
                // リストもクリアして、次回の「点滅防止比較」をリセット
                const itemsContainer = document.getElementById('other-vending-items');
                if (itemsContainer) itemsContainer.dataset.lastPureHash = "";
            }

            _isVending = value;
            lastToggleTime = now;
            
            console.log(value ? "🏪 露店モード開始" : "🚶 露店モード終了（正常）");
        },
        configurable: true
    });
}

// ============================================================
// 🌍 露店の看板データを保持する配列
// ============================================================
let activeOfflineShops = [];

// ============================================================
// :::ON_VENDING_OPENED::: 🏪 位置完全固定・店主名保持・同期処理（isEditingデータベース完全連動版）
// ============================================================
socket.on('vending_opened', (data) => {

    console.log(`📥 [CLIENT DEBUG] vending_opened を受信しました！`);
    console.log(`    受信した raw data:`, data);
    
    console.group("🔍 [DEBUG VENDING OPENED] 受信データ解析");
    console.log("1. サーバーから送られてきた raw data:", data);
    console.log("現在の自 socket.id:", socket.id);

    const shopTitle = data.vending_title || data.title || "いらっしゃいませ！";
    const shopId = data.id;
    const persistentId = data.dbId || data.owner_id || shopId; 
    
    // 🌟 【超重要】mode と vending_mode を確実に死守する
    const shopMode = data.mode || data.vending_mode || 'monster';
    
    const shopOwnerName = data.name || data.owner_name || "プレイヤー";

    // 👾 店番モンスターIDを安全に取得（monster_type も網羅）
    const shopMonsterType = data.monsterType || data.monster_type || "Monster5";

    // 🌟 【チャンネル情報】サーバーから送られてきたチャンネルを取得
    let shopChannel = Number(data.channel ?? data.channelId ?? (typeof hero !== 'undefined' ? hero.channel : 1));

    // 🌟 【超重要チャンネルガード】自分のチャンネルを取得
    const currentHeroChannel = (typeof hero !== 'undefined' && hero.channel !== undefined) ? Number(hero.channel) : 1;

    // 🛑 もし受信した店舗のチャンネルが、現在の自分のチャンネルと異なる場合
    if (shopChannel !== currentHeroChannel) {
        console.log(`🚫 [CHANNEL FILTER] 受信した店ch(${shopChannel}) と 自ch(${currentHeroChannel}) が異なるため、この画面の同期処理をスキップします。`);
        
        let oldIndex = activeOfflineShops.findIndex(shop => 
            shop.owner_id === persistentId || shop.id === persistentId || shop.owner_id === shopId || shop.id === shopId
        );
        if (oldIndex !== -1) {
            activeOfflineShops.splice(oldIndex, 1);
        }
        console.groupEnd();
        return; 
    }

    // 🌟 【超安全対策】受信した items が文字列（または二重文字列）になっていても確実に安全な配列にパースする！
    let shopItems = data.items || [];
    if (typeof shopItems === 'string') {
        try {
            shopItems = JSON.parse(shopItems);
            if (typeof shopItems === 'string') {
                shopItems = JSON.parse(shopItems); 
            }
        } catch (e) {
            console.error("❌ [CLIENT] shopItems のパースに失敗しました:", e);
            shopItems = [];
        }
    }
    if (!Array.isArray(shopItems)) {
        shopItems = [];
    }

    // 🌟 【データベース完全連動】サーバーから送られてきた isEditing を確実に真偽値に変換！
    const shopIsEditing = data.isEditing === true || data.isEditing === 1 || data.isEditing === 'true';

    console.log("解析されたID・モード・名前・チャンネル・編集状態:", { shopId, persistentId, shopMode, shopOwnerName, shopMonsterType, shopChannel, itemCount: shopItems.length, shopIsEditing });

    const isMySelfPre = (shopId === socket.id) || (typeof hero !== 'undefined' && (shopOwnerName === hero.name || Number(persistentId) === Number(hero.dbId)));

    let finalX = data.x;
    let finalY = data.y;

    if ((finalX === undefined || finalX === null) && isMySelfPre && typeof hero !== 'undefined') {
        const heroWidth = hero.w || (typeof VIEW_CONFIG !== 'undefined' && VIEW_CONFIG.playerWidth) || 40;
        finalX = Math.round(hero.x + (heroWidth / 2));
    }

    const storageKey = `monster_shop_pos_${persistentId}`;

    if (isMySelfPre && shopMode === 'monster' && finalX !== undefined && finalY !== undefined) {
        localStorage.setItem(storageKey, JSON.stringify({ x: finalX, y: finalY }));
        console.log("🌟 無人店舗の位置を出店位置で固定保存しました:", finalX, finalY);
    }

    let existingIndex = activeOfflineShops.findIndex(shop => 
        shop.owner_id === persistentId || 
        shop.id === persistentId || 
        shop.owner_id === shopId || 
        shop.id === shopId
    );

    console.log("既存ショップの検索結果 index:", existingIndex);

    if (shopMode === 'player') {
        if (existingIndex !== -1) {
            console.log("有人モードのため、既存の無人リストから削除します");
            activeOfflineShops.splice(existingIndex, 1);
        }
    } else {
        if (existingIndex !== -1) {
            console.log("既存の無人店舗を発見！商品情報・店情報を更新します");

            activeOfflineShops[existingIndex].title = shopTitle;
            // 🌟 ここで必ず確実に値をセット
            activeOfflineShops[existingIndex].mode = shopMode;
            activeOfflineShops[existingIndex].vending_mode = shopMode;
            activeOfflineShops[existingIndex].socket_id = shopId;
            activeOfflineShops[existingIndex].name = shopOwnerName;      
            activeOfflineShops[existingIndex].owner_name = shopOwnerName;  
            activeOfflineShops[existingIndex].items = shopItems; 
            activeOfflineShops[existingIndex].monsterType = shopMonsterType; 
            activeOfflineShops[existingIndex].monster_type = shopMonsterType; 
            activeOfflineShops[existingIndex].channel = shopChannel; 
            activeOfflineShops[existingIndex].isEditing = shopIsEditing; // 👈 【追加】データベースの編集状態を反映！

            if (data.x !== undefined && data.x !== null) activeOfflineShops[existingIndex].x = data.x; 
            if (data.y !== undefined && data.y !== null) activeOfflineShops[existingIndex].y = data.y;
        } else {
            console.log("既存店舗が見つからないため、【新規作成】として登録します（チャンネル:", shopChannel, "座標: X=", finalX, "Y=", finalY, ")");
            activeOfflineShops.push({
                id: persistentId,
                owner_id: persistentId,
                socket_id: shopId,
                title: shopTitle,
                // 🌟 新規作成時も絶対に欠損させない
                mode: shopMode,
                vending_mode: shopMode,
                name: shopOwnerName,      
                owner_name: shopOwnerName, 
                items: shopItems, 
                monsterType: shopMonsterType, 
                monster_type: shopMonsterType,
                x: finalX,                
                y: finalY,
                channel: shopChannel,
                isEditing: shopIsEditing // 👈 【追加】新規作成時も編集状態を反映！
            });
        }
    }

    console.log("7. 最終的な activeOfflineShops の中身:", JSON.parse(JSON.stringify(activeOfflineShops)));
    console.groupEnd();

    // --- キャラクターステータスへの反映 ---
    const isMySelf = (shopId === socket.id) || (typeof hero !== 'undefined' && (shopOwnerName === hero.name || Number(persistentId) === Number(hero.dbId)));

    if (isMySelf) {
        if (typeof hero !== 'undefined') {
            if (shopMode === 'monster') {
                console.log(`🛡️ [GUARD] 自分自身のデータですが、無人露店（monster）のため hero への有人フラグ付与をスキップします。`);
                hero.is_vending = false;
                hero.vending_mode = shopMode;
                hero.mode = shopMode;
            } else {
                hero.is_vending = true;
                hero.vending_mode = shopMode;
                hero.mode = shopMode;
            }

            hero.vending_title = shopTitle;
            hero.vending_items = shopItems;
            hero.name = shopOwnerName; 
            hero.dbId = persistentId;   
            hero.monsterType = shopMonsterType; 
            hero.monster_type = shopMonsterType;
            hero.channel = shopChannel;
            hero.isEditing = shopIsEditing; // 👈 【追加】自身の編集状態も同期
            
            if (typeof selectedVendingMonsterType !== 'undefined') {
                selectedVendingMonsterType = shopMonsterType;
            }
            if (typeof currentVendingMonsterId !== 'undefined') {
                currentVendingMonsterId = shopMonsterType;
            }
            console.log("🎯 [SUCCESS] 自分の店番モンスター変数をデータベースの値に同期しました:", shopMonsterType);
        }
    } else {
        const targetList = (typeof otherPlayers !== 'undefined') ? otherPlayers : (typeof others !== 'undefined' ? others : {});
        const targetPlayer = targetList[shopId];
        
        if (targetPlayer) {
            if (shopMode === 'monster') {
                console.log(`🛡️ [GUARD] キャラ [${targetPlayer.name}] は無人露店（monster）のため、プレイヤーオブジェクト側への有人フラグ付与をスキップします。`);
                targetPlayer.is_vending = false;
                // 🌟 無人露店であっても、modeやmonsterTypeをここに保持させておき、undefinedになるのを防ぐ！
                targetPlayer.mode = shopMode;
                targetPlayer.vending_mode = shopMode;
                targetPlayer.monsterType = shopMonsterType;
                targetPlayer.monster_type = shopMonsterType;
                targetPlayer.isEditing = shopIsEditing; // 👈 【追加】
                return; 
            }

            targetPlayer.is_vending = true;
            targetPlayer.vending_mode = shopMode;
            targetPlayer.mode = shopMode;
            targetPlayer.vending_title = shopTitle;
            targetPlayer.vending_items = shopItems;
            targetPlayer.name = shopOwnerName; 
            targetPlayer.monsterType = shopMonsterType; 
            targetPlayer.monster_type = shopMonsterType;
            targetPlayer.channel = shopChannel;
            targetPlayer.isEditing = shopIsEditing; // 👈 【追加】
            
            if (shopMode === 'player') {
                if (data.x !== undefined) targetPlayer.x = data.x;
                if (data.y !== undefined) targetPlayer.y = data.y;
            }
        }
    }
});

// ============================================================
// :::ON_VENDING_CLOSED::: 🏪 露店閉店通知の受信とUIの終了処理 (完全対応版)
// ============================================================
socket.on('vending_closed', (data) => {
    console.log(`露店閉店の通知を受信 (ID: ${data.id}, DB_ID: ${data.dbId}, 理由: ${data.reason || 'manual/disconnect'})`);

    const closedId = data.dbId || data.owner_id || data.id;

    // 🌟 1. 看板リスト（activeOfflineShops）から削除（IDの揺れを完全ガード）
    activeOfflineShops = activeOfflineShops.filter(shop => {
        const sId = String(shop.id || "");
        const oId = String(shop.owner_id || "");
        const sockId = String(shop.socket_id || "");
        const targetId = String(closedId);
        const rawId = String(data.id || "");

        // 一致するIDがあればリストから除外（return false でフィルター）
        const isMatch = sId === targetId || oId === targetId || sockId === rawId || sId === rawId || oId === rawId;
        return !isMatch;
    });

    // 🌟 2. 購入者側のウィンドウ強制クローズ
    if (typeof window.currentVendingOwnerId !== 'undefined' && (window.currentVendingOwnerId === data.id || String(window.currentVendingOwnerId) === String(closedId))) {
        const otherVendingWin = document.getElementById('other-vending-window');
        
        if (otherVendingWin && otherVendingWin.style.display !== 'none') {
            otherVendingWin.style.display = 'none';

            const noticeModal = document.getElementById('vending-notice-modal');
            const noticeText = document.getElementById('vending-notice-text');
            const closeBtn = document.getElementById('vending-notice-close-btn');

            if (noticeModal && noticeText) {
                if (data.reason === 'sold_out') {
                    noticeText.innerText = "全ての商品が売り切れました。";
                    noticeText.style.color = "#ffcc00";
                } else {
                    noticeText.innerText = "販売者が販売を中止しました。";
                    noticeText.style.color = "#ffffff";
                }

                noticeModal.style.display = 'block';

                if (closeBtn) {
                    closeBtn.onclick = () => {
                        noticeModal.style.display = 'none';
                    };
                }
            }
        }
        
        window.currentVendingOwnerId = null;
        window.currentHoverSlot = null;
    }

    // 🌟 3. 店主（自分 または 他人）の状態リセット
    if (data.id === socket.id || String(data.dbId) === String(hero?.dbId)) {
        if (typeof hero !== 'undefined') {
            hero.is_vending = false;
            hero.vending_title = "";
            hero.vending_items = [];
            hero.vending_mode = 'monster';
            hero.mode = 'monster';
        }
        
		// 停止 2026-10-17
        //const myVendingWin = document.getElementById('vending-window');
        //if (myVendingWin) {
        //    myVendingWin.style.display = 'none';
        //}

        const btn = document.getElementById('vending-confirm-btn');
        if (btn) {
            btn.innerText = "✨ この内容で露店を開く";
            btn.disabled = false;
            btn.setAttribute("onclick", "startVending()");
            btn.style.removeProperty('background');
            btn.style.removeProperty('border-color');
            btn.style.cursor = "pointer";
        }
    } else {
        const targetList = (typeof otherPlayers !== 'undefined') ? otherPlayers : (typeof others !== 'undefined' ? others : {});
        const targetPlayer = targetList[data.id];
        
        if (targetPlayer) {
            targetPlayer.is_vending = false;
            targetPlayer.vending_title = "";
            targetPlayer.vending_items = [];
        }
    }
    
    console.log("露店が閉店したため、看板を削除しました。残りの店舗数:", activeOfflineShops.length);
});

// 🛒 サーバーから出店拒否（エラー）を受け取ったときの処理
socket.on('vending_error', (data) => {
    // 1. アラートを表示
    if (typeof showCustomAlert === 'function') {
        showCustomAlert(data.message || "ここには出店できません。");
    } else {
        alert(data.message || "ここには出店できません。");
    }

    // 2. 出店ボタンやラジオボタンのロックを解除（元に戻す）
    const modeInputs = document.querySelectorAll('input[name="vending-mode"]');
    modeInputs.forEach(input => {
        input.disabled = false;
    });

    const btn = document.getElementById('vending-confirm-btn');
    if (btn) {
        btn.innerText = "✨ この内容で露店を開く";
        btn.disabled = false;
        btn.setAttribute("onclick", "startVending()");
        btn.style.setProperty('background', 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', 'important');
        btn.style.setProperty('border-color', '#b45309', 'important');
        btn.style.cursor = "pointer";
    }

    // 必要に応じて、ローカルの hero のフラグも戻す
    if (typeof hero !== 'undefined') {
        hero.is_vending = false;
    }
});

// ============================================================
// :::ON_REQUEST_OPEN_VENDING_UI::: 🏪 露店管理UIの起動処理
// ============================================================
/**
 * 役割：
 * - サーバーの要求（露店開設）を受け取り、管理ウィンドウを表示
 * - 店名入力欄（vending-title-input）への自動フォーカス
 * - 開設UIの初期化とプレイヤーへのUX提供
 */
socket.on('request_open_vending_ui', () => {
    // 1. 露店管理ウィンドウを表示する
    const win = document.getElementById('vending-window');
    if (win) {
        win.style.display = 'block';
    }

    // 2. 入力欄に初期値をセットし、フォーカスを合わせる
    const titleInput = document.getElementById('vending-title-input');
    if (titleInput) {
        //titleInput.value = "いらっしゃいませ！";
        titleInput.focus(); 
    }
    
    console.log("[Vending] 露店開設UIを表示しました。");
});

// ============================================================
// :::VENDING_OWNER_CHAT::: 🛒 露店管理（店主側）ウィンドウ用チャット処理
// ============================================================

// メッセージ送信を実行する関数（店主用）
function sendVendingOwnerChat() {
    const inputEl = document.getElementById('vending-owner-chat-input');
    if (!inputEl) return;
    
    const message = inputEl.value.trim();
    if (!message) return;

    // 店主自身のIDを取得（自分のショップID）
    const myOwnerId = (typeof hero !== 'undefined' && hero) ? (hero.dbId || hero.id) : null;

    // 1. サーバーへメッセージを送信する
    if (typeof socket !== 'undefined' && socket) {
        socket.emit('vendingChatMessage', {
            text: message,
            ownerId: myOwnerId
        });
    }

    // 2. 自分の管理画面チャット欄に即時表示（[店主] または自分のキャラ名）
    const myName = (typeof hero !== 'undefined' && hero.name) ? hero.name : "店主";
    appendVendingOwnerChatMessage(myName, message, "#2563eb"); // 自分（青色）

    // 入力欄をクリア
    inputEl.value = "";
}

// チャットログにメッセージを追加する関数（店主用）
function appendVendingOwnerChatMessage(senderName, message, textColor = "#334155") {
    const chatLog = document.getElementById('vending-owner-chat-log');
    if (!chatLog) return;

    // 初回発言時にプレースホルダーテキストを消去
    if (chatLog.dataset.hasMessage !== "true") {
        chatLog.innerHTML = "";
        chatLog.dataset.hasMessage = "true";
    }

    const msgDiv = document.createElement('div');
    msgDiv.style.marginBottom = "3px";
    msgDiv.style.wordBreak = "break-all";
    
    // HTMLエスケープ処理（セキュリティ対策）
    const safeMessage = message.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    
    msgDiv.innerHTML = `<span style="font-weight: bold; color: ${textColor};">[${senderName}]:</span> ${safeMessage}`;
    
    chatLog.appendChild(msgDiv);
    
    // 最下部へ自動スクロール
    chatLog.scrollTop = chatLog.scrollHeight;
}

// 📥 サーバーからの露店チャットを受信する処理（共通受信）
if (typeof socket !== 'undefined' && socket) {
    if (!window._vendingOwnerChatSocketInitialized) {
        window._vendingOwnerChatSocketInitialized = true;
        
        socket.on('syncVendingChatMessage', (data) => {
            // お客さん（または他者）からの発言を店主側のログにも表示する（赤っぽい色）
            appendVendingOwnerChatMessage(data.senderName, data.text, "#dc2626");
        });
    }
}

// イベントリスナーの初期化（管理ウィンドウを開くタイミングで呼び出し）
function initVendingOwnerChatEvents() {
    const inputEl = document.getElementById('vending-owner-chat-input');
    const sendBtn = document.getElementById('vending-owner-chat-send');

    if (inputEl && !inputEl.dataset.initialized) {
        inputEl.dataset.initialized = "true";
        inputEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                sendVendingOwnerChat();
            }
        });
    }

    if (sendBtn && !sendBtn.dataset.initialized) {
        sendBtn.dataset.initialized = "true";
        sendBtn.addEventListener('click', (e) => {
            e.preventDefault();
            sendVendingOwnerChat();
        });
    }
}

// ============================================================
// :::OPEN_VENDING_MENU::: 🏪 未出店対応・チャンネル厳格ガード版
// ============================================================
function openVendingMenu() {
    console.group("🕵️‍♂️ [CLIENT DEBUG] openVendingMenu 呼び出し");
    const myChannel = (typeof hero !== 'undefined' && hero.channel !== undefined) ? Number(hero.channel) : 1;
    console.log("- 現在のプレイヤーのチャンネル (hero.channel):", myChannel);
    console.groupEnd();

    const win = document.getElementById('vending-window');
    if (!win) return;

    // まずウィンドウは隠した状態でサーバーへ確認
    win.style.display = 'none';

    if (typeof socket !== 'undefined' && socket) {
        socket.emit('request_my_vending_info', (response) => {
            console.group("🕵️‍♂️ [CLIENT DEBUG] request_my_vending_info の返却値");
            console.log("受信した response 全体:", response);
            console.groupEnd();

            // 🌟 【パターンA】すでに露店（無人露店など）を出品中の場合
            if (response && response.success && response.shopData) {
                const shopChannel = Number(response.shopData.channel || 1);
                
                // 現在地のチャンネルと、露店の出店チャンネルが違う場合のみブロック
                if (myChannel !== shopChannel) {
                    console.warn(`⚠️ [VENDING_GUARD] チャンネル不一致のためオープンを拒否！ (現在CH: ${myChannel} !== 出店CH: ${shopChannel})`);
                    
                    if (typeof showCustomAlert === 'function') {
                        showCustomAlert(`出店しているチャンネル(${shopChannel}ch)と同じ場所にいないと、露店管理メニューを開くことはできません。`);
                    } else {
                        alert(`出店しているチャンネル(${shopChannel}ch)と同じ場所にいないと、露店管理メニューを開くことはできません。`);
                    }
                    
                    win.style.display = 'none';
                    return; // 🛑 別チャンネルなのでストップ
                }

                // チャンネルが一致している場合：管理メニューとして開く
                win.style.display = 'block';
                console.log("🖥️ [DEBUG] チャンネル一致。管理メニューを表示します。");

                const goldSpan = document.getElementById('vending-unclaimed-gold');
                const unclaimed = Number(response.shopData.unclaimed_gold || 0);
                if (goldSpan) {
                    goldSpan.innerText = unclaimed.toLocaleString();
                }
                setupMyShopManagementUI(response.shopData);

            } else {
                // 🌟 【パターンB】まだ露店を出品していない場合（新規オープン）
                console.log("🖥️ [DEBUG] 出店データなし。新規の露店設定画面として開きます。");
                win.style.display = 'block';

                // 必要に応じて新規用のUI初期化やリセット処理があればここに記述
                if (typeof initVendingOwnerChatEvents === 'function') {
                    initVendingOwnerChatEvents();
                }
            }
        });
    } else {
        console.error("❌ socket が定義されていません");
    }
}

// 🛡️ 万が一ソケット通信が使えない場合のローカルフォールバック関数
function fallbackToLocalShopData(goldSpan) {
    if (typeof activeOfflineShops !== 'undefined' && Array.isArray(activeOfflineShops) && typeof hero !== 'undefined' && hero) {
        const heroId = hero.dbId ?? hero.id ?? hero.userId;
        const myShop = activeOfflineShops.find(shop => {
            const shopOwnerId = shop.owner_id ?? shop.dbId ?? shop.id;
            return heroId != null && shopOwnerId != null && Number(shopOwnerId) === Number(heroId);
        });

        if (myShop) {
            setupMyShopManagementUI(myShop);
            if (myShop.unclaimed_gold !== undefined && goldSpan) {
                goldSpan.innerText = Number(myShop.unclaimed_gold).toLocaleString();
            }
        }
    }
}

// ============================================================
// :::GET_VENDING_ITEMS_DATA::: 🛒 露店アイテムデータの抽出（荷造り）
// ============================================================
/**
 * 役割：
 * - 露店ウィンドウで一時保管（バッファ）されているアイテム群を取得
 * - サーバー側へ送信するためにデータを整形・抽出
 */
function getVendingItemsData() {
    console.log("📤 サーバー送信用のアイテムデータを抽出します:", vendingItemsBuffer);
    return vendingItemsBuffer; 
}

// ============================================================
// 🌟 自分の無人露店データをUIやボタンに適用・セットする共通関数（未受取金反映対応版）
// ============================================================
function setupMyShopManagementUI(shop) {
    if (!shop) return;

    // 1. 復元中フラグをON
    window.isRestoringVending = true;

    // 2. 出品バッファを、サーバー（またはマップデータ）の最新 shop.items で完全に上書きリセットする
    vendingItemsBuffer = shop.items ? JSON.parse(JSON.stringify(shop.items)) : [];

    // 3. 画面UIにアイテムを復元
    if (typeof restoreVendingItemsToUI === 'function') {
        restoreVendingItemsToUI(vendingItemsBuffer);
    }

    // 4. 復元フラグをOFF
    window.isRestoringVending = false;

    // 💰 【追加】データベースから取得した「未受取の売上金」を画面の表示に反映する！
    const goldSpan = document.getElementById('vending-unclaimed-gold');
    if (goldSpan) {
        const unclaimed = Number(shop.unclaimed_gold || 0);
        goldSpan.innerText = unclaimed.toLocaleString();
    }

    // 🌟 5. 現在、露店にアイテムが1つ以上出品されているかどうかを判定
    const hasItems = vendingItemsBuffer.length > 0;

    const confirmBtn = document.getElementById('vending-confirm-btn');
    if (confirmBtn) {
        if (hasItems) {
            // すでにアイテムが並んでいる（＝営業中・更新状態）
            confirmBtn.innerText = "🛑 露店を完全に閉じる";
            confirmBtn.setAttribute("onclick", "forceCloseVending()");
            confirmBtn.style.setProperty('background', 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', 'important');
            confirmBtn.style.setProperty('border-color', '#b91c1c', 'important');
        } else {
            // アイテムがまだ何も出品されていない（＝これから露店を開く状態）
            confirmBtn.innerText = "⛺ この内容で露店を開く";
            confirmBtn.setAttribute("onclick", "startVending()");
            confirmBtn.style.setProperty('background', 'linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)', 'important');
            confirmBtn.style.setProperty('border-color', '#27ae60', 'important');
        }
    }

    // 6. タイトル入力欄を、データベースにある「正式なタイトル」で強制上書き（変更途中の文字を破棄）
    const titleInput = document.getElementById('vending-title-input');
    if (titleInput) {
        titleInput.value = shop.title || shop.vending_title || "";
        titleInput.disabled = false;

        // タイトルが変更された瞬間にだけ、ボタンを更新用に変化させる（すでにアイテムがある場合など）
        titleInput.oninput = () => {
            const btn = document.getElementById('vending-confirm-btn');
            if (btn && vendingItemsBuffer.length > 0) {
                btn.innerText = "🔄 露店情報を更新する";
                btn.setAttribute("onclick", "startVending()");
                btn.style.setProperty('background', 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', 'important');
                btn.style.setProperty('border-color', '#0284c7', 'important');
            }
        };
    }

    // 7. モード選択ラジオボタンの設定
    const modeInputs = document.querySelectorAll('input[name="vending-mode"]');
    modeInputs.forEach(input => {
        input.disabled = false; // 必要に応じて調整してください
        const currentMode = shop.mode || shop.vending_mode;
        if (currentMode && input.value === currentMode) {
            input.checked = true;
        }
    });
}

// ============================================================
// :::START_VENDING::: 🚀 露店販売開始処理・経済活動の起動（ガチガチデバッグ版）
// ============================================================
function startVending() {
    const listContainer = document.getElementById('vending-item-list');
    const btn = document.getElementById('vending-confirm-btn');
    const titleInput = document.getElementById('vending-title-input');
    
    if (!listContainer || listContainer.children.length === 0 || 
        listContainer.innerHTML.includes("アイテムがありません")) {
        if (typeof showCustomAlert === 'function') {
            showCustomAlert("販売するアイテムをリストに追加してください");
        } else {
            alert("販売するアイテムをリストに追加してください");
        }
        return;
    }

    // 🌟 ラジオボタンから選択されたモードを確実に取得
    const modeInputs = document.querySelectorAll('input[name="vending-mode"]');
    const modeInput = document.querySelector('input[name="vending-mode"]:checked');
    const vendingMode = modeInput ? modeInput.value : 'monster';

    let inputTitle = "いらっしゃいませ！";
    if (typeof hero !== 'undefined') {
        hero.is_vending = true; 
        hero.vending_mode = vendingMode; 
        hero.mode = vendingMode;        
        
        inputTitle = (titleInput && titleInput.value.trim() !== "") 
                    ? titleInput.value 
                    : "いらっしゃいませ！";
        hero.vending_title = inputTitle;
    }

    const vendingItems = typeof getVendingItemsData === 'function' ? getVendingItemsData() : []; 

    // 🌟 【追加】選択されている（または現在設定中の）モンスターIDを確実に取得
    const chosenMonsterType = (typeof currentVendingMonsterId !== 'undefined' && currentVendingMonsterId) 
        ? currentVendingMonsterId 
        : ((typeof selectedVendingMonsterType !== 'undefined' && selectedVendingMonsterType) 
            ? selectedVendingMonsterType 
            : "Monster5");

    // 📡 サーバーへ送信
    if (typeof socket !== 'undefined' && typeof hero !== 'undefined') {
        
        // ==========================================
        // 🔍 【ガチガチ・デバッグブロック】
        // ==========================================
        console.group("🕵️‍♂️ [VENDING DEBUG] キャラクター幅の徹底解析");
        console.log("1. hero オブジェクト本体:", hero);
        console.log("2. hero.w の型と値:", typeof hero.w, hero.w);
        console.log("3. hero.width の型と値:", typeof hero.width, hero.width);
        console.log("4. VIEW_CONFIG.playerWidth:", typeof VIEW_CONFIG !== 'undefined' ? VIEW_CONFIG.playerWidth : "VIEW_CONFIG未定義");
        console.log("5. HERO_CONFIG.width:", typeof HERO_CONFIG !== 'undefined' ? HERO_CONFIG.width : "HERO_CONFIG未定義");
        console.log("6. hero.img の状態:", hero.img ? { naturalWidth: hero.img.naturalWidth, width: hero.img.width } : "画像なし");
        console.groupEnd();
        // ==========================================

        // 🌟 マジックナンバーもフォールバックの数字も一切使わず、VIEW_CONFIGの定義から完全に導出する
        const heroWidth = Number(
            hero.w ?? 
            hero.width ?? 
            (typeof VIEW_CONFIG !== 'undefined' && VIEW_CONFIG.player ? VIEW_CONFIG.player.hitboxW : 0)
        );
        
        const centerX = Math.round(hero.x + (heroWidth / 2));
        
        console.log("🚀 [開店の瞬間データ送信 - 解析結果]", {
            "hero.x (左端)": hero.x,
            "導出された heroWidth (幅)": heroWidth,
            "計算された centerX (中心)": centerX,
            "選択された店番モンスター": chosenMonsterType
        });

        socket.emit('open_vending', {
            title: inputTitle,
            items: vendingItems,
            mode: vendingMode,        
            vending_mode: vendingMode,
            monsterType: chosenMonsterType, // 👾 選択したモンスターのIDをここでサーバーへ送信！
            x: centerX, // 👈 中央の座標を送信
            y: hero.y,
			channel: (typeof hero !== 'undefined' && hero.channel !== undefined) ? hero.channel : 1
        });

        socket.emit('move', {
            x: hero.x, y: hero.y, vx: hero.vx, dir: hero.dir,
            jumping: hero.jumping, isAttacking: hero.isAttacking,
            invincible: hero.invincible, climbing: hero.climbing,
            is_vending: true,
            vending_title: inputTitle,
            mode: vendingMode,        
            vending_mode: vendingMode,
            monsterType: chosenMonsterType // 👾 移動データ側にも持たせて同期を確実に
        });
    }

    // 🌟 【超重要】営業中は店番のタイプ（ラジオボタン）を変更できないようにロックする
    modeInputs.forEach(input => {
        input.disabled = true;
    });

    // 🌟 開店成功時はボタンを「完全に店を閉じる（閉店）」用に切り替える
    if (btn) {
        btn.innerText = "🛑 露店を完全に閉じる（閉店）";
        btn.disabled = false;
        btn.setAttribute("onclick", "forceCloseVending()");
        btn.style.setProperty('background', 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', 'important');
        btn.style.setProperty('border-color', '#b91c1c', 'important');
        btn.style.cursor = "pointer";
    }

    console.log(`[UI] ${vendingMode === 'monster' ? '無人露店（モンスター）' : '有人露店'}を開きました（ウィンドウ維持・タイプロック適用）！`);
}

// ============================================================
// :::CLOSE_VENDING_MENU::: ❌ 露店管理メニューの閉鎖（ウィンドウを閉じるだけ / 有人は閉店）
// ============================================================
function closeVendingMenu() {
    const win = document.getElementById('vending-window');
    const btn = document.getElementById('vending-confirm-btn');

    if (win) {
        win.style.display = 'none';
        
        // 管理ウィンドウを閉じたので、フラグをfalseにして看板を青丸に戻す！
        window.isVendingWindowOpen = false;
        
        // 🌟 【ここに追加】サーバーへ「編集が終わったよ」と送信する
        const currentShopId = (typeof hero !== 'undefined' && hero) ? hero.dbId : null;
        if (typeof socket !== 'undefined' && socket && socket.connected && currentShopId) {
            socket.emit('vending_editing_status_change', { 
                shopId: currentShopId, 
                isEditing: false 
            });
        }

        const currentMode = (typeof hero !== 'undefined') ? (hero.vending_mode || hero.mode) : 'player';

        // 💡 【分岐】有人（player）の場合のみ、ウィンドウを×ボタンで閉じたら完全閉店する
        if (currentMode === 'player') {
            forceCloseVending();
        } else {
            // 🌟 🤖 【無人(monster)の場合】
            // 管理画面を閉じるだけで、お店番（無人露店）はそのまま営業を継続させる！
            console.log("[UI] 管理ウィンドウを閉じましたが、無人露店（モンスターKiosk）の営業は継続します。");
        }
    }
}

// ============================================================
// :::FORCE_CLOSE_VENDING::: 🛑 無人・有人を問わず、露店を完全に終了する関数（タイプロック解除）
// ============================================================
function forceCloseVending() {
    const win = document.getElementById('vending-window');
    const btn = document.getElementById('vending-confirm-btn');
    const modeInputs = document.querySelectorAll('input[name="vending-mode"]');

    if (typeof hero !== 'undefined') {
        hero.is_vending = false;
        hero.vending_title = "";
        hero.vending_items = [];
    }

    if (typeof socket !== 'undefined' && typeof hero !== 'undefined') {
        socket.emit('close_vending');

        socket.emit('move', {
            x: hero.x, y: hero.y, vx: hero.vx, dir: hero.dir,
            jumping: hero.jumping, isAttacking: hero.isAttacking,
            invincible: hero.invincible, climbing: hero.climbing,
            is_vending: false,
            vending_title: ""
        });
    }

    // クライアント側の無人露店リストからも削除
    if (typeof activeOfflineShops !== 'undefined' && typeof hero !== 'undefined') {
        const myPersistentId = hero.dbId || socket.id;
        const index = activeOfflineShops.findIndex(s => String(s.id) === String(myPersistentId) || String(s.owner_id) === String(myPersistentId));
        if (index !== -1) {
            activeOfflineShops.splice(index, 1);
        }
    }

	// 停止 2026-10-17
    // ウィンドウを非表示にする
    //if (win) {
    //    win.style.display = 'none';
    //}

    // 🌟 【超重要】閉店したら店番タイプのラジオボタンのロックを解除する
    modeInputs.forEach(input => {
        input.disabled = false;
    });

    // ボタンの状態を元の「✨ この内容で露店を開く」に復旧
    if (btn) {
        btn.innerText = "✨ この内容で露店を開く";
        btn.disabled = false;
        btn.setAttribute("onclick", "startVending()");
        btn.style.removeProperty('background');
        btn.style.removeProperty('border-color');
        btn.style.cursor = "pointer";
    }

    console.log("[UI] 露店を完全に終了し、店番選択のロックを解除しました。");
}

// ============================================================
// :::OPEN_OTHER_PLAYER_VENDING::: 🏪 他者の露店閲覧・ゴージャスリッチ描画（共通関数活用版）
// ============================================================
function openOtherPlayerVending(p) {

    // ==========================================
    // 🔍 【ガチガチ・デバッグ診断】露店データの全プロパティ徹底検査
    // ==========================================
    console.group("🕵️‍♂️ [VENDING DEBUG] 受信データの詳細検査");
    console.log("1. 受信オブジェクト (p):", p);
    console.log("2. 判定用プロパティの候補:", {
        "p.name": p?.name,
        "p.owner_name": p?.owner_name,
        "p.username": p?.username,
        "p.ownerName": p?.ownerName,
        "p.characterName": p?.characterName,
        "p.owner": p?.owner,
        "p.id": p?.id,
        "p.owner_id": p?.owner_id,
        "p.title": p?.title,
        "p.vending_title": p?.vending_title
    });
    
    // activeOfflineShops との照合テスト
    let matchedShop = null;
    if (typeof activeOfflineShops !== 'undefined' && Array.isArray(activeOfflineShops)) {
        const targetId = p?.id || p?.owner_id;
        console.log(`3. activeOfflineShops (登録数: ${activeOfflineShops.length}) から ID: ${targetId} を検索中...`);
        matchedShop = activeOfflineShops.find(s => String(s.id || s.owner_id) === String(targetId));
        console.log("4. 照合結果:", matchedShop ? matchedShop : "❌ 一致するショップが見つかりませんでした");
    } else {
        console.log("3. activeOfflineShops が定義されていないか配列ではありません。");
    }
    console.groupEnd();
    // ==========================================

	console.log("🏪 受信した露店データ全体 (p):", p);
	
    console.log(`[Vending] ${p.vending_title || p.title} (Owner: ${p.id || p.owner_id}) のデータを表示します...`, p.items);

    // 🌟 outline を使ってレイアウトサイズを変えずに枠を制御する専用CSS
    if (!document.getElementById('vending-dynamic-style')) {
        const styleEl = document.createElement('style');
        styleEl.id = 'vending-dynamic-style';
        styleEl.innerHTML = `
            .shop-item-row-div {
                border-bottom: 1px solid #f1f5f9 !important;
                box-sizing: border-box !important;
                outline: 2px solid transparent !important;
                outline-offset: -2px !important;
            }
            .shop-item-row-div.is-selected {
                outline: 2px solid #2563eb !important;
                outline-offset: -2px !important;
            }
        `;
        document.head.appendChild(styleEl);
    }

    const otherVendingWin = document.getElementById('other-vending-window');
    const itemsContainer = document.getElementById('other-vending-items');

    let currentScrollTop = 0;

    if (otherVendingWin) {
        otherVendingWin.style.display = 'block';
        
        // 💬 露店チャット用のターゲットオーナーIDを設定 ＆ イベントとログの初期化
        window._currentVendingOwnerId = p.id || p.owner_id;
        if (typeof initVendingChatEvents === 'function') {
            initVendingChatEvents();
        }
        const vendingChatLog = document.getElementById('vending-chat-log');
        if (vendingChatLog) {
            vendingChatLog.innerHTML = '<span style="color: #94a3b8;">[ショップ内チャット] ようこそ！</span>';
            vendingChatLog.dataset.hasMessage = "false";
        }

        // 🌟 player_stats の gold を確実に取得して反映する
        const userMoneyDisplay = document.getElementById('user-money-display');
        if (userMoneyDisplay) {
            let myMoney = 0;
            if (typeof hero !== 'undefined' && hero) {
                myMoney = hero.gold 
                       ?? (hero.player_stats && hero.player_stats.gold) 
                       ?? (hero.stats && hero.stats.gold) 
                       ?? 0;
            }
            userMoneyDisplay.innerText = Number(myMoney).toLocaleString();
        }

        // 🌟 店主名をフィールド上のネームプレートと完全一致させる
        const ownerNameEl = document.getElementById('other-vending-owner-name');
        if (ownerNameEl) {
            let shopOwnerName = "";
            if (p) {
                shopOwnerName = p.name || p.owner_name || p.username || p.ownerName || p.characterName || (p.owner && (p.owner.name || p.owner.username));
            }
            if (!shopOwnerName && matchedShop) {
                shopOwnerName = matchedShop.name || matchedShop.owner_name || matchedShop.username || matchedShop.ownerName || matchedShop.owner;
            }
            if (!shopOwnerName) {
                shopOwnerName = "プレイヤー";
            }
            ownerNameEl.innerText = `${shopOwnerName}の雇用商人`;
        }

        // 🌟 出店看板の見出し（タイトル）をウィンドウに反映する！
        const shopTitleEl = document.getElementById('other-vending-shop-title');
        if (shopTitleEl) {
            const fallbackTitle = matchedShop ? (matchedShop.title || matchedShop.vending_title) : "いらっしゃいませ";
            shopTitleEl.innerText = p.vending_title || p.title || fallbackTitle || "いらっしゃいませ";
        }

        // 👤 1枠目に自分の名前とアバターを描画
        const visitorName1 = document.getElementById('visitor-name-1');
        if (visitorName1) {
            const myName = (typeof hero !== 'undefined' && hero.name) ? hero.name : "あなた";
            visitorName1.innerText = myName;
        }
        if (typeof drawOtherVendingMyAvatar === 'function') {
            drawOtherVendingMyAvatar();
        }
        
        // 👑 他プレイヤーの雇用商人モンスターのタイプを取得してプレビューを描画！
        const monsterType = p.monsterType || p.merchantType || p.monster_type || (matchedShop ? matchedShop.monsterType : null) || "Monster8";
        window.otherPlayerMonsterType = monsterType; 
        
        if (typeof renderVendingMerchantPreview === 'function') {
            renderVendingMerchantPreview(monsterType, "other-vending-merchant-preview-canvas");
        }

        if (itemsContainer) {
            currentScrollTop = itemsContainer.scrollTop || 0;
            itemsContainer.innerHTML = ""; 

            const shopItems = p.items || [];
            if (shopItems.length === 0) {
                itemsContainer.innerHTML = '<p style="text-align: center; padding: 20px; color: #94a3b8; font-size: 11px; margin: 0;">商品がありません。</p>';
            } else {
                shopItems.forEach((item, index) => {
                    const itemQty = Number(item.count ?? item.quantity ?? 1);
                    const isSoldOut = Boolean(item.isSoldOut || itemQty <= 0);

                    const ownerId = p.id || p.owner_id;
                    
                    const itemEl = document.createElement('div');
                    itemEl.className = 'shop-item-row-div';
                    itemEl.title = isSoldOut ? "売り切れました" : "ダブルクリックで購入";
                    itemEl.style.cssText = `
                        display: flex; justify-content: space-between; align-items: center; 
                        padding: 6px 8px; background: ${isSoldOut ? '#f8fafc' : '#ffffff'}; 
                        margin-bottom: 2px; cursor: pointer; opacity: ${isSoldOut ? '0.4' : '1'}; 
                        position: relative; border-width: 1px; border-style: solid; 
                        border-color: transparent transparent rgb(241, 245, 249); 
                        outline: medium; box-sizing: border-box; 
                        transition: background 0.15s, border-color 0.15s, opacity 0.15s;
                    `;

                    // 🌟 共通関数からHTMLを生成してセット
                    itemEl.innerHTML = createVendingItemHTML(item);

                    // クリック時選択
                    itemEl.onclick = (e) => {
                        e.stopPropagation();
                        const allRows = itemsContainer.querySelectorAll('.shop-item-row-div');
                        allRows.forEach(row => row.classList.remove('is-selected'));
                        itemEl.classList.add('is-selected');
                    };

                    // マウスホバー・ツールチップ
                    itemEl.onmouseenter = (e) => {
                        e.stopPropagation();
                        if (!isSoldOut) { itemEl.style.setProperty('background-color', '#e2e8f0', 'important'); }
                        if (typeof window !== 'undefined') {
                            window.hoveringSlot = item;
                            const gameCanvas = document.getElementById('game-canvas') || document.querySelector('canvas');
                            if (gameCanvas) {
                                const rect = gameCanvas.getBoundingClientRect();
                                window.mouseX = e.clientX - rect.left;
                                window.mouseY = e.clientY - rect.top;
                            } else {
                                window.mouseX = e.clientX;
                                window.mouseY = e.clientY;
                            }
                        }
                    };

                    itemEl.onmousemove = (e) => {
                        e.stopPropagation();
                        if (!isSoldOut) { itemEl.style.setProperty('background-color', '#e2e8f0', 'important'); }
                        if (typeof window !== 'undefined' && window.hoveringSlot === item) {
                            const gameCanvas = document.getElementById('game-canvas') || document.querySelector('canvas');
                            if (gameCanvas) {
                                const rect = gameCanvas.getBoundingClientRect();
                                window.mouseX = e.clientX - rect.left;
                                window.mouseY = e.clientY - rect.top;
                            } else {
                                window.mouseX = e.clientX;
                                window.mouseY = e.clientY;
                            }
                        }
                    };

                    itemEl.onmouseleave = (e) => {
                        e.stopPropagation();
                        if (!isSoldOut && !itemEl.classList.contains('is-selected')) { 
                            itemEl.style.setProperty('background-color', '#ffffff', 'important'); 
                        }
                        if (typeof window !== 'undefined' && window.hoveringSlot === item) {
                            window.hoveringSlot = null;
                        }
                    };

                    // ダブルクリック購入
                    if (!isSoldOut) {
                        itemEl.ondblclick = (e) => {
                            e.stopPropagation();
                            itemEl.style.setProperty('background-color', '#e2e8f0', 'important');
                            openVendingBuyDialog(item, ownerId);
                        };
                    }

                    itemsContainer.appendChild(itemEl);
                });
            }

            itemsContainer.scrollTop = currentScrollTop;
        }
    }

    if (typeof playMenuUpSound === 'function') {
        playMenuUpSound();
    }
    
    requestAnimationFrame(() => {
        if (itemsContainer) {
            itemsContainer.scrollTop = currentScrollTop;
            setTimeout(() => {
                itemsContainer.scrollTop = currentScrollTop;
            }, 10);
        }
    });
}

function closeOtherVendingWindow() {
    const win = document.getElementById('other-vending-window');
    if (win) {
        win.style.display = 'none';
    }

    // 🌟 閉じた瞬間にサーバーへ最新データを要求して同期する
    // （現在開いていたショップのIDやオーナーIDを保持している変数・またはウィンドウに持たせたデータを利用）
    if (typeof currentOpenShopId !== 'undefined' && currentOpenShopId) {
        if (typeof socket !== 'undefined' && socket && socket.connected) {
            console.log("🚪 [Vending] 露店ウィンドウを閉じました。サーバーへ最新データを要求します。");
            socket.emit('request_latest_shop_data', { 
                shopId: currentOpenShopId, 
                ownerId: currentOpenShopId 
            });
        }
    }
}

// ============================================================
// :::RESTORE_VENDING_ITEMS_TO_UI::: 🏪 露店アイテムのUI復元（ゴージャスリッチ仕様連動版）
// ============================================================
function restoreVendingItemsToUI(itemsArray) {
    // 1. 出品用バッファを一度リセット
    vendingItemsBuffer = [];

    // 2. リスト表示コンテナを取得
    const listContainer = document.getElementById('vending-item-list');
    if (!listContainer) return;

    listContainer.innerHTML = "";

    // 3. 復元するアイテムがない場合
    if (!itemsArray || itemsArray.length === 0) {
        listContainer.innerHTML = '<div style="padding: 10px; text-align: center; color: #64748b; font-size: 11px;">アイテムがありません</div>';
        return;
    }

    // 4. 各アイテムをお持ちのゴージャスリッチな addItemToVendingList に通して美しく描画！
    itemsArray.forEach(item => {
        addItemToVendingList(item);
    });
	
	// 🌟 5. 【ここがポイント！】露店データを一括で読み込んで復元したときは、スクロールを一番上に強制リセットする！
    listContainer.scrollTop = 0;

    console.log("✨ [Vending] 露店管理ウィンドウの陳列商品を完全に復元しました:", vendingItemsBuffer);
}

// ============================================================
// 📦 共通：露店アイテムのHTML文字列を生成する関数（デザイン・レイアウトの統一用）
// ============================================================
function createVendingItemHTML(item) {
    const itemQty = Number(item.count ?? item.quantity ?? 1);
    const isSoldOut = Boolean(item.isSoldOut || itemQty <= 0);

    const idCheck = {
        item_id: item.item_id,
        data_item_id: item.data?.item_id,
        itemData_id: item.itemData?.item_id,
        raw_id: item.id
    };
    const targetItemId = Number(idCheck.item_id || idCheck.data_item_id || idCheck.itemData_id || idCheck.raw_id || 0);

    const dbDisplayName = (item.data && item.data.display_name) || item.display_name;
    const dbImageName = (item.data && item.data.image_name) || item.image_name;

    let finalIconPath = "";
    if (item?.iconUrl && item.iconUrl !== "") {
        finalIconPath = item.iconUrl;
    } else if (dbImageName) {
        const hasExt = String(dbImageName).includes('.');
        finalIconPath = `${IMAGE_DOMAIN}item_assets/${dbImageName}${hasExt ? '' : '.png'}`;
    } else if (targetItemId === 201) {
        finalIconPath = `${IMAGE_DOMAIN}item_assets/sweets.png`;
    } else {
        const fallbackType = item.type || (item.data && item.data.type) || 'default';
        finalIconPath = `${IMAGE_DOMAIN}item_assets/${fallbackType}${String(fallbackType).includes('.') ? '' : '.png'}`;
    }

    let displayName = dbDisplayName || item.displayName || item.name || (item.data && item.data.name) || "不明なアイテム";
    if (targetItemId === 201) {
        displayName = dbDisplayName || "おいしいケーキ";
    }

    let iconGlowStyle = ""; 
    const isEquipment = (
        item.type === 'sword' || item.type === 'shield' || ['sword', 'shield'].includes(item.item_type)
    );

    const currentAllStats = item.totalALLStats ?? (item.data && item.data.totalALLStats);
    const currentFirstStats = item.totalFirstStats ?? (item.data && item.data.totalFirstStats);

    if (isEquipment && currentAllStats !== undefined && currentFirstStats !== undefined) {
        const bonus = currentAllStats - currentFirstStats;
        let rankGlowColor = "";
        let rankName = "";
        if (bonus >= 30)      { rankGlowColor = "#ef4444"; rankName = "(神級)"; }
        else if (bonus >= 25) { rankGlowColor = "#22c55e"; rankName = "(超伝説)"; }
        else if (bonus >= 20) { rankGlowColor = "#eab308"; rankName = "(極上)"; }
        else if (bonus >= 15) { rankGlowColor = "#a855f7"; rankName = "(伝説)"; }
        else if (bonus >= 10) { rankGlowColor = "#06b6d4"; rankName = "(希少)"; }
        else if (bonus >= 5)  { rankGlowColor = "#f97316"; rankName = "(良品)"; }
        else if (bonus >= 0)  { rankGlowColor = "";        rankName = "(標準)"; }
        else                  { rankGlowColor = "";        rankName = "(粗悪)"; }

        if (!displayName.includes("(")) displayName = `${displayName} <span style="font-size:10px; font-weight:bold; color:${rankGlowColor || '#64748b'};">${rankName}</span>`;
        if (rankGlowColor) { iconGlowStyle = `filter: drop-shadow(0 0 4px ${rankGlowColor});`; }
    } else {
        displayName = displayName.replace(/\(標準\)$/, "");
    }

    const rawPrice = Number(item.price || 0);
    let priceColor = "#2563eb"; 
    if (rawPrice >= 1000000000) { priceColor = "#7c3aed"; }
    else if (rawPrice >= 100000000) { priceColor = "#9333ea"; }
    else if (rawPrice >= 10000000) { priceColor = "#dc2626"; }
    else if (rawPrice >= 1000000) { priceColor = "#16a34a"; }
    else if (rawPrice >= 10000) { priceColor = "#0891b2"; }

    const displayPrice = item.price ? Number(item.price).toLocaleString() : "0";

    return `
        <div style="display: flex; align-items: center; gap: 10px; flex: 1; pointer-events: none;">
            <div style="width: 36px; height: 36px; min-width: 36px; display: flex; align-items: center; justify-content: center; background: radial-gradient(circle, #f8fafc 0%, #e2e8f0 100%); border: 1px solid #cbd5e1; border-radius: 6px; position: relative; overflow: hidden; box-shadow: inset 0 1px 2px rgba(255,255,255,0.8);">
                <img src="${finalIconPath}" 
                     onerror="this.onerror=null; this.src='assets/items/default.png';" 
                     style="max-width: 28px; max-height: 28px; object-fit: contain; image-rendering: pixelated; ${iconGlowStyle}">
                ${(!isEquipment && itemQty > 1 && !isSoldOut) ? `
                    <span style="position: absolute; bottom: 1px; right: 1px; font-size: 8px; background: rgba(15,23,42,0.85); color: white; padding: 0 3px; border-radius: 3px; font-family: 'Segoe UI', Tahoma, sans-serif; font-weight: bold; line-height: 1.4;">
                        ${itemQty}
                    </span>
                ` : ''}
            </div>
            <div style="display: flex; flex-direction: column; font-family: 'Segoe UI', Tahoma, sans-serif; gap: 1px;">
                <span style="color: #0f172a; font-weight: 700; font-size: 12px; letter-spacing: 0.2px;">
                    ${displayName}
                </span>
                <!-- 🌟 「1個当り」のフォントサイズと色を価格（priceColor）に完全統一 -->
                <div style="display: flex; align-items: baseline; gap: 3px;">
                    <span style="display:none; color: ${priceColor}; font-size: 11px; font-weight: 700;">1個当り</span>
                    <span style="color: ${priceColor}; font-weight: 800; font-size: 11px;">${displayPrice}</span>
                    <span style="color: ${priceColor}; font-size: 11px; font-weight: 700;">メル</span>
                </div>
            </div>
        </div>
        <div></div>
    `;
}

// 🌟 サーバーから「編集状態が変わった」という通知を受け取る
if (typeof socket !== 'undefined' && socket) {
    socket.on('vending_editing_status_update', (data) => {
        if (typeof activeOfflineShops !== 'undefined' && Array.isArray(activeOfflineShops)) {
            const shop = activeOfflineShops.find(s => String(s.id || s.owner_id) === String(data.shopId));
            if (shop) {
                shop.isEditing = data.isEditing; // 状態を更新
            }
        }
    });
}

// ============================================================
// :::SOCKET_ON_VENDING_DATA_RES::: 📡 露店商品データの受信とUI描画 (共通関数活用版)
// ============================================================
socket.on('vending_data_res', (data) => {

    const itemsContainer = document.getElementById('other-vending-items');
    if (!itemsContainer) {
        console.error("❌ [ERROR] 'other-vending-items' が消失しています。");
        return;
    }

    // 🌟 【超重要】データ受信・描画処理の開始時に現在のスクロール位置を保持する
    const currentScrollTop = itemsContainer.scrollTop;

    const now = Date.now();
    const lastUpdate = parseInt(itemsContainer.dataset.lastTick || 0);

    if (now - lastUpdate > 1000) {
        itemsContainer.dataset.lastPureHash = ""; 
        console.log("🔄 [VENDING] 再入室を検知。キャッシュをリセットして描画を強制します。");
    }

    if (now - lastUpdate < 300) { 
        return; 
    }
    itemsContainer.dataset.lastTick = now;

    const parentWindow = itemsContainer.closest('.vending-window') || itemsContainer.parentElement;
    if (parentWindow) {
        const currentStyle = window.getComputedStyle(parentWindow).display;
        if (currentStyle === 'none') {
            console.warn("⚠️ 外部干渉によるウィンドウ消失を検知。表示を強制維持します。");
            parentWindow.style.setProperty('display', 'block', 'important');
        }
    }

    console.log("%c🏪 [VENDING_RECEIVE] データ受信", "background: #2ecc71; color: white; padding: 2px 5px;", data);

    window.currentVendingOwnerId = data.ownerId;
    const items = data.items || [];

    // 🌟 ハッシュ値に isSoldOut の状態も含めることで、売り切れ変化時に確実に再描画させる
    const pureDataHash = items.map(i => {
        const id = i.item_id || i.id || (i.data && i.data.item_id);
        const price = i.price || 0;
        const count = i.count || i.quantity || 1;
        const soldOut = i.isSoldOut ? 1 : 0;
        return `${id}_${price}_${count}_${soldOut}`;
    }).join('|');

    if (itemsContainer.dataset.lastPureHash === pureDataHash) {
        return;
    }
    itemsContainer.dataset.lastPureHash = pureDataHash;

    if (items.length === 0) {
        if (!itemsContainer.querySelector('.empty-vending-msg')) {
            itemsContainer.innerHTML = '<p class="empty-vending-msg" style="text-align: center; padding: 20px; color: #64748b; font-size: 12px; font-family: \'Segoe UI\', Tahoma, sans-serif;">商品は売り切れ、またはありません。</p>';
        }
        return;
    }

    const hasNonItemNodes = Array.from(itemsContainer.childNodes).some(node => {
        return node.nodeType === Node.TEXT_NODE || (node.nodeType === Node.ELEMENT_NODE && !node.classList.contains('shop-item-row-div'));
    });

    if (hasNonItemNodes) {
        itemsContainer.innerHTML = ''; 
    }

    const currentRows = itemsContainer.querySelectorAll('.shop-item-row-div');

    items.forEach((item, index) => {
        // 🌟 売り切れ判定（isSoldOut が true、または個数が 0 以下）
        const isSoldOut = item.isSoldOut || Number(item.count || item.quantity || 0) <= 0;

        let itemRow = currentRows[index];
        if (!itemRow) {
            itemRow = document.createElement('div');
            itemRow.className = 'shop-item-row-div';
            itemsContainer.appendChild(itemRow);
        }

        // 🌟 売り切れ状態に応じてスタイルを動的に切り替え
        Object.assign(itemRow.style, {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "1px solid #f1f5f9",
            borderTop: "1px solid transparent",
            borderLeft: "1px solid transparent",
            borderRight: "1px solid transparent",
            padding: "6px 8px",
            cursor: "pointer",
            background: isSoldOut ? "#f8fafc" : "#ffffff",
            opacity: isSoldOut ? "0.4" : "1",
            outline: "none",
            boxSizing: "border-box",
            position: "relative",
            transition: "background 0.15s ease, border-color 0.15s ease, opacity 0.15s ease"
        });
        itemRow.title = isSoldOut ? "売り切れました" : "ダブルクリックで購入";

        // 🌟 共通関数からHTMLを生成してセット
        const newHTML = createVendingItemHTML(item);

        if (itemRow.innerHTML.trim() !== newHTML.trim()) {
            itemRow.innerHTML = newHTML;
        }
        
        // 🌟 ダブルクリック（購入）の制御
        if (!isSoldOut) {
            itemRow.ondblclick = () => {
                console.log("🎯 [DEBUG_DBLCLICK] アイテムがダブルクリックされました！対象:", item);
                if (typeof openVendingBuyDialog === 'function') {
                    openVendingBuyDialog(item, data.ownerId);
                } else {
                    console.error("❌ [ERROR] openVendingBuyDialog 関数が存在しません！");
                }
            };
        } else {
            itemRow.ondblclick = null; // 売り切れ時は購入不可
        }

        // 🔍 マウスエンター（ホバー開始）
        itemRow.onmouseenter = (e) => { 
            console.log("📥 [DEBUG_HOVER] onmouseenter 発火！ 対象アイテム:", item.name);
            itemRow.style.backgroundColor = isSoldOut ? "#e2e8f0" : "#ffedd5"; 
            itemRow.style.borderColor = isSoldOut ? "#cbd5e1" : "#f97316";
            
            if (typeof window !== 'undefined') {
                window.hoveringSlot = item; 
                const gameCanvas = document.getElementById('game-canvas') || document.querySelector('canvas');
                if (gameCanvas) {
                    const rect = gameCanvas.getBoundingClientRect();
                    window.mouseX = e.clientX - rect.left;
                    window.mouseY = e.clientY - rect.top;
                } else {
                    window.mouseX = e.clientX;
                    window.mouseY = e.clientY;
                }
            }
        };

        // 🔍 マウスムーブ
        itemRow.onmousemove = (e) => {
            if (typeof window !== 'undefined') {
                const gameCanvas = document.getElementById('game-canvas') || document.querySelector('canvas');
                if (gameCanvas) {
                    const rect = gameCanvas.getBoundingClientRect();
                    window.mouseX = e.clientX - rect.left;
                    window.mouseY = e.clientY - rect.top;
                } else {
                    window.mouseX = e.clientX;
                    window.mouseY = e.clientY;
                }
            }
        };
        
        // 🔍 マウスリーブ（ホバー終了）
        itemRow.onmouseleave = () => { 
            console.log("📤 [DEBUG_HOVER] onmouseleave 発火！ 対象アイテム:", item.name);
            itemRow.style.backgroundColor = isSoldOut ? "#f8fafc" : "#ffffff"; 
            itemRow.style.borderColor = "transparent";
            itemRow.style.borderBottomColor = "#f1f5f9";
            
            if (typeof window !== 'undefined' && window.hoveringSlot === item) {
                window.hoveringSlot = null;
            }
        };
    }); 

    if (currentRows.length > items.length) {
        for (let i = items.length; i < currentRows.length; i++) {
            currentRows[i].remove();
        }
    }

    // 🌟 【超高精度化】ブラウザのレイアウト計算（リフロー）が完了した直後にスクロール位置を完全にロックする
    requestAnimationFrame(() => {
        itemsContainer.scrollTop = currentScrollTop;
        
        setTimeout(() => {
            itemsContainer.scrollTop = currentScrollTop;
        }, 10);
    });
});

// サーバーから「モデルIDの保存成功」通知を受け取る
socket.on('update_model_success', (data) => {
    // 💡 取得確認のログとアラート
    console.log("✅ サーバーから保存成功通知を受信しました:", data);
    //alert("キャラクターの設定が完了しました！冒険に出発しましょう。");
	alert("現在のモデルIDは: " + data.model_id + " です");

    // ここでゲーム開始に必要な処理があれば呼び出す
    // 例:
    // window.isGameStarted = true;
    // socket.emit('join', { ... });
});

// ============================================================
// :::SOCKET_ON_VENDING_BUY_SUCCESS::: 💰 露店購入の成功と所持金清算
// ============================================================
/**
 * 役割：
 * - サーバーからの購入成功通知（vending_buy_success）の受信
 * - プレイヤー所持金（myPlayer.gold）の最新化と同期
 * - インベントリやUIの整合性を維持するための再同期指示
 */
socket.on('vending_buy_success', (data) => {
    console.log("💰 購入成功。最新の所持金を受け取りました:", data.newMoney);

    // 1. メモリ上のプレイヤーデータを更新
    // あなたのコードで 'drawGoldUI' に渡しているオブジェクトを更新します
    if (typeof myPlayer !== 'undefined' && myPlayer) {
        myPlayer.gold = data.newMoney; 
        // これで次回の drawGoldUI(myPlayer) 実行時に新しい数値が描画されます
    }

    // 2. エラー（null is not an object）対策：
    // もしインベントリの再描画などを関数で行っている場合、
    // アイテムが消えたことによる参照エラーを防ぐために、
    // アイテムリストの整合性をチェックするか、安全な再読み込みを推奨します
    // 例: requestInventoryUpdate();
});

// ============================================================
// :::SOCKET_ON_VENDING_ITEM_SOLD::: 📢 売却成功通知と在庫・報酬の同期
// ============================================================
/**
 * 役割：
 * - 売却成功のログ出力と買い手名の表示
 * - プレイヤー所持金（myPlayer.gold）の最新化とUI更新
 * - 売れたアイテムを露店リスト（バッファとDOM）から即時削除（removeItemFromVending）
 * - 成功メッセージのプレイヤー通知（showSystemMessage）
 */
socket.on('vending_item_sold', (data) => {
    // 1. ログ出力 (data.dbId はサーバーから送られてくる売れたアイテムのID)
    console.log(`%c📢 商品売却成功: ${data.buyerName} が購入しました (ID: ${data.dbId})`, "color: #27ae60; font-weight: bold;");

    // 2. 所持金の更新
    if (typeof myPlayer !== 'undefined' && myPlayer) {
        myPlayer.gold = data.newMoney;
        // 所持金表示UIがあれば更新（例: updateMoneyUI() など）
    }

    // 3. 🌟 重要：売れたアイテムを露店販売リストから即座に削除
    // これにより、バッファ(vendingItemsBuffer)と表示(DOM)の両方が同期されます
    if (data.dbId) {
        removeItemFromVending(data.dbId);
		//markItemAsSold(data.dbId);
    }

    // 4. 通知メッセージの表示
    if (typeof showSystemMessage === 'function') {
        showSystemMessage(`${data.buyerName} さんにアイテムが売れました！`, "#27ae60");
    }
});

// ============================================================
// :::SOCKET_ON_SYSTEM_MESSAGE::: 📡 システムメッセージの受信と通知
// ============================================================
/**
 * 役割：
 * - サーバーからのメッセージ（テキストと色）を受信
 * - 既存の通知システム（addNotification）へ情報を引き渡し
 * - 「いっぱいです」等の重要警告に対し、プレイヤーへ強力なアラート（alert）を表示
 */
socket.on('system_message', (data) => {
    // 1. 既存の通知システムがあれば表示（addNotificationなど）
    if (typeof addNotification === 'function') {
        addNotification(data.text, data.color || "#FFFFFF");
    }

    // 2. 「いっぱいです」というキーワードが含まれている場合、アラートを表示
    if (data.text && data.text.includes("いっぱいです")) {
        alert("🎒 インベントリ制限\n\n" + data.text);
    }
});

socket.on('login_error', (data) => {
    // 警告メッセージを表示する処理
    alert(data.message); 
    // または、これまで作った「接続が切れました」と同じ仕組みで表示
    showErrorMessage(data.message);
});

// ============================================================
// 📜 【修正版】売上履歴ウィンドウを開く関数（画面中央配置 ＆ 近くへの配置対応）
// ============================================================
function openVendingSalesLog() {
    const logWin = document.getElementById('vending-sales-log-window');
    if (logWin) {
        logWin.style.display = 'block';
        
        // 🌟 まずは画面の中央に配置するスタイルを適用
        logWin.style.left = '50%';
        logWin.style.top = '50%';
        logWin.style.transform = 'translate(-50%, -50%)';

        // 💡 もし露店ウィンドウ（vending-window）が開いていれば、その隣に並べて表示したい場合の微調整（お好みで活用できます）
        const vendingWin = document.getElementById('vending-window');
        if (vendingWin && vendingWin.style.display !== 'none' && vendingWin.style.left) {
            // 露店ウィンドウの座標が取得できる場合は、その右側にピタッと並べることも可能です
            // 今回は確実に中央に表示させるため、上記 transform による中央配置を優先しています。
        }
    }

    // サーバーへ売上ログの取得を要求
    if (typeof socket !== 'undefined') {
        socket.emit('get_vending_sales_log');
    }
}

// 📡 サーバーから売上ログデータを受信して画面に描画する
socket.on('vending_sales_log_res', (data) => {
    const listContainer = document.getElementById('vending-sales-log-list');
    if (!listContainer) return;

    const logs = data.logs || [];
    if (logs.length === 0) {
        listContainer.innerHTML = '<p style="text-align: center; color: #64748b; font-size: 11px; margin: 10px 0;">売上履歴はありません。</p>';
        return;
    }

    listContainer.innerHTML = '';
    logs.forEach(log => {
        const dateStr = new Date(log.created_at).toLocaleString();
        const row = document.createElement('div');
        row.style.cssText = "display: flex; flex-direction: column; background: #f8fafc; border: 1px solid #e2e8f0; padding: 6px 8px; border-radius: 4px; font-size: 11px; gap: 2px;";
        
        row.innerHTML = `
            <div style="display: flex; justify-content: space-between; font-weight: bold; color: #0f172a;">
                <span>🛒 ${log.item_name} x${log.quantity}</span>
                <span style="color: #16a34a;">+${Number(log.total_price).toLocaleString()} メル</span>
            </div>
            <div style="display: flex; justify-content: space-between; color: #64748b; font-size: 9px;">
                <span>購入者: ${log.buyer_name}</span>
                <span>${dateStr}</span>
            </div>
        `;
        listContainer.appendChild(row);
    });
});

// 🔔 リアルタイムで商品が売れたときのシステム通知
socket.on('vending_item_sold_notification', (data) => {
    if (typeof showSystemMessage === 'function') {
        showSystemMessage(`【露店売上】${data.buyerName} が ${data.itemName} x${data.quantity} を ${data.totalPrice.toLocaleString()}メル で購入しました！`);
    }
});

// ============================================================
// 💰 【クライアント側】未受取の売上金を回収する関数
// ============================================================
function claimVendingGold() {
    // サーバーへ「売上金を回収したい」というリクエストを送る
    if (typeof socket !== 'undefined' && socket) {
        socket.emit('claim_vending_gold');
        console.log("💰 [Client] 売上金回収リクエストを送信しました。");
    }
}

// ============================================================
// 💰 サーバーから「売上金の回収成功」を受け取ったときの処理
// ============================================================
if (typeof socket !== 'undefined' && socket) {
    socket.on('vending_gold_claimed', (data) => {
        console.log("💰 [Client] 売上金回収成功データを受信:", data);

        // 1. 未受取金の表示を「0」にリセットする
        const goldSpan = document.getElementById('vending-unclaimed-gold');
        if (goldSpan) {
            goldSpan.innerText = "0";
        }

        // 2. ダイアログ（通知）を表示する
        const claimedAmount = data.claimed || 0;
        if (typeof showNotification === 'function') {
            showNotification(`💰 ${claimedAmount.toLocaleString()} メルを受け取りました！(売り切れ品を片付けました)`, "#2ecc71");
        } else {
            alert(`${claimedAmount.toLocaleString()} メルを受け取りました！`);
        }

        // 3. 手元の hero オブジェクトなどの未受取金を 0 に更新
        if (typeof hero !== 'undefined' && hero) {
            hero.unclaimed_gold = 0;
        }

        // 4. 🌟 【完璧な解決】サーバーから送られてきた売り切れ除外済みの items を一括復元関数に渡して即時再描画！
        if (data.items) {
            // もし自分の露店データ（myShopなど）を保持しているならここで更新
            if (typeof myShop !== 'undefined' && myShop) {
                myShop.items = data.items;
            }

            // 見つかった一括復元関数を実行！
            if (typeof restoreVendingItemsToUI === 'function') {
                restoreVendingItemsToUI(data.items);
            }
        }
    });
}

// ==========================================
// 📦 露店データ管理用バッファ
// ==========================================
let vendingItemsBuffer = []; // サーバー送信用のデータを保持する箱

// ============================================================
// :::REMOVE_ITEM_FROM_VENDING::: 🗑️ 露店リストからのアイテム削除と同期・DB更新
// ============================================================
/**
 * 役割：
 * - 販売リスト配列から指定IDのアイテムをフィルタリング除去
 * - 対応するHTML要素（DOM）を画面から削除
 * - ツールチップ（currentHoverSlot）のクリアによるゴミデータの防止
 * - リストが空になった際の初期メッセージの復帰
 * - 🌟 出店中の場合はボタンを「🔄 露店情報を更新する」へ切り替え、サーバーへ最新バッファを送信してDBを即時更新
 */
function removeItemFromVending(itemId) {
    // 1. 配列から削除
    vendingItemsBuffer = vendingItemsBuffer.filter(i => (i.db_id || i.id) != itemId);
    
    // 2. 画面(DOM)から削除
    const el = document.getElementById(`vending-item-${itemId}`);
    if (el) el.remove();
    
    // 3. ホバー中のツールチップをクリア
    window.currentHoverSlot = null;

    // リストが空になったらメッセージを戻す
    const listContainer = document.getElementById('vending-item-list');
    if (listContainer && vendingItemsBuffer.length === 0) {
        listContainer.innerHTML = '<p style="color: #64748b; text-align: center; padding: 10px; font-size: 11px;">アイテムがありません</p>';
    }
    
    console.log(`[Vending] ID:${itemId} をリストから削除しました。残りの数: ${vendingItemsBuffer.length}`);

    // 🌟 判定を強化： hero.is_vending または 管理ウィンドウが表示中なら処理を実行！
    const vendingWin = document.getElementById('vending-window');
    const isWindowOpen = vendingWin && vendingWin.style.display !== 'none';
    const isCurrentlyVending = (typeof hero !== 'undefined' && hero.is_vending) || isWindowOpen;

    if (isCurrentlyVending) {
        // ボタンの見た目と動作を「露店情報を更新する」に変更
        const confirmBtn = document.getElementById('vending-confirm-btn');
        if (confirmBtn) {
            confirmBtn.innerText = "🔄 露店情報を更新する";
            confirmBtn.setAttribute("onclick", "startVending()");
            confirmBtn.style.setProperty('background', 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', 'important');
            confirmBtn.style.setProperty('border-color', '#0284c7', 'important');
        }

        // サーバーへ最新のバッファを送信してDBを更新
        if (typeof socket !== 'undefined') {
            console.log("🚀 [Vending] サーバーへ update_vending_items を送信します:", vendingItemsBuffer);
            //socket.emit('update_vending_items', {
            //    items: vendingItemsBuffer
            //});
            console.log("💾 [Vending] アイテム削除後の最新リストをサーバーへ送信し、データベースを更新します。");
        }
    } else {
        console.warn("⚠️ 出店中フラグが false のため、サーバー送信をスキップしました。");
    }
}

// ============================================================
// :::MARK_ITEM_AS_SOLD::: ✅ 売却済みアイテムの演出と在庫更新
// ============================================================
/**
 * 役割：
 * - 売却されたアイテムのDOMを視覚的にグレーアウト・透過処理
 * - 削除ボタンを「[売却済]」ラベルに差し替え、インタラクションを遮断
 * - メモリ上のバッファ（vendingItemsBuffer）からは削除し、データ整合性を維持
 */
function markItemAsSold(itemId) {
    const targetId = String(itemId);
    const itemEl = document.getElementById(`vending-item-${targetId}`);

    if (itemEl) {
        // 1. クリックやホバーを無効化
        itemEl.style.pointerEvents = "none";
        // 2. 見た目を薄くする（透過）
        itemEl.style.opacity = "0.5";
        itemEl.style.background = "#f0f0f0";
        
        // 3. 削除ボタンを「売却済」ラベルに差し替える
        const deleteBtn = itemEl.querySelector('button');
        if (deleteBtn) {
            deleteBtn.outerHTML = `<span style="color: #888; font-weight: bold; font-size: 10px; padding: 2px 5px;">[売却済]</span>`;
        }
        
        console.log(`✅ アイテム ${targetId} を売却済み表示にしました。`);
    }

    // バッファからは削除（店を開き直したときは消えてOKなため）
    vendingItemsBuffer = vendingItemsBuffer.filter(i => String(i.db_id || i.id) !== targetId);
}

// ============================================================
// :::ADD_ITEM_TO_VENDING_LIST::: 🏪 露店への商品陳列・データ供給 (デザイン統一・ベースライン揃え版)
// ============================================================
function addItemToVendingList(item) {
    const listContainer = document.getElementById('vending-item-list');
    
    // IMAGE_DOMAIN が未定義の場合の安全なフォールバック対策
    const imageBase = (typeof IMAGE_DOMAIN !== 'undefined') ? IMAGE_DOMAIN : 'assets/';

    // ==========================================
    // 🔍 完璧デバッグセクション
    // ==========================================
    console.group(`🏪 露店追加デバッグ: ${item?.name || '不明なアイテム'}`);
    console.log("1. 受信データ:", item);

    let finalIconPath = "";
    const dbImageName = (item.data && item.data.image_name) || item.image_name || item.iconName;
    const targetItemId = Number(item.item_id || (item.data && item.data.item_id) || item.id || 0);

    if (item?.iconUrl && item.iconUrl !== "") {
        finalIconPath = item.iconUrl;
    } else if (dbImageName) {
        const hasExt = String(dbImageName).includes('.');
        finalIconPath = `${imageBase}item_assets/${dbImageName}${hasExt ? '' : '.png'}`;
    } else if (targetItemId === 201) {
        finalIconPath = `${imageBase}item_assets/sweets.png`;
    } else {
        const fallbackType = item.type || (item.data && item.data.type) || 'default';
        finalIconPath = `${imageBase}item_assets/${fallbackType}${String(fallbackType).includes('.') ? '' : '.png'}`;
    }

    console.log(`2. 最終解決URL: "${finalIconPath}"`);
    console.groupEnd();

    if (!listContainer || !item) return;

    const itemId = item.db_id || item.id || item.dbId;
    const isAlreadyIn = vendingItemsBuffer.some(i => (i.db_id || i.id || i.dbId) === itemId);
    if (isAlreadyIn) {
        console.warn("⚠️ このアイテムは既にリストに含まれています。");
        return;
    }
    vendingItemsBuffer.push(item); 

    if (listContainer.innerHTML.includes("アイテムがありません")) {
        listContainer.innerHTML = '';
    }

    const existing = document.getElementById(`vending-item-${itemId}`);
    if (existing) return;

    const isSoldOut = item.isSoldOut || Number(item.count || item.quantity || 0) <= 0;

    let displayName = item.displayName || item.name || item.item_name || item.itemName || (item.data && item.data.name) || "名称不明アイテム";
    let iconGlowStyle = ""; 

    const isEquipment = (
        item.type === 'sword' || 
        item.type === 'shield' || 
        ['sword', 'shield'].includes(item.item_type)
    );

    const currentAllStats = item.totalALLStats ?? (item.data && item.data.totalALLStats);
    const currentFirstStats = item.totalFirstStats ?? (item.data && item.data.totalFirstStats);

    if (isEquipment && currentAllStats !== undefined && currentFirstStats !== undefined) {
        const bonus = currentAllStats - currentFirstStats;
        let rankName = "";
        let rankGlowColor = "";

        if (bonus >= 30)      { rankGlowColor = "#ef4444"; rankName = "(神級)"; }
        else if (bonus >= 25) { rankGlowColor = "#22c55e"; rankName = "(超伝説)"; }
        else if (bonus >= 20) { rankGlowColor = "#eab308"; rankName = "(極上)"; }
        else if (bonus >= 15) { rankGlowColor = "#a855f7"; rankName = "(伝説)"; }
        else if (bonus >= 10) { rankGlowColor = "#06b6d4"; rankName = "(希少)"; }
        else if (bonus >= 5)  { rankGlowColor = "#f97316"; rankName = "(良品)"; }
        else if (bonus >= 0)  { rankGlowColor = "";        rankName = "(標準)"; }
        else                  { rankGlowColor = "";        rankName = "(粗悪)"; }

        if (!displayName.includes("(")) displayName = `${displayName} <span style="font-size:10px; font-weight:bold; color:${rankGlowColor || '#64748b'};">${rankName}</span>`;
        if (rankGlowColor) {
            iconGlowStyle = `filter: drop-shadow(0 0 4px ${rankGlowColor});`;
        }
    } else {
        displayName = displayName.replace(/\(標準\)$/, "");
    }

    const rawPrice = Number(item.price || 0);
    let priceColor = "#2563eb";

    if (rawPrice >= 1000000000) { priceColor = "#7c3aed"; }
    else if (rawPrice >= 100000000) { priceColor = "#9333ea"; }
    else if (rawPrice >= 10000000) { priceColor = "#dc2626"; }
    else if (rawPrice >= 1000000) { priceColor = "#16a34a"; }
    else if (rawPrice >= 10000) { priceColor = "#0891b2"; }

    const displayPrice = item.price ? Number(item.price).toLocaleString() : "0";
    const itemCount = item.count || item.quantity || 1;

    const itemEl = document.createElement('div');
    itemEl.id = `vending-item-${itemId}`;
    // 🌟 他人の露店側と同じボーダー・トランジション等のデザインに統一
    itemEl.style.cssText = `
        display: flex; justify-content: space-between; align-items: center; 
        padding: 6px 8px; background: ${isSoldOut ? '#f8fafc' : '#ffffff'}; 
        opacity: ${isSoldOut ? '0.5' : '1'}; margin-bottom: 2px; cursor: pointer; 
        border-width: 1px; border-style: solid; border-color: transparent transparent rgb(241, 245, 249); 
        box-sizing: border-box; transition: background 0.15s, border-color 0.15s, opacity 0.15s;
    `;
    
    itemEl.onmouseover = () => { itemEl.style.background = '#f1f5f9'; };
    itemEl.onmouseout = () => { itemEl.style.background = isSoldOut ? '#f8fafc' : '#ffffff'; };
    itemEl.onmouseenter = () => { window.currentHoverSlot = item; };
    itemEl.onmouseleave = () => { window.currentHoverSlot = null; };

    // 🌟 価格表示を縦並び ＆ align-items: baseline に統一したクリーンなHTML構造
    itemEl.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px; flex: 1; pointer-events: none;">
            <div style="width: 36px; height: 36px; min-width: 36px; display: flex; align-items: center; justify-content: center; background: radial-gradient(circle, #f8fafc 0%, #e2e8f0 100%); border: 1px solid #cbd5e1; border-radius: 6px; position: relative; overflow: hidden; box-shadow: inset 0 1px 2px rgba(255,255,255,0.8);">
                ${finalIconPath ? `
                    <img src="${finalIconPath}" 
                         onerror="this.onerror=null; this.src='assets/items/default.png';" 
                         style="max-width: 28px; max-height: 28px; object-fit: contain; image-rendering: pixelated; ${iconGlowStyle}">
                ` : `
                    <div style="width: 16px; height: 16px; background: #cbd5e1; border-radius: 2px;"></div>
                `}
                ${(!isEquipment && itemCount > 1 && !isSoldOut) ? `
                    <span style="position: absolute; bottom: 1px; right: 1px; font-size: 8px; background: rgba(15,23,42,0.85); color: white; padding: 0 3px; border-radius: 3px; font-family: 'Segoe UI', Tahoma, sans-serif; font-weight: bold; line-height: 1.4;">
                        ${itemCount}
                    </span>
                ` : ''}
            </div>
            <div style="display: flex; flex-direction: column; font-family: 'Segoe UI', Tahoma, sans-serif; gap: 1px;">
                <span style="color: #0f172a; font-weight: 700; font-size: 12px; letter-spacing: 0.2px;">${displayName}</span>
                <div style="display: flex; align-items: baseline; gap: 3px;">
                    <span style="color: ${priceColor}; font-weight: 800; font-size: 11px;">${displayPrice}</span>
                    <span style="color: #64748b; font-size: 9px; font-weight: 600;">メル</span>
                </div>
            </div>
        </div>
        ${isSoldOut ? `
            <div></div>
        ` : `
            <button onclick="event.stopPropagation(); removeItemFromVending('${itemId}')" 
                    style="background: #fee2e2; border: 1px solid #fca5a5; color: #dc2626; padding: 3px 8px; cursor: pointer; border-radius: 4px; font-size: 10px; font-weight: bold; transition: all 0.15s; box-shadow: 0 1px 2px rgba(0,0,0,0.02);"
                    onmouseover="this.style.background='#ef4444'; this.style.color='#ffffff';"
                    onmouseout="this.style.background='#fee2e2'; this.style.color='#dc2626';">[削除]</button>
        `}
    `;
    
    listContainer.appendChild(itemEl);
    console.log(`${displayName} を価格 ${displayPrice} メルで販売リストに追加しました。`);

    // 🌟 アイテムが追加された瞬間に、リストのスクロールを一番下へ移動する！
    listContainer.scrollTop = listContainer.scrollHeight;
    
    const vendingWin = document.getElementById('vending-window');
    const isWindowOpen = vendingWin && vendingWin.style.display !== 'none';
    const isCurrentlyVending = (typeof hero !== 'undefined' && hero.is_vending) || isWindowOpen;

    if (isCurrentlyVending && !isRestoringVending) {
        const confirmBtn = document.getElementById('vending-confirm-btn');
        if (confirmBtn) {
            confirmBtn.innerText = "🔄 露店情報を更新する";
            confirmBtn.setAttribute("onclick", "startVending()");
            confirmBtn.style.setProperty('background', 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', 'important');
            confirmBtn.style.setProperty('border-color', '#0284c7', 'important');
        }
    }
}

// 🌟 相手がトレード受諾したことを受け取る（招待した側のブラウザ）
socket.on('tradeRequestAccepted', (opponentData) => {
    console.log("相手がトレード受諾しました！", opponentData);

    // 🌟 【超重要】トレード相手のSocket IDをどこかに保存しておく！
    // 例として window._currentTradePartnerId に保存するようにします
    if (opponentData && opponentData.senderId) {
        window._currentTradePartnerId = opponentData.senderId;
        console.log("🤝 トレード相手のIDを保持しました:", window._currentTradePartnerId);
    }

    // 1. トレード窓を開く
    const tradeWindow = document.getElementById("trade-window");
    if (tradeWindow) {
        tradeWindow.style.display = "block";
    }

    // 2. 左側のエリアに相手の名前とアバターを描画する
    if (opponentData && typeof setupOpponentTrade === 'function') {
        setupOpponentTrade(opponentData);
    }

    if (typeof addSystemMessage === 'function') {
        addSystemMessage("相手が交換を受け入れました。");
    }

    // 🌟 3x3スロットを初期化・表示する！
    if (typeof initTradeSlots === 'function') {
        initTradeSlots();
        console.log("✅ 3x3トレードスロットを初期化しました");
    }
});

// トレード画面を開いたときの初期化・名前セット処理
function openTradeWindow20260925(opponentName) {
    const tradeWindow = document.getElementById("trade-window");
    if (tradeWindow) {
        tradeWindow.style.display = 'block';
    }

    // 🌟 1. 左側（OPPONENT）：相手の名前（引数や選択されたプレイヤー名）をセット
    const targetNameEl = document.getElementById('trade-target-name');
    if (targetNameEl) {
        // 相手の名前が渡されていなければ、従来通りターゲット名やフォールバックを使う
        const opName = opponentName || (window._selectedProfilePlayer ? window._selectedProfilePlayer.name : "RUKIA");
        targetNameEl.textContent = opName; // ← ここには絶対にご自身の名前を入れないようにします
    }

    // 🌟 2. 右側（YOU）：自分の名前（SSDD など）をセット
    const myNameEl = document.getElementById('trade-my-name');
    if (myNameEl) {
        const myName = (typeof hero !== 'undefined' && hero && hero.name) ? hero.name : "自分";
        myNameEl.textContent = myName; // ← ここにだけご自身の名前（SSDD）が入ります
    }

    // 3. スロット生成
    if (typeof initTradeSlots === 'function') initTradeSlots();

    // 4. アバター描画
    if (typeof drawMyTradeAvatar === 'function') drawMyTradeAvatar();
	
	initTradeChatEvents()
}

// 確実に「自分＝右」「相手＝左」に名前を割り振る関数
function setTradeNames(myActualName, opponentActualName) {
    // 右側（YOU）：自分の名前をセット
    const myNameEl = document.getElementById('trade-my-name');
    if (myNameEl) {
        myNameEl.textContent = myActualName || "自分";
    }

    // 左側（OPPONENT）：相手の名前をセット
    const targetNameEl = document.getElementById('trade-target-name');
    if (targetNameEl) {
        targetNameEl.textContent = opponentActualName || "RUKIA";
    }
}

// ============================================================
// :::TRADE_SYSTEM::: 🤝 スロット生成用関数（キャッシュ背景対応版・カーソル修正）
// ============================================================
function initTradeSlots() {

	// 🌟 【ここを追加】トレード画面を開いた瞬間、自分のトレードスロットデータを必ず空にリセットする
    if (typeof myTradeSlots !== 'undefined') {
        myTradeSlots = new Array(9).fill(null);
    }
	
    const opponentGrid = document.getElementById('opponent-slot-grid');
    if (opponentGrid) {
        opponentGrid.innerHTML = '';
        for (let i = 0; i < 9; i++) {
            const slot = document.createElement('div');
            slot.style.width = '48px';
            slot.style.height = '48px';
            slot.style.boxSizing = 'border-box';
            slot.style.position = 'relative';
            slot.style.cursor = 'default'; // 🌟 初期状態はデフォルト（矢印）

            // 最初から高級感のあるキャッシュ背景を適用
            if (typeof getCachedBagSlotImage === 'function') {
                const slotBgCanvas = getCachedBagSlotImage(40, null, false, true);
                slot.style.backgroundImage = `url(${slotBgCanvas.toDataURL()})`;
                slot.style.backgroundSize = 'cover';
            } else {
                // フォールバック（万が一キャッシュ関数がない場合）
                slot.style.background = '#fff';
                slot.style.border = '1px solid #7f7f7f';
                slot.style.borderRadius = '2px';
            }

            opponentGrid.appendChild(slot);
        }
    }

    const myGrid = document.getElementById('my-slot-grid');
    if (myGrid) {
        myGrid.innerHTML = '';
        for (let i = 0; i < 9; i++) {
            const slot = document.createElement('div');
            slot.style.width = '48px';
            slot.style.height = '48px';
            slot.style.boxSizing = 'border-box';
            slot.style.position = 'relative';
            slot.style.cursor = 'default'; // 🌟 初期状態はデフォルト（矢印）

            // 最初から高級感のあるキャッシュ背景を適用
            if (typeof getCachedBagSlotImage === 'function') {
                const slotBgCanvas = getCachedBagSlotImage(40, null, false, true);
                slot.style.backgroundImage = `url(${slotBgCanvas.toDataURL()})`;
                slot.style.backgroundSize = 'cover';
            } else {
                slot.style.background = '#fff';
                slot.style.border = '1px solid #7f7f7f';
                slot.style.borderRadius = '2px';
            }

            myGrid.appendChild(slot);
        }
    }
}

// キャラクター描画用（高解像度化・余白自動カット・左向き反転）
function drawMyTradeAvatar() {
    const canvas = document.getElementById('trade-my-avatar-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    if (typeof hero === 'undefined' || !hero) return;

    // model_id とバリエーションの決定
    const g = typeof selectedGroup !== 'undefined' ? selectedGroup : (hero.model_id || hero.group || 0);
    const v = typeof selectedCharVar !== 'undefined' ? selectedCharVar : (hero.charVar || 1);

    // キャラクター画像を取得
    const currentImg = getPlayerCurrentImg(hero, g, v, typeof frame !== 'undefined' ? frame : 0, sprites, playerSprites, true);

    if (currentImg && currentImg.complete) {
        // 🌟 1. 高解像度ディスプレイ（Retina等）に対応するための倍率設定
        const dpr = window.devicePixelRatio || 1;
        const displayWidth = 64;
        const displayHeight = 64;

        // Canvas自体の内部解像度を物理ピクセルに合わせて倍増させる
        if (canvas.width !== displayWidth * dpr || canvas.height !== displayHeight * dpr) {
            canvas.width = displayWidth * dpr;
            canvas.height = displayHeight * dpr;
            canvas.style.width = displayWidth + 'px';
            canvas.style.height = displayHeight + 'px';
        }

        ctx.save();
        
        // 描画がボヤけないようにドット絵・高解像度向けの補正を設定
        ctx.imageSmoothingEnabled = false; // ドット絵のシャープさを保つ場合（滑らかにしたい場合は true）

        // 座標系をDPR倍にスケーリング
        ctx.scale(dpr, dpr);

        ctx.clearRect(0, 0, displayWidth, displayHeight);

        // 🌟 2. 一時キャンバスで余白自動カット
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = currentImg.width;
        tempCanvas.height = currentImg.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(currentImg, 0, 0);

        const imgData = tempCtx.getImageData(0, 0, currentImg.width, currentImg.height);
        const data = imgData.data;

        let minX = currentImg.width, minY = currentImg.height, maxX = 0, maxY = 0;
        let found = false;

        for (let y = 0; y < currentImg.height; y++) {
            for (let x = 0; x < currentImg.width; x++) {
                const alpha = data[(y * currentImg.width + x) * 4 + 3];
                if (alpha > 10) {
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                    found = true;
                }
            }
        }

        if (!found) {
            minX = 0; minY = 0; maxX = currentImg.width; maxY = currentImg.height;
        }

        const sourceX = minX;
        const sourceY = minY;
        const sourceWidth = maxX - minX + 1;
        const sourceHeight = maxY - minY + 1;

        // 🌟 3. サイズフィット計算
        const targetHeight = 48; 
        const scale = targetHeight / sourceHeight;
        
        const dw = sourceWidth * scale;
        const dh = sourceHeight * scale;
        
        const dx = (displayWidth - dw) / 2;
        const dy = (displayHeight - dh) / 2;

        // 🌟 4. 左向き反転 ＆ 描画
        ctx.translate(displayWidth, 0);
        ctx.scale(-1, 1);

        ctx.drawImage(
            currentImg, 
            sourceX, sourceY, sourceWidth, sourceHeight, 
            dx, dy, dw, dh
        );
        
        ctx.restore();
    }
}

// ============================================================
// 🏪 露店入店中エリアへの自キャラ描画関数
// ============================================================
function drawOtherVendingMyAvatar() {
    const canvas = document.getElementById('other-vending-my-avatar-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    if (typeof hero === 'undefined' || !hero) return;

    // モデルIDとバリエーションの決定
    const g = typeof selectedGroup !== 'undefined' ? selectedGroup : (hero.model_id || hero.group || 0);
    const v = typeof selectedCharVar !== 'undefined' ? selectedCharVar : (hero.charVar || 1);

    // キャラクター画像を取得
    const currentImg = getPlayerCurrentImg(hero, g, v, typeof frame !== 'undefined' ? frame : 0, sprites, playerSprites, true);

    if (currentImg && currentImg.complete) {
        const dpr = window.devicePixelRatio || 1;
        const displayWidth = 64;
        const displayHeight = 64;

        if (canvas.width !== displayWidth * dpr || canvas.height !== displayHeight * dpr) {
            canvas.width = displayWidth * dpr;
            canvas.height = displayHeight * dpr;
            canvas.style.width = '36px';
            canvas.style.height = '36px';
        }

        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, displayWidth, displayHeight);

        // 一時キャンバスで余白自動カット
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = currentImg.width;
        tempCanvas.height = currentImg.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(currentImg, 0, 0);

        const imgData = tempCtx.getImageData(0, 0, currentImg.width, currentImg.height);
        const data = imgData.data;

        let minX = currentImg.width, minY = currentImg.height, maxX = 0, maxY = 0;
        let found = false;

        for (let y = 0; y < currentImg.height; y++) {
            for (let x = 0; x < currentImg.width; x++) {
                const alpha = data[(y * currentImg.width + x) * 4 + 3];
                if (alpha > 10) {
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                    found = true;
                }
            }
        }

        if (!found) {
            minX = 0; minY = 0; maxX = currentImg.width; maxY = currentImg.height;
        }

        const sourceX = minX;
        const sourceY = minY;
        const sourceWidth = maxX - minX + 1;
        const sourceHeight = maxY - minY + 1;

        const targetHeight = 32; // スロット枠に収まるよう調整
        const scale = targetHeight / sourceHeight;
        
        const dw = sourceWidth * scale;
        const dh = sourceHeight * scale;
        
        const dx = (displayWidth - dw) / 2;
        const dy = (displayHeight - dh) / 2;

        // 左向き反転 ＆ 描画
        ctx.translate(displayWidth, 0);
        ctx.scale(-1, 1);

        ctx.drawImage(
            currentImg, 
            sourceX, sourceY, sourceWidth, sourceHeight, 
            dx, dy, dw, dh
        );
        
        ctx.restore();
    }
}

// 📥 相手が金額を更新したときに関数を受け取る
socket.on('syncOpponentCurrency', (data) => {
    console.log("相手が金額を更新しました:", data.currency);
    
    // 相手のトレード金額変数に格納
    opponentTradeCurrency = data.currency;
    
    // 画面の表示を更新
    updateTradeCurrencyDisplay();
});

// ============================================================
// :::VENDING_CHAT::: 🛒 露店閲覧ウィンドウ用チャット処理
// ============================================================

// メッセージ送信を実行する関数
function sendVendingChat() {
    const inputEl = document.getElementById('vending-chat-input');
    if (!inputEl) return;
    
    const message = inputEl.value.trim();
    if (!message) return;

    // 🌟 現在開いている露店のオーナーIDを取得（window._currentVendingOwnerId や 保持しているID変数に合わせてください）
    const targetOwnerId = window._currentVendingOwnerId || window.currentVisitingOwnerId || null;

    // 1. サーバーへ露店用チャットメッセージを送信する
    if (typeof socket !== 'undefined' && socket) {
        socket.emit('vendingChatMessage', {
            text: message,
            ownerId: targetOwnerId
        });
    }

    // 2. 自分のチャット欄に即時表示（自分の名前は hero.name などを使用）
    const myName = (typeof hero !== 'undefined' && hero.name) ? hero.name : "自分";
    appendVendingChatMessage(myName, message, "#2563eb"); // 自分は青っぽい色

    // 入力欄を空にする
    inputEl.value = "";
}

// チャットログボックスにメッセージを追加する関数
function appendVendingChatMessage(senderName, message, textColor = "#334155") {
    const chatLog = document.getElementById('vending-chat-log');
    if (!chatLog) return;

    // 初期状態の「ようこそ！」等の案内文が残っていればクリアまたは維持する挙動
    // 初回メッセージ追加時にプレースホルダー要素を消す処理
    if (chatLog.dataset.hasMessage !== "true") {
        chatLog.innerHTML = "";
        chatLog.dataset.hasMessage = "true";
    }

    const msgDiv = document.createElement('div');
    msgDiv.style.marginBottom = "3px";
    msgDiv.style.wordBreak = "break-all";
    
    // HTMLエスケープ処理（セキュリティ対策）
    const safeMessage = message.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    
    msgDiv.innerHTML = `<span style="font-weight: bold; color: ${textColor};">[${senderName}]:</span> ${safeMessage}`;
    
    chatLog.appendChild(msgDiv);
    
    // 自動で一番下までスクロール
    chatLog.scrollTop = chatLog.scrollHeight;
}

// 📥 サーバーからの露店チャットを受信する処理
if (typeof socket !== 'undefined' && socket) {
    // 既存のリスナー重複登録を防ぐための一時フラグ
    if (!window._vendingChatSocketInitialized) {
        window._vendingChatSocketInitialized = true;
        
        socket.on('syncVendingChatMessage', (data) => {
            // 相手からのメッセージをチャット欄に追加（相手は赤っぽい色にする例）
            appendVendingChatMessage(data.senderName, data.text, "#dc2626");
        });
    }
}

// イベントリスナーの設定（露店ウィンドウを開く関数の中で呼び出します）
function initVendingChatEvents() {
    const inputEl = document.getElementById('vending-chat-input');
    const sendBtn = document.getElementById('vending-chat-send');

    if (inputEl && !inputEl.dataset.initialized) {
        inputEl.dataset.initialized = "true";
        
        // ENTERキーを押したときに送信
        inputEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                sendVendingChat();
            }
        });
    }

    if (sendBtn && !sendBtn.dataset.initialized) {
        sendBtn.dataset.initialized = "true";
        
        // 送信ボタンをクリックしたときに送信
        sendBtn.addEventListener('click', (e) => {
            e.preventDefault();
            sendVendingChat();
        });
    }
}

// ============================================================
// :::TRADE_CHAT::: トレード用チャット処理
// ============================================================

// メッセージ送信を実行する関数
function sendTradeChat() {
    const inputEl = document.getElementById('trade-chat-input');
    if (!inputEl) return;
    
    const message = inputEl.value.trim();
    if (!message) return;

    // 🌟 1. サーバーへチャットメッセージを送信する
    if (typeof socket !== 'undefined') {
        socket.emit('tradeChatMessage', {
            text: message,
            targetId: window._currentTradePartnerId || null // 相手のIDを添える
        });
    }

    // 2. 自分のチャット欄に即時表示
    // ※名前や色はご自身の環境の変数（例: myName や固定の文字）に合わせて調整してください
    appendTradeChatMessage("自分", message, "#3b82f6");

    // 入力欄を空にする
    inputEl.value = "";
}

// チャットボックスにメッセージを追加する関数
function appendTradeChatMessage(senderName, message, textColor = "#000") {
    const chatBox = document.getElementById('trade-chat-box');
    if (!chatBox) return;

    const msgDiv = document.createElement('div');
    msgDiv.style.marginBottom = "3px";
    msgDiv.style.wordBreak = "break-all";
    
    // HTMLエスケープ処理
    const safeMessage = message.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    
    msgDiv.innerHTML = `<span style="font-weight: bold; color: ${textColor};">[${senderName}]:</span> ${safeMessage}`;
    
    chatBox.appendChild(msgDiv);
    
    // 自動で一番下までスクロール
    chatBox.scrollTop = chatBox.scrollHeight;
}

// 3. HTMLエスケープ用（セキュリティ対策）
function escapeHtml(str) {
    return str.replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              //.replace(/"/g, '&quot;')
              .replace('/&#39;/g', '&#039;');
}

// 📥 相手からのトレードチャットを受信する処理
if (typeof socket !== 'undefined') {
    socket.on('syncTradeChatMessage', (data) => {
        // 相手からのメッセージをチャット欄に追加（色や名前は任意で変更可能）
        appendTradeChatMessage(data.senderName, data.text, "#ef4444"); // 相手は赤っぽい色にする例
    });
}

// 4. イベントリスナーの設定（ウィンドウを開いた時などに一度だけ呼び出す）
function initTradeChatEvents() {
    const inputEl = document.getElementById('trade-chat-input');
    const enterBtn = inputEl ? inputEl.nextElementSibling : null; // ENTERボタン

    if (inputEl && !inputEl.dataset.initialized) {
        inputEl.dataset.initialized = "true";
        
        // ENTERキーを押したときに送信
        inputEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                sendTradeChat();
            }
        });
    }

    if (enterBtn && !enterBtn.dataset.initialized) {
        enterBtn.dataset.initialized = "true";
        
        // ENTERボタンをクリックしたときに送信
        enterBtn.addEventListener('click', (e) => {
            e.preventDefault();
            sendTradeChat();
        });
    }
}

// 💡 交換ボタン（準備完了）が押されたときの処理
function onTradeLockButtonClicked() {
    const nameEl = document.getElementById('trade-target-name');
    // 念のため、未入室ならここで弾く
    if (!nameEl || nameEl.textContent.trim() === '（待機中...）') {
        return;
    }

    const myOverlay = document.getElementById('my-trade-overlay');
    if (!myOverlay) return;

    // すでにロックされている場合は何もしない
    if (myOverlay.style.display === 'block') {
        return;
    }

    myOverlay.style.display = 'block';
    console.log("🔒 自分のトレードをロックしました（解除不可）");

    if (typeof socket !== 'undefined') {
        socket.emit('updateTradeLock', {
            isLocked: true,
            targetId: window._currentTradePartnerId || null
        });
    }
}

/**
 * 🌟 相手の入室状態に合わせて「交換」ボタンの活性/非活性を切り替える関数
 */
function updateTradeButtonState() {
    const nameEl = document.getElementById('trade-target-name');
    const lockBtn = document.getElementById('trade-lock-btn');
    if (!nameEl || !lockBtn) return;

    // 名前が「（待機中...）」または空文字の場合は未入室と判定
    const isWaiting = (nameEl.textContent.trim() === '（待機中...）' || nameEl.textContent.trim() === '');

    if (isWaiting) {
        // 未入室：ボタンを押せないようにする（グレーアウト）
        lockBtn.disabled = true;
        lockBtn.style.opacity = "0.5";
        lockBtn.style.cursor = "not-allowed";
        lockBtn.style.filter = "grayscale(100%)";
    } else {
        // 入室済み：ボタンを押せるようにする
        lockBtn.disabled = false;
        lockBtn.style.opacity = "1";
        lockBtn.style.cursor = "pointer";
        lockBtn.style.filter = "none";
    }
}

// 📥 相手がロックしたときの受信処理（初期化時やスクリプト読み込み時に設定）
if (typeof socket !== 'undefined') {
    socket.on('syncOpponentLock', (data) => {
        const oppOverlay = document.getElementById('opponent-trade-overlay');
        if (!oppOverlay) return;

        if (data.isLocked) {
            oppOverlay.style.display = 'block'; // 相手のエリアを薄い白にする
            console.log("相手がトレードをロックしました");
        } else {
            oppOverlay.style.display = 'none'; // 解除された場合
            console.log("相手がトレードのロックを解除しました");
        }
    });
}

// 🌟 双方のロックが完了した合図を受け取る
socket.on('tradeBothLocked', () => {
    console.log("🎉 双方のロックが完了しました！トレードを確定します。");
    
    // ここにトレード完了時の処理（アイテムの受け渡し確定、ウィンドウを閉じるなど）を書く
});

// ============================================================
// 🌟 トレード完了時の受信処理
// ============================================================
if (typeof socket !== 'undefined') {
    socket.on('tradeCompleted', (data) => {
        // メッセージを取得
        const message = data && data.message ? data.message : "トレードが正常に完了しました！";

        if (typeof showTradeAlert === 'function') {
            showTradeAlert(message);
        } else if (typeof addSystemMessage === 'function') {
            addSystemMessage(message);
        } else {
            alert(message);
        }

        // 🌟 【決定的な修正】自分がトレードに出していたスロット位置を空け、そこに相手からのアイテムを確実に反映する
        if (hero && hero.inventory) {
            // 1. まず、自分が今回トレードに出したアイテムの元スロット（slot_index）を自分のインベントリから消去（nullに）する
            if (typeof myTradeSlots !== 'undefined' && Array.isArray(myTradeSlots)) {
                myTradeSlots.forEach(slot => {
                    if (slot && typeof slot.slot_index === 'number') {
                        hero.inventory[slot.slot_index] = null; // 出した場所を確実に空にする
                    }
                });
            }

            // 2. サーバーから送られてきた最新インベントリ、あるいは相手からの受け取りアイテムを反映
            const newInventory = data.inventory || data.updatedInventory || data.heroInventory;
            if (newInventory && Array.isArray(newInventory)) {
                // サーバーからのデータをベースにしつつ、もし位置がズレている場合は先頭の空きへ綺麗に詰める
                const validItems = newInventory.filter(item => item !== null && item !== undefined);
                const maxSlots = hero.inventory.length || 50;
                
                const cleanedInventory = new Array(maxSlots).fill(null);
                for (let i = 0; i < validItems.length; i++) {
                    cleanedInventory[i] = validItems[i];
                }
                hero.inventory = cleanedInventory;
            }
        }

        // 💡 インベントリやバッグの描画を強制更新
        if (typeof drawBagGrid === 'function') {
            drawBagGrid();
        }

        // トレードウィンドウを閉じる
        const tradeWindow = document.getElementById("trade-window");
        if (tradeWindow) {
            tradeWindow.style.display = "none";
        }

        // 完全リセット関数を呼び出す
        if (typeof resetTradeStateToDefault === 'function') {
            resetTradeStateToDefault();
        }
    });
}

// 🛑 トレードキャンセル・失敗専用の受信処理
if (typeof socket !== 'undefined') {
    socket.on('tradeCancelledBySystem', (data) => {
        const message = data && data.message ? data.message : "トレードがキャンセルされました。";

        // ダイアログでメッセージを表示
        if (typeof showTradeAlert === 'function') {
            showTradeAlert(message);
        } else if (typeof addSystemMessage === 'function') {
            addSystemMessage(message);
        } else {
            alert(message);
        }

        // トレードウィンドウを閉じる
        const tradeWindow = document.getElementById("trade-window");
        if (tradeWindow) {
            tradeWindow.style.display = "none";
        }

        // トレード状態のリセット
        if (typeof resetTradeStateToDefault === 'function') {
            resetTradeStateToDefault();
        }
        
        console.log("[Client] 🚫 トレードがシステムによってキャンセルされました:", message);
    });
}

// 🔄 トレード終了時（完了・キャンセル共通で使える）の完全リセット関数
function resetTradeStateToDefault() {
    // 1. 相手のIDやセッション情報を完全にクリア
    window._currentTradeTargetId = null;
    window._currentTradePartnerId = null;

    // 2. 相手の名前表示を「待機中...」に戻す
    const targetNameEl = document.getElementById('trade-target-name');
    if (targetNameEl) {
        targetNameEl.innerText = "（待機中...）";
    }

    // 3. 相手のキャラクターアバター（Canvas）をクリア
    const oppAvatarCanvas = document.getElementById('trade-opponent-avatar-canvas');
    if (oppAvatarCanvas) {
        const ctx = oppAvatarCanvas.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, oppAvatarCanvas.width, oppAvatarCanvas.height);
    }

    // 4. 通貨（ゴールド）の数値をリセット
    myTradeCurrency = 0;
    opponentTradeCurrency = 0;
    if (typeof updateTradeCurrencyDisplay === 'function') {
        updateTradeCurrencyDisplay();
    }

    // 5. トレードスロット（お互いの出し物）を空っぽにリセット
    if (typeof resetTradeSlots === 'function') {
        resetTradeSlots();
    } else {
        myTradeSlots = [null, null, null, null, null, null, null, null, null];
        opponentTradeSlots = [null, null, null, null, null, null, null, null, null];
        if (typeof updateMyTradeDisplay === 'function') updateMyTradeDisplay();
        if (typeof updateOpponentTradeDisplay === 'function') updateOpponentTradeDisplay();
    }

    // 6. オーバーレイ（準備完了チェックなどの半透明カバー）も非表示にする
    const myOverlay = document.getElementById('my-trade-overlay');
    const opponentOverlay = document.getElementById('opponent-trade-overlay');
    if (myOverlay) myOverlay.style.display = 'none';
    if (opponentOverlay) opponentOverlay.style.display = 'none';

    // 7. 「準備完了」ボタンなどの状態も有効化（または初期色）に戻す
    const readyBtn = document.getElementById('trade-ready-btn');
    if (readyBtn) {
        readyBtn.disabled = false;
        readyBtn.innerText = "準備完了";
        readyBtn.style.background = ""; // 元の色に戻す
    }
}

socket.on('closeTradeWindow', () => {
    // 例: トレード画面のDOM要素を非表示にする、状態をリセットするなど
    const tradeWindow = document.getElementById('trade-window');
    if (tradeWindow) tradeWindow.style.display = 'none';

    // 自分が入れていた出品スロットや金額の保持データも初期化しておく
    myTradeSlots = [];
    myInputGold = 0;
});

// 🌟 相手がトレードを閉じた（キャンセルした）ときの受信処理
if (typeof socket !== 'undefined') {
    socket.on('tradeCancelledByPartner', (data) => {
        const tradeWindow = document.getElementById("trade-window");
        const isTradeVisible = tradeWindow && tradeWindow.style.display !== "none";

        if (isTradeVisible) {
            if (tradeWindow) {
                tradeWindow.style.display = "none";
            }

            const myOverlay = document.getElementById('my-trade-overlay');
            const opponentOverlay = document.getElementById('opponent-trade-overlay');
            if (myOverlay) myOverlay.style.display = 'none';
            if (opponentOverlay) opponentOverlay.style.display = 'none';

            // 💡 ここを修正！標準の alert() ではなく、専用のモーダル関数を呼び出す
            const alertMsg = data.message || "相手がトレードをキャンセルしました。";
            if (typeof showTradeAlert === 'function') {
                showTradeAlert(alertMsg);
            } else if (typeof addSystemMessage === 'function') {
                addSystemMessage(alertMsg);
            } else {
                alert(alertMsg); // 最終フォールバック
            }

            // --- 以降のステータスリセット処理はそのまま ---
            const targetNameEl = document.getElementById('trade-target-name');
            if (targetNameEl) targetNameEl.innerText = "（待機中...）";

            const oppAvatarCanvas = document.getElementById('trade-opponent-avatar-canvas');
            if (oppAvatarCanvas) {
                const ctx = oppAvatarCanvas.getContext('2d');
                if (ctx) ctx.clearRect(0, 0, oppAvatarCanvas.width, oppAvatarCanvas.height);
            }

            window._currentTradeTargetId = null;
            window._currentTradePartnerId = null;

            myTradeCurrency = 0;
            opponentTradeCurrency = 0;
            if (typeof updateTradeCurrencyDisplay === 'function') {
                updateTradeCurrencyDisplay();
            }

            if (typeof resetTradeSlots === 'function') {
                resetTradeSlots();
            } else {
                myTradeSlots = [null, null, null, null, null, null, null, null, null];
                opponentTradeSlots = [null, null, null, null, null, null, null, null, null];
                updateMyTradeDisplay();
                updateOpponentTradeDisplay();
            }
        }
    });
}

// トレードウィンドウを開く処理の中に `initTradeChatEvents();` を組み込んでおくと確実です。

// 実際の描画処理をまとめたヘルパー関数
function renderImageToCanvas(canvas, ctx, currentImg) {
    const dpr = window.devicePixelRatio || 1;
    const displayWidth = 64;
    const displayHeight = 64;

    if (canvas.width !== displayWidth * dpr || canvas.height !== displayHeight * dpr) {
        canvas.width = displayWidth * dpr;
        canvas.height = displayHeight * dpr;
        canvas.style.width = displayWidth + 'px';
        canvas.style.height = displayHeight + 'px';
    }

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, displayWidth, displayHeight);

    // 余白自動カットの計算
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = currentImg.width;
    tempCanvas.height = currentImg.height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(currentImg, 0, 0);

    const imgData = tempCtx.getImageData(0, 0, currentImg.width, currentImg.height);
    const data = imgData.data;

    let minX = currentImg.width, minY = currentImg.height, maxX = 0, maxY = 0;
    let found = false;

    for (let y = 0; y < currentImg.height; y++) {
        for (let x = 0; x < currentImg.width; x++) {
            const alpha = data[(y * currentImg.width + x) * 4 + 3];
            if (alpha > 10) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
                found = true;
            }
        }
    }

    if (!found) {
        minX = 0; minY = 0; maxX = currentImg.width; maxY = currentImg.height;
    }

    const sourceX = minX;
    const sourceY = minY;
    const sourceWidth = maxX - minX + 1;
    const sourceHeight = maxY - minY + 1;

    const targetHeight = 48; 
    const scale = targetHeight / sourceHeight;
    const dw = sourceWidth * scale;
    const dh = sourceHeight * scale;
    const dx = (displayWidth - dw) / 2;
    const dy = (displayHeight - dh) / 2;

    ctx.drawImage(
        currentImg, 
        sourceX, sourceY, sourceWidth, sourceHeight, 
        dx, dy, dw, dh
    );
    
    ctx.restore();
}

// 🌟 相手がトレードに入室・承諾したときに呼び出す関数
function setupOpponentTrade(opponentData) {
    if (!opponentData) return;

    // 1. 相手の名前をセット（senderName を優先、なければ name を使うフォールバックに）
    const targetNameEl = document.getElementById("trade-target-name");
    if (targetNameEl) {
        targetNameEl.textContent = opponentData.senderName || opponentData.name || "相手";
    }

    // 2. 相手のアバターを描画する
    if (typeof drawOpponentTradeAvatar === 'function') {
        drawOpponentTradeAvatar(opponentData);
    }
}

// 相手のアバター描画用関数（右向き・高解像度・自動余白カット対応）
function drawOpponentTradeAvatar(opponentData) {
    console.log("🎨 [drawOpponentTradeAvatar] 実行開始:", opponentData);
    console.log("🔍 【受け取った相手の全データ】:", JSON.stringify(opponentData, null, 2));
	
    const canvas = document.getElementById('trade-opponent-avatar-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    if (!opponentData) return;

    // 相手のモデルIDとバリエーションを取得（なければデフォルト）
    const g = (opponentData.model_id !== undefined && opponentData.model_id !== null) ? opponentData.model_id : 0;
    const v = opponentData.charVar || 1;

    // フォルダ名やファイル名用に2桁の文字列に変換
    const groupNum = String(g).padStart(2, '0');
    const varNum = String(v).padStart(2, '0');
    const action = "Idle"; // 基本の立ちポーズ
    const frameNum = "00"; // 最初のフレーム

    const displayWidth = 64;
    const displayHeight = 64;
    const dpr = window.devicePixelRatio || 1;

    // Canvas自体の内部解像度を物理ピクセルに合わせて倍増させる
    if (canvas.width !== displayWidth * dpr || canvas.height !== displayHeight * dpr) {
        canvas.width = displayWidth * dpr;
        canvas.height = displayHeight * dpr;
        canvas.style.width = displayWidth + 'px';
        canvas.style.height = displayHeight + 'px';
    }

    // 1. その場で新しい画像オブジェクトを作成してパスを指定！
    const img = new Image();
    img.src = `${IMAGE_DOMAIN}char_assets/${groupNum}/${varNum}/${action}/Characters-Character${varNum}-${action}_${frameNum}.png`;

    // 描画を実行する内部関数（自動余白カット処理を含む）
    const renderImage = (targetImg) => {
        ctx.save();
        ctx.imageSmoothingEnabled = false; // ドット絵のシャープさを保つ
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, displayWidth, displayHeight);

        // 🌟 一時キャンバスで余白自動カット（ご提示いただいた自分のアバターと同じロジック）
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = targetImg.width;
        tempCanvas.height = targetImg.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(targetImg, 0, 0);

        const imgData = tempCtx.getImageData(0, 0, targetImg.width, targetImg.height);
        const data = imgData.data;

        let minX = targetImg.width, minY = targetImg.height, maxX = 0, maxY = 0;
        let found = false;

        for (let y = 0; y < targetImg.height; y++) {
            for (let x = 0; x < targetImg.width; x++) {
                const alpha = data[(y * targetImg.width + x) * 4 + 3];
                if (alpha > 10) {
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                    found = true;
                }
            }
        }

        if (!found) {
            minX = 0; minY = 0; maxX = targetImg.width; maxY = targetImg.height;
        }

        const sourceX = minX;
        const sourceY = minY;
        const sourceWidth = maxX - minX + 1;
        const sourceHeight = maxY - minY + 1;

        // 🌟 サイズフィット計算
        const targetHeight = 48; 
        const scale = targetHeight / sourceHeight;
        
        const dw = sourceWidth * scale;
        const dh = sourceHeight * scale;
        
        const dx = (displayWidth - dw) / 2;
        const dy = (displayHeight - dh) / 2;

        // 🌟 描画（相手なので反転はせずそのまま右向きで描画）
        ctx.drawImage(
            targetImg, 
            sourceX, sourceY, sourceWidth, sourceHeight, 
            dx, dy, dw, dh
        );
        
        ctx.restore();
        console.log(`✨ 相手のアバター画像を余白カット＆自動フィットして描画しました (Group:${groupNum}, Var:${varNum})`);
    };

    // 2. ロード完了したら描画、まだなら読み込みを待つ
    if (img.complete && img.naturalWidth !== 0) {
        renderImage(img);
    } else {
        // ロード中はひとまずプレースホルダーを表示しつつ、完了したら描き直す
        ctx.save();
        ctx.fillStyle = "#333333";
        ctx.fillRect(8, 8, 48, 48);
        ctx.fillStyle = "#ffffff";
        ctx.font = "10px sans-serif";
        ctx.fillText(`Loading`, 14, 38);
        ctx.restore();

        img.onload = () => {
            renderImage(img);
        };
        img.onerror = () => {
            console.error(`❌ アバター画像の直接ロードに失敗しました: ${img.src}`);
        };
    }
}

// ============================================================
// 🎒 インベントリ整理：クライアント側（楽観的UI & ガード）
// ============================================================
let isOrganizingGuard = false; // サーバーからの誤上書きを防ぐガードフラグ

// 1. 整理ボタンが押されたときのメイン処理
function organizeBagInventory() {
    // ターゲットとなるインベントリ配列を取得（プロジェクトの仕様に合わせて調整）
    let targetInventory = window.hero?.inventory || inventoryVisualBuffer;
    if (!targetInventory || !Array.isArray(targetInventory)) return;

    // 🌟 ガードをON（サーバーからの古いデータ上書きをブロック）
    isOrganizingGuard = true;

    // 🌟 【即時実行】サーバーを待たず、今この瞬間にローカルで綺麗に並び替える
    const validItems = targetInventory.filter(item => item && item.type);
    const maxSlots = targetInventory.length;

    for (let i = 0; i < maxSlots; i++) {
        if (i < validItems.length) {
            targetInventory[i] = validItems[i];
            targetInventory[i].slot_index = i; // インデックスも綺麗に更新
        } else {
            targetInventory[i] = null;
        }
    }

    // 🌟 【即時描画】ラグなしで画面を更新
    if (typeof inventoryVisualBuffer !== 'undefined') {
        inventoryVisualBuffer = targetInventory;
    }
    if (typeof renderInventory === 'function') {
        renderInventory();
    } else if (typeof drawBagGrid === 'function') {
        drawBagGrid();
    }

    console.log("⚡ [Client] 画面側の整理を即座に完了しました！");

    // 🌟 【裏で通信】サーバーへ保存を依頼
    if (typeof socket !== 'undefined') {
        socket.emit('organizeInventory');
    }
}

// 2. サーバーからのデータ同期イベント（ガード対応版）
if (typeof socket !== 'undefined') {
    // 通常の同期イベント
    socket.on('inventory_update', (data) => {
        if (isOrganizingGuard) {
            console.log("🛡️ [Guard] 整理ガード中のため、通常同期データをスキップしました。");
            return;
        }
        applyInventoryUpdate(data);
    });

    // 🌟 サーバーでのDB保存完了合図を受け取ったとき
    socket.on('organizeComplete', (latestInventory) => {
        console.log("✨ [Client] サーバーでのDB保存が完了しました。最新データを同期してガードを解除します。");
        
        applyInventoryUpdate(latestInventory);

        // ガード解除
        isOrganizingGuard = false;
    });
}

// 共通のデータ適用・再描画ヘルパー関数
function applyInventoryUpdate(data) {
    const newInventory = Array.isArray(data) ? data : (data && data.inventory ? data.inventory : null);
    if (!newInventory) return;

    if (typeof inventoryVisualBuffer !== 'undefined') inventoryVisualBuffer = newInventory;
    if (window.hero) window.hero.inventory = newInventory;

    if (typeof renderInventory === 'function') {
        renderInventory();
    } else if (typeof drawBagGrid === 'function') {
        drawBagGrid();
    }
}

// 💡 整理ボタンとイベントを紐付ける
window.addEventListener('load', () => {
    const organizeBtn = document.getElementById('organize-inventory-btn');
    if (organizeBtn) {
        organizeBtn.onclick = () => {
            organizeBagInventory();
        };
        console.log("[Inventory] 整理ボタンのクリックイベントを設定しました。");
    }
});

let currentTargetBuyItem = null;

// ============================================================
// 1. ダイアログを開く処理（アイテムデータと数量の初期スナップショット）
// ============================================================
function openVendingBuyDialog(item, ownerId) {
    console.group("%c🔍 [DEBUG: openVendingBuyDialog]", "background: #7c3aed; color: white; padding: 2px 6px; font-weight: bold;");
    console.log("├─ 受け取った item:", item);
    console.log("└─ 受け取った ownerId:", ownerId);

    const itemDbId = item.dbId || item.db_id || item.originalIndex || item.slot_index || item.id;
    
    // まず最初に currentTargetBuyItem を確実にセットする
    currentTargetBuyItem = {
        ownerId: ownerId,
        dbId: itemDbId,
        price: Number(item.price || 0),
        itemData: item,
        item: item // 互換性のため両方保持
    };
    
    // あらゆるプロパティから最大個数を安全に抽出し、ログで光らせる
    const maxQty = Number(
        item.count ?? 
        item.quantity ?? 
        item.amount ?? 
        (item.data && (item.data.count || item.data.quantity)) ?? 
        1
    );

    console.log(`📌 [Parsed] DB_ID: ${itemDbId} | 単価: ${currentTargetBuyItem.price} | 抽出された最大所持数(maxQty): ${maxQty}`);
    console.groupEnd();
    
    // 数量が1個以下の場合はダイアログを出さずにそのまま購入処理へ進む
    if (maxQty <= 1) {
        console.log("%cℹ️ [DEBUG] 数量が1個以下（maxQty <= 1）のため、ダイアログをスキップして buyFromVending を呼びます。", "color: #0284c7; font-weight: bold;");
        if (typeof buyFromVending === 'function') {
            buyFromVending(ownerId, itemDbId, 1);
        } else {
            console.error("⚠️ [Error] 関数 buyFromVending が定義されていません。");
        }
        return;
    }

    const dialog = document.getElementById('vending-buy-dialog');
    const nameEl = document.getElementById('dialog-item-name');
    const qtyInput = document.getElementById('vending-buy-quantity');
    
    if (dialog && nameEl && qtyInput) {
        nameEl.innerText = item.name || item.displayName || "アイテム";
        qtyInput.value = 1;
        qtyInput.max = maxQty;
        
        console.log("✨ [DEBUG] 数量指定ダイアログを表示します (input.max =", maxQty, ")");
        
        // データがセットされた安全な状態で価格計算とダイアログ表示を行う
        updateTotalPrice();
        dialog.style.display = 'block';
    } else {
        console.error("❌ [DEBUG ERROR] ダイアログのHTML要素（vending-buy-dialog等）が見つかりません！");
    }
}

// ============================================================
// 2. 数量増減ボタン
// ============================================================
function adjustBuyCount(amount) {
    const qtyInput = document.getElementById('vending-buy-quantity');
    if (!qtyInput || !currentTargetBuyItem) return;
    
    const maxQty = Number(
        currentTargetBuyItem.item.count ?? 
        currentTargetBuyItem.item.quantity ?? 
        currentTargetBuyItem.item.amount ?? 
        1
    );
    let currentVal = parseInt(qtyInput.value) || 1;
    
    currentVal += amount;
    if (currentVal < 1) currentVal = 1;
    if (currentVal > maxQty) currentVal = maxQty;
    
    qtyInput.value = currentVal;
    updateTotalPrice();
}

// ============================================================
// 3. 合計金額のリアルタイム計算
// ============================================================
function updateTotalPrice() {
    const qtyInput = document.getElementById('vending-buy-quantity');
    const totalEl = document.getElementById('dialog-total-price');
    if (!qtyInput || !totalEl || !currentTargetBuyItem) return;

    const maxQty = Number(
        currentTargetBuyItem.item.count ?? 
        currentTargetBuyItem.item.quantity ?? 
        1
    );

    let qty = parseInt(qtyInput.value) || 1;

    // 🌟もし在庫の最大数を超えていたら、強制的に最大数に丸める
    if (qty > maxQty) {
        qty = maxQty;
        qtyInput.value = maxQty;
    }
    // 1未満なら1に丸める
    if (qty < 1) {
        qty = 1;
        qtyInput.value = 1;
    }

    const unitPrice = currentTargetBuyItem.price;
    const total = qty * unitPrice;

    totalEl.innerText = `${total.toLocaleString()} メル`;
}

// ============================================================
// 4. ダイアログを閉じる
// ============================================================
function closeVendingBuyDialog() {
    const dialog = document.getElementById('vending-buy-dialog');
    if (dialog) dialog.style.display = 'none';
    currentTargetBuyItem = null;
    console.log("🔒 [DEBUG] 購入ダイアログを閉じました。currentTargetBuyItem をクリアしました。");
}

// ============================================================
// 5. :::CONFIRM_VENDING_BUY::: 🛒 購入数量ダイアログの「購入する」ボタン押下時
// ============================================================
function confirmVendingBuy() {
    console.group("%c🚀 [DEBUG: confirmVendingBuy (ダイアログからの確定)]", "background: #d97706; color: white; padding: 2px 6px; font-weight: bold;");
    
    if (!currentTargetBuyItem) {
        console.error("❌ [DEBUG ERROR] confirmVendingBuy 時に currentTargetBuyItem が null です！");
        console.groupEnd();
        closeVendingBuyDialog();
        return;
    }

    const qtyInput = document.getElementById('vending-buy-quantity');
    const rawInputValue = qtyInput ? qtyInput.value : "inputなし";
    const quantity = parseInt(rawInputValue) || 1;

    console.log("├─ フォームの生の値 (raw input):", rawInputValue);
    console.log("├─ パース後の購入個数 (quantity):", quantity);
    console.log("├─ 保持していた currentTargetBuyItem:", currentTargetBuyItem);

    const { ownerId, dbId, price, item } = currentTargetBuyItem;
    const unitPrice = price;
    const totalPrice = unitPrice * quantity;

    console.log(`├─ 計算結果 -> 単価(${unitPrice}) × 個数(${quantity}) = 総額(${totalPrice})`);
    console.groupEnd();

    // 自分の店なら中断
    if (typeof socket !== 'undefined' && ownerId === socket.id) {
        console.warn("⚠️ [DEBUG] 自店舗購入のため中断しました。");
        alert("自分の店でアイテムを買うことはできません。");
        closeVendingBuyDialog();
        return;
    }

    // 二重の確認モーダルを経由せず、直接サーバーへ 'vending_buy_req' を送信する
    if (typeof socket !== 'undefined' && socket) {
        const payload = {
            ownerId: ownerId,
            dbId: dbId,
            quantity: quantity, // 👈 選択した個数を送信
            price: totalPrice,   // 👈 総額を送信
            item: item           // 👈 アイテムデータを添える
        };

        console.log("%c✉️ [DEBUG: サーバーへ送るペイロード]", "background: #059669; color: white; padding: 2px 6px; font-weight: bold;", payload);
        socket.emit('vending_buy_req', payload);
    } else {
        console.error("⚠️ [Error] socket が定義されていないため購入リクエストを送信できません。");
    }

    // ダイアログを閉じる
    closeVendingBuyDialog();
}

// ============================================================
// 6. :::BUY_FROM_VENDING::: 🛒 露店購入プロセスの実行と決済確認（数量対応・完全版）
// ============================================================
function buyFromVending(ownerId, dbId, quantity = 1) {
    console.group("%c🚀 [DEBUG: buyFromVending 直接実行 (1個またはフォールバック)]", "background: #dc2626; color: white; padding: 2px 6px; font-weight: bold;");
    console.log("├─ 受信OwnerID:", ownerId);
    console.log("├─ 受信dbId:", dbId);
    console.log("├─ 受信quantity:", quantity);
    console.log("└─ 現在のcurrentTargetBuyItem:", currentTargetBuyItem);
    console.groupEnd();

    // 自分の店なら中断
    if (ownerId === socket.id) {
        console.warn("⚠️ [VENDING_DEBUG] 自店舗購入のため中断しました。");
        alert("自分の店でアイテムを買うことはできません。");
        return;
    }

    // 新しく導入した currentTargetBuyItem から価格やデータを安全に取得
    const targetItemData = currentTargetBuyItem ? currentTargetBuyItem.itemData : null;
    const unitPrice = currentTargetBuyItem ? currentTargetBuyItem.price : 0;
    const totalPrice = unitPrice * quantity;

    // 数量選択ダイアログではなく、決済確認のオリジナルUIモーダルがある場合
    const modal = document.getElementById('vending-buy-confirm-modal');
    const confirmBtn = document.getElementById('buy-confirm-btn');
    const cancelBtn = document.getElementById('buy-cancel-btn');

    if (modal) {
        // モーダルを表示
        modal.style.display = 'block';
        console.log("├─ 決済確認モーダルを表示しました。");

        // ✅ 「購入する」ボタンが押された時
        confirmBtn.onclick = () => {
            console.log("├─ 決済確認モーダル結果: 承認 (OK)");
            
            const payload = {
                ownerId: ownerId,
                dbId: dbId,
                quantity: quantity,
                price: totalPrice,
                item: targetItemData
            };
            
            console.log("%c✉️ [DEBUG: モーダル経由でサーバーへ送るペイロード]", "background: #059669; color: white; padding: 2px 6px; font-weight: bold;", payload);
            socket.emit('vending_buy_req', payload);

            modal.style.display = 'none'; // モーダルを閉じる
        };

        // ❌ 「キャンセル」ボタンが押された時
        cancelBtn.onclick = () => {
            console.log("├─ 決済確認モーダル結果: キャンセル");
            modal.style.display = 'none'; // モーダルを閉じる
        };
    } else {
        // 万が一HTML要素が見つからない場合のフォールバック
        console.warn("⚠️ [VENDING_DEBUG] 決済確認モーダルが見つかりません。標準ダイアログを使用します。");
        if (confirm(`このアイテムを ${quantity}個 購入しますか？`)) {
            const payload = { 
                ownerId: ownerId, 
                dbId: dbId, 
                quantity: quantity,
                price: totalPrice,
                item: targetItemData
            };
            console.log("✉️ [DEBUG: 標準confirm経由でサーバーへ送るペイロード]", payload);
            socket.emit('vending_buy_req', payload);
        }
    }
}

// ============================================================
// :::SAVE_GAME_DATA::: 💾 プレイヤーデータのサーバー同期（セーブ）
// ============================================================
/**
 * 役割：
 * - ログイン状態（myId, hero）の確認
 * - キャラクターの成長情報（Level, Exp, Stats）を抽出
 * - 現在の生存状況（HP, MP, Position）のパッケージ化
 * - サーバーへの保存リクエスト（save_player_data）の発行
 */
function saveGameData() {
    // ログイン前（myIdがない時）は送らない
    if (!myId || typeof hero === 'undefined') return;

    const saveData = {
        userId: myId,
        level: hero.level || 1,
        exp: hero.exp || 0,
        gold: hero.gold || 0,
        hp: hero.hp || 100,
        // 🌟 装備ボーナスが混ざった最終値ではなく、「素の最大HP（baseMaxHp）」を保存用に送信する
        maxHp: hero.baseMaxHp !== undefined ? hero.baseMaxHp : (hero.maxHp || 100),
        mp: hero.mp || 50,
        // 🌟 装備ボーナスが混ざった最終値ではなく、「素の最大MP（baseMaxMp）」を保存用に送信する
        maxMp: hero.baseMaxMp !== undefined ? hero.baseMaxMp : (hero.maxMp || 50),  
        mapId: currentMapId,
        x: hero.x,
        y: hero.y,
        // 🌟 装備ボーナスが混ざった最終値ではなく、「素のステータス」を保存用に送信する
        str: hero.baseStr !== undefined ? hero.baseStr : (hero.str || 4),
        dex: hero.baseDex !== undefined ? hero.baseDex : (hero.dex || 4),
        luk: hero.baseLuk !== undefined ? hero.baseLuk : (hero.luk || 4),
        // 🌟 データベースに保存するためのベース攻撃力（baseAtk）を送信
        atk: hero.baseAtk !== undefined ? hero.baseAtk : 13,
        ap: hero.ap || 0,
		// 🌟 【ここを追加！】現在のキーコンフィグ設定をセーブデータに混ぜる
        keyConfig: typeof currentKeyConfig !== 'undefined' ? currentKeyConfig : {}
    };

    socket.emit('save_player_data', saveData);
    console.log("オートセーブ実行:", saveData); // デバッグ用
}

// ============================================================
// :::AUTO_SAVE_INTERVAL::: ⏳ 冒険の自動記録（オートセーブ）
// ============================================================
/**
 * 役割：
 * - 10秒（10000ms）間隔で定期的にセーブ処理を駆動
 * - ログイン済み（myIdかつhero.nameが存在する）状態のみをセーブ対象とする
 */
setInterval(() => {
    if (myId && hero.name) {
        saveGameData();
    }
}, 10000);

// 全ての通信を監視する最強のデバッグコード
/*
socket.onAny((event, ...args) => {
    console.log(`📡 [受信したイベント]: ${event}`, args);
});
*/

window.addEventListener('load', () => {
    // キー名を 'game_token' に統一
    const savedToken = localStorage.getItem('game_token'); 
    const loadingCover = document.getElementById('loading-cover');
    const loginOverlay = document.getElementById('login-overlay');
    const mainContainer = document.getElementById('main-container'); // 🌟 ゲーム画面本体
    const uiContainer = document.getElementById('ui-container');      // 🌟 UI操作エリア（チャット等）

    // ★最初からログインオーバーレイは透明にして操作を無効化（チラつき完全防止）
    if (loginOverlay) {
        loginOverlay.style.opacity = '0';
        loginOverlay.style.pointerEvents = 'none';
    }

    // ★最初からゲーム画面とUIエリアも完全に隠しておく（リロード時のチラつき防止）
    if (mainContainer) mainContainer.style.display = 'none';
    if (uiContainer) uiContainer.style.display = 'none';

    // タイムアウト設定：5秒経っても反応がなければ強制的にログイン画面を表示
    const timeoutTimer = setTimeout(() => {
        console.log("⏰ サーバー応答なし：タイムアウトしました");
        if (loadingCover) loadingCover.style.display = 'none';
        
        if (loginOverlay) {
            loginOverlay.style.opacity = '1';
            loginOverlay.style.pointerEvents = 'auto';
            loginOverlay.style.setProperty('display', 'flex', 'important');
        }
    }, 5000); 

    // 【重要】サーバーから返事が来たら（自動ログイン成功！）共通の処理を関数化
    const handleLoginSuccess = (userData) => {
        clearTimeout(timeoutTimer); // タイムアウトをキャンセル
        console.log("✨ 自動ログイン成功！", userData);

        if (loadingCover) loadingCover.style.display = 'none';
        if (loginOverlay) {
            loginOverlay.style.opacity = '0';
            loginOverlay.style.pointerEvents = 'none';
        }

        // 🌟 ゲーム画面とUIエリアを出現させる！
        if (mainContainer) mainContainer.style.display = 'flex';
        if (uiContainer) uiContainer.style.display = 'flex';
    };

    // 予め 'login_data' のリスナーを登録しておく
    socket.once('login_data', handleLoginSuccess);

    if (savedToken) {
        console.log("⏳ 自動ログイン試行中...");

        // 🌟 【修正】すでに接続済みなら即座に送信、未接続なら connect を待つ
        if (socket.connected) {
            console.log("📤 既に接続完了済み、即座に自動ログイン送信！");
            socket.emit('auto_login', { token: savedToken });
        } else {
            socket.once('connect', () => {
                console.log("📤 後から接続完了、自動ログイン送信！");
                socket.emit('auto_login', { token: savedToken });
            });
        }
    } else {
        clearTimeout(timeoutTimer); // トークン不要なので解除
        console.log("⚠️ トークンなし、ログイン画面を表示");
        if (loadingCover) loadingCover.style.display = 'none';
        
        if (loginOverlay) {
            loginOverlay.style.opacity = '1';
            loginOverlay.style.pointerEvents = 'auto';
            loginOverlay.style.setProperty('display', 'flex', 'important');
        }
    }
});

function logout() {
    // 0. ログアウトするユーザー名を取得する（例: 保存されている名前、または入力欄などから）
    // ※もし現在ログイン中のユーザー名を変数（例: currentUserName）で保持していればそれを使えます
    const userName = localStorage.getItem('current_username') || 'プレイヤー';

    // ★1. ネットワークフィードに「ログアウトしました」を記録＆保存！
    addNetworkLog(`${userName} がログアウトしました`, 'logout');

    // 2. ブラウザからカギを捨てる
    localStorage.removeItem('remember_token');
    
    // 3. サーバーにカギの削除を依頼
    socket.emit('logout');
    
    // 4. ログが localStorage に保存されるのをわずかに待ってから、画面を更新してログイン画面へ
    setTimeout(() => {
        location.reload(); 
    }, 150); // 0.15秒後にリロード
}

// --- 👾 クライアント側で不足しているサーバーデータを補完 ---

// 1. SETTINGS の仮定義
const SETTINGS = {
    SYSTEM: {
        GROUND_Y: 600,   // 地面の高さ（画面に合わせて調整してください）
        ENEMY_MIN_X: 0,  // 移動範囲最小
        ENEMY_MAX_X: 800 // 移動範囲最大
    }
};

// 2. MAP_DATA の仮定義（Enemyクラスがplatformsを探してエラーになるのを防ぐ）
const MAP_DATA = {
    platforms: [] // 空にしておけば、if (p) でプラットフォームなしとして処理されます
};

// もしこれでも「playersが定義されていません」と言われたら、以下を追加
if (typeof players === 'undefined') {
    var players = {};
}

// game.js の適当な場所（クラス定義の前など）にこれを貼り付け
const ENEMY_CATALOG = {
    1010: { // 召喚テスト用の敵ID
        type: "Char13",
        scale: 1,
        hp: 40,
        atk: 4,
        def: 0,
        speed: 1.5,
        exp: 1,
        money: 3,
        w: 322,
        h: 242
    }
};

// ============================================================
// 🔍 ガチガチ・デバッグ監視システム
// ============================================================
(function() {
    console.log("🛡️ デバッグ監視システムが有効化されました。操作を行ってください。");

    // 1. currentKeyConfig の書き換わりを完全に監視する Proxy
    let _debugConfigProxy = new Proxy(currentKeyConfig, {
        set(target, property, value) {
            console.warn(`🚨 [CONFIG変更] "${property}" が書き換えられました:`, value, new Error().stack);
            target[property] = value;
            return true;
        }
    });

    // 2. クリックイベントやマウスアップの暴発を監視する大元キャッチャー
    document.addEventListener('click', (e) => {
        console.log("🖱️ [GLOBAL CLICK] ターゲット:", e.target, " / 親要素にキャンセル処理がないか確認");
    }, true /* キャプチャフェーズで最速検知 */);

    // 3. cancelGrab が呼ばれた瞬間にスタックトレース（どこから呼ばれたか）を出す
    const _origCancelGrab = window.cancelGrab;
    if (typeof _origCancelGrab === 'function') {
        window.cancelGrab = function() {
            console.error("❌ [CANCEL GRAB 検出] cancelGrab() が呼び出されました！ 呼び出し元:", new Error().stack);
            return _origCancelGrab.apply(this, arguments);
        };
    }

    // 4. placeGrabbedAction が呼ばれたときの引数と結果を監視
    const _origPlaceAction = window.placeGrabbedAction;
    if (typeof _origPlaceAction === 'function') {
        window.placeGrabbedAction = function(targetKeyName) {
            console.log(`🎯 [PLACE 実行] キー "${targetKeyName}" へ配置を試みます。activeDragging:`, activeDragging);
            return _origPlaceAction.apply(this, arguments);
        };
    }
})();