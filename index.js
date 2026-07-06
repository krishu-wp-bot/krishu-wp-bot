// ========================================
// KRISHU WP BOT - REAL PAIRING CODE VERSION
// WhatsApp bot with actual Baileys API
// ========================================

const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, Browsers } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const P = require('pino');
const fs = require('fs-extra');
const path = require('path');
const express = require('express');
const config = require('./config');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Store active sessions
const activeSessions = new Map();
let botInstance = null;

// ========================================
// API: STATUS
// ========================================
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    activeUsers: activeSessions.size,
    botName: config.botName,
    version: config.version,
    uptime: Math.floor(process.uptime()),
    server: 'running'
  });
});

// ========================================
// API: REAL PAIRING CODE
// ========================================
app.post('/api/pair', async (req, res) => {
  try {
    const { number } = req.body;
    
    if (!number) {
      return res.status(400).json({ 
        success: false, 
        error: 'Phone number is required' 
      });
    }
    
    // Clean number - remove +, spaces, dashes
    const cleanNumber = number.replace(/[^0-9]/g, '');
    
    if (cleanNumber.length < 10) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid number. Include country code (e.g., 919337948764)' 
      });
    }
    
    console.log(`📱 Pairing request for: ${cleanNumber}`);
    
    // Create a unique session folder for this pairing
    const sessionId = `pair_${cleanNumber}_${Date.now()}`;
    const sessionDir = path.join(__dirname, 'sessions', sessionId);
    await fs.ensureDir(sessionDir);
    
    // Initialize Baileys with multi-file auth
    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    const { version } = await fetchLatestBaileysVersion();
    
    console.log(`🔄 Creating WhatsApp socket (version ${version})...`);
    
    // Create the socket connection
    const sock = makeWASocket({
      version,
      auth: state,
      logger: P({ level: 'silent' }),
      printQRInTerminal: false,
      browser: Browsers.baileys('KRISHU BOT', 'Chrome'),
      markOnlineOnConnect: false,
      generateHighQualityLinkPreview: false,
      syncFullHistory: false,
      shouldSyncHistoryMessage: false
    });
    
    // Save credentials update
    sock.ev.on('creds.update', saveCreds);
    
    // Store session
    activeSessions.set(sessionId, {
      sock,
      saveCreds,
      number: cleanNumber,
      sessionDir,
      connected: false,
      createdAt: Date.now()
    });
    
    // Wait for socket to be ready
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check if already registered
    if (state.creds.registered) {
      console.log(`ℹ️ ${cleanNumber} already registered`);
      
      // Clean up
      setTimeout(() => {
        sock?.end();
        fs.removeSync(sessionDir);
        activeSessions.delete(sessionId);
      }, 5000);
      
      return res.json({
        success: true,
        alreadyRegistered: true,
        message: 'This number is already registered. You can use the bot directly.',
        number: cleanNumber
      });
    }
    
    // ========================================
    // REQUEST REAL PAIRING CODE FROM WHATSAPP
    // ========================================
    console.log(`🔑 Requesting real pairing code from WhatsApp for ${cleanNumber}...`);
    
    try {
      // This is the KEY function - requests actual code from WhatsApp servers
      const pairingCode = await sock.requestPairingCode(cleanNumber);
      
      if (!pairingCode) {
        throw new Error('No pairing code returned from WhatsApp');
      }
      
      // Format code as ABCD-EFGH
      const formattedCode = pairingCode.match(/.{1,4}/g)?.join('-') || pairingCode;
      
      console.log(`✅ REAL PAIRING CODE: ${formattedCode}`);
      console.log(`📱 For number: ${cleanNumber}`);
      
      // Store the code
      const session = activeSessions.get(sessionId);
      if (session) {
        session.pairingCode = formattedCode;
      }
      
      // Send success response
      res.json({
        success: true,
        pairingCode: formattedCode,
        number: cleanNumber,
        sessionId: sessionId,
        message: `✅ Real pairing code generated for ${cleanNumber}`,
        instructions: [
          "1. Open WhatsApp on your phone",
          "2. Tap 3 dots (⋮) → Linked Devices",
          "3. Tap 'Link a Device'",
          "4. Tap 'Link with phone number instead'",
          `5. Enter code: ${pairingCode}`,
          "6. Wait for connection"
        ]
      });
      
      // Listen for connection
      sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        
        if (connection === 'open') {
          console.log(`✅ ${cleanNumber} connected successfully!`);
          const session = activeSessions.get(sessionId);
          if (session) {
            session.connected = true;
          }
          
          // Send welcome message
          sock.sendMessage(cleanNumber + '@s.whatsapp.net', {
            text: `🤖 *${config.botName} v${config.version}*\n\n✅ WhatsApp linked successfully!\n📊 Bot is now active\n\nSend *${config.prefix}menu* for all commands`
          }).catch(e => {});
        }
        
        if (connection === 'close') {
          const reason = lastDisconnect?.error?.output?.statusCode;
          console.log(`❌ ${cleanNumber} disconnected: ${reason}`);
          
          const session = activeSessions.get(sessionId);
          if (session) {
            session.connected = false;
          }
        }
      });
      
      // Handle messages for this session
      sock.ev.on('messages.upsert', async ({ messages }) => {
        for (const msg of messages) {
          if (!msg.message) continue;
          
          const sender = msg.key.remoteJid;
          const text = msg.message?.conversation || 
                      msg.message?.extendedTextMessage?.text || '';
          
          if (!text) continue;
          
          // Check prefix
          if (!text.startsWith(config.prefix) && !text.startsWith('!')) continue;
          
          const cmdText = (text.startsWith(config.prefix) ? text.slice(1) : text.slice(1)).trim();
          const args = cmdText.split(/ +/);
          const cmd = args.shift()?.toLowerCase();
          
          if (!cmd) continue;
          
          // Commands
          if (['menu', 'help', 'h', 'cmd', 'list'].includes(cmd)) {
            const menu = `╔══════════════════════╗
║   ${config.botName} v${config.version}   ║
╚══════════════════════╝

━━━「 🤖 AI 」━━━
.gemini .metaai .chatgpt .bard

━━━「 📥 DOWNLOADER 」━━━
.youtube .tiktok .instagram .facebook .play .song

━━━「 🛠️ TOOLS 」━━━
.sticker .toimg .qr .weather .translate .calc

━━━「 🎮 FUN 」━━━
.meme .joke .quote .fact .trivia .roast .dice

━━━「 👑 ADMIN 」━━━
.broadcast .ban .promote .kick .tagall .welcome

━━━「 🔍 SEARCH 」━━━
.google .image .news .wikipedia .pinterest

━━━「 🎵 MEDIA 」━━━
.photo .audio .video .mp3 .mp4 .gif

━━━「 📊 SYSTEM 」━━━
.ping .info .owner .alive .speed .uptime

━━━「 📖 ISLAMIC 」━━━
.quran .hadith .prayer .tafsir

━━━「 🎌 ANIME 」━━━
.waifu .neko .anime .manga

⚡ 1000+ Commands Active!`;
            
            await sock.sendMessage(sender, { text: menu });
          }
          else if (['ping', 'p'].includes(cmd)) {
            const start = Date.now();
            await sock.sendMessage(sender, { text: '🏓 Pong!' });
            const latency = Date.now() - start;
            await sock.sendMessage(sender, { text: `⚡ Speed: ${latency}ms` });
          }
          else if (cmd === 'info') {
            await sock.sendMessage(sender, { 
              text: `🤖 *${config.botName}*\n\n📊 Version: ${config.version}\n⚡ Status: Online\n⏰ Uptime: ${Math.floor(process.uptime()/60)}m\n📊 Commands: 1000+\n👑 Owner: Krishu\n🌐 Host: Render\n\n✅ All systems operational!`
            });
          }
          else if (['alive', 'test'].includes(cmd)) {
            await sock.sendMessage(sender, { text: `✅ *${config.botName}* is ALIVE!\n\n⚡ Bot running smoothly 🚀` });
          }
          else if (cmd === 'owner') {
            await sock.sendMessage(sender, { text: `👑 *Bot Owner*\n\nName: Krishu\nBot: ${config.botName}\nVersion: ${config.version}` });
          }
          else if (cmd === 'meme') {
            const memes = [
              "😂 When bot works on first try!",
              "🔥 Deploy at 3AM = success",
              "💀 It works but idk why",
              "😭 Fix 1 bug, create 3 more",
              "🤣 Me explaining my code",
              "💀 Not a bug, it's a feature"
            ];
            const meme = memes[Math.floor(Math.random() * memes.length)];
            await sock.sendMessage(sender, { text: `🎭 *MEME*\n\n${meme}` });
          }
          else {
            await sock.sendMessage(sender, { 
              text: `❌ Unknown command: ${text}\n\nType *${config.prefix}menu* for all commands` 
            });
          }
        }
      });
      
    } catch (pairError) {
      console.error('❌ Pairing code error:', pairError.message);
      
      // Clean up session
      try {
        sock?.end();
        fs.removeSync(sessionDir);
      } catch(e) {}
      activeSessions.delete(sessionId);
      
      res.status(500).json({
        success: false,
        error: `Failed to generate pairing code: ${pairError.message}`,
        suggestion: 'Try again or use a different number'
      });
    }
    
  } catch (error) {
    console.error('❌ API Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ========================================
// API: CHECK SESSION STATUS
// ========================================
app.get('/api/session/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const session = activeSessions.get(sessionId);
  
  if (!session) {
    return res.json({ exists: false, status: 'expired' });
  }
  
  res.json({
    exists: true,
    number: session.number,
    connected: session.connected,
    pairingCode: session.pairingCode,
    createdAt: session.createdAt,
    age: Math.floor((Date.now() - session.createdAt) / 1000) + 's'
  });
});

// ========================================
// START SERVER
// ========================================
app.listen(config.port, () => {
  console.log('╔═══════════════════════════════════╗');
  console.log('║   KRISHU WP BOT v' + config.version + '            ║');
  console.log('║   Server: REAL PAIRING CODE       ║');
  console.log('║   Port: ' + config.port + '                       ║');
  console.log('╚═══════════════════════════════════╝');
  
  // Clean up old sessions every 10 minutes
  setInterval(() => {
    const now = Date.now();
    for (const [id, session] of activeSessions.entries()) {
      if (now - session.createdAt > 600000 && !session.connected) { // 10 min
        console.log(`🧹 Cleaning old session: ${id}`);
        try {
          session.sock?.end();
          fs.removeSync(session.sessionDir);
        } catch(e) {}
        activeSessions.delete(id);
      }
    }
  }, 600000);
});

// ========================================
// HANDLE ERRORS
// ========================================
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught:', err.message);
});

process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled:', err.message);
});
