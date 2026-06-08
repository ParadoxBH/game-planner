import {
  Button,
  Dialog,
  DialogContent,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography
} from "@mui/material";
import type { ReferencePoints } from "../types/gameModels";
import { useState } from "react";

interface RemmaperItens {
  id: string;
  positions: { lat: number; lng: number }[];
}

function remmaperObj(obj: RemmaperItens[]) {
  return obj.reduce((result: ReferencePoints[], item: RemmaperItens) => {
    return [
      ...result,
      ...item.positions.map((position, index) => {
        return {
          id: `${item.id}-${index}`,
          type: "spawn",
          entityId: item.id,
          geom: {
            type: "Point",
            coordinates: `POINT(${position.lat} ${position.lng})`,
          },
        } as ReferencePoints;
      }),
    ];
  }, [] as ReferencePoints[]);
}

export function isDev() {
  return localStorage.getItem("showDev") === "true";
}

export function setIsDev(value: boolean) {
  localStorage.setItem("showDev", value ? "true" : "false");
}

const TAB_OBJECT_REMAPPER = 0;
const TAB_SPAWNERS_REPOSITION = 1;
const TAB_CALCULATE_BOUNDS = 2;

export function RemmaperObj() {
  const [open, setOpen] = useState<boolean>(false);
  const [current, setCurrent] = useState<string>("");
  const [processing, setProcessing] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [tab, setTab] = useState<number>(0);

  // Bounds Calculator States
  const [imgWidth, setImgWidth] = useState<string>("");
  const [imgHeight, setImgHeight] = useState<string>("");
  const [p1ImgX, setP1ImgX] = useState<string>("");
  const [p1ImgY, setP1ImgY] = useState<string>("");
  const [p1RealX, setP1RealX] = useState<string>("");
  const [p1RealY, setP1RealY] = useState<string>("");
  const [p2ImgX, setP2ImgX] = useState<string>("");
  const [p2ImgY, setP2ImgY] = useState<string>("");
  const [p2RealX, setP2RealX] = useState<string>("");
  const [p2RealY, setP2RealY] = useState<string>("");

  const copyInputs = () => {
    const config = {
      imgWidth, imgHeight,
      p1ImgX, p1ImgY, p1RealX, p1RealY,
      p2ImgX, p2ImgY, p2RealX, p2RealY
    };
    navigator.clipboard.writeText(JSON.stringify(config, null, 2));
    setError("");
  };

  const pasteInputs = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const config = JSON.parse(text);
      if (config) {
        if (config.imgWidth !== undefined) setImgWidth(config.imgWidth);
        if (config.imgHeight !== undefined) setImgHeight(config.imgHeight);
        if (config.p1ImgX !== undefined) setP1ImgX(config.p1ImgX);
        if (config.p1ImgY !== undefined) setP1ImgY(config.p1ImgY);
        if (config.p1RealX !== undefined) setP1RealX(config.p1RealX);
        if (config.p1RealY !== undefined) setP1RealY(config.p1RealY);
        if (config.p2ImgX !== undefined) setP2ImgX(config.p2ImgX);
        if (config.p2ImgY !== undefined) setP2ImgY(config.p2ImgY);
        if (config.p2RealX !== undefined) setP2RealX(config.p2RealX);
        if (config.p2RealY !== undefined) setP2RealY(config.p2RealY);
        setError("");
      }
    } catch (err) {
      setError("Não foi possível ler ou parsear os dados da área de transferência.");
    }
  };

  if (!isDev()) return <></>;

  async function handleProcess() {
    try {
      switch (tab) {
        case TAB_OBJECT_REMAPPER:
          handleObjectRemapper();
          break;
        case TAB_SPAWNERS_REPOSITION:
          handleSpawnersReposition();
          break;
        case TAB_CALCULATE_BOUNDS:
          handleCalculateBounds();
          break;
      }
    } catch {
      setError("Não foi possível processar");
      setProcessing("");
    }
  }

  function handleObjectRemapper() {
    var obj = JSON.parse(current);
    var processing = remmaperObj(obj);
    setProcessing(JSON.stringify(processing));
    setError("");
  }

  function handleSpawnersReposition() {
    try {
      var obj: ReferencePoints[] = JSON.parse(current);

      const scaleX = 1;
      const offsetX = +512;
      const scaleY = 1;
      const offsetY = -510.75;

      var newPack: ReferencePoints[] = obj.map((o) => {
        const match = o.geom.coordinates.match(
          /POINT\s*\(\s*(-?\d+\.?\d*)\s+(-?\d+\.?\d*)\s*\)/i
        );
        if (match) {
          const x = parseFloat(match[1]) * scaleX + offsetX;
          const y = parseFloat(match[2]) * scaleY + offsetY;
          return {
            ...o,
            geom: {
              ...o.geom,
              coordinates: `POINT(${x.toFixed(2)} ${y.toFixed(2)})`,
            },
          };
        }
        return o;
      });
      setProcessing(JSON.stringify(newPack, null, 2));
      setError("");
    } catch (e) {
      setError("Erro ao processar JSON ou coordenadas");
    }
  }

  function handleCalculateBounds() {
    try {
      const w = parseFloat(imgWidth);
      const h = parseFloat(imgHeight);
      
      const x1 = parseFloat(p1ImgX);
      const y1 = parseFloat(p1ImgY);
      const rx1 = parseFloat(p1RealX);
      const ry1 = parseFloat(p1RealY);
      
      const x2 = parseFloat(p2ImgX);
      const y2 = parseFloat(p2ImgY);
      const rx2 = parseFloat(p2RealX);
      const ry2 = parseFloat(p2RealY);

      if (isNaN(w) || isNaN(h) || isNaN(x1) || isNaN(y1) || isNaN(rx1) || isNaN(ry1) || isNaN(x2) || isNaN(y2) || isNaN(rx2) || isNaN(ry2)) {
        setError("Por favor, preencha todos os campos com números válidos.");
        return;
      }

      if (x1 === x2) {
        setError("Erro: Posição X da Imagem dos pontos de referência não podem ser iguais.");
        return;
      }
      if (y1 === y2) {
        setError("Erro: Posição Y da Imagem dos pontos de referência não podem ser iguais.");
        return;
      }

      // Linear mapping for X: Real X = m_x * Img X + c_x
      const m_x = (rx2 - rx1) / (x2 - x1);
      const c_x = rx1 - m_x * x1;

      // Linear mapping for Y: Real Y = m_y * Img Y + c_y
      const m_y = (ry2 - ry1) / (y2 - y1);
      const c_y = ry1 - m_y * y1;

      // Real coordinates at the image boundaries:
      // In game coordinates:
      // Real X at Image Left (X=0) and Right (X=width)
      const rx_left = c_x;
      const rx_right = m_x * w + c_x;
      
      // Real Y at Image Top (Y=0) and Bottom (Y=height)
      const ry_top = c_y;
      const ry_bottom = m_y * h + c_y;

      // Leaflet bounds format is [[minY, minX], [maxY, maxX]].
      // Map coordinates to Leaflet simple coordinate bounds.
      // Usually, minX is the minimum of rx_left and rx_right, and maxX is the maximum.
      // minY is the minimum of ry_top and ry_bottom, and maxY is the maximum.
      const minX = Math.min(rx_left, rx_right);
      const maxX = Math.max(rx_left, rx_right);
      const minY = Math.min(ry_top, ry_bottom);
      const maxY = Math.max(ry_top, ry_bottom);

      const boundsStr = `[\n  [\n    ${minY.toFixed(2)},\n    ${minX.toFixed(2)}\n  ],\n  [\n    ${maxY.toFixed(2)},\n    ${maxX.toFixed(2)}\n  ]\n]`;
      
      // Let's also include some helpful context in the results so the user can verify the math/direction
      const resultText = `${boundsStr}\n\n// Informações auxiliares:\n// Direção do eixo X real: ${m_x > 0 ? "Esquerda -> Direita (+)" : "Esquerda -> Direita (-)"}\n// Direção do eixo Y real: ${m_y > 0 ? "Topo -> Fundo (+)" : "Topo -> Fundo (-)"}\n// Real X (0px): ${rx_left.toFixed(2)}\n// Real X (${w}px): ${rx_right.toFixed(2)}\n// Real Y (0px): ${ry_top.toFixed(2)}\n// Real Y (${h}px): ${ry_bottom.toFixed(2)}`;
      
      setProcessing(resultText);
      setError("");
    } catch (e) {
      setError("Erro ao calcular bounds.");
    }
  }

  function handleTab(value: number) {
    setCurrent("");
    setProcessing("");
    setError("");
    setTab(value);
  }

  return (
    <>
      <Button variant="contained" color="primary" onClick={() => setOpen(true)}>
        Load
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogContent
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
            overflow: "hidden",
          }}
        >
          <Tabs value={tab} onChange={(_, value) => handleTab(value)}>
            <Tab label="Object Remapper" value={TAB_OBJECT_REMAPPER} />
            <Tab label="Spawners Reposition" value={TAB_SPAWNERS_REPOSITION} />
            <Tab label="Calcular Bounds" value={TAB_CALCULATE_BOUNDS} />
          </Tabs>

          {tab === TAB_CALCULATE_BOUNDS ? (
            <Stack spacing={2} sx={{ py: 1 }}>
              <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 700 }}>
                Dimensões da Imagem de Fundo
              </Typography>
              <Stack direction="row" spacing={2}>
                <TextField label="Largura (px)" size="small" type="number" value={imgWidth} onChange={(e) => setImgWidth(e.target.value)} fullWidth />
                <TextField label="Altura (px)" size="small" type="number" value={imgHeight} onChange={(e) => setImgHeight(e.target.value)} fullWidth />
              </Stack>

              <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 700, mt: 1 }}>
                Ponto de Referência 1
              </Typography>
              <Stack direction="row" spacing={2}>
                <TextField label="Imagem X (px)" size="small" type="number" value={p1ImgX} onChange={(e) => setP1ImgX(e.target.value)} fullWidth />
                <TextField label="Imagem Y (px)" size="small" type="number" value={p1ImgY} onChange={(e) => setP1ImgY(e.target.value)} fullWidth />
                <TextField label="Mapa Real X" size="small" type="number" value={p1RealX} onChange={(e) => setP1RealX(e.target.value)} fullWidth />
                <TextField label="Mapa Real Y" size="small" type="number" value={p1RealY} onChange={(e) => setP1RealY(e.target.value)} fullWidth />
              </Stack>

              <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 700, mt: 1 }}>
                Ponto de Referência 2
              </Typography>
              <Stack direction="row" spacing={2}>
                <TextField label="Imagem X (px)" size="small" type="number" value={p2ImgX} onChange={(e) => setP2ImgX(e.target.value)} fullWidth />
                <TextField label="Imagem Y (px)" size="small" type="number" value={p2ImgY} onChange={(e) => setP2ImgY(e.target.value)} fullWidth />
                <TextField label="Mapa Real X" size="small" type="number" value={p2RealX} onChange={(e) => setP2RealX(e.target.value)} fullWidth />
                <TextField label="Mapa Real Y" size="small" type="number" value={p2RealY} onChange={(e) => setP2RealY(e.target.value)} fullWidth />
              </Stack>

              <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
                <Button variant="outlined" color="primary" size="small" onClick={copyInputs} fullWidth sx={{ textTransform: "none", fontWeight: 700 }}>
                  Copiar Configs
                </Button>
                <Button variant="outlined" color="primary" size="small" onClick={pasteInputs} fullWidth sx={{ textTransform: "none", fontWeight: 700 }}>
                  Colar Configs
                </Button>
              </Stack>
            </Stack>
          ) : (
            <TextField
              label="Current"
              multiline
              rows={10}
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              fullWidth
              variant="outlined"
              placeholder="Paste your JSON here..."
            />
          )}

          <TextField
            label="Processing"
            multiline
            rows={10}
            value={processing}
            InputProps={{
              readOnly: true,
            }}
            fullWidth
            variant="outlined"
            placeholder="Result will appear here..."
          />
          <Stack spacing={1} direction={"row"}>
            <Button
              variant="contained"
              onClick={() => setProcessing("")}
              fullWidth
            >
              Clear
            </Button>
            <Button
              variant="contained"
              color="secondary"
              onClick={handleProcess}
              fullWidth
            >
              Process
            </Button>
          </Stack>
          {error && (
            <Typography color="error" sx={{ mt: 1, fontWeight: 600 }}>
              {error}
            </Typography>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
