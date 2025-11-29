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

let bot = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

function createBot() {
    console.log('🚀 Creating bot...');
    console.log(`🔗 Connecting to: ${botConfig.host}:${botConfig.port}`);
    console.log(`👤 Username: ${botConfig.username}`);
    console.log(`🎮 Version: ${botConfig.version}`);

    // Create bot
    bot = mineflayer.createBot(botConfig);

    // Basic event handlers
    bot.on('login', () => {
        console.log('✅ Bot logged in successfully!');
        reconnectAttempts = 0; // Reset counter on successful login
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
        handleReconnect();
    });

    bot.on('kicked', (reason) => {
        console.log('🚫 Kicked from server:', JSON.stringify(reason));
        
        if (reason && reason.text && reason.text.includes('throttled')) {
            console.log('⚠️  Aternos throttling detected - increasing wait time');
            // Special longer wait for throttling
            reconnectAttempts = Math.max(reconnectAttempts, 2);
        }
        handleReconnect();
    });

    console.log('🎯 Bot initialization complete!');
}

function handleReconnect() {
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        console.log('🛑 Max reconnection attempts reached. Stopping for 10 minutes.');
        console.log('💡 Make sure your Aternos server is STARTED and online');
        
        // Wait 10 minutes before trying again
        setTimeout(() => {
            reconnectAttempts = 0;
            createBot();
        }, 600000);
        return;
    }

    reconnectAttempts++;
    
    // Much longer delays for Aternos: 2 min, 5 min, 10 min, 15 min, 20 min
    const delays = [120000, 300000, 600000, 900000, 1200000];
    const delay = delays[reconnectAttempts - 1] || 1200000;
    
    console.log(`🔄 Reconnecting in ${delay/60000} minutes... (Attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
    console.log('💡 TIP: Start your Aternos server manually at aternos.org');
    
    setTimeout(() => {
        createBot();
    }, delay);
}

// Start the bot initially
createBot();
