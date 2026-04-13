import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Typography,
  useTheme,
  type DialogProps,
} from "@mui/material";
import { Close } from "@mui/icons-material";
import { type ReactNode } from "react";

interface StyledDialogProps extends Omit<DialogProps, 'title'> {
  title: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
  onClose: () => void;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false;
  fullWidth?: boolean;
}

export function StyledDialog({
  open,
  onClose,
  title,
  children,
  actions,
  maxWidth = 'sm',
  fullWidth = true,
  ...props
}: StyledDialogProps) {
  const theme = useTheme();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={maxWidth}
      fullWidth={fullWidth}
      PaperProps={{
        sx: {
          backgroundColor: theme.designTokens.colors.glassBg,
          backdropFilter: 'blur(10px)',
          border: '1px solid',
          borderColor: theme.designTokens.colors.glassBorder,
          borderRadius: 2,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }
      }}
      {...props}
    >
      <DialogTitle sx={{ 
        m: 0, 
        p: 2, 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        borderBottom: '1px solid',
        borderColor: 'divider'
      }}>
        <Typography variant="h6" component="div" sx={{ color: 'primary.main', fontWeight: 800 }}>
          {title}
        </Typography>
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            color: (theme) => theme.palette.grey[500],
            '&:hover': {
              color: 'primary.main',
            },
          }}
        >
          <Close />
        </IconButton>
      </DialogTitle>
      
      <DialogContent sx={{ p: 3, pt: '24px !important' }}>
        {children}
      </DialogContent>

      {actions && (
        <DialogActions sx={{ 
          p: 2, 
          px: 3, 
          borderTop: '1px solid', 
          borderColor: 'divider',
          gap: 1
        }}>
          {actions}
        </DialogActions>
      )}
    </Dialog>
  );
}
