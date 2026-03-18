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

/**
 * 音ファイルをロードしてデコードする共通関数
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

/**
 * 全ての音源を準備する
 */
async function setupAudio() {
    // 並列でロードを開始（awaitを一括で待つことで高速化）
    const tasks = {
        invite:         loadAudioFile('../Invite.mp3'),
        die:            loadAudioFile('../Tombstone.mp3'),
        mouseover1:     loadAudioFile('../BtMouseOver.mp3'),
        mouseclick:     loadAudioFile('../BtMouseClick.mp3'),
        tab:            loadAudioFile('../Tab.mp3'),
        menuup:         loadAudioFile('../MenuUp.mp3'),
        menudown:       loadAudioFile('../MenuDown.mp3'),
		levelup:        loadAudioFile('../LevelUp.mp3'),
        hover:          loadAudioFile('../DragStart.mp3'),
        drop:           loadAudioFile('../DragEnd.mp3'),
        item:           loadAudioFile('../PickUpItem.mp3'),
        jump:           loadAudioFile('../Jump.mp3'),
		enemyHit:       loadAudioFile('../Damage.mp3'),
        // 🌟 ここでそれぞれのモンスターに合わせた音を指定してください
        monster1Die:    loadAudioFile('../monster1_die.mp3'),      // 普通の音
        monster2Die:    loadAudioFile('../monster1_die.mp3'),      // monster2も同じで良ければ同じファイル
        monster3Die:    loadAudioFile('../monster1_die.mp3'),  // ボス用の豪華な音
        bgm:            loadAudioFile('../Floral_Life.mp3')
    };

    // すべての結果を soundBuffers に格納
    for (const key in tasks) {
        soundBuffers[key] = await tasks[key];
    }

    console.log("✅ 全ての音源ロード完了", soundBuffers);
}

setupAudio();

// ==========================================
// 2. ブラウザのロック解除（強化版）
// ==========================================
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

// ==========================================
// 3. 再生関数
// ==========================================
// 効果音を鳴らすための基本関数（もし無ければ追記してください）
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

// 敵に攻撃が当たった時の音
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

// 敵が死んだ時に呼ばれる関数
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