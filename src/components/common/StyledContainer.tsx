import {
  Box,
  Container,
  Typography,
  TextField,
  Stack,
  InputAdornment,
  useTheme,
  type SxProps,
  type Theme,
} from "@mui/material";
import { Search } from "@mui/icons-material";
import type { ReactNode } from "react";

interface StyledContainerProps {
  title: string;
  label: string;
  searchValue?: string;
  onChangeSearch?: (value: string) => void;
  search?: {
    placeholder?: string;
  };
  actionsStart?: ReactNode;
  actionsEnd?: ReactNode;
  children?: ReactNode;
  sx?: {
    root?: SxProps<Theme>;
    container?: SxProps<Theme>;
    header?: SxProps<Theme>;
  };
}

export function StyledContainer({
  title,
  label,
  search,
  searchValue,
  onChangeSearch,
  actionsStart,
  actionsEnd,
  children,
  sx,
}: StyledContainerProps) {
  const theme = useTheme();
  const { spacing: dtSpacing, borderRadius: dtRadius } = theme.designTokens;

  return (
    <Container
      maxWidth="xl"
      sx={{ py: dtSpacing.contentGap || 2, flex: 1, overflowY: "hidden", height: "100%", ...sx?.root }}
    >
      <Stack spacing={dtSpacing.itemGap} sx={{ flex: 1, height: "100%", overflowY: "hidden" }}>
        <Stack sx={sx?.header} spacing={dtSpacing.itemGap}>
          {/* Header Section */}
          <Stack
            direction={{ xs: "column", md: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", md: "center" }}
            spacing={dtSpacing.contentGap}
          >
            <Stack alignItems={"start"}>
              <Typography variant="h4" sx={{ color: "text.primary" }}>
                {title}
              </Typography>
              <Typography variant="body1" sx={{ color: "text.secondary" }}>
                {label}
              </Typography>
            </Stack>

            {onChangeSearch && (
              <Box sx={{ width: { xs: "100%", md: "400px" } }}>
                <TextField
                  fullWidth
                  variant="outlined"
                  placeholder={search?.placeholder || "Pesquisar..."}
                  value={searchValue}
                  onChange={(e) => onChangeSearch(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search sx={{ color: "text.disabled" }} />
                      </InputAdornment>
                    ),
                    sx: {
                      backgroundColor: "rgba(255, 255, 255, 0.03)",
                      borderRadius: dtRadius,
                      "& fieldset": { borderColor: "divider" },
                      "&:hover fieldset": {
                        borderColor: "rgba(255, 255, 255, 0.2)",
                      },
                      "&.Mui-focused fieldset": { borderColor: "primary.main" },
                    },
                  }}
                />
              </Box>
            )}
          </Stack>

          {(actionsStart || actionsEnd) && (
            <Stack
              direction="row"
              justifyContent={"space-between"}
              alignItems={"stretch"}
              sx={{ pb: 1 }}
            >
              <Stack
                direction="row"
                spacing={dtSpacing.itemGap}
                sx={{
                  overflowX: "auto",
                  "&::-webkit-scrollbar": { height: "4px" },
                  "&::-webkit-scrollbar-thumb": {
                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                    borderRadius: "4px",
                  },
                }}
              >
                {actionsStart}
              </Stack>
              {actionsEnd && (
                <Stack
                  direction="row"
                  spacing={dtSpacing.itemGap}
                  sx={{
                    overflowX: "auto",
                    "&::-webkit-scrollbar": { height: "4px" },
                    "&::-webkit-scrollbar-thumb": {
                      backgroundColor: "rgba(255, 255, 255, 0.1)",
                      borderRadius: "4px",
                    },
                  }}
                >
                  {actionsEnd}
                </Stack>
              )}
            </Stack>
          )}
        </Stack>
        <Stack sx={{ overflowY: "auto", flex: 1, ...sx?.container }}>
          {children}
        </Stack>
      </Stack>
    </Container>
  );
}
