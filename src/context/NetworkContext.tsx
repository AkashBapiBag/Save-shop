import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Platform } from 'react-native';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { getApiBaseUrl } from '@/services/api';
import { registerNetworkStatusListener, emitGlobalNetworkStatus } from '@/utils/networkEvents';

export { registerNetworkStatusListener, emitGlobalNetworkStatus };

export interface NetworkContextType {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  isOffline: boolean;
  connectionType: string;
  isChecking: boolean;
  checkConnection: () => Promise<boolean>;
  reportNetworkOffline: () => void;
  reportNetworkOnline: () => void;
}

const defaultContext: NetworkContextType = {
  isConnected: true,
  isInternetReachable: true,
  isOffline: false,
  connectionType: 'unknown',
  isChecking: false,
  checkConnection: async () => true,
  reportNetworkOffline: () => {},
  reportNetworkOnline: () => {},
};

export const NetworkContext = createContext<NetworkContextType>(defaultContext);

interface NetworkProviderProps {
  children: ReactNode;
}

export const NetworkProvider: React.FC<NetworkProviderProps> = ({ children }) => {
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [isInternetReachable, setIsInternetReachable] = useState<boolean | null>(true);
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [connectionType, setConnectionType] = useState<string>('unknown');
  const [isChecking, setIsChecking] = useState<boolean>(false);

  const reportNetworkOffline = useCallback(() => {
    setIsOffline(true);
    setIsConnected(false);
  }, []);

  const reportNetworkOnline = useCallback(() => {
    setIsOffline(false);
    setIsConnected(true);
  }, []);

  // Actively test backend or network reachability
  const checkConnection = useCallback(async (): Promise<boolean> => {
    setIsChecking(true);
    try {
      // 1. Check OS / NetInfo state first
      const state = await NetInfo.fetch();
      if (state.isConnected === false) {
        setIsOffline(true);
        setIsConnected(false);
        setIsChecking(false);
        return false;
      }

      // 2. Ping backend health check endpoint with quick 3.5s timeout
      const baseUrl = await getApiBaseUrl();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      try {
        const res = await fetch(`${baseUrl}/health`, {
          method: 'GET',
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        });
        clearTimeout(timeoutId);

        if (res.ok || res.status === 200 || res.status === 404) {
          setIsOffline(false);
          setIsConnected(true);
          setIsInternetReachable(true);
          setIsChecking(false);
          return true;
        }
      } catch {
        clearTimeout(timeoutId);
      }

      // 3. Fallback ping to a lightweight reliable public endpoint if custom backend is slow
      if (Platform.OS === 'web' && typeof navigator !== 'undefined') {
        const isOnline = navigator.onLine;
        setIsOffline(!isOnline);
        setIsConnected(isOnline);
        setIsChecking(false);
        return isOnline;
      }

      // If NetInfo reports connected and reachable, treat as connected
      const reachable = state.isInternetReachable !== false;
      setIsOffline(!reachable);
      setIsConnected(reachable);
      setIsChecking(false);
      return reachable;
    } catch {
      setIsOffline(true);
      setIsConnected(false);
      setIsChecking(false);
      return false;
    }
  }, []);

  // Listen to NetInfo state changes
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const connected = state.isConnected ?? true;
      const reachable = state.isInternetReachable;
      const offline = !connected || reachable === false;

      setIsConnected(connected);
      setIsInternetReachable(reachable);
      setIsOffline(offline);
      setConnectionType(state.type || 'unknown');
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Listen to Web browser online/offline events
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const handleOnline = () => {
        setIsOffline(false);
        setIsConnected(true);
        setIsInternetReachable(true);
      };

      const handleOffline = () => {
        setIsOffline(true);
        setIsConnected(false);
        setIsInternetReachable(false);
      };

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      // Initial check on mount
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setIsOffline(true);
        setIsConnected(false);
      }

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);

  // Connect global listeners from API error interceptor
  useEffect(() => {
    const unregister = registerNetworkStatusListener((offline) => {
      if (offline) {
        reportNetworkOffline();
      } else {
        reportNetworkOnline();
      }
    });

    return () => {
      unregister();
    };
  }, [reportNetworkOffline, reportNetworkOnline]);

  return (
    <NetworkContext.Provider
      value={{
        isConnected,
        isInternetReachable,
        isOffline,
        connectionType,
        isChecking,
        checkConnection,
        reportNetworkOffline,
        reportNetworkOnline,
      }}
    >
      {children}
    </NetworkContext.Provider>
  );
};

export const useNetworkStatus = () => useContext(NetworkContext);
