import { useEffect, useState } from "react";
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

  fullWidth?: boolean;
}

/** Mostra o ícone atual ou o escolhido e deixa escolher outro. O envio fica com o formulário, ao salvar. */
export function IconUploadField({ currentMediaId, kind, file, onChange, noun = "ícone", wide = false, onRemove, fullWidth }: IconUploadFieldProps) {
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

  return (
    <Stack direction="row" spacing={1} alignItems="center" flex={fullWidth ? 1 : undefined}>
      {preview ? (
        <img src={preview} alt="Imagem nova" style={{ width: wide ? 160 : 56, height: wide ? 90 : 56, objectFit: wide ? "cover" : "contain", borderRadius: 4 }} />
      ) : wide && currentMediaId ? (
        <img src={mediaUrl(currentMediaId, "thumb")} alt="Imagem atual" style={{ width: 160, height: 90, objectFit: "cover", borderRadius: 4 }} />
      ) : (
        <ContentIcon mediaId={currentMediaId} kind={kind} size={56} />
      )}
      <Button component="label" variant="outlined" size="small" fullWidth={fullWidth} startIcon={<CloudUpload />} sx={{ textTransform: "none" }}>
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
