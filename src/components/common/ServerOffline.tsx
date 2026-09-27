import { useCallback, useEffect, useRef, useState } from "react";
import { Box, Button, CircularProgress, LinearProgress, Stack, Typography, keyframes } from "@mui/material";
import { Dns, LinkOff, Laptop, Refresh, WifiOff } from "@mui/icons-material";
import { apiRequest } from "../../api/http";
import { theme } from "../../theme/theme";

/**
 * Espera antes da próxima tentativa automática: dobra a cada tentativa que falha (5s, 10s, 20s...)
 * até o teto, para não ficar batendo num servidor que está fora há tempo.
 */
const FIRST_RETRY_SECONDS = 5;
const MAX_RETRY_SECONDS = 120;

function retryDelay(attempts: number): number {
  return Math.min(FIRST_RETRY_SECONDS * 2 ** attempts, MAX_RETRY_SECONDS);
}

const pulse = keyframes`
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.15); opacity: 0.6; }
`;

const flow = keyframes`
  from { background-position: 0 0; }
  to { background-position: 24px 0; }
`;

const float = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
`;

/** "45s" ou, a partir de um minuto, "1min 30s". */
function formatSeconds(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const rest = seconds % 60;
  return `${Math.floor(seconds / 60)}min${rest ? ` ${rest}s` : ""}`;
}

/** Um dos lados da ilustração: o aparelho do usuário ou o servidor. */
function Node({ icon, label, delay = 0 }: { icon: React.ReactNode; label: string; delay?: number }) {
  return (
    <Stack alignItems="center" spacing={1}>
      <Box
        sx={{
          width: 72,
          height: 72,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: 1,
          borderColor: "divider",
          bgcolor: "rgba(255, 255, 255, 0.04)",
          color: "text.secondary",
          animation: `${float} 3s ease-in-out ${delay}s infinite`,
          "& svg": { fontSize: 36 },
        }}
      >
        {icon}
      </Box>
      <Typography variant="caption" color="text.disabled">
        {label}
      </Typography>
    </Stack>
  );
}

/** A ligação entre os dois lados, tracejada e cortada no meio. */
function BrokenLink() {
  const dashes = {
    flex: 1,
    height: 2,
    backgroundImage: `linear-gradient(90deg, ${theme.palette.divider} 50%, transparent 50%)`,
    backgroundSize: "12px 2px",
    animation: `${flow} 1.2s linear infinite`,
  };
  return (
    <Stack direction="row" alignItems="center" sx={{ flex: 1, minWidth: 80, mb: 3.5 }}>
      <Box sx={dashes} />
      <Box
        sx={{
          mx: 1,
          width: 36,
          height: 36,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "rgba(255, 68, 0, 0.12)",
          color: "primary.main",
          animation: `${pulse} 2s ease-in-out infinite`,
        }}
      >
        <LinkOff fontSize="small" />
      </Box>
      <Box sx={dashes} />
    </Stack>
  );
}

/**
 * Página do conteúdo enquanto o backend não responde. Tenta reconectar sozinha; quando o servidor
 * volta, o MainLayout mostra de novo a tela que estava aberta.
 */
export function ServerOffline() {
  const [checking, setChecking] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [delay, setDelay] = useState(retryDelay(0));
  const [countdown, setCountdown] = useState(delay);
  // A contagem também num ref: a tentativa automática roda num efeito e não pode ler um valor velho.
  const attemptsRef = useRef(0);

  const probe = useCallback(async () => {
    setChecking(true);
    try {
      // Rota pública e leve; qualquer resposta já marca o servidor como online.
      await apiRequest("/games", { authenticated: false });
    } catch {
      // Continua fora: o cliente HTTP já manteve o status.
    } finally {
      attemptsRef.current += 1;
      const next = retryDelay(attemptsRef.current);
      setAttempts(attemptsRef.current);
      setDelay(next);
      setCountdown(next);
      setChecking(false);
    }
  }, []);

  // Contagem até a próxima tentativa automática.
  useEffect(() => {
    const timer = setInterval(() => setCountdown((value) => Math.max(0, value - 1)), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (countdown === 0 && !checking) void probe();
  }, [countdown, checking, probe]);

  const noInternet = !navigator.onLine;

  return (
    <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", p: 2 }}>
      <Stack
        role="status"
        aria-live="polite"
        spacing={3}
        alignItems="center"
        sx={{
          width: "100%",
          maxWidth: 480,
          textAlign: "center",
          p: { xs: 3, sm: 4 },
          borderRadius: 2,
          border: 1,
          borderColor: "divider",
          bgcolor: theme.designTokens.colors.glassBg,
          backdropFilter: theme.designTokens.colors.glassFilter,
        }}
      >
        <Stack direction="row" alignItems="center" sx={{ width: "100%", maxWidth: 340 }}>
          <Node icon={noInternet ? <WifiOff /> : <Laptop />} label="Você" />
          <BrokenLink />
          <Node icon={<Dns />} label="Servidor" delay={1.5} />
        </Stack>

        <Stack spacing={1}>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            {noInternet ? "Parece que você está sem internet" : "O servidor está descansando um pouquinho"}
          </Typography>
          <Typography color="text.secondary">
            {noInternet
              ? "Confira sua conexão. Assim que ela voltar, a página continua de onde parou."
              : "Não conseguimos falar com o Game Planner agora. Pode ser uma manutenção rápida; assim que ele voltar, a página continua de onde parou."}
          </Typography>
        </Stack>

        <Stack spacing={1} sx={{ width: "100%", maxWidth: 280 }}>
          <LinearProgress
            variant={checking ? "indeterminate" : "determinate"}
            value={((delay - countdown) / delay) * 100}
            sx={{ height: 4, borderRadius: 2 }}
          />
          <Typography variant="caption" color="text.disabled">
            {checking
              ? "Tentando reconectar..."
              : `Nova tentativa em ${formatSeconds(countdown)}${attempts > 0 ? ` · ${attempts} ${attempts === 1 ? "tentativa" : "tentativas"}` : ""}`}
          </Typography>
        </Stack>

        <Button
          variant="contained"
          startIcon={checking ? <CircularProgress size={18} color="inherit" /> : <Refresh />}
          disabled={checking}
          onClick={() => void probe()}
        >
          {checking ? "Verificando..." : "Tentar agora"}
        </Button>
      </Stack>
    </Box>
  );
}
