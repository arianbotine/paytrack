import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@components': resolve(__dirname, './src/shared/components'),
      '@hooks': resolve(__dirname, './src/shared/hooks'),
      '@lib': resolve(__dirname, './src/lib'),
      '@features': resolve(__dirname, './src/features'),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React vendor chunk
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // MUI core (material + emotion)
          'vendor-mui-core': [
            '@mui/material',
            '@emotion/react',
            '@emotion/styled',
          ],
          // MUI icons (large — isolated for better tree-shaking)
          'vendor-mui-icons': ['@mui/icons-material'],
          // MUI X components
          'vendor-mui-x': ['@mui/x-date-pickers', '@mui/x-data-grid'],
          // Data & forms chunk
          'vendor-data': [
            '@tanstack/react-query',
            'react-hook-form',
            '@hookform/resolvers',
            'zod',
            'zustand',
            'axios',
            'better-auth',
          ],
          // Charts chunk
          'vendor-charts': ['recharts'],
          // Animation chunk
          'vendor-animation': ['framer-motion'],
          // Date utilities
          'vendor-date': ['date-fns', 'dayjs'],
        },
      },
    },
  },
});
