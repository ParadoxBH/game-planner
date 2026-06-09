import { useState, useCallback, useEffect } from "react";
import {
  Paper,
  Stack,
  Typography,
  TextField,
  IconButton,
  Tooltip,
  Divider,
  Box,
  Chip,
  Collapse,
  Button,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import CropIcon from "@mui/icons-material/Crop";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import type { MapMetadata } from "../../types/gameModels";
import { getPublicUrl } from "../../utils/pathUtils";

export type Bounds = [[number, number], [number, number]];

interface BoundBoxEditorPanelProps {
  selectedMap: MapMetadata;
  open: boolean;
  onClose: () => void;
  onApply: (bounds: Bounds) => void;
  appliedBounds: Bounds | null;
}

const BoundInput = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) => {
  const [raw, setRaw] = useState(String(value));

  useEffect(() => {
    setRaw(String(value));
  }, [value]);

  return (
    <TextField
      label={label}
      value={raw}
      size="small"
      variant="outlined"
      inputProps={{ style: { fontFamily: "monospace", fontSize: "0.75rem" } }}
      sx={{
        width: 90,
        "& .MuiInputLabel-root": { fontSize: "0.65rem" },
        "& .MuiOutlinedInput-root": {
          "& fieldset": { borderColor: "rgba(255,255,255,0.15)" },
          "&:hover fieldset": { borderColor: "rgba(255,255,255,0.3)" },
          "&.Mui-focused fieldset": { borderColor: "primary.main" },
        },
      }}
      onChange={(e) => {
        setRaw(e.target.value);
        const n = parseFloat(e.target.value);
        if (!isNaN(n)) onChange(n);
      }}
      onBlur={() => setRaw(String(value))}
    />
  );
};

export const BoundBoxEditorPanel = ({
  selectedMap,
  open,
  onClose,
  onApply,
  appliedBounds,
}: BoundBoxEditorPanelProps) => {
  const originalBounds = selectedMap.bounds as Bounds;
  const [bounds, setBounds] = useState<Bounds>(originalBounds);
  const [copied, setCopied] = useState(false);
  const [previewExpanded, setPreviewExpanded] = useState(true);
  const [justApplied, setJustApplied] = useState(false);

  // Reset when map changes
  useEffect(() => {
    setBounds(selectedMap.bounds as Bounds);
  }, [selectedMap.id]);

  const updateBound = useCallback(
    (corner: 0 | 1, axis: 0 | 1, value: number) => {
      setBounds((prev) => {
        const next: Bounds = [
          [prev[0][0], prev[0][1]],
          [prev[1][0], prev[1][1]],
        ];
        next[corner][axis] = value;
        return next;
      });
    },
    []
  );

  const reset = () => {
    setBounds(selectedMap.bounds as Bounds);
    onApply(selectedMap.bounds as Bounds);
  };

  const copyToClipboard = () => {
    const text = JSON.stringify(bounds);
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleApply = () => {
    onApply(bounds);
    setJustApplied(true);
    setTimeout(() => setJustApplied(false), 1500);
  };

  // Derive image source
  const imgSrc =
    selectedMap.type === "single" && selectedMap.url
      ? getPublicUrl(selectedMap.url)
      : selectedMap.thumbnail
        ? getPublicUrl(selectedMap.thumbnail)
        : null;

  // Preview dimensions
  const PREVIEW_W = 300;
  const PREVIEW_H = 180;

  // Use the wider of original or applied bounds as reference for preview
  const refBounds = appliedBounds ?? originalBounds;
  const refMinY = refBounds[0][0];
  const refMaxY = refBounds[1][0];
  const refMinX = refBounds[0][1];
  const refMaxX = refBounds[1][1];
  const refH = Math.abs(refMaxY - refMinY) || 1;
  const refW = Math.abs(refMaxX - refMinX) || 1;

  // Current edited bounds
  const curMinY = bounds[0][0];
  const curMaxY = bounds[1][0];
  const curMinX = bounds[0][1];
  const curMaxX = bounds[1][1];

  // Map bounds onto preview space
  const toPreviewX = (x: number) => ((x - refMinX) / refW) * PREVIEW_W;
  const toPreviewY = (y: number) => ((refMaxY - y) / refH) * PREVIEW_H;

  // Edited rect
  const rectLeft = toPreviewX(curMinX);
  const rectTop = toPreviewY(curMaxY);
  const rectRight = toPreviewX(curMaxX);
  const rectBottom = toPreviewY(curMinY);
  const rectW = rectRight - rectLeft;
  const rectH = rectBottom - rectTop;

  // Applied rect (to show alongside)
  const appliedRect = appliedBounds
    ? {
        left: toPreviewX(appliedBounds[0][1]),
        top: toPreviewY(appliedBounds[1][0]),
        right: toPreviewX(appliedBounds[1][1]),
        bottom: toPreviewY(appliedBounds[0][0]),
      }
    : null;

  const isDirty =
    JSON.stringify(bounds) !== JSON.stringify(originalBounds);

  const isApplied =
    appliedBounds &&
    JSON.stringify(bounds) === JSON.stringify(appliedBounds);

  const isAppliedDifferentFromOriginal =
    appliedBounds &&
    JSON.stringify(appliedBounds) !== JSON.stringify(originalBounds);

  if (!open) return null;

  return (
    <Paper
      elevation={8}
      sx={{
        position: "absolute",
        top: 0,
        right: 56,
        width: 340,
        backgroundColor: "designTokens.colors.glassBg",
        backdropFilter: "blur(20px)",
        borderRadius: 2,
        border: 1,
        borderColor: "divider",
        overflow: "hidden",
        zIndex: 1200,
        boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
      }}
    >
      {/* Header */}
      <Stack
        direction="row"
        alignItems="center"
        spacing={1}
        sx={{
          px: 1.5,
          py: 1,
          background:
            "linear-gradient(135deg, rgba(99,102,241,0.2), rgba(168,85,247,0.1))",
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <CropIcon sx={{ fontSize: 16, color: "primary.main" }} />
        <Typography
          variant="subtitle2"
          sx={{ fontSize: "0.75rem", fontWeight: 700, flexGrow: 1 }}
        >
          Posição da Imagem de Fundo
        </Typography>

        {isAppliedDifferentFromOriginal && (
          <Chip
            label="preview ativo"
            size="small"
            color="success"
            variant="outlined"
            sx={{ fontSize: "0.6rem", height: 18 }}
          />
        )}
        {isDirty && !isApplied && (
          <Chip
            label="não aplicado"
            size="small"
            color="warning"
            variant="outlined"
            sx={{ fontSize: "0.6rem", height: 18 }}
          />
        )}

        <Tooltip title="Resetar para original e aplicar">
          <span>
            <IconButton
              size="small"
              onClick={reset}
              disabled={!isDirty && !isAppliedDifferentFromOriginal}
              sx={{ p: 0.5 }}
            >
              <RestartAltIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title={copied ? "Copiado!" : "Copiar JSON"}>
          <IconButton
            size="small"
            onClick={copyToClipboard}
            color={copied ? "success" : "default"}
            sx={{ p: 0.5 }}
          >
            {copied ? (
              <CheckCircleIcon sx={{ fontSize: 14, color: "success.main" }} />
            ) : (
              <ContentCopyIcon sx={{ fontSize: 14 }} />
            )}
          </IconButton>
        </Tooltip>
        <IconButton size="small" onClick={onClose} sx={{ p: 0.5, ml: 0.5 }}>
          <Typography
            sx={{ fontSize: "0.7rem", lineHeight: 1, color: "text.secondary" }}
          >
            ✕
          </Typography>
        </IconButton>
      </Stack>

      <Stack spacing={0} sx={{ p: 1.5 }}>
        {/* Bound inputs */}
        <Stack spacing={1.5}>
          {/* Min corner (bounds[0]) */}
          <Stack spacing={0.5}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  bgcolor: "success.main",
                  flexShrink: 0,
                }}
              />
              <Typography
                variant="caption"
                sx={{
                  color: "text.secondary",
                  fontSize: "0.65rem",
                  fontWeight: 600,
                  letterSpacing: 1,
                }}
              >
                CANTO INFERIOR-ESQUERDO da imagem
              </Typography>
            </Stack>
            <Stack direction="row" spacing={1} sx={{ pl: 2 }}>
              <BoundInput
                label="Lat (Y)"
                value={bounds[0][0]}
                onChange={(v) => updateBound(0, 0, v)}
              />
              <BoundInput
                label="Lng (X)"
                value={bounds[0][1]}
                onChange={(v) => updateBound(0, 1, v)}
              />
            </Stack>
          </Stack>

          {/* Max corner (bounds[1]) */}
          <Stack spacing={0.5}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  bgcolor: "error.main",
                  flexShrink: 0,
                }}
              />
              <Typography
                variant="caption"
                sx={{
                  color: "text.secondary",
                  fontSize: "0.65rem",
                  fontWeight: 600,
                  letterSpacing: 1,
                }}
              >
                CANTO SUPERIOR-DIREITO da imagem
              </Typography>
            </Stack>
            <Stack direction="row" spacing={1} sx={{ pl: 2 }}>
              <BoundInput
                label="Lat (Y)"
                value={bounds[1][0]}
                onChange={(v) => updateBound(1, 0, v)}
              />
              <BoundInput
                label="Lng (X)"
                value={bounds[1][1]}
                onChange={(v) => updateBound(1, 1, v)}
              />
            </Stack>
          </Stack>
        </Stack>

        <Divider sx={{ my: 1.5, opacity: 0.3 }} />

        {/* JSON output */}
        <Stack spacing={0.5}>
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              fontSize: "0.6rem",
              fontWeight: 600,
              letterSpacing: 1,
            }}
          >
            JSON RESULT
          </Typography>
          <Box
            sx={{
              bgcolor: "rgba(0,0,0,0.4)",
              borderRadius: 1,
              border: 1,
              borderColor: isDirty && !isApplied ? "warning.dark" : isApplied ? "success.dark" : "divider",
              p: 1,
              fontFamily: "monospace",
              fontSize: "0.65rem",
              color: isDirty && !isApplied ? "warning.light" : isApplied ? "success.light" : "text.secondary",
              wordBreak: "break-all",
              lineHeight: 1.6,
              transition: "border-color 0.3s, color 0.3s",
            }}
          >
            {JSON.stringify(bounds)}
          </Box>
        </Stack>

        {/* Apply button */}
        <Button
          variant="contained"
          size="small"
          onClick={handleApply}
          disabled={!isDirty || !!isApplied}
          startIcon={
            justApplied ? (
              <CheckCircleIcon sx={{ fontSize: 14 }} />
            ) : (
              <PlayArrowIcon sx={{ fontSize: 14 }} />
            )
          }
          sx={{
            mt: 1.5,
            fontSize: "0.7rem",
            py: 0.75,
            fontWeight: 700,
            letterSpacing: 0.5,
            transition: "all 0.3s",
            ...(justApplied && {
              bgcolor: "success.main",
              "&:hover": { bgcolor: "success.dark" },
            }),
            ...(!isDirty || isApplied
              ? {}
              : {
                  background:
                    "linear-gradient(135deg, #6366f1, #a855f7)",
                  "&:hover": {
                    background:
                      "linear-gradient(135deg, #4f52d9, #9333ea)",
                    boxShadow: "0 0 16px rgba(99,102,241,0.5)",
                  },
                }),
          }}
        >
          {justApplied
            ? "Imagem atualizada!"
            : isApplied
              ? "Já aplicado"
              : "Aplicar imagem no mapa"}
        </Button>

        {isAppliedDifferentFromOriginal && (
          <Typography
            variant="caption"
            sx={{
              mt: 0.5,
              fontSize: "0.6rem",
              color: "text.disabled",
              textAlign: "center",
            }}
          >
            ⚠️ Preview temporário — copie o JSON para persistir
          </Typography>
        )}

        {/* Preview section */}
        <Divider sx={{ my: 1.5, opacity: 0.3 }} />
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
        >
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              fontSize: "0.6rem",
              fontWeight: 600,
              letterSpacing: 1,
            }}
          >
            PREVIEW DO MAPA
          </Typography>
          <IconButton
            size="small"
            onClick={() => setPreviewExpanded(!previewExpanded)}
            sx={{ p: 0.25 }}
          >
            {previewExpanded ? (
              <ExpandLessIcon sx={{ fontSize: 14 }} />
            ) : (
              <ExpandMoreIcon sx={{ fontSize: 14 }} />
            )}
          </IconButton>
        </Stack>

        <Collapse in={previewExpanded}>
          <Box
            sx={{
              mt: 1,
              position: "relative",
              width: PREVIEW_W,
              height: PREVIEW_H,
              bgcolor: "rgba(0,0,0,0.6)",
              borderRadius: 1,
              border: 1,
              borderColor: "divider",
              overflow: "hidden",
            }}
          >
            {/* Map image background */}
            {imgSrc ? (
              <img
                src={imgSrc}
                alt="map preview"
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "fill",
                  opacity: 0.45,
                }}
              />
            ) : (
              <Box
                sx={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Typography
                  variant="caption"
                  color="text.disabled"
                  sx={{ fontSize: "0.6rem" }}
                >
                  Sem imagem disponível
                </Typography>
              </Box>
            )}

            {/* Applied bounds rect (cyan, faint) */}
            {appliedRect && isAppliedDifferentFromOriginal && (
              <Box
                sx={{
                  position: "absolute",
                  left: Math.max(0, appliedRect.left),
                  top: Math.max(0, appliedRect.top),
                  width: Math.max(0, appliedRect.right - appliedRect.left),
                  height: Math.max(0, appliedRect.bottom - appliedRect.top),
                  border: "1px dashed rgba(34,211,238,0.6)",
                  bgcolor: "rgba(34,211,238,0.04)",
                  boxSizing: "border-box",
                  pointerEvents: "none",
                }}
              />
            )}

            {/* Edited bounds rect overlay */}
            <Box
              sx={{
                position: "absolute",
                left: Math.max(0, rectLeft),
                top: Math.max(0, rectTop),
                width: Math.max(
                  0,
                  Math.min(rectW, PREVIEW_W - Math.max(0, rectLeft))
                ),
                height: Math.max(
                  0,
                  Math.min(rectH, PREVIEW_H - Math.max(0, rectTop))
                ),
                border: "2px solid",
                borderColor:
                  isApplied
                    ? "success.main"
                    : isDirty
                      ? "warning.main"
                      : "primary.main",
                bgcolor:
                  isApplied
                    ? "rgba(74,222,128,0.08)"
                    : isDirty
                      ? "rgba(251,191,36,0.08)"
                      : "rgba(99,102,241,0.08)",
                boxSizing: "border-box",
                transition: "all 0.2s ease",
                pointerEvents: "none",
              }}
            />

            {/* Corner dot — Min (bounds[0]) */}
            <Box
              sx={{
                position: "absolute",
                left: Math.max(0, rectLeft) - 4,
                top: Math.max(0, rectBottom) - 4,
                width: 8,
                height: 8,
                borderRadius: "50%",
                bgcolor: "success.main",
                border: "1px solid white",
                transition: "all 0.2s ease",
              }}
            />
            {/* Corner dot — Max (bounds[1]) */}
            <Box
              sx={{
                position: "absolute",
                left: Math.max(0, rectRight) - 4,
                top: Math.max(0, rectTop) - 4,
                width: 8,
                height: 8,
                borderRadius: "50%",
                bgcolor: "error.main",
                border: "1px solid white",
                transition: "all 0.2s ease",
              }}
            />

            {/* Dimension info overlay */}
            <Box
              sx={{
                position: "absolute",
                bottom: 4,
                right: 4,
                bgcolor: "rgba(0,0,0,0.7)",
                borderRadius: 0.5,
                px: 0.75,
                py: 0.25,
              }}
            >
              <Typography
                sx={{
                  fontSize: "0.55rem",
                  fontFamily: "monospace",
                  color: "rgba(255,255,255,0.7)",
                }}
              >
                {Math.abs(curMaxX - curMinX).toFixed(1)} ×{" "}
                {Math.abs(curMaxY - curMinY).toFixed(1)}
              </Typography>
            </Box>
          </Box>

          {/* Legend */}
          <Stack direction="row" spacing={1.5} sx={{ mt: 0.75 }} flexWrap="wrap">
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  bgcolor: "success.main",
                }}
              />
              <Typography
                variant="caption"
                sx={{ fontSize: "0.6rem", color: "text.disabled" }}
              >
                bounds[0]
              </Typography>
            </Stack>
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  bgcolor: "error.main",
                }}
              />
              <Typography
                variant="caption"
                sx={{ fontSize: "0.6rem", color: "text.disabled" }}
              >
                bounds[1]
              </Typography>
            </Stack>
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <Box
                sx={{
                  width: 12,
                  height: 2,
                  bgcolor: isApplied
                    ? "success.main"
                    : isDirty
                      ? "warning.main"
                      : "primary.main",
                }}
              />
              <Typography
                variant="caption"
                sx={{ fontSize: "0.6rem", color: "text.disabled" }}
              >
                {isApplied ? "aplicado" : isDirty ? "editando" : "atual"}
              </Typography>
            </Stack>
            {isAppliedDifferentFromOriginal && (
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <Box
                  sx={{
                    width: 12,
                    height: 1,
                    bgcolor: "rgba(34,211,238,0.6)",
                    borderTop: "1px dashed rgba(34,211,238,0.6)",
                  }}
                />
                <Typography
                  variant="caption"
                  sx={{ fontSize: "0.6rem", color: "text.disabled" }}
                >
                  no mapa
                </Typography>
              </Stack>
            )}
          </Stack>
        </Collapse>
      </Stack>
    </Paper>
  );
};
