import React from 'react';
import {View, StyleSheet, ActivityIndicator, ActivityIndicatorProps} from 'react-native';

interface LoadingSpinnerProps {
  size?: ActivityIndicatorProps['size'];
}

export function LoadingSpinner({size = 'large'}: LoadingSpinnerProps) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size={size} color="#22d3ee" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

