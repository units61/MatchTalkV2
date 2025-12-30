import React, {Component, ErrorInfo, ReactNode} from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import * as Sentry from '@sentry/react-native';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {hasError: false, error: null};
  }

  static getDerivedStateFromError(error: Error): State {
    return {hasError: true, error};
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Direkt Sentry'ye gönder
    try {
      Sentry.captureException(error, {
        level: 'error',
        tags: {
          source: 'ErrorBoundary',
          component: 'ErrorBoundary',
        },
        extra: {
          componentStack: errorInfo.componentStack,
          errorMessage: error.message,
          errorStack: error.stack,
        },
      });
    } catch (sentryError) {
      // Sentry'ye gönderirken hata olursa uygulama crash olmasın
      if (__DEV__) {
        console.error('[ErrorBoundary] Failed to send error to Sentry:', sentryError);
      }
    }
  }

  handleReset = () => {
    this.setState({hasError: false, error: null});
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View style={styles.container}>
          <Text style={styles.title}>Bir hata oluştu</Text>
          <Text style={styles.message}>
            {this.state.error?.message || 'Beklenmeyen bir hata oluştu'}
          </Text>
          {__DEV__ && this.state.error && (
            <Text style={styles.errorDetails}>
              {this.state.error.stack?.substring(0, 500) || 'Stack trace yok'}
            </Text>
          )}
          <TouchableOpacity style={styles.button} onPress={this.handleReset}>
            <Text style={styles.buttonText}>Tekrar Dene</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0c29',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  message: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#22d3ee',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorDetails: {
    color: '#ff6b6b',
    fontSize: 12,
    marginTop: 16,
    marginBottom: 16,
    padding: 12,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderRadius: 8,
    fontFamily: 'monospace',
  },
});


