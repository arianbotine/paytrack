import { View, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { formatDate } from '../../../lib/formatters';
import type { PayableListItem } from '../../../lib/types';
import { Card } from '../../../shared/components/Card';
import { CurrencyDisplay } from '../../../shared/components/CurrencyDisplay';
import { StatusBadge } from '../../../shared/components/StatusBadge';
import { TagChip } from '../../../shared/components/TagChip';
import { Text } from '../../../shared/components/Text';

interface PayableCardProps {
  item: PayableListItem;
  onPay: (item: PayableListItem) => void;
  onEdit?: (item: PayableListItem) => void;
}

export function PayableCard({ item, onPay, onEdit }: PayableCardProps) {
  const isPaid = item.status === 'PAID';
  const hasActions = !isPaid && item.nextInstallmentId;

  return (
    <Card variant="elevated" padding="none" className="mb-3 overflow-hidden">
      {/* Card body — tappable to navigate to detail */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => router.push(`/payables/${item.id}`)}
      >
        <View className="px-4 pt-4 pb-3">
          {/* Top row */}
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-1 mr-3">
              <Text
                variant="title"
                weight="semibold"
                className="text-neutral-900"
                numberOfLines={1}
              >
                {item.vendorName || 'Sem fornecedor'}
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
                    <Text
                      variant="caption"
                      className="text-neutral-400 self-center"
                    >
                      +{item.tags.length - 3}
                    </Text>
                  )}
                </View>
              )}
            </View>
            <View className="flex-row items-center gap-2">
              <StatusBadge status={item.status} variant="payable" />
              <MaterialCommunityIcons
                name="chevron-right"
                size={18}
                color="#d4d4d4"
              />
            </View>
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
                  variant={item.status === 'PENDING' ? 'expense' : 'default'}
                  textVariant="body"
                  weight="bold"
                />
              </View>
            )}
          </View>

          {/* Footer row */}
          <View className="flex-row items-center gap-3">
            <View className="flex-row items-center">
              <MaterialCommunityIcons
                name="layers-outline"
                size={14}
                color="#9e9e9e"
              />
              <Text variant="caption" className="text-neutral-500 ml-1">
                {item.paidInstallments}/{item.installmentsCount} parcelas
              </Text>
            </View>
            {item.nextDueDate && !isPaid && (
              <View className="flex-row items-center">
                <MaterialCommunityIcons
                  name="calendar-outline"
                  size={14}
                  color="#9e9e9e"
                />
                <Text variant="caption" className="text-neutral-500 ml-1">
                  {formatDate(item.nextDueDate)}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>

      {/* Progress bar */}
      {item.installmentsCount > 1 && (
        <View className="h-1 bg-neutral-100">
          <View
            className="h-1 bg-primary-400"
            style={{
              width: `${(item.paidInstallments / item.installmentsCount) * 100}%`,
            }}
          />
        </View>
      )}

      {/* Action bar */}
      {hasActions && (
        <View className="flex-row border-t border-neutral-100">
          {onEdit && (
            <>
              <TouchableOpacity
                onPress={() => onEdit(item)}
                activeOpacity={0.75}
                className="flex-1 flex-row items-center justify-center py-4 gap-1.5 active:bg-neutral-50"
              >
                <MaterialCommunityIcons
                  name="pencil-outline"
                  size={18}
                  color="#525252"
                />
                <Text
                  variant="label"
                  weight="medium"
                  className="text-neutral-600"
                >
                  Editar
                </Text>
              </TouchableOpacity>
              <View className="w-px bg-neutral-100" />
            </>
          )}
          <TouchableOpacity
            onPress={() => onPay(item)}
            activeOpacity={0.75}
            className="flex-1 flex-row items-center justify-center py-4 gap-1.5 active:bg-danger-50"
          >
            <MaterialCommunityIcons
              name="cash-fast"
              size={18}
              color="#dc2626"
            />
            <Text variant="label" weight="medium" className="text-danger-600">
              Pagar
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </Card>
  );
}
