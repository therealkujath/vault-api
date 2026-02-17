// POST /api/quests/complete - Complete a quest and get rewards
import { getPlayer, savePlayer, getPlayerQuests, savePlayerQuests } from '../../lib/db.js';
import { calculateQuestReward, updatePlayerStats } from '../../lib/game.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }
  
  const playerId = req.headers['x-player-id'] || req.body.playerId;
  const { questId } = req.body;
  
  if (!playerId || !questId) {
    res.status(400).json({ success: false, error: 'Player ID and Quest ID required' });
    return;
  }
  
  const player = getPlayer(playerId);
  if (!player) {
    res.status(404).json({ success: false, error: 'Player not found' });
    return;
  }
  
  const quests = getPlayerQuests(playerId);
  const questIndex = quests.findIndex(q => q.id === questId);
  
  if (questIndex === -1) {
    res.status(404).json({ success: false, error: 'Quest not found' });
    return;
  }
  
  const quest = quests[questIndex];
  
  if (quest.completed) {
    res.status(400).json({ success: false, error: 'Quest already completed' });
    return;
  }
  
  // Mark as completed
  quest.completed = true;
  quest.completedAt = Date.now();
  quest.status = 'completed';
  
  // Calculate rewards
  const reward = calculateQuestReward(quest, player);
  
  // Update player state
  const updatedPlayer = updatePlayerStats(player, reward);
  
  // Save everything
  quests[questIndex] = quest;
  savePlayerQuests(playerId, quests);
  savePlayer(playerId, updatedPlayer);
  
  // Check for level ups
  const statLevelUps = [];
  Object.entries(reward.statGains).forEach(([stat, _]) => {
    if (updatedPlayer.stats[stat]?.leveledUp) {
      statLevelUps.push({
        stat,
        newLevel: updatedPlayer.stats[stat].level
      });
      delete updatedPlayer.stats[stat].leveledUp; // Clean up flag
    }
  });
  
  res.status(200).json({
    success: true,
    result: {
      quest: {
        id: quest.id,
        title: quest.title,
        difficulty: quest.difficulty,
        completedAt: quest.completedAt
      },
      reward: {
        baseXP: reward.baseXP,
        finalXP: reward.finalXP,
        multipliers: reward.multipliers,
        breakdown: reward.breakdown,
        resources: reward.resources,
        loot: reward.loot,
        statGains: reward.statGains
      },
      playerUpdate: {
        totalXP: updatedPlayer.xp,
        newResources: updatedPlayer.resources,
        statLevelUps,
        streak: updatedPlayer.streak,
        dailyCompletions: updatedPlayer.dailyCompletions
      }
    }
  });
}
