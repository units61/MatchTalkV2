import React from 'react';
import { Text, StyleSheet, TextStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import * as Sentry from '@sentry/react-native';

interface GradientTextProps {
  children: React.ReactNode;
  style?: TextStyle;
  className?: string;
}

export function GradientText({ children, style, className }: GradientTextProps) {
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    const raf = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  if (!ready) {
    return <Text style={[styles.text, style, { color: '#fff' }]}>{children}</Text>;
  }

  try {
    return (
      <MaskedView
        maskElement={
          <Text style={[styles.text, style]}>{children}</Text>
        }>
        <LinearGradient
          colors={['#22d3ee', '#a855f7', '#ec4899']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}>
          <Text style={[styles.text, style, { opacity: 0 }]}>{children}</Text>
        </LinearGradient>
      </MaskedView>
    );
  } catch (error) {
    // Hata durumunda Sentry'ye gönder ve fallback göster
    Sentry.captureException(error, {
      level: 'error',
      tags: {
        component: 'GradientText',
      },
      extra: {
        errorMessage: error instanceof Error ? error.message : String(error),
      },
    });
    
    // Fallback: Normal Text
    return <Text style={[styles.text, style, { color: '#fff' }]}>{children}</Text>;
  }
}

const styles = StyleSheet.create({
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
});



