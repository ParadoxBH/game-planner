import { Box } from "@mui/material";
import {
  AutoAwesomeMosaic,
  Bolt,
  Category,
  Event,
  Inventory,
  Map as MapIcon,
  MenuBook,
  Place,
  Redeem,
  Storefront,
} from "@mui/icons-material";
import type { SvgIconComponent } from "@mui/icons-material";
import { mediaUrl } from "../../api/references";

const FALLBACK_ICONS: Record<string, SvgIconComponent> = {
  item: Inventory,
  entity: Bolt,
  category: Category,
  event: Event,
  recipe: MenuBook,
  shop: Storefront,
  shop_category: Storefront,
  map: MapIcon,
  location: Place,
  spawn_point: Place,
  collection: AutoAwesomeMosaic,
  collection_group: AutoAwesomeMosaic,
  redemption_code: Redeem,
};

interface ContentIconProps {
  mediaId?: string | null;
  kind?: string | null;
  alt?: string;
  size: number;
}

/** Ícone de um conteúdo vindo da API; sem imagem, o símbolo do tipo. */
export function ContentIcon({ mediaId, kind, alt, size }: ContentIconProps) {
  if (mediaId) {
    return (
      <Box
        component="img"
        src={mediaUrl(mediaId)}
        alt={alt}
        sx={{ width: size, height: size, objectFit: "contain", imageRendering: "pixelated" }}
      />
    );
  }
  const Fallback = FALLBACK_ICONS[kind ?? "item"] ?? Inventory;
  return <Fallback sx={{ fontSize: size * 0.7, color: "text.disabled" }} />;
}
