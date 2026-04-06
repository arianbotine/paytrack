import { View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card } from '@shared/components/Card';
import { Text } from '@shared/components/Text';

interface SectionCardProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  iconColor: string;
  title: string;
  children: React.ReactNode;
}

export function SectionCard({
  icon,
  iconColor,
  title,
  children,
}: SectionCardProps) {
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
