# Lovable Integration Guide

## Step 1: Create Project

1. Go to [Lovable](https://lovable.dev)
2. Create new project
3. Paste this prompt:

```
Create a post-apocalyptic vault management game called "VAULT" with:
- Fallout shelter aesthetic (green on black terminal style)
- Character stats (Vitality, Focus, Creativity, Social, Organization)
- Quest board with difficulty levels
- Vault room builder
- Resource management
- XP and leveling system
- Sound effects and animations

Use the VAULT API at: https://your-project.vercel.app/api
```

## Step 2: API Client Setup

Create `lib/vault-api.ts`:

```typescript
const API_URL = 'https://your-project.vercel.app/api';

// Get or create player ID
function getPlayerId(): string {
  let id = localStorage.getItem('vault-player-id');
  if (!id) {
    id = 'player-' + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('vault-player-id', id);
  }
  return id;
}

export const playerId = getPlayerId();

// API wrapper
async function apiCall(endpoint: string, options: RequestInit = {}) {
  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'x-player-id': playerId,
      ...options.headers
    }
  });
  return res.json();
}

export const vaultAPI = {
  // Player
  getPlayer: () => apiCall('/player'),
  updatePlayer: (data: any) => apiCall('/player', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  
  // Quests
  getQuests: (status?: string) => 
    apiCall(`/quests${status ? `?status=${status}` : ''}`),
  createQuest: (quest: any) => apiCall('/quests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(quest)
  }),
  completeQuest: (questId: string) => apiCall('/quests/complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ questId })
  }),
  deleteQuest: (questId: string) => apiCall(`/quests?questId=${questId}`, {
    method: 'DELETE'
  }),
  
  // Vault
  getVault: () => apiCall('/vault'),
  upgradeRoom: (roomId: string) => apiCall('/vault', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roomId, action: 'upgrade' })
  }),
  
  // Campaigns
  getCampaigns: () => apiCall('/campaigns'),
  createCampaign: (campaign: any) => apiCall('/campaigns', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(campaign)
  }),
  updateCampaign: (campaignId: string, value: number) => apiCall('/campaigns', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ campaignId, action: 'increment', value })
  })
};
```

## Step 3: Key Components

### Player Store (State Management)

```typescript
// stores/player.ts
import { create } from 'zustand';
import { vaultAPI } from '@/lib/vault-api';

export const usePlayerStore = create((set, get) => ({
  player: null,
  quests: [],
  vault: null,
  
  loadPlayer: async () => {
    const data = await vaultAPI.getPlayer();
    if (data.success) {
      set({ player: data.player });
    }
  },
  
  loadQuests: async () => {
    const data = await vaultAPI.getQuests('active');
    if (data.success) {
      set({ quests: data.quests });
    }
  },
  
  completeQuest: async (questId: string) => {
    const result = await vaultAPI.completeQuest(questId);
    if (result.success) {
      get().loadPlayer();
      get().loadQuests();
      return result.result;
    }
  }
  
  // ... more actions
}));
```

### Quest Card Component

```tsx
// components/QuestCard.tsx
'use client';

import { motion } from 'framer-motion';
import { usePlayerStore } from '@/stores/player';

const DIFFICULTY_COLORS = {
  trivial: 'bg-gray-600',
  easy: 'bg-green-600',
  medium: 'bg-yellow-600',
  hard: 'bg-red-600',
  epic: 'bg-purple-600'
};

export function QuestCard({ quest }) {
  const { completeQuest } = usePlayerStore();
  
  const handleComplete = async () => {
    const result = await completeQuest(quest.id);
    
    // Play sound
    const audio = new Audio('/sounds/complete.mp3');
    audio.play();
    
    // Show reward modal
    showRewardModal(result);
  };
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="border border-green-500/30 bg-green-500/5 p-4 rounded-lg
                 hover:bg-green-500/10 transition-colors cursor-pointer
                 group"
    >
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-bold text-green-400">{quest.title}</h3>
          <p className="text-sm text-gray-400">{quest.category}</p>
        </div>
        <span className={`px-2 py-1 rounded text-xs ${DIFFICULTY_COLORS[quest.difficulty]}`}>
          {quest.difficulty}
        </span>
      </div>
      
      <div className="mt-4 flex justify-between items-center">
        <div className="flex gap-4 text-sm">
          <span className="text-yellow-400">💎 {quest.xpReward} XP</span>
          {quest.stats.map(stat => (
            <StatBadge key={stat} stat={stat} />
          ))}
        </div>
        
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleComplete}
          className="bg-green-500 text-black px-4 py-2 rounded
                     font-bold hover:bg-green-400 transition-colors"
        >
          Complete
        </motion.button>
      </div>
    </motion.div>
  );
}
```

### XP Bar Component

```tsx
// components/XPBar.tsx
'use client';

import { motion } from 'framer-motion';

export function XPBar({ level, currentXP, xpToNext, progress }) {
  return (
    <div className="w-full bg-gray-800 rounded-full h-8 overflow-hidden">
      <motion.div
        className="h-full bg-gradient-to-r from-green-500 to-green-400
                   flex items-center justify-center text-black font-bold"
        initial={{ width: 0 }}
        animate={{ width: `${progress * 100}%` }}
        transition={{ type: 'spring', stiffness: 100 }}
      >
        {progress > 0.2 && `Lv.${level}`}
      </motion.div>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs text-gray-400">
          {currentXP} / {xpToNext} XP
        </span>
      </div>
    </div>
  );
}
```

### Reward Modal

```tsx
// components/RewardModal.tsx
'use client';

import { motion, AnimatePresence } from 'framer-motion';

const RESOURCE_ICONS = {
  scrap: '🔧',
  food: '🥫',
  water: '💧',
  power: '⚡',
  meds: '💊',
  data: '💾'
};

const RARITY_COLORS = {
  common: 'text-gray-400',
  uncommon: 'text-green-400',
  rare: 'text-blue-400',
  epic: 'text-purple-400',
  legendary: 'text-yellow-400'
};

export function RewardModal({ result, onClose }) {
  const { reward, playerUpdate } = result;
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        exit={{ scale: 0, rotate: 180 }}
        transition={{ type: 'spring', stiffness: 200 }}
        className="bg-gray-900 border-2 border-green-500 rounded-2xl p-8 max-w-md w-full mx-4"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-3xl font-bold text-center mb-6 text-green-400">
          ⚔️ QUEST COMPLETE!
        </h2>
        
        <div className="text-center mb-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="text-5xl font-bold text-green-400 mb-2"
          >
            +{reward.finalXP} XP
          </motion.div>
          <p className="text-gray-400">Base: {reward.baseXP} XP</p>
        </div>
        
        {Object.entries(reward.multipliers).some(([k, v]) => v !== 1) && (
          <div className="mb-6">
            <h3 className="text-sm text-gray-500 mb-2">Multipliers</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(reward.multipliers)
                .filter(([k, v]) => v !== 1)
                .map(([k, v]) => (
                  <span key={k} className="bg-green-500/20 px-2 py-1 rounded text-sm">
                    {k} x{v.toFixed(1)}
                  </span>
                ))}
            </div>
          </div>
        )}
        
        <div className="mb-6">
          <h3 className="text-sm text-gray-500 mb-2">