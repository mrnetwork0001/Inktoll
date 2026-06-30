import express from 'express';
import cors from 'cors';
import { config, validateConfig } from './config.js';
import { initDatabase } from './db/index.js';
import creatorsRouter from './routes/creators.js';
import articlesRouter from './routes/articles.js';
import feedRouter from './routes/feed.js';
import paymentsRouter from './routes/payments.js';
import citationsRouter from './routes/citations.js';
import faucetRouter from './routes/faucet.js';
import walletRouter from './routes/wallet.js';
import statsRouter from './routes/stats.js';

// Validate config
validateConfig();

// Initialize DB
initDatabase();

const app = express();

app.use(cors({
  exposedHeaders: [
    'Payment-Required', 'Payment-Amount', 'Payment-Token', 'Payment-Network', 'Payment-Recipient', 'Payment-Gateway',
    'X-Payment-Required', 'X-Payment-Amount', 'X-Payment-Token', 'X-Payment-Network', 'X-Payment-Recipient', 'X-Payment-Gateway'
  ]
}));
app.use(express.json());

// Routes
app.use('/api/creators', creatorsRouter);
app.use('/api/articles', articlesRouter);
app.use('/api/feed', feedRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/citations', citationsRouter);
app.use('/api/faucet', faucetRouter);
app.use('/api/wallet', walletRouter);
app.use('/api/stats', statsRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

app.listen(config.port, () => {
  console.log(`[Server] Inktoll backend listening on port ${config.port}`);
});
