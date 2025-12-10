import { createTheme, alpha } from "@mui/material/styles";
import { PaletteMode } from "@mui/material";

// Modern color palette inspired by Tailwind/Stripe
const colors = {
  primary: {
    main: "#2563eb",
    light: "#3b82f6",
    dark: "#1d4ed8",
    contrastText: "#ffffff",
  },
  secondary: {
    main: "#7c3aed",
    light: "#8b5cf6",
    dark: "#6d28d9",
    contrastText: "#ffffff",
  },
  success: {
    main: "#10b981",
    light: "#34d399",
    dark: "#059669",
    contrastText: "#ffffff",
  },
  warning: {
    main: "#f59e0b",
    light: "#fbbf24",
    dark: "#d97706",
    contrastText: "#ffffff",
  },
  error: {
    main: "#ef4444",
    light: "#f87171",
    dark: "#dc2626",
    contrastText: "#ffffff",
  },
  info: {
    main: "#06b6d4",
    light: "#22d3ee",
    dark: "#0891b2",
    contrastText: "#ffffff",
  },
};

// Get design tokens based on mode
const getDesignTokens = (mode: PaletteMode) => ({
  palette: {
    mode,
    ...colors,
    background: {
      default: mode === "light" ? "#f8fafc" : "#0f172a",
      paper: mode === "light" ? "#ffffff" : "#1e293b",
    },
    text: {
      primary: mode === "light" ? "#0f172a" : "#f1f5f9",
      secondary: mode === "light" ? "#475569" : "#94a3b8",
    },
    divider: mode === "light" ? "#e2e8f0" : "#334155",
    action: {
      hover: mode === "light" ? alpha("#2563eb", 0.04) : alpha("#3b82f6", 0.08),
      selected: mode === "light" ? alpha("#2563eb", 0.08) : alpha("#3b82f6", 0.16),
    },
  },
});

// Create theme function that accepts mode
export const getTheme = (mode: PaletteMode) =>
  createTheme({
    ...getDesignTokens(mode),
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      h1: {
        fontSize: "clamp(1.875rem, 4vw, 2.5rem)",
        fontWeight: 700,
        letterSpacing: "-0.02em",
        lineHeight: 1.2,
      },
      h2: {
        fontSize: "clamp(1.5rem, 3vw, 2rem)",
        fontWeight: 700,
        letterSpacing: "-0.01em",
        lineHeight: 1.3,
      },
      h3: {
        fontSize: "clamp(1.25rem, 2.5vw, 1.75rem)",
        fontWeight: 600,
        letterSpacing: "-0.01em",
        lineHeight: 1.3,
      },
      h4: {
        fontSize: "clamp(1.125rem, 2vw, 1.5rem)",
        fontWeight: 600,
        lineHeight: 1.4,
      },
      h5: {
        fontSize: "clamp(1rem, 1.5vw, 1.25rem)",
        fontWeight: 600,
        lineHeight: 1.4,
      },
      h6: {
        fontSize: "clamp(0.875rem, 1.25vw, 1rem)",
        fontWeight: 600,
        lineHeight: 1.5,
      },
      body1: {
        fontSize: "0.9375rem",
        lineHeight: 1.6,
      },
      body2: {
        fontSize: "0.875rem",
        lineHeight: 1.5,
      },
      button: {
        textTransform: "none" as const,
        fontWeight: 500,
      },
    },
    shape: {
      borderRadius: 10,
    },
    shadows: [
      "none",
      "0 1px 2px 0 rgb(0 0 0 / 0.05)",
      "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
      "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
      "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
      "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
      "0 25px 50px -12px rgb(0 0 0 / 0.25)",
      ...Array(18).fill("0 25px 50px -12px rgb(0 0 0 / 0.25)"),
    ] as any,
    transitions: {
      duration: {
        shortest: 150,
        shorter: 200,
        short: 250,
        standard: 300,
        complex: 375,
        enteringScreen: 225,
        leavingScreen: 195,
      },
      easing: {
        easeInOut: "cubic-bezier(0.4, 0, 0.2, 1)",
        easeOut: "cubic-bezier(0.0, 0, 0.2, 1)",
        easeIn: "cubic-bezier(0.4, 0, 1, 1)",
        sharp: "cubic-bezier(0.4, 0, 0.6, 1)",
      },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            scrollbarWidth: "thin",
            "&::-webkit-scrollbar": {
              width: "8px",
              height: "8px",
            },
            "&::-webkit-scrollbar-track": {
              background: "transparent",
            },
            "&::-webkit-scrollbar-thumb": {
              background: mode === "light" ? "#cbd5e1" : "#475569",
              borderRadius: "4px",
            },
            "&::-webkit-scrollbar-thumb:hover": {
              background: mode === "light" ? "#94a3b8" : "#64748b",
            },
          },
        },
      },
      MuiButton: {
        defaultProps: {
          disableElevation: true,
        },
        styleOverrides: {
          root: {
            borderRadius: 8,
            padding: "8px 16px",
            fontWeight: 500,
            transition: "all 0.2s ease-in-out",
            "&:hover": {
              transform: "translateY(-1px)",
            },
            "&:active": {
              transform: "translateY(0)",
            },
          },
          contained: {
            boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
            "&:hover": {
              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
            },
          },
          outlined: {
            borderWidth: "1.5px",
            "&:hover": {
              borderWidth: "1.5px",
            },
          },
        },
      },
      MuiCard: {
        defaultProps: {
          elevation: 0,
        },
        styleOverrides: {
          root: {
            borderRadius: 12,
            border: `1px solid ${mode === "light" ? "#e2e8f0" : "#334155"}`,
            backgroundImage: "none",
            transition: "all 0.2s ease-in-out",
            "&:hover": {
              borderColor: mode === "light" ? "#cbd5e1" : "#475569",
            },
          },
        },
      },
      MuiPaper: {
        defaultProps: {
          elevation: 0,
        },
        styleOverrides: {
          root: {
            backgroundImage: "none",
            borderRadius: 12,
          },
          outlined: {
            borderColor: mode === "light" ? "#e2e8f0" : "#334155",
          },
        },
      },
      MuiTextField: {
        defaultProps: {
          size: "small",
        },
        styleOverrides: {
          root: {
            "& .MuiOutlinedInput-root": {
              borderRadius: 8,
              transition: "all 0.2s ease-in-out",
              "&:hover .MuiOutlinedInput-notchedOutline": {
                borderColor: colors.primary.main,
              },
              "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                borderWidth: "2px",
              },
            },
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 8,
          },
          notchedOutline: {
            borderColor: mode === "light" ? "#e2e8f0" : "#334155",
            transition: "border-color 0.2s ease-in-out",
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: 16,
            boxShadow: "0 25px 50px -12px rgb(0 0 0 / 0.25)",
          },
        },
      },
      MuiDialogTitle: {
        styleOverrides: {
          root: {
            fontSize: "1.25rem",
            fontWeight: 600,
            padding: "20px 24px 16px",
          },
        },
      },
      MuiDialogContent: {
        styleOverrides: {
          root: {
            padding: "16px 24px",
          },
        },
      },
      MuiDialogActions: {
        styleOverrides: {
          root: {
            padding: "16px 24px 20px",
            gap: 8,
          },
        },
      },
      MuiTableHead: {
        styleOverrides: {
          root: {
            "& .MuiTableCell-head": {
              backgroundColor: mode === "light" ? "#f8fafc" : "#1e293b",
              fontWeight: 600,
              color: mode === "light" ? "#475569" : "#94a3b8",
              borderBottom: `1px solid ${mode === "light" ? "#e2e8f0" : "#334155"}`,
            },
          },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: {
            transition: "background-color 0.15s ease-in-out",
            "&:hover": {
              backgroundColor: mode === "light" ? "#f8fafc" : alpha("#3b82f6", 0.04),
            },
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            borderBottom: `1px solid ${mode === "light" ? "#f1f5f9" : "#1e293b"}`,
            padding: "12px 16px",
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            fontWeight: 500,
            borderRadius: 6,
          },
          filled: {
            "&.MuiChip-colorSuccess": {
              backgroundColor: alpha(colors.success.main, 0.1),
              color: colors.success.dark,
            },
            "&.MuiChip-colorError": {
              backgroundColor: alpha(colors.error.main, 0.1),
              color: colors.error.dark,
            },
            "&.MuiChip-colorWarning": {
              backgroundColor: alpha(colors.warning.main, 0.1),
              color: colors.warning.dark,
            },
            "&.MuiChip-colorInfo": {
              backgroundColor: alpha(colors.info.main, 0.1),
              color: colors.info.dark,
            },
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            backgroundColor: mode === "light" ? "#1e293b" : "#f1f5f9",
            color: mode === "light" ? "#f1f5f9" : "#1e293b",
            fontSize: "0.75rem",
            fontWeight: 500,
            borderRadius: 6,
            padding: "6px 10px",
          },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: {
            borderRadius: 10,
          },
          standardSuccess: {
            backgroundColor: alpha(colors.success.main, 0.1),
            color: colors.success.dark,
          },
          standardError: {
            backgroundColor: alpha(colors.error.main, 0.1),
            color: colors.error.dark,
          },
          standardWarning: {
            backgroundColor: alpha(colors.warning.main, 0.1),
            color: colors.warning.dark,
          },
          standardInfo: {
            backgroundColor: alpha(colors.info.main, 0.1),
            color: colors.info.dark,
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            margin: "2px 8px",
            transition: "all 0.15s ease-in-out",
            "&.Mui-selected": {
              backgroundColor: colors.primary.main,
              color: "#ffffff",
              "&:hover": {
                backgroundColor: colors.primary.dark,
              },
              "& .MuiListItemIcon-root": {
                color: "#ffffff",
              },
            },
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            borderRight: `1px solid ${mode === "light" ? "#e2e8f0" : "#334155"}`,
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: mode === "light" ? "#ffffff" : "#1e293b",
            color: mode === "light" ? "#0f172a" : "#f1f5f9",
            boxShadow: "none",
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            transition: "all 0.15s ease-in-out",
          },
        },
      },
      MuiSelect: {
        styleOverrides: {
          root: {
            borderRadius: 8,
          },
        },
      },
      MuiMenu: {
        styleOverrides: {
          paper: {
            borderRadius: 10,
            boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
            border: `1px solid ${mode === "light" ? "#e2e8f0" : "#334155"}`,
          },
        },
      },
      MuiMenuItem: {
        styleOverrides: {
          root: {
            borderRadius: 6,
            margin: "2px 6px",
            padding: "8px 12px",
            "&:hover": {
              backgroundColor: mode === "light" ? "#f1f5f9" : alpha("#3b82f6", 0.08),
            },
          },
        },
      },
      MuiDivider: {
        styleOverrides: {
          root: {
            borderColor: mode === "light" ? "#e2e8f0" : "#334155",
          },
        },
      },
      MuiSkeleton: {
        styleOverrides: {
          root: {
            backgroundColor: mode === "light" ? "#e2e8f0" : "#334155",
          },
        },
      },
      MuiLinearProgress: {
        styleOverrides: {
          root: {
            borderRadius: 4,
            backgroundColor: mode === "light" ? "#e2e8f0" : "#334155",
          },
        },
      },
      MuiAvatar: {
        styleOverrides: {
          root: {
            backgroundColor: colors.primary.main,
            fontWeight: 600,
          },
        },
      },
      MuiTabs: {
        styleOverrides: {
          indicator: {
            borderRadius: 4,
            height: 3,
          },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            textTransform: "none",
            fontWeight: 500,
            minHeight: 48,
          },
        },
      },
      MuiToggleButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            textTransform: "none",
            fontWeight: 500,
            "&.Mui-selected": {
              backgroundColor: colors.primary.main,
              color: "#ffffff",
              "&:hover": {
                backgroundColor: colors.primary.dark,
              },
            },
          },
        },
      },
      MuiToggleButtonGroup: {
        styleOverrides: {
          root: {
            backgroundColor: mode === "light" ? "#f1f5f9" : "#1e293b",
            padding: 4,
            borderRadius: 10,
            gap: 4,
          },
          grouped: {
            border: "none",
            borderRadius: "6px !important",
            "&:not(:first-of-type)": {
              marginLeft: 0,
            },
          },
        },
      },
      MuiTablePagination: {
        styleOverrides: {
          root: {
            borderTop: `1px solid ${mode === "light" ? "#e2e8f0" : "#334155"}`,
          },
          selectLabel: {
            marginBottom: 0,
          },
          displayedRows: {
            marginBottom: 0,
          },
        },
      },
    },
  });

// Default light theme for backward compatibility
export const theme = getTheme("light");
