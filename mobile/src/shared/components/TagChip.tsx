import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text } from './Text';
import type { Tag } from '@lib/types';

interface TagChipProps {
  tag: Tag;
  onRemove?: () => void;
  size?: 'sm' | 'md';
}

/**
 * Colored pill chip for displaying a tag.
 * Background is tag.color at ~20% opacity (hex + '33').
 * Dot is tag.color at full opacity.
 */
export function TagChip({ tag, onRemove, size = 'md' }: TagChipProps) {
  const bgColor = tag.color + '33';
  const dotColor = tag.color;

  const paddingHorizontal = size === 'sm' ? 8 : 10;
  const paddingVertical = size === 'sm' ? 3 : 5;
  const dotSize = size === 'sm' ? 6 : 7;
  const fontSize = size === 'sm' ? 'caption' : 'label';

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: bgColor,
        borderRadius: 999,
        paddingHorizontal,
        paddingVertical,
        gap: 4,
      }}
    >
      <View
        style={{
          width: dotSize,
          height: dotSize,
          borderRadius: dotSize / 2,
          backgroundColor: dotColor,
        }}
      />
      <Text
        variant={fontSize as 'caption' | 'label'}
        weight="medium"
        style={{ color: dotColor }}
        numberOfLines={1}
      >
        {tag.name}
      </Text>
      {onRemove && (
        <TouchableOpacity onPress={onRemove} hitSlop={8}>
          <MaterialCommunityIcons name="close" size={12} color={dotColor} />
        </TouchableOpacity>
      )}
    </View>
  );
}
