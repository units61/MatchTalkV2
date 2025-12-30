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
        let mounted = true;

        // 🛡️ Time-out Guard: If init takes longer than 5s, force navigate to login
        const timeoutGuard = setTimeout(() => {
            if (mounted) {
                console.warn('[BootScreen] Init timed out, forcing navigation');
                navigation.dispatch(
                    CommonActions.reset({
                        index: 0,
                        routes: [{ name: 'Login' }],
                    })
                );
            }
        }, 5000);

        const init = async () => {
            try {
                // 🔥 iOS frame guarantee
                await new Promise(resolve => requestAnimationFrame(() => resolve(null)));

                // Safe initialization
                try { initErrorTracking(); } catch { }
                try { initAnalytics(); } catch { }
                try { initAppStateManagement(); } catch { }
                try { initPerformanceMonitoring(); } catch { }

                const onboardingCompleted = await AsyncStorage.getItem(ONBOARDING_KEY);

                // Perform data loading with timeout
                if (onboardingCompleted === 'true') {
                    // loadUser internally has its own error handling, but we wrap it to be sure
                    await Promise.race([
                        loadUser(),
                        new Promise(r => setTimeout(r, 3000)) // loadUser max 3s wait
                    ]).catch(() => { });
                }

                if (!mounted) return;
                clearTimeout(timeoutGuard);

                await new Promise(r => setTimeout(r, 100)); // Stabilization

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
            } catch (error) {
                if (!mounted) return;
                clearTimeout(timeoutGuard);
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

        return () => {
            mounted = false;
            clearTimeout(timeoutGuard);
        };
    }, [isAuthenticated, loadUser, navigation]);

    return <View style={styles.container} />;
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000',
    },
});
