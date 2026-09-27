import { Box } from "@mui/material";
import { Inventory } from "@mui/icons-material";
import { mediaUrl } from "../../api/references";
import { DataTypeIcon } from "../DataTypeIcon";

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
  return <DataTypeIcon value={kind ?? "item"} fallback={Inventory} sx={{ fontSize: size * 0.7, color: "text.disabled" }} />;
}
