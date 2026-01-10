import {
  Card,
  CardContent,
  Box,
  Typography,
  Skeleton,
  Tooltip,
  IconButton,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCurrency, formatRelativeTime } from '../../../lib/utils/format';

interface ReportCardProps {
  title: string;
  value: number;
  color: string;
  icon: React.ReactNode;
  isLoading?: boolean;
  cachedAt?: string;
  helpText?: string;
  valueType?: 'currency' | 'number';
}

export const ReportCard: React.FC<ReportCardProps> = ({
  title,
  value,
  color,
  icon,
  isLoading,
  cachedAt,
  helpText,
  valueType = 'currency',
}) => {
  return (
    <Card
      sx={{
        height: '100%',
        background: `linear-gradient(135deg, ${alpha(color, 0.1)} 0%, ${alpha(color, 0.05)} 100%)`,
        border: '1px solid',
        borderColor: alpha(color, 0.2),
        borderRadius: 2,
      }}
    >
      <CardContent>
        <Box display="flex" flexDirection="column" gap={1.5}>
          {/* Header */}
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
          >
            <Box
              sx={{
                borderRadius: 2,
                bgcolor: alpha(color, 0.2),
                p: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {icon}
            </Box>
            <Box display="flex" alignItems="center" gap={0.5}>
              <Typography variant="subtitle2" color="text.secondary">
                {title}
              </Typography>
              {helpText && (
                <Tooltip
                  title={helpText}
                  arrow
                  placement="top"
                  enterDelay={200}
                  enterNextDelay={200}
                >
                  <IconButton
                    size="small"
                    sx={{
                      p: 0.25,
                      opacity: 0.5,
                      '&:hover': { opacity: 1 },
                      transition: 'opacity 0.2s',
                    }}
                  >
                    <HelpOutlineIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          </Box>

          {/* Value */}
          {isLoading ? (
            <Skeleton variant="rectangular" width="60%" height={36} />
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={value}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.3 }}
              >
                <Typography variant="h4" fontWeight="bold">
                  {valueType === 'currency'
                    ? formatCurrency(value)
                    : value.toLocaleString('pt-BR')}
                </Typography>
              </motion.div>
            </AnimatePresence>
          )}

          {/* Cache timestamp */}
          {cachedAt && (
            <Typography variant="caption" color="text.disabled">
              {formatRelativeTime(cachedAt)}
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};
