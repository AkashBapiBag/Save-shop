import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, screen, act } from '@testing-library/react';
import { POSCustomerCard } from '@/components/pos/POSCustomerCard';
import { CreateCustomerModal } from '@/components/pos/CreateCustomerModal';
import { CustomerHistoryModal } from '@/components/pos/CustomerHistoryModal';
import { POSActiveCustomerBanner } from '@/components/pos/POSActiveCustomerBanner';
import { POSCustomerSelectView } from '@/components/pos/POSCustomerSelectView';
import { POSCheckoutModal } from '@/components/pos/POSCheckoutModal';
import { SettleDueModal } from '@/components/pos/SettleDueModal';
import { AuthProvider } from '@/context/AuthContext';
import { customerApi } from '@/services/api';
import { Customer, CustomerHistoryResponse } from '@/types/api';

vi.mock('@/services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/api')>();
  return {
    ...actual,
    customerApi: {
      listCustomers: vi.fn(),
      createCustomer: vi.fn(),
      getCustomer: vi.fn(),
      getCustomerHistory: vi.fn(),
      updateCustomer: vi.fn(),
      recordPayment: vi.fn(),
      getCustomerPayments: vi.fn(),
    },
    authApi: {
      login: vi.fn(),
      getMe: vi.fn(),
      getAccessibleStores: vi.fn(),
      switchStore: vi.fn(),
    },
  };
});

const mockCustomerWithOrders: Customer = {
  customer_id: 'cust-101',
  store_id: 'store-1',
  name: 'Sourav Ganguly',
  phone: '9830012345',
  email: 'sourav@cricket.in',
  address: 'Behala, Kolkata',
  notes: 'VIP customer',
  total_orders: 5,
  total_spent: 12500,
  last_order_date: '2026-11-01T10:00:00Z',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const mockNewCustomer: Customer = {
  customer_id: 'cust-102',
  store_id: 'store-1',
  name: 'Sunita Das',
  phone: null, // Phone is optional!
  email: null,
  address: null,
  notes: null,
  total_orders: 0,
  total_spent: 0,
  last_order_date: null,
  created_at: '2026-11-04T00:00:00Z',
  updated_at: '2026-11-04T00:00:00Z',
};

describe('POS Customer Components & Billing Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POSCustomerCard', () => {
    it('renders customer with orders, total spend, and triggers select and history', () => {
      const onSelectMock = vi.fn();
      const onHistoryMock = vi.fn();

      render(
        <POSCustomerCard
          customer={mockCustomerWithOrders}
          onSelect={onSelectMock}
          onViewHistory={onHistoryMock}
        />
      );

      expect(screen.getByText('Sourav Ganguly')).toBeDefined();
      expect(screen.getByText('9830012345')).toBeDefined();
      expect(screen.getByText('₹12500')).toBeDefined();
      expect(screen.getByText('5')).toBeDefined();

      // Trigger selection
      fireEvent.click(screen.getByText('Sourav Ganguly'));
      expect(onSelectMock).toHaveBeenCalledWith(mockCustomerWithOrders);

      // Trigger history via View Bill button
      const viewBillBtn = screen.getByText('View Bill');
      expect(viewBillBtn).toBeDefined();
      fireEvent.click(viewBillBtn);
      expect(onHistoryMock).toHaveBeenCalledWith(mockCustomerWithOrders);
    });

    it('renders new customer with New badge and No phone number', () => {
      const onSelectMock = vi.fn();
      const onHistoryMock = vi.fn();

      render(
        <POSCustomerCard
          customer={mockNewCustomer}
          onSelect={onSelectMock}
          onViewHistory={onHistoryMock}
        />
      );

      expect(screen.getByText('Sunita Das')).toBeDefined();
      expect(screen.getByText('No phone number')).toBeDefined();
      expect(screen.getByText('New')).toBeDefined();
      expect(screen.queryByText('View Bill')).toBeNull();
    });

    it('does not show 2 store / 3 store badge on customer card, only shows total and order count', () => {
      const onSelectMock = vi.fn();
      const onHistoryMock = vi.fn();
      const multiStoreCustomer: Customer = {
        ...mockCustomerWithOrders,
        is_multi_store: true,
        store_ids: ['store-1', 'store-2'],
      };

      render(
        <POSCustomerCard
          customer={multiStoreCustomer}
          onSelect={onSelectMock}
          onViewHistory={onHistoryMock}
        />
      );

      // Store count badges like "2 Stores" are hidden
      expect(screen.queryByText('2 Stores')).toBeNull();
      expect(screen.queryByText('Common')).toBeNull();
      // Total spent and orders count are shown
      expect(screen.getByText('₹12500')).toBeDefined();
      expect(screen.getByText('5')).toBeDefined();
      expect(screen.getByText('View Bill')).toBeDefined();
    });
  });

  describe('CreateCustomerModal', () => {
    it('creates customer with name and optional phone', async () => {
      const onCloseMock = vi.fn();
      const onCreatedMock = vi.fn();

      vi.mocked(customerApi.createCustomer).mockResolvedValue({
        customer_id: 'cust-new',
        store_id: 'store-1',
        name: 'Arjun Sen',
        phone: '9988776655',
        email: null,
        address: null,
        notes: null,
        total_orders: 0,
        total_spent: 0,
        created_at: '2026-11-04',
        updated_at: '2026-11-04',
      });

      render(
        <CreateCustomerModal
          visible={true}
          initialQuery="Arjun"
          onClose={onCloseMock}
          onCustomerCreated={onCreatedMock}
        />
      );

      expect(screen.getByText('New Customer')).toBeDefined();
      const submitBtn = screen.getByText('Save & Start Billing');

      await act(async () => {
        fireEvent.click(submitBtn);
      });

      expect(customerApi.createCustomer).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Arjun',
        })
      );
      expect(onCreatedMock).toHaveBeenCalled();
      expect(onCloseMock).toHaveBeenCalled();
    });

    it('proceeds with existing customer if already saved in database', async () => {
      const onCloseMock = vi.fn();
      const onCreatedMock = vi.fn();

      const existingCustomer: Customer = {
        customer_id: 'cust-existing',
        store_id: 'store-1',
        name: 'Arjun Sen',
        phone: '9988776655',
        total_orders: 4,
        total_spent: 1200,
        created_at: '2026-10-01',
        updated_at: '2026-10-01',
      };

      vi.mocked(customerApi.createCustomer).mockResolvedValue(existingCustomer);

      render(
        <CreateCustomerModal
          visible={true}
          initialQuery="Arjun"
          onClose={onCloseMock}
          onCustomerCreated={onCreatedMock}
        />
      );

      const submitBtn = screen.getByText('Save & Start Billing');
      await act(async () => {
        fireEvent.click(submitBtn);
      });

      expect(customerApi.createCustomer).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Arjun',
        })
      );
      expect(onCreatedMock).toHaveBeenCalledWith(existingCustomer);
      expect(onCloseMock).toHaveBeenCalled();
    });
  });

  describe('CustomerHistoryModal', () => {
    it('displays CustomerHistorySkeleton while transaction records are loading', () => {
      vi.mocked(customerApi.getCustomerHistory).mockReturnValue(new Promise(() => {}));

      render(
        <CustomerHistoryModal
          visible={true}
          customer={mockCustomerWithOrders}
          onClose={() => {}}
          onViewReceipt={vi.fn()}
        />
      );

      expect(screen.getByTestId('customer-history-skeleton')).toBeDefined();
    });

    it('fetches customer history and triggers view invoice PDF', async () => {
      const mockHistory: CustomerHistoryResponse = {
        customer: mockCustomerWithOrders,
        transactions: [
          {
            transaction_id: 'tx-999',
            invoice_number: 'INV-00042',
            final_total: 1250,
            received_amount: 1250,
            balance_amount: 0,
            payment_method: 'UPI',
            payment_status: 'PAID',
            items_count: 3,
            created_at: '2026-11-01T12:00:00Z',
          },
        ],
        total_orders: 1,
        total_spent: 1250,
      };

      vi.mocked(customerApi.getCustomerHistory).mockResolvedValue(mockHistory);
      const onReceiptMock = vi.fn();

      await act(async () => {
        render(
          <CustomerHistoryModal
            visible={true}
            customer={mockCustomerWithOrders}
            onClose={() => {}}
            onViewReceipt={onReceiptMock}
          />
        );
      });

      expect(await screen.findByText('INV-00042')).toBeDefined();
      expect(screen.getAllByText('₹ 1250.00')[0]).toBeDefined();
      expect(screen.getByText('3 items')).toBeDefined();

      const viewBtn = screen.getByLabelText(/View bill for invoice INV-00042/i);
      fireEvent.click(viewBtn);
      expect(onReceiptMock).toHaveBeenCalledWith('tx-999');
    });

    it('shows customer bills without 2 store 3 store banners', async () => {
      const mockHistoryMultiStore: CustomerHistoryResponse = {
        customer: { ...mockCustomerWithOrders, is_multi_store: true, store_ids: ['store-1', 'store-2'] },
        transactions: [],
        total_orders: 2,
        total_spent: 500,
        all_stores_orders: 5,
        all_stores_spent: 1800,
      };

      vi.mocked(customerApi.getCustomerHistory).mockResolvedValue(mockHistoryMultiStore);

      await act(async () => {
        render(
          <CustomerHistoryModal
            visible={true}
            customer={mockCustomerWithOrders}
            onClose={() => {}}
            onViewReceipt={() => {}}
          />
        );
      });

      // Does not show multi-store / all stores banner
      expect(screen.queryByText(/All Stores/i)).toBeNull();
      expect(screen.queryByText(/2 Stores/i)).toBeNull();
      // Shows total spend and total bills
      expect(screen.getByText('Total Spend')).toBeDefined();
      expect(screen.getByText('Total Bills')).toBeDefined();
      expect(screen.getByText('₹ 500.00')).toBeDefined();
    });
  });

  describe('POSActiveCustomerBanner', () => {
    it('displays active customer info, switch and history buttons', () => {
      const onChangeMock = vi.fn();
      const onHistoryMock = vi.fn();

      render(
        <POSActiveCustomerBanner
          customer={mockCustomerWithOrders}
          onChangeCustomer={onChangeMock}
          onViewHistory={onHistoryMock}
        />
      );

      expect(screen.getByText('Billing For:')).toBeDefined();
      expect(screen.getByText('Sourav Ganguly')).toBeDefined();
      expect(screen.getByText(/9830012345/)).toBeDefined();

      fireEvent.click(screen.getByText('Change'));
      expect(onChangeMock).toHaveBeenCalled();

      const histBtn = screen.getByLabelText(/View customer purchase history/i);
      fireEvent.click(histBtn);
      expect(onHistoryMock).toHaveBeenCalled();
    });
  });

  describe('POSCustomerSelectView', () => {
    it('displays CustomerListSkeleton while customers phone book is loading', () => {
      vi.mocked(customerApi.listCustomers).mockReturnValue(new Promise(() => {}));

      render(
        <AuthProvider>
          <POSCustomerSelectView
            onSelectCustomer={() => {}}
            onViewCustomerHistory={() => {}}
          />
        </AuthProvider>
      );

      expect(screen.getByTestId('customer-list-skeleton')).toBeDefined();
    });

    it('always renders walk-in customer at the top with optional mobile number', async () => {
      vi.mocked(customerApi.listCustomers).mockResolvedValue([mockCustomerWithOrders, mockNewCustomer]);
      const onSelectMock = vi.fn();

      render(
        <AuthProvider>
          <POSCustomerSelectView
            onSelectCustomer={onSelectMock}
            onViewCustomerHistory={() => {}}
          />
        </AuthProvider>
      );

      expect(await screen.findByText('Billing Directory')).toBeDefined();
      // Pinned Walk-in Customer at top
      expect(await screen.findByText('Walk-in Customer')).toBeDefined();
      expect(screen.getByText(/Mobile number optional • Unknown customers/i)).toBeDefined();

      expect(await screen.findByText('Sourav Ganguly')).toBeDefined();
      expect(screen.getByText('Sunita Das')).toBeDefined();

      // Verify + Customer or Add New button is removed from billing section
      expect(screen.queryByText('+ Customer')).toBeNull();
      expect(screen.queryByText('Add New')).toBeNull();

      // Click Walk-in Customer card
      const walkInCard = screen.getByLabelText(/Select walk-in customer for billing/i);
      fireEvent.click(walkInCard);

      expect(onSelectMock).toHaveBeenCalledWith(
        expect.objectContaining({
          customer_id: 'guest',
          name: 'Walk-in Customer',
          phone: null,
        })
      );
    });
  });

  describe('POSCheckoutModal for Walk-in Customer', () => {
    it('allows generating bill for walk-in customer with empty mobile number', () => {
      const onConfirmMock = vi.fn();

      render(
        <POSCheckoutModal
          visible={true}
          finalTotal={250}
          paymentMethod="CASH"
          receivedAmount="250"
          customerName="Walk-in Customer"
          customerPhone="" // Empty mobile number for unknown customer
          isProcessingCheckout={false}
          onClose={() => {}}
          onSelectPaymentMethod={() => {}}
          onChangeReceivedAmount={() => {}}
          onChangeCustomerName={() => {}}
          onChangeCustomerPhone={() => {}}
          onConfirmCheckout={onConfirmMock}
        />
      );

      expect(screen.getByText(/Mobile optional/i)).toBeDefined();
      expect(screen.getByText(/Mobile number is optional for unknown walk-in customers/i)).toBeDefined();

      // Customer name input is hidden, but mobile number input is shown for walk-in customer
      expect(screen.queryByPlaceholderText('Customer Name *')).toBeNull();
      expect(screen.getByPlaceholderText('Contact Mobile Number (Optional)')).toBeDefined();

      // Button is enabled and generates bill
      const generateBtn = screen.getByText('Generate Bill & Receipt');
      expect(generateBtn).toBeDefined();
      fireEvent.click(generateBtn);
      expect(onConfirmMock).toHaveBeenCalledTimes(1);
    });

    it('does not show name and mobile number inputs for registered customers', () => {
      render(
        <POSCheckoutModal
          visible={true}
          finalTotal={500}
          paymentMethod="UPI"
          receivedAmount="500"
          customerName="Sourav Ganguly"
          customerPhone="9830012345"
          isProcessingCheckout={false}
          onClose={() => {}}
          onSelectPaymentMethod={() => {}}
          onChangeReceivedAmount={() => {}}
          onChangeCustomerName={() => {}}
          onChangeCustomerPhone={() => {}}
          onConfirmCheckout={() => {}}
        />
      );

      // Customer details preview is visible
      expect(screen.getByText('Sourav Ganguly')).toBeDefined();
      expect(screen.getByText(/9830012345/)).toBeDefined();

      // Redundant inputs should NOT be shown
      expect(screen.queryByPlaceholderText('Customer Name *')).toBeNull();
      expect(screen.queryByPlaceholderText('Contact Mobile Number (Optional)')).toBeNull();
    });

    it('shows excess amount handling options when received is greater than total', () => {
      const onToggleExcessMock = vi.fn();

      render(
        <POSCheckoutModal
          visible={true}
          finalTotal={200}
          paymentMethod="CASH"
          receivedAmount="250"
          customerName="Sourav Ganguly"
          customerPhone="9830012345"
          isProcessingCheckout={false}
          saveExcessAsAdvance={false}
          onToggleSaveExcessAsAdvance={onToggleExcessMock}
          onClose={() => {}}
          onSelectPaymentMethod={() => {}}
          onChangeReceivedAmount={() => {}}
          onChangeCustomerName={() => {}}
          onChangeCustomerPhone={() => {}}
          onConfirmCheckout={() => {}}
        />
      );

      // Excess banner and options
      expect(screen.getByText(/Excess Amount:/i)).toBeDefined();
      expect(screen.getByText(/Return Change \(₹50\.00\)/i)).toBeDefined();
      expect(screen.getByText(/Save as Advance Credit \(\+₹50\.00\)/i)).toBeDefined();

      // Click to toggle save excess as advance
      const advanceOption = screen.getByText(/Save as Advance Credit/i);
      fireEvent.click(advanceOption);
      expect(onToggleExcessMock).toHaveBeenCalledWith(true);
    });

    it('displays advance credit notice and allows applying advance credit', () => {
      const onToggleAdvMock = vi.fn();

      render(
        <POSCheckoutModal
          visible={true}
          finalTotal={300}
          paymentMethod="CASH"
          receivedAmount="200"
          customerName="Sourav Ganguly"
          customerPhone="9830012345"
          existingAdvance={100}
          useAdvanceBalance={false}
          onToggleUseAdvanceBalance={onToggleAdvMock}
          isProcessingCheckout={false}
          onClose={() => {}}
          onSelectPaymentMethod={() => {}}
          onChangeReceivedAmount={() => {}}
          onChangeCustomerName={() => {}}
          onChangeCustomerPhone={() => {}}
          onConfirmCheckout={() => {}}
        />
      );

      expect(screen.getByText('Customer Advance Available')).toBeDefined();
      expect(screen.getByText(/₹100\.00 store credit/i)).toBeDefined();

      const useCreditBtn = screen.getByText('Use Credit');
      fireEvent.click(useCreditBtn);
      expect(onToggleAdvMock).toHaveBeenCalledWith(true);
    });

    it('enforces full payment for walk-in customer: hides CREDIT, blocks checkout on shortfall, and displays change on excess', () => {
      const onSelectMethodMock = vi.fn();
      const onConfirmMock = vi.fn();

      const { rerender } = render(
        <POSCheckoutModal
          visible={true}
          finalTotal={200}
          paymentMethod="CREDIT"
          receivedAmount="150"
          customerName="Walk-in Customer"
          customerPhone=""
          isWalkIn={true}
          isProcessingCheckout={false}
          onClose={() => {}}
          onSelectPaymentMethod={onSelectMethodMock}
          onChangeReceivedAmount={() => {}}
          onChangeCustomerName={() => {}}
          onChangeCustomerPhone={() => {}}
          onConfirmCheckout={onConfirmMock}
        />
      );

      // CREDIT should not be rendered in payment methods for walk-ins
      expect(screen.queryByText('CREDIT')).toBeNull();
      // Should have auto-switched to CASH
      expect(onSelectMethodMock).toHaveBeenCalledWith('CASH');

      // Shortfall warning is displayed
      expect(screen.getByText(/Walk-in customers must pay in full/i)).toBeDefined();
      expect(screen.getByText(/Shortfall \(Unpaid\):/i)).toBeDefined();

      // Button title shows shortfall
      const btn = screen.getByText(/Pay in Full \(Shortfall ₹50\.00\)/i);
      expect(btn).toBeDefined();

      // Now rerender with full payment
      rerender(
        <POSCheckoutModal
          visible={true}
          finalTotal={200}
          paymentMethod="CASH"
          receivedAmount="200"
          customerName="Walk-in Customer"
          customerPhone=""
          isWalkIn={true}
          isProcessingCheckout={false}
          onClose={() => {}}
          onSelectPaymentMethod={onSelectMethodMock}
          onChangeReceivedAmount={() => {}}
          onChangeCustomerName={() => {}}
          onChangeCustomerPhone={() => {}}
          onConfirmCheckout={onConfirmMock}
        />
      );

      expect(screen.getByText('Generate Bill & Receipt')).toBeDefined();
      expect(screen.queryByText(/Walk-in customers must pay in full/i)).toBeNull();

      // Now rerender with excess payment
      rerender(
        <POSCheckoutModal
          visible={true}
          finalTotal={200}
          paymentMethod="CASH"
          receivedAmount="250"
          customerName="Walk-in Customer"
          customerPhone=""
          isWalkIn={true}
          isProcessingCheckout={false}
          onClose={() => {}}
          onSelectPaymentMethod={onSelectMethodMock}
          onChangeReceivedAmount={() => {}}
          onChangeCustomerName={() => {}}
          onChangeCustomerPhone={() => {}}
          onConfirmCheckout={onConfirmMock}
        />
      );

      // Walk-in should see Change to Return, NOT Save as Advance Credit
      expect(screen.getByText(/Change to Return:/i)).toBeDefined();
      expect(screen.queryByText(/Save as Advance Credit/i)).toBeNull();
    });
  });

  describe('Customer Dues & SettleDueModal Flow', () => {
    it('renders Due badge on POSCustomerCard and triggers onSettleDue', () => {
      const onSelectMock = vi.fn();
      const onViewHistoryMock = vi.fn();
      const onSettleDueMock = vi.fn();

      const customerWithDue: Customer = {
        ...mockCustomerWithOrders,
        total_due: 450,
      };

      render(
        <POSCustomerCard
          customer={customerWithDue}
          onSelect={onSelectMock}
          onViewHistory={onViewHistoryMock}
          onSettleDue={onSettleDueMock}
        />
      );

      expect(screen.getByText('₹450 Due')).toBeDefined();

      const settleBtn = screen.getByText('Settle');
      expect(settleBtn).toBeDefined();
      fireEvent.click(settleBtn);
      expect(onSettleDueMock).toHaveBeenCalledWith(customerWithDue);
    });

    it('renders Advance badge on POSCustomerCard when customer has advance balance', () => {
      const customerWithAdvance: Customer = {
        ...mockCustomerWithOrders,
        total_due: 0,
        advance_balance: 150,
      };

      render(
        <POSCustomerCard
          customer={customerWithAdvance}
          onSelect={() => {}}
          onViewHistory={() => {}}
        />
      );

      expect(screen.getByText('₹150 Adv')).toBeDefined();
    });

    it('SettleDueModal allows settling customer due with quick amount and recording payment', async () => {
      const onCloseMock = vi.fn();
      const onSuccessMock = vi.fn();

      const customerWithDue: Customer = {
        ...mockCustomerWithOrders,
        total_due: 350,
      };

      vi.mocked(customerApi.recordPayment).mockResolvedValue({
        payment_id: 'pay-1',
        store_id: 'store-1',
        customer_id: 'cust-101',
        payment_number: 'PAY-0001',
        amount: 350,
        payment_method: 'UPI',
        notes: 'GPay ref',
        created_at: '2026-11-05T00:00:00Z',
      });

      render(
        <SettleDueModal
          visible={true}
          customer={customerWithDue}
          onClose={onCloseMock}
          onPaymentSuccess={onSuccessMock}
        />
      );

      expect(screen.getByText('Settle Due')).toBeDefined();
      expect(screen.getByText('Outstanding Due Balance')).toBeDefined();
      expect(screen.getAllByText('₹ 350.00').length).toBeGreaterThan(0);
      expect(screen.getByText(/Full Due/i)).toBeDefined();

      const recordBtn = screen.getByText('Record Payment & Settle');
      await act(async () => {
        fireEvent.click(recordBtn);
      });

      expect(customerApi.recordPayment).toHaveBeenCalledWith(
        'cust-101',
        expect.objectContaining({
          amount: 350,
          payment_method: 'UPI',
        })
      );
      expect(onSuccessMock).toHaveBeenCalledTimes(1);
      expect(onCloseMock).toHaveBeenCalledTimes(1);
    });
  });
});
