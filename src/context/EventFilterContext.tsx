import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

interface EventUserPreference {
  active: boolean;
  timestamp: number;
}

interface EventFilterContextType {
  activeEventIds: string[];
  toggleEvent: (eventId: string) => void;
  setAllEvents: (eventIds: string[]) => void;
  clearFilters: () => void;
  isEventActive: (eventId: string) => boolean;
  seenEventIds: string[];
  markEventsAsSeen: (eventIds: string[]) => void;
  initializeNewEvents: (events: any[]) => void;
  restoreDefaults: (events: any[]) => void;
  checkEventLive: (event: any) => boolean;
}

const EventFilterContext = createContext<EventFilterContextType | undefined>(undefined);

export function EventFilterProvider({ children }: { children: ReactNode }) {
  const [userPreferences, setUserPreferences] = useState<Record<string, EventUserPreference>>(() => {
    const saved = localStorage.getItem("eventUserPreferences");
    if (saved) return JSON.parse(saved);
    
    // Migração: se tivermos activeEventIds da versão antiga, convertemos
    const oldActive = localStorage.getItem("activeEventIds");
    if (oldActive) {
      try {
        const ids: string[] = JSON.parse(oldActive);
        const initialPrefs: Record<string, EventUserPreference> = {};
        ids.forEach(id => {
          initialPrefs[id] = { active: true, timestamp: Date.now() };
        });
        return initialPrefs;
      } catch (e) {
        return {};
      }
    }
    
    return {};
  });

  const [activeEventIds, setActiveEventIds] = useState<string[]>([]);

  const [seenEventIds, setSeenEventIds] = useState<string[]>(() => {
    const saved = localStorage.getItem("seenEventIds");
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem("eventUserPreferences", JSON.stringify(userPreferences));
  }, [userPreferences]);

  useEffect(() => {
    localStorage.setItem("activeEventIds", JSON.stringify(activeEventIds));
  }, [activeEventIds]);

  useEffect(() => {
    localStorage.setItem("seenEventIds", JSON.stringify(seenEventIds));
  }, [seenEventIds]);

  const toggleEvent = (eventId: string) => {
    setUserPreferences((prev) => {
      const currentPref = prev[eventId];
      const isCurrentlyActive = currentPref ? currentPref.active : activeEventIds.includes(eventId);
      const nextActive = !isCurrentlyActive;

      const newPrefs = {
        ...prev,
        [eventId]: { active: nextActive, timestamp: Date.now() },
      };

      // Sincroniza activeEventIds imediatamente
      setActiveEventIds((ids) =>
        nextActive
          ? (ids.includes(eventId) ? ids : [...ids, eventId])
          : ids.filter((id) => id !== eventId)
      );

      return newPrefs;
    });
  };

  const setAllEvents = (eventIds: string[]) => {
    const newPrefs = { ...userPreferences };
    eventIds.forEach(id => {
      newPrefs[id] = { active: true, timestamp: Date.now() };
    });
    setUserPreferences(newPrefs);
    setActiveEventIds(eventIds);
  };

  const clearFilters = () => {
    const newPrefs = { ...userPreferences };
    Object.keys(newPrefs).forEach(id => {
      newPrefs[id] = { ...newPrefs[id], active: false, timestamp: Date.now() };
    });
    setUserPreferences(newPrefs);
    setActiveEventIds([]);
  };

  const isEventActive = (eventId: string) => {
    return activeEventIds.includes(eventId);
  };

  const markEventsAsSeen = (eventIds: string[]) => {
    setSeenEventIds(prev => {
      const newIds = eventIds.filter(id => !prev.includes(id));
      if (newIds.length === 0) return prev;
      return [...prev, ...newIds];
    });
  };

  const parseEventDate = (d: string) => {
    if (!d) return null;
    const [day, month, year] = d.split('/').map(Number);
    return new Date(year, month - 1, day);
  };

  const isEventLiveAt = (event: any, date: Date) => {
    if (!event.period || (!event.period.start && !event.period.end)) return true;
    const start = parseEventDate(event.period.start) || new Date(0);
    const end = parseEventDate(event.period.end) || new Date(9999, 11, 31);
    return date >= start && date <= end;
  };

  const isEventLive = (event: any) => {
    return isEventLiveAt(event, new Date());
  };

  const initializeNewEvents = (events: any[]) => {
    const newSeenIds: string[] = [];
    const updatedPreferences = { ...userPreferences };
    let hasChanges = false;

    events.forEach(event => {
      // 1. Marca como visto se for novo
      if (!seenEventIds.includes(event.id)) {
        newSeenIds.push(event.id);
      }

      // 2. Lógica de Mudança de Status (Status Shift Logic)
      const pref = userPreferences[event.id];
      const isCurrentlyLive = isEventLive(event);

      if (pref) {
        const wasLiveAtInteraction = isEventLiveAt(event, new Date(pref.timestamp));
        if (wasLiveAtInteraction !== isCurrentlyLive) {
          // Status mudou! Reseta para o padrão (o estado atual do evento)
          updatedPreferences[event.id] = { active: isCurrentlyLive, timestamp: Date.now() };
          hasChanges = true;
        }
      } else {
        // Nenhuma preferência salva ainda, define inicial baseado no status atual
        updatedPreferences[event.id] = { active: isCurrentlyLive, timestamp: Date.now() };
        hasChanges = true;
      }
    });

    if (newSeenIds.length > 0) {
      setSeenEventIds(prev => [...prev, ...newSeenIds]);
    }
    
    if (hasChanges) {
      setUserPreferences(updatedPreferences);
    }

    // Sincroniza activeEventIds com base nas preferências atualizadas
    const activeIds = events
      .filter(e => updatedPreferences[e.id]?.active)
      .map(e => e.id);
    
    setActiveEventIds(activeIds);
  };

  const restoreDefaults = (events: any[]) => {
    const newPrefs = { ...userPreferences };
    const liveIds: string[] = [];

    events.forEach(event => {
      const isLive = isEventLive(event);
      newPrefs[event.id] = { active: isLive, timestamp: Date.now() };
      if (isLive) liveIds.push(event.id);
    });

    setUserPreferences(newPrefs);
    setActiveEventIds(liveIds);
  };

  return (
    <EventFilterContext.Provider
      value={{
        activeEventIds,
        toggleEvent,
        setAllEvents,
        clearFilters,
        isEventActive,
        seenEventIds,
        markEventsAsSeen,
        initializeNewEvents,
        restoreDefaults,
        checkEventLive: isEventLive,
      }}
    >
      {children}
    </EventFilterContext.Provider>
  );
}

export function useEventFilter() {
  const context = useContext(EventFilterContext);
  if (context === undefined) {
    throw new Error("useEventFilter must be used within an EventFilterProvider");
  }
  return context;
}
