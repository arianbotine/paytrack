import { useState } from 'react';
import {
  View,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { api, useAuthStore, AuthResponse } from '../../src/lib';
import { Text } from '../../src/shared/components/Text';
import { Button } from '../../src/shared/components/Button';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const [showPassword, setShowPassword] = useState(false);
  const setAuth = useAuthStore(state => state.setAuth);
  const insets = useSafeAreaInsets();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginForm) => {
      const response = await api.post<AuthResponse>('/auth/login', data);
      return response.data;
    },
    onSuccess: async data => {
      await setAuth(data.user, data.accessToken, data.refreshToken);
      if (
        !data.user.currentOrganization &&
        data.user.availableOrganizations.length > 1
      ) {
        router.replace('/(auth)/select-organization');
      } else {
        router.replace('/(tabs)');
      }
    },
  });

  return (
    // Outer view fills full screen including behind rounded corners
    <View className="flex-1 bg-primary-700">
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />
      {/* Inner view confines content to safe area */}
      <View
        style={{
          flex: 1,
          paddingTop: insets.top,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Hero section */}
            <View className="items-center justify-center pt-16 pb-10 px-6">
              <View
                className="w-16 h-16 rounded-2xl items-center justify-center mb-6"
                style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
              >
                <MaterialCommunityIcons
                  name="currency-usd"
                  size={36}
                  color="#ffffff"
                />
              </View>
              <Text
                variant="heading"
                weight="bold"
                className="text-white text-3xl text-center"
              >
                PayTrack
              </Text>
              <Text
                variant="body"
                className="text-center mt-1"
                style={{ color: 'rgba(255,255,255,0.7)' }}
              >
                Contas a Pagar e Receber
              </Text>
            </View>

            {/* Card */}
            <View className="flex-1 bg-neutral-100 rounded-t-3xl px-6 pt-8 pb-6">
              <Text
                variant="subheading"
                weight="bold"
                className="text-neutral-900 mb-6"
              >
                Entrar na sua conta
              </Text>

              {/* Email */}
              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View className="mb-4">
                    <Text
                      variant="label"
                      weight="semibold"
                      className="text-neutral-500 uppercase tracking-wider mb-2"
                    >
                      Email
                    </Text>
                    <View
                      className={`flex-row items-center bg-white border rounded-xl px-4 py-3 ${
                        errors.email
                          ? 'border-danger-500'
                          : 'border-neutral-200'
                      }`}
                    >
                      <MaterialCommunityIcons
                        name="email-outline"
                        size={20}
                        color="#9e9e9e"
                      />
                      <TextInput
                        className="flex-1 ml-3 text-sm font-sans text-neutral-900"
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoComplete="email"
                        placeholder="seu@email.com"
                        placeholderTextColor="#bdbdbd"
                      />
                    </View>
                    {errors.email && (
                      <Text
                        variant="caption"
                        className="text-danger-700 mt-1 ml-1"
                      >
                        {errors.email.message}
                      </Text>
                    )}
                  </View>
                )}
              />

              {/* Password */}
              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View className="mb-6">
                    <Text
                      variant="label"
                      weight="semibold"
                      className="text-neutral-500 uppercase tracking-wider mb-2"
                    >
                      Senha
                    </Text>
                    <View
                      className={`flex-row items-center bg-white border rounded-xl px-4 py-3 ${
                        errors.password
                          ? 'border-danger-500'
                          : 'border-neutral-200'
                      }`}
                    >
                      <MaterialCommunityIcons
                        name="lock-outline"
                        size={20}
                        color="#9e9e9e"
                      />
                      <TextInput
                        className="flex-1 ml-3 text-sm font-sans text-neutral-900"
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        secureTextEntry={!showPassword}
                        autoCapitalize="none"
                        placeholder="••••••••"
                        placeholderTextColor="#bdbdbd"
                      />
                      <TouchableOpacity
                        onPress={() => setShowPassword(p => !p)}
                        hitSlop={8}
                      >
                        <MaterialCommunityIcons
                          name={
                            showPassword ? 'eye-off-outline' : 'eye-outline'
                          }
                          size={20}
                          color="#9e9e9e"
                        />
                      </TouchableOpacity>
                    </View>
                    {errors.password && (
                      <Text
                        variant="caption"
                        className="text-danger-700 mt-1 ml-1"
                      >
                        {errors.password.message}
                      </Text>
                    )}
                  </View>
                )}
              />

              {loginMutation.isError && (
                <View className="bg-danger-50 border border-danger-100 rounded-xl px-4 py-3 mb-4">
                  <Text variant="body" className="text-danger-700 text-center">
                    {(loginMutation.error as Error)?.message ||
                      'Email ou senha inválidos'}
                  </Text>
                </View>
              )}

              <Button
                label="Entrar"
                variant="primary"
                size="lg"
                fullWidth
                loading={loginMutation.isPending}
                onPress={handleSubmit(d => loginMutation.mutate(d))}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </View>
  );
}
