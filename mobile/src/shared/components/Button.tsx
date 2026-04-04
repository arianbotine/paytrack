import React from 'react';
import {
  TouchableOpacity,
  ActivityIndicator,
  TouchableOpacityProps,
  View,
} from 'react-native';
import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends TouchableOpacityProps {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  label: string;
  leftIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const containerClasses: Record<Variant, string> = {
  primary: 'bg-primary-700',
  secondary: 'bg-neutral-100 border border-neutral-300',
  ghost: 'bg-transparent',
  danger: 'bg-danger-700',
  success: 'bg-success-700',
};

const disabledClasses: Record<Variant, string> = {
  primary: 'bg-primary-200',
  secondary: 'bg-neutral-100 border border-neutral-200',
  ghost: 'bg-transparent',
  danger: 'bg-danger-200',
  success: 'bg-success-100',
};

const textClasses: Record<Variant, string> = {
  primary: 'text-white',
  secondary: 'text-neutral-800',
  ghost: 'text-primary-700',
  danger: 'text-white',
  success: 'text-white',
};

const sizeClasses: Record<Size, string> = {
  sm: 'px-3 py-2 rounded-lg',
  md: 'px-4 py-3 rounded-xl',
  lg: 'px-6 py-4 rounded-2xl',
};

const textSizeClasses: Record<Size, string> = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  label,
  leftIcon,
  fullWidth = false,
  disabled,
  className,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const containerCls = isDisabled
    ? disabledClasses[variant]
    : containerClasses[variant];

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      disabled={isDisabled}
      className={`flex-row items-center justify-center ${containerCls} ${sizeClasses[size]}${fullWidth ? ' w-full' : ''}${className ? ` ${className}` : ''}`}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={
            variant === 'secondary' || variant === 'ghost'
              ? '#1976d2'
              : '#ffffff'
          }
        />
      ) : (
        <>
          {leftIcon && <View className="mr-2">{leftIcon}</View>}
          <Text
            weight="semibold"
            className={`${textClasses[variant]} ${textSizeClasses[size]}`}
          >
            {label}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}
