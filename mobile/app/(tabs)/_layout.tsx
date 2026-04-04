import { Tabs, Redirect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/lib/auth-store';
import {
  ActivityIndicator,
  View,
  Text,
  TouchableOpacity,
  LayoutChangeEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState } from 'react';
import { TabBarHeightContext } from '../../src/shared/context/tab-bar-height-context';

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

type TabBarState = {
  index: number;
  routes: Array<{ key: string; name: string }>;
};

type TabBarNavigation = {
  navigate: (name: string) => void;
  emit: (event: {
    type: 'tabPress';
    target: string;
    canPreventDefault: true;
  }) => { defaultPrevented: boolean };
};

const TAB_CONFIG: Record<string, { icon: IconName; label: string }> = {
  index: { icon: 'view-dashboard-outline', label: 'Dashboard' },
  payables: { icon: 'arrow-up-circle-outline', label: 'A Pagar' },
  receivables: { icon: 'arrow-down-circle-outline', label: 'A Receber' },
  profile: { icon: 'account-circle-outline', label: 'Perfil' },
};

function TopTabBar({
  state,
  navigation,
  onHeightChange,
}: {
  state: TabBarState;
  navigation: TabBarNavigation;
  onHeightChange: (height: number) => void;
}) {
  const insets = useSafeAreaInsets();

  const handleLayout = (e: LayoutChangeEvent) => {
    const { height } = e.nativeEvent.layout;
    if (height > 0) onHeightChange(height);
  };

  return (
    <View
      onLayout={handleLayout}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: '#ffffff',
        paddingTop: insets.top + 6,
        paddingBottom: 8,
        paddingHorizontal: 8,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 6,
        zIndex: 100,
      }}
    >
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;
        const config = TAB_CONFIG[route.name] ?? {
          icon: 'circle-outline' as IconName,
          label: route.name,
        };

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            activeOpacity={0.7}
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 8,
              paddingHorizontal: 4,
              marginHorizontal: 3,
              borderRadius: 12,
              backgroundColor: isFocused ? '#e3f0fb' : 'transparent',
            }}
          >
            <MaterialCommunityIcons
              name={config.icon}
              size={22}
              color={isFocused ? '#1976d2' : '#9e9e9e'}
            />
            <Text
              numberOfLines={1}
              style={{
                fontSize: 11,
                fontFamily: 'Inter_500Medium',
                color: isFocused ? '#1976d2' : '#9e9e9e',
                marginTop: 3,
              }}
            >
              {config.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  const { isAuthenticated, isLoading } = useAuthStore();
  const insets = useSafeAreaInsets();
  const [tabBarHeight, setTabBarHeight] = useState(insets.top + 68);

  if (isLoading) {
    return (
      <View className="flex-1 bg-neutral-100 items-center justify-center">
        <ActivityIndicator size="large" color="#1976d2" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <TabBarHeightContext.Provider value={tabBarHeight}>
      <Tabs
        tabBar={props => (
          <TopTabBar
            state={props.state}
            navigation={props.navigation as unknown as TabBarNavigation}
            onHeightChange={setTabBarHeight}
          />
        )}
        screenOptions={{ headerShown: false }}
      >
        <Tabs.Screen name="index" />
        <Tabs.Screen name="payables" />
        <Tabs.Screen name="receivables" />
        <Tabs.Screen name="profile" />
      </Tabs>
    </TabBarHeightContext.Provider>
  );
}
