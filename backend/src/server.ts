import express from 'express';
import cors from 'cors';
import { pool } from './db.js';
import { productRoutes } from './routes/products.routes.js';
import { customerRoutes } from './routes/customers.routes.js';
import { orderRoutes } from './routes/orders.routes.js';
import { kitchenRoutes } from './routes/kitchen.routes.js';
import { inventoryRoutes } from './routes/inventory.routes.js';
import { analyticsRoutes } from './routes/analytics.routes.js';

const app = express();
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

const port = Number(process.env.PORT) || 3001;
app.listen(port, () => console.log(`OvenFresh CDS API on http://localhost:${port}`));

// Periodic tasks — the abandoned-order cursor and daily stock init.
pool.query('SELECT init_daily_stock()').catch((e) => console.error('init_daily_stock:', e.message));
setInterval(() => {
  pool.query('SELECT mark_abandoned_orders()').catch((e) => console.error('mark_abandoned:', e.message));
}, 15 * 60 * 1000);
