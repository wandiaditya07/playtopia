import express from 'express';
import cors from 'cors';
import { seedMySQL } from './db_mysql.js';
import { requireAuth } from './middleware/auth.js';

import authRouter from './routes/auth.js';
import productsRouter from './routes/products.js';
import transactionsRouter from './routes/transactions.js';
import gateRouter from './routes/gate.js';
import membersRouter from './routes/members.js';
import shiftsRouter from './routes/shifts.js';
import simulatorRouter from './routes/simulator.js';
import adminRouter from './routes/admin.js';

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

seedMySQL().catch(err => {
  console.error('MySQL Init Warning:', err.message);
});

// Publik
app.use('/api/v1/auth', authRouter);
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Gate
app.use('/api/v1/gate', gateRouter);

// Protected routes
app.use('/api/v1/products', requireAuth, productsRouter);
app.use('/api/v1/transactions', requireAuth, transactionsRouter);
app.use('/api/v1/members', requireAuth, membersRouter);
app.use('/api/v1/shifts', requireAuth, shiftsRouter);
app.use('/api/v1/simulator', requireAuth, simulatorRouter);
app.use('/api/v1/admin', requireAuth, adminRouter);

// 404 Handler
app.use('/api', (req, res) => {
  res.status(404).json({ success: false, message: `Endpoint ${req.method} ${req.originalUrl} tidak ditemukan` });
});

app.listen(PORT, () => {
  console.log(`🚀 POS Backend READY di http://localhost:${PORT}`);
  console.log(`🔐 Auth: POST /api/v1/auth/login | Gate: POST /api/v1/gate/verify-access`);
});
