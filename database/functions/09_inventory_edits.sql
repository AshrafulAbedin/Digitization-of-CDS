DROP FUNCTION IF EXISTS update_menu_item_price(INTEGER, DECIMAL);
CREATE OR REPLACE FUNCTION update_menu_item_price(
    p_menu_item_id INTEGER,
    p_new_price DECIMAL
) RETURNS DECIMAL AS $$
DECLARE
    v_is_prepared BOOLEAN;
    v_expires_daily BOOLEAN;
    v_cost DECIMAL := 0;
    v_item_name TEXT;
BEGIN
    SELECT is_prepared_in_kitchen, expires_daily, name
    INTO v_is_prepared, v_expires_daily, v_item_name
    FROM menu_item
    WHERE menu_item_id = p_menu_item_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Menu item % does not exist', p_menu_item_id;
    END IF;

    IF p_new_price <= 0 THEN
        RAISE EXCEPTION 'Selling price must be positive';
    END IF;

    IF v_is_prepared = FALSE THEN
        IF v_expires_daily = FALSE THEN
            SELECT COALESCE(average_unit_cost, 0) INTO v_cost
            FROM ready_made_stock WHERE menu_item_id = p_menu_item_id;
        ELSE
            SELECT COALESCE(average_unit_cost, 0) INTO v_cost
            FROM ready_made_daily_stock
            WHERE menu_item_id = p_menu_item_id AND stock_date = CURRENT_DATE;
        END IF;

        IF v_cost > 0 AND p_new_price < v_cost THEN
            RAISE EXCEPTION
                'SELL PRICE BLOCK: new price ৳% is below current average cost ৳% for "%". Lower cost first or set price >= cost.',
                p_new_price, ROUND(v_cost, 2), v_item_name;
        END IF;
    END IF;

    UPDATE menu_item SET selling_price = p_new_price
    WHERE menu_item_id = p_menu_item_id;

    RETURN p_new_price;
END;
$$ LANGUAGE plpgsql;

DROP FUNCTION IF EXISTS get_sales_by_day(DATE, DATE);
CREATE OR REPLACE FUNCTION get_sales_by_day(p_start DATE, p_end DATE)
RETURNS TABLE(day DATE, orders BIGINT, revenue DECIMAL) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        DATE(co.order_timestamp) AS day,
        COUNT(DISTINCT co.order_id) AS orders,
        COALESCE(SUM(ol.quantity * ol.unit_price_snapshot), 0) AS revenue
    FROM customer_order co
    LEFT JOIN order_line ol ON ol.order_id = co.order_id
    WHERE DATE(co.order_timestamp) BETWEEN p_start AND p_end
      AND co.status <> 'abandoned'
    GROUP BY DATE(co.order_timestamp)
    ORDER BY day;
END;
$$ LANGUAGE plpgsql;

DROP FUNCTION IF EXISTS get_payment_mix(DATE, DATE);
CREATE OR REPLACE FUNCTION get_payment_mix(p_start DATE, p_end DATE)
RETURNS TABLE(payment_method VARCHAR, order_count BIGINT, total DECIMAL) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        co.payment_method,
        COUNT(co.order_id)::BIGINT,
        COALESCE(SUM(co.total_paid), 0)
    FROM customer_order co
    WHERE DATE(co.order_timestamp) BETWEEN p_start AND p_end
      AND co.status <> 'abandoned'
    GROUP BY co.payment_method;
END;
$$ LANGUAGE plpgsql;

DROP FUNCTION IF EXISTS get_service_mix(DATE, DATE);
CREATE OR REPLACE FUNCTION get_service_mix(p_start DATE, p_end DATE)
RETURNS TABLE(service_type VARCHAR, order_count BIGINT, total DECIMAL) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        co.dine_in_takeaway,
        COUNT(co.order_id)::BIGINT,
        COALESCE(SUM(co.total_paid), 0)
    FROM customer_order co
    WHERE DATE(co.order_timestamp) BETWEEN p_start AND p_end
      AND co.status <> 'abandoned'
    GROUP BY co.dine_in_takeaway;
END;
$$ LANGUAGE plpgsql;

DROP FUNCTION IF EXISTS get_waste_cost(DATE, DATE);
CREATE OR REPLACE FUNCTION get_waste_cost(p_start DATE, p_end DATE)
RETURNS DECIMAL AS $$
DECLARE
    v_total DECIMAL;
BEGIN
    SELECT COALESCE(SUM(quantity_wasted * average_unit_cost), 0)
    INTO v_total
    FROM ready_made_daily_stock
    WHERE stock_date BETWEEN p_start AND p_end;
    RETURN v_total;
END;
$$ LANGUAGE plpgsql;
