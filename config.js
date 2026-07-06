// ========================================
// KRISHU WP BOT - Configuration
// ========================================

module.exports = {
  botName: process.env.BOT_NAME || "KRISHU WP BOT",
  version: "4.0.0",
  
  ownerNumber: process.env.OWNER_NUMBER 
    ? process.env.OWNER_NUMBER + "@s.whatsapp.net" 
    : "919337948764@s.whatsapp.net",
  ownerName: "Krishu",
  
  sessionName: "auth",
  port: process.env.PORT || 8000,
  
  prefix: ".",
  multiPrefix: false,
  autoRead: false,
  autoTyping: false,
  autoRecording: false,
  
  groupOnly: false,
  antiLink: false,
  welcome: true,
  goodbye: true,
  
  geminiKey: process.env.GEMINI_KEY || "AQ.Ab8RN6LsAgHKHjbewpPF_2AerAgTQ5Qt7l1LYtfeH2PIznk39w",
  openaiKey: process.env.OPENAI_KEY || "8743843136:AAGrw8bM5XAqCBiteT183068y-5hB9502cI",
  
  timezone: "Asia/Kolkata",
  maxFileSize: 100,
  maxCommands: 1000,
  cooldownTime: 3
};
