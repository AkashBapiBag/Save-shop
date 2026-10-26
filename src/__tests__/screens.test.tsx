import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, screen, act } from '@testing-library/react';
import { POSTerminalScreen } from '@/screens/POSTerminalScreen';
import { InventoryScreen } from '@/screens/InventoryScreen';
import { DashboardScreen } from '@/screens/DashboardScreen';
import { SalesHistoryScreen } from '@/screens/SalesHistoryScreen';
import { LoginScreen } from '@/screens/LoginScreen';
import RootLayout from '@/app/_layout';
import { AuthProvider } from '@/context/AuthContext';
import { inventoryApi, billingApi, dashboardApi } from '@/services/api';
import { Product, Store, TransactionResponse, ReceiptResponse } from '@/types/api';

const mockProduct: Product = {
  product_id: 'p-1',
  store_id: 's-1',
  name: 'Farm Fresh Eggs',
  category: 'Poultry',
  default_unit: 'DOZEN',
  selling_price: 90,
  cost_price: 70,
  min_stock_alert_threshold: 5,
  is_active: true,
  total_current_stock: 25,
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
};

const mockStore: Store = {
  store_id: 's-1',
  name: 'Metro Save Shop',
  address: 'Park Street, Kolkata',
  phone_number: '9876543210',
  email: 'metro@saveshop.com',
  state: '19-West Bengal',
  has_signature: true,
  is_active: true,
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
};

const mockTransaction: TransactionResponse = {
  transaction_id: 'tx-1',
  store_id: 's-1',
  invoice_number: 'INV-2026-001',
  invoice_seq: 1,
  subtotal: 180,
  item_discount_amount: 0,
  category_discount_amount: 0,
  total_discount_percentage: 0,
  total_discount_amount: 0,
  total_cashback_amount: 0,
  tax_amount: 0,
  final_total: 180,
  received_amount: 200,
  balance_amount: 20,
  payment_method: 'CASH',
  payment_status: 'PAID',
  customer_name: 'David Miller',
  customer_phone: '9876543210',
  offline_synced: true,
  created_at: '2026-02-15T10:00:00Z',
  items: [
    {
      item_id: 'item-1',
      product_id: 'p-1',
      product_name: 'Farm Fresh Eggs',
      category: 'Poultry',
      unit: 'DOZEN',
      quantity: 2,
      unit_price: 90,
      item_discount_pct: 0,
      category_discount_pct: 0,
      cashback_amount: 0,
      cashback_pct: 0,
      discount_amount: 0,
      discount_pct: 0,
      line_base_total: 180,
      line_discount_amount: 0,
      line_total: 180,
      allocations: [],
    },
  ],
};

const mockReceipt: ReceiptResponse = {
  transaction_id: 'tx-1',
  invoice_number: 'INV-2026-001',
  invoice_seq: 1,
  date: '2026-02-15T10:00:00Z',
  store: {
    ...mockStore,
    store_name: mockStore.name,
  },
  customer_name: 'David Miller',
  customer_phone: '9876543210',
  items: [
    {
      item_id: 'item-1',
      product_id: 'p-1',
      product_name: 'Farm Fresh Eggs',
      category: 'Poultry',
      unit: 'DOZEN',
      quantity: 2,
      unit_price: 90,
      item_discount_pct: 0,
      category_discount_pct: 0,
      cashback_amount: 0,
      cashback_pct: 0,
      discount_amount: 0,
      discount_pct: 0,
      line_base_total: 180,
      line_discount_amount: 0,
      line_total: 180,
      allocations: [],
    },
  ],
  subtotal: 180,
  item_discount_amount: 0,
  category_discount_amount: 0,
  total_discount_percentage: 0,
  total_discount_amount: 0,
  total_cashback_amount: 0,
  tax_amount: 0,
  final_total: 180,
  received_amount: 200,
  balance_amount: 20,
  amount_in_words: 'One Hundred Eighty Rupees only',
  you_saved_amount: 0,
  payment_method: 'CASH',
  payment_status: 'PAID',
};

vi.mock('@/services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/api')>();
  return {
    ...actual,
    inventoryApi: {
      listProducts: vi.fn(),
      createProduct: vi.fn(),
      receiveSingleBatch: vi.fn(),
      listBatches: vi.fn(),
    },
    billingApi: {
      validateStock: vi.fn(),
      checkout: vi.fn(),
      createTransaction: vi.fn(),
      listTransactions: vi.fn(),
      getReceipt: vi.fn(),
    },
    dashboardApi: {
      getOverview: vi.fn(),
      getStockHealth: vi.fn(),
      getSalesVelocity: vi.fn(),
    },
    storeApi: {
      getIndianStates: vi.fn(),
      createStore: vi.fn(),
      updateStore: vi.fn(),
      uploadStoreSignature: vi.fn(),
    },
    authApi: {
      login: vi.fn(),
      getMe: vi.fn(),
      getAccessibleStores: vi.fn(),
      switchStore: vi.fn(),
    },
  };
});

describe('screens/POSTerminalScreen.tsx', () => {
  beforeEach(() => {
    vi.mocked(inventoryApi.listProducts).mockResolvedValue([mockProduct]);
    vi.mocked(billingApi.validateStock).mockResolvedValue({ is_valid: true, errors: [] });
    vi.mocked(billingApi.checkout).mockResolvedValue(mockTransaction);
    vi.mocked(billingApi.getReceipt).mockResolvedValue(mockReceipt);
  });

  it('loads products, adds to cart, and proceeds to checkout', async () => {
    await act(async () => {
      render(
        <AuthProvider>
          <POSTerminalScreen onNavigateToSales={() => {}} />
        </AuthProvider>
      );
    });

    expect(await screen.findByText('Farm Fresh Eggs')).toBeDefined();
    expect(screen.getByText('Billing Counter')).toBeDefined();

    // Add to cart
    await act(async () => {
      fireEvent.click(screen.getByText('Farm Fresh Eggs'));
    });

    // Cart summary bar displays 1 item
    expect(await screen.findByText('View Order & Discounts')).toBeDefined();

    // Open Cart Drawer
    await act(async () => {
      fireEvent.click(screen.getByText('View Order & Discounts'));
    });
    expect(screen.getByText(/Order Cart \(1 items\)/i)).toBeDefined();

    // Click Charge
    const chargeBtn = screen.getByText(/Charge ₹ 90\.00/i);
    await act(async () => {
      fireEvent.click(chargeBtn);
    });

    // Checkout modal is opened
    expect(await screen.findByText('Complete Payment')).toBeDefined();
  });
});

describe('screens/InventoryScreen.tsx', () => {
  beforeEach(() => {
    vi.mocked(inventoryApi.listProducts).mockResolvedValue([mockProduct]);
    vi.mocked(inventoryApi.listBatches).mockResolvedValue([
      {
        batch_id: 'b-1',
        product_id: 'p-1',
        store_id: 's-1',
        batch_identifier: 'LOT-EGGS-01',
        expiry_date: '30-03-2026',
        current_quantity: 25,
        initial_quantity: 25,
        purchase_price: 70,
        purchase_date: '01-01-2026',
        days_to_expiry: 45,
        is_expired: false,
        created_at: '2026-01-01',
      },
    ]);
  });

  it('renders products and opens batch inspection on click', async () => {
    await act(async () => {
      render(
        <AuthProvider>
          <InventoryScreen />
        </AuthProvider>
      );
    });

    expect(await screen.findByText('Farm Fresh Eggs')).toBeDefined();
    expect(screen.getByText('Receive Stock')).toBeDefined();

    // Click product to inspect batches
    await act(async () => {
      fireEvent.click(screen.getByText('Farm Fresh Eggs'));
    });

    expect(await screen.findByText('LOT-EGGS-01')).toBeDefined();
    expect(screen.getByText(/FEFO Batches/i)).toBeDefined();
  });
});

describe('screens/DashboardScreen.tsx', () => {
  beforeEach(() => {
    vi.mocked(dashboardApi.getOverview).mockResolvedValue({
      today_revenue: 3200,
      today_transaction_count: 8,
      weekly_revenue: 15450,
      low_stock_products_count: 3,
      batches_expiring_within_30_days: 1,
    } as any);
    vi.mocked(dashboardApi.getStockHealth).mockResolvedValue({
      total_critical_batches: 0,
      batches: [],
    } as any);
    vi.mocked(dashboardApi.getSalesVelocity).mockResolvedValue({
      top_selling_items: [
        {
          product_id: 'p-1',
          product_name: 'Farm Fresh Eggs',
          category: 'Poultry',
          total_quantity_sold: 120,
          unit: 'DOZEN',
          total_revenue: 10800,
        },
      ],
      period_days: 7,
    } as any);
  });

  it('aggregates and displays store analytics telemetry', async () => {
    await act(async () => {
      render(
        <AuthProvider>
          <DashboardScreen />
        </AuthProvider>
      );
    });

    expect(await screen.findByText("Today's Revenue")).toBeDefined();
    expect(screen.getByText('Weekly Revenue')).toBeDefined();
    expect(screen.getByText('Low Stock Alerts')).toBeDefined();
    expect(screen.getByText('Fast Moving Items')).toBeDefined();
  });
});

describe('screens/SalesHistoryScreen.tsx', () => {
  beforeEach(() => {
    vi.mocked(billingApi.listTransactions).mockResolvedValue([mockTransaction]);
    vi.mocked(billingApi.getReceipt).mockResolvedValue(mockReceipt);
  });

  it('renders transaction history and opens invoice on click', async () => {
    await act(async () => {
      render(
        <AuthProvider>
          <SalesHistoryScreen />
        </AuthProvider>
      );
    });

    expect(await screen.findByText('David Miller')).toBeDefined();
    expect(screen.getByText('All Sales')).toBeDefined();

    // Click transaction to view receipt
    await act(async () => {
      fireEvent.click(screen.getByText('David Miller'));
    });

    expect(await screen.findByText('Tax Invoice')).toBeDefined();
    expect(screen.getByText('One Hundred Eighty Rupees only')).toBeDefined();
  });
});

describe('screens/LoginScreen.tsx', () => {
  it('renders branding and Google SSO sign in button', async () => {
    render(
      <AuthProvider>
        <LoginScreen />
      </AuthProvider>
    );

    expect(await screen.findByText('SAVE SHOP')).toBeDefined();
    expect(await screen.findByText('Terminal Sign In')).toBeDefined();
    expect(await screen.findByText('Sign in with Google')).toBeDefined();
  });
});

describe('app/_layout.tsx', () => {
  it('renders RootLayout properly', async () => {
    render(<RootLayout />);
    // With no token, defaults to LoginScreen
    expect(await screen.findByText('SAVE SHOP')).toBeDefined();
  });
});
