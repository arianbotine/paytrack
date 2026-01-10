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
import type {
  ReportFilters as ReportFiltersType,
  ReportPeriod,
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
      { key: 'last7', label: 'Últimos 7 dias' },
      { key: 'last15', label: 'Últimos 15 dias' },
      { key: 'last30', label: 'Últimos 30 dias' },
    ],
  },
  {
    group: 'Semanas',
    items: [
      { key: 'thisWeek', label: 'Esta semana' },
      { key: 'lastWeek', label: 'Semana passada' },
    ],
  },
  {
    group: 'Meses',
    items: [
      { key: 'thisMonth', label: 'Este mês' },
      { key: 'lastMonth', label: 'Mês passado' },
    ],
  },
];

export function ReportFilters(props: ReportFiltersProps) {
  const { filters, onFiltersChange, onRefresh } = props;
  const [expanded, setExpanded] = useState(false);
  const [localFilters, setLocalFilters] = useState<ReportFiltersType>(filters);

  // Fetch related data
  const { data: categories = [] } = useReportCategories();
  const { data: tags = [] } = useReportTags();
  const { data: vendors = [] } = useReportVendors();
  const { data: customers = [] } = useReportCustomers();

  const getActiveFiltersCount = () => {
    return (
      [
        localFilters.categoryIds?.length,
        localFilters.tagIds?.length,
        localFilters.vendorIds?.length,
        localFilters.customerIds?.length,
      ].reduce((acc, val) => (acc || 0) + (val || 0), 0) || 0
    );
  };

  const activeFiltersCount = getActiveFiltersCount();

  const getQuickDateRange = (type: string) => {
    const today = new Date();
    const start = new Date();

    switch (type) {
      case 'thisWeek': {
        start.setDate(today.getDate() - today.getDay());
        return { start, end: today };
      }
      case 'lastWeek': {
        const lastWeekEnd = new Date(today);
        lastWeekEnd.setDate(today.getDate() - today.getDay() - 1);
        const lastWeekStart = new Date(lastWeekEnd);
        lastWeekStart.setDate(lastWeekEnd.getDate() - 6);
        return { start: lastWeekStart, end: lastWeekEnd };
      }
      case 'thisMonth': {
        start.setDate(1);
        return { start, end: today };
      }
      case 'lastMonth': {
        const lastMonth = new Date(
          today.getFullYear(),
          today.getMonth() - 1,
          1
        );
        const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
        return { start: lastMonth, end: lastMonthEnd };
      }
      case 'last7': {
        start.setDate(today.getDate() - 7);
        return { start, end: today };
      }
      case 'last15': {
        start.setDate(today.getDate() - 15);
        return { start, end: today };
      }
      case 'last30':
      default: {
        start.setDate(today.getDate() - 30);
        return { start, end: today };
      }
    }
  };

  const applyQuickDate = (type: string) => {
    const { start, end } = getQuickDateRange(type);
    const newFilters = {
      ...localFilters,
      period: 'custom' as ReportPeriod,
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    };
    updateFilters(newFilters);
  };

  const updateFilters = (newFilters: ReportFiltersType) => {
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleGroupByChange = (groupBy: ReportGroupBy) => {
    const newFilters = { ...localFilters, groupBy };
    updateFilters(newFilters);
  };

  const getPeriodSummary = () => {
    if (!localFilters.startDate || !localFilters.endDate) {
      return '';
    }

    const start = new Date(localFilters.startDate);
    const end = new Date(localFilters.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const formatDate = (date: Date) => {
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: start.getFullYear() === end.getFullYear() ? undefined : 'numeric',
      });
    };

    return `${formatDate(start)} até ${formatDate(end)} (${diffDays} ${diffDays === 1 ? 'dia' : 'dias'})`;
  };

  const handleMultiSelectChange = (
    field: 'categoryIds' | 'tagIds' | 'vendorIds' | 'customerIds',
    values: string[]
  ) => {
    const newFilters = {
      ...localFilters,
      [field]: values.length > 0 ? values : undefined,
    };
    updateFilters(newFilters);
  };

  const handleClearFilter = (
    field: 'categoryIds' | 'tagIds' | 'vendorIds' | 'customerIds'
  ) => {
    const newFilters = { ...localFilters };
    delete newFilters[field];
    updateFilters(newFilters);
  };

  const handleReset = () => {
    const defaultFilters: ReportFiltersType = {
      period: '30d',
      groupBy: 'month',
    };
    updateFilters(defaultFilters);
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

            {localFilters.startDate && localFilters.endDate && (
              <Alert severity="info" sx={{ mt: 2 }}>
                📅 Período selecionado: {getPeriodSummary()}
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
                    value={localFilters.groupBy || 'month'}
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
                    localFilters.categoryIds?.includes(cat.id)
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
                  value={tags.filter(tag =>
                    localFilters.tagIds?.includes(tag.id)
                  )}
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
                    localFilters.vendorIds?.includes(vendor.id)
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
                    localFilters.customerIds?.includes(customer.id)
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
            {localFilters.startDate && localFilters.endDate && (
              <Chip
                label={getPeriodSummary()}
                size="small"
                color="primary"
                variant="outlined"
              />
            )}
            <Chip
              label={
                GROUP_BY_OPTIONS.find(
                  g => g.value === (localFilters.groupBy || 'month')
                )?.label
              }
              size="small"
              variant="outlined"
            />
            {localFilters.categoryIds &&
              localFilters.categoryIds.length > 0 && (
                <Chip
                  icon={<CategoryIcon />}
                  label={`${localFilters.categoryIds.length} ${localFilters.categoryIds.length === 1 ? 'categoria' : 'categorias'}`}
                  size="small"
                  color="primary"
                  variant="outlined"
                  onDelete={() => handleClearFilter('categoryIds')}
                />
              )}
            {localFilters.tagIds && localFilters.tagIds.length > 0 && (
              <Chip
                icon={<LabelIcon />}
                label={`${localFilters.tagIds.length} ${localFilters.tagIds.length === 1 ? 'tag' : 'tags'}`}
                size="small"
                color="primary"
                variant="outlined"
                onDelete={() => handleClearFilter('tagIds')}
              />
            )}
            {localFilters.vendorIds && localFilters.vendorIds.length > 0 && (
              <Chip
                icon={<StoreIcon />}
                label={`${localFilters.vendorIds.length} ${localFilters.vendorIds.length === 1 ? 'fornecedor' : 'fornecedores'}`}
                size="small"
                color="secondary"
                variant="outlined"
                onDelete={() => handleClearFilter('vendorIds')}
              />
            )}
            {localFilters.customerIds &&
              localFilters.customerIds.length > 0 && (
                <Chip
                  icon={<PersonIcon />}
                  label={`${localFilters.customerIds.length} ${localFilters.customerIds.length === 1 ? 'cliente' : 'clientes'}`}
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
