"use client";

import { useState } from "react";
import { SOCIAL_REACTIONS } from "@/features/social/socialModel.js";
import { useI18n } from "@/features/app-shell/i18n/useI18n.js";

const POSITIONS = {
  fire: [0, -50],
  walk: [-42, -18],
  like: [42, -18],
  ticket: [-38, 36],
  camera: [38, 36],
};

export default function SocialReactionRing({
  summary,
  open = false,
  onReaction,
  className = "",
}) {
  const { t } = useI18n();
  const [pending, setPending] = useState("");
  if (!open) return null;
  const viewerReactions = new Set(summary?.viewerReactions || []);

  const handleClick = async (event, reaction) => {
    event.preventDefault();
    event.stopPropagation();
    if (!onReaction || pending) return;
    setPending(reaction.key);
    try {
      await onReaction(reaction.key);
    } finally {
      setPending("");
    }
  };

  return (
    <div className={`social-reaction-ring ${className}`} aria-label={t("social.reactAria")}>
      {SOCIAL_REACTIONS.map((reaction) => {
        const [x, y] = POSITIONS[reaction.key];
        const selected = viewerReactions.has(reaction.key);
        return (
          <button
            key={reaction.key}
            type="button"
            className="social-reaction-ring__button"
            data-selected={selected ? "true" : undefined}
            data-pending={pending === reaction.key ? "true" : undefined}
            style={{ "--social-x": `${x}px`, "--social-y": `${y}px` }}
            aria-label={t(reaction.labelKey)}
            title={t(reaction.labelKey)}
            disabled={Boolean(pending)}
            onClick={(event) => handleClick(event, reaction)}
          >
            <span aria-hidden="true">{reaction.icon}</span>
          </button>
        );
      })}
    </div>
  );
}
