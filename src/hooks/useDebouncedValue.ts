import { useEffect, useState } from "react";

/** O valor só muda depois de ficar parado por `delay` ms. Evita uma requisição por tecla na busca. */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
