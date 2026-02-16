// Core game logic for VAULT
// Handles XP calculations, stat progression, loot drops, etc.

// Stat configuration
const STATS = {
  VIT: { name: 'Vitality', color: '#ff4444', icon: '❤️' },    // Health, workouts, sleep
  FOC: { name: 'Focus', color: '#4444ff', icon: '🧠' },       // Deep work, reading
  CRE: { name: 'Creativity', color: '#ff44ff', icon: '🎨' },  // Art, writing, projects
  SOC: { name: 'Social', color: '#44ff44', icon: '👥' },      // Friends, family, networking
  ORG: { name: 'Organization', color: '#ffaa00', icon: '📋' }   // Chores, admin, planning
};

// Level formula: XP needed = base * (level ^ exponent)
const LEVEL_CONFIG = {
  baseXP: 100,
  exponent: 1.5,
  maxLevel: 99
};

// Quest difficulty multipliers
const QUEST_DIFFICULTY = {
  trivial: { xp: 5, time: 5, label: 'Trivial' },      // < 5 min
  easy: { xp: 25, time: 15, label: 'Easy' },         // 5-15 min
  medium: { xp: 50, time: 30, label: 'Medium' },    // 15-30 min
  hard: { xp: 100, time: 60, label: 'Hard' },       // 30-60 min
  epic: { xp: 250, time: 120, label: 'Epic' }        // 60+ min
};

// Resource types (Fallout shelter theme)
const RESOURCES = {
  scrap: { name: 'Scrap', icon: '🔧', description: 'General building material' },
  food: { name: 'Food', icon: '🥫', description: 'Sustenance for vault dwellers' },
  water: { name: 'Water', icon: '💧', description: 'Clean drinking water' },
  power: { name: 'Power', icon: '⚡', description: 'Electricity for rooms' },
  meds: { name: 'Medkits', icon: '💊', description: 'Medical supplies' },
  data: { name: 'Data', icon: '💾', description: 'Research and blueprints' }
};

// Vault rooms and their requirements
const VAULT_ROOMS = {
  quarters: {
    name: 'Living Quarters',
    description: 'Where dwellers rest',
    baseCost: { scrap: 50, power: 10 },
    upgrades: [
      { level: 1, cost: { scrap: 50, power: 10 }, bonus: { VIT: 0.1 } },
      { level: 2, cost: { scrap: 150, power: 25 }, bonus: { VIT: 0.15 } },
      { level: 3, cost: { scrap: 400, power: 60 }, bonus: { VIT: 0.25 } }
    ]
  },
  generator: {
    name: 'Generator',
    description: 'Powers the vault',
    baseCost: { scrap: 100 },
    upgrades: [
      { level: 1, cost: { scrap: 100 }, powerGen: 10 },
      { level: 2, cost: { scrap: 250, data: 20 }, powerGen: 25 },
      { level: 3, cost: { scrap: 600, data: 50 }, powerGen: 60 }
    ]
  },
  waterPurifier: {
    name: 'Water Purifier',
    description: 'Clean water production',
    baseCost: { scrap: 80 },
    upgrades: [
      { level: 1, cost: { scrap: 80 }, waterGen: 10 },
      { level: 2, cost: { scrap: 200, data: 15 }, waterGen: 25 },
      { level: 3, cost: { scrap: 500, data: 40 }, waterGen: 60 }
    ]
  },
  garden: {
    name: 'Hydroponics Garden',
    description: 'Food production',
    baseCost: { scrap: 120, water: 50 },
    upgrades: [
      { level: 1, cost: { scrap: 120, water: 50 }, foodGen: 10, bonus: { VIT: 0.05 } },
      { level: 2, cost: { scrap: 300, water: 100, data: 25 }, foodGen: 25, bonus: { VIT: 0.1 } },
      { level: 3, cost: { scrap: 800, water: 250, data: 60 }, foodGen: 60, bonus: { VIT: 0.2 } }
    ]
  },
  workshop: {
    name: 'Workshop',
    description: 'Crafting and repairs',
    baseCost: { scrap: 150 },
    upgrades: [
      { level: 1, cost: { scrap: 150 }, bonus: { ORG: 0.1 } },
      { level: 2, cost: { scrap: 350, data: 30 }, bonus: { ORG: 0.2, CRE: 0.1 } },
      { level: 3, cost: { scrap: 900, data: 80 }, bonus: { ORG: 0.35, CRE: 0.2 } }
    ]
  },
  medbay: {
    name: 'Medbay',
    description: 'Healing and wellness',
    baseCost: { scrap: 200, power: 20 },
    upgrades: [
      { level: 1, cost: { scrap: 200, power: 20 }, bonus: { VIT: 0.15 } },
      { level: 2, cost: { scrap: 500, power: 50, data: 40 }, bonus: { VIT: 0.3 } },
      { level: 3, cost: { scrap: 1200, power: 120, data: 100 }, bonus: { VIT: 0.5 } }
    ]
  },
  radio: {
    name: 'Radio Room',
    description: 'Communication and recruitment',
    baseCost: { scrap: 180, power: 30 },
    upgrades: [
      { level: 1, cost: { scrap: 180, power: 30 }, bonus: { SOC: 0.15 } },
      { level: 2, cost: { scrap: 450, power: 70, data: 50 }, bonus: { SOC: 0.3 } },
      { level: 3, cost: { scrap: 1000, power: 150, data: 120 }, bonus: { SOC: 0.5 } }
    ]
  },
  library: {
    name: 'Library',
    description: 'Knowledge and learning',
    baseCost: { scrap: 160, power: 25 },
    upgrades: [
      { level: 1, cost: { scrap: 160, power: 25 }, bonus: { FOC: 0.15 } },
      { level: 2, cost: { scrap: 400, power: 60, data: 60 }, bonus: { FOC: 0.3, CRE: 0.1 } },
      { level: 3, cost: { scrap: 1000, power: 140, data: 150 }, bonus: { FOC: 0.5, CRE: 0.2 } }
    ]
  }
};

// Loot table for random drops
const LOOT_TABLE = {
  common: [
    { id: 'scrap_small', name: 'Scrap Metal', type: 'resource', resource: 'scrap', amount: [5, 15] },
    { id: 'food_can', name: 'Canned Food', type: 'resource', resource: 'food', amount: [1, 3] },
    { id: 'water_bottle', name: 'Purified Water', type: 'resource', resource: 'water', amount: [1, 3] }
  ],
  uncommon: [
    { id: 'scrap_large', name: 'Scrap Pile', type: 'resource', resource: 'scrap', amount: [20, 50] },
    { id: 'battery', name: 'Battery', type: 'resource', resource: 'power', amount: [5, 15] },
    { id: 'bandages', name: 'Bandages', type: 'resource', resource: 'meds', amount: [1, 2] },
    { id: 'usb_drive', name: 'USB Drive', type: 'resource', resource: 'data', amount: [5, 20] }
  ],
  rare: [
    { id: 'toolbox', name: 'Toolbox', type: 'resource', resource: 'scrap', amount: [50, 100] },
    { id: 'generator_part', name: 'Generator Part', type: 'unlock', unlocks: 'generator_efficiency' },
    { id: 'blueprint', name: 'Blueprint', type: 'resource', resource: 'data', amount: [25, 50] }
  ],
  epic: [
    { id: 'fusion_core', name: 'Fusion Core', type: 'resource', resource: 'power', amount: [50, 100] },
    { id: 'vault_suit', name: 'Vault Suit', type: 'cosmetic', slot: 'outfit' },
    { id: 'pet_dog', name: 'Dogmeat', type: 'companion', bonus: { VIT: 0.1, SOC: 0.1 } }
  ],
  legendary: [
    { id: 'power_armor', name: 'Power Armor', type: 'cosmetic', slot: 'outfit', bonus: { VIT: 0.3 } },
    { id: 'geck', name: 'G.E.C.K.', type: 'resource', resource: 'data', amount: [200, 500] }
  ]
};

// Calculate XP needed for a level
function xpForLevel(level) {
  if (level <= 1) return 0;
  return Math.floor(LEVEL_CONFIG.baseXP * Math.pow(level - 1, LEVEL_CONFIG.exponent));
}

// Calculate total XP needed to reach a level from level 1
function totalXPForLevel(level) {
  let total = 0;
  for (let i = 2; i <= level; i++) {
    total += xpForLevel(i);
  }
  return total;
}

// Get current level from XP
function getLevelFromXP(xp) {
  let level = 1;
  while (level < LEVEL_CONFIG.maxLevel) {
    const needed = xpForLevel(level + 1);
    if (xp >= needed) {
      xp -= needed;
      level++;
    } else {
      break;
    }
  }
  return {
    level,
    currentXP: xp,
    xpToNext: xpForLevel(level + 1) - xp,
    progress: xp / xpForLevel(level + 1)
  };
}

// Roll for loot based on quest difficulty and luck
function rollLoot(difficulty, statLevels = {}) {
  const luckBonus = (statLevels.CRE || 0) * 0.01; // Creativity adds luck
  const drops = [];
  
  // Base drop chances
  const chances = {
    common: 0.6,
    uncommon: 0.3 - luckBonus,
    rare: 0.08,
    epic: 0.015,
    legendary: 0.005 + luckBonus
  };
  
  // Difficulty modifiers
  const difficultyModifiers = {
    trivial: { rare: -0.05, epic: -0.01 },
    easy: { uncommon: 0.05 },
    medium: { uncommon: 0.1, rare: 0.05 },
    hard: { rare: 0.1, epic: 0.03, legendary: 0.005 },
    epic: { rare: 0.15, epic: 0.08, legendary: 0.02 }
  };
  
  const mods = difficultyModifiers[difficulty] || {};
  
  // Roll for each rarity
  Object.entries(chances).forEach(([rarity, baseChance]) => {
    const modifiedChance = baseChance + (mods[rarity] || 0);
    if (Math.random() < modifiedChance) {
      const pool = LOOT_TABLE[rarity];
      const item = pool[Math.floor(Math.random() * pool.length)];
      const amount = item.amount ? 
        Math.floor(Math.random() * (item.amount[1] - item.amount[0] + 1)) + item.amount[0] : 
        1;
      drops.push({ ...item, amount, rarity });
    }
  });
  
  return drops;
}

// Calculate XP reward for completing a quest
function calculateQuestReward(quest, playerState) {
  const now = Date.now();
  const startedAt = quest.startedAt || now;
  const completedAt = quest.completedAt || now;
  
  // Base XP from difficulty
  const difficulty = QUEST_DIFFICULTY[quest.difficulty] || QUEST_DIFFICULTY.medium;
  let baseXP = difficulty.xp;
  
  // Time multipliers
  const timeTaken = (completedAt - startedAt) / 60000; // minutes
  const expectedTime = difficulty.time;
  
  let timeMultiplier = 1;
  if (timeTaken < expectedTime * 0.5) {
    timeMultiplier = 3; // Speed demon
  } else if (timeTaken < expectedTime) {
    timeMultiplier = 2; // Quick finish
  } else if (timeTaken < expectedTime * 2) {
    timeMultiplier = 1; // Normal
  } else {
    timeMultiplier = 0.5; // Took too long
  }
  
  // Streak bonus (from player state)
  const streakDays = playerState.streak?.current || 0;
  const streakMultiplier = 1 + (streakDays * 0.05); // +5% per streak day
  
  // First completion of the day bonus
  const completionsToday = playerState.dailyCompletions || 0;
  const dailyBonus = completionsToday === 0 ? 1.5 : 1;
  
  // Stat-specific quest bonus
  const primaryStat = quest.stats?.[0] || 'ORG';
  const statLevel = playerState.stats[primaryStat]?.level || 1;
  const statMultiplier = 1 + ((statLevel - 1) * 0.02); // +2% per level in relevant stat
  
  // Calculate final XP
  const totalMultiplier = timeMultiplier * streakMultiplier * dailyBonus * statMultiplier;
  const finalXP = Math.floor(baseXP * totalMultiplier);
  
  // Resources gained (based on quest type)
  const resources = {};
  const questType = quest.category || 'general';
  
  switch (questType) {
    case 'health':
      resources.food = Math.floor(baseXP / 10);
      resources.meds = Math.floor(baseXP / 25);
      break;
    case 'work':
      resources.data = Math.floor(baseXP / 15);
      resources.scrap = Math.floor(baseXP / 20);
      break;
    case 'chores':
      resources.scrap = Math.floor(baseXP / 8);
      resources.water = Math.floor(baseXP / 30);
      break;
    case 'social':
      resources.data = Math.floor(baseXP / 20);
      break;
    case 'creative':
      resources.data = Math.floor(baseXP / 10);
      resources.scrap = Math.floor(baseXP / 40);
      break;
    default:
      resources.scrap = Math.floor(baseXP / 15);
  }
  
  // Roll for loot
  const loot = rollLoot(quest.difficulty, playerState.stats);
  
  return {
    baseXP,
    finalXP,
    multipliers: {
      time: timeMultiplier,
      streak: streakMultiplier,
      dailyFirst: dailyBonus,
      stat: statMultiplier
    },
    breakdown: {
      base: baseXP,
      timeBonus: Math.floor(baseXP * (timeMultiplier - 1)),
      streakBonus: Math.floor(baseXP * (streakMultiplier - 1)),
      dailyBonus: dailyBonus > 1 ? Math.floor(baseXP * 0.5) : 0
    },
    resources,
    loot,
    statGains: {
      [primaryStat]: Math.ceil(difficulty.xp / 50) // Raw XP toward stat
    }
  };
}

// Update player stats after quest completion
function updatePlayerStats(playerState, reward) {
  const updated = JSON.parse(JSON.stringify(playerState)); // Deep clone
  
  // Add global XP
  updated.xp = (updated.xp || 0) + reward.finalXP;
  
  // Update individual stats
  Object.entries(reward.statGains).forEach(([stat, xpGain]) => {
    if (!updated.stats[stat]) {
      updated.stats[stat] = { level: 1, xp: 0, totalXP: 0 };
    }
    
    updated.stats[stat].xp += xpGain;
    updated.stats[stat].totalXP += xpGain;
    
    // Check for level up
    while (updated.stats[stat].xp >= xpForLevel(updated.stats[stat].level + 1)) {
      updated.stats[stat].xp -= xpForLevel(updated.stats[stat].level + 1);
      updated.stats[stat].level++;
      updated.stats[stat].leveledUp = true;
    }
  });
  
  // Add resources
  Object.entries(reward.resources).forEach(([resource, amount]) => {
    updated.resources[resource] = (updated.resources[resource] || 0) + amount;
  });
  
  // Add loot items to inventory
  reward.loot.forEach(item => {
    if (item.type === 'resource') {
      updated.resources[item.resource] = (updated.resources[item.resource] || 0) + (item.amount || 1);
    } else {
      updated.inventory.push({
        ...item,
        acquiredAt: Date.now()
      });
    }
  });
  
  // Update daily completions
  updated.dailyCompletions = (updated.dailyCompletions || 0) + 1;
  
  // Update streak
  const today = new Date().toDateString();
  const lastCompletion = updated.lastCompletionDate;
  
  if (lastCompletion) {
    const lastDate = new Date(lastCompletion);
    const todayDate = new Date(today);
    const diffDays = (todayDate - lastDate) / (1000 * 60 * 60 * 24);
    
    if (diffDays === 1) {
      // Consecutive day
      updated.streak.current++;
      if (updated.streak.current > updated.streak.best) {
        updated.streak.best = updated.streak.current;
      }
    } else if (diffDays > 1) {
      // Streak broken (but we have "lives" system)
      updated.streak.lives--;
      if (updated.streak.lives <= 0) {
        updated.streak.current = 1;
        updated.streak.lives = 3; // Reset lives
      }
    }
  } else {
    updated.streak.current = 1;
  }
  
  updated.lastCompletionDate = today;
  
  return updated;
}

// Generate a new player state
function createNewPlayer(playerId) {
  return {
    id: playerId,
    createdAt: Date.now(),
    xp: 0,
    level: 1,
    stats: {
      VIT: { level: 1, xp: 0, totalXP: 0 },
      FOC: { level: 1, xp: 0, totalXP: 0 },
      CRE: { level: 1, xp: 0, totalXP: 0 },
      SOC: { level: 1, xp: 0, totalXP: 0 },
      ORG: { level: 1, xp: 0, totalXP: 0 }
    },
    resources: {
      scrap: 100, // Starting resources
      food: 50,
      water: 50,
      power: 20,
      meds: 5,
      data: 10
    },
    inventory: [],
    vault: {
      quarters: { level: 1, built: true },
      generator: { level: 0, built: false }
    },
    quests: [],
    campaigns: [],
    streak: {
      current: 0,
      best: 0,
      lives: 3
    },
    dailyCompletions: 0,
    lastCompletionDate: null,
    preferences: {
      theme: 'vault',
      soundEnabled: true,
      notificationsEnabled: true
    }
  };
}

// Check if a vault upgrade is affordable
function canAffordUpgrade(playerState, roomId, targetLevel) {
  const room = VAULT_ROOMS[roomId];
  if (!room) return { affordable: false, reason: 'Room not found' };
  
  const upgrade = room.upgrades[targetLevel - 1];
  if (!upgrade) return { affordable: false, reason: 'Max level reached' };
  
  const costs = upgrade.cost;
  const missing = {};
  
  for (const [resource, amount] of Object.entries(costs)) {
    const has = playerState.resources[resource] || 0;
    if (has < amount) {
      missing[resource] = amount - has;
    }
  }
  
  return {
    affordable: Object.keys(missing).length === 0,
    cost: costs,
    missing: Object.keys(missing).length > 0 ? missing : null
  };
}

// Apply a vault upgrade
function applyUpgrade(playerState, roomId) {
  const currentLevel = playerState.vault[roomId]?.level || 0;
  const canAfford = canAffordUpgrade(playerState, roomId, currentLevel + 1);
  
  if (!canAfford.affordable) {
    return { success: false, reason: canAfford.missing ? 'Insufficient resources' : 'Cannot upgrade' };
  }
  
  const room = VAULT_ROOMS[roomId];
  const upgrade = room.upgrades[currentLevel];
  
  // Deduct resources
  const updated = JSON.parse(JSON.stringify(playerState));
  for (const [resource, amount] of Object.entries(canAfford.cost)) {
    updated.resources[resource] -= amount;
  }
  
  // Apply upgrade
  if (!updated.vault[roomId]) {
    updated.vault[roomId] = { level: 0, built: true };
  }
  updated.vault[roomId].level = currentLevel + 1;
  
  // Apply bonuses
  if (upgrade.bonus) {
    Object.entries(upgrade.bonus).forEach(([stat, multiplier]) => {
      // These are passive multipliers, stored separately
      updated.vaultBonuses = updated.vaultBonuses || {};
      updated.vaultBonuses[stat] = (updated.vaultBonuses[stat] || 0) + multiplier;
    });
  }
  
  return {
    success: true,
    player: updated,
    upgrade: {
      room: roomId,
      newLevel: currentLevel + 1,
      cost: canAfford.cost,
      bonus: upgrade.bonus || null
    }
  };
}

export {
  STATS,
  QUEST_DIFFICULTY,
  RESOURCES,
  VAULT_ROOMS,
  LOOT_TABLE,
  xpForLevel,
  getLevelFromXP,
  rollLoot,
  calculateQuestReward,
  updatePlayerStats,
  createNewPlayer,
  canAffordUpgrade,
  applyUpgrade
};
