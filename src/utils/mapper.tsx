import {
  Button,
  Dialog,
  DialogContent,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
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

export function RemmaperObj() {
  const [open, setOpen] = useState<boolean>(false);
  const [current, setCurrent] = useState<string>("");
  const [processing, setProcessing] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [tab, setTab] = useState<number>(0);

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
      }
    } catch {
      setError("Não foi possivel processar");
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
          </Tabs>
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
          <Typography color="error" sx={{ mt: 1 }}>
            {error}
          </Typography>
        </DialogContent>
      </Dialog>
    </>
  );
}
