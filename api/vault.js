// GET/POST /api/vault - Vault building and upgrades
import { getPlayer, savePlayer } from '../lib/db.js';
import { VAULT_ROOMS, canAffordUpgrade, applyUpgrade } from '../lib/game.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  const playerId = req.headers['x-player-id'] || req.query.playerId || req.body?.playerId;
  
  if (!playerId) {
    res.status(401).json({ success: false, error: 'Player ID required' });
    return;
  }
  
  const player = getPlayer(playerId);
  if (!player) {
    res.status(404).json({ success: false, error: 'Player not found' });
    return;
  }
  
  // GET - View vault status
  if (req.method === 'GET') {
    // Calculate what can be built/upgraded
    const availableUpgrades = {};
    
    for (const [roomId, roomData] of Object.entries(VAULT_ROOMS)) {
      const currentLevel = player.vault[roomId]?.level || 0;
      const nextLevel = currentLevel + 1;
      
      if (nextLevel <= roomData.upgrades.length) {
        const affordability = canAffordUpgrade(player, roomId, nextLevel);
        availableUpgrades[roomId] = {
          ...roomData,
          currentLevel,
          nextLevel,
          canAfford: affordability.affordable,
          cost: affordability.cost,
          missing: affordability.missing
        };
      } else {
        availableUpgrades[roomId] = {
          ...roomData,
          currentLevel,
          maxed: true
        };
      }
    }
    
    // Calculate production
    const production = calculateProduction(player.vault);
    
    // Calculate passive bonuses
    const bonuses = calculateBonuses(player.vault);
    
    res.status(200).json({
      success: true,
      vault: player.vault,
      rooms: VAULT_ROOMS,
      availableUpgrades,
      production,
      bonuses,
      resources: player.resources
    });
    return;
  }
  
  // POST - Build or upgrade a room
  if (req.method === 'POST') {
    const { roomId, action } = req.body;
    
    if (!roomId) {
      res.status(400).json({ success: false, error: 'Room ID required' });
      return;
    }
    
    if (action === 'build' || action === 'upgrade') {
      const result = applyUpgrade(player, roomId);
      
      if (!result.success) {
        res.status(400).json({ success: false, error: result.reason });
        return;
      }
      
      savePlayer(playerId, result.player);
      
      res.status(200).json({
        success: true,
        upgrade: result.upgrade,
        vault: result.player.vault,
        resources: result.player.resources
      });
      return;
    }
    
    res.status(400).json({ success: false, error: 'Invalid action' });
    return;
  }
  
  res.status(405).json({ success: false, error: 'Method not allowed' });
}

function calculateProduction(vault) {
  const production = {
    food: 0,
    water: 0,
    power: 0,
    meds: 0,
    data: 0
  };
  
  // Garden produces food
  if (vault.garden?.level > 0) {
    const rates = [10, 25, 60];
    production.food = rates[vault.garden.level - 1] || 0;
  }
  
  // Water purifier produces water
  if (vault.waterPurifier?.level > 0) {
    const rates = [10, 25, 60];
    production.water = rates[vault.waterPurifier.level - 1] || 0;
  }
  
  // Generator produces power
  if (vault.generator?.level > 0) {
    const rates = [10, 25, 60];
    production.power = rates[vault.generator.level - 1] || 0;
  }
  
  // Medbay produces meds (at higher levels)
  if (vault.medbay?.level >= 2) {
    production.meds = vault.medbay.level === 2 ? 3 : 8;
  }
  
  // Library produces data
  if (vault.library?.level > 0) {
    const rates = [2, 5, 12];
    production.data = rates[vault.library.level - 1] || 0;
  }
  
  return production;
}

function calculateBonuses(vault) {
  const bonuses = {
    VIT: 0,
    FOC: 0,
    CRE: 0,
    SOC: 0,
    ORG: 0
  };
  
  // Sum up all room bonuses
  for (const [roomId, roomData] of Object.entries(vault)) {
    if (!roomData.built || roomData.level === 0) continue;
    
    const room = VAULT_ROOMS[roomId];
    if (!room) continue;
    
    const upgrade = room.upgrades[roomData.level - 1];
    if (upgrade?.bonus) {
      Object.entries(upgrade.bonus).forEach(([stat, multiplier]) => {
        bonuses[stat] = (bonuses[stat] || 0) + multiplier;
      });
    }
  }

  
  return bonuses;
}
