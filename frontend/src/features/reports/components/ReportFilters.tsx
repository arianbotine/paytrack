import { useState } from 'react';
import {
  Paper,
  Box,
  Grid,
  TextField,
  MenuItem,
  Button,
  Collapse,
  IconButton,
  Typography,
  Stack,
  Autocomplete,
  Chip,
  Badge,
  Divider,
  Tooltip,
  Alert,
} from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import RefreshIcon from '@mui/icons-material/Refresh';
import ClearIcon from '@mui/icons-material/Clear';
import CategoryIcon from '@mui/icons-material/Category';
import LabelIcon from '@mui/icons-material/Label';
import StoreIcon from '@mui/icons-material/Store';
import PersonIcon from '@mui/icons-material/Person';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import {
  useReportCategories,
  useReportTags,
  useReportVendors,
  useReportCustomers,
} from '../hooks/useReports';
import {
  calculateDateRange,
  getPeriodSummary,
  type PeriodShortcut,
} from '../utils/period-calculator';
import type {
  ReportFilters as ReportFiltersType,
  ReportGroupBy,
} from '../types';

interface ReportFiltersProps {
  readonly filters: ReportFiltersType;
  readonly onFiltersChange: (filters: ReportFiltersType) => void;
  readonly onRefresh?: () => void;
}

const GROUP_BY_OPTIONS: { value: ReportGroupBy; label: string }[] = [
  { value: 'day', label: 'Por dia' },
  { value: 'week', label: 'Por semana' },
  { value: 'month', label: 'Por mês' },
];

const PERIOD_SHORTCUTS = [
  {
    group: 'Últimos dias',
    items: [
      { key: 'last7' as PeriodShortcut, label: 'Últimos 7 dias' },
      { key: 'last15' as PeriodShortcut, label: 'Últimos 15 dias' },
      { key: 'last30' as PeriodShortcut, label: 'Últimos 30 dias' },
    ],
  },
  {
    group: 'Semanas',
    items: [
      { key: 'thisWeek' as PeriodShortcut, label: 'Esta semana' },
      { key: 'lastWeek' as PeriodShortcut, label: 'Semana passada' },
    ],
  },
  {
    group: 'Meses',
    items: [
      { key: 'thisMonth' as PeriodShortcut, label: 'Este mês' },
      { key: 'lastMonth' as PeriodShortcut, label: 'Mês passado' },
    ],
  },
];

export function ReportFilters(props: ReportFiltersProps) {
  const { filters, onFiltersChange, onRefresh } = props;
  const [expanded, setExpanded] = useState(false);

  // Fetch related data
  const { data: categories = [] } = useReportCategories();
  const { data: tags = [] } = useReportTags();
  const { data: vendors = [] } = useReportVendors();
  const { data: customers = [] } = useReportCustomers();

  const getActiveFiltersCount = () => {
    return (
      [
        filters.categoryIds?.length,
        filters.tagIds?.length,
        filters.vendorIds?.length,
        filters.customerIds?.length,
      ].reduce((acc, val) => (acc || 0) + (val || 0), 0) || 0
    );
  };

  const activeFiltersCount = getActiveFiltersCount();

  const applyQuickDate = (period: PeriodShortcut) => {
    const { startDate, endDate } = calculateDateRange(period);
    const newFilters = {
      ...filters,
      startDate,
      endDate,
    };
    onFiltersChange(newFilters);
  };

  const handleGroupByChange = (groupBy: ReportGroupBy) => {
    const newFilters = { ...filters, groupBy };
    onFiltersChange(newFilters);
  };

  const handleMultiSelectChange = (
    field: 'categoryIds' | 'tagIds' | 'vendorIds' | 'customerIds',
    values: string[]
  ) => {
    const newFilters = {
      ...filters,
      [field]: values.length > 0 ? values : undefined,
    };
    onFiltersChange(newFilters);
  };

  const handleClearFilter = (
    field: 'categoryIds' | 'tagIds' | 'vendorIds' | 'customerIds'
  ) => {
    const newFilters = { ...filters };
    delete newFilters[field];
    onFiltersChange(newFilters);
  };

  const handleReset = () => {
    const { startDate, endDate } = calculateDateRange('last30');
    const defaultFilters: ReportFiltersType = {
      startDate,
      endDate,
      groupBy: 'month',
    };
    onFiltersChange(defaultFilters);
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={expanded ? 2 : 0}
      >
        <Box display="flex" alignItems="center" gap={1}>
          <Badge badgeContent={activeFiltersCount} color="primary">
            <FilterListIcon color="action" />
          </Badge>
          <Typography variant="h6">Filtros</Typography>
          <Tooltip
            title="Use os filtros para personalizar o relatório. Selecione período, categorias, tags e mais para refinar a análise dos seus dados financeiros."
            arrow
            placement="right"
            enterDelay={300}
          >
            <IconButton
              size="small"
              sx={{
                opacity: 0.5,
                '&:hover': { opacity: 1 },
                transition: 'opacity 0.2s',
              }}
            >
              <HelpOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          {activeFiltersCount > 0 && !expanded && (
            <Chip
              label={`${activeFiltersCount} ${activeFiltersCount === 1 ? 'filtro ativo' : 'filtros ativos'}`}
              size="small"
              color="primary"
              variant="outlined"
            />
          )}
        </Box>
        <Box display="flex" gap={1}>
          {onRefresh && (
            <IconButton
              size="small"
              onClick={onRefresh}
              title="Atualizar dados"
            >
              <RefreshIcon />
            </IconButton>
          )}
          <IconButton
            size="small"
            onClick={() => setExpanded(!expanded)}
            title={expanded ? 'Recolher filtros' : 'Expandir filtros'}
          >
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </Box>
      </Box>

      <Collapse in={expanded}>
        <Stack spacing={3}>
          {/* Período */}
          <Box>
            <Typography
              variant="subtitle2"
              color="text.secondary"
              gutterBottom
              sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}
            >
              📅 Selecionar Período
            </Typography>

            <Grid container spacing={2}>
              {PERIOD_SHORTCUTS.map(group => (
                <Grid item xs={12} md={4} key={group.group}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: 'block', mb: 1, fontWeight: 500 }}
                  >
                    {group.group}
                  </Typography>
                  <Stack spacing={1}>
                    {group.items.map(item => (
                      <Button
                        key={item.key}
                        variant="outlined"
                        size="small"
                        fullWidth
                        onClick={() => applyQuickDate(item.key)}
                        sx={{
                          justifyContent: 'flex-start',
                          textTransform: 'none',
                          borderColor: 'divider',
                          '&:hover': {
                            borderColor: 'primary.main',
                            backgroundColor: 'primary.50',
                          },
                        }}
                      >
                        {item.label}
                      </Button>
                    ))}
                  </Stack>
                </Grid>
              ))}
            </Grid>

            {filters.startDate && filters.endDate && (
              <Alert severity="info" sx={{ mt: 2 }}>
                📅 Período selecionado:{' '}
                {getPeriodSummary(filters.startDate, filters.endDate)}
              </Alert>
            )}
          </Box>

          {/* Agrupamento */}
          <Box>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={4}>
                <Tooltip
                  title="Define como os dados serão agrupados no gráfico: por dia (detalhado), por semana (médio) ou por mês (visão geral)."
                  placement="top"
                  enterDelay={500}
                >
                  <TextField
                    fullWidth
                    select
                    label="Agrupar por"
                    value={filters.groupBy || 'month'}
                    onChange={e =>
                      handleGroupByChange(e.target.value as ReportGroupBy)
                    }
                    size="small"
                  >
                    {GROUP_BY_OPTIONS.map(option => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Tooltip>
              </Grid>
            </Grid>
          </Box>

          <Divider />

          {/* Filtros Avançados */}
          <Box>
            <Typography
              variant="subtitle2"
              color="text.secondary"
              gutterBottom
              sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <FilterListIcon fontSize="small" />
              Filtros Avançados
            </Typography>

            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              {/* Categorias */}
              <Grid item xs={12} sm={6}>
                <Autocomplete
                  multiple
                  size="small"
                  options={categories}
                  getOptionLabel={option => option.name}
                  value={categories.filter(cat =>
                    filters.categoryIds?.includes(cat.id)
                  )}
                  onChange={(_, newValue) =>
                    handleMultiSelectChange(
                      'categoryIds',
                      newValue.map(v => v.id)
                    )
                  }
                  renderInput={params => (
                    <TextField
                      {...params}
                      label="Categorias"
                      placeholder="Selecione categorias"
                      InputProps={{
                        ...params.InputProps,
                        startAdornment: (
                          <>
                            <CategoryIcon
                              fontSize="small"
                              sx={{ ml: 1, mr: 0.5, color: 'action.active' }}
                            />
                            {params.InputProps.startAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => {
                      const { key, ...tagProps } = getTagProps({ index });
                      return (
                        <Chip
                          key={key}
                          {...tagProps}
                          label={option.name}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      );
                    })
                  }
                  noOptionsText="Nenhuma categoria encontrada"
                />
              </Grid>

              {/* Tags */}
              <Grid item xs={12} sm={6}>
                <Autocomplete
                  multiple
                  size="small"
                  options={tags}
                  getOptionLabel={option => option.name}
                  value={tags.filter(tag => filters.tagIds?.includes(tag.id))}
                  onChange={(_, newValue) =>
                    handleMultiSelectChange(
                      'tagIds',
                      newValue.map(v => v.id)
                    )
                  }
                  renderInput={params => (
                    <TextField
                      {...params}
                      label="Tags"
                      placeholder="Selecione tags"
                      InputProps={{
                        ...params.InputProps,
                        startAdornment: (
                          <>
                            <LabelIcon
                              fontSize="small"
                              sx={{ ml: 1, mr: 0.5, color: 'action.active' }}
                            />
                            {params.InputProps.startAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => {
                      const { key, ...tagProps } = getTagProps({ index });
                      return (
                        <Chip
                          key={key}
                          {...tagProps}
                          label={option.name}
                          size="small"
                          sx={{
                            bgcolor: option.color,
                            color: 'white',
                            '& .MuiChip-deleteIcon': { color: 'white' },
                          }}
                        />
                      );
                    })
                  }
                  noOptionsText="Nenhuma tag encontrada"
                />
              </Grid>

              {/* Fornecedores */}
              <Grid item xs={12} sm={6}>
                <Autocomplete
                  multiple
                  size="small"
                  options={vendors}
                  getOptionLabel={option => option.name}
                  value={vendors.filter(vendor =>
                    filters.vendorIds?.includes(vendor.id)
                  )}
                  onChange={(_, newValue) =>
                    handleMultiSelectChange(
                      'vendorIds',
                      newValue.map(v => v.id)
                    )
                  }
                  renderInput={params => (
                    <TextField
                      {...params}
                      label="Fornecedores"
                      placeholder="Selecione fornecedores"
                      InputProps={{
                        ...params.InputProps,
                        startAdornment: (
                          <>
                            <StoreIcon
                              fontSize="small"
                              sx={{ ml: 1, mr: 0.5, color: 'action.active' }}
                            />
                            {params.InputProps.startAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => {
                      const { key, ...tagProps } = getTagProps({ index });
                      return (
                        <Chip
                          key={key}
                          {...tagProps}
                          label={option.name}
                          size="small"
                          color="secondary"
                          variant="outlined"
                        />
                      );
                    })
                  }
                  noOptionsText="Nenhum fornecedor encontrado"
                />
              </Grid>

              {/* Clientes/Devedores */}
              <Grid item xs={12} sm={6}>
                <Autocomplete
                  multiple
                  size="small"
                  options={customers}
                  getOptionLabel={option => option.name}
                  value={customers.filter(customer =>
                    filters.customerIds?.includes(customer.id)
                  )}
                  onChange={(_, newValue) =>
                    handleMultiSelectChange(
                      'customerIds',
                      newValue.map(v => v.id)
                    )
                  }
                  renderInput={params => (
                    <TextField
                      {...params}
                      label="Clientes/Devedores"
                      placeholder="Selecione clientes"
                      InputProps={{
                        ...params.InputProps,
                        startAdornment: (
                          <>
                            <PersonIcon
                              fontSize="small"
                              sx={{ ml: 1, mr: 0.5, color: 'action.active' }}
                            />
                            {params.InputProps.startAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => {
                      const { key, ...tagProps } = getTagProps({ index });
                      return (
                        <Chip
                          key={key}
                          {...tagProps}
                          label={option.name}
                          size="small"
                          color="info"
                          variant="outlined"
                        />
                      );
                    })
                  }
                  noOptionsText="Nenhum cliente encontrado"
                />
              </Grid>
            </Grid>
          </Box>

          <Divider />

          {/* Ações */}
          <Stack
            direction="row"
            spacing={1}
            justifyContent="space-between"
            alignItems="center"
          >
            <Box>
              {activeFiltersCount > 0 && (
                <Typography variant="caption" color="text.secondary">
                  {activeFiltersCount}{' '}
                  {activeFiltersCount === 1 ? 'filtro ativo' : 'filtros ativos'}
                </Typography>
              )}
            </Box>
            <Box display="flex" gap={1}>
              {activeFiltersCount > 0 && (
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleReset}
                  startIcon={<ClearIcon />}
                >
                  Limpar Tudo
                </Button>
              )}
            </Box>
          </Stack>
        </Stack>
      </Collapse>

      {/* Resumo dos filtros quando recolhido */}
      {!expanded && (
        <Box mt={1}>
          <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
            {filters.startDate && filters.endDate && (
              <Chip
                label={getPeriodSummary(filters.startDate, filters.endDate)}
                size="small"
                color="primary"
                variant="outlined"
              />
            )}
            <Chip
              label={
                GROUP_BY_OPTIONS.find(
                  g => g.value === (filters.groupBy || 'month')
                )?.label
              }
              size="small"
              variant="outlined"
            />
            {filters.categoryIds && filters.categoryIds.length > 0 && (
              <Chip
                icon={<CategoryIcon />}
                label={`${filters.categoryIds.length} ${filters.categoryIds.length === 1 ? 'categoria' : 'categorias'}`}
                size="small"
                color="primary"
                variant="outlined"
                onDelete={() => handleClearFilter('categoryIds')}
              />
            )}
            {filters.tagIds && filters.tagIds.length > 0 && (
              <Chip
                icon={<LabelIcon />}
                label={`${filters.tagIds.length} ${filters.tagIds.length === 1 ? 'tag' : 'tags'}`}
                size="small"
                color="primary"
                variant="outlined"
                onDelete={() => handleClearFilter('tagIds')}
              />
            )}
            {filters.vendorIds && filters.vendorIds.length > 0 && (
              <Chip
                icon={<StoreIcon />}
                label={`${filters.vendorIds.length} ${filters.vendorIds.length === 1 ? 'fornecedor' : 'fornecedores'}`}
                size="small"
                color="secondary"
                variant="outlined"
                onDelete={() => handleClearFilter('vendorIds')}
              />
            )}
            {filters.customerIds && filters.customerIds.length > 0 && (
              <Chip
                icon={<PersonIcon />}
                label={`${filters.customerIds.length} ${filters.customerIds.length === 1 ? 'cliente' : 'clientes'}`}
                size="small"
                color="info"
                variant="outlined"
                onDelete={() => handleClearFilter('customerIds')}
              />
            )}
          </Stack>
        </Box>
      )}
    </Paper>
  );
}
