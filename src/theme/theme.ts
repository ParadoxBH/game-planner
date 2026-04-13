import { createTheme } from "@mui/material";

// Declaração de tipos para tokens customizados no tema do MUI
declare module "@mui/material/styles" {
  interface Theme {
    designTokens: {
      spacing: {
        fieldGap: number;        // Espaço entre label e valor
        sectionGap: number;      // Espaço entre seções (blocos)
        itemGap: number;         // Espaço entre itens de uma lista (mesmo contexto)
        contentGap: number;      // Espaço entre blocos de conteúdo diferente
        cardPadding: number;     // Preenchimento interno de cards
      };
      colors: {
        fieldLabel: string;
        fieldValue: string;
        glassBg: string;
        glassBorder: string;
      };
      borderRadius: number;
    };
  }
  interface Palette {
    header: string;
  }
  interface PaletteOptions {
    header?: string;
  }
  interface ThemeOptions {
    designTokens?: {
      spacing?: {
        fieldGap?: number;
        sectionGap?: number;
        itemGap?: number;
        contentGap?: number;
        cardPadding?: number;
      };
      colors?: {
        fieldLabel?: string;
        fieldValue?: string;
        glassBg?: string;
        glassBorder?: string;
      };
      borderRadius?: number;
    };
  }
}

export const theme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#ff4400",
      light: "#ff6a33",
      dark: "#cc3600",
    },
    background: {
      default: "#0b0b0b",
      paper: "#0d0d0d",
    },
    divider: "rgba(255, 255, 255, 0.1)",
    header: "#1a1a1a",
  },
  shape: {
    borderRadius: 8,
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 800,
      letterSpacing: "-0.5px",
    },
    h6: {
      fontWeight: 700,
    },
    subtitle2: {
      fontWeight: 700,
      letterSpacing: "0.5px",
      fontSize: "0.75rem",
    },
    caption: {
      lineHeight: 1.5,
    },
  },
  designTokens: {
    spacing: {
      fieldGap: 0.5,     // Equivale a theme.spacing(0.5)
      sectionGap: 3,     // Equivale a theme.spacing(3)
      itemGap: 1,        // Equivale a theme.spacing(1) - mesmo contexto
      contentGap: 2,     // Equivale a theme.spacing(2) - blocos diferentes
      cardPadding: 3,    // Equivale a theme.spacing(3)
    },
    colors: {
      fieldLabel: "rgba(255, 255, 255, 0.5)",
      fieldValue: "#ffffff",
      glassBg: "rgba(11, 11, 11, 0.8)",
      glassBorder: "rgba(255, 255, 255, 0.1)",
    },
    borderRadius: 1,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: "#0b0b0b",
          overflow: "hidden",
          scrollbarWidth: "thin",
          "&::-webkit-scrollbar": {
            width: "6px",
          },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: "rgba(255, 255, 255, 0.1)",
            borderRadius: "10px",
          },
        },
        // Leaflet Popup Styling
        ".leaflet-popup-content-wrapper": {
          backgroundColor: "#0d0d0d !important",
          color: "#ffffff !important",
          borderRadius: "8px !important",
          border: "1px solid rgba(255, 255, 255, 0.1) !important",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5) !important",
          padding: "0 !important",
        },
        ".leaflet-popup-content": {
          margin: "12px !important",
          minWidth: "220px !important",
        },
        ".leaflet-popup-tip": {
          backgroundColor: "#0d0d0d !important",
          border: "1px solid rgba(255, 255, 255, 0.1) !important",
        },
        ".leaflet-popup-close-button": {
          color: "rgba(255, 255, 255, 0.5) !important",
          padding: "8px 8px 0 0 !important",
          "&:hover": {
            color: "#ff4400 !important",
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          backgroundColor: "#0d0d0d",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: 8, // Mantendo 8px como padrão para RADIUS 1 (theme.spacing(1))
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 700,
          borderRadius: 8, // RADIUS 1
        },
        containedPrimary: {
          boxShadow: "none",
          "&:hover": {
            boxShadow: "0 4px 12px rgba(255, 68, 0, 0.4)",
          },
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: "rgba(255, 255, 255, 0.1)",
        },
      },
    },
    MuiTooltip: {
      defaultProps: {
        disableInteractive: true,
      },
      styleOverrides: {
        tooltip: {
          backgroundColor: "#1a1a1a",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          backdropFilter: "blur(4px)",
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          minHeight: 40,
        },
        indicator: {
          height: 3,
          borderRadius: "3px 3px 0 0",
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          minHeight: 40,
          minWidth: 0,
          padding: "6px 16px",
          textTransform: "none",
          fontWeight: 700,
          fontSize: "0.875rem",
          outline: "none",
          "&:focus": {
            outline: "none",
          },
          "&.Mui-focusVisible": {
            backgroundColor: "rgba(255, 255, 255, 0.05)",
          },
          "&.Mui-selected": {
            color: "#ff4400",
          },
        },
      },
    },
  },
});
