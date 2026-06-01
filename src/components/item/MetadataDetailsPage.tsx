import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Container,
  Typography,
  Box,
  Breadcrumbs,
  Link as MuiLink,
  CircularProgress,
  Paper,
  Stack,
  Chip,
  Tooltip,
  Tabs,
  Tab,
} from "@mui/material";
import {
  NavigateNext,
  Bookmarks,
  Inventory,
  Bolt,
  BugReport,
} from "@mui/icons-material";
import { Link } from "react-router-dom";
import { useApi } from "../../hooks/useApi";
import { EntityCard } from "../entity/EntityCard";
import {
  ItemCard,
  ItemList,
  ItemIcon,
  ItemRenderProvider,
} from "./ItemRenderers";
import { StyledContainer } from "../common/StyledContainer";
import { ListingDataView } from "../common/ListingDataView";
import { ViewModeSelector } from "../common/ViewModeSelector";
import { useViewMode } from "../../hooks/useViewMode";
import { usePagination } from "../../hooks/usePagination";
import { getPublicUrl } from "../../utils/pathUtils";
import type { Item, Entity, GameInfo, Category } from "../../types/gameModels";

export function MetadataDetailsPage() {
  const { gameId, type: metadataId = "" } = useParams<{
    gameId: string;
    type: string;
  }>();
  const navigate = useNavigate();
  const { getAllItems, getAllEntities, getGameInfo, getCategories, loading: apiLoading } = useApi(gameId);

  const [items, setItems] = useState<Item[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [gameInfo, setGameInfo] = useState<GameInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useViewMode("metadata_details");
  const [activeTab, setActiveTab] = useState<"items" | "entities">("items");

  const itemsPages = usePagination({});
  const entitiesPages = usePagination({});

  useEffect(() => {
    if (gameId && metadataId) {
      setLoading(true);
      Promise.all([
        getAllItems(),
        getAllEntities(),
        getGameInfo(gameId),
        getCategories(),
      ])
        .then(([allItems, allEntities, info, allCats]) => {
          if (info) setGameInfo(info);
          if (allCats) setCategories(allCats);

          // Filter items containing this metadata
          const filteredItems = allItems.filter((item) =>
            item.metadata?.some(
              (m) =>
                m.id?.toLowerCase() === metadataId.toLowerCase() ||
                m.type?.toLowerCase() === metadataId.toLowerCase()
            )
          );

          // Filter entities containing this metadata
          const filteredEntities = allEntities.filter((entity) =>
            (entity as any).metadata?.some(
              (m: any) =>
                m.id?.toLowerCase() === metadataId.toLowerCase() ||
                m.type?.toLowerCase() === metadataId.toLowerCase()
            )
          );

          setItems(filteredItems);
          setEntities(filteredEntities);
          setLoading(false);
        })
        .catch((err) => {
          console.error("Error loading metadata details:", err);
          setLoading(false);
        });
    }
  }, [gameId, metadataId, getAllItems, getAllEntities, getGameInfo, getCategories]);

  const categoriesMap = useMemo(() => {
    const map = new Map<string, Category>();
    categories.forEach(cat => {
      map.set(cat.id.toLowerCase(), cat);
    });
    return map;
  }, [categories]);

  const renderMetadataChip = (meta: any) => {
    const metaKey = (meta.type || meta.id).toLowerCase();
    const cat = categoriesMap.get(metaKey);
    const isCurrent = meta.id?.toLowerCase() === metadataId.toLowerCase() || meta.type?.toLowerCase() === metadataId.toLowerCase();
    const displayName = cat?.name || meta.type || meta.id;

    if (cat?.icon) {
      return (
        <Tooltip key={`${meta.id}`} title={`${displayName}: ${meta.value}`}>
          <Box
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/game/${gameId}/metadado/view/${meta.type || meta.id}`);
            }}
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: 0.5,
              px: 1,
              height: "20px",
              borderRadius: 1,
              cursor: "pointer",
              bgcolor: isCurrent ? "rgba(255, 255, 255, 0.02)" : "rgba(255, 255, 255, 0.05)",
              color: isCurrent ? "primary.main" : "text.primary",
              border: "1px solid",
              borderColor: isCurrent ? "primary.main" : "rgba(255, 255, 255, 0.1)",
              "&:hover": {
                bgcolor: isCurrent ? "rgba(255, 255, 255, 0.08)" : "rgba(255, 255, 255, 0.15)",
                borderColor: "primary.main"
              }
            }}
          >
            <img
              src={getPublicUrl(cat.icon)}
              alt={displayName}
              style={{ width: 14, height: 14, objectFit: "contain", imageRendering: "pixelated" }}
            />
            <Typography variant="caption" sx={{ fontSize: "0.7rem", fontWeight: 700 }}>
              {meta.value}
            </Typography>
          </Box>
        </Tooltip>
      );
    }
    return (
      <Tooltip key={`${meta.id}`} title={`Ver todos com ${displayName}`}>
        <Chip
          label={`${displayName}: ${meta.value}`}
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/game/${gameId}/metadado/view/${meta.type || meta.id}`);
          }}
          clickable
          variant={isCurrent ? "outlined" : "filled"}
          sx={{
            fontSize: "0.7rem",
            height: "20px",
            bgcolor: isCurrent ? "rgba(255, 255, 255, 0.02)" : "rgba(255, 255, 255, 0.05)",
            color: isCurrent ? "primary.main" : "text.primary",
            fontWeight: isCurrent ? 700 : 400,
            border: "1px solid",
            borderColor: isCurrent ? "primary.main" : "rgba(255, 255, 255, 0.1)",
            "& .MuiChip-label": { px: 1 },
            "&:hover": {
              bgcolor: isCurrent ? "rgba(255, 255, 255, 0.08)" : "rgba(255, 255, 255, 0.15)",
              borderColor: "primary.main"
            }
          }}
        />
      </Tooltip>
    );
  };

  const currentCategory = useMemo(() => {
    return categoriesMap.get(metadataId.toLowerCase());
  }, [categoriesMap, metadataId]);

  useEffect(() => {
    itemsPages.setTotalItems(items.length);
  }, [items, itemsPages]);

  useEffect(() => {
    entitiesPages.setTotalItems(entities.length);
  }, [entities, entitiesPages]);

  // Paginate items client-side
  const paginatedItems = useMemo(() => {
    const page = itemsPages.info.pagination.page;
    const pageSize = itemsPages.info.pagination.pageSize;
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, itemsPages.info.pagination.page, itemsPages.info.pagination.pageSize]);

  // Paginate entities client-side
  const paginatedEntities = useMemo(() => {
    const page = entitiesPages.info.pagination.page;
    const pageSize = entitiesPages.info.pagination.pageSize;
    const start = (page - 1) * pageSize;
    return entities.slice(start, start + pageSize);
  }, [entities, entitiesPages.info.pagination.page, entitiesPages.info.pagination.pageSize]);

  if (loading || apiLoading) {
    return (
      <Container sx={{ display: "flex", justifyContent: "center", mt: 10 }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <StyledContainer
      prefix={
        currentCategory?.icon ? (
          <img
            src={getPublicUrl(currentCategory.icon)}
            alt={currentCategory.name}
            style={{ height: 60, width: 60, objectFit: "contain", imageRendering: "pixelated" }}
          />
        ) : (
          <Bookmarks sx={{ height: 60, width: 60, color: "primary.main" }} />
        )
      }
      title={currentCategory ? currentCategory.name : `Metadado: ${metadataId}`}
      label={currentCategory?.description || `Itens e entidades que possuem o metadado "${metadataId}"`}
      pages={activeTab === "items" ? itemsPages : entitiesPages}
      actionsStart={
        <Breadcrumbs
          separator={<NavigateNext fontSize="small" />}
          sx={{ mb: 2 }}
        >
          <MuiLink
            component={Link}
            to={`/game/${gameId}`}
            underline="hover"
            color="inherit"
          >
            Dashboard
          </MuiLink>
          <MuiLink
            component={Link}
            to={`/game/${gameId}/items/list`}
            underline="hover"
            color="inherit"
          >
            Itens
          </MuiLink>
          <Typography color="primary" sx={{ fontWeight: 700 }}>
            Metadado: {currentCategory ? currentCategory.name : metadataId}
          </Typography>
        </Breadcrumbs>
      }
      actionsEnd={
        <Stack
          direction="row"
          spacing={2}
          sx={{ mt: 2, flex: 1, justifyContent: "flex-end", alignItems: "center" }}
        >
          <ViewModeSelector mode={viewMode} onChange={setViewMode} />
        </Stack>
      }
    >
      <Tabs
        value={activeTab}
        onChange={(_, val) => setActiveTab(val)}
        textColor="primary"
        indicatorColor="primary"
        sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}
      >
        <Tab icon={<Inventory />} iconPosition="start" label={`Itens (${items.length})`} value="items" />
        <Tab icon={<Bolt />} iconPosition="start" label={`Entidades (${entities.length})`} value="entities" />
      </Tabs>

      {activeTab === "items" ? (
        <Box sx={{ mb: 6 }}>
          <ItemRenderProvider value={{ gameId: gameId || "", navigate, gameInfo, categoriesMap, currentMetadataId: metadataId }}>
            <ListingDataView
              data={paginatedItems}
              viewMode={viewMode}
              variant="compact"
              cardMinWidth={200}
              listHeader={[
                { label: "Item", width: "30%" },
                { label: "Metadados", width: "45%" },
                { label: "Categorias", width: "25%" },
              ]}
              emptyMessage="Nenhum item encontrado."
              getRowColor={(item: any) => item.rarity && gameInfo?.rarity?.[item.rarity]?.color}
              renderCard={(item: any, variant) => {
                const meta = item.metadata?.find(
                  (m: any) =>
                    m.id?.toLowerCase() === metadataId.toLowerCase() ||
                    m.type?.toLowerCase() === metadataId.toLowerCase()
                );
                return ItemCard(
                  item,
                  variant,
                  meta && (
                    <Box sx={{ display: "flex", gap: 0.5, mt: 1 }}>
                      {renderMetadataChip(meta)}
                    </Box>
                  )
                );
              }}
              renderListItem={ItemList}
              renderIconItem={ItemIcon}
            />
          </ItemRenderProvider>
        </Box>
      ) : (
        <Box sx={{ mb: 6 }}>
          <ListingDataView
            data={paginatedEntities}
            viewMode={viewMode}
            variant="compact"
            cardMinWidth={200}
            listHeader={[
              { label: "Entidade", width: "30%" },
              { label: "Metadados", width: "45%" },
              { label: "Categorias", width: "25%" },
            ]}
            emptyMessage="Nenhuma entidade encontrada."
            getRowColor={(entity: any) => entity.rarity && gameInfo?.rarity?.[entity.rarity]?.color}
            renderCard={(entity: any, variant) => (
              <EntityCard
                key={entity.id}
                entity={entity}
                onClick={() => navigate(`/game/${gameId}/entity/view/${entity.id}`)}
                variant={variant}
                rarityColor={entity.rarity && gameInfo?.rarity?.[entity.rarity]?.color}
              />
            )}
            renderListItem={(entity: any) => [
              <Box
                key={`entity_list_${entity.id}`}
                onClick={() => navigate(`/game/${gameId}/entity/view/${entity.id}`)}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                  cursor: "pointer",
                }}
              >
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: 0.5,
                    backgroundColor: "rgba(0,0,0,0.2)",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    flexShrink: 0,
                  }}
                >
                  {entity.image || entity.icon ? (
                    <img
                      src={getPublicUrl(entity.image || entity.icon!)}
                      alt={entity.name}
                      style={{
                        width: "80%",
                        height: "80%",
                        objectFit: "contain",
                      }}
                    />
                  ) : (
                    <BugReport
                      sx={{ fontSize: 16, color: "rgba(255, 255, 255, 0.2)" }}
                    />
                  )}
                </Box>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    fontWeight: 700, 
                    color: entity.rarity && gameInfo?.rarity?.[entity.rarity]?.color ? gameInfo?.rarity?.[entity.rarity]?.color : "text.primary",
                    transition: "all 0.2s",
                    "&:hover": {
                      color: entity.rarity && gameInfo?.rarity?.[entity.rarity]?.color ? entity.rarity && gameInfo?.rarity?.[entity.rarity]?.color : "primary.main",
                    }
                  }}
                >
                  {entity.name}
                </Typography>
              </Box>,
              <Box key={`val_entity_${entity.id}`}>
                {(entity as any).metadata && (entity as any).metadata.length > 0 ? (
                  <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                    {(entity as any).metadata.map((meta: any) => renderMetadataChip(meta))}
                  </Stack>
                ) : (
                  <Typography variant="caption" sx={{ color: "text.disabled", fontStyle: "italic" }}>
                    -
                  </Typography>
                )}
              </Box>,
              <Stack direction={"row"} spacing={1} key={`list_cats_entity_${entity.id}`}>
                {(Array.isArray(entity.category) ? entity.category : [entity.category]).filter(Boolean).map((catId: string) => {
                  const cat = categoriesMap.get(catId.toLowerCase());
                  const displayName = cat?.name || catId;
                  return (
                    <Chip
                      key={`${entity.id}_category_${catId}`}
                      label={displayName}
                      size="small"
                      avatar={cat?.icon ? <img src={getPublicUrl(cat.icon)} style={{ width: 16, height: 16, objectFit: "contain", borderRadius: "50%", imageRendering: "pixelated" }} /> : undefined}
                      onClick={() => navigate(`/game/${gameId}/categories/view/${catId}`)}
                      clickable
                      sx={{
                        fontSize: "0.75rem",
                        height: "22px",
                        cursor: "pointer",
                      }}
                    />
                  );
                })}
              </Stack>
            ]}
            renderIconItem={(entity: any) => (
              <Tooltip key={`entity_icon_${entity.id}`} title={`${entity.name}: ${(entity as any).metadata?.find((m: any) => m.id?.toLowerCase() === metadataId.toLowerCase() || m.type?.toLowerCase() === metadataId.toLowerCase())?.value}`}>
                <Box
                  onClick={() => navigate(`/game/${gameId}/entity/view/${entity.id}`)}
                  sx={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    p: 1,
                  }}
                >
                  {entity.image || entity.icon ? (
                    <img
                      src={getPublicUrl(entity.image || entity.icon!)}
                      alt={entity.name}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                      }}
                    />
                  ) : (
                    <BugReport
                      sx={{ fontSize: 32, color: "rgba(255, 255, 255, 0.2)" }}
                    />
                  )}
                </Box>
              </Tooltip>
            )}
          />
        </Box>
      )}
    </StyledContainer>
  );
}
