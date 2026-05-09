import React from 'react';
import { View, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text } from '@shared/components/Text';
import { TagChip } from '@shared/components/TagChip';
import { CurrencyDisplay } from '@shared/components/CurrencyDisplay';
import type { InstallmentItem } from '@lib/types';

interface InstallmentItemCardProps {
  item: InstallmentItem;
  onEdit: (item: InstallmentItem) => void;
  onDelete: (item: InstallmentItem) => void;
  isDeleting?: boolean;
  disabled?: boolean;
}

export function InstallmentItemCard({
  item,
  onEdit,
  onDelete,
  isDeleting = false,
  disabled = false,
}: InstallmentItemCardProps) {
  const isSplit =
    item.splitIndex != null && item.splitTotal != null && item.splitTotal > 1;

  function handleDelete() {
    const splitWarning = isSplit
      ? `\n\nAtenção: este é um item distribuído em ${item.splitTotal} parcelas. Todas as cópias serão excluídas.`
      : '';

    Alert.alert(
      'Excluir item',
      `Deseja excluir "${item.description}"?${splitWarning}`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => onDelete(item),
        },
      ]
    );
  }

  return (
    <View className="bg-white rounded-xl border border-neutral-100 px-4 py-3 mb-2 shadow-sm">
      {/* Top row: description + amount */}
      <View className="flex-row items-start justify-between mb-1.5">
        <View className="flex-1 mr-3">
          <Text
            variant="body"
            weight="semibold"
            className="text-neutral-900"
            numberOfLines={2}
          >
            {item.description}
          </Text>
          {isSplit && (
            <View className="flex-row items-center mt-0.5">
              <MaterialCommunityIcons
                name="content-copy"
                size={11}
                color="#d97706"
              />
              <Text variant="caption" className="text-warning-600 ml-1">
                Parcela {item.splitIndex}/{item.splitTotal}
              </Text>
            </View>
          )}
        </View>
        <CurrencyDisplay
          value={item.amount}
          variant="expense"
          textVariant="body"
          weight="bold"
        />
      </View>

      {/* Tags row */}
      {item.tags.length > 0 && (
        <View
          style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}
          className="mb-1.5"
        >
          {item.tags.map(tag => (
            <TagChip key={tag.id} tag={tag} size="sm" />
          ))}
        </View>
      )}

      {/* Category chip */}
      {item.category && (
        <View className="flex-row items-center mb-1.5">
          <MaterialCommunityIcons
            name="shape-outline"
            size={12}
            color="#737373"
          />
          <Text variant="caption" className="text-neutral-500 ml-1">
            {item.category.name}
          </Text>
        </View>
      )}

      {/* Action buttons */}
      <View className="flex-row justify-end items-center gap-2 mt-1">
        {isDeleting ? (
          <ActivityIndicator size="small" color="#9e9e9e" />
        ) : (
          <>
            <TouchableOpacity
              onPress={() => !disabled && onEdit(item)}
              disabled={disabled}
              className="p-1.5 rounded-lg bg-neutral-100 active:bg-neutral-200"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialCommunityIcons
                name="pencil-outline"
                size={18}
                color={disabled ? '#d4d4d4' : '#525252'}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleDelete}
              disabled={disabled}
              className="p-1.5 rounded-lg bg-danger-50 active:bg-danger-100"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialCommunityIcons
                name="trash-can-outline"
                size={18}
                color={disabled ? '#d4d4d4' : '#ef4444'}
              />
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}
