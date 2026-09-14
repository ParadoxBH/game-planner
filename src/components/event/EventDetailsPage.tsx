import { useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Box, Breadcrumbs, CircularProgress, Divider, Grid, Paper, Stack, Typography } from "@mui/material";
import {
  AccessTime,
  AutoAwesomeMosaic,
  Bolt,
  Category,
  Cloud,
  Construction,
  Explore,
  Inventory,
  Map as MapIcon,
  NavigateNext,
  Place,
  Sell,
  Storefront,
} from "@mui/icons-material";
import { ApiError } from "../../api/ApiError";
import type { ContentPage, EventDocument, EventRelated } from "../../api/content";
import { contentRoute, currentMedia, mediaUrl, ReferenceIndex, resolvedFrom } from "../../api/references";
import { useContentDetails, useRarities } from "../../api/useContent";
import { usePlatform } from "../../hooks/usePlatform";
import { ApiCollectionGroups } from "../common/ApiRelatedLists";
import { ContentChip } from "../common/ContentChip";
import { ContentTiles } from "../common/ContentTiles";
import { DataCard } from "../common/DataCard";
import { DataChip } from "../common/DataChip";
import { DetailField } from "../common/DetailField";
import { DetainContainer } from "../common/DetainContainer";
import { DetainItem } from "../common/DetainItem";
import { SpawnPointsByMap } from "../common/SpawnPointsByMap";
import { StyledContainer } from "../common/StyledContainer";
import { ApiRecipeCard } from "../recipe/ApiRecipeCard";
import { ApiShopCard, type ShopListView } from "../shop/ApiShopRenderers";
import { EventFilterSwitch, EventStatusChip, EventTypeChip, formatPeriod } from "./ApiEventRenderers";

/** Aviso de relação cortada: o agregado traz até 200 documentos por relação. */
function Shown({ page }: { page: ContentPage<unknown> }) {
  if (page.content.length >= page.total) return null;
  return (
    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
      Mostrando {page.content.length} de {page.total}.
    </Typography>
  );
}

/** Detalhe de evento, lido do agregado /events/{id}/details: tudo que pertence ao evento. */
export function EventDetailsPage() {
  const { gameId = "", eventId = "" } = useParams<{ gameId: string; eventId: string }>();
  const navigate = useNavigate();
  const { isMobile } = usePlatform();

  const details = useContentDetails<EventDocument, EventRelated>(gameId, "events", eventId);
  const rarities = useRarities(gameId);
  const references = useMemo(() => new ReferenceIndex(details.data?.references), [details.data]);
  const rarityMap = useMemo(() => new Map((rarities.data ?? []).map((rarity) => [rarity.code, rarity.color])), [rarities.data]);
  const shopView = useMemo<ShopListView>(() => ({ gameId, references }), [gameId, references]);

  if (details.isPending) {
    return (
      <StyledContainer title="Carregando..." label="Obtendo dados do evento">
        <Stack alignItems="center" sx={{ py: 10 }}>
          <CircularProgress color="primary" />
        </Stack>
      </StyledContainer>
    );
  }

  if (details.isError) {
    const unregistered = details.error instanceof ApiError && details.error.kind === "unregistered-content";
    return (
      <StyledContainer
        title={unregistered ? "Evento não cadastrado" : "Não foi possível abrir o evento"}
        label={unregistered ? `"${eventId}" é citado em outros conteúdos, mas ainda não foi cadastrado.` : details.error.message}
      >
        <Typography variant="body2" color="text.secondary">
          Verifique o código ou volte para a <Link to={`/game/${gameId}/events`}>lista de eventos</Link>.
        </Typography>
      </StyledContainer>
    );
  }

  const { document: event, related } = details.data;
  const bannerId = currentMedia(event.media, "banner");
  const rarityColor = (code: string) => rarityMap.get(code);
  const half = isMobile ? undefined : 6;

  return (
    <StyledContainer
      title={event.name}
      label={`Detalhes do evento ${event.extId}`}
      actionsStart={
        !isMobile ? (
          <Breadcrumbs separator={<NavigateNext fontSize="small" />}>
            <Link to={`/game/${gameId}`}>Dashboard</Link>
            <Link to={`/game/${gameId}/events`}>Eventos</Link>
            <Typography color="primary">{event.name}</Typography>
          </Breadcrumbs>
        ) : undefined
      }
      actionsEnd={<EventFilterSwitch eventId={event.extId} />}
    >
      <DetainContainer>
        <Paper elevation={0} sx={{ overflow: "hidden" }}>
          {bannerId && (
            <Box
              sx={{
                height: 140,
                backgroundImage: `url(${mediaUrl(bannerId, "thumb")})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            />
          )}
          <Stack alignItems="center" spacing={1} sx={{ p: 2 }}>
            <ContentChip target={{ kind: "event", extId: event.extId }} resolved={resolvedFrom("event", event)} size="extraLarge" disableLink />
            <Typography variant="h5" fontWeight={800} color="primary.main" textAlign="center">
              {event.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Código: {event.extId}
            </Typography>
            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap justifyContent="center">
              <EventTypeChip type={event.eventType} />
              <EventStatusChip event={event} />
            </Stack>
          </Stack>

          <Divider />

          <Stack spacing={2} sx={{ p: 2 }}>
            <DetailField label="Período">
              <Stack direction="row" spacing={1} alignItems="center">
                <AccessTime sx={{ fontSize: 16, color: "secondary.main" }} />
                <Typography variant="body2">{formatPeriod(event)}</Typography>
              </Stack>
            </DetailField>

            {(event.summary || event.description) && (
              <DetailField label="Descrição">
                {event.summary && <Typography variant="body2">{event.summary}</Typography>}
                {event.description && (
                  <Typography variant="body2" color="text.secondary">
                    {event.description}
                  </Typography>
                )}
              </DetailField>
            )}
          </Stack>
        </Paper>

        <DetainItem startIcon={<Inventory color="primary" />} label="Itens" count={related.items.total}>
          {related.items.content.length > 0 && (
            <>
              <ContentTiles kind="item" contents={related.items.content} rarityColor={rarityColor} />
              <Shown page={related.items} />
            </>
          )}
        </DetainItem>

        <DetainItem startIcon={<Bolt color="primary" />} label="Entidades" count={related.entities.total}>
          {related.entities.content.length > 0 && (
            <>
              <ContentTiles kind="entity" contents={related.entities.content} fallbackUsage="screenshot" rarityColor={rarityColor} />
              <Shown page={related.entities} />
            </>
          )}
        </DetainItem>

        <DetainItem startIcon={<Construction color="primary" />} label="Receitas" count={related.recipes.total}>
          {related.recipes.content.length > 0 && (
            <>
              <Grid container spacing={1}>
                {related.recipes.content.map((recipe) => (
                  <Grid size={{ xs: 12, lg: 6 }} key={recipe.extId}>
                    <ApiRecipeCard recipe={recipe} references={references} />
                  </Grid>
                ))}
              </Grid>
              <Shown page={related.recipes} />
            </>
          )}
        </DetainItem>

        <DetainItem size={half} startIcon={<Storefront color="primary" />} label="Lojas" count={related.shops.total}>
          {related.shops.content.length > 0 && (
            <Grid container spacing={1}>
              {related.shops.content.map((shop) => (
                <Grid size={{ xs: 6, md: 4 }} key={shop.extId}>
                  <ApiShopCard shop={shop} variant="compact" view={shopView} />
                </Grid>
              ))}
            </Grid>
          )}
        </DetainItem>

        <DetainItem size={half} startIcon={<Sell color="primary" />} label="Categorias de loja" count={related.shopCategories.total}>
          {related.shopCategories.content.length > 0 && (
            <Stack spacing={1}>
              {related.shopCategories.content.map((category) => (
                <DataCard
                  key={category.extId}
                  onClick={category.shop ? () => navigate(contentRoute(gameId, "shop", category.shop!)!) : undefined}
                  sx={{ p: 1.5, justifyContent: "space-between", gap: 2 }}
                >
                  <Stack sx={{ minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={700}>
                      {category.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {category.shop ? references.name({ kind: "shop", extId: category.shop }) : "Sem loja"}
                    </Typography>
                  </Stack>
                  <DataChip label={`${category.items.length} ${category.items.length === 1 ? "oferta" : "ofertas"}`} />
                </DataCard>
              ))}
            </Stack>
          )}
        </DetainItem>

        <DetainItem size={half} startIcon={<Category color="primary" />} label="Categorias" count={related.categories.total}>
          {related.categories.content.length > 0 && <ContentTiles kind="category" contents={related.categories.content} />}
        </DetainItem>

        <DetainItem
          size={half}
          startIcon={<AutoAwesomeMosaic color="primary" />}
          label="Coleções"
          count={related.collections.total + related.collectionGroups.total}
        >
          {(related.collections.content.length > 0 || related.collectionGroups.content.length > 0) && (
            <Stack spacing={1.5}>
              {related.collections.content.length > 0 && <ContentTiles kind="collection" contents={related.collections.content} />}
              {related.collectionGroups.content.length > 0 && (
                <ApiCollectionGroups groups={related.collectionGroups.content} references={references} />
              )}
            </Stack>
          )}
        </DetainItem>

        <DetainItem size={half} startIcon={<MapIcon color="primary" />} label="Mapas" count={related.maps.total}>
          {related.maps.content.length > 0 && <ContentTiles kind="map" contents={related.maps.content} />}
        </DetainItem>

        <DetainItem size={half} startIcon={<Cloud color="primary" />} label="Mapas com este clima" count={related.mapsWithWeather.total}>
          {related.mapsWithWeather.content.length > 0 && <ContentTiles kind="map" contents={related.mapsWithWeather.content} />}
        </DetainItem>

        <DetainItem size={half} startIcon={<Place color="primary" />} label="Locais" count={related.locations.total}>
          {related.locations.content.length > 0 && (
            <Stack spacing={1}>
              {related.locations.content.map((location) => (
                <DataCard
                  key={location.extId}
                  onClick={location.map ? () => navigate(contentRoute(gameId, "map", location.map!)!) : undefined}
                  sx={{ p: 1.5, justifyContent: "space-between", gap: 2 }}
                >
                  <Stack sx={{ minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={700}>
                      {location.name ?? location.extId}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {location.map ? references.name({ kind: "map", extId: location.map }) : "Sem mapa"}
                    </Typography>
                  </Stack>
                  {location.locationType && <DataChip label={location.locationType} />}
                </DataCard>
              ))}
              <Shown page={related.locations} />
            </Stack>
          )}
        </DetainItem>

        <DetainItem size={half} startIcon={<Explore color="primary" />} label="Pontos de spawn" count={related.spawnPoints.total}>
          {related.spawnPoints.content.length > 0 && (
            <>
              <SpawnPointsByMap points={related.spawnPoints.content} references={references} />
              <Shown page={related.spawnPoints} />
            </>
          )}
        </DetainItem>
      </DetainContainer>
    </StyledContainer>
  );
}
