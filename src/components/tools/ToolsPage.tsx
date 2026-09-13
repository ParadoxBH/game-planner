import { useState } from "react";
import { Link } from "react-router-dom";
import { Alert, Button, CircularProgress, Stack, Tab, Tabs, useTheme } from "@mui/material";
import { StyledContainer } from "../common/StyledContainer";
import { useMe, useSession } from "../../api/useAuth";
import { BoundsCalculatorTool } from "./BoundsCalculatorTool";
import { JsonTransformTool } from "./JsonTransformTool";
import { MediaUploadTool } from "./MediaUploadTool";
import { remapObjects, repositionSpawners } from "./transforms";

type ToolTab = "media" | "remapper" | "spawners" | "bounds";

const TITLE = "Utilitários";

/**
 * Ferramentas de apoio para montar e testar dados.
 *
 * A restrição a platform_admin é só de interface: esconde o que não interessa a usuário
 * comum. Não é barreira de segurança — o que exige permissão, como o upload de mídia,
 * é validado pelo backend.
 */
export function ToolsPage() {
  const theme = useTheme();
  const { spacing } = theme.designTokens;
  const { activeUsername } = useSession();
  const me = useMe();
  const [tab, setTab] = useState<ToolTab>("media");

  if (!activeUsername) {
    return (
      <StyledContainer title={TITLE}>
        <Alert
          severity="info"
          action={
            <Button
              component={Link}
              to="/login"
              state={{ from: "/utilitarios" }}
              color="inherit"
              sx={{ textTransform: "none" }}
            >
              Entrar
            </Button>
          }
        >
          Entre com uma conta de administrador da plataforma para acessar os utilitários.
        </Alert>
      </StyledContainer>
    );
  }

  if (me.isError) {
    return (
      <StyledContainer title={TITLE}>
        <Alert severity="error">{me.error.message}</Alert>
      </StyledContainer>
    );
  }

  if (me.isPending) {
    return (
      <StyledContainer title={TITLE}>
        <Stack alignItems="center" sx={{ py: spacing.sectionGap }}>
          <CircularProgress />
        </Stack>
      </StyledContainer>
    );
  }

  if (!me.data?.platformAdmin) {
    return (
      <StyledContainer title={TITLE}>
        <Alert severity="warning">
          Área restrita a administradores da plataforma. A conta @{activeUsername} não tem essa permissão.
        </Alert>
      </StyledContainer>
    );
  }

  return (
    <StyledContainer title={TITLE} label="Ferramentas de apoio para montar e testar dados.">
      <Stack spacing={spacing.contentGap}>
        <Tabs
          value={tab}
          onChange={(_event, next: ToolTab) => setTab(next)}
          variant="scrollable"
          allowScrollButtonsMobile
        >
          <Tab value="media" label="Imagem" sx={{ textTransform: "none" }} />
          <Tab value="remapper" label="Remapear objetos" sx={{ textTransform: "none" }} />
          <Tab value="spawners" label="Reposicionar spawners" sx={{ textTransform: "none" }} />
          <Tab value="bounds" label="Calcular bounds" sx={{ textTransform: "none" }} />
        </Tabs>

        {tab === "media" && <MediaUploadTool />}

        {tab === "remapper" && (
          <JsonTransformTool
            description="Converte uma lista de { id, positions: [{ lat, lng }] } em ReferencePoints de spawn, um por posição."
            placeholder='[{ "id": "minerio", "positions": [{ "lat": -120.5, "lng": 88.2 }] }]'
            errorMessage="Não foi possível processar"
            transform={remapObjects}
          />
        )}

        {tab === "spawners" && (
          <JsonTransformTool
            description="Aplica o deslocamento fixo (X +512, Y −510,75) às coordenadas POINT de uma lista de ReferencePoints."
            placeholder='[{ "id": "ponto", "type": "spawn", "geom": { "type": "Point", "coordinates": "POINT(10 20)" } }]'
            errorMessage="Erro ao processar JSON ou coordenadas"
            transform={repositionSpawners}
          />
        )}

        {tab === "bounds" && <BoundsCalculatorTool />}
      </Stack>
    </StyledContainer>
  );
}
