-- ==========================================
-- Trigger: trg_purchase_stock_update
-- Table: purchase_order_line
-- Fires: AFTER INSERT
-- Purpose: Updates inventory (raw/ready-made) and order total
-- ==========================================

DROP TRIGGER IF EXISTS trg_purchase_stock_update ON purchase_order_line;
DROP FUNCTION IF EXISTS fn_purchase_stock_update();

CREATE OR REPLACE FUNCTION fn_purchase_stock_update()
RETURNS TRIGGER AS $$
DECLARE
    v_current_stock DECIMAL;
    v_avg_cost DECIMAL;
    v_new_avg DECIMAL;
    v_expires_daily BOOLEAN;
BEGIN
    IF NEW.item_type = 'raw_material' THEN
        SELECT COALESCE(current_stock, 0), COALESCE(average_unit_cost, 0)
        INTO v_current_stock, v_avg_cost
        FROM raw_material
        WHERE raw_material_id = NEW.item_id;

        -- Guard against NULL (no row found) and zero/negative stock
        v_current_stock := COALESCE(v_current_stock, 0);
        v_avg_cost := COALESCE(v_avg_cost, 0);

        IF v_current_stock <= 0 THEN
            v_new_avg := NEW.unit_cost;
        ELSE
            v_new_avg := (v_current_stock * v_avg_cost + NEW.quantity * NEW.unit_cost) / (v_current_stock + NEW.quantity);
        END IF;

        UPDATE raw_material
        SET current_stock = current_stock + NEW.quantity,
            average_unit_cost = v_new_avg
        WHERE raw_material_id = NEW.item_id;

    ELSIF NEW.item_type = 'ready_made' THEN
        SELECT expires_daily INTO v_expires_daily
        FROM menu_item
        WHERE menu_item_id = NEW.item_id;

        IF v_expires_daily = FALSE THEN
            SELECT COALESCE(current_stock, 0), COALESCE(average_unit_cost, 0)
            INTO v_current_stock, v_avg_cost
            FROM ready_made_stock
            WHERE menu_item_id = NEW.item_id;

            -- Guard against NULL (no row found) and zero/negative stock
            v_current_stock := COALESCE(v_current_stock, 0);
            v_avg_cost := COALESCE(v_avg_cost, 0);

            IF v_current_stock <= 0 THEN
                v_new_avg := NEW.unit_cost;
            ELSE
                v_new_avg := (v_current_stock * v_avg_cost + NEW.quantity * NEW.unit_cost) / (v_current_stock + NEW.quantity);
            END IF;

            UPDATE ready_made_stock
            SET current_stock = current_stock + NEW.quantity,
                average_unit_cost = v_new_avg
            WHERE menu_item_id = NEW.item_id;

        ELSE
            INSERT INTO ready_made_daily_stock (menu_item_id, stock_date, quantity_received, average_unit_cost)
            VALUES (NEW.item_id, CURRENT_DATE, NEW.quantity, NEW.unit_cost)
            ON CONFLICT (menu_item_id, stock_date) DO UPDATE SET
                quantity_received = ready_made_daily_stock.quantity_received + NEW.quantity,
                average_unit_cost = CASE 
                    WHEN ready_made_daily_stock.quantity_received = 0 THEN NEW.unit_cost
                    ELSE (ready_made_daily_stock.quantity_received * ready_made_daily_stock.average_unit_cost + NEW.quantity * NEW.unit_cost) / (ready_made_daily_stock.quantity_received + NEW.quantity) 
                END;
        END IF;
    END IF;

    UPDATE purchase_order 
    SET total_amount = COALESCE(total_amount, 0) + (NEW.quantity * NEW.unit_cost) 
    WHERE purchase_order_id = NEW.purchase_order_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_purchase_stock_update
AFTER INSERT ON purchase_order_line
FOR EACH ROW
EXECUTE FUNCTION fn_purchase_stock_update();
