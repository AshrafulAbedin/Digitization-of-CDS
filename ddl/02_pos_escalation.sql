-- ============================================
-- 02_pos_escalation.sql
-- The POS escalation happens BEFORE an order exists (cashier asks the
-- kitchen while building the ticket), so a kitchen_request may have no
-- order yet. Safe to run repeatedly.
-- ============================================

ALTER TABLE kitchen_request ALTER COLUMN order_id DROP NOT NULL;
