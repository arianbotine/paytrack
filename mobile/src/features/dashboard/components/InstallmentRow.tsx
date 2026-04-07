import { View, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { DashboardInstallmentItem } from '@lib/types';
import { formatDate } from '@lib/formatters';
import { Text } from '@shared/components/Text';
import { CurrencyDisplay } from '@shared/components/CurrencyDisplay';
import { TagChip } from '@shared/components/TagChip';

interface InstallmentRowProps {
  item: DashboardInstallmentItem;
  nameKey: 'vendorName' | 'customerName';
  amountColor: 'expense' | 'income' | 'warning';
  onPay?: () => void;
  actionLabel?: string;
}

export function InstallmentRow({
  item,
  nameKey,
  amountColor,
  onPay,
  actionLabel,
}: InstallmentRowProps) {
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
        {item.tags && item.tags.length > 0 && (
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 4,
              marginTop: 4,
            }}
          >
            {item.tags.slice(0, 3).map(tag => (
              <TagChip key={tag.id} tag={tag} size="sm" />
            ))}
            {item.tags.length > 3 && (
              <Text variant="caption" className="text-neutral-400 self-center">
                +{item.tags.length - 3}
              </Text>
            )}
          </View>
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
