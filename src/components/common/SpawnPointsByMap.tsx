import { Grid, Stack, Typography } from "@mui/material";
import { Map as MapIcon } from "@mui/icons-material";
import { useNavigate, useParams } from "react-router-dom";
import type { SpawnPointDocument } from "../../api/content";
import type { ReferenceIndex } from "../../api/references";
import { DataCard } from "./DataCard";

interface SpawnPointsByMapProps {
  points: SpawnPointDocument[];
  /** Filtro aplicado ao abrir o mapa: ?item=codigo ou ?entity=codigo. Sem ele, abre o mapa sem filtro. */
  filter?: { param: "item" | "entity"; value: string };
  references: ReferenceIndex;
}

/** Pontos de spawn agrupados por mapa, com atalho para o mapa já filtrado. */
export function SpawnPointsByMap({ points, filter, references }: SpawnPointsByMapProps) {
  const navigate = useNavigate();
  const { gameId = "" } = useParams<{ gameId: string }>();

  const groups = new Map<string, SpawnPointDocument[]>();
  points.forEach((point) => groups.set(point.map ?? "", [...(groups.get(point.map ?? "") ?? []), point]));

  return (
    <Grid container spacing={1}>
      {[...groups.entries()].map(([map, list]) => (
        <Grid size={{ xs: 12, md: 6 }} key={map || "sem-mapa"}>
          <DataCard
            onClick={
              map
                ? () =>
                    navigate(
                      `/game/${gameId}/map/${encodeURIComponent(map)}${
                        filter ? `?${filter.param}=${encodeURIComponent(filter.value)}` : ""
                      }`,
                    )
                : undefined
            }
            sx={{ p: 1.5, gap: 2 }}
          >
            <MapIcon color="primary" />
            <Stack>
              <Typography variant="body2" fontWeight={700}>
                {map ? references.name({ kind: "map", extId: map }) : "Sem mapa"}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {list.length} {list.length === 1 ? "ocorrência" : "ocorrências"}
              </Typography>
            </Stack>
          </DataCard>
        </Grid>
      ))}
    </Grid>
  );
}
