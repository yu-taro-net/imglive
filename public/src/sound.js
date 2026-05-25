console.log("📢 sound.js が読み込まれました！");
// ==========================================
// 1. Web Audio API の初期設定
// ==========================================
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// 音源バッファをまとめて管理するオブジェクト
const soundBuffers = {
    drop: null,
    item: null,
    jump: null,
    monster1Die: null, // monster1の死亡音
    monster2Die: null, // monster2の死亡音
    monster3Die: null, // monster3の死亡音（旧ボス音）
    enemyHit: null,
    bgm: null
};

// ============================================================
// :::LOAD_AUDIO_FILE::: 🎵 オーディオファイル取得・デコード管理
// ============================================================
/**
 * 役割：
 * - ネットワーク通信：fetch によるバイナリデータ（ArrayBuffer）の取得
 * - データ変換：Web Audio API (decodeAudioData) を用いたデコード処理
 * - 安全性：try-catch によるエラー捕捉と、失敗時に null を返すことでメイン処理のクラッシュを防止
 */
async function loadAudioFile(url) {
    try {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        return await audioCtx.decodeAudioData(arrayBuffer);
    } catch (e) {
        console.error(`❌ 音源ロード失敗 (${url}):`, e);
        return null;
    }
}

// ============================================================
// :::SETUP_AUDIO::: 🎵 音源ライブラリの初期化と一括ロード
// ============================================================
/**
 * 役割：
 * - パイプライン構築：全音源ロードタスクをマップ化
 * - 効率化：非同期ロードを並列的に実行し、`soundBuffers` に安全に格納
 * - 完了通知：ロード完了時にログを出力し、ゲームの音響準備が整ったことをシステムへ伝達
 */
async function setupAudio() {
    // 並列でロードを開始（awaitを一括で待つことで高速化）
    const tasks = {
        invite:         loadAudioFile('../sound_assets/Invite.mp3'),
        die:            loadAudioFile('../sound_assets/Tombstone.mp3'),
        mouseover1:     loadAudioFile('../sound_assets/BtMouseOver.mp3'),
        mouseclick:     loadAudioFile('../sound_assets/BtMouseClick.mp3'),
        tab:            loadAudioFile('../sound_assets/Tab.mp3'),
        menuup:         loadAudioFile('../sound_assets/MenuUp.mp3'),
        menudown:       loadAudioFile('../sound_assets/MenuDown.mp3'),
		levelup:        loadAudioFile('../sound_assets/LevelUp.mp3'),
        hover:          loadAudioFile('../sound_assets/DragStart.mp3'),
        drop:           loadAudioFile('../sound_assets/DragEnd.mp3'),
        item:           loadAudioFile('../sound_assets/PickUpItem.mp3'),
        jump:           loadAudioFile('../sound_assets/Jump.mp3'),
		enemyHit:       loadAudioFile('../sound_assets/Damage.mp3'),
        // 🌟 ここでそれぞれのモンスターに合わせた音を指定してください
        monster1Die:    loadAudioFile('../sound_assets/monster1_die.mp3'),      // 普通の音
        monster2Die:    loadAudioFile('../sound_assets/monster1_die.mp3'),      // monster2も同じで良ければ同じファイル
        monster3Die:    loadAudioFile('../sound_assets/monster1_die.mp3'),  // ボス用の豪華な音
        bgm:            loadAudioFile('../sound_assets/Floral_Life.mp3')
    };

    // すべての結果を soundBuffers に格納
    for (const key in tasks) {
        soundBuffers[key] = await tasks[key];
    }

    console.log("✅ 全ての音源ロード完了", soundBuffers);
}

setupAudio();

// ============================================================
// :::UNLOCK_AUDIO::: 🔊 ブラウザ自動再生ポリシーの解除と音響復帰
// ============================================================
/**
 * 役割：
 * - 状態診断：AudioContext の状態が 'suspended' かを判定
 * - 自動再生回避：ユーザーの操作(クリック/キー入力)をトリガーに resume() を実行
 * - ライフサイクル管理：成功後にイベントリスナーを自ら削除し、メモリとCPUの無駄なチェックを防止
 */
const unlockAudio = () => {
    // もしオーディオが止まっていたら再開させる
    if (audioCtx.state === 'suspended') {
        audioCtx.resume().then(() => {
			//playBGM(); // 🌟 ロック解除と同時にBGMスタート！
            console.log("🔊 オーディオが有効化されました (現在の状態: " + audioCtx.state + ")");
        });
    }
    
    // 一度解除されたら、もうこのチェックは不要なので削除する
    window.removeEventListener('click', unlockAudio);
    window.removeEventListener('keydown', unlockAudio);
    window.removeEventListener('mousedown', unlockAudio);
};

// 「クリック」「キーを押した時」「マウスを押した時」のどれでも解除されるようにする
window.addEventListener('click', unlockAudio);
window.addEventListener('keydown', unlockAudio);
window.addEventListener('mousedown', unlockAudio);

// ============================================================
// :::PLAY_EFFECT::: 🔊 効果音の再生管理関数
// ============================================================
/**
 * 役割：
 * - 柔軟な再生制御：受け取ったバッファ(buffer)をソースに変換
 * - 音量・ピッチ調整：音量(volume)と再生速度(rate)を動的に設定
 * - 接続管理：ソース -> ゲインノード -> 出力先(destination) という標準的なオーディオグラフを構築
 */
function playEffect(buffer, volume = 0.5, rate = 1.0) {
    if (!buffer) return;
    const source = audioCtx.createBufferSource();
    const gainNode = audioCtx.createGain();
    source.buffer = buffer;
    source.playbackRate.value = rate;
    gainNode.gain.value = volume;
    source.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    source.start(0);
}

// --- 各アクションごとの関数 ---
function playInviteSound() {
    playEffect(soundBuffers.invite, 0.5);
}

function playDieSound() {
    playEffect(soundBuffers.die, 0.5);
}

function playMouseOver1Sound() {
    playEffect(soundBuffers.mouseover1, 0.5);
}

function playMouseClickSound() {
    playEffect(soundBuffers.mouseclick, 0.5);
}

function playTabSound() {
    playEffect(soundBuffers.tab, 0.5);
}

function playMenuDownSound() {
    playEffect(soundBuffers.menudown, 0.5);
}

function playMenuUpSound() {
    playEffect(soundBuffers.menuup, 0.5);
}

function playLevelUpSound() {
    playEffect(soundBuffers.levelup, 0.5);
}

function playHoverSound() {
    playEffect(soundBuffers.hover, 0.5);
}

function playDropSound() {
    playEffect(soundBuffers.drop, 0.5);
}

function playItemSound() {
    playEffect(soundBuffers.item, 0.4);
}

function playJumpSound() {
    playEffect(soundBuffers.jump, 0.3, 1.1);
}

// ============================================================
// :::PLAY_ENEMY_HIT_SOUND::: ⚔️ 敵への攻撃ヒット音の演出制御
// ============================================================
/**
 * 役割：
 * - 敵種別判定：モンスターのタイプ(monster3等)に応じて再生する音源バッファを選択
 * - 安全性：バッファが存在しない場合に共通音源(enemyHit)へフォールバックする堅牢性
 * - 演出付加：ピッチをランダム(0.9～1.1倍)に変化させることで、飽きのこない打撃音を生成
 */
function playEnemyHitSound(enemy) {
    // サーバーの monster3 などの判定に合わせる
    const buffer = (enemy && enemy.type === 'monster3') ? soundBuffers.enemyHitBoss : soundBuffers.enemyHitNormal;
    
    // まだ enemyHitBoss などを設定していない場合は、共通の enemyHit でもOK
    const finalBuffer = buffer || soundBuffers.enemyHit; 
    
    if (finalBuffer) {
        // 少し音程をランダムに変えると、連続攻撃が自然に聞こえます
        const randomRate = 0.9 + Math.random() * 0.2; 
        playEffect(finalBuffer, 0.4, randomRate);
    }
}

// ============================================================
// :::PLAY_ENEMY_DIE_SOUND::: 💀 敵撃破時の音響演出
// ============================================================
/**
 * 役割：
 * - 撃破演出：敵の種別（monster1, 2, 3）に基づいた撃破音の選択
 * - 重要度調整：ボス級(monster3)に対しては音量を大きく設定し、勝利の重みを演出
 * - 再生実行：準備された音源バッファの確認後、playEffect を通じて再生を指示
 */
function playEnemyDieSound(enemy) {
    let buffer;

    // 🌟 サーバーから送られてくる type に合わせて音を選ぶ
    if (enemy.type === 'monster3') {
        buffer = soundBuffers.monster3Die;
    } else if (enemy.type === 'monster2') {
        buffer = soundBuffers.monster2Die;
    } else {
        buffer = soundBuffers.monster1Die;
    }

    // 再生実行
    if (buffer) {
        const volume = (enemy.type === 'monster3') ? 0.8 : 0.5; // ボスは少し大きく
        playEffect(buffer, volume);
    }
}

let bgmSource = null;

// ============================================================
// :::PLAY_BGM::: 🎵 BGMの再生とループ管理
// ============================================================
/**
 * 役割：
 * - 待機ロジック：音源が準備されるまで自動的に再試行(0.5s間隔)
 * - 状態監視：ブラウザの再生制限(AudioContext.state)をチェック
 * - 再生制御：二重再生の防止、ループフラグの有効化、およびゲインによる音量制御
 */
function playBGM() {
    // 1. ロードが終わっていない場合は、0.5秒後にやり直す
    if (!soundBuffers.bgm) {
        console.log("⏳ BGMロード待ち...");
        setTimeout(playBGM, 500);
        return;
    }

    // 2. ブラウザが「音を出していいよ」という状態（running）でないなら何もしない
    // (これはユーザーが画面を一度クリックすれば running になります)
    if (audioCtx.state !== 'running') {
        console.log("🔇 オーディオがまだ無効です。クリックを待っています。");
        return;
    }

    // すでに鳴っている場合は二重再生防止のために止める
    if (bgmSource) {
        try { bgmSource.stop(); } catch(e) {}
    }

    // 3. 再生処理
    bgmSource = audioCtx.createBufferSource();
    bgmSource.buffer = soundBuffers.bgm;
    bgmSource.loop = true; // ループ設定

    const gainNode = audioCtx.createGain();
    gainNode.gain.value = 0.15; // BGM音量

    bgmSource.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    bgmSource.start(0);
    console.log("🎵 BGM再生開始！");
}