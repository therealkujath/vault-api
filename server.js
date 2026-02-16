// Express server for VAULT API - Works anywhere (Railway, Render, VPS, etc.)
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Import handlers dynamically
const loadHandler = async (path) => {
  const module = await import(path);
  return module.default;
};

// Health check
app.get('/api/health', async (req, res) => {
  const handler = await loadHandler('./api/health.js');
  handler(req, res);
});

// Player routes
app.get('/api/player', async (req, res) => {
  const handler = await loadHandler('./api/player.js');
  handler(req, res);
});

app.post('/api/player', async (req, res) => {
  const handler = await loadHandler('./api/player.js');
  handler(req, res);
});

// Quest routes
app.get('/api/quests', async (req, res) => {
  const handler = await loadHandler('./api/quests.js');
  handler(req, res);
});

app.post('/api/quests', async (req, res) => {
  const handler = await loadHandler('./api/quests.js');
  handler(req, res);
});

app.put('/api/quests', async (req, res) => {
  const handler = await loadHandler('./api/quests.js');
  handler(req, res);
});

app.delete('/api/quests', async (req, res) => {
  const handler = await loadHandler('./api/quests.js');
  handler(req, res);
});

// Quest complete
app.post('/api/quests/complete', async (req, res) => {
  const handler = await loadHandler('./api/quests/complete.js');
  handler(req, res);
});

// Vault routes
app.get('/api/vault', async (req, res) => {
  const handler = await loadHandler('./api/vault.js');
  handler(req, res);
});

app.post('/api/vault', async (req, res) => {
  const handler = await loadHandler('./api/vault.js');
  handler(req, res);
});

// Campaign routes
app.get('/api/campaigns', async (req, res) => {
  const handler = await loadHandler('./api/campaigns.js');
  handler(req, res);
});

app.post('/api/campaigns', async (req, res) => {
  const handler = await loadHandler('./api/campaigns.js');
  handler(req, res);
});

app.put('/api/campaigns', async (req, res) => {
  const handler = await loadHandler('./api/campaigns.js');
  handler(req, res);
});

app.delete('/api/campaigns', async (req, res) => {
  const handler = await loadHandler('./api/campaigns.js');
  handler(req, res);
});

// Serve static files (test UI)
app.use('/public', express.static(join(__dirname, 'public')));

// Root redirect to test UI
app.get('/', (req, res) => {
  res.redirect('/public/index.html');
});

app.listen(PORT, () => {
  console.log(`🎮 VAULT API running on port ${PORT}`);
  console.log(`📚 API docs: http://localhost:${PORT}/api/health`);
  console.log(`🎮 Test UI: http://localhost:${PORT}/`);
});
