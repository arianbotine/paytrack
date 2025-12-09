import { Box, Typography, Button } from "@mui/material";
import { Add as AddIcon } from "@mui/icons-material";

interface PageHeaderAction {
  label: string;
  onClick: () => void;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: PageHeaderAction;
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        mb: 3,
      }}
    >
      <Box>
        <Typography variant="h4" fontWeight="bold">
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      {action && (
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      )}
    </Box>
  );
}
