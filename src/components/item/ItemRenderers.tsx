import { Box, Typography, Stack, Chip, Tooltip, Card, type SxProps } from "@mui/material";
import { Inventory, ShoppingCart, Sell } from "@mui/icons-material";
import { getPublicUrl } from "../../utils/pathUtils";
import { ItemChip } from "../common/ItemChip";
import { createContext, useContext, type ReactNode } from "react";

// Context for standardizing render parameters
export interface ItemRenderContextProps {
  gameId: string;
  navigate: any;
  gameInfo?: any;
  categoriesMap?: Map<string, any>;
  showPrices?: boolean;
  currentMetadataId?: string;
}

export const ItemRenderContext = createContext<ItemRenderContextProps | null>(null);

export const useItemRender = () => {
  const ctx = useContext(ItemRenderContext);
  if (!ctx) {
    throw new Error("useItemRender must be used within an ItemRenderProvider");
  }
  return ctx;
};

export const ItemRenderProvider = ItemRenderContext.Provider;

// ----------------------------------------------------
// CARD COMPONENT
// ----------------------------------------------------

interface CardComponentProps {
  item: any;
  variant: "default" | "compact";
  children?: ReactNode;
}

function CardComponent({ item, variant, children }: CardComponentProps) {
  const { gameId, navigate, gameInfo, showPrices } = useItemRender();
  const rarityColor = item.rarity && gameInfo?.rarity?.[item.rarity]?.color;

  return (
    <Card
      sx={{
        backgroundColor: rarityColor ? `${rarityColor}11` : "rgba(255, 255, 255, 0.02)",
        background: rarityColor ? `linear-gradient(135deg, rgba(255, 255, 255, 0.02) 0%, ${rarityColor}22 100%)` : undefined,
        backdropFilter: "blur(16px)",
        borderRadius: 1,
        border: 1,
        borderColor: rarityColor || "divider",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        "&:hover": {
          transform: "translateY(-6px)",
          backgroundColor: rarityColor ? `${rarityColor}22` : "rgba(255, 255, 255, 0.04)",
          borderColor: rarityColor ? rarityColor : "rgba(255, 255, 255, 0.15)",
          boxShadow: rarityColor ? `0 8px 32px ${rarityColor}44` : "0 8px 32px rgba(0,0,0,0.4)",
        }
      }}
    >
      <Stack
        sx={{
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "stretch",
          cursor: "auto",
        }}
      >
        {variant === "compact" ? (
          <Box
            sx={{
              p: 2,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 1.5,
              textAlign: "center",
            }}
          >
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: 1,
                backgroundColor: "rgba(0,0,0,0.2)",
                border: 1,
                borderColor: "divider",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                overflow: "hidden",
                position: "relative",
                cursor: "pointer",
              }}
              onClick={() => navigate(`/game/${gameId}/items/view/${item.id}`)}
            >
              {item.icon ? (
                <img
                  src={getPublicUrl(item.icon)}
                  alt={item.name}
                  style={{
                    width: "80%",
                    height: "80%",
                    objectFit: "contain",
                    imageRendering: "pixelated",
                  }}
                />
              ) : (
                <Inventory
                  sx={{ fontSize: 32, color: "rgba(255, 255, 255, 0.2)" }}
                />
              )}
              {item.level !== undefined && item.level > 0 && (
                <Box
                  sx={{
                    position: "absolute",
                    top: 4,
                    left: 4,
                    backgroundColor: "warning.main",
                    color: "warning.contrastText",
                    borderRadius: "4px",
                    px: 0.5,
                    minWidth: 16,
                    height: 16,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.65rem",
                    fontWeight: 800,
                    boxShadow: 2,
                    zIndex: 1,
                  }}
                >
                  {item.level}
                </Box>
              )}
            </Box>
            <Typography
              variant="subtitle2"
              sx={{
                color: rarityColor || "text.primary",
                fontWeight: 700,
                lineHeight: 1.2,
                height: "2.4em",
                overflow: "hidden",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
              }}
            >
              {item.name}
            </Typography>
            {children && (
              <Box sx={{ mt: 1 }}>
                {children}
              </Box>
            )}
          </Box>
        ) : (
          <>
            <Box
              sx={{
                p: 2,
                display: "flex",
                position: "relative",
                alignItems: "center",
                gap: 2,
                cursor: "pointer",
              }}
              onClick={() => navigate(`/game/${gameId}/items/view/${item.id}`)}
            >
              <Box
                sx={{
                  width: 64,
                  height: 64,
                  borderRadius: 1,
                  backgroundColor: "rgba(0,0,0,0.2)",
                  border: 1,
                  borderColor: "divider",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  overflow: "hidden",
                  flexShrink: 0,
                }}
              >
                {item.icon ? (
                  <img
                    src={getPublicUrl(item.icon)}
                    alt={item.name}
                    style={{
                      width: "80%",
                      height: "80%",
                      objectFit: "contain",
                      imageRendering: "pixelated",
                    }}
                  />
                ) : (
                  <Inventory
                    sx={{ fontSize: 32, color: "rgba(255, 255, 255, 0.2)" }}
                  />
                )}
                {item.level !== undefined && item.level > 0 && (
                  <Box
                    sx={{
                      position: "absolute",
                      top: 2,
                      left: 2,
                      backgroundColor: "warning.main",
                      color: "warning.contrastText",
                      borderRadius: "4px",
                      px: 0.5,
                      minWidth: 16,
                      height: 16,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.65rem",
                      fontWeight: 800,
                      boxShadow: 2,
                      zIndex: 1,
                  }}
                  >
                    {item.level}
                  </Box>
                )}
              </Box>
              <Box>
                <Stack
                  direction="row"
                  spacing={0.5}
                  sx={{ mb: 0.5, flexWrap: "wrap" }}
                >
                  {(Array.isArray(item.category)
                    ? item.category
                    : [item.category]
                  )
                    .filter((cat): cat is string => !!cat)
                    .map((cat: string) => (
                      <Typography
                        key={cat}
                        variant="subtitle2"
                        sx={{
                          color: "primary.main",
                          fontSize: "0.6rem",
                          fontWeight: 700,
                          textTransform: "uppercase",
                        }}
                      >
                        #{cat}
                      </Typography>
                    ))}
                </Stack>
                <Typography
                  variant="h6"
                  sx={{
                    color: "text.primary",
                    fontWeight: 700,
                    lineHeight: 1.2,
                  }}
                >
                  {item.name}
                </Typography>
                {children && (
                  <Box sx={{ mt: 1 }}>
                    {children}
                  </Box>
                )}
              </Box>
            </Box>
            <Stack sx={{ px: 2, pb: 2 }}>
              <Typography
                variant="body2"
                sx={{
                  color: "rgba(255, 255, 255, 0.5)",
                  mb: 2,
                  display: "-webkit-box",
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {item.description ||
                  "Nenhuma descrição disponível para este item."}
              </Typography>
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                justifyContent="space-between"
              >
                <Tooltip title="ID do Item">
                  <Chip
                    size="small"
                    label={item.id}
                    sx={{
                      backgroundColor: "rgba(255, 255, 255, 0.03)",
                      color: "text.disabled",
                      fontSize: "0.6rem",
                      fontFamily: "monospace",
                      borderRadius: 0.5,
                    }}
                  />
                </Tooltip>

                {showPrices &&
                  (item.sellPrice !== undefined ||
                    item.buyPrice !== undefined) && (
                    <Stack direction="row" spacing={0.5}>
                      {item.buyPrice !== undefined && (
                        <Tooltip title="Preço de Compra">
                          <Stack
                            direction="row"
                            spacing={0.5}
                            alignItems="center"
                            sx={{
                              backgroundColor: "rgba(76, 175, 80, 0.05)",
                              px: 0.5,
                              borderRadius: 0.5,
                              border: "1px solid rgba(76, 175, 80, 0.1)",
                            }}
                          >
                            <ShoppingCart
                              sx={{ fontSize: 12, color: "success.main" }}
                            />
                            <ItemChip
                              id="ouro"
                              amount={item.buyPrice}
                              size="small"
                              icon={getPublicUrl("/img/heartopia/stats/ouro.png")}
                            />
                          </Stack>
                        </Tooltip>
                      )}
                      {item.sellPrice !== undefined && (
                        <Tooltip title="Preço de Venda">
                          <Stack
                            direction="row"
                            spacing={0.5}
                            alignItems="center"
                            sx={{
                              backgroundColor: "rgba(255, 152, 0, 0.05)",
                              px: 0.5,
                              borderRadius: 0.5,
                              border: "1px solid rgba(255, 152, 0, 0.1)",
                            }}
                          >
                            <Sell
                              sx={{ fontSize: 12, color: "warning.main" }}
                            />
                            <ItemChip
                              id="ouro"
                              amount={item.sellPrice}
                              size="small"
                              icon={getPublicUrl("/img/heartopia/stats/ouro.png")}
                            />
                          </Stack>
                        </Tooltip>
                      )}
                    </Stack>
                  )}
              </Stack>
            </Stack>
          </>
        )}
      </Stack>
    </Card>
  );
}

// ----------------------------------------------------
// LIST CELL COMPONENTS
// ----------------------------------------------------

function ItemNameCell({ item }: { item: any }) {
  const { gameId, navigate, gameInfo } = useItemRender();
  const rarityColor = item.rarity && gameInfo?.rarity?.[item.rarity]?.color;
  return (
    <Box
      onClick={() => navigate(`/game/${gameId}/items/view/${item.id}`)}
      sx={{
        display: "flex",
        position: "relative",
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
        {item.icon ? (
          <img
            src={getPublicUrl(item.icon)}
            alt={item.name}
            style={{
              width: "80%",
              height: "80%",
              objectFit: "contain",
              imageRendering: "pixelated",
            }}
          />
        ) : (
          <Inventory
            sx={{ fontSize: 16, color: "rgba(255, 255, 255, 0.2)" }}
          />
        )}
        {item.level !== undefined && item.level > 0 && (
          <Box
            sx={{
              position: "absolute",
              top: -4,
              left: -4,
              backgroundColor: "warning.main",
              color: "warning.contrastText",
              borderRadius: "4px",
              px: 0.5,
              minWidth: 12,
              height: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.55rem",
              fontWeight: 800,
              boxShadow: 1,
              zIndex: 1,
            }}
          >
            {item.level}
          </Box>
        )}
      </Box>
      <Typography 
        variant="body2" 
        sx={{ 
          fontWeight: 700,
          color: rarityColor || "text.primary",
          transition: "all 0.2s",
          "&:hover": {
            color: rarityColor || "primary.main",
            textShadow: rarityColor ? `0 0 8px ${rarityColor}88` : "none"
          }
        }}
      >
        {item.name}
      </Typography>
    </Box>
  );
}

function ItemMetadataCell({ item }: { item: any }) {
  const { gameId, navigate, categoriesMap, currentMetadataId } = useItemRender();
  if (!categoriesMap) return null;
  return (
    <Box>
      {item.metadata && item.metadata.length > 0 ? (
        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
          {item.metadata.map((meta: any) => {
            const metaKey = (meta.type || meta.id).toLowerCase();
            const cat = categoriesMap.get(metaKey);
            const isCurrent = currentMetadataId && (meta.id?.toLowerCase() === currentMetadataId.toLowerCase() || meta.type?.toLowerCase() === currentMetadataId.toLowerCase());
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
          })}
        </Stack>
      ) : (
        <Typography variant="caption" sx={{ color: "text.disabled", fontStyle: "italic" }}>
          -
        </Typography>
      )}
    </Box>
  );
}

function ItemCategoriesCell({ item }: { item: any }) {
  const { gameId, navigate, categoriesMap } = useItemRender();
  if (!categoriesMap) return null;
  return (
    <Stack direction={"row"} spacing={1} flexWrap="wrap" useFlexGap>
      {(Array.isArray(item.category) ? item.category : [item.category]).filter(Boolean).map((catId: string) => {
        const cat = categoriesMap.get(catId.toLowerCase());
        const displayName = cat?.name || catId;
        return (
          <Chip
            key={`${item.id}_category_${catId}`}
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
  );
}

function ItemPricesCell({ item }: { item: any }) {
  return (
    <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
      {item.buyPrice !== undefined && (
        <Tooltip title="Compra">
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.5,
              backgroundColor: "rgba(76, 175, 80, 0.1)",
              px: 1,
              borderRadius: 1,
              border: "1px solid rgba(76, 175, 80, 0.2)",
            }}
          >
            <ShoppingCart sx={{ fontSize: 12, color: "success.main" }} />
            <ItemChip
              id="ouro"
              amount={item.buyPrice}
              size="small"
              icon={getPublicUrl("/img/heartopia/stats/ouro.png")}
            />
          </Box>
        </Tooltip>
      )}
      {item.sellPrice !== undefined && (
        <Tooltip title="Venda">
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.5,
              backgroundColor: "rgba(255, 152, 0, 0.1)",
              px: 1,
              borderRadius: 1,
              border: "1px solid rgba(255, 152, 0, 0.2)",
            }}
          >
            <Sell sx={{ fontSize: 12, color: "warning.main" }} />
            <ItemChip
              id="ouro"
              amount={item.sellPrice}
              size="small"
              icon={getPublicUrl("/img/heartopia/stats/ouro.png")}
            />
          </Box>
        </Tooltip>
      )}
    </Box>
  );
}

// ----------------------------------------------------
// ICON COMPONENT
// ----------------------------------------------------

interface IconComponentProps {
  item: any;
}

function IconComponent({ item }: IconComponentProps) {
  const { gameId, navigate, currentMetadataId } = useItemRender();
  const metaVal = currentMetadataId ? item.metadata?.find((m: any) => m.id?.toLowerCase() === currentMetadataId.toLowerCase() || m.type?.toLowerCase() === currentMetadataId.toLowerCase())?.value : undefined;
  const tooltipTitle = metaVal !== undefined ? `${item.name}: ${metaVal}` : item.name;
  return (
    <Tooltip title={tooltipTitle}>
      <Box
        onClick={() => navigate(`/game/${gameId}/items/view/${item.id}`)}
        sx={{
          position: "relative",
          width: "100%",
          height: "100%",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          p: 1,
        }}
      >
        {item.icon ? (
          <img
            src={getPublicUrl(item.icon)}
            alt={item.name}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              imageRendering: "pixelated",
            }}
          />
        ) : (
          <Inventory
            sx={{ fontSize: 32, color: "rgba(255, 255, 255, 0.2)" }}
          />
        )}
        {item.level !== undefined && item.level > 0 && (
          <Box
            sx={{
              position: "absolute",
              top: 4,
              left: 4,
              backgroundColor: "warning.main",
              color: "warning.contrastText",
              borderRadius: "4px",
              px: 0.5,
              minWidth: 16,
              height: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.65rem",
              fontWeight: 800,
              boxShadow: 2,
              zIndex: 1,
            }}
          >
            {item.level}
          </Box>
        )}
      </Box>
    </Tooltip>
  );
}

// ----------------------------------------------------
// PUBLIC INTERFACES (MATCHING ListingDataView EXPECTED SIGNATURES)
// ----------------------------------------------------

export function ItemCard(
  propsOrItem: any,
  variantOrUndefined?: "default" | "compact",
  childrenOrUndefined?: ReactNode
) {
  // If called as a component (e.g. <ItemCard item={item} ... />):
  if (propsOrItem && typeof propsOrItem === "object" && !propsOrItem.id && propsOrItem.item) {
    const { item, variant = "default", children } = propsOrItem;
    return <CardComponent key={item.id} item={item} variant={variant} children={children} />;
  }

  // If called as a function (e.g. ItemCard(item, variant, children)):
  const item = propsOrItem;
  const variant = variantOrUndefined || "default";
  const children = childrenOrUndefined;
  return <CardComponent key={item.id} item={item} variant={variant} children={children} />;
}

export function ItemList(item: any): ReactNode[] {
  // Return columns matching the standard design context
  return [
    <ItemNameCell key={`name_${item.id}`} item={item} />,
    <ItemMetadataCell key={`meta_${item.id}`} item={item} />,
    <ItemCategoriesCell key={`cats_${item.id}`} item={item} />,
    // Optional fourth column for prices (can be conditionally filtered out in ListingDataView if hidden)
    <ItemPricesCell key={`prices_${item.id}`} item={item} />
  ];
}

export function ItemIcon(item: any) {
  return <IconComponent key={item.id} item={item} />;
}
