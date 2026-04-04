import React from 'react';
import { View, ViewProps } from 'react-native';

interface CardProps extends ViewProps {
  variant?: 'elevated' | 'outlined' | 'filled';
  padding?: 'sm' | 'md' | 'lg' | 'none';
}

const variantClasses: Record<string, string> = {
  elevated: 'bg-white rounded-2xl shadow-sm',
  outlined: 'bg-white rounded-2xl border border-neutral-200',
  filled: 'bg-neutral-50 rounded-2xl',
};

const paddingClasses: Record<string, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-5',
};

export function Card({
  variant = 'elevated',
  padding = 'md',
  className,
  children,
  style,
  ...props
}: CardProps) {
  return (
    <View
      className={`${variantClasses[variant]} ${paddingClasses[padding]}${className ? ` ${className}` : ''}`}
      style={[
        variant === 'elevated'
          ? {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.08,
              shadowRadius: 8,
              elevation: 2,
            }
          : undefined,
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}
