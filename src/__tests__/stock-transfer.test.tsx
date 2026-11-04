import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, screen, act } from '@testing-library/react';
import { StockTransferModal } from '@/components/inventory/StockTransferModal';
import { Store, Product, StockTransfer } from '@/types/api';
import { transferApi, inventoryApi } from '@/services/api';

const { mockStores, mockSourceProducts, mockTransfers } = vi.hoisted(() => {
  const stores: Store[] = [
    {
      store_id: 'store-1',
      name: 'Main Warehouse Kolkata',
      owner_name: 'Admin User',
      phone_number: '9876543210',
      email: 'admin@saveshop.com',
      state: '19-West Bengal',
      has_signature: true,
      is_active: true,
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    },
    {
      store_id: 'store-2',
      name: 'Branch Outlet Howrah',
      owner_name: 'Admin User',
      phone_number: '9876543211',
      email: 'branch@saveshop.com',
      state: '19-West Bengal',
      has_signature: false,
      is_active: true,
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    },
  ];

  const sourceProducts: Product[] = [
    {
      product_id: 'p-1',
      store_id: 'store-1',
      name: 'Shop XYZ',
      category: 'Snacks',
      default_unit: 'KG',
      selling_price: 120,
      cost_price: 90,
      min_stock_alert_threshold: 5,
      barcode: 'XYZ-001',
      total_current_stock: 45,
      is_active: true,
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    },
  ];

  const transfers: StockTransfer[] = [
    {
      transfer_id: 'trf-1',
      transfer_number: 'TRF-00001',
      source_store_id: 'store-1',
      source_store_name: 'Main Warehouse Kolkata',
      destination_store_id: 'store-2',
      destination_store_name: 'Branch Outlet Howrah',
      transferred_by_name: 'Admin User',
      status: 'COMPLETED',
      notes: 'Urgent restocking',
      total_items: 1,
      total_quantity: 15,
      created_at: '2026-11-04T10:00:00Z',
      items: [
        {
          item_id: 'item-1',
          transfer_id: 'trf-1',
          product_name: 'Shop XYZ',
          category: 'Snacks',
          unit: 'KG',
          quantity: 15,
          auto_created_product: false,
        },
      ],
    },
  ];

  return { mockStores: stores, mockSourceProducts: sourceProducts, mockTransfers: transfers };
});

const mockAuth = vi.hoisted(() => ({
  stores: mockStores,
  activeStore: mockStores[0],
  isAdmin: true,
  user: {
    user_id: 'user-admin',
    name: 'Admin User',
    email: 'admin@saveshop.com',
    role: 'admin',
  },
}));

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => mockAuth,
}));

vi.mock('@/services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/api')>();
  return {
    ...actual,
    inventoryApi: {
      ...actual.inventoryApi,
      listProducts: vi.fn().mockImplementation(({ store_id }) => {
        if (store_id === 'store-1') return Promise.resolve(mockSourceProducts);
        return Promise.resolve([]);
      }),
    },
    transferApi: {
      transferStock: vi.fn().mockResolvedValue(mockTransfers[0]),
      listTransfers: vi.fn().mockResolvedValue(mockTransfers),
      getTransfer: vi.fn().mockResolvedValue(mockTransfers[0]),
    },
  };
});

describe('StockTransferModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.stores = mockStores;
    mockAuth.activeStore = mockStores[0];
    mockAuth.isAdmin = true;
  });

  it('renders modal header, tabs, and transfer route when visible', async () => {
    await act(async () => {
      render(<StockTransferModal visible={true} onClose={vi.fn()} />);
    });

    expect(screen.getByText('Inter-Store Stock Transfer')).toBeDefined();
    expect(screen.getByText('New Transfer')).toBeDefined();
    expect(screen.getByText('Transfer History & Logs')).toBeDefined();
    expect(screen.getAllByText(/Main Warehouse Kolkata/).length).toBeGreaterThan(0);
    expect(screen.getByText('Branch Outlet Howrah')).toBeDefined();
    expect(screen.getByText('Add Product')).toBeDefined();
  });

  it('switches to history tab and renders transfer records with inward/outward pills', async () => {
    await act(async () => {
      render(<StockTransferModal visible={true} onClose={vi.fn()} />);
    });

    const historyTab = screen.getByText('Transfer History & Logs');
    await act(async () => {
      fireEvent.click(historyTab);
    });

    expect(screen.getByText('All Transfers')).toBeDefined();
    expect(screen.getByText('Outward (Sent)')).toBeDefined();
    expect(screen.getByText('Inward (Received)')).toBeDefined();
    expect(screen.getAllByText('Main Warehouse Kolkata').length).toBeGreaterThan(0);
    expect(screen.getByText(/Sent Out to:/)).toBeDefined();
    expect(screen.getByText('TRF-00001')).toBeDefined();
    expect(screen.getByText('• Shop XYZ')).toBeDefined();
    expect(screen.getByText('15.00 KG')).toBeDefined();

    expect(transferApi.listTransfers).toHaveBeenCalledWith(
      expect.objectContaining({ store_id: 'store-1' })
    );
  });

  it('renders auto-created product badge cleanly with quantity in history tab without overlap', async () => {
    const autoCreatedTransfer: StockTransfer = {
      ...mockTransfers[0],
      transfer_id: 'trf-2',
      transfer_number: 'TRF-00002',
      items: [
        {
          item_id: 'item-2',
          transfer_id: 'trf-2',
          product_name: 'Aashirvaad Shudh Chakki Atta (10 KG)',
          category: 'Grocery',
          unit: 'PACKET',
          quantity: 2,
          auto_created_product: true,
        },
      ],
    };
    vi.mocked(transferApi.listTransfers).mockResolvedValueOnce([autoCreatedTransfer]);

    await act(async () => {
      render(<StockTransferModal visible={true} onClose={vi.fn()} />);
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Transfer History & Logs'));
    });

    expect(screen.getByText('• Aashirvaad Shudh Chakki Atta (10 KG)')).toBeDefined();
    expect(screen.getByText('Auto-Created in Dest')).toBeDefined();
    expect(screen.getByText('2.00 PACKET')).toBeDefined();
  });

  it('displays warning when user has fewer than 2 stores', async () => {
    mockAuth.stores = [mockStores[0]]; // Only 1 store

    await act(async () => {
      render(<StockTransferModal visible={true} onClose={vi.fn()} />);
    });

    expect(screen.getByText('At Least 2 Stores Required')).toBeDefined();
  });

  it('allows filtering history by direction pills', async () => {
    await act(async () => {
      render(<StockTransferModal visible={true} onClose={vi.fn()} />);
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Transfer History & Logs'));
    });

    const outwardPill = screen.getByText('Outward (Sent)');
    await act(async () => {
      fireEvent.click(outwardPill);
    });

    expect(transferApi.listTransfers).toHaveBeenCalledWith(
      expect.objectContaining({ direction: 'outward' })
    );

    const inwardPill = screen.getByText('Inward (Received)');
    await act(async () => {
      fireEvent.click(inwardPill);
    });

    expect(transferApi.listTransfers).toHaveBeenCalledWith(
      expect.objectContaining({ direction: 'inward' })
    );
  });

  it('does not render removed verbose subtitle text', async () => {
    await act(async () => {
      render(<StockTransferModal visible={true} onClose={vi.fn()} />);
    });

    expect(screen.queryByText('Admin stock reallocation & automatic catalog sync')).toBeNull();
  });

  it('renders destination selector, add product trigger, and transfer summary properly', async () => {
    await act(async () => {
      render(<StockTransferModal visible={true} onClose={vi.fn()} />);
    });

    expect(screen.getByText('TRANSFER TO (DESTINATION STORE)')).toBeDefined();
    expect(screen.getByText('Branch Outlet Howrah')).toBeDefined();
    expect(screen.getAllByText(/Main Warehouse Kolkata/).length).toBeGreaterThan(0);
    expect(screen.getByText('Products to Transfer')).toBeDefined();
    expect(screen.getByText('TRANSFER SUMMARY')).toBeDefined();
    expect(screen.getByText('Confirm & Transfer Stock')).toBeDefined();
  });

  it('opens modern SuccessModal with transfer details upon successful transfer', async () => {
    await act(async () => {
      render(<StockTransferModal visible={true} onClose={vi.fn()} />);
    });

    // Click "Add Product"
    const addBtn = screen.getByText('Add Product');
    await act(async () => {
      fireEvent.click(addBtn);
    });

    // Select product "Shop XYZ"
    const productItem = screen.getByText('Shop XYZ');
    await act(async () => {
      fireEvent.click(productItem);
    });

    // Submit transfer
    const confirmBtn = screen.getByText(/Confirm & Transfer/i);
    await act(async () => {
      fireEvent.click(confirmBtn);
    });

    // Modern SuccessModal should appear
    expect(screen.getByText('Stock Transferred!')).toBeDefined();
    expect(screen.getAllByText('TRF-00001').length).toBeGreaterThan(0);
    expect(screen.getByText('View History')).toBeDefined();
    expect(screen.getByText('Done')).toBeDefined();

    // Click "Done"
    const doneBtn = screen.getByText('Done');
    await act(async () => {
      fireEvent.click(doneBtn);
    });

    expect(screen.queryByText('Stock Transferred!')).toBeNull();
  });

  it('renders StockTransferSkeleton while products are loading from source store', () => {
    vi.mocked(inventoryApi.listProducts).mockReturnValue(new Promise(() => {}));

    render(<StockTransferModal visible={true} onClose={vi.fn()} />);

    expect(screen.getByTestId('stock-transfer-skeleton')).toBeDefined();
  });
});
