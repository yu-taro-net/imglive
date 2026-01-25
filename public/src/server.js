const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const PORT = process.env.PORT || 3000;
const path = require('path'); // これが必要

app.use(express.static(path.join(__dirname, 'public')));

// ==========================================
// 🛠️ 【初心者用】ゲームの設定エリア
// ここを書き換えるだけで、ゲームのバランスが変わります
// ==========================================
const SETTINGS = {
  CANVAS: { WIDTH: 800, HEIGHT: 600 },
  SYSTEM: { 
    GROUND_Y: 600,        // 一番下の地面の高さ
    GRAVITY: 0.5,         // 重力の強さ
    FRICTION: 0.98,       // 空中摩擦（1に近いほど止まらない）
    TICK_RATE: 40         // 更新間隔（ミリ秒）
  },
  PLAYER: {
    DEFAULT_W: 40,        // キャラクターの幅
    DEFAULT_H: 65,        // キャラクターの高さ
    MAX_HP: 100,          // 最大体力
    ATTACK_FRAME: 10      // 攻撃の持続時間
  },
  ITEM: {
    SIZE: 30,             // アイテムの見た目サイズ
    COLLISION_OFFSET: 15, // 当たり判定の幅（半分）
    SINK_Y: 0            // 地面に少し埋まる深さ（大きくすると深く埋まる）
  }
};

// マップの構造データ
const MAP_DATA = {
  platforms: [
    { x: 50,  y: 450, w: 180, h: 20 },
    { x: 300, y: 300, w: 200, h: 20 }, 
    { x: 550, y: 150, w: 200, h: 20 } 
  ],
  ladders: [{ x: 580, y1: 130, y2: 600 }]
};

// ==========================================
// 👾 敵キャラクターのクラス（仕組みの部分）
// ==========================================
// ==========================================
// 👾 敵キャラクターのクラス（仕組みの部分）
// ==========================================
class Enemy {
  constructor(id, platIndex) {
    this.id = id;
    this.platIndex = platIndex; 
    this.reset();
  }

	reset() {
  // --- 🔄 基本ステータスの初期化 ---
  this.offset       = 0; 
  this.dir          = 1; 
  this.alive        = true;
  this.kbV          = 0; 
  this.opacity      = 1; 
  this.isFading     = false;
  this.deathFrame   = 0;
  this.respawnTimer = 0; 
  this.waitTimer    = 0; 

  // --- 👾 モンスター種別の判定と個体設定 ---
  if (this.id === 3) { 
    // 【ボス】 (旧boss2)
    this.type  = 'monster3';
    this.w = 179; this.h = 158; this.hp = 2000; this.speed = 0.5;
    this.x     = 550; 
    this.y     = SETTINGS.SYSTEM.GROUND_Y - this.h;

  } else if (this.platIndex === 1) { 
    // 【中型】 (旧big)
    this.type  = 'monster2';
    this.w = 56;  this.h = 52;  this.hp = 500;  this.speed = 0.8;

  } else {
    // 【小型】 (旧normal)
    this.type  = 'monster1';
    this.w = 35;  this.h = 34;  this.hp = 200;  this.speed = 1.5;
  }
}

  update() {
  // === 💀 1. 共通：消滅アニメーション・リスポーン管理 ===
  if (this.isFading) {
    if (++this.deathFrame > 40) {
      this.alive = false;
      this.isFading = false;
      this.respawnTimer = (this.id === 3) ? 300 : 150;
    }
    return; 
  }

  if (!this.alive) { 
    if (--this.respawnTimer <= 0) { 
      this.reset(); 
      if (this.id !== 3) this.opacity = 0; 
    }
    return; 
  }

  // === 💥 2. ノックバック計算 (移動範囲の制限) ===
  if (Math.abs(this.kbV) > 0.1) {
    if (this.id === 3) {
      // 地上ボス：画面の端(0〜800)で制限
      this.x += this.kbV;
      this.x = Math.max(0, Math.min(800 - this.w, this.x));
    } else {
      // 足場モンスター：足場の幅(0〜p.w)で制限
      const p = MAP_DATA.platforms[this.platIndex];
      if (p) {
        this.offset += this.kbV;
        this.offset = Math.max(0, Math.min(p.w - this.w, this.offset));
      }
    }
    this.kbV *= 0.85; // 摩擦で減速
  } else {
    this.kbV = 0;
  }

  // === 🐾 3. 行動ロジック (自動移動・反転) ===
  if (this.waitTimer > 0) {
    this.waitTimer--;
  } else {
    if (this.id === 3) {
      // ボスの移動範囲 (400 〜 右端)
      this.x += this.speed * this.dir;
      if (this.x < 400)          { this.x = 400;         this.dir =  1; }
      if (this.x > 800 - this.w) { this.x = 800 - this.w; this.dir = -1; }
    } else {
      // 足場モンスターの移動
      const p = MAP_DATA.platforms[this.platIndex];
      if (p) {
        this.offset += this.speed * this.dir;
        
        // 足場の端で反転
        if (this.offset <= 0) { 
          this.offset = 0.5; 
          this.dir = 1; 
          this.waitTimer = 40; 
        } else if (this.offset >= p.w - this.w) { 
          this.offset = p.w - this.w - 0.5; 
          this.dir = -1; 
          this.waitTimer = 40;
        }
      }
    }

    // 気まぐれな停止と反転
    if (Math.random() < 0.01) { 
      this.waitTimer = Math.floor(Math.random() * 200) + 50; 
      this.dir *= (Math.random() > 0.5 ? 1 : -1); 
    }
  }

  // === 🎯 4. 最終座標の確定 (足場データとの同期) ===
  if (this.id === 3) {
    // 地面ボス
    this.y = SETTINGS.SYSTEM.GROUND_Y - this.h;
  } else {
    // 足場上の敵
    const p = MAP_DATA.platforms[this.platIndex];
    if (p) {
      if (this.opacity < 1) this.opacity += 0.02; // 出現時のフェードイン
      this.x = p.x + this.offset;
      this.y = p.y - this.h;
    }
  }
}
}

// ==========================================
// 🌐 サーバー全体の管理データ
// ==========================================
let players = {};
// --- 管理データの整頓 ---
const monster1 = new Enemy(0, 0);
const monster2 = new Enemy(1, 1);
const monster3 = new Enemy(2, 2);
const monster_boss = new Enemy(3, null);

let enemies = [monster1, monster2, monster3, monster_boss];

let droppedItems = [];
let lastPickedItems = []; // 🌟 拾われた情報を一時保存する箱

io.on('connection', socket => {
  // --- ★追加：接続した瞬間に、そのプレイヤー本人にIDを教える ---
  socket.emit('your_id', socket.id);
  console.log(`User connected: ${socket.id}`);

  // プレイヤー参加
  socket.on('join', n => { 
    players[socket.id] = { 
      id: socket.id, // ★ここでもIDをセットしておくと確実です
      name: n, x: 50, y: 500, dir: 1, score: 0, inventory: [], isAttacking: 0,
      w: SETTINGS.PLAYER.DEFAULT_W, h: SETTINGS.PLAYER.DEFAULT_H,
      hp: SETTINGS.PLAYER.MAX_HP, maxHp: SETTINGS.PLAYER.MAX_HP
    }; 
  });
  
  // 🌟 キャラクター番号の変更を受け取る
  socket.on('change_char', (data) => {
    if (players[socket.id]) {
      players[socket.id].charVar = data.charVar;
      // 全員に「この人のキャラが変わったよ」と即座に伝えるなら以下（任意）
      io.emit('update_players', players); 
    }
  });

  // 🌟 グループ番号の変更を受け取る
  socket.on('change_group', (data) => {
    if (players[socket.id]) {
      players[socket.id].group = data.group;
      io.emit('update_players', players);
    }
  });

  // 移動同期
  socket.on('move', d => { if (players[socket.id]) Object.assign(players[socket.id], d); });

  // 攻撃処理
  socket.on('attack', data => {
    // ⬇️ 【ここを追加】攻撃したプレイヤー本人を「p」として定義します
    const p = players[socket.id];
    if (!p) return; // プレイヤーが見つからなければここで処理を中断

    // ⬇️ ここも players[socket.id] の代わりに p と書けるようになります
    p.isAttacking = SETTINGS.PLAYER.ATTACK_FRAME;
	
    const target = enemies.find(e => e.id === data.id);
    
    if (target && target.alive && !target.isFading && target.opacity >= 0.5) {
      target.hp -= data.power;
      target.kbV = data.dir * 12;
      
	  // --- 🌟 ここを追加：敵の向きをプレイヤーに向ける ---
    // プレイヤーが敵の左側にいたら、敵は左(-1)を向く
    if (p.x < target.x) {
      target.dir = -1; 
    } else {
      target.dir = 1;
    }
    // 🌟 ---------------------------------------
	
      io.emit('damage_effect', { x: target.x + target.w/2, y: target.y, val: data.power, isCritical: data.power >= 85, type: 'enemy_hit' });
      
      if (target.hp <= 0) {
    target.isFading = true;
    target.deathFrame = 0;
    
    // 🌟 monster2 か monster3 ならたくさんドロップするように修正
    const isBigEnemy = (target.type === 'monster2' || target.type === 'monster3');
    const dropCount = isBigEnemy ? 10 : Math.floor(Math.random() * 5) + 1;

    for (let i = 0; i < dropCount; i++) {
      const angle = (-120 + (60 / (dropCount + 1)) * (i + 1)) * (Math.PI / 180);
      const speed = 7 + Math.random() * 5;
      
      // 🌟 金貨が出る確率の判定も monster2/3 に合わせる
      let finalType = isBigEnemy ? 
        (Math.random() < 0.2 ? 'gold' : 'money3') : 
        (Math.random() < 0.05 ? 'gold' : 'money1');
		
          droppedItems.push({ 
            id: Date.now() + Math.random(), 
            x: target.x + target.w/2, 
            y: target.y, 
            vx: Math.cos(angle) * speed, 
            vy: Math.sin(angle) * speed, 
            type: finalType, 
            phase: Math.random() * Math.PI * 2, 
            landed: false 
          });
        }
      }
    }
  });

  // アイテム拾得
  socket.on('pickup', itemId => {
    const item = droppedItems.find(it => it.id === itemId);
    if (item && players[socket.id]) {
      // 🌟 ここで「正解」をメモする
      lastPickedItems.push({
        type: item.type,
        x: item.x,
        y: item.y,
        pickerId: socket.id // 拾った人のIDを記録
      });

      players[socket.id].inventory.push(item.type);
      players[socket.id].score += (item.type === 'gold' ? 500 : (item.type === 'money3' ? 100 : 10));
      droppedItems = droppedItems.filter(it => it.id !== itemId);
    }
  });

  // ダメージ同期
  socket.on('player_damaged', data => { 
    if (players[socket.id]) {
      players[socket.id].hp = data.newHp;
      io.emit('damage_effect', { x: players[socket.id].x + 30, y: players[socket.id].y, val: data.val, isCritical: false, type: 'player_hit' }); 
    }
  });

  // チャット（名前を含めて全員に送信）
  socket.on('chat', text => { 
    io.emit('chat', { id: socket.id, name: players[socket.id]?.name || "Guest", text: text }); 
  });

  // 切断処理
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    delete players[socket.id];
  });
});

// ==========================================
// 🔄 メイン更新ループ（時間経過による変化）
// ==========================================
setInterval(() => { 
  // 敵の動き
  enemies.forEach(e => e.update()); 
  
  // プレイヤーの攻撃タイマー減少
  //for (let id in players) if (players[id].isAttacking > 0) players[id].isAttacking--;
  
 // 落ちているアイテムの物理計算
  droppedItems.forEach(it => {
    if (!it.landed) {
      it.x += it.vx; 
      it.y += it.vy; 
      it.vy += SETTINGS.SYSTEM.GRAVITY; 
      it.vx *= SETTINGS.SYSTEM.FRICTION;

      // 1. 足場との着地判定
      MAP_DATA.platforms.forEach(p => {
        if (it.vy > 0 && 
            it.x + SETTINGS.ITEM.COLLISION_OFFSET > p.x && 
            it.x < p.x + p.w && 
            it.y + SETTINGS.ITEM.SIZE >= p.y && 
            it.y + SETTINGS.ITEM.SIZE <= p.y + 10) { // 判定の幅を10に統一
          
          // ★計算式：地面と同じルールに変更
          it.y = p.y - SETTINGS.ITEM.SIZE + SETTINGS.ITEM.SINK_Y; 
          it.landed = true; it.vy = 0; it.vx = 0;
        }
      });

      // 2. 一番下の地面との着地判定
      if (!it.landed && it.y + SETTINGS.ITEM.SIZE >= SETTINGS.SYSTEM.GROUND_Y) { 
        
        // ★計算式：足場と同じルールに統一
        it.y = SETTINGS.SYSTEM.GROUND_Y - SETTINGS.ITEM.SIZE + SETTINGS.ITEM.SINK_Y; 
        it.landed = true; it.vy = 0; it.vx = 0; 
      }
    }
  });

  // 全プレイヤーに現在の状態を送信
  io.emit('state', { 
    players, 
    items: droppedItems, 
    enemies: enemies.map(e => ({ ...e })),
    platforms: MAP_DATA.platforms,
    ladders: MAP_DATA.ladders,
    lastPickedItems: lastPickedItems // 🌟 正解を同封する
  });

  lastPickedItems = []; // 🌟 送り終わったら空にする
}, SETTINGS.SYSTEM.TICK_RATE);

http.listen(PORT, () => console.log('Server is running...'));