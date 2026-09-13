import { useState } from "react";
import { Alert, Button, Stack, TextField, Typography, useTheme } from "@mui/material";
import { calculateBounds, EMPTY_BOUNDS, mergeBoundsConfig, type BoundsInput } from "./transforms";

interface FieldDefinition {
  key: keyof BoundsInput;
  label: string;
}

const SECTIONS: { title: string; fields: FieldDefinition[] }[] = [
  {
    title: "Dimensões da imagem de fundo",
    fields: [
      { key: "imgWidth", label: "Largura (px)" },
      { key: "imgHeight", label: "Altura (px)" },
    ],
  },
  {
    title: "Ponto de referência 1",
    fields: [
      { key: "p1ImgX", label: "Imagem X (px)" },
      { key: "p1ImgY", label: "Imagem Y (px)" },
      { key: "p1RealX", label: "Mapa real X" },
      { key: "p1RealY", label: "Mapa real Y" },
    ],
  },
  {
    title: "Ponto de referência 2",
    fields: [
      { key: "p2ImgX", label: "Imagem X (px)" },
      { key: "p2ImgY", label: "Imagem Y (px)" },
      { key: "p2RealX", label: "Mapa real X" },
      { key: "p2RealY", label: "Mapa real Y" },
    ],
  },
];

/** Descobre os bounds do Leaflet a partir de dois pontos conhecidos na imagem e no jogo. */
export function BoundsCalculatorTool() {
  const theme = useTheme();
  const { spacing } = theme.designTokens;
  const [values, setValues] = useState<BoundsInput>(EMPTY_BOUNDS);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");

  const setField = (key: keyof BoundsInput, value: string) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const calculate = () => {
    const outcome = calculateBounds(values);
    if (outcome.ok) {
      setResult(outcome.text);
      setError("");
    } else {
      setError(outcome.error);
    }
  };

  const copyConfig = () => {
    navigator.clipboard
      .writeText(JSON.stringify(values, null, 2))
      .then(() => setError(""))
      .catch(() => setError("Não foi possível copiar para a área de transferência."));
  };

  const pasteConfig = async () => {
    try {
      const text = await navigator.clipboard.readText();
      // Parse fora do setState: um JSON inválido precisa cair no catch, não quebrar a renderização.
      const next = mergeBoundsConfig(values, text);
      setValues(next);
      setError("");
    } catch {
      setError("Não foi possível ler ou parsear os dados da área de transferência.");
    }
  };

  return (
    <Stack spacing={spacing.contentGap}>
      {SECTIONS.map((section) => (
        <Stack key={section.title} spacing={spacing.itemGap}>
          <Typography variant="body2" color="primary" sx={{ fontWeight: 700 }}>
            {section.title}
          </Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={spacing.itemGap}>
            {section.fields.map((field) => (
              <TextField
                key={field.key}
                label={field.label}
                size="small"
                type="number"
                value={values[field.key]}
                onChange={(event) => setField(field.key, event.target.value)}
                fullWidth
              />
            ))}
          </Stack>
        </Stack>
      ))}

      <Stack direction={{ xs: "column", sm: "row" }} spacing={spacing.itemGap}>
        <Button variant="outlined" onClick={copyConfig} fullWidth sx={{ textTransform: "none" }}>
          Copiar configs
        </Button>
        <Button variant="outlined" onClick={pasteConfig} fullWidth sx={{ textTransform: "none" }}>
          Colar configs
        </Button>
        <Button variant="contained" onClick={calculate} fullWidth sx={{ textTransform: "none" }}>
          Calcular
        </Button>
      </Stack>

      {error && <Alert severity="error">{error}</Alert>}

      <TextField
        label="Resultado"
        multiline
        rows={12}
        value={result}
        slotProps={{ input: { readOnly: true } }}
        placeholder="Os bounds aparecem aqui..."
        fullWidth
      />
    </Stack>
  );
}
