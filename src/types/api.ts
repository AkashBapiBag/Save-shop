export type UserRole = 'admin' | 'user';

export interface User {
  user_id: string;
  email: string;
  name: string;
  role: UserRole;
  picture_url?: string | null;
  current_store_id?: string | null;
  accessible_store_ids: string[];
  created_at: string;
}

export interface LoginRequest {
  id_token?: string;
  access_token?: string;
  google_token?: string;
  auth0_token?: string;
  email?: string;
  name?: string;
  role?: UserRole | string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface AssignStoreRequest {
  user_id?: string;
  email?: string;
  store_id: string;
}

export interface AssignStoreResponse {
  success: boolean;
  message: string;
}

export interface StoreOperator {
  user_id: string;
  email: string;
  name: string;
  role: string;
  picture_url?: string | null;
  created_at: string;
}

export interface StoreInvitation {
  invitation_id: string;
  store_id: string;
  email: string;
  role: string;
  status: 'pending' | 'accepted' | 'revoked';
  created_at: string;
}

export interface StoreMembersOverview {
  store_id: string;
  store_name: string;
  operators: StoreOperator[];
  members?: StoreOperator[];
  invitations: StoreInvitation[];
}

export interface AddStoreOperatorRequest {
  email: string;
  role?: string;
}

export interface AddStoreOperatorResponse {
  status: 'assigned' | 'invited';
  message: string;
  operator?: StoreOperator | null;
  invitation?: StoreInvitation | null;
}

export interface IndianState {
  code: string;
  name: string;
  state_type: string;
  display_name: string;
}

export interface Store {
  store_id: string;
  name: string;
  owner_name?: string | null;
  phone_number?: string | null;
  address?: string | null;
  state?: string;
  email?: string | null;
  logo_url?: string | null;
  has_logo?: boolean;
  logo_base64?: string | null;
  has_signature: boolean;
  authorized_signature_base64?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StoreCreateRequest {
  store_id?: string;
  name: string;
  owner_name?: string | null;
  phone_number?: string | null;
  address?: string | null;
  state?: string;
  email?: string | null;
  logo_url?: string | null;
  logo_base64?: string | null;
  authorized_signature_base64?: string | null;
}

export interface StoreUpdateRequest {
  name?: string;
  owner_name?: string | null;
  phone_number?: string | null;
  address?: string | null;
  state?: string;
  email?: string | null;
  logo_url?: string | null;
  logo_base64?: string | null;
  authorized_signature_base64?: string | null;
  is_active?: boolean;
}

export interface SignatureUploadRequest {
  signature_base64: string;
}

export interface SignatureResponse {
  store_id: string;
  has_signature: boolean;
  signature_base64?: string;
}

export type UnitEnum =
  | 'KG'
  | 'ML'
  | 'GRAM'
  | 'DOZEN'
  | 'PIECE'
  | 'LITER'
  | 'PACKET'
  | 'BOX'
  | 'BOTTLE'
  | 'CAN'
  | 'METER';

export interface Batch {
  batch_id: string;
  product_id: string;
  store_id: string;
  batch_identifier: string;
  initial_quantity: number | string;
  current_quantity: number | string;
  purchase_price: number | string;
  expiry_date: string;
  purchase_date: string;
  days_to_expiry: number;
  is_expired: boolean;
  created_at: string;
}

export interface Product {
  product_id: string;
  store_id: string;
  name: string;
  description?: string | null;
  category: string;
  default_unit: UnitEnum;
  selling_price: number | string;
  cost_price: number | string;
  min_stock_alert_threshold: number | string;
  barcode?: string | null;
  total_current_stock: number | string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  batches?: Batch[];
}

export interface ProductCreateRequest {
  store_id?: string;
  name: string;
  description?: string | null;
  category?: string;
  default_unit: UnitEnum | string;
  selling_price: number | string;
  cost_price?: number | string;
  min_stock_alert_threshold?: number | string;
  barcode?: string | null;
}

export type ProductUpdateRequest = Partial<ProductCreateRequest & { is_active?: boolean }>;

export interface BatchReceiveSingleRequest {
  store_id?: string;
  product_id: string;
  batch_identifier: string;
  quantity: number | string;
  purchase_price?: number | string;
  purchase_date: string;
  expiry_date: string;
}

export interface BatchReceiveBulkRequest {
  store_id?: string;
  batches: {
    product_id: string;
    batch_identifier: string;
    quantity: number | string;
    purchase_price?: number | string;
    purchase_date: string;
    expiry_date: string;
  }[];
}

export interface ConsignmentItem {
  id: string;
  product: Product;
  batch_identifier: string;
  quantity: number;
  purchase_price: number;
  expiry_date: string;
}

export interface CategorySummary {
  name: string;
  count: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
  unit_price: number;
  item_discount_pct: number;
  category_discount_pct: number;
  cashback_type: 'amount' | 'percentage';
  cashback_value: number;
  cashback_amount: number;
}

export interface CategoryDiscountRule {
  category: string;
  discount_pct: number;
}

export type PaymentMethod = 'CASH' | 'CARD' | 'UPI' | 'CREDIT';

export interface POSTransactionCreateItem {
  product_id: string;
  quantity: string | number;
  unit_price_override?: string | number;
  item_discount_pct?: string | number;
  category_discount_pct?: string | number;
  cashback_amount?: string | number;
  cashback_pct?: string | number;
}

export interface POSTransactionCreate {
  store_id?: string;
  items: POSTransactionCreateItem[];
  category_discounts?: CategoryDiscountRule[];
  total_discount_pct?: string | number;
  total_discount_amount?: string | number;
  discount_type?: 'amount' | 'percentage';
  received_amount?: string | number;
  payment_method: PaymentMethod;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  notes?: string;
  client_offline_id?: string;
}

export interface BatchAllocation {
  allocation_id: string;
  batch_id: string;
  batch_identifier: string;
  quantity_deducted: number | string;
  expiry_date: string;
}

export interface TransactionItemResponse {
  item_id: string;
  product_id: string;
  product_name: string;
  category: string;
  unit: string;
  quantity: number | string;
  unit_price: number | string;
  item_discount_pct: number | string;
  category_discount_pct: number | string;
  cashback_amount: number | string;
  cashback_pct: number | string;
  discount_amount: number | string;
  discount_pct: number | string;
  line_base_total: number | string;
  line_discount_amount: number | string;
  line_total: number | string;
  allocations: BatchAllocation[];
}

export interface TransactionResponse {
  transaction_id: string;
  store_id: string;
  invoice_number: string;
  invoice_seq?: number | null;
  cashier_id?: string | null;
  cashier_name?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  customer_email?: string | null;
  subtotal: number | string;
  item_discount_amount: number | string;
  category_discount_amount: number | string;
  total_discount_percentage: number | string;
  total_discount_amount: number | string;
  total_cashback_amount: number | string;
  tax_amount: number | string;
  final_total: number | string;
  received_amount?: number | string;
  balance_amount?: number | string;
  amount_in_words?: string;
  you_saved_amount?: number | string;
  payment_method: PaymentMethod;
  payment_status: string;
  notes?: string | null;
  offline_synced: boolean;
  client_offline_id?: string | null;
  created_at: string;
  items: TransactionItemResponse[];
}

export interface StoreReceiptHeader {
  store_id: string;
  store_name: string;
  owner_name?: string | null;
  phone_number?: string | null;
  address?: string | null;
  email?: string | null;
  state?: string;
  logo_url?: string | null;
  has_logo?: boolean;
  logo_base64?: string | null;
  has_signature: boolean;
  authorized_signature_base64?: string | null;
}

export interface ReceiptResponse {
  store: StoreReceiptHeader;
  invoice_number: string;
  invoice_seq?: number | null;
  transaction_id: string;
  date: string;
  cashier_name?: string;
  customer_name?: string;
  customer_phone?: string;
  items: TransactionItemResponse[];
  subtotal: number | string;
  item_discount_amount: number | string;
  category_discount_amount: number | string;
  total_discount_percentage: number | string;
  total_discount_amount: number | string;
  total_cashback_amount: number | string;
  tax_amount: number | string;
  final_total: number | string;
  received_amount?: number | string;
  balance_amount?: number | string;
  amount_in_words?: string;
  you_saved_amount?: number | string;
  payment_method: string;
  payment_status: string;
}

export interface StockValidationItem {
  product_id: string;
  quantity: number | string;
}

export interface StockValidationItemError {
  product_id: string;
  product_name: string;
  available_stock: number | string;
  requested_stock: number | string;
  message: string;
}

export interface StockValidationResponse {
  is_valid: boolean;
  errors: StockValidationItemError[];
}

export interface DashboardOverview {
  store_id: string;
  store_name: string;
  today_transaction_count: number;
  today_revenue: number | string;
  weekly_revenue: number | string;
  monthly_revenue: number | string;
  total_active_products: number;
  low_stock_products_count: number;
  batches_expiring_within_30_days: number;
  batches_expiring_within_60_days: number;
}

export interface CriticalBatchItem {
  batch_id: string;
  batch_identifier: string;
  product_id: string;
  product_name: string;
  category: string;
  current_quantity: number | string;
  unit: string;
  expiry_date: string;
  days_until_expiry: number;
  status: 'EXPIRED' | 'CRITICAL_30_DAYS' | 'WARNING_60_DAYS';
}

export interface StockHealthResponse {
  store_id: string;
  total_critical_batches: number;
  expired_batches_count: number;
  expiring_30_days_count: number;
  expiring_60_days_count: number;
  batches: CriticalBatchItem[];
}

export interface TopSellingProductItem {
  product_id: string;
  product_name: string;
  category: string;
  unit: string;
  total_quantity_sold: number | string;
  total_revenue: number | string;
}

export interface DailyRevenueTrendItem {
  date: string;
  transaction_count: number;
  revenue: number | string;
}

export interface SalesVelocityResponse {
  store_id: string;
  period_days: number;
  top_selling_items: TopSellingProductItem[];
  daily_trend: DailyRevenueTrendItem[];
}

export interface LowStockAlertItem {
  product_id: string;
  product_name: string;
  category: string;
  unit: string;
  current_stock: number | string;
  min_stock_alert_threshold: number | string;
  selling_price: number | string;
}

export interface InventoryStatusResponse {
  store_id: string;
  total_products: number;
  in_stock_products_count: number;
  low_stock_products_count: number;
  out_of_stock_products_count: number;
  low_stock_items: LowStockAlertItem[];
  expiring_batches_summary: Record<string, number>;
}

export interface TransactionListParams {
  search?: string;
  date_filter?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}
