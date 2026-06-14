import {
  FormEvent,
  KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Fab,
  IconButton,
  Paper,
  Slide,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  AutoAwesome as AutoAwesomeIcon,
  Close as CloseIcon,
  ContentCopy as ContentCopyIcon,
  DeleteOutline as DeleteOutlineIcon,
  ExpandMore as ExpandMoreIcon,
  Insights as InsightsIcon,
  QueryStats as QueryStatsIcon,
  Refresh as RefreshIcon,
  Send as SendIcon,
  SmartToy as SmartToyIcon,
  Speed as SpeedIcon,
  Tune as TuneIcon,
} from '@mui/icons-material';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AxiosError } from 'axios';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/stores/authStore';

type VisualizationType = 'line' | 'bar' | 'table';
type ResponseMode = 'basic' | 'advanced';

interface AiQueryVisualization {
  type: VisualizationType;
  x?: string;
  y?: string;
}

interface AiQueryMetadata {
  provider: string;
  execution_time_ms: number;
  response_mode: ResponseMode;
  sql_source?: string | null;
  row_count: number;
  column_count: number;
}

interface AiQueryDiagnosticsTimings {
  context_build_ms: number;
  sql_generation_ms: number;
  sql_validation_ms: number;
  query_execution_ms: number;
  insight_generation_ms: number;
  visualization_ms: number;
  total_ms: number;
}

interface AiQueryDiagnostics {
  sql_generated: boolean;
  sql_validated: boolean;
  query_executed: boolean;
  used_fallback_answer: boolean;
  rows_returned: number;
  columns_returned: number;
  visualization_type: string;
  timings: AiQueryDiagnosticsTimings;
}

interface AiQueryResponse {
  answer: string;
  sql: string;
  columns: string[];
  rows: Record<string, unknown>[];
  visualization: AiQueryVisualization;
  metadata: AiQueryMetadata;
  diagnostics: AiQueryDiagnostics;
}

interface SystemFeatureFlags {
  aiQueryChatEnabled: boolean;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  createdAt: string;
  sourcePrompt?: string;
  responseMode?: ResponseMode;
  response?: AiQueryResponse;
}

const SUGGESTED_PROMPTS = [
  'Quanto entrou por mes nos ultimos 6 meses?',
  'Quais categorias mais geraram despesas este mes?',
  'Mostre os maiores clientes em valor recebido no trimestre.',
  'Compare contas a pagar e a receber por mes neste ano.',
];

const CHAT_RADIUS = {
  shell: 5,
  panel: 4,
  inner: 3,
  compact: 2.5,
};

function formatTimeLabel(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function getSqlSourceLabel(value?: string | null) {
  switch (value) {
    case 'trained_exact':
      return 'Treino exato';
    case 'trained_similar':
      return 'Treino similar';
    case 'vanna_generated':
      return 'Gerado pelo modelo';
    case 'generation_failed':
      return 'Falha na geracao';
    case 'validation_failed':
      return 'Bloqueado na validacao';
    case 'execution_failed':
      return 'Falha na execucao';
    default:
      return value || 'Nao informado';
  }
}

function DiagnosticsPanel({
  response,
}: Readonly<{
  response: AiQueryResponse;
}>) {
  const diagnostics = response.diagnostics;
  const metadata = response.metadata;

  return (
    <Stack spacing={1.25}>
      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
        <Chip
          size="small"
          icon={<SpeedIcon />}
          label={`${diagnostics.timings.total_ms} ms total`}
          variant="outlined"
        />
        <Chip
          size="small"
          icon={<TuneIcon />}
          label={getSqlSourceLabel(metadata.sql_source)}
          variant="outlined"
        />
        {diagnostics.used_fallback_answer && (
          <Chip
            size="small"
            color="warning"
            label="Resumo em fallback"
            variant="outlined"
          />
        )}
      </Stack>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
          gap: 1,
        }}
      >
        <Paper
          variant="outlined"
          sx={{ p: 1.25, borderRadius: CHAT_RADIUS.inner }}
        >
          <Typography variant="caption" color="text.secondary">
            Pipeline
          </Typography>
          <Typography variant="body2">
            SQL gerado: {diagnostics.sql_generated ? 'Sim' : 'Nao'}
          </Typography>
          <Typography variant="body2">
            SQL validado: {diagnostics.sql_validated ? 'Sim' : 'Nao'}
          </Typography>
          <Typography variant="body2">
            Consulta executada: {diagnostics.query_executed ? 'Sim' : 'Nao'}
          </Typography>
        </Paper>

        <Paper
          variant="outlined"
          sx={{ p: 1.25, borderRadius: CHAT_RADIUS.inner }}
        >
          <Typography variant="caption" color="text.secondary">
            Resultado
          </Typography>
          <Typography variant="body2">
            Linhas: {diagnostics.rows_returned} | Colunas:{' '}
            {diagnostics.columns_returned}
          </Typography>
          <Typography variant="body2">
            Visualizacao: {diagnostics.visualization_type}
          </Typography>
          <Typography variant="body2">Provider: {metadata.provider}</Typography>
        </Paper>
      </Box>

      <Paper
        variant="outlined"
        sx={{ p: 1.25, borderRadius: CHAT_RADIUS.inner }}
      >
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: 'block', mb: 0.75 }}
        >
          Tempos por etapa
        </Typography>
        <Typography variant="body2">
          Contexto: {diagnostics.timings.context_build_ms} ms | Geracao SQL:{' '}
          {diagnostics.timings.sql_generation_ms} ms
        </Typography>
        <Typography variant="body2">
          Validacao: {diagnostics.timings.sql_validation_ms} ms | Execucao:{' '}
          {diagnostics.timings.query_execution_ms} ms
        </Typography>
        <Typography variant="body2">
          Explicacao: {diagnostics.timings.insight_generation_ms} ms |
          Visualizacao: {diagnostics.timings.visualization_ms} ms
        </Typography>
      </Paper>
    </Stack>
  );
}

function QueryResultCard({
  response,
  onCopySql,
  onReusePrompt,
  showAdvancedDetails,
}: Readonly<{
  response: AiQueryResponse;
  onCopySql: (sql: string) => void;
  onReusePrompt: () => void;
  showAdvancedDetails: boolean;
}>) {
  const theme = useTheme();
  const chartData = useMemo(() => response.rows, [response.rows]);
  const hasChart =
    response.visualization.type !== 'table' &&
    Boolean(response.visualization.x) &&
    Boolean(response.visualization.y) &&
    response.rows.length > 0;

  const renderChart = () => {
    if (!hasChart) {
      return null;
    }

    const xKey = response.visualization.x!;
    const yKey = response.visualization.y!;

    if (response.visualization.type === 'line') {
      return (
        <Box sx={{ width: '100%', height: 260 }}>
          <ResponsiveContainer>
            <LineChart data={chartData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={theme.palette.divider}
              />
              <XAxis dataKey={xKey} tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <RechartsTooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey={yKey}
                stroke={theme.palette.primary.main}
                strokeWidth={2.5}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      );
    }

    return (
      <Box sx={{ width: '100%', height: 260 }}>
        <ResponsiveContainer>
          <BarChart data={chartData}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={theme.palette.divider}
            />
            <XAxis dataKey={xKey} tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <RechartsTooltip />
            <Legend />
            <Bar
              dataKey={yKey}
              fill={theme.palette.success.main}
              radius={[10, 10, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </Box>
    );
  };

  return (
    <Box
      sx={{
        mt: 1.25,
        borderRadius: CHAT_RADIUS.panel,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor:
          theme.palette.mode === 'dark'
            ? 'rgba(15, 23, 42, 0.38)'
            : 'rgba(255, 255, 255, 0.88)',
        backdropFilter: 'blur(10px)',
        overflow: 'hidden',
      }}
    >
      <Box sx={{ p: 1.5 }}>
        <Stack spacing={1.5}>
          <Box>
            <Stack
              direction="row"
              spacing={1}
              useFlexGap
              flexWrap="wrap"
              sx={{ mb: 1 }}
            >
              {showAdvancedDetails ? (
                <>
                  <Chip
                    size="small"
                    icon={<AutoAwesomeIcon />}
                    label={`Resposta pronta em ${response.metadata.execution_time_ms} ms`}
                    color="primary"
                    variant="outlined"
                  />
                  <Chip
                    size="small"
                    icon={<InsightsIcon />}
                    label={`${response.rows.length} linha${response.rows.length === 1 ? '' : 's'}`}
                    variant="outlined"
                  />
                  <Chip
                    size="small"
                    icon={<QueryStatsIcon />}
                    label={
                      response.visualization.type === 'table'
                        ? 'Tabela'
                        : 'Grafico'
                    }
                    variant="outlined"
                  />
                </>
              ) : (
                <Chip
                  size="small"
                  color="primary"
                  variant="outlined"
                  label={
                    response.rows.length > 0
                      ? `${response.rows.length} resultado${response.rows.length === 1 ? '' : 's'} encontrado${response.rows.length === 1 ? '' : 's'}`
                      : 'Nenhum resultado encontrado'
                  }
                />
              )}
            </Stack>

            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
              {response.answer}
            </Typography>
          </Box>

          {response.rows.length === 0 && (
            <Alert severity="info">
              A consulta foi executada, mas nao retornou dados para esse
              recorte.
            </Alert>
          )}

          {!hasChart &&
            response.visualization.type !== 'table' &&
            response.rows.length > 0 && (
              <Alert severity="info">
                A visualizacao sugerida nao tinha eixos suficientes, entao
                mantivemos a tabela.
              </Alert>
            )}

          {hasChart && (
            <Box
              sx={{
                borderRadius: CHAT_RADIUS.inner,
                border: '1px solid',
                borderColor: 'divider',
                p: 1.25,
                bgcolor:
                  theme.palette.mode === 'dark'
                    ? 'rgba(15, 23, 42, 0.48)'
                    : 'rgba(248, 250, 252, 0.92)',
              }}
            >
              {renderChart()}
            </Box>
          )}

          <TableContainer
            sx={{
              borderRadius: CHAT_RADIUS.inner,
              border: '1px solid',
              borderColor: 'divider',
              maxHeight: 260,
              bgcolor: 'background.paper',
            }}
          >
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  {response.columns.map(column => (
                    <TableCell
                      key={column}
                      sx={{
                        fontWeight: 700,
                        bgcolor:
                          theme.palette.mode === 'dark'
                            ? 'rgba(15, 23, 42, 0.92)'
                            : 'rgba(248, 250, 252, 0.96)',
                      }}
                    >
                      {column}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {response.rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={Math.max(response.columns.length, 1)}>
                      Nenhum dado retornado.
                    </TableCell>
                  </TableRow>
                )}
                {response.rows.map((row, rowIndex) => (
                  <TableRow key={`row-${rowIndex}`} hover>
                    {response.columns.map(column => (
                      <TableCell key={`cell-${rowIndex}-${column}`}>
                        {String(row[column] ?? '-')}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            <Button
              size="small"
              startIcon={<RefreshIcon />}
              onClick={onReusePrompt}
            >
              Refinar pergunta
            </Button>
            {showAdvancedDetails && response.sql && (
              <Button
                size="small"
                startIcon={<ContentCopyIcon />}
                onClick={() => onCopySql(response.sql)}
              >
                Copiar SQL
              </Button>
            )}
          </Stack>

          {showAdvancedDetails && (
            <>
              <Accordion
                disableGutters
                elevation={0}
                sx={{
                  borderRadius: `${CHAT_RADIUS.inner * 8}px !important`,
                  border: '1px solid',
                  borderColor: 'divider',
                  backgroundColor:
                    theme.palette.mode === 'dark'
                      ? 'rgba(15, 23, 42, 0.32)'
                      : 'rgba(248, 250, 252, 0.72)',
                  '&::before': {
                    display: 'none',
                  },
                }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  sx={{
                    minHeight: 46,
                    px: 1.25,
                    '& .MuiAccordionSummary-content': {
                      my: 0.75,
                    },
                  }}
                >
                  <Typography variant="caption" fontWeight={700}>
                    Ver diagnosticos do processamento
                  </Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ px: 1.25, pb: 1.25, pt: 0 }}>
                  <DiagnosticsPanel response={response} />
                </AccordionDetails>
              </Accordion>

              <Accordion
                disableGutters
                elevation={0}
                sx={{
                  borderRadius: `${CHAT_RADIUS.inner * 8}px !important`,
                  border: '1px solid',
                  borderColor: 'divider',
                  backgroundColor:
                    theme.palette.mode === 'dark'
                      ? 'rgba(15, 23, 42, 0.32)'
                      : 'rgba(248, 250, 252, 0.72)',
                  '&::before': {
                    display: 'none',
                  },
                }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  sx={{
                    minHeight: 46,
                    px: 1.25,
                    '& .MuiAccordionSummary-content': {
                      my: 0.75,
                    },
                  }}
                >
                  <Typography variant="caption" fontWeight={700}>
                    Ver SQL e metadados
                  </Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ px: 1.25, pb: 1.25, pt: 0 }}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: 'block', mb: 1 }}
                  >
                    Provider: {response.metadata.provider} | Origem:{' '}
                    {getSqlSourceLabel(response.metadata.sql_source)}
                  </Typography>
                  <Box
                    component="pre"
                    sx={{
                      p: 1.25,
                      borderRadius: CHAT_RADIUS.compact,
                      backgroundColor:
                        theme.palette.mode === 'dark'
                          ? 'rgba(148, 163, 184, 0.12)'
                          : 'grey.100',
                      border: '1px solid',
                      borderColor: 'divider',
                      color: 'text.primary',
                      fontFamily: 'monospace',
                      fontSize: 12,
                      lineHeight: 1.45,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      overflowX: 'auto',
                      mb: 0,
                      m: 0,
                    }}
                  >
                    {response.sql}
                  </Box>
                </AccordionDetails>
              </Accordion>
            </>
          )}
        </Stack>
      </Box>
    </Box>
  );
}

function EmptyState({
  onSelectPrompt,
  canUseAdvancedChat,
}: Readonly<{
  onSelectPrompt: (prompt: string) => void;
  canUseAdvancedChat: boolean;
}>) {
  const theme = useTheme();

  return (
    <Stack spacing={2}>
      <Paper
        elevation={0}
        sx={{
          p: 2,
          borderRadius: CHAT_RADIUS.panel,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor:
            theme.palette.mode === 'dark'
              ? 'rgba(15, 23, 42, 0.54)'
              : 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <Stack spacing={1.25}>
          <Stack direction="row" spacing={1} alignItems="center">
            <SmartToyIcon color="primary" fontSize="small" />
            <Typography variant="subtitle2" fontWeight={700}>
              Pergunte como se estivesse falando com um analista
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary">
            O assistente entende sua pergunta, busca os dados da operacao e
            responde de forma clara, com resumo, tabela e visualizacao quando
            fizer sentido.
          </Typography>
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            <Chip size="small" label="Resumo em linguagem natural" />
            <Chip size="small" label="Tabela pronta para conferencia" />
            {canUseAdvancedChat && (
              <Chip size="small" label="Modo avancado para auditoria" />
            )}
          </Stack>
        </Stack>
      </Paper>

      <Box>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: 'block', mb: 1 }}
        >
          Sugestoes para comecar
        </Typography>
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          {SUGGESTED_PROMPTS.map(suggestedPrompt => (
            <Chip
              key={suggestedPrompt}
              label={suggestedPrompt}
              onClick={() => onSelectPrompt(suggestedPrompt)}
              clickable
              variant="outlined"
              sx={{
                maxWidth: '100%',
                borderRadius: 999,
                justifyContent: 'flex-start',
                '& .MuiChip-label': {
                  display: 'block',
                  whiteSpace: 'normal',
                },
              }}
            />
          ))}
        </Stack>
      </Box>
    </Stack>
  );
}

export function AiQueryFloatingChat() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const user = useAuthStore(state => state.user);
  const { data: featureFlags, isLoading: isLoadingFeatureFlags } = useQuery({
    queryKey: ['system-settings', 'features'],
    queryFn: async (): Promise<SystemFeatureFlags> => {
      const response = await api.get('/system-settings/features', {
        headers: {
          'X-Silent-Request': 'true',
        },
      });
      return response.data;
    },
    retry: 1,
    staleTime: 60000,
  });
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [advancedMode, setAdvancedMode] = useState(false);

  const hasMessages = messages.length > 0;
  const lastAssistantMessage = [...messages]
    .reverse()
    .find(message => message.role === 'assistant');
  const canUseAdvancedChat = Boolean(
    user?.isSystemAdmin ||
    user?.currentOrganization?.role === 'OWNER' ||
    user?.currentOrganization?.role === 'ADMIN'
  );
  const activeResponseMode: ResponseMode =
    canUseAdvancedChat && advancedMode ? 'advanced' : 'basic';

  const scrollToBottom = () => {
    const container = messagesContainerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  };

  useEffect(() => {
    if (!open) {
      return;
    }

    requestAnimationFrame(scrollToBottom);
  }, [messages, loading, open]);

  useEffect(() => {
    if (!open || isMobile) {
      return;
    }

    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }, [open, isMobile]);

  useEffect(() => {
    if (!canUseAdvancedChat && advancedMode) {
      setAdvancedMode(false);
    }
  }, [advancedMode, canUseAdvancedChat]);

  const showSnackbar = (message: string) => {
    setSnackbarMessage(message);
    setSnackbarOpen(true);
  };

  const handleOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handlePromptSelection = (suggestedPrompt: string) => {
    setPrompt(suggestedPrompt);

    if (!open) {
      setOpen(true);
    }
  };

  const handleClearConversation = () => {
    setMessages([]);
    setError(null);
    setPrompt('');
  };

  const handleCopySql = async (sql: string) => {
    try {
      await navigator.clipboard.writeText(sql);
      showSnackbar('SQL copiado para a area de transferencia.');
    } catch (copyError) {
      console.error('Erro ao copiar SQL:', copyError);
      showSnackbar('Nao foi possivel copiar o SQL.');
    }
  };

  const handleSubmit = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();

    const trimmed = prompt.trim();
    if (!trimmed || loading) {
      return;
    }

    setError(null);
    setLoading(true);

    const userMessage: ChatMessage = {
      id: `${Date.now()}-user`,
      role: 'user',
      text: trimmed,
      createdAt: new Date().toISOString(),
      responseMode: activeResponseMode,
    };

    setMessages(previous => [...previous, userMessage]);
    setPrompt('');

    try {
      const response = await api.post<AiQueryResponse>('/ai-query/chat', {
        message: trimmed,
        responseMode: activeResponseMode,
      });

      const assistantMessage: ChatMessage = {
        id: `${Date.now()}-assistant`,
        role: 'assistant',
        text: response.data.answer,
        createdAt: new Date().toISOString(),
        sourcePrompt: trimmed,
        responseMode: response.data.metadata.response_mode,
        response: response.data,
      };

      setMessages(previous => [...previous, assistantMessage]);
    } catch (requestError) {
      const axiosError = requestError as AxiosError<{ message?: string }>;
      setError(
        axiosError.response?.data?.message ||
          'Nao foi possivel consultar o AI Query Engine. Tente reformular a pergunta.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleInputKeyDown = (
    event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void handleSubmit();
    }
  };

  if (isLoadingFeatureFlags || !featureFlags?.aiQueryChatEnabled) {
    return null;
  }

  return (
    <>
      <Box
        sx={{
          position: 'fixed',
          right: { xs: 12, sm: 20 },
          bottom: { xs: 12, sm: 20 },
          zIndex: theme.zIndex.drawer + 5,
        }}
      >
        <Slide direction="up" in={open} mountOnEnter unmountOnExit>
          <Paper
            elevation={12}
            sx={{
              width: { xs: 'calc(100vw - 24px)', sm: 460 },
              height: { xs: 'calc(100dvh - 24px)', sm: 720 },
              maxHeight: {
                xs: 'calc(100dvh - 24px)',
                sm: 'calc(100vh - 110px)',
              },
              mb: 1.5,
              overflow: 'hidden',
              borderRadius: CHAT_RADIUS.shell,
              border: '1px solid',
              borderColor: 'divider',
              display: 'flex',
              flexDirection: 'column',
              boxShadow:
                theme.palette.mode === 'dark'
                  ? '0 24px 60px rgba(2, 6, 23, 0.55)'
                  : '0 24px 60px rgba(15, 23, 42, 0.16)',
              backgroundImage:
                theme.palette.mode === 'dark'
                  ? 'linear-gradient(180deg, rgba(37,99,235,0.16) 0%, rgba(15,23,42,0.98) 14%, rgba(15,23,42,1) 100%)'
                  : 'linear-gradient(180deg, rgba(37,99,235,0.10) 0%, rgba(255,255,255,0.98) 16%, rgba(248,250,252,1) 100%)',
            }}
          >
            <Box
              sx={{
                px: 2,
                py: 1.5,
                borderBottom: '1px solid',
                borderColor:
                  theme.palette.mode === 'dark'
                    ? 'rgba(148, 163, 184, 0.18)'
                    : 'rgba(148, 163, 184, 0.22)',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 1,
              }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  sx={{ mb: 0.5 }}
                >
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: CHAT_RADIUS.compact,
                      display: 'grid',
                      placeItems: 'center',
                      bgcolor: 'primary.main',
                      color: 'primary.contrastText',
                      boxShadow:
                        theme.palette.mode === 'dark'
                          ? '0 10px 24px rgba(37, 99, 235, 0.42)'
                          : '0 10px 24px rgba(37, 99, 235, 0.24)',
                    }}
                  >
                    <SmartToyIcon fontSize="small" />
                  </Box>
                  <Box>
                    <Typography variant="subtitle1" fontWeight={700}>
                      Assistente Analitico
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Respostas em linguagem natural com dados da operacao.
                    </Typography>
                  </Box>
                </Stack>

                {lastAssistantMessage?.response && (
                  <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                    {canUseAdvancedChat && advancedMode && (
                      <Chip
                        size="small"
                        icon={<TuneIcon />}
                        label="Modo avancado"
                        color="primary"
                        variant="outlined"
                      />
                    )}
                    <Chip
                      size="small"
                      label={
                        lastAssistantMessage.response.metadata.response_mode ===
                        'advanced'
                          ? `${lastAssistantMessage.response.rows.length} linhas na ultima resposta`
                          : `${lastAssistantMessage.response.rows.length} resultado${lastAssistantMessage.response.rows.length === 1 ? '' : 's'}`
                      }
                      variant="outlined"
                    />
                    {canUseAdvancedChat && advancedMode && (
                      <Chip
                        size="small"
                        label={`${lastAssistantMessage.response.metadata.execution_time_ms} ms`}
                        variant="outlined"
                      />
                    )}
                  </Stack>
                )}
              </Box>

              <Stack
                direction="row"
                spacing={0.75}
                sx={{
                  p: 0.5,
                  borderRadius: 999,
                  bgcolor:
                    theme.palette.mode === 'dark'
                      ? 'rgba(15, 23, 42, 0.42)'
                      : 'rgba(255, 255, 255, 0.68)',
                  border: '1px solid',
                  borderColor:
                    theme.palette.mode === 'dark'
                      ? 'rgba(148, 163, 184, 0.16)'
                      : 'rgba(148, 163, 184, 0.2)',
                }}
              >
                {canUseAdvancedChat && (
                  <Tooltip
                    title={
                      advancedMode
                        ? 'Desativar chat avancado'
                        : 'Ativar chat avancado'
                    }
                  >
                    <IconButton
                      size="small"
                      onClick={() => setAdvancedMode(previous => !previous)}
                      sx={{
                        borderRadius: 999,
                        color: advancedMode ? 'primary.main' : 'text.secondary',
                        bgcolor: advancedMode
                          ? theme.palette.mode === 'dark'
                            ? 'rgba(37, 99, 235, 0.18)'
                            : 'rgba(37, 99, 235, 0.10)'
                          : 'transparent',
                        '&:hover': {
                          bgcolor: advancedMode
                            ? theme.palette.mode === 'dark'
                              ? 'rgba(37, 99, 235, 0.24)'
                              : 'rgba(37, 99, 235, 0.14)'
                            : theme.palette.mode === 'dark'
                              ? 'rgba(148, 163, 184, 0.10)'
                              : 'rgba(148, 163, 184, 0.12)',
                        },
                      }}
                    >
                      <TuneIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
                {hasMessages && (
                  <Tooltip title="Limpar conversa">
                    <IconButton
                      size="small"
                      onClick={handleClearConversation}
                      sx={{ borderRadius: 999 }}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
                <Tooltip title="Fechar">
                  <IconButton
                    size="small"
                    onClick={handleClose}
                    sx={{ borderRadius: 999 }}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Box>

            <Box
              ref={messagesContainerRef}
              sx={{
                flex: 1,
                overflowY: 'auto',
                px: 1.5,
                py: 1.75,
                background:
                  theme.palette.mode === 'dark'
                    ? 'linear-gradient(180deg, rgba(15,23,42,0.18) 0%, rgba(15,23,42,0) 20%)'
                    : 'linear-gradient(180deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0) 24%)',
              }}
            >
              {!hasMessages && (
                <EmptyState
                  onSelectPrompt={handlePromptSelection}
                  canUseAdvancedChat={canUseAdvancedChat}
                />
              )}

              {!hasMessages && canUseAdvancedChat && advancedMode && (
                <Alert severity="info" sx={{ mt: 1.5 }}>
                  O modo avancado mostra detalhes operacionais do pipeline para
                  auditoria e tuning, mas o usuario comum continua vendo
                  respostas objetivas no modo padrao.
                </Alert>
              )}

              <Stack spacing={1.5}>
                {messages.map(message => (
                  <Box
                    key={message.id}
                    sx={{
                      alignSelf:
                        message.role === 'user' ? 'flex-end' : 'flex-start',
                      width: '100%',
                      display: 'flex',
                      justifyContent:
                        message.role === 'user' ? 'flex-end' : 'flex-start',
                    }}
                  >
                    <Paper
                      elevation={0}
                      sx={{
                        px: 1.5,
                        py: 1.25,
                        maxWidth: message.role === 'user' ? '82%' : '100%',
                        borderRadius:
                          message.role === 'user'
                            ? '22px 22px 8px 22px'
                            : '22px 22px 22px 8px',
                        border: '1px solid',
                        borderColor:
                          message.role === 'user'
                            ? theme.palette.mode === 'dark'
                              ? 'rgba(96, 165, 250, 0.34)'
                              : 'rgba(59, 130, 246, 0.24)'
                            : 'divider',
                        bgcolor:
                          message.role === 'user'
                            ? theme.palette.mode === 'dark'
                              ? 'rgba(29, 78, 216, 0.24)'
                              : 'rgba(239, 246, 255, 0.95)'
                            : theme.palette.mode === 'dark'
                              ? 'rgba(15, 23, 42, 0.52)'
                              : 'rgba(255, 255, 255, 0.86)',
                        backdropFilter: 'blur(10px)',
                      }}
                    >
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        spacing={2}
                        sx={{ mb: 0.5 }}
                      >
                        <Typography variant="caption" color="text.secondary">
                          {message.role === 'user' ? 'Voce' : 'Assistente'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatTimeLabel(message.createdAt)}
                        </Typography>
                      </Stack>

                      {message.role === 'user' ? (
                        <Typography
                          variant="body2"
                          sx={{ whiteSpace: 'pre-wrap' }}
                        >
                          {message.text}
                        </Typography>
                      ) : (
                        <QueryResultCard
                          response={message.response!}
                          onCopySql={handleCopySql}
                          onReusePrompt={() =>
                            setPrompt(message.sourcePrompt ?? '')
                          }
                          showAdvancedDetails={
                            message.responseMode === 'advanced'
                          }
                        />
                      )}
                    </Paper>
                  </Box>
                ))}
              </Stack>

              {loading && (
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'flex-start',
                    mt: 1.5,
                  }}
                >
                  <Paper
                    sx={{
                      p: 1.5,
                      borderRadius: '22px 22px 22px 8px',
                      border: '1px solid',
                      borderColor: 'divider',
                      minWidth: 220,
                      bgcolor:
                        theme.palette.mode === 'dark'
                          ? 'rgba(15, 23, 42, 0.52)'
                          : 'rgba(255, 255, 255, 0.86)',
                      backdropFilter: 'blur(10px)',
                    }}
                  >
                    <Stack direction="row" spacing={1.25} alignItems="center">
                      <CircularProgress size={18} />
                      <Box>
                        <Typography variant="body2" fontWeight={600}>
                          Consultando seus dados
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Isso pode levar alguns segundos dependendo da
                          pergunta.
                        </Typography>
                      </Box>
                    </Stack>
                  </Paper>
                </Box>
              )}
            </Box>

            <Divider />

            <Box
              component="form"
              onSubmit={handleSubmit}
              sx={{
                p: 1.25,
                bgcolor:
                  theme.palette.mode === 'dark'
                    ? 'rgba(15, 23, 42, 0.86)'
                    : 'rgba(255, 255, 255, 0.92)',
                backdropFilter: 'blur(12px)',
              }}
            >
              {error && (
                <Alert severity="error" sx={{ mb: 1.25 }}>
                  {error}
                </Alert>
              )}

              <Stack spacing={1}>
                <TextField
                  fullWidth
                  multiline
                  maxRows={5}
                  inputRef={inputRef}
                  value={prompt}
                  onChange={event => setPrompt(event.target.value)}
                  onKeyDown={handleInputKeyDown}
                  placeholder="Ex.: Quais clientes mais atrasaram pagamentos neste trimestre?"
                  disabled={loading}
                  helperText="Enter envia. Shift + Enter quebra linha."
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 3.5,
                      alignItems: 'flex-end',
                      bgcolor:
                        theme.palette.mode === 'dark'
                          ? 'rgba(15, 23, 42, 0.42)'
                          : 'rgba(248, 250, 252, 0.92)',
                    },
                    '& .MuiFormHelperText-root': {
                      mx: 0.5,
                    },
                  }}
                />

                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  spacing={1}
                >
                  <Typography variant="caption" color="text.secondary">
                    Perguntas mais especificas costumam gerar respostas
                    melhores.
                  </Typography>
                  <Button
                    type="submit"
                    variant="contained"
                    endIcon={
                      loading ? (
                        <CircularProgress size={16} color="inherit" />
                      ) : (
                        <SendIcon />
                      )
                    }
                    disabled={loading || !prompt.trim()}
                    sx={{
                      minWidth: 112,
                      borderRadius: 999,
                      px: 2,
                      boxShadow: 'none',
                    }}
                  >
                    Enviar
                  </Button>
                </Stack>
              </Stack>
            </Box>
          </Paper>
        </Slide>

        <Tooltip
          title={open ? 'Ocultar assistente' : 'Abrir assistente analitico'}
          placement="left"
        >
          <Fab
            color="primary"
            variant={open || isMobile ? 'circular' : 'extended'}
            onClick={() => (open ? handleClose() : handleOpen())}
            aria-label="Abrir assistente analitico"
            sx={{
              boxShadow:
                theme.palette.mode === 'dark'
                  ? '0 14px 34px rgba(37, 99, 235, 0.34)'
                  : '0 14px 34px rgba(37, 99, 235, 0.22)',
              px: open || isMobile ? 0 : 2,
              borderRadius: 999,
              '&:hover': {
                transform: 'translateY(-1px)',
                boxShadow:
                  theme.palette.mode === 'dark'
                    ? '0 18px 38px rgba(37, 99, 235, 0.42)'
                    : '0 18px 38px rgba(37, 99, 235, 0.26)',
              },
            }}
          >
            <SmartToyIcon sx={{ mr: open || isMobile ? 0 : 1 }} />
            {!open && !isMobile && 'Perguntar ao assistente'}
          </Fab>
        </Tooltip>
      </Box>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={2500}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
      />
    </>
  );
}
