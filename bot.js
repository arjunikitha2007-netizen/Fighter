const mineflayer = require('mineflayer');

console.log('🚀 Starting Minecraft Bot...');

const botConfig = {
    host: 'kalikanundo123.aternos.me',
    port: 57531,
    username: 'TestBot',
    version: '1.20',
    auth: 'offline'
};

console.log(`🔗 Attempting to connect to: ${botConfig.host}:${botConfig.port}`);

const bot = mineflayer.createBot(botConfig);

bot.on('login', () => {
    console.log('✅ SUCCESS: Bot logged in to server!');
});

bot.on('spawn', () => {
    console.log('✅ SUCCESS: Bot spawned in world!');
    console.log('🎯 Bot is now active!');
});

bot.on('error', (err) => {
    console.log('❌ CONNECTION ERROR:', err.message);
    console.log('💡 Make sure your Aternos server is STARTED and online');
});

bot.on('end', (reason) => {
    console.log('🔌 DISCONNECTED:', reason);
    console.log('⏳ Will attempt to reconnect in 30 seconds...');
    
    setTimeout(() => {
        console.log('🔄 Attempting to reconnect...');
        // This will automatically restart the process on Render
    }, 30000);
});

bot.on('kicked', (reason) => {
    console.log('🚫 KICKED FROM SERVER:', reason);
});

// Keep the process alive
process.on('uncaughtException', (error) => {
    console.log('⚠️ Unexpected error:', error.message);
});

console.log('🎯 Bot connection process started...');
