import { useState } from 'react';
import {
  View,
  FlatList,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { STATUS_LABELS } from '../../src/lib/formatters';
import {
  FilterChip,
  AdvancedFilterChip,
  formatMonthYear,
} from '../../src/shared/components/FilterChip';
import { ScreenContainer } from '../../src/shared/components/ScreenContainer';
import { Text } from '../../src/shared/components/Text';
import { EmptyState } from '../../src/shared/components/EmptyState';
import { LoadingState } from '../../src/shared/components/LoadingState';
import { PaymentModal } from '../../src/shared/components/PaymentModal';
import { EditInstallmentSheet } from '../../src/shared/components/EditInstallmentSheet';
import { MonthPickerSheet } from '../../src/shared/components/MonthPickerSheet';
import { SearchablePickerSheet } from '../../src/shared/components/SearchablePickerSheet';
import { CreatePayableSheet } from '../../src/features/payables/components/CreatePayableSheet';
import { PayableCard } from '../../src/features/payables/components/PayableCard';
import {
  usePayables,
  type PayableStatusFilter,
} from '../../src/features/payables/use-payables';
import { usePayInstallment } from '../../src/features/payables/use-pay-installment';
import { usePayable } from '../../src/features/payables/use-payable';
import { useUpdatePayableInstallment } from '../../src/features/payables/use-update-payable-installment';
import { useVendors } from '../../src/features/vendors/use-vendors';
import type { PayableListItem } from '../../src/lib/types';

const FILTER_OPTIONS: { value: PayableStatusFilter; label: string }[] = [
  { value: 'ALL', label: 'Todos' },
  { value: 'PENDING', label: STATUS_LABELS.PENDING },
  { value: 'PARTIAL', label: STATUS_LABELS.PARTIAL },
  { value: 'PAID', label: STATUS_LABELS.PAID },
];

export default function PayablesScreen() {
  const [statusFilter, setStatusFilter] = useState<PayableStatusFilter>('ALL');
  const [nextDueMonth, setNextDueMonth] = useState<string | null>(null);
  const [vendorFilter, setVendorFilter] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [vendorPickerOpen, setVendorPickerOpen] = useState(false);
  const [vendorSearch, setVendorSearch] = useState('');
  const [selectedPayable, setSelectedPayable] =
    useState<PayableListItem | null>(null);
  const [editingPayable, setEditingPayable] = useState<PayableListItem | null>(
    null
  );
  const [createSheetOpen, setCreateSheetOpen] = useState(false);

  const vendorsQuery = useVendors(vendorSearch || undefined);
  const query = usePayables({
    status: statusFilter,
    nextDueMonth,
    vendorId: vendorFilter?.id ?? null,
  });
  const payMutation = usePayInstallment(() => setSelectedPayable(null));
  const payableDetailQuery = usePayable(editingPayable?.id);
  const updateInstallmentMutation = useUpdatePayableInstallment(() =>
    setEditingPayable(null)
  );

  const editingInstallment = editingPayable?.nextInstallmentId
    ? (payableDetailQuery.data?.installments.find(
        i => i.id === editingPayable.nextInstallmentId
      ) ?? null)
    : null;

  const allItems = query.data?.pages.flatMap(p => p.items) ?? [];
  const total = query.data?.pages[0]?.total ?? 0;
  const isFiltered = statusFilter !== 'ALL' || !!nextDueMonth || !!vendorFilter;

  return (
    <ScreenContainer withoutPadding>
      <FlatList
        style={{ flex: 1 }}
        automaticallyAdjustContentInsets={false}
        automaticallyAdjustsScrollIndicatorInsets={false}
        data={query.isLoading || query.isError ? [] : allItems}
        keyExtractor={item => item.id}
        ListHeaderComponent={
          <View>
            {/* Header */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 16,
                paddingTop: 16,
                paddingBottom: 8,
              }}
            >
              <Text
                variant="heading"
                weight="bold"
                className="text-neutral-900"
              >
                A Pagar
              </Text>
              {!query.isLoading && (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: isFiltered ? '#e3f2fd' : '#f5f5f5',
                    borderRadius: 12,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    gap: 4,
                  }}
                >
                  {isFiltered && (
                    <MaterialCommunityIcons
                      name="filter-check"
                      size={12}
                      color="#1976d2"
                    />
                  )}
                  <Text
                    variant="label"
                    weight="semibold"
                    style={{ color: isFiltered ? '#1976d2' : '#757575' }}
                  >
                    {total} {total === 1 ? 'conta' : 'contas'}
                  </Text>
                </View>
              )}
            </View>

            {/* Filters */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ height: 50 }}
              contentContainerStyle={{
                paddingHorizontal: 16,
                paddingTop: 8,
                paddingBottom: 8,
              }}
            >
              {FILTER_OPTIONS.map(option => (
                <FilterChip
                  key={option.value}
                  label={option.label}
                  active={statusFilter === option.value}
                  onPress={() => setStatusFilter(option.value)}
                />
              ))}
              <View
                style={{
                  width: 1,
                  height: 18,
                  backgroundColor: '#e0e0e0',
                  marginHorizontal: 6,
                  alignSelf: 'center',
                }}
              />
              <AdvancedFilterChip
                icon="calendar-month-outline"
                label={nextDueMonth ? formatMonthYear(nextDueMonth) : 'Mês'}
                active={!!nextDueMonth}
                onPress={() => setMonthPickerOpen(true)}
                onClear={() => setNextDueMonth(null)}
              />
              <AdvancedFilterChip
                icon="account-outline"
                label={vendorFilter ? vendorFilter.name : 'Credor'}
                active={!!vendorFilter}
                onPress={() => setVendorPickerOpen(true)}
                onClear={() => setVendorFilter(null)}
              />
            </ScrollView>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={query.isRefetching && !query.isFetchingNextPage}
            onRefresh={() => query.refetch()}
            colors={['#1976d2']}
            tintColor="#1976d2"
          />
        }
        renderItem={({ item }) => (
          <View style={{ paddingHorizontal: 16 }}>
            <PayableCard
              item={item}
              onPay={setSelectedPayable}
              onEdit={setEditingPayable}
            />
          </View>
        )}
        ListEmptyComponent={
          query.isLoading ? (
            <LoadingState />
          ) : query.isError ? (
            <EmptyState
              icon="wifi-off"
              title="Erro ao carregar"
              description="Não foi possível buscar as contas."
              actionLabel="Tentar novamente"
              onAction={() => query.refetch()}
            />
          ) : (
            <EmptyState
              icon="check-circle-outline"
              title="Nenhuma conta encontrada"
              description={
                statusFilter === 'ALL'
                  ? 'Não há contas a pagar cadastradas.'
                  : `Nenhuma conta com status "${STATUS_LABELS[statusFilter as keyof typeof STATUS_LABELS]}".`
              }
            />
          )
        }
        onEndReached={() => {
          if (query.hasNextPage && !query.isFetchingNextPage) {
            query.fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          query.isFetchingNextPage ? (
            <LoadingState message="Carregando mais..." />
          ) : null
        }
      />

      {/* Payment Modal */}
      <PaymentModal
        visible={!!selectedPayable}
        title={`Pagar — ${selectedPayable?.vendorName || 'Sem fornecedor'}`}
        defaultAmount={selectedPayable?.nextDueAmount ?? undefined}
        loading={payMutation.isPending}
        onClose={() => setSelectedPayable(null)}
        onConfirm={(amount, method, paymentDate) => {
          if (!selectedPayable?.nextInstallmentId) return;
          payMutation.mutate({
            payableId: selectedPayable.id,
            installmentId: selectedPayable.nextInstallmentId,
            amount,
            paymentMethod: method,
            paymentDate,
          });
        }}
        confirmLabel="Registrar Pagamento"
      />

      <EditInstallmentSheet
        visible={!!editingPayable}
        installment={editingInstallment}
        loadingDetail={payableDetailQuery.isFetching}
        loading={updateInstallmentMutation.isPending}
        onClose={() => setEditingPayable(null)}
        onSubmit={data => {
          if (!editingPayable?.nextInstallmentId) return;
          updateInstallmentMutation.mutate({
            payableId: editingPayable.id,
            installmentId: editingPayable.nextInstallmentId,
            data,
          });
        }}
      />

      {/* FAB - Nova conta */}
      <TouchableOpacity
        onPress={() => setCreateSheetOpen(true)}
        activeOpacity={0.85}
        style={{
          position: 'absolute',
          bottom: 28,
          right: 20,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: '#1976d2',
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#1976d2',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.35,
          shadowRadius: 8,
          elevation: 8,
        }}
      >
        <MaterialCommunityIcons name="plus" size={28} color="#fff" />
      </TouchableOpacity>

      <CreatePayableSheet
        visible={createSheetOpen}
        onClose={() => setCreateSheetOpen(false)}
      />

      <MonthPickerSheet
        visible={monthPickerOpen}
        value={nextDueMonth}
        onChange={setNextDueMonth}
        onClose={() => setMonthPickerOpen(false)}
      />

      <SearchablePickerSheet
        visible={vendorPickerOpen}
        title="Filtrar por credor"
        items={vendorsQuery.data?.items ?? []}
        isLoading={vendorsQuery.isLoading}
        onSelect={item => {
          setVendorFilter(item);
          setVendorPickerOpen(false);
        }}
        onClose={() => {
          setVendorPickerOpen(false);
          setVendorSearch('');
        }}
        onSearchChange={setVendorSearch}
        searchPlaceholder="Buscar credor..."
      />
    </ScreenContainer>
  );
}
