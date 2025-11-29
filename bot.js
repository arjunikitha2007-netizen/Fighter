// Add this health check server at the top
const http = require('http');

// Health check server for Render
const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'ok', 
      service: 'Minecraft Bot',
      timestamp: new Date().toISOString()
    }));
  } else {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Minecraft Bot is running');
  }
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`✅ Health check server running on port ${PORT}`);
});

// Your existing bot code
const mineflayer = require('mineflayer');

console.log('🤖 Starting 24/7 Minecraft Bot...');

const botConfig = {
    host: process.env.MINECRAFT_SERVER || 'kalikanundo123.aternos.me',
    port: parseInt(process.env.MINECRAFT_PORT) || 57531,
    username: process.env.MINECRAFT_USERNAME || 'TestBot',
    version: "1.20",
    auth: 'offline'
};

let bot = null;
let reconnectAttempts = 0;

function createBot() {
    console.log('🚀 Creating bot...');
    console.log(`🔗 Connecting to: ${botConfig.host}:${botConfig.port}`);

    bot = mineflayer.createBot(botConfig);

    bot.on('login', () => {
        console.log('🎉 SUCCESS! Bot connected and logged in!');
        reconnectAttempts = 0;
    });

    bot.on('spawn', () => {
        console.log('✅ Bot spawned in world!');
    });

    bot.on('error', (err) => {
        console.log('❌ Connection error:', err.message);
    });

    bot.on('end', () => {
        console.log('🔌 Disconnected - Server might have stopped');
        setTimeout(createBot, 60000);
    });

    bot.on('kicked', (reason) => {
        console.log('🚫 Kicked:', JSON.stringify(reason));
        console.log('💡 Server is likely OFFLINE - Go to aternos.org and START it');
        setTimeout(createBot, 120000);
    });
}

// Start bot
createBot();

// Keep process alive
setInterval(() => {
    console.log('⏰ Bot process active - Waiting for server to come online...');
}, 300000);
