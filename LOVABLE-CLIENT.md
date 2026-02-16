# Complete VAULT API Client for Lovable

## Drop-in API Client

Create `lib/vault-api.ts`:

```typescript
// ============================================
// VAULT API CLIENT - Drop this into Lovable
// ============================================

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://your-api-url.com/api';

// Player ID management (persists across sessions)
const getPlayerId = (): string => {
  if (typeof window === 'undefined') return 'server';
  
  let id = localStorage.getItem('vault-player-id');
  if (!id) {
    id = 'vault-' + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('vault-player-id', id);
  }
  return id;
};

export const playerId = getPlayerId();

// Base API call with error handling
async function api<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_URL}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'x-player-id': playerId,
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('VAULT API Error:', error);
    throw error;
  }
}

// ============================================
// API METHODS
// ============================================

export interface Player {
  id: string;
  level: number;
  xp: number;
  currentXP: number;
  xpToNext: number;
  progress: number;
  stats: {
    VIT: { level: number; xp: number; totalXP: number };
    FOC: { level: number; xp: number; totalXP: number };
    CRE: { level: number; xp: number; totalXP: number };
    SOC: { level: number; xp: number; totalXP: number };
    ORG: { level: number; xp: number; totalXP: number };
  };
  resources: {
    scrap: number;
    food: number;
    water: number;
    power: number;
    meds: number;
    data: number;
  };
  vault: Record<string, { level: number; built: boolean }>;
  streak: {
    current: number;
    best: number;
    lives: number;
  };
  dailyCompletions: number;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  difficulty: 'trivial' | 'easy' | 'medium' | 'hard' | 'epic';
  category: 'health' | 'work' | 'chores' | 'social' | 'creative' | 'admin';
  stats: string[];
  xpReward: number;
  completed: boolean;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
}

export interface QuestReward {
  baseXP: number;
  finalXP: number;
  multipliers: {
    time: number;
    streak: number;
    dailyFirst: number;
    stat: number;
  };
  breakdown: {
    base: number;
    timeBonus: number;
    streakBonus: number;
    dailyBonus: number;
  };
  resources: Record<string, number>;
  loot: Array<{
    id: string;
    name: string;
    type: string;
    rarity: string;
    amount?: number;
  }>;
  statGains: Record<string, number>;
}

export interface CompleteQuestResult {
  quest: Quest;
  reward: QuestReward;
  playerUpdate: {
    totalXP: number;
    newResources: Player['resources'];
    statLevelUps: Array<{ stat: string; newLevel: number }>;
    streak: Player['streak'];
    dailyCompletions: number;
  };
}

export const vaultAPI = {
  // ==========================================
  // PLAYER
  // ==========================================
  
  getPlayer: () => api<{ success: boolean; player: Player }>('/player'),
  
  updatePlayer: (data: Partial<Player>) => 
    api<{ success: boolean; player: Player }>('/player', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // ==========================================
  // QUESTS
  // ==========================================
  
  getQuests: (status: 'all' | 'active' | 'completed' = 'active') =>
    api<{ success: boolean; quests: Quest[]; categories: string[]; difficulties: string[] }>(
      `/quests?status=${status}`
    ),
  
  createQuest: (quest: {
    title: string;
    description?: string;
    difficulty: Quest['difficulty'];
    category: Quest['category'];
    stats?: string[];
    dueDate?: string;
  }) => api<{ success: boolean; quest: Quest; message: string }>('/quests', {
    method: 'POST',
    body: JSON.stringify(quest),
  }),
  
  startQuest: (questId: string) =>
    api<{ success: boolean; quest: Quest }>('/quests', {
      method: 'PUT',
      body: JSON.stringify({ questId, action: 'start' }),
    }),
  
  completeQuest: (questId: string) =>
    api<{ success: boolean; result: CompleteQuestResult }>('/quests/complete', {
      method: 'POST',
      body: JSON.stringify({ questId }),
    }),
  
  deleteQuest: (questId: string) =>
    api<{ success: boolean; message: string }>(`/quests?questId=${questId}`, {
      method: 'DELETE',
    }),

  // ==========================================
  // VAULT
  // ==========================================
  
  getVault: () =>
    api<{
      success: boolean;
      vault: Player['vault'];
      rooms: Record<string, any>;
      availableUpgrades: Record<string, any>;
      production: Record<string, number>;
      bonuses: Record<string, number>;
      resources: Player['resources'];
    }>('/vault'),
  
  upgradeRoom: (roomId: string) =>
    api<{
      success: boolean;
      upgrade: any;
      vault: Player['vault'];
      resources: Player['resources'];
    }>('/vault', {
      method: 'POST',
      body: JSON.stringify({ roomId, action: 'upgrade' }),
    }),

  // ==========================================
  // CAMPAIGNS
  // ==========================================
  
  getCampaigns: (status: 'active' | 'completed' | 'failed' | 'all' = 'active') =>
    api<{ success: boolean; campaigns: any[]; activeCount: number }>(
      `/campaigns?status=${status}`
    ),
  
  createCampaign: (campaign: {
    title: string;
    description?: string;
    targetValue: number;
    stat: string;
    durationDays?: number;
  }) => api<{ success: boolean; campaign: any }>('/campaigns', {
    method: 'POST',
    body: JSON.stringify(campaign),
  }),
  
  updateCampaign: (campaignId: string, value: number) =>
    api<{ success: boolean; campaign: any; completed: boolean }>('/campaigns', {
      method: 'PUT',
      body: JSON.stringify({ campaignId, action: 'increment', value }),
    }),
  
  deleteCampaign: (campaignId: string) =>
    api<{ success: boolean; message: string }>(`/campaigns?campaignId=${campaignId}`, {
      method: 'DELETE',
    }),

  // ==========================================
  // GAME INFO
  // ==========================================
  
  getGameInfo: () =>
    api<{
      success: boolean;
      name: string;
      version: string;
      features: any;
      stats: Record<string, { name: string; color: string; icon: string }>;
      difficulties: Record<string, { xp: number; time: number; label: string }>;
      resources: Record<string, { name: string; icon: string; description: string }>;
      rooms: Record<string, any>;
    }>('/health'),
};

export default vaultAPI;
