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

function createBot() {
    console.log('🚀 Attempting to connect to Aternos server...');
    console.log('💡 Make sure server is STARTED at aternos.org');

    bot = mineflayer.createBot(botConfig);

    bot.on('login', () => {
        console.log('🎉 SUCCESS! Bot connected and logged in!');
        console.log('✅ Server is ONLINE');
    });

    bot.on('spawn', () => {
        console.log('✅ Bot spawned in world!');
        console.log('🔄 24/7 keep-alive activated');
    });

    bot.on('error', (err) => {
        console.log('❌ Connection error:', err.message);
    });

    bot.on('end', () => {
        console.log('🔌 Disconnected - Server might have stopped');
        setTimeout(createBot, 60000); // Retry in 1 minute
    });

    bot.on('kicked', (reason) => {
        console.log('🚫 Kicked:', JSON.stringify(reason));
        console.log('💡 Server is likely OFFLINE - Go to aternos.org and START it');
        setTimeout(createBot, 120000); // Retry in 2 minutes
    });
}

// Start bot and keep retrying forever
createBot();

// Keep process alive
setInterval(() => {
    console.log('⏰ Bot process active - Waiting for server to come online...');
}, 300000); // Log every 5 minutes
