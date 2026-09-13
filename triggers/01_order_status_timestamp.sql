-- ==========================================
-- Trigger: trg_order_status_timestamp
-- Table: customer_order
-- Fires: BEFORE UPDATE
-- Purpose: Updates last_status_update when status changes
-- ==========================================

DROP TRIGGER IF EXISTS trg_order_status_timestamp ON customer_order;
DROP FUNCTION IF EXISTS fn_update_order_status_timestamp();

CREATE OR REPLACE FUNCTION fn_update_order_status_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
        NEW.last_status_update = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_order_status_timestamp
BEFORE UPDATE ON customer_order
FOR EACH ROW
EXECUTE FUNCTION fn_update_order_status_timestamp();
