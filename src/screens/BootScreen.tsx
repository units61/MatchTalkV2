import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigation, CommonActions } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../stores/authStore';
import { initErrorTracking } from '../utils/errorTracking';
import { initAnalytics } from '../utils/analytics';
import { initAppStateManagement } from '../utils/appState';
import { initPerformanceMonitoring } from '../utils/performance';

const ONBOARDING_KEY = '@matchtalk_onboarding_completed';

export default function BootScreen() {
    const navigation = useNavigation();
    const { loadUser, isAuthenticated } = useAuthStore();

    useEffect(() => {
        const init = async () => {
            try {
                // 🔥 iOS frame guarantee - First frame must be empty
                await new Promise(resolve => requestAnimationFrame(() => resolve(null)));

                // 1. Init processes (Safely after first frame)
                try {
                    initErrorTracking({
                        enabled: true,
                        environment: __DEV__ ? 'development' : 'production',
                        service: 'sentry'
                    });
                } catch { }

                try {
                    initAnalytics({
                        enabled: true,
                        batchSize: 10,
                        batchInterval: 5000
                    });
                } catch { }

                try { initAppStateManagement(); } catch { }
                try { initPerformanceMonitoring(); } catch { }

                // 2. Data Loading
                const onboardingCompleted = await AsyncStorage.getItem(ONBOARDING_KEY);
                if (onboardingCompleted === 'true') {
                    await loadUser().catch(() => { });
                }

                // 3. Final navigation with a small stabilization delay
                setTimeout(() => {
                    let targetRoute = 'Onboarding';
                    if (onboardingCompleted === 'true') {
                        targetRoute = isAuthenticated ? 'MainTabs' : 'Login';
                    }

                    navigation.dispatch(
                        CommonActions.reset({
                            index: 0,
                            routes: [{ name: targetRoute }],
                        })
                    );
                }, 50);
            } catch (error) {
                console.error('[BootScreen] Init error:', error);
                navigation.dispatch(
                    CommonActions.reset({
                        index: 0,
                        routes: [{ name: 'Login' }],
                    })
                );
            }
        };

        init();
    }, []);

    return <View style={styles.container} />;
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000',
    },
});
