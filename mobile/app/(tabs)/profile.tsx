import { View, Alert } from 'react-native';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppVersionLabel } from '../../src/shared/components/AppVersionLabel';
import { useAuthStore } from '../../src/lib/auth-store';
import { translateRole } from '../../src/lib/formatters';
import { ScreenContainer } from '../../src/shared/components/ScreenContainer';
import { Text } from '../../src/shared/components/Text';
import { Card } from '../../src/shared/components/Card';
import { Button } from '../../src/shared/components/Button';
import { LoadingState } from '../../src/shared/components/LoadingState';

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View className="flex-row items-center py-3 border-b border-neutral-100">
      <View className="w-9 h-9 rounded-xl bg-neutral-100 items-center justify-center mr-3">
        <MaterialCommunityIcons name={icon} size={18} color="#616161" />
      </View>
      <View className="flex-1">
        <Text variant="label" className="text-neutral-400 mb-0.5">
          {label}
        </Text>
        <Text variant="body" weight="medium" className="text-neutral-900">
          {value}
        </Text>
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const queryClient = useQueryClient();

  const handleLogout = () => {
    Alert.alert('Sair', 'Deseja realmente sair da sua conta?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => {
          await logout();
          queryClient.clear();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  if (!user) {
    return (
      <ScreenContainer>
        <LoadingState fullScreen />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      {/* Header */}
      <View className="pt-4 pb-6">
        <Text variant="heading" weight="bold" className="text-neutral-900">
          Perfil
        </Text>
      </View>

      {/* Avatar + name */}
      <View className="items-center mb-6">
        <View className="w-20 h-20 rounded-full bg-primary-100 items-center justify-center mb-3">
          <Text variant="heading" weight="bold" className="text-primary-700">
            {user.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text
          variant="subheading"
          weight="bold"
          className="text-neutral-900 text-center"
        >
          {user.name}
        </Text>
        <Text variant="body" className="text-neutral-500 text-center">
          {user.email}
        </Text>
      </View>

      {/* User info */}
      <Card variant="elevated" padding="none" className="mb-4">
        <View className="px-4 py-3 border-b border-neutral-100">
          <Text
            variant="label"
            weight="semibold"
            className="text-neutral-500 uppercase tracking-wider"
          >
            Dados da Conta
          </Text>
        </View>
        <View className="px-4">
          <InfoRow
            icon="account-outline"
            label="Nome completo"
            value={user.name}
          />
          <InfoRow icon="email-outline" label="Email" value={user.email} />
        </View>
      </Card>

      {/* Organization info */}
      <Card variant="elevated" padding="none" className="mb-6">
        <View className="px-4 py-3 border-b border-neutral-100">
          <Text
            variant="label"
            weight="semibold"
            className="text-neutral-500 uppercase tracking-wider"
          >
            Organização
          </Text>
        </View>
        <View className="px-4">
          {user.currentOrganization ? (
            <>
              <InfoRow
                icon="domain"
                label="Nome"
                value={user.currentOrganization.name}
              />
              <View className="flex-row items-center py-3">
                <View className="w-9 h-9 rounded-xl bg-neutral-100 items-center justify-center mr-3">
                  <MaterialCommunityIcons
                    name="shield-account-outline"
                    size={18}
                    color="#616161"
                  />
                </View>
                <View className="flex-1">
                  <Text variant="label" className="text-neutral-400 mb-0.5">
                    Função
                  </Text>
                  <Text
                    variant="body"
                    weight="medium"
                    className="text-neutral-900"
                  >
                    {translateRole(user.currentOrganization.role)}
                  </Text>
                </View>
              </View>
            </>
          ) : (
            <View className="py-4 items-center">
              <Text variant="body" className="text-neutral-400">
                Nenhuma organização selecionada
              </Text>
            </View>
          )}
        </View>
      </Card>

      {/* Actions */}
      {user.availableOrganizations.length > 1 && (
        <Button
          label="Trocar Organização"
          variant="secondary"
          size="lg"
          fullWidth
          className="mb-3"
          onPress={() => router.push('/(auth)/select-organization')}
          leftIcon={
            <MaterialCommunityIcons
              name="swap-horizontal"
              size={18}
              color="#616161"
            />
          }
        />
      )}

      <Button
        label="Sair da Conta"
        variant="danger"
        size="lg"
        fullWidth
        onPress={handleLogout}
        leftIcon={
          <MaterialCommunityIcons name="logout" size={18} color="#ffffff" />
        }
      />

      <AppVersionLabel />
    </ScreenContainer>
  );
}
