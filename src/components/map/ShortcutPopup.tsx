import { Box, Button, Chip, Divider, Stack, Typography } from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import NearMeIcon from "@mui/icons-material/NearMe";
import type { ShortcutDocument } from "../../api/content";
import { currentMedia, mediaUrl, type ReferenceIndex } from "../../api/references";
import { ContentChip } from "../common/ContentChip";
import type { ShortcutEndName } from "./ShortcutDialog";
import { shortcutName, unlockLabel } from "./shortcutLabels";

interface ShortcutPopupProps {
  shortcut: ShortcutDocument;
  /** A ponta deste marcador. */
  end: ShortcutEndName;
  references: ReferenceIndex;
  mapName: (mapId: string) => string;
  /** Leva o mapa até a outra ponta, trocando de mapa quando é preciso. */
  onGo: (end: ShortcutEndName) => void;
  /** Edição do atalho; sem isto (quem não edita o jogo), o botão não aparece. */
  onEdit?: () => void;
}

/**
 * Popup de uma ponta do atalho. Da origem (ou de qualquer ponta, se for de ida e volta), diz aonde ele leva;
 * do destino de um atalho só de ida, diz de onde se chega. Mostra o que se precisa ter e o que o libera.
 */
export function ShortcutPopup({ shortcut, end, references, mapName, onGo, onEdit }: ShortcutPopupProps) {
  const other: ShortcutEndName = end === "origin" ? "destination" : "origin";
  const departs = end === "origin" || shortcut.bidirectional;
  const otherMap = mapName(shortcut[other].map);
  const sameMap = shortcut.origin.map === shortcut.destination.map;
  const screenshot = currentMedia(shortcut.media, "screenshot");

  return (
    <Box sx={{ minWidth: 240, maxWidth: 300 }}>
      <Stack spacing={1.25}>
        {onEdit && (
          <Button size="small" startIcon={<EditIcon />} onClick={onEdit} sx={{ textTransform: "none", alignSelf: "flex-start" }}>
            Editar atalho
          </Button>
        )}
        {screenshot && (
          <Box component="img" src={mediaUrl(screenshot, "thumb")} alt="Atalho" sx={{ width: "100%", borderRadius: 1, display: "block" }} />
        )}
        <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
          <Typography variant="subtitle2" fontWeight={800}>
            {shortcutName(shortcut.name, mapName(shortcut.destination.map))}
          </Typography>
          <Chip size="small" label={shortcut.bidirectional ? "Ida e volta" : "Só ida"} color={shortcut.bidirectional ? "primary" : "default"} />
        </Stack>
        <Typography variant="body2" color="text.secondary">
          {departs ? "Leva para " : "Chegada de quem vem de "}
          <strong>{sameMap ? "outro ponto deste mapa" : otherMap}</strong>
        </Typography>
        {shortcut.summary && <Typography variant="caption">{shortcut.summary}</Typography>}

        {shortcut.requirements.length > 0 && (
          <Stack spacing={0.5}>
            <Typography variant="caption" fontWeight={700} color="text.secondary">
              Requisitos
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {shortcut.requirements.map((requirement, index) => (
                <ContentChip
                  key={index}
                  target={requirement.target}
                  resolved={references.find(requirement.target)}
                  amount={requirement.amount}
                  level={requirement.level}
                  levelOperator={requirement.levelOperator}
                  notConsumed={requirement.notConsumed}
                  size="small"
                />
              ))}
            </Stack>
          </Stack>
        )}

        {shortcut.unlock.length > 0 && (
          <Stack spacing={0.25}>
            <Typography variant="caption" fontWeight={700} color="text.secondary">
              Desbloqueio
            </Typography>
            {shortcut.unlock.map((row, index) => (
              <Typography key={index} variant="body2">
                {unlockLabel(row.type)}: {[row.target && references.name(row.target), row.value].filter(Boolean).join(" — ")}
              </Typography>
            ))}
          </Stack>
        )}

        <Divider />
        <Button variant="contained" size="small" startIcon={<NearMeIcon />} onClick={() => onGo(other)} fullWidth>
          {departs ? "Seguir o atalho" : "Ver a origem"}
        </Button>
      </Stack>
    </Box>
  );
}
