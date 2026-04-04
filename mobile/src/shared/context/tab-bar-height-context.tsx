import { createContext, useContext } from 'react';

export const TabBarHeightContext = createContext<number>(0);

export function useTabBarHeight(): number {
  return useContext(TabBarHeightContext);
}
