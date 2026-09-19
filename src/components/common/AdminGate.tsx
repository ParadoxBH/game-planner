import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Alert, Button, CircularProgress, Stack } from "@mui/material";
import { useGameAdmin } from "../../hooks/useGameAdmin";
import { StyledContainer } from "./StyledContainer";

interface AdminGateProps {
  gameId: string;
  title: string;
  /** Rota da tela, para voltar a ela depois de entrar. */
  from: string;
  /** Só owner do jogo ou platform_admin, e não moderador. */
  ownerOnly?: boolean;
  children: ReactNode;
}

/**
 * Painel de administração do jogo: mostra o conteúdo só para quem administra (ver useGameAdmin); aos
 * demais, o aviso com o botão de entrar. É de interface — cada escrita é validada pelo backend.
 */
export function AdminGate({ gameId, title, from, ownerOnly = false, children }: AdminGateProps) {
  const admin = useGameAdmin(gameId);

  if (admin.isPending) {
    return (
      <StyledContainer title={title}>
        <Stack alignItems="center" sx={{ py: 10 }}>
          <CircularProgress color="primary" />
        </Stack>
      </StyledContainer>
    );
  }
  if (!(ownerOnly ? admin.isOwner : admin.isAdmin)) {
    return (
      <StyledContainer title={title}>
        <Alert
          severity="info"
          action={
            <Button component={Link} to="/login" state={{ from }} color="inherit" sx={{ textTransform: "none" }}>
              Entrar
            </Button>
          }
        >
          {ownerOnly
            ? "Esta tela é restrita ao owner do jogo. Entre com a conta de owner ou de administrador da plataforma."
            : "Esta tela é restrita a administradores do jogo. Entre com uma conta de moderador, owner ou administrador da plataforma."}
        </Alert>
      </StyledContainer>
    );
  }
  return <>{children}</>;
}
