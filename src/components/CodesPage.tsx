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
  Switch,
  Tooltip,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { CalendarToday, CheckCircle, ContentCopy, RadioButtonUnchecked, TimerOff } from "@mui/icons-material";
import { ApiError } from "../api/ApiError";
import { MAX_PAGE_SIZE, type ListQuery, type RedemptionCodeDocument } from "../api/content";
import { ReferenceIndex } from "../api/references";
import { useContentList } from "../api/useContent";
import { and, rule, textSearch } from "../api/query";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { usePagination } from "../hooks/usePagination";
import { usePlatform } from "../hooks/usePlatform";
import { redemptionService } from "../services/redemptionService";
import { formatDate, isoDate } from "../utils/format";
import { ContentChip } from "./common/ContentChip";
import { ListingDataView } from "./common/ListingDataView";
import { StyledContainer } from "./common/StyledContainer";
import { Ribbon } from "./Ribbon";

const NO_CRITERIA = {};

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

/** Códigos de resgate lidos da API, os mais novos primeiro, com a marcação de coletado guardada no navegador. */
export function CodesPage() {
  const { gameId = "" } = useParams<{ gameId: string }>();
  const pages = usePagination(NO_CRITERIA);
  const [hideExpired, setHideExpired] = useState(true);
  const [hideCollected, setHideCollected] = useState(false);
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
  const { pagination } = pages.info;

  const query = useMemo<ListQuery>(
    () => ({
      where: and(
        textSearch(search),
        hideExpired && rule("active", "equal", true),
        hideCollected && collectedCodes.length > 0 && rule("extId", "not_in", collectedCodes),
      ),
      page: pagination.page - 1,
      size: Math.min(pagination.pageSize, MAX_PAGE_SIZE),
      sort: "-addedOn",
      references: true,
    }),
    [search, pagination, hideExpired, hideCollected, collectedCodes],
  );

  const codes = useContentList<RedemptionCodeDocument>(gameId, "codes", query);
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
      searchValue={pages.info.search}
      onChangeSearch={pages.setSearch}
      search={{ placeholder: "Pesquisar códigos..." }}
      pages={pages}
      actionsStart={
        <Stack flex={1} px={1} direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" alignItems="center">
            <Switch size="small" checked={hideExpired} onChange={(event) => setHideExpired(event.target.checked)} />
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              Ocultar expirados
            </Typography>
          </Stack>
          <Stack direction="row" alignItems="center">
            <Switch size="small" checked={hideCollected} onChange={(event) => setHideCollected(event.target.checked)} />
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              Ocultar coletados
            </Typography>
          </Stack>
        </Stack>
      }
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
