import { View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card } from '@shared/components/Card';
import { Text } from '@shared/components/Text';

interface SectionCardProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  iconColor: string;
  title: string;
  count?: number;
  children: React.ReactNode;
}

export function SectionCard({
  icon,
  iconColor,
  title,
  count,
  children,
}: SectionCardProps) {
  return (
    <Card variant="elevated" padding="none" className="mb-3 overflow-hidden">
      <View className="flex-row items-center px-4 py-3 border-b border-neutral-100">
        <MaterialCommunityIcons name={icon} size={18} color={iconColor} />
        <Text
          variant="label"
          weight="semibold"
          className="ml-2 text-neutral-700 uppercase tracking-wider flex-1"
        >
          {title}
        </Text>
        {count !== undefined && (
          <View
            className="rounded-full px-2 py-0.5"
            style={{ backgroundColor: iconColor + '20' }}
          >
            <Text variant="caption" weight="bold" style={{ color: iconColor }}>
              {count}
            </Text>
          </View>
        )}
      </View>
      <View className="px-4">{children}</View>
    </Card>
  );
}
