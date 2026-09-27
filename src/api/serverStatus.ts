import { queryClient } from "./queryClient";

/**
 * Se o backend está respondendo. O cliente HTTP marca offline quando a requisição nem chega ao
 * servidor e online a cada resposta, de qualquer status.
 */
let online = true;
const listeners = new Set<() => void>();

export const serverStatus = {
  isOnline: () => online,
  set(value: boolean) {
    if (online === value) return;
    online = value;
    // Voltou: refaz o que falhou enquanto o servidor estava fora.
    if (value) void queryClient.refetchQueries({ predicate: (query) => query.state.status === "error" });
    listeners.forEach((listener) => listener());
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
