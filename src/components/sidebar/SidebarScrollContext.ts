import { createContext, useContext } from "react";
import type { RefObject } from "react";

// The sidebar scrolls as ONE region below the pinned brand row: the airport
// identity, the flights hero, the search/filters, and the nearby list all
// share a single scroll owner (the shell panel). The nearby list still
// windows — it virtualizes against this shared scroll element using a
// scroll-margin offset instead of owning a nested scroll container.
export const SidebarScrollContext =
  createContext<RefObject<HTMLElement | null> | null>(null);

export function useSidebarScrollRef() {
  return useContext(SidebarScrollContext);
}
