-- ============================================
-- 06_abandoned_orders.sql
-- ============================================

CREATE OR REPLACE FUNCTION mark_abandoned_orders() RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
  v_order_id INTEGER;
  abandoned_cursor CURSOR FOR
    SELECT order_id FROM customer_order
    WHERE status = 'ready'
    AND last_status_update < NOW() - INTERVAL '45 minutes';
BEGIN
  OPEN abandoned_cursor;
  LOOP
    FETCH abandoned_cursor INTO v_order_id;
    EXIT WHEN NOT FOUND;
    UPDATE customer_order SET status = 'abandoned' WHERE order_id = v_order_id;
    v_count := v_count + 1;
  END LOOP;
  CLOSE abandoned_cursor;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;
