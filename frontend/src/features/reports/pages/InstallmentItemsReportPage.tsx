import { useState } from 'react';
import {
  Container,
  Grid,
  Paper,
  Box,
  Button,
  Typography,
  Autocomplete,
  TextField,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Skeleton,
  Alert,
  FormControlLabel,
  Switch,
  Tooltip,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import ListAltIcon from '@mui/icons-material/ListAlt';
import LabelIcon from '@mui/icons-material/Label';
import InventoryIcon from '@mui/icons-material/Inventory';
import StoreIcon from '@mui/icons-material/Store';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import CategoryIcon from '@mui/icons-material/Category';
import {
  useInstallmentItemsReport,
  useInstallmentItemsGroupedReport,
  useInstallmentItemsGroupedByTagReport,
  useReportTags,
  useReportPayableCategories,
} from '../hooks/useReports';
import { ReportCard } from '../components/ReportCard';
import { exportInstallmentItemsReportToCSV } from '../utils/export-report';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendente',
  PAID: 'Pago',
  OVERDUE: 'Vencido',
  CANCELLED: 'Cancelado',
  PARTIAL: 'Parcial',
};

const STATUS_COLORS: Record<
  string,
  'default' | 'success' | 'error' | 'warning' | 'info'
> = {
  PENDING: 'warning',
  PAID: 'success',
  OVERDUE: 'error',
  CANCELLED: 'default',
  PARTIAL: 'info',
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

function formatDate(dateString: string): string {
  if (/^\d{4}-\d{2}-\d{2}/.test(dateString)) {
    const [year, month, day] = dateString.split('T')[0].split('-');
    const date = new Date(
      Number.parseInt(year),
      Number.parseInt(month) - 1,
      Number.parseInt(day)
    );
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }
  return new Date(dateString).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

interface TagOption {
  id: string;
  name: string;
  color: string;
}

interface CategoryOption {
  id: string;
  name: string;
  color?: string;
}

export default function InstallmentItemsReportPage() {
  const theme = useTheme();
  const [selectedTags, setSelectedTags] = useState<TagOption[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<CategoryOption[]>([]);
  const [appliedTagIds, setAppliedTagIds] = useState<string[]>([]);
  const [appliedCategoryIds, setAppliedCategoryIds] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [groupByDescription, setGroupByDescription] = useState(false);

  const { data: tagsData } = useReportTags();
  const tags: TagOption[] = (tagsData ?? []).map(t => ({
    id: t.id,
    name: t.name,
    color: (t as { id: string; name: string; color?: string }).color ?? '#888',
  }));

  const { data: categoriesData } = useReportPayableCategories();
  const categories: CategoryOption[] = (categoriesData ?? []).map(c => ({
    id: c.id,
    name: c.name,
    color: c.color ?? '#888',
  }));

  const hasFilter = appliedTagIds.length > 0 || appliedCategoryIds.length > 0;

  const { data, isLoading, isFetching, isError } = useInstallmentItemsReport(
    { tagIds: appliedTagIds, categoryIds: appliedCategoryIds, skip: page * rowsPerPage, take: rowsPerPage },
    hasFilter && !groupByDescription
  );

  const {
    data: groupedData,
    isLoading: isGroupedLoading,
    isFetching: isGroupedFetching,
    isError: isGroupedError,
  } = useInstallmentItemsGroupedReport(
    { tagIds: appliedTagIds, categoryIds: appliedCategoryIds },
    hasFilter && groupByDescription
  );

  const { data: groupedByTagData, isLoading: isGroupedByTagLoading } =
    useInstallmentItemsGroupedByTagReport(
      { tagIds: appliedTagIds, categoryIds: appliedCategoryIds },
      hasFilter
    );

  function handleApply() {
    setPage(0);
    setAppliedTagIds(selectedTags.map(t => t.id));
    setAppliedCategoryIds(selectedCategories.map(c => c.id));
  }

  function handleToggleGroup(checked: boolean) {
    setGroupByDescription(checked);
    setPage(0);
  }

  function handleExport() {
    if (!data) return;
    exportInstallmentItemsReportToCSV(
      data,
      selectedTags.map(t => t.name)
    );
  }

  const isQueryPending = !hasFilter;
  const activeLoading = groupByDescription
    ? isGroupedLoading || isGroupedFetching
    : isLoading || isFetching;
  const activeError = groupByDescription ? isGroupedError : isError;

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Box display="flex" alignItems="center" gap={1.5} mb={3}>
        <Box
          sx={{
            bgcolor: alpha(theme.palette.primary.main, 0.12),
            borderRadius: 2,
            p: 1,
            display: 'flex',
          }}
        >
          <ListAltIcon color="primary" />
        </Box>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Itens por Tag / Categoria
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Liste itens de parcelas filtrando por tag e/ou categoria
          </Typography>
        </Box>
      </Box>

      {/* Filtros */}
      <Paper sx={{ p: 2.5, mb: 3, borderRadius: 2 }}>
        <Typography variant="subtitle2" fontWeight={600} mb={2}>
          Filtros
        </Typography>
        <Box display="flex" gap={2} alignItems="flex-start" flexWrap="wrap">
          <Autocomplete
            multiple
            options={tags}
            getOptionLabel={option => option.name}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            value={selectedTags}
            onChange={(_, newValue) => setSelectedTags(newValue)}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => {
                const { key, ...tagProps } = getTagProps({ index });
                return (
                  <Chip
                    key={key}
                    label={option.name}
                    size="small"
                    sx={{
                      bgcolor: alpha(option.color, 0.15),
                      borderColor: option.color,
                      border: '1px solid',
                      color: option.color,
                    }}
                    {...tagProps}
                  />
                );
              })
            }
            renderOption={(props, option) => {
              const { key, ...rest } =
                props as React.HTMLAttributes<HTMLLIElement> & {
                  key?: React.Key;
                };
              return (
                <li key={key} {...rest}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Box
                      sx={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        bgcolor: option.color,
                        flexShrink: 0,
                      }}
                    />
                    <Typography variant="body2">{option.name}</Typography>
                  </Box>
                </li>
              );
            }}
            renderInput={params => (
              <TextField
                {...params}
                label="Tags"
                placeholder={
                  selectedTags.length === 0 ? 'Selecione uma ou mais tags' : ''
                }
                size="small"
              />
            )}
            sx={{ minWidth: 260, flex: 1 }}
            noOptionsText="Nenhuma tag encontrada"
          />
          <Autocomplete
            multiple
            options={categories}
            getOptionLabel={option => option.name}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            value={selectedCategories}
            onChange={(_, newValue) => setSelectedCategories(newValue)}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => {
                const { key, ...tagProps } = getTagProps({ index });
                return (
                  <Chip
                    key={key}
                    label={option.name}
                    size="small"
                    sx={{
                      bgcolor: alpha(option.color ?? '#888', 0.15),
                      borderColor: option.color ?? '#888',
                      border: '1px solid',
                      color: option.color ?? '#888',
                    }}
                    {...tagProps}
                  />
                );
              })
            }
            renderInput={params => (
              <TextField
                {...params}
                label="Categorias do Item"
                placeholder={
                  selectedCategories.length === 0 ? 'Selecione categorias' : ''
                }
                size="small"
              />
            )}
            sx={{ minWidth: 260, flex: 1 }}
            noOptionsText="Nenhuma categoria encontrada"
          />
          <Button
            variant="contained"
            onClick={handleApply}
            disabled={selectedTags.length === 0 && selectedCategories.length === 0}
            sx={{ height: 40 }}
          >
            Consultar
          </Button>
          {data && !groupByDescription && (
            <Button
              variant="outlined"
              startIcon={<FileDownloadIcon />}
              onClick={handleExport}
              sx={{ height: 40 }}
            >
              Exportar CSV
            </Button>
          )}
        </Box>
        <Box mt={2}>
          <Tooltip title="Agrupa todos os itens com a mesma descrição somando seus valores, independentemente da parcela">
            <FormControlLabel
              control={
                <Switch
                  checked={groupByDescription}
                  onChange={e => handleToggleGroup(e.target.checked)}
                  size="small"
                />
              }
              label={
                <Typography variant="body2">
                  Agrupar por descrição do item
                </Typography>
              }
            />
          </Tooltip>
        </Box>
      </Paper>

      {/* Summary Cards */}
      {(activeLoading || (!groupByDescription ? data : groupedData)) &&
        !isQueryPending && (
          <Grid container spacing={2} mb={3}>
            {groupByDescription ? (
              <>
                <Grid item xs={12} sm={6} md={3}>
                  <ReportCard
                    title="Descrições Únicas"
                    value={groupedData?.summary.uniqueDescriptions ?? 0}
                    color={theme.palette.primary.main}
                    icon={
                      <CategoryIcon
                        sx={{ color: theme.palette.primary.main }}
                      />
                    }
                    isLoading={activeLoading}
                    valueType="number"
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <ReportCard
                    title="Valor Total"
                    value={groupedData?.summary.totalAmount ?? 0}
                    color={theme.palette.success.main}
                    icon={
                      <InventoryIcon
                        sx={{ color: theme.palette.success.main }}
                      />
                    }
                    isLoading={activeLoading}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <ReportCard
                    title="Parcelas Únicas"
                    value={groupedData?.summary.uniqueInstallments ?? 0}
                    color={theme.palette.warning.main}
                    icon={
                      <ReceiptLongIcon
                        sx={{ color: theme.palette.warning.main }}
                      />
                    }
                    isLoading={activeLoading}
                    valueType="number"
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <ReportCard
                    title="Contas Únicas"
                    value={groupedData?.summary.uniquePayables ?? 0}
                    color={theme.palette.info.main}
                    icon={<StoreIcon sx={{ color: theme.palette.info.main }} />}
                    isLoading={activeLoading}
                    valueType="number"
                  />
                </Grid>
              </>
            ) : (
              <>
                <Grid item xs={12} sm={6} md={3}>
                  <ReportCard
                    title="Total de Itens"
                    value={data?.summary.totalItems ?? 0}
                    color={theme.palette.primary.main}
                    icon={
                      <ListAltIcon sx={{ color: theme.palette.primary.main }} />
                    }
                    isLoading={activeLoading}
                    valueType="number"
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <ReportCard
                    title="Valor Total"
                    value={data?.summary.totalAmount ?? 0}
                    color={theme.palette.success.main}
                    icon={
                      <InventoryIcon
                        sx={{ color: theme.palette.success.main }}
                      />
                    }
                    isLoading={activeLoading}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <ReportCard
                    title="Parcelas Únicas"
                    value={data?.summary.uniqueInstallments ?? 0}
                    color={theme.palette.warning.main}
                    icon={
                      <ReceiptLongIcon
                        sx={{ color: theme.palette.warning.main }}
                      />
                    }
                    isLoading={activeLoading}
                    valueType="number"
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <ReportCard
                    title="Contas Únicas"
                    value={data?.summary.uniquePayables ?? 0}
                    color={theme.palette.info.main}
                    icon={<StoreIcon sx={{ color: theme.palette.info.main }} />}
                    isLoading={activeLoading}
                    valueType="number"
                  />
                </Grid>
              </>
            )}
          </Grid>
        )}

      {/* Per-tag summary panel */}
      {!isQueryPending && (groupedByTagData || isGroupedByTagLoading) && (
        <Paper sx={{ p: 2.5, mb: 3, borderRadius: 2 }}>
          <Box display="flex" alignItems="center" gap={1} mb={2.5}>
            <LabelIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
            <Typography variant="subtitle2" fontWeight={700}>
              Totais por Tag
            </Typography>
            <Typography
              variant="caption"
              color="text.disabled"
              sx={{ ml: 0.5 }}
            >
              Um item com múltiplas tags aparece em cada grupo
            </Typography>
          </Box>
          <Box
            display="grid"
            sx={{
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: 2,
            }}
          >
            {isGroupedByTagLoading &&
              Array.from({ length: Math.max(appliedTagIds.length, 1) }).map((_, i) => (
                <Box
                  key={i}
                  sx={{
                    borderRadius: 2.5,
                    overflow: 'hidden',
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <Skeleton variant="rectangular" height={6} />
                  <Box sx={{ p: 2 }}>
                    <Skeleton variant="text" width="45%" height={18} />
                    <Skeleton
                      variant="text"
                      width="75%"
                      height={40}
                      sx={{ mt: 0.5 }}
                    />
                    <Skeleton
                      variant="rectangular"
                      height={4}
                      sx={{ mt: 1.5, borderRadius: 1 }}
                    />
                    <Box display="flex" gap={1} mt={2}>
                      <Skeleton variant="rounded" width={50} height={22} />
                      <Skeleton variant="rounded" width={60} height={22} />
                      <Skeleton variant="rounded" width={50} height={22} />
                    </Box>
                  </Box>
                </Box>
              ))}
            {!isGroupedByTagLoading &&
              (() => {
                const grandTotal = groupedByTagData!.data.reduce(
                  (s, g) => s + g.totalAmount,
                  0
                );
                return groupedByTagData!.data.map(group => {
                  const color = group.tagColor ?? '#888';
                  const pct =
                    grandTotal > 0
                      ? Math.round((group.totalAmount / grandTotal) * 100)
                      : 0;
                  return (
                    <Box
                      key={group.tagId}
                      sx={{
                        borderRadius: 2.5,
                        overflow: 'hidden',
                        border: '1px solid',
                        borderColor: alpha(color, 0.25),
                        bgcolor: 'background.paper',
                        display: 'flex',
                        flexDirection: 'column',
                        transition: 'box-shadow 0.2s',
                        '&:hover': {
                          boxShadow: `0 4px 20px ${alpha(color, 0.18)}`,
                        },
                      }}
                    >
                      {/* Colored top bar */}
                      <Box
                        sx={{
                          height: 6,
                          background: `linear-gradient(90deg, ${color} 0%, ${alpha(color, 0.5)} 100%)`,
                        }}
                      />

                      <Box sx={{ p: 2, flexGrow: 1 }}>
                        {/* Tag name */}
                        <Box
                          display="flex"
                          alignItems="center"
                          gap={0.75}
                          mb={1}
                        >
                          <Box
                            sx={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              bgcolor: color,
                              flexShrink: 0,
                            }}
                          />
                          <Typography
                            variant="caption"
                            fontWeight={700}
                            noWrap
                            sx={{
                              color,
                              textTransform: 'uppercase',
                              letterSpacing: 0.8,
                              fontSize: '0.68rem',
                            }}
                          >
                            {group.tagName}
                          </Typography>
                        </Box>

                        {/* Amount */}
                        <Typography
                          variant="h5"
                          fontWeight={800}
                          sx={{
                            color: 'text.primary',
                            lineHeight: 1.15,
                            mb: 1.5,
                            fontSize: { xs: '1.15rem', sm: '1.35rem' },
                          }}
                        >
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          }).format(group.totalAmount)}
                        </Typography>

                        {/* Progress bar */}
                        <Box
                          sx={{
                            height: 4,
                            borderRadius: 2,
                            bgcolor: alpha(color, 0.12),
                            mb: 0.5,
                            overflow: 'hidden',
                          }}
                        >
                          <Box
                            sx={{
                              height: '100%',
                              width: `${pct}%`,
                              borderRadius: 2,
                              background: `linear-gradient(90deg, ${color} 0%, ${alpha(color, 0.6)} 100%)`,
                              transition: 'width 0.6s ease',
                            }}
                          />
                        </Box>
                        <Typography
                          variant="caption"
                          color="text.disabled"
                          sx={{ display: 'block', mb: 2, fontSize: '0.68rem' }}
                        >
                          {pct}% do total pesquisado
                        </Typography>

                        {/* Pill counters */}
                        <Box
                          display="grid"
                          sx={{
                            gridTemplateColumns: 'repeat(3, 1fr)',
                            gap: 0.75,
                          }}
                        >
                          {[
                            { label: 'itens', value: group.itemCount },
                            {
                              label: 'parcelas',
                              value: group.installmentCount,
                            },
                            { label: 'contas', value: group.payableCount },
                          ].map(({ label, value }) => (
                            <Box
                              key={label}
                              sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                py: 0.75,
                                px: 0.5,
                                borderRadius: 2,
                                bgcolor: alpha(color, 0.08),
                                border: '1px solid',
                                borderColor: alpha(color, 0.2),
                              }}
                            >
                              <Typography
                                variant="caption"
                                fontWeight={800}
                                sx={{
                                  color,
                                  fontSize: '0.85rem',
                                  lineHeight: 1.1,
                                }}
                              >
                                {value}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.disabled"
                                sx={{
                                  fontSize: '0.62rem',
                                  textTransform: 'uppercase',
                                  letterSpacing: 0.4,
                                  lineHeight: 1.4,
                                }}
                              >
                                {label}
                              </Typography>
                            </Box>
                          ))}
                        </Box>
                      </Box>
                    </Box>
                  );
                });
              })()}
          </Box>
        </Paper>
      )}

      {/* Initial empty state */}
      {isQueryPending && (
        <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 2 }}>
          <LabelIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 1.5 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Selecione ao menos uma tag ou categoria
          </Typography>
          <Typography variant="body2" color="text.disabled">
            Escolha tags e/ou categorias no filtro acima e clique em Consultar.
          </Typography>
        </Paper>
      )}

      {/* Error */}
      {activeError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Ocorreu um erro ao buscar os dados. Tente novamente.
        </Alert>
      )}

      {/* Grouped Table */}
      {!isQueryPending && !activeError && groupByDescription && (
        <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow
                  sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05) }}
                >
                  <TableCell sx={{ fontWeight: 600 }}>
                    Descrição do Item
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">
                    Valor Total
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">
                    Qtd. Itens
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">
                    Parcelas
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">
                    Contas
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Tags</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {activeLoading &&
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 6 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton variant="text" width="80%" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                {!activeLoading && groupedData?.data.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                      <Typography variant="body2" color="text.secondary">
                        Nenhum item encontrado para os filtros selecionados.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
                {!activeLoading &&
                  groupedData?.data.map((row, idx) => (
                    <TableRow
                      key={idx}
                      hover
                      sx={{ '&:last-child td': { borderBottom: 0 } }}
                    >
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {row.description}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography
                          variant="body2"
                          fontWeight={600}
                          color="error.main"
                        >
                          {formatCurrency(row.totalAmount)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">{row.itemCount}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">
                          {row.installmentCount}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">
                          {row.payableCount}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box display="flex" gap={0.5} flexWrap="wrap">
                          {row.tags.map(tag => (
                            <Chip
                              key={tag.id}
                              label={tag.name}
                              size="small"
                              sx={{
                                height: 20,
                                fontSize: '0.68rem',
                                bgcolor: alpha(tag.color ?? '#888', 0.15),
                                borderColor: tag.color ?? '#888',
                                border: '1px solid',
                                color: tag.color ?? '#888',
                              }}
                            />
                          ))}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Flat Table */}
      {!isQueryPending && !activeError && !groupByDescription && (
        <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow
                  sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05) }}
                >
                  <TableCell sx={{ fontWeight: 600 }}>
                    Descrição do Item
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">
                    Valor
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Tags</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Cat. Item</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Fornecedor</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Categoria</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Parcela</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Vencimento</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">
                    Valor Parcela
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(isLoading || isFetching) &&
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 10 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton variant="text" width="80%" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                {!isLoading && !isFetching && data?.data.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} align="center" sx={{ py: 6 }}>
                      <Typography variant="body2" color="text.secondary">
                        Nenhum item encontrado para os filtros selecionados.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading &&
                  !isFetching &&
                  data?.data.map(row => (
                    <TableRow
                      key={row.itemId}
                      hover
                      sx={{ '&:last-child td': { borderBottom: 0 } }}
                    >
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {row.itemDescription}
                        </Typography>
                        {row.installmentNotes && (
                          <Typography variant="caption" color="text.secondary">
                            {row.installmentNotes}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <Typography
                          variant="body2"
                          fontWeight={600}
                          color="error.main"
                        >
                          {formatCurrency(row.itemAmount)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box display="flex" gap={0.5} flexWrap="wrap">
                          {row.tags.map(tag => (
                            <Chip
                              key={tag.id}
                              label={tag.name}
                              size="small"
                              sx={{
                                height: 20,
                                fontSize: '0.68rem',
                                bgcolor: alpha(tag.color ?? '#888', 0.15),
                                borderColor: tag.color ?? '#888',
                                border: '1px solid',
                                color: tag.color ?? '#888',
                              }}
                            />
                          ))}
                        </Box>
                      </TableCell>
                      <TableCell>
                        {row.itemCategoryName ? (
                          <Chip
                            label={row.itemCategoryName}
                            size="small"
                            variant="outlined"
                            sx={{
                              height: 20,
                              fontSize: '0.68rem',
                            }}
                          />
                        ) : (
                          <Typography variant="body2" color="text.disabled">—</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {row.vendorName}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {row.categoryName ?? '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {row.installmentNumber}/{row.totalInstallments}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {formatDate(row.installmentDueDate)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={
                            STATUS_LABELS[row.installmentStatus] ??
                            row.installmentStatus
                          }
                          size="small"
                          color={
                            STATUS_COLORS[row.installmentStatus] ?? 'default'
                          }
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">
                          {formatCurrency(row.installmentAmount)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>
          {data && data.total > 0 && (
            <TablePagination
              component="div"
              count={data.total}
              page={page}
              onPageChange={(_, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={e => {
                setRowsPerPage(Number.parseInt(e.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[25, 50, 100]}
              labelRowsPerPage="Linhas por página:"
              labelDisplayedRows={({ from, to, count }) =>
                `${from}–${to} de ${count}`
              }
            />
          )}
        </Paper>
      )}
    </Container>
  );
}
