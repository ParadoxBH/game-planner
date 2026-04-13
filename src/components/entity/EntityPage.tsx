import {
  Box,
  Typography,
  CircularProgress,
  FormControlLabel,
  Switch,
  Tooltip,
} from "@mui/material";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useState, useMemo, useEffect } from "react";
import { StyledContainer } from "../common/StyledContainer";
import { EntityCard } from "./EntityCard";
import { PickSelector } from "../common/PickSelector";
import { TriplePickSelector } from "../common/TriplePickSelector";
import type { TripleState } from "../common/TriplePickSelector";
import { FilterList, BugReport, ShoppingCart, Sell, Storefront } from "@mui/icons-material";
import { useApi } from "../../hooks/useApi";
import type { Entity, Shop, Category } from "../../types/gameModels";
import { ListingDataView } from "../common/ListingDataView";
import { ViewModeSelector } from "../common/ViewModeSelector";
import { useViewMode } from "../../hooks/useViewMode";
import { ItemChip } from "../common/ItemChip";
import { shopRepository } from "../../repositories/ShopRepository";
import { usePagination } from "../../hooks/usePagination";
import type { EntityCriteria } from "../../types/filterTypes";
import type { PaginatedResponse } from "../../types/apiModels";
import { getPublicUrl } from "../../utils/pathUtils";

export function EntityPage() {
  const { gameId, category: urlCategory } = useParams<{
    gameId: string;
    category?: string;
  }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const subCategoryParam = searchParams.get("subCategory");

  const {
    loading: dbLoading,
    error: errorApi,
    getEntityList,
    getEntityCategories,
    getEntitySubCategories,
  } = useApi(gameId);
  
  const [entitiesResponse, setEntitiesResponse] = useState<PaginatedResponse<Entity> | null>(null);
  const [shops, setShops] = useState<Shop[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [viewMode, setViewMode] = useViewMode("entities");
  const [showPrices, setShowPrices] = useState(false);
  const [allCategories, setAllCategories] = useState<(Category & { isPrimary: boolean })[]>([]);
  const [availableSubCategories, setAvailableSubCategories] = useState<string[]>([]);

  const pages = usePagination<EntityCriteria>({
    primaryCategory: urlCategory || "all",
    subCategoryStates: subCategoryParam ? { [subCategoryParam]: "include" } : {},
  });

  // Sync URL Category to filter
  useEffect(() => {
    pages.setCriteria({
      primaryCategory: urlCategory || "all",
      subCategoryStates: subCategoryParam ? { [subCategoryParam]: "include" } : {}
    });
  }, [urlCategory]);

  // Sync SubCategory from URL specifically (external links)
  useEffect(() => {
    if (subCategoryParam) {
      pages.setCriteria({
        subCategoryStates: { [subCategoryParam]: "include" }
      });
    }
  }, [subCategoryParam]);

  // Load static data (shops and categories)
  useEffect(() => {
    if (dbLoading) return;
    shopRepository.getAll().then(setShops);
    getEntityCategories().then(setAllCategories);
  }, [dbLoading, getEntityCategories]);

  // Load paginated entities
  useEffect(() => {
    if (dbLoading) return;

    let isMounted = true;
    setDataLoading(true);

    getEntityList(pages.info)
      .then((results) => {
        if (!isMounted) return;
        setEntitiesResponse(results);
        pages.setTotalItems(results.total);
        setDataLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching entities:", err);
        if (isMounted) setDataLoading(false);
      });

    return () => { isMounted = false; };
  }, [dbLoading, getEntityList, pages.info]);

  const entities = useMemo(() => entitiesResponse?.data || [], [entitiesResponse]);

  // Derive available sub-categories from all entities based ONLY on primary category
  useEffect(() => {
    if (dbLoading) return;
    
    getEntitySubCategories(urlCategory || "all")
      .then(setAvailableSubCategories)
      .catch(console.error);
  }, [dbLoading, urlCategory, getEntitySubCategories]);

  const shopNPCIds = useMemo(() => {
    const ids = new Set<string>();
    shops.forEach((s: any) => {
      if (s.npcId) ids.add(s.npcId.toLowerCase());
    });
    return ids;
  }, [shops]);

  const handleSubCategoryStateChange = (option: string, newState: TripleState) => {
    const nextSub = { ...pages.info.criteria.subCategoryStates, [option]: newState };
    pages.setCriteria({ subCategoryStates: nextSub });
  };

    const currentCategoryName = useMemo(() => {
    if (!urlCategory || urlCategory === "all") return "Entidades";
    const cat = allCategories.find(c => c.id === urlCategory);
    return cat?.name || urlCategory;
  }, [allCategories, urlCategory]);

  return (
    <StyledContainer
      title={`${currentCategoryName} de ${gameId}`}
      label="Explore e descubra todas as entidades do jogo."
      searchValue={pages.info.search}
      onChangeSearch={(val) => pages.setSearch(val)}
      search={{ placeholder: "Pesquisar entidades..." }}
      pages={pages}
      actionsStart={
        <>
          <PickSelector
            label="Categoria"
            value={urlCategory === "all" ? null : urlCategory || null}
            options={allCategories
              .filter(cat => cat.isPrimary)
              .map(cat => ({ value: cat.id, label: cat.name, icon: cat.icon }))
            }
            onChange={(cat) => {
              navigate(`/game/${gameId}/entity/list/${cat || "all"}`);
            }}
            icon={<FilterList sx={{ fontSize: 18 }} />}
          />
          {availableSubCategories.length > 0 && (
            <TriplePickSelector
              label="Sub-categoria"
              states={pages.info.criteria.subCategoryStates || {}}
              options={availableSubCategories.map(subId => {
                const catInfo = allCategories.find(c => c.id === subId);
                return {
                  value: subId,
                  label: catInfo?.name || subId,
                  icon: catInfo?.icon
                };
              })}
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
      {(dbLoading || dataLoading) ? (
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", py: 10, flex: 1 }}>
          <CircularProgress color="primary" />
        </Box>
      ) : errorApi ? (
        <Box sx={{ p: 4, textAlign: "center", flex: 1 }}>
          <Typography color="error" variant="h6" sx={{ fontWeight: 700 }}>
            Erro ao carregar entidades
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", mt: 1 }}>
            {errorApi}
          </Typography>
        </Box>
      ) : (
        <ListingDataView
          data={entities}
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
                      icon={getPublicUrl("/img/heartopia/stats/ouro.png")}
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
                      icon={getPublicUrl("/img/heartopia/stats/ouro.png")}
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
      )}
    </StyledContainer>
  );
}
