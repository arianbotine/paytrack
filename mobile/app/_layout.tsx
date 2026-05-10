import '../global.css';
import { useEffect } from 'react';
import { LogBox } from 'react-native';
import { Stack } from 'expo-router';

// @gorhom/bottom-sheet v5 fires this warning on first mount for every
// BottomSheetModal before the native node is registered — it's harmless.
LogBox.ignoreLogs(["Couldn't find the scrollable node handle id!"]);

if (__DEV__) {
  const g = globalThis as typeof globalThis & {
    __paytrackWarnPatched?: boolean;
    __paytrackOriginalWarn?: typeof console.warn;
  };

  if (!g.__paytrackWarnPatched) {
    g.__paytrackWarnPatched = true;
    g.__paytrackOriginalWarn = console.warn;

    console.warn = (...args: unknown[]) => {
      const firstArg = args[0];
      if (
        typeof firstArg === 'string' &&
        firstArg.includes("Couldn't find the scrollable node handle id!")
      ) {
        return;
      }
      g.__paytrackOriginalWarn?.(...args);
    };
  }
}
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import {
  SafeAreaProvider,
  initialWindowMetrics,
} from 'react-native-safe-area-context';
import * as Updates from 'expo-updates';

import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { useAuthStore } from '../src/lib';
import { HealthGate } from '../src/shared/components/HealthGate';
import { ServerKeepAliveProvider } from '../src/shared/context/server-keep-alive-context';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 2,
    },
  },
});

async function checkAndApplyUpdate() {
  if (!Updates.isEnabled) return;
  try {
    const result = await Updates.checkForUpdateAsync();
    if (result.isAvailable) {
      await Updates.fetchUpdateAsync();
      await Updates.reloadAsync();
    }
  } catch {
    // silenciar erros de OTA para não impactar a UX
  }
}

export default function RootLayout() {
  const loadStoredAuth = useAuthStore(state => state.loadStoredAuth);
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    loadStoredAuth();
    checkAndApplyUpdate();
  }, []);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <QueryClientProvider client={queryClient}>
          <BottomSheetModalProvider>
            <HealthGate>
              <ServerKeepAliveProvider>
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="(auth)" />
                  <Stack.Screen name="(tabs)" />
                </Stack>
              </ServerKeepAliveProvider>
            </HealthGate>
          </BottomSheetModalProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
