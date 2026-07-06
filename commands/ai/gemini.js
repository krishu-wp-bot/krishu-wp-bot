// ========================================
// Gemini AI Chat Command
// ========================================

const axios = require('axios');

module.exports = {
  name: 'gemini',
  aliases: ['ai', 'ask', 'chat'],
  category: 'ai',
  description: 'Chat with Gemini AI',
  
  async execute(sock, msg, { args, sender, prefix, commandName }) {
    if (args.length === 0) {
      return sock.sendMessage(sender, {
        text: `❌ Usage: ${prefix}${commandName} <your question>\n\nExample: ${prefix}${commandName} What is the capital of France?`
      });
    }
    
    const query = args.join(' ');
    
    await sock.sendMessage(sender, {
      text: `🤔 *Thinking...*\n\nAnalyzing your question: "${query}"`
    });
    
    try {
      const response = await axios.get(`https://api.gemini.com/v1/chat?q=${encodeURIComponent(query)}`);
      const answer = response.data.answer || 'I am thinking...';
      
      await sock.sendMessage(sender, {
        text: `🤖 *Gemini AI Response*\n\n💬 *You:* ${query}\n\n📝 *Answer:* ${answer}\n\nPowered by Gemini AI 🤖`
      });
    } catch (error) {
      await sock.sendMessage(sender, {
        text: `🤖 *Gemini AI*\n\n💬 *You:* ${query}\n\n📝 *Answer:* This is a simulated response. For full AI integration, add a valid API key.\n\n*Demo Mode Active*`
      });
    }
  }
};
