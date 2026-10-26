import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, screen, act } from '@testing-library/react';
import { Alert } from 'react-native';
import { CreateStoreModal } from '@/components/stores/CreateStoreModal';
import { EditStoreModal } from '@/components/stores/EditStoreModal';
import { SignatureUploadModal } from '@/components/stores/SignatureUploadModal';
import { StoreUsersModal } from '@/components/stores/StoreUsersModal';
import { CreateProductModal } from '@/components/inventory/CreateProductModal';
import { ReceiveStockModal } from '@/components/inventory/ReceiveStockModal';
import { StoreManagementScreen } from '@/screens/StoreManagementScreen';
import { AuthProvider } from '@/context/AuthContext';
import { Store, Product } from '@/types/api';
import { storeApi } from '@/services/api';

const { mockStore, mockProduct } = vi.hoisted(() => {
  const store: Store = {
    store_id: 's-1',
    name: 'Metro Save Shop',
    owner_name: 'John Doe',
    address: 'Park Street, Kolkata',
    phone_number: '9876543210',
    email: 'metro@saveshop.com',
    state: '19-West Bengal',
    has_signature: true,
    is_active: true,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
  };

  const product: Product = {
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

  return { mockStore: store, mockProduct: product };
});

vi.mock('@/services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/api')>();
  return {
    ...actual,
    storeApi: {
      ...actual.storeApi,
      getIndianStates: vi.fn().mockResolvedValue([
        { code: '19', name: 'West Bengal', display_name: '19-West Bengal', state_type: 'STATE' },
        { code: '07', name: 'Delhi', display_name: '07-Delhi', state_type: 'UT' },
      ]),
      createStore: vi.fn().mockResolvedValue(mockStore),
      updateStore: vi.fn().mockResolvedValue(mockStore),
      uploadSignature: vi.fn().mockResolvedValue({ success: true }),
      getStoreOperators: vi.fn().mockResolvedValue({
        store_id: 's-1',
        store_name: 'Metro Save Shop',
        operators: [
          {
            user_id: 'u-1',
            email: 'alice@saveshop.com',
            name: 'Alice Cashier',
            role: 'user',
            created_at: '2026-01-01',
          },
        ],
        invitations: [
          {
            invitation_id: 'inv-1',
            store_id: 's-1',
            email: 'pending@saveshop.com',
            role: 'user',
            status: 'pending',
            created_at: '2026-01-01',
          },
        ],
      }),
      addStoreOperator: vi.fn().mockResolvedValue({
        status: 'invited',
        message: 'Invitation recorded successfully.',
      }),
      removeStoreOperator: vi.fn().mockResolvedValue({ success: true, message: 'Removed' }),
      revokeStoreInvitation: vi.fn().mockResolvedValue({ success: true, message: 'Revoked' }),
    },
    authApi: {
      ...actual.authApi,
      getMe: vi.fn().mockResolvedValue({
        user_id: 'u-1',
        email: 'admin@saveshop.com',
        role: 'ADMIN',
      }),
      getAccessibleStores: vi.fn().mockResolvedValue([mockStore]),
      switchStore: vi.fn().mockResolvedValue({
        user_id: 'u-1',
        email: 'admin@saveshop.com',
        current_store_id: 's-1',
      }),
    },
  };
});

describe('components/stores/CreateStoreModal.tsx', () => {
  it('fills inputs and submits new store payload', async () => {
    const onSubmitMock = vi.fn().mockResolvedValue(undefined);
    const onSelectStateMock = vi.fn();
    const onCloseMock = vi.fn();

    render(
      <CreateStoreModal
        visible={true}
        selectedState="19-West Bengal"
        isCreating={false}
        onClose={onCloseMock}
        onRequestSelectState={onSelectStateMock}
        onSubmit={onSubmitMock}
      />
    );

    expect(screen.getByText('Create New Store')).toBeDefined();

    // Fill store name
    const nameInput = screen.getByPlaceholderText('e.g. Save Shop Downtown Central');
    const submitBtn = screen.getByText('Create & Register Store');
    await act(async () => {
      fireEvent.change(nameInput, { target: { value: 'Save Shop - Salt Lake' } });
      fireEvent.click(submitBtn);
    });

    expect(onSubmitMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Save Shop - Salt Lake',
        state: '19-West Bengal',
      })
    );
  });

  it('validates required name field before submission', () => {
    const alertSpy = vi.spyOn(Alert, 'alert').mockImplementation(() => {});
    const onSubmitMock = vi.fn();

    render(
      <CreateStoreModal
        visible={true}
        selectedState="19-West Bengal"
        isCreating={false}
        onClose={() => {}}
        onRequestSelectState={() => {}}
        onSubmit={onSubmitMock}
      />
    );

    const submitBtn = screen.getByText('Create & Register Store');
    act(() => {
      fireEvent.click(submitBtn);
    });

    expect(alertSpy).toHaveBeenCalledWith('Required Field', 'Please provide a store name.');
    expect(onSubmitMock).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it('supports picking logo and signature and state picker trigger', async () => {
    const onSelectStateMock = vi.fn();
    render(
      <CreateStoreModal
        visible={true}
        selectedState="19-West Bengal"
        isCreating={false}
        onClose={() => {}}
        onRequestSelectState={onSelectStateMock}
        onSubmit={vi.fn()}
      />
    );

    // Pick gallery logo
    const galleryBtns = screen.getAllByText('Gallery');
    await act(async () => {
      fireEvent.click(galleryBtns[0]);
    });

    // Pick camera logo
    const takePhotoBtn = screen.getByText('Take Photo');
    await act(async () => {
      fireEvent.click(takePhotoBtn);
    });

    // Pick camera signature
    const cameraBtn = screen.getByText('Camera');
    await act(async () => {
      fireEvent.click(cameraBtn);
    });

    // State button
    const statePill = screen.getByText('19-West Bengal');
    act(() => {
      fireEvent.click(statePill);
    });
    expect(onSelectStateMock).toHaveBeenCalled();
  });
});

describe('components/stores/EditStoreModal.tsx', () => {
  it('pre-populates store data and submits updates', async () => {
    const onSubmitMock = vi.fn().mockResolvedValue(undefined);

    render(
      <EditStoreModal
        visible={true}
        store={mockStore}
        selectedState="19-West Bengal"
        isUpdating={false}
        onClose={() => {}}
        onRequestSelectState={() => {}}
        onSubmit={onSubmitMock}
      />
    );

    expect(screen.getByText('Edit Store Profile')).toBeDefined();

    const phoneInput = screen.getByPlaceholderText('+91 98765 43210');
    const saveBtn = screen.getByText('Update Store Details');
    await act(async () => {
      fireEvent.change(phoneInput, { target: { value: '9998887776' } });
      fireEvent.click(saveBtn);
    });

    expect(onSubmitMock).toHaveBeenCalledWith(
      's-1',
      expect.objectContaining({
        phone_number: '9998887776',
      })
    );
  });

  it('validates required name in EditStoreModal and supports picking', async () => {
    const alertSpy = vi.spyOn(Alert, 'alert').mockImplementation(() => {});
    const onSelectStateMock = vi.fn();

    render(
      <EditStoreModal
        visible={true}
        store={mockStore}
        selectedState="19-West Bengal"
        isUpdating={false}
        onClose={() => {}}
        onRequestSelectState={onSelectStateMock}
        onSubmit={vi.fn()}
      />
    );

    const nameInput = screen.getByDisplayValue('Metro Save Shop');
    const saveBtn = screen.getByText('Update Store Details');
    await act(async () => {
      fireEvent.change(nameInput, { target: { value: '' } });
      fireEvent.click(saveBtn);
    });

    expect(alertSpy).toHaveBeenCalledWith('Required Field', 'Store name cannot be empty.');

    // Gallery and camera
    const galleryBtns = screen.getAllByText('Gallery');
    await act(async () => {
      fireEvent.click(galleryBtns[0]);
    });

    const cameraBtns = screen.getAllByText('Camera');
    await act(async () => {
      fireEvent.click(cameraBtns[1]);
    });

    alertSpy.mockRestore();
  });
});

describe('components/stores/SignatureUploadModal.tsx', () => {
  it('triggers signature library picker and saves', async () => {
    const onUploadMock = vi.fn().mockResolvedValue(undefined);

    render(
      <SignatureUploadModal
        visible={true}
        store={mockStore}
        isUploading={false}
        onClose={() => {}}
        onUpload={onUploadMock}
      />
    );

    expect(screen.getByText('Authorized Signature')).toBeDefined();
    expect(screen.getByText('Gallery')).toBeDefined();

    // Click Gallery to pick signature
    await act(async () => {
      fireEvent.click(screen.getByText('Gallery'));
    });

    // Wait for button to enable once image is picked
    const saveBtn = await screen.findByText('Save Signature');
    await act(async () => {
      fireEvent.click(saveBtn);
    });
    expect(onUploadMock).toHaveBeenCalledWith('s-1', expect.any(String));
  });

  it('supports camera signature photo and clear action', async () => {
    render(
      <SignatureUploadModal
        visible={true}
        store={mockStore}
        isUploading={false}
        onClose={() => {}}
        onUpload={vi.fn()}
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByText('Camera'));
    });
    const clearBtn = await screen.findByText('Remove Image');
    await act(async () => {
      fireEvent.click(clearBtn);
    });
  });
});

describe('components/inventory/CreateProductModal.tsx', () => {
  it('fills product form and submits', async () => {
    const onSubmitMock = vi.fn().mockResolvedValue(undefined);

    render(
      <CreateProductModal
        visible={true}
        existingCategoryStats={[{ name: 'Poultry', count: 5 }]}
        isSubmitting={false}
        onClose={() => {}}
        onSubmit={onSubmitMock}
      />
    );

    expect(screen.getByText('Register New Product')).toBeDefined();

    const nameInput = screen.getByPlaceholderText('e.g. Organic Almond Milk');
    const priceInputs = screen.getAllByPlaceholderText('0.00');
    const saveBtn = screen.getByText('Save Product to Catalog');

    await act(async () => {
      fireEvent.change(nameInput, { target: { value: 'Organic Brown Eggs' } });
      fireEvent.change(priceInputs[0], { target: { value: '110' } });
      fireEvent.click(saveBtn);
    });

    expect(onSubmitMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Organic Brown Eggs',
        selling_price: 110,
        category: 'Poultry',
      })
    );
  });

  it('validates empty name and zero price before submit', () => {
    const alertSpy = vi.spyOn(Alert, 'alert').mockImplementation(() => {});

    render(
      <CreateProductModal
        visible={true}
        existingCategoryStats={[{ name: 'Poultry', count: 5 }]}
        isSubmitting={false}
        onClose={() => {}}
        onSubmit={vi.fn()}
      />
    );

    const saveBtn = screen.getByText('Save Product to Catalog');
    act(() => {
      fireEvent.click(saveBtn);
    });
    expect(alertSpy).toHaveBeenCalledWith('Required Fields', 'Please specify product name and selling price.');

    alertSpy.mockRestore();
  });
});

describe('components/inventory/ReceiveStockModal.tsx', () => {
  it('submits single inward delivery batch', async () => {
    const onSingleMock = vi.fn().mockResolvedValue(undefined);
    const onBulkMock = vi.fn().mockResolvedValue(undefined);

    render(
      <ReceiveStockModal
        visible={true}
        products={[mockProduct]}
        storeName="Metro Save Shop"
        storeId="s-1"
        isSubmittingSingle={false}
        isSubmittingBulk={false}
        onClose={() => {}}
        onSubmitSingle={onSingleMock}
        onSubmitBulk={onBulkMock}
      />
    );

    expect(screen.getByText('Receive Stock')).toBeDefined();

    const qtyInput = screen.getByPlaceholderText('e.g. 50');
    const confirmBtn = screen.getByText('Confirm Single Stock Inward');
    await act(async () => {
      fireEvent.change(qtyInput, { target: { value: '30' } });
      fireEvent.click(confirmBtn);
    });

    expect(onSingleMock).toHaveBeenCalledWith(
      expect.objectContaining({
        store_id: 's-1',
        product_id: 'p-1',
        quantity: 30,
      })
    );
  });

  it('switches to bulk mode, adds consignment item, and submits bulk shipment', async () => {
    const onSingleMock = vi.fn().mockResolvedValue(undefined);
    const onBulkMock = vi.fn().mockResolvedValue(undefined);

    render(
      <ReceiveStockModal
        visible={true}
        products={[mockProduct]}
        storeName="Metro Save Shop"
        storeId="s-1"
        isSubmittingSingle={false}
        isSubmittingBulk={false}
        onClose={() => {}}
        onSubmitSingle={onSingleMock}
        onSubmitBulk={onBulkMock}
      />
    );

    // Switch to Bulk Delivery tab
    await act(async () => {
      fireEvent.click(screen.getByText(/Bulk Delivery/i));
    });

    // Click + Add First Product
    await act(async () => {
      fireEvent.click(screen.getByText('+ Add First Product'));
    });

    // Fill consignment quantity
    const qtyInput = screen.getByPlaceholderText('e.g. 50');
    await act(async () => {
      fireEvent.change(qtyInput, { target: { value: '40' } });
      fireEvent.click(screen.getByText('+ Add to Delivery Manifest'));
    });

    // Submit bulk
    const bulkSubmitBtn = await screen.findByText(/Receive All/i);
    await act(async () => {
      fireEvent.click(bulkSubmitBtn);
    });

    expect(onBulkMock).toHaveBeenCalledWith(
      expect.objectContaining({
        store_id: 's-1',
        batches: expect.arrayContaining([
          expect.objectContaining({
            product_id: 'p-1',
            quantity: 40,
          }),
        ]),
      })
    );
  });
});

describe('screens/StoreManagementScreen.tsx', () => {
  it('renders store directory and displays store item', async () => {
    await act(async () => {
      render(
        <AuthProvider>
          <StoreManagementScreen />
        </AuthProvider>
      );
    });

    expect(await screen.findByText('Store Directory')).toBeDefined();
  });
});

describe('components/stores/StoreUsersModal.tsx', () => {
  it('renders store operators and pending invitations, and submits new invite by email', async () => {
    const alertSpy = vi.spyOn(Alert, 'alert');
    const onCloseMock = vi.fn();
    const onUpdatedMock = vi.fn();

    await act(async () => {
      render(
        <StoreUsersModal
          visible={true}
          store={mockStore}
          onClose={onCloseMock}
          onUpdated={onUpdatedMock}
        />
      );
    });

    // Verify existing operator and pending invite rendered
    expect(await screen.findByText('alice@saveshop.com')).toBeDefined();
    expect(screen.getByText('pending@saveshop.com')).toBeDefined();
    expect(screen.getByText('Awaiting Login')).toBeDefined();

    // Fill new email and click Add
    const emailInput = screen.getByPlaceholderText('cashier@example.com');
    await act(async () => {
      fireEvent.change(emailInput, { target: { value: 'bob@saveshop.com' } });
    });

    const addBtn = screen.getByText('Add');
    await act(async () => {
      fireEvent.click(addBtn);
    });

    expect(alertSpy).toHaveBeenCalledWith(
      'Invitation Saved',
      'Invitation recorded successfully.'
    );
  });

  it('rejects invalid or empty email address with alert', async () => {
    const alertSpy = vi.spyOn(Alert, 'alert');

    await act(async () => {
      render(
        <StoreUsersModal
          visible={true}
          store={mockStore}
          onClose={() => {}}
        />
      );
    });

    const emailInput = screen.getByPlaceholderText('cashier@example.com');
    await act(async () => {
      fireEvent.change(emailInput, { target: { value: 'invalid-email-format' } });
    });

    const addBtn = screen.getByText('Add');
    await act(async () => {
      fireEvent.click(addBtn);
    });

    expect(alertSpy).toHaveBeenCalledWith(
      'Invalid Email',
      'Please enter a valid email address format.'
    );
  });

  it('renders store operators and distinguishes current user from other staff', async () => {
    vi.mocked(storeApi.getStoreOperators).mockResolvedValueOnce({
      store_id: 's-1',
      store_name: 'Metro Save Shop',
      operators: [
        {
          user_id: 'u-1',
          email: 'admin@saveshop.com',
          name: 'Owner Admin',
          role: 'admin',
          created_at: '2026-01-01',
        },
        {
          user_id: 'other-user',
          email: 'other@saveshop.com',
          name: 'Other Staff',
          role: 'admin',
          created_at: '2026-01-01',
        },
      ],
      invitations: [],
    });

    await act(async () => {
      render(
        <StoreUsersModal
          visible={true}
          store={{ ...mockStore, owner_name: 'Owner Admin', email: 'admin@saveshop.com' }}
          onClose={() => {}}
        />
      );
    });

    expect(await screen.findByText('Owner Admin')).toBeDefined();
    expect(screen.getByText('Other Staff')).toBeDefined();
    expect(screen.getByText('Owner')).toBeDefined();
  });
});

