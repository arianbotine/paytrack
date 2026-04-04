import { View, ScrollView, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { api, useAuthStore } from '../../src/lib';
import type {
  DashboardData,
  DashboardInstallmentItem,
} from '../../src/lib/types';
import { formatCurrency, formatDate } from '../../src/lib/formatters';
import { ScreenContainer } from '../../src/shared/components/ScreenContainer';
import { Text } from '../../src/shared/components/Text';
import { Card } from '../../src/shared/components/Card';
import { LoadingState } from '../../src/shared/components/LoadingState';
import { EmptyState } from '../../src/shared/components/EmptyState';
import { CurrencyDisplay } from '../../src/shared/components/CurrencyDisplay';

function InstallmentRow({
  item,
  nameKey,
  amountColor,
}: {
  item: DashboardInstallmentItem;
  nameKey: 'vendorName' | 'customerName';
  amountColor: 'expense' | 'income' | 'warning';
}) {
  const name =
    item[nameKey] ||
    (nameKey === 'vendorName' ? 'Sem fornecedor' : 'Sem cliente');
  return (
    <View className="flex-row items-center py-3 border-b border-neutral-100 last:border-b-0">
      <View className="flex-1 mr-3">
        <Text
          variant="body"
          weight="medium"
          className="text-neutral-900"
          numberOfLines={1}
        >
          {name}
        </Text>
        {item.categoryName && (
          <Text variant="caption" className="text-neutral-500 mt-0.5">
            {item.categoryName}
          </Text>
        )}
        {item.dueDate && (
          <Text variant="caption" className="text-neutral-400 mt-0.5">
            {formatDate(item.dueDate)}
          </Text>
        )}
      </View>
      <CurrencyDisplay
        value={item.remaining}
        variant={amountColor === 'warning' ? 'default' : amountColor}
        textVariant="body"
        weight="bold"
        className={amountColor === 'warning' ? 'text-warning-700' : undefined}
      />
    </View>
  );
}

function SectionCard({
  icon,
  iconColor,
  title,
  children,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  iconColor: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card variant="elevated" padding="none" className="mb-3 overflow-hidden">
      <View className="flex-row items-center px-4 py-3 border-b border-neutral-100">
        <MaterialCommunityIcons name={icon} size={18} color={iconColor} />
        <Text
          variant="label"
          weight="semibold"
          className="ml-2 text-neutral-700 uppercase tracking-wider"
        >
          {title}
        </Text>
      </View>
      <View className="px-4">{children}</View>
    </Card>
  );
}

export default function DashboardScreen() {
  const user = useAuthStore(state => state.user);

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const response = await api.get<DashboardData>('/dashboard');
      return response.data;
    },
  });

  if (isLoading) {
    return (
      <ScreenContainer>
        <LoadingState fullScreen />
      </ScreenContainer>
    );
  }

  if (isError || !data) {
    return (
      <ScreenContainer>
        <EmptyState
          icon="wifi-off"
          title="Erro ao carregar"
          description="Não foi possível carregar o dashboard. Tente novamente."
          actionLabel="Tentar novamente"
          onAction={() => refetch()}
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer withoutPadding>
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
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

        {/* Balance Cards */}
        <View className="flex-row gap-3 mb-3">
          <Card
            variant="elevated"
            padding="md"
            className="flex-1 bg-primary-50"
          >
            <Text
              variant="label"
              weight="semibold"
              className="text-primary-700 uppercase tracking-wider mb-2"
            >
              A Receber
            </Text>
            <CurrencyDisplay
              value={data.balance.toReceive}
              variant="income"
              textVariant="subheading"
              weight="bold"
            />
          </Card>
          <Card variant="elevated" padding="md" className="flex-1 bg-danger-50">
            <Text
              variant="label"
              weight="semibold"
              className="text-danger-700 uppercase tracking-wider mb-2"
            >
              A Pagar
            </Text>
            <CurrencyDisplay
              value={data.balance.toPay}
              variant="expense"
              textVariant="subheading"
              weight="bold"
            />
          </Card>
        </View>

        {/* Net Balance */}
        <Card
          variant="elevated"
          padding="md"
          className={`mb-5 ${data.balance.net >= 0 ? 'bg-success-50' : 'bg-danger-50'}`}
        >
          <View className="flex-row items-center justify-between">
            <View>
              <Text
                variant="label"
                weight="semibold"
                className="text-neutral-500 uppercase tracking-wider mb-1"
              >
                Saldo Líquido
              </Text>
              <CurrencyDisplay
                value={data.balance.net}
                variant="auto"
                textVariant="heading"
                weight="bold"
              />
            </View>
            <View
              className={`w-12 h-12 rounded-full items-center justify-center ${
                data.balance.net >= 0 ? 'bg-success-100' : 'bg-danger-100'
              }`}
            >
              <MaterialCommunityIcons
                name={data.balance.net >= 0 ? 'trending-up' : 'trending-down'}
                size={24}
                color={data.balance.net >= 0 ? '#2e7d32' : '#d32f2f'}
              />
            </View>
          </View>
        </Card>

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
          >
            {data.payables.upcomingItems.map(item => (
              <InstallmentRow
                key={item.id}
                item={item}
                nameKey="vendorName"
                amountColor="warning"
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
          >
            {data.receivables.upcomingItems.map(item => (
              <InstallmentRow
                key={item.id}
                item={item}
                nameKey="customerName"
                amountColor="income"
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
    </ScreenContainer>
  );
}
