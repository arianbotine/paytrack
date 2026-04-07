import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from 'react';
import { View, TextInput, TouchableOpacity, Alert } from 'react-native';
import {
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetBackdrop,
} from '@gorhom/bottom-sheet';
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text } from '@shared/components/Text';
import { Button } from '@shared/components/Button';
import { CalendarPicker } from '@shared/components/CalendarPicker';
import { SearchablePickerSheet } from '@shared/components/SearchablePickerSheet';
import { TagPickerSheet } from '@shared/components/TagPickerSheet';
import { TagChip } from '@shared/components/TagChip';
import { CreateTagSheet } from '@shared/components/CreateTagSheet';
import { CreateVendorSheet } from '../../vendors/components/CreateVendorSheet';
import { useVendors } from '../../vendors/use-vendors';
import { useCategories } from '../../categories/use-categories';
import { useTags } from '../../tags/use-tags';
import { useCreatePayable } from '../use-create-payable';
import type { Vendor, Category, Tag } from '@lib/types';

function todayIso(): string {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
}

function isoToDisplay(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

const schema = z.object({
  amount: z
    .string()
    .min(1, 'Valor é obrigatório')
    .refine(
      v => parseFloat(v.replace(',', '.')) > 0,
      'Informe um valor maior que zero'
    ),
  installmentCount: z.number().int().min(1).max(120),
  notes: z.string().max(500).optional().or(z.literal('')),
});

type FormData = z.infer<typeof schema>;

const QUICK_INSTALLMENTS = [1, 2, 3, 6, 12];

interface CreatePayableSheetProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CreatePayableSheet({
  visible,
  onClose,
  onSuccess,
}: CreatePayableSheetProps) {
  const sheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['92%'], []);

  // Vendor picker
  const [vendorSearch, setVendorSearch] = useState('');
  const [vendorPickerOpen, setVendorPickerOpen] = useState(false);
  const [createVendorOpen, setCreateVendorOpen] = useState(false);
  const [pendingVendorName, setPendingVendorName] = useState('');
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [vendorError, setVendorError] = useState('');

  // Category picker
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null
  );

  // Tag picker
  const [tagPickerOpen, setTagPickerOpen] = useState(false);
  const [createTagOpen, setCreateTagOpen] = useState(false);
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);

  // Due date
  const [firstDueDate, setFirstDueDate] = useState(todayIso());
  const [showCalendar, setShowCalendar] = useState(false);

  const { data: vendorsData, isLoading: vendorsLoading } =
    useVendors(vendorSearch);
  const { data: categoriesData, isLoading: categoriesLoading } =
    useCategories('PAYABLE');
  const { data: tagsData, isLoading: tagsLoading } = useTags();
  const { mutate, isPending } = useCreatePayable();

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { amount: '', installmentCount: 1, notes: '' },
  });

  const installmentCount = watch('installmentCount');

  useEffect(() => {
    if (visible) {
      reset({ amount: '', installmentCount: 1, notes: '' });
      setSelectedVendor(null);
      setSelectedCategory(null);
      setSelectedTags([]);
      setFirstDueDate(todayIso());
      setShowCalendar(false);
      setVendorError('');
      setVendorSearch('');
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

  const onSubmit = (data: FormData) => {
    if (!selectedVendor) {
      setVendorError('Selecione ou crie um credor');
      return;
    }
    setVendorError('');

    mutate(
      {
        vendorId: selectedVendor.id,
        amount: parseFloat(data.amount.replace(',', '.')),
        firstDueDate,
        installmentCount: data.installmentCount,
        categoryId: selectedCategory?.id,
        notes: data.notes || undefined,
        tagIds:
          selectedTags.length > 0 ? selectedTags.map(t => t.id) : undefined,
      },
      {
        onSuccess: () => {
          onSuccess?.();
          sheetRef.current?.dismiss();
        },
        onError: () => {
          Alert.alert(
            'Erro',
            'Não foi possível criar a conta. Tente novamente.'
          );
        },
      }
    );
  };

  const vendorItems = (vendorsData?.items ?? []).map(v => ({
    id: v.id,
    name: v.name,
  }));

  const categoryItems = (categoriesData?.items ?? []).map(c => ({
    id: c.id,
    name: c.name,
  }));

  return (
    <>
      <BottomSheetModal
        ref={sheetRef}
        onDismiss={onClose}
        snapPoints={snapPoints}
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
            <View className="flex-row items-center flex-1 mr-3">
              <View className="w-9 h-9 rounded-xl bg-danger-50 items-center justify-center mr-3">
                <MaterialCommunityIcons
                  name="arrow-up-circle-outline"
                  size={20}
                  color="#DC2626"
                />
              </View>
              <Text
                variant="subheading"
                weight="bold"
                className="text-neutral-900"
              >
                Nova Conta a Pagar
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              className="w-8 h-8 rounded-full bg-neutral-100 items-center justify-center"
            >
              <MaterialCommunityIcons name="close" size={18} color="#616161" />
            </TouchableOpacity>
          </View>

          {/* Fornecedor */}
          <Text
            variant="label"
            weight="semibold"
            className="text-neutral-500 uppercase tracking-wider mb-2"
          >
            Credor *
          </Text>
          <TouchableOpacity
            onPress={() => setVendorPickerOpen(true)}
            className={`flex-row items-center bg-neutral-50 border rounded-xl px-4 py-3 mb-1 ${
              vendorError ? 'border-danger-400' : 'border-neutral-200'
            }`}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name={
                selectedVendor ? 'store-check-outline' : 'store-search-outline'
              }
              size={18}
              color={selectedVendor ? '#4F46E5' : '#9E9E9E'}
            />
            <Text
              variant="body"
              className={`flex-1 ml-2 ${selectedVendor ? 'text-neutral-900' : 'text-neutral-400'}`}
            >
              {selectedVendor ? selectedVendor.name : 'Selecionar credor'}
            </Text>
            {selectedVendor ? (
              <TouchableOpacity
                onPress={e => {
                  e.stopPropagation();
                  setSelectedVendor(null);
                }}
              >
                <MaterialCommunityIcons
                  name="close-circle"
                  size={16}
                  color="#9E9E9E"
                />
              </TouchableOpacity>
            ) : (
              <MaterialCommunityIcons
                name="chevron-down"
                size={18}
                color="#9E9E9E"
              />
            )}
          </TouchableOpacity>
          {vendorError ? (
            <Text variant="caption" className="text-danger-600 mb-3">
              {vendorError}
            </Text>
          ) : null}

          {/* Valor */}
          <View className="mt-3">
            <Text
              variant="label"
              weight="semibold"
              className="text-neutral-500 uppercase tracking-wider mb-2"
            >
              Valor *
            </Text>
            <View className="flex-row items-center bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3">
              <Text
                variant="subheading"
                weight="semibold"
                className="text-neutral-500 mr-2"
              >
                R$
              </Text>
              <Controller
                control={control}
                name="amount"
                render={({ field }) => (
                  <TextInput
                    className="flex-1 text-lg text-neutral-900"
                    placeholder="0,00"
                    placeholderTextColor="#9E9E9E"
                    value={field.value}
                    onChangeText={field.onChange}
                    keyboardType="decimal-pad"
                  />
                )}
              />
            </View>
            {errors.amount && (
              <Text variant="caption" className="text-danger-600 mt-1">
                {errors.amount.message}
              </Text>
            )}
          </View>

          {/* 1ª Data de Vencimento */}
          <View className="mt-4">
            <Text
              variant="label"
              weight="semibold"
              className="text-neutral-500 uppercase tracking-wider mb-2"
            >
              1º Vencimento *
            </Text>
            <TouchableOpacity
              onPress={() => setShowCalendar(v => !v)}
              className="flex-row items-center bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3"
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name="calendar-outline"
                size={18}
                color="#4F46E5"
              />
              <Text variant="body" className="text-neutral-900 ml-2 flex-1">
                {isoToDisplay(firstDueDate)}
              </Text>
              <MaterialCommunityIcons
                name={showCalendar ? 'chevron-up' : 'chevron-down'}
                size={18}
                color="#9E9E9E"
              />
            </TouchableOpacity>
            {showCalendar && (
              <View className="mt-2 border border-neutral-200 rounded-xl overflow-hidden bg-white p-2">
                <CalendarPicker
                  value={firstDueDate}
                  onChange={date => {
                    setFirstDueDate(date);
                    setShowCalendar(false);
                  }}
                />
              </View>
            )}
          </View>

          {/* Parcelas */}
          <View className="mt-4">
            <Text
              variant="label"
              weight="semibold"
              className="text-neutral-500 uppercase tracking-wider mb-2"
            >
              Parcelas
            </Text>
            <View className="flex-row flex-wrap gap-2 mb-2">
              {QUICK_INSTALLMENTS.map(n => (
                <TouchableOpacity
                  key={n}
                  onPress={() => setValue('installmentCount', n)}
                  className={`px-4 py-2 rounded-full border ${
                    installmentCount === n
                      ? 'bg-primary-700 border-primary-700'
                      : 'bg-white border-neutral-200'
                  }`}
                  activeOpacity={0.7}
                >
                  <Text
                    variant="label"
                    weight="semibold"
                    className={
                      installmentCount === n ? 'text-white' : 'text-neutral-600'
                    }
                  >
                    {n === 1 ? 'À vista' : `${n}x`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {!QUICK_INSTALLMENTS.includes(installmentCount) && (
              <Text variant="caption" className="text-primary-700 mb-1">
                {installmentCount}x selecionado
              </Text>
            )}
            <View className="flex-row items-center">
              <Text variant="caption" className="text-neutral-500 mr-3">
                Outro:
              </Text>
              <Controller
                control={control}
                name="installmentCount"
                render={({ field }) => (
                  <TextInput
                    className="w-20 bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-base text-neutral-900 text-center"
                    placeholder="Nº"
                    placeholderTextColor="#9E9E9E"
                    value={field.value === 0 ? '' : String(field.value)}
                    onChangeText={v => {
                      const n = parseInt(v, 10);
                      if (!isNaN(n) && n >= 1 && n <= 120) field.onChange(n);
                      else if (v === '') field.onChange(1);
                    }}
                    keyboardType="number-pad"
                  />
                )}
              />
            </View>
          </View>

          {/* Categoria (opcional) */}
          <View className="mt-4">
            <Text
              variant="label"
              weight="semibold"
              className="text-neutral-500 uppercase tracking-wider mb-2"
            >
              Categoria
            </Text>
            <TouchableOpacity
              onPress={() => setCategoryPickerOpen(true)}
              className="flex-row items-center bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3"
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name="tag-outline"
                size={18}
                color="#9E9E9E"
              />
              <Text
                variant="body"
                className={`flex-1 ml-2 ${selectedCategory ? 'text-neutral-900' : 'text-neutral-400'}`}
              >
                {selectedCategory ? selectedCategory.name : 'Opcional'}
              </Text>
              {selectedCategory ? (
                <TouchableOpacity
                  onPress={e => {
                    e.stopPropagation();
                    setSelectedCategory(null);
                  }}
                >
                  <MaterialCommunityIcons
                    name="close-circle"
                    size={16}
                    color="#9E9E9E"
                  />
                </TouchableOpacity>
              ) : (
                <MaterialCommunityIcons
                  name="chevron-down"
                  size={18}
                  color="#9E9E9E"
                />
              )}
            </TouchableOpacity>
          </View>

          {/* Observações */}
          <View className="mt-4">
            <Text
              variant="label"
              weight="semibold"
              className="text-neutral-500 uppercase tracking-wider mb-2"
            >
              Observações
            </Text>
            <Controller
              control={control}
              name="notes"
              render={({ field }) => (
                <TextInput
                  className="bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-base text-neutral-900"
                  placeholder="Opcional"
                  placeholderTextColor="#9E9E9E"
                  value={field.value}
                  onChangeText={field.onChange}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              )}
            />
          </View>

          {/* Tags */}
          <View className="mt-4 mb-6">
            <Text
              variant="label"
              weight="semibold"
              className="text-neutral-500 uppercase tracking-wider mb-2"
            >
              Tags
            </Text>
            <TouchableOpacity
              onPress={() => setTagPickerOpen(true)}
              activeOpacity={0.7}
              className="flex-row items-center bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3"
            >
              <MaterialCommunityIcons
                name="label-multiple-outline"
                size={18}
                color="#9E9E9E"
              />
              <Text
                variant="body"
                className={`flex-1 ml-2 ${
                  selectedTags.length > 0
                    ? 'text-neutral-900'
                    : 'text-neutral-400'
                }`}
              >
                {selectedTags.length === 0
                  ? 'Opcional'
                  : `${selectedTags.length} tag${selectedTags.length > 1 ? 's' : ''} selecionada${selectedTags.length > 1 ? 's' : ''}`}
              </Text>
              <MaterialCommunityIcons
                name="chevron-down"
                size={18}
                color="#9E9E9E"
              />
            </TouchableOpacity>
            {selectedTags.length > 0 && (
              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  gap: 6,
                  marginTop: 8,
                }}
              >
                {selectedTags.map(tag => (
                  <TagChip
                    key={tag.id}
                    tag={tag}
                    size="sm"
                    onRemove={() =>
                      setSelectedTags(prev => prev.filter(t => t.id !== tag.id))
                    }
                  />
                ))}
              </View>
            )}
          </View>

          <Button
            label={isPending ? 'Salvando...' : 'Salvar Conta'}
            variant="primary"
            size="lg"
            fullWidth
            loading={isPending}
            onPress={handleSubmit(onSubmit)}
          />
        </BottomSheetScrollView>
      </BottomSheetModal>

      {/* Vendor Picker */}
      <SearchablePickerSheet
        visible={vendorPickerOpen}
        title="Selecionar Credor"
        items={vendorItems}
        isLoading={vendorsLoading}
        searchPlaceholder="Buscar credor..."
        onSearchChange={setVendorSearch}
        onSelect={item => {
          setSelectedVendor({
            id: item.id,
            name: item.name,
            document: null,
            email: null,
            phone: null,
          });
          setVendorError('');
        }}
        onCreateNew={name => {
          setVendorPickerOpen(false);
          setPendingVendorName(name);
          setCreateVendorOpen(true);
        }}
        onClose={() => setVendorPickerOpen(false)}
      />

      {/* Create Vendor */}
      <CreateVendorSheet
        visible={createVendorOpen}
        initialName={pendingVendorName}
        onCreated={vendor => {
          setSelectedVendor(vendor);
          setVendorError('');
        }}
        onClose={() => setCreateVendorOpen(false)}
      />

      {/* Category Picker */}
      <SearchablePickerSheet
        visible={categoryPickerOpen}
        title="Selecionar Categoria"
        items={categoryItems}
        isLoading={categoriesLoading}
        searchPlaceholder="Buscar categoria..."
        onSelect={item => {
          const cat = categoriesData?.items.find(c => c.id === item.id);
          setSelectedCategory(
            cat ?? {
              id: item.id,
              name: item.name,
              type: 'PAYABLE',
              color: '#6B7280',
            }
          );
        }}
        onClose={() => setCategoryPickerOpen(false)}
      />

      {/* Tag Picker */}
      <TagPickerSheet
        visible={tagPickerOpen}
        tags={tagsData?.items ?? []}
        isLoading={tagsLoading}
        selectedIds={selectedTags.map(t => t.id)}
        onConfirm={ids => {
          const allTags = tagsData?.items ?? [];
          setSelectedTags(allTags.filter(t => ids.includes(t.id)));
        }}
        onCreateNew={() => setCreateTagOpen(true)}
        onClose={() => setTagPickerOpen(false)}
      />

      {/* Create Tag */}
      <CreateTagSheet
        visible={createTagOpen}
        onCreated={tag => {
          setSelectedTags(prev =>
            prev.some(t => t.id === tag.id) ? prev : [...prev, tag]
          );
          setCreateTagOpen(false);
        }}
        onClose={() => setCreateTagOpen(false)}
      />
    </>
  );
}
