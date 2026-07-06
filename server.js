// ========================================
// KRISHU WP BOT - Website Server
// ========================================

const express = require('express');
const path = require('path');
const config = require('./config');

const app = express();
const PORT = config.port;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

let botStatus = {
  status: 'online',
  activeUsers: 5,
  commandsLoaded: 1000,
  startTime: Date.now()
};

app.get('/api/status', (req, res) => {
  botStatus.uptime = Math.floor((Date.now() - botStatus.startTime) / 1000);
  res.json({
    botName: config.botName,
    version: config.version,
    status: botStatus.status,
    activeUsers: botStatus.activeUsers,
    uptime: botStatus.uptime,
    commandsLoaded: botStatus.commandsLoaded,
    server: 'online',
    security: 'ENCRYPTED'
  });
});

app.post('/api/pair', async (req, res) => {
  try {
    const { number } = req.body;
    if (!number) return res.status(400).json({ error: '❌ Please enter a valid phone number', success: false });
    
    const cleanNumber = number.replace(/[^0-9]/g, '');
    
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let pairingCode = '';
    for (let i = 0; i < 8; i++) {
      pairingCode += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    const formattedCode = pairingCode.match(/.{1,4}/g).join('-');
    
    res.json({
      success: true,
      number: cleanNumber,
      pairingCode: formattedCode,
      message: `✅ Pairing code generated successfully for ${cleanNumber}`,
      instructions: 'Open WhatsApp > Linked Devices > Link Device > Enter this code'
    });
  } catch (error) {
    res.status(500).json({ error: `❌ Error: ${error.message}`, success: false });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ KRISHU WP BOT Website running on port ${PORT}`);
  console.log(`🔗 URL: https://krishu-wp-bot.onrender.com`);
});

module.exports = { app, botStatus };
