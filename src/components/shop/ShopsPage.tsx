import { useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { CircularProgress, Stack, Typography } from "@mui/material";
import { ApiError } from "../../api/ApiError";
import { MAX_PAGE_SIZE, type ShopDocument } from "../../api/content";
import { ReferenceIndex } from "../../api/references";
import { useListing, useListingFilters } from "../../api/useContent";
import type { FilterValues } from "../../api/query";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { usePagination } from "../../hooks/usePagination";
import { usePlatform } from "../../hooks/usePlatform";
import { useViewMode } from "../../hooks/useViewMode";
import { ListingDataView } from "../common/ListingDataView";
import { ListingFilterBar } from "../common/ListingFilterBar";
import { StyledContainer } from "../common/StyledContainer";
import { ViewModeSelector } from "../common/ViewModeSelector";
import { ApiShopCard, ApiShopIcon, ShopPicker, shopListCells, type ShopListView } from "./ApiShopRenderers";
import { ShopsDetailsPage } from "./ShopsDetailsPage";

const NO_FILTERS: FilterValues = {};

/** Lojas: a lista ou, com o código na URL, a loja aberta. */
export function ShopsPage() {
  const { gameId = "", category: shopId } = useParams<{ gameId: string; category?: string }>();
  return shopId ? <ShopsDetailsPage key={shopId} gameId={gameId} shopId={shopId} /> : <ShopList gameId={gameId} />;
}

/** Lista de lojas, lida da API com o NPC de cada uma já resolvido. */
function ShopList({ gameId }: { gameId: string }) {
  const { isMobile } = usePlatform();
  const pages = usePagination(NO_FILTERS);
  const [viewMode, setViewMode] = useViewMode("shops");

  // A API devolve no máximo 200 por página.
  useEffect(() => {
    if (pages.info.pagination.pageSize > MAX_PAGE_SIZE) pages.setPageSize(MAX_PAGE_SIZE);
  }, [pages.info.pagination.pageSize, pages.setPageSize]);

  const search = useDebouncedValue(pages.info.search);
  const { criteria, pagination } = pages.info;

  const listing = useListingFilters(gameId, "shops");
  const shops = useListing<ShopDocument>(gameId, "shops", {
    search,
    values: criteria,
    page: pagination.page - 1,
    size: Math.min(pagination.pageSize, MAX_PAGE_SIZE),
    sort: "name",
    references: true,
  });
  const view = useMemo<ShopListView>(() => ({ gameId, references: new ReferenceIndex(shops.data?.references) }), [gameId, shops.data]);

  useEffect(() => {
    if (shops.data) pages.setTotalItems(shops.data.total);
  }, [shops.data, pages.setTotalItems]);

  return (
    <StyledContainer
      title={`Lojas de ${gameId}`}
      label="Visite os NPCs locais para comprar suprimentos e trocar recursos."
      searchValue={pages.info.search}
      onChangeSearch={pages.setSearch}
      search={{ placeholder: listing.data?.search.placeholder }}
      pages={pages}
      actionsStart={
        <Stack direction="row" spacing={1} justifyContent="space-between" flex={1} alignItems="center">
          <Stack direction="row" spacing={1} alignItems="center">
            <ShopPicker gameId={gameId} value={null} />
            <ListingFilterBar
              filters={listing.data?.filters}
              values={criteria}
              onChange={(key, value) => pages.setCriteria({ [key]: value })}
            />
          </Stack>
          <ViewModeSelector mode={viewMode} onChange={setViewMode} />
        </Stack>
      }
    >
      {shops.isPending ? (
        <Stack alignItems="center" justifyContent="center" sx={{ py: 10, flex: 1 }}>
          <CircularProgress color="primary" />
        </Stack>
      ) : shops.isError ? (
        <Stack alignItems="center" spacing={1} sx={{ p: 4, flex: 1 }}>
          <Typography color="error" variant="h6" sx={{ fontWeight: 700 }}>
            Não foi possível carregar as lojas.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {shops.error instanceof ApiError ? shops.error.message : "Erro inesperado."}
          </Typography>
        </Stack>
      ) : (
        <ListingDataView
          data={shops.data.content}
          viewMode={viewMode}
          variant="compact"
          cardMinWidth={200}
          listHeader={[
            { label: "Loja / NPC", width: "60%" },
            { label: "Código", width: "20%", hidden: isMobile },
            { label: "Reset", align: "right" as const, width: "20%" },
          ]}
          emptyMessage="Nenhuma loja encontrada com estes filtros."
          renderCard={(shop, variant) => <ApiShopCard shop={shop} variant={variant} view={view} />}
          renderListItem={(shop) => shopListCells(shop, view)}
          renderIconItem={(shop) => <ApiShopIcon shop={shop} view={view} />}
        />
      )}
    </StyledContainer>
  );
}
