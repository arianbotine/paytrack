import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { BottomSheetModal, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text } from '@shared/components/Text';
import { Button } from '@shared/components/Button';
import { useCreateVendor } from '../use-vendors';
import type { Vendor } from '@lib/types';

const schema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(200),
  document: z.string().max(20).optional().or(z.literal('')),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  phone: z.string().max(20).optional().or(z.literal('')),
});

type FormData = z.infer<typeof schema>;

interface CreateVendorSheetProps {
  visible: boolean;
  initialName?: string;
  onCreated: (vendor: Vendor) => void;
  onClose: () => void;
}

export function CreateVendorSheet({
  visible,
  initialName = '',
  onCreated,
  onClose,
}: CreateVendorSheetProps) {
  const sheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['70%'], []);
  const { mutate, isPending } = useCreateVendor();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: initialName, document: '', email: '', phone: '' },
  });

  useEffect(() => {
    if (visible) {
      reset({ name: initialName, document: '', email: '', phone: '' });
      sheetRef.current?.present();
    } else {
      sheetRef.current?.dismiss();
    }
  }, [visible, initialName]);

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

  const onSubmit = (data: FormData) => {
    mutate(
      {
        name: data.name,
        document: data.document || undefined,
        email: data.email || undefined,
        phone: data.phone || undefined,
      },
      {
        onSuccess: vendor => {
          onCreated(vendor);
          onClose();
        },
        onError: () => {
          Alert.alert(
            'Erro',
            'Não foi possível criar o credor. Tente novamente.'
          );
        },
      }
    );
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
            Novo Credor
          </Text>
          <TouchableOpacity
            onPress={onClose}
            className="w-8 h-8 rounded-full bg-neutral-100 items-center justify-center"
          >
            <MaterialCommunityIcons name="close" size={18} color="#616161" />
          </TouchableOpacity>
        </View>

        {/* Nome */}
        <Text
          variant="label"
          weight="semibold"
          className="text-neutral-500 uppercase tracking-wider mb-2"
        >
          Nome *
        </Text>
        <Controller
          control={control}
          name="name"
          render={({ field }) => (
            <TextInput
              className="bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-base text-neutral-900 mb-1"
              placeholder="Nome do credor"
              placeholderTextColor="#9E9E9E"
              value={field.value}
              onChangeText={field.onChange}
              autoCapitalize="words"
            />
          )}
        />
        {errors.name && (
          <Text variant="caption" className="text-danger-600 mb-3">
            {errors.name.message}
          </Text>
        )}

        {/* Documento */}
        <View className="mb-1 mt-3">
          <Text
            variant="label"
            weight="semibold"
            className="text-neutral-500 uppercase tracking-wider mb-2"
          >
            CPF / CNPJ
          </Text>
          <Controller
            control={control}
            name="document"
            render={({ field }) => (
              <TextInput
                className="bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-base text-neutral-900"
                placeholder="Opcional"
                placeholderTextColor="#9E9E9E"
                value={field.value}
                onChangeText={field.onChange}
                keyboardType="numeric"
              />
            )}
          />
        </View>

        {/* Email */}
        <View className="mb-1 mt-3">
          <Text
            variant="label"
            weight="semibold"
            className="text-neutral-500 uppercase tracking-wider mb-2"
          >
            E-mail
          </Text>
          <Controller
            control={control}
            name="email"
            render={({ field }) => (
              <TextInput
                className="bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-base text-neutral-900"
                placeholder="Opcional"
                placeholderTextColor="#9E9E9E"
                value={field.value}
                onChangeText={field.onChange}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            )}
          />
          {errors.email && (
            <Text variant="caption" className="text-danger-600 mt-1">
              {errors.email.message}
            </Text>
          )}
        </View>

        {/* Telefone */}
        <View className="mb-5 mt-3">
          <Text
            variant="label"
            weight="semibold"
            className="text-neutral-500 uppercase tracking-wider mb-2"
          >
            Telefone
          </Text>
          <Controller
            control={control}
            name="phone"
            render={({ field }) => (
              <TextInput
                className="bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-base text-neutral-900"
                placeholder="Opcional"
                placeholderTextColor="#9E9E9E"
                value={field.value}
                onChangeText={field.onChange}
                keyboardType="phone-pad"
              />
            )}
          />
        </View>

        <Button
          label={isPending ? 'Salvando...' : 'Salvar Credor'}
          variant="primary"
          size="lg"
          fullWidth
          loading={isPending}
          onPress={handleSubmit(onSubmit)}
        />
      </ScrollView>
    </BottomSheetModal>
  );
}
