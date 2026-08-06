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
    day_of_week       VARCHAR(10) GENERATED ALWAYS AS (TRIM(TO_CHAR(stock_date, 'Day'))) STORED,
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

-- 9. kitchen_batch_issue
CREATE TABLE kitchen_batch_issue (
    batch_id     SERIAL PRIMARY KEY,
    menu_item_id INTEGER NOT NULL REFERENCES menu_item(menu_item_id),
    issued_at    TIMESTAMP DEFAULT NOW(),
    status       VARCHAR(15) DEFAULT 'preparing',
    notes        TEXT,
    CONSTRAINT chk_batch_status CHECK (status IN ('preparing', 'available', 'exhausted'))
);

-- 10. kitchen_batch_issue_line
CREATE TABLE kitchen_batch_issue_line (
    line_id           SERIAL PRIMARY KEY,
    batch_id          INTEGER NOT NULL REFERENCES kitchen_batch_issue(batch_id) ON DELETE CASCADE,
    raw_material_id   INTEGER NOT NULL REFERENCES raw_material(raw_material_id),
    quantity_taken    DECIMAL NOT NULL,
    unit_cost_at_time DECIMAL NOT NULL
);

-- 11. kitchen_request (escalation for exceeding mode limit)
CREATE TABLE kitchen_request (
    request_id          SERIAL PRIMARY KEY,
    order_id            INTEGER NOT NULL REFERENCES customer_order(order_id),
    menu_item_id        INTEGER NOT NULL REFERENCES menu_item(menu_item_id),
    requested_quantity  INTEGER NOT NULL,
    status              VARCHAR(10) DEFAULT 'pending',
    approved_quantity   INTEGER,
    requested_at        TIMESTAMP DEFAULT NOW(),
    responded_at        TIMESTAMP,
    CONSTRAINT chk_request_status CHECK (status IN ('pending', 'approved', 'rejected'))
);

-- 12. stockout_request
CREATE TABLE stockout_request (
    request_id    SERIAL PRIMARY KEY,
    menu_item_id  INTEGER NOT NULL REFERENCES menu_item(menu_item_id),
    request_date  DATE NOT NULL DEFAULT CURRENT_DATE,
    day_of_week   VARCHAR(10) GENERATED ALWAYS AS (TRIM(TO_CHAR(request_date, 'Day'))) STORED,
    request_time  TIMESTAMP DEFAULT NOW(),
    quantity      INTEGER DEFAULT 1
);

-- 13. stock_recommendation
CREATE TABLE stock_recommendation (
    recommendation_id    SERIAL PRIMARY KEY,
    menu_item_id         INTEGER NOT NULL REFERENCES menu_item(menu_item_id),
    target_day_of_week   VARCHAR(10) NOT NULL,
    recommended_quantity INTEGER NOT NULL,
    weeks_considered     INTEGER DEFAULT 4,
    calculated_on        TIMESTAMP DEFAULT NOW(),
    overridden_by        TEXT,
    override_reason      TEXT,
    is_active            BOOLEAN DEFAULT TRUE
);

-- 14. purchase_order
CREATE TABLE purchase_order (
    purchase_order_id SERIAL PRIMARY KEY,
    vendor_id         INTEGER NOT NULL REFERENCES vendor(vendor_id),
    order_date        DATE DEFAULT CURRENT_DATE,
    total_amount      DECIMAL,
    notes             TEXT
);

-- 15. purchase_order_line
CREATE TABLE purchase_order_line (
    line_id           SERIAL PRIMARY KEY,
    purchase_order_id INTEGER NOT NULL REFERENCES purchase_order(purchase_order_id) ON DELETE CASCADE,
    item_type         VARCHAR(15) NOT NULL,
    item_id           INTEGER NOT NULL,
    quantity          DECIMAL NOT NULL,
    unit_cost         DECIMAL NOT NULL,
    CONSTRAINT chk_item_type CHECK (item_type IN ('raw_material', 'ready_made'))
);

-- 16. order_line
CREATE TABLE order_line (
    order_line_id       SERIAL PRIMARY KEY,
    order_id            INTEGER NOT NULL REFERENCES customer_order(order_id),
    menu_item_id        INTEGER NOT NULL REFERENCES menu_item(menu_item_id),
    batch_id            INTEGER REFERENCES kitchen_batch_issue(batch_id),
    quantity            INTEGER NOT NULL DEFAULT 1,
    unit_price_snapshot DECIMAL NOT NULL,
    unit_cost_at_time   DECIMAL
);
