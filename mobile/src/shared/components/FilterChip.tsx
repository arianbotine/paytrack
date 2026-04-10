import { TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text } from './Text';

const CHIP_H = 32;
const CHIP_R = 17;

const MONTH_NAMES_SHORT = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
];

export function formatMonthYear(yyyyMm: string): string {
  const [year, month] = yyyyMm.split('-');
  return `${MONTH_NAMES_SHORT[parseInt(month, 10) - 1]} ${year}`;
}

export function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        height: CHIP_H,
        borderRadius: CHIP_R,
        paddingHorizontal: 14,
        marginRight: 8,
        borderWidth: 1,
        borderColor: active ? '#1976d2' : '#e0e0e0',
        backgroundColor: active ? '#1976d2' : '#ffffff',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        variant="label"
        weight="semibold"
        style={{ color: active ? '#ffffff' : '#616161' }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export function AdvancedFilterChip({
  icon,
  label,
  active,
  onPress,
  onClear,
  activeColor = '#2e7d32',
  activeBg = '#c8e6c9',
}: {
  icon: string;
  label: string;
  active: boolean;
  onPress: () => void;
  onClear: () => void;
  activeColor?: string;
  activeBg?: string;
}) {
  if (!active) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        style={{
          height: CHIP_H,
          borderRadius: CHIP_R,
          paddingHorizontal: 12,
          marginRight: 8,
          borderWidth: 1,
          borderColor: '#e0e0e0',
          backgroundColor: '#ffffff',
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <MaterialCommunityIcons
          name={icon as any}
          size={14}
          color="#9e9e9e"
          style={{ marginRight: 5 }}
        />
        <Text variant="label" weight="semibold" style={{ color: '#616161' }}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <View
      style={{
        height: CHIP_H,
        borderRadius: CHIP_R,
        borderWidth: 1,
        borderColor: activeColor,
        backgroundColor: activeBg,
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 8,
      }}
    >
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          height: CHIP_H,
          paddingLeft: 10,
          paddingRight: 3,
        }}
      >
        <MaterialCommunityIcons
          name={icon as any}
          size={14}
          color={activeColor}
          style={{ marginRight: 5 }}
        />
        <Text
          variant="label"
          weight="semibold"
          numberOfLines={1}
          style={{ color: activeColor, maxWidth: 88 }}
        >
          {label}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={onClear}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 4, right: 10 }}
        style={{
          height: CHIP_H,
          paddingRight: 10,
          justifyContent: 'center',
        }}
      >
        <MaterialCommunityIcons
          name="close-circle"
          size={15}
          color={activeColor}
        />
      </TouchableOpacity>
    </View>
  );
}
