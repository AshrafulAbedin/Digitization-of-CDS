import { Router } from 'express';
import { pool } from '../db.js';

export const productRoutes = Router();

productRoutes.get('/', async (_req, res) => {
  const result = await pool.query('SELECT * FROM get_cashier_products() ORDER BY type, name');
  res.json(result.rows);
});

productRoutes.get('/batches', async (_req, res) => {
  const result = await pool.query('SELECT * FROM get_active_batches() ORDER BY id');
  res.json(result.rows);
});
