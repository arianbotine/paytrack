import { useMemo, ReactNode } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { useUIStore } from '@/lib/stores/uiStore';
import { getTheme } from '@/lib/theme';

interface ThemeWrapperProps {
  children: ReactNode;
}

export function ThemeWrapper({ children }: ThemeWrapperProps) {
  const { themeMode } = useUIStore();

  const theme = useMemo(() => getTheme(themeMode), [themeMode]);

  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}
