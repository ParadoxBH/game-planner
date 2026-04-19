import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Stack,
  Tooltip,
  type SxProps,
} from "@mui/material";
import { Inventory, Sell, ShoppingCart } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { ItemChip } from "../common/ItemChip";
import { getPublicUrl } from "../../utils/pathUtils";
import type { Item } from "../../types/gameModels";

interface ItemCardProps {
  item: Item;
  gameId: string;
  showPrices?: boolean;
  variant?: "default" | "compact";
  sx?: SxProps;
}

export function ItemCard({ item, gameId, showPrices, variant = "default", sx }: ItemCardProps) {
  const navigate = useNavigate();

  return (
    <Card
      sx={{
        backgroundColor: "rgba(255, 255, 255, 0.02)",
        backdropFilter: "blur(16px)",
        borderRadius: 1,
        border: 1,
        borderColor: "divider",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        "&:hover": {
          transform: "translateY(-6px)",
          backgroundColor: "rgba(255, 255, 255, 0.04)",
          borderColor: "rgba(255, 255, 255, 0.15)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
        },
        ...sx
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
                color: "text.primary",
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
              </Box>
            </Box>
            <Stack>
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
