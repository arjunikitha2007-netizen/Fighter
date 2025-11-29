const mineflayer = require('mineflayer');
const { Vec3 } = require('vec3');

let bot = null;
let isConnected = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;

function createBot() {
    console.log('🤖 Starting Human-Like Minecraft Bot...');
    
    bot = mineflayer.createBot({
        host: process.env.MINECRAFT_SERVER || 'kalikanundo123.aternos.me',
        port: parseInt(process.env.MINECRAFT_PORT) || 57531,
        username: process.env.MINECRAFT_USERNAME || 'Aternos',
        version: process.env.MINECRAFT_VERSION || "1.20.1",
        auth: 'offline',
        checkTimeoutInterval: 30000,
        session: false,
        closeTimeout: 30000
    });

    console.log(`Authentication mode: ${bot.auth}`);
    console.log(`Connecting to ${bot.options.host}:${bot.options.port} as ${bot.options.username}`);

    // Connection event handlers
    bot.on('login', () => {
        console.log('✅ Bot logged in successfully!');
        isConnected = true;
        reconnectAttempts = 0;
    });

    bot.on('end', () => {
        console.log('🔌 Bot disconnected');
        isConnected = false;
        handleReconnect();
    });

    bot.on('error', (err) => {
        console.log('❌ Bot error:', err.message);
        isConnected = false;
        
        if (err.code === 'EPIPE' || err.code === 'ECONNRESET' || err.code === 'ECONNREFUSED') {
            console.log('🌐 Connection lost, attempting reconnect...');
            handleReconnect();
        }
    });

    // Bot event handlers
    bot.on('spawn', () => {
        if (!isBotValid()) return;
        
        console.log('✅ Bot spawned successfully!');
        console.log(`📍 Position: X=${bot.entity.position.x.toFixed(1)}, Y=${bot.entity.position.y.toFixed(1)}, Z=${bot.entity.position.z.toFixed(1)}`);
        console.log(`🎮 Game Mode: ${bot.game.gameMode}`);
        
        setTimeout(() => {
            if (isBotValid()) {
                switchToCreative();
            }
        }, 3000);
    });

    bot.on('game', () => {
        if (!isBotValid()) return;
        console.log(`🎮 Game Mode: ${bot.game.gameMode}`);
    });

    console.log('🚀 Bot initialized and ready!');
}

function isBotValid() {
    return bot && isConnected && bot.entity;
}

function handleReconnect() {
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        console.log('❌ Max reconnection attempts reached. Stopping.');
        return;
    }

    reconnectAttempts++;
    const delay = Math.min(5000 * reconnectAttempts, 30000);
    
    console.log(`🔄 Reconnecting (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}) in ${delay/1000}s...`);
    
    setTimeout(() => {
        if (bot) {
            try {
                bot.end();
            } catch (e) {
                // Ignore errors during cleanup
            }
        }
        createBot();
    }, delay);
}

function switchToCreative() {
    if (!isBotValid()) return;
    
    if (bot.game.gameMode !== 'creative') {
        console.log('⚠️  Detected Survival mode - switching to Creative...');
        bot.chat('/gamemode creative');
        
        setTimeout(() => {
            if (isBotValid()) {
                startBotActivities();
            }
        }, 2000);
    } else {
        console.log('✅ Already in Creative mode');
        startBotActivities();
    }
}

function startBotActivities() {
    if (!isBotValid()) return;
    
    console.log('🎮 Starting human-like gameplay simulation...');
    console.log('🛡️  Enhanced anti-AFK monitoring enabled (8s interval)');
    console.log('🛡️  Gamemode monitoring enabled');
    
    // Start activities after a short delay
    setTimeout(() => {
        startExploring();
    }, 2000);
    
    // Anti-AFK mechanism
    setInterval(() => {
        if (!isBotValid()) return;
        
        try {
            // Simple anti-AFK - look around occasionally
            if (Math.random() > 0.7) {
                bot.look(bot.entity.yaw + (Math.random() - 0.5) * Math.PI, bot.entity.pitch);
            }
            
            // Jump occasionally
            if (Math.random() > 0.9) {
                bot.setControlState('jump', true);
                setTimeout(() => {
                    if (isBotValid()) {
                        bot.setControlState('jump', false);
                    }
                }, 200);
            }
        } catch (error) {
            console.log('⚠️  Anti-AFK error:', error.message);
        }
    }, 8000);
}

function startExploring() {
    if (!isBotValid()) return;
    
    const currentPos = bot.entity.position;
    console.log('🎯 === Activity Session 1 ===');
    console.log('🎲 Selected activity: explore');
    console.log('🚶 Exploring 4 random locations...');
    
    // Generate random locations around current position
    for (let i = 1; i <= 4; i++) {
        const x = currentPos.x + (Math.random() - 0.5) * 40;
        const z = currentPos.z + (Math.random() - 0.5) * 40;
        const y = currentPos.y;
        
        setTimeout(() => {
            if (isBotValid()) {
                moveToLocation(x, y, z, i);
            }
        }, i * 5000);
    }
    
    // Schedule next activity
    setTimeout(() => {
        if (isBotValid()) {
            startExploring();
        }
    }, 30000);
}

function moveToLocation(x, y, z, locationNumber) {
    if (!isBotValid()) {
        console.log('⚠️  Cannot move - bot not connected');
        return;
    }

    try {
        const distance = bot.entity.position.distanceTo(new Vec3(x, y, z));
        console.log(`  → Moving to location ${locationNumber}/4 (${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)}) - ${distance.toFixed(1)} blocks away`);
        
        bot.navigate.to(new Vec3(x, y, z), {
            timeout: 15000,
            range: 2,
            physics: {
                maxSpeed: 0.8,
                jumpSpeed: 0.6
            }
        });
        
        // Stop navigation after 10 seconds to prevent getting stuck
        setTimeout(() => {
            if (isBotValid() && bot.navigate) {
                bot.navigate.stop();
            }
        }, 10000);
        
    } catch (error) {
        console.log('❌ Error during movement:', error.message);
    }
}

// Keep-alive mechanism
setInterval(() => {
    if (isConnected && bot && bot.entity) {
        try {
            // Simple connection check
            const pos = bot.entity.position;
        } catch (error) {
            console.log('⚠️  Connection check failed:', error.message);
            isConnected = false;
            handleReconnect();
        }
    }
}, 15000);

// Start the bot initially
createBot();

// Graceful shutdown handling
process.on('SIGINT', () => {
    console.log('🛑 Shutting down bot gracefully...');
    if (bot) {
        try {
            bot.quit();
        } catch (e) {
            // Ignore errors during shutdown
        }
    }
    process.exit();
});

process.on('uncaughtException', (error) => {
    console.log('🚨 Uncaught exception:', error.message);
    handleReconnect();
});

process.on('unhandledRejection', (reason, promise) => {
    console.log('🚨 Unhandled rejection at:', promise, 'reason:', reason);
});
