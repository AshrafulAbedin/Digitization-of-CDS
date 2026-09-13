import { Router } from 'express';
import { pool } from '../db.js';

export const inventoryRoutes = Router();

inventoryRoutes.get('/raw-materials', async (_req, res) => {
  const result = await pool.query(
    `SELECT raw_material_id, name, unit, current_stock, reorder_level, average_unit_cost
       FROM raw_material ORDER BY name`,
  );
  res.json(result.rows);
});

inventoryRoutes.get('/ready-made-stock', async (_req, res) => {
  const result = await pool.query(
    `SELECT m.menu_item_id, m.name, m.selling_price, m.expires_daily,
            COALESCE(rms.current_stock, rmds.quantity_received - rmds.quantity_sold - rmds.quantity_wasted, 0) AS current_stock,
            COALESCE(rms.reorder_level, 0) AS reorder_level,
            COALESCE(rms.average_unit_cost, rmds.average_unit_cost, 0) AS average_unit_cost
       FROM menu_item m
       LEFT JOIN ready_made_stock rms ON rms.menu_item_id = m.menu_item_id
       LEFT JOIN ready_made_daily_stock rmds
              ON rmds.menu_item_id = m.menu_item_id AND rmds.stock_date = CURRENT_DATE
      WHERE m.is_prepared_in_kitchen = FALSE AND m.is_purchasable = TRUE
      ORDER BY m.name`,
  );
  res.json(result.rows);
});

inventoryRoutes.get('/daily-stock', async (req, res) => {
  const date = (req.query.date as string) || new Date().toISOString().slice(0, 10);
  const result = await pool.query(
    `SELECT d.*, m.name
       FROM ready_made_daily_stock d
       JOIN menu_item m ON m.menu_item_id = d.menu_item_id
      WHERE d.stock_date = $1 ORDER BY m.name`,
    [date],
  );
  res.json(result.rows);
});

inventoryRoutes.get('/vendors', async (_req, res) => {
  const result = await pool.query(
    `SELECT v.*, COALESCE(array_agg(vp.phone_number) FILTER (WHERE vp.phone_number IS NOT NULL), '{}') AS phones
       FROM vendor v LEFT JOIN vendor_phone vp ON vp.vendor_id = v.vendor_id
      GROUP BY v.vendor_id ORDER BY v.name`,
  );
  res.json(result.rows);
});

inventoryRoutes.post('/vendors', async (req, res) => {
  const { name, phone, address } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const v = await client.query(
      'INSERT INTO vendor (name, address) VALUES ($1, $2) RETURNING vendor_id, name',
      [name, address ?? null],
    );
    if (phone) {
      await client.query('INSERT INTO vendor_phone VALUES ($1, $2)', [v.rows[0].vendor_id, phone]);
    }
    await client.query('COMMIT');
    res.status(201).json(v.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

inventoryRoutes.get('/purchase-orders', async (_req, res) => {
  const result = await pool.query(
    `SELECT po.purchase_order_id, po.order_date, po.total_amount, po.notes,
            v.vendor_id, v.name AS vendor_name,
            (SELECT jsonb_agg(jsonb_build_object(
                      'item_type', pol.item_type, 'item_id', pol.item_id,
                      'quantity', pol.quantity, 'unit_cost', pol.unit_cost,
                      'item_name', CASE WHEN pol.item_type = 'raw_material'
                                        THEN (SELECT rm.name FROM raw_material rm WHERE rm.raw_material_id = pol.item_id)
                                        ELSE (SELECT mi.name FROM menu_item mi WHERE mi.menu_item_id = pol.item_id) END))
               FROM purchase_order_line pol
              WHERE pol.purchase_order_id = po.purchase_order_id) AS lines
       FROM purchase_order po
       JOIN vendor v ON v.vendor_id = po.vendor_id
      ORDER BY po.purchase_order_id DESC`,
  );
  res.json(result.rows);
});

// lines: [{ item_type, item_id, quantity, unit_cost }] — stock/wavg triggers fire per line.
inventoryRoutes.post('/purchase-orders', async (req, res) => {
  const { vendorId, notes, lines } = req.body;
  if (!Array.isArray(lines) || lines.length === 0) {
    res.status(400).json({ error: 'At least one line required' });
    return;
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const po = await client.query(
      'INSERT INTO purchase_order (vendor_id, notes, total_amount) VALUES ($1, $2, $3) RETURNING purchase_order_id',
      [vendorId, notes ?? null, lines.reduce((s: number, l: any) => s + l.quantity * l.unit_cost, 0)],
    );
    for (const l of lines) {
      await client.query(
        'INSERT INTO purchase_order_line (purchase_order_id, item_type, item_id, quantity, unit_cost) VALUES ($1, $2, $3, $4, $5)',
        [po.rows[0].purchase_order_id, l.item_type, l.item_id, l.quantity, l.unit_cost],
      );
    }
    await client.query('COMMIT');
    res.status(201).json(po.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

inventoryRoutes.post('/stockout', async (req, res) => {
  const { menuItemId, quantity } = req.body;
  const result = await pool.query('SELECT record_stockout($1, $2) AS request_id', [
    menuItemId,
    quantity ?? 1,
  ]);
  res.status(201).json(result.rows[0]);
});

inventoryRoutes.get('/stockout-log', async (_req, res) => {
  const result = await pool.query(
    `SELECT s.request_id, s.menu_item_id, m.name, s.quantity, s.request_date, s.request_time
       FROM stockout_request s JOIN menu_item m ON m.menu_item_id = s.menu_item_id
      ORDER BY s.request_time DESC LIMIT 200`,
  );
  res.json(result.rows);
});

// Waste model: daily-expiry rows carry quantity_wasted (schema's native model).
inventoryRoutes.get('/waste-log', async (_req, res) => {
  const result = await pool.query(
    `SELECT d.daily_stock_id, d.menu_item_id, m.name, d.stock_date, d.quantity_wasted,
            d.average_unit_cost, d.quantity_wasted * d.average_unit_cost AS cost_impact
       FROM ready_made_daily_stock d JOIN menu_item m ON m.menu_item_id = d.menu_item_id
      WHERE d.quantity_wasted > 0
      ORDER BY d.stock_date DESC, m.name LIMIT 200`,
  );
  res.json(result.rows);
});

inventoryRoutes.post('/waste', async (req, res) => {
  const { menuItemId, quantity } = req.body;
  const result = await pool.query(
    `UPDATE ready_made_daily_stock
        SET quantity_wasted = quantity_wasted + $2
      WHERE menu_item_id = $1 AND stock_date = CURRENT_DATE
      RETURNING daily_stock_id, quantity_wasted`,
    [menuItemId, quantity],
  );
  if (result.rowCount === 0) {
    res.status(404).json({ error: 'No daily stock row for this item today (run daily-stock/init)' });
    return;
  }
  res.json(result.rows[0]);
});

inventoryRoutes.post('/daily-stock/init', async (req, res) => {
  const result = await pool.query('SELECT init_daily_stock($1) AS rows_created', [
    req.body?.date ?? new Date().toISOString().slice(0, 10),
  ]);
  res.json(result.rows[0]);
});

inventoryRoutes.post('/daily-stock/end-of-day', async (req, res) => {
  const result = await pool.query('SELECT * FROM end_of_day_waste($1)', [
    req.body?.date ?? new Date().toISOString().slice(0, 10),
  ]);
  res.json(result.rows);
});

inventoryRoutes.patch('/menu-items/:id/price', async (req, res) => {
  const { id } = req.params;
  const { price } = req.body;
  const result = await pool.query('SELECT update_menu_item_price($1, $2) AS new_price', [
    id,
    price,
  ]);
  res.json(result.rows[0]);
});
