import React from 'react';
import { Box, IconButton, Tooltip } from '@mui/material';
import {
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  ContentCopy as ContentCopyIcon,
} from '@mui/icons-material';

interface BatchAccountActionsProps {
  accountId: string;
  isDisabled: boolean;
  isError: boolean;
  isProcessing: boolean;
  isSuccess: boolean;
  onDuplicate?: (accountId: string) => void;
  onRetry: (accountId: string) => void;
  onRemove: (accountId: string) => void;
}

/**
 * Componente que renderiza os botões de ação da conta.
 * Separado para melhor organização e clareza.
 */
export const BatchAccountActions: React.FC<BatchAccountActionsProps> = ({
  accountId,
  isDisabled,
  isError,
  isProcessing,
  isSuccess,
  onDuplicate,
  onRetry,
  onRemove,
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 0.75,
      }}
    >
      {onDuplicate && !isDisabled && (
        <Tooltip title="Duplicar esta conta">
          <IconButton
            color="primary"
            onClick={() => onDuplicate(accountId)}
            size="medium"
            aria-label="Duplicar conta"
          >
            <ContentCopyIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
      {isError && (
        <Tooltip title="Tentar novamente">
          <IconButton
            color="primary"
            onClick={() => onRetry(accountId)}
            size="medium"
            aria-label="Tentar novamente"
          >
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      )}
      {!isProcessing && !isSuccess && (
        <Tooltip title="Remover">
          <IconButton
            color="error"
            onClick={() => onRemove(accountId)}
            size="medium"
            aria-label="Remover conta"
          >
            <DeleteIcon />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );
};
