import { useState } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { api, useAuthStore } from '../../src/lib';
import type {
  DashboardData,
  DashboardInstallmentItem,
  PaymentMethod,
} from '../../src/lib/types';
import { formatDate } from '../../src/lib/formatters';
import { ScreenContainer } from '../../src/shared/components/ScreenContainer';
import { Text } from '../../src/shared/components/Text';
import { Card } from '../../src/shared/components/Card';
import { LoadingState } from '../../src/shared/components/LoadingState';
import { EmptyState } from '../../src/shared/components/EmptyState';
import { CurrencyDisplay } from '../../src/shared/components/CurrencyDisplay';
import { PaymentModal } from '../../src/shared/components/PaymentModal';

function InstallmentRow({
  item,
  nameKey,
  amountColor,
  onPay,
  actionLabel,
}: {
  item: DashboardInstallmentItem;
  nameKey: 'vendorName' | 'customerName';
  amountColor: 'expense' | 'income' | 'warning';
  onPay?: () => void;
  actionLabel?: string;
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
      <View className="items-end gap-2">
        <CurrencyDisplay
          value={item.remaining}
          variant={amountColor === 'warning' ? 'default' : amountColor}
          textVariant="body"
          weight="bold"
          className={amountColor === 'warning' ? 'text-warning-700' : undefined}
        />
        {onPay && item.installmentId && (
          <TouchableOpacity
            onPress={onPay}
            activeOpacity={0.75}
            className={`flex-row items-center px-2.5 py-1 rounded-lg ${
              actionLabel === 'Receber' ? 'bg-success-700' : 'bg-primary-700'
            }`}
          >
            <MaterialCommunityIcons
              name={actionLabel === 'Receber' ? 'cash-plus' : 'cash-check'}
              size={13}
              color="#ffffff"
            />
            <Text
              variant="caption"
              weight="semibold"
              className="text-white ml-1"
            >
              {actionLabel ?? 'Pagar'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
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
  const organizationId = user?.currentOrganization?.id;
  const queryClient = useQueryClient();

  const [selectedItem, setSelectedItem] =
    useState<DashboardInstallmentItem | null>(null);
  const [selectedType, setSelectedType] = useState<'payable' | 'receivable'>(
    'payable'
  );

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['dashboard', organizationId],
    queryFn: async () => {
      const response = await api.get<DashboardData>('/dashboard');
      return response.data;
    },
    enabled: !!organizationId,
  });

  const payMutation = useMutation({
    mutationFn: async ({
      payableId,
      installmentId,
      amount,
      paymentMethod,
    }: {
      payableId: string;
      installmentId: string;
      amount: number;
      paymentMethod: PaymentMethod;
    }) => {
      const response = await api.post(
        `/payables/${payableId}/installments/${installmentId}/pay`,
        {
          amount,
          paymentMethod,
          paymentDate: new Date().toISOString().split('T')[0],
        }
      );
      return response.data;
    },
    onSuccess: () => {
      setSelectedItem(null);
      queryClient.invalidateQueries({
        queryKey: ['dashboard', organizationId],
      });
      queryClient.invalidateQueries({ queryKey: ['payables', organizationId] });
    },
    onError: (err: Error) => {
      Alert.alert(
        'Erro',
        err.message || 'Não foi possível registrar o pagamento.'
      );
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
      setSelectedItem(null);
      queryClient.invalidateQueries({
        queryKey: ['dashboard', organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ['receivables', organizationId],
      });
    },
    onError: (err: Error) => {
      Alert.alert(
        'Erro',
        err.message || 'Não foi possível registrar o recebimento.'
      );
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

        {/* Month Summary */}
        {(() => {
          const now = new Date();
          const monthLabel = now.toLocaleDateString('pt-BR', {
            month: 'long',
            year: 'numeric',
          });
          const s = data.monthSummary ?? {
            toPayThisMonth: 0,
            toReceiveThisMonth: 0,
            paidThisMonth: 0,
            receivedThisMonth: 0,
          };
          return (
            <Card
              variant="elevated"
              padding="none"
              className="mb-5 overflow-hidden"
            >
              <View className="flex-row items-center px-4 py-3 border-b border-neutral-100">
                <MaterialCommunityIcons
                  name="calendar-month-outline"
                  size={18}
                  color="#1976d2"
                />
                <Text
                  variant="label"
                  weight="semibold"
                  className="ml-2 text-neutral-700 tracking-wider capitalize"
                >
                  {monthLabel}
                </Text>
              </View>
              <View className="flex-row px-4 py-4 gap-4">
                {/* Left column */}
                <View className="flex-1 gap-4">
                  <View>
                    <Text
                      variant="caption"
                      className="text-neutral-400 mb-1 uppercase tracking-wide"
                    >
                      A Pagar
                    </Text>
                    <CurrencyDisplay
                      value={s.toPayThisMonth}
                      variant="expense"
                      textVariant="title"
                      weight="bold"
                    />
                  </View>
                  <View>
                    <Text
                      variant="caption"
                      className="text-success-700 mb-1 uppercase tracking-wide"
                    >
                      Pago
                    </Text>
                    <CurrencyDisplay
                      value={s.paidThisMonth}
                      variant="income"
                      textVariant="title"
                      weight="bold"
                    />
                  </View>
                </View>
                {/* Divider */}
                <View className="w-px bg-neutral-100" />
                {/* Right column */}
                <View className="flex-1 gap-4">
                  <View>
                    <Text
                      variant="caption"
                      className="text-primary-700 mb-1 uppercase tracking-wide"
                    >
                      A Receber
                    </Text>
                    <CurrencyDisplay
                      value={s.toReceiveThisMonth}
                      variant="income"
                      textVariant="title"
                      weight="bold"
                    />
                  </View>
                  <View>
                    <Text
                      variant="caption"
                      className="text-success-700 mb-1 uppercase tracking-wide"
                    >
                      Recebido
                    </Text>
                    <CurrencyDisplay
                      value={s.receivedThisMonth}
                      variant="income"
                      textVariant="title"
                      weight="bold"
                    />
                  </View>
                </View>
              </View>
            </Card>
          );
        })()}

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
                onPay={() => {
                  setSelectedType('payable');
                  setSelectedItem(item);
                }}
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
                actionLabel="Pagar"
                onPay={() => {
                  setSelectedType('payable');
                  setSelectedItem(item);
                }}
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
                onPay={() => {
                  setSelectedType('receivable');
                  setSelectedItem(item);
                }}
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
                actionLabel="Receber"
                onPay={() => {
                  setSelectedType('receivable');
                  setSelectedItem(item);
                }}
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
        loading={payMutation.isPending || receiveMutation.isPending}
        onClose={() => setSelectedItem(null)}
        onConfirm={(amount, method) => {
          if (!selectedItem?.installmentId) return;
          if (selectedType === 'payable') {
            payMutation.mutate({
              payableId: selectedItem.id,
              installmentId: selectedItem.installmentId,
              amount,
              paymentMethod: method,
            });
          } else {
            receiveMutation.mutate({
              receivableId: selectedItem.id,
              installmentId: selectedItem.installmentId,
              amount,
              paymentMethod: method,
            });
          }
        }}
      />
    </ScreenContainer>
  );
}
