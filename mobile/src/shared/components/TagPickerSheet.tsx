import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { BottomSheetModal, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text } from './Text';
import { Button } from './Button';
import type { Tag } from '@lib/types';

interface TagPickerSheetProps {
  visible: boolean;
  tags: Tag[];
  isLoading?: boolean;
  selectedIds: string[];
  onConfirm: (ids: string[]) => void;
  onCreateNew: (name: string) => void;
  onClose: () => void;
}

/**
 * Bottom sheet for multi-selecting tags.
 * Shows a search input, scrollable list of tags with toggle selection,
 * and bottom action bar with "Nova tag" + "Confirmar" buttons.
 * Selection is local until Confirmar is tapped.
 */
export function TagPickerSheet({
  visible,
  tags,
  isLoading = false,
  selectedIds,
  onConfirm,
  onCreateNew,
  onClose,
}: TagPickerSheetProps) {
  const sheetRef = useRef<BottomSheetModal>(null);
  const [search, setSearch] = useState('');
  const [pending, setPending] = useState<string[]>([]);
  const snapPoints = useMemo(() => ['70%'], []);

  useEffect(() => {
    if (visible) {
      setSearch('');
      setPending(selectedIds);
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

  const handleConfirm = () => {
    onConfirm(pending);
    sheetRef.current?.dismiss();
  };

  const toggle = (id: string) => {
    setPending(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const trimmed = search.trim();
  const showCreateNew = trimmed.length > 0 && !isLoading;

  const filtered = trimmed
    ? tags.filter(t => t.name.toLowerCase().includes(trimmed.toLowerCase()))
    : tags;

  return (
    <BottomSheetModal
      ref={sheetRef}
      onDismiss={onClose}
      enableDynamicSizing={false}
      snapPoints={snapPoints}
      backdropComponent={renderBackdrop}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      handleIndicatorStyle={{ backgroundColor: '#e0e0e0', width: 40 }}
    >
      <View style={{ flex: 1 }}>
        {/* Header */}
        <View className="flex-row items-center justify-between px-5 pt-2 pb-3">
          <Text
            variant="subheading"
            weight="bold"
            className="text-neutral-900 flex-1 mr-3"
          >
            Selecionar Tags
          </Text>
          <TouchableOpacity
            onPress={onClose}
            className="w-8 h-8 rounded-full bg-neutral-100 items-center justify-center"
          >
            <MaterialCommunityIcons name="close" size={18} color="#616161" />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View className="flex-row items-center bg-neutral-50 border border-neutral-200 rounded-xl mx-5 mb-3 px-3 py-2.5">
          <MaterialCommunityIcons name="magnify" size={18} color="#9E9E9E" />
          <TextInput
            className="flex-1 ml-2 text-base text-neutral-900"
            placeholder="Buscar tag..."
            placeholderTextColor="#9E9E9E"
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
            autoCapitalize="none"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <MaterialCommunityIcons
                name="close-circle"
                size={16}
                color="#9E9E9E"
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Tag list */}
        <FlatList<Tag>
          data={isLoading ? [] : filtered}
          keyExtractor={(item: Tag) => item.id}
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: showCreateNew ? 8 : 0,
          }}
          ListEmptyComponent={
            isLoading ? (
              <View className="items-center py-8">
                <ActivityIndicator color="#4F46E5" />
              </View>
            ) : (
              <Text
                variant="body"
                className="text-neutral-400 text-center py-6"
              >
                {tags.length === 0
                  ? 'Nenhuma tag cadastrada'
                  : 'Nenhuma tag encontrada'}
              </Text>
            )
          }
          ListFooterComponent={
            showCreateNew ? (
              <View style={{ paddingBottom: 8 }}>
                <TouchableOpacity
                  onPress={() => {
                    onCreateNew(trimmed);
                    onClose();
                  }}
                  className="flex-row items-center py-4 mt-1 border-t border-neutral-100"
                  activeOpacity={0.7}
                >
                  <View className="w-8 h-8 rounded-full bg-primary-50 items-center justify-center mr-3">
                    <MaterialCommunityIcons
                      name="plus"
                      size={16}
                      color="#4F46E5"
                    />
                  </View>
                  <Text variant="body" className="text-primary-700 flex-1">
                    Criar tag{' '}
                    <Text
                      variant="body"
                      weight="semibold"
                      className="text-primary-700"
                    >
                      "{trimmed}"
                    </Text>
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null
          }
          renderItem={({ item }: { item: Tag }) => {
            const selected = pending.includes(item.id);
            return (
              <TouchableOpacity
                onPress={() => toggle(item.id)}
                activeOpacity={0.7}
                className="flex-row items-center py-3 border-b border-neutral-100"
              >
                {/* Color dot */}
                <View
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 6,
                    backgroundColor: item.color,
                    marginRight: 12,
                  }}
                />
                <Text variant="body" className="text-neutral-800 flex-1">
                  {item.name}
                </Text>
                {/* Selection indicator */}
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    borderWidth: 2,
                    borderColor: selected ? '#4F46E5' : '#d4d4d4',
                    backgroundColor: selected ? '#4F46E5' : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {selected && (
                    <MaterialCommunityIcons
                      name="check"
                      size={13}
                      color="#ffffff"
                    />
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
        />

        {/* Bottom actions */}
        <View className="px-5 pt-3 pb-6">
          <Button
            label={
              pending.length > 0 ? `Confirmar (${pending.length})` : 'Confirmar'
            }
            variant="primary"
            size="md"
            fullWidth
            onPress={handleConfirm}
          />
        </View>
      </View>
    </BottomSheetModal>
  );
}
