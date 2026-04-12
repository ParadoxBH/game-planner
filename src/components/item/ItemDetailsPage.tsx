import { useParams, Link, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Grid,
  Paper,
  Stack,
  Divider,
  Breadcrumbs,
} from "@mui/material";
import {
  NavigateNext,
  Storefront,
  Bolt,
  Construction,
  Architecture,
  Bookmarks,
  AutoAwesomeMosaic,
} from "@mui/icons-material";
import { useApi } from "../../hooks/useApi";
import { StyledContainer } from "../common/StyledContainer";
import { ItemChip } from "../common/ItemChip";
import { RecipeCard } from "../recipe/RecipeCard";
import { DataCard } from "../common/DataCard";
import { ItemCard } from "./ItemCard";
import { ItemShopCard } from "../shop/ItemShopCard";
import { ItemFlowSection } from "./ItemFlowSection";
import { useMemo, useState, useEffect } from "react";
import type { GameDataTypes, Conjunto, GameEvent, Item, Entity } from "../../types/gameModels";
import type { ItemDetails } from "../../types/apiModels";
import { eventRepository } from "../../repositories/EventRepository";
import { itemRepository } from "../../repositories/ItemRepository";
import { entityRepository } from "../../repositories/EntityRepository";
import { conjuntoRepository } from "../../repositories/ConjuntoRepository";

export function ItemDetailsPage() {
  const { gameId, itemId = "" } = useParams<{
    gameId: string;
    itemId: string;
  }>();
  const navigate = useNavigate();

  const { loading: dbLoading, getItemDetails } = useApi(gameId);
  const [itemDetails, setItemDetails] = useState<ItemDetails | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [itemConjuntos, setItemConjuntos] = useState<Conjunto[]>([]);

  useEffect(() => {
    if (dbLoading) return;

    let isMounted = true;
    setDataLoading(true);

    Promise.all([
      getItemDetails(itemId),
      eventRepository.getAll(),
      itemRepository.getAll(),
      entityRepository.getAll(),
      conjuntoRepository.getAll()
    ]).then(([details, allEvents, allItems, allEntities, allConjuntos]) => {
      if (!isMounted) return;
      
      setItemDetails(details);
      setEvents(allEvents);
      setItems(allItems);
      setEntities(allEntities);
      setItemConjuntos(allConjuntos.filter(c => c.items?.includes(itemId)));
      
      setDataLoading(false);
    }).catch(err => {
      console.error("Error fetching item details:", err);
      if (isMounted) setDataLoading(false);
    });

    return () => { isMounted = false; };
  }, [dbLoading, itemId, getItemDetails]);

  const eventsMap = useMemo(() => {
    const map = new Map<string, string>();
    events.forEach((e) => map.set(e.id, e.name));
    return map;
  }, [events]);

  const itemsMap = useMemo(() => {
    const map = new Map<string, any>();
    items.forEach((i) => map.set(i.id, i));
    return map;
  }, [items]);

  const entitiesMap = useMemo(() => {
    const map = new Map<string, any>();
    entities.forEach((e) => map.set(e.id, e));
    return map;
  }, [entities]);

  const getSourceData = (type: GameDataTypes | undefined, id: string): any => {
    if (type === "entity") return entitiesMap.get(id);
    return itemsMap.get(id);
  };

  if (dbLoading || dataLoading) {
    return (
      <StyledContainer title="Carregando..." label="Obtendo dados do jogo">
        <Typography>Por favor, aguarde...</Typography>
      </StyledContainer>
    );
  }

  if (!itemDetails) {
    return (
      <StyledContainer
        title="Item não encontrado"
        label="O item solicitado não existe no banco de dados."
      >
        <Typography>Verifique o ID ou retorne à lista de itens.</Typography>
      </StyledContainer>
    );
  }

  const { item, productionRecipes, usagesAsIngredient, dropsFrom, soldIn } =
    itemDetails;
  const sizeItemCard = 300;

  return (
    <StyledContainer
      title={item.name}
      label={`Detalhes e origens do item ${item.id}`}
      actionsStart={
        <Box>
          <Breadcrumbs separator={<NavigateNext fontSize="small" />}>
            <Link
              to={`/game/${gameId}`}
              style={{ color: "inherit", textDecoration: "none" }}
            >
              Dashboard
            </Link>
            <Link
              to={`/game/${gameId}/items/list`}
              style={{ color: "inherit", textDecoration: "none" }}
            >
              Itens
            </Link>
            <Typography color="primary">{item.name}</Typography>
          </Breadcrumbs>
        </Box>
      }
    >
      <Stack direction={"row"} spacing={4} flex={1} overflow={"hidden"}>
        <Stack
          spacing={2}
          sx={{
            overflowY: "auto",
            overflowX: "hidden",
            maxWidth: sizeItemCard,
            minWidth: sizeItemCard,
          }}
        >
          <Paper elevation={0} sx={{ p: 2, textAlign: "center" }}>
            <Box sx={{ display: "flex", justifyContent: "center" }}>
              <ItemChip id={item.id} icon={item.icon} size="extraLarge" level={item.level} />
            </Box>
            <Typography variant="h5" fontWeight={800} color="primary.main">
              {item.name}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block" }}
            >
              ID: {item.id}
            </Typography>
            <Divider sx={{ my: 2 }} />
            <Stack spacing={1} textAlign="left">
              <Box>
                <Typography variant="subtitle2" color="rgba(255,255,255,0.5)">
                  CATEGORIA
                </Typography>
                <Typography variant="body2">
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {Array.isArray(item.category)
                    ? item.category.map(cat => <ItemChip key={cat} id={cat} type="category" size="small" />)
                    : item.category ? <ItemChip id={item.category} type="category" size="small" /> : "N/A"}
                </Box>
                </Typography>
              </Box>
              {item.description && (
                <Box>
                  <Typography variant="subtitle2" color="rgba(255,255,255,0.5)">
                    DESCRIÇÃO
                  </Typography>
                  <Typography variant="body2">{item.description}</Typography>
                </Box>
              )}

              {(item.buyPrice !== undefined ||
                item.sellPrice !== undefined) && (
                <Box
                  sx={{
                    mt: 1,
                    p: 1.5,
                    bgcolor: "rgba(255,255,255,0.03)",
                    borderRadius: 2,
                    border: "1px solid rgba(255,255,255,0.05)",
                  }}
                >
                  <Stack spacing={1}>
                    {item.buyPrice !== undefined && (
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <Typography
                          variant="caption"
                          sx={{ color: "text.secondary", fontWeight: 700 }}
                        >
                          PREÇO COMPRA
                        </Typography>
                        <Stack
                          direction="row"
                          spacing={0.5}
                          alignItems="center"
                        >
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: 800, color: "#ffbb00" }}
                          >
                            {item.buyPrice.toLocaleString()}
                          </Typography>
                          {itemsMap.get("ouro")?.icon && (
                            <img
                              src={itemsMap.get("ouro").icon}
                              style={{ width: 14, height: 14 }}
                            />
                          )}
                        </Stack>
                      </Box>
                    )}
                    {item.sellPrice !== undefined && (
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <Typography
                          variant="caption"
                          sx={{ color: "text.secondary", fontWeight: 700 }}
                        >
                          VALOR VENDA
                        </Typography>
                        <Stack
                          direction="row"
                          spacing={0.5}
                          alignItems="center"
                        >
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: 800, color: "#ffbb00" }}
                          >
                            {item.sellPrice.toLocaleString()}
                          </Typography>
                          {itemsMap.get("ouro")?.icon && (
                            <img
                              src={itemsMap.get("ouro").icon}
                              style={{ width: 14, height: 14 }}
                            />
                          )}
                        </Stack>
                      </Box>
                    )}
                  </Stack>
                </Box>
              )}
              {/* Conjuntos */}
              {itemConjuntos.length > 0 && (
                <Paper elevation={0} sx={{ p: 2, borderRadius: 2 }}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                    <AutoAwesomeMosaic color="primary" sx={{ fontSize: 18 }} />
                    <Typography variant="subtitle2" fontWeight={800}>Parte de Conjuntos</Typography>
                  </Stack>
                  <Stack spacing={1}>
                    {itemConjuntos.map((conjunto) => (
                      <DataCard
                        key={conjunto.id}
                        onClick={() => navigate(`/game/${gameId}/conjuntos/${conjunto.category}`)}
                        sx={{
                          p: 1.5,
                          "&:hover": {
                            backgroundColor: "rgba(255, 68, 0, 0.1)",
                          },
                        }}
                      >
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                            {conjunto.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {conjunto.category}
                          </Typography>
                        </Box>
                      </DataCard>
                    ))}
                  </Stack>
                </Paper>
              )}
            </Stack>
          </Paper>
        </Stack>
        <Stack spacing={2} overflow={"auto"} flex={1}>
          {/* Variações */}
          {item.variants && item.variants.length > 0 && (
            <Paper elevation={0} sx={{ p: 2 }}>
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                sx={{ mb: 2 }}
              >
                <Bookmarks color="primary" />
                <Typography variant="h6" fontWeight={700}>
                  Variações
                </Typography>
              </Stack>
              <Grid container spacing={1}>
                {[item, ...item.variants.map(v => ({ ...item, ...v }))].map((v, idx) => (
                  <Grid size={{ xs: 6, sm: 4, md: 3, lg: 2 }} key={idx}>
                    <ItemCard 
                      item={v as any} 
                      gameId={gameId || ""} 
                      variant="compact" 
                    />
                  </Grid>
                ))}
              </Grid>
            </Paper>
          )}

          {/* Produzido Em */}
          <Paper elevation={0} sx={{ p: 2 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Construction color="primary" />
              <Typography variant="h6" fontWeight={700}>
                Produção (Receitas)
              </Typography>
            </Stack>
            {productionRecipes && productionRecipes.length > 0 ? (
              <Grid container spacing={2}>
                {productionRecipes.map((recipe) => (
                  <Grid size={{ xs: 12, lg: 6 }} key={recipe.id}>
                    <RecipeCard
                      id={recipe.id}
                      name={recipe.normalizedName}
                      stations={recipe.normalizedStations}
                      ingredients={recipe.normalizedIngredients}
                      products={recipe.normalizedProducts}
                      unlock={recipe.unlock}
                      getSourceData={getSourceData}
                      eventsMap={eventsMap}
                    />
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Nenhuma receita de produção encontrada.
              </Typography>
            )}
          </Paper>

          {/* Utilizado Como Ingrediente */}
          <Paper elevation={0} sx={{ p: 2 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Architecture color="primary" />
              <Typography variant="h6" fontWeight={700}>
                Utilizado em
              </Typography>
            </Stack>
            {usagesAsIngredient && usagesAsIngredient.length > 0 ? (
              <Grid container spacing={2}>
                {usagesAsIngredient.map((recipe) => (
                  <Grid size={{ xs: 12, lg: 6 }} key={recipe.id}>
                    <RecipeCard
                      id={recipe.id}
                      name={recipe.normalizedName}
                      stations={recipe.normalizedStations}
                      ingredients={recipe.normalizedIngredients}
                      products={recipe.normalizedProducts}
                      unlock={recipe.unlock}
                      getSourceData={getSourceData}
                      eventsMap={eventsMap}
                    />
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Não é utilizado como ingrediente em nenhuma receita.
              </Typography>
            )}
          </Paper>

          {/* Fontes: Drops e Lojas */}
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Paper elevation={0} sx={{ p: 2, height: "100%" }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Bolt color="primary" />
                  <Typography variant="h6" fontWeight={700}>
                    Drops
                  </Typography>
                </Stack>
                {dropsFrom && dropsFrom.length > 0 ? (
                  <Stack spacing={1.5}>
                    {dropsFrom.map((e) => (
                      <Box
                        key={e.id}
                        sx={{
                          p: 1.5,
                          backgroundColor: "rgba(255,255,255,0.02)",
                          borderRadius: 2,
                          border: "1px solid rgba(255,255,255,0.05)",
                          display: "flex",
                          alignItems: "center",
                          gap: 2,
                        }}
                      >
                        <Box
                          sx={{
                            width: 40,
                            height: 40,
                            borderRadius: 1,
                            bgcolor: "rgba(255,255,255,0.05)",
                            p: 0.5,
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                          }}
                        >
                          {e.icon ? (
                            <img
                              src={e.icon}
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "contain",
                              }}
                            />
                          ) : (
                            <Bolt sx={{ opacity: 0.2 }} />
                          )}
                        </Box>
                        <Typography variant="body2" fontWeight={700}>
                          {e.name}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Não dropa de nenhuma entidade conhecida.
                  </Typography>
                )}
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Paper elevation={0} sx={{ p: 2, height: "100%" }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Storefront color="primary" />
                  <Typography variant="h6" fontWeight={700}>
                    Vendido em
                  </Typography>
                </Stack>
                {soldIn && soldIn.length > 0 ? (
                  <Grid container spacing={2}>
                    {soldIn.map((s, idx) => (
                      <Grid size={{ xs: 12 }} key={`${s.shop.id}-${idx}`}>
                        <ItemShopCard
                          shop={s.shop}
                          shopItem={s.shopItem}
                          npc={entitiesMap.get(s.shop.npcId)}
                          currencyItem={itemsMap.get(
                            s.shopItem.currency || "ouro",
                          )}
                          itemsMap={itemsMap}
                          entitiesMap={entitiesMap}
                          eventsMap={
                            new Map(
                              events?.map((e) => [
                                e.id,
                                { name: e.name },
                              ]) || [],
                            )
                          }
                          onClick={() =>
                            navigate(`/game/${gameId}/shops/list/${s.shop.id}`)
                          }
                        />
                      </Grid>
                    ))}
                  </Grid>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Não é vendido em nenhuma loja conhecida.
                  </Typography>
                )}
              </Paper>
            </Grid>
          </Grid>
          {/* Visual Flow Section */}
          <Paper
            elevation={0}
            sx={{
              p: 2,
              height: 400,
              minHeight: 400,
              position: "relative",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Stack direction="row" spacing={1} alignItems="center">
              <Bookmarks color="primary" />
              <Typography variant="h6" fontWeight={700}>
                Visão Geral
              </Typography>
            </Stack>
            <ItemFlowSection
              item={item}
              productionRecipes={productionRecipes}
              usagesAsIngredient={usagesAsIngredient}
              dropsFrom={dropsFrom}
              soldIn={soldIn}
              itemsMap={itemsMap}
              entitiesMap={entitiesMap}
              eventsMap={eventsMap}
              getSourceData={getSourceData}
            />
          </Paper>
        </Stack>
      </Stack>
    </StyledContainer>
  );
}
