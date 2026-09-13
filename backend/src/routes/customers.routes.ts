import { Router } from 'express';
import { pool } from '../db.js';

export const customerRoutes = Router();

customerRoutes.get('/search', async (req, res) => {
  const { phone, idType, idNumber } = req.query;
  let result;
  if (phone) {
    result = await pool.query('SELECT * FROM find_customer_by_phone($1)', [phone]);
  } else if (idType && idNumber) {
    result = await pool.query('SELECT * FROM find_customer_by_id($1, $2)', [idType, idNumber]);
  } else {
    res.status(400).json({ error: 'Provide phone, or idType + idNumber' });
    return;
  }
  res.json(result.rows);
});

customerRoutes.post('/register', async (req, res) => {
  const { name, phone, idType, idNumber } = req.body;
  const result = await pool.query('SELECT register_customer($1, $2, $3, $4) AS customer_id', [
    name,
    phone,
    idType,
    idNumber,
  ]);
  res.status(201).json(result.rows[0]);
});

customerRoutes.post('/temporary', async (req, res) => {
  const { name } = req.body;
  const result = await pool.query(
    'INSERT INTO customer (name, is_temporary) VALUES ($1, TRUE) RETURNING customer_id',
    [name]
  );
  res.status(201).json(result.rows[0]);
});

customerRoutes.get('/:id/active-orders', async (req, res) => {
  const result = await pool.query('SELECT * FROM get_active_orders($1)', [req.params.id]);
  res.json(result.rows);
});
