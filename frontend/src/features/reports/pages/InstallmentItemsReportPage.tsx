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
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import ListAltIcon from '@mui/icons-material/ListAlt';
import LabelIcon from '@mui/icons-material/Label';
import InventoryIcon from '@mui/icons-material/Inventory';
import StoreIcon from '@mui/icons-material/Store';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import { useInstallmentItemsReport, useReportTags } from '../hooks/useReports';
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

export default function InstallmentItemsReportPage() {
  const theme = useTheme();
  const [selectedTags, setSelectedTags] = useState<TagOption[]>([]);
  const [appliedTagIds, setAppliedTagIds] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);

  const { data: tagsData } = useReportTags();
  const tags: TagOption[] = (tagsData ?? []).map(t => ({
    id: t.id,
    name: t.name,
    color: (t as { id: string; name: string; color?: string }).color ?? '#888',
  }));

  const { data, isLoading, isFetching, isError } = useInstallmentItemsReport(
    { tagIds: appliedTagIds, skip: page * rowsPerPage, take: rowsPerPage },
    appliedTagIds.length > 0
  );

  function handleApply() {
    setPage(0);
    setAppliedTagIds(selectedTags.map(t => t.id));
  }

  function handleExport() {
    if (!data) return;
    exportInstallmentItemsReportToCSV(
      data,
      selectedTags.map(t => t.name)
    );
  }

  const isQueryPending = appliedTagIds.length === 0;

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
            Itens por Tag
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Liste itens de parcelas filtrando por tag
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
            sx={{ minWidth: 320, flex: 1 }}
            noOptionsText="Nenhuma tag encontrada"
          />
          <Button
            variant="contained"
            onClick={handleApply}
            disabled={selectedTags.length === 0}
            sx={{ height: 40 }}
          >
            Consultar
          </Button>
          {data && (
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
      </Paper>

      {/* Summary Cards */}
      {(isLoading || isFetching || data) && !isQueryPending && (
        <Grid container spacing={2} mb={3}>
          <Grid item xs={12} sm={6} md={3}>
            <ReportCard
              title="Total de Itens"
              value={data?.summary.totalItems ?? 0}
              color={theme.palette.primary.main}
              icon={<ListAltIcon sx={{ color: theme.palette.primary.main }} />}
              isLoading={isLoading || isFetching}
              valueType="number"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <ReportCard
              title="Valor Total"
              value={data?.summary.totalAmount ?? 0}
              color={theme.palette.success.main}
              icon={
                <InventoryIcon sx={{ color: theme.palette.success.main }} />
              }
              isLoading={isLoading || isFetching}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <ReportCard
              title="Parcelas Únicas"
              value={data?.summary.uniqueInstallments ?? 0}
              color={theme.palette.warning.main}
              icon={
                <ReceiptLongIcon sx={{ color: theme.palette.warning.main }} />
              }
              isLoading={isLoading || isFetching}
              valueType="number"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <ReportCard
              title="Contas Únicas"
              value={data?.summary.uniquePayables ?? 0}
              color={theme.palette.info.main}
              icon={<StoreIcon sx={{ color: theme.palette.info.main }} />}
              isLoading={isLoading || isFetching}
              valueType="number"
            />
          </Grid>
        </Grid>
      )}

      {/* Initial empty state */}
      {isQueryPending && (
        <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 2 }}>
          <LabelIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 1.5 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Selecione ao menos uma tag
          </Typography>
          <Typography variant="body2" color="text.disabled">
            Escolha uma ou mais tags no filtro acima e clique em Consultar.
          </Typography>
        </Paper>
      )}

      {/* Error */}
      {isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Ocorreu um erro ao buscar os dados. Tente novamente.
        </Alert>
      )}

      {/* Table */}
      {!isQueryPending && !isError && (
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
                      {Array.from({ length: 9 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton variant="text" width="80%" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                {!isLoading && !isFetching && data?.data.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                      <Typography variant="body2" color="text.secondary">
                        Nenhum item encontrado para as tags selecionadas.
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
