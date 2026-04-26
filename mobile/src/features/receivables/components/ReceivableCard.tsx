import { View, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { formatDate } from '../../../lib/formatters';
import type { ReceivableListItem } from '../../../lib/types';
import { Card } from '../../../shared/components/Card';
import { CurrencyDisplay } from '../../../shared/components/CurrencyDisplay';
import { StatusBadge } from '../../../shared/components/StatusBadge';
import { TagChip } from '../../../shared/components/TagChip';
import { Text } from '../../../shared/components/Text';

interface ReceivableCardProps {
  item: ReceivableListItem;
  onReceive: (item: ReceivableListItem) => void;
  onEdit?: (item: ReceivableListItem) => void;
}

export function ReceivableCard({
  item,
  onReceive,
  onEdit,
}: ReceivableCardProps) {
  const isPaid = item.status === 'PAID';

  return (
    <Card variant="elevated" padding="none" className="mb-3 overflow-hidden">
      <View className="px-4 pt-4 pb-3">
        {/* Top row */}
        <View className="flex-row items-start justify-between mb-3">
          <View className="flex-1 mr-3">
            <Text
              variant="title"
              weight="semibold"
              className="text-neutral-900"
              numberOfLines={1}
            >
              {item.customerName || 'Sem cliente'}
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
              <MaterialCommunityIcons
                name="layers-outline"
                size={14}
                color="#9e9e9e"
              />
              <Text variant="caption" className="text-neutral-500 ml-1">
                {item.receivedInstallments}/{item.installmentsCount} parcelas
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

          {!isPaid && item.nextInstallmentId && (
            <View className="flex-row items-center gap-2">
              {onEdit && (
                <TouchableOpacity
                  onPress={() => onEdit(item)}
                  activeOpacity={0.75}
                  className="flex-row items-center bg-neutral-100 px-3 py-1.5 rounded-lg"
                >
                  <MaterialCommunityIcons
                    name="pencil-outline"
                    size={14}
                    color="#616161"
                  />
                  <Text
                    variant="label"
                    weight="semibold"
                    className="text-neutral-700 ml-1"
                  >
                    Editar
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => onReceive(item)}
                activeOpacity={0.75}
                className="flex-row items-center bg-success-700 px-3 py-1.5 rounded-lg"
              >
                <MaterialCommunityIcons
                  name="cash-check"
                  size={14}
                  color="#ffffff"
                />
                <Text
                  variant="label"
                  weight="semibold"
                  className="text-white ml-1"
                >
                  Receber
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* Progress bar */}
      {item.installmentsCount > 1 && (
        <View className="h-1 bg-neutral-100">
          <View
            className="h-1 bg-success-500"
            style={{
              width: `${(item.receivedInstallments / item.installmentsCount) * 100}%`,
            }}
          />
        </View>
      )}
    </Card>
  );
}
