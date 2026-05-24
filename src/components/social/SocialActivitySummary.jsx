"use client";

import { SOCIAL_REACTIONS } from "@/features/social/socialModel.js";
import { useI18n } from "@/features/app-shell/i18n/useI18n.js";

export default function SocialActivitySummary({
  summary,
  compact = false,
  className = "",
}) {
  const { t } = useI18n();
  const watching = Number(summary?.watching || 0);
  const activeReactions = SOCIAL_REACTIONS.filter(
    (reaction) => Number(summary?.reactions?.[reaction.key] || 0) > 0,
  );
  if (!watching && activeReactions.length === 0) return null;

  return (
    <div
      className={`social-activity-summary ${
        compact ? "social-activity-summary--compact" : ""
      } ${className}`}
    >
      <div className="social-activity-summary__label">
        {compact ? t("social.live") : t("social.liveInterest")}
        {watching > 0 && (
          <>
            <span aria-hidden="true"> · </span>
            <span>{t("social.watchingCount", { count: watching })}</span>
          </>
        )}
      </div>
      {activeReactions.length > 0 && (
        <div className="social-activity-summary__reactions">
          {activeReactions.map((reaction) => (
            <span
              key={reaction.key}
              className="social-activity-summary__reaction"
              title={t(reaction.labelKey)}
            >
              <span aria-hidden="true">{reaction.icon}</span>
              <span>{summary.reactions[reaction.key]}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
