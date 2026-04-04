import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text } from './Text';
import { PAYMENT_METHODS } from '@lib/formatters';
import type { PaymentMethod } from '@lib/types';

interface PaymentMethodPickerProps {
  value: PaymentMethod;
  onChange: (method: PaymentMethod) => void;
}

export function PaymentMethodPicker({
  value,
  onChange,
}: PaymentMethodPickerProps) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {PAYMENT_METHODS.map(item => {
        const isSelected = item.value === value;
        return (
          <TouchableOpacity
            key={item.value}
            onPress={() => onChange(item.value as PaymentMethod)}
            activeOpacity={0.7}
            className={`items-center justify-center rounded-xl p-3 border ${
              isSelected
                ? 'bg-primary-700 border-primary-700'
                : 'bg-white border-neutral-200'
            }`}
            style={{ width: '30.5%' }}
          >
            <MaterialCommunityIcons
              name={item.icon as keyof typeof MaterialCommunityIcons.glyphMap}
              size={22}
              color={isSelected ? '#ffffff' : '#616161'}
            />
            <Text
              variant="label"
              weight="medium"
              className={`mt-1 text-center ${isSelected ? 'text-white' : 'text-neutral-700'}`}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
