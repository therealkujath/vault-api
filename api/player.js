// GET/POST /api/player - Player profile and stats
import { getPlayer, savePlayer, createNewPlayer, getLevelFromXP } from '../lib/game.js';
import { v4 as uuidv4 } from 'uuid';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  // Get or create player
  const playerId = req.headers['x-player-id'] || req.query.playerId;
  
  if (req.method === 'GET') {
    let player = playerId ? getPlayer(playerId) : null;
    
    if (!player) {
      // Create new player
      const newId = uuidv4();
      player = createNewPlayer(newId);
      savePlayer(newId, player);
    }
    
    // Calculate derived stats
    const levelInfo = getLevelFromXP(player.xp);
    
    // Calculate vault production
    const production = calculateVaultProduction(player.vault);
    
    // Get active quests count
    const activeQuests = (player.quests || []).filter(q => !q.completed).length;
    
    res.status(200).json({
      success: true,
      player: {
        ...player,
        level: levelInfo.level,
        currentXP: levelInfo.currentXP,
        xpToNext: levelInfo.xpToNext,
        progress: levelInfo.progress,
        vaultProduction: production,
        activeQuests,
        totalQuests: (player.quests || []).length,
        completedQuests: (player.quests || []).filter(q => q.completed).length
      }
    });
    return;
  }
  
  if (req.method === 'POST') {
    const updates = req.body;
    let player = playerId ? getPlayer(playerId) : null;
    
    if (!player) {
      res.status(404).json({ success: false, error: 'Player not found' });
      return;
    }
    
    // Apply allowed updates
    const allowedFields = ['preferences', 'username', 'avatar'];
    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        player[field] = updates[field];
      }
    });
    
    player.lastActive = Date.now();
    savePlayer(playerId, player);
    
    res.status(200).json({ success: true, player });
    return;
  }
  
  res.status(405).json({ success: false, error: 'Method not allowed' });
}

function calculateVaultProduction(vault) {
  const production = {
    food: 0,
    water: 0,
    power: 0
  };
  
  if (vault.garden?.level > 0) {
    const gardenLevels = [
      { food: 10 },
      { food: 25 },
      { food: 60 }
    ];
    const level = vault.garden.level - 1;
    production.food += gardenLevels[level]?.food || 0;
  }
  
  if (vault.waterPurifier?.level > 0) {
    const waterLevels = [
      { water: 10 },
      { water: 25 },
      { water: 60 }
    ];
    const level = vault.waterPurifier.level - 1;
    production.water += waterLevels[level]?.water || 0;
  }
  
  if (vault.generator?.level > 0) {
    const powerLevels = [
      { power: 10 },
      { power: 25 },
      { power: 60 }
    ];
    const level = vault.generator.level - 1;
    production.power += powerLevels[level]?.power || 0;
  }
  
  return production;
}
