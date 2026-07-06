// ========================================
// Command Handler - Auto Loader
// ========================================

const fs = require('fs-extra');
const path = require('path');

async function loadCommands(sock, commands) {
  const commandPath = path.join(__dirname);
  
  async function loadFromDir(dir) {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const itemPath = path.join(dir, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory()) {
        await loadFromDir(itemPath);
      } else if (item.endsWith('.js') && !item.startsWith('_')) {
        try {
          const command = require(itemPath);
          
          if (command.name && typeof command.execute === 'function') {
            commands.set(command.name.toLowerCase(), command);
            
            if (command.aliases && Array.isArray(command.aliases)) {
              for (const alias of command.aliases) {
                commands.set(alias.toLowerCase(), command);
              }
            }
            
            console.log(`✅ Loaded command: ${command.name}`);
          }
        } catch (error) {
          console.error(`❌ Failed to load ${itemPath}:`, error.message);
        }
      }
    }
  }
  
  await loadFromDir(commandPath);
  console.log(`📚 Total commands loaded: ${commands.size}`);
  return commands;
}

module.exports = { loadCommands };
