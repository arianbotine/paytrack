import { ActivityIndicator, View } from 'react-native';
import { Text } from './Text';

interface WakingUpBannerProps {
  retryCount: number;
}

export function WakingUpBanner({ retryCount }: WakingUpBannerProps) {
  const message =
    retryCount > 0
      ? `Servidor ainda iniciando, tentando novamente... (tentativa ${retryCount + 1})`
      : 'O servidor está acordando após inatividade. Isso pode levar até 1 minuto. Por favor, aguarde...';

  return (
    <View className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4 flex-row items-center gap-3">
      <ActivityIndicator size="small" color="#d97706" />
      <Text variant="body" className="text-amber-700 flex-1">
        {message}
      </Text>
    </View>
  );
}
