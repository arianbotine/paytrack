import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from 'react';
import { View, TouchableOpacity } from 'react-native';
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text } from '@shared/components/Text';
import { Button } from '@shared/components/Button';
import { StatusBadge } from '@shared/components/StatusBadge';
import { EmptyState } from '@shared/components/EmptyState';
import { LoadingState } from '@shared/components/LoadingState';
import { formatDate } from '@lib/formatters';
import { useInstallmentItems } from '../use-installment-items';
import { useInstallmentItemMutations } from '../use-installment-item-mutations';
import { InstallmentItemsBudgetBar } from './InstallmentItemsBudgetBar';
import { InstallmentItemCard } from './InstallmentItemCard';
import { AddEditItemSheet } from './AddEditItemSheet';
import type {
  InstallmentItem,
  PayableInstallment,
  CreateInstallmentItemInput,
  UpdateInstallmentItemInput,
} from '@lib/types';

interface InstallmentItemsSheetProps {
  visible: boolean;
  onClose: () => void;
  payableId: string;
  installment: PayableInstallment | null;
  totalInstallments: number;
  vendorName: string | null;
}

export function InstallmentItemsSheet({
  visible,
  onClose,
  payableId,
  installment,
  totalInstallments,
  vendorName,
}: InstallmentItemsSheetProps) {
  const sheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['92%'], []);

  const [addEditSheetOpen, setAddEditSheetOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InstallmentItem | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);

  const installmentId = installment?.id;

  const { data, isLoading } = useInstallmentItems(
    payableId,
    installmentId,
    visible && !!installmentId
  );

  const { createMutation, updateMutation, deleteMutation } =
    useInstallmentItemMutations();

  useEffect(() => {
    if (visible) {
      sheetRef.current?.present();
    } else {
      sheetRef.current?.dismiss();
      setAddEditSheetOpen(false);
      setEditingItem(null);
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

  function openAdd() {
    setEditingItem(null);
    setAddEditSheetOpen(true);
  }

  function openEdit(item: InstallmentItem) {
    setEditingItem(item);
    setAddEditSheetOpen(true);
  }

  function handleDelete(item: InstallmentItem) {
    if (!installmentId) return;
    setDeletingItemId(item.id);
    deleteMutation.mutate(
      { payableId, installmentId, itemId: item.id },
      { onSettled: () => setDeletingItemId(null) }
    );
  }

  async function handleSave(
    payload: CreateInstallmentItemInput | UpdateInstallmentItemInput
  ) {
    if (!installmentId) return;

    if (editingItem) {
      await new Promise<void>((resolve, reject) => {
        updateMutation.mutate(
          {
            payableId,
            installmentId,
            itemId: editingItem.id,
            data: payload as UpdateInstallmentItemInput,
          },
          {
            onSuccess: () => {
              setAddEditSheetOpen(false);
              resolve();
            },
            onError: err => reject(err),
          }
        );
      });
    } else {
      await new Promise<void>((resolve, reject) => {
        createMutation.mutate(
          {
            payableId,
            installmentId,
            data: payload as CreateInstallmentItemInput,
          },
          {
            onSuccess: () => {
              setAddEditSheetOpen(false);
              resolve();
            },
            onError: err => reject(err),
          }
        );
      });
    }
  }

  const items = data?.data ?? [];
  const summary = data?.summary ?? {
    installmentAmount: installment?.amount ?? 0,
    itemsTotal: 0,
    remainingAmountForItems: installment?.amount ?? 0,
  };

  // Remaining installments after current one (for split count limit)
  const remainingInstallments = installment
    ? totalInstallments - installment.installmentNumber
    : 0;

  const isMutating =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending;

  return (
    <>
      <BottomSheetModal
        ref={sheetRef}
        onDismiss={onClose}
        enableDynamicSizing={false}
        snapPoints={snapPoints}
        backdropComponent={renderBackdrop}
      >
        <BottomSheetScrollView
          contentContainerStyle={{ paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View className="px-5 pt-2 pb-4 border-b border-neutral-100">
            <View className="flex-row items-center justify-between mb-1">
              <View className="flex-1 mr-3">
                <Text
                  variant="subheading"
                  weight="semibold"
                  className="text-neutral-900"
                  numberOfLines={1}
                >
                  Parcela {installment?.installmentNumber ?? '?'}/
                  {totalInstallments}
                </Text>
                {vendorName && (
                  <Text variant="caption" className="text-neutral-500 mt-0.5">
                    {vendorName}
                  </Text>
                )}
              </View>
              <View className="flex-row items-center gap-2">
                {installment && (
                  <StatusBadge status={installment.status} variant="payable" />
                )}
                <TouchableOpacity
                  onPress={onClose}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <MaterialCommunityIcons
                    name="close"
                    size={22}
                    color="#737373"
                  />
                </TouchableOpacity>
              </View>
            </View>
            {installment && (
              <Text variant="caption" className="text-neutral-400">
                Vencimento: {formatDate(installment.dueDate)}
              </Text>
            )}
          </View>

          <View className="px-5 pt-4">
            {/* Budget bar */}
            <InstallmentItemsBudgetBar summary={summary} />

            {/* Items list */}
            {isLoading ? (
              <LoadingState message="Carregando itens..." />
            ) : items.length === 0 ? (
              <EmptyState
                icon="label-outline"
                title="Nenhum item cadastrado"
                description="Adicione itens para detalhar esta parcela."
                actionLabel="Adicionar primeiro item"
                onAction={openAdd}
              />
            ) : (
              <View>
                {items.map(item => (
                  <InstallmentItemCard
                    key={item.id}
                    item={item}
                    onEdit={openEdit}
                    onDelete={handleDelete}
                    isDeleting={deletingItemId === item.id}
                    disabled={isMutating}
                  />
                ))}
              </View>
            )}

            {/* Add button — shown when items exist */}
            {items.length > 0 && (
              <Button
                label="Adicionar item"
                leftIcon={
                  <MaterialCommunityIcons
                    name="plus"
                    size={18}
                    color="#1d4ed8"
                  />
                }
                variant="secondary"
                onPress={openAdd}
                disabled={isMutating}
                className="mt-2"
              />
            )}
          </View>
        </BottomSheetScrollView>
      </BottomSheetModal>

      {/* Add / Edit item sheet */}
      {addEditSheetOpen && (
        <AddEditItemSheet
          visible
          onClose={() => setAddEditSheetOpen(false)}
          item={editingItem}
          remainingInstallments={remainingInstallments}
          summary={summary}
          onSave={handleSave}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      )}
    </>
  );
}
