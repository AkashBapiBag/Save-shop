import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import { POSProductCard } from '@/components/pos/POSProductCard';
import { POSCategoryBar } from '@/components/pos/POSCategoryBar';
import { POSCartSummaryBar } from '@/components/pos/POSCartSummaryBar';
import { POSCartDrawer } from '@/components/pos/POSCartDrawer';
import { POSCheckoutModal } from '@/components/pos/POSCheckoutModal';
import { InventoryProductCard } from '@/components/inventory/InventoryProductCard';
import { BatchInspectionModal } from '@/components/inventory/BatchInspectionModal';
import { StoreCard } from '@/components/stores/StoreCard';
import { IndianStatePickerModal } from '@/components/stores/IndianStatePickerModal';
import { TaxInvoiceModal } from '@/components/TaxInvoiceModal';
import { SearchableCategoryModal } from '@/components/SearchableCategorySelect';
import { SearchableProductModal } from '@/components/SearchableProductSelect';
import { MainNavigator } from '@/components/MainNavigator';
import { AuthProvider } from '@/context/AuthContext';
import { Product, Store, ReceiptResponse, IndianState } from '@/types/api';

const mockProduct: Product = {
  product_id: 'p-1',
  store_id: 's-1',
  name: 'Organic Milk',
  category: 'Dairy',
  default_unit: 'LITER',
  selling_price: 65,
  cost_price: 50,
  min_stock_alert_threshold: 5,
  is_active: true,
  total_current_stock: 10,
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
};

const mockStore: Store = {
  store_id: 's-1',
  name: 'Metro Save Shop',
  address: '123 Park Street, Kolkata',
  phone_number: '9876543210',
  email: 'metro@saveshop.com',
  state: '19-West Bengal',
  has_signature: true,
  is_active: true,
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
};

describe('POS Components', () => {
  it('POSProductCard renders stock status and triggers onAddToCart', () => {
    const onAddMock = vi.fn();
    const { rerender } = render(
      <POSProductCard item={mockProduct} inCartQty={0} onAddToCart={onAddMock} />
    );

    expect(screen.getByText('Organic Milk')).toBeDefined();
    expect(screen.getByText('10 LITER')).toBeDefined();
    expect(screen.getByText('₹ 65.00')).toBeDefined();

    fireEvent.click(screen.getByText('Organic Milk'));
    expect(onAddMock).toHaveBeenCalledWith(mockProduct);

    // In Cart Qty badge
    rerender(<POSProductCard item={mockProduct} inCartQty={3} onAddToCart={onAddMock} />);
    expect(screen.getByText('3 in cart')).toBeDefined();

    // Out of stock
    const outOfStockProd = { ...mockProduct, total_current_stock: 0 };
    rerender(<POSProductCard item={outOfStockProd} inCartQty={0} onAddToCart={onAddMock} />);
    expect(screen.getByText('OUT OF STOCK')).toBeDefined();

    // Low stock
    const lowStockProd = { ...mockProduct, total_current_stock: 3 };
    rerender(<POSProductCard item={lowStockProd} inCartQty={0} onAddToCart={onAddMock} />);
    expect(screen.getByText('LOW (3)')).toBeDefined();
  });

  it('POSCategoryBar renders categories and selects category', () => {
    const onSelectMock = vi.fn();
    render(
      <POSCategoryBar
        categories={['All', 'Dairy', 'Bakery']}
        selectedCategory="All"
        categoryCounts={{ All: 15, Dairy: 10, Bakery: 5 }}
        onSelectCategory={onSelectMock}
      />
    );

    expect(screen.getByText('All')).toBeDefined();
    expect(screen.getByText('15')).toBeDefined();
    expect(screen.getByText('Dairy')).toBeDefined();

    fireEvent.click(screen.getByText('Dairy'));
    expect(onSelectMock).toHaveBeenCalledWith('Dairy');
  });

  it('POSCartSummaryBar displays order count and triggers onOpenCart', () => {
    const onOpenMock = vi.fn();
    const { rerender } = render(
      <POSCartSummaryBar totalCartCount={0} finalTotal={0} onOpenCart={onOpenMock} />
    );
    // When count <= 0, renders null
    expect(screen.queryByText('View Order & Discounts')).toBeNull();

    rerender(<POSCartSummaryBar totalCartCount={2} finalTotal={130} onOpenCart={onOpenMock} />);
    expect(screen.getByText('2')).toBeDefined();
    expect(screen.getByText('₹ 130.00')).toBeDefined();

    fireEvent.click(screen.getByText('View Order & Discounts'));
    expect(onOpenMock).toHaveBeenCalledTimes(1);
  });

  it('POSCartDrawer renders cart items and calls handlers', () => {
    const onQtyMock = vi.fn();
    const onProceedMock = vi.fn();
    const onClearMock = vi.fn();

    render(
      <POSCartDrawer
        visible={true}
        cart={[
          {
            product: mockProduct,
            quantity: 2,
            unit_price: 65,
            item_discount_pct: 0,
            category_discount_pct: 0,
            cashback_type: 'percentage',
            cashback_value: 5,
            cashback_amount: 6.5,
          },
        ]}
        totalCartCount={2}
        calculation={{
          subtotal: 130,
          totalCashback: 6.5,
          discountAmount: 10,
          discountPct: 7.69,
          finalTotal: 120,
        }}
        subtotalDiscountType="amount"
        subtotalDiscountValue="10"
        isValidatingStock={false}
        safeTop={20}
        onClose={() => {}}
        onClearCart={onClearMock}
        onProceedToCheckout={onProceedMock}
        onUpdateQuantity={onQtyMock}
        onUpdateItemCashback={() => {}}
        onSetSubtotalDiscountType={() => {}}
        onSetSubtotalDiscountValue={() => {}}
      />
    );

    expect(screen.getByText('Order Cart (2 items)')).toBeDefined();
    expect(screen.getByText('Organic Milk')).toBeDefined();
    expect(screen.getByText('Clear Cart')).toBeDefined();

    fireEvent.click(screen.getByText('Clear Cart'));
    expect(onClearMock).toHaveBeenCalled();

    const checkoutBtn = screen.getByText(/Charge ₹ 120\.00/i);
    fireEvent.click(checkoutBtn);
    expect(onProceedMock).toHaveBeenCalled();
  });

  it('POSCheckoutModal renders payment methods and triggers checkout', () => {
    const onMethodMock = vi.fn();
    const onConfirmMock = vi.fn();

    render(
      <POSCheckoutModal
        visible={true}
        finalTotal={120}
        paymentMethod="CASH"
        receivedAmount="150"
        customerName="Alice"
        customerPhone="9876543210"
        isProcessingCheckout={false}
        onClose={() => {}}
        onSelectPaymentMethod={onMethodMock}
        onChangeReceivedAmount={() => {}}
        onChangeCustomerName={() => {}}
        onChangeCustomerPhone={() => {}}
        onConfirmCheckout={onConfirmMock}
      />
    );

    expect(screen.getByText('Complete Payment')).toBeDefined();
    expect(screen.getAllByText('₹ 120.00')[0]).toBeDefined();
    expect(screen.getByText('UPI')).toBeDefined();

    fireEvent.click(screen.getByText('UPI'));
    expect(onMethodMock).toHaveBeenCalledWith('UPI');

    fireEvent.click(screen.getByText('Generate Bill & Receipt'));
    expect(onConfirmMock).toHaveBeenCalled();
  });
});

describe('Inventory Components', () => {
  it('InventoryProductCard renders product details and triggers onPress', () => {
    const onPressMock = vi.fn();
    render(<InventoryProductCard item={mockProduct} onPress={onPressMock} />);

    expect(screen.getByText('Organic Milk')).toBeDefined();
    expect(screen.getByText('IN STOCK')).toBeDefined();
    expect(screen.getByText(/Min Stock Alert: 5 LITER/i)).toBeDefined();

    fireEvent.click(screen.getByText('Organic Milk'));
    expect(onPressMock).toHaveBeenCalledWith(mockProduct);
  });

  it('BatchInspectionModal renders batch details', () => {
    const mockBatches: any[] = [
      {
        batch_id: 'b-1',
        product_id: 'p-1',
        batch_identifier: 'LOT-2026-001',
        expiry_date: '31-12-2026',
        current_quantity: 10,
        initial_quantity: 10,
        purchase_price: 50,
        purchase_date: '01-01-2026',
        days_to_expiry: 150,
        is_expired: false,
        is_active: true,
      },
    ];

    render(
      <BatchInspectionModal
        product={mockProduct}
        batches={mockBatches}
        isLoading={false}
        safeTop={20}
        onClose={() => {}}
      />
    );

    expect(screen.getByText('Organic Milk')).toBeDefined();
    expect(screen.getByText(/Category: Dairy/i)).toBeDefined();
    expect(screen.getByText('LOT-2026-001')).toBeDefined();
    expect(screen.getByText('31-12-2026')).toBeDefined();
  });
});

describe('Stores Components', () => {
  it('StoreCard renders store information and triggers actions', () => {
    const onSwitchMock = vi.fn();
    const onEditMock = vi.fn();
    const onSigMock = vi.fn();

    const { rerender } = render(
      <StoreCard
        item={mockStore}
        isActive={false}
        isAdmin={true}
        onSwitchStore={onSwitchMock}
        onEditStore={onEditMock}
        onQuickSignature={onSigMock}
      />
    );

    expect(screen.getByText('Metro Save Shop')).toBeDefined();
    expect(screen.getByText('123 Park Street, Kolkata')).toBeDefined();
    expect(screen.getByText('Switch')).toBeDefined();

    fireEvent.click(screen.getByText('Switch'));
    expect(onSwitchMock).toHaveBeenCalledWith('s-1');

    // When active, shows ACTIVE STORE badge instead of Switch button
    rerender(
      <StoreCard
        item={mockStore}
        isActive={true}
        isAdmin={true}
        onSwitchStore={onSwitchMock}
        onEditStore={onEditMock}
        onQuickSignature={onSigMock}
      />
    );
    expect(screen.getByText('ACTIVE STORE')).toBeDefined();
    expect(screen.queryByText('Switch')).toBeNull();
  });

  it('IndianStatePickerModal filters and selects state', () => {
    const onSelectMock = vi.fn();
    const mockStates: IndianState[] = [
      { code: '19', name: 'West Bengal', display_name: '19-West Bengal', state_type: 'STATE' },
      { code: '07', name: 'Delhi', display_name: '07-Delhi', state_type: 'UT' },
    ];

    render(
      <IndianStatePickerModal
        visible={true}
        statesList={mockStates}
        selectedState="19-West Bengal"
        onSelect={onSelectMock}
        onClose={() => {}}
      />
    );

    expect(screen.getByText('West Bengal')).toBeDefined();
    expect(screen.getByText('Delhi')).toBeDefined();

    fireEvent.click(screen.getByText('Delhi'));
    expect(onSelectMock).toHaveBeenCalledWith('07-Delhi');
  });
});

describe('TaxInvoiceModal & Search Modals', () => {
  const mockReceipt: ReceiptResponse = {
    transaction_id: 'tx-1',
    invoice_number: 'INV-2026-001',
    invoice_seq: 1,
    date: '2026-02-15T10:00:00Z',
    store: {
      ...mockStore,
      store_name: mockStore.name,
    },
    customer_name: 'Bob Smith',
    customer_phone: '9876543210',
    items: [
      {
        item_id: 'item-1',
        product_id: 'p-1',
        product_name: 'Organic Milk',
        category: 'Dairy',
        quantity: 2,
        unit: 'LITER',
        unit_price: 65,
        discount_amount: 0,
        discount_pct: 0,
        item_discount_pct: 0,
        category_discount_pct: 0,
        cashback_amount: 5,
        cashback_pct: 0,
        line_base_total: 130,
        line_discount_amount: 0,
        line_total: 130,
        allocations: [],
      },
    ],
    subtotal: 130,
    item_discount_amount: 0,
    category_discount_amount: 0,
    total_discount_percentage: 0,
    total_discount_amount: 0,
    total_cashback_amount: 5,
    tax_amount: 0,
    final_total: 130,
    received_amount: 130,
    balance_amount: 0,
    amount_in_words: 'One Hundred Thirty Rupees only',
    you_saved_amount: 0,
    payment_method: 'CASH',
    payment_status: 'PAID',
  };

  it('TaxInvoiceModal renders receipt data and triggers print and share', async () => {
    render(
      <TaxInvoiceModal
        visible={true}
        receipt={{
          ...mockReceipt,
          store: {
            ...mockReceipt.store,
            authorized_signature_base64: 'sampleSigData',
          },
        }}
        onClose={() => {}}
      />
    );

    expect(screen.getByText('Tax Invoice')).toBeDefined();
    expect(screen.getByText('Metro Save Shop')).toBeDefined();
    expect(screen.getByText('Bob Smith')).toBeDefined();

    const printBtn = screen.getByText('Print Bill');
    fireEvent.click(printBtn);

    const shareBtn = screen.getByText('Share PDF');
    fireEvent.click(shareBtn);
  });

  it('SearchableCategoryModal filters categories and selects', () => {
    const onSelectMock = vi.fn();
    render(
      <SearchableCategoryModal
        visible={true}
        categories={[{ name: 'Beverages', count: 4 }]}
        onSelect={onSelectMock}
        onClose={() => {}}
      />
    );

    expect(screen.getByText('Beverages')).toBeDefined();
    fireEvent.click(screen.getByText('Beverages'));
    expect(onSelectMock).toHaveBeenCalledWith('Beverages', false);

    // Search query for a new category
    const input = screen.getByPlaceholderText('Search categories...');
    fireEvent.change(input, { target: { value: 'Organic Superfoods' } });
    const createBtn = screen.getByText('+ Create');
    fireEvent.click(createBtn);
    expect(onSelectMock).toHaveBeenCalledWith('Organic Superfoods', true);
  });

  it('SearchableProductModal renders products, filters by category and selects', () => {
    const onSelectMock = vi.fn();
    render(
      <SearchableProductModal
        visible={true}
        products={[
          mockProduct,
          { ...mockProduct, product_id: 'p-2', name: 'Almond Biscotti', category: 'Bakery' },
        ]}
        onSelect={onSelectMock}
        onClose={() => {}}
      />
    );

    expect(screen.getByText('Organic Milk')).toBeDefined();
    expect(screen.getByText('Almond Biscotti')).toBeDefined();

    // Filter by Dairy (pill)
    const dairyPill = screen.getAllByText('Dairy')[0];
    fireEvent.click(dairyPill);
    expect(screen.getByText('Organic Milk')).toBeDefined();
    expect(screen.queryByText('Almond Biscotti')).toBeNull();

    // Select product
    fireEvent.click(screen.getByText('Organic Milk'));
    expect(onSelectMock).toHaveBeenCalledWith(mockProduct);
  });
});

describe('components/MainNavigator.tsx', () => {
  it('renders all 5 main navigation tabs and switches active tab', async () => {
    render(
      <AuthProvider>
        <MainNavigator />
      </AuthProvider>
    );

    expect(screen.getByText('Billing')).toBeDefined();
    expect(screen.getAllByText('Sales')[0]).toBeDefined();
    expect(screen.getByText('Inventory')).toBeDefined();
    expect(screen.getByText('Analytics')).toBeDefined();
    expect(screen.getByText('Stores')).toBeDefined();

    // Switch to Inventory
    fireEvent.click(screen.getByText('Inventory'));
    expect(await screen.findByText('Receive Stock')).toBeDefined();

    // Switch to Analytics
    fireEvent.click(screen.getByText('Analytics'));
    expect(await screen.findByText("Today's Revenue")).toBeDefined();

    // Switch to Stores
    fireEvent.click(screen.getByText('Stores'));
    expect(await screen.findByText('Store Directory')).toBeDefined();

    // Switch to Sales
    fireEvent.click(screen.getAllByText('Sales')[0]);
    expect(await screen.findByText('All Sales')).toBeDefined();

    // Switch back to Billing
    fireEvent.click(screen.getByText('Billing'));
    expect(await screen.findByText('Billing Counter')).toBeDefined();
  });
});
