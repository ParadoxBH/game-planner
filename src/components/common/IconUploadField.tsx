import { useEffect, useMemo } from "react";
import { Button, Stack } from "@mui/material";
import { CloudUpload, DeleteOutline } from "@mui/icons-material";
import { mediaUrl } from "../../api/references";
import { ContentIcon } from "./ContentIcon";

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
}

/** Mostra o ícone atual ou o escolhido e deixa escolher outro. O envio fica com o formulário, ao salvar. */
export function IconUploadField({ currentMediaId, kind, file, onChange, noun = "ícone", wide = false, onRemove }: IconUploadFieldProps) {
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  return (
    <Stack direction="row" spacing={2} alignItems="center">
      {preview ? (
        <img src={preview} alt="Imagem nova" style={{ width: wide ? 160 : 56, height: wide ? 90 : 56, objectFit: wide ? "cover" : "contain", borderRadius: 4 }} />
      ) : wide && currentMediaId ? (
        <img src={mediaUrl(currentMediaId, "thumb")} alt="Imagem atual" style={{ width: 160, height: 90, objectFit: "cover", borderRadius: 4 }} />
      ) : (
        <ContentIcon mediaId={currentMediaId} kind={kind} size={56} />
      )}
      <Button component="label" variant="outlined" size="small" startIcon={<CloudUpload />} sx={{ textTransform: "none" }}>
        {currentMediaId || file ? `Trocar ${noun}` : `Enviar ${noun}`}
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
      {onRemove && (currentMediaId || file) && (
        <Button color="error" size="small" startIcon={<DeleteOutline />} onClick={onRemove} sx={{ textTransform: "none" }}>
          Remover
        </Button>
      )}
    </Stack>
  );
}
