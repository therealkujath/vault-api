// GET/POST /api/quests - Quest management
import { getPlayer, savePlayer, getPlayerQuests, savePlayerQuests, QUEST_DIFFICULTY } from '../lib/game.js';
import { v4 as uuidv4 } from 'uuid';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  const playerId = req.headers['x-player-id'] || req.query.playerId;
  
  if (!playerId) {
    res.status(401).json({ success: false, error: 'Player ID required' });
    return;
  }
  
  const player = getPlayer(playerId);
  if (!player) {
    res.status(404).json({ success: false, error: 'Player not found' });
    return;
  }
  
  // GET - List quests
  if (req.method === 'GET') {
    const status = req.query.status || 'all'; // all, active, completed
    const category = req.query.category;
    const limit = parseInt(req.query.limit) || 50;
    
    let quests = getPlayerQuests(playerId);
    
    if (status === 'active') {
      quests = quests.filter(q => !q.completed);
    } else if (status === 'completed') {
      quests = quests.filter(q => q.completed);
    }
    
    if (category) {
      quests = quests.filter(q => q.category === category);
    }
    
    // Sort by date (newest first for active, completedAt for completed)
    quests.sort((a, b) => {
      if (a.completed && b.completed) {
        return (b.completedAt || 0) - (a.completedAt || 0);
      }
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
    
    quests = quests.slice(0, limit);
    
    res.status(200).json({
      success: true,
      quests,
      categories: ['health', 'work', 'chores', 'social', 'creative', 'admin'],
      difficulties: Object.keys(QUEST_DIFFICULTY)
    });
    return;
  }
  
  // POST - Create new quest
  if (req.method === 'POST') {
    const { title, description, difficulty, category, stats, dueDate, subtasks } = req.body;
    
    if (!title) {
      res.status(400).json({ success: false, error: 'Title is required' });
      return;
    }
    
    const quest = {
      id: uuidv4(),
      title,
      description: description || '',
      difficulty: difficulty || 'medium',
      category: category || 'general',
      stats: stats || ['ORG'], // Primary stats this quest affects
      dueDate: dueDate || null,
      subtasks: subtasks || [],
      completed: false,
      createdAt: Date.now(),
      startedAt: null,
      completedAt: null,
      xpReward: QUEST_DIFFICULTY[difficulty || 'medium'].xp
    };
    
    let quests = getPlayerQuests(playerId);
    quests.unshift(quest); // Add to beginning
    savePlayerQuests(playerId, quests);
    
    res.status(201).json({
      success: true,
      quest,
      message: 'Quest created'
    });
    return;
  }
  
  // PUT - Update quest (start quest, edit, etc.)
  if (req.method === 'PUT') {
    const { questId, action, updates } = req.body;
    
    let quests = getPlayerQuests(playerId);
    const questIndex = quests.findIndex(q => q.id === questId);
    
    if (questIndex === -1) {
      res.status(404).json({ success: false, error: 'Quest not found' });
      return;
    }
    
    if (action === 'start') {
      quests[questIndex].startedAt = Date.now();
      quests[questIndex].status = 'in_progress';
    } else if (updates) {
      // Merge updates
      Object.assign(quests[questIndex], updates);
    }
    
    savePlayerQuests(playerId, quests);
    
    res.status(200).json({
      success: true,
      quest: quests[questIndex]
    });
    return;
  }
  
  // DELETE - Remove quest
  if (req.method === 'DELETE') {
    const { questId } = req.query;
    
    let quests = getPlayerQuests(playerId);
    quests = quests.filter(q => q.id !== questId);
    savePlayerQuests(playerId, quests);
    
    res.status(200).json({
      success: true,
      message: 'Quest deleted'
    });
    return;
  }
  
  res.status(405).json({ success: false, error: 'Method not allowed' });
}
