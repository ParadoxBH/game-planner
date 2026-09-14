import { useCallback, useEffect, useState } from "react";
import type { CollectionGroupDocument } from "../api/content";

function readStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

function writeStored(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Sem armazenamento no navegador, o valor vale só enquanto a tela está aberta.
  }
}

/** Estado guardado no navegador pela chave; valor ilegível volta ao padrão. */
export function useStoredState<T>(key: string, fallback: T): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => readStored(key, fallback));

  useEffect(() => {
    setValue(readStored(key, fallback));
  }, [key]);

  const update = useCallback(
    (next: T) => {
      setValue(next);
      writeStored(key, next);
    },
    [key],
  );

  return [value, update];
}

/**
 * Membros de coleção marcados como obtidos, pelo código, guardados no navegador.
 * Usa a mesma chave das telas antigas, então o progresso já marcado continua valendo.
 */
export function useCollectedMembers(gameId: string) {
  const key = `gp_collected_${gameId}`;
  const [collected, setCollected] = useState<Set<string>>(() => new Set(readStored<string[]>(key, [])));

  useEffect(() => {
    setCollected(new Set(readStored<string[]>(key, [])));
  }, [key]);

  const toggle = useCallback(
    (extId: string) => {
      setCollected((previous) => {
        const next = new Set(previous);
        if (next.has(extId)) next.delete(extId);
        else next.add(extId);
        writeStored(key, [...next]);
        return next;
      });
    },
    [key],
  );

  return { collected, toggle };
}

export interface Progress {
  done: number;
  total: number;
}

export const NO_PROGRESS: Progress = { done: 0, total: 0 };

export function groupProgress(group: CollectionGroupDocument, collected: Set<string>): Progress {
  return {
    done: group.members.filter((member) => collected.has(member.extId)).length,
    total: group.members.length,
  };
}

export function addProgress(a: Progress, b: Progress): Progress {
  return { done: a.done + b.done, total: a.total + b.total };
}

export function isComplete(progress: Progress): boolean {
  return progress.total > 0 && progress.done === progress.total;
}
