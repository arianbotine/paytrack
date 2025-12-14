import { ReactNode } from 'react';
import { Box, Typography, Button, alpha } from '@mui/material';
import {
  Inbox as InboxIcon,
  SearchOff as SearchOffIcon,
  Error as ErrorIcon,
  CloudOff as CloudOffIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';

type EmptyStateVariant = 'empty' | 'no-results' | 'error' | 'offline';

interface EmptyStateProps {
  variant?: EmptyStateVariant;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: ReactNode;
}

const variantIcons: Record<EmptyStateVariant, ReactNode> = {
  empty: <InboxIcon sx={{ fontSize: 64 }} />,
  'no-results': <SearchOffIcon sx={{ fontSize: 64 }} />,
  error: <ErrorIcon sx={{ fontSize: 64 }} />,
  offline: <CloudOffIcon sx={{ fontSize: 64 }} />,
};

const variantColors: Record<EmptyStateVariant, string> = {
  empty: 'primary.main',
  'no-results': 'warning.main',
  error: 'error.main',
  offline: 'text.secondary',
};

export function EmptyState({
  variant = 'empty',
  title,
  description,
  actionLabel,
  onAction,
  icon,
}: Readonly<EmptyStateProps>) {
  const iconToRender = icon || variantIcons[variant];
  const iconColor = variantColors[variant];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          py: 8,
          px: 3,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 120,
            height: 120,
            borderRadius: '50%',
            bgcolor: theme => alpha(theme.palette.primary.main, 0.08),
            color: iconColor,
            mb: 3,
          }}
        >
          {iconToRender}
        </Box>

        <Typography
          variant="h6"
          fontWeight={600}
          gutterBottom
          color="text.primary"
        >
          {title}
        </Typography>

        {description && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ maxWidth: 360, mb: actionLabel ? 3 : 0 }}
          >
            {description}
          </Typography>
        )}

        {actionLabel && onAction && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={onAction}
            sx={{ mt: 1 }}
          >
            {actionLabel}
          </Button>
        )}
      </Box>
    </motion.div>
  );
}
