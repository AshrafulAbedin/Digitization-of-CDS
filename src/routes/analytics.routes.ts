import { Router } from 'express';
import { pool } from '../db.js';

export const analyticsRoutes = Router();

const today = () => new Date().toISOString().slice(0, 10);

analyticsRoutes.get('/profit', async (req, res) => {
  const start = (req.query.start as string) || today();
  const end = (req.query.end as string) || today();
  const result = await pool.query('SELECT * FROM get_profit_report($1, $2)', [start, end]);
  res.json(result.rows);
});

analyticsRoutes.get('/top-sellers', async (req, res) => {
  const result = await pool.query('SELECT * FROM get_top_selling_items($1, $2)', [
    req.query.limit ?? 10,
    req.query.days ?? 30,
  ]);
  res.json(result.rows);
});

analyticsRoutes.get('/top-requested', async (req, res) => {
  const result = await pool.query('SELECT * FROM get_top_requested_items($1, $2)', [
    req.query.limit ?? 10,
    req.query.days ?? 30,
  ]);
  res.json(result.rows);
});

analyticsRoutes.get('/waste', async (req, res) => {
  const start = (req.query.start as string) || today();
  const end = (req.query.end as string) || today();
  const result = await pool.query('SELECT * FROM get_waste_report($1, $2)', [start, end]);
  res.json(result.rows);
});

analyticsRoutes.get('/peak-hours', async (req, res) => {
  const result = await pool.query('SELECT * FROM get_peak_hours($1)', [req.query.days ?? 30]);
  res.json(result.rows);
});

analyticsRoutes.get('/vendor-performance', async (_req, res) => {
  const result = await pool.query('SELECT * FROM get_vendor_performance()');
  res.json(result.rows);
});

analyticsRoutes.get('/preparation-report', async (req, res) => {
  const day =
    (req.query.day as string) || new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const result = await pool.query('SELECT * FROM get_preparation_report($1)', [day]);
  res.json(result.rows);
});

analyticsRoutes.post('/stock-recommendation', async (req, res) => {
  const { menuItemId, weeks } = req.body;
  const result = await pool.query('SELECT calculate_stock_recommendation($1, $2) AS recommended', [
    menuItemId,
    weeks ?? 4,
  ]);
  res.json(result.rows[0]);
});

// Aggregates for the dashboard: orders + payment/dine mix in one round trip.
analyticsRoutes.get('/orders-summary', async (req, res) => {
  const start = (req.query.start as string) || today();
  const end = (req.query.end as string) || today();
  const byDay = await pool.query(
    `SELECT order_timestamp::date AS day, COUNT(*) AS orders, COALESCE(SUM(total_paid), 0) AS revenue
       FROM customer_order
      WHERE order_timestamp::date BETWEEN $1 AND $2 AND status <> 'abandoned'
      GROUP BY 1 ORDER BY 1`,
    [start, end],
  );
  const mix = await pool.query(
    `SELECT COUNT(*) FILTER (WHERE payment_method = 'cash') AS cash,
            COUNT(*) FILTER (WHERE payment_method = 'mobile') AS mobile,
            COUNT(*) FILTER (WHERE dine_in_takeaway = 'dine_in') AS dine_in,
            COUNT(*) FILTER (WHERE dine_in_takeaway = 'takeaway') AS takeaway,
            COUNT(*) FILTER (WHERE status = 'abandoned') AS abandoned
       FROM customer_order
      WHERE order_timestamp::date BETWEEN $1 AND $2`,
    [start, end],
  );
  const vendors = await pool.query(
    `SELECT v.vendor_id, v.name, COUNT(po.purchase_order_id) AS po_count,
            COALESCE(SUM(po.total_amount), 0) AS total_spend
       FROM vendor v
       JOIN purchase_order po ON po.vendor_id = v.vendor_id
      WHERE po.order_date BETWEEN $1 AND $2
      GROUP BY v.vendor_id, v.name ORDER BY total_spend DESC`,
    [start, end],
  );
  res.json({ byDay: byDay.rows, mix: mix.rows[0], vendors: vendors.rows });
});
