// GET /api/health - Health check and game info
import { STATS, QUEST_DIFFICULTY, RESOURCES, VAULT_ROOMS } from '../lib/game.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  res.status(200).json({
    success: true,
    name: 'VAULT API',
    version: '1.0.0',
    description: 'Post-apocalyptic life gamification API',
    features: {
      stats: Object.keys(STATS),
      difficulties: Object.keys(QUEST_DIFFICULTY),
      resources: Object.keys(RESOURCES),
      vaultRooms: Object.keys(VAULT_ROOMS)
    },
    stats: STATS,
    difficulties: QUEST_DIFFICULTY,
    resources: RESOURCES,
    rooms: VAULT_ROOMS
  });
}
