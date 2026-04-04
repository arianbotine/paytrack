import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Text } from './Text';

interface LoadingStateProps {
  message?: string;
  fullScreen?: boolean;
}

export function LoadingState({
  message,
  fullScreen = false,
}: LoadingStateProps) {
  return (
    <View
      className={`items-center justify-center py-12${fullScreen ? ' flex-1' : ''}`}
    >
      <ActivityIndicator size="large" color="#1976d2" />
      {message && (
        <Text variant="body" className="text-neutral-500 mt-3">
          {message}
        </Text>
      )}
    </View>
  );
}
