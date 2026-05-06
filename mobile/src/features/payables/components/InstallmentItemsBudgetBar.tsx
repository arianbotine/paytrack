import React from 'react';
import { View } from 'react-native';
import { Text } from '@shared/components/Text';
import { formatCurrency } from '@lib/formatters';
import type { InstallmentItemsSummary } from '@lib/types';

interface InstallmentItemsBudgetBarProps {
  summary: InstallmentItemsSummary;
}

export function InstallmentItemsBudgetBar({
  summary,
}: InstallmentItemsBudgetBarProps) {
  const { installmentAmount, itemsTotal, remainingAmountForItems } = summary;

  const usageRatio =
    installmentAmount > 0 ? Math.min(itemsTotal / installmentAmount, 1) : 0;
  const usagePercent = Math.round(usageRatio * 100);
  const isOver = remainingAmountForItems < 0;
  const isNear = usageRatio >= 0.85 && !isOver;

  const barColorClass = isOver
    ? 'bg-danger-500'
    : isNear
      ? 'bg-warning-500'
      : 'bg-success-500';

  const remainingColorClass = isOver
    ? 'text-danger-600'
    : isNear
      ? 'text-warning-600'
      : 'text-success-700';

  const percentColorClass = isOver
    ? 'text-danger-600'
    : isNear
      ? 'text-warning-600'
      : 'text-neutral-500';

  return (
    <View className="bg-neutral-50 rounded-xl px-4 py-3 mb-4 border border-neutral-100">
      {/* Values row */}
      <View className="flex-row justify-between mb-2">
        <View className="items-start">
          <Text variant="caption" className="text-neutral-400 mb-0.5">
            Parcela
          </Text>
          <Text variant="body" weight="semibold" className="text-neutral-900">
            {formatCurrency(installmentAmount)}
          </Text>
        </View>

        <View className="items-center">
          <Text variant="caption" className="text-neutral-400 mb-0.5">
            Itens
          </Text>
          <Text
            variant="body"
            weight="semibold"
            className={isOver ? 'text-danger-600' : 'text-neutral-900'}
          >
            {formatCurrency(itemsTotal)}
          </Text>
        </View>

        <View className="items-end">
          <Text variant="caption" className="text-neutral-400 mb-0.5">
            Disponível
          </Text>
          <Text
            variant="body"
            weight="semibold"
            className={remainingColorClass}
          >
            {formatCurrency(remainingAmountForItems)}
          </Text>
        </View>
      </View>

      {/* Progress bar track */}
      <View className="h-1.5 bg-neutral-200 rounded-full overflow-hidden">
        <View
          className={`h-full rounded-full ${barColorClass}`}
          style={{ width: `${usagePercent}%` }}
        />
      </View>

      {/* Percentage label */}
      <Text
        variant="caption"
        className={`mt-1 text-right ${percentColorClass}`}
      >
        {usagePercent}% utilizado
      </Text>
    </View>
  );
}
