import {
  Chip,
  Box,
  CircularProgress,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  ErrorOutline as ErrorOutlineIcon,
} from '@mui/icons-material';

interface BatchAccountHeaderProps {
  index: number;
  isProcessing: boolean;
  isSuccess: boolean;
  isError: boolean;
  isAccountValid: boolean;
  errorMessage?: string;
}

/**
 * Componente que renderiza o cabeçalho da conta (número e status icon).
 * Mostra o índice da conta e o ícone de status apropriado.
 */
export const BatchAccountHeader: React.FC<BatchAccountHeaderProps> = ({
  index,
  isProcessing,
  isSuccess,
  isError,
  isAccountValid,
  errorMessage,
}) => {
  return (
    <Box
      sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}
    >
      <Typography component="h3" variant="subtitle1" fontWeight={600}>
        Conta {index + 1}
      </Typography>
      {isProcessing ? (
        <Chip
          size="small"
          color="primary"
          icon={<CircularProgress size={16} color="inherit" />}
          label="Processando"
        />
      ) : isSuccess ? (
        <Chip
          size="small"
          color="success"
          icon={<CheckCircleIcon />}
          label="Processada"
        />
      ) : isError ? (
        <Tooltip title={errorMessage || 'Revise os campos desta conta'} arrow>
          <Chip
            size="small"
            color="error"
            icon={<ErrorOutlineIcon />}
            label="Revise os campos"
          />
        </Tooltip>
      ) : isAccountValid ? (
        <Chip
          size="small"
          color="success"
          variant="outlined"
          icon={<CheckCircleIcon />}
          label="Pronta para processar"
        />
      ) : (
        <Chip
          size="small"
          color="warning"
          variant="outlined"
          icon={<ErrorOutlineIcon />}
          label="Preencha os campos obrigatórios"
        />
      )}
    </Box>
  );
};
