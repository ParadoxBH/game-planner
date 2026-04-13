import { useState, useEffect } from "react";
import type { ViewMode } from "../components/common/ViewModeSelector";

export function useViewMode(storageKey: string, defaultMode: ViewMode = "cards") {
  const [viewMode, setViewMode] = useState<ViewMode>(defaultMode);

  useEffect(() => {
    const saved = localStorage.getItem(`viewMode_${storageKey}`);
    if (saved === "cards" || saved === "list" || saved === "icons") {
      setViewMode(saved as ViewMode);
    }
  }, [storageKey]);

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem(`viewMode_${storageKey}`, mode);
  };

  return [viewMode, handleViewModeChange] as const;
}
