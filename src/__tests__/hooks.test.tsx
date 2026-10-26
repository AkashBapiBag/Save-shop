import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { Alert } from 'react-native';
import { useCart } from '@/hooks/pos/useCart';
import { useInventoryCatalog } from '@/hooks/inventory/useInventoryCatalog';
import { useProductForm } from '@/hooks/inventory/useProductForm';
import { useTheme } from '@/hooks/use-theme';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { inventoryApi, authApi } from '@/services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Product, User, Store } from '@/types/api';

vi.mock('@/services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/api')>();
  return {
    ...actual,
    inventoryApi: {
      ...actual.inventoryApi,
      listProducts: vi.fn(),
      createProduct: vi.fn(),
    },
    authApi: {
      ...actual.authApi,
      login: vi.fn(),
      getMe: vi.fn(),
      getAccessibleStores: vi.fn(),
      switchStore: vi.fn(),
    },
  };
});

describe('hooks/pos/useCart.ts', () => {
  const sampleProduct: Product = {
    product_id: 'prod-1',
    store_id: 'store-1',
    name: 'Sample Apple',
    category: 'Fruits',
    default_unit: 'KG',
    selling_price: 50,
    cost_price: 30,
    min_stock_alert_threshold: 5,
    is_active: true,
    total_current_stock: 5,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('initializes with empty cart and default calculations', () => {
    const { result } = renderHook(() => useCart());
    expect(result.current.cart).toEqual([]);
    expect(result.current.totalCartCount).toBe(0);
    expect(result.current.calculation).toEqual({
      subtotal: 0,
      totalCashback: 0,
      discountAmount: 0,
      discountPct: 0,
      finalTotal: 0,
    });
  });

  it('prevents adding product with 0 stock', () => {
    const alertSpy = vi.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { result } = renderHook(() => useCart());

    const outOfStockProd = { ...sampleProduct, total_current_stock: 0 };
    act(() => {
      result.current.addToCart(outOfStockProd);
    });

    expect(result.current.cart).toHaveLength(0);
    expect(alertSpy).toHaveBeenCalledWith(
      'Out of Stock',
      expect.stringContaining('0 available units')
    );
  });

  it('adds product with valid stock', () => {
    const { result } = renderHook(() => useCart());

    act(() => {
      result.current.addToCart(sampleProduct);
    });

    expect(result.current.cart).toHaveLength(1);
    expect(result.current.cart[0].product.product_id).toBe('prod-1');
    expect(result.current.cart[0].quantity).toBe(1);
    expect(result.current.cart[0].unit_price).toBe(50);
    expect(result.current.totalCartCount).toBe(1);
    expect(result.current.calculation.subtotal).toBe(50);
  });

  it('increments quantity when product already in cart', () => {
    const { result } = renderHook(() => useCart());

    act(() => {
      result.current.addToCart(sampleProduct);
      result.current.addToCart(sampleProduct);
    });

    expect(result.current.cart).toHaveLength(1);
    expect(result.current.cart[0].quantity).toBe(2);
    expect(result.current.calculation.subtotal).toBe(100);
  });

  it('prevents adding beyond available stock', () => {
    const alertSpy = vi.spyOn(Alert, 'alert').mockImplementation(() => {});
    const lowStockProduct = { ...sampleProduct, total_current_stock: 2 };
    const { result } = renderHook(() => useCart());

    act(() => {
      result.current.addToCart(lowStockProduct);
      result.current.addToCart(lowStockProduct);
      result.current.addToCart(lowStockProduct);
    });

    expect(result.current.cart[0].quantity).toBe(2);
    expect(alertSpy).toHaveBeenCalledWith(
      'Stock Limit Reached',
      expect.stringContaining('Available stock for "Sample Apple" is 2 KG.')
    );
  });

  it('updates quantity and prevents exceeding stock', () => {
    const alertSpy = vi.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { result } = renderHook(() => useCart());

    act(() => {
      result.current.addToCart(sampleProduct);
    });

    act(() => {
      result.current.updateQuantity('prod-1', 1);
    });
    expect(result.current.cart[0].quantity).toBe(2);

    // Exceed stock (5 max)
    act(() => {
      result.current.updateQuantity('prod-1', 4);
    });
    expect(alertSpy).toHaveBeenCalledWith('Stock Limit Reached', expect.any(String));
    expect(result.current.cart[0].quantity).toBe(2);

    // Decrement below 1 removes item
    act(() => {
      result.current.updateQuantity('prod-1', -2);
    });
    expect(result.current.cart).toHaveLength(0);
  });

  it('updates item cashback with percentage and amount', () => {
    const { result } = renderHook(() => useCart());

    act(() => {
      result.current.addToCart(sampleProduct); // qty 1, unit_price 50, total = 50
    });

    // 10% cashback on 50 = 5
    act(() => {
      result.current.updateItemCashback('prod-1', 'percentage', '10');
    });
    expect(result.current.cart[0].cashback_type).toBe('percentage');
    expect(result.current.cart[0].cashback_value).toBe(10);
    expect(result.current.cart[0].cashback_amount).toBe(5);
    expect(result.current.calculation.totalCashback).toBe(5);

    // Exceed 100% clamps to 100%
    act(() => {
      result.current.updateItemCashback('prod-1', 'percentage', '150');
    });
    expect(result.current.cart[0].cashback_value).toBe(100);
    expect(result.current.cart[0].cashback_amount).toBe(50);

    // Fixed amount cashback: 15
    act(() => {
      result.current.updateItemCashback('prod-1', 'amount', '15');
    });
    expect(result.current.cart[0].cashback_type).toBe('amount');
    expect(result.current.cart[0].cashback_value).toBe(15);
    expect(result.current.cart[0].cashback_amount).toBe(15);

    // Fixed amount exceeding total line base clamps to lineBase (50)
    act(() => {
      result.current.updateItemCashback('prod-1', 'amount', '100');
    });
    expect(result.current.cart[0].cashback_amount).toBe(50);

    // Negative cashback resets to 0
    act(() => {
      result.current.updateItemCashback('prod-1', 'amount', '-5');
    });
    expect(result.current.cart[0].cashback_amount).toBe(0);
  });

  it('calculates subtotal discounts and final totals', () => {
    const { result } = renderHook(() => useCart());

    act(() => {
      result.current.addToCart(sampleProduct); // 50
      result.current.addToCart(sampleProduct); // 50 (subtotal = 100)
    });

    // Subtotal discount in percentage: 20% of 100 = 20
    act(() => {
      result.current.setSubtotalDiscountType('percentage');
      result.current.setSubtotalDiscountValue('20');
    });
    expect(result.current.calculation.subtotal).toBe(100);
    expect(result.current.calculation.discountAmount).toBe(20);
    expect(result.current.calculation.discountPct).toBe(20);
    expect(result.current.calculation.finalTotal).toBe(80);

    // Subtotal discount in fixed amount: 35
    act(() => {
      result.current.setSubtotalDiscountType('amount');
      result.current.setSubtotalDiscountValue('35');
    });
    expect(result.current.calculation.discountAmount).toBe(35);
    expect(result.current.calculation.discountPct).toBe(35);
    expect(result.current.calculation.finalTotal).toBe(65);

    // Clear cart resets everything
    act(() => {
      result.current.clearCart();
    });
    expect(result.current.cart).toHaveLength(0);
    expect(result.current.subtotalDiscountValue).toBe('0');
  });

  it('supports fixed-amount cashback calculation and delta ignore on unmatched product', () => {
    const { result } = renderHook(() => useCart());

    act(() => {
      result.current.addToCart(sampleProduct);
      result.current.updateItemCashback('prod-1', 'amount', '15');
    });

    expect(result.current.cart[0].cashback_type).toBe('amount');
    expect(result.current.cart[0].cashback_amount).toBe(15);

    // Add again to test lineBase vs cashback_value Math.min branch
    act(() => {
      result.current.addToCart(sampleProduct);
    });
    expect(result.current.cart[0].quantity).toBe(2);
    expect(result.current.cart[0].cashback_amount).toBe(15);

    // Update quantity for non-existent product
    act(() => {
      result.current.updateQuantity('non-existent', 1);
    });
    expect(result.current.cart[0].quantity).toBe(2);
  });
});

describe('hooks/inventory/useInventoryCatalog.ts', () => {
  const mockProducts: Product[] = [
    {
      product_id: 'p1',
      store_id: 's1',
      name: 'Whole Milk',
      category: 'Dairy',
      default_unit: 'LITER',
      selling_price: 60,
      cost_price: 45,
      min_stock_alert_threshold: 5,
      is_active: true,
      total_current_stock: 12,
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    },
    {
      product_id: 'p2',
      store_id: 's1',
      name: 'Cheddar Cheese',
      category: 'Dairy',
      default_unit: 'PACKET',
      selling_price: 120,
      cost_price: 90,
      min_stock_alert_threshold: 2,
      is_active: true,
      total_current_stock: 4,
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    },
    {
      product_id: 'p3',
      store_id: 's1',
      name: 'Brown Bread',
      category: 'Bakery',
      default_unit: 'PACKET',
      selling_price: 40,
      cost_price: 25,
      min_stock_alert_threshold: 10,
      is_active: true,
      total_current_stock: 20,
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    },
  ];

  beforeEach(() => {
    vi.mocked(inventoryApi.listProducts).mockResolvedValue(mockProducts);
  });

  it('loads catalog and computes category stats correctly', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useInventoryCatalog(), { wrapper });

    await act(async () => {
      await result.current.loadCatalog();
    });

    expect(result.current.products).toHaveLength(3);
    // Dairy (2), Bakery (1)
    expect(result.current.existingCategoryStats).toEqual([
      { name: 'Dairy', count: 2 },
      { name: 'Bakery', count: 1 },
    ]);
  });

  it('filters products by name and category search query', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useInventoryCatalog(), { wrapper });

    await act(async () => {
      await result.current.loadCatalog();
    });

    act(() => {
      result.current.setSearch('bread');
    });
    expect(result.current.filteredProducts).toHaveLength(1);
    expect(result.current.filteredProducts[0].name).toBe('Brown Bread');

    act(() => {
      result.current.setSearch('dairy');
    });
    expect(result.current.filteredProducts).toHaveLength(2);
  });

  it('supports loadCatalog with showLoader and handles fetch failure gracefully', async () => {
    vi.mocked(inventoryApi.listProducts).mockRejectedValueOnce(new Error('Network offline'));
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );
    const { result } = renderHook(() => useInventoryCatalog(), { wrapper });

    await act(async () => {
      await result.current.loadCatalog(true);
    });

    expect(result.current.isLoading).toBe(false);
    expect(consoleSpy).toHaveBeenCalledWith('[useInventoryCatalog:loadCatalog]', expect.any(Error));
    consoleSpy.mockRestore();
  });
});

describe('hooks/inventory/useProductForm.ts', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('validates required fields before submitting', async () => {
    const alertSpy = vi.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { result } = renderHook(() =>
      useProductForm({
        existingCategoryStats: [{ name: 'Beverages', count: 5 }],
      })
    );

    await act(async () => {
      await result.current.handleCreateProduct();
    });
    expect(alertSpy).toHaveBeenCalledWith('Required Fields', expect.any(String));

    act(() => {
      result.current.setNewName('Green Tea');
      result.current.setNewSellingPrice('80');
      result.current.setNewCategory('');
    });

    await act(async () => {
      await result.current.handleCreateProduct();
    });
    expect(alertSpy).toHaveBeenCalledWith('Category Required', expect.any(String));
  });

  it('creates product successfully and calls onProductCreated', async () => {
    const alertSpy = vi.spyOn(Alert, 'alert').mockImplementation(() => {});
    const onCreatedMock = vi.fn();
    vi.mocked(inventoryApi.createProduct).mockResolvedValueOnce({
      product_id: 'p-new',
      store_id: 's-1',
      name: 'Green Tea',
      category: 'Beverages',
      default_unit: 'PACKET',
      selling_price: 80,
      cost_price: 50,
      min_stock_alert_threshold: 10,
      is_active: true,
      total_current_stock: 0,
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    });

    const { result } = renderHook(() =>
      useProductForm({
        existingCategoryStats: [{ name: 'Beverages', count: 5 }],
        activeStore: { store_id: 's-1', name: 'Main' },
        onProductCreated: onCreatedMock,
      })
    );

    act(() => {
      result.current.openCreateProductModal();
      result.current.setNewName('Green Tea');
      result.current.setNewCategory('Beverages');
      result.current.setNewSellingPrice('80');
      result.current.setNewCostPrice('50');
      result.current.setNewUnit('PACKET');
    });

    await act(async () => {
      await result.current.handleCreateProduct();
    });

    expect(inventoryApi.createProduct).toHaveBeenCalledWith(
      expect.objectContaining({
        store_id: 's-1',
        name: 'Green Tea',
        category: 'Beverages',
        default_unit: 'PACKET',
        selling_price: 80,
        cost_price: 50,
      })
    );
    expect(alertSpy).toHaveBeenCalledWith('Success', expect.stringContaining('Green Tea'));
    expect(onCreatedMock).toHaveBeenCalled();
    expect(result.current.createProductModalVisible).toBe(false);
  });

  it('handles API rejection during product creation gracefully', async () => {
    const alertSpy = vi.spyOn(Alert, 'alert').mockImplementation(() => {});
    vi.mocked(inventoryApi.createProduct).mockRejectedValueOnce(new Error('Duplicate product name'));

    const { result } = renderHook(() =>
      useProductForm({
        existingCategoryStats: [{ name: 'Beverages', count: 5 }],
        activeStore: { store_id: 's-1', name: 'Main' },
      })
    );

    act(() => {
      result.current.openCreateProductModal();
      result.current.setNewName('Existing Tea');
      result.current.setNewCategory('Beverages');
      result.current.setNewSellingPrice('80');
    });

    await act(async () => {
      await result.current.handleCreateProduct();
    });

    expect(alertSpy).toHaveBeenCalledWith('Registration Error', 'Duplicate product name');
    expect(result.current.isSubmittingProduct).toBe(false);
    alertSpy.mockRestore();
  });
});

describe('hooks/use-theme.ts', () => {
  it('returns valid theme colors object', () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current).toBeDefined();
    expect(result.current.text).toBeDefined();
    expect(result.current.background).toBeDefined();
  });
});

describe('context/AuthContext.tsx', () => {
  it('throws error when used outside AuthProvider', () => {
    expect(() => {
      renderHook(() => useAuth());
    }).toThrow('useAuth must be used within an AuthProvider');
  });

  it('provides login and logout functionality', async () => {
    vi.mocked(authApi.login).mockResolvedValueOnce({
      access_token: 'jwt-token-123',
      token_type: 'bearer',
      user: {
        user_id: 'u-1',
        email: 'test@example.com',
        name: 'Test Cashier',
        role: 'user',
        current_store_id: 's-1',
        accessible_store_ids: ['s-1'],
        created_at: '2026-01-01',
      },
    });
    vi.mocked(authApi.getAccessibleStores).mockResolvedValueOnce([
      {
        store_id: 's-1',
        name: 'Downtown Save Shop',
        address: 'Downtown Kolkata',
        phone_number: '9876543210',
        email: 'downtown@saveshop.com',
        state: '19-West Bengal',
        has_signature: true,
        is_active: true,
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      },
    ]);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login({ email: 'test@example.com' });
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user?.email).toBe('test@example.com');
    expect(result.current.activeStore?.name).toBe('Downtown Save Shop');

    // Test logout
    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.activeStore).toBeNull();
  });

  it('supports switchStore, refreshStores, and refreshUser', async () => {
    const mockUser: User = {
      user_id: 'u-1',
      email: 'admin@saveshop.com',
      name: 'Super Admin',
      role: 'admin',
      current_store_id: 's-1',
      accessible_store_ids: ['s-1', 's-2'],
      created_at: '2026-01-01',
    };
    const mockStore1: Store = {
      store_id: 's-1',
      name: 'Store 1',
      has_signature: false,
      is_active: true,
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    };
    const mockStore2: Store = {
      store_id: 's-2',
      name: 'Store 2',
      has_signature: true,
      is_active: true,
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    };

    vi.mocked(authApi.login).mockResolvedValueOnce({
      access_token: 'token-abc',
      token_type: 'bearer',
      user: mockUser,
    });
    vi.mocked(authApi.getAccessibleStores).mockResolvedValue([mockStore1, mockStore2]);
    vi.mocked(authApi.switchStore).mockResolvedValueOnce({
      ...mockUser,
      current_store_id: 's-2',
    });
    vi.mocked(authApi.getMe).mockResolvedValueOnce({
      ...mockUser,
      name: 'Super Admin',
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login({ email: 'admin@saveshop.com' });
    });

    expect(result.current.activeStore?.store_id).toBe('s-1');

    // Switch store to s-2
    await act(async () => {
      await result.current.switchStore('s-2');
    });
    expect(result.current.activeStore?.store_id).toBe('s-2');

    // Refresh stores
    await act(async () => {
      await result.current.refreshStores();
    });
    expect(result.current.stores).toHaveLength(2);

    // Refresh user
    await act(async () => {
      await result.current.refreshUser();
    });
    expect(result.current.user?.name).toBe('Super Admin');
  });

  it('restores persisted session from AsyncStorage on app launch and handles offline refresh failure', async () => {
    const savedUser: User = {
      user_id: 'u-cached',
      email: 'cached@saveshop.com',
      name: 'Cached User',
      role: 'user',
      current_store_id: 's-cached',
      accessible_store_ids: ['s-cached'],
      created_at: '2026-01-01',
    };
    const savedStore: Store = {
      store_id: 's-cached',
      name: 'Cached Store',
      has_signature: true,
      is_active: true,
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    };

    await AsyncStorage.setItem('@saveshop_token', 'cached-jwt-token');
    await AsyncStorage.setItem('@saveshop_user', JSON.stringify(savedUser));
    await AsyncStorage.setItem('@saveshop_active_store', JSON.stringify(savedStore));

    // When background refresh fails, should keep cached session
    vi.mocked(authApi.getMe).mockRejectedValueOnce(new Error('Offline'));

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user?.email).toBe('cached@saveshop.com');
    expect(result.current.activeStore?.name).toBe('Cached Store');
  });

  it('handles error in refreshStores and refreshUser without crashing', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );
    const { result } = renderHook(() => useAuth(), { wrapper });

    vi.mocked(authApi.getAccessibleStores).mockRejectedValueOnce(new Error('Store refresh failed'));
    await act(async () => {
      await result.current.refreshStores();
    });
    expect(consoleSpy).toHaveBeenCalledWith('Error refreshing stores:', expect.any(Error));

    vi.mocked(authApi.getMe).mockRejectedValueOnce(new Error('User refresh failed'));
    await act(async () => {
      await result.current.refreshUser();
    });
    expect(consoleSpy).toHaveBeenCalledWith('Error refreshing user:', expect.any(Error));

    consoleSpy.mockRestore();
  });
});
