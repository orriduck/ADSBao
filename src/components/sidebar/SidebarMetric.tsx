"use client";

// Back-compat shim — the airport + flight sidebar still import these
// names. The actual implementation lives in the shared MetricCard
// primitive under src/components/ui/.

import { MetricCard, MetricGrid } from "@/components/ui/MetricCard";

export const SidebarMetricGrid = MetricGrid;
export const SidebarMetricCard = MetricCard;
