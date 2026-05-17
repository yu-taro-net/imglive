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

// ============================================================
// 🌐 【動的CORS対応】50以上のドメインをDBから自動判定する関数（デバッグログ強化版）
// ============================================================
const checkDynamicOrigin = async (origin, callback) => {
    // 🛡️ 1. ローカル環境、またはoriginが未定義（同一サーバー内通信など）の場合は無条件で許可
    if (!origin || 
        origin.includes("localhost") || 
        origin.includes("127.0.0.1") || 
        origin.startsWith("file://")) {
        
        // 📢 デバッグログ：ローカル環境のため自動通過したことを記録
        console.log(`[CORS LOCAL] 本物のローカル環境または内部通信のため無条件で許可しました: ${origin || '未定義(Internal)'}`);
        return callback(null, true);
    }

    try {
        // 🗄️ 2. アクセスしてきたドメインが、MySQLの許可リストテーブルに登録されているか検索
        // ※「pool」または「db」など、お使いのmysql接続オブジェクト名に合わせてください
        const [rows] = await db.query("SELECT id FROM allowed_domains WHERE domain = ? LIMIT 1", [origin]);
        
        // 📢 デバッグログ：実際にDBへ検証しに行ったドメインと、返ってきた行数を記録
        console.log(`[CORS CHECK] DB照合中... 判定ドメイン: ${origin} / 登録一致数: ${rows.length}`);
        
        if (rows.length > 0) {
            // リストに存在すれば通信を許可！
            // 📢 デバッグログ：正常にDBに登録されていた場合
            console.log(`[CORS SUCCESS] ✅ 通信許可: リストに登録されている正規のドメインです: ${origin}`);
            callback(null, true);
        } else {
            // リストにない怪しいドメインは遮断（セキュリティガード）
            // 📢 デバッグログ：リストになく遮断された場合（オリジナルを引き継ぎつつ強化）
            console.log(`[CORS BLOCK] ❌ 通信拒否: 許可リストにない未登録ドメインからのアクセスを遮断しました: ${origin}`);
            callback(new Error("Not allowed by CORS"), false);
        }
    } catch (err) {
        // 万が一、DBエラーが起きた場合は安全のために一旦ログを吐いて接続を拒否する、
        // もしくは開発中なら「callback(null, true)」にして救済する仕様にもできます
        console.error("CORS判定中のDBエラー:", err);
        callback(err, false);
    }
};

// ============================================================
// 【重要】リアルタイム通信（Socket.io）の設定（完全踏襲・動的CORS版）
// ============================================================
const io = require('socket.io')(http, {
  cors: {
    // 🌟 修正ポイント：固定の配列ではなく、上記の動的チェック関数を割り当てる
    origin: checkDynamicOrigin,
    // データのやり取り方法（GETとPOST）を許可（オリジナルを完全踏襲）
    methods: ["GET", "POST"],
    // クッキーなどの認証情報を送受信できるようにする（オリジナルを完全踏襲）
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

// ⚔️ 戦闘計算エンジン
const COMBAT_FORMULA = {
    // 熟練度（最小ダメージの割合。0.6 = 60%）
    MASTERY: 0.6,
    
    // 最大ダメージ計算 (STR*4 + DEX) * ATK / 10
    calcMaxDamage: (p) => {
        const str = p.str || 4;
        const dex = p.dex || 4;
        const atk = p.weaponAtk || 10;
        return Math.floor(((str * 4) + dex) * atk / 10);
    },

    // 最終ダメージ決定（振れ幅を含む）
    generateDamage: function(p) {
        const maxDmg = this.calcMaxDamage(p);
        const minDmg = Math.floor(maxDmg * this.MASTERY);
        const damage = Math.floor(Math.random() * (maxDmg - minDmg + 1)) + minDmg;
        
        return {
            val: damage,
            max: maxDmg,
            min: minDmg,
            isCritical: damage >= Math.floor(maxDmg * 0.9) // 最大の90%以上でクリ演出
        };
    }
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

            // 🌟 インベントリと装備詳細をDBから読み込む
            const savedInventory = await loadUserInventory(user.id);

            // 🛠【修正】インベントリを常に10枠の固定長配列に整形する
            const fixedInventory = Array(10).fill(null);
            savedInventory.forEach((item) => {
                const sIdx = item.slot_index; 
                if (sIdx !== undefined && sIdx !== null && sIdx >= 0 && sIdx < 10) {
                    fixedInventory[sIdx] = item;
                }
            });

            // 🌟 追記：選択されたチャンネルを確定
            const selectedChannel = parseInt(channel) || 1;
            const roomName = `channel_${selectedChannel}`;

            // ------------------------------------------------------------
            // 🌟 修正：最新の最大HPテーブルから正しい値を算出
            // ------------------------------------------------------------
            const correctMaxHP = MAX_HP_TABLE[stats.level] || stats.max_hp;
            // 現在のHPが新しい最大HPを超えないように調整
            const adjustedCurrentHP = stats.hp > correctMaxHP ? correctMaxHP : stats.hp;

            // ------------------------------------------------------------
            // 🌟 踏襲：サーバー側のメモリ(players)にDBのデータを同期する
            // ------------------------------------------------------------
            players[socket.id] = {
                dbId: user.id,
                id: user.id,
                name: user.username,
                // 🌟 追記：メモリ上にも現在のチャンネルを保存
                channel: selectedChannel,
                gold: Number(stats.gold || 0),
                level: stats.level,
                exp: stats.exp,
                hp: adjustedCurrentHP,       // 🌟 修正後のHP
                maxHp: correctMaxHP,        // 🌟 テーブルから取得した正しい最大HP
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
                // 🌟 修正：整形済みのインベントリを反映
                inventory: fixedInventory, 
                lastPickupTime: 0,
				// 🌟 追加：露店システム用の初期状態
                is_vending: false,      // 自分が店を開いているか
                vending_title: ""      // 看板に表示する店名
            };

            // 🌟 肝：このソケットをチャンネル専用の「部屋」に参加させる
            socket.join(roomName);

            // 3. 認証成功のレスポンス（DBから読み込んだステータスを同封）
            socket.emit('login_response', {
                success: true,
                id: user.id,
                username: user.username,
                channel: selectedChannel,
                stats: {
                    level: stats.level,
                    exp: stats.exp,
                    hp: players[socket.id].hp,      // 🌟 同期済みメモリから取得
                    max_hp: players[socket.id].maxHp, // 🌟 同期済みメモリから取得
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
                    ap: stats.ap || 0,
                    // 🌟 修正：整形済みのインベントリ状態を送る
                    inventory: fixedInventory
                },
                message: 'ログイン成功！'
            });

            // 🛠【追加修正】明示的にインベントリ更新イベントを個別に送信
            socket.emit('inventory_update', fixedInventory);

            // 🌟 追記：同じチャンネルにいる「他のプレイヤー」にだけ新入生を通知
            socket.to(roomName).emit('player_joined', players[socket.id]);

            LOG.DB(`ログイン成功: ${user.username} (Lv.${stats.level}) -> ${roomName} (MaxHP補正: ${correctMaxHP})`);

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
        // 🌟 システムエラー
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
    // 🌟 【デバッグ：受信データ全出力】 クライアントから届いた中身をすべて表示
    console.log("--- 📥 [DEBUG: 受信データ詳細] ---");
    console.log(data);

    // data には { userId, level, exp, gold, hp, maxHp, mp, maxMp, mapId, x, y, str, dex, luk, ap } が入っている想定
    const { userId, level, exp, gold, hp, maxHp, mp, maxMp, mapId, x, y, str, dex, luk, ap } = data;

    if (!userId) return;

    // 🌟 修正ポイント：
    // クライアントから送られた userId (文字列) をキーにするのではなく、
    // 今まさに通信している socket.id を使ってメモリ(players)から本人を探します。
    const player = players[socket.id]; 

    // 🌟 【デバッグ：プレイヤー特定情報の出力】
    console.log("--- 🔍 [DEBUG: 照合プレイヤー情報] ---");
    if (player) {
        console.table({
            "Socket ID": socket.id,
            "プレイヤー名": player.name,
            "DB数値ID (dbId)": player.dbId || "⚠️未定義",
            "受信したUserId": userId
        });
    } else {
        console.warn(`[DEBUG:SAVE] players[${socket.id}] が見つかりません。保存を中止します。`);
        return;
    }

    if (!player || !player.dbId) {
        // ログインが完了していない場合は保存をスキップ
        return;
    }

    // 固定の 10 ではなく、ログインしている本人の数値IDを代入
    const dbUserId = player.dbId; 

    // 🌟 【デバッグ：SQLに送る最終値の一覧】
    const saveParams = [level, exp, gold, hp, maxHp, mp, maxMp, mapId, x, y, str, dex, luk, ap, dbUserId];
    console.log("--- 🚀 [DEBUG: SQL送信パラメータ] ---");
    console.log(saveParams);

    // 🌟 UPDATE文の構造はそのまま踏襲
    const sql = `
        UPDATE player_stats 
        SET level = ?, exp = ?, gold = ?, hp = ?, max_hp = ?, mp = ?, max_mp = ?, 
            map_id = ?, pos_x = ?, pos_y = ?, str = ?, dex = ?, luk = ?, ap = ?
        WHERE user_id = ?
    `;

    // 🌟 引数の順番を維持しつつ、最後の値を自動取得した dbUserId に差し替え
    pool.query(sql, saveParams, (err, result) => {
        if (err) {
            // エラーログの出力形式も踏襲
            if (typeof LOG !== 'undefined' && LOG.DB) {
                LOG.DB(`セーブ失敗 (DB_ID: ${dbUserId}): ${err.message}`);
            } else {
                console.error(`[DB ERROR] セーブ失敗 (DB_ID: ${dbUserId}): ${err.message}`);
            }
            return;
        }

        // 🌟 保存が成功したかどうかのログを出力
        if (result && result.affectedRows > 0) {
            // 成功の確証が欲しい場合は、ここのコメントを外してください
            console.log(`✅ [SAVE SUCCESS] ${player.name} (DB_ID: ${dbUserId}) の保存に成功しました`);
        } else {
            console.warn(`⚠️ [SAVE WARNING] DB ID: ${dbUserId} が見つかりませんでした (affectedRows: 0)`);
        }
    });
});

        // ------------------------------------------
// 👋 接続解除 (Disconnect)
// ------------------------------------------
socket.on('disconnect', () => {
    LOG.SYS(`ユーザーが切断しました: ${socket.id}`);
    try {
        const p = players[socket.id];
        const name = p ? p.name : socket.id;

        // 🌟 露店を開設していた場合、全体リストから削除する
        if (active_venders[socket.id]) {
            delete active_venders[socket.id];
            LOG.SYS(`[Vending] 切断に伴い露店を閉鎖しました: ${name}`);
            
            // ✅ 【追加】閲覧中の全ユーザーに閉店を通知
            // これによりフロント側の socket.on('vending_closed') が発火します
            io.emit('vending_closed', { id: socket.id });
        }

        debugChat(`📴 切断されました: ${name}`);

        // プレイヤーデータの削除とリスト更新
        delete players[socket.id];
        emitPlayerList();

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

                    // 🌟 追加：【全チャンネル対応】ログイン通知を全員（io.emit）に飛ばす
                    // これにより、別チャンネルにいるユーザーの画面にも通知が表示されます
                    io.emit('globalNotification', {
                        message: `${p.name} がログインしました。`,
                        color: "#FFFFFF",
						senderId: socket.id, // 🌟 これを自分自身で判定するために追加
                        type: 'LOGIN'
                    });
					
					emitPlayerList();

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

        // 🌟 修正：店名の上書きを防止
        // 露店状態（看板を出すかどうか）のフラグだけ同期し、
        // タイトルは open_vending イベントに任せる
        if (data.is_vending !== undefined) {
            p.is_vending = data.is_vending;
        }
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

    // 🌟 追加：まず「コマンド」かどうかを判定する
    // executeAdminCommand が true を返せば、以降のチャット配信処理をスキップします
    if (executeAdminCommand(socket, p, chatObj.text)) {
        return; 
    }

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
            
            // 🌟 修正： .ch ではなく .channel を参照するように書き換え
            const targetChNum = targetPlayer.channel || 1;
            const myChNum = p.channel || 1;

            const targetCh = `[CH.${targetChNum}]`;
            const myCh = `[CH.${myChNum}]`;

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
            // 🌟 ここも自分の現在のチャンネルを出すように修正
            const myChNum = p.channel || 1;
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
        // 🌟 ここも .channel を参照
        const myChNum = p.channel || 1;
        const myCh = `[CH.${myChNum}]`;
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
		
		// --- チャンネル変更処理（既存ロジックを完全踏襲） ---
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

    // 🌟 追記：全チャンネル対応のプレイヤーリストを更新して全員に通知
    if (typeof emitPlayerList === 'function') {
        emitPlayerList();
    }
    
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

// server.js 内の socket 通信部分
socket.on('drop_gold', (data) => {
    const player = players[socket.id];
    if (!player) return;

    const amount = parseInt(data.amount);
    
    // 🌟 不正チェック
    if (isNaN(amount) || amount <= 0) return;
    if (player.gold < amount) {
        socket.emit('chat', { 
            id: 'SYSTEM_LOG', 
            name: '⚠️ 警告', 
            text: `[${new Date().toLocaleTimeString()}] 所持金が足りません！` 
        });
        return;
    }

    // 1. プレイヤーの所持金を減らす
    player.gold -= amount;

    // 2. 地面にアイテムとして生成（droppedItemsに追加）
    const chId = player.channel || 1;
    const newItem = {
        id: Date.now() + Math.random(), // 固有ID
        type: 'medal1',                // ゴールド用の見た目タイプ
        goldValue: amount,             // 拾った時に増える金額
        isPlayerDrop: true,            // 🌟 プレイヤーが捨てたものだと判別するためのフラグ
        x: player.x,
        y: player.y,
        landed: true,
        isPickedUp: false
    };

    if (!droppedItems[chId]) droppedItems[chId] = [];
    droppedItems[chId].push(newItem);

    // 3. 全員に更新を通知
    io.to(`channel_${chId}`).emit('item_dropped', newItem);
    socket.emit('player_update', player); // 自分の所持金表示を更新

    // 🌟 修正：「-100G手に入れました」と出ないように gold_log を無効化し、チャット通知にする
    // socket.emit('gold_log', { amount: -amount }); 
    socket.emit('chat', { 
        id: 'SYSTEM_LOG', 
        name: '情報', 
        text: `[${new Date().toLocaleTimeString()}] ${amount}メルを捨てました。` 
    });
});

        // 📥 10. アイテムを捨てた時 (dropItem) - 複数個対応＆DB保存版
socket.on('dropItem', async (data) => {
    try {
        const player = players[socket.id];
        // プレイヤーが存在しない、またはDB IDがない場合は中断
        if (!player || !player.inventory || !player.dbId) return;

        const chId = player.channel || 1;
        const index = (typeof data === 'object') ? data.index : data;
        const requestedAmount = (typeof data === 'object') ? data.amount : null;

        if (player.inventory[index]) {
            const itemToDrop = player.inventory[index];
            const maxCount = itemToDrop.count || itemToDrop.amount || 1;
            const actualDropCount = (requestedAmount !== null)
                ? Math.min(Math.max(1, requestedAmount), maxCount)
                : maxCount;

            // 🌟 修正：アイテム種別の判定とIDの取得
            const isEquipment = ['sword', 'shield', 'equip'].includes(String(itemToDrop.type).toLowerCase());
            // instanceId, id, db_id のいずれかからIDを取得
            const targetDbId = itemToDrop.instanceId || itemToDrop.id || itemToDrop.db_id;

            // 🚨 装備品なのにIDがどこにもない場合のみエラーを投げる
            if (isEquipment && !targetDbId) {
                throw new Error(`DB更新用IDが見つかりません (Item: ${itemToDrop.type})`);
            }

            // ------------------------------------------------------------
            // 🗄️ データベース同期処理 (user_inventoryテーブルの更新)
            // ------------------------------------------------------------
            // 🌟 修正：カラム名を 'user_id' と 'slot_index' に統一して操作
            if (actualDropCount >= maxCount) {
                // 全数捨てる場合はレコードを削除
                await pool.query(
                    'DELETE FROM user_inventory WHERE user_id = ? AND slot_index = ?', 
                    [player.dbId, index]
                );
            } else {
                // 一部捨てる場合は数量を減らす更新
                await pool.query(
                    'UPDATE user_inventory SET quantity = quantity - ? WHERE user_id = ? AND slot_index = ?', 
                    [actualDropCount, player.dbId, index]
                );
            }

            // ------------------------------------------------------------
            // 🌟 踏襲：ログ用メッセージ作成
            // ------------------------------------------------------------
            let itemName = (typeof SERVER_ITEM_NAMES !== 'undefined' && SERVER_ITEM_NAMES[itemToDrop.type]) 
                            || itemToDrop.displayName || itemToDrop.name || 'アイテム';
            const dropLogMsg = actualDropCount >= 2
                ? `${itemName}を${actualDropCount}個捨てました`
                : `${itemName}を捨てました`;

            const catalogId = (itemToDrop.type === 'sword') ? 101 : (itemToDrop.type === 'shield' ? 102 : null);
            const catalogBase = (catalogId && typeof ITEM_CATALOG !== 'undefined') ? ITEM_CATALOG[catalogId] : {};

            // ------------------------------------------------------------
            // 🌟 踏襲：フィールドにドロップするアイテムオブジェクト(newItem)作成
            // ------------------------------------------------------------
            const newItem = {
                id: Math.floor(Math.random() * 1000000), // フィールド上の識別用
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
                ),
                instanceId: isEquipment ? targetDbId : null // 🌟 拾い直し用にIDを保持
            };

            // フィールドリストに追加と通知
            if (droppedItems[chId]) {
                droppedItems[chId].push(newItem);
                socket.emit('chat', {
                    id: 'SYSTEM_LOG',
                    name: '🗑️ 廃棄',
                    text: `[${new Date().toLocaleTimeString()}] ${dropLogMsg}`
                });
                io.to(`channel_${chId}`).emit('item_spawned', newItem);
            }

            // ------------------------------------------------------------
            // 🌟 踏襲：サーバーメモリ(inventory配列)の更新
            // ------------------------------------------------------------
            if (actualDropCount < maxCount) {
                // 部分廃棄の場合
                if (itemToDrop.count !== undefined) {
                    itemToDrop.count -= actualDropCount;
                } else if (itemToDrop.amount !== undefined) {
                    itemToDrop.amount -= actualDropCount;
                } else {
                    player.inventory[index] = null;
                }
            } else {
                // 全数廃棄の場合
                player.inventory[index] = null;
            }

            // クライアントへ同期
            socket.emit('inventory_update', player.inventory);
            if (typeof sendState === 'function') sendState();
            
            // ログ出力（既存の形式を維持）
            if (typeof LOG !== 'undefined' && LOG.DB) {
                LOG.DB(`アイテムドロップ完了(DB同期済み): ${player.name} が ${itemName} x ${actualDropCount} を捨てました。`);
            } else {
                console.log(`[DROP_DONE] ${player.name} が ${itemName} x ${actualDropCount} を捨てました。`);
            }
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
socket.on('swapItems', async (data) => {
    try {
        const player = players[socket.id];
        // 🌟 プレイヤーが存在しない、またはDBのIDが特定できない場合は中断
        // player.dbId または player.db_id のどちらかに有効な数値が入っていることを前提とします
        const userId = player.dbId || player.db_id;
        if (!player || !player.inventory || !userId) return;

        const from = parseInt(data.from);
        const to = parseInt(data.to);

        // 範囲チェック（0〜9枠）かつ、同じ場所への移動でないこと
        if (from >= 0 && from < 10 && to >= 0 && to < 10 && from !== to) {
            
            const itemFrom = player.inventory[from];
            const itemTo = player.inventory[to];

            // ------------------------------------------------------------
            // 🗄️ データベース同期処理
            // ------------------------------------------------------------
            const connection = await pool.getConnection();
            try {
                // 片方だけ成功してデータが重複するのを防ぐためトランザクションを開始
                await connection.beginTransaction();

                // 🌟 戦略: 個別ID(db_id)ではなく [user_id + slot_index] を条件にします。
                // これにより、メモリ上のIDが最新でなくても、DB上の「その場所」にあるデータを確実に操作できます。

                // 1. 移動元(from)を一旦スロット -1 へ退避（これで from 番が一時的に空く）
                // itemFromが存在する場合のみ実行
                if (itemFrom) {
                    await connection.query(
                        'UPDATE user_inventory SET slot_index = -1 WHERE user_id = ? AND slot_index = ?',
                        [userId, from]
                    );
                }

                // 2. 移動先(to)にアイテムがあった場合、それを from 番へ移動
                if (itemTo) {
                    await connection.query(
                        'UPDATE user_inventory SET slot_index = ? WHERE user_id = ? AND slot_index = ?',
                        [from, userId, to]
                    );
                }

                // 3. 一時退避させていたアイテム(-1番)を本来の目的地(to)へ移動
                if (itemFrom) {
                    await connection.query(
                        'UPDATE user_inventory SET slot_index = ? WHERE user_id = ? AND slot_index = -1',
                        [to, userId]
                    );
                }

                await connection.commit();
            } catch (dbErr) {
                // DB更新に失敗した場合はロールバックしてエラーを投げる
                await connection.rollback();
                throw dbErr;
            } finally {
                connection.release();
            }

            // ------------------------------------------------------------
            // 🌟 サーバーメモリ上の配列(inventory)を入れ替え
            // ------------------------------------------------------------
            const temp = player.inventory[from];
            player.inventory[from] = player.inventory[to];
            player.inventory[to] = temp;

            // アイテムオブジェクトが保持している slot_index プロパティも最新にする
            if (player.inventory[from]) player.inventory[from].slot_index = from;
            if (player.inventory[to]) player.inventory[to].slot_index = to;

            // ------------------------------------------------------------
            // 📢 クライアントへの通知 (既存の踏襲)
            // ------------------------------------------------------------
            socket.emit('inventory_update', player.inventory);
            
            if (typeof sendState === 'function') {
                sendState();
            }
            
            if (typeof debugChat === 'function') {
                debugChat(`🔄 [SWAP] ${from}番と${to}番を入れ替え (制約回避・DB保存完了)`);
            }
        }
    } catch (e) {
        // エラーハンドリング (既存の踏襲)
        if (typeof debugChat === 'function') {
            debugChat(`❌ swapItemsエラー: ${e.message}`, 'error');
        } else {
            console.error(`❌ swapItemsエラー: ${e.message}`);
        }
    }
});

// ============================================================
// 🛒 アイテム購入リクエスト処理（個数指定対応・SHOP_CONFIG 踏襲版）
// ============================================================
socket.on('buy_request', async (data) => {
    console.log("--- サーバーで購入リクエストを受信 ---");
    
    const p = players[socket.id];
    if (!p) {
        console.log("エラー: プレイヤーが見つかりません");
        return;
    }

    // 🌟 クライアントから送られてきた個数を取得（数値変換し、最低1を保証）
    const buyQty = Math.max(1, parseInt(data.quantity) || 1);

    console.log("購入者:", p.name, " ID変数の中身:", { dbId: p.dbId, socketId: socket.id }, "購入個数:", buyQty);

    try {
        const reqItemId = String(data.itemId);
        const targetDbId = p.dbId;

        if (!targetDbId) {
            console.error("エラー: dbId が特定できません。");
            socket.emit('chat', { id: 'SYSTEM_LOG', name: '店主', text: `あんた、誰だい？（ID不明エラー）` });
            return;
        }

        // --- 1. カタログからアイテム情報を取得 ---
        let item = null;
        let detectedType = '';
        let isEquipment = false;

        const [consumeRows] = await pool.query('SELECT * FROM item_consume_catalog WHERE item_id = ?', [reqItemId]);
        const [etcRows] = await pool.query('SELECT * FROM item_etc_catalog WHERE item_id = ?', [reqItemId]);
        const [equipRows] = await pool.query('SELECT * FROM item_equip_catalog WHERE item_id = ?', [reqItemId]);

        if (consumeRows.length > 0) {
            item = consumeRows[0];
            detectedType = item.name;
        } else if (etcRows.length > 0) {
            item = etcRows[0];
            detectedType = item.name;
        } else if (equipRows.length > 0) {
            item = equipRows[0];
            detectedType = item.category; // shield 等
            isEquipment = true;
        }

        if (!item) {
            console.log(`[SHOP] 商品ID ${reqItemId} はどのカタログにも存在しません`);
            return;
        }

        // --- 2. 所持金チェック ---
        // 🌟 単価 × 個数 で計算
        const totalPrice = item.price * buyQty;
        if (p.gold < totalPrice) {
            socket.emit('chat', { id: 'SYSTEM_LOG', name: '店主', text: `メルが足りないよ。` });
            return;
        }

        // --- 3. インベントリへの追加ロジック ---
        let existingInvSlot = null;

        // 装備品以外はスタック（重ねがけ）可能かチェック
        if (!isEquipment) {
            const [rows] = await pool.query(
                'SELECT slot_index FROM user_inventory WHERE user_id = ? AND item_id = ? AND item_type = ? LIMIT 1',
                [targetDbId, reqItemId, detectedType]
            );
            if (rows.length > 0) {
                existingInvSlot = rows[0].slot_index;
            }
        }

        if (existingInvSlot !== null) {
            // 🌟 既存スロットに個数を加算
            await pool.query(`
                UPDATE user_inventory 
                SET quantity = quantity + ? 
                WHERE user_id = ? AND item_id = ? AND item_type = ? AND slot_index = ?
            `, [buyQty, targetDbId, reqItemId, detectedType, existingInvSlot]);

        } else {
            const [usedSlots] = await pool.query(
                'SELECT slot_index FROM user_inventory WHERE user_id = ? ORDER BY slot_index ASC',
                [targetDbId]
            );
            const usedIndexes = usedSlots.map(r => r.slot_index);
            let newSlotIndex = 0;
            while (usedIndexes.includes(newSlotIndex)) {
                newSlotIndex++;
            }

            if (newSlotIndex >= 10) {
                socket.emit('chat', { id: 'SYSTEM_LOG', name: '店主', text: `バッグがいっぱいだね。` });
                return;
            }

            if (isEquipment) {
                // 装備品の場合は、原則1個ずつ（buyQtyは無視して1個として処理）
                const statKeys = ['str', 'dex', 'int', 'luk', 'maxHp', 'maxMp', 'atk', 'matk', 'def'];
                let sumStats = 0;
                statKeys.forEach(key => {
                    let val = Number(item[key] || 0);
                    if (key === 'maxHp' || key === 'maxMp') val = Math.floor(val / 10);
                    sumStats += val;
                });

                const [eqResult] = await pool.query(`
                    INSERT INTO equipment_instances (
                        player_id, item_id, name, display_name, image_name, category,
                        lv, str, dex, \`int\`, luk, maxHp, maxMp, atk, matk, def,
                        moveSpeed, jumpPower, atkSpeed, star, maxStar,
                        totalUpgrade, successCount, failCount,
                        totalFirstStats, totalALLStats
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    targetDbId, reqItemId, item.name, item.display_name, item.image_name, item.category,
                    item.lv || 0, item.str || 0, item.dex || 0, item.int || 0, item.luk || 0,
                    item.maxHp || 0, item.maxMp || 0, item.atk || 0, item.matk || 0, item.def || 0,
                    item.moveSpeed || 0, item.jumpPower || 0, item.atkSpeed || 1, 
                    item.star || 0, item.maxStar || 0, 
                    item.totalUpgrade || 7, 0, 0,
                    sumStats, sumStats
                ]);

                await pool.query(`
                    INSERT INTO user_inventory (user_id, item_type, slot_index, item_id, quantity, is_equipped, equipment_id) 
                    VALUES (?, ?, ?, ?, 1, 0, ?)
                `, [targetDbId, detectedType, newSlotIndex, reqItemId, eqResult.insertId]);
            } else {
                // 🌟 新規枠に指定個数で挿入
                await pool.query(`
                    INSERT INTO user_inventory (user_id, item_type, slot_index, item_id, quantity, is_equipped) 
                    VALUES (?, ?, ?, ?, ?, 0)
                `, [targetDbId, detectedType, newSlotIndex, reqItemId, buyQty]);
            }
        }

        // --- 4. 成功後の処理 ---
        // 🌟 合計金額をマイナス
        p.gold -= totalPrice; 
        await pool.query('UPDATE player_stats SET gold = ? WHERE user_id = ?', [p.gold, targetDbId]);

        socket.emit('chat', {
            id: 'SYSTEM_LOG',
            name: '店主',
            text: `${item.display_name}を ${buyQty}個 バッグに入れたよ！大切に使いな。`
        });

        // --- 5. インベントリ画面のリアルタイム更新 ---
        const [latestInv] = await pool.query(`
            SELECT inv.*, eq.totalFirstStats, eq.totalALLStats, eq.str, eq.dex, eq.int, eq.luk, 
                   eq.maxHp, eq.maxMp, eq.atk, eq.matk, eq.def, eq.successCount, eq.star, eq.lv
            FROM user_inventory inv
            LEFT JOIN equipment_instances eq ON inv.equipment_id = eq.id
            WHERE inv.user_id = ?
        `, [targetDbId]);
        
        const fixedInventory = Array(10).fill(null);
        latestInv.forEach((invItem) => {
            const sIdx = invItem.slot_index; 
            if (sIdx >= 0 && sIdx < 10) {
                fixedInventory[sIdx] = {
                    ...invItem,
                    id: invItem.item_id,      
                    type: invItem.item_type,    
                    item_type: invItem.item_type, 
                    count: invItem.quantity,   
                    instanceId: invItem.equipment_id,
                    isEquipped: invItem.is_equipped === 1,
                    totalFirstStats: invItem.totalFirstStats,
                    totalALLStats: invItem.totalALLStats
                };
            }
        });

        p.inventory = fixedInventory;
        
        socket.emit('player_update', p); 
        socket.emit('inventory_update', p.inventory);
        
        // ショップ陳列データの再取得
        const allShopItems = await getShopInventory(pool);

        socket.emit('update_shop', { 
            inventory: allShopItems, 
            myItems: p.inventory,    
            gold: p.gold             
        });

        console.log(`[SUCCESS] ${p.name} の購入処理完了 (${buyQty}個)。`);
            
    } catch (err) {
        console.error("購入エラー詳細:", err);
    }
});

// ============================================================
// 💰 アイテム売却リクエスト処理（個数指定・安定版踏襲）
// ============================================================
socket.on('sell_request', async (data) => {
    console.log("--- サーバーで売却リクエストを受信 ---");
    
    const p = players[socket.id];
    if (!p) return;

    try {
        const reqId = String(data.itemId); 
        const slotIndex = Number(data.slotIndex);
        // 🌟 クライアントから送られてきた個数を取得（最低1個）
        const sellQty = Math.max(1, parseInt(data.quantity) || 1);
        const targetDbId = p.dbId;

        // --- 1. インベントリから該当アイテムが存在するか確認 ---
        const [invRows] = await pool.query(
            `SELECT * FROM user_inventory 
             WHERE user_id = ? AND slot_index = ? 
             AND (item_id = ? OR equipment_id = ?)`,
            [targetDbId, slotIndex, reqId, reqId]
        );

        if (invRows.length === 0) {
            console.log("売却エラー: 指定されたスロットに一致するアイテムがありません。");
            return;
        }

        const invItem = invRows[0];
        const actualItemId = invItem.item_id;

        // 🌟 所持数チェック（持っている数より多くは売れない）
        if (invItem.quantity < sellQty) {
            console.log("売却エラー: 所持数以上の指定。");
            return;
        }

        // --- 2. カタログから売却価格を取得 ---
        let catalogItem = null;
        const [consume] = await pool.query('SELECT price, display_name FROM item_consume_catalog WHERE item_id = ?', [actualItemId]);
        const [etc] = await pool.query('SELECT price, display_name FROM item_etc_catalog WHERE item_id = ?', [actualItemId]);
        const [equip] = await pool.query('SELECT price, display_name FROM item_equip_catalog WHERE item_id = ?', [actualItemId]);

        catalogItem = consume[0] || etc[0] || equip[0];
        
        if (!catalogItem) {
            console.log("売却エラー: カタログ未存在 ID:", actualItemId);
            return;
        }

        // 🌟 単価の決定
        let unitPrice = Math.floor(catalogItem.price * 0.5);
        if (actualItemId === '301') unitPrice = 500;  // gold
        if (actualItemId === '302') unitPrice = 2500; // treasure

        // 🌟 合計売却額の計算
        const totalEarned = unitPrice * sellQty;

        // --- 3. DB更新（数量減らす or 削除） ---
        if (invItem.quantity > sellQty) {
            // 🌟 指定個数を引いても残る場合は UPDATE
            await pool.query(
                'UPDATE user_inventory SET quantity = quantity - ? WHERE id = ?',
                [sellQty, invItem.id]
            );
        } else {
            // 🌟 ちょうど全部売る場合は DELETE
            await pool.query('DELETE FROM user_inventory WHERE id = ?', [invItem.id]);
            
            // 装備品インスタンスがある場合は実体も削除
            if (invItem.equipment_id) {
                await pool.query('DELETE FROM equipment_instances WHERE id = ?', [invItem.equipment_id]);
            }
        }

        // --- 4. 所持金の更新 ---
        p.gold += totalEarned;
        await pool.query('UPDATE player_stats SET gold = ? WHERE user_id = ?', [p.gold, targetDbId]);

        socket.emit('chat', {
            id: 'SYSTEM_LOG',
            name: '店主',
            // 🌟 個数と合計額を表示
            text: `${catalogItem.display_name}を${sellQty}個売って、${totalEarned}メル受け取ったよ。`
        });

        // --- 5. 画面更新用データの再送信 ---
        const [latestInv] = await pool.query(`
            SELECT inv.*, eq.totalFirstStats, eq.totalALLStats, eq.str, eq.dex, eq.int, eq.luk, 
                   eq.maxHp, eq.maxMp, eq.atk, eq.matk, eq.def, eq.successCount, eq.star, eq.lv
            FROM user_inventory inv
            LEFT JOIN equipment_instances eq ON inv.equipment_id = eq.id
            WHERE inv.user_id = ?
        `, [targetDbId]);
        
        const fixedInventory = Array(10).fill(null);
        latestInv.forEach((iv) => {
            const sIdx = iv.slot_index; 
            if (sIdx >= 0 && sIdx < 10) {
                fixedInventory[sIdx] = {
                    ...iv,
                    id: iv.item_id, 
                    type: iv.item_type, 
                    item_type: iv.item_type, 
                    count: iv.quantity, 
                    instanceId: iv.equipment_id,
                    isEquipped: iv.is_equipped === 1,
                    totalFirstStats: iv.totalFirstStats,
                    totalALLStats: iv.totalALLStats
                };
            }
        });

        p.inventory = fixedInventory;
        socket.emit('player_update', p); 
        socket.emit('inventory_update', p.inventory);

        const allShopItems = await getShopInventory(pool);
        socket.emit('update_shop', { 
            inventory: allShopItems, 
            myItems: p.inventory, 
            gold: p.gold 
        });

        console.log(`[SELL SUCCESS] ${p.name} が ${catalogItem.display_name} を ${sellQty}個 売却。`);

    } catch (err) {
        console.error("売却エラー詳細:", err);
    }
});

// ============================================================
// 🏪 [SECTION 6: INTERACTION] 露店開設リクエスト
// 役割: クライアントからの開店要請を受け、状態を全ユーザーに同期する
// ============================================================

// ==========================================
// 12. 露店開設イベント (在庫連動版：開店時は減らさない)
// ==========================================
socket.on('open_vending', (data) => {
    const p = players[socket.id];
    
    // プレイヤーが存在しない場合は中断
    if (!p) return;

    // 🌟 店名を確定させてサーバー側の変数に保存
    const inputTitle = data.title || data.vending_title || p.vending_title || "No Name Shop";
    p.vending_title = inputTitle;

    // --- 🌟 ロジック踏襲: 準備中（アイテム0）なら状態更新も通知もしない ---
    if (!data.items || data.items.length === 0) {
        p.is_vending = false; 
        p.vending_items = []; // プレイヤー情報のリストもリセット

        active_venders[socket.id] = {
            dbId: p.dbId,
            name: p.name,
            vending_title: p.vending_title, 
            channel: p.channel,
            map_id: p.map_id, 
            x: p.x,
            y: p.y,
            items: [] 
        };

        console.log(`[Vending] ${p.name} は準備中のため、同期通知をスキップしました: ${p.vending_title}`);
        return; // ❌ アイテムがない場合はここで終了
    }

    // --- ここから下は「アイテムが1つ以上ある場合」のみ実行される ---

    // 🌟 【修正ポイント】
    // クライアントから送られた「出品データ」を整理する。
    // ここではインベントリ (p.inventory) から個数を引かずに、
    // 「どのスロット(originalIndex)から何個(count)出すか」という情報だけを保存する。
    const formattedVendingItems = data.items.map(vItem => {
        // インベントリの現物を確認
        const invItem = p.inventory[vItem.originalIndex];
        if (invItem) {
            return {
                ...invItem,       // アイテムの基本情報（名前、画像など）
                count: vItem.count, // 出品したい数
                price: vItem.price, // 販売価格
                originalIndex: vItem.originalIndex // 🌟 重要：売れた時に減らすためのスロット番号
            };
        }
        return null;
    }).filter(i => i !== null);

    // 1. サーバー側のプレイヤー個別の状態を正式に「開店中」に更新
    p.is_vending = true;
    
    // 🔥 整理した出品リストを保存（売れた瞬間にここを参照してインベントリを減らす）
    p.vending_items = formattedVendingItems;

    // 2. 外部管理用の active_venders に詳細情報を登録
    active_venders[socket.id] = {
        dbId: p.dbId,
        name: p.name,
        vending_title: p.vending_title,
        channel: p.channel,
        map_id: p.map_id, 
        x: p.x,
        y: p.y,
        items: formattedVendingItems
    };

    // 3. 全員（同じチャンネルの人）に開店を知らせる
    io.to(`channel_${p.channel}`).emit('vending_opened', {
        id: socket.id,
        vending_title: p.vending_title,
        title: p.vending_title,
        items: formattedVendingItems, // 受信を確実にする
        x: p.x,
        y: p.y
    });

    console.log(`[Vending] ${p.name} が在庫連動モードで開店しました: ${p.vending_title}`);
});

// 🛒 📡 クライアントからの商品リスト要求を受け取る
socket.on('request_vending_data', async (data) => {
    const ownerId = data.ownerId;
    
    // 1. 全プレイヤーの中から、店主(ownerId)のデータを探す
    const owner = players[ownerId]; 

    console.log(`\n========== 🔍 [VENDING_GIGA_DEBUG] START: ${ownerId} ==========`);

    if (owner && owner.is_vending) {
        console.log(`[Vending] ${ownerId} の商品リストをカタログ情報を紐付けて返信します`);

        // --- 🌟 店主のインベントリから詳細情報を抽出して結合する ---
        // DB照会を行うために Promise.all を使用します
        const itemsWithDetails = await Promise.all((owner.vending_items || []).map(async (vItem, idx) => {
            if (!vItem) return null;

            console.log(`\n--- 📦 [Item:${idx}] の解析開始 ---`);
            console.log(`[DEBUG] 1. 出品データ(vItem):`, JSON.stringify(vItem));

            // 店主のインベントリ(inventory)から元のアイテム情報を参照
            const sIdx = vItem.originalIndex;
            const invItem = (owner.inventory && owner.inventory[sIdx]) 
                ? owner.inventory[sIdx] 
                : null;

            if (invItem) {
                console.log(`[DEBUG] 2. 在庫データ(invItem)発見:`, JSON.stringify(invItem));
            } else {
                console.warn(`[DEBUG] 2. 在庫データ(invItem)が inventory[${sIdx}] に見つかりません`);
            }

            // 🌟 IDの確定（型を数値に変換して確実に判定できるようにします）
            const rawId = vItem.id || vItem.item_id || (invItem ? invItem.item_id : null);
            const resolvedId = (rawId !== undefined && rawId !== null) ? Number(rawId) : 0;
            console.log(`[DEBUG] 3. 確定したID: ${resolvedId} (型: ${typeof rawId})`);

            // 🌟 DBからマスター情報を一本釣り（3つのテーブルを振り分け）
            let dbMaster = null;
            let tableName = "";

            if (resolvedId > 0) {
                // IDの番台によって参照テーブルを決定
                if (resolvedId >= 100 && resolvedId < 200) {
                    tableName = "item_equip_catalog";
                } else if (resolvedId >= 200 && resolvedId < 300) {
                    tableName = "item_consume_catalog";
                } else if (resolvedId >= 300 && resolvedId < 400) {
                    tableName = "item_etc_catalog";
                }

                if (tableName) {
                    try {
                        // 🌟 【修正の決定打】WHERE句を id から item_id に変更
                        console.log(`[DEBUG] 4. SQL実行: SELECT * FROM ${tableName} WHERE item_id = ${resolvedId}`);
                        const [rows] = await pool.query(`SELECT * FROM ${tableName} WHERE item_id = ?`, [resolvedId]);
                        
                        if (rows && rows.length > 0) {
                            dbMaster = rows[0];
                            console.log(`[DEBUG] 4. ✅ DB照合成功 (${tableName}):`, JSON.stringify(dbMaster));
                        } else {
                            console.error(`[DEBUG] 4. ❌ DB照合失敗: ${tableName} に item_id:${resolvedId} が存在しません`);
                        }
                    } catch (dbErr) {
                        console.error(`[DEBUG] 4. ‼️ SQLエラー:`, dbErr.message);
                    }
                } else {
                    console.warn(`[DEBUG] 4. ⚠️ 該当するカタログテーブルが判定できませんでした (ID: ${resolvedId})`);
                }
            }

            const resItem = {
                ...vItem,
                // クライアント側の描画ロジックが期待する 'data' 階層を動的に生成
                data: {
                    item_id: resolvedId,
                    // 🌟 修正：DBの display_name を最優先に変更
                    display_name: dbMaster?.display_name || dbMaster?.name || vItem.display_name || vItem.name || (invItem ? (invItem.display_name || invItem.name) : null) || `不明(ID:${resolvedId})`,
                    image_name: dbMaster?.image_name || vItem.image_name || vItem.imageName || (invItem ? (invItem.image_name || invItem.image || invItem.type) : null) || "default",
                    type: dbMaster?.type || vItem.type || (invItem ? invItem.type : 'item'),
                    // ランク判定（グロー効果）に必要なステータスも引き継ぐ
                    totalALLStats: vItem.totalALLStats ?? (invItem ? invItem.totalALLStats : undefined),
                    totalFirstStats: vItem.totalFirstStats ?? (invItem ? invItem.totalFirstStats : undefined)
                }
            };

            console.log(`[DEBUG] 5. 最終送信データ名: "${resItem.data.display_name}"`);
            return resItem;
        }));

        const finalItems = itemsWithDetails.filter(i => i !== null);
        console.log(`\n[Vending] 送信準備完了: ${finalItems.length}件のアイテム`);
        console.log(`========== 🔍 [VENDING_GIGA_DEBUG] END: ${ownerId} ==========\n`);

        // 2. 要求したクライアントだけに、その店の商品リストを送り返す
        socket.emit('vending_data_res', {
            ownerId: ownerId,
            items: finalItems 
        });
    } else {
        console.warn(`[Vending] 店主 ${ownerId} が見つからないか、閉店しています`);
        socket.emit('vending_data_res', { ownerId: ownerId, items: [] });
    }
});

// 🛒 露店でのアイテム購入リクエスト (構造維持・完売時自動閉店・数量同期修正版)
socket.on('vending_buy_req', async (data) => {
    // 1. 受信直後のログ
    console.log("\n%c========== 🔍 [VENDING_DEBUG] 🚀 購入リクエスト開始 ==========", "color: #3498db; font-weight: bold;");
    console.log("├─ [1.受信データ]:", JSON.stringify(data));
    
    const ownerId = data.ownerId;
    const dbIdRaw = data.dbId; 
    const buyerId = socket.id;

    if (ownerId === buyerId) {
        console.warn("└─ [中止] 自分の店の商品は購入できません。");
        return;
    }

    const buyer = players[buyerId];
    const seller = players[ownerId];

    if (!buyer || !seller) {
        console.error("└─ [エラー] プレイヤーデータが見つかりません. buyer:", !!buyer, "seller:", !!seller);
        socket.emit('system_message', { text: "通信エラーが発生しました。" });
        return;
    }

    // 🌟 データベース接続を先に取得
    const connection = await pool.getConnection(); 
    try {
        await connection.beginTransaction();

        // 🌟 IDの参照と数値化
        let buyerDbId = Number(buyer.db_id || buyer.user_id || buyer.player_id || buyer.id);
        let sellerDbId = Number(seller.db_id || seller.user_id || seller.player_id || seller.id);

        if (isNaN(buyerDbId) || buyerDbId === 0) {
            const [rows] = await connection.query("SELECT id FROM users WHERE username = ?", [buyer.name]);
            if (rows.length > 0) buyerDbId = rows[0].id;
        }
        if (isNaN(sellerDbId) || sellerDbId === 0) {
            const [rows] = await connection.query("SELECT id FROM users WHERE username = ?", [seller.name]);
            if (rows.length > 0) sellerDbId = rows[0].id;
        }

        console.log(`├─ [2.ID検証完了]: BuyerDBID=${buyerDbId}, SellerDBID=${sellerDbId}`);

        if (!buyerDbId || !sellerDbId) throw new Error(`数値ID特定不可`);

        // 🌟 【重要】メモリ上の露店データからアイテムを特定
        const itemInVending = seller.vending_items?.find(i => i && String(i.db_id || i.id) === String(dbIdRaw));
        console.log("├─ [3.露店メモリ照合]:", itemInVending ? "✅ 発見" : "❌ 未発見", itemInVending);

        if (!itemInVending) throw new Error("VENDING_DATA_MISMATCH");

        // 🌟 DB上の本物のIDを「スロット番号」から再特定
        const originalSlot = itemInVending.originalIndex;
        const [invRows] = await connection.query(
            "SELECT * FROM user_inventory WHERE user_id = ? AND slot_index = ? LIMIT 1",
            [sellerDbId, originalSlot]
        );

        if (invRows.length === 0) throw new Error("ITEM_NOT_FOUND_IN_DB_BY_SLOT");

        const itemData = invRows[0];
        const realDbId = itemData.id; 
        const equipmentId = itemData.equipment_id || null;
        const numericItemId = Number(itemData.item_id);
        const itemType = (itemData.item_type || "item").toLowerCase();

        // 🌟 数量と価格 (確実に数値化)
        const buyQty = Number(itemInVending.count || itemInVending.quantity || 1); 
        const pricePerOne = Number(itemInVending.price); 
        const totalPrice = pricePerOne * buyQty;         

        // 判定：装備品かどうか
        const isEquipment = itemType.includes('shield') || itemType.includes('weapon') || itemType.includes('armor') || itemType.includes('equipment');

        let finalSlotIndex = -1;
        let isNewSlot = true;
        let mergedDbId = null;

        // スタック合流判定
        if (!isEquipment) {
            const [existingItems] = await connection.query(
                "SELECT id, slot_index FROM user_inventory WHERE user_id = ? AND item_id = ? AND is_equipped = 0 LIMIT 1",
                [buyerDbId, numericItemId]
            );
            if (existingItems.length > 0) {
                finalSlotIndex = existingItems[0].slot_index;
                mergedDbId = existingItems[0].id;
                isNewSlot = false;
            }
        }

        // 新規スロット決定
        if (isNewSlot) {
            const [slots] = await connection.query("SELECT slot_index FROM user_inventory WHERE user_id = ? ORDER BY slot_index ASC", [buyerDbId]);
            const usedSlots = slots.map(s => Number(s.slot_index));
            let nextSlot = 0; while (usedSlots.includes(nextSlot)) { nextSlot++; }
            if (nextSlot > 9) throw new Error("INVENTORY_FULL");
            finalSlotIndex = nextSlot;
        }

        // 🌟 A & B. ゴールド更新
        await connection.query("UPDATE player_stats SET gold = gold - ? WHERE user_id = ?", [totalPrice, buyerDbId]);
        await connection.query("UPDATE player_stats SET gold = gold + ? WHERE user_id = ?", [totalPrice, sellerDbId]);

        // 🌟 C. アイテム移動
        await connection.query("UPDATE user_inventory SET quantity = quantity - ? WHERE id = ?", [buyQty, realDbId]);
        await connection.query("DELETE FROM user_inventory WHERE id = ? AND quantity <= 0", [realDbId]);

        if (isNewSlot) {
            const [resIns] = await connection.query(
                `INSERT INTO user_inventory (user_id, item_type, quantity, slot_index, item_id, is_equipped, equipment_id) VALUES (?, ?, ?, ?, ?, 0, ?)`,
                [buyerDbId, itemData.item_type, buyQty, finalSlotIndex, numericItemId, equipmentId]
            );
            mergedDbId = resIns.insertId;
        } else {
            await connection.query("UPDATE user_inventory SET quantity = quantity + ? WHERE id = ?", [buyQty, mergedDbId]);
        }

        await connection.commit();

        // --- ✅ 🧠 メモリ上のデータ「完全同期」 ---
        if (buyer.gold !== undefined) buyer.gold -= totalPrice;
        if (seller.gold !== undefined) seller.gold += totalPrice;

        // 1. 【販売者側メモリ】
        if (Array.isArray(seller.inventory)) {
            const sIdx = itemInVending.originalIndex;
            if (seller.inventory[sIdx]) {
                const currentQty = Number(seller.inventory[sIdx].quantity || seller.inventory[sIdx].count || 0) - buyQty;
                if (currentQty <= 0) { seller.inventory[sIdx] = null; } 
                else { 
                    seller.inventory[sIdx].quantity = currentQty; 
                    seller.inventory[sIdx].count = currentQty; 
                }
            }
        }
        
        // 🌟 販売中リストの更新
        if (seller.vending_items) {
            seller.vending_items = seller.vending_items
                .map(i => {
                    if (String(i.db_id || i.id) === String(dbIdRaw)) {
                        const newQty = Number(i.count || i.quantity || 0) - buyQty;
                        return newQty > 0 ? { ...i, count: newQty, quantity: newQty } : null;
                    }
                    return i;
                })
                .filter(i => i !== null);

            for (let vItem of seller.vending_items) {
                const tid = Number(vItem.item_id || vItem.id);
                let catTable = (tid >= 100 && tid < 200) ? "item_equip_catalog" : (tid >= 200 && tid < 300) ? "item_consume_catalog" : (tid >= 300 && tid < 400) ? "item_etc_catalog" : "";
                if (catTable) {
                    const [cRows] = await connection.query(`SELECT display_name, image_name FROM ${catTable} WHERE item_id = ?`, [tid]);
                    if (cRows.length > 0) {
                        vItem.name = cRows[0].display_name;
                        vItem.display_name = cRows[0].display_name;
                        vItem.image_name = cRows[0].image_name;
                    }
                }
            }
        }

        // 2. 【購入者側メモリ更新】
        if (!Array.isArray(buyer.inventory)) buyer.inventory = new Array(10).fill(null);
        
        if (!isNewSlot && buyer.inventory[finalSlotIndex]) {
            const target = buyer.inventory[finalSlotIndex];
            const oldQty = Number(target.quantity || target.count || 0);
            const newQty = oldQty + buyQty;
            target.quantity = newQty;
            target.count = newQty;
            console.log(`│ [DEBUG] 合流更新完了: Slot ${finalSlotIndex} (${oldQty} -> ${newQty})`);
        } else {
            const newItemForBuyer = { ...itemInVending, db_id: mergedDbId, id: mergedDbId, quantity: buyQty, count: buyQty, slot_index: finalSlotIndex, is_equipped: 0, equipment_id: equipmentId };
            delete newItemForBuyer.price; delete newItemForBuyer.originalIndex;
            buyer.inventory[finalSlotIndex] = newItemForBuyer;
            console.log(`│ [DEBUG] 新規スロット追加: Slot ${finalSlotIndex}`);
        }

        // 🌟🌟🌟 【ピンポイント名称再補完】 🌟🌟🌟
        const targetItem = buyer.inventory[finalSlotIndex];
        if (targetItem) {
            const tid = Number(numericItemId);
            let catalogTable = (tid >= 100 && tid < 200) ? "item_equip_catalog" : (tid >= 200 && tid < 300) ? "item_consume_catalog" : (tid >= 300 && tid < 400) ? "item_etc_catalog" : "";
            if (catalogTable) {
                const [catRows] = await connection.query(`SELECT display_name, image_name FROM ${catalogTable} WHERE item_id = ?`, [tid]);
                if (catRows.length > 0) {
                    targetItem.name = catRows[0].display_name;
                    targetItem.display_name = catRows[0].display_name;
                    targetItem.image_name = catRows[0].image_name;
                }
            }
        }

        // --- ✅ 📡 クライアント送信 ---
        const finalGold = buyer.gold !== undefined ? buyer.gold : (buyer.money || 0);
        const purchasedName = targetItem?.display_name || targetItem?.name || "アイテム";

        socket.emit('vending_buy_success', { dbId: dbIdRaw, newMoney: finalGold });
        socket.emit('inventory_update', { inventory: buyer.inventory }); 
        socket.emit('system_message', { text: `${purchasedName} x${buyQty} を購入しました。` });

        io.to(ownerId).emit('vending_item_sold', { dbId: dbIdRaw, newMoney: (seller.gold || 0), buyerName: buyer.name });
        io.to(ownerId).emit('inventory_update', { inventory: seller.inventory });

        // 🌟🌟🌟 【完売チェック：自動閉店ロジック】 🌟🌟🌟
        if (!seller.vending_items || seller.vending_items.length === 0) {
            console.log(`│ [VENDING] ${seller.name} の露店は完売しました。自動終了します。`);
            seller.is_vending = false;
            seller.vending_title = "";
            if (typeof active_venders !== 'undefined' && active_venders[ownerId]) {
                delete active_venders[ownerId];
            }
            // 全員に閉店を通知
            io.emit('vending_closed', { id: ownerId, reason: 'sold_out' });
            // 本人に通知
            io.to(ownerId).emit('system_message', { text: "商品が完売したため、露店を終了しました。" });
        } else {
            // まだ在庫がある場合は露店データを更新配信
            io.emit('vending_data_res', { ownerId: ownerId, items: seller.vending_items });
        }

        console.log(`%c========== 🔍 [VENDING_DEBUG] ✨ 正常終了: ${purchasedName} ==========`, "color: #2ecc71; font-weight: bold;");

    } catch (err) {
        if (connection) await connection.rollback();
        console.error("❌ [VENDING_ERROR]:", err);
        socket.emit('system_message', { text: `購入エラー: ${err.message}` });
    } finally {
        if (connection) connection.release();
    }
});

// ------------------------------------------------------------
// 🏃 [SECTION 6: MOVEMENT] 移動同期
// ------------------------------------------------------------
socket.on('move', (data) => {
    const p = players[socket.id];
    if (p) {
        // 基本移動同期
        p.x = data.x;
        p.y = data.y;
        p.vx = data.vx;
        p.dir = data.dir;
        p.jumping = data.jumping;
        p.isAttacking = data.isAttacking;
        p.invincible = data.invincible;
        p.climbing = data.climbing;

        // 🌟 修正：店名が勝手に上書きされないようガードをかける
        // 1. data.vending_title が存在し、かつ空文字でない場合のみ上書きを許可
        if (data.vending_title !== undefined && data.vending_title !== "") {
            p.vending_title = data.vending_title;
        }
        
        // 2. 露店フラグの同期
        if (data.is_vending !== undefined) {
            p.is_vending = data.is_vending;
            
            // 🌟 修正ポイント：
            // 「Shop」という固定文字を削除し、サーバーが現在保持している名前を優先します。
            if (p.is_vending && (!p.vending_title || p.vending_title === "")) {
                // もし今の p.vending_title があるならそれを維持、なければ空文字にする。
                // これにより、どこからも "Shop" という文字は発生しなくなります。
                p.vending_title = p.vending_title || ""; 
            }
        }
    }
});

// ------------------------------------------------------------
// ❌ 露店閉鎖リクエスト（手動で閉じる場合）
// ------------------------------------------------------------
socket.on('close_vending', () => {
    const p = players[socket.id];
    if (p) {
        // 1. サーバー側の状態を「非開店」に更新
        p.is_vending = false;
        // 店名は保持しておいても良いが、看板を表示させないためにフラグを優先
        
        // 2. 外部管理用のリストから削除
        if (active_venders[socket.id]) {
            delete active_venders[socket.id];
        }

        // 3. 周囲のプレイヤーに「看板を消して」と通知
        io.to(`channel_${p.channel}`).emit('vending_closed', {
            id: socket.id
        });

        console.log(`[Vending] ${p.name} が露店を閉じました。`);
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
let active_venders = {}; // 🌟 追加：キーをsocket.idにして、店名や座標、出品アイテムを格納
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
            "medal1":     { "type": "ETC", "name": "medal1", "display_name": "メダル1", "src": "item_assets/GoldOne_", "isAnimated": true },
            "money5":     { "type": "ETC", "name": "money5", "display_name": "金メダル1", "src": "item_assets/Gold_", "isAnimated": true },
            "money6":     { "type": "ETC", "name": "money6", "display_name": "銀メダル1", "src": "item_assets/Silver_", "isAnimated": true },
            //"money7":     { "type": "ETC", "name": "money7", "display_name": "銅メダル1", "src": "item_assets/Bronze_", "isAnimated": true },
            "gold_one":   { "type": "ETC", "name": "gold_one", "display_name": "ワンメダル(金)1", "src": "item_assets/GoldOne_", "isAnimated": true },
            "gold_heart": { "type": "ETC", "name": "gold_heart", "display_name": "ハートメダル(金)1", "src": "item_assets/GoldHeart_", "isAnimated": true },
            "money1":     { "type": "ETC", "name": "money1", "display_name": "10ゴールド1", "src": "item_assets/money1_", "isAnimated": true },
            "money3":     { "type": "ETC", "name": "money3", "display_name": "100ゴールド1", "src": "item_assets/money3_", "isAnimated": true },
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
//let LEVEL_TABLE = [0, 12, 20, 35, 60, 100, 150, 250, 280, 360, 450];
let LEVEL_TABLE = [0]; // 最初は空に近い状態で用意

/**
 * 📈 データベースから経験値テーブルを読み込む
 */
async function loadExperienceTable() {
    try {
        // level順に全てのデータを取得
        const [rows] = await pool.query('SELECT level, required_exp FROM player_exp_table ORDER BY level ASC');
        
        // 配列を一度リセット
        LEVEL_TABLE = [0]; 

        rows.forEach(row => {
            // LEVEL_TABLE[1] に Lv1の必要経験値が入るように格納
            LEVEL_TABLE[row.level] = Number(row.required_exp);
        });

        console.log(`[System] 経験値テーブルをDBから読み込みました (${rows.length}レベル分)`);
        
        // デバッグ用：Lv.7 と Lv.200 の値を確認
        if (LEVEL_TABLE[7]) console.log(`Lv.7  MaxExp: ${LEVEL_TABLE[7]}`);
        if (LEVEL_TABLE[200]) console.log(`Lv.200 MaxExp: ${LEVEL_TABLE[200]}`);

    } catch (err) {
        console.error('❌ 経験値テーブルの読み込みに失敗しました:', err);
        // 失敗時のバックアップ（最低限の値を手動で入れておく）
        LEVEL_TABLE = [0, 12, 20, 35, 60, 100, 150, 210, 280, 360, 450];
    }
}

let MAX_HP_TABLE = [0]; // Lvごとの最大HPを格納する配列

/**
 * 🏥 データベースから最大HPテーブルを読み込む
 */
async function loadMaxHPTable() {
    try {
        // level順に全てのデータを取得
        const [rows] = await pool.query('SELECT level, max_hp FROM player_max_hp ORDER BY level ASC');
        
        // 配列を一度リセット
        MAX_HP_TABLE = [0]; 

        rows.forEach(row => {
            // MAX_HP_TABLE[row.level] にそのレベルのHPを格納
            MAX_HP_TABLE[row.level] = Number(row.max_hp);
        });

        console.log(`[System] 最大HPテーブルをDBから読み込みました (${rows.length}レベル分)`);
        
        // デバッグ用確認
        if (MAX_HP_TABLE[1]) console.log(`Lv.1   MaxHP: ${MAX_HP_TABLE[1]}`);
        if (MAX_HP_TABLE[200]) console.log(`Lv.200 MaxHP: ${MAX_HP_TABLE[200]}`);

    } catch (err) {
        console.error('❌ 最大HPテーブルの読み込みに失敗しました:', err);
        // 失敗時のバックアップ（Lv1の最低値など）
        MAX_HP_TABLE = [0, 65]; 
    }
}

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
  { plat: 0,    id: 2010 }, 
  { plat: 1,    id: 2050 }, 
  { plat: 1,    id: 2020 }, 
  { plat: 2,    id: 2080 }, 
  { plat: 2,    id: 2080 }, 
  { plat: 2,    id: 2080 }, 
  { plat: null, id: 2160 }
];

// ==========================================
// 🌟 モンスターごとのドロップ設定
// ==========================================
const DROP_DATABASE = {
  "Monster1":  { table: "drop2"},
  "Monster2":  { table: "drop2"},
  "Char13":  { table: "drop2"},
  "Char10":  { table: "drop4"  },
  "Char19":  { table: "drop4"  },
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
  // 1. 浮遊属性の判定
  // 1000番台の特定ID、または 2000番台すべて（2000〜2999）を対象にする
  const isFloating = [1010, 1020, 1030].includes(this.id) || (this.id >= 2000 && this.id < 3000);

  // 2. 空中にいる、またはジャンプ速度がある場合の処理
  if (this.jumpY < 0 || this.jumpV !== 0) {
    this.jumpV += 0.5;         // 重力を加算
    this.jumpY += this.jumpV;  // 座標を更新

    // 地面（y=0）に着地した判定
    if (this.jumpY >= 0) {
      this.jumpY = 0;          // 座標を地面に固定
      this.jumpV = 0;          // 速度をリセット
    }
  } 
  // 3. 地上にいて、かつ浮遊キャラでない場合、低確率(1%)でジャンプ
  else if (!isFloating && Math.random() < 0.01) {
    this.jumpV = -7;           // 上方向への初速を与える
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
    const isFloating = [1010, 1020, 1030].includes(this.id);
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
		
		await loadExperienceTable();
		await loadMaxHPTable();

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
 * 構造はそのままに、最大HPの取得先をテーブルに変更しました。
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

        // 🌟 【修正箇所】固定値加算から「テーブル参照」に変更
        // テーブルにデータがあればそれを採用し、なければ安全策として+20する
        const nextMaxHP = MAX_HP_TABLE[player.level];
        if (nextMaxHP) {
            player.maxHp = nextMaxHP;
        } else {
            player.maxHp = (Number(player.maxHp) || 100) + 20; 
        }
        
        // 🌟 【修正箇所】新しい最大HPで全回復
        player.hp = player.maxHp;
        
        // 🌟 サーバーから「レベルアップしたよ！」と全員に合図を送る
        io.emit('level_up_effect', { 
            playerId: player.id 
        });
        
        // 次のレベルの必要量を再取得
        requiredExp = LEVEL_TABLE[player.level] || (player.level * 100);
        player.maxExp = requiredExp;

        console.log(`[LEVEL UP] ${player.name} が Lv.${player.level} になりました！ (MaxHP: ${player.maxHp})`);
        debugChat(`🎊${player.name}がレベル${player.level}に上がりました！最大HPが${player.maxHp}に増加し、体力が全回復しました！`);
    }
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
                
                category: (catalogBase && catalogBase.category) ? catalogBase.category : (type === 'sword' ? "weapon2" : (type === 'shield' ? "shield" : "")),
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

// ============================================================
// 💡 ショップのラインナップと共通取得ロジック（グローバルスコープ）
// ============================================================
const SHOP_CONFIG = {
    targetIds: {
        consume: [201, 202],
        etc: [301, 302],
        equip: [101, 102]
    }
};

/**
 * DBからショップの陳列データを取得し、フロントエンドが求める形式に変換する関数
 */
async function getShopInventory(pool) {
    const { consume, etc, equip } = SHOP_CONFIG.targetIds;

    const query = `
        /* 消費アイテム */
        SELECT item_id as id, display_name as name, price, image_name, description, 'consume' as category,
               NULL as lv, NULL as str, NULL as dex, NULL as \`int\`, NULL as luk, NULL as atk, NULL as def,
               NULL as maxHp, NULL as maxMp
        FROM item_consume_catalog WHERE item_id IN (?)
        UNION ALL
        /* ETCアイテム */
        SELECT item_id as id, display_name as name, price, image_name, description, 'etc' as category,
               NULL as lv, NULL as str, NULL as dex, NULL as \`int\`, NULL as luk, NULL as atk, NULL as def,
               NULL as maxHp, NULL as maxMp
        FROM item_etc_catalog WHERE item_id IN (?)
        UNION ALL
        /* 装備アイテム */
        SELECT item_id as id, display_name as name, price, image_name, '装備アイテム' as description, category,
               lv, str, dex, \`int\`, luk, atk, def,
               maxHp, maxMp
        FROM item_equip_catalog WHERE item_id IN (?)
    `;

    // IN句に空配列を渡すとエラーになるため、空の場合は[0]を渡す
    const [results] = await pool.query(query, [
        consume.length ? consume : [0],
        etc.length ? etc : [0],
        equip.length ? equip : [0]
    ]);

    return results.map(item => {
        // 基本データ構造（全アイテム共通）
        let data = {
            id: item.id,
            name: item.name,
            price: item.price,
            image_name: item.image_name,
            description: item.description,
            category: item.category,
            item_type: item.category // 🌟 swordやshieldがそのまま入る（フロント判定用）
        };

        // 装備アイテム（lvが存在するもの）への追加ステータス反映
        if (item.lv !== null) {
            data.type = item.category;
            data.lv = item.lv;
            data.atk = item.atk || 0;
            data.def = item.def || 0;
            data.str = item.str || 0;
            data.dex = item.dex || 0;
            data.int = item.int || 0;
            data.luk = item.luk || 0;
            data.maxHp = item.maxHp || 0;
            data.maxMp = item.maxMp || 0;
            
            // 💡 ステータス合計の計算（HP/MPの1/10を追加）
            const sum = (item.str || 0) + (item.dex || 0) + (item.int || 0) + (item.luk || 0) + 
                        (item.atk || 0) + (item.def || 0) + 
                        Math.floor((item.maxHp || 0) / 10) + Math.floor((item.maxMp || 0) / 10);
            
            data.totalFirstStats = sum;
            data.totalALLStats = sum; // 初期状態はFirstと同じ
        }

        return data;
    });
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
	
	// 💸 【コマンド7】金額指定ドロップ（垂直跳ね上げ・反時計回り回転版）
    if (text.startsWith('/dropgold ')) {
        const args = text.split(' ');
        const amount = parseInt(args[1]);

        // 1. バリデーション
        if (isNaN(amount) || amount <= 0) {
            socket.emit('chat', { 
                id: 'SYSTEM_LOG', 
                name: '⚠️ 失敗', 
                text: "金額を正しく入力してください（例: /dropgold 100）" 
            });
            return true;
        }

        // 2. 所持金チェック
        if ((p.gold || 0) < amount) {
            socket.emit('chat', { 
                id: 'SYSTEM_LOG', 
                name: '⚠️ 失敗', 
                text: "所持金が足りません！" 
            });
            return true;
        }

        // 3. 所持金を減らす
        p.gold -= amount;

        // 4. アイテムオブジェクト作成
        const chId = p.channel || 1;
        const newItem = {
            id: Math.floor(Math.random() * 1000000),
            type: 'medal1',
            x: p.x,
            y: p.y + 12,
            vx: 0,
            vy: -12,
            landed: false,
            ch: chId,
            goldValue: amount,
            isPlayerDrop: true,
            amount: amount,
            count: 1,
            isStatic: true,
            angle: 0,
            rotateSpeed: -0.15,
            isPickedUp: false
        };

        // 5. リスト追加と同期
        if (typeof droppedItems !== 'undefined') {
            if (!droppedItems[chId]) droppedItems[chId] = [];
            droppedItems[chId].push(newItem);
            
            socket.emit('chat', {
                id: 'SYSTEM_LOG',
                name: '💰 廃棄',
                text: `[${new Date().toLocaleTimeString()}] ${amount}Gを捨てました`
            });

            io.to(`channel_${chId}`).emit('item_spawned', newItem);
            socket.emit('player_update', p);
            
            if (typeof sendState === 'function') sendState();
            
            if (typeof LOG !== 'undefined' && LOG.SUCCESS) {
                LOG.SUCCESS(`💸 ${p.name} が ${amount}G をドロップしました`);
            }
        }
        return true;
    }
	
	// 🛒 【コマンド8】ショップ入室（修正版）
    if (text === '/shop') {
        console.log("--- [1] コマンド検知しました ---");
        (async () => {
            try {
                const shopInventory = await getShopInventory(pool);
                console.log("--- [2] DBからの応答を共通関数で処理完了 ---");

                socket.emit('open_shop_ui', {
                    shopName: "よろず屋",
                    inventory: shopInventory
                });
                console.log(`--- [3] 全${shopInventory.length}件のアイテム送信完了 ---`);
            } catch (err) {
                console.error("❌ ショップ入室エラー:", err.message);
            }
        })();
        return true; 
    }

    // 🏪 【コマンド9】フリーマーケット（露店）開設 🌟新規追加
    if (text === '/freemarket') {
        console.log(`--- [Vending] ${p.name} が露店コマンドを入力 ---`);

        // クライアント側で店名入力プロンプトを出すためのトリガーを送信
        // または、デフォルト名で即時開店させる場合はサーバー側で完結させます
        socket.emit('request_open_vending_ui'); 
        
        if (typeof LOG !== 'undefined' && LOG.SUCCESS) {
            LOG.SUCCESS(`🏪 ${p.name} の露店開設プロセスを開始しました`);
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
    /*
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
    */

    // 🌟 修正ポイント：既にログイン処理（socket.on('login')）で読み込まれたデータを一時退避
    const existingData = players[socket.id] || {};

    // 🌟 追記：現在のレベルに基づいて正しい最大経験値を算出
    const currentLevel = (existingData.level !== undefined) ? existingData.level : 1;
    const correctMaxExp = (typeof LEVEL_TABLE !== 'undefined' && LEVEL_TABLE[currentLevel]) 
                          ? LEVEL_TABLE[currentLevel] 
                          : 100;

    // 🌟 プレイヤーデータの作成
    players[socket.id] = {
        // 🌟 【修正】：固定の 10 ではなく、ログイン時にDBから取得して保存していたIDをそのまま引き継ぐ
        // existingData.dbId があればそれを使い、なければ existingData.id を予備として参照します。
        dbId: existingData.dbId || existingData.id || null,

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
        level: currentLevel,
        exp: (existingData.exp !== undefined) ? existingData.exp : 0,
        maxExp: correctMaxExp, // 🌟 修正：100固定を廃止し、算出された最大値を割り当て

        // --- ⚔️ 今日決めた緻密なステータスを追加 ⚔️ ---
        // DBに保存されている値があればそれを使い、なければ初期値を設定
        str: existingData.str || 50,      // 初期攻撃力
        dex: existingData.dex || 4,       // 初期命中率
        luk: existingData.luk || 4,       // 初期幸運
        ap: (existingData.ap !== undefined) ? existingData.ap : 0,        // 振り分け可能な能力ポイント
        // ------------------------------------------
		
		weaponAtk: existingData.weaponAtk || 10, // 🌟 武器の強さ

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

    // 🌟 重要：作成されたデータを即座にクライアントへ同期させる
    if (typeof emitPlayerUpdate === 'function') {
        emitPlayerUpdate(socket.id);
    }

    // 確認用のログ（dbIdが正しく入っているかも含めて出力）
    console.log(`[Join同期完了] ${name} (DB_ID: ${players[socket.id].dbId}, LV: ${players[socket.id].level}, Exp: ${players[socket.id].exp}/${players[socket.id].maxExp})`);
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
    const atkWidth = 80;  
    const atkHeight = 100; 

    // 左右のオフセット
    const offsetX = (p.dir === 1) ? 60 : -(atkWidth + 20);

    let atkY;
    const groundThreshold = 450; 

    if (p.y >= groundThreshold) {
        atkY = p.y - 85; 
    } else {
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
        if (target.alive && !target.isFading) {
            const enemyW = target.w || 40;
            const enemyH = target.h || 40;
            const enemyY = target.y + (target.jumpY || 0);

            const isHit = atkBox.x < target.x + enemyW &&
                          atkBox.x + atkBox.w > target.x &&
                          atkBox.y < enemyY + enemyH &&
                          atkBox.y + atkBox.h > enemyY;

            if (isHit) {
                const dist = Math.sqrt(Math.pow(target.x - p.x, 2) + Math.pow(target.y - p.y, 2));
                targetsInRange.push({ enemy: target, dist: dist });
            }
        }
    });

    // --- ② 最も近い敵「だけ」にダメージを与える ---
    if (targetsInRange.length > 0) {
        targetsInRange.sort((a, b) => a.dist - b.dist);
        const nearest = targetsInRange[0].enemy;

        const wasAlive = nearest.alive;

        // 🌟 【COMBAT_FORMULA の導入】
        // 計算エンジンからダメージ結果を取得
        const dmgResult = COMBAT_FORMULA.generateDamage(p);
        const damage = dmgResult.val;
        
        nearest.hp -= damage; // 敵のHPを減らす

        // 🌟 【確定死亡判定】
        const isFatalBlow = (nearest.hp <= 0 && wasAlive);

        // 🌟 【音の同期用】同じ部屋(チャンネル)の全員にのみ「ヒット通知」を送る
        io.to(`channel_${chId}`).emit('enemy_hit_sync', { 
            enemyId: nearest.id, 
            attackerId: socket.id,
            isDead: isFatalBlow 
        });
        
        console.log(`[2.命中確認] ch:${chId}の${nearest.type}に${damage}ダメージ(幅:${dmgResult.min}-${dmgResult.max})。残りHP: ${nearest.hp}`);

        // 攻撃された敵を「怒り状態」にして反撃の準備をさせる
        nearest.isEnraged = true;

        if (nearest.isAttacking <= 0) {
            setTimeout(() => {
                if (nearest && nearest.hp > 0) {
                    nearest.isAttacking = 22;
                }
            }, 1000);
        }

        // 敵をノックバック
        nearest.kbV = p.dir * (nearest.type === 'monster3' ? 6 : 12);
        nearest.dir = (p.x < nearest.x) ? -1 : 1; 

        // 画面に「バシッ！」というダメージエフェクトを同じチャンネルの全員に送る
        io.to(`channel_${chId}`).emit('damage_effect', {
            x: nearest.x + (nearest.w || 40) / 2,
            y: nearest.y,
            val: damage,
            // 🌟 dmgResult からクリティカル判定を適用
            isCritical: dmgResult.isCritical, 
            type: 'enemy_hit'
        });

        // --- 💀 死亡判定と報酬処理 ---
        if (isFatalBlow) {
            nearest.alive = false;
            const rewardExp = nearest.exp || 10; 
            socket.emit('exp_log', { amount: rewardExp }); 
            addExperience(p, rewardExp, socket);
            spawnDropItems(nearest, chId);
            
            nearest.hp = 0;
            nearest.isFading = true;
            nearest.deathFrame = 0;
            p.score = (Number(p.score) || 0) + 100;
        }
    }
}

/**
 * 3. アイテムを拾ったときの処理（重なり対策・5ch対応・DB永続化・カバン満杯対策済み）
 * --------------------------------------------------
 * 役割：足元のアイテムを順番にチェックし、拾えるものから優先的に取得します。
 */
function handlePickup(socket) {
    try {
        const player = players[socket.id];
        if (!player) return;

        console.log(`--- [DEBUG: Pickup開始] Player: ${player.name || socket.id} ---`);

        const chId = player.channel || 1;
        const currentItems = droppedItems[chId] || [];

        const now = Date.now();
        if (player.lastPickupTime && (now - player.lastPickupTime < 150)) {
            console.log("DEBUG: クールタイム中のためスキップ");
            return; 
        }

        if (!currentItems || currentItems.length === 0) return;

        // ------------------------------------------------------------
        // 🌟 足元にある拾える候補アイテムをすべて抽出
        // ------------------------------------------------------------
        const candidates = currentItems.filter(it => {
            if (it.isPickedUp) return false;

            // 距離判定
            let dx = Math.abs(player.x - it.x);
            let dy = Math.abs(player.y - it.y);

            if (!it.landed) { dx = 0; dy = 0; }

            return dx <= SETTINGS.ITEM.PICKUP_RANGE_X && dy <= SETTINGS.ITEM.PICKUP_RANGE_Y;
        });

        if (candidates.length === 0) {
            console.log("DEBUG: 拾える範囲にアイテムがありません");
            return;
        }

        // ------------------------------------------------------------
        // 🌟 重なっている中から「実際に拾えるもの」を一つ選ぶ
        // ------------------------------------------------------------
        let targetItem = null;
        const inventoryTypes = ['shield', 'gold', 'treasure', 'sword', 'sweets', 'scroll_star'];

        for (const item of candidates) {
            const isInventoryItem = inventoryTypes.includes(item.type);

            if (isInventoryItem) {
                // カバンの初期化（未定義対策）
                if (!player.inventory) player.inventory = Array(10).fill(null);

                let canPickupThis = false;
                const category = itemCategories[item.type];

                // スタック可能かチェック
                if (category === 'ETC' || category === 'USE') {
                    const stackIndex = player.inventory.findIndex(slot => slot && slot.type === item.type);
                    if (stackIndex !== -1) canPickupThis = true;
                }

                // 空きスロットがあるかチェック
                if (!canPickupThis) {
                    const emptySlotIndex = player.inventory.findIndex(slot => 
                        slot === null || slot === undefined || (typeof slot === 'object' && Object.keys(slot).length === 0)
                    );
                    if (emptySlotIndex !== -1) canPickupThis = true;
                }

                if (canPickupThis) {
                    targetItem = item;
                    break; // 拾えるものが見つかったのでループを抜ける
                }
            } else {
                // ゴールドやスコアアイテムなど、カバン制限がないものは即決定
                targetItem = item;
                break;
            }
        }

        // 全候補チェックした結果、どれも拾えなかった場合
        if (!targetItem) {
            socket.emit('chat', {
                id: 'SYSTEM_LOG',
                name: '⚠️ 警告',
                text: `[${new Date().toLocaleTimeString()}] バッグがいっぱいで拾えません！`
            });
            return;
        }

        // ------------------------------------------------------------
        // 🌟 以降、元のロジックを踏襲して「targetItem」を処理
        // ------------------------------------------------------------
        targetItem.isPickedUp = true;
        player.lastPickupTime = now;

        const idx = currentItems.findIndex(it => it.id === targetItem.id);
        if (idx !== -1) {
            const removedItem = currentItems.splice(idx, 1)[0];
            if (!removedItem) return;

            // 金額・メダルの処理
            if (removedItem.type === 'medal1' || removedItem.goldValue) {
                const baseAmount = removedItem.goldValue || 10;
                let amount;

                // 🌟 判定：プレイヤーが捨てたフラグがあるか？
                if (removedItem.isPlayerDrop) {
                    amount = baseAmount; // 捨てた額をそのまま（固定）
                } else {
                    // 👾 敵からのドロップなら乱数で変動させる
                    amount = Math.floor(baseAmount * (0.8 + Math.random() * 0.4));
                }

                player.gold = (player.gold || 0) + amount;
                socket.emit('gold_log', { amount: amount });
                io.to(`channel_${chId}`).emit('player_update', player);
            }

            // エフェクト同期
            if (typeof lastPickedItems !== 'undefined') {
                lastPickedItems.push({
                    type: removedItem.type,
                    x: (removedItem.x && removedItem.x !== 0) ? removedItem.x : player.x,
                    y: (removedItem.y && removedItem.y !== 0) ? removedItem.y : player.y,
                    pickerId: socket.id,
                    totalALLStats: removedItem.totalALLStats || 0,
                    totalFirstStats: removedItem.totalFirstStats || 0,
                    ch: chId
                });
            }

            const isInventoryItem = inventoryTypes.includes(removedItem.type);
            if (isInventoryItem) {
                let stacked = false;
                const actualCount = removedItem.count || removedItem.amount || 1;
                let itemName = SERVER_ITEM_NAMES[removedItem.type] || 'アイテム';
                const pickupMsg = `${itemName}を手に入れました`;

                // スタック処理
                const category = itemCategories[removedItem.type];
                if (category === 'ETC' || category === 'USE') {
                    const stackIndex = player.inventory.findIndex(slot => slot && slot.type === removedItem.type);
                    if (stackIndex !== -1) {
                        player.inventory[stackIndex].count = (player.inventory[stackIndex].count || 0) + actualCount;
                        stacked = true;
                        saveInventoryToDB(player, player.inventory[stackIndex], stackIndex);
                        socket.emit('chat', { id: 'SYSTEM_LOG', name: '🎊 入手', text: `[${new Date().toLocaleTimeString()}] ${pickupMsg}` });
                        
                        // 🌟 【修正】スタック時にも入手ログイベントを送信する
                        socket.emit('item_pickup_log', { amount: actualCount, itemName: itemName });
                    }
                }

                // 新規格納
                if (!stacked) {
                    let emptySlotIndex = player.inventory.findIndex(slot => 
                        slot === null || slot === undefined || (typeof slot === 'object' && Object.keys(slot).length === 0)
                    );

                    if (emptySlotIndex !== -1) {
                        // 🌟 修正ポイント：...removedItem で全ステータス（item_id含む）を確実に継承
                        // これにより拾い直し直後でも売却可能な有効なアイテムデータがメモリに展開されます
                        player.inventory[emptySlotIndex] = { 
                            ...removedItem,
                            item_id: removedItem.itemId || removedItem.item_id, // カタログIDを確実にセット
                            instanceId: removedItem.instanceId || null,
                            type: removedItem.type, 
                            count: actualCount,
                            // 元のロジックを維持しつつ、値がない場合のみデフォルト値を設定
                            atk: (removedItem.atk !== undefined) ? removedItem.atk : ((removedItem.type === 'sword') ? 10 : 0), 
                            def: (removedItem.def !== undefined) ? removedItem.def : ((removedItem.type === 'shield') ? 5 : 0)
                        };

                        saveInventoryToDB(player, player.inventory[emptySlotIndex], emptySlotIndex);
                        socket.emit('chat', { id: 'SYSTEM_LOG', name: '🎊 入手', text: `[${new Date().toLocaleTimeString()}] ${pickupMsg}` });
                        socket.emit('item_pickup_log', { amount: actualCount, itemName: itemName });
                    }
                }
            } else if (!(removedItem.type === 'medal1' || removedItem.goldValue)) {
                player.score = (player.score || 0) + (removedItem.type === 'money3' ? 100 : 10);
            }

            // クライアントへ最新の配列を送信（拾い直し直後の売却ボタンの有効化に必須）
            socket.emit('inventory_update', player.inventory);
            if (typeof sendState === 'function') sendState();
        }
    } catch (error) {
        console.error("❌ handlePickup Error:", error);
    }
}

/**
 * 補助関数: user_inventory と equipment_instances をセットで保存する
 * 既存のロジックとデバッグログを完全に踏襲し、UserIDの不一致を徹底追跡
 * 修正内容：equipment_instances 保存時の item_id を sword=101, shield=102 に固定
 */
function saveInventoryToDB(player, itemData, slotIdx) {
    // 🔍 [TRACE:START] 関数の入り口でプレイヤーオブジェクトの全容を把握
    console.log(`[SAVE_TRACE:1] saveInventoryToDB開始 -------------------------`);
    console.log(`[SAVE_TRACE:1-INFO] Slot:${slotIdx}, ItemType:${itemData.type}`);
    console.log(`[SAVE_TRACE:1-CHECK] Playerオブジェクトの状態:`, {
        dbId: player.dbId,
        db_id: player.db_id,
        id: player.id,
        group: player.group,
        name: player.name
    });

    // 🚨 UserID特定ロジック
    const userId = player.dbId || player.db_id || (typeof player.id === 'number' ? player.id : null);
    
    if (!userId) {
        console.error(`[SAVE_TRACE:ERR] !!! userIdの特定に失敗しました !!!`);
        console.error(`[SAVE_TRACE:ERR] 原因: player.dbId も player.db_id も数値ではありません。`);
        console.error(`[SAVE_TRACE:ERR] 現在のplayer.id(socket.id等): ${player.id} (Type: ${typeof player.id})`);
        return;
    }

    console.log(`[SAVE_TRACE:1-RESULT] 採用UserID: ${userId} (Type: ${typeof userId})`);

    const type = String(itemData.type).toLowerCase();

    // ⚔️ 1. 装備品（sword / shield / equip）の判定
    if (type === 'sword' || type === 'shield' || type === 'equip') {
        
        // 🌟 追加ロジック: 既存IDの確認（拾い直し対応）
        const existingInstanceId = itemData.instanceId || itemData.db_id;

        if (existingInstanceId) {
            console.log(`[SAVE_TRACE:2-REUSE] 既存のInstanceID(${existingInstanceId})を検出しました。新規INSERTをスキップします。`);
            
            // 既存IDをそのまま使ってインベントリ情報を更新(所有権移動)
            upsertUserInventory(userId, slotIdx, itemData, existingInstanceId);
            return; 
        }

        console.log(`[SAVE_TRACE:2] 装備品ルート(新規)確定 - INSERT準備開始`);
        
        // 🌟 【修正箇所】保存する item_id を数値（文字列）に変換
        let dbItemId = type;
        if (type === 'sword') dbItemId = '101';
        else if (type === 'shield') dbItemId = '102';

        const eqSql = `INSERT INTO equipment_instances (
            player_id, item_id, name, display_name, image_name, 
            category, atk, matk, def, str, 
            dex, \`int\`, luk, maxHp, maxMp, 
            totalFirstStats, totalALLStats
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        const eqParams = [
            Number(userId),                                         // player_id
            String(dbItemId),                                       // 🌟 修正した item_id (101 or 102)
            String(itemData.name || (type === 'sword' ? "剣" : "盾")), // name
            String(itemData.displayName || (type === 'sword' ? "剣" : "盾")), // display_name
            String(itemData.imageName || type),                     // image_name
            type,                                                   // category
            Number(itemData.atk) || 0, 
            Number(itemData.matk) || 0, 
            Number(itemData.def) || 0, 
            Number(itemData.str) || 0, 
            Number(itemData.dex) || 0, 
            Number(itemData.int) || 0, 
            Number(itemData.luk) || 0,
            Number(itemData.maxHp) || 0, 
            Number(itemData.maxMp) || 0,
            Number(itemData.totalFirstStats) || 0, 
            Number(itemData.totalALLStats) || 0
        ];

        console.log(`[SAVE_TRACE:3] equipment_instancesへのpool.query実行直前 - ItemID: ${dbItemId}`);
        console.log(`[SAVE_TRACE:3-PARAM_CHECK] player_id(FirstParam): ${eqParams[0]}`);

        let isResponded = false;
        const safetyNet = setTimeout(() => {
            if (!isResponded) {
                console.warn(`[SAVE_TRACE:TIMEOUT] DB(equipment_instances)から3秒間応答がありません。`);
                console.warn(`[SAVE_TRACE:TIMEOUT] 救済措置としてInstanceID無しでインベントリ保存を試みます。`);
                upsertUserInventory(userId, slotIdx, itemData, null);
            }
        }, 3000);

        // 🌟 Promise形式
        pool.query(eqSql, eqParams)
            .then(([result]) => {
                isResponded = true;
                clearTimeout(safetyNet);
                
                const newEquipmentId = result.insertId;
                console.log(`[SAVE_TRACE:4] equipment_instances保存成功! NewInstanceID: ${newEquipmentId}`);

                // メモリ上の同期
                if (player.inventory && player.inventory[slotIdx]) {
                    player.inventory[slotIdx].instanceId = newEquipmentId;
                    console.log(`[SAVE_TRACE:4-MEM] メモリ上のスロット ${slotIdx} に InstanceID を紐付けました`);
                } else {
                    console.warn(`[SAVE_TRACE:4-WARN] メモリ上のスロット ${slotIdx} が既に行方不明です(ログアウト等)`);
                }

                console.log(`[SAVE_TRACE:5] 次のステップ: upsertUserInventory(User:${userId}, Slot:${slotIdx}) を呼び出します`);
                upsertUserInventory(userId, slotIdx, itemData, newEquipmentId);
            })
            .catch((err) => {
                isResponded = true;
                clearTimeout(safetyNet);
                console.error("❌ [SAVE_TRACE:ERR-SQL] equipment_instances 保存失敗:", err.message);
                console.error("❌ [SAVE_TRACE:ERR-SQL] 失敗したSQLパラメータ:", eqParams);
                // 失敗してもインベントリ枠だけは確保を試みる
                upsertUserInventory(userId, slotIdx, itemData, null);
            });

    } else {
        // 🍎 2. 消費・ETC（装備品以外）
        console.log(`[SAVE_TRACE:2-ELSE] 非装備品ルート - 💡直接upsertUserInventoryへ移行`);
        console.log(`[SAVE_TRACE:2-ELSE-INFO] User:${userId}, Slot:${slotIdx}, Type:${type}`);
        upsertUserInventory(userId, slotIdx, itemData, null);
    }
}

/**
 * ログイン時にユーザーのインベントリと装備詳細を読み込む (超詳細デバッグログ版)
 * 🌟 修正点: 
 * 1. 更新・削除用に user_inventory の主キー(i.id)を db_id として取得
 * 2. 空白スロット再現のため、slot_index を返却オブジェクトに含めるようにしました。
 * 3. 装備レベル(lv)を equipment_instances から取得するように追加しました。
 */
async function loadUserInventory(userId) {
    console.log(`\n==== [LOAD_DEBUG: START] UserID: ${userId} のデータ復元プロセス開始 ====`);

    // JOINを使って、インベントリ情報と装備のステータスを一度に取得する
    // 🌟 i.id を db_slot_id として追加取得します
    // 🌟 e.level を追加して装備レベルを取得します
    const sql = `
        SELECT 
            i.id AS db_slot_id, 
            i.slot_index, i.item_type, i.item_id, i.quantity, i.is_equipped, i.equipment_id,
            e.name, e.display_name, e.image_name, e.atk, e.matk, e.def, 
            e.str, e.dex, e.\`int\`, e.luk, e.maxHp, e.maxMp,
            e.lv, 
            e.totalFirstStats, e.totalALLStats
        FROM user_inventory i
        LEFT JOIN equipment_instances e ON i.equipment_id = e.id
        WHERE i.user_id = ?
        ORDER BY i.slot_index ASC
    `;

    try {
        console.log(`[LOAD_DEBUG:1] SQLクエリ実行中...`);
        const [rows] = await pool.query(sql, [userId]);
        
        console.log(`[LOAD_DEBUG:2] DBからの応答: ${rows.length}件のアイテムが見つかりました`);

        // ゲーム内プレイヤーオブジェクトに渡すための配列を成形
        const inventory = rows.map((row, index) => {
            console.log(` --- [Slot:${row.slot_index}] 解析開始 (${row.item_type}) ---`);

            const item = {
                slot_index: row.slot_index, // 🌟 追記：ログイン処理での配置に必要
                type: row.item_type,   // 例: 'sword', 'shield'
                id: row.item_id,       // クライアント表示用のID
                db_id: row.db_slot_id, // 🌟 データベース操作用の数値ID
                count: row.quantity,
                isEquipped: row.is_equipped === 1,
                instanceId: row.equipment_id
            };

            // 装備品（equipment_idがある場合）はステータスも付与
            if (row.equipment_id) {
                console.log(`   [Equip検出] instanceId: ${row.equipment_id} の詳細をマッピングします`);
                
                item.name = row.name;
                item.displayName = row.display_name;
                item.imageName = row.image_name;
                item.atk = row.atk;
                item.matk = row.matk;
                item.def = row.def;
                item.str = row.str;
                item.dex = row.dex;
                item.int = row.int;
                item.luk = row.luk;
                item.maxHp = row.maxHp;
                item.maxMp = row.maxMp;

                // 🌟 追加: レベル情報をクライアントが期待する 'lv' という名前で入れる
                item.lv = row.lv || 0;

                item.totalFirstStats = row.totalFirstStats;
                item.totalALLStats = row.totalALLStats;

                // 正常に数値が入っているかチェック
                if (item.atk > 0 || item.def > 0) {
                    console.log(`    -> 性能確認済: Atk:${item.atk}, Def:${item.def}, Str:${item.str}, Lv:${item.lv}`);
                }
            } else {
                console.log(`   [Item検出] 装備詳細なし (一般アイテムルート)`);
            }

            return item;
        });

        console.log(`==== [LOAD_DEBUG: END] インベントリ復元完了 (全${inventory.length}個) ====\n`);
        return inventory;

    } catch (err) {
        console.error(`\n❌ [LOAD_DEBUG: FATAL ERROR] インベントリ読み込みに失敗しました`);
        console.error(`エラー詳細: ${err.message}`);
        if (err.sqlState) console.error(`SQLの状態: ${err.sqlState}`);
        console.error(`==========================================================\n`);
        return [];
    }
}

/**
 * user_inventory テーブルへの書き込み
 * 既存ロジックを完全踏襲しつつ、goldを301として保存
 */
function upsertUserInventory(userId, slotIdx, itemData, equipmentId = null) {
    console.log(`>>> [UPSERT_TRACE:1] 開始 - User:${userId} Slot:${slotIdx} Type:${itemData.type} EquipID:${equipmentId}`);

    const sql = `
        INSERT INTO user_inventory 
            (user_id, item_type, slot_index, item_id, quantity, equipment_id)
        VALUES (?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
            item_type = VALUES(item_type),
            item_id = VALUES(item_id),
            quantity = VALUES(quantity),
            equipment_id = VALUES(equipment_id)
    `;

    // 🌟 修正箇所：finalItemId の決定ロジック
    // 特定の type を ID に変換して保存するルール
    let finalItemId;
    if (itemData.type === 'gold') {
        finalItemId = '301';
    } else if (itemData.type === 'sweets') {
        finalItemId = '201';
    } else if (itemData.type === 'scroll_star') {
        finalItemId = '202';
    } else if (itemData.type === 'treasure') {
        finalItemId = '302';
    } else if (itemData.type === 'sword') {
        finalItemId = '101'; // 🌟 sword の時は 101
    } else if (itemData.type === 'shield') {
        finalItemId = '102'; // 🌟 shield の時は 102
    } else {
        // それ以外（sweets等）は既存の ID または type を使用
        finalItemId = (itemData.id || itemData.type);
    }

    const params = [
        Number(userId), 
        String(itemData.type), 
        Number(slotIdx), 
        String(finalItemId), 
        Number(itemData.count || 1), 
        (equipmentId !== undefined ? equipmentId : null)
    ];

    console.log(`>>> [UPSERT_TRACE:2] user_inventoryへのpool.query実行直前 - FinalItemID: ${finalItemId}`);

    // 🌟 Promise環境に対応
    pool.query(sql, params)
        .then(() => {
            console.log(`✅ DB: user_inventory Slot ${slotIdx} 同期完了 [Type: ${itemData.type}, ItemID: ${finalItemId}, InstanceID: ${equipmentId}]`);
        })
        .catch((err) => {
            console.error(`❌ DB: user_inventory Slot ${slotIdx} 保存エラー:`, err.message);
            console.error(`   詳細データ: UserID=${userId}, ItemID=${finalItemId}, EquipID=${equipmentId}`);
        });
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

                // --- 🌟 攻撃アニメーションと判定の管理 ---
                if (e.isAttacking > 0) {
                    e.isAttacking--;

                    // ⚔️ 振り下ろし判定：22から始まるカウントのうち、15〜8の時だけ当たり判定を出す
                    // これにより「振りかぶっている間」や「振り切った後」は当たらないようになります
                    if (e.isAttacking <= 15 && e.isAttacking >= 8) {
                        e.isAttackingHitFrame = true;
                    } else {
                        e.isAttackingHitFrame = false;
                    }
                } else {
                    e.isAttackingHitFrame = false; // 攻撃していない時は判定OFF
                    if (e.isEnraged) {
                        // 🌟 怒り状態なら1%の確率で攻撃開始 (22フレーム設定)
                        if (Math.random() < 0.01) e.isAttacking = 22;
                    }
                }

                // --- 🌟 プレイヤーへのダメージ判定処理の呼び出し ---
                // ※この関数の外または下で定義されているダメージチェックを呼び出します
                checkMonsterHitsPlayers(e, chId);

            } catch (err) {
                console.error(`[ENEMY ERROR] ch:${chId}, index:${index}, ID:${e.id}`, err);
            }
        });

        // 3. 🌟 重要：そのチャンネル（Room）にいるプレイヤーだけに、そのchの敵データを送る
        io.to(`channel_${chId}`).emit('update_enemies', currentEnemies);
    });
}

/**
 * ⚔️ モンスターの攻撃がプレイヤーに当たっているか計算する関数
 */
function checkMonsterHitsPlayers(enemy, chId) {
    // そのチャンネルにいるソケットIDのリストを取得
    const room = io.sockets.adapter.rooms.get(`channel_${chId}`);
    if (!room) return;

    room.forEach(socketId => {
        const player = players[socketId]; // サーバー側で保持しているプレイヤーデータ
        if (!player || player.hp <= 0) return;

        // 1. 本体の接触判定（常に有効）
        let isHit = isRectOverlapping(
            enemy.x, enemy.y, enemy.w, enemy.h,
            player.x, player.y, player.w, player.h
        );

        // 2. 🌟 攻撃判定フレーム中なら、剣の範囲(swordRange)を追加
        if (enemy.isAttackingHitFrame) {
            let swordRange = 60; // 剣の見た目に合わせた長さ
            // 向き(dir: 1が右, -1が左)に応じて、判定ボックスの位置をずらす
            let attackX = (enemy.dir === 1) ? (enemy.x + enemy.w) : (enemy.x - swordRange);
            
            let swordHit = isRectOverlapping(
                attackX, enemy.y, swordRange, enemy.h,
                player.x, player.y, player.w, player.h
            );

            if (swordHit) isHit = true;
        }

        // ヒットした場合の処理
        if (isHit) {
            // ここに player.hp -= 10; などのダメージ処理や、
            // io.to(socketId).emit('player_hit') などの通知を書きます
        }
    });
}

/**
 * 📐 汎用：2つの四角形が重なっているか判定する
 */
function isRectOverlapping(x1, y1, w1, h1, x2, y2, w2, h2) {
    return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
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

// 🌟 追加：ログイン中の全プレイヤーリストを全員に送る関数
function emitPlayerList() {
    const playerList = Object.values(players).map(p => ({
        name: p.name || 'Player',
        channel: p.channel || 1
    }));
    io.emit('updatePlayerList', playerList);
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