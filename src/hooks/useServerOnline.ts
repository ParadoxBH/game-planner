import { useSyncExternalStore } from "react";
import { serverStatus } from "../api/serverStatus";

/** Se o backend está respondendo; muda assim que uma requisição falha por rede ou volta a responder. */
export function useServerOnline(): boolean {
  return useSyncExternalStore(serverStatus.subscribe, serverStatus.isOnline);
}
