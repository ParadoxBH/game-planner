import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

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
  const [activeEventIds, setActiveEventIds] = useState<string[]>(() => {
    const saved = localStorage.getItem("activeEventIds");
    return saved ? JSON.parse(saved) : [];
  });

  const [seenEventIds, setSeenEventIds] = useState<string[]>(() => {
    const saved = localStorage.getItem("seenEventIds");
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem("activeEventIds", JSON.stringify(activeEventIds));
  }, [activeEventIds]);

  useEffect(() => {
    localStorage.setItem("seenEventIds", JSON.stringify(seenEventIds));
  }, [seenEventIds]);

  const toggleEvent = (eventId: string) => {
    setActiveEventIds((prev) =>
      prev.includes(eventId)
        ? prev.filter((id) => id !== eventId)
        : [...prev, eventId]
    );
  };

  const setAllEvents = (eventIds: string[]) => {
    setActiveEventIds(eventIds);
  };

  const clearFilters = () => {
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

  const isEventLive = (event: any) => {
    if (!event.period || (!event.period.start && !event.period.end)) return true;
    const now = new Date();
    const start = parseEventDate(event.period.start) || new Date(0);
    const end = parseEventDate(event.period.end) || new Date(9999, 11, 31);
    return now >= start && now <= end;
  };

  const initializeNewEvents = (events: any[]) => {
    const newActiveIds: string[] = [];
    const newSeenIds: string[] = [];

    events.forEach(event => {
      if (!seenEventIds.includes(event.id)) {
        newSeenIds.push(event.id);
        if (isEventLive(event)) {
          newActiveIds.push(event.id);
        }
      }
    });

    if (newSeenIds.length > 0) {
      setSeenEventIds(prev => [...prev, ...newSeenIds]);
    }
    if (newActiveIds.length > 0) {
      setActiveEventIds(prev => [...prev, ...newActiveIds]);
    }
  };

  const restoreDefaults = (events: any[]) => {
    const liveIds = events.filter(e => isEventLive(e)).map(e => e.id);
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
