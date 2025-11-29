require("dotenv").config();
const mineflayer = require("mineflayer");
const { pathfinder, Movements, goals } = require("mineflayer-pathfinder");
const Vec3 = require("vec3");
const fs = require("fs");

let config;
try {
  config = JSON.parse(fs.readFileSync("config.json", "utf8"));
} catch (error) {
  console.error("Error reading config.json:", error.message);
  process.exit(1);
}

const botOptions = {
  host: process.env.MINECRAFT_HOST || "kalikanundo123.aternos.me",
  port: parseInt(process.env.MINECRAFT_PORT, 10) || 57531,
  username: process.env.MINECRAFT_USERNAME || "AGENT",
  version: process.env.MINECRAFT_VERSION || "1.20",
  auth: process.env.MINECRAFT_AUTH || "offline",
  profilesFolder: "./auth-cache",
  onMsaCode: (data) => {
    console.log("\n🔐 ===== MICROSOFT AUTHENTICATION REQUIRED =====");
    console.log(`Please open this URL in your browser:`);
    console.log(`   ${data.verification_uri}`);
    console.log(`\nEnter this code:`);
    console.log(`   ${data.user_code}`);
    console.log(
      `\nCode expires in ${Math.floor(data.expires_in / 60)} minutes`,
    );
    console.log("==============================================\n");
  },
};

console.log("🤖 Starting Human-Like Minecraft Bot...");
console.log(`Authentication mode: ${botOptions.auth}`);
console.log(
  `Connecting to ${botOptions.host}:${botOptions.port} as ${botOptions.username}`,
);

let bot;
let mcData;
let Item;
let reconnectAttempts = 0;
const maxReconnectAttempts = 10;
const reconnectDelay = 5000;

let isProcessing = false;
let isSleeping = false;
let lastActivityTime = Date.now();
let activityCount = 0;
let exploreCenter = null;
let antiAFKInterval = null;
let gamemodeCheckInterval = null;
let lastGamemode = null;

// Human-like behavior utilities
function randomDelay(min = 500, max = 3000) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min, max) {
  return Math.random() * (max - min) + min;
}

function randomChoice(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function shouldDoActivity(probability = 0.3) {
  return Math.random() < probability;
}

// Check if bot is in creative mode
function isCreativeMode() {
  if (!bot || !bot.player) return false;
  return bot.player.gamemode === 1;
}

// Get item from creative inventory
async function getItemFromCreativeInventory(itemName, count = 1) {
  if (!isCreativeMode()) {
    return null;
  }

  if (!Item) {
    console.log(`  ⚠️  [Creative] Item class not initialized yet`);
    return null;
  }

  try {
    console.log(
      `  🎨 [Creative] Getting ${count}x ${itemName} from creative inventory...`,
    );

    const itemId = mcData.itemsByName[itemName]?.id;
    if (!itemId) {
      console.log(`  ⚠️  Item ${itemName} not found in registry`);
      return null;
    }

    const item = new Item(itemId, count, null);
    await bot.creative.setInventorySlot(36, item);
    await delay(randomDelay(200, 400));

    const slotItem = bot.inventory.slots[36];
    if (slotItem && slotItem.name === itemName) {
      console.log(`  ✅ [Creative] Got ${count}x ${itemName}`);
      return slotItem;
    }

    return null;
  } catch (error) {
    console.log(`  ⚠️  [Creative] Failed to get ${itemName}: ${error.message}`);
    return null;
  }
}

// Ensure item is in inventory (creative mode or regular)
async function ensureInventoryItem(itemName, minCount = 1) {
  const existingItem = bot.inventory
    .items()
    .find((item) => item.name === itemName);

  if (existingItem && existingItem.count >= minCount) {
    console.log(`  ✅ Already have ${existingItem.count}x ${itemName}`);
    return existingItem;
  }

  if (isCreativeMode()) {
    const neededCount = minCount - (existingItem?.count || 0);
    const creativeItem = await getItemFromCreativeInventory(
      itemName,
      neededCount > 0 ? neededCount : minCount,
    );
    if (creativeItem) {
      return creativeItem;
    }
  }

  return existingItem || null;
}

// Get bed from creative inventory if needed
async function ensureBedInInventory() {
  const bedNames = [
    "red_bed",
    "blue_bed",
    "green_bed",
    "yellow_bed",
    "white_bed",
    "black_bed",
    "brown_bed",
    "cyan_bed",
    "gray_bed",
    "light_blue_bed",
    "light_gray_bed",
    "lime_bed",
    "magenta_bed",
    "orange_bed",
    "pink_bed",
    "purple_bed",
  ];

  const existingBed = bot.inventory
    .items()
    .find((item) => bedNames.some((name) => item.name === name));
  if (existingBed) {
    console.log(`  ✅ Already have ${existingBed.name}`);
    return existingBed;
  }

  if (isCreativeMode()) {
    console.log("  🎨 [Creative] Getting bed from creative inventory...");
    return await getItemFromCreativeInventory("red_bed", 1);
  }

  return null;
}

// Natural head movement simulation
async function lookAround() {
  if (!bot || !bot.entity) return;

  try {
    const yaw = randomFloat(-Math.PI, Math.PI);
    const pitch = randomFloat(-Math.PI / 6, Math.PI / 6);
    await bot.look(yaw, pitch, true);
    await delay(randomDelay(300, 800));
  } catch (error) {
    // Silently handle look errors
  }
}

// Random natural actions with more variety
async function performRandomAction() {
  if (!bot || !bot.entity) return;

  const actions = [
    async () => {
      bot.setControlState("jump", true);
      await delay(randomDelay(100, 300));
      bot.setControlState("jump", false);
    },
    async () => {
      bot.setControlState("sneak", true);
      await delay(randomDelay(500, 1500));
      bot.setControlState("sneak", false);
    },
    async () => {
      await lookAround();
      await delay(randomDelay(200, 600));
      await lookAround();
    },
    async () => {
      await delay(randomDelay(1000, 3000));
      await lookAround();
    },
    async () => {
      const items = bot.inventory.items();
      if (items.length > 0) {
        const randomItem = randomChoice(items);
        try {
          await bot.equip(randomItem, "hand");
          await delay(randomDelay(500, 1200));
        } catch (e) {}
      }
    },
    async () => {
      const pos = bot.entity.position;
      const yaw = bot.entity.yaw + randomFloat(-0.5, 0.5);
      await bot.look(yaw, 0, true);
      await delay(randomDelay(300, 700));
    },
    async () => {
      bot.setControlState("forward", true);
      await delay(randomDelay(200, 500));
      bot.setControlState("forward", false);
    },
    async () => {
      bot.setControlState("back", true);
      await delay(randomDelay(100, 300));
      bot.setControlState("back", false);
    },
    async () => {
      bot.swingArm();
      await delay(randomDelay(300, 600));
    },
  ];

  try {
    const action = randomChoice(actions);
    await action();
  } catch (error) {
    // Silently handle action errors
  }
}

// Auto-switch to creative mode
async function ensureCreativeMode() {
  if (!bot || !bot.player) return;
  
  const currentGamemode = bot.player.gamemode;
  
  if (currentGamemode !== 1) {
    console.log(`⚠️  Detected ${["Survival", "Creative", "Adventure", "Spectator"][currentGamemode]} mode - switching to Creative...`);
    try {
      bot.chat("/gamemode creative");
      await delay(randomDelay(1000, 2000));
    } catch (error) {
      console.log(`  ⚠️  Could not switch gamemode: ${error.message}`);
    }
  }
}

// Monitor gamemode changes
function startGamemodeMonitoring() {
  if (gamemodeCheckInterval) {
    clearInterval(gamemodeCheckInterval);
  }
  
  gamemodeCheckInterval = setInterval(async () => {
    if (!bot || !bot.player) return;
    
    const currentGamemode = bot.player.gamemode;
    
    if (lastGamemode !== null && lastGamemode !== currentGamemode) {
      const gameModeNames = ["Survival", "Creative", "Adventure", "Spectator"];
      console.log(`🔄 Gamemode changed: ${gameModeNames[lastGamemode]} → ${gameModeNames[currentGamemode]}`);
      
      if (currentGamemode !== 1) {
        await ensureCreativeMode();
      } else {
        console.log("✅ Creative mode confirmed!");
      }
    }
    
    lastGamemode = currentGamemode;
  }, 5000);
  
  console.log("🛡️  Gamemode monitoring enabled");
}

// Enhanced Anti-AFK mechanism with more frequent actions
async function antiAFK() {
  const timeSinceLastActivity = Date.now() - lastActivityTime;
  const afkThreshold = randomDelay(15000, 45000);

  if (timeSinceLastActivity > afkThreshold && !isProcessing && !isSleeping) {
    console.log("💭 Performing anti-AFK action...");
    await performRandomAction();
    lastActivityTime = Date.now();
  }
}

function startAntiAFKMonitoring() {
  if (antiAFKInterval) {
    clearInterval(antiAFKInterval);
  }
  antiAFKInterval = setInterval(antiAFK, 8000);
  console.log("🛡️  Enhanced anti-AFK monitoring enabled (8s interval)\n");
}

function createBot() {
  bot = mineflayer.createBot(botOptions);
  setupBotHandlers();
  return bot;
}

createBot();

function setupBotHandlers() {
  bot.loadPlugin(pathfinder);

  bot.on("spawn", () => {
    console.log("✅ Bot spawned successfully!");
    const spawnPos = bot.entity.position;
    console.log(
      `📍 Position: X=${spawnPos.x.toFixed(1)}, Y=${spawnPos.y.toFixed(1)}, Z=${spawnPos.z.toFixed(1)}`,
    );

    const gameMode = bot.player.gamemode;
    const gameModeNames = ["Survival", "Creative", "Adventure", "Spectator"];
    console.log(`🎮 Game Mode: ${gameModeNames[gameMode] || gameMode}`);

    if (isCreativeMode()) {
      console.log("🎨 Creative mode detected - Full inventory access enabled!");
    } else {
      console.log("⚠️  Not in creative mode - will auto-switch in 3 seconds...");
      setTimeout(() => ensureCreativeMode(), 3000);
    }

    reconnectAttempts = 0;
    exploreCenter = spawnPos.clone();
    lastGamemode = bot.player.gamemode;

    mcData = require("minecraft-data")(bot.version);
    Item = require("prismarine-item")(bot.version);
    const defaultMove = new Movements(bot, mcData);
    defaultMove.canDig = config.canDig !== undefined ? config.canDig : false;
    defaultMove.allow1by1towers = false;
    defaultMove.scafoldingBlocks = [];
    bot.pathfinder.setMovements(defaultMove);

    setTimeout(
      () => {
        console.log("🎮 Starting human-like gameplay simulation...\n");
        startAntiAFKMonitoring();
        startGamemodeMonitoring();
        startHumanLikeActivity();
      },
      randomDelay(2000, 5000),
    );
  });

  bot.on("error", (err) => {
    console.error("❌ Bot error:", err.message);
    if (
      err.message.includes("Invalid credentials") ||
      err.message.includes("authentication")
    ) {
      console.error("\n⚠️  AUTHENTICATION ERROR");
      console.error(
        "For Aternos servers, set MINECRAFT_AUTH=microsoft in .env",
      );
      process.exit(1);
    }
  });

  bot.on("kicked", (reason) => {
    console.log("⚠️  Bot was kicked:", reason);
    attemptReconnect();
  });

  bot.on("end", () => {
    console.log("🔌 Bot disconnected");
    attemptReconnect();
  });

  bot.on("death", () => {
    console.log("💀 Bot died! Respawning...");
    exploreCenter = null;
  });

  bot.on("chat", (username, message) => {
    console.log(`💬 <${username}> ${message}`);
    lastActivityTime = Date.now();
  });

  bot.on("physicsTick", () => {
    if (!isProcessing && !isSleeping && shouldDoActivity(0.002)) {
      lookAround().catch(() => {});
    }
  });

  bot.on("playerUpdated", (player) => {
    if (player === bot.player) {
      const currentGamemode = bot.player.gamemode;
      if (lastGamemode !== null && lastGamemode !== currentGamemode) {
        const gameModeNames = ["Survival", "Creative", "Adventure", "Spectator"];
        console.log(`🔄 Gamemode updated: ${gameModeNames[currentGamemode]}`);
        lastGamemode = currentGamemode;
        
        if (currentGamemode !== 1) {
          setTimeout(() => ensureCreativeMode(), 2000);
        }
      }
    }
  });
}

function attemptReconnect() {
  if (reconnectAttempts >= maxReconnectAttempts) {
    console.error(
      `❌ Failed to reconnect after ${maxReconnectAttempts} attempts. Exiting.`,
    );
    process.exit(1);
  }

  if (antiAFKInterval) {
    clearInterval(antiAFKInterval);
    antiAFKInterval = null;
  }
  
  if (gamemodeCheckInterval) {
    clearInterval(gamemodeCheckInterval);
    gamemodeCheckInterval = null;
  }

  reconnectAttempts++;
  console.log(
    `🔄 Reconnecting (${reconnectAttempts}/${maxReconnectAttempts}) in ${reconnectDelay / 1000}s...`,
  );

  setTimeout(() => {
    isProcessing = false;
    isSleeping = false;
    createBot();
  }, reconnectDelay);
}

async function startHumanLikeActivity() {
  if (isProcessing || isSleeping) return;
  isProcessing = true;
  lastActivityTime = Date.now();

  try {
    activityCount++;
    console.log(`\n🎯 === Activity Session ${activityCount} ===`);

    if (config.autoSleep && isNightTime() && !isSleeping) {
      isProcessing = false;
      await tryToSleep();
      return;
    }

    const activity = randomChoice([
      "explore",
      "explore",
      "explore",
      "build",
      "idle",
      "interact",
    ]);

    console.log(`🎲 Selected activity: ${activity}`);

    switch (activity) {
      case "explore":
        await exploreRandomly();
        break;
      case "build":
        await buildActivity();
        break;
      case "idle":
        await idleActivity();
        break;
      case "interact":
        await chestActivity();
        break;
    }

    const thinkingTime = randomDelay(2000, 8000);
    console.log(`💭 Taking a ${(thinkingTime / 1000).toFixed(1)}s break...\n`);
    await delay(thinkingTime);

    lastActivityTime = Date.now();
    isProcessing = false;

    setImmediate(() => startHumanLikeActivity());
  } catch (error) {
    console.error("⚠️  Error in activity:", error.message);
    isProcessing = false;
    lastActivityTime = Date.now();
    setTimeout(startHumanLikeActivity, randomDelay(5000, 10000));
  }
}

async function exploreRandomly() {
  if (!exploreCenter) {
    exploreCenter = bot.entity.position.clone();
  }

  const numStops = randomDelay(2, 6);
  console.log(`🚶 Exploring ${numStops} random locations...`);

  for (let i = 0; i < numStops; i++) {
    if (config.autoSleep && isNightTime() && !isSleeping) {
      console.log("🌙 Night detected during exploration");
      return;
    }

    const maxDistance = config.exploreRadius || 20;
    const angle = randomFloat(0, Math.PI * 2);
    const distance = randomFloat(5, maxDistance);

    const targetX = exploreCenter.x + Math.cos(angle) * distance;
    const targetZ = exploreCenter.z + Math.sin(angle) * distance;
    const targetY = exploreCenter.y;

    const jitterX = randomFloat(-1, 1);
    const jitterZ = randomFloat(-1, 1);

    const finalX = targetX + jitterX;
    const finalZ = targetZ + jitterZ;

    console.log(
      `  → Moving to location ${i + 1}/${numStops} (${finalX.toFixed(1)}, ${targetY.toFixed(1)}, ${finalZ.toFixed(1)})`,
    );

    const tolerance = randomFloat(1.5, 3);
    const goal = new goals.GoalNear(finalX, targetY, finalZ, tolerance);
    bot.pathfinder.setGoal(goal);

    const walkingActions = setInterval(
      async () => {
        if (shouldDoActivity(0.15)) {
          bot.setControlState("jump", true);
          setTimeout(
            () => bot.setControlState("jump", false),
            randomDelay(100, 200),
          );
        }
        if (shouldDoActivity(0.1)) {
          lookAround().catch(() => {});
        }
      },
      randomDelay(800, 2000),
    );

    await waitForArrival(
      finalX,
      targetY,
      finalZ,
      tolerance + 2,
      randomDelay(8000, 15000),
    );

    clearInterval(walkingActions);
    bot.pathfinder.setGoal(null);
    bot.setControlState("jump", false);

    if (shouldDoActivity(0.6)) {
      console.log("  👀 Looking around...");
      await lookAround();
      await delay(randomDelay(500, 2000));
      await lookAround();
    }

    if (shouldDoActivity(0.3)) {
      await performRandomAction();
    }

    await delay(randomDelay(1000, 3000));
  }

  console.log("✅ Exploration complete");
}

async function buildActivity() {
  if (!config.buildingEnabled) {
    console.log("🏗️  Building disabled in config");
    await idleActivity();
    return;
  }

  const numBlocks = randomDelay(1, 3);
  console.log(`🏗️  Placing and breaking ${numBlocks} block(s)...`);

  for (let i = 0; i < numBlocks; i++) {
    await lookAround();
    await delay(randomDelay(300, 800));

    await placeAndBreakBlock();

    if (i < numBlocks - 1) {
      await delay(randomDelay(2000, 5000));
    }
  }
}

async function idleActivity() {
  const idleTime = randomDelay(3000, 10000);
  console.log(`😴 Idle for ${(idleTime / 1000).toFixed(1)}s...`);

  const actions = randomDelay(2, 4);
  for (let i = 0; i < actions; i++) {
    await lookAround();
    await delay(randomDelay(1000, 3000));

    if (shouldDoActivity(0.4)) {
      await performRandomAction();
    }
  }
}

async function chestActivity() {
  if (!config.chestInteraction?.enabled) {
    console.log("🗄️  Chest interaction disabled");
    await idleActivity();
    return;
  }

  console.log("🗄️  Looking for chest...");
  await chestInteraction();
}

async function waitForArrival(x, y, z, threshold, timeout = 10000) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const checkArrival = setInterval(() => {
      const distance = bot.entity.position.distanceTo({ x, y, z });
      const elapsed = Date.now() - startTime;

      if (distance < threshold || elapsed > timeout) {
        clearInterval(checkArrival);
        resolve();
      }
    }, 100);
  });
}

async function placeAndBreakBlock() {
  const blockType = config.blockType || "dirt";
  let placedBlockPosition = null;

  try {
    const item = await ensureInventoryItem(blockType, 1);

    if (!item) {
      console.log(`  ⚠️  No ${blockType} available`);
      return;
    }

    await bot.equip(item, "hand");
    await delay(randomDelay(200, 500));

    const pos = bot.entity.position.floored();

    const directions = [
      {
        pos: new Vec3(pos.x + 1, pos.y, pos.z),
        ref: new Vec3(pos.x + 1, pos.y - 1, pos.z),
        vec: new Vec3(0, 1, 0),
      },
      {
        pos: new Vec3(pos.x - 1, pos.y, pos.z),
        ref: new Vec3(pos.x - 1, pos.y - 1, pos.z),
        vec: new Vec3(0, 1, 0),
      },
      {
        pos: new Vec3(pos.x, pos.y, pos.z + 1),
        ref: new Vec3(pos.x, pos.y - 1, pos.z + 1),
        vec: new Vec3(0, 1, 0),
      },
      {
        pos: new Vec3(pos.x, pos.y, pos.z - 1),
        ref: new Vec3(pos.x, pos.y - 1, pos.z - 1),
        vec: new Vec3(0, 1, 0),
      },
    ];

    for (let i = directions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [directions[i], directions[j]] = [directions[j], directions[i]];
    }

    let placed = false;
    for (const attempt of directions) {
      const targetBlock = bot.blockAt(attempt.pos);
      const referenceBlock = bot.blockAt(attempt.ref);

      if (targetBlock?.name === "air" && referenceBlock?.name !== "air") {
        try {
          await bot.placeBlock(referenceBlock, attempt.vec);
          await delay(randomDelay(400, 800));

          const verifyBlock = bot.blockAt(attempt.pos);
          if (verifyBlock?.name === blockType) {
            console.log(`  ✅ Placed ${blockType} block`);
            placedBlockPosition = attempt.pos;
            placed = true;
            break;
          }
        } catch (err) {
          // Try next direction
        }
      }
    }

    if (!placed) return;

    await delay(randomDelay(1000, 3000));
    await lookAround();

    const placedBlock = bot.blockAt(placedBlockPosition);
    if (
      placedBlock &&
      placedBlock.name !== "air" &&
      bot.canDigBlock(placedBlock)
    ) {
      try {
        await bot.dig(placedBlock);
        console.log(`  ✅ Broke ${blockType} block`);
      } catch (err) {
        console.log(`  ⚠️  Failed to break: ${err.message}`);
      }
    }
  } catch (error) {
    // Silently handle placement errors
  }
}

async function chestInteraction() {
  if (!config.chestInteraction?.enabled) return;

  try {
    const chestNames = ["chest", "trapped_chest"];
    let chestBlock = bot.findBlock({
      matching: (block) => chestNames.includes(block.name),
      maxDistance: 32,
    });

    if (!chestBlock) {
      console.log("  ℹ️  No chest found nearby");
      return;
    }

    console.log(`  ✅ Found chest`);

    const distance = bot.entity.position.distanceTo(chestBlock.position);
    if (distance > 3) {
      const goal = new goals.GoalNear(
        chestBlock.position.x,
        chestBlock.position.y,
        chestBlock.position.z,
        2,
      );
      bot.pathfinder.setGoal(goal);
      await waitForArrival(
        chestBlock.position.x,
        chestBlock.position.y,
        chestBlock.position.z,
        3,
        10000,
      );
      bot.pathfinder.setGoal(null);
    }

    await delay(randomDelay(500, 1000));
    await lookAround();

    const chest = await bot.openChest(chestBlock);
    await delay(randomDelay(800, 1500));

    if (config.chestInteraction.depositItems && shouldDoActivity(0.5)) {
      for (const [itemName, count] of Object.entries(
        config.chestInteraction.depositItems,
      )) {
        const items = bot.inventory
          .items()
          .filter((item) => item.name.includes(itemName));
        if (items.length > 0) {
          const item = items[0];
          const amount = Math.min(count, item.count);
          await chest.deposit(item.type, null, amount);
          console.log(`  📥 Deposited ${amount}x ${itemName}`);
          await delay(randomDelay(400, 900));
        }
      }
    }

    if (config.chestInteraction.withdrawItems && shouldDoActivity(0.5)) {
      for (const [itemName, count] of Object.entries(
        config.chestInteraction.withdrawItems,
      )) {
        const chestItems = chest
          .containerItems()
          .filter((item) => item.name.includes(itemName));
        if (chestItems.length > 0) {
          const item = chestItems[0];
          const amount = Math.min(count, item.count);
          await chest.withdraw(item.type, null, amount);
          console.log(`  📤 Withdrew ${amount}x ${itemName}`);
          await delay(randomDelay(400, 900));
        }
      }
    }

    await delay(randomDelay(500, 1200));
    chest.close();
    console.log("  🔒 Closed chest");
  } catch (error) {
    console.log(`  ⚠️  Chest error: ${error.message}`);
  }
}

function isNightTime() {
  if (!bot.time || bot.time.timeOfDay === undefined) return false;
  const timeOfDay = bot.time.timeOfDay;
  return timeOfDay >= 13000 && timeOfDay < 23000;
}

async function tryToSleep() {
  if (isSleeping) return;

  try {
    isSleeping = true;
    isProcessing = true;
    bot.pathfinder.setGoal(null);

    console.log("🌙 Night time - attempting to sleep...");

    const bedNames = [
      "red_bed",
      "blue_bed",
      "green_bed",
      "yellow_bed",
      "white_bed",
      "black_bed",
      "brown_bed",
      "cyan_bed",
      "gray_bed",
      "light_blue_bed",
      "light_gray_bed",
      "lime_bed",
      "magenta_bed",
      "orange_bed",
      "pink_bed",
      "purple_bed",
    ];

    let bedBlock = bot.findBlock({
      matching: (block) => bedNames.includes(block.name),
      maxDistance: 64,
    });

    if (bedBlock) {
      console.log(`  ✅ Found bed at distance ${bot.entity.position.distanceTo(bedBlock.position).toFixed(1)} blocks`);
    }

    if (!bedBlock) {
      console.log("  🛏️  No bed found nearby - placing one from creative inventory...");
      
      if (!isCreativeMode()) {
        console.log("  ⚠️  Not in creative mode, switching...");
        await ensureCreativeMode();
        await delay(2000);
      }
      
      const bedItem = await ensureBedInInventory();

      if (bedItem) {
        console.log("  📦 Placing bed next to bot...");
        const pos = bot.entity.position.floored();

        const bedPlaceDirections = [
          { ref: new Vec3(pos.x + 1, pos.y - 1, pos.z), vec: new Vec3(0, 1, 0) },
          { ref: new Vec3(pos.x - 1, pos.y - 1, pos.z), vec: new Vec3(0, 1, 0) },
          { ref: new Vec3(pos.x, pos.y - 1, pos.z + 1), vec: new Vec3(0, 1, 0) },
          { ref: new Vec3(pos.x, pos.y - 1, pos.z - 1), vec: new Vec3(0, 1, 0) },
        ];

        let bedPlaced = false;
        
        for (const direction of bedPlaceDirections) {
          try {
            await bot.equip(bedItem, "hand");
            await delay(randomDelay(300, 600));

            const refBlock = bot.blockAt(direction.ref);
            if (refBlock && refBlock.name !== "air") {
              await bot.placeBlock(refBlock, direction.vec);
              await delay(800);
              
              bedBlock = bot.findBlock({
                matching: (block) => bedNames.includes(block.name),
                maxDistance: 5,
              });
              
              if (bedBlock) {
                console.log("  ✅ Bed placed successfully!");
                bedPlaced = true;
                break;
              }
            }
          } catch (err) {
            continue;
          }
        }
        
        if (!bedPlaced) {
          console.log("  ⚠️  Could not place bed in any direction");
        }
      } else {
        console.log("  ⚠️  Could not get bed from inventory");
      }
    }

    if (bedBlock) {
      const distance = bot.entity.position.distanceTo(bedBlock.position);
      
      if (distance > 3) {
        console.log(`  🚶 Walking to bed (${distance.toFixed(1)} blocks away)...`);
        const goal = new goals.GoalBlock(
          bedBlock.position.x,
          bedBlock.position.y,
          bedBlock.position.z,
        );
        bot.pathfinder.setGoal(goal);
        await waitForArrival(
          bedBlock.position.x,
          bedBlock.position.y,
          bedBlock.position.z,
          3,
          10000,
        );
        bot.pathfinder.setGoal(null);
        await delay(500);
      }

      console.log("  💤 Attempting to sleep in bed...");

      try {
        await bot.sleep(bedBlock);
        console.log("  ✅ Sleeping... will wake at dawn");

        bot.once("wake", () => {
          console.log("  ☀️  Good morning!");
          isSleeping = false;
          isProcessing = false;
          lastActivityTime = Date.now();
          setTimeout(() => startHumanLikeActivity(), randomDelay(1000, 3000));
        });
      } catch (error) {
        console.log(`  ⚠️  Sleep failed: ${error.message}`);
        isSleeping = false;
        isProcessing = false;
        setTimeout(startHumanLikeActivity, randomDelay(2000, 5000));
      }
    } else {
      console.log("  ⚠️  No bed available - continuing activities");
      isSleeping = false;
      isProcessing = false;
      setTimeout(startHumanLikeActivity, randomDelay(2000, 5000));
    }
  } catch (error) {
    console.log(`  ⚠️  Sleep error: ${error.message}`);
    isSleeping = false;
    isProcessing = false;
    setTimeout(startHumanLikeActivity, randomDelay(2000, 5000));
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

process.on("SIGINT", () => {
  console.log("\n👋 Shutting down bot...");
  if (antiAFKInterval) {
    clearInterval(antiAFKInterval);
  }
  if (gamemodeCheckInterval) {
    clearInterval(gamemodeCheckInterval);
  }
  if (bot) bot.quit();
  process.exit(0);
});

console.log("🚀 Bot initialized and ready!\n");
