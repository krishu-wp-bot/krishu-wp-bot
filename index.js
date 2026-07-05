// ========================================
// KRISHU WP BOT - Main Bot Index File
// WhatsApp Bot with Pairing Code + 1000+ Commands
// ========================================

const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, makeInMemoryStore, jidDecode, proto } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const P = require('pino');
const fs = require('fs-extra');
const path = require('path');
const moment = require('moment-timezone');
const config = require('./config');
const chalk = require('chalk');
const express = require('express');
const app = express();

// ======= WEBSITE SETUP =======
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Store for pairing codes
let pairingCodes = {};
let sessions = {};
let activeNumbers = [];

// ======= WEBSITE ROUTES =======
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    activeUsers: activeNumbers.length,
    botName: config.botName,
    version: config.version,
    uptime: process.uptime()
  });
});

app.post('/api/pair', async (req, res) => {
  try {
    const { number } = req.body;
    if (!number) return res.status(400).json({ error: 'Number required' });
    
    const cleanNumber = number.replace(/[^0-9]/g, '');
    
    // Create new session for this number
    const sessionId = `session_${cleanNumber}_${Date.now()}`;
    
    // Generate pairing code
    const { state, saveCreds } = await useMultiFileAuthState(`auth_${cleanNumber}`);
    const { version } = await fetchLatestBaileysVersion();
    
    const sock = makeWASocket({
      version,
      auth: state,
      logger: P({ level: 'silent' }),
      printQRInTerminal: false,
      mobile: false
    });
    
    if (!state.creds.registered) {
      const pairingCode = await sock.requestPairingCode(cleanNumber);
      const formattedCode = pairingCode.match(/.{1,4}/g).join('-');
      
      sessions[sessionId] = { sock, saveCreds, number: cleanNumber, active: true };
      
      res.json({
        success: true,
        pairingCode: formattedCode,
        sessionId: sessionId,
        number: cleanNumber,
        message: `Pairing code generated for ${cleanNumber}`
      });
    } else {
      res.json({
        success: true,
        alreadyRegistered: true,
        number: cleanNumber,
        message: `Number ${cleanNumber} already registered`
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
const server = app.listen(config.port, () => {
  console.log(`✅ KRISHU WP BOT Website running on port ${config.port}`);
});

// ======= MAIN BOT LOGIC =======
async function startBot() {
  console.log(chalk.green('╔═══════════════════════════════════╗'));
  console.log(chalk.green('║      KRISHU WP BOT v4.0.0        ║'));
  console.log(chalk.green('║   1000+ Commands | Pairing Code   ║'));
  console.log(chalk.green('╚═══════════════════════════════════╝'));
  
  // Auto-restart on crash
  let reconnectAttempts = 0;
  
  async function connectToWhatsApp() {
    try {
      const { state, saveCreds } = await useMultiFileAuthState(config.sessionName);
      const { version, isLatest } = await fetchLatestBaileysVersion();
      
      console.log(`📱 Using Baileys version: ${version}`);
      
      const sock = makeWASocket({
        version,
        auth: state,
        logger: P({ level: 'silent' }),
        printQRInTerminal: false,
        mobile: false,
        browser: ['KRISHU BOT', 'Safari', '4.0.0'],
        markOnlineOnConnect: true,
        fireInitQueries: true,
        shouldSyncHistoryMessage: true,
        syncFullHistory: false,
        generateHighQualityLinkPreview: true,
        patchMessageBeforeSending: (msg) => {
          const requiresPatch = !!(
            msg.buttonsMessage || 
            msg.templateMessage ||
            msg.listMessage
          );
          if (requiresPatch) {
            msg = {
              viewOnceMessage: {
                message: {
                  messageContextInfo: {
                    deviceListMetadata: {},
                    deviceListMetadataVersion: 2
                  },
                  ...msg
                }
              }
            };
          }
          return msg;
        }
      });
      
      // Save credentials
      sock.ev.on('creds.update', saveCreds);
      
      // Load all commands
      const commands = new Map();
      await loadCommands(sock, commands);
      
      // Connection update handler
      sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
          console.log('📱 QR Code received, scan it with WhatsApp');
        }
        
        if (connection === 'close') {
          const shouldReconnect = (lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut);
          console.log(`🔌 Connection closed: ${lastDisconnect.error?.message || 'Unknown'}`);
          
          if (shouldReconnect) {
            reconnectAttempts++;
            const delay = Math.min(1000 * reconnectAttempts, 30000);
            console.log(`🔄 Reconnecting in ${delay/1000}s... (Attempt ${reconnectAttempts})`);
            setTimeout(connectToWhatsApp, delay);
          } else {
            console.log('🚫 Logged out. Delete auth folder and restart.');
          }
        }
        
        if (connection === 'open') {
          reconnectAttempts = 0;
          console.log('✅ Bot connected to WhatsApp!');
          
          // Send startup notification
          await sock.sendMessage(sock.user.id, {
            text: `🤖 *${config.botName} v${config.version}*\n\n✅ Bot is now ONLINE!\n📊 Total Commands: ${commands.size}\n⚡ Status: Active\n\n📝 Send *${config.prefix}menu* for all commands`
          });
          
          // Update active numbers
          if (!activeNumbers.includes(sock.user.id.split(':')[0])) {
            activeNumbers.push(sock.user.id.split(':')[0]);
          }
        }
      });
      
      // Message handler
      sock.ev.on('messages.upsert', async ({ messages }) => {
        for (const msg of messages) {
          if (!msg.message || msg.key.fromMe) continue;
          
          const messageContent = msg.message?.conversation || 
                                msg.message?.extendedTextMessage?.text || 
                                msg.message?.imageMessage?.caption ||
                                '';
          
          if (!messageContent) continue;
          
          const sender = msg.key.remoteJid;
          const isGroup = sender.endsWith('@g.us');
          const senderNumber = sender.split('@')[0];
          
          // Check if message starts with prefix
          let prefix = config.prefix;
          let commandText = messageContent;
          
          if (messageContent.startsWith(prefix)) {
            commandText = messageContent.slice(prefix.length).trim();
          } else if (messageContent.startsWith('!')) {
            prefix = '!';
            commandText = messageContent.slice(1).trim();
          } else {
            continue;
          }
          
          const args = commandText.split(/ +/);
          const commandName = args.shift()?.toLowerCase();
          
          if (!commandName) continue;
          
          const command = commands.get(commandName);
          
          if (command) {
            try {
              console.log(`⚡ Command: ${prefix}${commandName} from ${senderNumber}`);
              
              await command.execute(sock, msg, {
                args,
                sender,
                isGroup,
                senderNumber,
                commandName,
                prefix,
                config,
                commands
              });
            } catch (error) {
              console.error(`❌ Error in command ${commandName}:`, error.message);
              await sock.sendMessage(sender, {
                text: `❌ Error executing command: ${error.message}`
              });
            }
          }
        }
      });
      
      sock.ev.on('group-participants.update', async (update) => {
        // Handle welcome/goodbye messages
        if (config.welcome || config.goodbye) {
          const { id, participants, action } = update;
          
          if (action === 'add' && config.welcome) {
            for (const participant of participants) {
              await sock.sendMessage(id, {
                text: `👋 *Welcome!*\n\nHey @${participant.split('@')[0]}!\nWelcome to the group 🤗`,
                mentions: [participant]
              });
            }
          }
          
          if (action === 'remove' && config.goodbye) {
            for (const participant of participants) {
              await sock.sendMessage(id, {
                text: `👋 *Goodbye!*\n\n@${participant.split('@')[0]} left the group 🥲`,
                mentions: [participant]
              });
            }
          }
        }
      });
      
      // Error handler
      sock.ev.on('messages.error', (error) => {
        console.error('❌ Message error:', error.message);
      });
      
    } catch (error) {
      console.error('❌ Fatal error:', error.message);
      setTimeout(connectToWhatsApp, 5000);
    }
  }
  
  connectToWhatsApp();
}

// ======= COMMAND LOADER =======
async function loadCommands(sock, commands) {
  const commandPath = path.join(__dirname, 'commands');
  
  async function loadFromDir(dir) {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const itemPath = path.join(dir, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory()) {
        await loadFromDir(itemPath);
      } else if (item.endsWith('.js')) {
        try {
          const command = require(itemPath);
          
          if (command.name && typeof command.execute === 'function') {
            // Register command name
            commands.set(command.name.toLowerCase(), command);
            
            // Register aliases
            if (command.aliases && Array.isArray(command.aliases)) {
              for (const alias of command.aliases) {
                commands.set(alias.toLowerCase(), command);
              }
            }
          }
        } catch (error) {
          console.error(`❌ Failed to load command ${item}:`, error.message);
        }
      }
    }
  }
  
  await loadFromDir(commandPath);
  console.log(`📚 Loaded ${commands.size} commands`);
  return commands;
}

// Start everything
startBot().catch(console.error);

// Graceful shutdown
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error.message);
});

process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled Rejection:', error.message);
});
