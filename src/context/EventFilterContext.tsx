import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

interface EventFilterContextType {
  activeEventIds: string[];
  toggleEvent: (eventId: string) => void;
  setAllEvents: (eventIds: string[]) => void;
  clearFilters: () => void;
  isEventActive: (eventId: string) => boolean;
}

const EventFilterContext = createContext<EventFilterContextType | undefined>(undefined);

export function EventFilterProvider({ children }: { children: ReactNode }) {
  const [activeEventIds, setActiveEventIds] = useState<string[]>(() => {
    const saved = localStorage.getItem("activeEventIds");
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem("activeEventIds", JSON.stringify(activeEventIds));
  }, [activeEventIds]);

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

  return (
    <EventFilterContext.Provider
      value={{
        activeEventIds,
        toggleEvent,
        setAllEvents,
        clearFilters,
        isEventActive,
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
