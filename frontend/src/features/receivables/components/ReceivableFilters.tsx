import React from "react";
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Stack,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { motion } from "framer-motion";
import { statusOptions } from "../types";

interface ReceivableFiltersProps {
  statusFilter: string;
  onStatusChange: (status: string) => void;
}

export const ReceivableFilters: React.FC<ReceivableFiltersProps> = ({
  statusFilter,
  onStatusChange,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  if (isMobile) {
    return (
      <Box sx={{ mb: 3, overflowX: "auto", pb: 1 }}>
        <Stack direction="row" spacing={1} sx={{ minWidth: "max-content" }}>
          {statusOptions.map((option) => (
            <motion.div key={option.value} whileTap={{ scale: 0.95 }}>
              <Chip
                label={option.label}
                variant={statusFilter === option.value ? "filled" : "outlined"}
                color={statusFilter === option.value ? "primary" : "default"}
                onClick={() => onStatusChange(option.value)}
                sx={{
                  fontWeight: statusFilter === option.value ? 600 : 400,
                  transition: "all 0.2s ease",
                }}
              />
            </motion.div>
          ))}
        </Stack>
      </Box>
    );
  }

  return (
    <Box sx={{ mb: 3 }}>
      <FormControl size="small" sx={{ minWidth: 200 }}>
        <InputLabel>Status</InputLabel>
        <Select
          value={statusFilter}
          label="Status"
          onChange={(e) => onStatusChange(e.target.value)}
        >
          {statusOptions.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
};
