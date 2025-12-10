import React from "react";
import {
  Card,
  CardContent,
  Typography,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  Box,
} from "@mui/material";
import {
  Warning as WarningIcon,
  Schedule as ScheduleIcon,
} from "@mui/icons-material";
import { format } from "date-fns";
import { motion } from "framer-motion";

interface Account {
  id: string;
  description: string;
  amount: number;
  paidAmount: number;
  dueDate: string;
  vendor?: { name: string };
  customer?: { name: string };
}

interface AccountsTableProps {
  title: string;
  accounts: Account[];
  type: "payable" | "receivable";
  emptyMessage: string;
  alertColor: "error" | "warning";
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);

export const AccountsTable: React.FC<AccountsTableProps> = ({
  title,
  accounts,
  type,
  emptyMessage,
  alertColor,
}) => {
  const entityName = type === "payable" ? "vendor" : "customer";
  const entityLabel = type === "payable" ? "Credor" : "Cliente";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.5 }}
    >
      <Card sx={{ height: "100%" }}>
        <CardContent>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              mb: 2,
            }}
          >
            {alertColor === "error" ? (
              <WarningIcon color="error" />
            ) : (
              <ScheduleIcon color="warning" />
            )}
            <Typography variant="h6" fontWeight="bold">
              {title}
            </Typography>
            {accounts.length > 0 && (
              <Chip
                label={accounts.length}
                size="small"
                color={alertColor}
                sx={{ ml: "auto" }}
              />
            )}
          </Box>

          {accounts.length === 0 ? (
            <Alert
              severity="success"
              sx={{
                borderRadius: 2,
                "& .MuiAlert-icon": {
                  alignItems: "center",
                },
              }}
            >
              {emptyMessage}
            </Alert>
          ) : (
            <TableContainer
              component={Paper}
              variant="outlined"
              sx={{ borderRadius: 2 }}
            >
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Descrição</TableCell>
                    <TableCell>{entityLabel}</TableCell>
                    <TableCell align="right">Valor</TableCell>
                    <TableCell align="center">Vencimento</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {accounts.slice(0, 5).map((account, index) => (
                    <motion.tr
                      key={account.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      style={{ display: "table-row" }}
                    >
                      <TableCell>
                        <Typography
                          variant="body2"
                          noWrap
                          sx={{ maxWidth: 180 }}
                        >
                          {account.description}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          noWrap
                          sx={{ maxWidth: 120 }}
                        >
                          {(account as any)[entityName]?.name}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight="medium">
                          {formatCurrency(
                            Number(account.amount) - Number(account.paidAmount)
                          )}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={format(
                            new Date(account.dueDate),
                            "dd/MM/yyyy"
                          )}
                          size="small"
                          color={alertColor}
                          variant="outlined"
                        />
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};
