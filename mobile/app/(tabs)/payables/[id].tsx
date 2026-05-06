import { useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScreenContainer } from '../../../src/shared/components/ScreenContainer';
import { Text } from '../../../src/shared/components/Text';
import { Card } from '../../../src/shared/components/Card';
import { StatusBadge } from '../../../src/shared/components/StatusBadge';
import { CurrencyDisplay } from '../../../src/shared/components/CurrencyDisplay';
import { TagChip } from '../../../src/shared/components/TagChip';
import { LoadingState } from '../../../src/shared/components/LoadingState';
import { EmptyState } from '../../../src/shared/components/EmptyState';
import { PaymentModal } from '../../../src/shared/components/PaymentModal';
import { EditInstallmentSheet } from '../../../src/shared/components/EditInstallmentSheet';
import { InstallmentItemsSheet } from '../../../src/features/payables/components/InstallmentItemsSheet';
import { usePayable } from '../../../src/features/payables/use-payable';
import { usePayInstallment } from '../../../src/features/payables/use-pay-installment';
import { useUpdatePayableInstallment } from '../../../src/features/payables/use-update-payable-installment';
import { formatDate, formatCurrency } from '../../../src/lib/formatters';
import type { PayableInstallment } from '../../../src/lib/types';

const STATUS_ORDER: Record<string, number> = {
  PENDING: 0,
  PARTIAL: 1,
  PAID: 2,
};

export default function PayableDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    data: payable,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = usePayable(id);

  const [payingInstallment, setPayingInstallment] =
    useState<PayableInstallment | null>(null);
  const [editingInstallment, setEditingInstallment] =
    useState<PayableInstallment | null>(null);
  const [itemsInstallment, setItemsInstallment] =
    useState<PayableInstallment | null>(null);

  const payMutation = usePayInstallment(() => setPayingInstallment(null));
  const updateInstallmentMutation = useUpdatePayableInstallment(() =>
    setEditingInstallment(null)
  );

  if (isLoading) {
    return (
      <ScreenContainer>
        <LoadingState fullScreen message="Carregando conta..." />
      </ScreenContainer>
    );
  }

  if (isError || !payable) {
    return (
      <ScreenContainer>
        <View className="flex-row items-center px-0 pt-2 pb-4">
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            className="mr-3"
          >
            <MaterialCommunityIcons
              name="arrow-left"
              size={24}
              color="#525252"
            />
          </TouchableOpacity>
        </View>
        <EmptyState
          icon="wifi-off"
          title="Erro ao carregar"
          description="Não foi possível buscar os dados da conta."
          actionLabel="Tentar novamente"
          onAction={() => refetch()}
        />
      </ScreenContainer>
    );
  }

  const totalInstallments = payable.installments.length;
  const paidCount = payable.installments.filter(
    i => i.status === 'PAID'
  ).length;
  const vendorName = payable.vendor?.name ?? null;

  return (
    <ScreenContainer withoutPadding>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isFetching && !isLoading}
            onRefresh={() => refetch()}
            colors={['#1976d2']}
            tintColor="#1976d2"
          />
        }
      >
        {/* Top bar */}
        <View className="flex-row items-center px-4 pt-4 pb-2">
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            className="mr-3 p-1 rounded-lg bg-neutral-100 active:bg-neutral-200"
          >
            <MaterialCommunityIcons
              name="arrow-left"
              size={22}
              color="#525252"
            />
          </TouchableOpacity>
          <Text
            variant="subheading"
            weight="semibold"
            className="text-neutral-900 flex-1"
            numberOfLines={1}
          >
            {vendorName ?? 'Sem fornecedor'}
          </Text>
          <StatusBadge status={payable.status} variant="payable" />
        </View>

        {/* Summary card */}
        <View className="px-4 mb-4">
          <Card variant="elevated" padding="md">
            <View className="flex-row items-start justify-between mb-3">
              <View className="flex-1">
                <Text variant="caption" className="text-neutral-400 mb-0.5">
                  Fornecedor
                </Text>
                <Text
                  variant="body"
                  weight="semibold"
                  className="text-neutral-900"
                >
                  {vendorName ?? 'Não informado'}
                </Text>
              </View>
              {payable.category && (
                <View className="ml-4 items-end">
                  <Text variant="caption" className="text-neutral-400 mb-0.5">
                    Categoria
                  </Text>
                  <Text variant="body" className="text-neutral-700">
                    {payable.category.name}
                  </Text>
                </View>
              )}
            </View>

            <View className="flex-row items-center justify-between mb-3">
              <View>
                <Text variant="caption" className="text-neutral-400 mb-0.5">
                  Total
                </Text>
                <CurrencyDisplay
                  value={payable.amount}
                  variant="default"
                  textVariant="subheading"
                  weight="bold"
                />
              </View>
              <View className="items-end">
                <Text variant="caption" className="text-neutral-400 mb-0.5">
                  Parcelas
                </Text>
                <Text
                  variant="body"
                  weight="semibold"
                  className="text-neutral-700"
                >
                  {paidCount}/{totalInstallments} pagas
                </Text>
              </View>
            </View>

            {/* Tags */}
            {payable.tags.length > 0 && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {payable.tags.map(tag => (
                  <TagChip key={tag.id} tag={tag} size="sm" />
                ))}
              </View>
            )}
          </Card>
        </View>

        {/* Installments list */}
        <View className="px-4 mb-2">
          <Text
            variant="title"
            weight="semibold"
            className="text-neutral-700 mb-3"
          >
            Parcelas
          </Text>

          {payable.installments.map(installment => (
            <InstallmentRow
              key={installment.id}
              installment={installment}
              totalInstallments={totalInstallments}
              onPay={() => setPayingInstallment(installment)}
              onEdit={() => setEditingInstallment(installment)}
              onViewItems={() => setItemsInstallment(installment)}
            />
          ))}
        </View>
      </ScrollView>

      {/* Payment modal */}
      {payingInstallment && (
        <PaymentModal
          visible
          title={`Pagar parcela ${payingInstallment.installmentNumber}/${totalInstallments}`}
          defaultAmount={payingInstallment.remaining}
          loading={payMutation.isPending}
          onClose={() => setPayingInstallment(null)}
          onConfirm={(amount, method, paymentDate) => {
            if (!id) return;
            payMutation.mutate({
              payableId: id,
              installmentId: payingInstallment.id,
              amount,
              paymentMethod: method,
              paymentDate,
            });
          }}
          confirmLabel="Registrar Pagamento"
        />
      )}

      {/* Edit installment sheet */}
      {editingInstallment && (
        <EditInstallmentSheet
          visible
          installment={editingInstallment}
          loading={updateInstallmentMutation.isPending}
          onClose={() => setEditingInstallment(null)}
          onSubmit={data => {
            if (!id) return;
            updateInstallmentMutation.mutate({
              payableId: id,
              installmentId: editingInstallment.id,
              data,
            });
          }}
        />
      )}

      {/* Installment items sheet */}
      {id && itemsInstallment && (
        <InstallmentItemsSheet
          visible
          onClose={() => setItemsInstallment(null)}
          payableId={id}
          installment={itemsInstallment}
          totalInstallments={totalInstallments}
          vendorName={vendorName}
        />
      )}
    </ScreenContainer>
  );
}

interface InstallmentRowProps {
  installment: PayableInstallment;
  totalInstallments: number;
  onPay: () => void;
  onEdit: () => void;
  onViewItems: () => void;
}

function InstallmentRow({
  installment,
  totalInstallments,
  onPay,
  onEdit,
  onViewItems,
}: InstallmentRowProps) {
  const isPaid = installment.status === 'PAID';
  const isPartial = installment.status === 'PARTIAL';
  const hasItems = (installment.lineItemsCount ?? 0) > 0;

  return (
    <Card variant="elevated" padding="none" className="mb-2 overflow-hidden">
      {/* Left accent bar when installment has items */}
      {hasItems && (
        <View
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: 3,
            backgroundColor: '#f59e0b',
            zIndex: 1,
          }}
        />
      )}
      {/* Main row — tappable to view items */}
      <TouchableOpacity
        onPress={onViewItems}
        activeOpacity={0.7}
        className="px-4 pt-3 pb-3"
      >
        <View className="flex-row items-center justify-between mb-1">
          <View className="flex-row items-center gap-2">
            <View className="w-7 h-7 rounded-full bg-neutral-100 items-center justify-center">
              <Text
                variant="caption"
                weight="bold"
                className="text-neutral-600"
              >
                {installment.installmentNumber}
              </Text>
            </View>
            <Text variant="label" className="text-neutral-400">
              Venc. {formatDate(installment.dueDate)}
            </Text>
          </View>
          <View className="flex-row items-center gap-2">
            {hasItems && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#fffbeb',
                  borderWidth: 1,
                  borderColor: '#fde68a',
                  borderRadius: 999,
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  gap: 3,
                }}
              >
                <MaterialCommunityIcons
                  name="clipboard-list-outline"
                  size={11}
                  color="#b45309"
                />
                <Text
                  variant="caption"
                  weight="semibold"
                  style={{ fontSize: 10, color: '#b45309', lineHeight: 14 }}
                >
                  {installment.lineItemsCount}
                </Text>
              </View>
            )}
            <StatusBadge status={installment.status} variant="payable" />
            <MaterialCommunityIcons
              name="chevron-right"
              size={18}
              color="#d4d4d4"
            />
          </View>
        </View>

        <View className="flex-row items-center justify-between mt-1 pl-9">
          <View>
            <CurrencyDisplay
              value={installment.amount}
              variant="default"
              textVariant="body"
              weight="semibold"
            />
            {(isPaid || isPartial) && installment.paidAmount > 0 && (
              <Text variant="caption" className="text-success-600">
                Pago: {formatCurrency(installment.paidAmount)}
              </Text>
            )}
          </View>
          {!isPaid && installment.remaining > 0 && (
            <View className="items-end">
              <Text variant="caption" className="text-neutral-400">
                Restante
              </Text>
              <Text
                variant="body"
                weight="semibold"
                className="text-danger-600"
              >
                {formatCurrency(installment.remaining)}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>

      {/* Action buttons */}
      <View className="flex-row border-t border-neutral-100">
        <TouchableOpacity
          onPress={onViewItems}
          activeOpacity={0.7}
          className="flex-1 flex-row items-center justify-center py-4 gap-1.5"
          style={hasItems ? { backgroundColor: '#fffbeb' } : undefined}
        >
          <MaterialCommunityIcons
            name={
              hasItems ? 'clipboard-list-outline' : 'label-multiple-outline'
            }
            size={18}
            color={hasItems ? '#b45309' : '#1976d2'}
          />
          <Text
            variant="label"
            weight="medium"
            style={{ color: hasItems ? '#b45309' : '#1976d2' }}
          >
            {hasItems ? `Itens (${installment.lineItemsCount})` : 'Itens'}
          </Text>
        </TouchableOpacity>

        {!isPaid && (
          <>
            <View className="w-px bg-neutral-100" />
            <TouchableOpacity
              onPress={onEdit}
              className="flex-1 flex-row items-center justify-center py-4 gap-1.5 active:bg-neutral-50"
            >
              <MaterialCommunityIcons
                name="pencil-outline"
                size={18}
                color="#525252"
              />
              <Text
                variant="label"
                weight="medium"
                className="text-neutral-600"
              >
                Editar
              </Text>
            </TouchableOpacity>

            <View className="w-px bg-neutral-100" />

            <TouchableOpacity
              onPress={onPay}
              className="flex-1 flex-row items-center justify-center py-4 gap-1.5 active:bg-danger-50"
            >
              <MaterialCommunityIcons
                name="cash-fast"
                size={18}
                color="#dc2626"
              />
              <Text variant="label" weight="medium" className="text-danger-600">
                Pagar
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </Card>
  );
}
