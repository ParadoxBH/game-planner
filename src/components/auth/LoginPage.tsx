import { useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Alert,
  Button,
  CircularProgress,
  List,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
  useTheme,
} from "@mui/material";
import { StyledContainer } from "../common/StyledContainer";
import { AccountAvatar } from "./AccountAvatar";
import { ApiError } from "../../api/ApiError";
import { useAccountActions, useLogin, useRegister, useSession } from "../../api/useAuth";

type Mode = "login" | "register";

/**
 * Entrar, criar conta, ou voltar a uma conta já salva neste navegador.
 * Depois de autenticar, retorna para a página de onde o usuário veio.
 */
export function LoginPage() {
  const theme = useTheme();
  const { spacing } = theme.designTokens;
  const navigate = useNavigate();
  const location = useLocation();
  const returnPath = readReturnPath(location.state);

  const { activeUsername, accounts } = useSession();
  const { switchTo } = useAccountActions();
  const login = useLogin();
  const register = useRegister();

  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");

  const current = mode === "login" ? login : register;
  const apiError = current.error instanceof ApiError ? current.error : null;
  const hasFieldErrors = apiError !== null && Object.keys(apiError.fields).length > 0;

  const goBack = () => navigate(returnPath, { replace: true });

  const changeMode = (next: Mode) => {
    setMode(next);
    login.reset();
    register.reset();
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (mode === "login") {
      login.mutate({ username, password }, { onSuccess: goBack });
    } else {
      register.mutate({ username, password, displayName }, { onSuccess: goBack });
    }
  };

  const enterSavedAccount = (savedUsername: string) => {
    switchTo(savedUsername);
    goBack();
  };

  return (
    <StyledContainer title="Conta" label="Entre com sua conta, crie uma nova ou volte a uma conta salva.">
      <Stack alignItems="center" sx={{ py: spacing.contentGap }}>
        <Stack spacing={spacing.sectionGap} sx={{ width: "100%", maxWidth: 420 }}>
          <Paper sx={{ p: spacing.cardPadding }}>
            <form onSubmit={handleSubmit}>
              <Stack spacing={spacing.contentGap}>
                <Tabs value={mode} onChange={(_event, next: Mode) => changeMode(next)} variant="fullWidth">
                  <Tab value="login" label="Entrar" sx={{ textTransform: "none" }} />
                  <Tab value="register" label="Criar conta" sx={{ textTransform: "none" }} />
                </Tabs>

                {apiError && !hasFieldErrors && <Alert severity="error">{apiError.message}</Alert>}
                {current.error && !apiError && <Alert severity="error">{current.error.message}</Alert>}

                <TextField
                  label="Usuário"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  autoComplete="username"
                  autoFocus
                  fullWidth
                  error={Boolean(apiError?.fields.username)}
                  helperText={
                    apiError?.fields.username ??
                    (mode === "register" ? "3 a 32 caracteres: letras, números, ponto, hífen ou sublinhado" : undefined)
                  }
                />

                {mode === "register" && (
                  <TextField
                    label="Nome de exibição (opcional)"
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    fullWidth
                    error={Boolean(apiError?.fields.displayName)}
                    helperText={apiError?.fields.displayName}
                  />
                )}

                <TextField
                  label="Senha"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  fullWidth
                  error={Boolean(apiError?.fields.password)}
                  helperText={apiError?.fields.password ?? (mode === "register" ? "Mínimo de 10 caracteres" : undefined)}
                />

                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={current.isPending || !username || !password}
                  startIcon={current.isPending ? <CircularProgress size={16} color="inherit" /> : undefined}
                  sx={{ textTransform: "none" }}
                >
                  {mode === "login" ? "Entrar" : "Criar conta e entrar"}
                </Button>
              </Stack>
            </form>
          </Paper>

          {accounts.length > 0 && (
            <Stack spacing={spacing.itemGap}>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700 }}>
                Contas salvas neste navegador
              </Typography>
              <Paper>
                <List disablePadding>
                  {accounts.map((account) => {
                    const isActive = account.username === activeUsername;
                    return (
                      <ListItemButton
                        key={account.username}
                        selected={isActive}
                        onClick={() => enterSavedAccount(account.username)}
                      >
                        <ListItemAvatar>
                          <AccountAvatar name={account.username} />
                        </ListItemAvatar>
                        <ListItemText
                          primary={account.username}
                          secondary={isActive ? "Conta ativa" : "Entrar sem digitar a senha"}
                        />
                      </ListItemButton>
                    );
                  })}
                </List>
              </Paper>
            </Stack>
          )}
        </Stack>
      </Stack>
    </StyledContainer>
  );
}

function readReturnPath(state: unknown): string {
  const from = (state as { from?: unknown } | null)?.from;
  return typeof from === "string" && from !== "/login" ? from : "/";
}
