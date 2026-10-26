import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import {
  User,
  Store,
  StoreCreateRequest,
  StoreUpdateRequest,
  IndianState,
  Product,
  ProductCreateRequest,
  ProductUpdateRequest,
  Batch,
  BatchReceiveSingleRequest,
  BatchReceiveBulkRequest,
  POSTransactionCreate,
  TransactionResponse,
  ReceiptResponse,
  DashboardOverview,
  StockHealthResponse,
  SalesVelocityResponse,
  InventoryStatusResponse,
  StockValidationResponse,
  StockValidationItem,
  LoginRequest,
  LoginResponse,
  AssignStoreResponse,
  SignatureResponse,
  TransactionListParams,
  CategorySummary,
} from '@/types/api';

export const resolveDefaultHost = (): string => {
  // 1. Primary source: EXPO_PUBLIC_API_URL from .env in all cases
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim() !== '') {
    return envUrl.trim().replace(/\/+$/, '');
  }

  // 2. Secondary fallback: Constants extra (if configured in app.json)
  const extraUrl =
    Constants.expoConfig?.extra?.EXPO_PUBLIC_API_URL ||
    Constants.expoConfig?.extra?.apiUrl;
  if (extraUrl && typeof extraUrl === 'string' && extraUrl.trim() !== '') {
    return extraUrl.trim().replace(/\/+$/, '');
  }

  // 3. Fallback for local development when .env is not present
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri && !hostUri.includes('expo-dev-client')) {
    const ip = hostUri.split(':')[0];
    if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
      return `http://${ip}:8000`;
    }
  }

  // 4. Default emulator / localhost fallback
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8000';
  }
  return 'http://127.0.0.1:8000';
};

export const DEFAULT_API_URL = resolveDefaultHost();

export class APIError extends Error {
  code: string;
  status: number;
  details?: unknown;

  constructor(message: string, code: string = 'UNKNOWN_ERROR', status: number = 500, details?: unknown) {
    super(message);
    this.name = 'APIError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

let activeToken: string | null = null;
let activeStoreId: string | null = null;
let activeUserEmail: string | null = null;

export const setClientAuth = (token: string | null, storeId: string | null, email: string | null) => {
  activeToken = token;
  activeStoreId = storeId;
  activeUserEmail = email;
};

export const getApiBaseUrl = async (): Promise<string> => {
  try {
    const saved = await AsyncStorage.getItem('@saveshop_api_url');
    // Clean up stale hardcoded IP if previously saved
    if (saved && saved.includes('192.168.29.252')) {
      await AsyncStorage.removeItem('@saveshop_api_url');
    } else if (saved && saved.trim() !== '') {
      return saved.trim().replace(/\/+$/, '');
    }
  } catch {
    // ignore storage read failure
  }
  return resolveDefaultHost();
};

export const setApiBaseUrl = async (url: string) => {
  const cleanUrl = url.trim().replace(/\/+$/, '');
  await AsyncStorage.setItem('@saveshop_api_url', cleanUrl);
};

export const resetApiBaseUrl = async (): Promise<string> => {
  try {
    await AsyncStorage.removeItem('@saveshop_api_url');
  } catch {
    // ignore storage remove failure
  }
  return resolveDefaultHost();
};

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const rawBaseUrl = await getApiBaseUrl();
  const baseUrl = rawBaseUrl.trim().replace(/\/+$/, '');
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${baseUrl}${cleanEndpoint}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (activeToken) {
    headers['Authorization'] = `Bearer ${activeToken}`;
  }
  if (activeStoreId) {
    headers['X-Store-Id'] = activeStoreId;
  }
  if (activeUserEmail) {
    headers['X-Dev-User-Email'] = activeUserEmail;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const responseText = await response.text();
    let data: Record<string, unknown> = {};
    if (responseText) {
      try {
        data = JSON.parse(responseText);
      } catch {
        data = { message: responseText };
      }
    }

    if (!response.ok) {
      const errorMsg =
        (typeof data?.error === 'object' && data.error !== null && 'message' in data.error && typeof (data.error as Record<string, unknown>).message === 'string'
          ? (data.error as Record<string, unknown>).message
          : null) ||
        (typeof data?.detail === 'object' && data.detail !== null && 'message' in data.detail && typeof (data.detail as Record<string, unknown>).message === 'string'
          ? (data.detail as Record<string, unknown>).message
          : null) ||
        (typeof data?.detail === 'string' ? data.detail : null) ||
        (typeof data?.message === 'string' ? data.message : null) ||
        `Request failed with status ${response.status}`;

      const errorCode =
        (typeof data?.error === 'object' && data.error !== null && 'code' in data.error && typeof (data.error as Record<string, unknown>).code === 'string'
          ? (data.error as Record<string, unknown>).code
          : null) ||
        (typeof data?.detail === 'object' && data.detail !== null && 'error_code' in data.detail && typeof (data.detail as Record<string, unknown>).error_code === 'string'
          ? (data.detail as Record<string, unknown>).error_code
          : null) ||
        'HTTP_ERROR';

      const errorDetails =
        (typeof data?.error === 'object' && data.error !== null && 'details' in data.error ? (data.error as Record<string, unknown>).details : undefined) ||
        (typeof data?.detail === 'object' && data.detail !== null && 'details' in data.detail ? (data.detail as Record<string, unknown>).details : undefined);

      throw new APIError(errorMsg as string, errorCode as string, response.status, errorDetails);
    }

    return data as unknown as T;
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    if (err instanceof APIError) {
      throw err;
    }
    const maybeError = err as { name?: string; message?: string } | undefined;
    if (maybeError?.name === 'AbortError') {
      throw new APIError(
        `Connection timed out reaching ${url}. Check that the backend server is running with '--host 0.0.0.0'.`,
        'TIMEOUT_ERROR',
        0
      );
    }
    throw new APIError(
      maybeError?.message || `Unable to connect to ${url}. Ensure your device is on the same Wi-Fi and backend is running.`,
      'NETWORK_ERROR',
      0
    );
  }
}

// -------------------------------------------------------------
// Authentication Endpoints
// -------------------------------------------------------------
export const authApi = {
  login: async (payload: LoginRequest): Promise<LoginResponse> => {
    return apiRequest<LoginResponse>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  loginWithGoogle: async (payload: { id_token?: string; access_token?: string; google_token?: string }): Promise<LoginResponse> => {
    return apiRequest<LoginResponse>('/api/v1/auth/google', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getMe: async (): Promise<User> => {
    return apiRequest<User>('/api/v1/auth/me');
  },

  getAccessibleStores: async (): Promise<Store[]> => {
    return apiRequest<Store[]>('/api/v1/auth/stores');
  },

  switchStore: async (storeId: string): Promise<User> => {
    return apiRequest<User>(`/api/v1/auth/switch-store/${storeId}`, {
      method: 'POST',
    });
  },

  assignStoreAccess: async (userId: string, storeId: string): Promise<AssignStoreResponse> => {
    return apiRequest<AssignStoreResponse>('/api/v1/auth/assign-store', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, store_id: storeId }),
    });
  },
};

// -------------------------------------------------------------
// Store Management Endpoints
// -------------------------------------------------------------
export const storeApi = {
  getIndianStates: async (): Promise<IndianState[]> => {
    return apiRequest<IndianState[]>('/api/v1/stores/states');
  },

  listStores: async (): Promise<Store[]> => {
    return apiRequest<Store[]>('/api/v1/stores');
  },

  getStore: async (storeId: string): Promise<Store> => {
    return apiRequest<Store>(`/api/v1/stores/${storeId}`);
  },

  createStore: async (payload: StoreCreateRequest): Promise<Store> => {
    return apiRequest<Store>('/api/v1/stores/create', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateStore: async (storeId: string, payload: StoreUpdateRequest): Promise<Store> => {
    return apiRequest<Store>(`/api/v1/stores/${storeId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  uploadSignature: async (storeId: string, signatureBase64: string): Promise<SignatureResponse> => {
    return apiRequest<SignatureResponse>(
      `/api/v1/stores/${storeId}/signature`,
      {
        method: 'POST',
        body: JSON.stringify({ signature_base64: signatureBase64 }),
      }
    );
  },

  getSignature: async (storeId: string): Promise<SignatureResponse> => {
    return apiRequest<SignatureResponse>(
      `/api/v1/stores/${storeId}/signature`
    );
  },
};

// -------------------------------------------------------------
// Inventory Endpoints
// -------------------------------------------------------------
export const inventoryApi = {
  listProducts: async (params?: { category?: string; search?: string }): Promise<Product[]> => {
    const q = new URLSearchParams();
    if (params?.category) q.append('category', params.category);
    if (params?.search) q.append('search', params.search);
    const qs = q.toString();
    return apiRequest<Product[]>(`/api/v1/inventory/products${qs ? `?${qs}` : ''}`);
  },

  getCategories: async (): Promise<CategorySummary[]> => {
    return apiRequest<CategorySummary[]>('/api/v1/inventory/categories');
  },

  getProduct: async (productId: string): Promise<Product> => {
    return apiRequest<Product>(`/api/v1/inventory/products/${productId}`);
  },

  createProduct: async (payload: ProductCreateRequest): Promise<Product> => {
    return apiRequest<Product>('/api/v1/inventory/products', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateProduct: async (productId: string, payload: ProductUpdateRequest): Promise<Product> => {
    return apiRequest<Product>(`/api/v1/inventory/products/${productId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  receiveSingleBatch: async (payload: BatchReceiveSingleRequest): Promise<Batch> => {
    return apiRequest<Batch>('/api/v1/inventory/receive/single', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  receiveBulkBatches: async (payload: BatchReceiveBulkRequest): Promise<Batch[]> => {
    return apiRequest<Batch[]>('/api/v1/inventory/receive/bulk', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  listBatches: async (params?: { productId?: string; onlyActive?: boolean }): Promise<Batch[]> => {
    const q = new URLSearchParams();
    if (params?.productId) q.append('product_id', params.productId);
    if (params?.onlyActive !== undefined) q.append('only_active', String(params.onlyActive));
    const qs = q.toString();
    return apiRequest<Batch[]>(`/api/v1/inventory/batches${qs ? `?${qs}` : ''}`);
  },
};

// -------------------------------------------------------------
// Billing & POS Endpoints
// -------------------------------------------------------------
export const billingApi = {
  validateStock: async (items: StockValidationItem[]): Promise<StockValidationResponse> => {
    return apiRequest<StockValidationResponse>('/api/v1/billing/validate-stock', {
      method: 'POST',
      body: JSON.stringify({ items }),
    });
  },

  checkout: async (payload: POSTransactionCreate): Promise<TransactionResponse> => {
    return apiRequest<TransactionResponse>('/api/v1/billing/checkout', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getTransaction: async (transactionId: string): Promise<TransactionResponse> => {
    return apiRequest<TransactionResponse>(`/api/v1/billing/transactions/${transactionId}`);
  },

  listTransactions: async (params?: TransactionListParams): Promise<TransactionResponse[]> => {
    const q = new URLSearchParams();
    if (params?.search) q.append('search', params.search);
    if (params?.date_filter) q.append('date_filter', params.date_filter);
    if (params?.start_date) q.append('start_date', params.start_date);
    if (params?.end_date) q.append('end_date', params.end_date);
    if (params?.limit) q.append('limit', String(params.limit));
    if (params?.offset) q.append('offset', String(params.offset));
    const qs = q.toString();
    return apiRequest<TransactionResponse[]>(`/api/v1/billing/transactions${qs ? `?${qs}` : ''}`);
  },

  getReceipt: async (transactionId: string): Promise<ReceiptResponse> => {
    return apiRequest<ReceiptResponse>(`/api/v1/billing/transactions/${transactionId}/receipt`);
  },
};

// -------------------------------------------------------------
// Dashboard & Reporting Endpoints
// -------------------------------------------------------------
export const dashboardApi = {
  getOverview: async (): Promise<DashboardOverview> => {
    return apiRequest<DashboardOverview>('/api/v1/dashboard/overview');
  },

  getStockHealth: async (): Promise<StockHealthResponse> => {
    return apiRequest<StockHealthResponse>('/api/v1/dashboard/stock-health');
  },

  getSalesVelocity: async (periodDays = 7, topN = 5): Promise<SalesVelocityResponse> => {
    return apiRequest<SalesVelocityResponse>(
      `/api/v1/dashboard/sales-velocity?period_days=${periodDays}&top_n=${topN}`
    );
  },

  getInventoryStatus: async (): Promise<InventoryStatusResponse> => {
    return apiRequest<InventoryStatusResponse>('/api/v1/dashboard/inventory-status');
  },
};
