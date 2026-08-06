-- ============================================
-- 02_product_views.sql
-- ============================================

DROP FUNCTION IF EXISTS get_cashier_products();
CREATE OR REPLACE FUNCTION get_cashier_products() 
RETURNS TABLE(
    id INT, 
    name TEXT, 
    type TEXT, 
    price DECIMAL, 
    status TEXT, 
    batch_id INT, 
    mode VARCHAR, 
    mode_limit INT, 
    stock INT, 
    reorder_level INT
) AS $$
BEGIN
    RETURN QUERY
    -- PREPARED items
    SELECT 
        m.menu_item_id AS id,
        m.name AS name,
        'PREPARED'::TEXT AS type,
        m.selling_price AS price,
        COALESCE(
            (SELECT CASE 
                WHEN bool_or(kbi.status = 'available') THEN 'Available'
                WHEN bool_or(kbi.status = 'preparing') THEN 'Preparing'
                WHEN bool_and(kbi.status = 'exhausted') THEN 'Exhausted'
                ELSE 'Out of Stock'
            END
            FROM kitchen_batch_issue kbi 
            WHERE kbi.menu_item_id = m.menu_item_id),
            'Out of Stock'
        )::TEXT AS status,
        get_active_batch_id(m.menu_item_id) AS batch_id,
        m.request_mode AS mode,
        m.mode_limit AS mode_limit,
        NULL::INT AS stock,
        NULL::INT AS reorder_level
    FROM menu_item m
    WHERE m.is_prepared_in_kitchen = TRUE AND m.is_purchasable = TRUE

    UNION ALL

    -- READY-MADE non-expiry items
    SELECT 
        m.menu_item_id AS id,
        m.name AS name,
        'READY_MADE'::TEXT AS type,
        m.selling_price AS price,
        ('Live Stock: ' || COALESCE(rms.current_stock, 0))::TEXT AS status,
        NULL::INT AS batch_id,
        NULL::VARCHAR AS mode,
        99 AS mode_limit,
        rms.current_stock AS stock,
        rms.reorder_level AS reorder_level
    FROM menu_item m
    LEFT JOIN ready_made_stock rms ON m.menu_item_id = rms.menu_item_id
    WHERE m.is_prepared_in_kitchen = FALSE 
      AND m.expires_daily = FALSE 
      AND m.is_purchasable = TRUE

    UNION ALL

    -- READY-MADE daily-expiry items
    SELECT 
        m.menu_item_id AS id,
        m.name AS name,
        'READY_MADE'::TEXT AS type,
        m.selling_price AS price,
        ('Live Stock: ' || COALESCE(rmds.quantity_received - rmds.quantity_sold, 0))::TEXT AS status,
        NULL::INT AS batch_id,
        NULL::VARCHAR AS mode,
        99 AS mode_limit,
        COALESCE(rmds.quantity_received - rmds.quantity_sold, 0) AS stock,
        NULL::INT AS reorder_level
    FROM menu_item m
    LEFT JOIN ready_made_daily_stock rmds 
      ON m.menu_item_id = rmds.menu_item_id 
     AND rmds.stock_date = CURRENT_DATE
    WHERE m.is_prepared_in_kitchen = FALSE 
      AND m.expires_daily = TRUE 
      AND m.is_purchasable = TRUE;
END;
$$ LANGUAGE plpgsql;

DROP FUNCTION IF EXISTS get_active_batches();
CREATE OR REPLACE FUNCTION get_active_batches()
RETURNS TABLE(id INT, name TEXT, status VARCHAR) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        b.batch_id AS id,
        m.name AS name,
        b.status AS status
    FROM kitchen_batch_issue b
    JOIN menu_item m ON b.menu_item_id = m.menu_item_id
    WHERE b.status IN ('preparing', 'available');
END;
$$ LANGUAGE plpgsql;
