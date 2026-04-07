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

export interface PickerItem {
  id: string;
  name: string;
}

interface SearchablePickerSheetProps {
  visible: boolean;
  title: string;
  items: PickerItem[];
  isLoading?: boolean;
  onSelect: (item: PickerItem) => void;
  onCreateNew?: (name: string) => void;
  onClose: () => void;
  onSearchChange?: (search: string) => void;
  searchPlaceholder?: string;
}

export function SearchablePickerSheet({
  visible,
  title,
  items,
  isLoading = false,
  onSelect,
  onCreateNew,
  onClose,
  onSearchChange,
  searchPlaceholder = 'Buscar...',
}: SearchablePickerSheetProps) {
  const sheetRef = useRef<BottomSheetModal>(null);
  const [search, setSearch] = useState('');
  const snapPoints = useMemo(() => ['70%'], []);

  useEffect(() => {
    if (visible) {
      setSearch('');
      onSearchChange?.('');
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

  const handleSearch = (text: string) => {
    setSearch(text);
    onSearchChange?.(text);
  };

  const trimmed = search.trim();
  const showCreateNew = !!onCreateNew && trimmed.length > 0 && !isLoading;

  return (
    <BottomSheetModal
      ref={sheetRef}
      onDismiss={onClose}
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
            {title}
          </Text>
          <TouchableOpacity
            onPress={onClose}
            className="w-8 h-8 rounded-full bg-neutral-100 items-center justify-center"
          >
            <MaterialCommunityIcons name="close" size={18} color="#616161" />
          </TouchableOpacity>
        </View>

        {/* Search input */}
        <View className="flex-row items-center bg-neutral-50 border border-neutral-200 rounded-xl mx-5 mb-3 px-3 py-2.5">
          <MaterialCommunityIcons name="magnify" size={18} color="#9E9E9E" />
          <TextInput
            className="flex-1 ml-2 text-base text-neutral-900"
            placeholder={searchPlaceholder}
            placeholderTextColor="#9E9E9E"
            value={search}
            onChangeText={handleSearch}
            autoCorrect={false}
            autoCapitalize="none"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <MaterialCommunityIcons
                name="close-circle"
                size={16}
                color="#9E9E9E"
              />
            </TouchableOpacity>
          )}
        </View>

        {/* List */}
        <FlatList<PickerItem>
          data={items}
          keyExtractor={(item: PickerItem) => item.id}
          keyboardShouldPersistTaps="handled"
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: showCreateNew ? 8 : 32,
          }}
          ListEmptyComponent={
            isLoading ? (
              <View className="items-center py-8">
                <ActivityIndicator size="small" color="#4F46E5" />
              </View>
            ) : trimmed.length > 0 && !showCreateNew ? (
              <View className="items-center py-8">
                <Text variant="body" className="text-neutral-400">
                  Nenhum resultado para "{trimmed}"
                </Text>
              </View>
            ) : null
          }
          ListFooterComponent={
            showCreateNew ? (
              <View style={{ paddingBottom: 32 }}>
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
                      size={18}
                      color="#4F46E5"
                    />
                  </View>
                  <Text
                    variant="body"
                    className="text-primary-700 flex-1"
                    weight="semibold"
                  >
                    Criar "{trimmed}"
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null
          }
          renderItem={({ item }: { item: PickerItem }) => (
            <TouchableOpacity
              onPress={() => {
                onSelect(item);
                onClose();
              }}
              className="flex-row items-center py-3.5 border-b border-neutral-100"
              activeOpacity={0.7}
            >
              <View className="w-8 h-8 rounded-full bg-neutral-100 items-center justify-center mr-3">
                <MaterialCommunityIcons
                  name="account-outline"
                  size={16}
                  color="#616161"
                />
              </View>
              <Text variant="body" className="text-neutral-800 flex-1">
                {item.name}
              </Text>
              <MaterialCommunityIcons
                name="chevron-right"
                size={18}
                color="#BDBDBD"
              />
            </TouchableOpacity>
          )}
        />
      </View>
    </BottomSheetModal>
  );
}
