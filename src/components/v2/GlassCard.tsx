import React from 'react';
import {View, StyleSheet, ViewStyle} from 'react-native';
import {BlurView} from 'expo-blur';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  className?: string;
}

export function GlassCard({children, style}: GlassCardProps) {
  return (
    <BlurView intensity={80} tint="dark" style={[styles.card, style]}>
      <View style={styles.content}>
        {children}
      </View>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  content: {
    padding: 24,
  },
});



