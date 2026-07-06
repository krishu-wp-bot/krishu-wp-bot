// ========================================
// Ping Command - Check Bot Response
// ========================================

module.exports = {
  name: 'ping',
  aliases: ['p', 'speed', 'latency'],
  category: 'utility',
  description: 'Check bot response time',
  
  async execute(sock, msg, { sender }) {
    const start = Date.now();
    const response = await sock.sendMessage(sender, {
      text: '🏓 *Pinging...*'
    });
    const end = Date.now();
    const latency = end - start;
    
    await sock.sendMessage(sender, {
      text: `🏓 *PONG!*\n\n📡 Response Time: ${latency}ms\n⚡ Status: Connected\n✅ Bot is running smoothly!`
    });
  }
};
