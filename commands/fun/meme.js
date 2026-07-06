// ========================================
// Meme Generator Command
// ========================================

const axios = require('axios');

module.exports = {
  name: 'meme',
  aliases: ['memes', 'dank'],
  category: 'fun',
  description: 'Get random memes',
  
  async execute(sock, msg, { sender }) {
    const memes = [
      "😂 *Meme:* When the bot responds faster than your crush",
      "🔥 *Meme:* Me explaining why my code doesn't work",
      "💀 *Meme:* When you deploy at 3 AM and it works first try",
      "😭 *Meme:* The code works but I don't know why",
      "🤣 *Meme:* When someone says \"Just add one more feature\"",
      "😎 *Meme:* Me testing in production like a pro",
      "💀 *Meme:* It's not a bug, it's an undocumented feature",
      "😂 *Meme:* When you fix one bug and create three more",
      "🔥 *Meme:* The bot after 1000+ commands like a boss",
      "🤯 *Meme:* When the user says \"It doesn't work\" but won't explain"
    ];
    
    const randomMeme = memes[Math.floor(Math.random() * memes.length)];
    
    await sock.sendMessage(sender, {
      text: `🎭 *RANDOM MEME*\n\n${randomMeme}\n\nType .meme for more! 😂`
    });
  }
};
