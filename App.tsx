import React, {useEffect} from 'react';
import {StatusBar} from 'expo-status-bar';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {ErrorBoundary} from './src/components/common/ErrorBoundary';
import {AppNavigator} from './src/navigation/AppNavigator';
import {initErrorTracking} from './src/utils/errorTracking';
import {initAnalytics} from './src/utils/analytics';
import {initAppStateManagement} from './src/utils/appState';
import {initPerformanceMonitoring} from './src/utils/performance';

export default function App() {
  // Init işlemlerini arka planda çalıştır - blocking yapma
  useEffect(() => {
    try { 
      initErrorTracking({ 
        enabled: true, 
        environment: __DEV__ ? 'development' : 'production', 
        service: 'sentry' 
      }); 
    } catch {}
    
    try { 
      initAnalytics({ 
        enabled: true, 
        batchSize: 10, 
        batchInterval: 5000 
      }); 
    } catch {}
    
    try { 
      initAppStateManagement(); 
    } catch {}
    
    try { 
      initPerformanceMonitoring(); 
    } catch {}
  }, []);

  return (
    <GestureHandlerRootView style={{flex: 1}}>
      <SafeAreaProvider>
        <ErrorBoundary>
          <StatusBar style="light" />
          <AppNavigator />
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
