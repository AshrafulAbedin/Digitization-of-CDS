import { Router } from 'express';
import { pool } from '../db.js';

export const orderRoutes = Router();

// items: [{ menu_item_id, quantity, batch_id? }]
orderRoutes.post('/', async (req, res) => {
  const { customerId, paymentMethod, dineTakeaway, items } = req.body;
  const result = await pool.query('SELECT create_order($1, $2, $3, $4) AS order_id', [
    customerId ?? 1,
    paymentMethod,
    dineTakeaway,
    JSON.stringify(items),
  ]);
  res.status(201).json(result.rows[0]);
});

// The token the next charged order will get (POS ticket header).
orderRoutes.get('/next-token', async (_req, res) => {
  const result = await pool.query(
    'SELECT COALESCE(MAX(order_id), 0) + 1 AS next_token FROM customer_order',
  );
  res.json(result.rows[0]);
});

// Board for KDS + Token Display: every live order and its kitchen lines.
orderRoutes.get('/board', async (_req, res) => {
  const result = await pool.query(`
    SELECT o.order_id, c.name AS customer_name, o.status, o.order_timestamp,
           o.last_status_update, o.dine_in_takeaway,
           (SELECT jsonb_agg(jsonb_build_object('name', m.name, 'qty', ol.quantity))
              FROM order_line ol
              JOIN menu_item m ON m.menu_item_id = ol.menu_item_id
             WHERE ol.order_id = o.order_id AND m.is_prepared_in_kitchen) AS items
      FROM customer_order o
      JOIN customer c ON c.customer_id = o.customer_id
     WHERE o.status IN ('paid', 'preparing', 'ready')
       AND EXISTS (SELECT 1 FROM order_line ol2
                     JOIN menu_item m2 ON m2.menu_item_id = ol2.menu_item_id
                    WHERE ol2.order_id = o.order_id AND m2.is_prepared_in_kitchen)
     ORDER BY o.order_timestamp`);
  res.json(result.rows);
});

orderRoutes.patch('/:id/status', async (req, res) => {
  const { status } = req.body;
  const allowed = ['paid', 'preparing', 'ready', 'served', 'abandoned', 'completed'];
  if (!allowed.includes(status)) {
    res.status(400).json({ error: `status must be one of ${allowed.join(', ')}` });
    return;
  }
  const result = await pool.query(
    'UPDATE customer_order SET status = $1 WHERE order_id = $2 RETURNING order_id, status',
    [status, req.params.id],
  );
  if (result.rowCount === 0) {
    res.status(404).json({ error: 'Order not found' });
    return;
  }
  res.json(result.rows[0]);
});

orderRoutes.post('/mark-abandoned', async (_req, res) => {
  const result = await pool.query('SELECT mark_abandoned_orders() AS marked');
  res.json(result.rows[0]);
});
