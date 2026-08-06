-- ============================================
-- CDS Database — Master Setup Script
-- Run: psql -d cds_database -f database/run_all.sql
-- ============================================

\echo '=== Dropping and recreating tables ==='
\ir ddl/01_tables.sql
\ir ddl/02_pos_escalation.sql

\echo '=== Creating triggers ==='
\ir triggers/01_order_status_timestamp.sql
\ir triggers/02_purchase_stock_update.sql
\ir triggers/03_batch_issue_deduction.sql
\ir triggers/04_sale_stock_deduction.sql

\echo '=== Creating functions ==='
\ir functions/01_helpers.sql
\ir functions/02_product_views.sql
\ir functions/03_customer.sql
\ir functions/04_order.sql
\ir functions/05_kitchen.sql
\ir functions/06_abandoned_orders.sql
\ir functions/07_daily_stock.sql
\ir functions/08_analytics.sql

\echo '=== Loading seed data ==='
\ir seed/01_seed_data.sql

\echo '=== Setup complete! ==='
