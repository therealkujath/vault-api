# VAULT API - Post-Apocalyptic Life Gamification

A serverless API that turns your life into a Fallout-style vault management game. Perfect for ADHD productivity with immediate dopamine rewards.

## Quick Start

### 1. Deploy to Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

Your API will be at `https://your-project.vercel.app/api`

### 2. Connect to Lovable

In Lovable, add these API calls:

```javascript
const API_URL = 'https://your-project.vercel.app/api';

// Get player state
const player = await fetch(`${API_URL}/player`, {
  headers: { 'x-player-id': 'your-player-id' }
}).then(r => r.json());

// Create a quest
await fetch(`${API_URL}/quests`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-player-id': 'your-id' },
  body: JSON.stringify({
    title: 'Clean kitchen',
    difficulty: 'easy',
    category: 'chores',
    stats: ['ORG']
  })
});

// Complete a quest (GETS XP!)
await fetch(`${API_URL}/quests/complete`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-player-id': 'your-id' },
  body: JSON.stringify({ questId: 'quest-id-here' })
});
```

## API Endpoints

### Player
- `GET /api/player` - Get player profile, stats, resources
- `POST /api/player` - Update player preferences

### Quests
- `GET /api/quests` - List quests (query: `status=active|completed`)
- `POST /api/quests` - Create new quest
- `PUT /api/quests` - Update quest (start, edit)
- `DELETE /api/quests` - Delete quest
- `POST /api/quests/complete` - Complete quest, earn XP

### Vault
- `GET /api/vault` - View vault status, available upgrades
- `POST /api/vault` - Build/upgrade rooms

### Campaigns
- `GET /api/campaigns` - Long-term goals
- `POST /api/campaigns` - Create campaign
- `PUT /api/campaigns` - Update progress
- `DELETE /api/campaigns` - Abandon

### Game Info
- `GET /api/health` - Game configuration, stats info

## Quest Categories

- `health` - Workouts, sleep, meals → +VIT
- `work` - Deep work, career tasks → +FOC
- `chores` - Cleaning, organizing → +ORG
- `social` - Calls, events, networking → +SOC
- `creative` - Art, writing, projects → +CRE
- `admin` - Bills, paperwork → +ORG

## Difficulty Levels

| Level | XP | Time |
|-------|-----|------|
| trivial | 5 | < 5 min |
| easy | 25 | 5-15 min |
| medium | 50 | 15-30 min |
| hard | 100 | 30-60 min |
| epic | 250 | 60+ min |

## Vault Rooms

- **Generator** - Produces power
- **Water Purifier** - Produces water
- **Hydroponics Garden** - Produces food
- **Living Quarters** - +VIT bonus
- **Workshop** - +ORG/CRE bonus
- **Medbay** - +VIT bonus, produces meds
- **Radio Room** - +SOC bonus
- **Library** - +FOC bonus, produces data

## Multipliers

- **Speed Demon** (finish in <50% time): 3x XP
- **Quick Finish** (finish in <100% time): 2x XP
- **Daily First**: 1.5x XP (first completion of day)
- **Streak**: +5% per consecutive day
- **Stat Synergy**: +2% per level in relevant stat

## Lovable Integration

### Step 1: Create API Client in Lovable

Add to your Lovable project's `lib/api.ts`:

```typescript
const API_BASE = 'https://your-project.vercel.app/api';

export const api = {
  getPlayer: async (playerId: string) => {
    return fetch(`${API_BASE}/player`, {
      headers: { 'x-player-id': playerId }
    }).then(r => r.json());
  },
  
  createQuest: async (playerId: string, quest: any) => {
    return fetch(`${API_BASE}/quests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-player-id': playerId },
      body: JSON.stringify(quest)
    }).then(r => r.json());
  },
  
  completeQuest: async (playerId: string, questId: string) => {
    return fetch(`${API_BASE}/quests/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-player-id': playerId },
      body: JSON.stringify({ questId })
    }).then(r => r.json());
  }
  
  // ... add more methods
};
```

### Step 2: Create UI Components

**Quest Card:**
```tsx
export function QuestCard({ quest, onComplete }) {
  return (
    <div className="quest-card">
      <h3>{quest.title}</h3>
      <span className={`difficulty ${quest.difficulty}`}>
        {quest.difficulty}
      </span>
      <p>{quest.description}</p>
      <div className="rewards">
        💎 {quest.xpReward} XP
        {quest.stats.map(stat => <StatBadge key={stat} stat={stat} />)}
      </div>
      <button onClick={() => onComplete(quest.id)}>
        Complete
      </button>
    </div>
  );
}
```

**Vault Builder:**
```tsx
export function VaultBuilder({ vault, resources, onUpgrade }) {
  return (
    <div className="vault-grid">
      {Object.entries(ROOMS).map(([id, room]) => (
        <RoomCard
          key={id}
          room={room}
          level={vault[id]?.level || 0}
          canAfford={canAffordUpgrade(resources, room)}
          onUpgrade={() => onUpgrade(id)}
        />
      ))}
    </div>
  );
}
```

### Step 3: Add Sound Effects

When quest completes:
```typescript
const audio = new Audio('/sounds/level-up.mp3');
audio.play();

// Show floating XP numbers
showFloatingText(`+${result.reward.finalXP} XP`, x, y);
```

### Step 4: Animate Progress Bars

```tsx
<motion.div
  className="xp-bar-fill"
  initial={{ width: 0 }}
  animate={{ width: `${progress * 100}%` }}
  transition={{ type: "spring", stiffness: 100 }}
/>
```

## Data Storage

This API uses `/tmp` directory for storage in serverless environments. Data persists per-deployment but is not shared across deployments.

**For production:** Replace `lib/db.js` with a real database (Supabase, MongoDB, etc.)

## Customization

Edit `lib/game.js` to modify:
- XP formulas
- Loot tables
- Resource costs
- Room bonuses
- Stat names

## Multiplayer (Future)

Planned features:
- Friends list (`/api/friends`)
- Party quests (`/api/party`)
- Leaderboards (`/api/leaderboard`)
- Trading (`/api/trade`)

## License

MIT - Make it yours!

---

**Built for ADHD brains by someone who gets it.**
