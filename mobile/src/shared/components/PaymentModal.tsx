import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
  Animated,
  ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text } from './Text';
import { Button } from './Button';
import { PaymentMethodPicker } from './PaymentMethodPicker';
import type { PaymentMethod } from '@lib/types';

interface PaymentModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (amount: number, method: PaymentMethod) => void;
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
  const [amount, setAmount] = useState(
    defaultAmount != null ? String(defaultAmount.toFixed(2)) : ''
  );
  const [method, setMethod] = useState<PaymentMethod>('PIX');
  const slideAnim = useRef(new Animated.Value(0)).current;
  const hasOpened = useRef(false);

  useEffect(() => {
    if (visible) {
      hasOpened.current = true;
      // Stop any running animation and reset to off-screen before sliding in.
      // This prevents the native-thread conflict that causes the black-screen
      // bug on the very first open (timing close animation from mount vs. spring).
      slideAnim.stopAnimation(() => {
        slideAnim.setValue(0);
        setAmount(
          defaultAmount != null ? String(defaultAmount.toFixed(2)) : ''
        );
        setMethod('PIX');
        Animated.spring(slideAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }).start();
      });
    } else if (hasOpened.current) {
      // Only run the close animation after the modal has been opened at least once
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, defaultAmount]);

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [700, 0],
  });

  const handleConfirm = () => {
    const parsed = parseFloat(amount.replace(',', '.'));
    if (isNaN(parsed) || parsed <= 0) {
      Alert.alert('Valor inválido', 'Informe um valor maior que zero.');
      return;
    }
    onConfirm(parsed, method);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'flex-end',
          }}
        >
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                {
                  backgroundColor: '#ffffff',
                  borderTopLeftRadius: 24,
                  borderTopRightRadius: 24,
                },
                { transform: [{ translateY }] },
              ]}
            >
              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              >
                <ScrollView
                  bounces={false}
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={{
                    paddingHorizontal: 20,
                    paddingTop: 20,
                    paddingBottom: 40,
                  }}
                >
                  {/* Handle indicator */}
                  <View style={{ alignItems: 'center', marginBottom: 16 }}>
                    <View
                      style={{
                        width: 40,
                        height: 4,
                        borderRadius: 2,
                        backgroundColor: '#e0e0e0',
                      }}
                    />
                  </View>

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
                      <MaterialCommunityIcons
                        name="close"
                        size={18}
                        color="#616161"
                      />
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
              </KeyboardAvoidingView>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
