import {
  Grid,
  Typography,
  Card,
  CardActionArea,
  CardContent,
  Stack,
  Box
} from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import { StyledContainer } from "../common/StyledContainer";
import { usePlatform } from "../../hooks/usePlatform";
import { GAME_TOOLS, TOOL_GROUPS, toolPath, type ToolGroupId } from "./gameTools";

/** Ferramentas do jogo, em seções por grupo; cada ferramenta usa o ícone do seu grupo. */
export function GameToolsPage() {
  const navigate = useNavigate();
  const { gameId } = useParams<{ gameId: string }>();
  const { isMobile } = usePlatform();

  const groups = (Object.keys(TOOL_GROUPS) as ToolGroupId[])
    .map((groupId) => ({ ...TOOL_GROUPS[groupId], id: groupId, tools: GAME_TOOLS.filter((tool) => tool.group === groupId) }))
    .filter((group) => group.tools.length > 0);

  return (
    <StyledContainer
      title="Ferramentas"
      label="Calculadoras e utilitários para auxiliar sua jornada no jogo."
    >
      <Stack spacing={3}>
        {groups.map(({ id, label, icon: Icon, tools }) => (
          <Stack key={id} spacing={1}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ color: "text.secondary" }}>
              <Icon fontSize="small" />
              <Typography variant="overline" fontWeight="bold" lineHeight={1}>
                {label}
              </Typography>
            </Stack>
            <Grid container spacing={1}>
              {tools.map((tool) => (
                <Grid size={{ xs: 6, sm: 4, md: 4 }} key={tool.id}>
                  <Card
                    sx={{
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      transition: "transform 0.2s ease-in-out, box-shadow 0.2s",
                      "&:hover": {
                        transform: "translateY(-4px)",
                        boxShadow: 10,
                        borderColor: "primary.main"
                      },
                      backgroundColor: "rgba(255, 255, 255, 0.02)",
                      backdropFilter: "blur(10px)",
                      borderRadius: 1,
                      border: "1px solid rgba(255, 255, 255, 0.05)"
                    }}
                  >
                    <CardActionArea
                      onClick={() => navigate(toolPath(gameId!, tool))}
                      sx={{ flexGrow: 1, p: isMobile ? 1 : 2 }}
                    >
                      <CardContent>
                        <Stack spacing={1} alignItems="center" textAlign="center">
                          <Box
                            sx={{
                              p: 1,
                              borderRadius: "50%",
                              backgroundColor: "rgba(255, 68, 0, 0.1)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center"
                            }}
                          >
                            <Icon sx={{ fontSize: 40, color: "primary.main" }} />
                          </Box>
                          <Typography variant="subtitle2" fontSize={isMobile ? undefined : 24} fontWeight="bold">
                            {tool.title}
                          </Typography>
                          {!isMobile && <Typography variant="subtitle2" color="text.secondary">
                            {tool.description}
                          </Typography>}
                        </Stack>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Stack>
        ))}
      </Stack>
    </StyledContainer>
  );
}
