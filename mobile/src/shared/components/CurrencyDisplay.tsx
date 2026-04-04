import React from 'react';
import { Text } from './Text';
import { formatCurrency } from '@lib/formatters';

type ColorVariant = 'default' | 'income' | 'expense' | 'neutral' | 'auto';

interface CurrencyDisplayProps {
  value: number;
  variant?: ColorVariant;
  className?: string;
  textVariant?: 'heading' | 'subheading' | 'title' | 'body' | 'caption';
  weight?: 'regular' | 'medium' | 'semibold' | 'bold';
}

const colorClasses: Record<ColorVariant, string> = {
  default: 'text-neutral-900',
  income: 'text-success-700',
  expense: 'text-danger-700',
  neutral: 'text-neutral-600',
  auto: '',
};

export function CurrencyDisplay({
  value,
  variant = 'default',
  className,
  textVariant = 'body',
  weight = 'semibold',
}: CurrencyDisplayProps) {
  const autoColor = value >= 0 ? 'text-success-700' : 'text-danger-700';
  const colorClass = variant === 'auto' ? autoColor : colorClasses[variant];

  return (
    <Text
      variant={textVariant}
      weight={weight}
      className={`${colorClass}${className ? ` ${className}` : ''}`}
    >
      {formatCurrency(value)}
    </Text>
  );
}
