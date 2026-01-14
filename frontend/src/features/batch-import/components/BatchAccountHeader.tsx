import { Chip, Box, CircularProgress, Tooltip } from '@mui/material';
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
    <>
      {/* Número da Conta */}
      <Chip
        label={`#${index + 1}`}
        size="small"
        sx={{
          position: 'absolute',
          top: 8,
          left: 8,
          bgcolor: 'primary.main',
          color: 'white',
          fontWeight: 'bold',
          fontSize: '0.75rem',
        }}
      />

      {/* Status Icon */}
      <Box sx={{ position: 'absolute', top: 8, right: 8 }}>
        {isProcessing && <CircularProgress size={24} />}
        {isSuccess && (
          <Tooltip title="Processada com sucesso">
            <CheckCircleIcon color="success" sx={{ fontSize: 28 }} />
          </Tooltip>
        )}
        {isError && (
          <Tooltip title={errorMessage || 'Erro ao processar'}>
            <ErrorOutlineIcon color="error" sx={{ fontSize: 28 }} />
          </Tooltip>
        )}
        {!isProcessing &&
          !isSuccess &&
          !isError &&
          (isAccountValid ? (
            <Tooltip title="Pronto para processar">
              <CheckCircleIcon sx={{ color: 'success.light', fontSize: 28 }} />
            </Tooltip>
          ) : (
            <Tooltip title="Preencha todos os campos obrigatórios">
              <ErrorOutlineIcon
                sx={{ color: 'warning.main', fontSize: 28, opacity: 0.5 }}
              />
            </Tooltip>
          ))}
      </Box>
    </>
  );
};
