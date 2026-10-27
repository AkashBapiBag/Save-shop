import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Palette, Shadows } from '@/theme/designSystem';
import { logError } from '@/utils/errorHandler';
import { OfflineScreen } from '@/components/ui/OfflineScreen';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  isNetworkError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    isNetworkError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    const errorMsg = (error?.message || '').toLowerCase();
    const isNetwork =
      errorMsg.includes('network') ||
      errorMsg.includes('offline') ||
      errorMsg.includes('timeout') ||
      errorMsg.includes('abort') ||
      errorMsg.includes('failed to fetch') ||
      errorMsg.includes('connection') ||
      (Platform.OS === 'web' && typeof navigator !== 'undefined' && !navigator.onLine);

    return {
      hasError: true,
      error,
      errorInfo: null,
      isNetworkError: isNetwork,
    };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logError('ErrorBoundary:componentDidCatch', error);
    this.setState({ errorInfo });
  }

  public handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      isNetworkError: false,
    });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // If error is caused by offline / network unavailability, show OfflineScreen
      if (this.state.isNetworkError) {
        return (
          <OfflineScreen
            title="Connection Interrupted"
            message="My Save Shop lost connection to the server while loading this screen. Please check your internet connection and tap retry."
            onRetry={this.handleReset}
          />
        );
      }

      // Fallback UI for generic render crash
      return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.card}>
              <View style={styles.iconCircle}>
                <Ionicons name="warning-outline" size={40} color={Palette.amber} />
              </View>

              <Text style={styles.title}>Something Went Wrong</Text>
              <Text style={styles.message}>
                An unexpected problem occurred while rendering this screen. Your data and store records remain intact.
              </Text>

              {__DEV__ && this.state.error && (
                <View style={styles.devErrorBox}>
                  <Text style={styles.devErrorTitle}>Debug Information:</Text>
                  <Text style={styles.devErrorText}>
                    {this.state.error.name}: {this.state.error.message}
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={styles.retryButton}
                onPress={this.handleReset}
                activeOpacity={0.8}
              >
                <Ionicons name="reload-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.retryButtonText}>Reload Screen</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    ...Shadows.md,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFFBEB',
    borderWidth: 2,
    borderColor: '#FDE68A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Palette.navyPrimary,
    marginBottom: 10,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: Palette.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 24,
  },
  devErrorBox: {
    width: '100%',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: Palette.amber,
  },
  devErrorTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.navyPrimary,
    marginBottom: 4,
  },
  devErrorText: {
    fontSize: 12,
    color: Palette.rose,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', web: 'monospace' }),
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.navyPrimary,
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    ...Shadows.md,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
