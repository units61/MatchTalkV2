import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigation, CommonActions } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { checkOnboardingCompleted } from './OnboardingScreen';
import { useAuthStore } from '../stores/authStore';
import * as Sentry from '@sentry/react-native';

const ONBOARDING_KEY = '@matchtalk_onboarding_completed';

export default function BootScreen() {
    const navigation = useNavigation();
    const { loadUser, isAuthenticated } = useAuthStore();
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        let mounted = true;

        const initialize = async () => {
            try {
                // 🚨 CRITICAL: BootScreen başladı - Sentry'ye bildir
                Sentry.addBreadcrumb({
                    category: 'boot',
                    message: 'BootScreen initialization started',
                    level: 'info',
                });

                // 1. Onboarding kontrolü
                const onboardingCompleted = await checkOnboardingCompleted();
                
                Sentry.addBreadcrumb({
                    category: 'boot',
                    message: `Onboarding check completed: ${onboardingCompleted}`,
                    level: 'info',
                });
                
                if (!mounted) return;

                // 2. Eğer onboarding tamamlanmamışsa → OnboardingScreen
                if (!onboardingCompleted) {
                    Sentry.addBreadcrumb({
                        category: 'boot',
                        message: 'Navigating to OnboardingScreen',
                        level: 'info',
                    });
                    navigation.dispatch(
                        CommonActions.reset({
                            index: 0,
                            routes: [{ name: 'Onboarding' }],
                        })
                    );
                    return;
                }

                // 3. Onboarding tamamlanmışsa → Auth kontrolü
                try {
                    await loadUser();
                    Sentry.addBreadcrumb({
                        category: 'boot',
                        message: 'User loaded successfully',
                        level: 'info',
                    });
                } catch (authError) {
                    // Auth yükleme hatası olsa bile devam et (Login'e yönlendir)
                    Sentry.captureException(authError instanceof Error ? authError : new Error(String(authError)), {
                        level: 'warning',
                        tags: {
                            component: 'BootScreen',
                            step: 'loadUser',
                        },
                    });
                }

                if (!mounted) return;

                // 4. Auth durumuna göre yönlendir (loadUser sonrası state güncellenmiş olacak)
                // Kısa bir delay ile state'in güncellenmesini bekle
                await new Promise(resolve => setTimeout(resolve, 50));
                
                if (!mounted) return;

                const currentAuthState = useAuthStore.getState().isAuthenticated;
                
                Sentry.addBreadcrumb({
                    category: 'boot',
                    message: `Auth state: ${currentAuthState}`,
                    level: 'info',
                });
                
                if (currentAuthState) {
                    // Auth varsa → MainTabs
                    Sentry.addBreadcrumb({
                        category: 'boot',
                        message: 'Navigating to MainTabs',
                        level: 'info',
                    });
                    navigation.dispatch(
                        CommonActions.reset({
                            index: 0,
                            routes: [{ name: 'MainTabs' }],
                        })
                    );
                } else {
                    // Auth yoksa → Login
                    Sentry.addBreadcrumb({
                        category: 'boot',
                        message: 'Navigating to LoginScreen',
                        level: 'info',
                    });
                    navigation.dispatch(
                        CommonActions.reset({
                            index: 0,
                            routes: [{ name: 'Login' }],
                        })
                    );
                }
            } catch (error) {
                // Herhangi bir hata → Sentry'ye gönder ve Login'e yönlendir
                Sentry.captureException(error instanceof Error ? error : new Error(String(error)), {
                    level: 'error',
                    tags: {
                        component: 'BootScreen',
                        step: 'initialize',
                    },
                    extra: {
                        errorMessage: error instanceof Error ? error.message : String(error),
                        errorStack: error instanceof Error ? error.stack : undefined,
                    },
                });

                if (mounted) {
                    // Hata durumunda güvenli fallback: Login'e yönlendir
                    navigation.dispatch(
                        CommonActions.reset({
                            index: 0,
                            routes: [{ name: 'Login' }],
                        })
                    );
                }
            } finally {
                if (mounted) {
                    setIsReady(true);
                    Sentry.addBreadcrumb({
                        category: 'boot',
                        message: 'BootScreen initialization completed',
                        level: 'info',
                    });
                }
            }
        };

        // Kısa bir delay ile başlat (native modüllerin hazır olması için)
        const timer = setTimeout(() => {
            initialize();
        }, 100);

        return () => {
            mounted = false;
            clearTimeout(timer);
        };
    }, [navigation, loadUser]);

    return (
        <View style={styles.container}>
            {!isReady && (
                <ActivityIndicator size="large" color="#06b6d4" />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000',
    },
});
