import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { AnimatedBackground } from '../components/v2/AnimatedBackground';
import { GlassCard } from '../components/v2/GlassCard';
import { GradientText } from '../components/v2/GradientText';
import { LoadingSpinner } from '../components/v2/LoadingSpinner';
import { useAuthStore } from '../stores/authStore';
import { toast } from '../stores/toastStore';
import { config } from '../lib/config';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigation = useNavigation();
  const { login } = useAuthStore();
  const [isReady, setIsReady] = useState(false);

  React.useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setIsReady(true);
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  if (!isReady) {
    return <View style={[styles.container, { backgroundColor: '#000' }]} />;
  }

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Lütfen email ve şifre girin');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await login({ email: email.trim(), password });
      // Navigation will be handled by AppNavigator based on auth state
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Giriş yapılırken bir hata oluştu';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const apiUrl = config.api.baseUrl;
      const url = `${apiUrl}/api/v1/auth/google`;
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        toast.error('Google ile giriş yapılamadı');
      }
    } catch (error) {
      toast.error('Google ile giriş yapılırken bir hata oluştu');
    }
  };

  const handleAppleLogin = () => {
    // Apple Sign In için @invertase/react-native-apple-authentication kullanılabilir
    toast.error('Apple Sign In yakında eklenecek');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <AnimatedBackground />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">
        <Animated.View entering={FadeInDown.delay(200)} style={styles.content}>
          <View style={styles.header}>
            <GradientText style={styles.title}>MatchTalk</GradientText>
            <Text style={styles.subtitle}>Hesabına giriş yap</Text>
          </View>

          <GlassCard style={styles.card}>
            <View style={styles.inputWrapper}>
              <Text style={styles.label}>Email veya Kullanıcı Adı</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="mail-outline" size={20} color="rgba(255,255,255,0.4)" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="email@example.com"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            <View style={styles.inputWrapper}>
              <Text style={styles.label}>Şifre</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color="rgba(255,255,255,0.4)" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIcon}>
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="rgba(255,255,255,0.4)"
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={styles.forgotPassword}
              onPress={() => navigation.navigate('ForgotPassword' as never)}>
              <Text style={styles.forgotPasswordText}>Şifremi Unuttum</Text>
            </TouchableOpacity>

            {error && (
              <Animated.View entering={FadeIn} style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </Animated.View>
            )}

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}>
              {loading ? (
                <LoadingSpinner />
              ) : (
                <LinearGradient
                  colors={['#22d3ee', '#a855f7']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.buttonGradient}>
                  <Text style={styles.buttonText}>Giriş Yap</Text>
                </LinearGradient>
              )}
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>veya</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.oauthContainer}>
              <TouchableOpacity
                style={[styles.oauthButton, { marginBottom: 12 }]}
                onPress={handleGoogleLogin}
                activeOpacity={0.7}>
                <View style={styles.oauthIconContainer}>
                  <Text style={styles.googleIcon}>G</Text>
                </View>
                <Text style={styles.oauthButtonText}>Google ile Giriş Yap</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.oauthButton}
                onPress={handleAppleLogin}
                activeOpacity={0.7}>
                <Ionicons name="logo-apple" size={20} color="#fff" />
                <View style={{ marginLeft: 12 }}>
                  <Text style={styles.oauthButtonText}>Apple ile Giriş Yap</Text>
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.registerLink}>
              <Text style={styles.registerLinkText}>Hesabın yok mu? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Register' as never)}>
                <Text style={styles.registerLinkBold}>Kayıt Ol</Text>
              </TouchableOpacity>
            </View>
          </GlassCard>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0c29',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  content: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 40,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
  },
  card: {
    width: '100%',
  },
  inputWrapper: {
    marginBottom: 16,
  },
  label: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 50,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
  },
  eyeIcon: {
    padding: 4,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 16,
  },
  forgotPasswordText: {
    color: '#22d3ee',
    fontSize: 14,
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.5)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 14,
  },
  button: {
    borderRadius: 12,
    height: 50,
    marginTop: 8,
    overflow: 'hidden',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  dividerText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    paddingHorizontal: 16,
  },
  oauthContainer: {
    marginTop: 12,
  },
  oauthButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    height: 50,
  },
  oauthIconContainer: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleIcon: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4285F4',
  },
  oauthButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  registerLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  registerLinkText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
  },
  registerLinkBold: {
    color: '#22d3ee',
    fontSize: 14,
    fontWeight: '600',
  },
});
