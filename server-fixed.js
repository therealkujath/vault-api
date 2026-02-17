// Express server for VAULT API - Fixed version with error handling
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-player-id']
}));
app.use(express.json());

// Import all handlers statically (more reliable)
import healthHandler from './api/health.js';
import playerHandler from './api/player.js';
import questsHandler from './api/quests.js';
import questCompleteHandler from './api/quests/complete.js';
import vaultHandler from './api/vault.js';
import campaignsHandler from './api/campaigns.js';

// Wrapper to catch errors
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Health check
app.get('/api/health', asyncHandler(healthHandler));

// Player routes
app.get('/api/player', asyncHandler(playerHandler));
app.post('/api/player', asyncHandler(playerHandler));

// Quest routes
app.get('/api/quests', asyncHandler(questsHandler));
app.post('/api/quests', asyncHandler(questsHandler));
app.put('/api/quests', asyncHandler(questsHandler));
app.delete('/api/quests', asyncHandler(questsHandler));

// Quest complete
app.post('/api/quests/complete', asyncHandler(questCompleteHandler));

// Vault routes
app.get('/api/vault', asyncHandler(vaultHandler));
app.post('/api/vault', asyncHandler(vaultHandler));

// Campaign routes
app.get('/api/campaigns', asyncHandler(campaignsHandler));
app.post('/api/campaigns', asyncHandler(campaignsHandler));
app.put('/api/campaigns', asyncHandler(campaignsHandler));
app.delete('/api/campaigns', asyncHandler(campaignsHandler));

// Serve static files (test UI)
app.use('/public', express.static(join(__dirname, 'public')));

// Root redirect to test UI
app.get('/', (req, res) => {
  res.redirect('/public/index.html');
});

// Error handler
app.use((err, req, res, next) => {
  console.error('API Error:', err);
  res.status(500).json({
    success: false,
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not found',
    path: req.path
  });
});

app.listen(PORT, () => {
  console.log(`🎮 VAULT API running on port ${PORT}`);
  console.log(`📚 API docs: http://localhost:${PORT}/api/health`);
  console.log(`🎮 Test UI: http://localhost:${PORT}/`);
});
