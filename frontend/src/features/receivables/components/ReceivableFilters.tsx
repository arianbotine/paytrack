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
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  FilterList as FilterIcon,
  Clear as ClearIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { statusOptions } from '../types';
import type { Customer, Category, Tag } from '../types';

interface ReceivableFiltersProps {
  // Status
  statusFilter: string[];
  onStatusChange: (status: string[]) => void;

  // Devedor
  customerFilter: string | null;
  onCustomerChange: (customerId: string | null) => void;
  customers: Customer[];

  // Category
  categoryFilter: string | null;
  onCategoryChange: (categoryId: string | null) => void;
  categories: Category[];

  // Tags
  tagFilters: string[];
  onTagsChange: (tagIds: string[]) => void;
  tags: Tag[];

  // Filtros de parcelas
  installmentTagFilters: string[];
  onInstallmentTagsChange: (tagIds: string[]) => void;
}

export const ReceivableFilters: React.FC<ReceivableFiltersProps> = ({
  statusFilter,
  onStatusChange,
  customerFilter,
  onCustomerChange,
  customers,
  categoryFilter,
  onCategoryChange,
  categories,
  tagFilters,
  onTagsChange,
  tags,
  installmentTagFilters,
  onInstallmentTagsChange,
}) => {
  const [expanded, setExpanded] = useState(false);

  const activeFiltersCount =
    statusFilter.length +
    (customerFilter ? 1 : 0) +
    (categoryFilter ? 1 : 0) +
    tagFilters.length +
    installmentTagFilters.length;

  const hasActiveFilters = activeFiltersCount > 0;

  const handleStatusToggle = (value: string) => {
    if (value === 'ALL') {
      onStatusChange([]);
    } else {
      const newStatus = statusFilter.includes(value)
        ? statusFilter.filter(s => s !== value)
        : [...statusFilter, value];
      onStatusChange(newStatus);
    }
  };

  const handleClearAll = () => {
    onStatusChange([]);
    onCustomerChange(null);
    onCategoryChange(null);
    onTagsChange([]);
    onInstallmentTagsChange([]);
  };

  const selectedCustomer = customers.find(c => c.id === customerFilter);
  const selectedCategory = categories.find(c => c.id === categoryFilter);
  const selectedTags = tags.filter(t => tagFilters.includes(t.id));
  const selectedInstallmentTags = tags.filter(t =>
    installmentTagFilters.includes(t.id)
  );

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
          <Grid container spacing={2}>
            {/* Status Chips */}
            <Grid item xs={12}>
              <Typography
                variant="caption"
                fontWeight={600}
                color="text.secondary"
                sx={{ mb: 1, display: 'block' }}
              >
                Status
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {statusOptions.map(option => {
                  const isSelected =
                    option.value === 'ALL'
                      ? statusFilter.length === 0
                      : statusFilter.includes(option.value);

                  return (
                    <motion.div
                      key={option.value}
                      whileTap={{ scale: 0.95 }}
                      whileHover={{ scale: 1.05 }}
                    >
                      <Chip
                        label={option.label}
                        variant={isSelected ? 'filled' : 'outlined'}
                        color={isSelected ? 'primary' : 'default'}
                        onClick={() => handleStatusToggle(option.value)}
                        sx={{
                          fontWeight: isSelected ? 600 : 400,
                          transition: 'all 0.2s ease',
                          cursor: 'pointer',
                        }}
                      />
                    </motion.div>
                  );
                })}
              </Stack>
            </Grid>

            {/* Customer Filter */}
            <Grid item xs={12} md={6}>
              <Autocomplete
                value={selectedCustomer || null}
                onChange={(_, newValue) => {
                  onCustomerChange(newValue?.id || null);
                }}
                options={customers}
                getOptionLabel={option => option.name}
                renderInput={params => (
                  <TextField
                    {...params}
                    label="Devedor"
                    placeholder="Selecione um devedor"
                    size="small"
                  />
                )}
                renderOption={(props, option) => {
                  const { key, ...otherProps } = props;
                  return (
                    <li key={key} {...otherProps}>
                      <Typography variant="body2">{option.name}</Typography>
                    </li>
                  );
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: 'background.paper',
                  },
                }}
              />
            </Grid>

            {/* Category Filter */}
            <Grid item xs={12} md={6}>
              <Autocomplete
                value={selectedCategory || null}
                onChange={(_, newValue) => {
                  onCategoryChange(newValue?.id || null);
                }}
                options={categories}
                getOptionLabel={option => option.name}
                renderInput={params => (
                  <TextField
                    {...params}
                    label="Categoria"
                    placeholder="Selecione uma categoria"
                    size="small"
                  />
                )}
                renderOption={(props, option) => {
                  const { key, ...otherProps } = props;
                  return (
                    <li key={key} {...otherProps}>
                      <Box
                        sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                      >
                        <Box
                          sx={{
                            width: 16,
                            height: 16,
                            borderRadius: '50%',
                            bgcolor: option.color || '#e0e0e0',
                          }}
                        />
                        <Typography variant="body2">{option.name}</Typography>
                      </Box>
                    </li>
                  );
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: 'background.paper',
                  },
                }}
              />
            </Grid>

            {/* Tags Filter */}
            <Grid item xs={12}>
              <Autocomplete
                multiple
                value={selectedTags}
                onChange={(_, newValue) => {
                  onTagsChange(newValue.map(tag => tag.id));
                }}
                options={tags}
                getOptionLabel={option => option.name}
                renderInput={params => (
                  <TextField
                    {...params}
                    label="Tags"
                    placeholder="Selecione tags"
                    size="small"
                  />
                )}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip
                      {...getTagProps({ index })}
                      key={option.id}
                      label={option.name}
                      size="small"
                      sx={{
                        bgcolor: option.color || '#e0e0e0',
                        color: '#fff',
                        '& .MuiChip-deleteIcon': {
                          color: 'rgba(255, 255, 255, 0.7)',
                          '&:hover': {
                            color: '#fff',
                          },
                        },
                      }}
                    />
                  ))
                }
                renderOption={(props, option) => {
                  const { key, ...otherProps } = props;
                  return (
                    <li key={key} {...otherProps}>
                      <Chip
                        label={option.name}
                        size="small"
                        sx={{
                          bgcolor: option.color || '#e0e0e0',
                          color: '#fff',
                        }}
                      />
                    </li>
                  );
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: 'background.paper',
                  },
                }}
              />
            </Grid>
          </Grid>

          {/* Filtros Avançados (Parcelas) */}
          <Accordion
            elevation={0}
            sx={{
              mt: 2,
              border: 1,
              borderColor: 'divider',
              borderRadius: 1,
              '&:before': { display: 'none' },
            }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle2" color="text.secondary">
                Filtros Avançados (Parcelas)
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Autocomplete
                    multiple
                    value={selectedInstallmentTags}
                    onChange={(_, newValue) => {
                      onInstallmentTagsChange(newValue.map(tag => tag.id));
                    }}
                    options={tags}
                    getOptionLabel={option => option.name}
                    renderInput={params => (
                      <TextField
                        {...params}
                        label="Tags das Parcelas"
                        placeholder="Selecione tags"
                        size="small"
                        helperText="Mostra contas que possuem parcelas com essas tags"
                      />
                    )}
                    renderTags={(value, getTagProps) =>
                      value.map((option, index) => (
                        <Chip
                          {...getTagProps({ index })}
                          key={option.id}
                          label={option.name}
                          size="small"
                          color="secondary"
                        />
                      ))
                    }
                    renderOption={(props, option) => {
                      const { key, ...otherProps } = props;
                      return (
                        <li key={key} {...otherProps}>
                          <Chip
                            label={option.name}
                            size="small"
                            color="secondary"
                            sx={{
                              bgcolor: option.color || '#e0e0e0',
                              color: '#fff',
                            }}
                          />
                        </li>
                      );
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        bgcolor: 'background.paper',
                      },
                    }}
                  />
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>

          {/* Active Filters Summary */}
          <AnimatePresence>
            {hasActiveFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Box
                  sx={{
                    mt: 2,
                    pt: 2,
                    borderTop: 1,
                    borderColor: 'divider',
                  }}
                >
                  <Typography
                    variant="caption"
                    fontWeight={600}
                    color="text.secondary"
                    sx={{ mb: 1, display: 'block' }}
                  >
                    Filtros ativos ({activeFiltersCount})
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {statusFilter.map(status => {
                      const option = statusOptions.find(
                        o => o.value === status
                      );
                      return (
                        <Chip
                          key={status}
                          label={option?.label}
                          size="small"
                          onDelete={() => handleStatusToggle(status)}
                          color="primary"
                          variant="outlined"
                        />
                      );
                    })}
                    {selectedCustomer && (
                      <Chip
                        label={`Devedor: ${selectedCustomer.name}`}
                        size="small"
                        onDelete={() => onCustomerChange(null)}
                        color="primary"
                        variant="outlined"
                      />
                    )}
                    {selectedCategory && (
                      <Chip
                        key={`category-${selectedCategory.id}`}
                        label={`Categoria: ${selectedCategory.name}`}
                        size="small"
                        onDelete={() => onCategoryChange(null)}
                        color="primary"
                        variant="outlined"
                        icon={
                          <Box
                            component="span"
                            sx={{
                              width: 12,
                              height: 12,
                              borderRadius: '50%',
                              bgcolor: selectedCategory.color || '#e0e0e0',
                            }}
                          />
                        }
                      />
                    )}
                    {selectedTags.map(tag => (
                      <Chip
                        key={tag.id}
                        label={tag.name}
                        size="small"
                        onDelete={() =>
                          onTagsChange(tagFilters.filter(id => id !== tag.id))
                        }
                        sx={{
                          bgcolor: tag.color || '#e0e0e0',
                          color: '#fff',
                          '& .MuiChip-deleteIcon': {
                            color: 'rgba(255, 255, 255, 0.7)',
                            '&:hover': {
                              color: '#fff',
                            },
                          },
                        }}
                      />
                    ))}
                    {selectedInstallmentTags.map(tag => (
                      <Chip
                        key={`installment-${tag.id}`}
                        label={`Tag Parcela: ${tag.name}`}
                        size="small"
                        color="secondary"
                        onDelete={() =>
                          onInstallmentTagsChange(
                            installmentTagFilters.filter(id => id !== tag.id)
                          )
                        }
                      />
                    ))}
                  </Stack>
                </Box>
              </motion.div>
            )}
          </AnimatePresence>
        </Box>
      </Collapse>
    </Paper>
  );
};
