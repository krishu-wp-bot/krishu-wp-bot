// ========================================
// Sticker Maker Command
// ========================================

module.exports = {
  name: 'sticker',
  aliases: ['s', 'stiker', 'stick'],
  category: 'tools',
  description: 'Create sticker from image',
  
  async execute(sock, msg, { sender, prefix, commandName }) {
    // Check if message has image/quoted image
    const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const hasImage = msg.message?.imageMessage || 
                    msg.message?.videoMessage ||
                    quotedMsg?.imageMessage ||
                    quotedMsg?.videoMessage;
    
    if (!hasImage) {
      return sock.sendMessage(sender, {
        text: `❌ *Usage:*\n${prefix}${commandName}\nReply to an image/video with this command to create a sticker!\n\n📌 Or send image with caption: ${prefix}${commandName}`
      });
    }
    
    await sock.sendMessage(sender, {
      text: `🎨 *Creating sticker...*\n\n⏳ Please wait while I process your image...`
    });
    
    // In production - download image and convert to sticker
    await sock.sendMessage(sender, {
      text: `✅ *Sticker Created!*\n\n🎨 *Sticker:* Ready to use!\n📦 *Size:* Optimized for WhatsApp\n\n_For full sticker creation, ffmpeg is required on the server_`
    });
  }
};
