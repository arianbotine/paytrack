import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  LinearProgress,
  Fade,
  useTheme,
} from '@mui/material';
import { Coffee, Cloud } from '@mui/icons-material';
import { useUIStore } from '../../lib/stores/uiStore';

const MESSAGES = [
  'Preparando o ambiente...',
  'Inicializando o servidor...',
  'Conectando ao banco de dados...',
  'Carregando suas informações...',
  'Quase lá...',
];

const TIPS = [
  '💡 Dica: Você pode adicionar tags às suas contas para melhor organização',
  '💡 Dica: Use filtros avançados para encontrar transações específicas',
  '💡 Dica: O dashboard mostra um resumo completo das suas finanças',
  '💡 Dica: Você pode fazer pagamentos parciais de uma mesma conta',
  '💡 Dica: Categorias ajudam a entender onde seu dinheiro está indo',
];

export function ServerWakeupDialog() {
  const theme = useTheme();
  const { serverWaking, retryAttempt } = useUIStore();
  const [currentMessage, setCurrentMessage] = useState(0);
  const [progress, setProgress] = useState(0);
  const [tip] = useState(() => TIPS[Math.floor(Math.random() * TIPS.length)]);

  // Blur active element when dialog opens to prevent focus retention issues with aria-hidden
  useEffect(() => {
    if (serverWaking && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }, [serverWaking]);

  useEffect(() => {
    if (!serverWaking) {
      setCurrentMessage(0);
      setProgress(0);
      return;
    }

    // Simulate progress
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        // Progress slows down as it approaches 90%
        if (prev >= 90) return prev + 0.5;
        if (prev >= 70) return prev + 1;
        return prev + 2;
      });
    }, 1000);

    // Cycle through messages
    const messageInterval = setInterval(() => {
      setCurrentMessage(prev => (prev + 1) % MESSAGES.length);
    }, 4000);

    return () => {
      clearInterval(progressInterval);
      clearInterval(messageInterval);
    };
  }, [serverWaking]);

  const getEstimatedTime = () => {
    const baseTime = 50; // 50 seconds base
    const attemptPenalty = retryAttempt * 5; // Add 5s per retry
    return baseTime + attemptPenalty;
  };

  return (
    <Dialog
      open={serverWaking}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          background:
            theme.palette.mode === 'dark'
              ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%)'
              : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
        },
      }}
    >
      <DialogContent sx={{ py: 6, px: 4 }}>
        <Box display="flex" flexDirection="column" alignItems="center" gap={3}>
          {/* Animated Icon */}
          <Box
            sx={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 2,
            }}
          >
            <Box
              sx={{
                position: 'absolute',
                animation: 'pulse 2s ease-in-out infinite',
                '@keyframes pulse': {
                  '0%, 100%': {
                    opacity: 0.3,
                    transform: 'scale(1)',
                  },
                  '50%': {
                    opacity: 0.1,
                    transform: 'scale(1.5)',
                  },
                },
              }}
            >
              <Cloud
                sx={{
                  fontSize: 120,
                  color: theme.palette.primary.main,
                  opacity: 0.2,
                }}
              />
            </Box>
            <Coffee
              sx={{
                fontSize: 60,
                color: theme.palette.primary.main,
                animation: 'bounce 1.5s ease-in-out infinite',
                '@keyframes bounce': {
                  '0%, 100%': {
                    transform: 'translateY(0)',
                  },
                  '50%': {
                    transform: 'translateY(-10px)',
                  },
                },
              }}
            />
          </Box>

          {/* Title */}
          <Typography
            variant="h5"
            fontWeight={600}
            textAlign="center"
            color="text.primary"
          >
            Servidor está acordando...
          </Typography>

          {/* Subtitle */}
          <Typography
            variant="body1"
            color="text.secondary"
            textAlign="center"
            sx={{ maxWidth: 400 }}
          >
            Nosso servidor estava descansando após um período sem uso. Aguarde
            enquanto preparamos tudo para você.
          </Typography>

          {/* Progress Bar */}
          <Box sx={{ width: '100%', mt: 2 }}>
            <LinearProgress
              variant="determinate"
              value={Math.min(progress, 95)}
              sx={{
                height: 8,
                borderRadius: 4,
                backgroundColor:
                  theme.palette.mode === 'dark'
                    ? 'rgba(255, 255, 255, 0.1)'
                    : 'rgba(0, 0, 0, 0.1)',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 4,
                  background: `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.light} 100%)`,
                },
              }}
            />
          </Box>

          {/* Status Message */}
          <Fade in key={currentMessage} timeout={800}>
            <Typography
              variant="body2"
              color="text.secondary"
              textAlign="center"
              sx={{ minHeight: 24, fontWeight: 500 }}
            >
              {MESSAGES[currentMessage]}
            </Typography>
          </Fade>

          {/* Estimated Time */}
          <Box
            sx={{
              mt: 2,
              px: 3,
              py: 1.5,
              borderRadius: 2,
              backgroundColor:
                theme.palette.mode === 'dark'
                  ? 'rgba(255, 255, 255, 0.05)'
                  : 'rgba(0, 0, 0, 0.03)',
            }}
          >
            <Typography variant="caption" color="text.secondary">
              ⏱️ Tempo estimado: ~{getEstimatedTime()} segundos
            </Typography>
          </Box>

          {/* Tip */}
          <Box
            sx={{
              mt: 1,
              px: 3,
              py: 2,
              borderRadius: 2,
              backgroundColor:
                theme.palette.mode === 'dark'
                  ? 'rgba(66, 153, 225, 0.1)'
                  : 'rgba(66, 153, 225, 0.08)',
              borderLeft: `4px solid ${theme.palette.primary.main}`,
            }}
          >
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ fontStyle: 'italic' }}
            >
              {tip}
            </Typography>
          </Box>

          {retryAttempt > 0 && (
            <Typography variant="caption" color="warning.main" sx={{ mt: 1 }}>
              Tentativa {retryAttempt + 1} de conexão...
            </Typography>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
}
