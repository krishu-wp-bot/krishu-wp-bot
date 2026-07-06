const express = require('express');
const path = require('path');
const config = require('./config');

const app = express();
const PORT = config.port;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let botStatus = {
  status: 'online',
  activeUsers: 0,
  commandsLoaded: 1000,
  startTime: Date.now()
};

app.get('/api/status', (req, res) => {
  botStatus.uptime = Math.floor((Date.now() - botStatus.startTime) / 1000);
  res.json({
    botName: config.botName,
    version: config.version,
    status: 'online',
    activeUsers: botStatus.activeUsers,
    uptime: botStatus.uptime,
    commandsLoaded: 1000
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ Website running on port ${PORT}`);
});

module.exports = { app, botStatus };
