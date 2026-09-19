import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, Button, Grid, Stack, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import MapIcon from "@mui/icons-material/Map";
import ExploreIcon from "@mui/icons-material/Explore";
import CategoryIcon from "@mui/icons-material/Category";
import StorefrontIcon from "@mui/icons-material/Storefront";
import InventoryIcon from "@mui/icons-material/Inventory";
import PlaceIcon from "@mui/icons-material/Place";
import LaunchIcon from "@mui/icons-material/Launch";
import FilterAltOffIcon from "@mui/icons-material/FilterAltOff";
import {
  MAX_PAGE_SIZE,
  type LocationDocument,
  type MapDocument,
  type MapMarker,
  type MarkerOccupant,
  type ShopDocument,
} from "../../api/content";
import { contentRoute, currentMedia, mediaUrl, ReferenceIndex } from "../../api/references";
import { useContentList } from "../../api/useContent";
import {  } from "../../api/query";
import { usePlatform } from "../../hooks/usePlatform";
import { ContentChip } from "../common/ContentChip";
import { DataCard } from "../common/DataCard";
import { DataChip } from "../common/DataChip";
import { DetainItem } from "../common/DetainItem";
import { StyledContainer } from "../common/StyledContainer";
import { ApiShopCard, type ShopListView } from "../shop/ApiShopRenderers";
import { locationTypeOf, occupantCategory, typeLabel, UNCATEGORIZED } from "./MapFilterDrawer";
import { MapFocusedSpawns, type MapFocus } from "./MapFocusedSpawns";

interface OccupantCount {
  occupant: MarkerOccupant;
  count: number;
}

interface MapDashboardProps {
  gameId: string;
  map: MapDocument;
  markers: MapMarker[];
  locations: LocationDocument[];
  categoryNames: Map<string, string>;
  availableViews: string[];
  onSwitchToMap: () => void;
  /** Filtro da URL (?entity= ou ?item=): em vez da visão geral, mostra onde esse conteúdo aparece. */
  focus?: MapFocus & { name: string | null; onOpen: () => void; onClear: () => void };
}

/**
 * Visão geral do mapa: ocorrências, ocupantes por categoria, lojas dos NPCs que aparecem nele e locais.
 * Com focus, detalha só as ocorrências daquele item ou entidade, agrupadas por local.
 */
export const MapDashboard = ({ gameId, map, markers, locations, categoryNames, availableViews, onSwitchToMap, focus }: MapDashboardProps) => {
  const navigate = useNavigate();
  const theme = useTheme();
  const { isMobile } = usePlatform();
  const { spacing: dtSpacing, borderRadius: dtRadius } = theme.designTokens;
  const shops = useContentList<ShopDocument>(gameId, "shops", { size: MAX_PAGE_SIZE, references: true });

  const occupants = useMemo(() => {
    const counts = new Map<string, OccupantCount>();
    markers.forEach((marker) =>
      marker.occupants.forEach((occupant) => {
        const key = `${occupant.kind ?? ""}:${occupant.extId}`;
        const entry = counts.get(key);
        if (entry) entry.count++;
        else counts.set(key, { occupant, count: 1 });
      }),
    );
    return [...counts.values()];
  }, [markers]);

  const groups = useMemo(() => {
    const byCategory = new Map<string, OccupantCount[]>();
    occupants.forEach((entry) => {
      const category = occupantCategory(entry.occupant);
      byCategory.set(category, [...(byCategory.get(category) ?? []), entry]);
    });
    return [...byCategory.entries()]
      .map(([category, entries]) => ({ category, entries: [...entries].sort((a, b) => b.count - a.count) }))
      .sort((a, b) => b.entries.length - a.entries.length);
  }, [occupants]);

  const occupantIds = useMemo(() => new Set(occupants.map((entry) => entry.occupant.extId)), [occupants]);
  const mapShops = (shops.data?.content ?? []).filter((shop) => shop.npc && occupantIds.has(shop.npc));
  const shopView = useMemo<ShopListView>(() => ({ gameId, references: new ReferenceIndex(shops.data?.references) }), [gameId, shops.data]);

  const stats = [
    { label: "Ocorrências", value: markers.length, icon: <ExploreIcon />, color: "primary.main" },
    { label: "Ocupantes", value: occupants.length, icon: <MapIcon />, color: "success.main" },
    { label: "Categorias", value: groups.length, icon: <CategoryIcon />, color: "info.main" },
    { label: "Lojas", value: mapShops.length, icon: <StorefrontIcon />, color: "warning.main" },
    { label: "Locais", value: locations.length, icon: <PlaceIcon />, color: "secondary.main" },
  ];

  const categoryLabel = (category: string) =>
    category === UNCATEGORIZED ? "Sem categoria" : categoryNames.get(category) ?? category.replace(/_/g, " ");

  if (focus) {
    const buttonSx = { borderRadius: 2, px: 2, textTransform: "none", fontWeight: 700, flex: isMobile ? 1 : undefined } as const;
    return (
      <StyledContainer
        title={focus.name ?? focus.value}
        label={`Onde aparece em ${map.name}: cada local com quantidade, chance, reaparecimento e condições.`}
        actionsEnd={
          <Stack direction="row" spacing={1} sx={{ flex: isMobile ? 1 : undefined }}>
            <Button variant="outlined" size="small" startIcon={<LaunchIcon />} onClick={focus.onOpen} sx={buttonSx}>
              Detalhar
            </Button>
            <Button variant="outlined" size="small" startIcon={<FilterAltOffIcon />} onClick={focus.onClear} sx={buttonSx}>
              Ver todo o mapa
            </Button>
            {availableViews.includes("map") && (
              <Button variant="contained" size="small" startIcon={<MapIcon />} onClick={onSwitchToMap} sx={buttonSx}>
                Ver no mapa
              </Button>
            )}
          </Stack>
        }
      >
        <Stack flex={1} sx={{ overflowY: "auto" }}>
          <MapFocusedSpawns gameId={gameId} mapId={map.extId} focus={focus} />
        </Stack>
      </StyledContainer>
    );
  }

  return (
    <StyledContainer
      title={map.name}
      label="Visão geral dos pontos, ocupantes, lojas e locais deste mapa."
      actionsEnd={
        availableViews.includes("map") && (
          <Button
            variant="contained"
            startIcon={<MapIcon />}
            onClick={onSwitchToMap}
            size="small"
            sx={{ borderRadius: 2, px: 3, textTransform: "none", fontWeight: 700, flex: isMobile ? 1 : undefined }}
          >
            Voltar para o mapa
          </Button>
        )
      }
    >
      <Stack flex={1} spacing={1} sx={{ overflowY: "auto" }}>
        <Grid container spacing={dtSpacing.itemGap}>
          {stats.map((stat) => (
            <Grid size={{ xs: 6, sm: 4, md: "grow" }} key={stat.label}>
              <DataCard sx={{ p: dtSpacing.cardPadding, borderRadius: dtRadius }}>
                <Stack direction="row" spacing={dtSpacing.itemGap} alignItems="center">
                  <Avatar
                    sx={{ bgcolor: "rgba(255,255,255,0.03)", color: stat.color, width: 40, height: 40, border: 1, borderColor: "divider" }}
                  >
                    {stat.icon}
                  </Avatar>
                  <Stack>
                    <Typography variant="h6" fontWeight={900} sx={{ lineHeight: 1 }}>
                      {stat.value}
                    </Typography>
                    <Typography variant="caption" sx={{ opacity: 0.5, fontWeight: 700, fontSize: "0.6rem" }}>
                      {stat.label}
                    </Typography>
                  </Stack>
                </Stack>
              </DataCard>
            </Grid>
          ))}
        </Grid>

        <Grid container spacing={1}>
          {groups.map(({ category, entries }) => (
            <DetainItem
              key={category}
              size={isMobile ? undefined : 6}
              startIcon={<InventoryIcon color="primary" />}
              label={categoryLabel(category)}
              count={entries.length}
            >
              <Grid container spacing={dtSpacing.itemGap}>
                {entries.map(({ occupant, count }) => {
                  const route = occupant.name ? contentRoute(gameId, occupant.kind ?? "entity", occupant.extId) : null;
                  return (
                    <Grid size={{ xs: 12, sm: 6, md: 4 }} key={`${occupant.kind ?? ""}:${occupant.extId}`}>
                      <DataCard
                        onClick={route ? () => navigate(route) : undefined}
                        sx={{ p: dtSpacing.cardPadding, borderRadius: dtRadius, gap: 1.5 }}
                      >
                        <ContentChip
                          target={{ kind: occupant.kind, extId: occupant.extId }}
                          resolved={{
                            kind: occupant.kind,
                            extId: occupant.extId,
                            resolvedKind: occupant.name ? occupant.kind ?? "entity" : null,
                            name: occupant.name,
                            iconMediaId: occupant.iconMediaId,
                          }}
                          size="medium"
                          disableLink
                        />
                        <Typography variant="subtitle2" noWrap fontWeight={700} sx={{ flex: 1, minWidth: 0 }}>
                          {occupant.name ?? occupant.extId}
                        </Typography>
                        {count > 1 && (
                          <Typography variant="caption" sx={{ color: "primary.main", fontWeight: 800 }}>
                            x{count}
                          </Typography>
                        )}
                      </DataCard>
                    </Grid>
                  );
                })}
              </Grid>
            </DetainItem>
          ))}

          <DetainItem size={isMobile ? undefined : 6} startIcon={<StorefrontIcon color="primary" />} label="Lojas" count={mapShops.length}>
            {mapShops.length > 0 && (
              <Grid container spacing={1}>
                {mapShops.map((shop) => (
                  <Grid size={{ xs: 6, md: 4 }} key={shop.extId}>
                    <ApiShopCard shop={shop} variant="compact" view={shopView} />
                  </Grid>
                ))}
              </Grid>
            )}
          </DetainItem>

          <DetainItem size={isMobile ? undefined : 6} startIcon={<PlaceIcon color="primary" />} label="Locais" count={locations.length}>
            {locations.length > 0 && (
              <Grid container spacing={dtSpacing.itemGap}>
                {locations.map((location) => {
                  const imageId = currentMedia(location.media, "banner") ?? currentMedia(location.media, "screenshot");
                  const iconId = currentMedia(location.media, "icon");
                  const background = imageId ? mediaUrl(imageId, "thumb") : null;
                  return (
                    <Grid size={isMobile ? 12 : 6} key={location.extId}>
                      <DataCard
                        sx={{
                          height: "100%",
                          p: dtSpacing.cardPadding,
                          flexDirection: "column",
                          alignItems: "stretch",
                          gap: 1,
                          borderRadius: dtRadius,
                          ...(background && {
                            backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.85) 100%), url(${background})`,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                          }),
                        }}
                      >
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          {iconId && <Avatar src={mediaUrl(iconId)} variant="rounded" sx={{ width: 40, height: 40 }} />}
                          <Typography variant="h6" fontWeight={900} sx={{ flex: 1, minWidth: 0 }}>
                            {location.name ?? location.extId}
                          </Typography>
                          <DataChip label={typeLabel(locationTypeOf(location))} />
                        </Stack>
                        <Typography variant="body2" sx={{ opacity: 0.9 }}>
                          {location.summary ?? location.description ?? "Sem descrição disponível."}
                        </Typography>
                      </DataCard>
                    </Grid>
                  );
                })}
              </Grid>
            )}
          </DetainItem>
        </Grid>
      </Stack>
    </StyledContainer>
  );
};
