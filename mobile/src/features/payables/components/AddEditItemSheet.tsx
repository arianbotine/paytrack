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
  BottomSheetBackdrop,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text } from '@shared/components/Text';
import { Button } from '@shared/components/Button';
import { TagPickerSheet } from '@shared/components/TagPickerSheet';
import { TagChip } from '@shared/components/TagChip';
import { CreateTagSheet } from '@shared/components/CreateTagSheet';
import { SearchablePickerSheet } from '@shared/components/SearchablePickerSheet';
import { CreateCategorySheet } from '../../categories/components/CreateCategorySheet';
import { useTags } from '../../tags/use-tags';
import { useCategories } from '../../categories/use-categories';
import type {
  InstallmentItem,
  Tag,
  Category,
  CreateInstallmentItemInput,
  UpdateInstallmentItemInput,
  InstallmentItemsSummary,
} from '@lib/types';

interface AddEditItemSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Pass an item to edit; omit for "add" mode. */
  item?: InstallmentItem | null;
  /** Number of installments after the current one (for split validation). */
  remainingInstallments?: number;
  /** Summary to show remaining capacity. */
  summary?: InstallmentItemsSummary;
  onSave: (
    data: CreateInstallmentItemInput | UpdateInstallmentItemInput
  ) => Promise<void>;
  isLoading?: boolean;
}

function parseCurrencyInput(raw: string): number {
  return parseFloat(raw.replace(',', '.')) || 0;
}

export function AddEditItemSheet({
  visible,
  onClose,
  item,
  remainingInstallments = 0,
  summary,
  onSave,
  isLoading = false,
}: AddEditItemSheetProps) {
  const isEditMode = !!item;
  const sheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['85%'], []);

  // Form state
  const [description, setDescription] = useState('');
  const [amountRaw, setAmountRaw] = useState('');
  const [splitCount, setSplitCount] = useState(1);
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [tagPickerOpen, setTagPickerOpen] = useState(false);
  const [createTagOpen, setCreateTagOpen] = useState(false);
  const [pendingTagName, setPendingTagName] = useState('');
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
  const [createCategoryOpen, setCreateCategoryOpen] = useState(false);
  const [pendingCategoryName, setPendingCategoryName] = useState('');
  const [errors, setErrors] = useState<{
    description?: string;
    amount?: string;
    split?: string;
  }>({});

  const { data: tagsData } = useTags();
  const allTags: Tag[] = tagsData?.items ?? [];

  const { data: categoriesData, isLoading: categoriesLoading } = useCategories('PAYABLE');
  const categoryItems = (categoriesData?.items ?? []).map(c => ({
    id: c.id,
    name: c.name,
  }));

  // Populate form when editing
  useEffect(() => {
    if (visible) {
      if (item) {
        setDescription(item.description);
        setAmountRaw(item.amount.toFixed(2).replace('.', ','));
        setSelectedTags(item.tags);
        setSplitCount(1);
        // Populate category if present
        if (item.category) {
          setSelectedCategory({ id: item.category.id, name: item.category.name, type: 'PAYABLE', color: item.category.color ?? '#6B7280' });
        } else {
          setSelectedCategory(null);
        }
      } else {
        setDescription('');
        setAmountRaw('');
        setSelectedTags([]);
        setSplitCount(1);
        setSelectedCategory(null);
      }
      setErrors({});
      sheetRef.current?.present();
    } else {
      sheetRef.current?.dismiss();
    }
  }, [visible, item]);

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

  function validate(): boolean {
    const newErrors: typeof errors = {};
    const trimmedDesc = description.trim();
    const amount = parseCurrencyInput(amountRaw);

    if (!trimmedDesc) {
      newErrors.description = 'Descrição é obrigatória';
    }
    if (amount <= 0) {
      newErrors.amount = 'Informe um valor maior que zero';
    }
    if (
      !isEditMode &&
      splitCount > 1 &&
      splitCount > remainingInstallments + 1
    ) {
      newErrors.split = `Existem apenas ${remainingInstallments + 1} parcela(s) disponível(is) a partir desta`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSave(forceAdjust = false) {
    if (!validate()) return;

    const amount = parseCurrencyInput(amountRaw);
    const tagIds = selectedTags.map(t => t.id);

    try {
      if (isEditMode) {
        const payload: UpdateInstallmentItemInput = {
          description: description.trim(),
          amount,
          tagIds,
          categoryId: selectedCategory?.id ?? null,
        };
        await onSave(payload);
      } else {
        const payload: CreateInstallmentItemInput = {
          description: description.trim(),
          amount,
          tagIds: tagIds.length > 0 ? tagIds : undefined,
          categoryId: selectedCategory?.id,
          splitCount: splitCount > 1 ? splitCount : undefined,
          forceAdjustInstallmentAmount: forceAdjust || undefined,
        };
        await onSave(payload);
      }
    } catch (error: unknown) {
      const code = (error as { response?: { data?: { code?: string } } })
        ?.response?.data?.code;

      if (code === 'INSTALLMENT_CAPACITY_EXCEEDED') {
        Alert.alert(
          'Capacidade excedida',
          'O valor do item ultrapassa o disponível na(s) parcela(s). Deseja ajustar automaticamente os valores das parcelas?',
          [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Ajustar e salvar',
              onPress: () => handleSave(true),
            },
          ]
        );
        return;
      }
      if (code === 'PAID_INSTALLMENT_CANNOT_BE_ADJUSTED') {
        Alert.alert(
          'Parcela paga',
          'Não é possível ajustar o valor de uma parcela que já foi paga.'
        );
        return;
      }
      Alert.alert('Erro', 'Não foi possível salvar o item. Tente novamente.');
    }
  }

  const isSplitItem =
    isEditMode && item && item.splitTotal != null && item.splitTotal > 1;

  return (
    <>
      <BottomSheetModal
        ref={sheetRef}
        onDismiss={onClose}
        enableDynamicSizing={false}
        snapPoints={snapPoints}
        backdropComponent={renderBackdrop}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
      >
        <BottomSheetScrollView
          contentContainerStyle={{ paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View className="flex-row items-center justify-between px-5 pt-2 pb-4 border-b border-neutral-100">
            <Text
              variant="subheading"
              weight="semibold"
              className="text-neutral-900"
            >
              {isEditMode ? 'Editar item' : 'Adicionar item'}
            </Text>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialCommunityIcons name="close" size={22} color="#737373" />
            </TouchableOpacity>
          </View>

          <View className="px-5 pt-5 gap-4">
            {/* Split warning in edit mode */}
            {isSplitItem && (
              <View className="bg-warning-50 rounded-xl px-4 py-3 flex-row items-start gap-2">
                <MaterialCommunityIcons
                  name="information-outline"
                  size={18}
                  color="#d97706"
                  style={{ marginTop: 1 }}
                />
                <Text variant="caption" className="text-warning-700 flex-1">
                  Este item está distribuído em {item!.splitTotal} parcelas. As
                  alterações serão aplicadas em todas elas.
                </Text>
              </View>
            )}

            {/* Budget info */}
            {summary && !isEditMode && (
              <View className="bg-neutral-50 rounded-xl px-4 py-3 flex-row justify-between">
                <Text variant="caption" className="text-neutral-500">
                  Disponível nesta parcela
                </Text>
                <Text
                  variant="caption"
                  weight="semibold"
                  className={
                    summary.remainingAmountForItems <= 0
                      ? 'text-danger-600'
                      : 'text-success-700'
                  }
                >
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  }).format(summary.remainingAmountForItems)}
                </Text>
              </View>
            )}

            {/* Description */}
            <View>
              <Text
                variant="label"
                weight="medium"
                className="text-neutral-700 mb-1.5"
              >
                Descrição *
              </Text>
              <TextInput
                value={description}
                onChangeText={text => {
                  setDescription(text);
                  if (errors.description)
                    setErrors(e => ({ ...e, description: undefined }));
                }}
                placeholder="Ex: Serviço de consultoria"
                placeholderTextColor="#a3a3a3"
                autoFocus={!isEditMode}
                className={`bg-neutral-50 border rounded-xl px-4 py-3 text-neutral-900 text-base ${
                  errors.description
                    ? 'border-danger-400'
                    : 'border-neutral-200'
                }`}
              />
              {errors.description && (
                <Text variant="caption" className="text-danger-600 mt-1">
                  {errors.description}
                </Text>
              )}
            </View>

            {/* Amount */}
            <View>
              <Text
                variant="label"
                weight="medium"
                className="text-neutral-700 mb-1.5"
              >
                Valor *
              </Text>
              <View
                className={`flex-row items-center bg-neutral-50 border rounded-xl px-4 py-3 ${
                  errors.amount ? 'border-danger-400' : 'border-neutral-200'
                }`}
              >
                <Text variant="body" className="text-neutral-400 mr-2">
                  R$
                </Text>
                <TextInput
                  value={amountRaw}
                  onChangeText={text => {
                    // Allow digits, comma, and period
                    const filtered = text.replace(/[^0-9.,]/g, '');
                    setAmountRaw(filtered);
                    if (errors.amount)
                      setErrors(e => ({ ...e, amount: undefined }));
                  }}
                  placeholder="0,00"
                  placeholderTextColor="#a3a3a3"
                  keyboardType="decimal-pad"
                  className="flex-1 text-neutral-900 text-base"
                />
              </View>
              {errors.amount && (
                <Text variant="caption" className="text-danger-600 mt-1">
                  {errors.amount}
                </Text>
              )}
            </View>

            {/* Split count (only on create) */}
            {!isEditMode && (
              <View>
                <Text
                  variant="label"
                  weight="medium"
                  className="text-neutral-700 mb-1.5"
                >
                  Distribuir em quantas parcelas?
                </Text>
                <View className="flex-row items-center gap-3">
                  <TouchableOpacity
                    onPress={() => setSplitCount(Math.max(1, splitCount - 1))}
                    disabled={splitCount <= 1}
                    className="w-10 h-10 rounded-full bg-neutral-100 items-center justify-center active:bg-neutral-200"
                  >
                    <MaterialCommunityIcons
                      name="minus"
                      size={20}
                      color={splitCount <= 1 ? '#d4d4d4' : '#525252'}
                    />
                  </TouchableOpacity>
                  <Text
                    variant="subheading"
                    weight="semibold"
                    className="text-neutral-900 w-8 text-center"
                  >
                    {splitCount}
                  </Text>
                  <TouchableOpacity
                    onPress={() =>
                      setSplitCount(
                        Math.min(remainingInstallments + 1, splitCount + 1)
                      )
                    }
                    disabled={splitCount >= remainingInstallments + 1}
                    className="w-10 h-10 rounded-full bg-neutral-100 items-center justify-center active:bg-neutral-200"
                  >
                    <MaterialCommunityIcons
                      name="plus"
                      size={20}
                      color={
                        splitCount >= remainingInstallments + 1
                          ? '#d4d4d4'
                          : '#525252'
                      }
                    />
                  </TouchableOpacity>
                  <Text variant="caption" className="text-neutral-400 flex-1">
                    {splitCount === 1
                      ? 'Apenas esta parcela'
                      : `Esta + ${splitCount - 1} próxima(s)`}
                  </Text>
                </View>
                {errors.split && (
                  <Text variant="caption" className="text-danger-600 mt-1">
                    {errors.split}
                  </Text>
                )}
              </View>
            )}

            {/* Tags */}
            <View>
              <Text
                variant="label"
                weight="medium"
                className="text-neutral-700 mb-1.5"
              >
                Tags
              </Text>
              <TouchableOpacity
                onPress={() => setTagPickerOpen(true)}
                className="flex-row items-center bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 gap-2"
              >
                {selectedTags.length === 0 ? (
                  <>
                    <MaterialCommunityIcons
                      name="tag-outline"
                      size={18}
                      color="#a3a3a3"
                    />
                    <Text variant="body" className="text-neutral-400">
                      Selecionar tags
                    </Text>
                  </>
                ) : (
                  <View
                    style={{
                      flexDirection: 'row',
                      flexWrap: 'wrap',
                      gap: 6,
                      flex: 1,
                    }}
                  >
                    {selectedTags.map(tag => (
                      <TagChip key={tag.id} tag={tag} size="sm" />
                    ))}
                  </View>
                )}
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={18}
                  color="#a3a3a3"
                />
              </TouchableOpacity>
            </View>

            {/* Category */}
            <View>
              <Text
                variant="label"
                weight="medium"
                className="text-neutral-700 mb-1.5"
              >
                Categoria
              </Text>
              <TouchableOpacity
                onPress={() => setCategoryPickerOpen(true)}
                className="flex-row items-center bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3"
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons
                  name="shape-outline"
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

            {/* Save button */}
            <Button
              label={isEditMode ? 'Salvar alterações' : 'Adicionar item'}
              onPress={() => handleSave(false)}
              loading={isLoading}
              disabled={isLoading}
              variant="primary"
              className="mt-2"
            />
          </View>
        </BottomSheetScrollView>
      </BottomSheetModal>

      {/* Tag picker */}
      {tagPickerOpen && (
        <TagPickerSheet
          visible
          tags={allTags}
          selectedIds={selectedTags.map(t => t.id)}
          onConfirm={ids => {
            setSelectedTags(allTags.filter(t => ids.includes(t.id)));
            setTagPickerOpen(false);
          }}
          onCreateNew={name => {
            setPendingTagName(name);
            setTagPickerOpen(false);
            setCreateTagOpen(true);
          }}
          onClose={() => setTagPickerOpen(false)}
        />
      )}

      {/* Create tag */}
      {createTagOpen && (
        <CreateTagSheet
          visible
          initialName={pendingTagName}
          onClose={() => setCreateTagOpen(false)}
          onCreated={newTag => {
            setSelectedTags(prev => [...prev, newTag]);
            setCreateTagOpen(false);
          }}
        />
      )}

      {/* Category picker */}
      {categoryPickerOpen && (
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
            setCategoryPickerOpen(false);
          }}
          onCreateNew={name => {
            setCategoryPickerOpen(false);
            setPendingCategoryName(name);
            setCreateCategoryOpen(true);
          }}
          onClose={() => setCategoryPickerOpen(false)}
        />
      )}

      {/* Create category */}
      {createCategoryOpen && (
        <CreateCategorySheet
          visible
          initialName={pendingCategoryName}
          type="PAYABLE"
          onCreated={category => {
            setSelectedCategory(category);
            setCreateCategoryOpen(false);
          }}
          onClose={() => setCreateCategoryOpen(false)}
        />
      )}
    </>
  );
}
