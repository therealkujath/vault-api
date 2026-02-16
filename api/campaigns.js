// GET/POST /api/campaigns - Long-term campaigns and goals
import { getPlayer, savePlayer, getPlayerCampaigns, savePlayerCampaigns } from '../lib/db.js';
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
  
  // GET - List campaigns
  if (req.method === 'GET') {
    const status = req.query.status || 'active'; // active, completed, all
    
    let campaigns = getPlayerCampaigns(playerId);
    
    if (status === 'active') {
      campaigns = campaigns.filter(c => !c.completed && !c.failed);
    } else if (status === 'completed') {
      campaigns = campaigns.filter(c => c.completed);
    } else if (status === 'failed') {
      campaigns = campaigns.filter(c => c.failed);
    }
    
    // Sort by end date (soonest first)
    campaigns.sort((a, b) => (a.endDate || 0) - (b.endDate || 0));
    
    res.status(200).json({
      success: true,
      campaigns,
      activeCount: campaigns.filter(c => !c.completed && !c.failed).length
    });
    return;
  }
  
  // POST - Create campaign
  if (req.method === 'POST') {
    const { 
      title, 
      description, 
      targetValue, 
      currentValue = 0,
      stat,
      durationDays = 30,
      reward
    } = req.body;
    
    if (!title || !targetValue || !stat) {
      res.status(400).json({ 
        success: false, 
        error: 'Title, target value, and stat are required' 
      });
      return;
    }
    
    const now = Date.now();
    const endDate = now + (durationDays * 24 * 60 * 60 * 1000);
    
    const campaign = {
      id: uuidv4(),
      title,
      description: description || '',
      stat,
      targetValue,
      currentValue,
      progress: currentValue / targetValue,
      startDate: now,
      endDate,
      durationDays,
      completed: false,
      failed: false,
      reward: reward || {
        xp: targetValue * 10,
        resources: { scrap: targetValue }
      },
      milestones: generateMilestones(targetValue)
    };
    
    let campaigns = getPlayerCampaigns(playerId);
    campaigns.push(campaign);
    savePlayerCampaigns(playerId, campaigns);
    
    res.status(201).json({
      success: true,
      campaign
    });
    return;
  }
  
  // PUT - Update campaign progress
  if (req.method === 'PUT') {
    const { campaignId, value, action } = req.body;
    
    let campaigns = getPlayerCampaigns(playerId);
    const campaignIndex = campaigns.findIndex(c => c.id === campaignId);
    
    if (campaignIndex === -1) {
      res.status(404).json({ success: false, error: 'Campaign not found' });
      return;
    }
    
    const campaign = campaigns[campaignIndex];
    
    if (action === 'increment') {
      campaign.currentValue += value || 1;
    } else if (action === 'set') {
      campaign.currentValue = value;
    }
    
    // Recalculate progress
    campaign.progress = campaign.currentValue / campaign.targetValue;
    
    // Check for completion
    if (campaign.currentValue >= campaign.targetValue && !campaign.completed) {
      campaign.completed = true;
      campaign.completedAt = Date.now();
      
      // Award rewards
      if (campaign.reward.xp) {
        player.xp += campaign.reward.xp;
      }
      if (campaign.reward.resources) {
        Object.entries(campaign.reward.resources).forEach(([res, amount]) => {
          player.resources[res] = (player.resources[res] || 0) + amount;
        });
      }
      
      savePlayer(playerId, player);
    }
    
    // Check for milestone completion
    const completedMilestones = [];
    campaign.milestones.forEach(m => {
      if (!m.reached && campaign.currentValue >= m.target) {
        m.reached = true;
        m.reachedAt = Date.now();
        completedMilestones.push(m);
      }
    });
    
    campaigns[campaignIndex] = campaign;
    savePlayerCampaigns(playerId, campaigns);
    
    res.status(200).json({
      success: true,
      campaign,
      completed: campaign.completed,
      completedMilestones,
      rewards: campaign.completed ? campaign.reward : null
    });
    return;
  }
  
  // DELETE - Abandon campaign
  if (req.method === 'DELETE') {
    const { campaignId } = req.query;
    
    let campaigns = getPlayerCampaigns(playerId);
    campaigns = campaigns.filter(c => c.id !== campaignId);
    savePlayerCampaigns(playerId, campaigns);
    
    res.status(200).json({ success: true, message: 'Campaign abandoned' });
    return;
  }
  
  res.status(405).json({ success: false, error: 'Method not allowed' });
}

function generateMilestones(target) {
  const milestones = [];
  const steps = [0.25, 0.5, 0.75, 1.0];
  
  steps.forEach((step, index) => {
    milestones.push({
      target: Math.floor(target * step),
      reached: false,
      reward: {
        xp: Math.floor(target * 0.5 * step),
        resources: { scrap: Math.floor(target * 0.1 * step) }
      }
    });
  });
  
  return milestones;
}
