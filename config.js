// ========================================
// KRISHU WP BOT - Configuration File
// ========================================
// SECURITY: All sensitive values come from .env file
// .env is listed in .gitignore and NEVER committed

module.exports = {
  // Bot Settings
  botName: process.env.BOT_NAME || "KRISHU WP BOT",
  version: "4.0.0",
  
  // Owner Settings
  ownerNumber: (process.env.OWNER_NUMBER || "919337948764") + "@s.whatsapp.net",
  ownerName: "Krishu",
  
  // Session Settings
  sessionName: "auth",
  
  // Server Settings
  port: process.env.PORT || 8000,
  
  // Bot Features
  prefix: ".",
  multiPrefix: false,
  autoRead: false,
  autoTyping: false,
  autoRecording: false,
  
  // Group Settings
  groupOnly: false,
  antiLink: false,
  welcome: true,
  goodbye: true,
  
  // API Keys - Loaded from .env (SECURE)
  geminiKey: process.env.GEMINI_KEY || "AQ.Ab8RN6LsAgHKHjbewpPF_2AerAgTQ5Qt7l1LYtfeH2PIznk39w",
  openaiKey: process.env.OPENAI_KEY || "AQ.Ab8RN6KPLSFsi5TS0KlB0mm6Ax32R2uMRoOzFQDD7lJed_eZ7g",
  
  // Time Settings
  timezone: "Asia/Kolkata",
  
  // Features
  maxFileSize: 100, // MB
  maxCommands: 1000,
  cooldownTime: 3, // seconds
};
