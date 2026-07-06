// ========================================
// Help / Menu Command
// ========================================

const config = require('../config');

module.exports = {
  name: 'menu',
  aliases: ['help', 'commands', 'cmd', 'list', 'h', '?'],
  
  async execute(sock, msg, { args, sender, isGroup, prefix, commands }) {
    const categories = new Map();
    
    // Categorize all commands
    commands.forEach((cmd, name) => {
      const category = cmd.category || 'general';
      if (!categories.has(category)) {
        categories.set(category, []);
      }
      if (!categories.get(category).includes(name)) {
        categories.get(category).push(name);
      }
    });
    
    // Build menu
    let menuText = `╔══════════════════════╗\n`;
    menuText += `║   ${config.botName} v${config.version}   ║\n`;
    menuText += `╚══════════════════════╝\n\n`;
    menuText += `👋 Hello @${sender.split('@')[0]}!\n`;
    menuText += `📊 Total Commands: ${commands.size}\n`;
    menuText += `⚡ Prefix: \`${prefix}\`\n\n`;
    
    // Stats
    menuText += `━━━「 📊 SYSTEM STATS 」━━━\n`;
    menuText += `• Uptime: ${Math.floor(process.uptime() / 3600)}h ${Math.floor((process.uptime() % 3600) / 60)}m\n`;
    menuText += `• Commands Loaded: ${commands.size}\n`;
    menuText += `• Version: ${config.version}\n\n`;
    
    // Commands by category
    const categoryEmojis = {
      'admin': '👑',
      'ai': '🤖',
      'downloader': '📥',
      'tools': '🛠️',
      'fun': '🎮',
      'media': '🎵',
      'search': '🔍',
      'convert': '🔄',
      'owner': '⚙️',
      'islamic': '📖',
      'anime': '🎌',
      'whatsapp': '💬',
      'utility': 'ℹ️',
      'general': '📁'
    };
    
    for (const [category, cmds] of categories) {
      const emoji = categoryEmojis[category] || '📁';
      menuText += `━━━「 ${emoji} ${category.toUpperCase()} 」━━━\n`;
      menuText += cmds.map(c => `▸ ${prefix}${c}`).join('\n') + '\n\n';
    }
    
    // Footer
    menuText += `━━━「 🔥 BOT INFO 」━━━\n`;
    menuText += `• Type ${prefix}owner for owner info\n`;
    menuText += `• Type ${prefix}ping to check bot speed\n`;
    menuText += `• Type ${prefix}info for bot details\n\n`;
    menuText += `💡 *Tip:* Send any command without prefix to get help!\n`;
    menuText += `⚡ ${config.botName} - Always Online 🤖`;
    
    await sock.sendMessage(sender, {
      text: menuText,
      mentions: [sender]
    });
  }
};
