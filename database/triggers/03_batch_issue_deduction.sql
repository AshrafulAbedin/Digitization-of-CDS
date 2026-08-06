-- ==========================================
-- Trigger: trg_batch_issue_deduction
-- Table: kitchen_batch_issue_line
-- Fires: BEFORE INSERT
-- Purpose: Deducts from raw_material stock and snapshots cost
-- ==========================================

DROP TRIGGER IF EXISTS trg_batch_issue_deduction ON kitchen_batch_issue_line;
DROP FUNCTION IF EXISTS fn_batch_issue_deduction();

CREATE OR REPLACE FUNCTION fn_batch_issue_deduction()
RETURNS TRIGGER AS $$
DECLARE
    v_current_stock DECIMAL;
    v_avg_cost DECIMAL;
BEGIN
    SELECT COALESCE(current_stock, 0), COALESCE(average_unit_cost, 0) 
    INTO v_current_stock, v_avg_cost
    FROM raw_material 
    WHERE raw_material_id = NEW.raw_material_id;

    NEW.unit_cost_at_time := v_avg_cost;

    IF v_current_stock >= NEW.quantity_taken THEN
        UPDATE raw_material 
        SET current_stock = current_stock - NEW.quantity_taken
        WHERE raw_material_id = NEW.raw_material_id;
    ELSE
        RAISE NOTICE 'Insufficient stock for raw_material_id %. Available: %, Requested: %', NEW.raw_material_id, v_current_stock, NEW.quantity_taken;
        UPDATE raw_material 
        SET current_stock = 0
        WHERE raw_material_id = NEW.raw_material_id;
        
        NEW.quantity_taken := v_current_stock;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_batch_issue_deduction
BEFORE INSERT ON kitchen_batch_issue_line
FOR EACH ROW
EXECUTE FUNCTION fn_batch_issue_deduction();
