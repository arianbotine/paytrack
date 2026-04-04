import React from 'react';
import { View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text } from './Text';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon = 'inbox-outline',
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <View className="flex-1 items-center justify-center py-16 px-8">
      <View className="w-20 h-20 rounded-full bg-neutral-100 items-center justify-center mb-4">
        <MaterialCommunityIcons name={icon} size={40} color="#9e9e9e" />
      </View>
      <Text
        variant="subheading"
        weight="semibold"
        className="text-neutral-700 text-center mb-2"
      >
        {title}
      </Text>
      {description && (
        <Text variant="body" className="text-neutral-500 text-center mb-6">
          {description}
        </Text>
      )}
      {actionLabel && onAction && (
        <Button variant="secondary" label={actionLabel} onPress={onAction} />
      )}
    </View>
  );
}
