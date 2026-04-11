import {
  Box,
  Typography,
  CircularProgress,
  FormControlLabel,
  Switch,
} from "@mui/material";
import { useParams, useNavigate } from "react-router-dom";
import { useState, useMemo, useEffect } from "react";
import { StyledContainer } from "../common/StyledContainer";
import { EntityCard } from "./EntityCard";
import { PickSelector } from "../common/PickSelector";
import { TriplePickSelector } from "../common/TriplePickSelector";
import type { TripleState } from "../common/TriplePickSelector";
import { FilterList, BugReport, ShoppingCart, Sell, Storefront } from "@mui/icons-material";
import { useApi } from "../../hooks/useApi";
import type { Entity, Shop } from "../../types/gameModels";
import { ListingDataView } from "../common/ListingDataView";
import { ViewModeSelector } from "../common/ViewModeSelector";
import { useViewMode } from "../../hooks/useViewMode";
import { ItemChip } from "../common/ItemChip";
import { Tooltip } from "@mui/material";
import { shopRepository } from "../../repositories/ShopRepository";

export function EntityPage() {
  const { gameId, category: urlCategory } = useParams<{
    gameId: string;
    category?: string;
  }>();
  const navigate = useNavigate();

  const {
    loading: dbLoading,
    error: errorApi,
    getEntityList,
  } = useApi(gameId);
  
  const [entities, setEntities] = useState<Entity[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useViewMode("entities");
  const [availableSubCategories, setAvailableSubCategories] = useState<
    string[]
  >([]);
  const [subCategoryStates, setSubCategoryStates] = useState<Record<string, TripleState>>({});
  const [showPrices, setShowPrices] = useState(false);

  useEffect(() => {
    if (dbLoading) return;

    let isMounted = true;
    setDataLoading(true);

    Promise.all([
      getEntityList(),
      shopRepository.getAll()
    ]).then(([results, allShops]) => {
      if (!isMounted) return;
      const list = Array.isArray(results) ? results : results.data;
      setEntities(list);
      setShops(allShops);
      setDataLoading(false);
    }).catch(err => {
      console.error("Error fetching entities data:", err);
      if (isMounted) setDataLoading(false);
    });

    return () => { isMounted = false; };
  }, [dbLoading, getEntityList]);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    entities.forEach((entity: Entity) => {
      const catsArr = Array.isArray(entity.category)
        ? entity.category
        : [entity.category];
      if (catsArr[0]) cats.add(catsArr[0]);
    });
    return Array.from(cats).sort();
  }, [entities]);

  // Update available sub-categories when primary category changes
  useEffect(() => {
    const cats = new Set<string>();
    const currentPrimary = urlCategory === "all" ? null : urlCategory;

    entities.forEach((entity: Entity) => {
      const catsArr = Array.isArray(entity.category)
        ? entity.category
        : [entity.category];
      const primary = catsArr[0];
      if (
        !currentPrimary ||
        (primary && primary.toLowerCase() === currentPrimary.toLowerCase())
      ) {
        if (catsArr.length > 1) {
          catsArr.slice(1).forEach((cat: string | undefined) => {
            if (cat) cats.add(cat);
          });
        }
      }
    });

    setAvailableSubCategories(Array.from(cats).sort());

    // Clean up states for categories that are no longer available
    setSubCategoryStates(prev => {
      const next = { ...prev };
      let changed = false;
      Object.keys(next).forEach(cat => {
        if (!cats.has(cat)) {
          delete next[cat];
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [entities, urlCategory]);

  const filteredEntities = useMemo(() => {
    let list = [...entities];

    // Apply primary category filter
    if (urlCategory && urlCategory !== "all") {
      list = list.filter(entity => {
        const cats = Array.isArray(entity.category) ? entity.category : [entity.category];
        return cats[0]?.toLowerCase() === urlCategory.toLowerCase();
      });
    }

    // Apply sub-category states
    Object.entries(subCategoryStates).forEach(([cat, state]) => {
      if (state === "indifferent") return;
      list = list.filter(entity => {
        const cats = Array.isArray(entity.category) ? entity.category : [entity.category || ""];
        const hasCat = cats.includes(cat);
        return state === "exclude" ? !hasCat : hasCat;
      });
    });

    // Apply search filter
    if (!searchTerm) return list;

    const lowerSearch = searchTerm.toLowerCase();
    return list.filter(
      (entity: Entity) =>
        entity.name.toLowerCase().includes(lowerSearch) ||
        entity.id.toLowerCase().includes(lowerSearch),
    );
  }, [entities, urlCategory, subCategoryStates, searchTerm]);

  const shopNPCIds = useMemo(() => {
    const ids = new Set<string>();
    shops.forEach((s: any) => {
      if (s.npcId) ids.add(s.npcId.toLowerCase());
    });
    return ids;
  }, [shops]);

  if (dbLoading || dataLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100%",
          width: "100%",
        }}
      >
        <CircularProgress color="primary" />
      </Box>
    );
  }

  if (errorApi) {
    return (
      <Box sx={{ p: 4, textAlign: "center" }}>
        <Typography color="error" variant="h6">
          Erro ao carregar entidades
        </Typography>
      </Box>
    );
  }

  const handleSubCategoryStateChange = (option: string, newState: TripleState) => {
    setSubCategoryStates(prev => ({
      ...prev,
      [option]: newState
    }));
  };

  return (
    <StyledContainer
      title={`${urlCategory && urlCategory !== "all" ? urlCategory.charAt(0).toUpperCase() + urlCategory.slice(1) : "Entidades"} de ${gameId}`}
      label="Explore e descubra todas as entidades do jogo."
      searchValue={searchTerm}
      onChangeSearch={setSearchTerm}
      search={{ placeholder: "Pesquisar entidades..." }}
      actionsStart={
        <>
          <PickSelector
            label="Categoria"
            value={urlCategory === "all" ? null : urlCategory || null}
            options={categories}
            onChange={(cat) => {
              navigate(`/game/${gameId}/entity/list/${cat || "all"}`);
            }}
            icon={<FilterList sx={{ fontSize: 18 }} />}
          />
          {availableSubCategories.length > 0 && (
            <TriplePickSelector
              label="Sub-categoria"
              states={subCategoryStates}
              options={availableSubCategories}
              onChange={handleSubCategoryStateChange}
              icon={<FilterList sx={{ fontSize: 18 }} />}
            />
          )}
        </>
      }
      actionsEnd={
        <>
          <FormControlLabel
            control={
              <Switch
                checked={showPrices}
                onChange={(e) => setShowPrices(e.target.checked)}
                color="primary"
                size="small"
              />
            }
            label={
              <Typography
                variant="body2"
                sx={{ color: "text.secondary", fontWeight: 600 }}
              >
                Mostrar Preços
              </Typography>
            }
            sx={{ ml: 1 }}
          />
          <ViewModeSelector mode={viewMode} onChange={setViewMode} />
        </>
      }
    >
      <ListingDataView
        data={filteredEntities}
        viewMode={viewMode}
        variant="compact"
        cardMinWidth={200}
        listHeader={[
          { label: "Entidade", width: "70%" },
          { label: "Preços", align: "right" as const, width: "30%", hidden: !showPrices },
        ]}
        emptyMessage="Nenhuma entidade encontrada neste filtro."
        renderCard={(entity: any, variant) => (
          <EntityCard
            key={entity.id}
            entity={entity}
            showPrices={showPrices}
            hasShop={shopNPCIds.has(entity.id.toLowerCase())}
            onClick={() => navigate(`/game/${gameId}/entity/view/${entity.id}`)}
            variant={variant}
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
              {entity.icon ? (
                <img
                  src={entity.icon}
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
            <Typography variant="body2" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
              {entity.name}
              {shopNPCIds.has(entity.id.toLowerCase()) && (
                <Tooltip title="NPC com Loja">
                  <Storefront sx={{ fontSize: 14, color: 'primary.main' }} />
                </Tooltip>
              )}
            </Typography>
          </Box>,
            <Box key={`entity_prices_${entity.id}`} sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
              {entity.buyPrice !== undefined && (
                <Tooltip title="Compra">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, backgroundColor: 'rgba(76, 175, 80, 0.1)', px: 1, borderRadius: 1, border: '1px solid rgba(76, 175, 80, 0.2)' }}>
                    <ShoppingCart sx={{ fontSize: 12, color: 'success.main' }} />
                    <ItemChip
                      id="ouro"
                      amount={entity.buyPrice}
                      size="small"
                      icon="/img/heartopia/stats/ouro.png"
                    />
                  </Box>
                </Tooltip>
              )}
              {entity.sellPrice !== undefined && (
                <Tooltip title="Venda">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, backgroundColor: 'rgba(255, 152, 0, 0.1)', px: 1, borderRadius: 1, border: '1px solid rgba(255, 152, 0, 0.2)' }}>
                    <Sell sx={{ fontSize: 12, color: 'warning.main' }} />
                    <ItemChip
                      id="ouro"
                      amount={entity.sellPrice}
                      size="small"
                      icon="/img/heartopia/stats/ouro.png"
                    />
                  </Box>
                </Tooltip>
              )}
            </Box>
        ]}
        renderIconItem={(entity: any) => (
          <Tooltip key={`entity_icon_${entity.id}`} title={`${entity.name} (${entity.id})`}>
            <Box
              onClick={() =>
                navigate(`/game/${gameId}/entity/view/${entity.id}`)
              }
              sx={{
                width: "100%",
                height: "100%",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                p: 1,
              }}
            >
              {entity.icon ? (
                <img
                  src={entity.icon}
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
    </StyledContainer>
  );
}
