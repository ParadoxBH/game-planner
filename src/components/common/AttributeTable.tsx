import { Stack, Tooltip, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import type { AttributeDefinition, AttributeValue } from "../../api/content";
import { listRowSx } from "../../theme/listRowSx";
import { attributeName, formatAttributeValue } from "./attributes";

const OTHERS = "Outros";

interface AttributeTableProps {
  gameId: string;
  /** Listagem aberta pelo clique numa linha: a de itens ou a de entidades. */
  resource: "items" | "entities";
  attributes: Record<string, AttributeValue>;
  definitions: Map<string, AttributeDefinition>;
}

interface Row {
  key: string;
  value: AttributeValue;
  definition?: AttributeDefinition;
}

/** Linhas em seções pelo grupo da definição, na ordem da definição; sem definição, em "Outros", pela chave. */
function sections(attributes: Record<string, AttributeValue>, definitions: Map<string, AttributeDefinition>) {
  const rows: Row[] = Object.entries(attributes).map(([key, value]) => ({ key, value, definition: definitions.get(key) }));
  rows.sort(
    (a, b) =>
      Number(!a.definition) - Number(!b.definition) ||
      (a.definition?.ordinal ?? 0) - (b.definition?.ordinal ?? 0) ||
      attributeName(a.key, a.definition).localeCompare(attributeName(b.key, b.definition)),
  );
  const groups = new Map<string, Row[]>();
  rows.forEach((row) => {
    const group = row.definition?.group ?? OTHERS;
    groups.set(group, [...(groups.get(group) ?? []), row]);
  });
  // "Outros" sempre por último.
  return [...groups.entries()].sort(([a], [b]) => Number(a === OTHERS) - Number(b === OTHERS));
}

/**
 * Atributos do item ou da entidade em seções (Dano, Comida, Geral...), cada linha "rótulo ..... valor unidade".
 * Clicar numa linha abre a listagem com tudo que tem o atributo, do maior para o menor valor.
 */
export function AttributeTable({ gameId, resource, attributes, definitions }: AttributeTableProps) {
  const navigate = useNavigate();
  const listPath = resource === "items" ? "items" : "entity";

  const open = (key: string) => {
    const criteria = encodeURIComponent(JSON.stringify({ attr: key }));
    navigate(`/game/${gameId}/${listPath}/list/all?criteria=${criteria}`);
  };

  return (
    <Stack spacing={1.5} sx={{ width: "100%" }}>
      {sections(attributes, definitions).map(([group, rows]) => (
        <Stack key={group}>
          <Typography
            variant="caption"
            sx={{ fontWeight: 700, color: "text.secondary", textTransform: "uppercase", letterSpacing: 0.5, textAlign: "left" }}
          >
            {group}
          </Typography>
          {rows.map((row, index) => (
            <Tooltip key={row.key} title="Encontrar outros com o mesmo atributo" placement="left">
              <Stack
                direction="row"
                alignItems="center"
                justifyContent={"space-between"}
                spacing={1}
                onClick={() => open(row.key)}
                sx={[listRowSx({ index, clickable: true }), { px: 1, py: 0.5, borderRadius: 0, "&:hover .attribute-name": { color: "primary.main" } }]}
              >
                <Typography className="attribute-name" variant="body2" sx={{ fontWeight: 600, textAlign: "start", transition: "color 0.2s" }}>
                  {attributeName(row.key, row.definition)}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 800, whiteSpace: "nowrap" }} color={"primary"}>
                  {formatAttributeValue(row.value, row.definition)}
                </Typography>
              </Stack>
            </Tooltip>
          ))}
        </Stack>
      ))}
    </Stack>
  );
}
