import React, { useState } from 'react';
import {
  Box,
  Paper,
  Autocomplete,
  TextField,
  Chip,
  Stack,
  IconButton,
  Collapse,
  Typography,
  Grid,
  Badge,
  Tooltip,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import {
  FilterList as FilterIcon,
  Clear as ClearIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  AccountBalance as PayableIcon,
  RequestQuote as ReceivableIcon,
} from '@mui/icons-material';

import { PAYMENT_METHODS } from '../types';

interface Vendor {
  id: string;
  name: string;
}

interface Customer {
  id: string;
  name: string;
}

interface PaymentFiltersProps {
  // Payment Method
  methodFilter: string[];
  onMethodChange: (methods: string[]) => void;

  // Type (payable/receivable)
  typeFilter: string | null;
  onTypeChange: (type: string | null) => void;

  // Vendor
  vendorFilter: string | null;
  onVendorChange: (vendorId: string | null) => void;
  vendors: Vendor[];

  // Customer
  customerFilter: string | null;
  onCustomerChange: (customerId: string | null) => void;
  customers: Customer[];

  // Date Range
  dateFromFilter: string | null;
  onDateFromChange: (date: string | null) => void;
  dateToFilter: string | null;
  onDateToChange: (date: string | null) => void;
}

export const PaymentFilters: React.FC<PaymentFiltersProps> = ({
  methodFilter,
  onMethodChange,
  typeFilter,
  onTypeChange,
  vendorFilter,
  onVendorChange,
  vendors,
  customerFilter,
  onCustomerChange,
  customers,
  dateFromFilter,
  onDateFromChange,
  dateToFilter,
  onDateToChange,
}) => {
  const [expanded, setExpanded] = useState(false);

  const activeFiltersCount =
    methodFilter.length +
    (typeFilter ? 1 : 0) +
    (vendorFilter ? 1 : 0) +
    (customerFilter ? 1 : 0) +
    (dateFromFilter ? 1 : 0) +
    (dateToFilter ? 1 : 0);

  const hasActiveFilters = activeFiltersCount > 0;

  const handleMethodToggle = (value: string) => {
    if (value === 'ALL') {
      onMethodChange([]);
    } else {
      const newMethods = methodFilter.includes(value)
        ? methodFilter.filter(m => m !== value)
        : [...methodFilter, value];
      onMethodChange(newMethods);
    }
  };

  const handleClearAll = () => {
    onMethodChange([]);
    onTypeChange(null);
    onVendorChange(null);
    onCustomerChange(null);
    onDateFromChange(null);
    onDateToChange(null);
  };

  const selectedVendor = vendors.find(v => v.id === vendorFilter);
  const selectedCustomer = customers.find(c => c.id === customerFilter);

  return (
    <Paper
      elevation={0}
      sx={{
        mb: 3,
        border: 1,
        borderColor: hasActiveFilters ? 'primary.main' : 'divider',
        borderRadius: 2,
        overflow: 'hidden',
        transition: 'all 0.3s ease',
      }}
    >
      {/* Filter Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          p: 2,
          bgcolor: hasActiveFilters ? 'primary.lighter' : 'background.paper',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          '&:hover': {
            bgcolor: hasActiveFilters ? 'primary.light' : 'action.hover',
          },
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <Badge badgeContent={activeFiltersCount} color="primary">
          <FilterIcon color={hasActiveFilters ? 'primary' : 'action'} />
        </Badge>
        <Typography variant="subtitle1" fontWeight={600} sx={{ flexGrow: 1 }}>
          Filtros
        </Typography>
        {hasActiveFilters && (
          <Tooltip title="Limpar todos os filtros" arrow>
            <IconButton
              size="small"
              onClick={e => {
                e.stopPropagation();
                handleClearAll();
              }}
              sx={{
                color: 'primary.main',
                '&:hover': {
                  bgcolor: 'primary.lighter',
                },
              }}
            >
              <ClearIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
      </Box>

      {/* Filter Content */}
      <Collapse in={expanded}>
        <Box sx={{ p: 3, pt: 2, bgcolor: 'background.default' }}>
          <Grid container spacing={3}>
            {/* Type Filter */}
            <Grid item xs={12}>
              <Typography
                variant="subtitle2"
                fontWeight={600}
                color="text.secondary"
                gutterBottom
              >
                Tipo
              </Typography>
              <ToggleButtonGroup
                value={typeFilter}
                exclusive
                onChange={(_e, newType) => onTypeChange(newType)}
                size="small"
                fullWidth
              >
                <ToggleButton value="">Todos</ToggleButton>
                <ToggleButton value="payable">
                  <PayableIcon sx={{ mr: 1 }} />
                  Pagamentos
                </ToggleButton>
                <ToggleButton value="receivable">
                  <ReceivableIcon sx={{ mr: 1 }} />
                  Recebimentos
                </ToggleButton>
              </ToggleButtonGroup>
            </Grid>

            {/* Payment Method Filter */}
            <Grid item xs={12}>
              <Typography
                variant="subtitle2"
                fontWeight={600}
                color="text.secondary"
                gutterBottom
              >
                Método de Pagamento
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip
                  label="Todos"
                  onClick={() => handleMethodToggle('ALL')}
                  color={methodFilter.length === 0 ? 'primary' : 'default'}
                  variant={methodFilter.length === 0 ? 'filled' : 'outlined'}
                  sx={{ mb: 1 }}
                />
                {PAYMENT_METHODS.map(method => (
                  <Chip
                    key={method.value}
                    label={method.label}
                    onClick={() => handleMethodToggle(method.value)}
                    color={
                      methodFilter.includes(method.value)
                        ? 'primary'
                        : 'default'
                    }
                    variant={
                      methodFilter.includes(method.value)
                        ? 'filled'
                        : 'outlined'
                    }
                    sx={{ mb: 1 }}
                  />
                ))}
              </Stack>
            </Grid>

            {/* Vendor/Customer Filter (conditional based on type) */}
            {typeFilter !== 'receivable' && (
              <Grid item xs={12} md={6}>
                <Autocomplete
                  value={selectedVendor || null}
                  onChange={(_e, newValue) =>
                    onVendorChange(newValue?.id || null)
                  }
                  options={vendors}
                  getOptionLabel={option => option.name}
                  isOptionEqualToValue={(option, value) =>
                    option.id === value.id
                  }
                  renderInput={params => (
                    <TextField {...params} label="Credor" size="small" />
                  )}
                  disabled={typeFilter === 'receivable'}
                />
              </Grid>
            )}

            {typeFilter !== 'payable' && (
              <Grid item xs={12} md={6}>
                <Autocomplete
                  value={selectedCustomer || null}
                  onChange={(_e, newValue) =>
                    onCustomerChange(newValue?.id || null)
                  }
                  options={customers}
                  getOptionLabel={option => option.name}
                  isOptionEqualToValue={(option, value) =>
                    option.id === value.id
                  }
                  renderInput={params => (
                    <TextField {...params} label="Devedor" size="small" />
                  )}
                  disabled={typeFilter === 'payable'}
                />
              </Grid>
            )}

            {/* Date Range Filter */}
            <Grid item xs={12} md={6}>
              <TextField
                label="Data de Pagamento - De"
                type="date"
                value={dateFromFilter || ''}
                onChange={e => onDateFromChange(e.target.value || null)}
                size="small"
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Data de Pagamento - Até"
                type="date"
                value={dateToFilter || ''}
                onChange={e => onDateToChange(e.target.value || null)}
                size="small"
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        </Box>
      </Collapse>
    </Paper>
  );
};
