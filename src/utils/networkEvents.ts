type NetworkStatusListener = (offline: boolean) => void;
const globalListeners = new Set<NetworkStatusListener>();

export const registerNetworkStatusListener = (listener: NetworkStatusListener): (() => void) => {
  globalListeners.add(listener);
  return () => {
    globalListeners.delete(listener);
  };
};

export const emitGlobalNetworkStatus = (offline: boolean) => {
  globalListeners.forEach((listener) => {
    try {
      listener(offline);
    } catch {
      // ignore
    }
  });
};
