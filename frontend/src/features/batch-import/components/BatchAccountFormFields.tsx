import {
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  Badge,
  Button,
  Box,
  IconButton,
  InputAdornment,
  Stack,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  ExpandMore as ExpandMoreIcon,
  Add as AddIcon,
  ContentCopy as ContentCopyIcon,
  Check as CheckIcon,
  SwapHoriz as SwapHorizIcon,
} from '@mui/icons-material';
import { CurrencyField } from '../../../shared/components/CurrencyField';
import { BatchAccount, AccountType } from '../types';
import type { Vendor, Category, Tag } from '../../payables/types';
import type { Customer } from '../../receivables/types';

const CategoryLoadingIcon = ({ className }: { className?: string }) => (
  <CircularProgress
    className={className}
    size={18}
    aria-label="Carregando categoria"
  />
);

interface BatchAccountFormFieldsProps {
  account: BatchAccount;
  accountType: AccountType;
  isDisabled: boolean;
  selectedEntity: Vendor | Customer | undefined;
  onEntityChange: (field: 'vendorId' | 'customerId', value: string) => void;
  entityLabel: string;
  entityList: (Vendor | Customer)[];
  filteredCategories: Category[];
  tags: Tag[];
  fieldErrors: Record<string, string>;
  isFetchingLatestEntityAccount: boolean;
  hasLatestEntityAccountError: boolean;
  categoryAutoApplied: boolean;
  amountInputMode: 'total' | 'perInstallment';
  amountInputValue: number | null;
  latestCategoryAccount:
    | { amount: number; tagIds: string[] }
    | null
    | undefined;
  isFetchingLatestCategoryAccount: boolean;
  hasLatestCategoryAccountError: boolean;
  isLatestAmountCopied: boolean;
  isLatestTagsCopied: boolean;
  formatCurrency: (value: number) => string;
  showInstallments: boolean;
  onFieldChange: (field: keyof BatchAccount, value: any) => void;
  onAmountInputChange: (value: number | null) => void;
  onToggleAmountInputMode: () => void;
  onCategoryChange: (categoryId: string | undefined) => void;
  onCopyLatestAmount: () => void;
  onCopyLatestTags: () => void;
  onInstallmentCountChange: (count: number) => void;
  onFirstDueDateChange: (date: string) => void;
  onValidateField: (field: string, value: any) => void;
  onQuickCategoryOpen: () => void;
  onQuickTagOpen: () => void;
  onToggleInstallments: () => void;
}

/**
 * Componente que renderiza todos os campos do formulário principal da conta.
 * Separado do componente pai para melhor organização e manutenção.
 */
export const BatchAccountFormFields: React.FC<BatchAccountFormFieldsProps> = ({
  account,
  accountType,
  isDisabled,
  selectedEntity,
  onEntityChange,
  entityLabel,
  entityList,
  filteredCategories,
  tags,
  fieldErrors,
  isFetchingLatestEntityAccount,
  hasLatestEntityAccountError,
  categoryAutoApplied,
  amountInputMode,
  amountInputValue,
  latestCategoryAccount,
  isFetchingLatestCategoryAccount,
  hasLatestCategoryAccountError,
  isLatestAmountCopied,
  isLatestTagsCopied,
  formatCurrency,
  showInstallments,
  onFieldChange,
  onAmountInputChange,
  onToggleAmountInputMode,
  onCategoryChange,
  onCopyLatestAmount,
  onCopyLatestTags,
  onInstallmentCountChange,
  onFirstDueDateChange,
  onValidateField,
  onQuickCategoryOpen,
  onQuickTagOpen,
  onToggleInstallments,
}) => {
  const theme = useTheme();
  const entityId =
    accountType === 'payable' ? account.vendorId : account.customerId;
  const latestEntityLabel = accountType === 'payable' ? 'credor' : 'devedor';
  const categoryStatusMessage = isFetchingLatestEntityAccount
    ? 'Buscando a categoria mais recente...'
    : categoryAutoApplied
      ? 'Categoria preenchida pela última conta'
      : hasLatestEntityAccountError && entityId
        ? 'Não foi possível buscar a categoria; selecione manualmente.'
        : '';
  const latestCategoryMessage = !entityId
    ? `Selecione um ${latestEntityLabel} para buscar os dados`
    : !account.categoryId
      ? 'Selecione uma categoria para buscar os dados'
      : isFetchingLatestCategoryAccount
        ? 'Buscando a última conta desta categoria...'
        : hasLatestCategoryAccountError
          ? 'Não foi possível carregar os dados da última conta'
          : latestCategoryAccount === null
            ? 'Nenhuma conta anterior encontrada para esta categoria'
            : '';
  const amountLabel =
    amountInputMode === 'perInstallment'
      ? 'Valor por Parcela'
      : account.installmentCount > 1
        ? 'Valor Total'
        : 'Valor';
  const amountHelperText =
    amountInputMode === 'total' &&
    account.installmentCount > 1 &&
    amountInputValue
      ? `${account.installmentCount}x de ${formatCurrency(amountInputValue / account.installmentCount)}`
      : amountInputMode === 'perInstallment' && amountInputValue
        ? `Total: ${formatCurrency(amountInputValue * account.installmentCount)} (${account.installmentCount}x)`
        : amountInputMode === 'perInstallment'
          ? 'Digite o valor de cada parcela'
          : undefined;

  return (
    <>
      {/* Vendor/Customer */}
      <Grid item xs={12} md={6}>
        <Autocomplete
          value={selectedEntity || null}
          onChange={(_, value) => {
            const field = accountType === 'payable' ? 'vendorId' : 'customerId';
            onEntityChange(field, value?.id || '');
            onValidateField(field, value?.id);
          }}
          options={entityList}
          getOptionKey={option => option.id}
          getOptionLabel={option => option.name}
          disabled={isDisabled}
          renderInput={params => (
            <TextField
              {...params}
              label={entityLabel}
              required
              size="medium"
              error={!!(fieldErrors.vendorId || fieldErrors.customerId)}
              helperText={fieldErrors.vendorId || fieldErrors.customerId}
            />
          )}
        />
      </Grid>

      {/* Category */}
      <Grid item xs={12} md={6}>
        <Tooltip title={categoryStatusMessage} arrow>
          <FormControl fullWidth size="medium" disabled={isDisabled}>
            <InputLabel>Categoria</InputLabel>
            <Select
              value={account.categoryId || ''}
              onChange={e => onCategoryChange(e.target.value || undefined)}
              label="Categoria"
              IconComponent={
                isFetchingLatestEntityAccount ? CategoryLoadingIcon : undefined
              }
              sx={{
                transition: theme.transitions.create(['background-color'], {
                  duration: 250,
                }),
                backgroundColor: categoryAutoApplied
                  ? 'action.selected'
                  : 'transparent',
                '& .MuiOutlinedInput-notchedOutline': {
                  transition: theme.transitions.create(['border-color'], {
                    duration: 250,
                  }),
                  borderColor: categoryAutoApplied ? 'success.main' : undefined,
                },
              }}
            >
              <MenuItem value="">
                <em>Nenhuma</em>
              </MenuItem>
              {filteredCategories.map(cat => (
                <MenuItem key={cat.id} value={cat.id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
                onClick={onQuickCategoryOpen}
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
        </Tooltip>
      </Grid>

      {/* Amount */}
      <Grid item xs={12} sm={6} md={3}>
        <CurrencyField
          label={amountLabel}
          value={amountInputValue}
          onChange={onAmountInputChange}
          disabled={isDisabled}
          required
          size="medium"
          helperText={fieldErrors.amount || amountHelperText}
          error={!!fieldErrors.amount}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <Stack direction="row" alignItems="center" spacing={0.25}>
                  {account.installmentCount > 1 && (
                    <Tooltip
                      title={`Alternar para valor ${amountInputMode === 'total' ? 'por parcela' : 'total'}`}
                      arrow
                    >
                      <IconButton
                        size="small"
                        onClick={onToggleAmountInputMode}
                        disabled={isDisabled}
                        aria-label={`Alternar para valor ${amountInputMode === 'total' ? 'por parcela' : 'total'}`}
                        sx={{
                          color: 'primary.main',
                          '&:hover': { backgroundColor: 'primary.lighter' },
                        }}
                      >
                        <SwapHorizIcon />
                      </IconButton>
                    </Tooltip>
                  )}
                  <Tooltip
                    title={
                      latestCategoryMessage ||
                      (isLatestAmountCopied
                        ? 'Valor da última conta copiado'
                        : 'Copiar valor da última conta')
                    }
                    arrow
                  >
                    <span>
                      <IconButton
                        size="small"
                        onClick={onCopyLatestAmount}
                        disabled={
                          isDisabled ||
                          !entityId ||
                          !account.categoryId ||
                          isFetchingLatestCategoryAccount ||
                          hasLatestCategoryAccountError ||
                          latestCategoryAccount?.amount == null
                        }
                        aria-label={`Copiar valor da última conta deste ${latestEntityLabel} e categoria`}
                        sx={{
                          color: isLatestAmountCopied
                            ? 'success.main'
                            : 'primary.main',
                        }}
                      >
                        {isFetchingLatestCategoryAccount ? (
                          <CircularProgress size={18} />
                        ) : isLatestAmountCopied ? (
                          <CheckIcon />
                        ) : (
                          <ContentCopyIcon />
                        )}
                      </IconButton>
                    </span>
                  </Tooltip>
                </Stack>
              </InputAdornment>
            ),
          }}
        />
      </Grid>

      {/* Installment Count */}
      <Grid item xs={6} sm={3} md={2}>
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
              onInstallmentCountChange(count);
            }}
            disabled={isDisabled}
            size="medium"
            fullWidth
            inputProps={{ min: 1, max: 120 }}
          />
        </Badge>
        {account.installmentCount > 1 && (
          <Button
            size="small"
            onClick={onToggleInstallments}
            sx={{ mt: 0.5 }}
            endIcon={
              <ExpandMoreIcon
                sx={{
                  transform: showInstallments ? 'rotate(180deg)' : 'none',
                  transition: '0.3s',
                }}
              />
            }
          >
            {showInstallments ? 'Ocultar parcelas' : 'Detalhar parcelas'}
          </Button>
        )}
      </Grid>

      {/* First Due Date */}
      <Grid item xs={6} sm={6} md={3}>
        <TextField
          label="Primeiro vencimento"
          type="date"
          value={account.dueDates[0] || ''}
          onChange={e => {
            onFirstDueDateChange(e.target.value);
            onValidateField('dueDates', [e.target.value]);
          }}
          disabled={isDisabled}
          size="medium"
          fullWidth
          required
          error={!!fieldErrors.dueDates}
          helperText={fieldErrors.dueDates}
          InputLabelProps={{ shrink: true }}
        />
      </Grid>

      {/* Tags */}
      <Grid item xs={12} sm={6} md={4}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
          <Autocomplete
            multiple
            value={
              account.tagIds
                .map(id => tags.find(t => t.id === id))
                .filter(Boolean) as Tag[]
            }
            onChange={(_, value) => {
              onFieldChange(
                'tagIds',
                value.map(t => t.id)
              );
            }}
            options={tags}
            getOptionLabel={option => option.name}
            disabled={isDisabled}
            renderInput={params => (
              <TextField {...params} label="Tags" size="medium" />
            )}
            sx={{ flex: 1, minWidth: 0 }}
          />
          <Tooltip
            title={
              latestCategoryMessage ||
              (isLatestTagsCopied
                ? 'Tags da última conta copiadas'
                : latestCategoryAccount?.tagIds.length === 0
                  ? 'A última conta não possui tags'
                  : 'Copiar tags da última conta')
            }
            arrow
          >
            <span>
              <IconButton
                color={isLatestTagsCopied ? 'success' : 'primary'}
                onClick={onCopyLatestTags}
                disabled={
                  isDisabled ||
                  !entityId ||
                  !account.categoryId ||
                  isFetchingLatestCategoryAccount ||
                  hasLatestCategoryAccountError ||
                  !latestCategoryAccount?.tagIds.length
                }
                size="medium"
                aria-label={`Copiar tags da última conta deste ${latestEntityLabel} e categoria`}
              >
                {isFetchingLatestCategoryAccount ? (
                  <CircularProgress size={20} />
                ) : isLatestTagsCopied ? (
                  <CheckIcon />
                ) : (
                  <ContentCopyIcon />
                )}
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Criar tag" arrow>
            <span>
              <IconButton
                color="primary"
                onClick={onQuickTagOpen}
                disabled={isDisabled}
                size="medium"
                aria-label="Criar tag"
              >
                <AddIcon />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </Grid>

      {/* Notes */}
      <Grid item xs={12}>
        <TextField
          label="Observações"
          value={account.notes || ''}
          onChange={e => onFieldChange('notes', e.target.value)}
          disabled={isDisabled}
          size="medium"
          fullWidth
          multiline
          maxRows={2}
        />
      </Grid>
    </>
  );
};
