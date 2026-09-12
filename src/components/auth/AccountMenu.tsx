import { useState, type ReactElement } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Button,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Menu,
  MenuItem,
  Stack,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import { Login, Logout, PersonAdd } from "@mui/icons-material";
import { AccountAvatar } from "./AccountAvatar";
import { useAccountActions, useMe, useSession } from "../../api/useAuth";
import { usePlatform } from "../../hooks/usePlatform";

/**
 * Entrada da conta no header. Deslogado: leva ao login. Logado: mostra quem é,
 * o que o backend diz sobre a conta (admin, vínculo, papéis por jogo) e permite
 * trocar entre as contas salvas — o atalho para testar permissões.
 */
export function AccountMenu() {
  const theme = useTheme();
  const { spacing } = theme.designTokens;
  const location = useLocation();
  const navigate = useNavigate();
  const { isMobile } = usePlatform();
  const { activeUsername, accounts } = useSession();
  const me = useMe();
  const { switchTo, signOut } = useAccountActions();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  const returnState = { from: location.pathname };

  if (!activeUsername) {
    return isMobile ? (
      <Tooltip title="Entrar">
        <IconButton component={Link} to="/login" state={returnState} color="inherit">
          <Login />
        </IconButton>
      </Tooltip>
    ) : (
      <Button component={Link} to="/login" state={returnState} startIcon={<Login />} sx={{ textTransform: "none" }}>
        Entrar
      </Button>
    );
  }

  const close = () => setAnchor(null);
  const displayName = me.data?.displayName ?? activeUsername;
  const otherAccounts = accounts.filter((account) => account.username !== activeUsername);

  const items: ReactElement[] = [
    <Stack key="identity" spacing={spacing.fieldGap} sx={{ px: 2, py: 1.5, minWidth: 260 }}>
      <Typography variant="body1" sx={{ fontWeight: 700 }}>
        {displayName}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        @{activeUsername}
      </Typography>

      {me.isPending && <CircularProgress size={14} />}
      {me.error && (
        <Typography variant="caption" color="error">
          {me.error.message}
        </Typography>
      )}
      {me.data && (
        <Stack direction="row" spacing={spacing.fieldGap} useFlexGap sx={{ flexWrap: "wrap", pt: spacing.fieldGap }}>
          {me.data.platformAdmin && <Chip size="small" color="primary" label="Admin da plataforma" />}
          <Chip
            size="small"
            variant="outlined"
            color={me.data.verified ? "success" : "default"}
            label={me.data.verified ? "Com vínculo" : "Sem vínculo"}
          />
          {me.data.status === "suspended" && <Chip size="small" color="error" label="Suspensa" />}
          {Object.entries(me.data.roles).map(([gameId, role]) => (
            <Chip key={gameId} size="small" variant="outlined" label={`${gameId}: ${role}`} />
          ))}
        </Stack>
      )}
    </Stack>,
    <Divider key="identity-divider" />,
  ];

  if (otherAccounts.length > 0) {
    items.push(<ListSubheader key="switch-header">Trocar de conta</ListSubheader>);
    otherAccounts.forEach((account) =>
      items.push(
        <MenuItem
          key={`switch-${account.username}`}
          onClick={() => {
            close();
            switchTo(account.username);
          }}
        >
          <ListItemIcon>
            <AccountAvatar name={account.username} size={24} />
          </ListItemIcon>
          <ListItemText primary={account.username} />
        </MenuItem>,
      ),
    );
    items.push(<Divider key="switch-divider" />);
  }

  items.push(
    <MenuItem
      key="add-account"
      onClick={() => {
        close();
        navigate("/login", { state: returnState });
      }}
    >
      <ListItemIcon>
        <PersonAdd fontSize="small" />
      </ListItemIcon>
      <ListItemText primary="Adicionar outra conta" />
    </MenuItem>,
    <MenuItem
      key="sign-out"
      onClick={() => {
        close();
        signOut(activeUsername);
      }}
    >
      <ListItemIcon>
        <Logout fontSize="small" />
      </ListItemIcon>
      <ListItemText primary="Sair desta conta" />
    </MenuItem>,
  );

  return (
    <>
      <Tooltip title={`Conta: ${activeUsername}`}>
        <IconButton onClick={(event) => setAnchor(event.currentTarget)} sx={{ ml: 1 }}>
          <AccountAvatar name={displayName} />
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchor}
        open={anchor !== null}
        onClose={close}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        {items}
      </Menu>
    </>
  );
}
