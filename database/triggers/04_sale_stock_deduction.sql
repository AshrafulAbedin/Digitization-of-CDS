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
    v_is_prepared BOOLEAN;
    v_expires_daily BOOLEAN;
    v_batch_status VARCHAR;
    v_current_stock INTEGER;
    v_avg_cost DECIMAL;
BEGIN
    SELECT is_prepared_in_kitchen, expires_daily 
    INTO v_is_prepared, v_expires_daily
    FROM menu_item 
    WHERE menu_item_id = NEW.menu_item_id;

    IF v_is_prepared = TRUE THEN
        IF NEW.batch_id IS NULL THEN
            RAISE EXCEPTION 'Kitchen items require a batch_id';
        END IF;
        
        SELECT status INTO v_batch_status 
        FROM kitchen_batch_issue 
        WHERE batch_id = NEW.batch_id;
        
        IF v_batch_status IS DISTINCT FROM 'available' THEN
            RAISE EXCEPTION 'Batch is not available';
        END IF;
        
        NEW.unit_cost_at_time := NULL;
        
    ELSE
        NEW.batch_id := NULL;
        
        IF v_expires_daily = FALSE THEN
            SELECT COALESCE(current_stock, 0), COALESCE(average_unit_cost, 0)
            INTO v_current_stock, v_avg_cost
            FROM ready_made_stock 
            WHERE menu_item_id = NEW.menu_item_id;
            
            NEW.unit_cost_at_time := v_avg_cost;
            
            UPDATE ready_made_stock 
            SET current_stock = current_stock - NEW.quantity 
            WHERE menu_item_id = NEW.menu_item_id;
            
        ELSE
            v_avg_cost := 0;  -- Default in case no daily stock row exists
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
