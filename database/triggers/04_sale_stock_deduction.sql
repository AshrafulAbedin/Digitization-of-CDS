-- ==========================================
-- Trigger: trg_sale_stock_deduction
-- Table: order_line
-- Fires: BEFORE INSERT
-- Purpose: Deducts ready-made stock or validates kitchen batch on sale
-- ==========================================

DROP TRIGGER IF EXISTS trg_sale_stock_deduction ON order_line;
DROP FUNCTION IF EXISTS fn_sale_stock_deduction();

CREATE OR REPLACE FUNCTION fn_sale_stock_deduction()
RETURNS TRIGGER AS $$
DECLARE
    v_is_prepared   BOOLEAN;
    v_expires_daily BOOLEAN;
    v_batch_status  VARCHAR;
    v_current_stock INTEGER;
    v_avg_cost      DECIMAL;
    v_received      INTEGER;
    v_sold          INTEGER;
BEGIN
    -- Look up the menu_item type flags
    SELECT is_prepared_in_kitchen, expires_daily
    INTO v_is_prepared, v_expires_daily
    FROM menu_item
    WHERE menu_item_id = NEW.menu_item_id;

    IF v_is_prepared = TRUE THEN
        -- === PREPARED MEAL: must link to an available batch ===
        IF NEW.batch_id IS NULL THEN
            RAISE EXCEPTION 'Kitchen items require a batch_id';
        END IF;

        SELECT status INTO v_batch_status
        FROM kitchen_batch_issue
        WHERE batch_id = NEW.batch_id;

        IF v_batch_status IS DISTINCT FROM 'available' THEN
            RAISE EXCEPTION 'Batch % is not available (status: %)',
                NEW.batch_id, COALESCE(v_batch_status, 'unknown');
        END IF;

        NEW.unit_cost_at_time := NULL;

    ELSE
        -- === READY-MADE: deduct stock ===
        NEW.batch_id := NULL;

        IF v_expires_daily = FALSE THEN
            -- Non-expiry (e.g., Coke): check ready_made_stock
            SELECT COALESCE(current_stock, 0), COALESCE(average_unit_cost, 0)
            INTO v_current_stock, v_avg_cost
            FROM ready_made_stock
            WHERE menu_item_id = NEW.menu_item_id;

            v_current_stock := COALESCE(v_current_stock, 0);
            v_avg_cost      := COALESCE(v_avg_cost, 0);

            IF v_current_stock < NEW.quantity THEN
                RAISE EXCEPTION 'Insufficient stock for menu_item % : available %, requested %',
                    NEW.menu_item_id, v_current_stock, NEW.quantity;
            END IF;

            NEW.unit_cost_at_time := v_avg_cost;

            UPDATE ready_made_stock
            SET current_stock = current_stock - NEW.quantity
            WHERE menu_item_id = NEW.menu_item_id;

        ELSE
            -- Daily-expiry (e.g., Shingara): check ready_made_daily_stock today
            SELECT COALESCE(quantity_received, 0), COALESCE(quantity_sold, 0)
            INTO v_received, v_sold
            FROM ready_made_daily_stock
            WHERE menu_item_id = NEW.menu_item_id
              AND stock_date = CURRENT_DATE;

            v_received := COALESCE(v_received, 0);
            v_sold     := COALESCE(v_sold, 0);

            IF (v_received - v_sold) < NEW.quantity THEN
                RAISE EXCEPTION 'Insufficient daily stock for menu_item % : remaining %, requested %',
                    NEW.menu_item_id, (v_received - v_sold), NEW.quantity;
            END IF;

            SELECT COALESCE(average_unit_cost, 0)
            INTO v_avg_cost
            FROM ready_made_daily_stock
            WHERE menu_item_id = NEW.menu_item_id
              AND stock_date = CURRENT_DATE;

            v_avg_cost := COALESCE(v_avg_cost, 0);
            NEW.unit_cost_at_time := v_avg_cost;

            UPDATE ready_made_daily_stock
            SET quantity_sold = quantity_sold + NEW.quantity
            WHERE menu_item_id = NEW.menu_item_id
              AND stock_date = CURRENT_DATE;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sale_stock_deduction
BEFORE INSERT ON order_line
FOR EACH ROW
EXECUTE FUNCTION fn_sale_stock_deduction();