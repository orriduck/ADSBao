import { useMemo } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { MapPinned, Navigation, X } from "lucide-react";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
import { buildSpotNavigationLinks } from "@/features/airport/watcher/spotNavigationLinks";
import { cn } from "@/lib/utils";

type CandidateWatchingSpotNavigationModalProps = {
  spot?: Record<string, any> | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function CandidateWatchingSpotNavigationModal({
  spot,
  open,
  onOpenChange,
}: CandidateWatchingSpotNavigationModalProps) {
  const { t } = useI18n();
  const links = useMemo(
    () =>
      buildSpotNavigationLinks(spot, {
        fallbackLabel: t("watcherMode.fallbackName"),
        userAgent:
          typeof navigator === "undefined" ? "" : navigator.userAgent,
      }),
    [spot, t],
  );

  if (!links) return null;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          className={cn(
            "fixed inset-0 z-[var(--z-index-modal)]",
            "[background:color-mix(in_oklab,var(--atc-bg)_74%,transparent)]",
            "[backdrop-filter:blur(12px)] [-webkit-backdrop-filter:blur(12px)]",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
          )}
        />
        <Dialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-[var(--z-index-modal-content)]",
            "flex w-[min(92vw,360px)] -translate-x-1/2 -translate-y-1/2 flex-col gap-4",
            "rounded-[var(--atc-radius-panel)] border border-[var(--app-frost-border)]",
            "[background:var(--atc-surface-preview-card)] p-5 text-atc-text",
            "shadow-[var(--preview-card-shadow)] outline-none",
            "[backdrop-filter:var(--app-frost-strong)] [-webkit-backdrop-filter:var(--app-frost-strong)]",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95",
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--atc-control-surface)] text-atc-dim shadow-[var(--atc-control-inset-shadow-subtle)]">
                <MapPinned className="size-5" aria-hidden="true" strokeWidth={1.9} />
              </span>
              <div className="min-w-0">
                <Dialog.Title className="text-[16px] font-bold leading-tight text-atc-text">
                  {t("watcherMode.navigationTitle")}
                </Dialog.Title>
                <Dialog.Description className="mt-1 text-[12px] leading-relaxed text-atc-dim">
                  {t("watcherMode.navigationDescription")}
                </Dialog.Description>
                <div
                  className="notranslate mt-2 truncate text-[13px] font-bold leading-tight text-atc-text"
                  translate="no"
                >
                  {links.label}
                </div>
              </div>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-full",
                  "border border-[var(--app-frost-border)] bg-[var(--atc-control-surface)] text-atc-dim",
                  "shadow-[var(--atc-control-inset-shadow-subtle)]",
                  "[backdrop-filter:var(--app-frost)] [-webkit-backdrop-filter:var(--app-frost)]",
                  "transition-[background,color,box-shadow] duration-150 hover:bg-[var(--atc-control-surface-hover)] hover:text-atc-text",
                  "focus:outline-none focus:ring-2 focus:ring-[var(--atc-accent)]",
                )}
                aria-label={t("watcherMode.navigationClose")}
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </Dialog.Close>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <NavigationLink
              href={links.nativeMapUrl}
              icon={Navigation}
              title={t("watcherMode.navigationNative")}
              primary
              onOpenChange={onOpenChange}
            />
            <NavigationLink
              href={links.googleMapsUrl}
              icon={MapPinned}
              title={t("watcherMode.navigationGoogle")}
              onOpenChange={onOpenChange}
            />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function NavigationLink({
  href,
  icon: Icon,
  title,
  primary = false,
  onOpenChange,
}: {
  href: string;
  icon: typeof Navigation;
  title: string;
  primary?: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const externalProps = href.startsWith("http")
    ? { target: "_blank", rel: "noreferrer" }
    : {};

  return (
    <a
      href={href}
      {...externalProps}
      onClick={() => onOpenChange(false)}
      className={cn(
        "group flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-[var(--atc-radius-card)] px-3 py-3",
        "text-center no-underline transition-[background,box-shadow,transform,filter] duration-150",
        "focus:outline-none focus:ring-2 focus:ring-[var(--atc-accent)]",
        primary
          ? cn(
              "border border-transparent [background:var(--atc-glass-active-bg)]",
              "text-[var(--atc-click-fg)] shadow-[var(--atc-glass-rim-shadow)]",
              "[backdrop-filter:var(--atc-glass-active-frost)] [-webkit-backdrop-filter:var(--atc-glass-active-frost)]",
              "hover:[background:var(--atc-glass-active-bg)] hover:brightness-105 active:scale-[0.99]",
            )
          : cn(
              "border border-[var(--app-frost-border)] bg-[var(--atc-control-surface)] text-atc-text",
              "shadow-[var(--atc-control-inset-shadow-subtle)] hover:bg-[var(--atc-control-surface-hover)] active:scale-[0.99]",
            ),
      )}
    >
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-full",
          primary
            ? "bg-[color-mix(in_oklab,var(--atc-click-fg)_14%,transparent)] text-[var(--atc-click-fg)]"
            : "bg-[var(--atc-toolbar-surface)] text-atc-dim shadow-[var(--atc-control-inset-shadow-subtle)]",
        )}
      >
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <span
        className={cn(
          "block max-w-full truncate text-[13px] font-bold leading-tight",
          primary ? "text-[var(--atc-click-fg)]" : "text-atc-text",
        )}
      >
        {title}
      </span>
    </a>
  );
}
