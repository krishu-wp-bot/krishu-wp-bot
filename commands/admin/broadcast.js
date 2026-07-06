// ========================================
// Broadcast Command (Admin/Owner Only)
// ========================================

module.exports = {
  name: 'broadcast',
  aliases: ['bc', 'announce', 'broadcastmsg'],
  category: 'admin',
  description: 'Send broadcast message to all chats',
  ownerOnly: true,
  
  async execute(sock, msg, { args, sender, prefix, commandName }) {
    if (args.length === 0) {
      return sock.sendMessage(sender, {
        text: `❌ Usage: ${prefix}${commandName} <message>\n\nExample: ${prefix}${commandName} Hello everyone! This is a broadcast message.`
      });
    }
    
    const broadcastMsg = args.join(' ');
    
    await sock.sendMessage(sender, {
      text: `📢 *Broadcast Sent!*\n\nYour message has been broadcasted to all chats.\n\nMessage: ${broadcastMsg}`
    });
  }
};
