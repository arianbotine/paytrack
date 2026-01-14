import { memo, useCallback, useState } from 'react';
import {
  Grid,
  IconButton,
  Autocomplete,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  Box,
  CircularProgress,
  Chip,
  Tooltip,
  Paper,
  Collapse,
  Divider,
  Typography,
  Badge,
  Button,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  ErrorOutline as ErrorOutlineIcon,
  Add as AddIcon,
  ExpandMore as ExpandMoreIcon,
  ContentCopy as ContentCopyIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { BatchAccount, AccountType } from '../types';
import { CurrencyField } from '../../../shared/components/CurrencyField';
import { QuickCreateCategory } from '../../../shared/components/QuickCreateCategory';
import { QuickCreateTag } from '../../../shared/components/QuickCreateTag';
import {
  calculateDueDates,
  calculateSubsequentDueDates,
} from '../utils/installmentCalculator';
import { getTodayLocalInput } from '../../../shared/utils/dateUtils';
import type { Vendor, Category, Tag } from '../../payables/types';
import type { Customer } from '../../receivables/types';

interface BatchAccountRowProps {
  account: BatchAccount;
  accountType: AccountType;
  vendors: Vendor[];
  customers: Customer[];
  categories: Category[];
  tags: Tag[];
  onUpdate: (accountId: string, updates: Partial<BatchAccount>) => void;
  onRemove: (accountId: string) => void;
  onRetry: (accountId: string) => void;
  onDuplicate?: (accountId: string) => void;
  index?: number;
}

export const BatchAccountRow = memo<BatchAccountRowProps>(
  ({
    account,
    accountType,
    vendors,
    customers,
    categories,
    tags,
    onUpdate,
    onRemove,
    onRetry,
    onDuplicate,
    index = 0,
  }) => {
    const isDisabled =
      account.status === 'processing' || account.status === 'success';
    const isError = account.status === 'error';
    const isProcessing = account.status === 'processing';
    const isSuccess = account.status === 'success';

    // Estados para dialogs de criação rápida
    const [quickCategoryOpen, setQuickCategoryOpen] = useState(false);
    const [quickTagOpen, setQuickTagOpen] = useState(false);

    // Estados para UX aprimorado
    const [showInstallments, setShowInstallments] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    // Calcular cor de fundo conforme status
    const getBackgroundColor = () => {
      if (isProcessing) return 'warning.light';
      if (isSuccess) return 'success.light';
      if (isError) return 'error.light';
      return 'background.paper';
    };

    // Filtrar categorias do tipo correto
    const filteredCategories = categories.filter(
      cat => cat.type === (accountType === 'payable' ? 'PAYABLE' : 'RECEIVABLE')
    );

    // Validação inline
    const validateField = useCallback(
      (field: string, value: any) => {
        const errors: Record<string, string> = { ...fieldErrors };

        switch (field) {
          case 'vendorId':
          case 'customerId':
            if (!value) {
              errors[field] =
                accountType === 'payable'
                  ? 'Credor é obrigatório'
                  : 'Devedor é obrigatório';
            } else {
              delete errors[field];
            }
            break;
          case 'amount':
            if (!value || value <= 0) {
              errors[field] = 'Valor deve ser maior que zero';
            } else {
              delete errors[field];
            }
            break;
          case 'dueDates':
            if (!value || !value[0]) {
              errors[field] = 'Data de vencimento é obrigatória';
            } else {
              delete errors[field];
            }
            break;
        }

        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
      },
      [fieldErrors, accountType]
    );

    // Handler para atualizar campo específico
    const handleFieldChange = useCallback(
      (field: keyof BatchAccount, value: any) => {
        onUpdate(account.id, { [field]: value });

        // Validar o campo após atualização
        setTimeout(() => {
          if (field === 'vendorId' || field === 'customerId') {
            validateField(field, value);
          } else if (field === 'amount') {
            validateField('amount', value);
          } else if (field === 'dueDates') {
            validateField('dueDates', value);
          }
        }, 0);
      },
      [account.id, onUpdate, validateField]
    );

    // Handler para atualizar parcelas e recalcular datas (NUNCA modifica a primeira data)
    const handleInstallmentCountChange = useCallback(
      (newCount: number) => {
        // PRESERVA EXATAMENTE a primeira data definida pelo usuário
        const preservedFirstDate = account.dueDates[0];

        if (!preservedFirstDate) {
          // Se não há primeira data, usa o dia atual (apenas para novas contas)
          const defaultDate = getTodayLocalInput();
          const newDueDates =
            newCount === 1
              ? [defaultDate]
              : calculateSubsequentDueDates(defaultDate, newCount);

          onUpdate(account.id, {
            installmentCount: newCount,
            dueDates: newDueDates,
          });
          return;
        }

        // Se há primeira data definida, mantém ela intacta e calcula apenas as subsequentes
        const newDueDates =
          newCount === 1
            ? [preservedFirstDate]
            : calculateSubsequentDueDates(preservedFirstDate, newCount);

        onUpdate(account.id, {
          installmentCount: newCount,
          dueDates: newDueDates,
        });
      },
      [account.id, account.dueDates, onUpdate]
    );

    // Handler para atualizar primeira data e recalcular datas
    const handleFirstDueDateChange = useCallback(
      (newFirstDate: string) => {
        if (!newFirstDate) {
          onUpdate(account.id, { dueDates: [newFirstDate] });
          return;
        }

        // Recalcular todas as datas mantendo a primeira data informada
        const calculatedDates = calculateDueDates(
          new Date(newFirstDate),
          account.installmentCount
        );

        onUpdate(account.id, { dueDates: calculatedDates });
      },
      [account.id, account.installmentCount, onUpdate]
    );

    // Callbacks para criação rápida de categoria/tag
    const handleCategoryCreated = useCallback(
      (newCategory: Category) => {
        // Atualiza a categoria selecionada da conta
        handleFieldChange('categoryId', newCategory.id);
        setQuickCategoryOpen(false);
      },
      [handleFieldChange]
    );

    const handleTagCreated = useCallback(
      (newTag: Tag) => {
        // Adiciona a nova tag à lista de tags da conta
        const currentTags = account.tagIds || [];
        handleFieldChange('tagIds', [...currentTags, newTag.id]);
        setQuickTagOpen(false);
      },
      [account.tagIds, handleFieldChange]
    );

    // Helper para formatar valor
    const formatCurrency = (value: number) => {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(value);
    };

    // Validar se todos os campos obrigatórios estão preenchidos
    const isAccountValid = useCallback(() => {
      // Campos obrigatórios básicos
      const hasAmount = account.amount > 0;
      const hasDueDate =
        account.dueDates &&
        account.dueDates[0] &&
        account.dueDates[0].trim() !== '';

      // Validar vendor ou customer conforme tipo
      const hasEntity =
        accountType === 'payable' ? !!account.vendorId : !!account.customerId;

      // Não pode ter erros de validação
      const hasNoErrors = Object.keys(fieldErrors).length === 0;

      return hasAmount && hasDueDate && hasEntity && hasNoErrors;
    }, [
      account.amount,
      account.dueDates,
      account.vendorId,
      account.customerId,
      accountType,
      fieldErrors,
    ]);

    // Selecionar entidade conforme tipo
    const selectedEntity =
      accountType === 'payable'
        ? vendors.find(v => v.id === account.vendorId)
        : customers.find(c => c.id === account.customerId);

    const entityLabel = accountType === 'payable' ? 'Credor' : 'Devedor';
    const entityList = accountType === 'payable' ? vendors : customers;

    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, height: 0, marginBottom: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Paper
          sx={{
            p: 2,
            mb: 2,
            bgcolor: getBackgroundColor(),
            opacity: isSuccess ? 0.7 : 1,
            transition: 'all 0.3s ease',
            position: 'relative',
            border:
              Object.keys(fieldErrors).length > 0 ? '2px solid' : '1px solid',
            borderColor:
              Object.keys(fieldErrors).length > 0 ? 'error.main' : 'divider',
            '&:hover': {
              boxShadow: isDisabled ? undefined : 3,
              borderColor: isDisabled ? 'divider' : 'primary.main',
            },
          }}
        >
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
              <Tooltip title={account.errorMessage || 'Erro ao processar'}>
                <ErrorOutlineIcon color="error" sx={{ fontSize: 28 }} />
              </Tooltip>
            )}
            {!isDisabled &&
              !isError &&
              (isAccountValid() ? (
                <Tooltip title="Pronto para processar">
                  <CheckCircleIcon
                    sx={{ color: 'success.light', fontSize: 28 }}
                  />
                </Tooltip>
              ) : (
                <Tooltip title="Preencha todos os campos obrigatórios">
                  <ErrorOutlineIcon
                    sx={{ color: 'warning.main', fontSize: 28, opacity: 0.5 }}
                  />
                </Tooltip>
              ))}
          </Box>

          <Grid container spacing={2} sx={{ mt: 3 }}>
            {/* Vendor/Customer */}
            <Grid item xs={12} sm={6} md={3}>
              <Autocomplete
                value={selectedEntity || null}
                onChange={(_, value) => {
                  const field =
                    accountType === 'payable' ? 'vendorId' : 'customerId';
                  handleFieldChange(field, value?.id || '');
                  validateField(field, value?.id);
                }}
                options={entityList}
                getOptionLabel={option => option.name}
                disabled={isDisabled}
                renderInput={params => (
                  <TextField
                    {...params}
                    label={entityLabel}
                    required
                    size="small"
                    error={!!(fieldErrors.vendorId || fieldErrors.customerId)}
                    helperText={fieldErrors.vendorId || fieldErrors.customerId}
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {params.InputProps.endAdornment}
                          <Tooltip
                            title={`Selecione o ${entityLabel.toLowerCase()} desta conta`}
                          >
                            <InfoIcon
                              sx={{
                                fontSize: 16,
                                color: 'text.disabled',
                                mr: 1,
                              }}
                            />
                          </Tooltip>
                        </>
                      ),
                    }}
                  />
                )}
              />
            </Grid>

            {/* Category */}
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small" disabled={isDisabled}>
                <InputLabel>Categoria</InputLabel>
                <Select
                  value={account.categoryId || ''}
                  onChange={e =>
                    handleFieldChange('categoryId', e.target.value || undefined)
                  }
                  label="Categoria"
                >
                  <MenuItem value="">
                    <em>Nenhuma</em>
                  </MenuItem>
                  {filteredCategories.map(cat => (
                    <MenuItem key={cat.id} value={cat.id}>
                      <Box
                        sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                      >
                        <Box
                          sx={{
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            bgcolor: cat.color || 'grey.400',
                          }}
                        />
                        {cat.name}
                      </Box>
                    </MenuItem>
                  ))}
                  <MenuItem
                    onClick={() => setQuickCategoryOpen(true)}
                    sx={{ borderTop: 1, borderColor: 'divider' }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        color: 'primary.main',
                      }}
                    >
                      <AddIcon fontSize="small" />
                      Criar nova categoria
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Amount */}
            <Grid item xs={12} sm={6} md={2}>
              <CurrencyField
                label="Valor Total"
                value={account.amount}
                onChange={value => {
                  handleFieldChange('amount', value);
                  validateField('amount', value);
                }}
                disabled={isDisabled}
                required
                size="small"
              />
              {account.amount > 0 && account.installmentCount > 1 && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mt: 0.5, display: 'block' }}
                >
                  {account.installmentCount}x de{' '}
                  {formatCurrency(account.amount / account.installmentCount)}
                </Typography>
              )}
            </Grid>

            {/* Installment Count */}
            <Grid item xs={6} sm={3} md={1}>
              <Badge
                badgeContent={
                  account.dueDates.length > 1 ? account.dueDates.length : null
                }
                color="primary"
                sx={{ width: '100%' }}
              >
                <TextField
                  label="Parcelas"
                  type="number"
                  value={account.installmentCount}
                  onChange={e => {
                    const count = Math.max(
                      1,
                      Math.min(120, Number.parseInt(e.target.value) || 1)
                    );
                    handleInstallmentCountChange(count);
                  }}
                  disabled={isDisabled}
                  size="small"
                  fullWidth
                  inputProps={{ min: 1, max: 120 }}
                />
              </Badge>
              {account.installmentCount > 1 && (
                <Button
                  size="small"
                  onClick={() => setShowInstallments(!showInstallments)}
                  sx={{ mt: 0.5, fontSize: '0.7rem', p: 0.5 }}
                  endIcon={
                    <ExpandMoreIcon
                      sx={{
                        transform: showInstallments ? 'rotate(180deg)' : 'none',
                        transition: '0.3s',
                      }}
                    />
                  }
                >
                  {showInstallments ? 'Ocultar' : 'Ver'} parcelas
                </Button>
              )}
            </Grid>

            {/* First Due Date */}
            <Grid item xs={6} sm={3} md={2}>
              <TextField
                label="1ª Vencimento"
                type="date"
                value={account.dueDates[0] || ''}
                onChange={e => {
                  handleFirstDueDateChange(e.target.value);
                  validateField('dueDates', [e.target.value]);
                }}
                disabled={isDisabled}
                size="small"
                fullWidth
                required
                error={!!fieldErrors.dueDates}
                helperText={fieldErrors.dueDates}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            {/* Tags */}
            <Grid item xs={12} sm={6} md={2}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                <Autocomplete
                  multiple
                  value={
                    account.tagIds
                      .map(id => tags.find(t => t.id === id))
                      .filter(Boolean) as Tag[]
                  }
                  onChange={(_, value) => {
                    handleFieldChange(
                      'tagIds',
                      value.map(t => t.id)
                    );
                  }}
                  options={tags}
                  getOptionLabel={option => option.name}
                  disabled={isDisabled}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip
                        {...getTagProps({ index })}
                        key={option.id}
                        label={option.name}
                        size="small"
                        sx={{
                          bgcolor: option.color || 'grey.300',
                          color: 'white',
                        }}
                      />
                    ))
                  }
                  renderInput={params => (
                    <TextField {...params} label="Tags" size="small" />
                  )}
                  sx={{ flex: 1 }}
                />
                <IconButton
                  color="primary"
                  onClick={() => setQuickTagOpen(true)}
                  disabled={isDisabled}
                  size="small"
                  sx={{ mt: 0.5 }}
                >
                  <AddIcon />
                </IconButton>
              </Box>
            </Grid>

            {/* Notes */}
            <Grid item xs={12} md={account.status === 'error' ? 8 : 10}>
              <TextField
                label="Observações"
                value={account.notes || ''}
                onChange={e => handleFieldChange('notes', e.target.value)}
                disabled={isDisabled}
                size="small"
                fullWidth
                multiline
                maxRows={2}
              />
            </Grid>

            {/* Actions */}
            <Grid
              item
              xs={12}
              md={2}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: 0.5,
              }}
            >
              {onDuplicate && !isDisabled && (
                <Tooltip title="Duplicar esta conta">
                  <IconButton
                    color="primary"
                    onClick={() => onDuplicate(account.id)}
                    size="small"
                  >
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
              {isError && (
                <Tooltip title="Tentar novamente">
                  <IconButton
                    color="primary"
                    onClick={() => onRetry(account.id)}
                    size="small"
                  >
                    <RefreshIcon />
                  </IconButton>
                </Tooltip>
              )}
              {!isProcessing && !isSuccess && (
                <Tooltip title="Remover">
                  <IconButton
                    color="error"
                    onClick={() => onRemove(account.id)}
                    size="small"
                  >
                    <DeleteIcon />
                  </IconButton>
                </Tooltip>
              )}
            </Grid>

            {/* Preview de Parcelas */}
            {account.installmentCount > 1 && (
              <Grid item xs={12}>
                <Collapse in={showInstallments}>
                  <Box sx={{ mt: 1 }}>
                    <Divider sx={{ mb: 2 }}>
                      <Chip label="Detalhamento das Parcelas" size="small" />
                    </Divider>
                    <Grid container spacing={1}>
                      {account.dueDates.map((date, idx) => (
                        <Grid item xs={6} sm={4} md={3} lg={2} key={idx}>
                          <Paper
                            variant="outlined"
                            sx={{
                              p: 1.5,
                              textAlign: 'center',
                              bgcolor: 'action.hover',
                              transition: 'all 0.2s',
                              '&:hover': {
                                bgcolor: 'action.selected',
                                transform: 'translateY(-2px)',
                                boxShadow: 2,
                              },
                            }}
                          >
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              fontWeight="bold"
                            >
                              Parcela {idx + 1}/{account.installmentCount}
                            </Typography>
                            <Typography
                              variant="body2"
                              fontWeight="medium"
                              sx={{ mt: 0.5 }}
                            >
                              {formatCurrency(
                                account.amount / account.installmentCount
                              )}
                            </Typography>
                            <Typography variant="caption" color="primary">
                              {new Date(date + 'T00:00:00').toLocaleDateString(
                                'pt-BR'
                              )}
                            </Typography>
                          </Paper>
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                </Collapse>
              </Grid>
            )}

            {/* Error Message */}
            {isError && account.errorMessage && (
              <Grid item xs={12}>
                <Alert severity="error" sx={{ py: 0.5 }}>
                  {account.errorMessage}
                </Alert>
              </Grid>
            )}
          </Grid>
        </Paper>

        {/* Quick Create Dialogs */}
        <QuickCreateCategory
          open={quickCategoryOpen}
          onClose={() => setQuickCategoryOpen(false)}
          onCreated={handleCategoryCreated}
          type={accountType === 'payable' ? 'PAYABLE' : 'RECEIVABLE'}
        />
        <QuickCreateTag
          open={quickTagOpen}
          onClose={() => setQuickTagOpen(false)}
          onCreated={handleTagCreated}
        />
      </motion.div>
    );
  }
);

BatchAccountRow.displayName = 'BatchAccountRow';
