/**
 * ==============================================================================
 * 🏰 GAME SERVER CORE - Tsuchida's Fortress
 * ==============================================================================
 * 🗺️ [灯台地図：主要ロジックへのアクセス拠点]
 * 
 * --- ⚙️ システム・メインループ ---
 * :::MAIN_LOOP        :: サーバー心臓部（更新・同期・デバッグ監視）
 * :::SOCKET_CONNECTION :: サーバー正門（接続・初期データ配信）
 * :::GET_JST           :: 時の基点（日本時間生成）
 * 
 * --- 👾 敵・キャラクター管理 ---
 * :::CLASS_ENEMY      :: 敵のAI・物理演算・生態定義
 * :::UPDATE_ENEMIES   :: 全チャンネルの敵更新・当たり判定
 * :::UPDATE_PLAYERS   :: プレイヤー行動タイマー・フレーム同期
 * 
 * --- ⚔️ 戦闘・物理演算 ---
 * :::CHECK_HIT        :: モンスターの当たり判定・被弾計算
 * :::CHECK_LANDING    :: アイテムの着地判定
 * :::IS_OVERLAP       :: 衝突判定の礎（四角形交差）
 * :::UPDATE_ITEMS     :: アイテム物理・着地同期
 * 
 * --- 📡 通信・状態同期 ---
 * :::SEND_STATE       :: チャンネル別状態同期
 * :::BROADCAST_COUNTS :: チャンネル別人数集計・放送
 * :::EMIT_PLAYER_LIST :: 冒険者リスト共有
 * 
 * --- 🛠️ ユーティリティ・基盤 ---
 * :::HANDLE_CHAT      :: 対話・ログ
 * :::HANDLE_DAMAGED   :: 被ダメージ・蘇生
 * :::SAVE_INV         :: インベントリ永続化
 * :::HANDLE_PICKUP    :: アイテム収集
 * :::HANDLE_ATTACK    :: 攻撃処理
 * :::HANDLE_JOIN      :: ログイン・初期化
 * :::EXEC_ADMIN_CMD   :: 管理コマンド
 * ==============================================================================
 */

// 🛠️ メンテナンス中フラグ（true にするとメンテナンス, false で通常営業）
const IS_MAINTENANCE = false;

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

const playerStatusCache = {};

// ============================================================
// :::CORS::: 🌐 【動的CORS対応】50以上のドメインをDBから自動判定する関数
// ============================================================
const checkDynamicOrigin = async (origin, callback) => {

    // ⚙️ 【開発用テストスイッチ】
    // true : ローカル環境（localhost等）であっても、無条件通過させずに本番同様のDB照合テストを行います。
    // false: 本番環境用。ローカル環境からのアクセスは以下のセーフティネットで無条件許可されます。
    const IS_TEST_CORS_LIVE = true; 

    // 🛡️ 1. ローカル環境、またはoriginが未定義（同一サーバー内通信など）の場合は無条件で許可
    // 🌟 修正：テストスイッチが false のときだけ、このローカル自動通過ロジックが働きます。
    if (!IS_TEST_CORS_LIVE && (
        !origin || 
        origin.includes("localhost") || 
        origin.includes("127.0.0.1") || 
        origin.startsWith("file://")
    )) {
        
        // 📢 デバッグログ：ローカル環境のため自動通過したことを記録
        console.log(`[CORS LOCAL] 本物のローカル環境または内部通信のため無条件で許可しました: ${origin || '未定義(Internal)'}`);
        return callback(null, true);
    }

    try {
        // 🌟 テストモードかつoriginが空（同一サーバー内通信等）だった場合の安全なフォールバック
        const searchOrigin = origin || "http://localhost:3000";

        // 🗄️ 2. アクセスしてきたドメインが、MySQLの許可リストテーブルに登録されているか検索
        // ※「pool」または「db」など、お使いのmysql接続オブジェクト名に合わせてください
        const [rows] = await pool.query("SELECT id FROM allowed_domains WHERE domain = ? LIMIT 1", [searchOrigin]);
        
        // 📢 デバッグログ：実際にDBへ検証しに行ったドメインと、返ってきた行数を記録
		// 2026-8-5停止
        //console.log(`[CORS CHECK] DB照合中... 判定ドメイン: ${searchOrigin} / 登録一致数: ${rows.length}`);
        
        if (rows.length > 0) {
            // リストに存在すれば通信を許可！
            // 📢 デバッグログ：正常にDBに登録されていた場合
			// 2026-8-5停止
            //console.log(`[CORS SUCCESS] ✅ 通信許可: リストに登録されている正規のドメインです: ${searchOrigin}`);
            callback(null, true);
        } else {
            // リストにない怪しいドメインは遮断（セキュリティガード）
            // 📢 デバッグログ：リストになく遮断された場合（オリジナルを引き継ぎつつ強化）
            console.log(`[CORS BLOCK] ❌ 通信拒否: 許可リストにない未登録ドメインからのアクセスを遮断しました: ${searchOrigin}`);
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
// :::IO_CORS::: 🌐 【重要】リアルタイム通信（Socket.io）の設定（完全踏襲・動的CORS版）
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

// 🛠️ デバッグ支援：GRAY（グレー）を追加
const LOG = {
    SYS:       (txt) => debugChat(txt, 'info'),    // 青色：システム動作
    DB:        (txt) => debugChat(txt, 'db'),      // 紫色：データベース接続
    ERR:       (txt) => debugChat(txt, 'error'),   // 赤色：重大なエラー
    SUCCESS:   (txt) => debugChat(txt, 'success'), // 緑色：レベルアップやドロップ
    WARN:      (txt) => debugChat(txt, 'warn'),    // 黄色：ちょっとした警告
    ITEM:      (txt) => debugChat(txt, 'success'), // 🎁 アイテム用（緑色）
    GRAY:      (txt) => debugChat(txt, 'gray')     // 👈 追加：グレー用（※debugChat側に 'gray' のスタイル定義が必要です）
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
    ENEMY_MIN_X: 0,
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
/*
const SHIELD_CHANCE = {
    LEGENDARY: 5,  // 💜 最高級が出る確率 (%)
    RARE:      15, // 💛 良品が出る確率 (%)
    // 残りの 80% は通常・壊れかけになります
};
*/

// ⚔️ 戦闘計算エンジン
const COMBAT_FORMULA = {
    // 熟練度（最小ダメージの割合。0.6 = 60%）
    MASTERY: 0.6,
    
    // 最大ダメージ計算 (STR*4 + DEX) * ATK / 10
    calcMaxDamage: (p) => {
        const str = p.str || 4;
        const dex = p.dex || 4;
        
        // 🌟 【修正】武器攻撃力だけでなく、DBやレベルから取得したプレイヤーの基礎ATK（p.atk）を反映させる
        const playerAtk = p.atk || 13; 
        const weaponAtk = p.weaponAtk || 10;
        
        // 例：基礎ATKと武器ATKを合算するか、ATK自体を計算式の係数として使うなどお好みのバランスに
        // ここでは p.atk をそのまま ATK 部分の数値として採用する例です
        return Math.floor(((str * 4) + dex) * playerAtk / 10);
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

//const loggedInUsers = new Set();

const activeLogins = {}; // 🌐 現在ログイン中のユーザーIDとsocket.idを管理するマップ

// 【重要】既存のログイン処理を切り出した関数
async function performLogin(socket, user, token, channel, group, style_id) {
    try {
        // 🔒 すでに同じユーザー（user.id）が別の場所でログインしていないかチェック
        const userId = user.id;
        if (activeLogins[userId]) {
            const existingSocketId = activeLogins[userId];
            
            // 既存の接続が自分自身でなければ、二重ログインとみなす
            if (existingSocketId !== socket.id) {
                console.log(`⚠️ 二重ログイン検知: ユーザーID ${userId} (${user.username}) は既に別の画面で接続中です。`);
                
                // 新しい方のログインを拒否
                socket.emit('login_response', { success: false, message: 'すでに他の場所（または別のタブ）でログインしています。' });
                return; // ⚠️ ここで処理を中断
            }
        }

        // 🟢 ログイン成功として、このユーザーIDと現在のソケットIDを紐づけて記録
        activeLogins[userId] = socket.id;

        // 🔌 この接続が切断されたとき（タブを閉じた時など）にリストから削除する
        socket.on('disconnect', () => {
            if (activeLogins[userId] === socket.id) {
                delete activeLogins[userId];
                console.log(`🔌 ログアウト/切断によるアクティブ解除: ${user.username}`);
            }
        });

        // キャラクター選択画面で送られてきた値をDBに反映
        if (group !== undefined || style_id !== undefined) {
            await pool.query(
                'UPDATE player_stats SET model_id = COALESCE(?, model_id), style_id = COALESCE(?, style_id) WHERE user_id = ?', 
                [group, style_id, user.id]
            );
        }

        const statsSql = 'SELECT *, model_id, style_id FROM player_stats WHERE user_id = ?';
        const [statsResults] = await pool.query(statsSql, [user.id]);

        if (statsResults.length === 0) {
            delete activeLogins[userId];
            socket.emit('login_response', { success: false, message: 'キャラクターデータの読み込みに失敗しました' });
            return;
        }

        // 🌟 ログインした瞬間の最新の連携状態をDBから取得
        const [userStatusRows] = await pool.query('SELECT is_linked FROM users WHERE id = ?', [user.id]);
        const isLinked = userStatusRows[0] ? (userStatusRows[0].is_linked === 1) : false;

        const stats = statsResults[0];
        const finalStyleId = (stats.style_id !== null && stats.style_id !== undefined) ? stats.style_id : 1;

        // インベントリロード
        const savedInventory = await loadUserInventory(user.id);
        const fixedInventory = Array(50).fill(null);
        
        savedInventory.forEach((item, index) => {
            if (!item) return;
            const sIdx = item.slot_index !== undefined ? item.slot_index : index;
            if (sIdx >= 0 && sIdx < 50) {
                fixedInventory[sIdx] = item;
            }
        });
		
		// 🌟 【追加①】ここで図鑑データをロードする！
        // 🌟 【修正版】ログイン時の図鑑データロード処理
let playerCardCollection = {};
try {
    const [cardRows] = await pool.query(
        'SELECT monster_id, card_rank, count, unlocked, is_favorite, kill_count, bonus_claimed, first_acquired_time, last_acquired_time FROM player_monster_cards WHERE user_id = ?', 
        [userId]
    );
    
    cardRows.forEach(row => {
        const monsterKey = row.monster_id.toLowerCase();
        const rank = row.card_rank; // 1〜6のランク

        // モンスターごとのオブジェクトがなければ作成
        if (!playerCardCollection[monsterKey]) {
            playerCardCollection[monsterKey] = {};
        }

        // 🌟 ランクごとにデータを格納する（ネスト構造）
        playerCardCollection[monsterKey][rank] = {
            count: row.count,
            unlocked: row.unlocked === 1,
            cardRank: rank, // 念のため保持
            isFavorite: row.is_favorite === 1,
            killCount: row.kill_count,
            bonusClaimed: row.bonus_claimed === 1,
            firstAcquiredTime: row.first_acquired_time,
            lastAcquiredTime: row.last_acquired_time
        };
    });
    
    console.log(`[Card Load] ユーザー ID:${userId} のカード図鑑をロード完了。取得レコード数: ${cardRows.length}`);
} catch (cardErr) {
    console.error('❌ ログイン時の図鑑データロードに失敗しました:', cardErr);
}

        // 🌟 装備中のステータス合計
        let totalStr = 0;
        let totalDex = 0;
        let totalLuk = 0;
        let totalWeaponAtk = 0;
        let totalMaxHp = 0; // 🌟 追加：装備によるHPボーナス集計用
        let totalMaxMp = 0; // 🌟 追加：装備によるMPボーナス集計用

        fixedInventory.forEach((invItem, idx) => {
            if (invItem && invItem.isEquipped) {
                // 🔍 【デバッグ追加】装備品ごとの中身を正確に確認
                console.log(`[DEBUG EQUIP CHECK] スロット${idx} (${invItem.name}): maxHp=${invItem.maxHp}, hp=${invItem.hp}`);

                totalStr += Number(invItem.str) || 0;
                totalDex += Number(invItem.dex) || 0;
                totalLuk += Number(invItem.luk) || 0;
                totalWeaponAtk += Number(invItem.atk) || Number(invItem.power) || 0;
                totalMaxHp += Number(invItem.maxHp) || Number(invItem.hp) || 0; // 🌟 追加
                totalMaxMp += Number(invItem.maxMp) || Number(invItem.mp) || 0; // 🌟 追加
            }
        });

        // 🔍 【デバッグ追加】合算されたボーナス値の確認
        console.log(`[DEBUG BONUS] 算出された totalMaxHp ボーナス:`, totalMaxHp);

        // 基礎値 ＋ 装備ボーナス
        const baseStr = stats.str || 4;
        const baseDex = stats.dex || 4;
        const baseLuk = stats.luk || 4;

        const finalStr = baseStr + totalStr;
        const finalDex = baseDex + totalDex;
        const finalLuk = baseLuk + totalLuk;

        // 🌟 【デバッグ追加】DBから取れた生の stats.atk を確認
        console.log(`🔍 [DEBUG LOGIN] user_id: ${user.id}, DBから取得した stats.atk の値:`, stats.atk);

        // 🌟 データベースの player_atk_table から現在のレベルに対応する ATK を取得
        let dbAtk = 13; // デフォルト値
        try {
            const [atkRows] = await pool.query(
                'SELECT atk FROM player_atk_table WHERE level = ?', 
                [stats.level]
            );
            if (atkRows && atkRows.length > 0) {
                dbAtk = atkRows[0].atk;
                console.log(`✅ [DEBUG LOGIN] player_atk_table から取得成功: level ${stats.level} -> atk ${dbAtk}`);
            } else {
                console.log(`⚠️ [DEBUG LOGIN] player_atk_table に level ${stats.level} が見つかりません`);
            }
        } catch (atkErr) {
            console.error('❌ ログイン時の ATK 取得に失敗しました:', atkErr);
        }

        // 🌟 経験値テーブル（player_exp_table）から必要な経験値を取得（UIの%表示用）
        let requiredExp = 100;
        try {
            const [expRows] = await pool.query(
                'SELECT required_exp FROM player_exp_table WHERE level = ?', 
                [stats.level]
            );
            if (expRows && expRows.length > 0) {
                requiredExp = expRows[0].required_exp;
            }
        } catch (expErr) {
            console.error('❌ ログイン時の required_exp 取得に失敗しました:', expErr);
        }

        const finalAtk = dbAtk + totalWeaponAtk;
        
        // 🌟 【デバッグ追加】最終決定された各ATKの数値をログ出力
        console.log(`🎯 [DEBUG LOGIN] 最終計算結果 -> dbAtk(ベース): ${dbAtk}, totalWeaponAtk(武器): ${totalWeaponAtk}, finalAtk(合算): ${finalAtk}`);

        const selectedChannel = parseInt(channel) || 1;
        const roomName = `channel_${selectedChannel}`;
        
        // 🌟 修正：データベースに保存されている max_hp をベース値として取得する
        // 🌟 データベースの列名揺れ（max_hp / maxhp）に完全対応し、確実にベース値を取得する
        const baseMaxHp = Number(stats.max_hp !== undefined ? stats.max_hp : (stats.maxhp !== undefined ? stats.maxhp : 100));
        const baseMaxMp = Number(stats.max_mp !== undefined ? stats.max_mp : (stats.maxmp !== undefined ? stats.maxmp : 50));
        
        // 🌟 基礎HP ＋ 現在装備しているアイテムの合計HPボーナスを足したものを最終最大HPにする
        const finalMaxHp = baseMaxHp + totalMaxHp;
        const finalMaxMp = baseMaxMp + totalMaxMp;

        // 🔍 【デバッグ追加】最終HPがどう計算されたか確認
        console.log(`[DEBUG HP CALC] DBのbaseMaxHp(${stats.max_hp}) + 装備bonus(${totalMaxHp}) = 最終予測maxHp(${finalMaxHp})`);

        // プレイヤーオブジェクト作成
        players[socket.id] = {
            dbId: user.id,
            id: user.id,
            name: user.username,
            channel: selectedChannel,
            gold: Number(stats.gold || 0),
            level: stats.level,
            exp: stats.exp,
            requiredExp: requiredExp, 
            hp: Math.min(stats.hp, finalMaxHp),
            
            // 🌟 HP・MPのベースと最終値を保持
            baseMaxHp: baseMaxHp,
            bonusMaxHp: totalMaxHp,
            maxHp: finalMaxHp,
            baseMaxMp: baseMaxMp,
            bonusMaxMp: totalMaxMp,
            maxMp: finalMaxMp,

            mp: stats.mp,
            map_id: stats.map_id,
            x: stats.pos_x,
            y: stats.pos_y,
            job_id: stats.job_id,
            model_id: stats.model_id,
            style_id: finalStyleId,
            
            // ステータス関連
            baseStr: baseStr,
            bonusStr: totalStr,
            str: finalStr,

            baseDex: baseDex,
            bonusDex: totalDex,
            dex: finalDex,

            baseLuk: baseLuk,
            bonusLuk: totalLuk,
            luk: finalLuk,

            ap: stats.ap || 0,
            
            // 攻撃力関連
            baseAtk: dbAtk,
            weaponAtk: totalWeaponAtk,
            atk: finalAtk,

            speed: 5.0,
            jumpPower: 15.0,
            
            inventory: fixedInventory,
			cardCollection: playerCardCollection, // 🌟 【追加②】プレイヤーのデータに持たせる
			is_vending: false
        };

        socket.join(roomName);

        // 認証成功のレスポンス
        socket.emit('login_data', {
            success: true,
            id: user.id,
            username: user.username,
            channel: selectedChannel,
            token: token,
            is_linked: isLinked,
            is_online: true,
            stats: {
                level: stats.level,
                exp: stats.exp,
                requiredExp: requiredExp, // 💡 クライアント側で (〇〇%) を計算するためのプロパティ
                model_id: stats.model_id,
                style_id: finalStyleId,
                hp: players[socket.id].hp,
                max_hp: players[socket.id].maxHp,
                baseMaxHp: baseMaxHp,     // 🌟 クライアント用に追加送信
                bonusMaxHp: totalMaxHp,   // 🌟 クライアント用に追加送信
                mp: stats.mp,
                max_mp: players[socket.id].maxMp,
                baseMaxMp: baseMaxMp,     // 🌟 クライアント用に追加送信
                bonusMaxMp: totalMaxMp,   // 🌟 クライアント用に追加送信
                gold: stats.gold,
                map_id: stats.map_id,
                x: stats.pos_x,
                y: stats.pos_y,
                inventory: fixedInventory,
                
                // 各種ステータス
                str: finalStr,
                baseStr: baseStr,
                bonusStr: totalStr,

                dex: finalDex,
                baseDex: baseDex,
                bonusDex: totalDex,

                luk: finalLuk,
                baseLuk: baseLuk,
                bonusLuk: totalLuk,

                // 攻撃力
                atk: finalAtk,
                baseAtk: dbAtk,
                weaponAtk: totalWeaponAtk,

                speed: players[socket.id].speed,
                jumpPower: players[socket.id].jumpPower
            },
            message: 'ログイン成功！'
        });
        
		// 2026-8-30停止
        //console.log("【ログイン時インベントリ確認】4番目(index 3):", fixedInventory[3]);

        socket.emit('inventory_update', fixedInventory);
		
		// 🌟 【追加③】クライアントへ最新の図鑑データを送信！
        socket.emit('card_collection_update', players[socket.id].cardCollection);
		
        socket.to(roomName).emit('player_joined', players[socket.id]);
        
        socket.username = user.username;

    } catch (err) {
        console.error("❌ performLogin処理エラー:", err);
        if (user && user.id) delete activeLogins[user.id];
        socket.emit('login_response', { success: false, message: 'ログイン後のデータ読み込みに失敗しました' });
    }
}

// サーバー側のどこか分かりやすい場所に用意しておく入れ物
const tradePartners = {};
// 🔒 トレードのペアごとのロック回数を記録する場所
const tradePairLocks = {};

// ============================================================
// :::SOCKET_CONNECTION::: 📞 サーバー正門・新規接続処理・初期データ配信
// ============================================================
io.on('connection', socket => {

	// 🌟 これが全てのイベントの「検問所」になります
    socket.onAny((event, ...args) => {
		// move イベントは無視（除外）する
		if (event === 'move') return;
		// 2026-8-5停止
        //console.log(`📡 [DEBUG_ANY] イベント受信: "${event}"`, args);
    });
	
    // 🛡️ 通信の根本を try-catch で保護
    try {
		// 🚧 【追加】全体メンテナンスの強制シャットアウト・ゲートキーパー
        if (typeof IS_MAINTENANCE !== 'undefined' && IS_MAINTENANCE) {
            socket.emit('login_response', { 
                success: false, 
                message: '現在、サーバーはメンテナンス中です。終了までお待ちください。' 
            });
            return; // 正門の段階で処理をストップし、これ以降のログイン認証へ進ませない
        }
		
        // 新しいプレイヤーが接続したことを、接続した本人「以外」の全員に通知
        // socket.broadcast.emit('player_joined_sound');

        // 接続時にIDを通知
        socket.emit('your_id', socket.id);
		debugChat(`🔌 新しい接続(connection): socket.id->${socket.id}`);
		debugChat("[CONN] Connected | ID: " + socket.id);

        socket.emit('init_monster_configs', MONSTER_CONFIGS);
        socket.emit('init_item_config', ITEM_CONFIG);
        socket.emit('init_item_images', ITEM_IMAGES);
        socket.emit('init_item_categories', itemCategories);
        socket.emit('init_item_descriptions', ITEM_DESCRIPTIONS);

        // ============================================================
// :::LOGIN::: 🔑 ログイン (Login) 処理 [修正版]
// ============================================================
const crypto = require('crypto'); // 💡 上部でcryptoをインポートしてください

socket.on('login', async (data) => {
    const { username, password, channel, group, style_id } = data; 
    
    const isAlreadyLoggedIn = Object.values(players).some(p => p.name === username);
    if (isAlreadyLoggedIn) {
        socket.emit('login_response', { success: false, message: 'そのキャラクター名は現在接続中です' });
        return; 
    }

    try {
        const sql = 'SELECT * FROM users WHERE username = ?';
        const [userResults] = await pool.query(sql, [username]);

        if (userResults.length === 0) {
            socket.emit('login_response', { success: false, message: 'ユーザー名またはパスワードが違います' });
            return;
        }

        const user = userResults[0];
        const match = await bcrypt.compare(password, user.password_hash);

        if (match) {
            if (!socket.loginCount) socket.loginCount = 0;
            socket.loginCount++;

            const token = crypto.randomBytes(32).toString('hex');
            const expiry = new Date();
            expiry.setDate(expiry.getDate() + 30);

            await pool.query('UPDATE users SET remember_token = ?, token_expires = ? WHERE id = ?', [token, expiry, user.id]);

            if (socket.loginCount === 1) {
                // 1回目のダミー通信（コードはそのまま）
                const statsSql = 'SELECT model_id, style_id FROM player_stats WHERE user_id = ?';
                const [statsResults] = await pool.query(statsSql, [user.id]);
                const modelId = statsResults.length > 0 ? statsResults[0].model_id : -1;
                const styleId = statsResults.length > 0 ? (statsResults[0].style_id || 1) : 1;
                socket.emit('auth_response', { success: true, id: user.id, username: user.username, channel: parseInt(channel) || 1, token: token, model_id: modelId, style_id: styleId, message: '1回目認証成功' });
                return;
            }

            // 🚀 2回目：共通関数でログイン処理
            await performLogin(socket, user, token, channel, group, style_id);

        } else {
            socket.emit('login_response', { success: false, message: 'ユーザー名またはパスワードが違います' });
        }
    } catch (err) {
        console.error("❌ ログイン処理エラー:", err);
        socket.emit('login_response', { success: false, message: 'サーバーエラー' });
    }
});

socket.on('auto_login', async (data) => {
    const { token } = data;
    try {
        // トークンが有効かチェック
        const [rows] = await pool.query('SELECT * FROM users WHERE remember_token = ? AND token_expires > NOW() LIMIT 1', [token]);

        if (rows.length > 0) {
            const user = rows[0];
            // 🚀 共通関数でログイン処理
            await performLogin(socket, user, token, 1, null, null); 
			// 2026-8-5停止
            //console.log(`✨ 自動ログイン成功: ${user.username}`);
        } else {
            socket.emit('login_required');
        }
    } catch (err) {
        console.error("❌ 自動ログインエラー:", err);
    }
});

socket.on('logout', async () => {
    // socket.username が存在する場合のみ実行
    if (socket.username) {
        try {
            // トークンをNULLにして、自動ログイン権限を破棄
            // ※ is_online = 0 は含めないようにしました
            await pool.query(
                'UPDATE users SET remember_token = NULL, token_expires = NULL WHERE username = ?',
                [socket.username]
            );
            
            console.log(`👋 ユーザー ${socket.username} の自動ログイン権限を破棄しました`);
            
            // 必要であれば、Socket.ioの管理オブジェクトからは削除
            // (まだゲームを続ける場合は、この delete は外してください)
            // delete players[socket.id]; 
            socket.username = null; 
            
        } catch (err) {
            console.error("❌ ログアウト処理エラー:", err);
        }
    }
});

// ==========================================
// 👤 プレイヤーの参加・変更セクション
// ==========================================

// ============================================================
// :::JOIN::: --- 1. 参加処理の修正（既存ロジック踏襲・サウンド通知追加版） ---
// ============================================================
socket.on('join', data => {
    try {
        // 🌟 データの取り出し
        const userName = (typeof data === 'object') ? data.name : data;

        // 🎨 クライアントがボタンで選んだグループ番号を取得
        let selectedGroup = (typeof data === 'object' && data.group !== undefined) ? parseInt(data.group) : 0;
        let selectedCharVar = (typeof data === 'object' && data.charVar !== undefined) ? parseInt(data.charVar) : 0;

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
            p.charVar = selectedCharVar;

            // 🚨【整合性担保のための安全処理】
            // 2回目の本番loginで読み込まれた後に届く決定値(group: 14等)を、メモリのjob_idへ確実に同期させます
            if (selectedGroup !== 0) {
                p.job_id = selectedGroup;
            }

            // 🔊 入室サウンド通知：同じチャンネル（部屋）にいる「自分以外」の全員に通知
            socket.to(roomName).emit('player_joined_sound');

            // 🌟 追加：【全チャンネル対応】ログイン通知を全員（io.emit）に飛ばす
            // これにより、別チャンネルにいるユーザーの画面にも通知が表示されます
            io.emit('globalNotification', {
                message: `${p.name} 様がログインしました。`,
                color: "#FFFFFF",
                senderId: socket.id, // 🌟 これを自分自身で判定するために追加
                type: 'LOGIN'
            });
            
            emitPlayerList();

            // 🌟 【一番簡単な重複対策】この接続でまだログを出していなければ1回だけ出す
            if (!socket.hasLoggedJoin) {
                socket.hasLoggedJoin = true;
                debugChat(`👋 ${userName} さんが チャンネル ${channel} に参加しました（キャラID: ${p.group}）`);
            }
            //LOG.SYS(`[入室データ確認] ${JSON.stringify(p)}`);
        }
    } catch (e) {
        debugChat(`❌ joinエラー: ${e.message}`, 'error');
    }
});
		
        // ============================================================
// :::REGISTER::: 📝 ユーザー新規登録 (Register) + 徹底デバッグ版
// ============================================================
socket.on('register', async (data) => {
    // 💡 フロントから送られてくる email も受け取れるように拡張
    const { username, password, email } = data;
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
            await pool.query("SET time_zone = '+09:00';");
            console.log(`[DEBUG 2 ✅] タイムゾーン設定クエリ成功`);
        } catch (tzErr) {
            console.error(`[DEBUG 2 ⚠️] タイムゾーン設定失敗(無視して続行):`, tzErr.message);
            if (typeof LOG !== 'undefined') LOG.DB(`タイムゾーン設定エラー: ${tzErr.message}`);
        }

        // 2. データベース(users)に保存
        console.log(`[DEBUG 3] usersテーブルへのINSERTを開始します...`);
        const crypto = require('crypto');
        
        // 10文字程度のランダムなIDを生成
        const wiki_id = crypto.randomBytes(6).toString('base64url');

        const sql = 'INSERT INTO users (username, password_hash, created_at, wiki_id) VALUES (?, ?, NOW(), ?)';
        
        // 🌟 修正ポイント: [username, hash, wiki_id] に変更
        const [result] = await pool.query(sql, [username, hash, wiki_id]);
        
        // 🌟 3. 新しく作成されたユーザーの ID を取得
        const newUserId = result.insertId;
        console.log(`[DEBUG 3 ✅] users保存成功。発行されたID: ${newUserId} (wiki_id: ${wiki_id})`);


        // ========================================================
        // 🌟 新しいデータベース(accounts)にも同時に保存
        // ========================================================
		/*
        console.log(`[DEBUG 3-2] accountsテーブルへのINSERTを開始します...`);
        const dummyEmail = email || `${username}@test.com`;
        
        const accountsSql = `
            INSERT INTO accounts (email, username, password_hash, created_at) 
            VALUES (?, ?, ?, NOW())
        `;

        try {
            const [accResult] = await pool.query(accountsSql, [dummyEmail, username, hash]);
            console.log(`[DEBUG 3-2 ✅] accounts保存成功。発行されたID: ${accResult.insertId}`);
        } catch (accErr) {
            console.error(`[DEBUG 3-2 ❌] accounts保存失敗の詳細原因:`, accErr.message);
            if (typeof LOG !== 'undefined') LOG.DB(`accounts追加エラー: ${accErr.message}`);
        }
		*/
        // ========================================================


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

        // ============================================================
// :::SAVE::: 💾 ステータス保存 (Save Data) 処理
// ============================================================
socket.on('save_player_data', async (data) => {
    // data には { userId, level, exp, gold, hp, maxHp, mp, maxMp, mapId, x, y, str, dex, luk, ap } が入っている想定
    const { userId, level, exp, gold, hp, maxHp, mp, maxMp, mapId, x, y, str, dex, luk, ap } = data;

    if (!userId) return;

    // クライアントから送られた userId ではなく、socket.id から本人を特定
    const player = players[socket.id]; 

    if (!player || !player.dbId) {
        // ログインが完了していない場合は保存をスキップ
        return;
    }

    const dbUserId = player.dbId; 

    // 🌟 【安全ガード】DBには必ず「素のステータス（ベース値）」を保存する
    const saveStr = player.baseStr !== undefined ? player.baseStr : str;
    const saveDex = player.baseDex !== undefined ? player.baseDex : dex;
    const saveLuk = player.baseLuk !== undefined ? player.baseLuk : luk;
    
    // 🌟 【安全ガード追加】HPとMPも装備ボーナスを含まない「ベース値」を確実に保存する
    const saveMaxHp = player.baseMaxHp !== undefined ? player.baseMaxHp : maxHp;
    const saveMaxMp = player.baseMaxMp !== undefined ? player.baseMaxMp : maxMp;
    
    // 🌟 【重要】セーブ時の最新レベルに対応する ATK を `player_atk_table` から確実に取得する
    let saveAtk = 13;
    try {
        const [atkRows] = await pool.query(
            'SELECT atk FROM player_atk_table WHERE level = ?', 
            [level]
        );
        if (atkRows && atkRows.length > 0) {
            saveAtk = atkRows[0].atk;
        }
    } catch (atkErr) {
        console.error(`❌ [DB ERROR] レベル ${level} の ATK 取得に失敗しました:`, atkErr.message);
        // 万が一テーブルからの取得に失敗した場合は、現在のメモリ上の値をフォールバックとして使う
        saveAtk = player.baseAtk !== undefined ? player.baseAtk : 13;
    }

    // プレイヤーオブジェクト側のベース攻撃力も最新に更新しておく
    player.baseAtk = saveAtk;

    // 🌟 SQLに送るパラメータの配列（最新の saveMaxHp, saveMaxMp, saveAtk を設定）
    const saveParams = [level, exp, gold, hp, saveMaxHp, mp, saveMaxMp, mapId, x, y, saveStr, saveDex, saveLuk, saveAtk, ap, dbUserId];

    const sql = `
        UPDATE player_stats 
        SET level = ?, exp = ?, gold = ?, hp = ?, max_hp = ?, mp = ?, max_mp = ?, 
            map_id = ?, pos_x = ?, pos_y = ?, str = ?, dex = ?, luk = ?, atk = ?, ap = ?
        WHERE user_id = ?
    `;

    try {
        const [result] = await pool.query(sql, saveParams);

        if (result && result.affectedRows > 0) {
			// 2026-8-27停止
            //console.log(`✅ [SAVE SUCCESS] ${player.name} (DB_ID: ${dbUserId}) の保存に成功しました (Lv: ${level}, ATK: ${saveAtk})`);
        } else {
            console.warn(`⚠️ [SAVE WARNING] DB ID: ${dbUserId} が見つかりませんでした (affectedRows: 0)`);
        }
    } catch (err) {
        if (typeof LOG !== 'undefined' && LOG.DB) {
            LOG.DB(`セーブ失敗 (DB_ID: ${dbUserId}): ${err.message}`);
        } else {
            console.error(`[DB ERROR] セーブ失敗 (DB_ID: ${dbUserId}): ${err.message}`);
        }
    }
});

// 🔄 交換申し込みをクライアントから受け取ったとき
socket.on('sendTradeRequest', (data) => {
    if (data.targetId) {
        const senderPlayer = players[socket.id];

        io.to(data.targetId).emit('receiveTradeRequest', {
            senderId: socket.id,
            senderName: senderPlayer ? senderPlayer.name : (data.senderName || "プレイヤー"),
            model_id: senderPlayer ? senderPlayer.model_id : (data.model_id || 0),
            charVar: senderPlayer ? senderPlayer.charVar : (data.charVar || 1)
        });
    }
});

// 交換受諾の返信を転送
socket.on('acceptTradeRequest', (data) => {
    if (data.targetId) {
        const acceptingPlayer = players[socket.id]; // 承諾した人（自分）
        const requesterSocketId = data.targetId;    // 招待を送った人（相手）

        // お互いをトレードパートナーとして記憶させる
        tradePartners[socket.id] = requesterSocketId;
        tradePartners[requesterSocketId] = socket.id;

        // 1. 🌟 招待した側（targetId）へ、承諾した人のデータと「相手のID」を教える
        io.to(requesterSocketId).emit('tradeRequestAccepted', {
            senderId: socket.id,
            partnerId: socket.id, // 🌟 ここを追加！招待した側も相手のIDを把握できるようにする
            name: acceptingPlayer ? acceptingPlayer.name : "相手",
            model_id: acceptingPlayer ? acceptingPlayer.model_id : 0,
            charVar: acceptingPlayer ? acceptingPlayer.charVar : 1
        });
        
        // 2. 承諾した側（自分）に対しても「トレードが始まったよ」と通知を送る
        socket.emit('tradeStarted', {
            partnerId: requesterSocketId
        });
        
        console.log(`[Trade] 成立: ${socket.id} と ${requesterSocketId} がトレードを開始しました`);
    }
});

// 🌟 トレード枠の更新処理
socket.on('updateTradeOffer', (data) => {
    // 🌟 誰が送ってきたか、dataに targetId が含まれているかログに出す
    console.log(`[Server DEBUG] updateTradeOffer 受信: 送信元=${socket.id}, data.targetId=${data.targetId}`);

    // tradePartners から相手を引く
    let partnerSocketId = tradePartners[socket.id];
    
    // もし tradePartners にいなくても、クライアントから targetId が送られてきているならそれを補佐的に使う
    if (!partnerSocketId && data.targetId) {
        partnerSocketId = data.targetId;
    }

    console.log(`[Server DEBUG] 宛先パートナーID: ${partnerSocketId}`);

    if (partnerSocketId) {
        io.to(partnerSocketId).emit('syncOpponentTrade', {
            tradeSlots: data.tradeSlots
        });
        console.log(`[Server] トレード枠の更新を相手 (${partnerSocketId}) に送信しました`);
    } else {
        console.warn(`[Server Warning] ${socket.id} のトレード相手が見つかりませんでした！ tradePartners:`, tradePartners);
    }
});

// 💰 トレード金額の更新を相手に同期する
socket.on('updateTradeCurrency', (data) => {
    console.log(`[Server DEBUG] updateTradeCurrency 受信: 送信元=${socket.id}, 金額=${data.currency}, data.targetId=${data.targetId}`);

    // tradePartners から相手を引く
    let partnerSocketId = tradePartners[socket.id];
    
    // 🌟 もし tradePartners にいなくても、クライアントから targetId が送られてきているならそれを補佐的に使う
    if (!partnerSocketId && data.targetId) {
        partnerSocketId = data.targetId;
    }

    console.log(`[Server DEBUG] 宛先パートナーID (金額): ${partnerSocketId}`);

    if (partnerSocketId) {
        // 相手へ「相手側の画面に表示すべき金額」として送る
        io.to(partnerSocketId).emit('syncOpponentCurrency', {
            currency: data.currency
        });
        console.log(`[Server] 金額の更新を相手 (${partnerSocketId}) に送信しました: ${data.currency}`);
    } else {
        console.warn(`[Server Warning] ${socket.id} のトレード金額の相手が見つかりませんでした！ tradePartners:`, tradePartners);
    }
});

// 💬 トレード用チャットのメッセージを同期する
socket.on('tradeChatMessage', (data) => {
    console.log(`[Server DEBUG] tradeChatMessage 受信: 送信元=${socket.id}, メッセージ=${data.text}`);

    // tradePartners から相手を引く
    let partnerSocketId = tradePartners[socket.id];
    
    // 見つからない場合はクライアントから送られてきた targetId を補佐的に使う
    if (!partnerSocketId && data.targetId) {
        partnerSocketId = data.targetId;
    }

    if (partnerSocketId) {
        // 送信元のプレイヤー名を取得（サーバー側の管理方法に合わせてください）
        const senderPlayer = players[socket.id];
        const senderName = senderPlayer ? senderPlayer.name : "相手";

        // 相手の画面へイベントとメッセージ、送信者名を送信
        io.to(partnerSocketId).emit('syncTradeChatMessage', {
            senderName: senderName,
            text: data.text
        });
        console.log(`[Server] チャットを相手 (${partnerSocketId}) に転送しました`);
    } else {
        console.warn(`[Server Warning] ${socket.id} のチャット送信先パートナーが見つかりませんでした！`);
    }
});

// 🔒 トレードの準備完了（ロック）状態を同期する
socket.on('updateTradeLock', (data) => {
    let partnerSocketId = tradePartners[socket.id];
    if (!partnerSocketId && data.targetId) {
        partnerSocketId = data.targetId;
    }

    if (partnerSocketId) {
        io.to(partnerSocketId).emit('syncOpponentLock', {
            isLocked: data.isLocked
        });
        console.log(`[Server] ロック状態の更新を相手 (${partnerSocketId}) に送信しました: ${data.isLocked}`);

        const sortedIds = [socket.id, partnerSocketId].sort();
        const pairKey = `${sortedIds[0]}_${sortedIds[1]}`;

        if (!tradePairLocks[pairKey]) {
            tradePairLocks[pairKey] = { count: 0, lockedUsers: new Set() };
        }

        // 🌟 まだこの人がロックしていなければカウントを増やす（同じ人が連打しても2回にならないようにする）
        if (!tradePairLocks[pairKey].lockedUsers.has(socket.id)) {
            tradePairLocks[pairKey].lockedUsers.add(socket.id);
            tradePairLocks[pairKey].count++;
        }

        console.log(`🔍 [Debug] ペア (${pairKey}) のロック人数: ${tradePairLocks[pairKey].count} / 2`);

        // 🌟 2人分揃ったら完了！
        if (tradePairLocks[pairKey].count >= 2) {
            console.log(`[Server] 🎉 双方のロックが完了しました！ (${pairKey})`);
            
            io.to(sortedIds[0]).emit('tradeBothLocked');
            io.to(sortedIds[1]).emit('tradeBothLocked');

            delete tradePairLocks[pairKey];
            delete tradePartners[sortedIds[0]];
            delete tradePartners[sortedIds[1]];
        }
    }
});

        // ============================================================
// :::DISCONNECT::: 👋 接続解除 (Disconnect) 処理
// ============================================================
socket.on('disconnect', () => {
    LOG.SYS(`ユーザーが切断しました: ${socket.id}`);
	debugChat("[DISCONN] Disconnected | ID: " + socket.id);
	
    try {
        // プレイヤーデータを取得
        const p = players[socket.id];
        
        // 🌟 優先度：p.name があればそれを使用し、なければ socket.username、最後に socket.id を使用
        const name = p ? p.name : (socket.username || socket.id);

        // 🌟 【追加】もしトレード中だったら、相手に切断されたことを知らせてペアを解除する
        const partnerSocketId = tradePartners[socket.id];
        if (partnerSocketId) {
            // 相手の画面に「相手が切断しました」と伝えてトレードウィンドウを強制的に閉じるイベント
            io.to(partnerSocketId).emit('tradeCancelled', { reason: 'opponent_disconnected' });
            
            // 相手側の記憶も消去
            delete tradePartners[partnerSocketId];
            LOG.SYS(`[Trade] 切断に伴いトレードを中止しました（相手: ${partnerSocketId}）`);
        }
        delete tradePartners[socket.id]; // 自分の記憶も消去

        // 🌟 露店を開設していた場合、全体リストから削除する
        if (active_venders[socket.id]) {
            delete active_venders[socket.id];
            LOG.SYS(`[Vending] 切断に伴い露店を閉鎖しました: ${name}`);
            
            // ✅ 閲覧中の全ユーザーに閉店を通知
            io.emit('vending_closed', { id: socket.id });
        }

        debugChat(`📴 切断されました: ${name}`);

        // プレイヤーデータの削除
        delete players[socket.id];

        // 🌟 【重要】 二重ログイン防止用の名前紐付けを解除
        if (socket.username) {
            delete socket.username;
        }

        // リストの更新
        emitPlayerList();

    } catch (e) {
        debugChat(`❌ disconnectエラー: ${e.message}`, 'error');
    }
});

        // ============================================================
// :::VISUAL::: --- 2. 見た目の変更を全ユーザーに同期する ---
// ============================================================
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

// ============================================================
// :::MOVE::: 🏃 プレイヤー移動・状態更新処理
// ============================================================
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
		
		// 【ここを追加！】他のプレイヤーの連携状態を同期します
        if (data.isLinked !== undefined) {
            p.isLinked = data.isLinked;
        }
		
		// 【ここを追加！】他のプレイヤーの連携状態を同期します
        if (data.isOnline !== undefined) {
            p.isOnline = data.isOnline;
        }

        // 🌟 修正：店名の上書きを防止
        // 露店状態（看板を出すかどうか）のフラグだけ同期し、
        // タイトルは open_vending イベントに任せる
        if (data.is_vending !== undefined) {
            p.is_vending = data.is_vending;
        }

        // 🌟【ここに追加！】プレイヤーのエモーションIDを同期します
        if (data.emotionId !== undefined) {
            p.emotionId = data.emotionId;
        }
    }
});

        // ============================================================
// :::ATTACK::: ⚔️ 攻撃イベントの中継（攻撃のキレを良くするため）
// ============================================================
        socket.on('player_attack', (data) => {
            socket.broadcast.emit('player_attack', data);
        });

        // ============================================================
// :::ATTACK_EXEC::: ⚔️ 3. 攻撃ロジックの呼び出し
// ============================================================
        socket.on('attack', data => {
            try {
                handleAttack(socket, data);
            } catch (e) {
                debugChat(`❌ 攻撃処理エラー: ${e.message}`, 'error');
            }
        });

        // ============================================================
// :::PICKUP::: 💎 4. アイテム拾得処理
// ============================================================
        socket.on('pickup', itemId => {
            try {
                handlePickup(socket, itemId);
            } catch (e) {
                debugChat(`❌ pickupエラー: ${e.message}`, 'error');
            }
        });

        // ============================================================
// :::DAMAGED::: ❤️ 5. 被ダメージ処理
// ============================================================
        socket.on('player_damaged', data => {
            try {
                handlePlayerDamaged(socket, data);
            } catch (e) {
                debugChat(`❌ damagedエラー: ${e.message}`, 'error');
            }
        });

        // ============================================================
// :::CHAT::: 💬 チャット受信（メイン処理）
// ============================================================
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
        time: new Date().toLocaleTimeString('ja-JP', { timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit' })
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
                time: new Date().toLocaleTimeString('ja-JP', { timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit' })
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

        // ============================================================
// :::GROUP::: 👥 9. グループ変更処理
// ============================================================
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
		
		// ============================================================
// :::CHANNEL::: --- チャンネル変更処理（既存ロジックを完全踏襲） ---
// ============================================================
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


		// ============================================================
// :::REQ_CHANNEL::: 🚪 チャンネル変更リクエスト（フロントからの要求受付）
// ============================================================
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

// ============================================================
// :::DROP_GOLD::: 💰 通貨ドロップ処理（所持金減算・地面生成）
// ============================================================
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
            text: `[${new Date().toLocaleTimeString('ja-JP', { timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit' })}] 所持金が足りません！`
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
        text: `[${new Date().toLocaleTimeString('ja-JP', { timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit' })}] ${amount}メルを捨てました。`
    });
});

        // ============================================================
// :::DROP_ITEM::: 🗑️ 10. アイテム廃棄処理（複数個対応・DB同期）
// ============================================================
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
            const isEquipment = ['sword', 'shield'].includes(String(itemToDrop.type).toLowerCase());
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
                    text: `[${new Date().toLocaleTimeString('ja-JP', { timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit' })}] ${dropLogMsg}`
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

        // ============================================================
// :::SWAP::: 🔄 11. アイテム入れ替え処理 (Slot Swap & DB Transaction)
// ============================================================
socket.on('swapItems', async (data) => {
    try {
        const player = players[socket.id];
        // 🌟 プレイヤーが存在しない、またはDBのIDが特定できない場合は中断
        // player.dbId または player.db_id のどちらかに有効な数値が入っていることを前提とします
        const userId = player.dbId || player.db_id;
        if (!player || !player.inventory || !userId) return;

        const from = parseInt(data.from);
        const to = parseInt(data.to);

        // 範囲チェック（0〜49枠）かつ、同じ場所への移動でないこと
        if (from >= 0 && from < 50 && to >= 0 && to < 50 && from !== to) {
            
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
                debugChat(`🔄 [SWAP] ${from}番と${to}番を入れ替え (50スロット対応・DB保存完了)`);
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
// :::BUY_ITEM::: 🛒 アイテム購入リクエスト処理（個数指定・スタック・装備生成）
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
			// 2026-8-9停止
			//socket.emit('chat', { id: 'SYSTEM_LOG', name: '店主', text: `あんた、誰だい？（ID不明エラー）` });
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
            detectedType = item.category;
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
            // 🌟 所持金不足時は購入音を鳴らさないようにクライアントへ失敗を通知
            socket.emit('shop_purchase_failed', { reason: 'not_enough_gold' });
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

            // 🌟 上限を 10 から 50 に変更（バッグ対応）
            if (newSlotIndex >= 50) {
                // 🌟 バッグがいっぱい時も購入音を鳴らさないように失敗を通知
                socket.emit('shop_purchase_failed', { reason: 'inventory_full' });
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
		// 2026-8-9停止
		/*
        socket.emit('chat', {
            id: 'SYSTEM_LOG',
            name: '店主',
            text: `${item.display_name}を ${buyQty}個 バッグに入れたよ！大切に使いな。`
        });
		*/
		
        // --- 5. インベントリ画面のリアルタイム更新 ---
        // 🌟 独自の長いクエリを書く代わりに、共通関数 loadUserInventory を使う！
        const fixedInventoryArray = await loadUserInventory(targetDbId);
        
        const fixedInventory = Array(50).fill(null);
        fixedInventoryArray.forEach((item) => {
            // 🌟 読み込み範囲を 0〜9 から 0〜49（全50枠）に拡張
            if (item.slot_index >= 0 && item.slot_index < 50) {
                fixedInventory[item.slot_index] = item;
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
		
		// 🌟 【追加】クライアントに「購入が成功したこと」を伝えるシグナルを送る
		socket.emit('shop_purchase_success');

        console.log(`[SUCCESS] ${p.name} の購入処理完了 (${buyQty}個)。`);
            
    } catch (err) {
        console.error("購入エラー詳細:", err);
    }
});

// ============================================================
// :::SELL_ITEM::: 💰 アイテム売却リクエスト処理（個数指定・DB同期）
// ============================================================
socket.on('sell_request', async (data) => {
    console.log("--- サーバーで売却リクエストを受信 ---");
    
    const p = players[socket.id];
    if (!p) return;

    try {
        const reqId = String(data.itemId); 
        const slotIndex = Number(data.slotIndex);
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

        // 🌟 所持数チェック
        if (invItem.quantity < sellQty) {
            console.log("売却エラー: 所持数以上の指定。");
            return;
        }

        // --- 2. カタログから売却価格と表示名を取得 ---
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
            await pool.query(
                'UPDATE user_inventory SET quantity = quantity - ? WHERE id = ?',
                [sellQty, invItem.id]
            );
        } else {
            await pool.query('DELETE FROM user_inventory WHERE id = ?', [invItem.id]);
            
            if (invItem.equipment_id) {
                await pool.query('DELETE FROM equipment_instances WHERE id = ?', [invItem.equipment_id]);
            }
        }

        // --- 4. 所持金の更新 ---
        p.gold += totalEarned;
        await pool.query('UPDATE player_stats SET gold = ? WHERE user_id = ?', [p.gold, targetDbId]);
		// 2026-8-9停止
		/*
        socket.emit('chat', {
            id: 'SYSTEM_LOG',
            name: '店主',
            text: `${catalogItem.display_name}を${sellQty}個売って、${totalEarned}メル受け取ったよ。`
        });
		*/
		
        // --- 5. 画面更新用データの再送信 ---
        // 🌟 ここも同様に共通関数 loadUserInventory を使う！
        const fixedInventoryArray = await loadUserInventory(targetDbId);
        
        const fixedInventory = Array(50).fill(null);
        fixedInventoryArray.forEach((item) => {
            // 🌟 50スロット（0〜49）すべてを正しく反映するように修正
            if (item.slot_index >= 0 && item.slot_index < 50) {
                fixedInventory[item.slot_index] = item;
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

// ============================================================
// :::OPEN_VENDING::: 🛒 露店開設イベント (在庫連動・予約管理)
// ============================================================
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

// ============================================================
// :::GET_VENDING::: 🛒 📡 露店の商品リスト要求とカタログデータ結合
// ============================================================
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

// ============================================================
// :::VENDING_BUY::: 🛒 露店でのアイテム購入・在庫連動・自動閉店
// ============================================================
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
		const isEquipment = itemType.includes('shield') || itemType.includes('sword');
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
        if (!Array.isArray(buyer.inventory)) buyer.inventory = new Array(50).fill(null);
        
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
// ============================================================
// :::MOVE_SYNC::: 🏃‍♂️ プレイヤー移動・状態同期（露店タイトル保護）
// ============================================================
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
		
		// 【ここを追加！】クライアントから送られてきた「連携状態」を保存
        if (data.isLinked !== undefined) {
            p.isLinked = data.isLinked;
        }
		
        if (data.isOnline !== undefined) {
            p.isOnline = data.isOnline;
        }

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

        // 🌟【ここを追加！】クライアントから送られてきたエモーションIDを同期
        if (data.emotionId !== undefined) {
            p.emotionId = data.emotionId;
        }
    }
});

// ============================================================
// :::CLOSE_VENDING::: 🛑 露店閉鎖・管理リスト削除・閉店通知
// ============================================================
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

// サーバー側 (server.js)
socket.on('change_model', async (data) => {
    console.log(`🔍 [DEBUG] change_model received:`, data);

    // 🌟 クライアントから送られてきた modelId を使う
    const modelId = data.modelId;
    
    // 🌟 【修正】クライアントが何を言おうと、styleId を強制的に 1 に固定する
    const styleId = data.styleId; 
    
    const userId = players[socket.id]?.dbId;

    if (userId) {
        console.log(`🔍 [DEBUG] Before Update - Memory: model_id=${players[socket.id].model_id}, style_id=${players[socket.id].style_id}`);

        // 🌟 DBを更新 (style_id は常に 1)
        await pool.query(
            'UPDATE player_stats SET model_id = ?, style_id = ? WHERE user_id = ?', 
            [modelId, styleId, userId]
        );
        
        // 🌟 メモリの値を更新
        players[socket.id].model_id = modelId;
        players[socket.id].style_id = styleId; // 常に 1
		players[socket.id].charVar = styleId;
        
        console.log(`🔍 [DEBUG] After Update - Memory: model_id=${players[socket.id].model_id}, style_id=${players[socket.id].style_id}`);

        // 🌟 全員に通知 (Style: 1 を送信)
        io.to(`channel_${players[socket.id].channel}`).emit('model_changed', {
            playerId: socket.id,
            modelId: players[socket.id].model_id,
            styleId: players[socket.id].style_id, // 常に 1 が届く
			charVar: players[socket.id].charVar
        });
        
        console.log(`✨ ID: ${userId} のアバターを Model:${modelId} Style:${styleId} に更新しました`);
    } else {
        console.warn(`⚠️ [DEBUG] change_model failed: userId not found for socket ${socket.id}`);
    }
});

socket.on('get_account_info', async () => {
    const username = socket.username;
    if (!username) return;

    try {
        const [rows] = await pool.query('SELECT wiki_id, is_linked, is_online FROM users WHERE username = ?', [username]);
        
        if (rows.length > 0) {
            const currentStatus = {
                wikiId: rows[0].wiki_id,
                isLinked: !!rows[0].is_linked,
                isOnline: !!rows[0].is_online
            };

            // 💡 修正：キャッシュの有無に関わらず、リクエストがあれば必ず最新を送る
            // キャッシュは「変更があったかどうかの判定」だけに使い、送信は強制実行する
            const cacheKey = username;
            
            // 必要であればキャッシュは更新だけ行う
            playerStatusCache[cacheKey] = currentStatus;
            
            // 💡 ここで return せず、必ず送信する
            socket.emit('account_info_response', currentStatus);
			// 2026-8-5停止
            //console.log(`[通信] ${username} へ最新の連携情報を送信しました`);
        }
    } catch (err) {
        console.error("アカウント情報取得エラー:", err);
    }
});

// 2. 追加：右クリック用・ターゲットのWiki情報取得
// クライアントの foundPlayer.id を受け取って、そのユーザーのWiki情報を返す
// サーバー側：game_linked_wiki_id で直接検索するように変更
socket.on('get_target_account_info', async (targetName) => {
    console.log("【サーバー受診】リクエストが来ました！名前:", targetName);
    
    try {
        const [rows] = await pool.query(
            'SELECT game_linked_wiki_id, game_linked_wiki_name FROM users WHERE username = ?', 
            [targetName]
        );
        
        console.log("【DB検索結果】行数:", rows.length);
        
        if (rows.length > 0) {
            console.log("【DBデータ発見】:", rows[0]);
            socket.emit('target_account_info_response', { 
                wikiId: rows[0].game_linked_wiki_id,
                wikiName: rows[0].game_linked_wiki_name
            });
        } else {
            console.log("【DBエラー】その名前のユーザーがいません:", targetName);
            socket.emit('target_account_info_response', { wikiId: null, wikiName: null });
        }
    } catch (err) {
        console.error("【サーバー致命的エラー】:", err);
    }
});

        // ============================================================
// :::UPGRADE_STAT::: 📈 ステータス強化リクエスト（AP消費・能力値加算）
// ============================================================
socket.on('upgrade_stat', (data) => {
    const player = players[socket.id];
    if (!player || player.ap <= 0) return;

    // 1. 安全のためにベース値のプロパティがなければ初期化する
    if (player.baseStr === undefined) player.baseStr = player.str || 4;
    if (player.baseDex === undefined) player.baseDex = player.dex || 4;
    if (player.baseInt === undefined) player.baseInt = player.int || 4;
    if (player.baseLuk === undefined) player.baseLuk = player.luk || 4;

    // 2. 該当するステータスの「ベース値」を +1 し、APを消費する
    if (data.type === 'str') {
        player.ap -= 1;
        player.baseStr += 1;
        console.log(`[成長] ${player.name}: baseStr -> ${player.baseStr}`);
    } else if (data.type === 'dex') {
        player.ap -= 1;
        player.baseDex += 1;
        console.log(`[成長] ${player.name}: baseDex -> ${player.baseDex}`);
    } else if (data.type === 'int') {
        player.ap -= 1;
        player.baseInt += 1;
        console.log(`[成長] ${player.name}: baseInt -> ${player.baseInt}`);
    } else if (data.type === 'luk') {
        player.ap -= 1;
        player.baseLuk += 1;
        console.log(`[成長] ${player.name}: baseLuk -> ${player.baseLuk}`);
    } else {
        return; // 無効なタイプなら何もしない
    }

    // 3. インベントリ内の装備ボーナスを再集計して、トータルの値を正しく更新する
    let totalWeaponAtk = 0;
    let totalStr = 0;
    let totalDex = 0;
    let totalInt = 0;
    let totalLuk = 0;

    if (player.inventory) {
        player.inventory.forEach((invItem) => {
            if (invItem && invItem.isEquipped) {
                totalWeaponAtk += Number(invItem.atk) || Number(invItem.power) || 0;
                totalStr += Number(invItem.str) || 0;
                totalDex += Number(invItem.dex) || 0;
                totalInt += Number(invItem.int) || 0;
                totalLuk += Number(invItem.luk) || 0;
            }
        });
    }

    player.str = player.baseStr + totalStr;
    player.dex = player.baseDex + totalDex;
    player.int = player.baseInt + totalInt;
    player.luk = player.baseLuk + totalLuk;

    // 4. クライアントへ最新のステータスと内訳を一斉送信
    socket.emit('player_status_update', {
        atk: player.atk, 
        baseAtk: player.baseAtk || 13, 
        weaponAtk: totalWeaponAtk,
        str: player.str, 
        baseStr: player.baseStr, 
        bonusStr: totalStr,
        dex: player.dex, 
        baseDex: player.baseDex, 
        bonusDex: totalDex,
        int: player.int, 
        baseInt: player.baseInt, 
        bonusInt: totalInt,
        luk: player.luk, 
        baseLuk: player.baseLuk, 
        bonusLuk: totalLuk,
        maxHp: player.maxHp,
        ap: player.ap // 残りAPも更新して送る
    });
});
		
		/*
		socket.on('update_model_id', async (data) => {
    const { model_id } = data;
    
    // 【デバッグ1】イベントの受信確認と誰からのリクエストかを表示
    console.log("🔥 [DEBUG:UPDATE_MODEL] 受信イベント:", { 
        socketId: socket.id, 
        receivedModelId: model_id 
    });
    
    // 【デバッグ2】プレイヤーリストの検索状況を表示
    const playerExists = !!players[socket.id];
    console.log("🔍 [DEBUG:UPDATE_MODEL] プレイヤーリスト検索:", { 
        playerExists: playerExists,
        playersCount: Object.keys(players).length 
    });

    // プレイヤーIDの取得
    const userId = playerExists ? players[socket.id].dbId : null;

    if (!userId) {
        console.error("❌ [DEBUG:UPDATE_MODEL] エラー: playersリスト内にこのSocketIDが見つかりません。保存を中止します。");
        return;
    }

    try {
        // DBの model_id を更新
        console.log(`📝 [DEBUG:UPDATE_MODEL] SQL実行中... UserID: ${userId} -> ModelID: ${model_id}`);
        await pool.query('UPDATE player_stats SET model_id = ? WHERE user_id = ?', [model_id, userId]);
        
        // サーバー内のメモリ（players）も更新しておく
        players[socket.id].model_id = model_id;
        console.log("✅ [DEBUG:UPDATE_MODEL] メモリの更新完了");

        // 成功通知をクライアントへ返す
        console.log("📡 [DEBUG:UPDATE_MODEL] クライアントへ success 通知を送信します");
        socket.emit('update_model_success', { model_id: model_id });
        
    } catch (err) {
        console.error("🚨 [DEBUG:UPDATE_MODEL] DB更新エラー:", err);
    }
});
		*/
		
// サーバー側：クライアントからの「状態を再読み込みして」というお願いを受け取る
socket.on('request_online_refresh', (data) => {
    console.log("オンライン状態の更新リクエストを受信しました:", data.userId);

    // データベースから該当ユーザーの最新情報を取得するクエリ
    const query = "SELECT wiki_id, is_linked, is_online FROM users WHERE id = ?";
    db.query(query, [data.userId], (err, rows) => {
        if (err) {
            console.error("DBエラー:", err);
            return;
        }

        if (rows.length > 0) {
            // クライアントへ最新のステータス情報を送り返す
            socket.emit('account_info_response', { 
                wikiId: rows[0].wiki_id,
                isLinked: !!rows[0].is_linked,
                isOnline: !!rows[0].is_online  // DBの最新の is_online (0か1) を送信！
            });
            console.log("最新のオンライン状態をクライアントに返信しました:", rows[0].is_online);
        }
    });
});

socket.on('request_respawn', () => {
    const p = players[socket.id];
    if (p && p.hp <= 0) {
        p.hp = p.maxHp || 100; // ここでHPを回復
        // 必要に応じて復活地点へ移動させる処理をここへ書く
        if (typeof sendState === 'function') sendState();
    }
});

// ============================================================
// :::EQUIP_TOGGLE::: 🛡️ 装備品の着脱（同種装備の自動付け替え処理対応）
// ============================================================
socket.on('equipItem', async (data) => {
    try {
        const player = players[socket.id];
        if (!player || !player.inventory) return;

        const slotIndex = parseInt(data.slotIndex);
        if (slotIndex < 0 || slotIndex >= player.inventory.length) return;

        const item = player.inventory[slotIndex];
        if (!item) return;

        // 🛡️ 安全装置：過去のアイテムに isEquipped が無ければ補正する
        if (item.isEquipped === undefined) {
            item.isEquipped = false;
        }

        const itemTypeStr = String(item.type || item.name || "").toLowerCase();
        const isEquipment = ['sword', 'shield'].includes(itemTypeStr);

        if (!isEquipment) {
            return;
        }

        // 🌟 これから「装備しようとする」場合（現在 false で、これから true にしようとする時）
        const willEquip = !item.isEquipped;

        if (willEquip) {
            // 同じタイプ（例: 'sword' 同士）のアイテムがすでに装備されていたら強制的に外す
            for (const [idx, invItem] of player.inventory.entries()) {
                if (invItem && invItem.isEquipped && idx !== slotIndex) {
                    const invItemTypeStr = String(invItem.type || invItem.name || "").toLowerCase();
                    // 同じ種類（タイプ）の装備品を見つけたら外す
                    if (invItemTypeStr === itemTypeStr) {
                        invItem.isEquipped = false;
                        console.log(`[Equip Swap] 既に装備中の同種アイテム（スロット ${idx}: ${invItem.name}）を外しました。`);

                        // 🌟 外された古い装備のデータベース側も 0 に更新する
                        if (invItem.db_id) {
                            await pool.query(
                                'UPDATE user_inventory SET is_equipped = 0 WHERE id = ?',
                                [invItem.db_id]
                            );
                            console.log(`[DB Sync] 外された古い装備（DB行ID: ${invItem.db_id}）の装備状態を 0 に更新しました。`);
                        }
                    }
                }
            }
        }

        // 🌟 フラグを反転させる（装備する ⇄ 外す）
        item.isEquipped = willEquip;

        console.log(`[Equip] ${player.name} がスロット ${slotIndex} の ${item.name} の装備状態を ${item.isEquipped} に変更しました。`);

        // ==========================================
        // 📊 ステータス（基礎値）のベース取得
        // ==========================================
        let baseAtk = 13;
        try {
            const [atkRows] = await pool.query('SELECT atk FROM player_atk_table WHERE level = ?', [player.level]);
            if (atkRows && atkRows.length > 0) {
                baseAtk = atkRows[0].atk;
            }
        } catch (dbErr) {
            console.error('❌ 装備変更時の基礎ATK取得エラー:', dbErr);
        }

        // 🌟 プレイヤーオブジェクトのベース攻撃力を更新して保持
        player.baseAtk = baseAtk;

        // 🌟 インベントリ内で現在「装備中」のアイテムから、すべてのステータスボーナスを合計する
        let totalWeaponAtk = 0;
        let totalStr = 0;
        let totalDex = 0;
        let totalLuk = 0;
        let totalMaxHp = 0;
        let totalMaxMp = 0;

        player.inventory.forEach((invItem, idx) => {
            if (invItem && invItem.isEquipped) {
                const itemAtk = Number(invItem.atk) || Number(invItem.power) || 0;
                const itemStr = Number(invItem.str) || 0;
                const itemDex = Number(invItem.dex) || 0;
                const itemLuk = Number(invItem.luk) || 0;
                const itemHp  = Number(invItem.maxHp) || Number(invItem.hp) || 0;
                const itemMp  = Number(invItem.maxMp) || Number(invItem.mp) || 0;

                totalWeaponAtk += itemAtk;
                totalStr += itemStr;
                totalDex += itemDex;
                totalLuk += itemLuk;
                totalMaxHp += itemHp;
                totalMaxMp += itemMp;
            }
        });

        // 💡 基礎HP・MPのベース値
        // 🌟 修正：ログイン時に設定された player.baseMaxHp を最優先で使い、
        // もし未定義の場合は正しいベースである 240 を基準にする
        // 💡 基礎HP・MPのベース値
        // 🌟 修正：もし player.baseMaxHp が未定義なら、DBから直接ユーザーの max_hp を取得して復旧する
        if (player.baseMaxHp === undefined) {
            try {
                const [statRows] = await pool.query('SELECT max_hp FROM player_stats WHERE user_id = ?', [player.dbId]);
                if (statRows && statRows.length > 0) {
                    player.baseMaxHp = Number(statRows[0].max_hp) || 111;
                    console.log(`⚠️ [DB Recovery] player.baseMaxHp が消失していたため、DBから再取得しました: ${player.baseMaxHp}`);
                } else {
                    player.baseMaxHp = 111; // 万が一見つからない場合の最終フォールバック
                }
            } catch (dbErr) {
                console.error('❌ 装備変更時のベースHP再取得エラー:', dbErr);
                player.baseMaxHp = 111;
            }
        }
        const baseMaxHp = player.baseMaxHp;
        const baseMaxMp = player.baseMaxMp || 50;
		
        // ==========================================
        // 🐛 デバッグログ：装備着脱時の値チェック（値が確定したあとに表示）
        // ==========================================
        console.log(`--- [DEBUG EQUIP] アイテム名: ${item.name}, 装着状態: ${item.isEquipped} ---`);
        console.log(`算出された装備ボーナス HP (totalMaxHp): ${totalMaxHp}`);
        console.log(`ログイン時のベース HP (player.baseMaxHp): ${player.baseMaxHp}`);
        console.log(`計算される最終最大 HP (baseMaxHp + totalMaxHp): ${baseMaxHp + totalMaxHp}`);

        // 3. プレイヤーの最終ステータスを計算
        const baseStr = player.baseStr || 4;
        const baseDex = player.baseDex || 4;
        const baseLuk = player.baseLuk || 4;

        player.weaponAtk = totalWeaponAtk;
        player.atk = baseAtk + totalWeaponAtk;
        player.str = baseStr + totalStr;
        player.dex = baseDex + totalDex;
        player.luk = baseLuk + totalLuk;
        
        // 🌟 HPとMPの最終値を算出してプレイヤーオブジェクトに格納
        player.maxHp = baseMaxHp + totalMaxHp;
        player.maxMp = baseMaxMp + totalMaxMp;

        // 現在HPが新しい最大HPを超えていたら補正する
        if (player.hp > player.maxHp) {
            player.hp = player.maxHp;
        }

        console.log(`[Stats Updated] 最終ATK: ${player.atk}, 最大HP: ${player.maxHp} (STR: ${player.str}, DEX: ${player.dex}, LUK: ${player.luk})`);

        // 🌟 対象アイテム自体のデータベースの装備状態を更新する
        if (item.db_id) {
            await pool.query(
                'UPDATE user_inventory SET is_equipped = ? WHERE id = ?',
                [item.isEquipped ? 1 : 0, item.db_id]
            );
            console.log(`[DB Sync] スロット ${slotIndex} (DB行ID: ${item.db_id}) の装備状態を ${item.isEquipped ? 1 : 0} に更新しました。`);
        }
        
        // 🔄 クライアントへ最新のインベントリとステータスを送信
        socket.emit('inventory_update', player.inventory);
        
        // クライアント側へ合計値と内訳を一斉送信
        socket.emit('player_status_update', {
            atk: player.atk, baseAtk: baseAtk, weaponAtk: totalWeaponAtk,
            str: player.str, baseStr: baseStr, bonusStr: totalStr,
            dex: player.dex, baseDex: baseDex, bonusDex: totalDex,
            luk: player.luk, baseLuk: baseLuk, bonusLuk: totalLuk,
            maxHp: player.maxHp, baseMaxHp: baseMaxHp, bonusMaxHp: totalMaxHp,
            maxMp: player.maxMp, baseMaxMp: baseMaxMp, bonusMaxMp: totalMaxMp,
            hp: player.hp
        });

    } catch (e) {
        console.error(`❌ equipItemエラー: ${e.message}`);
    }
});

// ============================================================
// :::REMOVE_ACTIVE_ITEM::: 🧪 使用中アイテムの手動解除処理
// ============================================================
socket.on('remove_active_item', (data) => {
    const player = players[socket.id];
    if (!player || !player.activeItems) return;

    let removedItemName = "";

    // 💡 名前（name）が送られてきた場合は同名のものをすべて削除、indexの場合はsplice
    if (data.name) {
        removedItemName = (data.name || "").toLowerCase();
        // 重複している同名アイテムも含めてすべてスッキリ削除
        player.activeItems = player.activeItems.filter(item => (item.name || "").toLowerCase() !== removedItemName);
    } else if (typeof data.index === 'number') {
        const removed = player.activeItems.splice(data.index, 1)[0];
        if (removed) {
            removedItemName = (removed.name || "").toLowerCase();
        }
    }

    if (removedItemName) {
        // 🛡️ 1. clear（ゴッドモード）が解除された場合
        if (removedItemName === 'clear') {
            player.isInvincible = !player.isInvincible;
            const status = player.isInvincible ? "ON" : "OFF";
            if (typeof LOG !== 'undefined' && LOG.SUCCESS) {
                LOG.SUCCESS(`🛡️ ゴッドモードを ${status} にしました`);
            }
            socket.emit('player_update_godmode', { isInvincible: player.isInvincible });
        }

        // 🚀⚡ 2. speed（スピード＆ジャンプアップ系）が解除された場合、両方を元に戻す
        if (removedItemName === 'speed') {
            const defaultSpeed = 5.0;   // お使いのデフォルト速度
            const defaultJump = 15.0;   // お使いのデフォルトジャンプ力

            player.speed = defaultSpeed;
            player.jumpPower = defaultJump;

            console.log(`🚀 スピードとジャンプルの効果が解除されました！`);

            // それぞれクライアントへ通知
            socket.emit('update_player_speed', { speed: defaultSpeed });
            socket.emit('update_player_jump', { jumpPower: defaultJump });

            if (typeof LOG !== 'undefined' && LOG.SUCCESS) {
                LOG.SUCCESS(`⚡ スピード＆ジャンプアップの効果が切れました。`);
            }
        }

        // 最後にプレイヤーの最新アクティブアイテム一覧をクライアントへ同期
        socket.emit('active_items_update', player.activeItems);
    }
});

// 👥 グループ招待をクライアントから受け取ったとき
socket.on('sendGroupInvite', (data) => {
    // data.targetId には招待を送りたい相手のソケットIDやユーザーIDが入っています
    // data.senderName には送った人の名前が入っています

    // 相手に「グループ招待が来たよ」というイベント（receiveGroupInvite）を転送する
    if (data.targetId) {
        io.to(data.targetId).emit('receiveGroupInvite', {
            senderId: socket.id, // 招待を送った人のIDを添えてあげる
            senderName: data.senderName
        });
    }
});

// 🔄 交換申し込みをクライアントから受け取ったとき
/*
socket.on('sendTradeRequest', (data) => {
    if (data.targetId) {
        // 🌟 サーバー側が保持している送信者（自分）のデータを安全に引く
        const senderPlayer = players[socket.id];

        io.to(data.targetId).emit('receiveTradeRequest', {
            senderId: socket.id,
            senderName: senderPlayer ? senderPlayer.name : (data.senderName || "プレイヤー"),
            model_id: senderPlayer ? senderPlayer.model_id : (data.model_id || 0), // サーバー側を優先、なければデータから
            charVar: senderPlayer ? senderPlayer.charVar : (data.charVar || 1)     // サーバー側を優先、なければデータから
        });
    }
});
*/

// ⭕ グループ招待受諾の返信を処理する場合
socket.on('acceptGroupInvite', (data) => {
    if (data.targetId) {
        io.to(data.targetId).emit('groupInviteAccepted', {
            // 必要に応じて受諾されたことを通知
        });
    }
});

// ❌ グループ招待拒否の返信を処理する場合
socket.on('rejectGroupInvite', (data) => {
    if (data.targetId) {
        io.to(data.targetId).emit('groupInviteRejected', {
            // 必要に応じて拒否されたことを通知
        });
    }
});

// 交換受諾の返信を転送
/*
socket.on('acceptTradeRequest', (data) => {
    if (data.targetId) {
        const acceptingPlayer = players[socket.id]; // 承諾した人（自分）のデータ
        
        // 招待した側（targetId）へ、承諾した人のデータを送る
        io.to(data.targetId).emit('tradeRequestAccepted', {
            name: acceptingPlayer ? acceptingPlayer.name : "相手",
            model_id: acceptingPlayer ? acceptingPlayer.model_id : 0,
            charVar: acceptingPlayer ? acceptingPlayer.charVar : 1
        });
    }
});
*/

// 交換拒否の返信を転送
socket.on('rejectTradeRequest', (data) => {
    if (data.targetId) {
        io.to(data.targetId).emit('tradeRequestRejected', {});
    }
});

// プレイヤーがトレード枠を更新したとき
/*
socket.on('updateTradeOffer', (data) => {
    // 相手のソケットIDや、同じトレードルームにいる相手を探して送信する
    // ※ 現在のルーム管理の仕組みに合わせて書き換えてください
    const partnerSocketId = getTradePartnerSocketId(socket.id); // 例: 相手のIDを取得する関数
    
    if (partnerSocketId) {
        // 相手にだけ「syncOpponentTrade」というイベントでデータを飛ばす
        io.to(partnerSocketId).emit('syncOpponentTrade', {
            tradeSlots: data.tradeSlots
        });
        console.log(`[Server] トレード枠の更新を相手 (${partnerSocketId}) に送信しました`);
    }
});
*/

// ============================================================
// :::CONSUME::: 🧪 消費アイテムの使用処理（DBカタログ連動型）
// ============================================================
socket.on('useConsumableItem', async (data) => {
    try {
        const player = players[socket.id];
        const userId = player && (player.dbId || player.db_id);
        
        // プレイヤーやインベントリが存在しない場合は中断
        if (!player || !player.inventory || !userId) {
            return;
        }

        const slotIndex = parseInt(data.slotIndex);
        const requestedItemName = (data.itemName || "").toLowerCase();

        // 🌟 範囲チェックを 50スロット（0〜49枠）に拡張
        if (slotIndex < 0 || slotIndex >= 50) {
            console.log(`[ItemUse] 無効なスロットインデックスです: ${slotIndex}`);
            return;
        }

        const item = player.inventory[slotIndex];
        if (!item) {
            console.log(`[ItemUse] スロット ${slotIndex} にアイテムがありません。`);
            return;
        }

        // 不正防止：インベントリ上のアイテム名と一致しているかチェック
        const currentItemName = (item.name || item.type || "").toLowerCase();
        if (currentItemName !== requestedItemName) {
            console.log(`[ItemUse] アイテム名が一致しません (要求: ${requestedItemName}, 実際: ${currentItemName})`);
            return;
        }

        // データベース接続とトランザクション開始
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            // 🌟 1. データベースの各カタログに存在するか、名前やIDで柔軟に順次チェック
            let catalogItem = null;
            
            // 消費アイテムカタログを検索 (name, display_name, item_id のいずれかに一致するか)
            let [rows] = await connection.query(
                'SELECT * FROM item_consume_catalog WHERE name = ? OR display_name = ? OR item_id = ?', 
                [requestedItemName, requestedItemName, requestedItemName]
            );
            
            if (rows.length > 0) {
                catalogItem = rows[0];
            } else {
                // 見つからなければ ETCカタログを検索
                [rows] = await connection.query(
                    'SELECT * FROM item_etc_catalog WHERE name = ? OR display_name = ? OR item_id = ?', 
                    [requestedItemName, requestedItemName, requestedItemName]
                );
                if (rows.length > 0) {
                    catalogItem = rows[0];
                } else {
                    // それでも見つからなければ 装備カタログも検索
                    [rows] = await connection.query(
                        'SELECT * FROM item_equip_catalog WHERE name = ? OR display_name = ? OR item_id = ?', 
                        [requestedItemName, requestedItemName, requestedItemName]
                    );
                    if (rows.length > 0) {
                        catalogItem = rows[0];
                    }
                }
            }

            // どのカタログにも存在しない場合
            if (!catalogItem) {
                console.log(`[Server] カタログに存在しないため使用できません: ${requestedItemName}`);
                await connection.rollback();
                return;
            }
            
            let summonItemId = 2080;

            // 2. 効果ごとの個別処理（HP回復や特殊効果など）
            switch (requestedItemName) {
                case 'sweets':
                    if (typeof player.hp !== 'undefined' && typeof player.maxHp !== 'undefined') {
                        player.hp = Math.min(player.maxHp, player.hp + 50);
                    }
                    console.log(`[Server] プレイヤーが sweets を使用してHPが回復しました。`);
					
					// 🌟 クライアント（画面側）に「HPが回復したよ！」というイベントとデータを送信する
    // ※お使いの通信方式（io.to(...) や socket.emit 等）に合わせて変数名は調整してください
    socket.emit('player_healed', {
        hp: player.hp,
        healAmount: 50
    });
	
                    break;

                case 'pouch':
                    console.log(`[Server] プレイヤーが pouch（モンスターの包み）を開けました！`);
                    summonItemId = 2080;
                    if (typeof executeSummon === 'function') {
                        (async () => {
                            try {
                                await executeSummon(socket, summonItemId);
                                console.log("✅ [Server] 包みからの召喚処理が完了しました！");
                                if (typeof LOG !== 'undefined' && LOG.GRAY) LOG.GRAY(`🎁 包みからの召喚処理が完了しました！`);
                            } catch (e) {
                                console.error("❌ [Server] 包みからの召喚でエラー発生:", e);
                            }
                        })();
                    }
                    break;

                case 'pouch_slime':
                    console.log(`[Server] プレイヤーが スライムの包み を開けました！`);
                    
                    // 🌟 召喚したいモンスターIDのリスト
                    const summonItemIds = [2080, 2090, 2100, 2110, 2120];

                    if (typeof executeSummon === 'function') {
                        (async () => {
                            try {
                                // リストのIDを順番にすべて召喚する
                                for (const id of summonItemIds) {
                                    await executeSummon(socket, id);
                                }
                                console.log("✅ [Server] 包みからたくさんのモンスターが一斉に召喚されました！");
                                if (typeof LOG !== 'undefined' && LOG.GRAY) LOG.GRAY(`🎁 包みからたくさんのモンスターが飛び出した！`);
                            } catch (e) {
                                console.error("❌ [Server] 包みからの召喚でエラー発生:", e);
                            }
                        })();
                    }
                    break;

                case 'milk_tea':
                    if (typeof player.hp !== 'undefined' && typeof player.maxHp !== 'undefined') {
                        player.hp = Math.min(player.maxHp, player.hp + 100);
                    }
                    console.log(`[Server] プレイヤーが 絶品ミルクティー を使用しました。`);
                    break;

                case 'scroll_star':
                    console.log(`[Server] プレイヤーが scroll_star を使用しました。`);
                    break;
                    
                case 'avatar':
                    // 🌟 アバター変更チケット使用時にキャラ選択画面を起動
                    const targetModelId = player.model_id || player.group || 8;
                    if (typeof LOG !== 'undefined' && LOG.SUCCESS) {
                        LOG.SUCCESS(`🎭 ${player.name} (ModelID: ${targetModelId}) のキャラ選択画面を呼び出します`);
                    } else {
                        console.log(`🎭 ${player.name} (ModelID: ${targetModelId}) のキャラ選択画面を呼び出します`);
                    }
                    socket.emit('request_char_select2', { modelId: targetModelId });
                    player.isSelectingChar = true;
                    console.log(`[Server] プレイヤーが avatar を使用しました。`);
                    break;
                    
                case 'freemarket':
                    // 🌟 フリーマーケット（露店）開設UIを呼び出し
                    console.log(`--- [Vending] ${player.name || socket.id} が露店アイテムを使用 ---`);
                    socket.emit('request_open_vending_ui');
                    if (typeof LOG !== 'undefined' && LOG.SUCCESS) {
                        LOG.SUCCESS(`🏪 ${player.name || socket.id} の露店開設プロセスを開始しました`);
                    }
                    console.log(`[Server] プレイヤーが freemarket を使用しました。`);
                    break;
                    
                case 'levelup':
                    console.log(`[Server] プレイヤーが levelup を使用しました。`);
                    break;

                case 'clear':
                    console.log(`[Server] プレイヤーが clear アイテムを使用しました。`);
                    player.isInvincible = true;
                    const status = "ON";
                    
                    if (typeof LOG !== 'undefined' && LOG.SUCCESS) {
                        LOG.SUCCESS(`🛡️ ゴッドモードを ${status} にしました`);
                    } else {
                        console.log(`🛡️ ゴッドモードを ${status} にしました`);
                    }
                    
                    socket.emit('player_update_godmode', { isInvincible: player.isInvincible });
                    break;

                case 'treasure':
                    console.log(`[Server] プレイヤーが 宝箱 を開封しました。ガチャ処理開始...`);
                    
                    const usedSlotIndex = typeof slotIndex !== 'undefined' ? slotIndex : -1;

                    (async () => {
                        try {
                            const gachaPool = [
                                { id: 213, category: 'consume' }, // 経験値の書
                                { id: 214, category: 'consume' }, // レベルアップのカギ
                                { id: 215, category: 'consume' }, // 透明の薬
                                { id: 216, category: 'consume' }, // スピードアップの羽
                                { id: 217, category: 'consume' }, // まろやかミルクコーヒー
                                { id: 218, category: 'consume' }, // スライムの包み
                                { id: '101', category: 'sword' },   // マニアックソード（装備品）
                                { id: '102', category: 'shield' },  // トリシールド（装備品）
                              ];

                            const randomPick = gachaPool[Math.floor(Math.random() * gachaPool.length)];
                            let wonItem = null;
                            let isEquipment = false;

                            // 🍎 消費アイテムの場合
                            if (randomPick.category === 'consume') {
                                const [rows] = await pool.query('SELECT * FROM item_consume_catalog WHERE item_id = ?', [randomPick.id]);
                                if (rows.length > 0) {
                                    const item = rows[0];
                                    wonItem = {
                                        item_id: String(randomPick.id),
                                        name: item.name,
                                        type: item.name,
                                        displayName: item.display_name,
                                        imageName: item.image_name || item.name,
                                        count: 1
                                    };
                                }
                            } 
                            // ⚔️ 装備品の場合
else if (randomPick.category === 'sword' || randomPick.category === 'shield') {
    isEquipment = true;
    const isSword = randomPick.category === 'sword';
    const catalogId = isSword ? 101 : 102;

    // 💡 1. データベースからカタログの「もともとのベース値」を取得するクエリを追加
    const [catalogRows] = await pool.query('SELECT * FROM item_equip_catalog WHERE item_id = ?', [catalogId]);
    const dbCatalog = catalogRows.length > 0 ? catalogRows[0] : null;

    // メモリ上の ITEM_CATALOG と DBのカタログをフォールバックとして安全に扱う
    const catalogBase = dbCatalog || ((typeof ITEM_CATALOG !== 'undefined' && ITEM_CATALOG[catalogId]) ? ITEM_CATALOG[catalogId] : null);

    const stats = typeof identifyItem === 'function' ? identifyItem(randomPick.category) : {
        qualityLabel: "", itemColor: "#ffffff",
        atk: 0, def: 0, matk: 0, str: 0, dex: 0, int: 0, luk: 0, maxHp: 0, maxMp: 0
    };

    // 実際の最終ステータス（ランダム強化や補正後）
    const finalAtk = (stats.atk !== undefined) ? stats.atk : (catalogBase ? catalogBase.atk : (isSword ? 15 : 0));
    const finalDef = (stats.def !== undefined) ? stats.def : (catalogBase ? catalogBase.def : (isSword ? 0 : 10));
    const finalMatk = (stats.matk !== undefined) ? stats.matk : (catalogBase ? catalogBase.matk : 0);
    const finalStr = (stats.str !== undefined) ? stats.str : (catalogBase ? catalogBase.str : Math.floor(Math.random() * 3));
    const finalDex = (stats.dex !== undefined) ? stats.dex : (catalogBase ? catalogBase.dex : Math.floor(Math.random() * 3));
    const finalInt = (stats.int !== undefined) ? stats.int : (catalogBase ? catalogBase.int : 0);
    const finalLuk = (stats.luk !== undefined) ? stats.luk : (catalogBase ? catalogBase.luk : 0);
    const finalMaxHp = (stats.maxHp !== undefined) ? stats.maxHp : (catalogBase ? catalogBase.maxHp : 10);
    const finalMaxMp = (stats.maxMp !== undefined) ? stats.maxMp : (catalogBase ? catalogBase.maxMp : 10);
    
    // 🌟 【変更①】もともとのカタログ値（初期値）の合計を計算する
    const baseAtk = catalogBase ? (catalogBase.atk || 0) : 0;
    const baseDef = catalogBase ? (catalogBase.def || 0) : 0;
    const baseMatk = catalogBase ? (catalogBase.matk || 0) : 0;
    const baseStr = catalogBase ? (catalogBase.str || 0) : 0;
    const baseDex = catalogBase ? (catalogBase.dex || 0) : 0;
    const baseInt = catalogBase ? (catalogBase.int || 0) : 0;
    const baseLuk = catalogBase ? (catalogBase.luk || 0) : 0;
    const baseMaxHp = catalogBase ? (catalogBase.maxHp || 0) : 0;
    const baseMaxMp = catalogBase ? (catalogBase.maxMp || 0) : 0;

    const totalFirstStats = baseAtk + baseDef + baseMatk + baseStr + baseDex + baseInt + baseLuk + Math.floor(baseMaxHp / 10) + Math.floor(baseMaxMp / 10);

    // 🌟 【変更②】現在（変動後）の全ステータス合計
    const sumAllStats = finalAtk + finalDef + finalMatk + finalStr + finalDex + finalInt + finalLuk + Math.floor(finalMaxHp / 10) + Math.floor(finalMaxMp / 10);

    wonItem = {
        item_id: String(catalogId),
        type: isSword ? 'sword' : 'shield',
        name: isSword ? 'sword' : 'shield',
        displayName: isSword ? "マニアックソード" : "トリシールド",
        imageName: isSword ? "sword" : "shield",
        count: 1,
        isEquipped: 0,
        lv: (catalogBase && catalogBase.lv !== undefined) ? catalogBase.lv : 50,
        category: isSword ? 'sword' : 'shield',
        totalUpgrade: 7,
        star: 0,
        successCount: 0,
        failCount: 0,
        atk: finalAtk, def: finalDef, matk: finalMatk, 
        str: finalStr, dex: finalDex, int: finalInt, luk: finalLuk, 
        maxHp: finalMaxHp, maxMp: finalMaxMp,
        totalFirstStats: totalFirstStats, // ← ここにもともとのカタログ値の合計を設定
        totalALLStats: sumAllStats      // ← ここに現在の合計を設定
    };
}

                            if (!wonItem) return;

                          // 🌟 【変更点】DB保存・読み込みの前に、ここで先にログとコンソール出力を実行する
console.log(`🎁 [Treasure Gacha] ${player.name || socket.id} が宝箱から「${wonItem.displayName}」を手に入れました！`);
if (typeof LOG !== 'undefined' && LOG.GRAY) {
    LOG.GRAY(`🎁 宝箱を開けたら ${wonItem.displayName} が出てきた！`);
}

                            if (!player.inventory) player.inventory = {};
                            const targetDbId = player.dbId || player.id;

                            // 🌟 【超強力なスタック判定】
                            let existingStackSlot = -1;
                            if (!isEquipment) {
                                const targetIdStr = String(randomPick.id);

                                for (let i = 0; i < 50; i++) {
                                    const slotItem = player.inventory[i];
                                    if (i === usedSlotIndex) continue;

                                    if (slotItem && !slotItem.equipment_id && !slotItem.instanceId) {
                                        const slotItemIdStr = String(slotItem.item_id || slotItem.id || slotItem.catalog_id || '');
                                        
                                        if (slotItemIdStr === targetIdStr) {
                                            existingStackSlot = i;
                                            break;
                                        }
                                }
                            }
                      }

                        let targetSlot = -1;

                        if (!isEquipment && existingStackSlot !== -1) {
                            targetSlot = existingStackSlot;
                            const slotItem = player.inventory[targetSlot];
                            slotItem.count = (Number(slotItem.count) || 1) + wonItem.count;

                            await pool.query('UPDATE user_inventory SET quantity = quantity + ? WHERE user_id = ? AND slot_index = ?', [wonItem.count, targetDbId, targetSlot]);
                    } else {
                        const isBoxConsumingLastOne = (usedSlotIndex !== -1 && player.inventory[usedSlotIndex] && (Number(player.inventory[usedSlotIndex].count || 1) <= 1));

                        if (isBoxConsumingLastOne && usedSlotIndex !== -1) {
                            targetSlot = usedSlotIndex; 
                  } else {
                            for (let i = 0; i < 50; i++) {
                                if (!player.inventory[i]) {
                                    targetSlot = i;
                                    break;
                                }
                          }
                    }

                    if (targetSlot !== -1) {
                        if (isEquipment) {
                            const [eqResult] = await pool.query(`
                                INSERT INTO equipment_instances (
                                    player_id, item_id, name, display_name, image_name, category,
                                    lv, str, dex, \`int\`, luk, maxHp, maxMp, atk, matk, def,
                                    moveSpeed, jumpPower, atkSpeed, star, maxStar,
                                    totalUpgrade, successCount, failCount,
                                    totalFirstStats, totalALLStats
                                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            `, [
                                targetDbId, wonItem.item_id, wonItem.name, wonItem.displayName, wonItem.imageName, wonItem.category,
                                wonItem.lv || 0, wonItem.str || 0, wonItem.dex || 0, wonItem.int || 0, wonItem.luk || 0,
                                wonItem.maxHp || 0, wonItem.maxMp || 0, wonItem.atk || 0, wonItem.matk || 0, wonItem.def || 0,
                                0, 0, 1, 0, 7, wonItem.totalUpgrade || 7, 0, 0,
                                wonItem.totalFirstStats, wonItem.totalALLStats
                            ]);

                            wonItem.equipment_id = eqResult.insertId;
                            wonItem.slot_index = targetSlot;
                            player.inventory[targetSlot] = wonItem;

                            await pool.query(`
                                INSERT INTO user_inventory (user_id, item_type, slot_index, item_id, quantity, is_equipped, equipment_id) 
                                VALUES (?, ?, ?, ?, 1, 0, ?)
                            `, [targetDbId, wonItem.type, targetSlot, wonItem.item_id, eqResult.insertId]);

                        } else {
                            wonItem.slot_index = targetSlot;
                            player.inventory[targetSlot] = wonItem;

                            await pool.query(`
                                INSERT INTO user_inventory (user_id, item_type, slot_index, item_id, quantity, is_equipped) 
                                VALUES (?, ?, ?, ?, ?, 0)
                                ON DUPLICATE KEY UPDATE 
                                    quantity = quantity + VALUES(quantity),
                                    item_id = VALUES(item_id),
                                    item_type = VALUES(item_type)
                `, [targetDbId, wonItem.type, targetSlot, wonItem.item_id, wonItem.count]);
                    }
                  }
          }

            if (targetSlot !== -1) {
                // 元々あったログ出力位置（ここは不要になるので削除または整理）
                
                const fixedInventoryArray = typeof loadUserInventory === 'function' ? await loadUserInventory(targetDbId) : null;
                if (fixedInventoryArray) {
                    const fixedInventory = Array(50).fill(null);
                    fixedInventoryArray.forEach((invItem) => {
                        if (invItem.slot_index >= 0 && invItem.slot_index < 50) {
                            fixedInventory[invItem.slot_index] = invItem;
                        }
                });
                    player.inventory = fixedInventory;
                }

                socket.emit('inventory_update', player.inventory);
                // 以前ここにあった LOG.SUCCESS は上に移動済み
            } else {
                console.log(`⚠️ [Treasure Gacha] インベントリがいっぱいでアイテムを入手できませんでした。`);
            }
        } catch (err) {
            console.error("❌ 宝箱ガチャ処理エラー:", err);
        }
    })();
    break;
                    
                case 'speed':
                    console.log(`[Server] プレイヤーが speed アイテムを使用しました。`);
                    
                    const boostSpeedValue = 10.0; 
                    const boostJumpValue = 20.0; 

                    if (player) {
                        player.speed = boostSpeedValue;
                        player.jumpPower = boostJumpValue;

                        console.log(`🚀 移動速度を ${player.speed} に、🦘 ジャンプ力を ${player.jumpPower} に変更しました！`);

                        socket.emit('update_player_speed', { speed: player.speed });
                        socket.emit('update_player_jump', { jumpPower: player.jumpPower });

                        if (typeof LOG !== 'undefined' && LOG.SUCCESS) {
                            LOG.SUCCESS(`⚡ ${player.name || 'プレイヤー'} はスピードアップ薬の効果で俊敏になった！`);
                        }
                    }
                    break;

                default:
                    console.log(`[Server] 消費アイテムを使用しました: ${catalogItem.display_name || requestedItemName}`);
                    break;
            }
            
            // 🌟 プレイヤー側で複数の使用中アイテムを管理する配列を初期化
            if (!player.activeItems) {
                player.activeItems = [];
            }

            const newItem = {
                name: catalogItem.name,
                displayName: catalogItem.display_name || catalogItem.name
            };

            player.activeItems.push(newItem);
            player.activeItem = newItem; 

            // 3. 個数（count または quantity）を減らす
            item.count = (item.count || item.quantity || 1) - 1;

            if (item.count > 0) {
                await connection.query(
                    'UPDATE user_inventory SET quantity = ? WHERE user_id = ? AND slot_index = ?',
                    [item.count, userId, slotIndex]
                );
            } else {
                await connection.query(
                    'DELETE FROM user_inventory WHERE user_id = ? AND slot_index = ?',
                    [userId, slotIndex]
                );
                player.inventory[slotIndex] = null;
            }

            await connection.commit();
        } catch (dbErr) {
            await connection.rollback();
            throw dbErr;
        } finally {
            connection.release();
        }

        // 4. クライアントへ最新のインベントリを通知
        socket.emit('inventory_update', player.inventory);
        socket.emit('active_items_update', player.activeItems);
        
        if (typeof sendState === 'function') {
            sendState();
        }

    } catch (e) {
        console.error(`❌ useConsumableItemエラー: ${e.message}`);
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
        const newCardNames = {}; // 🌟 モンスターカード名簿用の箱を追加

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
            console.log(`カード処理中 -> item_id: ${row.item_id}, monster_key: "${row.monster_key}", display_name: "${row.display_name}"`);

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
                // 🌟 モンスターのキー（例: 'monster1'）から最初の文字を大文字にするなどしてフォルダ名に合わせる
                // 例: 'monster1' -> 'Monster1'
                const capitalizedKey = row.monster_key.charAt(0).toUpperCase() + row.monster_key.slice(1);

                newItemCategories[row.monster_key] = "ETC";
                // 🌟 ご指定のパス構造に動的に合わせる
                newItemImages[row.monster_key] = `/card_assets/${capitalizedKey}.png`;
                newItemDescriptions[row.monster_key] = row.description || "モンスターの生態が記された貴重なカード。";
            }
        });

        // 1. メモリ上のカタログと各名簿を更新
        ITEM_CATALOG = formattedCatalog;
        EQUIP_NAMES = newEquipNames;
        CONSUME_NAMES = newConsumeNames;
        ETC_NAMES = newEtcNames;
        // 🌟 モンスターカードも含めて一元管理
        ITEM_NAMES_CARD = newCardNames; 

        itemCategories = newItemCategories;
        ITEM_IMAGES = newItemImages;
        ITEM_DESCRIPTIONS = newItemDescriptions;

        SERVER_ITEM_NAMES = {
            ...EQUIP_NAMES,
            ...CONSUME_NAMES,
            ...ETC_NAMES,
            ...newCardNames // 🌟 ここでサーバー側の名前リストにもカードを合流！
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
            "normal_gold":   { "type": "ETC", "name": "normal_gold", "display_name": "ふつうのお金", "src": "item_assets/GoldOne_", "isAnimated": true },
            "gold_heart": { "type": "ETC", "name": "gold_heart", "display_name": "ハートメダル(金)1", "src": "item_assets/GoldHeart_", "isAnimated": true },
        };

        // --- 🌟 📦 送信用に合体させる ---
        ITEM_CONFIG = { ...ANIMATED_ITEMS, ...STATIC_ITEMS };

        // --- 🛡️ 描画側 (sprites.items) への流し込み ---
        if (typeof sprites !== 'undefined' && sprites.items) {
            Object.keys(ITEM_CONFIG).forEach(key => {
                const data = ITEM_CONFIG[key];
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
            // 2026-8-5停止
            //console.log(`ITEM_CATALOGの初期化完了: ${itemName}(ID:101) 合計=${stats}`);
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

// ============================================================
// :::LOAD_EXP::: 📈 データベースからの経験値テーブル読み込み
// ============================================================
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
		// 2026-8-5停止
        //console.log(`[System] 経験値テーブルをDBから読み込みました (${rows.length}レベル分)`);
        
        // デバッグ用：Lv.7 と Lv.200 の値を確認
		// 2026-8-5停止
        //if (LEVEL_TABLE[7]) console.log(`Lv.7  MaxExp: ${LEVEL_TABLE[7]}`);
        //if (LEVEL_TABLE[200]) console.log(`Lv.200 MaxExp: ${LEVEL_TABLE[200]}`);

    } catch (err) {
        console.error('❌ 経験値テーブルの読み込みに失敗しました:', err);
        // 失敗時のバックアップ（最低限の値を手動で入れておく）
        LEVEL_TABLE = [0, 12, 20, 35, 60, 100, 150, 210, 280, 360, 450];
    }
}

let MAX_HP_TABLE = [0]; // Lvごとの最大HPを格納する配列

// ============================================================
// :::LOAD_HP::: 🏥 データベースからの最大HPテーブル読み込み
// ============================================================
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
		// 2026-8-5停止
        //console.log(`[System] 最大HPテーブルをDBから読み込みました (${rows.length}レベル分)`);
        
        // デバッグ用確認
		// 2026-8-5停止
        //if (MAX_HP_TABLE[1]) console.log(`Lv.1   MaxHP: ${MAX_HP_TABLE[1]}`);
        //if (MAX_HP_TABLE[200]) console.log(`Lv.200 MaxHP: ${MAX_HP_TABLE[200]}`);

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

// 🌟 プレイヤーが乗っているプラットフォームのインデックスを返す関数
function getPlatIndexFromCoords(x, y) {
    const footY = y + 20; 

    for (let i = 0; i < MAP_DATA.platforms.length; i++) {
        const p = MAP_DATA.platforms[i];
        
        // 1. 横幅の判定（少し広めに取ると安定します）
        const inRangeX = (x >= p.x - 20 && x <= (p.x + p.w + 20));
        
        // 2. 高低差の判定
        const diffY = Math.abs(footY - p.y);

        // 🌟 ここを 40 ではなく余裕を持って 50 に設定します
        if (inRangeX && diffY < 50) {
            return i; 
        }
    }
    return null; // どれにも該当しなければ地面
}

// プログラム全体で使う図鑑の変数（空で初期化）
let ENEMY_CATALOG = {};
// 🌟 外部から参照するための配列形式
let MONSTER_CONFIGS = [];

// ============================================================
// :::LOAD_ENEMY::: 👹 データベースからモンスター図鑑・設定読み込み
// ============================================================
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
                // 2026-8-5停止
                //console.log("--- 🐛 Debug: Monster ID 20 Data ---");
                //console.log("raw row data:", row);
                //console.log("expected image path:", `/assets/images/monsters/${row.image_folder}/${row.name}.png`);
                //console.log("-------------------------------------");
            }

            // 🌟 【ステップ1】モンスターごとにランダムでオーラの種類を決定する
            let assignedAura = 'none';
            const rand = Math.random();
            if (rand < 0.15) {
                assignedAura = 'gold';   // 15%: ゴールド
            } else if (rand < 0.25) {
                assignedAura = 'red';    // 10%: レッド (15%〜25%)
            } else if (rand < 0.35) {
                assignedAura = 'blue';   // 10%: ブルー (25%〜35%)
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

                // 🌟 追加：サーバー側で決定したオーラの種類
                auraType: assignedAura,

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
                walk: row.anim_walk,     // 18
                auraType: assignedAura   // 🌟 追加：設定データ側にもオーラを保持
            });
        });

        // グローバル変数（または上位スコープの変数）を更新
        ENEMY_CATALOG = newCatalog;
        MONSTER_CONFIGS = newConfigs; // 🌟 配列を反映
        
        console.log(`✅ モンスター図鑑を読み込みました (${Object.keys(ENEMY_CATALOG).length} 件)`);
        
        // 開発時の確認用（最初の1件のデータを表示）
        if (rows.length > 0) {
            const firstId = rows[0].enemy_id;
            // 2026-8-5停止
            //console.log(`📊 サンプルデータ確認 [ID:${firstId}]:`, ENEMY_CATALOG[firstId]);
            //console.log(`📊 MONSTER_CONFIGS 形式の確認:`, MONSTER_CONFIGS[0]);
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
  //{ plat: 0,    id: 2160 }, 
  { plat: 1,    id: 2050 }, 
  { plat: 1,    id: 2020 }, 
  { plat: 2,    id: 2080 }, 
  { plat: 2,    id: 2080 }, 
  { plat: 2,    id: 2080 },
  { plat: null,    id: 2010 }
];

// ==========================================
// 🌟 モンスターごとのドロップ設定
// ==========================================
const DROP_DATABASE = {
  "Monster1":  { table: "Drop_Monster1"},
  "Monster2":  { table: "Drop_Monster2"},
  "Monster5":  { table: "Drop_Monster3"},
  "Monster8":  { table: "Drop_Monster8"},
  "Monster16":  { table: "Drop_Monster4"},
  "Monster30":  { table: "Drop_Monster4"},
  "Char13":  { table: "Drop_Monster2"},
  "Char10":  { table: "Drop_Monster4"  },
  "Char19":  { table: "Drop_Monster4"  },
  //"monster20": { table: "drop2"  },
};

const DROP_CHANCE_TABLES = {
  "Drop_Monster1": { "drop_rate": 100, "normal_gold": 70, "avatar": 10, "pouch": 10 }, // 50%でドロップ、そのうち20%で金塊
  "Drop_Monster2": { "drop_rate": 100, "normal_gold": 70, "shield": 5,　"sword": 5 },
  "Drop_Monster3": { "drop_rate": 100, "normal_gold": 50 },
  "Drop_Monster4": { "drop_rate": 100, "normal_gold": 80, "treasure": 80, "sweets": 80, "shield": 20 },
  "Drop_Monster8": { "drop_rate": 100, "normal_gold": 50, "pouch_slime":50 },
  
  // --- 🌟 Drop1用のオーラテーブル ---
  "Drop_Monster1_Gold": { "drop_rate": 100, "treasure": 60 },
  "Drop_Monster1_Red":  { "drop_rate": 100, "avatar": 60 },
  "Drop_Monster1_Blue": { "drop_rate": 100, "milk_tea": 60 },

   // --- 🌟 Drop2用のオーラテーブル ---
   "Drop_Monster2_Gold": { "drop_rate": 100, "freemarket": 50 },
   "Drop_Monster2_Red":  { "drop_rate": 100, "freemarket": 40 },
   "Drop_Monster2_Blue": { "drop_rate": 100, "sweets": 30 },
};

// ============================================================
// 🧠 [SECTION 4: LOGIC] 計算エンジン・判定ロジック
// 役割: 当たり判定、経験値計算、ドロップ抽選など「正誤」を決める計算
// ============================================================
// ============================================================
// :::DEBUG_CHAT::: 🤖 サーバー状況の通知・コンソール出力・チャット同期
// ============================================================
function debugChat(message, type = 'info') {
    try {
        const time = new Date().toLocaleTimeString('ja-JP', { timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit' });
        
        let safeType = type;
        if (typeof type === 'boolean') {
            safeType = type ? 'error' : 'info';
        }
        safeType = safeType || 'info';

        let icon = '🤖';
        let color = '\x1b[36m';
        let cssColor = '#00bcd4'; // ブラウザ用のデフォルトカラー（シアン等）

        switch (safeType) {
            case 'error':   icon = '🚨'; color = '\x1b[31m'; cssColor = '#dc2626'; break; // 赤
            case 'success': icon = '🎊'; color = '\x1b[32m'; cssColor = '#16a34a'; break; // 緑
            case 'warn':    icon = '⚠️'; color = '\x1b[33m'; cssColor = '#ca8a04'; break; // 黄
            case 'db':      icon = '🗄️'; color = '\x1b[35m'; cssColor = '#9333ea'; break; // 紫
            case 'gray':    icon = '💬'; color = '\x1b[90m'; cssColor = '#6b7280'; break; // 👈 グレー（灰色）
            default:        icon = 'ℹ️'; color = '\x1b[36m'; cssColor = '#00bcd4'; safeType = 'info'; break;
        }

        // 📡 ブラウザ側のチャット画面（HTMLとして描画される場合、spanで文字色を指定）
        io.emit('chat', {
            id: 'SYSTEM_LOG',
            name: `${icon} ${safeType.toUpperCase()}`,
            text: `[${time}] <span style="color: ${cssColor};">${message}</span>`
        });

        // 💻 サーバー側の黒い画面（コンソール）
        console.log(`${color}[${safeType.toUpperCase()}] ${message}\x1b[0m`);

    } catch (e) {
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

// ============================================================
// :::CLASS_ENEMY::: 👾 敵キャラクターの定義・AI・物理演算
// ============================================================
class Enemy {

  // 足場の湧き位置
  static PLAT_X = 60;
  // 地面の湧き位置
  static FIELD_X = 500;

  constructor(data) {
    // 🐣 デバッグ開始：出生の記録
	// 2026-8-5停止
    //console.group(`🐣 [Monster Constructor] ID:${data.id} 生成開始`);
    //console.log("   受信データ(data):", { ...data }); // 元データをコピーして表示

    // 1. 基本情報の抽出
    this.id = data.id;
    this.platIndex = data.platIndex;
	
	this.auraType = data.auraType || 'none';
	
    this.x = data.x;
    this.y = data.y;
	
	this.spawnX = data.x;
    this.spawnY = data.y;
    this.spawnOffset = 0;
    // 2026-8-5停止
    //console.log("   初期代入直後: x=", this.x, "y=", this.y);
    
    // 2. 🌟 オフセットの計算
    const p = (this.platIndex !== null && typeof MAP_DATA !== 'undefined') ? MAP_DATA.platforms[this.platIndex] : null;
    if (p) {
        this.offset = this.x - p.x;
        this.offset = Math.max(0, Math.min(p.w - (data.w || 50) * 0.2, this.offset));
    } else {
        this.offset = 0;
    }
	
	this.spawnOffset = this.offset;

    // 3. 描画ガードフラグ
    this.isJustSpawned = true;
    this.opacity = 0;
    
    // ジャンプ関連の初期化
    this.jumpY = 0;
    this.jumpV = 0;
    this.jumpFrame = 0;

    // ⚡⚡⚡ ここが重要：resetの前後を監視 ⚡⚡⚡
    // 2026-8-5停止
	//console.log("   reset() 実行前: x=", this.x, "y=", this.y);
    this.reset(data);
    // 2026-8-5停止
	//console.log("   reset() 実行後: x=", this.x, "y=", this.y);
    // ⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡
	
    // 🌟 最終防衛ライン
    if (data.x !== undefined) this.x = data.x;
    if (data.y !== undefined) this.y = data.y;
	
	// 2026-8-5停止
    //console.log(`[最終防衛ライン通過後] ID:${this.id} 確定座標: x=${this.x}, y=${this.y}, opacity=${this.opacity}`);
    console.groupEnd(); // デバッグ終了
  }

  // ==========================================
// 🔄 状態リセット（初期化）
// ==========================================
reset(data) {
  // 1. 表示・生存フラグ
  this.alive         = true;
  // 🌟 【最重要修正】
    // 召喚直後（isJustSpawned が true）なら、不透明（1）にしない！
    //if (this.isJustSpawned) {
        this.opacity = 0; 
    //} else {
    //    this.opacity = 1;
    //}
  this.isFading      = false;
  this.deathFrame    = 0;
  
  this.x = this.spawnX;
  this.y = this.spawnY;
  this.offset = this.spawnOffset;

  // 2. 動作・タイマー
  this.kbV           = 0;
  this.isAttacking   = 0;
  this.isEnraged     = false;
  this.respawnTimer  = 0;
  this.waitTimer     = 0;
  this.offset        = Enemy.PLAT_X;
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

  // 🌟 5. 【修正】ここがポイント！
    // 既に x, y が決まっているなら、initPosition（強制リセット）を実行しない！
    // 🌟 修正：isPatching フラグが立っている、または既に座標があるならスキップ！
    //if (this.isPatching || (this.x !== undefined && this.y !== undefined)) {
    //    console.log(`[デバッグ] ID:${this.id} はパッチ中または座標指定済みのため、位置リセットをスキップ`);
    //} else {
        this.initPosition();
    //}
	// 🌟 6. 復活時にオーラを新しくランダム抽選し直す
  const rand = Math.random();
  if (rand < 0.15) {
      this.auraType = 'gold';   // 15%: ゴールド
  } else if (rand < 0.25) {
      this.auraType = 'red';    // 10%: レッド
  } else if (rand < 0.35) {
      this.auraType = 'blue';   // 10%: ブルー
  } else {
      this.auraType = 'none';   // 65%: なし
  }
}

  // 初期位置を決める内部処理
  initPosition() {
    // 🌟 1. 【最強のガード】
    // 既に x, y が決まっているなら、初期化ロジック（足場計算含む）を完全にスキップ！
    //if (this.x !== undefined && this.y !== undefined) {
    //    console.log(`[デバッグ] ID:${this.id} は座標指定済みのため、初期化ロジックをスキップ`);
    //    return; 
    //}
	
	if (this.spawnX !== undefined) return;

    // 2. ここから下が「座標がない時」だけ動くロジック
    if (this.platIndex !== null) {
        const p = MAP_DATA.platforms[this.platIndex];
        this.x = p.x;
        this.y = p.y; // 👈 ここで強制リセットされていたのが犯人です
    } else {
        this.x = Enemy.FIELD_X;
        this.y = 550; // 地面
    }
}

  // ======================================================
  // ⚙️ フレームごとの更新処理
  // ======================================================
  update() {
    // 出現時のフェードイン
    if (this.spawnAlpha < 1) {
		this.spawnAlpha += 0.05; // 徐々に表示する
		this.opacity = this.spawnAlpha; // 描画時の不透明度に反映
	}

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
        // --- 🔍 ここにデバッグ行を追加 ---
        console.group(`🔄 [Respawn Debug] ID:${this.id} 復活の瞬間`);
        console.log("リセット前: opacity =", this.opacity, "alive =", this.alive);
        
        this.reset();
        
        console.log("リセット後: opacity =", this.opacity, "alive =", this.alive);
        console.groupEnd();
        // ------------------------------
        
        // 特定のプラットフォーム上の場合、念のためここでも透明化を保証
        if (this.platIndex !== null) this.opacity = 0;
      }
      return true;
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

  // 🏃 プレイヤーを追いかける（ピクピク修正・最適化版）
moveTowardsTarget(target) {
    // 💡 1. 到着時のピクピク防止（デッドゾーン設定）
    // プレイヤーとの距離が5px以内なら、それ以上移動計算を行わないことで
    // ターゲットと重なった時に向きが高速で反転する現象を防ぎます。
    const dx = target.x - this.x;
    if (Math.abs(dx) < 5) {
        return; // 移動処理を中断してその場で静止
    }

    // 2. ターゲットの方向（左:-1, 右:1）を決定
    this.dir = (dx < 0) ? -1 : 1;
    
    // 追跡時のスピード調整
    // 「のっそり」感が気になる場合は、この 1.5 の数値を 2.0 〜 2.5 に上げてください
    const moveStep = this.speed * 1.5 * this.dir;
    
    // 現在の足場情報を取得
    const p = (this.platIndex !== null) ? MAP_DATA.platforms[this.platIndex] : null;

    if (!p) {
        // 3. 空中（または地面なし）の場合の移動
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
        // 4. プラットフォーム上の場合の移動
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
	// 🌟 これを追加（毎フレーム実行されます）
    if (this.id === 2160) {
        //console.log(`[監視中] ID:2160 現在地X:${this.x.toFixed(1)}, Dir:${this.dir}`);
    }
	
    // 現在乗っているプラットフォームのデータを取得
    const p = (this.platIndex !== null) ? MAP_DATA.platforms[this.platIndex] : null;

    // --- 🔍 デバッグ：巡回開始前の状態 ---
    // もしここでログが大量に出すぎる場合は、特定のIDの時だけ表示するように変更してください
    // console.log(`[Patrol] ID:${this.id} X:${this.x.toFixed(1)} platIndex:${this.platIndex} Dir:${this.dir}`);

    if (!p) {
        // 1. 地面がない（空中・自由移動）場合：画面の左右端で反転
        this.x += this.speed * this.dir;

        // 左端に到達
        if (this.x < SETTINGS.SYSTEM.ENEMY_MIN_X) {
            //console.log(`[Patrol Debug] ID:${this.id} 反転！左端到達. 現在X:${this.x.toFixed(1)}, MIN_X:${SETTINGS.SYSTEM.ENEMY_MIN_X}`);
            this.x = SETTINGS.SYSTEM.ENEMY_MIN_X;
            this.dir = 1; // 右へ反転
        }
        // 右端に到達
        else if (this.x > SETTINGS.SYSTEM.ENEMY_MAX_X - this.w) {
            //console.log(`[Patrol Debug] ID:${this.id} 反転！右端到達. 現在X:${this.x.toFixed(1)}, MAX_X:${SETTINGS.SYSTEM.ENEMY_MAX_X}`);
            this.x = SETTINGS.SYSTEM.ENEMY_MAX_X - this.w;
            this.dir = -1; // 左へ反転
        }
    } else {
        // 2. プラットフォーム上の場合：足場の端で反転＆一時停止
        this.offset += this.speed * this.dir;

        // 足場の左端に到達
        if (this.offset <= 0) {
            //console.log(`[Patrol Debug] ID:${this.id} 反転！プラットフォーム左端到達. Offset:${this.offset.toFixed(1)}`);
            this.offset = 0.5;    // めり込み防止の微調整
            this.dir = 1;         // 右へ反転
            this.waitTimer = 40;  // 立ち止まって考える時間
        }
        // 足場の右端に到達
        else if (this.offset >= p.w - this.w) {
            //console.log(`[Patrol Debug] ID:${this.id} 反転！プラットフォーム右端到達. Offset:${this.offset.toFixed(1)}`);
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

    // 🌟 どんな場所にいても、リスポーン直後はここで確実に透明度を徐々に上げる（0.02ずつ）
    if (this.opacity < 1) {
        this.opacity = Math.min(1, this.opacity + 0.03); // ちょっとキリ良く 0.03 にしても見栄えが良いです
    }
    
    // 現在の足場情報を取得
    const p = (this.platIndex !== null) ? MAP_DATA.platforms[this.platIndex] : null;

    if (!p) {
      // 2. 地面（プラットフォーム外）にいる場合
      // 基本の地面の高さから、自身の高さと浮遊オフセットを引く
      this.y = SETTINGS.SYSTEM.GROUND_Y - this.h - floatOffset;
    } else {
      // 3. プラットフォーム上にいる場合
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

// ============================================================
// :::INIT_MONSTER::: 👹 チャンネルごとの敵配置とドロップ枠初期化
// ============================================================
function initMonsters() {
    CHANNELS.forEach(chId => {
        enemies[chId] = ENEMY_PLAN.map(p => {
            // 図鑑やプランからオーラを決める、または抽選する
            let assignedAura = p.auraType || 'none';
            if (!p.auraType) {
                const rand = Math.random();
                if (rand < 0.15) assignedAura = 'gold';
                else if (rand < 0.25) assignedAura = 'red';
                else if (rand < 0.35) assignedAura = 'blue';
            }

            const enemy = new Enemy({ 
                id: p.id, 
                platIndex: p.plat,
                auraType: assignedAura // 🌟 個体にオーラをセット！
            });

            // 🔍 【デバッグ用】本当に生成時にオーラが入っているか確認
			// 2026-8-5停止
            //console.log(`[Step1 Spawn] 敵ID:${enemy.id} 型:${enemy.type} オーラ:${enemy.auraType}`);

            return enemy;
        });
        
        droppedItems[chId] = [];
    });

    LOG.SYS(`✅ ${MAX_CHANNELS}チャンネル分の敵・ドロップ情報を初期化しました`);
}

// ============================================================
// :::START_SERVER::: 🚀 起動シーケンス・全データ読み込み・サーバー待機
// ============================================================
async function startServer() {
    try {
        // --- 1. DBから全てのカタログを読み込む ---
		await loadFullItemCatalogs();
        await loadItemCatalogFromDB();
        await loadEnemyCatalog();

        // 🌟 【ここに追加！】DBから「インベントリに入るべきアイテム」を動的にロード
        const [consumeRows] = await pool.query("SELECT name FROM item_consume_catalog");
		const [equipRows] = await pool.query("SELECT name FROM item_equip_catalog");
		const [etcRows] = await pool.query("SELECT name FROM item_etc_catalog");

		inventoryTypes = new Set([
			...consumeRows.map(row => row.name),
			...equipRows.map(row => row.name),
			...etcRows.map(row => row.name)
		]);
        console.log(`✅ インベントリ対象アイテムのロード完了: ${inventoryTypes.size} 件`);

        // --- 2. データが揃った後にモンスターを配置 ---
        initMonsters();
        
        await loadExperienceTable();
        await loadMaxHPTable();

        // --- 3. 最後にサーバーを起動 ---
        const PORT = process.env.PORT || 3000;
        
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

// ============================================================
// :::ADD_EXP::: 🌟 経験値加算・レベルアップ判定・HP/AP更新
// ============================================================
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

	// 2026-8-30停止
    //debugChat(`[EXP] ${player.name}: +${amount} (Total: ${player.exp} / Next: ${requiredExp})`);

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

// ============================================================
// :::SPAWN_MONSTER_CARD_DROP::: 🃏 モンスターカードのドロップ処理（完全動的対応版）
// ============================================================
function spawnMonsterCardDrop(enemy, chId) {
    try {
        if (!enemy || !chId || !droppedItems[chId]) return;

        // --- 確率の判定 (例: 5.0 = 5%) ---
        const cardDropChance = 95.0; 
        if (Math.random() * 100 > cardDropChance) return;

        // 🌟 敵のタイプや名前から、自動で動的にキーと名称を生成する
        // 例: enemy.type が "GreenSlime" なら、monsterKey は "greenslime" になる
        let rawType = enemy.type || enemy.monsterKey || enemy.name || 'monster1';
        let monsterKey = String(rawType).toLowerCase().replace(/\s+/g, ''); // スペースや大文字を正規化

        // もし "monster1" のような形式ではなく名前そのもの（例: "slime" など）の場合、
        // データベースや図鑑で扱いやすいように "slimeカード" のような名前に整える
        let baseCardName = enemy.displayName || enemy.name || monsterKey;
        // 末尾に「カード」という文字がすでに入っていなければ綺麗につける
        if (!baseCardName.includes('カード')) {
            baseCardName += 'カード';
        }

        // 仮のカードID（ID管理が必要な場合は適当なハッシュや連番、またはenemy.id等から生成）
        let cardId = enemy.cardId || (40000 + Math.abs(hashCode(monsterKey)) % 1000);

        // 🌟 1〜6のランクを等確率で決定
        const cardRank = Math.floor(Math.random() * 6) + 1;
        const rankNames = { 1: 'ブロンズ', 2: 'シルバー', 3: 'ゴールド', 4: 'プラチナ', 5: 'ダイヤモンド', 6: '虹' };
        
        const finalCardName = `${baseCardName} (${rankNames[cardRank]})`;

        const fixedSpawnY = enemy.y + (enemy.h || 32) - 50;
        const centerX = enemy.x + (enemy.w || 32) / 2;

        const newCardItem = {
            id: Date.now() + Math.random(),
            x: centerX,
            y: fixedSpawnY,
            vx: (Math.random() - 0.5) * 4,
            vy: -4 - Math.random() * 2,
            type: monsterKey,          
            cardId: cardId,          
            name: finalCardName,       
            cardRank: cardRank,         // どのランクのカードか
            monsterKey: monsterKey,     // DB保存用のキー
            ch: chId,
            landed: false,
            phase: Math.random() * Math.PI * 2
        };

        droppedItems[chId].push(newCardItem);
        console.log(`[Card Drop] ch:${chId} に ${finalCardName} (ランク:${cardRank}) がドロップしました！`);

    } catch (error) {
        console.error("❌ spawnMonsterCardDropエラー:", error);
    }
}

// 補助関数：文字列から安定した数値IDを生成するハッシュ関数（カードID自動生成用）
function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = (hash << 5) - hash + str.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash);
}

// ============================================================
// :::SPAWN_DROP::: 🎁 アイテムの抽選・性能鑑定・チャンネル配置
// ============================================================
function spawnDropItems(enemy, chId) {

	console.log(`[Debug] 撃破されたモンスター: ${enemy.type}, オーラ: ${enemy.auraType}`);
	
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
        
        if (dropRoll <= (chances.drop_rate || 100)) {
            for (let type in chances) {
                if (type === "drop_rate") continue;
                if (Math.random() * 100 < chances[type]) {
                    itemsToDrop.push(type);
                }
            }
        }
		
		// ========================================================
        // 🌟 【ここに追加！】Drop1〜4ごとのオーラ別ドロップ抽選
        // ========================================================
        if (enemy.auraType && enemy.auraType !== 'none') {
            // 例: "Drop1" + "_" + "Red" -> "Drop1_Red" というテーブル名を作る
            const auraTableName = `${setting.table}_${enemy.auraType.charAt(0).toUpperCase() + enemy.auraType.slice(1)}`;
            
            if (DROP_CHANCE_TABLES[auraTableName]) {
                const auraTable = DROP_CHANCE_TABLES[auraTableName];
                const auraDropRoll = Math.random() * 100;

                if (auraDropRoll <= (auraTable.drop_rate || 100)) {
                    for (let type in auraTable) {
                        if (type === "drop_rate") continue;
                        if (Math.random() * 100 < auraTable[type]) {
                            itemsToDrop.push(type);
                        }
                    }
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
				
				// 🌟 【ここに追加！】新しく生み出されたアイテムは最初はもちろん未装備
                isEquipped: false,

                // 🌟 ここで強制的に値を代入
                lv: (catalogBase && catalogBase.lv !== undefined) ? catalogBase.lv : 50,
                
				category: (catalogBase && catalogBase.category) ? catalogBase.category : (type === 'sword' ? "sword" : (type === 'shield' ? "shield" : "")),
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
            } else if (type === 'normal_gold') {
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

// ============================================================
// :::IDENTIFY_ITEM::: 🔍 アイテム品質ランク決定・ステータス変動計算
// ============================================================
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
	// 2026-8-7停止
    //LOG.ITEM(`🎁 [鑑定:${res.qualityLabel}] ${type} Atk:${res.atk} Matk:${res.matk || 0} Def:${res.def} Str:${res.str || 0} Dex:${res.dex || 0} Int:${res.int || 0} Luk:${res.luk || 0} HP:${res.maxHp || 0} MP:${res.maxMp || 0}`);
    
    return res;
}

// ============================================================
// 💡 ショップのラインナップと共通取得ロジック（グローバルスコープ）
// ============================================================
const SHOP_CONFIG = {
    targetIds: {
        consume: [201, 202, 203, 211, 213, 214, 215, 216, 217, 218],
        etc: [301, 302],
        equip: [101, 102]
    }
};

// ============================================================
// :::GET_SHOP_INVENTORY::: 🛒 ショップの全カテゴリーデータ取得・整形
// ============================================================
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

// 💡 「召喚の包み」辞書
const SUMMON_MAP = {
    // アイテムID: 敵ID
    50001: 2010, // 50001を使うと、enemy_id 1010 が出る
    50002: 2020, // 50002を使うと、enemy_id 1020 が出る
    50030: 2300, // ボス召喚など
    50160: 2160  // ボス召喚など
};

// ============================================================
// :::EXEC_ADMIN_CMD::: 🛠️ 管理者コマンド・テスト・露店開設の司令塔
// ============================================================
function executeAdminCommand(socket, p, text) {
    // 🔍 【コマンド1】ステータス詳細
    if (text === '/check') {
        LOG.SYS(`--- 🔍 ${p.name}の状態 ---`);
        LOG.SYS(`HP: ${p.hp}/${p.maxHp} | Lv: ${p.level} | Gold: ${p.gold}`);
        LOG.SYS(`位置: (${Math.round(p.x)}, ${Math.round(p.y)})`);
        LOG.SYS(`現在のモンスター数: ${enemies.length}体`);
        return true; // 処理完了
    }
	
	if (text === '/godmode') {
        // 現在のフラグを反転（未設定ならfalseから始まるので true になる）
        p.isInvincible = !p.isInvincible;
        const status = p.isInvincible ? "ON" : "OFF";
        LOG.SUCCESS(`🛡️ ゴッドモードを ${status} にしました`);
		
		socket.emit('player_update_godmode', { isInvincible: p.isInvincible });
		
        return true;
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
	/*
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
	*/
	
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
                text: `[${new Date().toLocaleTimeString('ja-JP', { timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit' })}] ${amount}Gを捨てました`
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

                // 🌟 プレイヤーがサーバーに存在するか確認
                const p = players[socket.id];
                if (!p) {
                    console.log("エラー: プレイヤーが見つかりません");
                    return;
                }

                // 🌟 開いた瞬間に自分のインベントリも最新のマスター辞書で安全に再構築しておく場合
                // （もし必要であればここで固定インベントリを整える）

                socket.emit('open_shop_ui', {
                    shopName: "よろず屋",
                    inventory: shopInventory,
                    myItems: p.inventory, // 🎒 自分のバッグの中身も一緒に渡す
                    gold: p.gold          // 💰 所持金も一緒に渡す
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
	
	// 🎭 【コマンド10】キャラクター選択画面を再表示
    if (text === '/char') {
        LOG.SUCCESS(`🎭 ${p.name} のキャラ選択画面を呼び出します`);
        
        // 1. クライアントにキャラ選択UIの表示をリクエスト
        socket.emit('request_char_select'); 
        
        // 2. 状態のクリア（必要に応じて）
        // プレイヤーがキャラ選択中であることを示すフラグを立てることも可能です
        p.isSelectingChar = true; 
        
        return true;
    }
	
	// 🎭 【コマンド11】キャラクター選択画面を再表示
if (text === '/char2') {
    // 🌟 model_id があればそれを使う、なければ group を使う（両方なければ 8 を使う）
    const targetModelId = p.model_id || p.group || 8;

    LOG.SUCCESS(`🎭 ${p.name} (ModelID: ${targetModelId}) のキャラ選択画面を呼び出します`);
    
    // 🌟 決定した ID を送信
    socket.emit('request_char_select2', { modelId: targetModelId }); 
    
    p.isSelectingChar = true;
    return true;
}

if (text === '/zukan') {
    (async () => {
        // 全データを取得
        const items = await getZukanData(pool, 'all'); 
        console.log(`📡 [Debug] ${items.length} 件のアイテムを取得`);
        socket.emit('open_zukan', { items: items });
    })();
    return true;
}

// チャットコマンドの処理などの中に追加
if (text === '/mzukan') {
    (async () => {
        try {
            // 1. エネミー図鑑データを取得
            const [rows] = await pool.query('SELECT * FROM enemy_catalog ORDER BY enemy_id ASC');
            
            // 2. 各アイテムカタログからデータを一括取得
            const [consumeRows] = await pool.query('SELECT * FROM item_consume_catalog');
            const [equipRows] = await pool.query('SELECT * FROM item_equip_catalog');
            const [etcRows] = await pool.query('SELECT * FROM item_etc_catalog');

            // 3. 扱いやすいように一つのマスター辞書オブジェクトにまとめる
            const itemCatalogMap = {};
            
            [...consumeRows, ...equipRows, ...etcRows].forEach(item => {
                itemCatalogMap[item.name] = {
                    displayName: item.display_name || item.name,
                    imageName: item.image_name
                };
            });

            console.log(`📡 [Debug] ${rows.length} 件のエネミーとカタログデータを取得しました`);
            
            // 🌟 4. 各エネミーごとのオーラ別ドロップテーブル情報を事前に構築して送信
            // エネミーのtype (例: "Monster1") ごとに、Drop1_Gold などのテーブルを解決できるようにする
            const enemyAuraDropTables = {};
            rows.forEach(en => {
                const setting = DROP_DATABASE[en.type] || { table: "Drop3" };
                const baseTable = setting.table; // "Drop1", "Drop2" など

                enemyAuraDropTables[en.type] = {
                    gold: DROP_CHANCE_TABLES[`${baseTable}_Gold`] || {},
                    red:  DROP_CHANCE_TABLES[`${baseTable}_Red`] || {},
                    blue: DROP_CHANCE_TABLES[`${baseTable}_Blue`] || {}
                };
            });

            // 5. クライアントへ送信
            socket.emit('open_mzukan', { 
                enemies: rows,
                dropDatabase: DROP_DATABASE,      
                dropChanceTables: DROP_CHANCE_TABLES,
                itemCatalogMap: itemCatalogMap, // カタログ辞書
                
                // 🌟 テーブル連動型のオーラドロップ定義を渡す
                enemyAuraDropTables: enemyAuraDropTables
            });
        } catch (e) {
            console.error("❌ /mzukan エラー:", e);
        }
    })();
    return true;
}

// チャットコマンドの処理に追加
if (text.startsWith('/summon')) {
    console.log("🔍 [Debug] summonコマンドを検知しました！"); // 追加
    
    const parts = text.split(' ');
    const targetId = parseInt(parts[1]); // 入力された数値（敵IDなど）
    console.log("🔍 [Debug] 入力されたID:", targetId); // 追加

    // 入力値が有効な数値（NaNではない）かどうかチェック
    if (!isNaN(targetId)) {
        console.log("🔍 [Debug] 有効なIDが入力されました。召喚関数を呼び出します。"); // 追加
        (async () => {
            try {
                // SUMMON_MAPを介さず、入力された数値をそのまま渡す
                await executeSummon(socket, targetId);
                console.log("🔍 [Debug] executeSummon完了！"); // 追加
            } catch (e) {
                console.error("❌ [Debug] executeSummonでエラー発生:", e);
            }
        })();
    } else {
        console.log("⚠️ [Debug] 有効なIDが指定されていません。例: /summon 2010"); // 追加
    }
    return true;
}

if (text.startsWith('/speed')) {
    const parts = text.split(' ');
    const speedValue = parseFloat(parts[1]);
    const player = players[socket.id];

    if (player && !isNaN(speedValue)) {
        // コマンドで指定された数値を player.speed に代入する
        player.speed = speedValue; 
        console.log(`🚀 スピードを ${speedValue} に変更しました！`);
		socket.emit('update_player_speed', { speed: speedValue });
    }
    return type = true; // または return true;
}

if (text.startsWith('/jump')) {
    const parts = text.split(' ');
    const jumpValue = parseFloat(parts[1]);
    const player = players[socket.id];

    if (player && !isNaN(jumpValue)) {
        // コマンドで指定された数値を player.jumpPower に代入する
        player.jumpPower = jumpValue; 
        console.log(`🦘 ジャンプ力を ${jumpValue} に変更しました！`);
        
        // クライアント側に新しいジャンプ力を通知する
        socket.emit('update_player_jump', { jumpPower: jumpValue });
    }
    return true; 
}

if (text.startsWith('/gacha')) {
    (async () => {
        const player = players[socket.id];
        if (!player) return;

        try {
            // 🎁 ガチャプール（消費アイテム ＋ 装備品）
            const gachaPool = [
                { id: 213, category: 'consume' }, // 経験値の書
                { id: 214, category: 'consume' }, // レベルアップのカギ
                { id: 215, category: 'consume' }, // 透明の薬
                { id: 216, category: 'consume' }, // スピードアップの羽
                { id: 217, category: 'consume' }, // まろやかミルクコーヒー
                { id: 218, category: 'consume' }, // スライムの包み
                { id: '101', category: 'sword' },   // マニアックソード（装備品）
                { id: '102', category: 'shield' },  // トリシールド（装備品）
            ];

            const randomPick = gachaPool[Math.floor(Math.random() * gachaPool.length)];
            let wonItem = null;

            // 🍎 消費アイテムの場合
            if (randomPick.category === 'consume') {
                const [rows] = await pool.query('SELECT * FROM item_consume_catalog WHERE item_id = ?', [randomPick.id]);
                if (rows.length > 0) {
                    const item = rows[0];
                    wonItem = {
                        name: item.name,
                        type: item.name,
                        displayName: item.display_name,
                        imageName: item.image_name || item.name,
                        count: 1
                    };
                }
            } 
            // ⚔️ 装備品（剣・盾）の場合
else if (randomPick.category === 'sword' || randomPick.category === 'shield') {
    const isSword = randomPick.category === 'sword';
    
    // カタログIDの決定（ドロップ処理と同様に 101 または 102）
    const catalogId = isSword ? 101 : 102;
    const catalogBase = (typeof ITEM_CATALOG !== 'undefined' && ITEM_CATALOG[catalogId]) 
                        ? ITEM_CATALOG[catalogId] 
                        : null;

    // 個別性能鑑定
    const stats = typeof identifyItem === 'function' ? identifyItem(randomPick.category) : {
        qualityLabel: "",
        itemColor: "#ffffff",
        atk: 0, def: 0, matk: 0, str: 0, dex: 0, int: 0, luk: 0, maxHp: 0, maxMp: 0
    };

    // 🌟 先にステータスを変数として確定させる
    const finalAtk = (stats.atk !== undefined) ? stats.atk : (catalogBase ? catalogBase.atk : (isSword ? 15 : 0));
    const finalDef = (stats.def !== undefined) ? stats.def : (catalogBase ? catalogBase.def : (isSword ? 0 : 10));
    const finalMatk = (stats.matk !== undefined) ? stats.matk : (catalogBase ? catalogBase.matk : 0);
    const finalStr = (stats.str !== undefined) ? stats.str : (catalogBase ? catalogBase.str : Math.floor(Math.random() * 3));
    const finalDex = (stats.dex !== undefined) ? stats.dex : (catalogBase ? catalogBase.dex : Math.floor(Math.random() * 3));
    const finalInt = (stats.int !== undefined) ? stats.int : (catalogBase ? catalogBase.int : 0);
    const finalLuk = (stats.luk !== undefined) ? stats.luk : (catalogBase ? catalogBase.luk : 0);
    const finalMaxHp = (stats.maxHp !== undefined) ? stats.maxHp : (catalogBase ? catalogBase.maxHp : 10);
    const finalMaxMp = (stats.maxMp !== undefined) ? stats.maxMp : (catalogBase ? catalogBase.maxMp : 10);

    wonItem = {
        type: randomPick.category, // 'sword' または 'shield'
        name: (isSword ? "剣" : "盾") + (stats.qualityLabel || ""),
        displayName: isSword ? "マニアックソード" : "トリシールド",
        imageName: isSword ? "sword" : "shield",
        count: 1,
        isEquipped: false,
        
        lv: (catalogBase && catalogBase.lv !== undefined) ? catalogBase.lv : 50,
		category: (catalogBase && catalogBase.category) ? catalogBase.category : (isSword ? "sword" : "shield"),
		totalUpgrade: (catalogBase && catalogBase.totalUpgrade !== undefined) ? catalogBase.totalUpgrade : 7,
        star: (catalogBase && catalogBase.star !== undefined) ? catalogBase.star : 0,
        successCount: 0,
        failCount: 0,
        isTradeable: (catalogBase && catalogBase.isTradeable !== undefined) ? catalogBase.isTradeable : true,

        // ステータスを反映
        atk: finalAtk,
        def: finalDef,
        matk: finalMatk,
        str: finalStr,
        dex: finalDex,
        int: finalInt,
        luk: finalLuk,
        maxHp: finalMaxHp,
        maxMp: finalMaxMp,
        
        price: isSword ? 500 : 300,
        
        reqAll: (catalogBase && catalogBase.reqAll !== undefined) ? catalogBase.reqAll : ((catalogBase && catalogBase.lv) ? catalogBase.lv : 1),

        // 🌟 カタログの初期合計値
        totalFirstStats: (catalogBase && catalogBase.totalFirstStats !== undefined) 
                           ? catalogBase.totalFirstStats 
                           : 0,
                           
        // 🌟 現在の合計値
        totalALLStats: (
            finalAtk +
            finalDef +
            finalMatk +
            finalStr +
            finalDex +
            finalInt +
            finalLuk +
            (finalMaxHp / 10) +
            (finalMaxMp / 10)
        )
    };
}

            if (!wonItem) return;

            if (!player.inventory) player.inventory = {};

            let targetSlot = -1;
            let updatedItemData = null;

            // 【ステップ1】スタック可能なアイテム（消費アイテム等）なら既存スロットを探す
            // ※装備品は基本1つずつ独立させるため、スタックさせずに空きスロットへ入れます
            if (randomPick.category === 'consume') {
                for (let i = 0; i < 50; i++) {
                    const slotItem = player.inventory[i];
                    if (slotItem && slotItem.type === wonItem.type && !slotItem.instanceId) {
                        slotItem.count = (slotItem.count || 1) + wonItem.count;
                        targetSlot = i;
                        updatedItemData = slotItem;
                        break;
                    }
                }
            }

            // 【ステップ2】新規スロットへの格納（空きを探す）
            if (targetSlot === -1) {
                for (let i = 0; i < 50; i++) {
                    if (!player.inventory[i]) {
                        player.inventory[i] = { ...wonItem };
                        targetSlot = i;
                        updatedItemData = player.inventory[i];
                        break;
                    }
                }
            }

            if (targetSlot !== -1 && updatedItemData) {
                // 🌟 既存のDB永続化関数を呼び出し（装備品なら equipment_instances に INSERT されます）
                if (typeof saveInventoryToDB === 'function') {
                    saveInventoryToDB(player, updatedItemData, targetSlot);
                } else {
                    console.error("❌ saveInventoryToDB関数が見つかりません");
                }

                console.log(`🎁 [Gacha] ${player.name || socket.id} がガチャで「${wonItem.displayName}」を手に入れ、スロット[${targetSlot}]に保存しました！`);
                
                socket.emit('inventory_update', player.inventory);
                
                if (typeof LOG !== 'undefined' && LOG.SUCCESS) {
                    LOG.SUCCESS(`🎁 ガチャ結果：${wonItem.displayName} を手に入れた！`);
                }
            } else {
                console.log(`⚠️ [Gacha] インベントリがいっぱいでアイテムを入手できませんでした。`);
                if (typeof LOG !== 'undefined' && LOG.GRAY) {
                    LOG.GRAY(`⚠️ インベントリがいっぱいです！`);
                }
            }

        } catch (e) {
            console.error("❌ ガチャ処理エラー:", e);
        }
    })();

    return true;
}

    return false; // どのコマンドにも該当しなかった
}

// 図鑑用データを取得する関数
async function getZukanData(pool, category = 'all') {
    try {
        console.log(`🔍 [Debug] DB問い合わせ開始: カテゴリ=${category}`);

        // 全てのカラム構成を統一します (description を必ず入れる)
        const equipSql = `
            SELECT item_id as id, name, display_name, image_name, price, 'equip' as category, NULL as description,
                   lv, str, dex, \`int\`, luk, atk, def, maxHp, maxMp
            FROM item_equip_catalog`;

        const consumeSql = `
            SELECT item_id as id, name, display_name, image_name, price, 'consume' as category, description,
                   NULL as lv, NULL as str, NULL as dex, NULL as \`int\`, NULL as luk, NULL as atk, NULL as def,
                   NULL as maxHp, NULL as maxMp
            FROM item_consume_catalog`;

        const etcSql = `
            SELECT item_id as id, name, display_name, image_name, price, 'etc' as category, description,
                   NULL as lv, NULL as str, NULL as dex, NULL as \`int\`, NULL as luk, NULL as atk, NULL as def,
                   NULL as maxHp, NULL as maxMp
            FROM item_etc_catalog`;

        let sql = "";
        if (category === 'equip') sql = equipSql;
        else if (category === 'consume') sql = consumeSql;
        else if (category === 'etc') sql = etcSql;
        else sql = `${equipSql} UNION ALL ${consumeSql} UNION ALL ${etcSql}`;

        console.log("📝 [Debug] 実行するSQL:", sql);
        const [rows] = await pool.query(sql);

        // richData に変換する処理（そのまま）
        const richData = rows.map(item => {
            let data = {
                item_id: item.id,
                name: item.name,
                display_name: item.display_name,
                image_name: item.image_name,
                price: item.price,
                type: item.category,
                description: item.description || "" // descriptionがNULLなら空文字にする
            };

            if (item.lv !== null) {
                data.lv = item.lv;
                data.atk = item.atk || 0;
                data.def = item.def || 0;
                data.str = item.str || 0;
                data.dex = item.dex || 0;
                data.int = item.int || 0;
                data.luk = item.luk || 0;
                data.maxHp = item.maxHp || 0;
                data.maxMp = item.maxMp || 0;

                const sum = (item.str || 0) + (item.dex || 0) + (item.int || 0) + (item.luk || 0) + 
                            (item.atk || 0) + (item.def || 0) + 
                            Math.floor((item.maxHp || 0) / 10) + Math.floor((item.maxMp || 0) / 10);
                
                data.totalFirstStats = sum;
                data.totalALLStats = sum;
            }
            return data;
        });

        console.log(`✅ [Debug] リッチデータ取得成功: ${richData.length} 件`);
        return richData;

    } catch (err) {
        console.error("❌ [Debug] 図鑑DBエラー詳細:", err.message);
        return []; 
    }
}

async function executeSummon(socket, enemyId) {

    console.log("🛠️ [Debug] playersの中身:", typeof players, players);
    console.log("🛠️ [Debug] 取得する敵ID:", enemyId);
    
    // 💡 SUMMON_MAP を介さず、受け取ったIDをそのままチェック
    if (!enemyId || isNaN(enemyId)) {
        console.error("❌ [Debug] 有効な敵IDではありません:", enemyId);
        return;
    }

    // 💡 1. データベースから敵の能力値を一発で取得する！
    const [rows] = await pool.query("SELECT * FROM enemy_catalog WHERE enemy_id = ?", [enemyId]);
    const enemyData = rows[0]; // これで敵の全データが手に入る

    if (!enemyData) {
        console.error("モンスターデータが見つかりません:", enemyId);
        return;
    }

    // 💡 2. プレイヤーの座標などを取得
    const player = players[socket.id];
    if (!player) {
        console.error("プレイヤーデータが見つかりません:", socket.id);
        return;
    }

    // 💡 3. モンスターの配置座標と足場判定を計算
    const platIndex = getPlatIndexFromCoords(player.x, player.y);

    // 🌟 オーラの抽選処理を追加（既存の敵と同様の確率）
    const rand = Math.random();
    let assignedAura = 'none';
    if (rand < 0.15) {
        assignedAura = 'gold';   // 15%: ゴールド
    } else if (rand < 0.25) {
        assignedAura = 'red';    // 10%: レッド (15%〜25%)
    } else if (rand < 0.35) {
        assignedAura = 'blue';   // 10%: ブルー (25%〜35%)
    } else {
        assignedAura = 'none';   // 65%: なし
    }

    // 💡 4. モンスターをスポーンさせる
    const monsterObj = {
        ...enemyData,
        id: enemyData.enemy_id, // ← DBのIDをクライアントが期待する 'id' に合わせる
        alive: true,            // ← 明示的にデフォルト値を入れる
        isFading: false,        // ← 明示的にデフォルト値を入れる
        unique_id: Date.now() + Math.random(),
        x: player.x,            // プレイヤーのXと一致
        y: player.y,              // プレイヤーのY
        spawnX: player.x, 
        spawnY: player.y,
        platIndex: platIndex,   // 判定した足場Indexを反映
        currentHp: enemyData.hp,
        maxHp: enemyData.hp,
        opacity: 0,                     // 👈 最初は透明にする
        spawnAlpha: 0,
        jumpY: 0,
        jumpV: 0,
        jumpFrame: 0,
        isJustSpawned: true,
        deathFrame: 0,
        kbV: 0,
        isAttacking: 0,
        isEnraged: false,
        respawnTimer: 0,
        waitTimer: 0,
        auraType: assignedAura,  // 👈 抽選したオーラ属性を追加
		// 🌟 【超重要】クライアントが確実に画像を読み込めるように名前/アセットキーを明示する！
        // enemyData の中身（DBの列名）に合わせて調整してください（例: enemyData.name や enemyData.type など）
        name: enemyData.name || `Monster${enemyData.enemy_id}`, 
        type: enemyData.type || `monster${enemyData.enemy_id}`
    };

    // 💡 【重要】サーバー側の管理配列にモンスターを追加する（これがないと同期されません）
    if (!enemies[player.channel]) enemies[player.channel] = [];
    enemies[player.channel].push(monsterObj);
    
    // 💡 チャンネルIDを文字列の部屋名として統一（'channel_' 接頭辞を付与）
    const targetRoom = `channel_${player.channel}`; 

    // 💡 そのチャンネルの部屋にソケットを参加させる
    socket.join(targetRoom); 
    
    // 💡 その部屋（チャンネル）にいる人だけに送信！
    io.to(targetRoom).emit('spawn_monster', monsterObj);

    console.log(`🚀 [Debug] ${targetRoom} のプレイヤー全員に送信しました！ (敵ID: ${enemyId}, オーラ: ${assignedAura})`);
    console.log(`🚀 [Debug] 召喚後のチャンネル内敵数: ${enemies[player.channel].length}`);
}

// ============================================================
// :::HANDLE_LANDING::: 🔊 アイテム着地処理・位置固定・サウンド同期
// ============================================================
function handleItemLanding(it, groundY) {
    it.y = groundY - SETTINGS.ITEM.SIZE + SETTINGS.ITEM.SINK_Y;
    it.landed = true;
    it.vy = 0;
    it.vx = 0;
    io.emit('item_landed_sound');
}

// ============================================================
// :::CHECK_ATTACK::: ⚔️ 攻撃判定ボックス生成・モンスター接触判定
// ============================================================
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
// ============================================================
// :::HANDLE_JOIN::: 👤 プレイヤーログイン・データ初期化・チャンネル配置
// ============================================================
async function handleJoin(socket, name, channel) { // 🌟 async を追加
    const existingData = players[socket.id] || {};

    const currentLevel = (existingData.level !== undefined) ? existingData.level : 1;
    const correctMaxExp = (typeof LEVEL_TABLE !== 'undefined' && LEVEL_TABLE[currentLevel]) 
                          ? LEVEL_TABLE[currentLevel] 
                          : 100;

    // 🌟 【修正】すでに performLogin 等で読み込まれている atk があればそれを最優先で引き継ぐ！
    let dbAtk = 13; // デフォルト値
    if (existingData.baseAtk !== undefined && existingData.baseAtk !== null) {
        dbAtk = existingData.baseAtk;
    } else if (existingData.atk !== undefined && existingData.atk !== null) {
        dbAtk = existingData.atk;
    } else {
        // 万が一どちらもない場合のみ、データベースから安全に取得する
        try {
            if (typeof pool !== 'undefined' && pool) {
                const [rows] = await pool.query(
                    'SELECT atk FROM player_atk_table WHERE level = ?', 
                    [currentLevel]
                );
                if (rows && rows.length > 0) {
                    dbAtk = rows[0].atk;
                }
            }
        } catch (dbErr) {
            console.error('❌ データベースからの ATK 取得に失敗しました:', dbErr);
        }
    }

    // 🌟 プレイヤーデータの作成（既存の値を壊さないように引き継ぐ）
    players[socket.id] = {
        dbId: existingData.dbId || existingData.id || null,
        id: socket.id,
        name: name,
        channel: channel,
        
        // 🌟 【追加】既存データから model_id と style_id を確実に引き継ぎます
        model_id: (existingData.model_id !== undefined) ? existingData.model_id : 11,
        style_id: (existingData.style_id !== undefined) ? existingData.style_id : 1,

        x: (existingData.x !== undefined) ? existingData.x : 50,
        y: (existingData.y !== undefined) ? existingData.y : 500,
        dir: existingData.dir !== undefined ? existingData.dir : 1,

        gold: (existingData.gold !== undefined) ? existingData.gold : 0,
        score: (existingData.score !== undefined) ? existingData.score : 0,
        inventory: existingData.inventory || [],
        isAttacking: 0,
        
        level: currentLevel,
        exp: (existingData.exp !== undefined) ? existingData.exp : 0,
        maxExp: correctMaxExp,

        str: existingData.str || 50,
        dex: existingData.dex || 4,
        luk: existingData.luk || 4,
        ap: (existingData.ap !== undefined) ? existingData.ap : 0,
        
        weaponAtk: existingData.weaponAtk || 0, 
        
        // 🌟 引き継いだ正しい ATK をセット！
        atk: existingData.atk !== undefined ? existingData.atk : dbAtk,
        baseAtk: dbAtk,

        w: SETTINGS.PLAYER.DEFAULT_W * (SETTINGS.PLAYER.SCALE || 1.0),
        h: SETTINGS.PLAYER.DEFAULT_H * (SETTINGS.PLAYER.SCALE || 1.0),
        scale: SETTINGS.PLAYER.SCALE || 1.0,
        
        hp: (existingData.hp !== undefined) ? existingData.hp : 100,
        maxHp: (existingData.maxHp !== undefined) ? existingData.maxHp : 100,
        mp: (existingData.mp !== undefined) ? existingData.mp : 50,
        maxMp: (existingData.maxMp !== undefined) ? existingData.maxMp : 50,
        
        lastPickupTime: 0,
    };

    if (typeof emitPlayerUpdate === 'function') {
        emitPlayerUpdate(socket.id);
    }

    console.log(`[Join同期完了] ${name} (DB_ID: ${players[socket.id].dbId}, LV: ${currentLevel}, MODEL: ${players[socket.id].model_id}, DB_ATK: ${dbAtk}, Exp: ${players[socket.id].exp}/${players[socket.id].maxExp})`);
}

// ============================================================
// :::HANDLE_ATTACK::: ⚔️ 攻撃処理・ダメージ計算・報酬配布の心臓部
// ============================================================
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
            enemyId: nearest.unique_id,
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

	const enemyIndex = enemies[chId].indexOf(nearest); 
    
    if (enemyIndex >= 7) { 
        const fieldMonster = enemies[chId][0]; 
        console.log("=== 🔍 プロパティ比較テスト ===");
        console.log("【既存の敵】 update持ってる？:", typeof fieldMonster.update);
        console.log("【召喚獣】 update持ってる？:", typeof nearest.update);
        console.log("【既存の敵】 deathFrame:", fieldMonster.deathFrame);
        console.log("【召喚獣】 deathFrame:", nearest.deathFrame);
        console.log("===============================");
    }
	
    //nearest.alive = false;
    nearest.isFading = true; 
    nearest.hp = 0;
    nearest.deathFrame = 0;

    // 🌟 境界線の設定 (ここをそのチャンネルの「初期敵数」に合わせてください)
    // 例えば、初期配置の敵が10体なら、それより後の番号(10番目以降)はすべて召喚獣
    const FIELD_ENEMY_COUNT = 7; 

    // 現在のインデックスを取得
    const index = enemies[chId].indexOf(nearest);

    // 判定：インデックスが境界線以上なら「召喚獣」
    if (index >= FIELD_ENEMY_COUNT) {
        console.log(`[Server] 召喚獣(index:${index})を検知、2秒後に削除します`);
        
        setTimeout(() => {
            const list = enemies[chId];
            if (list) {
                const idx = list.indexOf(nearest); // 再取得して安全に削除
                if (idx !== -1) {
                    list.splice(idx, 1);
                }
            }
        }, 2000);
    } else {
        // フィールドの敵の場合：削除せず、リスポーン処理へ任せる（何もしない）
        console.log(`[Server] フィールド敵(index:${index})を検知、復活管理に委ねます`);
    }

    // --- 報酬処理（共通） ---
    const rewardExp = nearest.exp || 10; 
    socket.emit('exp_log', { amount: rewardExp }); 
    addExperience(p, rewardExp, socket);
    spawnDropItems(nearest, chId);
	
	// 🌟 【ここに追加！】モンスターカードのドロップ判定
    spawnMonsterCardDrop(nearest, chId);
	
    p.score = (Number(p.score) || 0) + 100;
}
    }
}

// ============================================================
// :::HANDLE_PICKUP::: 📦 アイテム収集・スタック処理・DB永続化（ID＆カラム名 完全自動適応版）
// ============================================================
async function handlePickup(socket) {
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

        for (const item of candidates) {
            const isMonsterCard = item.type && (
                item.type.toLowerCase().startsWith('monster') || 
                item.isCard === true
            );

            if (isMonsterCard) {
                targetItem = item;
                break;
            }

            const isInventoryItem = inventoryTypes.has(item.type);

            if (isInventoryItem) {
                if (!player.inventory) player.inventory = Array(50).fill(null);

                let canPickupThis = false;
                const category = itemCategories[item.type];

                if (category === 'ETC' || category === 'USE') {
                    const stackIndex = player.inventory.findIndex(slot => slot && slot.type === item.type);
                    if (stackIndex !== -1) canPickupThis = true;
                }

                if (!canPickupThis) {
                    const emptySlotIndex = player.inventory.findIndex(slot => 
                        slot === null || slot === undefined || (typeof slot === 'object' && Object.keys(slot).length === 0)
                    );
                    if (emptySlotIndex !== -1) canPickupThis = true;
                }

                if (canPickupThis) {
                    targetItem = item;
                    break;
                }
            } else {
                targetItem = item;
                break;
            }
        }

        if (!targetItem) {
            if (!player.lastBagWarningTime || (now - player.lastBagWarningTime > 3000)) {
                player.lastBagWarningTime = now;
                console.log(`[DEBUG] バッグがいっぱいで拾えません (${player.name || socket.id})`);
                socket.emit('chat', {
                    id: 'SYSTEM_LOG',
                    name: '⚠️ 警告',
                    text: `[${new Date().toLocaleTimeString('ja-JP', { timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit' })}] バッグがいっぱいで拾えません！`
                });
            }
            return;
        }

        targetItem.isPickedUp = true;
        player.lastPickupTime = now;

        const idx = currentItems.findIndex(it => it.id === targetItem.id);
        if (idx !== -1) {
            const removedItem = currentItems.splice(idx, 1)[0];
            if (!removedItem) return;

            // ============================================================
            // 🌟 モンスターカード専用の処理（完全防御型セーフガード）
            // ============================================================
            const isMonsterCard = removedItem.type && (
                removedItem.type.toLowerCase().startsWith('monster') || 
                removedItem.isCard === true
            );

            if (isMonsterCard) {
                // 🌟 プレイヤーが持っていそうなIDプロパティを総当たりで探索して特定する（undefined対策）
                const dbUserId = player.db_id || player.userId || player.id_in_db || (typeof player.id === 'number' ? player.id : 39);

                // 🌟 【自動復元セーフガード】
                if (!player.cardCollection || typeof player.cardCollection !== 'object' || Object.keys(player.cardCollection).length === 0) {
                    console.log(`⚠️ [Card Guard] プレイヤー ${player.name || socket.id} (DB_ID: ${dbUserId}) の cardCollection が消失しているため、DBから再ロードします。`);
                    player.cardCollection = {};
                    try {
                        // 🌟 カラム名エラーを絶対に起こさないよう 'SELECT *' で全取得し、JS側で柔軟にマッピングする
                        const [rows] = await pool.query(
                            'SELECT * FROM player_monster_cards WHERE user_id = ?',
                            [dbUserId]
                        );
                        for (const row of rows) {
                            // どんなカラム名で保存されていても対応できるようにフォールバック
                            const mKey = row.monster_key || row.monster_name || row.monster_id || row.monster;
                            const rank = row.card_rank || row.rank;

                            if (!mKey || !rank) continue;

                            if (!player.cardCollection[mKey]) {
                                player.cardCollection[mKey] = {};
                            }
                            player.cardCollection[mKey][rank] = {
                                count: row.count || 1,
                                unlocked: Boolean(row.unlocked !== undefined ? row.unlocked : true),
                                firstAcquiredTime: row.first_acquired_time || row.created_at || Date.now()
                            };
                        }
                        console.log(`✨ [Card Guard] DBからの動的再ロード完了: 取得レコード数: ${rows.length}`);
                    } catch (err) {
                        console.error("❌ カード自動復元DBエラー:", err);
                    }
                }

                const monsterKey = removedItem.monsterKey || removedItem.type.toLowerCase();

                // 🌟 1〜6のランクを等確率で決定
                const cardRank = removedItem.cardRank || (Math.floor(Math.random() * 6) + 1);
                
                const rankNames = { 1: 'ブロンズ', 2: 'シルバー', 3: 'ゴールド', 4: 'プラチナ', 5: 'ダイヤモンド', 6: '虹' };
                const rankName = rankNames[cardRank];

                if (!player.cardCollection[monsterKey]) {
                    player.cardCollection[monsterKey] = {};
                }
                if (!player.cardCollection[monsterKey][cardRank]) {
                    player.cardCollection[monsterKey][cardRank] = {
                        count: 0,
                        unlocked: true,
                        firstAcquiredTime: Date.now()
                    };
                }
                player.cardCollection[monsterKey][cardRank].count = (player.cardCollection[monsterKey][cardRank].count || 0) + 1;
                player.cardCollection[monsterKey][cardRank].unlocked = true;
                
                // データベースへ保存する処理
                if (typeof saveMonsterCardToDB === 'function') {
                    await saveMonsterCardToDB(player, monsterKey, cardRank);
                } else {
                    const nowTime = Date.now();
                    await pool.query(`
                        INSERT INTO player_monster_cards 
                        (user_id, monster_key, card_rank, count, unlocked, first_acquired_time, last_acquired_time) 
                        VALUES (?, ?, ?, 1, 1, ?, ?)
                        ON DUPLICATE KEY UPDATE 
                        count = count + 1, 
                        last_acquired_time = VALUES(last_acquired_time)
                    `, [dbUserId, monsterKey, cardRank, nowTime, nowTime]).catch(err => {
                        console.error("❌ カードDB保存エラー:", err);
                    });
                }

                const totalRankCount = player.cardCollection[monsterKey][cardRank].count;
                console.log(`[Card Pickup] 🃏 ${player.name || socket.id} が ${monsterKey} の 【${rankName}】 を取得！ (当該ランク所持数: ${totalRankCount})`);

                if (typeof lastPickedItems !== 'undefined') {
                    lastPickedItems.push({
                        type: removedItem.type,
                        x: (removedItem.x && removedItem.x !== 0) ? removedItem.x : player.x,
                        y: (removedItem.y && removedItem.y !== 0) ? removedItem.y : player.y,
                        pickerId: socket.id,
                        totalALLStats: removedItem.totalALLStats || 0,
                        totalFirstStats: removedItem.totalFirstStats || 0,
                        ch: chId,
                        // 🌟 【ここを追加】ここでカードのランクとIDをエフェクト側に引き渡す！
                        cardRank: cardRank,
                        cardId: removedItem.cardId || true
                    });
                }

                socket.emit('play_item_sound');
                socket.emit('card_collection_update', player.cardCollection);
                socket.emit('chat', {
                    id: 'SYSTEM_LOG',
                    name: '🃏 図鑑',
                    text: `[${new Date().toLocaleTimeString('ja-JP', { timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit' })}] ${removedItem.name || 'モンスターカード'} [${rankName}] をMonster Bookに登録しました！（累計: ${totalRankCount}枚）`
                });
				
				// 🌟 【新規追加】画面上のフローティングログ等で使える専用ログイベントを送信
                socket.emit('card_pickup_log', {
                    monsterName: removedItem.name || 'モンスターカード',
                    rankName: rankName,
                    cardRank: cardRank,
                    count: totalRankCount
                });

                if (typeof sendState === 'function') sendState();
                return;
            }
            // ============================================================

            // 金額・メダルの処理
            if (removedItem.type === 'medal1' || removedItem.goldValue) {
                const baseAmount = removedItem.goldValue || 10;
                let amount;

                if (removedItem.isPlayerDrop) {
                    amount = baseAmount;
                } else {
                    amount = Math.floor(baseAmount * (0.8 + Math.random() * 0.4));
                }

                player.gold = (player.gold || 0) + amount;
                socket.emit('gold_log', { amount: amount });
                io.to(`channel_${chId}`).emit('player_update', player);
            }

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

            const isInventoryItem = inventoryTypes.has(removedItem.type);
            if (isInventoryItem) {
                let stacked = false;
                const actualCount = removedItem.count || removedItem.amount || 1;
                
                const reqItemId = String(removedItem.itemId || removedItem.item_id || removedItem.type);
                let correctName = SERVER_ITEM_NAMES[removedItem.type] || removedItem.name || 'アイテム';
                let correctPrice = removedItem.price || 10;

                try {
                    let [rows] = await pool.query('SELECT price, name, display_name FROM item_consume_catalog WHERE item_id = ? OR name = ?', [reqItemId, removedItem.type]);
                    if (rows.length === 0) {
                        [rows] = await pool.query('SELECT price, name, display_name FROM item_etc_catalog WHERE item_id = ? OR name = ?', [reqItemId, removedItem.type]);
                    }
                    if (rows.length === 0) {
                        [rows] = await pool.query('SELECT price, name, display_name FROM item_equip_catalog WHERE item_id = ? OR name = ? OR category = ?', [reqItemId, removedItem.type, removedItem.type]);
                    }

                    if (rows.length > 0) {
                        correctPrice = rows[0].price !== undefined ? rows[0].price : correctPrice;
                        correctName = rows[0].display_name || rows[0].name || correctName;
                    }
                } catch (dbErr) {
                    console.error("⚠️ カタログからの価格・名称取得エラー:", dbErr);
                }

                const category = itemCategories[removedItem.type];
                if (category === 'ETC' || category === 'USE') {
                    const stackIndex = player.inventory.findIndex(slot => slot && slot.type === removedItem.type);
                    if (stackIndex !== -1) {
                        player.inventory[stackIndex].count = (player.inventory[stackIndex].count || 0) + actualCount;
                        stacked = true;
                        
                        player.inventory[stackIndex].price = correctPrice;
                        player.inventory[stackIndex].display_name = correctName;

                        saveInventoryToDB(player, player.inventory[stackIndex], stackIndex);
                        socket.emit('item_pickup_log', { amount: actualCount, itemName: correctName });
                    }
                }

                if (!stacked) {
                    let emptySlotIndex = player.inventory.findIndex(slot => 
                        slot === null || slot === undefined || (typeof slot === 'object' && Object.keys(slot).length === 0)
                    );

                    if (emptySlotIndex !== -1) {
                        player.inventory[emptySlotIndex] = { 
                            ...removedItem,
                            item_id: reqItemId, 
                            instanceId: removedItem.instanceId || null,
                            type: removedItem.type,          
                            name: removedItem.type,          
                            display_name: correctName,      
                            price: correctPrice,            
                            count: actualCount,
                            atk: (removedItem.atk !== undefined) ? removedItem.atk : ((removedItem.type === 'sword') ? 10 : 0), 
                            def: (removedItem.def !== undefined) ? removedItem.def : ((removedItem.type === 'shield') ? 5 : 0)
                        };

                        saveInventoryToDB(player, player.inventory[emptySlotIndex], emptySlotIndex);
                        socket.emit('item_pickup_log', { amount: actualCount, itemName: correctName });

                        if (emptySlotIndex >= 10) {
                            console.log(`[DEBUG] ${correctName} がバッグ（スロット ${emptySlotIndex}）に移動しました！`);
                            socket.emit('chat', {
                                id: 'SYSTEM_LOG',
                                name: '📦 バッグ',
                                text: `[${new Date().toLocaleTimeString('ja-JP', { timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit' })}] ${correctName} をバッグに移動しました！`
                            });
                        }
                    }
                }
            } else if (!(removedItem.type === 'medal1' || removedItem.goldValue)) {
                player.score = (player.score || 0) + (removedItem.type === 'money3' ? 100 : 10);
            }

            socket.emit('inventory_update', player.inventory);
            if (typeof sendState === 'function') sendState();
        }
    } catch (error) {
        console.error("❌ handlePickup Error:", error);
    }
}

// 🃏 カードの取得・所持数をデータベースに保存（UPSERT）する関数（ランク対応版）
async function saveMonsterCardToDB(playerOrUserId, monsterKey, cardRank) {
    try {
        let userId = null;

        if (typeof playerOrUserId === 'object' && playerOrUserId !== null) {
            userId = playerOrUserId.dbId || playerOrUserId.db_id;
        } else if (typeof playerOrUserId === 'number') {
            userId = playerOrUserId;
        } else if (typeof playerOrUserId === 'string') {
            if (/^\d+$/.test(playerOrUserId)) {
                userId = parseInt(playerOrUserId, 10);
            } else if (typeof players !== 'undefined' && players[playerOrUserId]) {
                const p = players[playerOrUserId];
                userId = p.dbId || p.db_id;
            }
        }

        if (!userId && typeof players !== 'undefined') {
            for (const socketId in players) {
                const p = players[socketId];
                if (socketId === playerOrUserId || p.id === playerOrUserId) {
                    userId = p.dbId || p.db_id;
                    break;
                }
            }
        }

        if (!userId || typeof userId !== 'number' || isNaN(userId)) {
            console.error("❌ カードDB保存エラー: 有効な数値のuser_idを特定できませんでした。渡された値:", playerOrUserId);
            return;
        }

        const now = Date.now();
        
        // 🌟 card_rank を含めて INSERT / UPDATE するクエリ
        const query = `
            INSERT INTO player_monster_cards 
            (user_id, monster_id, card_rank, count, unlocked, first_acquired_time, last_acquired_time) 
            VALUES (?, ?, ?, 1, 1, ?, ?)
            ON DUPLICATE KEY UPDATE 
            count = count + 1, 
            last_acquired_time = VALUES(last_acquired_time)
        `;
        
        await pool.query(query, [userId, monsterKey, cardRank, now, now]);
        console.log(`[DB] ユーザー ${userId} のカード (${monsterKey} / ランク:${cardRank}) をデータベースに保存/更新しました。`);
    } catch (error) {
        console.error("❌ カードのDB保存エラー:", error);
    }
}

// 📦 プレイヤーデータのロード処理内
async function loadPlayerCardCollection(player, dbUserId) {
    try {
        // 1. DBから該当ユーザーのカード一覧を一括取得
        const [rows] = await pool.query(
            `SELECT monster_id, card_rank, count, unlocked, first_acquired_time, last_acquired_time 
             FROM player_monster_cards 
             WHERE user_id = ?`,
            [dbUserId]
        );

        // 2. メモリ用の構造に再構築
        player.cardCollection = {};

        for (const row of rows) {
            const monsterKey = row.monster_id;
            const rank = row.card_rank;

            if (!player.cardCollection[monsterKey]) {
                player.cardCollection[monsterKey] = {};
            }

            player.cardCollection[monsterKey][rank] = {
                count: row.count,
                unlocked: Boolean(row.unlocked),
                firstAcquiredTime: row.first_acquired_time,
                lastAcquiredTime: row.last_acquired_time
            };
        }

        console.log(`[Card Load] ユーザー ID:${dbUserId} のカード図鑑をロードしました（種類数: ${Object.keys(player.cardCollection).length}）`);
    } catch (error) {
        console.error("❌ カード図鑑のロードエラー:", error);
        player.cardCollection = {};
    }
}

// ============================================================
// :::SAVE_INV::: 💾 インベントリDB永続化・ID紐付け・装備品管理
// ============================================================
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
    if (type === 'sword' || type === 'shield') {
        
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

        // 🌟 【修正箇所】「剣」「盾」ではなく正式なカタログ名称を決定して保存する
        let resolvedName = itemData.name;
        let resolvedDisplayName = itemData.displayName;

        if (dbItemId === '101' || type === 'sword') {
            resolvedName = "sword";
            resolvedDisplayName = "マニアックソード";
        } else if (dbItemId === '102' || type === 'shield') {
            resolvedName = "shield";
            resolvedDisplayName = "トリシールド";
        } else {
            resolvedName = itemData.name || type;
            resolvedDisplayName = itemData.displayName || itemData.name || (type === 'sword' ? "マニアックソード" : (type === 'shield' ? "トリシールド" : "アイテム"));
        }

        const eqSql = `INSERT INTO equipment_instances (
            player_id, item_id, name, display_name, image_name, 
            category, atk, matk, def, str, 
            dex, \`int\`, luk, maxHp, maxMp, 
            totalFirstStats, totalALLStats
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        const eqParams = [
            Number(userId),                                    // player_id
            String(dbItemId),                                  // 🌟 修正した item_id (101 or 102)
            String(resolvedName),                              // 🌟 正しいシステム名 ("sword" or "shield")
            String(resolvedDisplayName),                       // 🌟 正しい表示名 ("マニアックソード" or "トリシールド")
            String(itemData.imageName || type),                // image_name
            type,                                              // category
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
		
		console.log("📝 【INSERT直前パラメータ確認】", {
            item_id: dbItemId,
            name: resolvedName,
            display_name: resolvedDisplayName,
            category: type,
            def: eqParams[8]
        });

        console.log(`[SAVE_TRACE:3] equipment_instancesへのpool.query実行直前 - ItemID: ${dbItemId}`);

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

// ============================================================
// :::LOAD_INV::: 📜 インベントリ・装備データ読み込み・ステータス復元
// ============================================================
async function loadUserInventory(userId) {
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
        const [rows] = await pool.query(sql, [userId]);

        // 🌟 1行ずつDBからカタログ情報を引くため Promise.all に変更
        const inventory = await Promise.all(rows.map(async (row) => {
            const itemId = row.item_id;

            // 🌟 1. 各カタログテーブルから display_name と price を検索
            let resolvedDisplayName = row.display_name || null;
            let resolvedPrice = 0;

            if (itemId) {
                const [consumeRows] = await pool.query('SELECT display_name, price FROM item_consume_catalog WHERE item_id = ?', [itemId]);
                const [etcRows]     = await pool.query('SELECT display_name, price FROM item_etc_catalog WHERE item_id = ?', [itemId]);
                const [equipRows]   = await pool.query('SELECT display_name, price FROM item_equip_catalog WHERE item_id = ?', [itemId]);

                const catalogData = consumeRows[0] || etcRows[0] || equipRows[0];
                if (catalogData) {
                    resolvedDisplayName = resolvedDisplayName || catalogData.display_name;
                    resolvedPrice = catalogData.price || 0;
                }
            }

            const item = {
                slot_index: row.slot_index,
                type: row.item_type,
                id: row.item_id,
                db_id: row.db_slot_id,
                count: row.quantity,
                isEquipped: row.is_equipped === 1,
                instanceId: row.equipment_id,
                displayName: resolvedDisplayName || row.item_type, // 🌟 DBから引いた display_name
                price: resolvedPrice                               // 🌟 DBから引いた price
            };

            // 装備品（equipment_idがある場合）はステータスも付与
            if (row.equipment_id) {
                item.name = row.name;
                // 装備品固有の display_name がある場合はそちらを優先
                if (row.display_name) {
                    item.displayName = row.display_name;
                }
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

                item.lv = row.lv || 0;

                item.totalFirstStats = row.totalFirstStats;
                item.totalALLStats = row.totalALLStats;
            }

            return item;
        }));

        return inventory;

    } catch (err) {
        console.error(`\n❌ [LOAD_DEBUG: FATAL ERROR] インベントリ読み込みに失敗しました`);
        console.error(`エラー詳細: ${err.message}`);
        if (err.sqlState) console.error(`SQLの状態: ${err.sqlState}`);
        console.error(`==========================================================\n`);
        return [];
    }
}

// 📦 グローバル変数として定義
let itemCatalogMap = new Map(); // アイテム名やIDからカタログ情報を一発で引くためのマップ
let itemNameToIdMap = new Map(); // 名前からIDを引くマップ

// startServer 内、またはカタログロード処理内
async function loadFullItemCatalogs() {
    const [consumeRows] = await pool.query("SELECT item_id, name, display_name, image_name, price FROM item_consume_catalog");
    const [equipRows] = await pool.query("SELECT item_id, name, display_name, image_name, price FROM item_equip_catalog");
    const [etcRows] = await pool.query("SELECT item_id, name, display_name, image_name, price FROM item_etc_catalog");

    itemCatalogMap.clear();
    itemNameToIdMap.clear();

    const allItems = [...consumeRows, ...equipRows, ...etcRows];

    allItems.forEach(item => {
        // 名前とIDの双方で引き出せるようにマップに登録
        itemCatalogMap.set(String(item.name), item);
        itemCatalogMap.set(String(item.item_id), item);
        
        itemNameToIdMap.set(item.name, String(item.item_id));
    });

    console.log(`✅ フルアイテムカタログマップの構築完了: ${itemCatalogMap.size} エントリ`);
}

// ============================================================
// :::UPSERT_INV::: 💾 インベントリDB同期・ID変換ルール・永続化
// ============================================================
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

    // 🌟 DB連携：起動時にロードしたマップからアイテム名（type）に対応するIDを自動取得
    let finalItemId = null;
    if (typeof itemNameToIdMap !== 'undefined' && itemNameToIdMap.has(itemData.type)) {
        finalItemId = itemNameToIdMap.get(itemData.type);
    } else {
        // マップに無い場合のフォールバック（既存のIDやtypeを使用）
        finalItemId = String(itemData.itemId || itemData.item_id || itemData.id || itemData.type);
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

// ============================================================
// :::HANDLE_DAMAGED::: 🛡️ 被ダメージ判定・HP計算・死亡処理
// ============================================================
function handlePlayerDamaged(socket, data) {
    // 🛡️ 安全装置：関数全体をtry-catchで保護
    try {
        const p = players[socket.id];
        if (!p) return;
		
		// 🌟 ここに追加！【ゴッドモード判定】
        if (p.isInvincible) {
            console.log(`[Admin] ${p.name} は無敵なのでダメージを無視しました`);
            return; // 以下の処理を全てスキップ
        }
        
        // 🛡️ 死亡時はダメージ計算をスキップ
        if (p.hp <= 0) return;

        // 🌟 新機能：ダメージクールダウン (0.5秒間は重複ダメージを無視)
        const now = Date.now();
        const COOLDOWN_MS = 500; 
        if (p.lastDamageTime && (now - p.lastDamageTime) < COOLDOWN_MS) {
            // クールダウン中のため、今回はダメージを与えない
            return; 
        }
        // ダメージを与えたので時刻を更新
        p.lastDamageTime = now;

        // 🌟 プレイヤーの所属チャンネルを取得
        const chId = p.channel || 1;
        // 🌟 そのチャンネルの敵リストを特定
        const currentEnemies = enemies[chId] || [];

        // 🌟 修正：全体の enemies ではなく currentEnemies から探す
        let attacker = currentEnemies.find(en => en.id === data.monsterId);
        
        // もし ID で見つからなければ、近くにいる「生きている敵」を一人探す
        if (!attacker) {
            attacker = currentEnemies.find(en => en.alive && Math.abs(en.x - p.x) < 150);
        }
        
        // カタログの atk (50など) を優先し、なければ 10 にする
        const damageValue = attacker ? (attacker.atk || 5) : 10;
        
		// 2026-8-5停止
        //debugChat(`[ダメージ判定] ch:${chId} 攻撃者: ${attacker ? attacker.type : '不明'}, ダメージ: ${damageValue}`, 'error');

        // 🛡️ 数値のガード：HPが万が一 NaN(非数) にならないよう Number() で保証
        const currentHp = Number(p.hp) || 100;
        p.hp = Math.max(0, currentHp - damageValue);

        // 死亡時の処理
        if (p.hp <= 0) {
            console.log(`[DEATH] ${p.name} が倒れました。`);

            // 🌟 【DB連動】死亡した瞬間に経験値を5%減らす
            const EXP_LOSS_PERCENT = 5; // 減らす割合（5%）
            const userId = p.dbId || p.db_id;

            if (typeof p.exp === 'number' && p.exp > 0) {
                const loss = Math.floor(p.exp * (EXP_LOSS_PERCENT / 100));
                p.exp = Math.max(0, p.exp - loss);
                console.log(`[DEATH] 経験値ペナルティ適用: -${loss} (残りEXP: ${p.exp})`);

                // player_stats テーブルの exp をデータベース側でも更新する
                if (userId) {
                    (async () => {
                        try {
                            await pool.query(
                                'UPDATE player_stats SET exp = ? WHERE user_id = ?',
                                [p.exp, userId]
                            );
                            console.log(`[Database] user_id ${userId} の死亡ペナルティEXPを保存しました。`);
                        } catch (dbErr) {
                            console.error("❌ 経験値ペナルティのDB保存エラー:", dbErr);
                        }
                    })();
                }
            }

            // 死亡した瞬間にクライアントへ通知を送り、playDieSound() を発動させる
            socket.emit('player_die_sound');

            // 復活ダイアログの表示を指示する
            socket.emit('show_death_dialog', { 
                message: "力尽きました... 復活しますか？" 
            });

            // 死亡状態になったことを周囲に同期するため、状態更新は実行する
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

// ============================================================
// :::HANDLE_CHAT::: 💬 チャンネル限定メッセージ・対話処理
// ============================================================
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

// ============================================================
// :::CHECK_LANDING::: 📐 アイテムと足場の着地判定ロジック
// ============================================================
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

// ============================================================
// :::BROADCAST_COUNTS::: 📊 チャンネル別人数集計・全ユーザー放送
// ============================================================
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


// ============================================================
// :::SEND_STATE::: 📡 チャンネル別状態同期・世界状況の配信
// ============================================================
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
                    // 🌟 元のデータをコピーしつつ、model_id と style_id が絶対に undefined にならないようガード！
                    roomPlayers[id] = {
                        ...players[id],
                        model_id: players[id].model_id !== undefined ? players[id].model_id : 6, // ← 抜け落ちていたら 11 などを維持
                        style_id: players[id].style_id !== undefined ? players[id].style_id : 1
                    };
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

// ============================================================
// :::UPDATE_ENEMIES::: 👾 全チャンネルの敵AI更新・当たり判定・同期
// ============================================================
function updateEnemies() {
    // 1. まず全チャンネル(1〜5)を順番にループする
    CHANNELS.forEach(chId => {
        const currentEnemies = enemies[chId];
        
        // 🛡️ ガード：そのチャンネルのデータがなければスキップ
        if (!currentEnemies || !Array.isArray(currentEnemies)) return;

        // 2. そのチャンネル内のモンスター配列をループする
        currentEnemies.forEach((e, index) => {
            try {
                // 🌟 【修正】メソッド移植パッチ（位置保護版）
                // :::UPDATE_ENEMIES::: 内のパッチ処理
if (e && typeof e.update !== 'function') {
    const template = currentEnemies[0]; 
    if (template) {
        // 1. プロトタイプ継承
        Object.setPrototypeOf(e, Object.getPrototypeOf(template));
        
        // 2. 🌟 座標と足場情報を一時保存
        // 💡 ポイント：undefinedなら0ではなく元の値を維持する処理に変更
        const savedX = (e.x !== undefined) ? e.x : 0;
        const savedY = (e.y !== undefined) ? e.y : 0;
        const savedPlat = e.platIndex;
        const savedOffset = (e.offset !== undefined) ? e.offset : 0;

        // 3. 機能を初期化（ここで reset が呼ばれる）
        if (typeof e.reset === 'function') {
            e.isPatching = true;
            e.reset();
            delete e.isPatching;
        }
        
        // 4. 🌟 座標と足場情報を復元
        // 💡 ポイント：無理やり上書きして、さらにoffsetを再計算させる
        e.x = savedX;
        e.y = savedY;
        e.platIndex = savedPlat;
        e.offset = savedOffset;

        // 🌟 【最重要】もし足場があるなら、offsetを再計算して強制的に合わせる！
        if (e.platIndex !== null && typeof MAP_DATA !== 'undefined' && MAP_DATA.platforms[e.platIndex]) {
            const p = MAP_DATA.platforms[e.platIndex];
            // プレイヤーのXが p.x + offset になるように逆算
            // もしxが0なら、足場の左端にしておく
            if (e.x === 0) e.x = p.x; 
            e.offset = e.x - p.x;
        }

        console.log(`[Patch] 召喚獣(ID:${e.id})を能力継承・位置復元しました: x=${e.x}, y=${e.y}, offset=${e.offset}`);
    }
}

                // 🛡️ ガード：データ破損チェック
                if (!e || typeof e.update !== 'function') return;

                // 🌟 【追加】召喚直後の位置保護（1フレームのみ物理演算をスキップ）
                if (e.isJustSpawned) {
                    e.isJustSpawned = false; // フラグを解除
                    return; // 物理処理（update）をスキップして終了
                }

                e.update(); // 動きの計算（ここで handleDeathAndRespawn が呼ばれ deathFrame が進む）

                // ダメージ点滅タイマー
                if (e.damageTimer > 0) e.damageTimer--;

                // --- 🌟 攻撃アニメーションと判定の管理 ---
                if (e.isAttacking > 0) {
                    e.isAttacking--;

                    // ⚔️ 振り下ろし判定
                    if (e.isAttacking <= 15 && e.isAttacking >= 8) {
                        e.isAttackingHitFrame = true;
                    } else {
                        e.isAttackingHitFrame = false;
                    }
                } else {
                    e.isAttackingHitFrame = false;
                    if (e.isEnraged) {
                        if (Math.random() < 0.01) e.isAttacking = 22;
                    }
                }

                // --- 🌟 プレイヤーへのダメージ判定処理 ---
                checkMonsterHitsPlayers(e, chId);

            } catch (err) {
                console.error(`[ENEMY ERROR] ch:${chId}, index:${index}, ID:${e.id}`, err);
            }
        });

        // 3. 🌟 重要：そのチャンネル（Room）にいるプレイヤーだけに、そのchの敵データを送る
        io.to(`channel_${chId}`).emit('update_enemies', currentEnemies);
    });
}

// ============================================================
// :::CHECK_HIT::: ⚔️ モンスターの当たり判定・プレイヤー被弾計算
// ============================================================
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

// ============================================================
// :::IS_OVERLAP::: 📐 汎用：四角形の衝突判定（当たり判定の礎）
// ============================================================
function isRectOverlapping(x1, y1, w1, h1, x2, y2, w2, h2) {
    return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
}

// ============================================================
// :::UPDATE_PLAYERS::: 👤 プレイヤー行動タイマー・同期フレーム更新
// ============================================================
function updatePlayers() {
    for (let id in players) {
        const p = players[id];
		
		// 🌟 関数で現在の足場を判定
        const currentPlat = getPlatIndexFromCoords(p.x, p.y);
        
        // 前回の判定結果と比較して、変わった時だけログを出す
        if (p.prevPlat !== currentPlat) {
            const label = currentPlat === null ? "地面(null)" : `足場${currentPlat + 1} (index:${currentPlat})`;
            // 2026-8-5停止
			//console.log(`[DEBUG_MY_POS] プレイヤー ${p.name} | 現在の高さ:${label} | X:${p.x} Y:${p.y}`);
            
			// 2026-8-22停止
			//LOG.SYS(`プレイヤー ${p.name} が ${label} に移動しました (X:${p.x} Y:${p.y})`);
			
			// 2. 🌟 チャットへの通知（追加！）
			// そのチャンネルにいる全員に「誰がどこに移動したか」を通知します
			io.to(`channel_${p.channel}`).emit('chat_message', {
				sender: "SYSTEM",
				text: `${p.name}さんが ${label} に移動しました。`
			});
			p.prevPlat = currentPlat; 
        }

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

// ============================================================
// :::UPDATE_ITEMS::: 💎 全チャンネルのアイテム物理・着地同期
// ============================================================
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

// ============================================================
// :::GET_JST::: 🕒 日本時間生成・時の基点管理
// ============================================================
function getJSTDate() {
    const now = new Date();
    // 日本時間に変換したDateオブジェクトを返す
    return new Date(now.getTime() + (9 * 60 * 60 * 1000));
}

// ============================================================
// :::EMIT_PLAYER_LIST::: 👤 全プレイヤーリストの集計・共有放送
// ============================================================
function emitPlayerList() {
    const playerList = Object.values(players).map(p => ({
        id: p.id || socket.id, // プレイヤー識別用IDがあればあると便利
        name: p.name || 'Player',
        channel: p.channel || 1,
        level: p.level || 1,
        model_id: p.model_id || 1,   // 🌟 p.group ではなく正しい model_id を渡す
        popularity: p.popularity || 0,
        guild: p.guild || "無所属",
        inventory: p.inventory || [] // 🌟 ここでインベントリ（装備・所持品）を必ず含める！
    }));
    io.emit('updatePlayerList', playerList);
}

// ============================================================
// :::MAIN_LOOP::: 🔄 ゲームサーバー心臓部・状態更新・デバッグ同期
// ============================================================
setInterval(() => {
    
    // --- 1. ゲーム状態の更新処理 ---
    updateEnemies();   // 👾 敵の状態更新
    updatePlayers();   // 👤 プレイヤーのタイマー管理
    updateItems();     // 💎 落ちているアイテムの物理計算
    
    // 📡 全クライアントへ最新状態を送信
    sendState();

    // --- 2. デバッグ情報の送信処理（旧 setInterval からの統合） ---
    // どの名前でアイテムが管理されていても捕まえられるようにします
	/*
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
	*/

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