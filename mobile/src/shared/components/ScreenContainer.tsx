import React from 'react';
import { View, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWindowDimensions } from 'react-native';
import { useTabBarHeight } from '../context/tab-bar-height-context';

interface ScreenContainerProps {
  children: React.ReactNode;
  className?: string;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  withoutPadding?: boolean;
}

export function ScreenContainer({
  children,
  className,
  edges = ['top', 'left', 'right'],
  withoutPadding = false,
}: ScreenContainerProps) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useTabBarHeight();
  // On tablets (width >= 768), add extra horizontal padding
  const tabletPadding = width >= 768 ? 'px-8' : 'px-4';

  const contentInsets = {
    paddingTop: edges.includes('top')
      ? tabBarHeight > 0
        ? tabBarHeight
        : insets.top
      : 0,
    paddingBottom: edges.includes('bottom') ? insets.bottom : 0,
    paddingLeft: edges.includes('left') ? insets.left : 0,
    paddingRight: edges.includes('right') ? insets.right : 0,
  };

  return (
    // Outer view fills the entire screen (including behind rounded corners)
    <View
      className={`flex-1 bg-neutral-100${className ? ` ${className}` : ''}`}
    >
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent
      />
      {/* Inner view pushes content into the safe area */}
      <View style={[{ flex: 1 }, contentInsets]}>
        {withoutPadding ? (
          children
        ) : (
          <View className={`flex-1 ${tabletPadding}`}>{children}</View>
        )}
      </View>
    </View>
  );
}
