"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchSocialSummary,
  postSocialPresence,
  postSocialReaction,
} from "@/features/social/socialClient.js";
import { emptyReactionCounts } from "@/features/social/socialModel.js";

const HEARTBEAT_MS = 30_000;
const SUMMARY_REFRESH_MS = 30_000;

const EMPTY_SUMMARY = Object.freeze({
  entityType: "",
  entityKey: "",
  watching: 0,
  reactions: emptyReactionCounts(),
  viewerReactions: [],
});

export function useSocialEntity(entity, {
  enabled = true,
  heartbeatMs = HEARTBEAT_MS,
  refreshMs = SUMMARY_REFRESH_MS,
} = {}) {
  const entityType = enabled ? entity?.entityType || "" : "";
  const entityKey = enabled ? entity?.entityKey || "" : "";
  const contextAirportIcao = enabled ? entity?.contextAirportIcao || "" : "";
  const stableEntity = useMemo(() => {
    if (!entityType || !entityKey) return null;
    return {
      entityType,
      entityKey,
      contextAirportIcao,
    };
  }, [contextAirportIcao, entityKey, entityType]);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);

  const refreshSummary = useCallback(async ({ signal } = {}) => {
    if (!stableEntity) return null;
    const next = await fetchSocialSummary(stableEntity, { signal });
    setSummary(next || EMPTY_SUMMARY);
    return next;
  }, [stableEntity]);

  useEffect(() => {
    if (!stableEntity) {
      setSummary(EMPTY_SUMMARY);
      return undefined;
    }
    const controller = new AbortController();

    const heartbeat = () => {
      postSocialPresence(stableEntity, { signal: controller.signal }).catch(
        () => {},
      );
    };
    const refresh = () => {
      refreshSummary({ signal: controller.signal }).catch(() => {});
    };

    heartbeat();
    refresh();
    const heartbeatId = setInterval(heartbeat, heartbeatMs);
    const refreshId = setInterval(refresh, refreshMs);

    return () => {
      controller.abort();
      clearInterval(heartbeatId);
      clearInterval(refreshId);
    };
  }, [heartbeatMs, refreshMs, refreshSummary, stableEntity]);

  const toggleReaction = useCallback(async (reaction) => {
    if (!stableEntity || !reaction) return null;
    const result = await postSocialReaction(stableEntity, reaction);
    await refreshSummary();
    return result;
  }, [refreshSummary, stableEntity]);

  return {
    summary,
    refreshSummary,
    toggleReaction,
  };
}
