"use client";

import { getDataSourceCountLabel, getExternalLinkOpenTarget } from "./aboutModel.js";

export default function AboutDataSources({ sources, onOpenExternalLink }) {
  return (
    <>
      <div className="flex-none px-6 pt-6 pb-3">
        <div className="flex items-baseline justify-between border-b border-[var(--atc-line)] pb-2.5 font-mono text-[10px] uppercase tracking-[0.22em] text-atc-faint">
          <span>Data sources</span>
          <span className="tracking-[0.18em] text-atc-dim">
            {getDataSourceCountLabel(sources)}
          </span>
        </div>
      </div>

      <ol className="px-6 divide-y divide-[var(--atc-line)]">
        {sources.map((source) => (
          <li key={source.glyph}>
            <a
              {...getExternalLinkOpenTarget(source.href)}
              onClick={(event) => onOpenExternalLink(event, source.href)}
              className="group grid grid-cols-[56px_minmax(0,1fr)] items-center gap-3 py-3 transition-colors hover:bg-[color-mix(in_oklab,var(--atc-elev)_55%,transparent)] -mx-6 px-6"
            >
              <span className="font-mono text-[16px] font-bold leading-[1] tracking-[0.02em] text-atc-orange">
                {source.glyph}
              </span>
              <span className="min-w-0">
                <strong className="block truncate text-[13px] font-semibold text-atc-text">
                  {source.title}
                </strong>
                <small className="mt-0.5 block truncate text-[11.5px] text-atc-dim">
                  {source.description}
                </small>
              </span>
            </a>
          </li>
        ))}
      </ol>
    </>
  );
}
