import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import { View, TouchableOpacity } from 'react-native';
import { BottomSheetModal, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text } from './Text';
import { Button } from './Button';

const MONTH_ROWS = [
  ['Jan', 'Fev', 'Mar', 'Abr'],
  ['Mai', 'Jun', 'Jul', 'Ago'],
  ['Set', 'Out', 'Nov', 'Dez'],
];

interface MonthPickerSheetProps {
  visible: boolean;
  /** Valor selecionado no formato YYYY-MM, ou null se nenhum */
  value: string | null;
  onChange: (value: string | null) => void;
  onClose: () => void;
}

export function MonthPickerSheet({
  visible,
  value,
  onChange,
  onClose,
}: MonthPickerSheetProps) {
  const sheetRef = useRef<BottomSheetModal>(null);
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const snapPoints = useMemo(() => ['55%'], []);

  const parsedYear = value ? parseInt(value.split('-')[0], 10) : null;
  const parsedMonth = value ? parseInt(value.split('-')[1], 10) : null;

  useEffect(() => {
    if (visible) {
      setSelectedYear(parsedYear ?? currentYear);
      sheetRef.current?.present();
    } else {
      sheetRef.current?.dismiss();
    }
  }, [visible]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior="close"
      />
    ),
    []
  );

  const handleSelectMonth = (monthIndex: number) => {
    const month = String(monthIndex + 1).padStart(2, '0');
    onChange(`${selectedYear}-${month}`);
    sheetRef.current?.dismiss();
  };

  const handleClear = () => {
    onChange(null);
    sheetRef.current?.dismiss();
  };

  return (
    <BottomSheetModal
      ref={sheetRef}
      onDismiss={onClose}
      enableDynamicSizing={false}
      snapPoints={snapPoints}
      backdropComponent={renderBackdrop}
      handleIndicatorStyle={{ backgroundColor: '#e0e0e0', width: 40 }}
    >
      <View className="flex-1 px-5 pt-2 pb-6">
        {/* Header */}
        <View className="flex-row items-center justify-between mb-5">
          <Text variant="subheading" weight="bold" className="text-neutral-900">
            Mês do próximo vencimento
          </Text>
          <TouchableOpacity
            onPress={onClose}
            className="w-8 h-8 rounded-full bg-neutral-100 items-center justify-center"
          >
            <MaterialCommunityIcons name="close" size={18} color="#616161" />
          </TouchableOpacity>
        </View>

        {/* Year navigation */}
        <View className="flex-row items-center justify-center mb-5">
          <TouchableOpacity
            onPress={() => setSelectedYear(y => y - 1)}
            className="w-9 h-9 rounded-full bg-neutral-100 items-center justify-center"
          >
            <MaterialCommunityIcons
              name="chevron-left"
              size={22}
              color="#424242"
            />
          </TouchableOpacity>
          <Text variant="title" weight="bold" className="text-neutral-900 mx-6">
            {selectedYear}
          </Text>
          <TouchableOpacity
            onPress={() => setSelectedYear(y => y + 1)}
            className="w-9 h-9 rounded-full bg-neutral-100 items-center justify-center"
          >
            <MaterialCommunityIcons
              name="chevron-right"
              size={22}
              color="#424242"
            />
          </TouchableOpacity>
        </View>

        {/* Month grid — 3 rows × 4 columns */}
        {MONTH_ROWS.map((row, rowIndex) => (
          <View key={rowIndex} className="flex-row justify-between mb-2">
            {row.map((name, colIndex) => {
              const monthNum = rowIndex * 4 + colIndex + 1;
              const isActive =
                parsedYear === selectedYear && parsedMonth === monthNum;
              return (
                <TouchableOpacity
                  key={name}
                  onPress={() => handleSelectMonth(rowIndex * 4 + colIndex)}
                  activeOpacity={0.7}
                  style={{ flex: 1 }}
                  className={`py-3 mx-1 rounded-xl items-center border ${
                    isActive
                      ? 'bg-primary-700 border-primary-700'
                      : 'bg-white border-neutral-200'
                  }`}
                >
                  <Text
                    variant="label"
                    weight={isActive ? 'bold' : 'semibold'}
                    className={isActive ? 'text-white' : 'text-neutral-700'}
                  >
                    {name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}

        {/* Clear button */}
        {value && (
          <View className="mt-3">
            <Button
              label="Limpar filtro"
              variant="ghost"
              onPress={handleClear}
              fullWidth
            />
          </View>
        )}
      </View>
    </BottomSheetModal>
  );
}
