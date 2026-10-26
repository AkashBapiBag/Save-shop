import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Text, View } from 'react-native';

import { OfflineScreen } from '@/components/ui/OfflineScreen';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { NetworkProvider, useNetworkStatus } from '@/context/NetworkContext';
import { emitGlobalNetworkStatus } from '@/utils/networkEvents';

describe('Offline Handling & ErrorBoundary Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('OfflineScreen Component', () => {
    it('renders default offline title, message, and troubleshooting checklist in full screen mode', () => {
      render(<OfflineScreen />);

      expect(screen.getByText('Device is Offline')).toBeTruthy();
      expect(screen.getByText(/SaveShop requires an active internet connection/i)).toBeTruthy();
      expect(screen.getByText('DISCONNECTED')).toBeTruthy();
      expect(screen.getByText('Troubleshooting Checklist')).toBeTruthy();
      expect(screen.getByText('Check if your Wi-Fi or Cellular Data is enabled')).toBeTruthy();
      expect(screen.getByText('Verify that Airplane Mode is turned off')).toBeTruthy();
      expect(screen.getByText('Try Again')).toBeTruthy();
    });

    it('renders custom title and message when provided', () => {
      render(
        <OfflineScreen
          title="Catalog Offline"
          message="Your products cannot be loaded while the device is offline."
        />
      );

      expect(screen.getByText('Catalog Offline')).toBeTruthy();
      expect(screen.getByText('Your products cannot be loaded while the device is offline.')).toBeTruthy();
    });

    it('renders compact mode without full troubleshooting checklist', () => {
      render(
        <OfflineScreen
          compact
          title="Compact Offline View"
          message="Compact error message"
        />
      );

      expect(screen.getByText('Compact Offline View')).toBeTruthy();
      expect(screen.getByText('Compact error message')).toBeTruthy();
      expect(screen.queryByText('Troubleshooting Checklist')).toBeNull();
    });

    it('triggers retry callback and checkConnection when Try Again is tapped', async () => {
      const onRetryMock = vi.fn().mockResolvedValue(undefined);

      render(<OfflineScreen onRetry={onRetryMock} />);

      const retryBtn = screen.getByText('Try Again');
      await act(async () => {
        fireEvent.click(retryBtn);
      });

      expect(onRetryMock).toHaveBeenCalledTimes(1);
    });

    it('shows dismiss button when showDismiss is enabled and calls onDismiss', () => {
      const onDismissMock = vi.fn();
      render(<OfflineScreen showDismiss onDismiss={onDismissMock} />);

      const dismissBtn = screen.getByText('Dismiss');
      expect(dismissBtn).toBeTruthy();

      fireEvent.click(dismissBtn);
      expect(onDismissMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('OfflineBanner Component', () => {
    it('renders offline warning pill when network is reported offline', async () => {
      const TestContainer = () => (
        <NetworkProvider>
          <OfflineBanner />
        </NetworkProvider>
      );

      render(<TestContainer />);

      // Initially online - banner not shown
      expect(screen.queryByText(/Device Offline/i)).toBeNull();

      // Trigger offline event
      await act(async () => {
        emitGlobalNetworkStatus(true);
      });

      expect(screen.getByText(/No Internet • Device Offline/i)).toBeTruthy();
      expect(screen.getByText('Retry')).toBeTruthy();
    });

    it('transitions to reconnected state when network is restored', async () => {
      const TestContainer = () => (
        <NetworkProvider>
          <OfflineBanner />
        </NetworkProvider>
      );

      render(<TestContainer />);

      // Go offline
      await act(async () => {
        emitGlobalNetworkStatus(true);
      });
      expect(screen.getByText(/No Internet • Device Offline/i)).toBeTruthy();

      // Go online
      await act(async () => {
        emitGlobalNetworkStatus(false);
      });

      expect(screen.getByText(/Back Online! Connection restored/i)).toBeTruthy();
    });
  });

  describe('ErrorBoundary Component', () => {
    // Component that throws on render
    const ProblematicComponent: React.FC<{ shouldThrow: boolean; errorMessage?: string }> = ({
      shouldThrow,
      errorMessage = 'Crash rendering component',
    }) => {
      if (shouldThrow) {
        throw new Error(errorMessage);
      }
      return <Text>Working View</Text>;
    };

    it('renders normal children when no error occurs', () => {
      render(
        <ErrorBoundary>
          <Text>Normal App View</Text>
        </ErrorBoundary>
      );

      expect(screen.getByText('Normal App View')).toBeTruthy();
    });

    it('catches generic runtime crash and renders crash fallback screen', () => {
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      render(
        <ErrorBoundary>
          <ProblematicComponent shouldThrow errorMessage="Unexpected null reference error" />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something Went Wrong')).toBeTruthy();
      expect(screen.getByText(/An unexpected problem occurred while rendering this screen/i)).toBeTruthy();
      expect(screen.getByText('Reload Screen')).toBeTruthy();

      spy.mockRestore();
    });

    it('catches network/offline error and renders OfflineScreen instead of generic error', () => {
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      render(
        <ErrorBoundary>
          <ProblematicComponent shouldThrow errorMessage="Network request failed: device offline" />
        </ErrorBoundary>
      );

      expect(screen.getByText('Connection Interrupted')).toBeTruthy();
      expect(screen.getByText(/SaveShop lost connection to the server/i)).toBeTruthy();
      expect(screen.getByText('Try Again')).toBeTruthy();

      spy.mockRestore();
    });

    it('resets error state when Reload Screen is pressed', () => {
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const onResetMock = vi.fn();

      const DynamicWrapper = () => {
        const [shouldFail, setShouldFail] = React.useState(true);
        return (
          <ErrorBoundary
            onReset={() => {
              onResetMock();
              setShouldFail(false);
            }}
          >
            <ProblematicComponent shouldThrow={shouldFail} errorMessage="Test error" />
          </ErrorBoundary>
        );
      };

      render(<DynamicWrapper />);

      expect(screen.getByText('Something Went Wrong')).toBeTruthy();

      const reloadBtn = screen.getByText('Reload Screen');
      fireEvent.click(reloadBtn);

      expect(onResetMock).toHaveBeenCalledTimes(1);
      expect(screen.getByText('Working View')).toBeTruthy();

      spy.mockRestore();
    });
  });

  describe('NetworkProvider & useNetworkStatus hook', () => {
    const TestConsumer: React.FC = () => {
      const { isOffline, isConnected, reportNetworkOffline, reportNetworkOnline } = useNetworkStatus();
      return (
        <View>
          <Text testID="status-text">{isOffline ? 'OFFLINE' : 'ONLINE'}</Text>
          <Text testID="connected-text">{isConnected ? 'CONNECTED' : 'DISCONNECTED'}</Text>
          <Text testID="btn-offline" onPress={reportNetworkOffline}>
            Set Offline
          </Text>
          <Text testID="btn-online" onPress={reportNetworkOnline}>
            Set Online
          </Text>
        </View>
      );
    };

    it('provides online/offline state and responds to manual and event updates', async () => {
      render(
        <NetworkProvider>
          <TestConsumer />
        </NetworkProvider>
      );

      expect(screen.getByTestId('status-text').textContent).toBe('ONLINE');

      // Click button to report offline
      await act(async () => {
        fireEvent.click(screen.getByTestId('btn-offline'));
      });

      expect(screen.getByTestId('status-text').textContent).toBe('OFFLINE');
      expect(screen.getByTestId('connected-text').textContent).toBe('DISCONNECTED');

      // Click button to report online
      await act(async () => {
        fireEvent.click(screen.getByTestId('btn-online'));
      });

      expect(screen.getByTestId('status-text').textContent).toBe('ONLINE');
      expect(screen.getByTestId('connected-text').textContent).toBe('CONNECTED');
    });
  });
});
