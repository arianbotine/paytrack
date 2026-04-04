import React from 'react';
import { View } from 'react-native';
import { Text } from './Text';
import type { AccountStatus } from '@lib/types';

interface StatusBadgeProps {
  status: AccountStatus | string;
  variant?: 'payable' | 'receivable';
}

const statusConfig: Record<
  string,
  { label: string; labelReceivable: string; bg: string; text: string }
> = {
  PENDING: {
    label: 'Pendente',
    labelReceivable: 'Pendente',
    bg: 'bg-warning-50',
    text: 'text-warning-700',
  },
  PARTIAL: {
    label: 'Parcial',
    labelReceivable: 'Parcial',
    bg: 'bg-primary-50',
    text: 'text-primary-700',
  },
  PAID: {
    label: 'Pago',
    labelReceivable: 'Recebido',
    bg: 'bg-success-50',
    text: 'text-success-700',
  },
};

export function StatusBadge({ status, variant = 'payable' }: StatusBadgeProps) {
  const config = statusConfig[status] ?? {
    label: status,
    labelReceivable: status,
    bg: 'bg-neutral-100',
    text: 'text-neutral-600',
  };
  const label =
    variant === 'receivable' ? config.labelReceivable : config.label;

  return (
    <View className={`px-2.5 py-1 rounded-full ${config.bg}`}>
      <Text variant="label" weight="semibold" className={config.text}>
        {label}
      </Text>
    </View>
  );
}
