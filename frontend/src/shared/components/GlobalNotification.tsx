import { Snackbar, Alert } from "@mui/material";
import { useUIStore } from "../../lib/stores/uiStore";

export function GlobalNotification() {
  const { notification, hideNotification } = useUIStore();

  return (
    <Snackbar
      open={notification.open}
      autoHideDuration={4000}
      onClose={hideNotification}
      anchorOrigin={{ vertical: "top", horizontal: "right" }}
    >
      <Alert
        onClose={hideNotification}
        severity={notification.type}
        variant="filled"
        sx={{ width: "100%" }}
      >
        {notification.message}
      </Alert>
    </Snackbar>
  );
}
