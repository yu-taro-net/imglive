const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');
const mysql = require('mysql2');

// 【重要】RailwayのMYSQL_URLを優先して使う設定
const db = mysql.createConnection(process.env.MYSQL_URL);

db.connect((err) => {
  if (err) {
    console.error('MySQL接続エラー:', err);
    return;
  }
  console.log('MySQLに接続完了！');
  db.query('CREATE TABLE IF NOT EXISTS messages (id INT AUTO_INCREMENT PRIMARY KEY, content TEXT)');
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

io.on('connection', (socket) => {
  // 過去のログを取得
  db.query('SELECT content FROM messages', (err, results) => {
    if (!err) {
      results.forEach(row => socket.emit('chat message', row.content));
    }
  });

  socket.on('chat message', (msg) => {
    db.query('INSERT INTO messages (content) VALUES (?)', [msg], (err) => {
      if (!err) io.emit('chat message', msg);
    });
  });
});

// Railwayのポート番号に合わせる
const PORT = process.env.PORT || 8080;
http.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});