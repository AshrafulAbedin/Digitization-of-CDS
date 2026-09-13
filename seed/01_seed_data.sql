-- ================================
-- SEED DATA FOR CDS DATABASE
-- ================================

-- 1. Vendors
INSERT INTO vendor (name, address, supplies_raw_materials, supplies_ready_expiry, supplies_ready_non_expiry) VALUES
('Karwan Bazar Supplier', 'Karwan Bazar, Dhaka', TRUE, FALSE, FALSE),
('Agora Retail', 'Dhanmondi, Dhaka', FALSE, FALSE, TRUE),
('Local Bakery', 'Gazipur', FALSE, TRUE, FALSE),
('Fresh Farms Ltd', 'Savar, Dhaka', TRUE, TRUE, FALSE);

-- Vendor phones
INSERT INTO vendor_phone VALUES
(1, '01711111111'), (1, '01711111112'),
(2, '01822222222'),
(3, '01933333333'),
(4, '01644444444');

-- 2. Raw Materials
INSERT INTO raw_material (name, unit, current_stock, reorder_level, average_unit_cost) VALUES
('Rice', 'kg', 0, 10, 0),
('Chicken', 'kg', 0, 5, 0),
('Cooking Oil', 'litre', 0, 5, 0),
('Flour', 'kg', 0, 8, 0),
('Onion', 'kg', 0, 3, 0),
('Salt', 'kg', 0, 2, 0),
('Potato', 'kg', 0, 5, 0),
('Egg', 'piece', 0, 50, 0);

-- 3. Menu Items (mix of prepared and ready-made)
-- Prepared meals (is_prepared_in_kitchen = TRUE, is_purchasable = FALSE)
INSERT INTO menu_item (name, selling_price, is_prepared_in_kitchen, expires_daily, is_purchasable, request_mode, mode_limit) VALUES
('Chicken Fried Rice', 120, TRUE, FALSE, FALSE, 'Low', 8),
('Beef Curry with Rice', 150, TRUE, FALSE, FALSE, 'Mid', 4),
('Egg Fried Rice', 80, TRUE, FALSE, FALSE, 'Low', 8),
('Roasted Chicken', 180, TRUE, FALSE, FALSE, 'High', 1);

-- Ready-made non-expiry (is_prepared_in_kitchen = FALSE, expires_daily = FALSE, is_purchasable = TRUE)
INSERT INTO menu_item (name, selling_price, is_prepared_in_kitchen, expires_daily, is_purchasable, request_mode, mode_limit) VALUES
('Coke (500ml)', 40, FALSE, FALSE, TRUE, 'Mid', 4),
('Mineral Water', 20, FALSE, FALSE, TRUE, 'Mid', 4),
('Chips Packet', 30, FALSE, FALSE, TRUE, 'Mid', 4);

-- Ready-made daily-expiry (is_prepared_in_kitchen = FALSE, expires_daily = TRUE, is_purchasable = TRUE)
INSERT INTO menu_item (name, selling_price, is_prepared_in_kitchen, expires_daily, is_purchasable, request_mode, mode_limit) VALUES
('Shingara', 15, FALSE, TRUE, TRUE, 'Mid', 4),
('Samosa', 15, FALSE, TRUE, TRUE, 'Mid', 4),
('Puri', 10, FALSE, TRUE, TRUE, 'Mid', 4);

-- 4. Ready-made stock entries (for non-expiry items)
INSERT INTO ready_made_stock (menu_item_id, current_stock, reorder_level, average_unit_cost) VALUES
(5, 0, 10, 0),   -- Coke
(6, 0, 20, 0),   -- Mineral Water
(7, 0, 15, 0);   -- Chips

-- 5. Registered Customers
INSERT INTO customer (name, phone, id_type, id_number, is_temporary) VALUES
('Rahim Islam', '01712345678', 'student', '230042101', FALSE),
('Karim Ahmed', '01898765432', 'nid', '1234567890123', FALSE),
('Fatima Begum', '01512345678', 'student', '230042102', FALSE);

-- Reset sequence for customer to avoid conflict if guest is 1
SELECT setval('customer_customer_id_seq', (SELECT MAX(customer_id) FROM customer));

-- 6. Purchase Orders (these will trigger stock updates!)
-- Purchase 1: Raw materials from Karwan Bazar
INSERT INTO purchase_order (vendor_id, order_date, notes) VALUES (1, CURRENT_DATE, 'Weekly raw material restock');
INSERT INTO purchase_order_line (purchase_order_id, item_type, item_id, quantity, unit_cost) VALUES
(1, 'raw_material', 1, 25, 60),    -- 25kg Rice @ 60/kg
(1, 'raw_material', 2, 10, 350),   -- 10kg Chicken @ 350/kg
(1, 'raw_material', 3, 5, 180),    -- 5L Oil @ 180/L
(1, 'raw_material', 5, 5, 40),     -- 5kg Onion @ 40/kg
(1, 'raw_material', 8, 60, 12);    -- 60 Eggs @ 12/pc

-- Purchase 2: Drinks from Agora
INSERT INTO purchase_order (vendor_id, order_date, notes) VALUES (2, CURRENT_DATE, 'Drinks restock');
INSERT INTO purchase_order_line (purchase_order_id, item_type, item_id, quantity, unit_cost) VALUES
(2, 'ready_made', 5, 48, 25),      -- 48 Coke @ 25 each (sell at 40)
(2, 'ready_made', 6, 100, 10);     -- 100 Water @ 10 each (sell at 20)

-- Purchase 3: Daily items from Local Bakery
INSERT INTO purchase_order (vendor_id, order_date, notes) VALUES (3, CURRENT_DATE, 'Morning delivery');
INSERT INTO purchase_order_line (purchase_order_id, item_type, item_id, quantity, unit_cost) VALUES
(3, 'ready_made', 8, 50, 8),       -- 50 Shingara @ 8 each (sell at 15)
(3, 'ready_made', 9, 40, 8),       -- 40 Samosa @ 8 each (sell at 15)
(3, 'ready_made', 10, 60, 5);      -- 60 Puri @ 5 each (sell at 10)

-- 7. Kitchen Batches
-- Batch 1: Chicken Fried Rice (available)
INSERT INTO kitchen_batch_issue (menu_item_id, status, notes) VALUES (1, 'preparing', 'Morning batch');
INSERT INTO kitchen_batch_issue_line (batch_id, raw_material_id, quantity_taken, unit_cost_at_time) VALUES
(1, 1, 5, 60),    -- 5kg Rice
(1, 2, 3, 350),   -- 3kg Chicken
(1, 3, 1, 180),   -- 1L Oil
(1, 5, 1, 40);    -- 1kg Onion
-- Note: the trigger will deduct stock and overwrite unit_cost_at_time with the snapshot
UPDATE kitchen_batch_issue SET status = 'available' WHERE batch_id = 1;

-- Batch 2: Egg Fried Rice (preparing)
INSERT INTO kitchen_batch_issue (menu_item_id, status, notes) VALUES (3, 'preparing', 'Late morning batch');
INSERT INTO kitchen_batch_issue_line (batch_id, raw_material_id, quantity_taken, unit_cost_at_time) VALUES
(2, 1, 3, 60),    -- 3kg Rice
(2, 8, 20, 12),   -- 20 Eggs
(2, 3, 0.5, 180); -- 0.5L Oil

-- 8. Sample Stockout Requests (for analytics)
INSERT INTO stockout_request (menu_item_id, request_date, quantity) VALUES
(4, CURRENT_DATE - 1, 3),
(4, CURRENT_DATE - 2, 2),
(1, CURRENT_DATE - 1, 5),
(8, CURRENT_DATE, 4),
(9, CURRENT_DATE - 3, 2);
