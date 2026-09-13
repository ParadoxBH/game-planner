import { useState } from "react";
import { Alert, Button, Stack, TextField, Typography, useTheme } from "@mui/material";

interface JsonTransformToolProps {
  description: string;
  placeholder: string;
  /** Mensagem exibida quando a transformação lança erro (JSON inválido, formato inesperado). */
  errorMessage: string;
  transform: (input: string) => string;
}

/** Ferramenta de "cola o JSON, processa, copia o resultado". */
export function JsonTransformTool({ description, placeholder, errorMessage, transform }: JsonTransformToolProps) {
  const theme = useTheme();
  const { spacing } = theme.designTokens;
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");

  const run = () => {
    try {
      setOutput(transform(input));
      setError("");
    } catch {
      setOutput("");
      setError(errorMessage);
    }
  };

  const copy = () => {
    navigator.clipboard
      .writeText(output)
      .catch(() => setError("Não foi possível copiar para a área de transferência."));
  };

  const clear = () => {
    setOutput("");
    setError("");
  };

  return (
    <Stack spacing={spacing.contentGap}>
      <Typography variant="body2" color="text.secondary">
        {description}
      </Typography>

      <TextField
        label="Entrada"
        multiline
        rows={10}
        value={input}
        onChange={(event) => setInput(event.target.value)}
        placeholder={placeholder}
        fullWidth
      />

      <Stack direction={{ xs: "column", sm: "row" }} spacing={spacing.itemGap}>
        <Button variant="contained" onClick={run} disabled={!input.trim()} fullWidth sx={{ textTransform: "none" }}>
          Processar
        </Button>
        <Button variant="outlined" onClick={copy} disabled={!output} fullWidth sx={{ textTransform: "none" }}>
          Copiar resultado
        </Button>
        <Button variant="outlined" onClick={clear} fullWidth sx={{ textTransform: "none" }}>
          Limpar resultado
        </Button>
      </Stack>

      {error && <Alert severity="error">{error}</Alert>}

      <TextField
        label="Resultado"
        multiline
        rows={10}
        value={output}
        slotProps={{ input: { readOnly: true } }}
        placeholder="O resultado aparece aqui..."
        fullWidth
      />
    </Stack>
  );
}
