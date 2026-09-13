-- ============================================
-- 05_kitchen.sql
-- ============================================

DROP FUNCTION IF EXISTS create_batch(INTEGER, JSONB);
CREATE OR REPLACE FUNCTION create_batch(p_menu_item_id INTEGER, p_materials JSONB)
RETURNS INTEGER AS $$
DECLARE
    v_batch_id INTEGER;
    v_material JSONB;
BEGIN
    INSERT INTO kitchen_batch_issue (menu_item_id, status)
    VALUES (p_menu_item_id, 'preparing')
    RETURNING batch_id INTO v_batch_id;

    FOR v_material IN SELECT * FROM jsonb_array_elements(p_materials)
    LOOP
        INSERT INTO kitchen_batch_issue_line (batch_id, raw_material_id, quantity_taken, unit_cost_at_time)
        VALUES (
            v_batch_id,
            (v_material->>'raw_material_id')::INTEGER,
            (v_material->>'quantity_taken')::DECIMAL,
            (SELECT average_unit_cost FROM raw_material WHERE raw_material_id = (v_material->>'raw_material_id')::INTEGER)
        );
    END LOOP;

    RETURN v_batch_id;
END;
$$ LANGUAGE plpgsql;

DROP FUNCTION IF EXISTS update_batch_status(INTEGER, VARCHAR);
CREATE OR REPLACE FUNCTION update_batch_status(p_batch_id INTEGER, p_new_status VARCHAR)
RETURNS VOID AS $$
DECLARE
    v_current_status VARCHAR;
BEGIN
    SELECT status INTO v_current_status
    FROM kitchen_batch_issue
    WHERE batch_id = p_batch_id;

    IF v_current_status = 'preparing' AND p_new_status = 'available' THEN
        -- Valid transition
    ELSIF v_current_status = 'available' AND p_new_status = 'exhausted' THEN
        -- Valid transition
    ELSE
        RAISE EXCEPTION 'Invalid batch status transition from % to %', v_current_status, p_new_status;
    END IF;

    UPDATE kitchen_batch_issue 
    SET status = p_new_status
    WHERE batch_id = p_batch_id;
END;
$$ LANGUAGE plpgsql;

DROP FUNCTION IF EXISTS create_kitchen_request(INTEGER, INTEGER, INTEGER);
CREATE OR REPLACE FUNCTION create_kitchen_request(p_order_id INTEGER, p_menu_item_id INTEGER, p_requested_qty INTEGER)
RETURNS INTEGER AS $$
DECLARE
    v_request_id INTEGER;
BEGIN
    INSERT INTO kitchen_request (order_id, menu_item_id, requested_quantity, status)
    VALUES (p_order_id, p_menu_item_id, p_requested_qty, 'pending')
    RETURNING request_id INTO v_request_id;
    
    RETURN v_request_id;
END;
$$ LANGUAGE plpgsql;

DROP FUNCTION IF EXISTS respond_to_kitchen_request(INTEGER, VARCHAR, INTEGER);
CREATE OR REPLACE FUNCTION respond_to_kitchen_request(p_request_id INTEGER, p_status VARCHAR, p_approved_qty INTEGER DEFAULT NULL)
RETURNS VOID AS $$
BEGIN
    IF p_status NOT IN ('approved', 'rejected') THEN
        RAISE EXCEPTION 'Invalid request status: %', p_status;
    END IF;

    IF p_status = 'approved' AND p_approved_qty IS NULL THEN
        RAISE EXCEPTION 'Approved requests must specify an approved quantity.';
    END IF;

    UPDATE kitchen_request
    SET status = p_status,
        approved_quantity = p_approved_qty,
        responded_at = NOW()
    WHERE request_id = p_request_id;
END;
$$ LANGUAGE plpgsql;

DROP FUNCTION IF EXISTS get_pending_requests();
CREATE OR REPLACE FUNCTION get_pending_requests()
RETURNS TABLE(request_id INT, order_id INT, menu_item_id INT, menu_item_name TEXT, requested_quantity INT, requested_at TIMESTAMP) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        kr.request_id,
        kr.order_id,
        kr.menu_item_id,
        m.name AS menu_item_name,
        kr.requested_quantity,
        kr.requested_at
    FROM kitchen_request kr
    JOIN menu_item m ON kr.menu_item_id = m.menu_item_id
    WHERE kr.status = 'pending';
END;
$$ LANGUAGE plpgsql;

DROP FUNCTION IF EXISTS get_kitchen_orders();
CREATE OR REPLACE FUNCTION get_kitchen_orders()
RETURNS TABLE(order_id INT, customer_name TEXT, status VARCHAR, order_timestamp TIMESTAMP, items JSONB) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.order_id,
        c.name AS customer_name,
        o.status,
        o.order_timestamp,
        (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'menu_item_id', m.menu_item_id,
                    'name', m.name,
                    'qty', ol.quantity,
                    'batch_id', ol.batch_id
                )
            )
            FROM order_line ol
            JOIN menu_item m ON ol.menu_item_id = m.menu_item_id
            WHERE ol.order_id = o.order_id AND m.is_prepared_in_kitchen = TRUE
        ) AS items
    FROM customer_order o
    JOIN customer c ON o.customer_id = c.customer_id
    WHERE o.status IN ('paid', 'preparing', 'ready')
      AND EXISTS (
          SELECT 1 FROM order_line ol2
          JOIN menu_item m2 ON ol2.menu_item_id = m2.menu_item_id
          WHERE ol2.order_id = o.order_id AND m2.is_prepared_in_kitchen = TRUE
      );
END;
$$ LANGUAGE plpgsql;
