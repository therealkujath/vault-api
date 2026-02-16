// Simple file-based JSON database for serverless environments
// Uses /tmp for writable storage in serverless functions

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const DB_DIR = '/tmp/vault-db';
const PLAYERS_FILE = join(DB_DIR, 'players.json');
const QUESTS_FILE = join(DB_DIR, 'quests.json');
const CAMPAIGNS_FILE = join(DB_DIR, 'campaigns.json');

// Ensure DB directory exists
function initDB() {
  if (!existsSync(DB_DIR)) {
    mkdirSync(DB_DIR, { recursive: true });
  }
  
  // Initialize empty files if they don't exist
  if (!existsSync(PLAYERS_FILE)) {
    writeFileSync(PLAYERS_FILE, JSON.stringify({}), 'utf8');
  }
  if (!existsSync(QUESTS_FILE)) {
    writeFileSync(QUESTS_FILE, JSON.stringify({}), 'utf8');
  }
  if (!existsSync(CAMPAIGNS_FILE)) {
    writeFileSync(CAMPAIGNS_FILE, JSON.stringify({}), 'utf8');
  }
}

// Get all players
function getPlayers() {
  initDB();
  try {
    return JSON.parse(readFileSync(PLAYERS_FILE, 'utf8'));
  } catch {
    return {};
  }
}

// Save all players
function savePlayers(players) {
  initDB();
  writeFileSync(PLAYERS_FILE, JSON.stringify(players, null, 2), 'utf8');
}

// Get a specific player
function getPlayer(playerId) {
  const players = getPlayers();
  return players[playerId] || null;
}

// Save a player
function savePlayer(playerId, playerData) {
  const players = getPlayers();
  players[playerId] = playerData;
  savePlayers(players);
  return playerData;
}

// Get quests for a player
function getPlayerQuests(playerId) {
  initDB();
  try {
    const quests = JSON.parse(readFileSync(QUESTS_FILE, 'utf8'));
    return quests[playerId] || [];
  } catch {
    return [];
  }
}

// Save quests for a player
function savePlayerQuests(playerId, quests) {
  initDB();
  const allQuests = JSON.parse(readFileSync(QUESTS_FILE, 'utf8') || '{}');
  allQuests[playerId] = quests;
  writeFileSync(QUESTS_FILE, JSON.stringify(allQuests, null, 2), 'utf8');
}

// Get campaigns for a player
function getPlayerCampaigns(playerId) {
  initDB();
  try {
    const campaigns = JSON.parse(readFileSync(CAMPAIGNS_FILE, 'utf8'));
    return campaigns[playerId] || [];
  } catch {
    return [];
  }
}

// Save campaigns for a player
function savePlayerCampaigns(playerId, campaigns) {
  initDB();
  const allCampaigns = JSON.parse(readFileSync(CAMPAIGNS_FILE, 'utf8') || '{}');
  allCampaigns[playerId] = campaigns;
  writeFileSync(CAMPAIGNS_FILE, JSON.stringify(allCampaigns, null, 2), 'utf8');
}

// Clean up old data (run periodically)
function cleanupOldData(days = 30) {
  const players = getPlayers();
  const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
  
  for (const [id, player] of Object.entries(players)) {
    if (player.lastActive && player.lastActive < cutoff) {
      delete players[id];
    }
  }
  
  savePlayers(players);
}

export {
  getPlayers,
  savePlayers,
  getPlayer,
  savePlayer,
  getPlayerQuests,
  savePlayerQuests,
  getPlayerCampaigns,
  savePlayerCampaigns,
  cleanupOldData
};
