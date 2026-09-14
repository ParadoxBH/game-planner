import { useMemo, type ReactNode } from "react";
import { Box, Card, Stack, Tooltip, Typography } from "@mui/material";
import { ChevronRight, Storefront } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { MAX_PAGE_SIZE, type ShopDocument } from "../../api/content";
import { contentRoute, currentMedia, mediaUrl, ReferenceIndex } from "../../api/references";
import { useContentList } from "../../api/useContent";
import { useEventFilter } from "../../context/EventFilterContext";
import { usePlatform } from "../../hooks/usePlatform";
import { formatReset } from "../../utils/format";
import { ContentIcon } from "../common/ContentIcon";
import { DataChip } from "../common/DataChip";
import { PickSelector } from "../common/PickSelector";

/** O que os renderers precisam além da loja. */
export interface ShopListView {
  gameId: string;
  /** Referências resolvidas da página: o NPC de cada loja. */
  references: ReferenceIndex;
}

/** Ícone da loja: o do NPC que atende ou, sem ele, o da própria loja. */
export function shopIconId(shop: ShopDocument, references: ReferenceIndex): string | null {
  const npc = shop.npc ? references.find({ kind: "entity", extId: shop.npc }) : undefined;
  return npc?.iconMediaId ?? currentMedia(shop.media, "icon");
}

function npcName(shop: ShopDocument, references: ReferenceIndex): string | null {
  return shop.npc ? references.name({ kind: "entity", extId: shop.npc }) : null;
}

function shopRoute(view: ShopListView, shop: ShopDocument): string {
  return contentRoute(view.gameId, "shop", shop.extId)!;
}

function ShopAvatar({ shop, references, size }: { shop: ShopDocument; references: ReferenceIndex; size: number }) {
  return (
    <Box
      sx={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: "50%",
        border: 2,
        borderColor: "divider",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <ContentIcon mediaId={shopIconId(shop, references)} kind="shop" alt={shop.name} size={Math.round(size * 0.8)} />
    </Box>
  );
}

/** Card da listagem de lojas vindas da API. */
export function ApiShopCard({ shop, variant, view }: { shop: ShopDocument; variant: "default" | "compact"; view: ShopListView }) {
  const navigate = useNavigate();
  const npc = npcName(shop, view.references);

  return (
    <Card
      onClick={() => navigate(shopRoute(view, shop))}
      sx={{
        height: "100%",
        cursor: "pointer",
        borderRadius: 1,
        border: 1,
        borderColor: "divider",
        transition: "all 0.3s",
        "&:hover": { transform: "translateY(-4px)", borderColor: "primary.main" },
      }}
    >
      <Stack alignItems="center" spacing={1.5} sx={{ p: 2, textAlign: "center", height: "100%" }}>
        <ShopAvatar shop={shop} references={view.references} size={variant === "compact" ? 80 : 100} />
        <Typography variant={variant === "compact" ? "subtitle2" : "h6"} sx={{ fontWeight: 800, lineHeight: 1.2 }}>
          {shop.name}
        </Typography>
        {variant === "default" && (
          <>
            <Typography variant="body2" color="text.secondary" fontWeight={600}>
              {npc ? `NPC: ${npc}` : "Loja global"}
            </Typography>
            {shop.resetType && <DataChip label={`Reset: ${formatReset(shop.resetType)}`} />}
            <Stack
              direction="row"
              alignItems="center"
              spacing={0.5}
              sx={{ mt: "auto", color: "primary.main", fontWeight: 700, fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: 1 }}
            >
              <span>Ver loja</span>
              <ChevronRight sx={{ fontSize: 16 }} />
            </Stack>
          </>
        )}
      </Stack>
    </Card>
  );
}

function ShopNameCell({ shop, view }: { shop: ShopDocument; view: ShopListView }) {
  const navigate = useNavigate();
  const npc = npcName(shop, view.references);
  return (
    <Stack direction="row" alignItems="center" spacing={2} sx={{ cursor: "pointer" }} onClick={() => navigate(shopRoute(view, shop))}>
      <ShopAvatar shop={shop} references={view.references} size={32} />
      <Stack sx={{ minWidth: 0 }}>
        <Typography variant="body2" sx={{ fontWeight: 700, "&:hover": { color: "primary.main" } }}>
          {shop.name}
        </Typography>
        {npc && (
          <Typography variant="caption" color="text.secondary">
            {npc}
          </Typography>
        )}
      </Stack>
    </Stack>
  );
}

/** Colunas da visão em lista: loja e NPC, código e reset. */
export function shopListCells(shop: ShopDocument, view: ShopListView): ReactNode[] {
  return [
    <ShopNameCell key="name" shop={shop} view={view} />,
    <Typography key="id" variant="caption" sx={{ color: "text.secondary", fontFamily: "monospace" }}>
      {shop.extId}
    </Typography>,
    <Stack key="reset" direction="row" justifyContent="flex-end">
      {shop.resetType ? (
        <DataChip label={formatReset(shop.resetType)} />
      ) : (
        <Typography variant="caption" color="text.secondary">
          -
        </Typography>
      )}
    </Stack>,
  ];
}

export function ApiShopIcon({ shop, view }: { shop: ShopDocument; view: ShopListView }) {
  const navigate = useNavigate();
  const npc = npcName(shop, view.references);
  return (
    <Tooltip title={`${shop.name}${npc ? ` · ${npc}` : ""} (${shop.extId})`}>
      <Box
        onClick={() => navigate(shopRoute(view, shop))}
        sx={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", p: 1, cursor: "pointer" }}
      >
        <ContentIcon mediaId={shopIconId(shop, view.references)} kind="shop" alt={shop.name} size={56} />
      </Box>
    </Tooltip>
  );
}

/** Seletor de loja entre as dos eventos ativos. Escolher abre a loja; limpar volta à lista. */
export function ShopPicker({ gameId, value }: { gameId: string; value: string | null }) {
  const navigate = useNavigate();
  const { isMobile } = usePlatform();
  const { activeEventIds } = useEventFilter();

  const shops = useContentList<ShopDocument>(gameId, "shops", {
    size: MAX_PAGE_SIZE,
    sort: "name",
    filters: { activeEvents: activeEventIds.join(","), references: "true" },
  });
  const references = useMemo(() => new ReferenceIndex(shops.data?.references), [shops.data]);

  const options = (shops.data?.content ?? []).map((shop) => {
    const iconId = shopIconId(shop, references);
    return { value: shop.extId, label: shop.name, icon: iconId ? mediaUrl(iconId) : undefined };
  });

  return (
    <PickSelector
      label="Loja"
      value={value}
      options={options}
      allLabel="Todas as lojas"
      icon={<Storefront sx={{ fontSize: 18 }} />}
      fullWidth={isMobile}
      onChange={(shop) => navigate(shop ? contentRoute(gameId, "shop", shop)! : `/game/${gameId}/shops/list`)}
    />
  );
}
