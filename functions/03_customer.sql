-- ============================================
-- 03_customer.sql
-- ============================================

DROP FUNCTION IF EXISTS find_customer_by_phone(TEXT);
CREATE OR REPLACE FUNCTION find_customer_by_phone(p_phone TEXT)
RETURNS TABLE(customer_id INT, name TEXT, phone TEXT, id_type VARCHAR, id_number TEXT, is_temporary BOOLEAN) AS $$
BEGIN
    RETURN QUERY
    SELECT c.customer_id, c.name, c.phone, c.id_type, c.id_number, c.is_temporary
    FROM customer c
    WHERE c.phone = p_phone AND c.is_temporary = FALSE;
END;
$$ LANGUAGE plpgsql;

DROP FUNCTION IF EXISTS find_customer_by_id(VARCHAR, TEXT);
CREATE OR REPLACE FUNCTION find_customer_by_id(p_id_type VARCHAR, p_id_number TEXT)
RETURNS TABLE(customer_id INT, name TEXT, phone TEXT, id_type VARCHAR, id_number TEXT, is_temporary BOOLEAN) AS $$
BEGIN
    RETURN QUERY
    SELECT c.customer_id, c.name, c.phone, c.id_type, c.id_number, c.is_temporary
    FROM customer c
    WHERE c.id_type = p_id_type AND c.id_number = p_id_number;
END;
$$ LANGUAGE plpgsql;

DROP FUNCTION IF EXISTS register_customer(TEXT, TEXT, VARCHAR, TEXT);
CREATE OR REPLACE FUNCTION register_customer(p_name TEXT, p_phone TEXT, p_id_type VARCHAR, p_id_number TEXT)
RETURNS INTEGER AS $$
DECLARE
    v_customer_id INTEGER;
BEGIN
    INSERT INTO customer (name, phone, id_type, id_number, is_temporary)
    VALUES (p_name, p_phone, p_id_type, p_id_number, FALSE)
    RETURNING customer.customer_id INTO v_customer_id;
    
    RETURN v_customer_id;
END;
$$ LANGUAGE plpgsql;

DROP FUNCTION IF EXISTS get_active_orders(INTEGER);
CREATE OR REPLACE FUNCTION get_active_orders(p_customer_id INTEGER)
RETURNS TABLE(order_id INT, status VARCHAR, order_timestamp TIMESTAMP, total_paid DECIMAL, payment_method VARCHAR, dine_in_takeaway VARCHAR, items JSONB) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.order_id, 
        o.status, 
        o.order_timestamp, 
        o.total_paid, 
        o.payment_method, 
        o.dine_in_takeaway,
        (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'name', m.name,
                    'qty', ol.quantity,
                    'type', CASE WHEN m.is_prepared_in_kitchen THEN 'PREPARED' ELSE 'READY_MADE' END
                )
            )
            FROM order_line ol
            JOIN menu_item m ON ol.menu_item_id = m.menu_item_id
            WHERE ol.order_id = o.order_id
        ) AS items
    FROM customer_order o
    WHERE o.customer_id = p_customer_id 
      AND o.status IN ('paid', 'preparing', 'ready');
END;
$$ LANGUAGE plpgsql;
