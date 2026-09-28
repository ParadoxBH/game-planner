import { useEffect, useState } from "react";
import { Button, Stack } from "@mui/material";
import { CloudUpload, DeleteOutline, ImageSearch } from "@mui/icons-material";
import { mediaUrl } from "../../api/references";
import { ContentIcon } from "./ContentIcon";
import { ImagePickerDialog, type PickedImage } from "./ImagePickerDialog";

interface IconUploadFieldProps {
  /** Ícone atual do registro, se tem. */
  currentMediaId: string | null;
  /** Símbolo sem ícone: item, category... */
  kind: string;
  /** Arquivo escolhido e ainda não enviado. */
  file: File | null;
  onChange: (file: File) => void;
  /** Nome da imagem nos botões. Padrão "ícone". */
  noun?: string;
  /** Prévia larga (miniatura de mapa) em vez de quadrada. */
  wide?: boolean;
  /** Com isto, mostra "Remover" quando há imagem: tira a escolhida ou marca a atual para sair ao salvar. */
  onRemove?: () => void;
  /**
   * Com isto (e gameId), aparece "Selecionar": escolhe uma imagem que outro conteúdo do jogo já usa, sem enviar
   * arquivo. A tela guarda o mediaId escolhido em `picked` e o liga ao salvar (ImageUpload.mediaId).
   */
  onPick?: (image: PickedImage) => void;
  /** Imagem escolhida pelo "Selecionar" e ainda não ligada. */
  picked?: string | null;
  gameId?: string;

  fullWidth?: boolean;
}

/** Mostra o ícone atual ou o escolhido e deixa escolher outro. O envio fica com o formulário, ao salvar. */
export function IconUploadField({
  currentMediaId,
  kind,
  file,
  onChange,
  noun = "ícone",
  wide = false,
  onRemove,
  onPick,
  picked = null,
  gameId,
  fullWidth,
}: IconUploadFieldProps) {
  const [picking, setPicking] = useState(false);
  // Prévia lida como data URL: com object URL, a limpeza extra do StrictMode o revogava ainda em uso e
  // a prévia aparecia quebrada. Guarda de qual arquivo é, para não mostrar a de um arquivo anterior.
  const [read, setRead] = useState<{ file: File; url: string } | null>(null);
  useEffect(() => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setRead({ file, url: String(reader.result) });
    reader.readAsDataURL(file);
    return () => reader.abort();
  }, [file]);
  const preview = file && read?.file === file ? read.url : null;
  // O que aparece: o arquivo escolhido, senão a imagem selecionada de outro conteúdo, senão a atual.
  const shownMediaId = picked ?? currentMediaId;

  return (
    <Stack direction="row" spacing={1} alignItems="center" flex={fullWidth ? 1 : undefined}>
      {preview ? (
        <img src={preview} alt="Imagem nova" style={{ width: wide ? 160 : 56, height: wide ? 90 : 56, objectFit: wide ? "cover" : "contain", borderRadius: 4 }} />
      ) : wide && shownMediaId ? (
        <img src={mediaUrl(shownMediaId, "thumb")} alt="Imagem atual" style={{ width: 160, height: 90, objectFit: "cover", borderRadius: 4 }} />
      ) : (
        <ContentIcon mediaId={shownMediaId} kind={kind} size={56} />
      )}
      <Button component="label" variant="outlined" size="small" fullWidth={fullWidth} startIcon={<CloudUpload />} sx={{ textTransform: "none" }}>
        {shownMediaId || file ? `Trocar ${noun}` : `Enviar ${noun}`}
        <input
          type="file"
          accept="image/*"
          hidden
          onChange={(event) => {
            const chosen = event.target.files?.[0];
            if (chosen) onChange(chosen);
            event.target.value = "";
          }}
        />
      </Button>
      {onPick && gameId && (
        <Button
          variant="outlined"
          size="small"
          fullWidth={fullWidth}
          startIcon={<ImageSearch />}
          onClick={() => setPicking(true)}
          sx={{ textTransform: "none" }}
        >
          Selecionar {noun}
        </Button>
      )}
      {picking && gameId && onPick && (
        <ImagePickerDialog
          gameId={gameId}
          onClose={() => setPicking(false)}
          onPick={(image) => {
            onPick(image);
            setPicking(false);
          }}
        />
      )}
      {onRemove && (shownMediaId || file) && (
        <Button color="error" size="small" startIcon={<DeleteOutline />} onClick={onRemove} sx={{ textTransform: "none" }}>
          Remover
        </Button>
      )}
    </Stack>
  );
}
