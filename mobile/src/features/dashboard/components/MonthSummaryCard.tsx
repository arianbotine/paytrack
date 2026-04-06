import { View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { DashboardData } from '@lib/types';
import { formatCurrency } from '@lib/formatters';
import { Text } from '@shared/components/Text';
import { CurrencyDisplay } from '@shared/components/CurrencyDisplay';

interface MonthSummaryCardProps {
  monthSummary: DashboardData['monthSummary'];
}

export function MonthSummaryCard({ monthSummary: s }: MonthSummaryCardProps) {
  const monthLabel = new Date().toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });

  const netBalance = s.receivedThisMonth - s.paidThisMonth;
  const payProgress =
    s.toPayThisMonth > 0 ? Math.min(s.paidThisMonth / s.toPayThisMonth, 1) : 0;
  const receiveProgress =
    s.toReceiveThisMonth > 0
      ? Math.min(s.receivedThisMonth / s.toReceiveThisMonth, 1)
      : 0;

  return (
    <View
      className="mb-5 rounded-2xl overflow-hidden bg-white"
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
        elevation: 4,
      }}
    >
      {/* Dark header band */}
      <View style={{ backgroundColor: '#1565c0' }} className="px-4 pt-4 pb-5">
        <View className="flex-row items-center">
          <View
            style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
            className="rounded-xl p-2"
          >
            <MaterialCommunityIcons
              name="calendar-month-outline"
              size={20}
              color="#ffffff"
            />
          </View>
          <View className="ml-3">
            <Text variant="caption" style={{ color: 'rgba(255,255,255,0.6)' }}>
              Resumo do mês
            </Text>
            <Text
              variant="body"
              weight="bold"
              style={{ color: '#ffffff' }}
              className="capitalize"
            >
              {monthLabel}
            </Text>
          </View>
        </View>

        {/* Net balance pill */}
        <View
          style={{
            backgroundColor: 'rgba(255,255,255,0.12)',
            borderRadius: 12,
          }}
          className="mt-4 px-4 py-3 flex-row items-center justify-between"
        >
          <Text
            variant="caption"
            weight="medium"
            style={{ color: 'rgba(255,255,255,0.7)' }}
          >
            Saldo estimado
          </Text>
          <View className="flex-row items-center">
            <MaterialCommunityIcons
              name={netBalance >= 0 ? 'trending-up' : 'trending-down'}
              size={16}
              color={netBalance >= 0 ? '#a5d6a7' : '#ef9a9a'}
              style={{ marginRight: 6 }}
            />
            <Text
              variant="title"
              weight="bold"
              style={{ color: netBalance >= 0 ? '#a5d6a7' : '#ef9a9a' }}
            >
              {formatCurrency(netBalance)}
            </Text>
          </View>
        </View>
      </View>

      {/* Main metric tiles: A Pagar / A Receber */}
      <View className="flex-row px-4 pt-4 pb-2" style={{ gap: 10 }}>
        {/* A Pagar */}
        <View className="flex-1 bg-danger-50 rounded-2xl p-3">
          <View className="flex-row items-center mb-2">
            <View className="bg-danger-100 rounded-lg p-1">
              <MaterialCommunityIcons
                name="arrow-up-circle-outline"
                size={14}
                color="#d32f2f"
              />
            </View>
            <Text
              variant="caption"
              weight="semibold"
              className="text-danger-700 ml-1.5 uppercase tracking-wide"
            >
              A Pagar
            </Text>
          </View>
          <CurrencyDisplay
            value={s.toPayThisMonth}
            variant="expense"
            textVariant="title"
            weight="bold"
          />
          <View
            className="mt-2 rounded-full overflow-hidden bg-danger-100"
            style={{ height: 4 }}
          >
            <View
              style={{
                width: `${payProgress * 100}%`,
                height: 4,
                backgroundColor: '#d32f2f',
                borderRadius: 999,
              }}
            />
          </View>
          <Text variant="caption" className="mt-1" style={{ color: '#b71c1c' }}>
            {Math.round(payProgress * 100)}% pago
          </Text>
        </View>

        {/* A Receber */}
        <View className="flex-1 bg-success-50 rounded-2xl p-3">
          <View className="flex-row items-center mb-2">
            <View className="bg-success-100 rounded-lg p-1">
              <MaterialCommunityIcons
                name="arrow-down-circle-outline"
                size={14}
                color="#2e7d32"
              />
            </View>
            <Text
              variant="caption"
              weight="semibold"
              className="text-success-700 ml-1.5 uppercase tracking-wide"
            >
              A Receber
            </Text>
          </View>
          <CurrencyDisplay
            value={s.toReceiveThisMonth}
            variant="income"
            textVariant="title"
            weight="bold"
          />
          <View
            className="mt-2 rounded-full overflow-hidden bg-success-100"
            style={{ height: 4 }}
          >
            <View
              style={{
                width: `${receiveProgress * 100}%`,
                height: 4,
                backgroundColor: '#2e7d32',
                borderRadius: 999,
              }}
            />
          </View>
          <Text variant="caption" className="mt-1" style={{ color: '#1b5e20' }}>
            {Math.round(receiveProgress * 100)}% recebido
          </Text>
        </View>
      </View>

      {/* Secondary tiles: Pago / Recebido */}
      <View className="flex-row px-4 pb-4" style={{ gap: 10 }}>
        <View
          className="flex-1 flex-row items-center bg-neutral-50 rounded-2xl p-3"
          style={{ gap: 10 }}
        >
          <View className="bg-success-100 rounded-xl p-2">
            <MaterialCommunityIcons
              name="check-circle-outline"
              size={16}
              color="#2e7d32"
            />
          </View>
          <View>
            <Text variant="caption" className="text-neutral-500">
              Pago
            </Text>
            <CurrencyDisplay
              value={s.paidThisMonth}
              variant="income"
              textVariant="body"
              weight="bold"
            />
          </View>
        </View>

        <View
          className="flex-1 flex-row items-center bg-neutral-50 rounded-2xl p-3"
          style={{ gap: 10 }}
        >
          <View className="bg-primary-100 rounded-xl p-2">
            <MaterialCommunityIcons
              name="cash-check"
              size={16}
              color="#1565c0"
            />
          </View>
          <View>
            <Text variant="caption" className="text-neutral-500">
              Recebido
            </Text>
            <CurrencyDisplay
              value={s.receivedThisMonth}
              variant="income"
              textVariant="body"
              weight="bold"
            />
          </View>
        </View>
      </View>
    </View>
  );
}
