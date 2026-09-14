import { Grid, Stack, Typography } from "@mui/material";
import type { MediaLink, MediaUsage } from "../../api/content";
import { currentMedia } from "../../api/references";
import { ContentChip } from "./ContentChip";

export interface TileContent {
  extId: string;
  name: string | null;
  media: MediaLink[];
  rarityCode?: string | null;
  level?: number | null;
}

interface ContentTilesProps {
  kind: string;
  contents: TileContent[];
  /** Imagem usada quando o conteúdo não tem ícone, ex.: a screenshot de uma entidade. */
  fallbackUsage?: MediaUsage;
  rarityColor?: (rarityCode: string) => string | undefined;
}

/** Grade de conteúdos já carregados: ícone com link para a tela do conteúdo e o nome embaixo. */
export function ContentTiles({ kind, contents, fallbackUsage, rarityColor }: ContentTilesProps) {
  return (
    <Grid container spacing={1}>
      {contents.map((content) => {
        const iconMediaId = currentMedia(content.media, "icon") ?? (fallbackUsage ? currentMedia(content.media, fallbackUsage) : null);
        const color = content.rarityCode && rarityColor ? rarityColor(content.rarityCode) : undefined;
        return (
          <Grid key={content.extId} size={{ xs: 4, sm: 3, md: 2 }}>
            <Stack alignItems="center" spacing={1} sx={{ p: 1, textAlign: "center" }}>
              <ContentChip
                target={{ kind, extId: content.extId }}
                resolved={{ kind, extId: content.extId, resolvedKind: kind, name: content.name, iconMediaId }}
                level={content.level}
                rarityColor={color}
                size="large"
              />
              <Typography
                variant="caption"
                fontWeight={700}
                sx={{
                  lineHeight: 1.2,
                  color: color ?? "text.primary",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {content.name ?? content.extId}
              </Typography>
            </Stack>
          </Grid>
        );
      })}
    </Grid>
  );
}
