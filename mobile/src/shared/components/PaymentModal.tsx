import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { BottomSheetModal, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text } from './Text';
import { Button } from './Button';
import { PaymentMethodPicker } from './PaymentMethodPicker';
import { CalendarPicker } from './CalendarPicker';
import type { PaymentMethod } from '@lib/types';

function todayIso(): string {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
}

function isoToDisplay(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

interface PaymentModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (
    amount: number,
    method: PaymentMethod,
    paymentDate: string
  ) => void;
  loading?: boolean;
  title: string;
  defaultAmount?: number;
  confirmLabel?: string;
}

export function PaymentModal({
  visible,
  onClose,
  onConfirm,
  loading = false,
  title,
  defaultAmount,
  confirmLabel = 'Confirmar',
}: PaymentModalProps) {
  const sheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['75%'], []);
  const [amount, setAmount] = useState(
    defaultAmount != null ? String(defaultAmount.toFixed(2)) : ''
  );
  const [method, setMethod] = useState<PaymentMethod>('PIX');
  const [paymentDate, setPaymentDate] = useState(todayIso);
  const [showCalendar, setShowCalendar] = useState(false);

  useEffect(() => {
    if (visible) {
      setAmount(defaultAmount != null ? String(defaultAmount.toFixed(2)) : '');
      setMethod('PIX');
      setPaymentDate(todayIso());
      setShowCalendar(false);
      sheetRef.current?.present();
    } else {
      sheetRef.current?.dismiss();
    }
  }, [visible, defaultAmount]);

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

  const handleConfirm = () => {
    const parsed = parseFloat(amount.replace(',', '.'));
    if (isNaN(parsed) || parsed <= 0) {
      Alert.alert('Valor inválido', 'Informe um valor maior que zero.');
      return;
    }
    onConfirm(parsed, method, paymentDate);
  };

  return (
    <BottomSheetModal
      ref={sheetRef}
      onDismiss={onClose}
      enableDynamicSizing={false}
      snapPoints={snapPoints}
      backdropComponent={renderBackdrop}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      handleIndicatorStyle={{ backgroundColor: '#e0e0e0', width: 40 }}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 8,
          paddingBottom: 40,
        }}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between mb-5">
          <Text
            variant="subheading"
            weight="bold"
            className="text-neutral-900 flex-1 mr-3"
          >
            {title}
          </Text>
          <TouchableOpacity
            onPress={onClose}
            className="w-8 h-8 rounded-full bg-neutral-100 items-center justify-center"
          >
            <MaterialCommunityIcons name="close" size={18} color="#616161" />
          </TouchableOpacity>
        </View>

        {/* Amount */}
        <Text
          variant="label"
          weight="semibold"
          className="text-neutral-500 uppercase tracking-wider mb-2"
        >
          Valor
        </Text>
        <View className="flex-row items-center bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 mb-5">
          <Text
            variant="subheading"
            weight="semibold"
            className="text-neutral-500 mr-2"
          >
            R$
          </Text>
          <TextInput
            className="flex-1 text-lg font-sans-semibold text-neutral-900"
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="0,00"
            placeholderTextColor="#9e9e9e"
          />
        </View>

        {/* Payment date */}
        <Text
          variant="label"
          weight="semibold"
          className="text-neutral-500 uppercase tracking-wider mb-2"
        >
          Data
        </Text>
        <TouchableOpacity
          onPress={() => setShowCalendar(v => !v)}
          activeOpacity={0.7}
          className={`flex-row items-center bg-neutral-50 border rounded-xl px-4 py-3 mb-3 ${
            showCalendar ? 'border-primary-700' : 'border-neutral-200'
          }`}
        >
          <MaterialCommunityIcons
            name="calendar-outline"
            size={20}
            color={showCalendar ? '#1976d2' : '#9e9e9e'}
            style={{ marginRight: 8 }}
          />
          <Text
            variant="body"
            weight="semibold"
            className={
              showCalendar
                ? 'text-primary-700 flex-1'
                : 'text-neutral-900 flex-1'
            }
          >
            {isoToDisplay(paymentDate)}
          </Text>
          <MaterialCommunityIcons
            name={showCalendar ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={showCalendar ? '#1976d2' : '#9e9e9e'}
          />
        </TouchableOpacity>
        {showCalendar && (
          <View className="mb-5">
            <CalendarPicker
              value={paymentDate}
              onChange={iso => {
                setPaymentDate(iso);
                setShowCalendar(false);
              }}
            />
          </View>
        )}
        {!showCalendar && <View className="mb-2" />}

        {/* Payment method */}
        <Text
          variant="label"
          weight="semibold"
          className="text-neutral-500 uppercase tracking-wider mb-3"
        >
          Forma de Pagamento
        </Text>
        <PaymentMethodPicker value={method} onChange={setMethod} />

        {/* Confirm */}
        <View className="mt-5">
          <Button
            label={confirmLabel}
            variant="primary"
            size="lg"
            fullWidth
            loading={loading}
            onPress={handleConfirm}
          />
        </View>
      </ScrollView>
    </BottomSheetModal>
  );
}
