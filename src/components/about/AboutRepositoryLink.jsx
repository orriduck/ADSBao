"use client";

import { ArrowUpRight, Github } from "lucide-react";
import { getExternalLinkOpenTarget } from "@/features/about/aboutModel.js";
import { useI18n } from "@/features/app-shell/i18n/useI18n.js";

export default function AboutRepositoryLink({ repository, onOpenExternalLink }) {
  const { t } = useI18n();

  return (
    <div className="about-repository-wrap px-6 pt-6 pb-6">
      <a
        {...getExternalLinkOpenTarget(repository.href)}
        onClick={(event) => onOpenExternalLink(event, repository.href)}
        className="about-repository-link group endf-cornered flex items-center justify-between gap-3 border border-[var(--atc-line-strong)] px-4 py-3.5 transition-colors hover:border-atc-orange"
      >
        <div className="flex items-center gap-3">
          <span className="grid h-8 w-8 place-items-center border border-atc-orange text-atc-orange">
            <Github className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
          <div>
            <strong className="block text-[13px] font-semibold text-atc-text">
              {repository.name}
            </strong>
            <small className="mt-0.5 block font-mono text-[11px] tracking-[0.06em] uppercase text-atc-dim">
              {repository.licenseKey ? t(repository.licenseKey) : repository.license}
            </small>
          </div>
        </div>
        <span className="endf-chip" aria-hidden="true">
          <span className="flex items-center gap-1">
            <span>OPEN</span>
            <ArrowUpRight className="h-3 w-3" />
          </span>
        </span>
      </a>
    </div>
  );
}
