import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Alert,
  Card,
  CircularProgress,
  Divider,
  IconButton,
  Snackbar,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { CalendarToday, CheckCircle, ContentCopy, RadioButtonUnchecked, TimerOff } from "@mui/icons-material";
import { ApiError } from "../api/ApiError";
import { MAX_PAGE_SIZE, type RedemptionCodeDocument } from "../api/content";
import { ReferenceIndex } from "../api/references";
import { useListing, useListingFilters } from "../api/useContent";
import type { FilterValues } from "../api/query";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { usePagination } from "../hooks/usePagination";
import { usePlatform } from "../hooks/usePlatform";
import { redemptionService } from "../services/redemptionService";
import { formatDate, isoDate } from "../utils/format";
import { ContentChip } from "./common/ContentChip";
import { ListingDataView } from "./common/ListingDataView";
import { QueryBuilder } from "./common/QueryBuilder";
import { StyledContainer } from "./common/StyledContainer";
import { Ribbon } from "./Ribbon";

const NO_FILTERS: FilterValues = {};

interface CodeCardProps {
  code: RedemptionCodeDocument;
  references: ReferenceIndex;
  collected: boolean;
  onToggle: () => void;
  onCopy: () => void;
}

function CodeCard({ code, references, collected, onToggle, onCopy }: CodeCardProps) {
  const theme = useTheme();
  const { isMobile } = usePlatform();
  const expired = code.expiresOn !== null && code.expiresOn < isoDate();

  return (
    <Card
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
        borderRadius: 1,
        border: 1,
        borderColor: collected ? "success.dark" : expired ? "error.dark" : "divider",
        transition: "all 0.3s",
        "&:hover": { transform: "translateY(-4px)" },
      }}
    >
      {collected ? (
        <Ribbon backgroundColor={theme.palette.success.main} label="Coletado" />
      ) : (
        expired && <Ribbon backgroundColor={theme.palette.error.main} label="Expirado" />
      )}

      <Stack spacing={1} sx={{ p: isMobile ? 1.5 : 3, flexGrow: 1 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
          <Stack sx={{ minWidth: 0 }}>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 900,
                letterSpacing: 2,
                fontFamily: "monospace",
                wordBreak: "break-all",
                color: collected ? "success.main" : expired ? "text.disabled" : "primary.main",
              }}
            >
              {code.extId}
            </Typography>
            {code.name && code.name !== code.extId && (
              <Typography variant="caption" color="text.secondary">
                {code.name}
              </Typography>
            )}
          </Stack>
          <Stack direction="row" spacing={1}>
            <Tooltip title={collected ? "Desmarcar como coletado" : "Marcar como coletado"}>
              <IconButton size="small" onClick={onToggle} sx={{ color: collected ? "success.main" : "text.disabled" }}>
                {collected ? <CheckCircle fontSize="small" /> : <RadioButtonUnchecked fontSize="small" />}
              </IconButton>
            </Tooltip>
            <Tooltip title="Copiar código">
              <span>
                <IconButton size="small" onClick={onCopy} disabled={expired && !collected}>
                  <ContentCopy fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        </Stack>

        <Divider />

        <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1.5 }}>
          Recompensas
        </Typography>
        {code.rewards.length > 0 ? (
          <Stack direction="row" flexWrap="wrap" useFlexGap sx={{ gap: 1.5 }}>
            {code.rewards.map((reward, index) => (
              <ContentChip
                key={index}
                target={reward.target}
                resolved={references.find(reward.target)}
                amount={reward.amount}
                size="medium"
              />
            ))}
          </Stack>
        ) : (
          <Typography variant="caption" color="text.secondary">
            Recompensas não informadas.
          </Typography>
        )}

        <Stack spacing={0.5} sx={{ mt: "auto", pt: 1 }}>
          {code.addedOn && (
            <Stack direction="row" spacing={1} alignItems="center">
              <CalendarToday sx={{ fontSize: 14, color: "text.disabled" }} />
              <Typography variant="caption" color="text.secondary">
                Adicionado em <b>{formatDate(code.addedOn)}</b>
              </Typography>
            </Stack>
          )}
          <Stack direction="row" spacing={1} alignItems="center">
            <TimerOff sx={{ fontSize: 14, color: expired ? "error.main" : "warning.main" }} />
            <Typography variant="caption" sx={{ color: expired ? "error.main" : "text.secondary" }}>
              {code.expiresOn ? (
                <>
                  {expired ? "Expirou" : "Expira"} em <b>{formatDate(code.expiresOn)}</b>
                </>
              ) : (
                "Sem validade informada"
              )}
            </Typography>
          </Stack>
        </Stack>
      </Stack>
    </Card>
  );
}

/**
 * Códigos de resgate lidos da API, os mais novos primeiro, com a marcação de coletado guardada no navegador. A
 * busca e os filtros vêm do backend (GET /codes/query/filters); "ocultar coletados" é daqui, porque o que foi
 * coletado só o navegador sabe.
 */
export function CodesPage() {
  const { gameId = "" } = useParams<{ gameId: string }>();
  const pages = usePagination(NO_FILTERS);
  const [collectedCodes, setCollectedCodes] = useState<string[]>(() => redemptionService.getCollectedCodes(gameId));
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    setCollectedCodes(redemptionService.getCollectedCodes(gameId));
  }, [gameId]);

  // A API devolve no máximo 200 por página.
  useEffect(() => {
    if (pages.info.pagination.pageSize > MAX_PAGE_SIZE) pages.setPageSize(MAX_PAGE_SIZE);
  }, [pages.info.pagination.pageSize, pages.setPageSize]);

  const search = useDebouncedValue(pages.info.search);
  const { criteria, pagination } = pages.info;

  const listing = useListingFilters(gameId, "codes");
  const codes = useListing<RedemptionCodeDocument>(gameId, "codes", {
    search,
    values: criteria,
    page: pagination.page - 1,
    size: Math.min(pagination.pageSize, MAX_PAGE_SIZE),
    sort: "-addedOn",
    references: true,
  });
  const references = useMemo(() => new ReferenceIndex(codes.data?.references), [codes.data]);

  useEffect(() => {
    if (codes.data) pages.setTotalItems(codes.data.total);
  }, [codes.data, pages.setTotalItems]);

  const toggleCollected = (code: string) => {
    if (collectedCodes.includes(code)) {
      redemptionService.removeCollectedCode(gameId, code);
      setCollectedCodes((previous) => previous.filter((candidate) => candidate !== code));
    } else {
      redemptionService.saveCollectedCode(gameId, code);
      setCollectedCodes((previous) => [...previous, code]);
    }
  };

  const copy = (code: string) => {
    navigator.clipboard
      ?.writeText(code)
      .then(() => setCopied(code))
      .catch(() => setCopied(null));
  };

  return (
    <StyledContainer
      title={`Códigos de resgate - ${gameId}`}
      label="Aproveite recompensas gratuitas com os códigos abaixo."
      searchEnd={
        <QueryBuilder
          schema={listing.data}
          search={pages.info.search}
          onSearchChange={pages.setSearch}
          values={criteria}
          onChange={(key, value) => pages.setCriteria({ [key]: value })}
        />
      }
      pages={pages}
    >
      {codes.isPending ? (
        <Stack alignItems="center" justifyContent="center" sx={{ py: 10, flex: 1 }}>
          <CircularProgress color="primary" />
        </Stack>
      ) : codes.isError ? (
        <Stack alignItems="center" spacing={1} sx={{ p: 4, flex: 1 }}>
          <Typography color="error" variant="h6" sx={{ fontWeight: 700 }}>
            Não foi possível carregar os códigos.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {codes.error instanceof ApiError ? codes.error.message : "Erro inesperado."}
          </Typography>
        </Stack>
      ) : (
        <ListingDataView
          data={codes.data.content}
          viewMode="cards"
          cardMinWidth={300}
          emptyMessage="Nenhum código encontrado."
          renderCard={(code) => (
            <CodeCard
              code={code}
              references={references}
              collected={collectedCodes.includes(code.extId)}
              onToggle={() => toggleCollected(code.extId)}
              onCopy={() => copy(code.extId)}
            />
          )}
        />
      )}

      <Snackbar
        open={copied !== null}
        autoHideDuration={2000}
        onClose={() => setCopied(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="success" variant="filled" sx={{ width: "100%", borderRadius: 2 }}>
          Código <b>{copied}</b> copiado!
        </Alert>
      </Snackbar>
    </StyledContainer>
  );
}
