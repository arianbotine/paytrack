import {
  Backdrop,
  CircularProgress,
  Typography,
  Box,
  alpha,
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';

interface LoadingOverlayProps {
  open: boolean;
  message?: string;
}

export function LoadingOverlay({
  open,
  message,
}: Readonly<LoadingOverlayProps>) {
  // Blur active element when overlay opens to prevent focus retention issues with aria-hidden
  useEffect(() => {
    if (open && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <Backdrop
          open={open}
          sx={{
            zIndex: theme => theme.zIndex.drawer + 1,
            bgcolor: theme => alpha(theme.palette.background.default, 0.8),
            backdropFilter: 'blur(4px)',
          }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
              }}
            >
              <CircularProgress size={48} thickness={4} />
              {message && (
                <Typography variant="body2" color="text.secondary">
                  {message}
                </Typography>
              )}
            </Box>
          </motion.div>
        </Backdrop>
      )}
    </AnimatePresence>
  );
}

interface InlineLoadingProps {
  size?: number;
  message?: string;
}

export function InlineLoading({
  size = 24,
  message,
}: Readonly<InlineLoadingProps>) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        py: 4,
      }}
    >
      <CircularProgress size={size} thickness={4} />
      {message && (
        <Typography variant="body2" color="text.secondary">
          {message}
        </Typography>
      )}
    </Box>
  );
}
