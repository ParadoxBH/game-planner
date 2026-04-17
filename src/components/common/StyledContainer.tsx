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
import { TablePaginator } from "./TablePaginator";
import type { PaginationController } from "../../hooks/usePagination";
import { usePlatform } from "../../hooks/usePlatform";

interface StyledContainerProps {
  prefix?: ReactNode;
  postfix?: ReactNode;
  title?: string;
  label?: string;
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
  pages?: PaginationController<any>;
}

export function StyledContainer({
  prefix,
  postfix,
  title,
  label,
  search,
  searchValue,
  onChangeSearch,
  actionsStart,
  actionsEnd,
  children,
  sx,
  pages,
}: StyledContainerProps) {
  const theme = useTheme();
  const { spacing: dtSpacing, borderRadius: dtRadius } = theme.designTokens;
  const { isMobile } = usePlatform();

  return (
    <Container
      maxWidth="xl"
      sx={{ 
        py: { xs: 1, md: dtSpacing.contentGap || 2 }, 
        px: { xs: 1, sm: 2, md: 3 },
        flex: 1, 
        overflowY: "hidden", 
        height: "100%", 
        ...sx?.root 
      }}
    >
      <Stack spacing={isMobile ? undefined : dtSpacing.itemGap} sx={{ flex: 1, height: "100%", overflowY: "hidden" }}>
        <Stack sx={{...sx?.header, mb: isMobile ? 1 : 2}} spacing={isMobile ? 0.5 :dtSpacing.itemGap}>
          {/* Header Section */}
          <Stack
            direction={{ xs: "column", md: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "stretch", md: "center" }}
            spacing={isMobile ? 1 : dtSpacing.contentGap}
          >
            <Stack 
              alignItems={"center"} 
              spacing={isMobile ? undefined : 2} 
              direction={"row"}
              sx={{ 
                width: { xs: '100%', md: 'auto' },
                justifyContent: { xs: 'flex-start', md: 'flex-start' }
              }}
            >
              {prefix}
              <Stack alignItems={isMobile ? "center" : "start"} sx={{ flex: 1, minWidth: 0 }}>
                {title && (
                  <Typography 
                    variant="h4" 
                    sx={{ 
                      color: "text.primary",
                      fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2.125rem' },
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      width: '100%'
                    }}
                  >
                    {title}
                  </Typography>
                )}
                {label && (
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: "text.secondary",
                      fontSize: { xs: '0.75rem', md: '0.875rem' }
                    }}
                  >
                    {label}
                  </Typography>
                )}
              </Stack>
              {postfix}
            </Stack>

            {onChangeSearch && (
              <Box sx={{ width: { xs: "100%", md: "400px" } }}>
                <TextField
                  fullWidth
                  size="small"
                  variant="outlined"
                  placeholder={search?.placeholder || "Pesquisar..."}
                  value={searchValue}
                  onChange={(e) => onChangeSearch(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search sx={{ color: "text.disabled", fontSize: '1.2rem' }} />
                      </InputAdornment>
                    ),
                    sx: {
                      backgroundColor: "rgba(255, 255, 255, 0.03)",
                      borderRadius: dtRadius,
                      height: { xs: 40, md: 45 },
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
              direction={{ xs: "column", sm: "row" }}
              justifyContent={"space-between"}
              alignItems={{ xs: "stretch", sm: "center" }}
              spacing={0.5}
              sx={isMobile ? undefined : { pb: 1 }}
            >
              {actionsStart && <Stack
                direction="row"
                spacing={dtSpacing.itemGap}
                sx={{
                  flex: 1,
                  overflowX: "auto",
                  py: isMobile ? undefined : 0.5,
                  "&::-webkit-scrollbar": { height: "4px" },
                  "&::-webkit-scrollbar-thumb": {
                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                    borderRadius: "4px",
                  },
                }}
              >
                {actionsStart}
              </Stack>}
              {actionsEnd && (
                <Stack
                  direction="row"
                  spacing={dtSpacing.itemGap}
                  justifyContent={'flex-end'}
                  sx={{
                    flex: 1,
                    overflowX: "auto",
                    py: isMobile ? undefined : 0.5,
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
        <Stack sx={{ overflowY: "auto", overflowX: "hidden", flex: 1, ...sx?.container }}>
          {children}
        </Stack>
        {!!pages && (
          <Box sx={{ mt: 'auto', pt: 1 }}>
            <TablePaginator controller={pages} />
          </Box>
        )}
      </Stack>
    </Container>

  );
}
