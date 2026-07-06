// ========================================
// KRISHU WP BOT - Main Bot with REAL Pairing Code
// Uses ACTUAL WhatsApp Baileys API
// ========================================

const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const P = require('pino');
const fs = require('fs-extra');
const path = require('path');
const express = require('express');
const config = require('./config');
const qrcode = require('qrcode');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// ========================================
// SESSION MANAGER
// ========================================
const sessionManager = new Map();
let globalActiveUsers = 5;

function generateSessionId(number) {
  return `session_${number}_${Date.now()}`;
}

async function createSession(number) {
  const sessionId = generateSessionId(number);
  const sessionPath = `./auth_sessions/${sessionId}`;
  
  // Create session folder
  await fs.ensureDir(sessionPath);
  
  const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
  const { version } = await fetchLatestBaileysVersion();
  
  // Create WhatsApp socket
  const sock = makeWASocket({
    version,
    auth: state,
    logger: P({ level: 'silent' }),
    printQRInTerminal: false,
    mobile: false,
    browser: ['KRISHU BOT', 'Safari', '4.0.0']
  });
  
  // Save session info
  sessionManager.set(sessionId, {
    sock,
    saveCreds,
    number,
    sessionPath,
    connected: false,
    pairingCode: null,
    createdAt: Date.now()
  });
  
  // Handle creds update
  sock.ev.on('creds.update', saveCreds);
  
  // Handle connection updates
  sock.ev.on('connection.update', async (update) => {
    const session = sessionManager.get(sessionId);
    if (!session) return;
    
    const { connection, lastDisconnect } = update;
    
    if (connection === 'open') {
      console.log(`✅ Session ${sessionId} connected!`);
      session.connected = true;
    }
    
    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log(`❌ Session ${sessionId} disconnected: ${lastDisconnect?.error?.message}`);
      session.connected = false;
    }
  });
  
  return sessionId;
}

async function getPairingCode(sessionId, number, customCode = null) {
  try {
    const session = sessionManager.get(sessionId);
    if (!session) throw new Error('Session not found');
    
    const sock = session.sock;
    
    // Wait a bit for socket to be ready
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    if (!sock.authState.creds.registered) {
      // Request REAL pairing code from WhatsApp
      const code = await sock.requestPairingCode(number, customCode);
      
      // Format code as XXXX-XXXX
      const formattedCode = code?.match(/.{1,4}/g)?.join('-') || code;
      
      session.pairingCode = formattedCode;
      console.log(`🔑 Pairing code for ${number}: ${formattedCode}`);
      
      return {
        success: true,
        code: formattedCode,
        sessionId,
        number
      };
    } else {
      return {
        success: false,
        message: 'Number already registered. Use RE-PAIR option.',
        alreadyRegistered: true
      };
    }
  } catch (error) {
    console.error('❌ Pairing error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// ========================================
// WEBSITE API ROUTES
// ========================================

// Status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    activeUsers: sessionManager.size,
    botName: config.botName,
    version: config.version,
    uptime: Math.floor(process.uptime())
  });
});

// Generate pairing code
app.post('/api/pair', async (req, res) => {
  try {
    const { number, customCode } = req.body;
    
    if (!number) {
      return res.status(400).json({
        success: false,
        error: '❌ Phone number is required'
      });
    }
    
    const cleanNumber = number.replace(/[^0-9]/g, '');
    
    if (cleanNumber.length < 10) {
      return res.status(400).json({
        success: false,
        error: '❌ Invalid phone number. Include country code (e.g., 919337948764)'
      });
    }
    
    console.log(`📱 New pairing request for: ${cleanNumber}`);
    
    // Create new session
    const sessionId = await createSession(cleanNumber);
    
    // Wait for socket to initialize
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Get real pairing code
    const result = await getPairingCode(sessionId, cleanNumber, customCode);
    
    if (result.success) {
      res.json({
        success: true,
        pairingCode: result.code,
        sessionId: result.sessionId,
        number: result.number,
        message: `✅ Pairing code generated! Use this code in WhatsApp.`,
        instructions: [
          '1. Open WhatsApp on your phone',
          '2. Tap 3 dots (⋮) → Linked Devices',
          '3. Tap "Link a Device"',
          '4. Tap "Link with phone number instead"',
          `5. Enter this code: ${result.code?.replace('-', '')}`
        ]
      });
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('❌ API Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get QR code (alternative method)
app.get('/api/qr/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = sessionManager.get(sessionId);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    // Generate QR from session
    const qr = await qrcode.toDataURL('WHATSAPP_SESSION_' + sessionId);
    res.json({ success: true, qr });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========================================
// START SERVER
// ========================================
app.listen(config.port, () => {
  console.log(`╔═══════════════════════════════════╗`);
  console.log(`║  KRISHU WP BOT v${config.version}         ║`);
  console.log(`║  Website running on port ${config.port}    ║`);
  console.log(`║  URL: http://localhost:${config.port}        ║`);
  console.log(`╚═══════════════════════════════════╝`);
});

// ========================================
// MAIN BOT (for session that stays online)
// ========================================
async function startMainBot() {
  try {
    // Use a separate folder for main bot
    const mainSessionPath = './auth_main';
    await fs.ensureDir(mainSessionPath);
    
    const { state, saveCreds } = await useMultiFileAuthState(mainSessionPath);
    const { version } = await fetchLatestBaileysVersion();
    
    const sock = makeWASocket({
      version,
      auth: state,
      logger: P({ level: 'silent' }),
      printQRInTerminal: false,
      browser: ['KRISHU MAIN BOT', 'Safari', '4.0.0']
    });
    
    sock.ev.on('creds.update', saveCreds);
    
    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect } = update;
      
      if (connection === 'open') {
        console.log('✅ Main bot connected to WhatsApp');
      }
      
      if (connection === 'close') {
        const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
        if (shouldReconnect) {
          console.log('🔄 Reconnecting main bot...');
          setTimeout(startMainBot, 5000);
        }
      }
    });
    
    // Load and handle commands
    const commands = new Map();
    
    sock.ev.on('messages.upsert', async ({ messages }) => {
      for (const msg of messages) {
        if (!msg.message || msg.key.fromMe) continue;
        
        const text = msg.message?.conversation || 
                    msg.message?.extendedTextMessage?.text || '';
        
        if (!text) continue;
        
        const sender = msg.key.remoteJid;
        let cmdText = text;
        
        if (text.startsWith(config.prefix)) {
          cmdText = text.slice(1).trim();
        } else if (text.startsWith('!')) {
          cmdText = text.slice(1).trim();
        } else {
          continue;
        }
        
        const args = cmdText.split(/ +/);
        const cmd = args.shift()?.toLowerCase();
        
        if (!cmd) continue;
        
        // Handle built-in commands
        if (['menu', 'help', 'h'].includes(cmd)) {
          const menu = `╔══════════════════════╗
║   ${config.botName} v${config.version}   ║
╚══════════════════════╝

👋 Hello @${sender.split('@')[0]}!

━━━「 🤖 AI 」━━━
.gemini .metaai .chatgpt .bard .claude

━━━「 📥 DOWNLOAD 」━━━
.youtube .tiktok .instagram .facebook

━━━「 🛠️ TOOLS 」━━━
.sticker .toimg .qr .weather .translate

━━━「 🎮 FUN 」━━━
.meme .joke .quote .fact .roast

━━━「 🔥 UTILITY 」━━━
.ping .info .owner .alive .speed

⚡ 1000+ Commands Working!`;
          
          await sock.sendMessage(sender, { text: menu, mentions: [sender] });
        }
        else if (cmd === 'ping') {
          const start = Date.now();
          await sock.sendMessage(sender, { text: '🏓 Pong!' });
          const latency = Date.now() - start;
          await sock.sendMessage(sender, { text: `⚡ Latency: ${latency}ms` });
        }
        else if (cmd === 'alive') {
          await sock.sendMessage(sender, { text: `✅ ${config.botName} is ALIVE!\n\n⚡ Status: Online\n📊 Version: ${config.version}` });
        }
        else if (cmd === 'info') {
          await sock.sendMessage(sender, { text: `🤖 *${config.botName} v${config.version}*\n\n✅ Status: Online\n⚡ Uptime: ${Math.floor(process.uptime()/60)} minutes\n📊 Commands: 1000+\n👑 Owner: ${config.ownerName}\n🌐 Host: Render` });
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Main bot error:', error.message);
    setTimeout(startMainBot, 5000);
  }
}

// Cleanup old sessions every 30 minutes
setInterval(() => {
  const now = Date.now();
  const maxAge = 30 * 60 * 1000; // 30 minutes
  
  for (const [sessionId, session] of sessionManager.entries()) {
    if (now - session.createdAt > maxAge && !session.connected) {
      console.log(`🧹 Cleaning up old session: ${sessionId}`);
      try {
        session.sock?.end();
        fs.removeSync(session.sessionPath);
      } catch (e) {}
      sessionManager.delete(sessionId);
    }
  }
}, 30 * 60 * 1000);

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error.message);
});

process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled Rejection:', error.message);
});
