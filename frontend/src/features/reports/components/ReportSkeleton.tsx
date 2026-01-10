import { Box, Grid, Paper, Skeleton, Stack } from '@mui/material';
import type { ChartType } from '../types';

interface ReportSkeletonProps {
  chartType?: ChartType;
}

export const ReportSkeleton: React.FC<ReportSkeletonProps> = ({
  chartType,
}) => {
  let chartSkeleton: React.ReactNode;

  if (chartType === 'area') {
    const points = Array.from({ length: 10 }, (_, index) => ({
      id: `p${index + 1}`,
      left: `${index * 10}%`,
    }));
    chartSkeleton = (
      <Box position="relative" height={400}>
        {/* Simula pontos de linha */}
        {points.map(({ id, left }) => (
          <Skeleton
            key={id}
            variant="circular"
            width={8}
            height={8}
            sx={{
              position: 'absolute',
              left,
              top: `${Math.random() * 80}%`,
            }}
            animation="wave"
          />
        ))}
        {/* Eixo X */}
        <Skeleton
          variant="rectangular"
          height={1}
          sx={{ position: 'absolute', bottom: 0, width: '100%' }}
        />
        {/* Eixo Y */}
        <Skeleton
          variant="rectangular"
          width={1}
          sx={{ position: 'absolute', left: 0, height: '100%' }}
        />
      </Box>
    );
  } else if (chartType === 'bar') {
    const barIds = [
      'b1',
      'b2',
      'b3',
      'b4',
      'b5',
      'b6',
      'b7',
      'b8',
      'b9',
      'b10',
    ];
    chartSkeleton = (
      <Stack direction="row" spacing={1} alignItems="flex-end" height={400}>
        {barIds.map(id => (
          <Skeleton
            key={id}
            variant="rectangular"
            sx={{
              flex: 1,
              height: `${Math.random() * 200 + 100}px`,
              borderRadius: '4px 4px 0 0',
            }}
            animation="wave"
          />
        ))}
      </Stack>
    );
  } else {
    chartSkeleton = (
      <Skeleton
        variant="rectangular"
        height={400}
        sx={{ borderRadius: 2 }}
        animation="wave"
      />
    );
  }

  return (
    <Stack spacing={3}>
      {/* Header */}
      <Skeleton variant="text" width={200} height={32} sx={{ mb: 2 }} />

      {/* Filtros */}
      <Grid container spacing={2}>
        {['f1', 'f2', 'f3', 'f4'].map(id => (
          <Grid item xs={12} sm={6} md={3} key={id}>
            <Skeleton
              variant="rectangular"
              height={56}
              sx={{ borderRadius: 2 }}
              animation="wave"
            />
          </Grid>
        ))}
      </Grid>

      {/* KPIs */}
      <Grid container spacing={3}>
        {['k1', 'k2', 'k3', 'k4'].map(id => (
          <Grid item xs={12} sm={6} md={3} key={id}>
            <Skeleton
              variant="rectangular"
              height={120}
              sx={{ borderRadius: 2 }}
              animation="wave"
            />
          </Grid>
        ))}
      </Grid>

      {/* Gráfico */}
      <Paper sx={{ p: 3 }}>{chartSkeleton}</Paper>
    </Stack>
  );
};
