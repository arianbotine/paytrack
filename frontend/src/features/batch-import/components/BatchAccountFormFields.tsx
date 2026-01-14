import {
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  Tooltip,
  Badge,
  Button,
  Box,
  IconButton,
} from '@mui/material';
import {
  Info as InfoIcon,
  ExpandMore as ExpandMoreIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { CurrencyField } from '../../../shared/components/CurrencyField';
import { BatchAccount, AccountType } from '../types';
import type { Vendor, Category, Tag } from '../../payables/types';
import type { Customer } from '../../receivables/types';

interface BatchAccountFormFieldsProps {
  account: BatchAccount;
  accountType: AccountType;
  isDisabled: boolean;
  selectedEntity: Vendor | Customer | undefined;
  entityLabel: string;
  entityList: (Vendor | Customer)[];
  filteredCategories: Category[];
  tags: Tag[];
  fieldErrors: Record<string, string>;
  formatCurrency: (value: number) => string;
  showInstallments: boolean;
  onFieldChange: (field: keyof BatchAccount, value: any) => void;
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
  entityLabel,
  entityList,
  filteredCategories,
  tags,
  fieldErrors,
  formatCurrency,
  showInstallments,
  onFieldChange,
  onInstallmentCountChange,
  onFirstDueDateChange,
  onValidateField,
  onQuickCategoryOpen,
  onQuickTagOpen,
  onToggleInstallments,
}) => {
  return (
    <>
      {/* Vendor/Customer */}
      <Grid item xs={12} sm={6} md={3}>
        <Autocomplete
          value={selectedEntity || null}
          onChange={(_, value) => {
            const field = accountType === 'payable' ? 'vendorId' : 'customerId';
            onFieldChange(field, value?.id || '');
            onValidateField(field, value?.id);
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
              onFieldChange('categoryId', e.target.value || undefined)
            }
            label="Categoria"
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
            onFieldChange('amount', value);
            onValidateField('amount', value);
          }}
          disabled={isDisabled}
          required
          size="small"
        />
        {account.amount > 0 && account.installmentCount > 1 && (
          <Box
            component="span"
            sx={{
              display: 'block',
              mt: 0.5,
              fontSize: '0.75rem',
              color: 'text.secondary',
            }}
          >
            {account.installmentCount}x de{' '}
            {formatCurrency(account.amount / account.installmentCount)}
          </Box>
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
              onInstallmentCountChange(count);
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
            onClick={onToggleInstallments}
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
            onFirstDueDateChange(e.target.value);
            onValidateField('dueDates', [e.target.value]);
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
              onFieldChange(
                'tagIds',
                value.map(t => t.id)
              );
            }}
            options={tags}
            getOptionLabel={option => option.name}
            disabled={isDisabled}
            renderInput={params => (
              <TextField {...params} label="Tags" size="small" />
            )}
            sx={{ flex: 1 }}
          />
          <IconButton
            color="primary"
            onClick={onQuickTagOpen}
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
          onChange={e => onFieldChange('notes', e.target.value)}
          disabled={isDisabled}
          size="small"
          fullWidth
          multiline
          maxRows={2}
        />
      </Grid>
    </>
  );
};
