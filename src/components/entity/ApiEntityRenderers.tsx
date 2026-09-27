import type { ReactNode } from "react";
import { Box, Card, Chip, Stack, Tooltip, Typography } from "@mui/material";
import { Inventory, Sell, ShoppingCart, Storefront, TravelExplore } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import type { AttributeDefinition, CategoryDocument, EntityDocument, Rarity } from "../../api/content";
import { contentRoute, currentMedia } from "../../api/references";
import { formatAmount } from "../../utils/format";
import { AttributeHighlight, AttributeIconBadge } from "../common/AttributeHighlight";
import { ContentIcon } from "../common/ContentIcon";
import { ContentLabel } from "../common/ContentLabel";
import { DataChip } from "../common/DataChip";
import { LevelBadge } from "../common/LevelBadge";

/** O que os renderers precisam além da entidade. */
export interface EntityListView {
  gameId: string;
  showPrices: boolean;
  rarities: Map<string, Rarity>;
  categories: Map<string, CategoryDocument>;
  /** Códigos das entidades que são NPC de alguma loja. */
  shopNpcs: Set<string>;
  /** Definições de atributo, para o rótulo e a unidade do atributo em destaque. */
  attributes?: Map<string, AttributeDefinition>;
  /** Atributo escolhido no filtro da listagem: aparece em destaque em cada entidade que o tem. */
  highlightAttribute?: string | null;
}

/** O atributo em destaque da entidade, ou null quando não há filtro de atributo ou ela não o tem. */
function highlightOf(view: EntityListView, entity: EntityDocument) {
  const key = view.highlightAttribute;
  if (!key || !(key in entity.attributes)) return null;
  return <AttributeHighlight attributes={entity.attributes} attributeKey={key} definition={view.attributes?.get(key)} />;
}

export function entityRarityColor(view: EntityListView, entity: EntityDocument): string | undefined {
  return entity.rarityCode ? view.rarities.get(entity.rarityCode)?.color : undefined;
}

function entityRoute(view: EntityListView, entity: EntityDocument): string {
  return contentRoute(view.gameId, "entity", entity.extId)!;
}

/** Ícone da entidade: a imagem de ícone ou, na falta, a screenshot. */
function entityIcon(entity: EntityDocument): string | null {
  return currentMedia(entity.media, "icon") ?? currentMedia(entity.media, "screenshot");
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

function ShopMark() {
  return (
    <Tooltip title="NPC com loja">
      <Storefront sx={{ fontSize: 16, color: "primary.main" }} />
    </Tooltip>
  );
}

function EntityPrices({ entity }: { entity: EntityDocument }) {
  if (entity.baseBuyPrice === null && entity.baseSellPrice === null) return null;
  return (
    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
      {entity.baseBuyPrice !== null && (
        <Tooltip title="Preço de compra">
          <DataChip icon={<ShoppingCart />} label={formatAmount(entity.baseBuyPrice)} color="success" variant="outlined" />
        </Tooltip>
      )}
      {entity.baseSellPrice !== null && (
        <Tooltip title="Preço de venda">
          <DataChip icon={<Sell />} label={formatAmount(entity.baseSellPrice)} color="warning" variant="outlined" />
        </Tooltip>
      )}
    </Stack>
  );
}

interface ApiEntityCardProps {
  entity: EntityDocument;
  variant: "default" | "compact";
  view: EntityListView;
}

/** Card da listagem de entidades vindas da API. */
export function ApiEntityCard({ entity, variant, view }: ApiEntityCardProps) {
  const navigate = useNavigate();
  const color = entityRarityColor(view, entity);
  const iconId = entityIcon(entity);
  const hasShop = view.shopNpcs.has(entity.extId);
  const open = () => navigate(entityRoute(view, entity));
  const highlight = highlightOf(view, entity);

  return (
    <Card
      onClick={open}
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        cursor: "pointer",
        borderRadius: 1,
        border: 1,
        borderColor: color ?? "divider",
        backgroundColor: color ? `${color}11` : undefined,
        transition: "all 0.3s",
        "&:hover": { transform: "translateY(-4px)", borderColor: color ?? "primary.main" },
      }}
    >
      {variant === "compact" ? (
        <Stack alignItems="center" spacing={1.5} sx={{ p: 2, textAlign: "center" }}>
          <IconFrame size={80} color={color}>
            <ContentIcon mediaId={iconId} kind="entity" alt={entity.name} size={64} />
            <LevelBadge level={entity.level} />
          </IconFrame>
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Typography variant="subtitle2" sx={{ color: color ?? "text.primary", fontWeight: 700, lineHeight: 1.2 }}>
              {entity.name}
            </Typography>
            {hasShop && <ShopMark />}
          </Stack>
          {highlight}
        </Stack>
      ) : (
        <Stack spacing={1.5} sx={{ p: 2, flex: 1 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <IconFrame size={64} color={color}>
              <ContentIcon mediaId={iconId} kind="entity" alt={entity.name} size={52} />
              <LevelBadge level={entity.level} />
            </IconFrame>
            <Stack sx={{ minWidth: 0 }}>
              <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                {entity.categories.map((id) => (
                  <Typography key={id} variant="caption" sx={{ color: "primary.main", fontWeight: 700 }}>
                    #{view.categories.get(id)?.name ?? id}
                  </Typography>
                ))}
              </Stack>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2, color: color ?? "text.primary" }}>
                  {entity.name}
                </Typography>
                {hasShop && <ShopMark />}
              </Stack>
              {highlight && <Box sx={{ mt: 0.5 }}>{highlight}</Box>}
            </Stack>
          </Stack>
          <Stack spacing={0.5} sx={{ flex: 1 }}>
            {entity.requirements.length > 0 && (
              <Stack direction="row" spacing={1} alignItems="center">
                <TravelExplore sx={{ fontSize: 14, color: "text.secondary" }} />
                <Typography variant="caption" color="text.secondary">
                  {entity.requirements.length} {entity.requirements.length === 1 ? "requisito" : "requisitos"}
                </Typography>
              </Stack>
            )}
            {entity.drops.length > 0 && (
              <Stack direction="row" spacing={1} alignItems="center">
                <Inventory sx={{ fontSize: 14, color: "text.secondary" }} />
                <Typography variant="caption" color="text.secondary">
                  {entity.drops.length} {entity.drops.length === 1 ? "drop" : "drops"}
                </Typography>
              </Stack>
            )}
          </Stack>
          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
            <Tooltip title="Código da entidade">
              <Chip size="small" label={entity.extId} sx={{ fontFamily: "monospace", fontSize: "0.6rem" }} />
            </Tooltip>
            {view.showPrices && <EntityPrices entity={entity} />}
          </Stack>
        </Stack>
      )}
    </Card>
  );
}

function EntityNameCell({ entity, view }: { entity: EntityDocument; view: EntityListView }) {
  const navigate = useNavigate();
  return (
    <ContentLabel
      target={{ kind: "entity", extId: entity.extId }}
      resolved={{ kind: "entity", extId: entity.extId, resolvedKind: "entity", name: entity.name, iconMediaId: entityIcon(entity) }}
      level={entity.level}
      rarityColor={entityRarityColor(view, entity)}
      endAdornment={
        <>
          {view.shopNpcs.has(entity.extId) && <ShopMark />}
          {highlightOf(view, entity)}
        </>
      }
      onClick={() => navigate(entityRoute(view, entity))}
    />
  );
}

/** Colunas da visão em lista: entidade e preços. */
export function entityListCells(entity: EntityDocument, view: EntityListView): ReactNode[] {
  return [<EntityNameCell key="name" entity={entity} view={view} />, <EntityPrices key="prices" entity={entity} />];
}

export function ApiEntityIcon({ entity, view }: { entity: EntityDocument; view: EntityListView }) {
  const navigate = useNavigate();
  return (
    <Tooltip title={`${entity.name} (${entity.extId})`}>
      <Box
        onClick={() => navigate(entityRoute(view, entity))}
        sx={{ position: "relative", width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", p: 1, cursor: "pointer" }}
      >
        <ContentIcon mediaId={entityIcon(entity)} kind="entity" alt={entity.name} size={56} />
        <LevelBadge level={entity.level} />
        <AttributeIconBadge
          attributes={entity.attributes}
          attributeKey={view.highlightAttribute}
          definition={view.highlightAttribute ? view.attributes?.get(view.highlightAttribute) : undefined}
        />
      </Box>
    </Tooltip>
  );
}
