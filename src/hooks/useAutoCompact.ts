import { useEffect, useRef, useState } from "react";

/**
 * Compacta quando o conteúdo não cabe no espaço disponível. `outerRef` é a área (que encolhe com a
 * tela) e `innerRef` o conteúdo no tamanho natural. Guarda a largura do modo completo para saber
 * quando ele volta a caber.
 */
export function useAutoCompact() {
  const [outer, outerRef] = useState<HTMLElement | null>(null);
  const [inner, innerRef] = useState<HTMLElement | null>(null);
  const [compact, setCompact] = useState(false);
  const fullWidth = useRef(0);

  useEffect(() => {
    if (!outer || !inner) return;
    const observer = new ResizeObserver(() => {
      if (!compact) {
        fullWidth.current = inner.offsetWidth;
        if (inner.offsetWidth > outer.clientWidth) setCompact(true);
      } else if (outer.clientWidth >= fullWidth.current) {
        setCompact(false);
      }
    });
    observer.observe(outer);
    observer.observe(inner);
    return () => observer.disconnect();
  }, [outer, inner, compact]);

  return { compact, outerRef, innerRef };
}
