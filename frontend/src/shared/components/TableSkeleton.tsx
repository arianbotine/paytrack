import { Box, Skeleton, TableRow, TableCell } from '@mui/material';
import { motion } from 'framer-motion';

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

export function TableSkeleton({
  rows = 5,
  columns = 6,
}: Readonly<TableSkeletonProps>) {
  return (
    <>
      {Array.from({ length: rows }, (_, rowIndex) => (
        <TableRow key={`table-row-${rowIndex}`}>
          {Array.from({ length: columns }, (_, colIndex) => (
            <TableCell key={`table-cell-${rowIndex}-${colIndex}`}>
              <Skeleton
                variant="text"
                width="100%"
                height={20}
                sx={{ borderRadius: 1 }}
                animation="wave"
              />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

interface CardSkeletonProps {
  count?: number;
}

export function CardSkeleton({ count = 4 }: Readonly<CardSkeletonProps>) {
  return (
    <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
      {Array.from({ length: count }, (_, i) => (
        <motion.div
          key={`card-skeleton-${i}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          style={{ flex: '1 1 240px', maxWidth: 320 }}
        >
          <Box
            sx={{
              p: 3,
              borderRadius: 2,
              border: 1,
              borderColor: 'divider',
              bgcolor: 'background.paper',
            }}
          >
            <Skeleton
              variant="text"
              width="60%"
              height={20}
              sx={{ mb: 1, borderRadius: 1 }}
            />
            <Skeleton
              variant="text"
              width="80%"
              height={32}
              sx={{ mb: 1, borderRadius: 1 }}
            />
            <Skeleton
              variant="text"
              width="40%"
              height={16}
              sx={{ borderRadius: 1 }}
            />
          </Box>
        </motion.div>
      ))}
    </Box>
  );
}

export function FormSkeleton() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {Array.from({ length: 4 }, (_, i) => (
        <Box key={`form-field-${i}`}>
          <Skeleton
            variant="text"
            width={100}
            height={16}
            sx={{ mb: 1, borderRadius: 1 }}
          />
          <Skeleton
            variant="rectangular"
            width="100%"
            height={40}
            sx={{ borderRadius: 2 }}
          />
        </Box>
      ))}
    </Box>
  );
}
