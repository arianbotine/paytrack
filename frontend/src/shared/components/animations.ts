import { Variants } from 'framer-motion';

export const pageTransition = {
  type: 'tween',
  ease: 'easeInOut',
  duration: 0.2,
};

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1 },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  show: { opacity: 1, scale: 1 },
};

export const slideInFromRight: Variants = {
  hidden: { opacity: 0, x: 50 },
  show: { opacity: 1, x: 0 },
};

export const slideInFromBottom: Variants = {
  hidden: { opacity: 0, y: 50 },
  show: { opacity: 1, y: 0 },
};
