-- ============================================
-- 08_analytics.sql
-- ============================================

CREATE OR REPLACE FUNCTION get_profit_report(p_start_date DATE, p_end_date DATE) 
RETURNS TABLE(
    total_revenue DECIMAL, 
    total_cost DECIMAL, 
    total_profit DECIMAL, 
    prepared_revenue DECIMAL, 
    prepared_cost DECIMAL, 
    readymade_revenue DECIMAL, 
    readymade_cost DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  WITH rev_stats AS (
      SELECT 
          COALESCE(SUM(ol.quantity * ol.unit_price_snapshot), 0) AS revenue,
          COALESCE(SUM(CASE WHEN m.is_prepared_in_kitchen THEN ol.quantity * ol.unit_price_snapshot ELSE 0 END), 0) AS p_rev,
          COALESCE(SUM(CASE WHEN NOT m.is_prepared_in_kitchen THEN ol.quantity * ol.unit_price_snapshot ELSE 0 END), 0) AS r_rev
      FROM order_line ol
      JOIN customer_order co ON ol.order_id = co.order_id
      JOIN menu_item m ON ol.menu_item_id = m.menu_item_id
      WHERE DATE(co.order_timestamp) BETWEEN p_start_date AND p_end_date
  ),
  rm_cost_stats AS (
      SELECT COALESCE(SUM(ol.quantity * ol.unit_cost_at_time), 0) AS r_cost
      FROM order_line ol
      JOIN customer_order co ON ol.order_id = co.order_id
      WHERE DATE(co.order_timestamp) BETWEEN p_start_date AND p_end_date
      AND ol.unit_cost_at_time IS NOT NULL
  ),
  prep_cost_stats AS (
      SELECT COALESCE(SUM(kbl.quantity_taken * kbl.unit_cost_at_time), 0) AS p_cost
      FROM kitchen_batch_issue_line kbl
      JOIN kitchen_batch_issue kb ON kbl.batch_id = kb.batch_id
      WHERE DATE(kb.issued_at) BETWEEN p_start_date AND p_end_date
  )
  SELECT 
      rs.revenue,
      (rm.r_cost + pc.p_cost) AS total_cost,
      (rs.revenue - (rm.r_cost + pc.p_cost)) AS total_profit,
      rs.p_rev AS prepared_revenue,
      pc.p_cost AS prepared_cost,
      rs.r_rev AS readymade_revenue,
      rm.r_cost AS readymade_cost
  FROM rev_stats rs, rm_cost_stats rm, prep_cost_stats pc;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_top_selling_items(p_limit INTEGER DEFAULT 10, p_days INTEGER DEFAULT 30) 
RETURNS TABLE(menu_item_id INT, item_name TEXT, total_quantity BIGINT, total_revenue DECIMAL, item_type TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
      m.menu_item_id, 
      m.name AS item_name, 
      SUM(ol.quantity) AS total_quantity, 
      SUM(ol.quantity * ol.unit_price_snapshot) AS total_revenue,
      CASE WHEN m.is_prepared_in_kitchen THEN 'PREPARED' ELSE 'READY_MADE' END AS item_type
  FROM order_line ol
  JOIN menu_item m ON ol.menu_item_id = m.menu_item_id
  JOIN customer_order co ON ol.order_id = co.order_id
  WHERE DATE(co.order_timestamp) >= CURRENT_DATE - p_days
  GROUP BY m.menu_item_id, m.name, m.is_prepared_in_kitchen
  ORDER BY total_quantity DESC 
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_top_requested_items(p_limit INTEGER DEFAULT 10, p_days INTEGER DEFAULT 30) 
RETURNS TABLE(menu_item_id INT, item_name TEXT, total_requests BIGINT, item_type TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
      m.menu_item_id, 
      m.name AS item_name, 
      SUM(sr.quantity) AS total_requests,
      CASE WHEN m.is_prepared_in_kitchen THEN 'PREPARED' ELSE 'READY_MADE' END AS item_type
  FROM stockout_request sr
  JOIN menu_item m ON sr.menu_item_id = m.menu_item_id
  WHERE sr.request_date >= CURRENT_DATE - p_days
  GROUP BY m.menu_item_id, m.name, m.is_prepared_in_kitchen
  ORDER BY total_requests DESC 
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_waste_report(p_start_date DATE, p_end_date DATE) 
RETURNS TABLE(menu_item_id INT, item_name TEXT, total_received BIGINT, total_sold BIGINT, total_wasted BIGINT, waste_percentage DECIMAL) AS $$
BEGIN
  RETURN QUERY
  SELECT 
      r.menu_item_id, 
      m.name AS item_name, 
      SUM(r.quantity_received) AS total_received, 
      SUM(r.quantity_sold) AS total_sold, 
      SUM(r.quantity_wasted) AS total_wasted, 
      (SUM(r.quantity_wasted)::DECIMAL / NULLIF(SUM(r.quantity_received), 0)) * 100 AS waste_percentage
  FROM ready_made_daily_stock r
  JOIN menu_item m ON r.menu_item_id = m.menu_item_id
  WHERE r.stock_date BETWEEN p_start_date AND p_end_date
  GROUP BY r.menu_item_id, m.name;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_peak_hours(p_days INTEGER DEFAULT 30) 
RETURNS TABLE(hour_of_day INT, order_count BIGINT, total_revenue DECIMAL) AS $$
BEGIN
  RETURN QUERY
  SELECT 
      CAST(EXTRACT(HOUR FROM co.order_timestamp) AS INT) AS hour_of_day, 
      COUNT(co.order_id) AS order_count, 
      SUM(co.total_paid) AS total_revenue
  FROM customer_order co
  WHERE DATE(co.order_timestamp) >= CURRENT_DATE - p_days
  GROUP BY EXTRACT(HOUR FROM co.order_timestamp)
  ORDER BY order_count DESC;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_vendor_performance() 
RETURNS TABLE(vendor_id INT, vendor_name TEXT, item_name TEXT, avg_unit_cost DECIMAL, total_quantity DECIMAL, total_spent DECIMAL) AS $$
BEGIN
  RETURN QUERY
  SELECT 
      v.vendor_id, 
      v.name AS vendor_name, 
      COALESCE(rm.name, m.name) AS item_name, 
      AVG(pol.unit_cost) AS avg_unit_cost, 
      SUM(pol.quantity) AS total_quantity, 
      SUM(pol.quantity * pol.unit_cost) AS total_spent
  FROM purchase_order_line pol
  JOIN purchase_order po ON pol.purchase_order_id = po.purchase_order_id
  JOIN vendor v ON po.vendor_id = v.vendor_id
  LEFT JOIN raw_material rm ON pol.item_type = 'raw_material' AND pol.item_id = rm.raw_material_id
  LEFT JOIN menu_item m ON pol.item_type = 'ready_made' AND pol.item_id = m.menu_item_id
  GROUP BY v.vendor_id, v.name, COALESCE(rm.name, m.name);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION calculate_stock_recommendation(p_menu_item_id INTEGER, p_weeks INTEGER DEFAULT 4) 
RETURNS INTEGER AS $$
DECLARE
  v_avg_sales DECIMAL := 0;
  v_stddev_sales DECIMAL := 0;
  v_avg_requests DECIMAL := 0;
  v_recommended INTEGER := 0;
  v_target_day_of_week VARCHAR;
BEGIN
  SELECT 
      COALESCE(AVG(quantity_sold), 0), 
      COALESCE(STDDEV_SAMP(quantity_sold), 0)
  INTO v_avg_sales, v_stddev_sales
  FROM ready_made_daily_stock
  WHERE menu_item_id = p_menu_item_id 
  AND stock_date >= CURRENT_DATE - (p_weeks * 7);

  SELECT 
      COALESCE(AVG(daily_req), 0)
  INTO v_avg_requests
  FROM (
      SELECT request_date, SUM(quantity) AS daily_req
      FROM stockout_request
      WHERE menu_item_id = p_menu_item_id
      AND request_date >= CURRENT_DATE - (p_weeks * 7)
      GROUP BY request_date
  ) sub;

  v_recommended := CEIL(v_avg_sales + v_avg_requests + COALESCE(v_stddev_sales, 0));
  v_target_day_of_week := TRIM(TO_CHAR(CURRENT_DATE, 'Day'));

  UPDATE stock_recommendation 
  SET recommended_quantity = v_recommended, 
      weeks_considered = p_weeks,
      calculated_on = NOW()
  WHERE menu_item_id = p_menu_item_id AND target_day_of_week = v_target_day_of_week AND is_active = TRUE;

  IF NOT FOUND THEN
      INSERT INTO stock_recommendation (menu_item_id, target_day_of_week, recommended_quantity, weeks_considered)
      VALUES (p_menu_item_id, v_target_day_of_week, v_recommended, p_weeks);
  END IF;

  RETURN v_recommended;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_preparation_report(p_target_day VARCHAR) 
RETURNS TABLE(menu_item_id INT, item_name TEXT, avg_sold DECIMAL, avg_requested DECIMAL, recommended_quantity INT, peak_hour INT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
      m.menu_item_id,
      m.name AS item_name,
      COALESCE(sales.avg_sold, 0.0) AS avg_sold,
      COALESCE(req.avg_req, 0.0) AS avg_requested,
      COALESCE(sr.recommended_quantity, 0) AS recommended_quantity,
      COALESCE(ph.peak_hour, 12) AS peak_hour
  FROM menu_item m
  LEFT JOIN (
      SELECT ol.menu_item_id, AVG(ol.quantity) AS avg_sold
      FROM order_line ol
      JOIN customer_order co ON ol.order_id = co.order_id
      WHERE TRIM(TO_CHAR(co.order_timestamp, 'Day')) = p_target_day
      GROUP BY ol.menu_item_id
  ) sales ON m.menu_item_id = sales.menu_item_id
  LEFT JOIN (
      SELECT s.menu_item_id, AVG(s.quantity) AS avg_req
      FROM stockout_request s
      WHERE s.day_of_week = p_target_day
      GROUP BY s.menu_item_id
  ) req ON m.menu_item_id = req.menu_item_id
  LEFT JOIN stock_recommendation sr ON m.menu_item_id = sr.menu_item_id AND sr.target_day_of_week = p_target_day AND sr.is_active = TRUE
  LEFT JOIN (
      SELECT ol.menu_item_id, CAST(EXTRACT(HOUR FROM co.order_timestamp) AS INT) AS peak_hour,
             ROW_NUMBER() OVER (PARTITION BY ol.menu_item_id ORDER BY COUNT(co.order_id) DESC) as rn
      FROM order_line ol
      JOIN customer_order co ON ol.order_id = co.order_id
      WHERE TRIM(TO_CHAR(co.order_timestamp, 'Day')) = p_target_day
      GROUP BY ol.menu_item_id, EXTRACT(HOUR FROM co.order_timestamp)
  ) ph ON m.menu_item_id = ph.menu_item_id AND ph.rn = 1
  WHERE m.is_prepared_in_kitchen = TRUE;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION record_stockout(p_menu_item_id INTEGER, p_quantity INTEGER DEFAULT 1) 
RETURNS INTEGER AS $$
DECLARE
  v_request_id INTEGER;
BEGIN
  INSERT INTO stockout_request (menu_item_id, quantity)
  VALUES (p_menu_item_id, p_quantity)
  RETURNING request_id INTO v_request_id;
  
  RETURN v_request_id;
END;
$$ LANGUAGE plpgsql;
