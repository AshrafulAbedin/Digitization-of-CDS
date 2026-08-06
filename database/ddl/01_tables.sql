-- Active: 1772458564267@@127.0.0.1@5431
-- ============================================
-- CDS Digitisation Project — Complete DDL
-- Created: 2026-07-26
-- ============================================

-- 1. vendor
DROP TABLE IF EXISTS order_line CASCADE;
DROP TABLE IF EXISTS purchase_order_line CASCADE;
DROP TABLE IF EXISTS purchase_order CASCADE;
DROP TABLE IF EXISTS stock_recommendation CASCADE;
DROP TABLE IF EXISTS stockout_request CASCADE;
DROP TABLE IF EXISTS kitchen_request CASCADE;
DROP TABLE IF EXISTS kitchen_batch_issue_line CASCADE;
DROP TABLE IF EXISTS kitchen_batch_issue CASCADE;
DROP TABLE IF EXISTS customer_order CASCADE;
DROP TABLE IF EXISTS customer CASCADE;
DROP TABLE IF EXISTS ready_made_daily_stock CASCADE;
DROP TABLE IF EXISTS ready_made_stock CASCADE;
DROP TABLE IF EXISTS menu_item CASCADE;
DROP TABLE IF EXISTS raw_material CASCADE;
DROP TABLE IF EXISTS vendor_phone CASCADE;
DROP TABLE IF EXISTS vendor CASCADE;

CREATE TABLE vendor (
    vendor_id               SERIAL PRIMARY KEY,
    name                    TEXT NOT NULL,
    address                 TEXT,
    supplies_raw_materials   BOOLEAN DEFAULT FALSE,
    supplies_ready_expiry    BOOLEAN DEFAULT FALSE,
    supplies_ready_non_expiry BOOLEAN DEFAULT FALSE
);

-- 2. vendor_phone
CREATE TABLE vendor_phone (
    vendor_id    INTEGER NOT NULL REFERENCES vendor(vendor_id) ON DELETE CASCADE,
    phone_number TEXT NOT NULL,
    PRIMARY KEY (vendor_id, phone_number)
);

-- 3. raw_material
CREATE TABLE raw_material (
    raw_material_id  SERIAL PRIMARY KEY,
    name             TEXT NOT NULL UNIQUE,
    unit             TEXT NOT NULL,          -- kg, litre, piece
    current_stock    DECIMAL DEFAULT 0,
    reorder_level    DECIMAL DEFAULT 0,
    average_unit_cost DECIMAL DEFAULT 0
);

-- 4. menu_item
CREATE TABLE menu_item (
    menu_item_id            SERIAL PRIMARY KEY,
    name                    TEXT NOT NULL UNIQUE,
    selling_price           DECIMAL NOT NULL,
    is_prepared_in_kitchen  BOOLEAN DEFAULT FALSE,
    expires_daily           BOOLEAN DEFAULT FALSE,
    is_purchasable          BOOLEAN DEFAULT TRUE,
    request_mode            VARCHAR(4) DEFAULT 'Mid',
    mode_limit              INTEGER DEFAULT 4,
    CONSTRAINT chk_request_mode CHECK (request_mode IN ('Low', 'Mid', 'High')),
    CONSTRAINT chk_mode_limit CHECK (mode_limit > 0),
    CONSTRAINT chk_mode_mode_limit CHECK (
        (request_mode = 'Low' AND mode_limit = 8) OR
        (request_mode = 'Mid' AND mode_limit = 4) OR
        (request_mode = 'High' AND mode_limit = 1)
    ),
    CONSTRAINT chk_prepared_expiry CHECK (
        NOT (is_prepared_in_kitchen = TRUE AND expires_daily = TRUE)
    ),
    CONSTRAINT chk_ready_purchasable CHECK (
        NOT (is_prepared_in_kitchen = FALSE AND is_purchasable = FALSE)
    )
);

-- 5. ready_made_stock (non-expiry items like Coke)
CREATE TABLE ready_made_stock (
    stock_id          SERIAL PRIMARY KEY,
    menu_item_id      INTEGER NOT NULL UNIQUE,
    current_stock     INTEGER DEFAULT 0,
    reorder_level     INTEGER DEFAULT 0,
    average_unit_cost DECIMAL DEFAULT 0,
    CONSTRAINT fk_ready_stock_menu FOREIGN KEY (menu_item_id)
        REFERENCES menu_item(menu_item_id)
);

-- 6. ready_made_daily_stock (daily-expiry items like shingara)
CREATE TABLE ready_made_daily_stock (
    daily_stock_id    SERIAL PRIMARY KEY,
    menu_item_id      INTEGER NOT NULL,
    stock_date        DATE NOT NULL DEFAULT CURRENT_DATE,
    day_of_week       VARCHAR(10) GENERATED ALWAYS AS (
        CASE EXTRACT(DOW FROM stock_date)
            WHEN 0 THEN 'Sunday'
            WHEN 1 THEN 'Monday'
            WHEN 2 THEN 'Tuesday'
            WHEN 3 THEN 'Wednesday'
            WHEN 4 THEN 'Thursday'
            WHEN 5 THEN 'Friday'
            WHEN 6 THEN 'Saturday'
        END
    ) STORED,
    quantity_received INTEGER DEFAULT 0,
    quantity_sold     INTEGER DEFAULT 0,
    quantity_wasted   INTEGER DEFAULT 0,
    average_unit_cost DECIMAL DEFAULT 0,
    CONSTRAINT fk_daily_stock_menu FOREIGN KEY (menu_item_id)
        REFERENCES menu_item(menu_item_id),
    CONSTRAINT uq_daily_stock UNIQUE (menu_item_id, stock_date)
);

-- 7. customer (guest record: customer_id = 1)
CREATE TABLE customer (
    customer_id  SERIAL PRIMARY KEY,
    name         TEXT NOT NULL,
    phone        TEXT UNIQUE,
    id_type      VARCHAR(10),
    id_number    TEXT,
    is_temporary BOOLEAN DEFAULT FALSE,
    created_at   TIMESTAMP DEFAULT NOW(),
    CONSTRAINT chk_id_type CHECK (id_type IN ('student', 'nid')),
    CONSTRAINT chk_phone_or_guest CHECK (
        (is_temporary = TRUE AND phone IS NULL) OR
        (is_temporary = FALSE AND phone IS NOT NULL)
    ),
    CONSTRAINT uq_id UNIQUE (id_type, id_number)
);

-- Insert default guest customer
INSERT INTO customer (customer_id, name, phone, id_type, id_number, is_temporary)
VALUES (1, 'Guest', NULL, NULL, NULL, TRUE);

SELECT setval('customer_customer_id_seq', (SELECT MAX(customer_id) FROM customer));

-- 8. customer_order
CREATE TABLE customer_order (
    order_id            SERIAL PRIMARY KEY,
    customer_id         INTEGER NOT NULL REFERENCES customer(customer_id),
    order_timestamp     TIMESTAMP DEFAULT NOW(),
    total_paid          DECIMAL DEFAULT 0,
    payment_method      VARCHAR(10),
    status              VARCHAR(15) DEFAULT 'paid',
    last_status_update  TIMESTAMP DEFAULT NOW(),
    dine_in_takeaway    VARCHAR(10),
    CONSTRAINT chk_payment_method CHECK (payment_method IN ('cash', 'mobile')),
    CONSTRAINT chk_status CHECK (status IN (
        'paid', 'preparing', 'ready', 'served', 'abandoned', 'completed'
    )),
    CONSTRAINT chk_dine_takeaway CHECK (dine_in_takeaway IN ('dine_in', 'takeaway'))
);

