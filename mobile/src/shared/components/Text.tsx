import React from 'react';
import { Text as RNText, TextProps } from 'react-native';

type Variant =
  | 'heading'
  | 'subheading'
  | 'title'
  | 'body'
  | 'caption'
  | 'label'
  | 'overline';
type Weight = 'regular' | 'medium' | 'semibold' | 'bold';

interface AppTextProps extends TextProps {
  variant?: Variant;
  weight?: Weight;
  color?: string;
}

const variantClasses: Record<Variant, string> = {
  heading: 'text-2xl leading-tight',
  subheading: 'text-lg leading-snug',
  title: 'text-base leading-normal',
  body: 'text-sm leading-relaxed',
  caption: 'text-xs leading-normal',
  label: 'text-xs leading-tight',
  overline: 'text-xs leading-tight tracking-widest uppercase',
};

const weightClasses: Record<Weight, string> = {
  regular: 'font-sans',
  medium: 'font-sans-medium',
  semibold: 'font-sans-semibold',
  bold: 'font-sans-bold',
};

export function Text({
  variant = 'body',
  weight = 'regular',
  className,
  style,
  ...props
}: AppTextProps) {
  return (
    <RNText
      className={`text-neutral-900 ${variantClasses[variant]} ${weightClasses[weight]}${className ? ` ${className}` : ''}`}
      style={style}
      {...props}
    />
  );
}
