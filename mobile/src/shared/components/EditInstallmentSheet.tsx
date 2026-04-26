import React, { useRef, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Text } from './Text';
import { Button } from './Button';
import type {
  PayableInstallment,
  ReceivableInstallment,
  UpdateInstallmentInput,
} from '@lib/types';

const schema = z.object({
  amount: z
    .string()
    .optional()
    .refine(
      val => !val || !isNaN(parseFloat(val.replace(',', '.'))),
      'Informe um valor válido'
    )
    .refine(
      val => !val || parseFloat(val.replace(',', '.')) > 0,
      'Valor deve ser maior que zero'
    ),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface EditInstallmentSheetProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: UpdateInstallmentInput) => void;
  loading?: boolean;
  loadingDetail?: boolean;
  installment: PayableInstallment | ReceivableInstallment | null;
}

export function EditInstallmentSheet({
  visible,
  onClose,
  onSubmit,
  loading = false,
  loadingDetail = false,
  installment,
}: EditInstallmentSheetProps) {
  const sheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['55%'], []);

  const canEditAmount = installment ? installment.paidAmount === 0 : false;

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { amount: '', notes: '' },
  });

  // Pre-populate form when installment data arrives
  useEffect(() => {
    if (installment) {
      reset({
        amount: canEditAmount ? String(installment.amount.toFixed(2)) : '',
        notes: installment.notes ?? '',
      });
    }
  }, [installment, canEditAmount, reset]);

  // Show/hide the bottom sheet
  useEffect(() => {
    if (visible) {
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

  const handleSave = handleSubmit((values: FormValues) => {
    const payload: UpdateInstallmentInput = {};
    if (canEditAmount && values.amount) {
      const parsed = parseFloat(values.amount.replace(',', '.'));
      if (!isNaN(parsed) && parsed > 0) {
        payload.amount = parsed;
      }
    }
    // Always send notes (even if empty string) so user can clear it
    payload.notes = values.notes ?? '';
    onSubmit(payload);
  });

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
      <BottomSheetScrollView
        focusHook={useFocusEffect}
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
            Editar Parcela
          </Text>
          <TouchableOpacity
            onPress={onClose}
            className="w-8 h-8 rounded-full bg-neutral-100 items-center justify-center"
          >
            <MaterialCommunityIcons name="close" size={18} color="#616161" />
          </TouchableOpacity>
        </View>

        {loadingDetail && !installment ? (
          <View className="items-center py-10">
            <ActivityIndicator size="large" color="#1976d2" />
            <Text variant="body" className="text-neutral-400 mt-3">
              Carregando dados da parcela...
            </Text>
          </View>
        ) : (
          <>
            {/* Amount field */}
            <Text
              variant="label"
              weight="semibold"
              className="text-neutral-500 uppercase tracking-wider mb-2"
            >
              Valor
            </Text>
            {canEditAmount ? (
              <>
                <Controller
                  control={control}
                  name="amount"
                  render={({ field: { value, onChange, onBlur } }) => (
                    <View
                      className={`flex-row items-center bg-neutral-50 border rounded-xl px-4 py-3 mb-1 ${
                        errors.amount ? 'border-red-400' : 'border-neutral-200'
                      }`}
                    >
                      <Text
                        variant="subheading"
                        weight="semibold"
                        className="text-neutral-500 mr-2"
                      >
                        R$
                      </Text>
                      <TextInput
                        className="flex-1 text-lg font-sans-semibold text-neutral-900"
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        keyboardType="decimal-pad"
                        placeholder="0,00"
                        placeholderTextColor="#9e9e9e"
                      />
                    </View>
                  )}
                />
                {errors.amount && (
                  <Text variant="caption" className="text-red-500 mb-3">
                    {errors.amount.message}
                  </Text>
                )}
                {!errors.amount && <View className="mb-5" />}
              </>
            ) : (
              <View className="flex-row items-center bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-5">
                <MaterialCommunityIcons
                  name="information-outline"
                  size={16}
                  color="#b45309"
                  style={{ marginRight: 8 }}
                />
                <Text variant="caption" className="text-amber-700 flex-1">
                  Valor não pode ser alterado pois há pagamentos registrados.
                </Text>
              </View>
            )}

            {/* Notes field */}
            <Text
              variant="label"
              weight="semibold"
              className="text-neutral-500 uppercase tracking-wider mb-2"
            >
              Observação
            </Text>
            <Controller
              control={control}
              name="notes"
              render={({ field: { value, onChange, onBlur } }) => (
                <TextInput
                  className="bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-neutral-900 font-sans mb-5"
                  style={{ minHeight: 90, textAlignVertical: 'top' }}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  multiline
                  numberOfLines={4}
                  placeholder="Adicionar observação..."
                  placeholderTextColor="#9e9e9e"
                />
              )}
            />

            <Button
              label="Salvar"
              variant="primary"
              size="lg"
              fullWidth
              loading={loading}
              onPress={handleSave}
            />
          </>
        )}
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}
