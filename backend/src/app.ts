import express from 'express';
import cors from 'cors';
import { pool } from './db.js';
import { productRoutes } from './routes/products.routes.js';
import { customerRoutes } from './routes/customers.routes.js';
import { orderRoutes } from './routes/orders.routes.js';
import { kitchenRoutes } from './routes/kitchen.routes.js';
import { inventoryRoutes } from './routes/inventory.routes.js';
import { analyticsRoutes } from './routes/analytics.routes.js';

export const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', async (_req, res) => {
  await pool.query('SELECT 1');
  res.json({ ok: true });
});

app.use('/api/products', productRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/kitchen', kitchenRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/analytics', analyticsRoutes);

// Express 5 forwards rejected promises here automatically.
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: err.message });
});
