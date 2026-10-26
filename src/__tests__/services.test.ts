import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  APIError,
  setClientAuth,
  getApiBaseUrl,
  setApiBaseUrl,
  resetApiBaseUrl,
  resolveDefaultHost,
  apiRequest,
  authApi,
  storeApi,
  inventoryApi,
  billingApi,
  dashboardApi,
} from '@/services/api';
import { buildReceiptHTML, printReceipt, shareReceiptPDF } from '@/services/pdfService';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

describe('services/api.ts', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    setClientAuth(null, null, null);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('APIError sets properties properly', () => {
    const err = new APIError('Failed', 'ERR_CUSTOM', 400, { field: 'name' });
    expect(err.name).toBe('APIError');
    expect(err.message).toBe('Failed');
    expect(err.code).toBe('ERR_CUSTOM');
    expect(err.status).toBe(400);
    expect(err.details).toEqual({ field: 'name' });
  });

  it('getApiBaseUrl and setApiBaseUrl persist custom API URL and resetApiBaseUrl clears it', async () => {
    await setApiBaseUrl('http://192.168.1.50:8000/');
    let url = await getApiBaseUrl();
    expect(url).toBe('http://192.168.1.50:8000');

    await resetApiBaseUrl();
    url = await getApiBaseUrl();
    expect(url).toBe(resolveDefaultHost());
  });

  it('resolveDefaultHost strips trailing slashes from environment variable', () => {
    const prevEnv = process.env.EXPO_PUBLIC_API_URL;
    process.env.EXPO_PUBLIC_API_URL = 'https://chamber-golf-guardian-thumbnails.trycloudflare.com/';
    expect(resolveDefaultHost()).toBe('https://chamber-golf-guardian-thumbnails.trycloudflare.com');
    process.env.EXPO_PUBLIC_API_URL = prevEnv;
  });

  it('apiRequest sends Authorization and X-Store-Id headers when set', async () => {
    setClientAuth('mock-jwt-token', 'store-123', 'admin@example.com');

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({ status: 'ok' })),
    });

    const result = await apiRequest<{ status: string }>('/test-endpoint');
    expect(result).toEqual({ status: 'ok' });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/test-endpoint'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer mock-jwt-token',
          'X-Store-Id': 'store-123',
          'X-Dev-User-Email': 'admin@example.com',
        }),
      })
    );
  });

  it('apiRequest throws APIError on response !ok with parsed error message', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      text: () => Promise.resolve(JSON.stringify({ detail: { message: 'Invalid payload' } })),
    });

    await expect(apiRequest('/fail')).rejects.toThrow('Invalid payload');
  });

  it('apiRequest throws APIError when detail is a string', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: () => Promise.resolve(JSON.stringify({ detail: 'Direct string detail' })),
    });

    await expect(apiRequest('/fail-str')).rejects.toThrow('Direct string detail');
  });

  it('apiRequest parses nested error objects and custom error codes', async () => {
    // Nested error object
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: () => Promise.resolve(JSON.stringify({
        error: { message: 'Nested error message', code: 'CUSTOM_ERR_CODE', details: { field: 'store_id' } },
      })),
    });

    await expect(apiRequest('/nested-err')).rejects.toMatchObject({
      message: 'Nested error message',
      code: 'CUSTOM_ERR_CODE',
      status: 400,
    });

    // Nested detail with error_code
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 422,
      text: () => Promise.resolve(JSON.stringify({
        detail: { error_code: 'VALIDATION_CUSTOM', details: ['name required'] },
      })),
    });

    await expect(apiRequest('/detail-err')).rejects.toMatchObject({
      code: 'VALIDATION_CUSTOM',
      status: 422,
    });

    // Empty response data fallback
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 404,
      text: () => Promise.resolve(JSON.stringify({})),
    });

    await expect(apiRequest('/empty-err')).rejects.toThrow('Request failed with status 404');

    // General network failure
    global.fetch = vi.fn().mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await expect(apiRequest('/network-err')).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
    });
  });

  it('apiRequest maps AbortError to TIMEOUT_ERROR', async () => {
    global.fetch = vi.fn().mockRejectedValue({ name: 'AbortError' });

    await expect(apiRequest('/timeout')).rejects.toMatchObject({
      code: 'TIMEOUT_ERROR',
    });
  });

  it('authApi endpoints invoke apiRequest correctly', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({ success: true })),
    });

    await authApi.login({ email: 'test@shop.com' });
    await authApi.getMe();
    await authApi.getAccessibleStores();
    await authApi.switchStore('store-1');
    await authApi.assignStoreAccess('u1', 's1');

    expect(global.fetch).toHaveBeenCalledTimes(5);
  });

  it('storeApi endpoints invoke apiRequest correctly', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({ success: true })),
    });

    await storeApi.getIndianStates();
    await storeApi.listStores();
    await storeApi.getStore('s1');
    await storeApi.createStore({ name: 'New Store' });
    await storeApi.updateStore('s1', { name: 'Updated Store' });
    await storeApi.uploadSignature('s1', 'sig-base64');
    await storeApi.getSignature('s1');

    expect(global.fetch).toHaveBeenCalledTimes(7);
  });

  it('inventoryApi endpoints invoke apiRequest correctly', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(JSON.stringify([])),
    });

    await inventoryApi.listProducts({ category: 'Dairy', search: 'Milk' });
    await inventoryApi.getCategories();
    await inventoryApi.getProduct('prod-1');
    await inventoryApi.createProduct({
      name: 'P1',
      default_unit: 'PIECE',
      selling_price: 50,
    });
    await inventoryApi.updateProduct('prod-1', { name: 'Updated P1' });
    await inventoryApi.receiveSingleBatch({
      product_id: 'p1',
      batch_identifier: 'b1',
      quantity: 10,
      purchase_date: '2026-01-01',
      expiry_date: '2026-05-01',
    });
    await inventoryApi.receiveBulkBatches({
      batches: [{
        product_id: 'p1',
        batch_identifier: 'b1',
        quantity: 10,
        purchase_date: '2026-01-01',
        expiry_date: '2026-05-01',
      }],
    });
    await inventoryApi.listBatches({ productId: 'p1', onlyActive: true });

    expect(global.fetch).toHaveBeenCalledTimes(8);
  });

  it('billingApi endpoints invoke apiRequest correctly', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({})),
    });

    await billingApi.validateStock([{ product_id: 'p1', quantity: 2 }]);
    await billingApi.checkout({
      items: [{ product_id: 'p1', quantity: 2 }],
      payment_method: 'CASH',
    });
    await billingApi.getTransaction('tx-1');
    await billingApi.listTransactions({ search: 'Jane', date_filter: 'today' });
    await billingApi.getReceipt('tx-1');

    expect(global.fetch).toHaveBeenCalledTimes(5);
  });

  it('dashboardApi endpoints invoke apiRequest correctly', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({})),
    });

    await dashboardApi.getOverview();
    await dashboardApi.getStockHealth();
    await dashboardApi.getSalesVelocity(14, 10);
    await dashboardApi.getInventoryStatus();

    expect(global.fetch).toHaveBeenCalledTimes(4);
  });
});

describe('services/pdfService.ts', () => {
  const mockReceipt: any = {
    store: {
      store_id: 's1',
      store_name: 'Test Store',
      owner_name: 'Owner Name',
      phone_number: '9876543210',
      address: 'Main Market Road',
      email: 'store@test.com',
      state: '19-West Bengal',
      has_logo: true,
      logo_base64: 'logoBase64Sample',
      has_signature: true,
      authorized_signature_base64: 'sigBase64Sample',
    },
    invoice_number: 'INV-2026-001',
    invoice_seq: 1,
    transaction_id: 'tx-123',
    date: '2026-10-25T10:30:00Z',
    customer_name: 'John Doe',
    customer_phone: '9999988888',
    items: [
      {
        item_id: 'it-1',
        product_id: 'p-1',
        product_name: 'Fresh Bread',
        category: 'Bakery',
        unit: 'PACKET',
        quantity: 2,
        unit_price: 40,
        item_discount_pct: 10,
        category_discount_pct: 0,
        cashback_amount: 5,
        cashback_pct: 0,
        discount_amount: 8,
        discount_pct: 10,
        line_base_total: 80,
        line_discount_amount: 8,
        line_total: 72,
        allocations: [],
      },
    ],
    subtotal: 80,
    item_discount_amount: 8,
    category_discount_amount: 0,
    total_discount_percentage: 10,
    total_discount_amount: 8,
    total_cashback_amount: 5,
    tax_amount: 0,
    final_total: 72,
    received_amount: 100,
    balance_amount: 28,
    amount_in_words: 'Seventy Two Rupees only',
    you_saved_amount: 8,
    payment_method: 'CASH',
    payment_status: 'PAID',
  };

  it('buildReceiptHTML produces formatted tax invoice html', () => {
    const html = buildReceiptHTML(mockReceipt);
    expect(html).toContain('Test Store');
    expect(html).toContain('1'); // shortInvoiceNo formatted from invoice_seq 1
    expect(html).toContain('John Doe');
    expect(html).toContain('Fresh Bread');
    expect(html).toContain('Seventy Two Rupees only');
    expect(html).toContain('Cash<br/>back');
  });

  it('buildReceiptHTML handles fallback values and credit payment', () => {
    const creditReceipt = {
      ...mockReceipt,
      invoice_number: 'INV999',
      invoice_seq: undefined,
      payment_method: 'CREDIT' as const,
      received_amount: undefined,
      balance_amount: undefined,
      amount_in_words: undefined,
      store: {
        ...mockReceipt.store,
        logo_base64: undefined,
        authorized_signature_base64: undefined,
      },
    };

    const html = buildReceiptHTML(creditReceipt);
    expect(html).toContain('INV999');
    expect(html).toContain('Received');
    expect(html).toContain('0.00');
    expect(html).toContain('Balance');
  });

  it('printReceipt calls Print.printAsync', async () => {
    await printReceipt(mockReceipt);
    expect(Print.printAsync).toHaveBeenCalledWith(
      expect.objectContaining({ html: expect.any(String) })
    );
  });

  it('shareReceiptPDF prints to file and calls Sharing.shareAsync on mobile', async () => {
    const originalOS = Platform.OS;
    Platform.OS = 'android';
    try {
      vi.mocked(Sharing.isAvailableAsync).mockResolvedValueOnce(true);
      await shareReceiptPDF(mockReceipt);
      expect(Print.printToFileAsync).toHaveBeenCalled();
      expect(Sharing.shareAsync).toHaveBeenCalledWith(
        'file://receipt.pdf',
        expect.any(Object)
      );
    } finally {
      Platform.OS = originalOS;
    }
  });

  it('shareReceiptPDF falls back to printAsync if sharing is unavailable on mobile', async () => {
    const originalOS = Platform.OS;
    Platform.OS = 'android';
    try {
      vi.mocked(Sharing.isAvailableAsync).mockResolvedValueOnce(false);
      await shareReceiptPDF(mockReceipt);
      expect(Print.printAsync).toHaveBeenCalled();
    } finally {
      Platform.OS = originalOS;
    }
  });

  it('shareReceiptPDF prints directly on web', async () => {
    const originalOS = Platform.OS;
    Platform.OS = 'web';
    try {
      await shareReceiptPDF(mockReceipt);
      expect(Print.printAsync).toHaveBeenCalled();
    } finally {
      Platform.OS = originalOS;
    }
  });

  it('buildReceiptHTML handles data-prefixed logo and signature', () => {
    const customReceipt = {
      ...mockReceipt,
      store: {
        ...mockReceipt.store,
        logo_base64: 'data:image/png;base64,customLogoData',
        authorized_signature_base64: 'data:image/png;base64,customSigData',
      },
    };

    const html = buildReceiptHTML(customReceipt);
    expect(html).toContain('data:image/png;base64,customLogoData');
    expect(html).toContain('data:image/png;base64,customSigData');
  });

  it('shareReceiptPDF falls back to printAsync if sharing throws exception on mobile', async () => {
    const originalOS = Platform.OS;
    Platform.OS = 'android';
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      vi.mocked(Sharing.isAvailableAsync).mockResolvedValueOnce(true);
      vi.mocked(Sharing.shareAsync).mockRejectedValueOnce(new Error('Sharing intent crashed'));

      await shareReceiptPDF(mockReceipt);
      expect(Print.printAsync).toHaveBeenCalled();
    } finally {
      Platform.OS = originalOS;
      consoleSpy.mockRestore();
    }
  });

  it('buildReceiptHTML renders logo_url if provided and adheres to A4 specifications', () => {
    const customReceipt = {
      ...mockReceipt,
      store: {
        ...mockReceipt.store,
        logo_base64: null,
        logo_url: 'https://myshop.com/logo.png',
      },
    };

    const html = buildReceiptHTML(customReceipt);
    expect(html).toContain('https://myshop.com/logo.png');
    expect(html).toContain('size: A4 portrait');
    expect(html).toContain('Qty');
    expect(html).toContain('Discount (₹)');
    expect(html).toContain('Amount (₹)');
  });
});
