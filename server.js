// ============================================================
// ⚙️ [SECTION 1: CONFIG] サーバー設定・定数
// 役割: 接続ポート、セキュリティ(CORS)、ゲームの物理ルール等の固定値
// ============================================================
// Webサーバーを作るための定番フレームワーク
const express = require('express');

// MySQLデータベースとやり取りするためのライブラリ
const mysql = require('mysql2/promise');

//const util = require('util');

const bcrypt = require('bcrypt'); // 🌟 これを追加

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

// ポート番号の設定（環境変数 PORT があればそれを使い、なければ 3000番を使用）
//const PORT = process.env.PORT || 3000;

// 「public」フォルダ内のファイルを自動で公開する設定
// これにより、index.html や view.js がブラウザから読み込めるようになります
app.use(express.static(path.join(__dirname, 'public')));

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

// ==========================================
// 📞 ソケット通信の入り口（debugChat 搭載版）
// ==========================================
io.on('connection', socket => {
    // 🛡️ 通信の根本を try-catch で保護
    try {
        // 新しいプレイヤーが接続したことを、接続した本人「以外」の全員に通知
        // socket.broadcast.emit('player_joined_sound');

        // 接続時にIDを通知
        socket.emit('your_id', socket.id);
        debugChat(`🔌 新しい接続: ${socket.id}`);

        socket.emit('init_monster_configs', MONSTER_CONFIGS);
        socket.emit('init_item_config', ITEM_CONFIG);
        socket.emit('init_item_images', ITEM_IMAGES);
        socket.emit('init_item_categories', itemCategories);
        socket.emit('init_item_descriptions', ITEM_DESCRIPTIONS);

        // ------------------------------------------
        // 🔑 ログイン (Login) 処理
        // ------------------------------------------
        socket.on('login', async (data) => {
            // 🌟 修正：クライアントから送られてくる channel を受け取る
            const { username, password, channel } = data;

            try {
                // 1. ユーザーの存在確認
                const sql = 'SELECT * FROM users WHERE username = ?';
                // 🌟 修正：Promise版は [結果] を受け取る形になります
                const [userResults] = await pool.query(sql, [username]);

                if (userResults.length === 0) {
                    socket.emit('login_response', { success: false, message: 'ユーザー名またはパスワードが違います' });
                    return;
                }

                const user = userResults[0];

                // 🌟 パスワードの照合
                const match = await bcrypt.compare(password, user.password_hash);

                if (match) {
                    // 2. 認証成功後、player_stats テーブルからステータスを取得
                    const statsSql = 'SELECT * FROM player_stats WHERE user_id = ?';
                    const [statsResults] = await pool.query(statsSql, [user.id]);

                    if (statsResults.length === 0) {
                        LOG.DB(`ステータス取得失敗 (ID: ${user.id}): データが見つかりません`);
                        socket.emit('login_response', { success: false, message: 'キャラクターデータの読み込みに失敗しました' });
                        return;
                    }

                    const stats = statsResults[0];

                    // 🌟 追記：選択されたチャンネルを確定（数値として取得し、デフォルトは1）
                    const selectedChannel = parseInt(channel) || 1;
                    const roomName = `channel_${selectedChannel}`;

                    // ------------------------------------------------------------
                    // 🌟 踏襲：サーバー側のメモリ(players)にDBのデータを同期する
                    // ------------------------------------------------------------
                    players[socket.id] = {
                        id: user.id,
                        name: user.username,
                        // 🌟 追記：メモリ上にも現在のチャンネルを保存
                        channel: selectedChannel,
                        gold: Number(stats.gold || 0),
                        level: stats.level,
                        exp: stats.exp,
                        hp: stats.hp,
                        maxHp: stats.max_hp,
                        mp: stats.mp,
                        maxMp: stats.max_mp,
                        map_id: stats.map_id,
                        x: stats.pos_x,
                        y: stats.pos_y,
                        job_id: stats.job_id,
                        // --- ⚔️ 追加ステータス ---
                        str: stats.str || 4,
                        dex: stats.dex || 4,
                        luk: stats.luk || 4,
                        ap: stats.ap || 0,
                        // -----------------------
                        inventory: [],
                        lastPickupTime: 0
                    };

                    // 🌟 肝：このソケットをチャンネル専用の「部屋」に参加させる
                    socket.join(roomName);

                    // 3. 認証成功のレスポンス（DBから読み込んだステータスを同封）
                    socket.emit('login_response', {
                        success: true,
                        id: user.id,
                        username: user.username,
                        // 🌟 追記：クライアント側にどのチャンネルで入ったか伝える
                        channel: selectedChannel,
                        stats: {
                            level: stats.level,
                            exp: stats.exp,
                            hp: stats.hp,
                            max_hp: stats.max_hp,
                            mp: stats.mp,
                            max_mp: stats.max_mp,
                            gold: stats.gold,
                            map_id: stats.map_id,
                            x: stats.pos_x,
                            y: stats.pos_y,
                            job_id: stats.job_id,
                            // --- ⚔️ クライアント側へ送る追加ステータス ---
                            str: stats.str || 4,
                            dex: stats.dex || 4,
                            luk: stats.luk || 4,
                            ap: stats.ap || 0
                        },
                        message: 'ログイン成功！'
                    });

                    // 🌟 追記：同じチャンネルにいる「他のプレイヤー」にだけ新入生を通知
                    socket.to(roomName).emit('player_joined', players[socket.id]);

                    LOG.DB(`ログイン成功: ${user.username} (Lv.${stats.level}) -> ${roomName}`);

                    // ------------------------------------------------------------
                    // 🌟 踏襲：タイムゾーン設定とログイン時間の更新
                    // ------------------------------------------------------------
                    try {
                        await pool.query("SET time_zone = '+09:00';");
                        await pool.query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);
                    } catch (tzErr) {
                        LOG.DB(`ログイン時間更新エラー: ${tzErr.message}`);
                    }

                } else {
                    // パスワード不一致
                    socket.emit('login_response', { success: false, message: 'ユーザー名またはパスワードが違います' });
                }

            } catch (err) {
                // 🌟 システムエラー（DB接続切れなど）
                console.error("❌ ログイン処理中にエラーが発生しました:", err);
                socket.emit('login_response', { success: false, message: 'サーバーエラーが発生しました' });
            }
        });

        // ------------------------------------------
// 📝 ユーザー新規登録 (Register) + 徹底デバッグ版（環境最適化済み）
// ------------------------------------------
socket.on('register', async (data) => {
    const { username, password } = data;
    console.log(`\n=== [DEBUG START] 登録プロセス開始: "${username}" ===`);

    // 簡単な入力チェック
    if (!username || !password || username.length < 2 || password.length < 4) {
        console.log(`[DEBUG ❌] 入力バリデーション不合格`);
        socket.emit('register_response', { success: false, message: '名前は2文字以上、パスワードは4文字以上で入力してください' });
        return;
    }

    try {
        // 1. パスワードを暗号化
        console.log(`[DEBUG 1] bcryptハッシュ化を開始します...`);
        const saltRounds = 10;
        const hash = await bcrypt.hash(password, saltRounds);
        console.log(`[DEBUG 1 ✅] パスワードハッシュ化完了`);

        // 🌟 タイムゾーン設定
        try {
            console.log(`[DEBUG 2] タイムゾーン設定(SET time_zone)を実行します...`);
            // あなたの環境では pool.query が直接 Promise を返すため、await するだけでOKです
            await pool.query("SET time_zone = '+09:00';");
            console.log(`[DEBUG 2 ✅] タイムゾーン設定クエリ成功`);
        } catch (tzErr) {
            console.error(`[DEBUG 2 ⚠️] タイムゾーン設定失敗(無視して続行):`, tzErr.message);
            if (typeof LOG !== 'undefined') LOG.DB(`タイムゾーン設定エラー: ${tzErr.message}`);
        }

        // 2. データベース(users)に保存
        console.log(`[DEBUG 3] usersテーブルへのINSERTを開始します...`);
        const sql = 'INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, NOW())';
        
        // 🌟 Promiseクライアント環境では [result] 形式で分割代入するのが一般的です
        const [result] = await pool.query(sql, [username, hash]);
        
        // 🌟 3. 新しく作成されたユーザーの ID を取得
        const newUserId = result.insertId;
        console.log(`[DEBUG 3 ✅] users保存成功。発行されたID: ${newUserId}`);

        // 🌟 4. 初期ステータスの保存
        console.log(`[DEBUG 4] player_stats初期データ作成を開始します (ID: ${newUserId})...`);
        const statsSql = `
            INSERT INTO player_stats 
            (user_id, level, exp, gold, hp, max_hp, mp, max_mp, map_id, pos_x, pos_y, job_id, str, dex, luk, ap) 
            VALUES (?, 1, 0, 0, 100, 100, 50, 50, 1, 400.0, 300.0, 0, 4, 4, 4, 0)
        `;

        try {
            await pool.query(statsSql, [newUserId]);
            console.log(`[DEBUG 4 ✅] player_stats保存成功！`);
        } catch (statsErr) {
            console.error(`[DEBUG 4 ❌] player_stats保存失敗の詳細原因:`, statsErr);
            if (typeof LOG !== 'undefined') LOG.DB(`ステータス初期化エラー (ID: ${newUserId}): ${statsErr.message}`);
        }

        // 全て完了
        console.log(`=== [DEBUG SUCCESS] 全てのプロセスが完了しました: ${username} ===\n`);
        socket.emit('register_response', { success: true, message: '登録が完了しました！ログインしてください。' });
        if (typeof LOG !== 'undefined') LOG.DB(`新規ユーザー登録 & ステータス作成完了: ${username} (ID: ${newUserId})`);

    } catch (err) {
        // 🌟 致命的なエラーの正体をコンソールに完全に暴き出します
        console.error(`\n=== [DEBUG ❌ CRITICAL ERROR] ===`);
        console.error(`エラーコード: ${err.code}`);
        console.error(`メッセージ  : ${err.message}`);
        console.error(`発生箇所    : ${err.stack}`);
        console.error(`=================================\n`);

        if (err.code === 'ER_DUP_ENTRY') {
            console.log(`[DEBUG] エラー判定: ユーザー名の重複`);
            socket.emit('register_response', { success: false, message: 'その名前は既に登録されています' });
        } else {
            if (typeof LOG !== 'undefined') LOG.SYS(`登録エラー: ${err.message}`);
            socket.emit('register_response', { success: false, message: 'サーバー内でエラーが発生しました' });
        }
    }
});

        // ------------------------------------------
// 💾 ステータス保存 (Save Data) 処理
// ------------------------------------------
socket.on('save_player_data', (data) => {
    // data には { userId, level, exp, gold, hp, maxHp, mp, maxMp, mapId, x, y, str, dex, luk, ap } が入っている想定
    const { userId, level, exp, gold, hp, maxHp, mp, maxMp, mapId, x, y, str, dex, luk, ap } = data;

    if (!userId) return;

    // 🌟 修正ポイント：通信用の長い文字列ID (userId) を使って、
    // サーバーのメモリ(players)からデータベース用の数値IDを取り出します。
    const player = players[userId];
    if (!player || !player.dbId) {
        // まだログインが完了していない、またはIDが紐付いていない場合は保存をスキップ
        return;
    }

    const dbUserId = player.dbId; // ここに 10 などの数値が入ります

    // 🌟 UPDATE文の構造はそのまま踏襲
    const sql = `
        UPDATE player_stats 
        SET level = ?, exp = ?, gold = ?, hp = ?, max_hp = ?, mp = ?, max_mp = ?, 
            map_id = ?, pos_x = ?, pos_y = ?, str = ?, dex = ?, luk = ?, ap = ?
        WHERE user_id = ?
    `;

    // 🌟 引数の順番を維持しつつ、最後の userId だけ dbUserId (数値) に差し替え
    pool.query(sql, [level, exp, gold, hp, maxHp, mp, maxMp, mapId, x, y, str, dex, luk, ap, dbUserId], (err, result) => {
        if (err) {
            // エラーログの出力形式も踏襲（識別しやすいよう dbUserId を表示）
            if (typeof LOG !== 'undefined' && LOG.DB) {
                LOG.DB(`セーブ失敗 (DB_ID: ${dbUserId}): ${err.message}`);
            } else {
                console.error(`[DB ERROR] セーブ失敗 (DB_ID: ${dbUserId}): ${err.message}`);
            }
            return;
        }
        // 必要であればここに成功ログを追加してください
    });
});

        // ------------------------------------------
        // 👋 接続解除 (Disconnect)
        // ------------------------------------------
        socket.on('disconnect', () => {
            LOG.SYS(`ユーザーが切断しました: ${socket.id}`);
            try {
                const name = players[socket.id] ? players[socket.id].name : socket.id;
                debugChat(`📴 切断されました: ${name}`);
                delete players[socket.id];
            } catch (e) {
                debugChat(`❌ disconnectエラー: ${e.message}`, 'error');
            }
        });

        // ==========================================
        // 👤 プレイヤーの参加・変更セクション
        // ==========================================

        // --- 1. 参加処理の修正（既存ロジック踏襲・サウンド通知追加版） ---
        socket.on('join', data => {
            try {
                // 🌟 データの取り出し
                const userName = (typeof data === 'object') ? data.name : data;

                // 🎨 クライアントがボタンで選んだグループ番号を取得
                let selectedGroup = (typeof data === 'object' && data.group !== undefined) ? parseInt(data.group) : 0;

                // チャンネル番号を数値として取得（1〜5 の範囲）
                let channel = (typeof data === 'object') ? parseInt(data.channel) : 1;
                if (isNaN(channel) || channel < 1 || channel > 5) channel = 1;

                // 🌟 【最重要】合言葉（部屋名）を統一
                const roomName = `channel_${channel}`;
                socket.join(roomName);

                // 元々の処理を呼び出す
                handleJoin(socket, userName);

                // 🌟 プレイヤーデータへの書き込み
                const p = players[socket.id];
                if (p) {
                    p.channel = channel;
                    p.group = selectedGroup;
                    p.charVar = 1;

                    // 🔊 入室サウンド通知：同じチャンネル（部屋）にいる「自分以外」の全員に通知
                    socket.to(roomName).emit('player_joined_sound');

                    debugChat(`👋 ${userName} さんが チャンネル ${channel} に参加しました（キャラID: ${p.group}）`);
                    LOG.SYS(`[入室データ確認] ${JSON.stringify(p)}`);
                }
            } catch (e) {
                debugChat(`❌ joinエラー: ${e.message}`, 'error');
            }
        });

        // --- 2. 見た目の変更を全ユーザーに同期する ---
        socket.on('change_char', (data) => {
            const p = players[socket.id];
            if (p) {
                p.group = data.group;
                p.charVar = data.charVar;

                const roomName = `channel_${p.channel}`;
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
                p.vx = data.vx;
                p.dir = data.dir;
                p.jumping = data.jumping;
                p.isAttacking = data.isAttacking;
                p.invincible = data.invincible;
                p.climbing = data.climbing;
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
            try {
                handlePickup(socket, itemId);
            } catch (e) {
                debugChat(`❌ pickupエラー: ${e.message}`, 'error');
            }
        });

        // 5. 被ダメージ
        socket.on('player_damaged', data => {
            try {
                handlePlayerDamaged(socket, data);
            } catch (e) {
                debugChat(`❌ damagedエラー: ${e.message}`, 'error');
            }
        });

        // ==========================================
// 💬 6. チャット受信（メイン処理）
// ==========================================
socket.on('chat', (data) => {
    const p = players[socket.id];
    if (!p) return;

    // クライアントから届いたデータを解析
    const chatObj = (typeof data === 'object') ? data : { text: data, type: 'all' };

    // 🌟 修正ポイント：payloadのtypeをchatObj.typeで確実に設定する
    const payload = {
        id: socket.id,
        name: p.name,
        text: chatObj.text,
        type: chatObj.type || 'all', 
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    if (chatObj.type === 'whisper' && chatObj.targetName) {
        // --- 1. 内緒話の処理 ---
        const targetEntry = Object.entries(players).find(([id, player]) => player.name === chatObj.targetName);
        const whisperColor = "#00ff00"; // メイプル本来の緑

        if (targetEntry) {
            const [targetSocketId, targetPlayer] = targetEntry;
            const targetCh = `[CH.${targetPlayer.ch || 1}]`;
            const myCh = `[CH.${p.ch || 1}]`;

            // 受信相手への送信
            io.to(targetSocketId).emit('chat', {
                ...payload,
                name: `${p.name} ${myCh} >> `, 
                color: whisperColor,
                isWhisper: true 
            });

            // 自分への表示
            socket.emit('chat', {
                ...payload,
                name: `${chatObj.targetName} ${targetCh} << `, 
                color: whisperColor,
                isWhisper: true 
            });
        } else {
            // 相手が見つからない場合
            socket.emit('chat', {
                ...payload,
                name: `${chatObj.targetName} [CH.1] << `,
                color: whisperColor,
                isWhisper: true
            });
            
            socket.emit('chat', {
                name: 'System',
                text: `${chatObj.targetName} さんは見つかりませんでした`,
                type: 'system',
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            });
        }
    } else if (chatObj.type === 'friend') {
        // --- 2. 友達（フレンド）チャット ---
        const myCh = `[CH.${p.ch || 1}]`;
        const friendColor = "#ff9900"; // メイプル風オレンジ

        io.emit('chat', {
            ...payload,
            name: p.name,
            type: 'friend', // 🌟 明示的に指定してフロント側のオレンジ判定を動かす
            color: friendColor
        });
    } else if (chatObj.type === 'group') {
        // --- 3. グループチャット ---
        io.emit('chat', {
            ...payload,
            type: 'group' // 🌟 これによりフロント側でピンク色になる
        });
    } else {
        // --- 4. 通常の全体チャット ---
        io.emit('chat', payload);
    }
});

        // 9. グループ変更
        socket.on('change_group', data => {
            try {
                if (players[socket.id]) {
                    players[socket.id].group = data.group;
                    io.emit('update_players', players);
                    debugChat(`👥 グループ変更: ${players[socket.id].name} -> ${data.group}`);
                }
            } catch (e) {
                debugChat(`❌ change_groupエラー: ${e.message}`, 'error');
            }
        });
		
		socket.on('change_channel', (data) => {
    const { newChannel } = data;
    const player = players[socket.id];
    
    if (!player) return;

    // 1. 古い部屋を抜ける
    const oldRoom = `channel_${player.channel}`;
    socket.leave(oldRoom);
    
    // 古い部屋の人たちに「この人はいなくなったよ」と通知
    socket.to(oldRoom).emit('player_left', socket.id);

    // 2. プレイヤー情報のチャンネルを更新
    player.channel = parseInt(newChannel);
    const newRoom = `channel_${player.channel}`;

    // 3. 新しい部屋に入る
    socket.join(newRoom);

    // 🌟 4. 新しい部屋の「最新の住人リスト」を作成する
    const roomPlayers = {};
    for (const id in players) {
        // 同じチャンネル番号を持っている人だけをリストに入れる
        if (players[id].channel === player.channel) {
            roomPlayers[id] = players[id];
        }
    }

    // 5. 本人に「完了通知」と「新しい住人名簿」を送る
    socket.emit('change_channel_response', {
        success: true,
        channel: player.channel,
        roomPlayers: roomPlayers // これで「出会えない」を防ぐ！
    });

    // 6. 新しい部屋の住人に「新入りが来たよ」と通知
    // ※ player自身は roomPlayers に含まれて本人に届くので、
    // ここでは socket.to(newRoom)（自分以外）にだけ送ればOK
    socket.to(newRoom).emit('player_joined', player);
    
    console.log(`[Channel] ${player.name} moved to ${newRoom}. Room population: ${Object.keys(roomPlayers).length}`);
});


		// server.js
socket.on('request_change_channel', (data) => {
    const { targetChannel } = data;
    
    // 送られてきたIDを信じず、通信している本人(socket.id)のデータを探す
    const actualId = socket.id; 

    if (players[actualId]) {
        players[actualId].channel = targetChannel;
        
        console.log(`【成功】${players[actualId].name} を CH.${targetChannel} に変更`);

        io.emit('player_moved_channel', {
            userId: actualId,
            newChannel: targetChannel
        });
    }
});

        // 📥 10. アイテムを捨てた時 (dropItem) - 複数個対応＆5ch対応版
        socket.on('dropItem', (data) => {
            try {
                const player = players[socket.id];
                if (!player || !player.inventory) return;

                const chId = player.channel || 1;
                const index = (typeof data === 'object') ? data.index : data;
                const requestedAmount = (typeof data === 'object') ? data.amount : null;

                if (player.inventory[index]) {
                    const itemToDrop = player.inventory[index];
                    const maxCount = itemToDrop.count || itemToDrop.amount || 1;
                    const actualDropCount = (requestedAmount !== null)
                        ? Math.min(Math.max(1, requestedAmount), maxCount)
                        : maxCount;

                    let itemName = SERVER_ITEM_NAMES[itemToDrop.type] || 'アイテム';
                    const dropLogMsg = actualDropCount >= 2
                        ? `${itemName}を${actualDropCount}個捨てました`
                        : `${itemName}を捨てました`;

                    const catalogId = (itemToDrop.type === 'sword') ? 101 : (itemToDrop.type === 'shield' ? 102 : null);
                    const catalogBase = (catalogId && typeof ITEM_CATALOG !== 'undefined') ? ITEM_CATALOG[catalogId] : {};

                    const newItem = {
                        id: Math.floor(Math.random() * 1000000),
                        type: itemToDrop.type,
                        x: player.x,
                        y: player.y + 12,
                        vx: 0,
                        vy: -12,
                        landed: false,
                        ch: chId,
                        lv: itemToDrop.lv !== undefined ? itemToDrop.lv : (catalogBase.lv || 0),
                        category: itemToDrop.category || catalogBase.category || "",
                        str: itemToDrop.str !== undefined ? itemToDrop.str : (catalogBase.str || 0),
                        dex: itemToDrop.dex !== undefined ? itemToDrop.dex : (catalogBase.dex || 0),
                        int: itemToDrop.int !== undefined ? itemToDrop.int : (catalogBase.int || 0),
                        luk: itemToDrop.luk !== undefined ? itemToDrop.luk : (catalogBase.luk || 0),
                        maxHp: itemToDrop.maxHp !== undefined ? itemToDrop.maxHp : (catalogBase.maxHp || 0),
                        maxMp: itemToDrop.maxMp !== undefined ? itemToDrop.maxMp : (catalogBase.maxMp || 0),
                        atk: itemToDrop.atk !== undefined ? itemToDrop.atk : (catalogBase.atk || 0),
                        matk: itemToDrop.matk !== undefined ? itemToDrop.matk : (catalogBase.matk || 0),
                        def: itemToDrop.def !== undefined ? itemToDrop.def : (catalogBase.def || 0),
                        star: itemToDrop.star || 0,
                        successCount: itemToDrop.successCount || 0,
                        failCount: itemToDrop.failCount || 0,
                        totalUpgrade: itemToDrop.totalUpgrade !== undefined ? itemToDrop.totalUpgrade : (catalogBase.totalUpgrade || 7),
                        count: actualDropCount,
                        value: (itemToDrop.type === 'money3' ? 100 : 10),
                        isStatic: true,
                        angle: 0,
                        rotateSpeed: 0.15,
                        isTradeable: itemToDrop.isTradeable !== undefined ? itemToDrop.isTradeable : (catalogBase.isTradeable !== undefined ? catalogBase.isTradeable : true),
                        totalFirstStats: (itemToDrop.totalFirstStats !== undefined) ? itemToDrop.totalFirstStats : (catalogBase.totalFirstStats || 0),
                        totalALLStats: (
                            (itemToDrop.str !== undefined ? itemToDrop.str : (catalogBase.str || 0)) +
                            (itemToDrop.dex !== undefined ? itemToDrop.dex : (catalogBase.dex || 0)) +
                            (itemToDrop.int !== undefined ? itemToDrop.int : (catalogBase.int || 0)) +
                            (itemToDrop.luk !== undefined ? itemToDrop.luk : (catalogBase.luk || 0)) +
                            ((itemToDrop.maxHp !== undefined ? itemToDrop.maxHp : (catalogBase.maxHp || 0)) / 10) +
                            ((itemToDrop.maxMp !== undefined ? itemToDrop.maxMp : (catalogBase.maxMp || 0)) / 10) +
                            (itemToDrop.atk !== undefined ? itemToDrop.atk : (catalogBase.atk || 0)) +
                            (itemToDrop.matk !== undefined ? itemToDrop.matk : (catalogBase.matk || 0)) +
                            (itemToDrop.def !== undefined ? itemToDrop.def : (catalogBase.def || 0))
                        )
                    };

                    if (droppedItems[chId]) {
                        droppedItems[chId].push(newItem);
                        socket.emit('chat', {
                            id: 'SYSTEM_LOG',
                            name: '🗑️ 廃棄',
                            text: `[${new Date().toLocaleTimeString()}] ${dropLogMsg}`
                        });
                        io.to(`channel_${chId}`).emit('item_spawned', newItem);
                    }

                    if (actualDropCount < maxCount) {
                        if (itemToDrop.count !== undefined) {
                            itemToDrop.count -= actualDropCount;
                        } else if (itemToDrop.amount !== undefined) {
                            itemToDrop.amount -= actualDropCount;
                        } else {
                            player.inventory[index] = null;
                        }
                    } else {
                        player.inventory[index] = null;
                    }

                    socket.emit('inventory_update', player.inventory);
                    if (typeof sendState === 'function') sendState();
                }
            } catch (e) {
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
            if (!player || player.ap <= 0) return;

            if (data.type === 'str') {
                player.ap -= 1;
                player.str += 1;
                console.log(`[成長] ${player.name}: STR -> ${player.str}`);
            } else if (data.type === 'dex') {
                player.ap -= 1;
                player.dex = (player.dex || 0) + 1;
                console.log(`[成長] ${player.name}: DEX -> ${player.dex}`);
            } else if (data.type === 'luk') {
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

// ============================================================
// 📊 [SECTION 2: STATE] サーバー・ステート
// 役割: 全プレイヤー、モンスター、アイテムの「現在の数値」を保持する場所
// ============================================================
let players = {};         // 参加中のプレイヤーたち
let lastPickedItems = []; // 🌟 拾われた情報を一時保存する箱（ここがベスト！）

// ============================================================
// 🔊 [SECTION 3: RESOURCES] データベース・マスターデータ
// 役割: MySQL接続、アイテムデータ表、モンスター出現表などの管理
// ============================================================
// 2. 接続設定
const dbConfig = process.env.MYSQL_URL || 'mysql://root:yWwJPVjrLsQDapTxfyBUHPkigNLFYpDg@ballast.proxy.rlwy.net:53684/railway';

// 3. プールを作成（promise版ならこれだけで await が使えます）
const pool = mysql.createPool(dbConfig);

let connection;

// サーバー側で保持するカタログ
let ITEM_CATALOG = {};
let EQUIP_NAMES = {};
let CONSUME_NAMES = {};
let ETC_NAMES = {};
let SERVER_ITEM_NAMES = {};
let itemCategories = {};

// 🌟 画像パスを保持する変数
let ITEM_IMAGES = {};

// 🌟 アイテム解説文を保持する変数
let ITEM_DESCRIPTIONS = {};

// 🌟 動的に生成されるアイテム名簿
let ITEM_NAMES = {};

// 🌟 動的に生成される共通設定オブジェクト
let STATIC_ITEMS = {};

// 🌟 合体後の最終的なアイテム設定
let ITEM_CONFIG = {};

/**
 * 🗄️ データベースから全アイテム情報を読み込み、
 * カタログ成形、ステータス計算、および各種設定(ITEM_CONFIG等)の構築を行う
 */
async function loadItemCatalogFromDB() {
    try {
        const formattedCatalog = {};
        
        // 各カテゴリの名簿を構築するための一時的な箱
        const newEquipNames = {};
        const newConsumeNames = {};
        const newEtcNames = {};

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

        // 1. メモリ上のカタログと各名簿を更新
        ITEM_CATALOG = formattedCatalog;
        EQUIP_NAMES = newEquipNames;
        CONSUME_NAMES = newConsumeNames;
        ETC_NAMES = newEtcNames;
        itemCategories = newItemCategories;
        ITEM_IMAGES = newItemImages;
        ITEM_DESCRIPTIONS = newItemDescriptions;

        SERVER_ITEM_NAMES = {
            ...EQUIP_NAMES,
            ...CONSUME_NAMES,
            ...ETC_NAMES
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

        // --- 🌟 STATIC_ITEMS 形式を動的に生成 ---
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
            "medal1":     { "type": "ETC", "name": "medal1", "display_name": "メダル1", "src": "/item_assets/GoldOne_", "isAnimated": true },
            "money5":     { "type": "ETC", "name": "money5", "display_name": "金メダル1", "src": "/item_assets/Gold_", "isAnimated": true },
            "money6":     { "type": "ETC", "name": "money6", "display_name": "銀メダル1", "src": "/item_assets/Silver_", "isAnimated": true },
            "money7":     { "type": "ETC", "name": "money7", "display_name": "銅メダル1", "src": "/item_assets/Bronze_", "isAnimated": true },
            "gold_one":   { "type": "ETC", "name": "gold_one", "display_name": "ワンメダル(金)1", "src": "/item_assets/GoldOne_", "isAnimated": true },
            "gold_heart": { "type": "ETC", "name": "gold_heart", "display_name": "ハートメダル(金)1", "src": "/item_assets/GoldHeart_", "isAnimated": true },
            "money1":     { "type": "ETC", "name": "money1", "display_name": "10ゴールド1", "src": "/item_assets/money1_", "isAnimated": true },
            "money3":     { "type": "ETC", "name": "money3", "display_name": "100ゴールド1", "src": "/item_assets/money3_", "isAnimated": true },
        };

        // --- 🌟 📦 送信用に合体させる ---
        ITEM_CONFIG = { ...ANIMATED_ITEMS, ...STATIC_ITEMS };

        // --- 🛡️ 描画側 (sprites.items) への流し込み ---
        if (typeof sprites !== 'undefined' && sprites.items) {
            Object.keys(ITEM_CONFIG).forEach(key => {
                const data = ITEM_CONFIG[key];
                // アニメーション用画像は別途ロード処理があるはずなので、既存でない場合のみ初期化
                if (!sprites.items[key]) {
                    const img = new Image();
                    img.src = data.src;
                    sprites.items[key] = [img]; 
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

        // 3. 初期化完了ログ
        if (ITEM_CATALOG[101]) {
            const itemName = ITEM_CATALOG[101].displayName;
            const stats = ITEM_CATALOG[101].totalFirstStats;
            console.log(`ITEM_CATALOGの初期化完了: ${itemName}(ID:101) 合計=${stats}`);
        }

        // デバッグログ
        console.log(`現在の画像パス登録数: ${Object.keys(ITEM_IMAGES).length}件`);
        console.log(`現在の設定(ITEM_CONFIG)登録数: ${Object.keys(ITEM_CONFIG).length}件`);
        
    } catch (err) {
        console.error("❌ アイテムカタログの取得に失敗:", err);
        throw err;
    }
}

// 🎬 1. アニメーションありの設定（連番画像用）
/*
const ANIMATED_ITEMS = {
    "medal1":     { "type": "", "name": "medal1", "display_name": "メダル1", "src": "/item_assets/GoldOne_", "isAnimated": true },
    "money5":     { "type": "", "name": "money5", "display_name": "金メダル1", "src": "/item_assets/Gold_", "isAnimated": true },
    "money6":     { "type": "", "name": "money6", "display_name": "銀メダル1", "src": "/item_assets/Silver_", "isAnimated": true },
    "money7":     { "type": "", "name": "money7", "display_name": "銅メダル1", "src": "/item_assets/Bronze_", "isAnimated": true },
    "gold_one":   { "type": "", "name": "gold_one", "display_name": "ワンメダル(金)1", "src": "/item_assets/GoldOne_", "isAnimated": true },
    "gold_heart": { "type": "", "name": "gold_heart", "display_name": "ハートメダル(金)1", "src": "/item_assets/GoldHeart_", "isAnimated": true },
    "money1":     { "type": "", "name": "money1", "display_name": "10ゴールド1", "src": "", "isAnimated": true },
    "money3":     { "type": "", "name": "money3", "display_name": "100ゴールド1", "src": "", "isAnimated": true },
};
*/

/*
const ITEM_NAMES = {
    "gold":     { disp: "金塊1",            type: "ETC" },
    "sword":    { disp: "マニアックソード1",  type: "EQUIP" },
    "shield":   { disp: "トリシールド1",     type: "EQUIP" },
    "treasure": { disp: "ひみつの宝箱1",     type: "ETC" },
    "sweets":   { disp: "おいしいケーキ1",    type: "CONSUME" }
};
*/

/*
// 共通設定を流し込んでオブジェクトを作る
const STATIC_ITEMS = Object.fromEntries(
    Object.entries(ITEM_NAMES).map(([key, info]) => [
        key,
        {
            type: info.type,           // 直接取り出すだけ！
            name: key,
            display_name: info.disp,   // 直接取り出すだけ！
            src: `/item_assets/${key}.png`,
            isAnimated: false
        }
    ])
);
*/

// 📦 3. 送信用に合体させる
//const ITEM_CONFIG = { ...ANIMATED_ITEMS, ...STATIC_ITEMS };

// 🌟 レベルアップに必要な経験値のリスト（テーブル）
// index 0は使わず、index 1 = Lv1→2に必要な経験値 ... と設定します
const LEVEL_TABLE = [0, 12, 20, 35, 60, 100, 150, 210, 280, 360, 450];

// マップの構造データ
const MAP_DATA = {
  platforms: [
    { x: 50,  y: 450, w: 180, h: 20 },
    { x: 300, y: 300, w: 200, h: 20 }, 
    { x: 550, y: 150, w: 200, h: 20 } 
  ],
  ladders: [{ x: 580, y1: 130, y2: 565 }] // はしご
};

// プログラム全体で使う図鑑の変数（空で初期化）
let ENEMY_CATALOG = {};
// 🌟 外部から参照するための配列形式
let MONSTER_CONFIGS = [];

/**
 * データベースからモンスター図鑑を読み込む関数
 */
async function loadEnemyCatalog() {
    try {
        // SQL発行（enemy_catalogテーブルから全カラム取得）
        const [rows] = await pool.query("SELECT * FROM enemy_catalog");

        // 読み込んだデータを保持するための一時的な箱
        const newCatalog = {};
        const newConfigs = []; // 🌟 配列形式用

        rows.forEach(row => {
            // 🌟 デバッグ行：ID 20 のモンスターが読み込まれた際にログを出す
            if (row.enemy_id === 20) {
                console.log("--- 🐛 Debug: Monster ID 20 Data ---");
                console.log("raw row data:", row);
                console.log("expected image path:", `/assets/images/monsters/${row.image_folder}/${row.name}.png`);
                console.log("-------------------------------------");
            }

            // 1. 従来の ID をキーにしたオブジェクト形式 (ENEMY_CATALOG用)
            newCatalog[row.enemy_id] = {
                // 基本情報
                type: row.type,
                name: row.name,
                image_folder: row.image_folder, // 🌟 追加：モンスター画像のフォルダ名
                level: row.level,               // 🌟 追加：レベル
                is_boss: Boolean(row.is_boss),  // 🌟 追加：ボス判定 (0/1をtrue/falseに変換)
                
                // ステータス
                hp: row.hp,
                exp: row.exp,
                atk: row.atk,
                def: row.def,
                money: row.money,
                speed: row.speed,
                
                // 描画サイズ設定
                scale: row.scale,
                w: row.w,
                h: row.h,

                // 🌟 追加：アニメーションフレーム設定
                anim_idle: row.anim_idle,
                anim_walk: row.anim_walk,
                anim_attack: row.anim_attack,
                anim_death: row.anim_death,
                anim_jump: row.anim_jump,

                // 🌟 追加：更新日時（デバッグやキャッシュ管理用）
                updated_at: row.updated_at
            };

            // 2. 🌟 出力例の MONSTER_CONFIGS 形式に合わせたオブジェクトを配列に追加
            newConfigs.push({
                name: row.type,          // 例: 'tier1_1'
                id: row.name,            // 例: 'Char10'
                folder: row.image_folder, // 🌟 追加：画像フォルダ名
                death: row.anim_death,   // 18
                idle: row.anim_idle,     // 18
                attack: row.anim_attack, // 18
                jump: row.anim_jump,     // 0
                walk: row.anim_walk      // 18
            });
        });

        // グローバル変数（または上位スコープの変数）を更新
        ENEMY_CATALOG = newCatalog;
        MONSTER_CONFIGS = newConfigs; // 🌟 配列を反映
        
        console.log(`✅ モンスター図鑑を読み込みました (${Object.keys(ENEMY_CATALOG).length} 件)`);
        
        // 開発時の確認用（最初の1件のデータを表示）
        if (rows.length > 0) {
            const firstId = rows[0].enemy_id;
            console.log(`📊 サンプルデータ確認 [ID:${firstId}]:`, ENEMY_CATALOG[firstId]);
            console.log(`📊 MONSTER_CONFIGS 形式の確認:`, MONSTER_CONFIGS[0]);
        }
        
    } catch (error) {
        console.error("❌ モンスター図鑑の読み込みに失敗しました:", error);
        // 必要に応じて throw error; して呼び出し元に通知してください
    }
}

// サーバー起動時に実行
//loadEnemyCatalog();

const ENEMY_PLAN = [
  { plat: 0,    id: 30 }, 
  { plat: 1,    id: 31 }, 
  { plat: 1,    id: 31 }, 
  { plat: 2,    id: 32 }, 
  { plat: null, id: 20 }
];

// ==========================================
// 🌟 モンスターごとのドロップ設定
// ==========================================
const DROP_DATABASE = {
  "tier1_1":  { table: "drop2"},
  "tier1_2":  { table: "drop4"  },
  "tier1_3":  { table: "drop4"  },
  //"monster20": { table: "drop2"  },
};

const DROP_CHANCE_TABLES = {
  "drop1": { "default": 50, "gold_heart": 40, "money5": 20, "gold_one": 5 }, // 50%でドロップ、そのうち20%で金塊
  "drop2": { "default": 100, "medal1": 80, "shield": 90,　"sword": 90, "gold": 80 },
  "drop3": { "default": 50, "gold_heart": 40, "money6": 50 },
  "drop4": { "default": 80, "medal1": 80, "treasure": 80, "sweets": 80, "gold_heart": 40, "shield": 20 },
};

// ============================================================
// 🧠 [SECTION 4: LOGIC] 計算エンジン・判定ロジック
// 役割: 当たり判定、経験値計算、ドロップ抽選など「正誤」を決める計算
// ============================================================
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

/*
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
*/

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
  this.alive         = true;
  this.opacity       = 1;
  this.spawnAlpha    = 0;
  this.isFading      = false;
  this.deathFrame    = 0;

  // 2. 動作・タイマー
  this.kbV           = 0;
  this.isAttacking   = 0;
  this.isEnraged     = false;
  this.respawnTimer  = 0;
  this.waitTimer     = 0;
  this.offset        = 0;
  this.dir = Math.random() < 0.5 ? 1 : -1;

  // 3. 🛡️ ステータス読み込み（ENEMY_CATALOGから直接取得）
  // 自分のIDのデータがない場合は、安全のためにID:1のデータを参照
  const config = ENEMY_CATALOG[this.id] || ENEMY_CATALOG[1] || {};

  this.type  = config.type  || 'normal';
  this.scale = config.scale || 0.2;

  // DBの値を直接代入（値がない場合のデフォルト値を設定してエラーを防止）
  this.maxHp = config.hp    || 100;
  this.hp    = config.hp    || 100;
  this.atk   = config.atk   || 10;
  this.def   = config.def   || 0;
  this.speed = config.speed || 1.0;
  this.exp   = config.exp   || 0;
  this.money = config.money || 0;

  // 4. サイズ計算
  // ※ config.w や h が取得できなかった場合のためにデフォルトサイズ(50)を指定
  const baseW = config.w || 50;
  const baseH = config.h || 50;
  this.w = baseW * this.scale * 0.2;
  this.h = baseH * this.scale * 0.2;

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
    // 1. フェードアウト中（死亡演出中）の処理
    if (this.isFading) {
      if (++this.deathFrame > 40) {
        this.alive = false;          // 生存フラグをオフ
        this.isFading = false;       // フェード演出終了
        // プラットフォームの有無に応じて復活待機時間を設定
        this.respawnTimer = (this.platIndex === null) ? 300 : 150;
      }
      return true; // 死亡処理中のため、以降の更新をスキップ
    }

    // 2. 死亡状態（リスポーン待ち）の処理
    if (!this.alive) {
      if (--this.respawnTimer <= 0) {
        this.reset();                // パラメータの初期化
        // 特定のプラットフォーム上の場合、透明から開始
        if (this.platIndex !== null) this.opacity = 0;
      }
      return true; // 死亡中のため、以降の更新をスキップ
    }

    // 生存中の場合は false を返し、通常の更新処理を続行
    return false;
  }

  // 💥 ノックバック処理
  applyKnockback() {
    // 1. ノックバック速度が十分に小さくなったら停止
    if (Math.abs(this.kbV) < 0.1) {
      this.kbV = 0;
      return;
    }

    // 現在乗っているプラットフォームのデータを取得
    const p = (this.platIndex !== null) ? MAP_DATA.platforms[this.platIndex] : null;

    if (!p) {
      // 2. 空中（または地面なし）の場合：ワールド座標(x)を直接動かす
      this.x += this.kbV;
      // 画面外（0〜800）に出ないようにクランプ
      this.x = Math.max(0, Math.min(800 - this.w, this.x));
    } else {
      // 3. プラットフォーム上の場合：プラットフォーム内での相対位置(offset)を動かす
      this.offset += this.kbV;
      // プラットフォームの端から落ちないように制限
      this.offset = Math.max(0, Math.min(p.w - this.w, this.offset));
    }

    // 4. 摩擦・空気抵抗による速度減衰（毎フレーム 15% 減少）
    this.kbV *= 0.85;
  }

  // 🌟 ジャンプ・物理演算
  applyJumpPhysics() {
    // 1. 浮遊属性の判定（IDが30, 31, 32のキャラは浮いている）
    const isFloating = [30, 31, 32].includes(this.id);

    // 2. 空中にいる、またはジャンプ速度がある場合の処理
    if (this.jumpY < 0 || this.jumpV !== 0) {
      this.jumpV += 0.5;        // 重力を加算（落下速度が増す）
      this.jumpY += this.jumpV;  // 座標を更新

      // 地面（y=0）に着地した判定
      if (this.jumpY >= 0) {
        this.jumpY = 0;         // 座標を地面に固定
        this.jumpV = 0;         // 速度をリセット
      }
    } 
    // 3. 地上にいて、かつ浮遊キャラでない場合、低確率(1%)でジャンプ
    else if (!isFloating && Math.random() < 0.01) {
      this.jumpV = -7;          // 上方向への初速を与える
    }
  }

  // 🐾 AI移動ロジック
  updateAI() {
    // 1. 待機タイマーの処理（休憩中ならカウントダウンして終了）
    if (this.waitTimer > 0) {
      this.waitTimer--;
      return;
    }

    // プレイヤーリストを配列化して、最初のプレイヤーをターゲットに設定
    const playersArray = Object.values(players || {});
    const target = playersArray[0];

    // 2. 状態による分岐
    if (this.isEnraged && target) {
      // 怒り（追跡）状態：ターゲットに向かって移動
      this.moveTowardsTarget(target);
    } else {
      // 通常状態：巡回（パトロール）移動
      this.movePatrol();

      // 3. 巡回中の「気まぐれ」による状態変化（約1%の確率）
      if (Math.random() < 0.01) {
        // ランダムな待機時間を設定（50〜250フレーム）
        this.waitTimer = Math.floor(Math.random() * 200) + 50;
        // 次に動き出す時の向きをランダムに反転
        this.dir *= (Math.random() > 0.5 ? 1 : -1);
      }
    }
  }

  // 🏃 プレイヤーを追いかける
  moveTowardsTarget(target) {
    // 1. ターゲットの方向（左:-1, 右:1）を決定
    this.dir = (target.x < this.x) ? -1 : 1;
    
    // 追跡時は通常スピードの1.5倍で移動
    const moveStep = this.speed * 1.5 * this.dir;
    
    // 現在の足場情報を取得
    const p = (this.platIndex !== null) ? MAP_DATA.platforms[this.platIndex] : null;

    if (!p) {
      // 2. 空中（または地面なし）の場合の移動
      let nextX = this.x + moveStep;

      // ターゲットを通り過ぎないように位置を調整（追い越し防止）
      if (Math.abs(target.x - this.x) < Math.abs(moveStep)) {
        nextX = target.x;
      }

      // 指定された画面範囲内（400〜800-w）であれば座標を更新
      if (nextX > 400 && nextX < 800 - this.w) {
        this.x = nextX;
      }
    } else {
      // 3. プラットフォーム上の場合の移動
      this.offset += moveStep;

      // 足場の端に到達した場合の処理
      if (this.offset < 0 || this.offset > p.w - this.w) {
        // 座標を端に固定し、1秒間（60フレーム）立ち止まる
        this.offset = Math.max(0, Math.min(p.w - this.w, this.offset));
        this.waitTimer = 60;
      }
      
      // オフセットをワールド座標(x)に反映
      this.x = p.x + this.offset;
    }
  }

  // 🚶 巡回移動（パトロール）
  movePatrol() {
    // 現在乗っているプラットフォームのデータを取得
    const p = (this.platIndex !== null) ? MAP_DATA.platforms[this.platIndex] : null;

    if (!p) {
      // 1. 地面がない（空中・自由移動）場合：画面の左右端で反転
      this.x += this.speed * this.dir;

      // 左端に到達
      if (this.x < SETTINGS.SYSTEM.ENEMY_MIN_X) {
        this.x = SETTINGS.SYSTEM.ENEMY_MIN_X;
        this.dir = 1; // 右へ反転
      }
      // 右端に到達
      if (this.x > SETTINGS.SYSTEM.ENEMY_MAX_X - this.w) {
        this.x = SETTINGS.SYSTEM.ENEMY_MAX_X - this.w;
        this.dir = -1; // 左へ反転
      }
    } else {
      // 2. プラットフォーム上の場合：足場の端で反転＆一時停止
      this.offset += this.speed * this.dir;

      // 足場の左端に到達
      if (this.offset <= 0) {
        this.offset = 0.5;    // めり込み防止の微調整
        this.dir = 1;         // 右へ反転
        this.waitTimer = 40;  // 立ち止まって考える時間
      }
      // 足場の右端に到達
      else if (this.offset >= p.w - this.w) {
        this.offset = p.w - this.w - 0.5; // めり込み防止の微調整
        this.dir = -1;                    // 左へ反転
        this.waitTimer = 40;              // 立ち止まって考える時間
      }
    }
  }

  // 🎯 最終座標の決定
  calculateFinalPosition() {
    // 1. キャラクターの特性（浮遊しているかどうか）を判定
    const isFloating = [30, 31, 32].includes(this.id);
    const floatOffset = isFloating ? 12 : 0; // 浮遊キャラは地面から12px浮かせる

    // 現在の足場情報を取得
    const p = (this.platIndex !== null) ? MAP_DATA.platforms[this.platIndex] : null;

    if (!p) {
      // 2. 地面（プラットフォーム外）にいる場合
      // 基本の地面の高さから、自身の高さと浮遊オフセットを引く
      this.y = SETTINGS.SYSTEM.GROUND_Y - this.h - floatOffset;
    } else {
      // 3. プラットフォーム上にいる場合
      // リスポーン直後などで透明な場合、徐々に表示（フェードイン）
      if (this.opacity < 1) this.opacity += 0.02;

      // 足場の位置とオフセットから現在地を算出
      this.x = p.x + this.offset;
      this.y = p.y - this.h - floatOffset;
    }

    // 4. ジャンプによる高さの変化を最終的なY座標に加算
    this.y += (this.jumpY || 0);
  }
}

// --- ⚙️ チャンネル設定 ---
const MAX_CHANNELS = 5; 
// [1, 2, 3, 4, 5] という配列を作る
const CHANNELS = Array.from({ length: MAX_CHANNELS }, (_, i) => i + 1);

// --- 👾 チャンネル別・自動生成システム ---
// 1つの配列ではなく、チャンネルIDをキーにした「箱（オブジェクト）」にします
let enemies = {};
let droppedItems = {};

/**
 * 🌟 モンスターとドロップアイテムの初期化関数
 * (DBからカタログを読み込んだ後に実行する必要があります)
 */
function initMonsters() {
    CHANNELS.forEach(chId => {
        // チャンネルごとに、ENEMY_PLANに基づいて「新しいモンスターの群れ」を生成
        // 💡 踏襲ポイント：ご提示のロジックをそのまま使用しています
        enemies[chId] = ENEMY_PLAN.map(p => new Enemy(p.id, p.plat));
        
        // 各チャンネルごとのドロップアイテム用ポケットを用意
        droppedItems[chId] = [];
    });

    LOG.SYS(`✅ ${MAX_CHANNELS}チャンネル分の敵・ドロップ情報を初期化しました`);
}

/**
 * 🚀 サーバー起動の司令塔
 * 全てのDB読み込みが終わってからモンスターを配置し、サーバーを開始します
 */
async function startServer() {
    try {
        // --- 1. DBから全てのカタログを読み込む ---
        // これらが終わるまで await で待ちます
        await loadItemCatalogFromDB();
        await loadEnemyCatalog();

        // --- 2. データが揃った後にモンスターを配置 ---
        // 踏襲ポイント：既存の initMonsters() を呼び出します
        initMonsters();

        // --- 3. 最後にサーバーを起動 ---
        const PORT = process.env.PORT || 3000;
        
        // 🛡️ 二重起動を防ぐため、ここ以外の http.listen は削除してください
        http.listen(PORT, () => {
            console.log(`-----------------------------------------`);
            console.log(`🚀 Server running on http://localhost:${PORT}`);
            console.log(`📦 Item Catalog: Synced`);
            console.log(`👾 Monster Catalog: Synced`);
            console.log(`-----------------------------------------`);
        });

    } catch (err) {
        console.error("❌ サーバーの起動に失敗しました:", err);
        process.exit(1);
    }
}

// ==========================================
// プログラムの実行開始
// ==========================================
startServer();

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
 * 既存のロジック・確率・変数名を完全に維持した5ch対応版
 */
function spawnDropItems(enemy, chId) {
    try {
        // --- 1. 基本チェック ---
        // 🌟 修正：droppedItems[chId] が存在するかチェック
        if (!enemy || !chId || !droppedItems[chId]) return;

        // --- 2. ドロップテーブルの決定 ---
        const setting = DROP_DATABASE[enemy.type] || { table: "drop3" };
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
                ch: chId, // 🌟 どのチャンネルのアイテムか保持

                // 🌟 ここで強制的に値を代入
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
                // 🌟 ステータス合算ロジックもそのまま維持
                totalALLStats: (
                    ((stats.atk !== undefined) ? stats.atk : (catalogBase ? catalogBase.atk : 0)) +
                    ((stats.def !== undefined) ? stats.def : (catalogBase ? catalogBase.def : 0)) +
                    ((stats.matk !== undefined) ? stats.matk : (catalogBase ? catalogBase.matk : 0)) +
                    ((stats.str !== undefined) ? stats.str : (catalogBase ? catalogBase.str : 0)) +
                    ((stats.dex !== undefined) ? stats.dex : (catalogBase ? catalogBase.dex : 0)) +
                    ((stats.int !== undefined) ? stats.int : (catalogBase ? catalogBase.int : 0)) +
                    ((stats.luk !== undefined) ? stats.luk : (catalogBase ? catalogBase.luk : 0)) +
                    (((stats.maxHp !== undefined) ? stats.maxHp : (catalogBase ? catalogBase.maxHp : 0)) / 10) +
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

            // 🌟 修正：そのチャンネル専用のドロップリストに追加
            droppedItems[chId].push(newItem);
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

// ============================================================
// 🕹️ [SECTION 5: ACTION] プレイヤー行動・命令処理
// 役割: クライアントから届いた「攻撃」「取得」等の命令を実際に実行する場所
// ============================================================
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

    // 🌟 修正ポイント：既にログイン処理（socket.on('login')）で読み込まれたデータを一時退避
    const existingData = players[socket.id] || {};

    // 🌟 プレイヤーデータの作成
    players[socket.id] = {
        id: socket.id,
        name: name,
        channel: channel, // 🌟 【追加】選んだチャンネル(1〜5)を保存
        
        // 🌟 修正：DBに位置情報があればそれを使う、なければ初期値
        x: (existingData.x !== undefined) ? existingData.x : 50,
        y: (existingData.y !== undefined) ? existingData.y : 500,
        
        dir: 1,

        // 🌟 重要：ここがリセットの原因でした。DBから読み込んだ gold を引き継ぎます
        gold: (existingData.gold !== undefined) ? existingData.gold : 0,
        score: (existingData.score !== undefined) ? existingData.score : 0,
        
        // 🌟 修正：DBから読み込んだインベントリがあればそれを使う
        inventory: existingData.inventory || [],
        
        isAttacking: 0,
        
        // レベル継続処理（既存のデータがあれば引き継ぐ）
        level: (existingData.level !== undefined ? existingData.level : 1),
        exp: (existingData.exp !== undefined) ? existingData.exp : 0,
        maxExp: 100,

        // --- ⚔️ 今日決めた緻密なステータスを追加 ⚔️ ---
        // DBに保存されている値があればそれを使い、なければ初期値を設定
        str: existingData.str || 50,      // 初期攻撃力
        dex: existingData.dex || 4,       // 初期命中率
        luk: existingData.luk || 4,       // 初期幸運
        ap: (existingData.ap !== undefined) ? existingData.ap : 0,        // 振り分け可能な能力ポイント
        // ------------------------------------------

        // サイズ・HP設定（SETTINGSから取得）
        w: SETTINGS.PLAYER.DEFAULT_W * (SETTINGS.PLAYER.SCALE || 1.0),
        h: SETTINGS.PLAYER.DEFAULT_H * (SETTINGS.PLAYER.SCALE || 1.0),
        scale: SETTINGS.PLAYER.SCALE || 1.0,
        
        // 🌟 修正：HP・MP（現在値と最大値）をDBから引き継ぐ
        hp: (existingData.hp !== undefined) ? existingData.hp : 100,
        maxHp: (existingData.maxHp !== undefined) ? existingData.maxHp : 100,
        mp: (existingData.mp !== undefined) ? existingData.mp : 50,
        maxMp: (existingData.maxMp !== undefined) ? existingData.maxMp : 50,
        
        lastPickupTime: 0,
    };

    // 確認用のログ
    console.log(`[Join同期完了] ${name} (HP: ${players[socket.id].hp}/${players[socket.id].maxHp}, Gold: ${players[socket.id].gold})`);
}

/**
 * 2. プレイヤーが攻撃したときの処理（5ch対応・デバッグ枠同期＆連撃改善版）
 */
function handleAttack(socket, data) {
    const p = players[socket.id];
    if (!p) return; // プレイヤーがいなければ中止

    // 🌟 プレイヤーが所属しているチャンネルを取得
    const chId = p.channel || 1;
    // 🌟 そのチャンネルの敵リストのみを参照するように修正
    const currentEnemies = enemies[chId] || [];

    // 【ログ】ボタンが押されたことをサーバーが認識
    console.log(`[1.通信確認] ${p.name}(ch:${chId}) が攻撃しました`);

    // ハシゴを登っている間は攻撃できない
    if (p.isClimbing) return;

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
        // 一番下の地面にいる時：-85
        atkY = p.y - 85; 
    } else {
        // 空中の足場にいる時：-50
        atkY = p.y - 50;
    }

    const atkBox = {
        x: p.x + offsetX,
        y: atkY,
        w: atkWidth,
        h: atkHeight
    };

    // 🌟 修正：全体の enemies ではなく、現在のチャンネルの敵をループ
    currentEnemies.forEach((target) => {
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

        // 🌟 【音の同期用】同じ部屋(チャンネル)の全員にのみ「ヒット通知」を送る
        io.to(`channel_${chId}`).emit('enemy_hit_sync', { 
            enemyId: nearest.id, 
            attackerId: socket.id,
            isDead: isFatalBlow 
        });
        
        console.log(`[2.命中確認] ch:${chId}の${nearest.type}に${damage}ダメージ。残りHP: ${nearest.hp}`);

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

        // 画面に「バシッ！」というダメージエフェクトを同じチャンネルの全員に送る
        io.to(`channel_${chId}`).emit('damage_effect', {
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
            
            // 🌟 修正：アイテムドロップ関数に現在のチャンネルIDを渡す
            spawnDropItems(nearest, chId);
            
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
 * 3. アイテムを拾ったときの処理（5ch対応・安全装置付き）
 * --------------------------------------------------
 * 役割：地面のアイテムを拾い、カバンや財布へ振り分けます。
 */
function handlePickup(socket, itemId) {
    // 🛡️ 安全装置：関数全体を大きな try-catch で囲みます
    try {
        const player = players[socket.id];
        
        // 🛡️ ガード：プレイヤーが存在しない、またはitemIdが空の場合は何もしない
        if (!player || !itemId) return;

        // 🌟 プレイヤーが所属しているチャンネルを取得
        const chId = player.channel || 1;
        // 🌟 そのチャンネルのアイテムリストを取得
        const currentItems = droppedItems[chId] || [];

        // クールタイムのチェック
        const now = Date.now();
        if (player.lastPickupTime && (now - player.lastPickupTime < 150)) {
            return; 
        }

        // 🛡️ ガード：そのチャンネルのアイテムリスト自体が存在するか確認
        if (!currentItems) return;

        // 🌟 修正：全体の droppedItems ではなく currentItems から探す
        const item = currentItems.find(it => it.id === itemId);
        
        // 🛡️ ガード：アイテムが見つからない、または既に拾われている場合は終了
        if (!item || item.isPickedUp) return;
        
        // --- 🌟 デバッグログ（現在の状態を確認するために維持） ---
        if (item.id === itemId) {
            const dx_debug = Math.abs(player.x - item.x);
            const dy_debug = Math.abs(player.y - item.y);
            console.log(`--- [ch:${chId} 拾う判定のチェック] ---`);
            console.log(`横の差: ${Math.floor(dx_debug)} (基準:${SETTINGS.ITEM.PICKUP_RANGE_X})`);
            console.log(`縦の差: ${Math.floor(dy_debug)} (基準:${SETTINGS.ITEM.PICKUP_RANGE_Y})`);
            if (item.timer) console.log(`タイマー残数: ${item.timer}`);
        }

        // 🌟 距離判定
        let dx = Math.abs(player.x - item.x);
        let dy = Math.abs(player.y - item.y);

        // --- 🌟 タイムラグ＆移動対策 🌟 ---
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

        // 🌟 修正：そのチャンネルのリストからインデックスを探す
        const idx = currentItems.findIndex(it => it.id === itemId);
        if (idx !== -1) {
            // 🌟 修正：そのchの配列から取り出す
            const removedItem = currentItems.splice(idx, 1)[0];

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
                // 🌟 同期をそのチャンネルに限定
                io.to(`channel_${chId}`).emit('player_update', player);
            }

            // --- 🌟 エフェクト同期の修正 🌟 ---
            if (typeof lastPickedItems !== 'undefined') {
                lastPickedItems.push({
                    type: removedItem.type,
                    x: (removedItem.x && removedItem.x !== 0) ? removedItem.x : player.x,
                    y: (removedItem.y && removedItem.y !== 0) ? removedItem.y : player.y,
                    pickerId: socket.id,
                    totalALLStats: removedItem.totalALLStats || 0,
                    totalFirstStats: removedItem.totalFirstStats || 0,
                    ch: chId // 🌟 ここでチャンネルIDを記録
                });
            }

            // ⚡ 即時反映させたい場合は以下を有効にするとさらに確実です
            // io.to(`room_ch_${chId}`).emit('item_picked_effect', { ... });

            // カバンの初期化（なければ10枠確保）
            if (!player.inventory) player.inventory = Array(10).fill(null); 

            // 🌟 【判定A】カバンに入るアイテムのリスト
            const inventoryTypes = ['shield', 'gold', 'treasure', 'money7', 'sword', 'sweets'];

            if (inventoryTypes.includes(removedItem.type)) {
                let stacked = false;
                const actualCount = removedItem.count || removedItem.amount || 1;
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
                        socket.emit('chat', {
                            id: 'SYSTEM_LOG',
                            name: '🎊 入手',
                            text: `[${new Date().toLocaleTimeString()}] ${pickupMsg}`
                        });
                        socket.emit('item_pickup_log', { amount: actualCount, itemName: itemName });
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
                            ...removedItem,
                            type: removedItem.type, 
                            count: actualCount, 
                            atk: (removedItem.atk !== undefined) ? removedItem.atk : ((removedItem.type === 'sword') ? 10 : 0), 
                            def: (removedItem.def !== undefined) ? removedItem.def : ((removedItem.type === 'shield') ? 5 : 0)
                        };
                        socket.emit('chat', {
                            id: 'SYSTEM_LOG',
                            name: '🎊 入手',
                            text: `[${new Date().toLocaleTimeString()}] ${pickupMsg}`
                        });
                        socket.emit('item_pickup_log', { amount: actualCount, itemName: itemName });
                    } else {
                        console.log("カバンがいっぱいです！");
                    }
                }
            } else {
                const points = (removedItem.type === 'money3' ? 100 : 10);
                player.score = (player.score || 0) + points;
            }

            socket.emit('inventory_update', player.inventory);
            
            // 🌟 sendStateを呼び出す
            if (typeof sendState === 'function') {
                sendState(); 
            }
        }
    } catch (error) {
        console.error("❌ [CRITICAL] handlePickup内でエラーが発生しました:", error);
    }
}

/**
 * 4. プレイヤーのダメージ同期と復活処理（5ch対応・安全装置付き）
 * --------------------------------------------------
 * 役割：モンスターからのダメージを計算し、HPが0になったら初期位置にリスポーンさせます。
 */
function handlePlayerDamaged(socket, data) {
    // 🛡️ 安全装置：関数全体をtry-catchで保護
    try {
        const p = players[socket.id];
        if (!p) return;

        // 🌟 プレイヤーの所属チャンネルを取得
        const chId = p.channel || 1;
        // 🌟 そのチャンネルの敵リストを特定（enemies[chId] は配列）
        const currentEnemies = enemies[chId] || [];

        // 🌟 修正：全体の enemies ではなく currentEnemies から探す
        let attacker = currentEnemies.find(en => en.id === data.monsterId);
        
        // もし ID で見つからなければ、近くにいる「生きている敵」を一人探す
        if (!attacker) {
            attacker = currentEnemies.find(en => en.alive && Math.abs(en.x - p.x) < 150);
        }
        
        // カタログの atk (50など) を優先し、なければ 10 にする
        const damageValue = attacker ? (attacker.atk || 5) : 10;
        
        debugChat(`[ダメージ判定] ch:${chId} 攻撃者: ${attacker ? attacker.type : '不明'}, ダメージ: ${damageValue}`, 'error');

        // 🛡️ 数値のガード：HPが万が一 NaN(非数) にならないよう Number() で保証
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
            if (typeof sendState === 'function') {
                sendState();
            }
        }

        // 🌟 修正：エフェクト表示を「そのチャンネルの部屋」だけに限定して送信
        io.to(`channel_${chId}`).emit('damage_effect', { 
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
        const channelRoom = `channel_${p.channel}`;
        
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

// ============================================================
// 📡 [SECTION 6: NETWORK] 通信ハンドラ (Socket.io)
// 役割: クライアントとの接続(connection)やパケット送受信の窓口
// ============================================================


// ============================================================
// 🎨 [SECTION 7: BROADCAST] 同期エンジン・メインループ
// 役割: 全員へのデータ一斉送信と、時間経過による状態更新の定時実行
// ============================================================


/**
 * 📡 状態送信用の共通関数（チャンネルごとに個別の世界状況を伝える）
 */
function sendState() {
    try {
        if (!players) return;

        // 🌟 1番から5番のチャンネルに対して送信
        for (let i = 1; i <= 5; i++) {
            // 🌟 【修正ポイント】join時と同じ名前 `room_ch_数字` にします
            const roomName = `channel_${i}`;

            // 👥 そのチャンネルにいるプレイヤーだけを抽出
            const roomPlayers = {};
            for (let id in players) {
                if (players[id].channel === i) {
                    roomPlayers[id] = players[id];
                }
            }

            // 👾 そのチャンネルの敵データを取得（なければ空配列）
            const channelEnemies = enemies[i] || [];
            
            // 💎 そのチャンネルのドロップアイテムを取得（なければ空配列）
            const channelDrops = droppedItems[i] || [];

            // ✨ 🌟 【新規追加】そのチャンネルで発生したエフェクトだけを抽出
            // handlePickup側で lastPickedItems.push({ ..., ch: chId }) している前提です
            const roomPickedItems = lastPickedItems.filter(item => item.ch === i);

            // 📡 この部屋（roomName）に入っている人だけに、足場や敵の情報を送る
            io.to(roomName).emit('state', {
                players: roomPlayers,
                // 🌟 修正：全体の箱ではなく、そのチャンネルのアイテムを送る
                items: channelDrops, 
                // 🌟 修正：全体の箱ではなく、そのチャンネルの敵をmapする
                enemies: channelEnemies.map(en => ({
                    ...en,
                    jumpY: en.jumpY || 0,
                    isJumping: (en.jumpY || 0) !== 0
                })),
                platforms: MAP_DATA.platforms, // 🧱 これで足場が復活します
                ladders: MAP_DATA.ladders,     // 🪜 これでハシゴが復活します
                // ✨ 🌟 修正：全体ではなく、このチャンネルのエフェクトだけを送る
                lastPickedItems: roomPickedItems
            });
        }

        // リセット処理
        lastPickedItems = [];

    } catch (error) {
        console.error("❌ [CRITICAL] sendState関数内でエラーが発生しました:", error);
    }
}

setInterval(() => {
    // ...既存の処理...
    broadcastUserCounts(); // 🌟 人数情報を放送
}, 1000); // 1秒に1回くらいで十分です

/**
 * 👾 敵(Enemies)の状態更新（5ch対応版）
 */
function updateEnemies() {
    // 1. まず全チャンネル(1〜5)を順番にループする
    CHANNELS.forEach(chId => {
        const currentEnemies = enemies[chId];
        
        // 🛡️ ガード：そのチャンネルのデータがなければスキップ
        if (!currentEnemies || !Array.isArray(currentEnemies)) return;

        // 2. そのチャンネル内のモンスター配列をループする
        currentEnemies.forEach((e, index) => {
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
                console.error(`[ENEMY ERROR] ch:${chId}, index:${index}, ID:${e.id}`, err);
            }
        });

        // 3. 🌟 重要：そのチャンネル（Room）にいるプレイヤーだけに、そのchの敵データを送る
        // これにより、別のchの敵が画面に映るのを防ぎます
        io.to(`channel_${chId}`).emit('update_enemies', currentEnemies);
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
 * 💎 アイテムの物理計算（5ch対応・サーバーとクライアントで数値を完全一致させた版）
 */
function updateItems() {
    // 1. 全チャンネル(1〜5)を順番にループする
    CHANNELS.forEach(chId => {
        const currentItems = droppedItems[chId];

        // 🛡️ ガード：そのチャンネルのデータがなければスキップ
        if (!currentItems || !Array.isArray(currentItems)) return;

        // 2. そのチャンネル内のアイテム配列をループする
        currentItems.forEach((it) => {
            // landed（着地済み）なら物理計算をスキップ
            if (!it || it.landed) return;

            // --- 物理計算ロジック（そのまま踏襲） ---
            
            // 1. 移動計算 (数値は SETTINGS から取るのがベスト)
            it.vx = it.vx || 0;
            it.vy = it.vy || 0;
            it.x += it.vx;
            it.y += it.vy;
            it.vy += 0.5;  // 重力を 0.5 に統一
            it.vx *= 0.98; // 摩擦を 0.98 に統一

            const groundY = 565; // 正解の数値
            const itemSize = 32;
            const offset = 10;   // 足場判定の遊びを統一

            // 2. 地面着地
            if (it.y + itemSize > groundY && it.vy > 0) {
                it.y = groundY - itemSize;
                // 🌟 handleItemLanding内で landed=true になる仕様を維持
                handleItemLanding(it, groundY); 
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

        // 3. 🌟 重要：そのチャンネル（Room）にいるプレイヤーだけに、そのchのドロップ情報を送る
        io.to(`channel_${chId}`).emit('update_drops', currentItems);
    });
}

// 🌟 修正：日本時間を生成する関数（使い回せるように外に出してもOK）
function getJSTDate() {
    const now = new Date();
    // 日本時間に変換したDateオブジェクトを返す
    return new Date(now.getTime() + (9 * 60 * 60 * 1000));
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

//http.listen(PORT, () => console.log('Server is running...'));

// ==========================================
// 📢 【最強のデバッグ関数・改】（安全装置つき）
// ==========================================

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

// ==========================================
// ⚙️ 2. サーバーの基本設定
// ==========================================

// ==========================================
// 🚀 3. サーバーの起動
// ==========================================
// ※ この下に socket.io の通信処理（io.on('connection', ...) など）を記述します
// ※ 最後に http.listen(PORT, ...) で待ち受けを開始します

// ==========================================
// 🛠️ 【初心者用】ゲームの設定エリア
// ここを書き換えるだけで、ゲームのバランスが変わります
// ==========================================

// 確認用ログ（不要なら消してください）

// 🌟 【修正】サーバー側で名前を確実に解決する（sword を追加）

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

// ==========================================
// 📞 イベントハンドラ（各アクションの具体的な中身）
// ==========================================

// 既存の setInterval の中（updatePlayersなどの後）に追加

// ==========================================
// 🛠️ 各更新処理の定義（関数化）
// ==========================================

// server.js の末尾など