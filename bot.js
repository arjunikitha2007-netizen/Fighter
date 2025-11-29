const mineflayer = require('mineflayer');

console.log('🤖 Starting 24/7 Minecraft Bot...');

const botConfig = {
    host: 'kalikanundo123.aternos.me',
    port: 57531,
    username: 'TestBot',
    version: "1.20",
    auth: 'offline'
};

let bot = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 3;

function createBot() {
    console.log('🚀 Creating bot...');
    console.log(`🔗 Connecting to: ${botConfig.host}:${botConfig.port}`);

    bot = mineflayer.createBot(botConfig);

    bot.on('login', () => {
        console.log('✅ Bot logged in successfully!');
        reconnectAttempts = 0;
        startKeepAlive();
    });

    bot.on('spawn', () => {
        console.log('✅ Bot spawned in world!');
        console.log('🔄 Starting 24/7 keep-alive activities...');
    });

    bot.on('error', (err) => {
        console.log('❌ Bot error:', err.message);
    });

    bot.on('end', () => {
        console.log('🔌 Bot disconnected');
        stopKeepAlive();
        handleReconnect();
    });

    bot.on('kicked', (reason) => {
        console.log('🚫 Kicked:', JSON.stringify(reason));
        stopKeepAlive();
        
        if (reason && JSON.stringify(reason).includes('throttled')) {
            console.log('💡 Server might be offline. Starting Aternos...');
            reconnectAttempts = 1; // Faster retry for offline server
        }
        handleReconnect();
    });
}

let keepAliveInterval;

function startKeepAlive() {
    // Stop previous interval if exists
    if (keepAliveInterval) clearInterval(keepAliveInterval);
    
    // Keep server alive with random activities
    keepAliveInterval = setInterval(() => {
        if (!bot || !bot.entity) return;
        
        try {
            // Random movements to prevent AFK kick
            const actions = [
                () => bot.setControlState('jump', true),
                () => bot.look(bot.entity.yaw + (Math.random() - 0.5), bot.entity.pitch),
                () => bot.chat(''), // Empty chat to show activity
            ];
            
            const randomAction = actions[Math.floor(Math.random() * actions.length)];
            randomAction();
            
            // Stop jump after 200ms
            if (randomAction === actions[0]) {
                setTimeout(() => {
                    if (bot) bot.setControlState('jump', false);
                }, 200);
            }
            
            console.log('🔄 Keep-alive activity performed');
            
        } catch (error) {
            console.log('⚠️ Keep-alive error:', error.message);
        }
    }, 30000); // Every 30 seconds
}

function stopKeepAlive() {
    if (keepAliveInterval) {
        clearInterval(keepAliveInterval);
        keepAliveInterval = null;
    }
}

function handleReconnect() {
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        console.log('🛑 Max attempts. Waiting 5 minutes...');
        setTimeout(() => {
            reconnectAttempts = 0;
            createBot();
        }, 300000);
        return;
    }

    reconnectAttempts++;
    
    // Shorter delays for 24/7 operation
    const delays = [60000, 120000, 180000]; // 1min, 2min, 3min
    const delay = delays[reconnectAttempts - 1] || 180000;
    
    console.log(`🔄 Reconnecting in ${delay/1000} seconds... (Attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
    
    setTimeout(() => {
        createBot();
    }, delay);
}

// Start immediately
createBot();

// Handle process errors
process.on('uncaughtException', (error) => {
    console.log('⚠️ Unexpected error:', error.message);
    createBot(); // Restart on crash
});
