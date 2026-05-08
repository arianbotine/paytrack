import React from 'react';
import { View, TextInput } from 'react-native';
import { Text } from './Text';

interface CurrencyInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onBlur?: () => void;
  error?: string;
}

export function CurrencyInput({
  value,
  onChangeText,
  onBlur,
  error,
}: CurrencyInputProps) {
  return (
    <>
      <View
        className={`flex-row items-center bg-neutral-50 border rounded-xl px-4 py-3 ${
          error ? 'border-danger-400' : 'border-neutral-200'
        }`}
      >
        <Text
          variant="subheading"
          weight="semibold"
          className="text-neutral-500 mr-2"
        >
          R$
        </Text>
        <TextInput
          className="flex-1 text-lg text-neutral-900"
          value={value}
          onChangeText={text => onChangeText(text.replace(/[^0-9.,]/g, ''))}
          onBlur={onBlur}
          keyboardType="decimal-pad"
          placeholder="0,00"
          placeholderTextColor="#9E9E9E"
        />
      </View>
      {error ? (
        <Text variant="caption" className="text-danger-600 mt-1">
          {error}
        </Text>
      ) : null}
    </>
  );
}
