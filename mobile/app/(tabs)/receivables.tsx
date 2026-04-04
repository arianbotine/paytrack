import { useState, useCallback } from 'react';
import {
  View,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { api } from '../../src/lib';
import type { ReceivableListItem, ListResponse, PaymentMethod } from '../../src/lib/types';
import { formatCurrency, formatDate, STATUS_LABELS_RECEIVABLE } from '../../src/lib/formatters';
import { ScreenContainer } from '../../src/shared/components/ScreenContainer';
import { Text } from '../../src/shared/components/Text';
import { Card } from '../../src/shared/components/Card';
import { StatusBadge } from '../../src/shared/components/StatusBadge';
import { CurrencyDisplay } from '../../src/shared/components/CurrencyDisplay';
import { EmptyState } from '../../src/shared/components/EmptyState';
import { LoadingState } from '../../src/shared/components/LoadingState';
import { PaymentModal } from '../../src/shared/components/PaymentModal';

type StatusFilter = 'ALL' | 'PENDING' | 'PARTIAL' | 'PAID';

const PAGE_SIZE = 15;

const FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'ALL', label: 'Todos' },
  { value: 'PENDING', label: STATUS_LABELS_RECEIVABLE.PENDING },
  { value: 'PARTIAL', label: STATUS_LABELS_RECEIVABLE.PARTIAL },
  { value: 'PAID', label: STATUS_LABELS_RECEIVABLE.PAID },
];

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className={`px-4 py-2 rounded-full mr-2 border ${
        active
          ? 'bg-primary-700 border-primary-700'
          : 'bg-white border-neutral-200'
      }`}
    >
      <Text
        variant="label"
        weight="semibold"
        className={active ? 'text-white' : 'text-neutral-600'}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function ReceivableCard({
  item,
  onReceive,
}: {
  item: ReceivableListItem;
  onReceive: (item: ReceivableListItem) => void;
}) {
  const isPaid = item.status === 'PAID';
  return (
    <Card variant="elevated" padding="none" className="mb-3 overflow-hidden">
      <View className="px-4 pt-4 pb-3">
        {/* Top row */}
        <View className="flex-row items-start justify-between mb-3">
          <View className="flex-1 mr-3">
            <Text variant="title" weight="semibold" className="text-neutral-900" numberOfLines={1}>
              {item.customerName || 'Sem cliente'}
            </Text>
            {item.categoryName && (
              <Text variant="caption" className="text-neutral-500 mt-0.5">
                {item.categoryName}
              </Text>
            )}
          </View>
          <StatusBadge status={item.status} variant="receivable" />
        </View>

        {/* Amount row */}
        <View className="flex-row items-center justify-between mb-3">
          <View>
            <Text variant="label" className="text-neutral-400 mb-0.5">
              Total
            </Text>
            <CurrencyDisplay
              value={item.amount}
              variant="default"
              textVariant="subheading"
              weight="bold"
            />
          </View>
          {item.nextDueAmount != null && !isPaid && (
            <View className="items-end">
              <Text variant="label" className="text-neutral-400 mb-0.5">
                Próximo
              </Text>
              <CurrencyDisplay
                value={item.nextDueAmount}
                variant="income"
                textVariant="body"
                weight="bold"
              />
            </View>
          )}
        </View>

        {/* Footer row */}
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-3">
            <View className="flex-row items-center">
              <MaterialCommunityIcons name="layers-outline" size={14} color="#9e9e9e" />
              <Text variant="caption" className="text-neutral-500 ml-1">
                {item.receivedInstallments}/{item.installmentsCount} parcelas
              </Text>
            </View>
            {item.nextDueDate && !isPaid && (
              <View className="flex-row items-center">
                <MaterialCommunityIcons name="calendar-outline" size={14} color="#9e9e9e" />
                <Text variant="caption" className="text-neutral-500 ml-1">
                  {formatDate(item.nextDueDate)}
                </Text>
              </View>
            )}
          </View>

          {!isPaid && item.nextInstallmentId && (
            <TouchableOpacity
              onPress={() => onReceive(item)}
              activeOpacity={0.75}
              className="flex-row items-center bg-success-700 px-3 py-1.5 rounded-lg"
            >
              <MaterialCommunityIcons name="cash-check" size={14} color="#ffffff" />
              <Text variant="label" weight="semibold" className="text-white ml-1">
                Receber
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Progress bar */}
      {item.installmentsCount > 1 && (
        <View className="h-1 bg-neutral-100">
          <View
            className="h-1 bg-success-500"
            style={{ width: `${(item.receivedInstallments / item.installmentsCount) * 100}%` }}
          />
        </View>
      )}
    </Card>
  );
}

export default function ReceivablesScreen() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [selectedReceivable, setSelectedReceivable] = useState<ReceivableListItem | null>(null);
  const queryClient = useQueryClient();

  const buildQueryParams = useCallback(
    (skip: number) => {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      params.set('take', String(PAGE_SIZE));
      params.set('skip', String(skip));
      return params.toString();
    },
    [statusFilter]
  );

  const query = useInfiniteQuery<ListResponse<ReceivableListItem>>({
    queryKey: ['receivables', statusFilter],
    queryFn: async ({ pageParam = 0 }) => {
      const response = await api.get<ListResponse<ReceivableListItem>>(
        `/receivables?${buildQueryParams(pageParam as number)}`
      );
      return response.data;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((sum, p) => sum + p.items.length, 0);
      return loaded < lastPage.total ? loaded : undefined;
    },
  });

  const receiveMutation = useMutation({
    mutationFn: async ({
      receivableId,
      installmentId,
      amount,
      paymentMethod,
    }: {
      receivableId: string;
      installmentId: string;
      amount: number;
      paymentMethod: PaymentMethod;
    }) => {
      const response = await api.post(
        `/receivables/${receivableId}/installments/${installmentId}/receive`,
        {
          amount,
          paymentMethod,
          paymentDate: new Date().toISOString().split('T')[0],
        }
      );
      return response.data;
    },
    onSuccess: () => {
      setSelectedReceivable(null);
      queryClient.invalidateQueries({ queryKey: ['receivables'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (err: Error) => {
      Alert.alert('Erro', err.message || 'Não foi possível registrar o recebimento.');
    },
  });

  const allItems = query.data?.pages.flatMap(p => p.items) ?? [];
  const total = query.data?.pages[0]?.total ?? 0;

  return (
    <ScreenContainer withoutPadding>
      <View className="flex-1">
        {/* Header */}
        <View className="px-4 pt-4 pb-2">
          <Text variant="heading" weight="bold" className="text-neutral-900">
            A Receber
          </Text>
          {!query.isLoading && (
            <Text variant="caption" className="text-neutral-500 mt-0.5">
              {total} {total === 1 ? 'conta' : 'contas'}
            </Text>
          )}
        </View>

        {/* Filters */}
        <View className="px-4 mb-2">
          <FlatList
            data={FILTER_OPTIONS}
            keyExtractor={item => item.value}
            horizontal
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => (
              <FilterChip
                label={item.label}
                active={statusFilter === item.value}
                onPress={() => setStatusFilter(item.value)}
              />
            )}
          />
        </View>

        {/* List */}
        {query.isLoading ? (
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
          <FlatList
            data={allItems}
            keyExtractor={item => item.id}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingBottom: 24,
              flexGrow: 1,
            }}
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
              <ReceivableCard item={item} onReceive={setSelectedReceivable} />
            )}
            ListEmptyComponent={
              <EmptyState
                icon="check-circle-outline"
                title="Nenhuma conta encontrada"
                description={
                  statusFilter === 'ALL'
                    ? 'Não há contas a receber cadastradas.'
                    : `Nenhuma conta com status "${STATUS_LABELS_RECEIVABLE[statusFilter as keyof typeof STATUS_LABELS_RECEIVABLE]}".`
                }
              />
            }
            onEndReached={() => {
              if (query.hasNextPage && !query.isFetchingNextPage) {
                query.fetchNextPage();
              }
            }}
            onEndReachedThreshold={0.3}
            ListFooterComponent={
              query.isFetchingNextPage ? <LoadingState message="Carregando mais..." /> : null
            }
          />
        )}
      </View>

      {/* Payment Modal */}
      <PaymentModal
        visible={!!selectedReceivable}
        title={`Receber — ${selectedReceivable?.customerName || 'Sem cliente'}`}
        defaultAmount={selectedReceivable?.nextDueAmount ?? undefined}
        loading={receiveMutation.isPending}
        onClose={() => setSelectedReceivable(null)}
        onConfirm={(amount, method) => {
          if (!selectedReceivable?.nextInstallmentId) return;
          receiveMutation.mutate({
            receivableId: selectedReceivable.id,
            installmentId: selectedReceivable.nextInstallmentId,
            amount,
            paymentMethod: method,
          });
        }}
        confirmLabel="Registrar Recebimento"
      />
    </ScreenContainer>
  );
}
