import { AutoAwesomeMosaic } from "@mui/icons-material";
import { Stack, Typography } from "@mui/material";
import { DataCard } from "../common/DataCard";
import { useNavigate, useParams } from "react-router-dom";
import type { Conjunto } from "../../types/gameModels";
import { DetainItem } from "../common/DetainItem";

interface DetainConjuntoProps {
  itens: Conjunto[];
}

export function DetainConjunto({ itens }: DetainConjuntoProps) {
  const { gameId } = useParams<{
    gameId: string;
  }>();
  const navigate = useNavigate();
  if(itens.length < 1)
    return <></>
  return (
    <DetainItem
      label="Parte de Conjuntos"
      sx={{label:{fontSize: 12}}}
      startIcon={<AutoAwesomeMosaic color="primary" sx={{ fontSize: 18 }} />}
    >
      <Stack spacing={1}>
        {itens.map((conjunto) => (
          <DataCard
            key={conjunto.id}
            onClick={() =>
              navigate(`/game/${gameId}/conjuntos/${conjunto.category}`)
            }
            sx={{
              p: 1.5,
              "&:hover": {
                backgroundColor: "rgba(255, 68, 0, 0.1)",
              },
            }}
          >
            <Stack>
              <Typography
                variant="body2"
                sx={{ fontWeight: 700, lineHeight: 1.2 }}
              >
                {conjunto.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {conjunto.category}
              </Typography>
            </Stack>
          </DataCard>
        ))}
      </Stack>
    </DetainItem>
  );
}
