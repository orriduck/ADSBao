"use client";

import { ArrowUpRight, Github } from "lucide-react";
import { getExternalLinkOpenTarget } from "@/features/about/aboutModel.js";
import { useI18n } from "@/features/app-shell/i18n/useI18n.js";

export default function AboutRepositoryLink({ repository, onOpenExternalLink }) {
  const { t } = useI18n();

  return (
    <div className="px-6 pt-6 pb-6">
      <a
        {...getExternalLinkOpenTarget(repository.href)}
        onClick={(event) => onOpenExternalLink(event, repository.href)}
        className="group flex items-center justify-between gap-3 border border-[var(--atc-line)] px-4 py-3.5 transition-colors hover:border-[var(--atc-line-strong)]"
      >
        <div className="flex items-center gap-3">
          <span className="grid h-8 w-8 place-items-center rounded-full border border-[var(--atc-line)] text-atc-text">
            <Github className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
          <div>
            <strong className="block text-[13px] font-semibold text-atc-text">
              {repository.name}
            </strong>
            <small className="mt-0.5 block text-[11.5px] text-atc-dim">
              {repository.licenseKey ? t(repository.licenseKey) : repository.license}
            </small>
          </div>
        </div>
        <ArrowUpRight
          className="h-4 w-4 text-atc-faint transition-colors group-hover:text-atc-orange"
          aria-hidden="true"
        />
      </a>
    </div>
  );
}
