import { useEffect, useMemo } from "react";
import { Button, Stack } from "@mui/material";
import { CloudUpload } from "@mui/icons-material";
import { ContentIcon } from "./ContentIcon";

interface IconUploadFieldProps {
  /** Ícone atual do registro, se tem. */
  currentMediaId: string | null;
  /** Símbolo sem ícone: item, category... */
  kind: string;
  /** Arquivo escolhido e ainda não enviado. */
  file: File | null;
  onChange: (file: File) => void;
}

/** Mostra o ícone atual ou o escolhido e deixa escolher outro. O envio fica com o formulário, ao salvar. */
export function IconUploadField({ currentMediaId, kind, file, onChange }: IconUploadFieldProps) {
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  return (
    <Stack direction="row" spacing={2} alignItems="center">
      {preview ? (
        <img src={preview} alt="Ícone novo" style={{ width: 56, height: 56, objectFit: "contain" }} />
      ) : (
        <ContentIcon mediaId={currentMediaId} kind={kind} size={56} />
      )}
      <Button component="label" variant="outlined" size="small" startIcon={<CloudUpload />} sx={{ textTransform: "none" }}>
        {currentMediaId || file ? "Trocar ícone" : "Enviar ícone"}
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
    </Stack>
  );
}
