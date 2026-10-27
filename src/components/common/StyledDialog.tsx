import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Typography,
  useTheme,
  type DialogProps,
  Stack,
} from "@mui/material";
import { Close } from "@mui/icons-material";
import { type ReactNode } from "react";

interface StyledDialogProps extends Omit<DialogProps, "title"> {
  title: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
  startIcon?: ReactNode;
  subTitle?: ReactNode;
  headerActions?: ReactNode;
  onClose: () => void;
  maxWidth?: "xs" | "sm" | "md" | "lg" | "xl" | false;
  fullWidth?: boolean;
  /** Só fecha pelo X ou por uma ação: clicar fora e Esc não fecham. Para formulários, que perderiam o que foi digitado. */
  modal?: boolean;
}

export function StyledDialog({
  open,
  onClose,
  title,
  children,
  actions,
  startIcon,
  subTitle,
  headerActions,
  maxWidth = "sm",
  fullWidth = true,
  modal = false,
  ...props
}: StyledDialogProps) {
  const theme = useTheme();

  return (
    <Dialog
      open={open}
      onClose={(_, reason) => {
        if (modal && (reason === "backdropClick" || reason === "escapeKeyDown"))
          return;
        onClose();
      }}
      maxWidth={maxWidth}
      fullWidth={fullWidth}
      PaperProps={{
        sx: {
          backgroundColor: theme.designTokens.colors.glassBg,
          backdropFilter: "blur(10px)",
          // Em tela cheia, a janela encosta nas bordas: sem canto arredondado nem borda.
          border: props.fullScreen ? "none" : "1px solid",
          borderColor: theme.designTokens.colors.glassBorder,
          borderRadius: props.fullScreen ? 0 : 2,
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        },
      }}
      {...props}
    >
      <DialogTitle
        sx={{
          m: 0,
          p: 2,
          py: 1,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <Stack
          direction={"row"}
          alignItems={"center"}
          spacing={1}
          justifyContent={"space-between"}
          flex={1}
        >
          <Stack direction={"row"} alignItems={"center"} spacing={1}>
            {startIcon}
            <Typography variant="h6" sx={{ color: "primary.main" }}>
              {title}
            </Typography>
            {subTitle}
          </Stack>
          <Stack direction={"row"} alignItems={"center"} spacing={1}>
            {headerActions}
            <IconButton
              aria-label="close"
              onClick={onClose}
              sx={{
                color: (theme) => theme.palette.grey[500],
                "&:hover": {
                  color: "primary.main",
                },
              }}
            >
              <Close />
            </IconButton>
          </Stack>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ p: 3, pt: "24px !important" }}>
        {children}
      </DialogContent>

      {actions && (
        <DialogActions
          sx={{
            p: 2,
            px: 3,
            borderTop: "1px solid",
            borderColor: "divider",
            gap: 1,
          }}
        >
          {actions}
        </DialogActions>
      )}
    </Dialog>
  );
}
