import { useState } from 'react';
import {
  View,
  FlatList,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { STATUS_LABELS_RECEIVABLE } from '../../src/lib/formatters';
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
import { CreateReceivableSheet } from '../../src/features/receivables/components/CreateReceivableSheet';
import { ReceivableCard } from '../../src/features/receivables/components/ReceivableCard';
import {
  useReceivables,
  type ReceivableStatusFilter,
} from '../../src/features/receivables/use-receivables';
import { useReceiveInstallment } from '../../src/features/receivables/use-receive-installment';
import { useReceivable } from '../../src/features/receivables/use-receivable';
import { useUpdateReceivableInstallment } from '../../src/features/receivables/use-update-receivable-installment';
import { useCustomers } from '../../src/features/customers/use-customers';
import type { ReceivableListItem } from '../../src/lib/types';

const FILTER_OPTIONS: { value: ReceivableStatusFilter; label: string }[] = [
  { value: 'ALL', label: 'Todos' },
  { value: 'PENDING', label: STATUS_LABELS_RECEIVABLE.PENDING },
  { value: 'PARTIAL', label: STATUS_LABELS_RECEIVABLE.PARTIAL },
  { value: 'PAID', label: STATUS_LABELS_RECEIVABLE.PAID },
];

export default function ReceivablesScreen() {
  const [statusFilter, setStatusFilter] =
    useState<ReceivableStatusFilter>('ALL');
  const [nextDueMonth, setNextDueMonth] = useState<string | null>(null);
  const [customerFilter, setCustomerFilter] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [customerPickerOpen, setCustomerPickerOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedReceivable, setSelectedReceivable] =
    useState<ReceivableListItem | null>(null);
  const [editingReceivable, setEditingReceivable] =
    useState<ReceivableListItem | null>(null);
  const [createSheetOpen, setCreateSheetOpen] = useState(false);

  const customersQuery = useCustomers(customerSearch || undefined);
  const query = useReceivables({
    status: statusFilter,
    nextDueMonth,
    customerId: customerFilter?.id ?? null,
  });
  const receiveMutation = useReceiveInstallment(() =>
    setSelectedReceivable(null)
  );
  const receivableDetailQuery = useReceivable(editingReceivable?.id);
  const updateInstallmentMutation = useUpdateReceivableInstallment(() =>
    setEditingReceivable(null)
  );

  const editingInstallment = editingReceivable?.nextInstallmentId
    ? (receivableDetailQuery.data?.installments.find(
        i => i.id === editingReceivable.nextInstallmentId
      ) ?? null)
    : null;

  const allItems = query.data?.pages.flatMap(p => p.items) ?? [];
  const total = query.data?.pages[0]?.total ?? 0;
  const isFiltered =
    statusFilter !== 'ALL' || !!nextDueMonth || !!customerFilter;

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
                A Receber
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
                label={customerFilter ? customerFilter.name : 'Devedor'}
                active={!!customerFilter}
                onPress={() => setCustomerPickerOpen(true)}
                onClear={() => setCustomerFilter(null)}
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
            <ReceivableCard
              item={item}
              onReceive={setSelectedReceivable}
              onEdit={setEditingReceivable}
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
                  ? 'Não há contas a receber cadastradas.'
                  : `Nenhuma conta com status "${STATUS_LABELS_RECEIVABLE[statusFilter as keyof typeof STATUS_LABELS_RECEIVABLE]}".`
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
        visible={!!selectedReceivable}
        title={`Receber — ${selectedReceivable?.customerName || 'Sem cliente'}`}
        defaultAmount={selectedReceivable?.nextDueAmount ?? undefined}
        loading={receiveMutation.isPending}
        onClose={() => setSelectedReceivable(null)}
        onConfirm={(amount, method, paymentDate) => {
          if (!selectedReceivable?.nextInstallmentId) return;
          receiveMutation.mutate({
            receivableId: selectedReceivable.id,
            installmentId: selectedReceivable.nextInstallmentId,
            amount,
            paymentMethod: method,
            paymentDate,
          });
        }}
        confirmLabel="Registrar Recebimento"
      />

      <EditInstallmentSheet
        visible={!!editingReceivable}
        installment={editingInstallment}
        loadingDetail={receivableDetailQuery.isFetching}
        loading={updateInstallmentMutation.isPending}
        onClose={() => setEditingReceivable(null)}
        onSubmit={data => {
          if (!editingReceivable?.nextInstallmentId) return;
          updateInstallmentMutation.mutate({
            receivableId: editingReceivable.id,
            installmentId: editingReceivable.nextInstallmentId,
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
          backgroundColor: '#16A34A',
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#16A34A',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.35,
          shadowRadius: 8,
          elevation: 8,
        }}
      >
        <MaterialCommunityIcons name="plus" size={28} color="#fff" />
      </TouchableOpacity>

      <CreateReceivableSheet
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
        visible={customerPickerOpen}
        title="Filtrar por devedor"
        items={customersQuery.data?.items ?? []}
        isLoading={customersQuery.isLoading}
        onSelect={item => {
          setCustomerFilter(item);
          setCustomerPickerOpen(false);
        }}
        onClose={() => {
          setCustomerPickerOpen(false);
          setCustomerSearch('');
        }}
        onSearchChange={setCustomerSearch}
        searchPlaceholder="Buscar devedor..."
      />
    </ScreenContainer>
  );
}
