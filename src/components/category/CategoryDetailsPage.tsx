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
  Button,
  Tabs,
  Tab,
  Tooltip,
} from "@mui/material";
import {
  NavigateNext,
  Category as CategoryIcon,
  Inventory,
  Bolt,
  ArrowBack,
  BugReport,
} from "@mui/icons-material";
import { Link } from "react-router-dom";
import { useApi } from "../../hooks/useApi";
import { EntityCard } from "../entity/EntityCard";
import type { CategoryDetails } from "../../types/apiModels";
import { StyledContainer } from "../common/StyledContainer";
import { ListingDataView } from "../common/ListingDataView";
import { ViewModeSelector } from "../common/ViewModeSelector";
import { useViewMode } from "../../hooks/useViewMode";
import { usePagination } from "../../hooks/usePagination";
import { getPublicUrl } from "../../utils/pathUtils";
import {
  ItemCard,
  ItemList,
  ItemIcon,
  ItemRenderProvider,
} from "../item/ItemRenderers";

export function CategoryDetailsPage() {
  const { gameId, categoryId } = useParams<{
    gameId: string;
    categoryId: string;
  }>();
  const navigate = useNavigate();
  const { getCategoryDetails, getCategories, getGameInfo, loading: apiLoading } = useApi(gameId);

  const [details, setDetails] = useState<CategoryDetails | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [gameInfo, setGameInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useViewMode("category_details");
  const [activeTab, setActiveTab] = useState<"items" | "entities">("items");

  const itemsPages = usePagination({});
  const entitiesPages = usePagination({});

  useEffect(() => {
    if (gameId && categoryId) {
      setLoading(true);
      Promise.all([
        getCategoryDetails(categoryId),
        getCategories(),
        getGameInfo(gameId),
      ]).then(([data, allCats, info]) => {
        setDetails(data);
        if (allCats) setCategories(allCats);
        if (info) setGameInfo(info);
        setLoading(false);
      });
    }
  }, [gameId, categoryId, getCategoryDetails, getCategories, getGameInfo]);

  const categoriesMap = useMemo(() => {
    const map = new Map<string, any>();
    categories.forEach((cat) => map.set(cat.id.toLowerCase(), cat));
    return map;
  }, [categories]);

  const items = useMemo(() => details?.items || [], [details]);
  const entities = useMemo(() => details?.entities || [], [details]);

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

  if (!details) {
    return (
      <Container sx={{ mt: 10, textAlign: "center" }}>
        <Typography variant="h5" color="error">
          Categoria não encontrada: {categoryId}
        </Typography>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate(-1)}
          sx={{ mt: 2 }}
        >
          Voltar
        </Button>
      </Container>
    );
  }

  const { category } = details;

  return (
    <StyledContainer
      prefix={
        category.icon ? (
          <img
            src={category.icon}
            alt={category.name}
            style={{ height: 60, width: 60, objectFit: "contain" }}
          />
        ) : (
          <CategoryIcon sx={{ height: 60, width: 60, color: "primary.main" }} />
        )
      }
      title={category.name}
      label={category.description}
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
          <Typography color="text.primary">Categorias</Typography>
          <Typography color="primary" sx={{ fontWeight: 700 }}>
            {category.name}
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
        items.length > 0 ? (
          <Box sx={{ mb: 6 }}>
            <ItemRenderProvider value={{ gameId: gameId || "", navigate, gameInfo, categoriesMap }}>
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
                renderCard={ItemCard}
                renderListItem={ItemList}
                renderIconItem={ItemIcon}
              />
            </ItemRenderProvider>
          </Box>
        ) : (
          <Paper
            sx={{
              p: 4,
              textAlign: "center",
              backgroundColor: "rgba(255,255,255,0.02)",
            }}
          >
            <Typography color="text.secondary">
              Nenhum item encontrado para esta categoria.
            </Typography>
          </Paper>
        )
      ) : (
        entities.length > 0 ? (
          <Box sx={{ mb: 6 }}>
            <ListingDataView
              data={paginatedEntities}
              viewMode={viewMode}
              variant="compact"
              cardMinWidth={200}
              listHeader={[
                { label: "Entidade", width: "70%" },
                { label: "Categorias", width: "30%" },
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
                        color: entity.rarity && gameInfo?.rarity?.[entity.rarity]?.color ? gameInfo?.rarity?.[entity.rarity]?.color : "primary.main",
                      }
                    }}
                  >
                    {entity.name}
                  </Typography>
                </Box>,
                <Stack direction={"row"} spacing={1} key={`list_cats_entity_${entity.id}`}>
                  {(Array.isArray(entity.category) ? entity.category : [entity.category]).map((category: string) => (
                    <Paper key={`${entity.id}_category_${category}`} variant="outlined" sx={{ px: 1, py: 0.2, fontSize: "0.75rem" }}>
                      {category}
                    </Paper>
                  ))}
                </Stack>
              ]}
              renderIconItem={(entity: any) => (
                <Tooltip key={`entity_icon_${entity.id}`} title={entity.name}>
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
        ) : (
          <Paper
            sx={{
              p: 4,
              textAlign: "center",
              backgroundColor: "rgba(255,255,255,0.02)",
            }}
          >
            <Typography color="text.secondary">
              Nenhuma entidade encontrada para esta categoria.
            </Typography>
          </Paper>
        )
      )}
    </StyledContainer>
  );
}
