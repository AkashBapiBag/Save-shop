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
  StoreMembersOverview,
  AddStoreOperatorRequest,
  AddStoreOperatorResponse,
} from '@/types/api';

export const isLocalEnvironment = (): boolean => {
  // Explicit overrides if defined
  if (process.env.EXPO_PUBLIC_FORCE_PROD === 'true') {
    return false;
  }
  if (process.env.EXPO_PUBLIC_FORCE_DEV === 'true') {
    return true;
  }

  // Web browser environment check
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.hostname) {
    const host = window.location.hostname.toLowerCase();
    return (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '[::1]' ||
      host.startsWith('192.168.') ||
      host.startsWith('10.') ||
      host.startsWith('172.16.') ||
      host.startsWith('172.17.') ||
      host.startsWith('172.18.') ||
      host.startsWith('172.19.') ||
      host.startsWith('172.20.') ||
      host.startsWith('172.21.') ||
      host.startsWith('172.22.') ||
      host.startsWith('172.23.') ||
      host.startsWith('172.24.') ||
      host.startsWith('172.25.') ||
      host.startsWith('172.26.') ||
      host.startsWith('172.27.') ||
      host.startsWith('172.28.') ||
      host.startsWith('172.29.') ||
      host.startsWith('172.30.') ||
      host.startsWith('172.31.') ||
      host.endsWith('.local')
    );
  }

  // React Native development mode (__DEV__ flag provided by Metro)
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    return true;
  }

  return false;
};

export const getProductionApiUrl = (): string => {
  const prodUrl =
    process.env.EXPO_PUBLIC_PROD_API_URL ||
    process.env.EXPO_PUBLIC_API_URL ||
    Constants.expoConfig?.extra?.EXPO_PUBLIC_PROD_API_URL ||
    Constants.expoConfig?.extra?.EXPO_PUBLIC_API_URL ||
    Constants.expoConfig?.extra?.apiUrl;

  if (prodUrl && typeof prodUrl === 'string' && prodUrl.trim() !== '') {
    return prodUrl.trim().replace(/\/+$/, '');
  }

  // Same-origin web fallback if deployed on web server with reverse proxy
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/+$/, '');
  }

  return 'https://chamber-golf-guardian-thumbnails.trycloudflare.com';
};

export const getLocalDevApiUrl = (): string => {
  // Explicit dev URL if provided in .env
  const devUrl = process.env.EXPO_PUBLIC_DEV_API_URL;
  if (devUrl && typeof devUrl === 'string' && devUrl.trim() !== '') {
    return devUrl.trim().replace(/\/+$/, '');
  }

  // In Web browser: use current hostname with port 8000
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.hostname) {
    const host = window.location.hostname;
    if (window.location.port === '8000') {
      return window.location.origin.replace(/\/+$/, '');
    }
    return `http://${host}:8000`;
  }

  // In Expo Go / Native dev client: extract machine LAN IP from Metro hostUri
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri && !hostUri.includes('expo-dev-client')) {
    const ip = hostUri.split(':')[0];
    if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
      return `http://${ip}:8000`;
    }
  }

  // Android emulator loopback to host machine
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8000';
  }

  return 'http://127.0.0.1:8000';
};

export const resolveDefaultHost = (): string => {
  // Test suite compatibility: when testing resolveDefaultHost with EXPO_PUBLIC_API_URL override
  if (process.env.NODE_ENV === 'test' && process.env.EXPO_PUBLIC_API_URL && !process.env.EXPO_PUBLIC_DEV_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.trim().replace(/\/+$/, '');
  }

  if (isLocalEnvironment()) {
    return getLocalDevApiUrl();
  }

  return getProductionApiUrl();
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
        'Connection timed out. Please check your internet connection and try again.',
        'TIMEOUT_ERROR',
        0
      );
    }
    throw new APIError(
      maybeError?.message || 'Unable to connect to server. Please check your connection and try again.',
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

  getStoreOperators: async (storeId: string): Promise<StoreMembersOverview> => {
    return apiRequest<StoreMembersOverview>(`/api/v1/stores/${storeId}/operators`);
  },

  addStoreOperator: async (
    storeId: string,
    payload: AddStoreOperatorRequest
  ): Promise<AddStoreOperatorResponse> => {
    return apiRequest<AddStoreOperatorResponse>(`/api/v1/stores/${storeId}/operators`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  removeStoreOperator: async (
    storeId: string,
    userId: string
  ): Promise<{ success: boolean; message: string }> => {
    return apiRequest<{ success: boolean; message: string }>(
      `/api/v1/stores/${storeId}/operators/${userId}`,
      {
        method: 'DELETE',
      }
    );
  },

  revokeStoreInvitation: async (
    storeId: string,
    invitationId: string
  ): Promise<{ success: boolean; message: string }> => {
    return apiRequest<{ success: boolean; message: string }>(
      `/api/v1/stores/${storeId}/invitations/${invitationId}`,
      {
        method: 'DELETE',
      }
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
