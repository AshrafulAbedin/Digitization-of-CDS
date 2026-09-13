import { Router } from 'express';
import { pool } from '../db.js';

export const kitchenRoutes = Router();

kitchenRoutes.get('/orders', async (_req, res) => {
  const result = await pool.query('SELECT * FROM get_kitchen_orders()');
  res.json(result.rows);
});

kitchenRoutes.get('/requests', async (_req, res) => {
  const result = await pool.query('SELECT * FROM get_pending_requests() ORDER BY requested_at');
  res.json(result.rows);
});

// POS polls a single request to learn the kitchen's verdict.
kitchenRoutes.get('/requests/:id', async (req, res) => {
  const result = await pool.query(
    `SELECT request_id, order_id, menu_item_id, requested_quantity, status, approved_quantity
       FROM kitchen_request WHERE request_id = $1`,
    [req.params.id],
  );
  if (result.rowCount === 0) {
    res.status(404).json({ error: 'Request not found' });
    return;
  }
  res.json(result.rows[0]);
});

kitchenRoutes.post('/requests', async (req, res) => {
  const { orderId, menuItemId, requestedQty } = req.body;
  const result = await pool.query(
    'SELECT create_kitchen_request($1, $2, $3) AS request_id',
    [orderId ?? null, menuItemId, requestedQty],
  );
  res.status(201).json(result.rows[0]);
});

kitchenRoutes.patch('/requests/:id', async (req, res) => {
  const { status, approvedQty } = req.body;
  await pool.query('SELECT respond_to_kitchen_request($1, $2, $3)', [
    req.params.id,
    status,
    approvedQty ?? null,
  ]);
  res.json({ ok: true });
});

// materials: [{ raw_material_id, quantity }]
kitchenRoutes.post('/batches', async (req, res) => {
  const { menuItemId, materials } = req.body;
  const result = await pool.query('SELECT create_batch($1, $2) AS batch_id', [
    menuItemId,
    JSON.stringify(materials ?? []),
  ]);
  res.status(201).json(result.rows[0]);
});

kitchenRoutes.patch('/batches/:id/status', async (req, res) => {
  await pool.query('SELECT update_batch_status($1, $2)', [req.params.id, req.body.status]);
  res.json({ ok: true });
});
