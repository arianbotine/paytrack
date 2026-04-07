import React, { useRef, useEffect, useState, useCallback } from 'react';
import { View, TextInput, TouchableOpacity, Alert } from 'react-native';
import {
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetBackdrop,
} from '@gorhom/bottom-sheet';
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text } from './Text';
import { Button } from './Button';
import { useCreateTag } from '../../features/tags/use-create-tag';
import type { Tag } from '@lib/types';

const PRESET_COLORS = [
  { hex: '#3B82F6', label: 'Azul' },
  { hex: '#10B981', label: 'Verde' },
  { hex: '#F59E0B', label: 'Âmbar' },
  { hex: '#EF4444', label: 'Vermelho' },
  { hex: '#8B5CF6', label: 'Roxo' },
  { hex: '#EC4899', label: 'Rosa' },
  { hex: '#06B6D4', label: 'Ciano' },
  { hex: '#84CC16', label: 'Lima' },
];

interface CreateTagSheetProps {
  visible: boolean;
  onClose: () => void;
  onCreated: (tag: Tag) => void;
}

/**
 * Inline bottom sheet for creating a new tag.
 * Has a name text input and 8 preset color swatches.
 * On success calls onCreated with the new tag.
 */
export function CreateTagSheet({
  visible,
  onClose,
  onCreated,
}: CreateTagSheetProps) {
  const sheetRef = useRef<BottomSheetModal>(null);
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0].hex);
  const [nameError, setNameError] = useState('');

  const { mutate, isPending } = useCreateTag();

  useEffect(() => {
    if (visible) {
      setName('');
      setSelectedColor(PRESET_COLORS[0].hex);
      setNameError('');
      sheetRef.current?.present();
    } else {
      sheetRef.current?.dismiss();
    }
  }, [visible]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior="close"
      />
    ),
    []
  );

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError('Nome é obrigatório');
      return;
    }
    setNameError('');

    mutate(
      { name: trimmed, color: selectedColor },
      {
        onSuccess: tag => {
          onCreated(tag);
          onClose();
        },
        onError: () => {
          Alert.alert('Erro', 'Não foi possível criar a tag. Tente novamente.');
        },
      }
    );
  };

  return (
    <BottomSheetModal
      ref={sheetRef}
      onDismiss={onClose}
      enableDynamicSizing
      backdropComponent={renderBackdrop}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      handleIndicatorStyle={{ backgroundColor: '#e0e0e0', width: 40 }}
    >
      <BottomSheetScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 8,
          paddingBottom: 40,
        }}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between mb-6">
          <View className="flex-row items-center">
            <View className="w-9 h-9 rounded-xl bg-primary-50 items-center justify-center mr-3">
              <MaterialCommunityIcons
                name="label-outline"
                size={20}
                color="#4F46E5"
              />
            </View>
            <Text
              variant="subheading"
              weight="bold"
              className="text-neutral-900"
            >
              Nova Tag
            </Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            className="w-8 h-8 rounded-full bg-neutral-100 items-center justify-center"
          >
            <MaterialCommunityIcons name="close" size={18} color="#616161" />
          </TouchableOpacity>
        </View>

        {/* Name field */}
        <Text
          variant="label"
          weight="semibold"
          className="text-neutral-500 uppercase tracking-wider mb-2"
        >
          Nome *
        </Text>
        <View
          className={`flex-row items-center bg-neutral-50 border rounded-xl px-4 py-3 mb-1 ${
            nameError ? 'border-danger-400' : 'border-neutral-200'
          }`}
        >
          <View
            style={{
              width: 12,
              height: 12,
              borderRadius: 6,
              backgroundColor: selectedColor,
              marginRight: 10,
            }}
          />
          <TextInput
            className="flex-1 text-base text-neutral-900"
            placeholder="Ex: Urgente, Recorrente..."
            placeholderTextColor="#9E9E9E"
            value={name}
            onChangeText={v => {
              setName(v);
              if (nameError) setNameError('');
            }}
            autoCapitalize="words"
            maxLength={50}
            autoFocus
          />
        </View>
        {nameError ? (
          <Text variant="caption" className="text-danger-600 mb-3">
            {nameError}
          </Text>
        ) : (
          <View className="mb-4" />
        )}

        {/* Color picker */}
        <Text
          variant="label"
          weight="semibold"
          className="text-neutral-500 uppercase tracking-wider mb-3"
        >
          Cor
        </Text>
        <View className="flex-row flex-wrap gap-3 mb-6">
          {PRESET_COLORS.map(({ hex }) => (
            <TouchableOpacity
              key={hex}
              onPress={() => setSelectedColor(hex)}
              activeOpacity={0.8}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: hex,
                borderWidth: selectedColor === hex ? 3 : 0,
                borderColor: '#ffffff',
                shadowColor: selectedColor === hex ? hex : 'transparent',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: selectedColor === hex ? 0.5 : 0,
                shadowRadius: 4,
                elevation: selectedColor === hex ? 4 : 0,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {selectedColor === hex && (
                <MaterialCommunityIcons
                  name="check"
                  size={18}
                  color="#ffffff"
                />
              )}
            </TouchableOpacity>
          ))}
        </View>

        <Button
          label={isPending ? 'Criando...' : 'Criar Tag'}
          variant="primary"
          size="lg"
          fullWidth
          loading={isPending}
          onPress={handleSubmit}
        />
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}
