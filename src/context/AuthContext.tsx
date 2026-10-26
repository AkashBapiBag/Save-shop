import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, Store, UserRole } from '@/types/api';
import { authApi, setClientAuth } from '@/services/api';
import { signOutNativeGoogle } from '@/services/nativeGoogleAuth';

interface AuthContextType {
  user: User | null;
  token: string | null;
  activeStore: Store | null;
  stores: Store[];
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (payload: {
    id_token?: string;
    access_token?: string;
    google_token?: string;
    auth0_token?: string;
    email?: string;
    name?: string;
    role?: UserRole;
  }) => Promise<void>;
  logout: () => Promise<void>;
  switchStore: (storeId: string) => Promise<void>;
  refreshStores: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEYS = {
  TOKEN: '@saveshop_token',
  USER: '@saveshop_user',
  ACTIVE_STORE: '@saveshop_active_store',
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [activeStore, setActiveStore] = useState<Store | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Sync client headers whenever state changes
  useEffect(() => {
    setClientAuth(token, activeStore?.store_id || user?.current_store_id || null, user?.email || null);
  }, [token, activeStore, user]);

  // Load persisted session on app launch
  useEffect(() => {
    const bootstrapAuth = async () => {
      try {
        const [savedToken, savedUserJson, savedStoreJson] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.TOKEN),
          AsyncStorage.getItem(STORAGE_KEYS.USER),
          AsyncStorage.getItem(STORAGE_KEYS.ACTIVE_STORE),
        ]);

        if (savedToken && savedUserJson) {
          const parsedUser: User = JSON.parse(savedUserJson);
          const parsedStore: Store | null = savedStoreJson ? JSON.parse(savedStoreJson) : null;

          setToken(savedToken);
          setUser(parsedUser);
          setActiveStore(parsedStore);
          setClientAuth(savedToken, parsedStore?.store_id || parsedUser.current_store_id || null, parsedUser.email);

          // Verify or refresh profile and stores in background
          try {
            const freshUser = await authApi.getMe();
            setUser(freshUser);
            await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(freshUser));

            const freshStores = await authApi.getAccessibleStores();
            setStores(freshStores);

            // Re-sync active store
            const matchedStore = freshStores.find(
              (s) => s.store_id === (parsedStore?.store_id || freshUser.current_store_id)
            );
            if (matchedStore) {
              setActiveStore(matchedStore);
              await AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_STORE, JSON.stringify(matchedStore));
            } else if (freshStores.length > 0) {
              setActiveStore(freshStores[0]);
              await AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_STORE, JSON.stringify(freshStores[0]));
            }
          } catch {
            // Keep cached offline data if network request fails
          }
        }
      } catch (e) {
        console.warn('Failed restoring authentication session:', e);
      } finally {
        setIsLoading(false);
      }
    };

    bootstrapAuth();
  }, []);

  const login = async (payload: {
    id_token?: string;
    access_token?: string;
    google_token?: string;
    auth0_token?: string;
    email?: string;
    name?: string;
    role?: UserRole;
  }) => {
    setIsLoading(true);
    try {
      const response = await authApi.login(payload);
      const authToken = response.access_token;
      const authUser = response.user;

      setToken(authToken);
      setUser(authUser);
      setClientAuth(authToken, authUser.current_store_id || null, authUser.email);

      await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, authToken);
      await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(authUser));

      // Fetch accessible stores
      const accessibleStores = await authApi.getAccessibleStores();
      setStores(accessibleStores);

      let targetStore: Store | null = null;
      if (authUser.current_store_id) {
        targetStore = accessibleStores.find((s) => s.store_id === authUser.current_store_id) || null;
      }
      if (!targetStore && accessibleStores.length > 0) {
        targetStore = accessibleStores[0];
      }

      setActiveStore(targetStore);
      if (targetStore) {
        await AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_STORE, JSON.stringify(targetStore));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setUser(null);
    setToken(null);
    setActiveStore(null);
    setStores([]);
    setClientAuth(null, null, null);
    await AsyncStorage.multiRemove([STORAGE_KEYS.TOKEN, STORAGE_KEYS.USER, STORAGE_KEYS.ACTIVE_STORE]);
    await signOutNativeGoogle();
  };

  const switchStore = async (storeId: string) => {
    const updatedUser = await authApi.switchStore(storeId);
    setUser(updatedUser);
    await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUser));

    const matched = stores.find((s) => s.store_id === storeId);
    if (matched) {
      setActiveStore(matched);
      await AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_STORE, JSON.stringify(matched));
      setClientAuth(token, matched.store_id, updatedUser.email);
    }
  };

  const refreshStores = async () => {
    try {
      const freshStores = await authApi.getAccessibleStores();
      setStores(freshStores);
      if (activeStore) {
        const updated = freshStores.find((s) => s.store_id === activeStore.store_id);
        if (updated) {
          setActiveStore(updated);
          await AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_STORE, JSON.stringify(updated));
        }
      } else if (freshStores.length > 0) {
        setActiveStore(freshStores[0]);
        await AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_STORE, JSON.stringify(freshStores[0]));
      }
    } catch (e) {
      console.warn('Error refreshing stores:', e);
    }
  };

  const refreshUser = async () => {
    try {
      const freshUser = await authApi.getMe();
      setUser(freshUser);
      await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(freshUser));
    } catch (e) {
      console.warn('Error refreshing user:', e);
    }
  };

  const isAdmin = user?.role?.toLowerCase() === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        activeStore,
        stores,
        isLoading,
        isAuthenticated: !!token && !!user,
        isAdmin,
        login,
        logout,
        switchStore,
        refreshStores,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
