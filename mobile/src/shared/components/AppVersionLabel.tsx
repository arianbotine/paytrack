import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { Text } from './Text';

export function AppVersionLabel() {
  const appVersion = Constants.expoConfig?.version ?? '1.0.0';
  const updateStamp = Updates.createdAt
    ? Updates.createdAt.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'dev';
  const versionLabel = `v${appVersion} · ${updateStamp}`;

  return (
    <Text
      variant="caption"
      className="text-center mt-6"
      style={{ color: '#bdbdbd' }}
    >
      {versionLabel}
    </Text>
  );
}
