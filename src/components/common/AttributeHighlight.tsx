import { Box, Chip, Tooltip, Typography } from "@mui/material";
import type { AttributeDefinition, AttributeValue } from "../../api/content";
import { attributeName, attributeText, formatAttributeValue } from "./attributes";

interface AttributeHighlightProps {
  attributes: Record<string, AttributeValue>;
  /** O atributo escolhido no filtro da listagem; sem ele, ou sem o conteúdo tê-lo, nada aparece. */
  attributeKey?: string | null;
  definition?: AttributeDefinition;
}

/** O atributo escolhido no filtro, em destaque ao lado do nome ou no card: "Perfurante 26". */
export function AttributeHighlight({ attributes, attributeKey, definition }: AttributeHighlightProps) {
  if (!attributeKey || !(attributeKey in attributes)) return null;
  const value = attributes[attributeKey];
  return (
    <Chip
      size="small"
      color="primary"
      label={
        <>
          {attributeName(attributeKey, definition)}{" "}
          <Box component="span" sx={{ fontWeight: 900 }}>
            {formatAttributeValue(value, definition)}
          </Box>
        </>
      }
      sx={{ height: 22, fontSize: "0.72rem", fontWeight: 600, maxWidth: "100%" }}
    />
  );
}

/** Na visão de ícones: o valor do atributo escolhido num selo no rodapé do ícone. O pai precisa de position relative. */
export function AttributeIconBadge({ attributes, attributeKey, definition }: AttributeHighlightProps) {
  if (!attributeKey || !(attributeKey in attributes)) return null;
  const value = attributes[attributeKey];
  return (
    <Tooltip title={attributeText(attributeKey, value, definition)}>
      <Box
        sx={{
          position: "absolute",
          bottom: 2,
          left: "50%",
          transform: "translateX(-50%)",
          px: 0.75,
          borderRadius: 1,
          bgcolor: "primary.main",
          color: "primary.contrastText",
          zIndex: 2,
          whiteSpace: "nowrap",
        }}
      >
        <Typography variant="caption" sx={{ fontWeight: 800, fontSize: "0.7rem", lineHeight: 1.5 }}>
          {formatAttributeValue(value, definition)}
        </Typography>
      </Box>
    </Tooltip>
  );
}
