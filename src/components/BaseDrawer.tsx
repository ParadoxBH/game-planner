import {
  Box,
  Typography,
  IconButton,
  Divider,
  Stack,
  Button,
  Tooltip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import type { ReactNode } from "react";
import { theme } from "../theme/theme";

interface BaseDrawerProps {
  title: string;
  onClose: () => void;
  onViewDetails?: () => void;
  onPop?: () => void;
  showBackButton?: boolean;
  children: ReactNode;
  footerActions?: ReactNode;
}

export const BaseDrawer = ({
  title,
  onClose,
  onViewDetails,
  onPop,
  showBackButton,
  children,
  footerActions,
}: BaseDrawerProps) => {
  return (
    <Box
      sx={{
        position: "absolute",
        top: 0,
        right: 0,
        width: 380,
        height: "100%",
        zIndex: 1300,
        backgroundColor: theme.designTokens.colors.glassBg,
        backdropFilter: theme.designTokens.colors.glassFilter,
        borderLeft: 1,
        borderColor: "divider",
        display: "flex",
        flexDirection: "column",
        color: "text.primary",
        boxShadow: "-8px 0 32px rgba(0,0,0,0.5)",
        animation: "slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        "@keyframes slideIn": {
          from: { transform: "translateX(100%)" },
          to: { transform: "translateX(0)" },
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          bgcolor: "rgba(255,255,255,0.02)",
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          {showBackButton && onPop && (
            <Tooltip title="Voltar">
              <IconButton
                onClick={onPop}
                size="small"
                sx={{ color: "primary.main", mr: 1 }}
              >
                <ArrowBackIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          <Typography variant="h6" sx={{ fontSize: "1.1rem" }}>
            {title}
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center">
          {onViewDetails && (
            <Tooltip title="Ver Detalhes">
              <IconButton
                onClick={onViewDetails}
                size="small"
                sx={{ color: "primary.main" }}
              >
                <OpenInNewIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          <IconButton
            onClick={onClose}
            size="small"
            sx={{ color: "text.secondary" }}
          >
            <CloseIcon />
          </IconButton>
        </Stack>
      </Box>

      <Divider />

      {/* Content */}
      <Box sx={{ p: 3, flexGrow: 1, overflowY: "auto" }}>
        {children}
      </Box>

      {/* Footer Navigation */}
      <Box
        sx={{
          p: 2,
          borderTop: 1,
          borderColor: "divider",
          bgcolor: "rgba(255,255,255,0.01)",
        }}
      >
        <Stack direction="row" spacing={1}>
          {footerActions || (
            <>
              {showBackButton && onPop && (
                <Button
                  fullWidth
                  variant="outlined"
                  size="small"
                  startIcon={<ArrowBackIcon />}
                  onClick={onPop}
                  sx={{ borderColor: "divider", color: "text.secondary" }}
                >
                  Voltar
                </Button>
              )}
              <Button fullWidth variant="contained" size="small" onClick={onClose}>
                Fechar Tudo
              </Button>
            </>
          )}
        </Stack>
      </Box>
    </Box>
  );
};
