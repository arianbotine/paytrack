import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Stack,
  ToggleButtonGroup,
  ToggleButton,
  Alert,
  CircularProgress,
  LinearProgress,
  Fade,
  Zoom,
} from '@mui/material';
import {
  Add as AddIcon,
  PlayArrow as PlayArrowIcon,
  Delete as DeleteAllIcon,
} from '@mui/icons-material';
import { AnimatePresence } from 'framer-motion';
import { v4 as uuidv4 } from 'uuid';
import { PageHeader } from '../../../shared/components/PageHeader';
import { BatchAccountRow } from '../components/BatchAccountRow';
import { useBatchStorage } from '../hooks/useBatchStorage';
import { useBatchProcess } from '../hooks/useBatchProcess';
import { BatchAccount, BatchState, AccountType } from '../types';
import { useVendors, useTags } from '../../payables/hooks/usePayables';
import { useCustomers } from '../../receivables/hooks/useReceivables';
import { useRelatedData } from '../../../shared/hooks/useAccounts';
import { getTodayLocalInput } from '../../../shared/utils/dateUtils';
import type { Category } from '../../payables/types';

export default function BatchImportPage() {
  // State principal
  const [state, setState] = useState<BatchState>({
    accounts: [],
    accountType: 'payable',
  });

  // Hooks de persistência
  const { clearStorage } = useBatchStorage(state, setState);

  // Queries para dados relacionados
  const { data: vendors = [], isLoading: loadingVendors } = useVendors();
  const { data: customers = [], isLoading: loadingCustomers } = useCustomers();

  // Buscar todas as categorias (ambos os tipos) e filtrar no componente
  const { data: categories = [], isLoading: loadingCategories } =
    useRelatedData<Category>({
      queryKey: ['categories'],
      endpoint: '/categories',
    });

  const { data: tags = [], isLoading: loadingTags } = useTags();

  // Callbacks para manipular contas
  const handleUpdateAccount = useCallback(
    (accountId: string, updates: Partial<BatchAccount>) => {
      setState(prev => ({
        ...prev,
        accounts: prev.accounts.map(acc =>
          acc.id === accountId ? { ...acc, ...updates } : acc
        ),
      }));
    },
    []
  );

  const handleRemoveAccount = useCallback((accountId: string) => {
    setState(prev => ({
      ...prev,
      accounts: prev.accounts.filter(acc => acc.id !== accountId),
    }));
  }, []);

  const handleDuplicateAccount = useCallback(
    (accountId: string) => {
      const accountToDuplicate = state.accounts.find(
        acc => acc.id === accountId
      );
      if (!accountToDuplicate) return;

      const newAccount: BatchAccount = {
        ...accountToDuplicate,
        id: uuidv4(),
        status: 'idle',
        errorMessage: undefined,
      };

      setState(prev => ({
        ...prev,
        accounts: [...prev.accounts, newAccount],
      }));
    },
    [state.accounts]
  );

  const handleAddAccount = useCallback(() => {
    const newAccount: BatchAccount = {
      id: uuidv4(),
      vendorId: undefined,
      customerId: undefined,
      categoryId: undefined,
      amount: 0,
      installmentCount: 1,
      dueDates: [getTodayLocalInput()],
      tagIds: [],
      notes: undefined,
      payment: undefined,
      status: 'idle',
      errorMessage: undefined,
    };

    setState(prev => ({
      ...prev,
      accounts: [...prev.accounts, newAccount],
    }));
  }, []);

  const handleClearAll = useCallback(() => {
    if (globalThis.confirm('Deseja realmente limpar todas as contas?')) {
      setState(prev => ({
        ...prev,
        accounts: [],
      }));
      clearStorage();
    }
  }, [clearStorage]);

  const handleChangeAccountType = useCallback(
    (_: React.MouseEvent<HTMLElement>, newType: AccountType | null) => {
      if (newType && newType !== state.accountType) {
        // Avisar se houver contas cadastradas
        if (state.accounts.length > 0) {
          const confirm = globalThis.confirm(
            'Trocar o tipo de conta irá limpar todas as contas cadastradas. Deseja continuar?'
          );
          if (!confirm) return;
        }

        setState({
          accountType: newType,
          accounts: [],
        });
        clearStorage();
      }
    },
    [state.accountType, state.accounts.length, clearStorage]
  );

  // Hook de processamento
  const { processAllAccounts, retryAccount, result } = useBatchProcess(
    state.accounts,
    state.accountType,
    handleUpdateAccount,
    handleRemoveAccount
  );

  // Limpar storage quando todas as contas forem processadas com sucesso
  useEffect(() => {
    if (state.accounts.length === 0 && !result.isProcessing) {
      clearStorage();
    }
  }, [state.accounts.length, result.isProcessing, clearStorage]);

  // Contadores
  const pendingCount = state.accounts.filter(
    acc => acc.status === 'idle' || acc.status === 'error'
  ).length;
  const errorCount = state.accounts.filter(
    acc => acc.status === 'error'
  ).length;

  const isLoading =
    loadingVendors || loadingCustomers || loadingCategories || loadingTags;

  return (
    <Box sx={{ p: 3 }}>
      <PageHeader
        title="Cadastro em Lote"
        subtitle="Cadastre múltiplas contas de uma única vez"
      />

      {/* Seletor de Tipo de Conta */}
      <Paper sx={{ p: 2.5, mb: 3 }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
        >
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ minWidth: 'fit-content' }}
          >
            Tipo de Conta
          </Typography>
          <ToggleButtonGroup
            value={state.accountType}
            exclusive
            onChange={handleChangeAccountType}
            aria-label="tipo de conta"
            size="medium"
            sx={{
              '& .MuiToggleButton-root': {
                px: 3,
                py: 1,
                fontWeight: 'medium',
              },
            }}
          >
            <ToggleButton value="payable" aria-label="contas a pagar">
              Contas a Pagar
            </ToggleButton>
            <ToggleButton value="receivable" aria-label="contas a receber">
              Contas a Receber
            </ToggleButton>
          </ToggleButtonGroup>
        </Stack>
      </Paper>

      {/* Resumo e Ações */}
      <Paper sx={{ p: 2.5, mb: 3 }}>
        <Stack spacing={2.5}>
          {/* Linha de Status e Ações Principais */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              gap: 2,
              alignItems: { xs: 'stretch', sm: 'center' },
              justifyContent: 'space-between',
            }}
          >
            {/* Resumo de Status */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                flexWrap: 'wrap',
              }}
            >
              {state.accounts.length === 0 ? (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    py: 1,
                    px: 2,
                    bgcolor: 'grey.50',
                    borderRadius: 1,
                    fontStyle: 'italic',
                  }}
                >
                  Nenhuma conta cadastrada
                </Typography>
              ) : (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    flexWrap: 'wrap',
                  }}
                >
                  {/* Total de contas */}
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.75,
                      px: 2,
                      py: 0.75,
                      bgcolor: '#2563eb',
                      color: '#ffffff',
                      borderRadius: 3,
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      boxShadow: 'none',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                    }}
                  >
                    <span>{state.accounts.length}</span>
                    <span>
                      {state.accounts.length === 1 ? 'conta' : 'contas'}
                    </span>
                  </Box>

                  {/* Contas processadas com sucesso */}
                  <Fade in={result.successCount > 0}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.75,
                        px: 2,
                        py: 0.75,
                        bgcolor: '#16a34a',
                        color: '#ffffff',
                        borderRadius: 3,
                        fontSize: '0.875rem',
                        boxShadow: 'none',
                        fontWeight: 600,
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                      }}
                    >
                      <span>✓</span>
                      <span>{result.successCount} processadas</span>
                    </Box>
                  </Fade>

                  {/* Contas pendentes */}
                  <Fade in={pendingCount > 0}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.75,
                        px: 2,
                        py: 0.75,
                        bgcolor: result.isProcessing ? '#f59e0b' : '#6b7280',
                        color: '#ffffff',
                        borderRadius: 3,
                        fontSize: '0.875rem',
                        boxShadow: 'none',
                        fontWeight: 600,
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        animation: result.isProcessing
                          ? 'pulse 2s infinite'
                          : 'none',
                        '@keyframes pulse': {
                          '0%': { opacity: 1 },
                          '50%': { opacity: 0.75 },
                          '100%': { opacity: 1 },
                        },
                      }}
                    >
                      <span>{pendingCount} pendentes</span>
                    </Box>
                  </Fade>

                  {/* Contas com erro */}
                  <Fade in={errorCount > 0}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.75,
                        px: 2,
                        py: 0.75,
                        bgcolor: '#dc2626',
                        color: '#ffffff',
                        borderRadius: 3,
                        fontSize: '0.875rem',
                        boxShadow: 'none',
                        fontWeight: 600,
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                      }}
                    >
                      <span>✗</span>
                      <span>{errorCount} com erro</span>
                    </Box>
                  </Fade>
                </Box>
              )}
            </Box>

            {/* Botões de Ação Principal */}
            <Box
              sx={{
                display: 'flex',
                gap: 1.5,
                flexShrink: 0,
                '& .MuiButton-root': {
                  minWidth: { xs: '100%', sm: 'auto' },
                },
              }}
            >
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={handleAddAccount}
                disabled={result.isProcessing}
                size="medium"
              >
                Adicionar
              </Button>

              {state.accounts.length > 0 && (
                <>
                  <Button
                    variant="contained"
                    startIcon={
                      result.isProcessing ? (
                        <CircularProgress size={18} sx={{ color: 'white' }} />
                      ) : (
                        <PlayArrowIcon />
                      )
                    }
                    onClick={processAllAccounts}
                    disabled={result.isProcessing || pendingCount === 0}
                    color="primary"
                    size="medium"
                    sx={{
                      fontWeight: 'bold',
                      transition: 'all 0.3s',
                      '&:not(:disabled):hover': {
                        transform: 'scale(1.02)',
                        boxShadow: 4,
                      },
                    }}
                  >
                    {result.isProcessing ? 'Processando' : 'Processar'}
                  </Button>

                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<DeleteAllIcon />}
                    onClick={handleClearAll}
                    disabled={result.isProcessing}
                    size="medium"
                  >
                    Limpar Tudo
                  </Button>
                </>
              )}
            </Box>
          </Box>

          {/* Barra de Progresso */}
          {result.isProcessing && (
            <Fade in>
              <Box>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  sx={{ mb: 1.5 }}
                >
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    fontWeight="medium"
                  >
                    Processando contas
                  </Typography>
                  <Typography variant="body2" fontWeight="bold" color="primary">
                    {result.successCount} de {state.accounts.length}
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={(result.successCount / state.accounts.length) * 100}
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>
            </Fade>
          )}

          {/* Mensagem de Sucesso Total */}
          {!result.isProcessing &&
            result.successCount > 0 &&
            result.successCount === state.accounts.length && (
              <Zoom in>
                <Alert
                  severity="success"
                  icon={<span style={{ fontSize: '1.25rem' }}>🎉</span>}
                  sx={{ borderRadius: 2 }}
                >
                  <Typography variant="body2" fontWeight="medium">
                    Todas as {result.successCount} contas foram processadas com
                    sucesso!
                  </Typography>
                </Alert>
              </Zoom>
            )}
        </Stack>
      </Paper>

      {/* Informação de Carregamento */}
      {isLoading && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <CircularProgress size={20} />
            <Typography>Carregando dados...</Typography>
          </Stack>
        </Alert>
      )}

      {/* Lista de Contas */}
      {!isLoading && state.accounts.length === 0 && (
        <Zoom in>
          <Paper
            sx={theme => ({
              p: 6,
              textAlign: 'center',
              background:
                theme.palette.mode === 'light'
                  ? 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'
                  : 'linear-gradient(135deg, rgba(66, 66, 74, 0.8) 0%, rgba(25, 25, 35, 0.95) 100%)',
              border: '2px dashed',
              borderColor: 'primary.main',
              borderRadius: 3,
              position: 'relative',
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background:
                  theme.palette.mode === 'light'
                    ? 'transparent'
                    : 'radial-gradient(circle at 50% 0%, rgba(66, 165, 245, 0.1) 0%, transparent 60%)',
                pointerEvents: 'none',
              },
            })}
          >
            <Box sx={{ mb: 3, position: 'relative', zIndex: 1 }}>
              <AddIcon
                sx={{ fontSize: 80, color: 'primary.main', opacity: 0.7 }}
              />
            </Box>
            <Typography
              variant="h5"
              color="text.primary"
              fontWeight="bold"
              gutterBottom
              sx={{ position: 'relative', zIndex: 1 }}
            >
              Comece seu cadastro em lote
            </Typography>
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{
                mb: 3,
                maxWidth: 600,
                mx: 'auto',
                position: 'relative',
                zIndex: 1,
              }}
            >
              Cadastre múltiplas contas de forma rápida e eficiente. Você pode
              adicionar credores/devedores, categorias, valores e parcelamentos
              em uma única operação.
            </Typography>

            {/* Dicas rápidas */}
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={2}
              sx={{
                mb: 4,
                maxWidth: 800,
                mx: 'auto',
                position: 'relative',
                zIndex: 1,
              }}
            >
              <Paper
                elevation={2}
                sx={{
                  p: 2,
                  flex: 1,
                  bgcolor: 'background.paper',
                  border: 1,
                  borderColor: 'divider',
                  transition: 'all 0.3s',
                  '&:hover': {
                    borderColor: 'primary.main',
                    boxShadow: 4,
                  },
                }}
              >
                <Typography
                  variant="subtitle2"
                  color="primary"
                  fontWeight="bold"
                  gutterBottom
                >
                  📝 Fácil Duplicação
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Use o botão de duplicar para criar contas similares
                  rapidamente
                </Typography>
              </Paper>
              <Paper
                elevation={2}
                sx={{
                  p: 2,
                  flex: 1,
                  bgcolor: 'background.paper',
                  border: 1,
                  borderColor: 'divider',
                  transition: 'all 0.3s',
                  '&:hover': {
                    borderColor: 'primary.main',
                    boxShadow: 4,
                  },
                }}
              >
                <Typography
                  variant="subtitle2"
                  color="primary"
                  fontWeight="bold"
                  gutterBottom
                >
                  🔢 Parcelamento Automático
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Defina parcelas e veja o cálculo automático das datas
                </Typography>
              </Paper>
              <Paper
                elevation={2}
                sx={{
                  p: 2,
                  flex: 1,
                  bgcolor: 'background.paper',
                  border: 1,
                  borderColor: 'divider',
                  transition: 'all 0.3s',
                  '&:hover': {
                    borderColor: 'primary.main',
                    boxShadow: 4,
                  },
                }}
              >
                <Typography
                  variant="subtitle2"
                  color="primary"
                  fontWeight="bold"
                  gutterBottom
                >
                  ✅ Validação em Tempo Real
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Receba feedback instantâneo sobre campos obrigatórios
                </Typography>
              </Paper>
            </Stack>

            <Button
              variant="contained"
              size="large"
              startIcon={<AddIcon />}
              onClick={handleAddAccount}
              sx={{
                px: 5,
                py: 1.5,
                fontSize: '1rem',
                fontWeight: 'bold',
                borderRadius: 2,
                boxShadow: 3,
                position: 'relative',
                zIndex: 1,
                textTransform: 'none',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: 6,
                },
                transition: 'all 0.3s',
              }}
            >
              Começar Cadastro
            </Button>
          </Paper>
        </Zoom>
      )}

      {!isLoading && state.accounts.length > 0 && (
        <Box>
          <AnimatePresence>
            {state.accounts.map((account, index) => (
              <BatchAccountRow
                key={account.id}
                account={account}
                accountType={state.accountType}
                vendors={vendors}
                customers={customers}
                categories={categories}
                tags={tags}
                onUpdate={handleUpdateAccount}
                onRemove={handleRemoveAccount}
                onRetry={retryAccount}
                onDuplicate={handleDuplicateAccount}
                index={index}
              />
            ))}
          </AnimatePresence>
        </Box>
      )}
    </Box>
  );
}
