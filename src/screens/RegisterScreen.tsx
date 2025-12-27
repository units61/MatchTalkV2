import React, {useState, useEffect} from 'react';
import {View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Linking} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {Ionicons} from '@expo/vector-icons';
import Animated, {FadeInDown, FadeIn, withSpring} from 'react-native-reanimated';
import {LinearGradient} from 'expo-linear-gradient';
import {AnimatedBackground} from '../components/v2/AnimatedBackground';
import {GlassCard} from '../components/v2/GlassCard';
import {GradientText} from '../components/v2/GradientText';
import {LoadingSpinner} from '../components/v2/LoadingSpinner';
import {useAuthStore} from '../stores/authStore';
import {toast} from '../stores/toastStore';
import {config} from '../lib/config';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const navigation = useNavigation();
  const {register, logout} = useAuthStore();

  // Password validation
  const passwordLengthValid = password.length >= 6;
  const passwordHasLetter = /[a-zA-Z]/.test(password);
  const passwordHasNumber = /[0-9]/.test(password);
  const passwordStrong = passwordLengthValid && passwordHasLetter && passwordHasNumber;
  const passwordsMatch = password === confirmPassword && confirmPassword !== '';

  const handleRegister = async () => {
    setError(null);
    if (!passwordsMatch || !passwordStrong) {
      setError('Lütfen tüm şifre gereksinimlerini karşılayın');
      return;
    }

    setLoading(true);
    try {
      await register({
        name: name.trim(),
        email: email.trim(),
        password,
        gender,
      });
      setSuccess(true);
      // Kullanıcıyı logout yap (register otomatik login yapıyor)
      await logout();
      // 3 saniye sonra login sayfasına yönlendir
      setTimeout(() => {
        navigation.navigate('Login' as never);
      }, 3000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Kayıt işlemi sırasında bir hata oluştu';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    try {
      const apiUrl = config.api.baseUrl;
      const url = `${apiUrl}/api/v1/auth/google`;
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        toast.error('Google ile kayıt olunamadı');
      }
    } catch (error) {
      toast.error('Google ile kayıt olurken bir hata oluştu');
    }
  };

  const handleAppleRegister = () => {
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
            <GradientText style={styles.title}>Kayıt Ol</GradientText>
            <Text style={styles.subtitle}>Yeni hesap oluştur</Text>
          </View>

          <GlassCard style={styles.card}>
            {success ? (
              <Animated.View entering={FadeIn} style={styles.successContainer}>
                <View style={styles.successIconContainer}>
                  <Ionicons name="checkmark-circle" size={64} color="#22c55e" />
                </View>
                <Text style={styles.successTitle}>Kaydınız Oluşturuldu!</Text>
                <Text style={styles.successText}>Giriş sayfasına yönlendiriliyorsunuz...</Text>
                <TouchableOpacity
                  style={styles.successButton}
                  onPress={() => navigation.navigate('Login' as never)}>
                  <LinearGradient
                    colors={['#22d3ee', '#a855f7']}
                    start={{x: 0, y: 0}}
                    end={{x: 1, y: 0}}
                    style={styles.successButtonGradient}>
                    <Text style={styles.successButtonText}>Giriş Yap</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>
            ) : (
              <>
                <View style={styles.inputWrapper}>
                  <Text style={styles.label}>Email</Text>
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
                  <Text style={styles.label}>Ad Soyad</Text>
                  <View style={styles.inputContainer}>
                    <Ionicons name="person-outline" size={20} color="rgba(255,255,255,0.4)" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Ad Soyad"
                      placeholderTextColor="rgba(255,255,255,0.4)"
                      value={name}
                      onChangeText={setName}
                      autoCapitalize="words"
                    />
                  </View>
                </View>

                <View style={styles.inputWrapper}>
                  <Text style={styles.label}>Cinsiyet</Text>
                  <View style={styles.genderContainer}>
                    <TouchableOpacity
                      style={[styles.genderButton, gender === 'male' && styles.genderButtonActive]}
                      onPress={() => setGender('male')}>
                      <Text style={[styles.genderButtonText, gender === 'male' && styles.genderButtonTextActive]}>
                        Erkek
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.genderButton, gender === 'female' && styles.genderButtonActive]}
                      onPress={() => setGender('female')}>
                      <Text style={[styles.genderButtonText, gender === 'female' && styles.genderButtonTextActive]}>
                        Kadın
                      </Text>
                    </TouchableOpacity>
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
                  {password !== '' && (
                    <View style={styles.passwordValidation}>
                      <View style={styles.validationItem}>
                        <Ionicons
                          name={passwordLengthValid ? 'checkmark-circle' : 'close-circle'}
                          size={16}
                          color={passwordLengthValid ? '#22c55e' : '#ef4444'}
                        />
                        <Text style={[styles.validationText, passwordLengthValid && styles.validationTextSuccess]}>
                          En az 6 karakter
                        </Text>
                      </View>
                      <View style={styles.validationItem}>
                        <Ionicons
                          name={passwordHasLetter ? 'checkmark-circle' : 'close-circle'}
                          size={16}
                          color={passwordHasLetter ? '#22c55e' : '#ef4444'}
                        />
                        <Text style={[styles.validationText, passwordHasLetter && styles.validationTextSuccess]}>
                          En az bir harf
                        </Text>
                      </View>
                      <View style={styles.validationItem}>
                        <Ionicons
                          name={passwordHasNumber ? 'checkmark-circle' : 'close-circle'}
                          size={16}
                          color={passwordHasNumber ? '#22c55e' : '#ef4444'}
                        />
                        <Text style={[styles.validationText, passwordHasNumber && styles.validationTextSuccess]}>
                          En az bir rakam
                        </Text>
                      </View>
                    </View>
                  )}
                </View>

                <View style={styles.inputWrapper}>
                  <Text style={styles.label}>Şifre Tekrar</Text>
                  <View style={styles.inputContainer}>
                    <Ionicons name="lock-closed-outline" size={20} color="rgba(255,255,255,0.4)" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="••••••••"
                      placeholderTextColor="rgba(255,255,255,0.4)"
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry={!showConfirmPassword}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                      style={styles.eyeIcon}>
                      <Ionicons
                        name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color="rgba(255,255,255,0.4)"
                      />
                    </TouchableOpacity>
                  </View>
                  {confirmPassword !== '' && (
                    <View style={styles.passwordMatch}>
                      <Ionicons
                        name={passwordsMatch ? 'checkmark-circle' : 'close-circle'}
                        size={16}
                        color={passwordsMatch ? '#22c55e' : '#ef4444'}
                      />
                      <Text style={[styles.validationText, passwordsMatch && styles.validationTextSuccess]}>
                        Şifreler eşleşiyor
                      </Text>
                    </View>
                  )}
                </View>

                {error && (
                  <Animated.View entering={FadeIn} style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                  </Animated.View>
                )}

                <TouchableOpacity
                  style={[styles.button, (loading || !passwordsMatch || !passwordStrong) && styles.buttonDisabled]}
                  onPress={handleRegister}
                  disabled={loading || !passwordsMatch || !passwordStrong}
                  activeOpacity={0.8}>
                  {loading ? (
                    <LoadingSpinner />
                  ) : (
                    <LinearGradient
                      colors={['#22d3ee', '#a855f7']}
                      start={{x: 0, y: 0}}
                      end={{x: 1, y: 0}}
                      style={styles.buttonGradient}>
                      <Text style={styles.buttonText}>Kayıt Ol</Text>
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
                    style={styles.oauthButton}
                    onPress={handleGoogleRegister}
                    activeOpacity={0.7}>
                    <View style={styles.oauthIconContainer}>
                      <Text style={styles.googleIcon}>G</Text>
                    </View>
                    <Text style={styles.oauthButtonText}>Google ile Kayıt Ol</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.oauthButton}
                    onPress={handleAppleRegister}
                    activeOpacity={0.7}>
                    <Ionicons name="logo-apple" size={20} color="#fff" />
                    <Text style={styles.oauthButtonText}>Apple ile Kayıt Ol</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.loginLink}>
                  <Text style={styles.loginLinkText}>Zaten hesabın var mı? </Text>
                  <TouchableOpacity onPress={() => navigation.navigate('Login' as never)}>
                    <Text style={styles.loginLinkBold}>Giriş Yap</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
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
    paddingVertical: 48,
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
  successContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  successIconContainer: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    borderRadius: 50,
    padding: 16,
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  successText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 24,
  },
  successButton: {
    borderRadius: 12,
    height: 50,
    overflow: 'hidden',
    width: '100%',
  },
  successButtonGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
  genderContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  genderButton: {
    flex: 1,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
  },
  genderButtonActive: {
    backgroundColor: 'rgba(34, 211, 238, 0.2)',
    borderColor: '#22d3ee',
  },
  genderButtonText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
    fontWeight: '500',
  },
  genderButtonTextActive: {
    color: '#fff',
  },
  passwordValidation: {
    marginTop: 8,
    gap: 4,
  },
  validationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  validationText: {
    fontSize: 12,
    color: '#ef4444',
  },
  validationTextSuccess: {
    color: '#22c55e',
  },
  passwordMatch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
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
    gap: 12,
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
    gap: 12,
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
  loginLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  loginLinkText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
  },
  loginLinkBold: {
    color: '#22d3ee',
    fontSize: 14,
    fontWeight: '600',
  },
});

