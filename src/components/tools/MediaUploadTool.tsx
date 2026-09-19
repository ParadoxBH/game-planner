import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Link,
  Paper,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import { CloudUpload, DeleteOutline } from "@mui/icons-material";
import { DataCard } from "../common/DataCard";
import { ApiError } from "../../api/ApiError";
import { mediaFileUrl, type MediaVariantCode, type UploadMediaResponse } from "../../api/media";
import { useDeleteMedia, useUploadMedia } from "../../api/useMedia";

const VARIANTS: MediaVariantCode[] = ["icon", "thumb", "full"];

interface SelectedFile {
  file: File;
  previewUrl: string;
}

/**
 * Bancada de teste do upload de mídia.
 *
 * De propósito, nada é validado no navegador: o seletor sugere imagens, mas qualquer
 * arquivo pode ser enviado, para exercitar as rejeições do servidor (formato, tamanho,
 * megapixels).
 */
export function MediaUploadTool() {
  const theme = useTheme();
  const { spacing } = theme.designTokens;
  const inputRef = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState<SelectedFile | null>(null);
  const [results, setResults] = useState<UploadMediaResponse[]>([]);
  const upload = useUploadMedia();
  const remove = useDeleteMedia();

  const choose = (file: File | null) => {
    if (selected) URL.revokeObjectURL(selected.previewUrl);
    setSelected(file ? { file, previewUrl: URL.createObjectURL(file) } : null);
    upload.reset();
  };

  const handleInput = (event: ChangeEvent<HTMLInputElement>) => {
    choose(event.target.files?.[0] ?? null);
    // Permite escolher o mesmo arquivo de novo, para testar a deduplicação.
    event.target.value = "";
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    choose(event.dataTransfer.files[0] ?? null);
  };

  const send = () => {
    if (!selected) return;
    upload.mutate({ file: selected.file }, {
      onSuccess: (result) =>
        setResults((previous) => [result, ...previous.filter((item) => item.media.id !== result.media.id)]),
    });
  };

  const discard = (id: string) => {
    remove.mutate(id, {
      onSuccess: () => setResults((previous) => previous.filter((item) => item.media.id !== id)),
    });
  };

  return (
    <Stack spacing={spacing.contentGap}>
      <Typography variant="body2" color="text.secondary">
        Envia para POST /api/v1/media e mostra as três variantes WebP geradas pelo servidor. Para testar as
        rejeições, escolha "Todos os arquivos" no seletor e envie qualquer coisa.
      </Typography>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        hidden
        onChange={handleInput}
      />

      <Paper
        variant="outlined"
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
        sx={{ p: spacing.cardPadding, cursor: "pointer", borderStyle: "dashed" }}
      >
        {selected ? (
          <Stack direction={{ xs: "column", sm: "row" }} spacing={spacing.contentGap} alignItems="center">
            <Box
              component="img"
              src={selected.previewUrl}
              alt={selected.file.name}
              sx={{ width: 120, height: 120, objectFit: "contain", bgcolor: "action.hover", borderRadius: 1 }}
            />
            <Stack spacing={spacing.fieldGap} sx={{ minWidth: 0 }}>
              <Typography variant="body1" sx={{ fontWeight: 700, wordBreak: "break-all" }}>
                {selected.file.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {formatBytes(selected.file.size)} · {selected.file.type || "tipo desconhecido"}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Clique ou solte outro arquivo para trocar.
              </Typography>
            </Stack>
          </Stack>
        ) : (
          <Stack alignItems="center" spacing={spacing.itemGap} sx={{ py: spacing.contentGap }}>
            <CloudUpload color="primary" fontSize="large" />
            <Typography variant="body1">Clique para escolher ou solte uma imagem aqui</Typography>
            <Typography variant="caption" color="text.secondary">
              PNG, JPEG, WebP ou GIF · até 8 MB
            </Typography>
          </Stack>
        )}
      </Paper>

      <Stack direction="row" spacing={spacing.itemGap}>
        <Button
          variant="contained"
          onClick={send}
          disabled={!selected || upload.isPending}
          startIcon={upload.isPending ? <CircularProgress size={16} color="inherit" /> : <CloudUpload />}
          sx={{ textTransform: "none" }}
        >
          Enviar
        </Button>
        {selected && (
          <Button
            variant="outlined"
            onClick={() => choose(null)}
            disabled={upload.isPending}
            sx={{ textTransform: "none" }}
          >
            Limpar seleção
          </Button>
        )}
      </Stack>

      {upload.error && <Alert severity="error">{describeError(upload.error)}</Alert>}
      {remove.error && <Alert severity="error">Falha ao apagar: {describeError(remove.error)}</Alert>}

      {results.map(({ media, created }) => (
        <Paper key={media.id} sx={{ p: spacing.cardPadding }}>
          <Stack spacing={spacing.itemGap}>
            <Stack direction="row" spacing={spacing.fieldGap} useFlexGap alignItems="center" sx={{ flexWrap: "wrap" }}>
              <Chip
                size="small"
                color={created ? "success" : "default"}
                label={created ? "Nova imagem (201)" : "Já existia (200, deduplicada)"}
              />
              <Chip size="small" variant="outlined" label={`Original ${media.width}×${media.height}`} />
              {media.animated && <Chip size="small" variant="outlined" label="Animada" />}
              <Chip size="small" variant="outlined" label={`Enviada por ${media.uploadedBy}`} />
              <Box sx={{ flex: 1 }} />
              <Button
                size="small"
                color="error"
                onClick={() => discard(media.id)}
                disabled={remove.isPending}
                startIcon={
                  remove.isPending && remove.variables === media.id ? (
                    <CircularProgress size={14} color="inherit" />
                  ) : (
                    <DeleteOutline />
                  )
                }
                sx={{ textTransform: "none" }}
              >
                Apagar
              </Button>
            </Stack>

            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace", wordBreak: "break-all" }}>
              {media.id}
            </Typography>

            <Stack direction={{ xs: "column", md: "row" }} spacing={spacing.itemGap}>
              {VARIANTS.map((code) => {
                const variant = media.variants[code];
                if (!variant) return null;
                const url = mediaFileUrl(variant.url);
                return (
                  <DataCard
                    key={code}
                    flex={1}
                    sx={{ flexDirection: "column", alignItems: "stretch", gap: spacing.fieldGap }}
                  >
                    <Link
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      underline="none"
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        height: 180,
                        bgcolor: "action.hover",
                        borderRadius: 1,
                      }}
                    >
                      <Box
                        component="img"
                        src={url}
                        alt={`${code} ${variant.width}×${variant.height}`}
                        sx={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                      />
                    </Link>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {code}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {variant.width}×{variant.height} · {formatBytes(variant.bytes)}
                    </Typography>
                  </DataCard>
                );
              })}
            </Stack>
          </Stack>
        </Paper>
      ))}
    </Stack>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Mostra o status HTTP junto: numa bancada de teste, 413/415/422 dizem mais que a frase. */
function describeError(error: Error): string {
  return error instanceof ApiError && !error.isNetworkError ? `${error.status} — ${error.message}` : error.message;
}
