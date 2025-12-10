import { Box, Skeleton } from "@mui/material";
import { motion } from "framer-motion";

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

export function TableSkeleton({ rows = 5, columns = 6 }: TableSkeletonProps) {
  return (
    <Box sx={{ width: "100%", overflow: "hidden" }}>
      {/* Header skeleton */}
      <Box
        sx={{
          display: "flex",
          gap: 2,
          p: 2,
          borderBottom: 1,
          borderColor: "divider",
          bgcolor: "background.default",
        }}
      >
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton
            key={`header-${i}`}
            variant="text"
            width={i === 0 ? "20%" : `${Math.floor(80 / (columns - 1))}%`}
            height={24}
            sx={{ borderRadius: 1 }}
          />
        ))}
      </Box>

      {/* Row skeletons */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <motion.div
          key={`row-${rowIndex}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: rowIndex * 0.05 }}
        >
          <Box
            sx={{
              display: "flex",
              gap: 2,
              p: 2,
              borderBottom: 1,
              borderColor: "divider",
              "&:last-child": {
                borderBottom: 0,
              },
            }}
          >
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton
                key={`cell-${rowIndex}-${colIndex}`}
                variant="text"
                width={
                  colIndex === 0 ? "20%" : `${Math.floor(80 / (columns - 1))}%`
                }
                height={20}
                sx={{ borderRadius: 1 }}
                animation="wave"
              />
            ))}
          </Box>
        </motion.div>
      ))}
    </Box>
  );
}

interface CardSkeletonProps {
  count?: number;
}

export function CardSkeleton({ count = 4 }: CardSkeletonProps) {
  return (
    <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          style={{ flex: "1 1 240px", maxWidth: 320 }}
        >
          <Box
            sx={{
              p: 3,
              borderRadius: 2,
              border: 1,
              borderColor: "divider",
              bgcolor: "background.paper",
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
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {Array.from({ length: 4 }).map((_, i) => (
        <Box key={i}>
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
