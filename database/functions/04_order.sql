-- ============================================
-- 04_order.sql
-- ============================================

DROP FUNCTION IF EXISTS create_order(INTEGER, VARCHAR, VARCHAR, JSONB);
CREATE OR REPLACE FUNCTION create_order(
    p_customer_id INTEGER,
    p_payment_method VARCHAR,
    p_dine_takeaway VARCHAR,
    p_items JSONB
)
RETURNS INTEGER AS $$
DECLARE
    v_order_id INTEGER;
    v_total DECIMAL := 0;
    v_item JSONB;
    v_selling_price DECIMAL;
    v_is_prepared BOOLEAN;
    v_has_prepared_items BOOLEAN := FALSE;
    v_qty INTEGER;
BEGIN
    -- Reject empty cart
    IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'Order must contain at least one item';
    END IF;

    -- ---------- Pass 1: validate items + compute total ----------
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        SELECT selling_price, is_prepared_in_kitchen
        INTO v_selling_price, v_is_prepared
        FROM menu_item
        WHERE menu_item_id = (v_item->>'menu_item_id')::INTEGER;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Invalid menu_item_id % in order',
                (v_item->>'menu_item_id')::INTEGER;
        END IF;

        v_qty := (v_item->>'quantity')::INTEGER;

        IF v_qty IS NULL OR v_qty <= 0 THEN
            RAISE EXCEPTION 'Quantity must be > 0 for menu_item_id %',
                (v_item->>'menu_item_id')::INTEGER;
        END IF;

        v_total := v_total + (v_selling_price * v_qty);

        IF v_is_prepared THEN
            v_has_prepared_items := TRUE;
        END IF;
    END LOOP;

    -- ---------- Create the order header ----------
    INSERT INTO customer_order
        (customer_id, total_paid, payment_method, status, dine_in_takeaway)
    VALUES (
        p_customer_id,
        v_total,
        p_payment_method,
        CASE WHEN v_has_prepared_items THEN 'paid' ELSE 'completed' END,
        p_dine_takeaway
    )
    RETURNING customer_order.order_id INTO v_order_id;

    -- ---------- Pass 2: insert order lines (stock trigger fires here) ----------
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        SELECT selling_price INTO v_selling_price
        FROM menu_item
        WHERE menu_item_id = (v_item->>'menu_item_id')::INTEGER;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Invalid menu_item_id % in order',
                (v_item->>'menu_item_id')::INTEGER;
        END IF;

        INSERT INTO order_line
            (order_id, menu_item_id, batch_id, quantity, unit_price_snapshot)
        VALUES (
            v_order_id,
            (v_item->>'menu_item_id')::INTEGER,
            (v_item->>'batch_id')::INTEGER,   -- NULL for ready-made
            (v_item->>'quantity')::INTEGER,
            v_selling_price
        );
    END LOOP;

    RETURN v_order_id;
END;
$$ LANGUAGE plpgsql;