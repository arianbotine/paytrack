/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#e3f2fd',
          100: '#bbdefb',
          200: '#90caf9',
          300: '#64b5f6',
          400: '#42a5f5',
          500: '#2196f3',
          600: '#1e88e5',
          700: '#1976d2',
          800: '#1565c0',
          900: '#0d47a1',
        },
        success: {
          50: '#e8f5e9',
          100: '#c8e6c9',
          500: '#4caf50',
          700: '#2e7d32',
          900: '#1b5e20',
        },
        danger: {
          50: '#ffebee',
          100: '#ffcdd2',
          500: '#f44336',
          700: '#d32f2f',
          900: '#b71c1c',
        },
        warning: {
          50: '#fff3e0',
          100: '#ffe0b2',
          500: '#ff9800',
          700: '#e65100',
        },
        neutral: {
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#eeeeee',
          300: '#e0e0e0',
          400: '#bdbdbd',
          500: '#9e9e9e',
          600: '#757575',
          700: '#616161',
          800: '#424242',
          900: '#212121',
        },
      },
      fontFamily: {
        sans: ['Inter_400Regular', 'System'],
        'sans-medium': ['Inter_500Medium', 'System'],
        'sans-semibold': ['Inter_600SemiBold', 'System'],
        'sans-bold': ['Inter_700Bold', 'System'],
      },
    },
  },
  plugins: [],
};
