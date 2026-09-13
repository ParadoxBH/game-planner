import type { ReactNode } from "react";
import { Box, Card, Chip, Stack, Tooltip, Typography } from "@mui/material";
import { Sell, ShoppingCart } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import type { AttributeDefinition, AttributeValue, CategoryDocument, ItemDocument, Rarity } from "../../api/content";
import { contentRoute, currentMedia } from "../../api/references";
import { formatAmount } from "../../utils/format";
import { ContentIcon } from "../common/ContentIcon";
import { DataChip } from "../common/DataChip";
import { LevelBadge } from "../common/LevelBadge";

/** O que os renderers precisam além do item. */
export interface ItemListView {
  gameId: string;
  showPrices: boolean;
  rarities: Map<string, Rarity>;
  categories: Map<string, CategoryDocument>;
  attributes: Map<string, AttributeDefinition>;
}

export function rarityColorOf(view: ItemListView, item: ItemDocument): string | undefined {
  return item.rarityCode ? view.rarities.get(item.rarityCode)?.color : undefined;
}

export function attributeLabel(key: string, value: AttributeValue, definition?: AttributeDefinition): string {
  const shown = typeof value === "boolean" ? (value ? "sim" : "não") : String(value);
  return `${definition?.label ?? key}: ${shown}${definition?.unit ? ` ${definition.unit}` : ""}`;
}

function itemRoute(view: ItemListView, item: ItemDocument): string {
  return contentRoute(view.gameId, "item", item.extId)!;
}

function IconFrame({ size, color, children }: { size: number; color?: string; children: ReactNode }) {
  return (
    <Box
      sx={{
        position: "relative",
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: 1,
        border: 1,
        borderColor: color ?? "divider",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {children}
    </Box>
  );
}

function ItemPrices({ item }: { item: ItemDocument }) {
  const currency = item.currency ? ` em ${item.currency.extId}` : "";
  if (item.baseBuyPrice === null && item.baseSellPrice === null) return null;
  return (
    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
      {item.baseBuyPrice !== null && (
        <Tooltip title={`Preço de compra${currency}`}>
          <DataChip icon={<ShoppingCart />} label={formatAmount(item.baseBuyPrice)} color="success" variant="outlined" />
        </Tooltip>
      )}
      {item.baseSellPrice !== null && (
        <Tooltip title={`Preço de venda${currency}`}>
          <DataChip icon={<Sell />} label={formatAmount(item.baseSellPrice)} color="warning" variant="outlined" />
        </Tooltip>
      )}
    </Stack>
  );
}

interface ApiItemCardProps {
  item: ItemDocument;
  variant: "default" | "compact";
  view: ItemListView;
}

/** Card da listagem de itens vindos da API. */
export function ApiItemCard({ item, variant, view }: ApiItemCardProps) {
  const navigate = useNavigate();
  const color = rarityColorOf(view, item);
  const iconId = currentMedia(item.media, "icon");
  const open = () => navigate(itemRoute(view, item));

  return (
    <Card
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        borderRadius: 1,
        border: 1,
        borderColor: color ?? "divider",
        backgroundColor: color ? `${color}11` : undefined,
        transition: "all 0.3s",
        "&:hover": { transform: "translateY(-4px)", borderColor: color ?? "primary.main" },
      }}
    >
      {variant === "compact" ? (
        <Stack alignItems="center" spacing={1.5} sx={{ p: 2, textAlign: "center", cursor: "pointer" }} onClick={open}>
          <IconFrame size={80} color={color}>
            <ContentIcon mediaId={iconId} kind="item" alt={item.name} size={64} />
            <LevelBadge level={item.level} />
          </IconFrame>
          <Typography variant="subtitle2" sx={{ color: color ?? "text.primary", fontWeight: 700, lineHeight: 1.2 }}>
            {item.name}
          </Typography>
        </Stack>
      ) : (
        <Stack spacing={1.5} sx={{ p: 2, flex: 1 }}>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ cursor: "pointer" }} onClick={open}>
            <IconFrame size={64} color={color}>
              <ContentIcon mediaId={iconId} kind="item" alt={item.name} size={52} />
              <LevelBadge level={item.level} />
            </IconFrame>
            <Stack sx={{ minWidth: 0 }}>
              <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                {item.categories.map((id) => (
                  <Typography key={id} variant="caption" sx={{ color: "primary.main", fontWeight: 700 }}>
                    #{view.categories.get(id)?.name ?? id}
                  </Typography>
                ))}
              </Stack>
              <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2, color: color ?? "text.primary" }}>
                {item.name}
              </Typography>
            </Stack>
          </Stack>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ flex: 1, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}
          >
            {item.summary ?? item.description ?? "Nenhuma descrição disponível para este item."}
          </Typography>
          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
            <Tooltip title="Código do item">
              <Chip size="small" label={item.extId} sx={{ fontFamily: "monospace", fontSize: "0.6rem" }} />
            </Tooltip>
            {view.showPrices && <ItemPrices item={item} />}
          </Stack>
        </Stack>
      )}
    </Card>
  );
}

function ItemNameCell({ item, view }: { item: ItemDocument; view: ItemListView }) {
  const navigate = useNavigate();
  const color = rarityColorOf(view, item);
  return (
    <Stack direction="row" alignItems="center" spacing={2} sx={{ cursor: "pointer" }} onClick={() => navigate(itemRoute(view, item))}>
      <IconFrame size={32} color={color}>
        <ContentIcon mediaId={currentMedia(item.media, "icon")} kind="item" alt={item.name} size={26} />
        <LevelBadge level={item.level} />
      </IconFrame>
      <Typography variant="body2" sx={{ fontWeight: 700, color: color ?? "text.primary", "&:hover": { color: color ?? "primary.main" } }}>
        {item.name}
      </Typography>
    </Stack>
  );
}

function ItemAttributesCell({ item, view }: { item: ItemDocument; view: ItemListView }) {
  const entries = Object.entries(item.attributes);
  if (entries.length === 0) {
    return (
      <Typography variant="caption" color="text.disabled">
        -
      </Typography>
    );
  }
  return (
    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
      {entries.map(([key, value]) => (
        <DataChip key={key} label={attributeLabel(key, value, view.attributes.get(key))} />
      ))}
    </Stack>
  );
}

function ItemCategoriesCell({ item, view }: { item: ItemDocument; view: ItemListView }) {
  const navigate = useNavigate();
  return (
    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
      {item.categories.map((id) => {
        const category = view.categories.get(id);
        const iconId = category ? currentMedia(category.media, "icon") : null;
        return (
          <Chip
            key={id}
            label={category?.name ?? id}
            size="small"
            avatar={iconId ? <ContentIcon mediaId={iconId} kind="category" size={16} /> : undefined}
            onClick={() => navigate(contentRoute(view.gameId, "category", id)!)}
            clickable
          />
        );
      })}
    </Stack>
  );
}

/** Colunas da visão em lista: nome, atributos, categorias e preços. */
export function itemListCells(item: ItemDocument, view: ItemListView): ReactNode[] {
  return [
    <ItemNameCell key="name" item={item} view={view} />,
    <ItemAttributesCell key="attributes" item={item} view={view} />,
    <ItemCategoriesCell key="categories" item={item} view={view} />,
    <ItemPrices key="prices" item={item} />,
  ];
}

export function ApiItemIcon({ item, view }: { item: ItemDocument; view: ItemListView }) {
  const navigate = useNavigate();
  return (
    <Tooltip title={item.name}>
      <Box
        onClick={() => navigate(itemRoute(view, item))}
        sx={{ position: "relative", width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", p: 1, cursor: "pointer" }}
      >
        <ContentIcon mediaId={currentMedia(item.media, "icon")} kind="item" alt={item.name} size={56} />
        <LevelBadge level={item.level} />
      </Box>
    </Tooltip>
  );
}
