-- ============================================
-- 01_helpers.sql
-- ============================================

DROP FUNCTION IF EXISTS get_mode_limit(VARCHAR);
CREATE OR REPLACE FUNCTION get_mode_limit(p_request_mode VARCHAR) 
RETURNS INTEGER AS $$
BEGIN
    RETURN CASE p_request_mode
        WHEN 'Low' THEN 8
        WHEN 'Mid' THEN 4
        WHEN 'High' THEN 1
        ELSE 4
    END;
END;
$$ LANGUAGE plpgsql;

DROP FUNCTION IF EXISTS is_batch_available(INTEGER);
CREATE OR REPLACE FUNCTION is_batch_available(p_menu_item_id INTEGER) 
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM kitchen_batch_issue 
        WHERE menu_item_id = p_menu_item_id 
          AND status = 'available'
    );
END;
$$ LANGUAGE plpgsql;

DROP FUNCTION IF EXISTS get_active_batch_id(INTEGER);
CREATE OR REPLACE FUNCTION get_active_batch_id(p_menu_item_id INTEGER) 
RETURNS INTEGER AS $$
DECLARE
    v_batch_id INTEGER;
BEGIN
    SELECT batch_id INTO v_batch_id
    FROM kitchen_batch_issue
    WHERE menu_item_id = p_menu_item_id 
      AND status = 'available'
    ORDER BY issued_at
    LIMIT 1;
    
    RETURN v_batch_id;
END;
$$ LANGUAGE plpgsql;
