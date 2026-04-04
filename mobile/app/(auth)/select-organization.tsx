import {
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, useAuthStore, AuthResponse } from '../../src/lib';
import { Text } from '../../src/shared/components/Text';
import { translateRole } from '../../src/lib/formatters';

export default function SelectOrganizationScreen() {
  const user = useAuthStore(state => state.user);
  const setAuth = useAuthStore(state => state.setAuth);
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const selectOrgMutation = useMutation({
    mutationFn: async (organizationId: string) => {
      const response = await api.post<AuthResponse>(
        '/auth/select-organization',
        {
          organizationId,
        }
      );
      return response.data;
    },
    onSuccess: async data => {
      await setAuth(data.user, data.accessToken, data.refreshToken);
      queryClient.clear();
      router.replace('/(tabs)');
    },
  });

  if (!user) {
    return (
      <View className="flex-1 bg-primary-700 items-center justify-center">
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    );
  }

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
        {/* Header */}
        <View className="px-6 pt-8 pb-6 items-center">
          <View
            className="w-14 h-14 rounded-2xl items-center justify-center mb-4"
            style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
          >
            <MaterialCommunityIcons
              name="office-building-outline"
              size={28}
              color="#ffffff"
            />
          </View>
          <Text
            variant="subheading"
            weight="bold"
            className="text-white text-center"
          >
            Selecione a Organização
          </Text>
          <Text
            variant="body"
            className="text-center mt-1"
            style={{ color: 'rgba(255,255,255,0.7)' }}
          >
            Você tem acesso a múltiplas organizações
          </Text>
        </View>

        {/* List */}
        <View className="flex-1 bg-neutral-100 rounded-t-3xl px-4 pt-6">
          <FlatList
            data={user.availableOrganizations}
            keyExtractor={item => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 24 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => selectOrgMutation.mutate(item.id)}
                disabled={selectOrgMutation.isPending}
                activeOpacity={0.7}
                className="bg-white rounded-2xl px-4 py-4 mb-3 flex-row items-center"
                style={{
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.06,
                  shadowRadius: 6,
                  elevation: 2,
                }}
              >
                <View className="w-10 h-10 rounded-xl bg-primary-50 items-center justify-center mr-3">
                  <MaterialCommunityIcons
                    name="domain"
                    size={22}
                    color="#1976d2"
                  />
                </View>
                <View className="flex-1">
                  <Text
                    variant="title"
                    weight="semibold"
                    className="text-neutral-900"
                  >
                    {item.name}
                  </Text>
                  <Text variant="caption" className="text-neutral-500 mt-0.5">
                    {translateRole(item.role)}
                  </Text>
                </View>
                {selectOrgMutation.isPending ? (
                  <ActivityIndicator size="small" color="#1976d2" />
                ) : (
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={24}
                    color="#bdbdbd"
                  />
                )}
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </View>
  );
}
