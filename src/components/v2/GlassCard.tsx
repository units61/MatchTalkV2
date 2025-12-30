import React from 'react';
import {View, StyleSheet, ViewStyle} from 'react-native';
import {BlurView} from 'expo-blur';
import * as Sentry from '@sentry/react-native';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  className?: string;
}

export function GlassCard({children, style}: GlassCardProps) {
  try {
    return (
      <BlurView intensity={80} tint="dark" style={[styles.card, style]}>
        <View style={styles.content}>
          {children}
        </View>
      </BlurView>
    );
  } catch (error) {
    // Hata durumunda Sentry'ye gönder ve fallback göster
    Sentry.captureException(error, {
      level: 'error',
      tags: {
        component: 'GlassCard',
      },
      extra: {
        errorMessage: error instanceof Error ? error.message : String(error),
      },
    });
    
    // Fallback: Normal View (glass effect olmadan)
    return (
      <View style={[styles.card, styles.fallback, style]}>
        <View style={styles.content}>
          {children}
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  fallback: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  content: {
    padding: 24,
  },
});



