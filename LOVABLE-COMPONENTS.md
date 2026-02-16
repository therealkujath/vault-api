# VAULT Components for Lovable

## 1. State Store (stores/vault.ts)

```typescript
import { create } from 'zustand';
import { vaultAPI, Player, Quest, CompleteQuestResult } from '@/lib/vault-api';

interface VaultState {
  // Data
  player: Player | null;
  quests: Quest[];
  vault: any | null;
  campaigns: any[];
  
  // UI State
  loading: boolean;
  error: string | null;
  lastReward: CompleteQuestResult | null;
  
  // Actions
  loadPlayer: () => Promise<void>;
  loadQuests: () => Promise<void>;
  loadVault: () => Promise<void>;
  loadAll: () => Promise<void>;
  createQuest: (quest: any) => Promise<boolean>;
  completeQuest: (questId: string) => Promise<CompleteQuestResult | null>;
  upgradeRoom: (roomId: string) => Promise<boolean>;
  clearReward: () => void;
}

export const useVaultStore = create<VaultState>((set, get) => ({
  player: null,
  quests: [],
  vault: null,
  campaigns: [],
  loading: false,
  error: null,
  lastReward: null,

  loadPlayer: async () => {
    try {
      const data = await vaultAPI.getPlayer();
      if (data.success) {
        set({ player: data.player });
      }
    } catch (err) {
      set({ error: 'Failed to load player' });
    }
  },

  loadQuests: async () => {
    try {
      const data = await vaultAPI.getQuests('active');
      if (data.success) {
        set({ quests: data.quests });
      }
    } catch (err) {
      set({ error: 'Failed to load quests' });
    }
  },

  loadVault: async () => {
    try {
      const data = await vaultAPI.getVault();
      if (data.success) {
        set({ vault: data });
      }
    } catch (err) {
      set({ error: 'Failed to load vault' });
    }
  },

  loadAll: async () => {
    set({ loading: true });
    await Promise.all([
      get().loadPlayer(),
      get().loadQuests(),
      get().loadVault(),
    ]);
    set({ loading: false });
  },

  createQuest: async (quest) => {
    try {
      const data = await vaultAPI.createQuest(quest);
      if (data.success) {
        await get().loadQuests();
        return true;
      }
      return false;
    } catch (err) {
      set({ error: 'Failed to create quest' });
      return false;
    }
  },

  completeQuest: async (questId) => {
    try {
      const data = await vaultAPI.completeQuest(questId);
      if (data.success) {
        set({ lastReward: data.result });
        await Promise.all([get().loadPlayer(), get().loadQuests()]);
        return data.result;
      }
      return null;
    } catch (err) {
      set({ error: 'Failed to complete quest' });
      return null;
    }
  },

  upgradeRoom: async (roomId) => {
    try {
      const data = await vaultAPI.upgradeRoom(roomId);
      if (data.success) {
        await get().loadVault();
        await get().loadPlayer();
        return true;
      }
      return false;
    } catch (err) {
      set({ error: 'Failed to upgrade room' });
      return false;
    }
  },

  clearReward: () => set({ lastReward: null }),
}));
```

## 2. Main Page (app/page.tsx)

```tsx
'use client';

import { useEffect } from 'react';
import { useVaultStore } from '@/stores/vault';
import { StatsGrid } from '@/components/StatsGrid';
import { QuestBoard } from '@/components/QuestBoard';
import { ResourceBar } from '@/components/ResourceBar';
import { XPBar } from '@/components/XPBar';
import { StreakDisplay } from '@/components/StreakDisplay';
import { RewardModal } from '@/components/RewardModal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function VaultPage() {
  const { player, loading, lastReward, loadAll, clearReward } = useVaultStore();

  useEffect(() => {
    loadAll();
  }, []);

  if (loading || !player) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-green-400 font-mono animate-pulse">
          Initializing VAULT...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-green-400 font-mono p-4">
      <header className="text-center mb-8">
        <h1 className="text-5xl font-bold mb-2 text-green-400 drop-shadow-[0_0_10px_rgba(0,255,65,0.5)]">
          🔒 VAULT
        </h1>
        <p className="text-green-600 text-sm">Post-Apocalyptic Life Management</p>
      </header>

      <div className="max-w-4xl mx-auto space-y-6">
        <StreakDisplay streak={player.streak} />
        
        <StatsGrid stats={player.stats} />
        
        <XPBar 
          level={player.level}
          currentXP={player.currentXP}
          xpToNext={player.xpToNext}
          progress={player.progress}
        />

        <ResourceBar resources={player.resources} />

        <Tabs defaultValue="quests" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-gray-900 border border-green-500/30">
            <TabsTrigger value="quests">⚔️ Quests</TabsTrigger>
            <TabsTrigger value="vault">🏢 Vault</TabsTrigger>
          </TabsList>
          
          <TabsContent value="quests">
            <QuestBoard />
          </TabsContent>
          
          <TabsContent value="vault">
            <VaultBuilder />
          </TabsContent>
        </Tabs>
      </div>

      {lastReward && (
        <RewardModal 
          result={lastReward} 
          onClose={clearReward}
        />
      )}
    </div>
  );
}
```

## 3. Stats Grid (components/StatsGrid.tsx)

```tsx
'use client';

import { motion } from 'framer-motion';

const STAT_CONFIG = {
  VIT: { name: 'Vitality', icon: '❤️', color: '#ff4444', desc: 'Health & fitness' },
  FOC: { name: 'Focus', icon: '🧠', color: '#4444ff', desc: 'Deep work & concentration' },
  CRE: { name: 'Creativity', icon: '🎨', color: '#ff44ff', desc: 'Art & projects' },
  SOC: { name: 'Social', icon: '👥', color: '#44ff44', desc: 'Relationships' },
  ORG: { name: 'Organization', icon: '📋', color: '#ffaa00', desc: 'Chores & planning' },
};

export function StatsGrid({ stats }: { stats: Record<string, { level: number; xp: number; totalXP: number }> }) {
  return (
    <div className="grid grid-cols-5 gap-3">
      {Object.entries(STAT_CONFIG).map(([key, config], index) => {
        const stat = stats[key];
        if (!stat) return null;
        
        const xpForNext = Math.floor(100 * Math.pow(stat.level, 1.5));
        const progress = (stat.xp / xpForNext) * 100;
        
        return (
          <motion.div
            key={key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-gray-900/50 border border-green-500/20 rounded-lg p-3 text-center"
          >
            <div className="text-3xl mb-1">{config.icon}</div>
            <div className="text-xs text-gray-400 mb-1">{config.name}</div>
            <div className="text-xl font-bold" style={{ color: config.color }}>
              Lv.{stat.level}
            </div>
            <div className="w-full bg-gray-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: config.color }}
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
```

## 4. Quest Board (components/QuestBoard.tsx)

```tsx
'use client';

import { useState } from 'react';
import { useVaultStore } from '@/stores/vault';
import { QuestCard } from './QuestCard';
import { QuestCreator } from './QuestCreator';

export function QuestBoard() {
  const { quests, createQuest } = useVaultStore();
  const [showCreator, setShowCreator] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Active Quests</h2>
        <button
          onClick={() => setShowCreator(!showCreator)}
          className="bg-green-500 text-black px-4 py-2 rounded font-bold hover:bg-green-400"
        >
          {showCreator ? '✕ Cancel' : '+ New Quest'}
        </button>
      </div>

      {showCreator && (
        <QuestCreator onCreate={() => setShowCreator(false)} />
      )}

      <div className="space-y-3">
        {quests.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-4xl mb-2">📭</p>
            <p>No active quests</p>
            <p className="text-sm">Create one to start earning XP!</p>
          </div>
        ) : (
          quests.map((quest) => (
            <QuestCard key={quest.id} quest={quest} />
          ))
        )}
      </div>
    </div>
  );
}
```

## 5. Quest Card (components/QuestCard.tsx)

```tsx
'use client';

import { motion } from 'framer-motion';
import { useVaultStore } from '@/stores/vault';
import { Quest } from '@/lib/vault-api';

const DIFFICULTY_STYLES = {
  trivial: { bg: 'bg-gray-600', text: 'text-gray-300' },
  easy: { bg: 'bg-green-600', text: 'text-green-100' },
  medium: { bg: 'bg-yellow-600', text: 'text-yellow-100' },
  hard: { bg: 'bg-red-600', text: 'text-red-100' },
  epic: { bg: 'bg-purple-600', text: 'text-purple-100' },
};

const CATEGORY_ICONS = {
  health: '❤️',
  work: '💼',
  chores: '🧹',
  social: '👥',
  creative: '🎨',
  admin: '📋',
};

export function QuestCard({ quest }: { quest: Quest }) {
  const { completeQuest } = useVaultStore();
  const difficulty = DIFFICULTY_STYLES[quest.difficulty];

  const handleComplete = async () => {
    // Play sound effect
    const audio = new Audio('/sounds/complete.mp3');
    audio.volume = 0.5;
    audio.play().catch(() => {});
    
    await completeQuest(quest.id);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      whileHover={{ scale: 1.02 }}
      className="bg-gray-900/50 border border-green-500/20 rounded-lg p-4 
                 hover:border-green-500/50 transition-colors group"
    >
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">{CATEGORY_ICONS[quest.category] || '📋'}</span>
            <h3 className="font-bold text-lg text-green-100">{quest.title}</h3>
          </div>
          
          {quest.description && (
            <p className="text-gray-400 text-sm mb-3">{quest.description}</p>
          )}
          
          <div className="flex items-center gap-3 text-sm">
            <span className={`px-2 py-0.5 rounded text-xs font-bold ${difficulty.bg} ${difficulty.text}`}>
              {quest.difficulty.toUpperCase()}
            </span>
            <span className="text-yellow-400">💎 {quest.xpReward} XP</span>
            <span className="text-gray-500">→ {quest.stats.join(', ')}</span>
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleComplete}
          className="bg-green-500 hover:bg-green-400 text-black font-bold 
                     px-4 py-2 rounded transition-colors"
        >
          Complete
        </motion.button>
      </div>
    </motion.div>
  );
}
```

## 6. Reward Modal (components/RewardModal.tsx)

```tsx
'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { CompleteQuestResult } from '@/lib/vault-api';

const RESOURCE_ICONS = {
  scrap: '🔧',
  food: '🥫',
  water: '💧',
  power: '⚡',
  meds: '💊',
  data: '💾',
};

const RARITY_COLORS = {
  common: 'text-gray-400',
  uncommon: 'text-green-400',
  rare: 'text-blue-400',
  epic: 'text-purple-400',
  legendary: 'text-yellow-400',
};

interface Props {
  result: CompleteQuestResult;
  onClose: () => void;
}

export function RewardModal({ result, onClose }: Props) {
  const { reward, playerUpdate } = result;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        exit={{ scale: 0, rotate: 180 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className="bg-gray-900 border-2 border-green-500 rounded-2xl p-8 max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-3xl font-bold text-center mb-6 text-green-400">
          ⚔️ QUEST COMPLETE!
        </h2>

        {/* XP */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring' }}
          className="text-center mb-6"
        >
          <div className="text-6xl font-bold text-green-400 mb-2">
            +{reward.finalXP}
          </div>
          <div className="text-green-600">XP GAINED</div>
        </motion.div>

        {/* Multipliers */}
        {Object.entries(reward.multipliers).some(([_, v]) => v !== 1) && (
          <div className="mb-6">
            <h3 className="text-sm text-gray-500 mb-2">Multipliers</h3>
            <div className="flex flex-wrap gap-2 justify-center">
              {reward.multipliers.time > 1 && (
                <span className="bg-green-500/20 px-3 py-1 rounded-full text-sm text-green-400">
                  Speed x{reward.multipliers.time.toFixed(1)}
                </span>
              )}
              {reward.multipliers.streak > 1 && (
                <span className="bg-orange-500/20 px-3 py-1 rounded-full text-sm text-orange-400">
                  Streak x{reward.multipliers.streak.toFixed(2)}
                </span>
              )}
              {reward.multipliers.dailyFirst > 1 && (
                <span className="bg-blue-500/20 px-3 py-1 rounded-full text-sm text-blue-400">
                  Daily First x{reward.multipliers.dailyFirst}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Resources */}
        {Object.keys(reward.resources).length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm text-gray-500 mb-2">Resources</h3>
            <div className="flex flex-wrap gap-3 justify-center">
              {Object.entries(reward.resources).map(([key, amount]) => (
                <span key={key} className="text-lg">
                  {RESOURCE_ICONS[key]} +{amount} {key}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Loot */}
        {reward.loot.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm text-gray-500 mb-2">🎁 Loot Drops!</h3>
            <div className="space-y-2">
              {reward.loot.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  className={`text-center font-bold ${RARITY_COLORS[item.rarity]}`}
                >
                  {item.name} ({item.rarity})
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Level Ups */}
        {playerUpdate.statLevelUps.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm text-gray-500 mb-2">Level Ups!</h3>
            {playerUpdate.statLevelUps.map((levelUp) => (
              <div key={levelUp.stat} className="text-center text-green-400">
                {levelUp.stat} → Level {levelUp.newLevel}!
              </div>
            ))}
          </div>
        )}

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onClose}
          className="w-full bg-green-500 hover:bg-green-400 text-black font-bold 
                     py-3 rounded-lg text-lg"
        >
          AWESOME! 🎉
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
```

## Quick Start Commands for Lovable

Paste this into Lovable chat after creating project:

```
Set up the VAULT project with:
1. Create lib/vault-api.ts with the API client
2. Create stores/vault.ts with Zustand state management  
3. Create components: StatsGrid, QuestBoard, QuestCard, RewardModal
4. Create the main page with tabs for Quests and Vault
5. Use dark theme with green terminal aesthetic
6. Add framer-motion for all animations
```
