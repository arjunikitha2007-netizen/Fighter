const mineflayer = require('mineflayer');

console.log('🤖 Testing Minecraft Bot...');
console.log('📦 Checking dependencies...');

// Test if all modules are loaded
try {
    console.log('✅ mineflayer loaded successfully');
    const { Vec3 } = require('vec3');
    console.log('✅ vec3 loaded successfully');
    console.log('✅ All dependencies loaded!');
} catch (error) {
    console.log('❌ Dependency error:', error.message);
    process.exit(1);
}

// Simple bot configuration
const botConfig = {
    host: process.env.MINECRAFT_SERVER || 'kalikanundo123.aternos.me',
    port: parseInt(process.env.MINECRAFT_PORT) || 57531,
    username: process.env.MINECRAFT_USERNAME || 'TestBot',
    version: "1.20",
    auth: 'offline'
};

console.log('🚀 Creating bot...');
console.log(`🔗 Connecting to: ${botConfig.host}:${botConfig.port}`);
console.log(`👤 Username: ${botConfig.username}`);
console.log(`🎮 Version: ${botConfig.version}`);

// Create bot
const bot = mineflayer.createBot(botConfig);

// Basic event handlers
bot.on('login', () => {
    console.log('✅ Bot logged in successfully!');
});

bot.on('spawn', () => {
    console.log('✅ Bot spawned in world!');
    console.log(`📍 Position: X=${bot.entity.position.x}, Y=${bot.entity.position.y}, Z=${bot.entity.position.z}`);
});

bot.on('error', (err) => {
    console.log('❌ Bot error:', err.message);
});

bot.on('end', () => {
    console.log('🔌 Bot disconnected');
});

console.log('🎯 Bot initialization complete!');
