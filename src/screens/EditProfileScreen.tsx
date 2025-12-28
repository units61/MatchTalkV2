import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { AnimatedBackground } from '../components/v2/AnimatedBackground';
import { GlassCard } from '../components/v2/GlassCard';
import { GradientText } from '../components/v2/GradientText';
import { LoadingSpinner } from '../components/v2/LoadingSpinner';
import { useAuthStore } from '../stores/authStore';
import { usersApi } from '../services/api/usersApi';
import { toast } from '../stores/toastStore';
import { generateAvatarFromSeed } from '../utils/avatarUtils';

export default function EditProfileScreen() {
  const navigation = useNavigation();
  const { user, updateProfile, loadUser } = useAuthStore();
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('other');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setUsername(user.name || '');
      setBio((user as any).bio || '');
      setGender(user.gender || 'other');
    }
  }, [user]);

  const handleAvatarUpload = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        toast.error('Fotoğraf kütüphanesi erişimi gerekli');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets[0]) {
        return;
      }

      const asset = result.assets[0];
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (asset.fileSize && asset.fileSize > maxSize) {
        toast.error('Dosya boyutu 5MB\'dan küçük olmalıdır');
        return;
      }

      setUploading(true);
      await usersApi.uploadAvatar(asset.uri);

      // Profil verilerini ve fotoğrafı tüm uygulamada anında güncelle
      await loadUser();

      toast.info('Profil fotoğrafınız başarıyla güncellendi.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Fotoğraf yüklenirken bir hata oluştu');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateProfile({
        name: username,
      });
      // Verileri anında yenile
      await loadUser();
      toast.info('Profil bilgileriniz başarıyla kaydedildi.');
      navigation.goBack();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Profil güncellenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const maskEmail = (email: string) => {
    if (!email) return '';
    const [localPart, domain] = email.split('@');
    if (!localPart || !domain) return email;
    const maskedLocal = localPart.slice(0, 2) + '***' + localPart.slice(-1);
    return `${maskedLocal}@${domain}`;
  };

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <AnimatedBackground />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}>
            <Ionicons name="arrow-back" size={20} color="rgba(255,255,255,0.6)" />
            <Text style={styles.backText}>Geri</Text>
          </TouchableOpacity>

          <GradientText style={styles.title}>Profili Düzenle</GradientText>

          <View style={styles.avatarContainer}>
            <View style={styles.avatarWrapper}>
              {user.avatar ? (
                <Image source={{ uri: user.avatar }} style={styles.avatar} />
              ) : (
                <LinearGradient
                  colors={['#06b6d4', '#a855f7']}
                  style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>{user.name?.charAt(0).toUpperCase() || 'U'}</Text>
                </LinearGradient>
              )}
              <TouchableOpacity
                onPress={handleAvatarUpload}
                disabled={uploading}
                style={styles.uploadButton}>
                {uploading ? (
                  <LoadingSpinner size="small" />
                ) : (
                  <Ionicons name="camera" size={20} color="white" />
                )}
              </TouchableOpacity>
            </View>
          </View>

          <GlassCard style={styles.card}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Kullanıcı Adı</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Kullanıcı adınız"
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  value={username}
                  onChangeText={setUsername}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Cinsiyet</Text>
              <View style={styles.genderContainer}>
                <TouchableOpacity
                  style={[styles.genderButton, gender === 'male' && styles.genderButtonActive]}
                  onPress={() => setGender('male')}>
                  <Text style={[styles.genderButtonText, gender === 'male' && styles.genderButtonTextActive]}>Erkek</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.genderButton, gender === 'female' && styles.genderButtonActive]}
                  onPress={() => setGender('female')}>
                  <Text style={[styles.genderButtonText, gender === 'female' && styles.genderButtonTextActive]}>Kadın</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.genderButton, gender === 'other' && styles.genderButtonActive]}
                  onPress={() => setGender('other')}>
                  <Text style={[styles.genderButtonText, gender === 'other' && styles.genderButtonTextActive]}>Diğer</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>E-posta Adresi</Text>
              <View style={styles.readOnlyInput}>
                <Text style={styles.readOnlyText}>{maskEmail(user.email || '')}</Text>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Biyografi</Text>
              <View style={[styles.inputContainer, styles.textAreaContainer]}>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Kendinizden bahsedin..."
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  value={bio}
                  onChangeText={setBio}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSave}
              disabled={loading}>
              {loading ? (
                <LoadingSpinner />
              ) : (
                <LinearGradient
                  colors={['#06b6d4', '#a855f7']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.buttonGradient}>
                  <Ionicons name="save-outline" size={20} color="white" />
                  <Text style={styles.buttonText}>Kaydet</Text>
                </LinearGradient>
              )}
            </TouchableOpacity>
          </GlassCard>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f0c29',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 8,
  },
  backText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 32,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    width: 112,
    height: 112,
    borderRadius: 56,
  },
  avatarPlaceholder: {
    width: 112,
    height: 112,
    borderRadius: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: 'white',
  },
  uploadButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#06b6d4',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#0f0c29',
  },
  card: {
    padding: 24,
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '500',
  },
  inputContainer: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
    justifyContent: 'center',
  },
  input: {
    color: 'white',
    fontSize: 16,
  },
  textAreaContainer: {
    height: 100,
    paddingVertical: 12,
  },
  textArea: {
    height: '100%',
  },
  readOnlyInput: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  readOnlyText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
  },
  genderContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  genderButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  genderButtonActive: {
    backgroundColor: '#06b6d4',
  },
  genderButtonText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
    fontWeight: '500',
  },
  genderButtonTextActive: {
    color: 'white',
  },
  button: {
    marginTop: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

