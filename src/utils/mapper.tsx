import { Button, Dialog, DialogContent, Stack, TextField, Typography } from "@mui/material";
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

export function isDev()
{
  return localStorage.getItem("showDev") === "true";
}

export function setIsDev(value: boolean)
{
  localStorage.setItem("showDev", value ? "true" : "false");
}

export function RemmaperObj() {
  const [open, setOpen] = useState<boolean>(false);
  const [current, setCurrent] = useState<string>("");
  const [processing, setProcessing] = useState<string>("");
  const [error, setError] = useState<string>("");
  
  if (!isDev())
    return <></>

  async function handleProcess() {
    try {
      var obj = JSON.parse(current);
      var processing = remmaperObj(obj);
      setProcessing(JSON.stringify(processing));
      setError("");
    } catch {
      setError("Não foi possivel processar");
      setProcessing("");
    }
  }

  return (<>
    <Button variant="contained" color="primary" onClick={() => setOpen(true)}>
      Load
    </Button>
    <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, overflow: "hidden" }}>
        <Typography variant="h6" gutterBottom>Object Remapper</Typography>
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
          <Button variant="contained" onClick={() => setProcessing("")} fullWidth>
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
        <Typography color="error" sx={{ mt: 1 }}>{error}</Typography>
      </DialogContent>
    </Dialog>
    </>
  );
}
