// DTOs mirroring the PL/pgSQL return shapes (see database/functions/*.sql).

export interface Product {
  id: number;
  name: string;
  type: 'PREPARED' | 'READY_MADE';
  price: number;
  status: string; // 'Available' | 'Preparing' | 'Exhausted' | 'Out of Stock' | 'Live Stock: N'
  batch_id: number | null;
  mode: string | null;
  mode_limit: number;
  stock: number | null;
  reorder_level: number | null;
}

export interface Batch {
  id: number;
  name: string;
  status: 'preparing' | 'available' | 'exhausted';
}

export interface Customer {
  customer_id: number;
  name: string;
  phone: string | null;
  id_type: 'student' | 'nid' | null;
  id_number: string | null;
  is_temporary: boolean;
}

export type OrderStatus = 'paid' | 'preparing' | 'ready' | 'served' | 'abandoned' | 'completed';

export interface BoardOrder {
  order_id: number;
  customer_name: string;
  status: OrderStatus;
  order_timestamp: string;
  last_status_update: string;
  dine_in_takeaway: 'dine_in' | 'takeaway';
  items: { name: string; qty: number }[] | null;
}

export interface ActiveOrder {
  order_id: number;
  status: OrderStatus;
  order_timestamp: string;
  total_paid: number;
  payment_method: 'cash' | 'mobile';
  dine_in_takeaway: 'dine_in' | 'takeaway';
  items: { name: string; qty: number; type: string }[] | null;
}

export interface PendingRequest {
  request_id: number;
  order_id: number | null;
  menu_item_id: number;
  menu_item_name: string;
  requested_quantity: number;
  requested_at: string;
}

export interface KitchenRequestStatus {
  request_id: number;
  order_id: number;
  menu_item_id: number;
  requested_quantity: number;
  status: 'pending' | 'approved' | 'rejected';
  approved_quantity: number | null;
}

export interface RawMaterial {
  raw_material_id: number;
  name: string;
  unit: string;
  current_stock: number;
  reorder_level: number;
  average_unit_cost: number;
}

export interface ReadyMadeStockRow {
  menu_item_id: number;
  name: string;
  selling_price: number;
  expires_daily: boolean;
  current_stock: number;
  reorder_level: number;
  average_unit_cost: number;
}

export interface Vendor {
  vendor_id: number;
  name: string;
  address: string | null;
  phones: string[];
}

export interface PurchaseOrderRow {
  purchase_order_id: number;
  order_date: string;
  total_amount: number;
  notes: string | null;
  vendor_id: number;
  vendor_name: string;
  lines:
    | {
        item_type: 'raw_material' | 'ready_made';
        item_id: number;
        item_name: string;
        quantity: number;
        unit_cost: number;
      }[]
    | null;
}

export interface StockoutRow {
  request_id: number;
  menu_item_id: number;
  name: string;
  quantity: number;
  request_date: string;
  request_time: string;
}

export interface WasteRow {
  daily_stock_id: number;
  menu_item_id: number;
  name: string;
  stock_date: string;
  quantity_received: number;
  quantity_sold: number;
  quantity_wasted: number;
  average_unit_cost: number;
  cost_impact: number;
}

export interface ProfitReport {
  total_revenue: number;
  total_cost: number;
  total_profit: number;
  prepared_revenue: number;
  prepared_cost: number;
  readymade_revenue: number;
  readymade_cost: number;
}

export interface TopSeller {
  menu_item_id: number;
  item_name: string;
  total_quantity: number;
  total_revenue: number;
  item_type: string;
}

export interface TopRequested {
  menu_item_id: number;
  item_name: string;
  total_requests: number;
  item_type: string;
}

export interface OrdersSummary {
  byDay: { day: string; orders: number; revenue: number }[];
  mix: { cash: number; mobile: number; dine_in: number; takeaway: number; abandoned: number };
  vendors: { vendor_id: number; name: string; po_count: number; total_spend: number }[];
}

export const TAKA = '৳';

export const fmtTaka = (n: number | null | undefined) =>
  `${TAKA}${Number(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

export interface DailyStockRow {
  daily_stock_id: number;
  menu_item_id: number;
  name: string;
  stock_date: string;
  quantity_received: number;
  quantity_sold: number;
  quantity_received: number;
  quantity_sold: number;
  quantity_wasted: number;
  average_unit_cost: number;
}
