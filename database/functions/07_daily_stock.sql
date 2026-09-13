-- ============================================
-- 07_daily_stock.sql
-- ============================================

CREATE OR REPLACE FUNCTION init_daily_stock(p_date DATE DEFAULT CURRENT_DATE)
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER := 0;
BEGIN
    INSERT INTO ready_made_daily_stock
        (menu_item_id, stock_date, quantity_received, quantity_sold, quantity_wasted, average_unit_cost)
    SELECT menu_item_id, p_date, 0, 0, 0, 0
    FROM menu_item
    WHERE expires_daily = TRUE AND is_purchasable = TRUE
    ON CONFLICT (menu_item_id, stock_date) DO NOTHING;

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION end_of_day_waste(p_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE(menu_item_id INT, item_name TEXT, quantity_wasted INT) AS $$
BEGIN
    -- Recalculate waste for the day. Idempotent — safe to run any number
    -- of times; only updates rows where the computed value differs.
    UPDATE ready_made_daily_stock
    SET quantity_wasted = quantity_received - quantity_sold
    WHERE stock_date = p_date
      AND ready_made_daily_stock.quantity_wasted != (quantity_received - quantity_sold);

    -- Return only items that actually have waste (for the waste log UI)
    RETURN QUERY
    SELECT r.menu_item_id, m.name AS item_name, r.quantity_wasted
    FROM ready_made_daily_stock r
    JOIN menu_item m ON r.menu_item_id = m.menu_item_id
    WHERE r.stock_date = p_date
      AND r.quantity_wasted > 0
    ORDER BY r.quantity_wasted DESC;
END;
$$ LANGUAGE plpgsql;
