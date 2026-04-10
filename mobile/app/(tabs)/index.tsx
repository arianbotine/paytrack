import { View, ScrollView, RefreshControl } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScreenContainer } from '../../src/shared/components/ScreenContainer';
import { Text } from '../../src/shared/components/Text';
import { LoadingState } from '../../src/shared/components/LoadingState';
import { EmptyState } from '../../src/shared/components/EmptyState';
import { PaymentModal } from '../../src/shared/components/PaymentModal';
import {
  useDashboard,
  MonthSummaryCard,
  SectionCard,
  InstallmentRow,
} from '../../src/features/dashboard';

export default function DashboardScreen() {
  const {
    user,
    query,
    selectedItem,
    selectedType,
    isMutating,
    selectItem,
    clearSelection,
    handleConfirm,
  } = useDashboard();

  if (query.isLoading) {
    return (
      <ScreenContainer>
        <LoadingState fullScreen />
      </ScreenContainer>
    );
  }

  if (query.isError || !query.data) {
    return (
      <ScreenContainer>
        <EmptyState
          icon="wifi-off"
          title="Erro ao carregar"
          description="Não foi possível carregar o dashboard. Tente novamente."
          actionLabel="Tentar novamente"
          onAction={() => query.refetch()}
        />
      </ScreenContainer>
    );
  }

  const { data } = query;

  return (
    <ScreenContainer withoutPadding>
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        refreshControl={
          <RefreshControl
            refreshing={query.isRefetching}
            onRefresh={query.refetch}
            colors={['#1976d2']}
            tintColor="#1976d2"
          />
        }
      >
        {/* Header */}
        <View className="pt-4 pb-5">
          <Text variant="heading" weight="bold" className="text-neutral-900">
            Dashboard
          </Text>
          {user?.currentOrganization && (
            <View className="flex-row items-center mt-1">
              <MaterialCommunityIcons name="domain" size={14} color="#9e9e9e" />
              <Text variant="caption" className="text-neutral-500 ml-1">
                {user.currentOrganization.name}
              </Text>
            </View>
          )}
        </View>

        <MonthSummaryCard monthSummary={data.monthSummary} />

        {/* Overdue Payables */}
        {data.payables.overdueItems.length > 0 && (
          <SectionCard
            icon="alert-circle-outline"
            iconColor="#d32f2f"
            title="A Pagar — Vencidas"
          >
            {data.payables.overdueItems.map(item => (
              <InstallmentRow
                key={item.id}
                item={item}
                nameKey="vendorName"
                amountColor="expense"
                actionLabel="Pagar"
                onPay={() => selectItem(item, 'payable')}
              />
            ))}
          </SectionCard>
        )}

        {/* Upcoming Payables */}
        {data.payables.upcomingItems.length > 0 && (
          <SectionCard
            icon="calendar-clock-outline"
            iconColor="#e65100"
            title="A Pagar — Próximos"
            count={data.payables.upcomingItems.length}
          >
            {data.payables.upcomingItems.map(item => (
              <InstallmentRow
                key={item.id}
                item={item}
                nameKey="vendorName"
                amountColor="warning"
                actionLabel="Pagar"
                onPay={() => selectItem(item, 'payable')}
              />
            ))}
          </SectionCard>
        )}

        {/* Overdue Receivables */}
        {data.receivables.overdueItems.length > 0 && (
          <SectionCard
            icon="alert-circle-outline"
            iconColor="#d32f2f"
            title="A Receber — Vencidas"
          >
            {data.receivables.overdueItems.map(item => (
              <InstallmentRow
                key={item.id}
                item={item}
                nameKey="customerName"
                amountColor="income"
                actionLabel="Receber"
                onPay={() => selectItem(item, 'receivable')}
              />
            ))}
          </SectionCard>
        )}

        {/* Upcoming Receivables */}
        {data.receivables.upcomingItems.length > 0 && (
          <SectionCard
            icon="calendar-clock-outline"
            iconColor="#1976d2"
            title="A Receber — Próximos"
            count={data.receivables.upcomingItems.length}
          >
            {data.receivables.upcomingItems.map(item => (
              <InstallmentRow
                key={item.id}
                item={item}
                nameKey="customerName"
                amountColor="income"
                actionLabel="Receber"
                onPay={() => selectItem(item, 'receivable')}
              />
            ))}
          </SectionCard>
        )}

        {data.payables.overdueItems.length === 0 &&
          data.payables.upcomingItems.length === 0 &&
          data.receivables.overdueItems.length === 0 &&
          data.receivables.upcomingItems.length === 0 && (
            <View className="items-center py-8">
              <MaterialCommunityIcons
                name="check-circle-outline"
                size={48}
                color="#4caf50"
              />
              <Text
                variant="body"
                weight="medium"
                className="text-neutral-500 mt-3 text-center"
              >
                Nenhuma pendência no momento
              </Text>
            </View>
          )}
      </ScrollView>

      <PaymentModal
        visible={selectedItem !== null}
        title={
          selectedType === 'payable'
            ? 'Registrar Pagamento'
            : 'Registrar Recebimento'
        }
        defaultAmount={selectedItem?.remaining}
        confirmLabel={
          selectedType === 'payable'
            ? 'Confirmar Pagamento'
            : 'Confirmar Recebimento'
        }
        loading={isMutating}
        onClose={clearSelection}
        onConfirm={handleConfirm}
      />
    </ScreenContainer>
  );
}
