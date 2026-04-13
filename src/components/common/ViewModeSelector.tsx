import { ToggleButton, ToggleButtonGroup, Tooltip } from "@mui/material";
import { ViewModule, ViewList, GridView } from "@mui/icons-material";
import { usePlatform } from "../../hooks/usePlatform";

export type ViewMode = "cards" | "list" | "icons";

interface ViewModeSelectorProps {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export function ViewModeSelector({ mode, onChange }: ViewModeSelectorProps) {
  const handleModeChange = (_: React.MouseEvent<HTMLElement>, nextMode: ViewMode | null) => {
    if (nextMode !== null) {
      onChange(nextMode);
    }
  };
  const { isMobile } = usePlatform();

  return (
    <ToggleButtonGroup
      value={mode}
      exclusive
      onChange={handleModeChange}
      size="small"
      sx={{
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        '& .MuiToggleButton-root': {
          border: 'none',
          color: 'rgba(255, 255, 255, 0.5)',
          px: 1.5,
          '&.Mui-selected': {
            color: 'primary.main',
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
          },
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
          }
        }
      }}
    >
      {!isMobile && <ToggleButton value="cards">
        <Tooltip title="Cards">
          <GridView sx={{ fontSize: 20 }} />
        </Tooltip>
      </ToggleButton>}
      <ToggleButton value="list">
        <Tooltip title="Lista">
          <ViewList sx={{ fontSize: 20 }} />
        </Tooltip>
      </ToggleButton>
      <ToggleButton value="icons">
        <Tooltip title="Ícones">
          <ViewModule sx={{ fontSize: 20 }} />
        </Tooltip>
      </ToggleButton>
    </ToggleButtonGroup>
  );
}
