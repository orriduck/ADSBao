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
            "flex w-[min(92vw,390px)] -translate-x-1/2 -translate-y-1/2 flex-col gap-4",
            "rounded-[var(--atc-radius-panel)] border border-[var(--app-frost-border)]",
            "[background:var(--atc-surface-preview-card)] p-5 text-atc-text",
            "shadow-[var(--preview-card-shadow)] outline-none",
            "[backdrop-filter:var(--app-frost-strong)] [-webkit-backdrop-filter:var(--app-frost-strong)]",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95",
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <Dialog.Title className="text-[16px] font-bold leading-tight text-atc-text">
                {t("watcherMode.navigationTitle")}
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-[12px] leading-relaxed text-atc-dim">
                {t("watcherMode.navigationDescription")}
              </Dialog.Description>
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

          <div className="min-w-0 rounded-[var(--atc-radius-card)] border border-[var(--app-frost-border)] bg-[var(--atc-control-surface)] px-4 py-3 shadow-[var(--atc-control-inset-shadow-subtle)]">
            <div
              className="notranslate truncate text-[13px] font-bold leading-tight text-atc-text"
              translate="no"
            >
              {links.label}
            </div>
            <div className="mt-1 font-mono text-[10px] font-semibold text-atc-faint">
              {t("watcherMode.navigationCoordinates", {
                lat: links.latitudeLabel,
                lon: links.longitudeLabel,
              })}
            </div>
          </div>

          <div className="grid gap-2">
            <NavigationLink
              href={links.nativeMapUrl}
              icon={Navigation}
              title={t("watcherMode.navigationNative")}
              description={t("watcherMode.navigationNativeDescription")}
              primary
              onOpenChange={onOpenChange}
            />
            <NavigationLink
              href={links.googleMapsUrl}
              icon={MapPinned}
              title={t("watcherMode.navigationGoogle")}
              description={t("watcherMode.navigationGoogleDescription")}
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
  description,
  primary = false,
  onOpenChange,
}: {
  href: string;
  icon: typeof Navigation;
  title: string;
  description: string;
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
        "group flex min-h-[70px] items-center gap-3 rounded-[var(--atc-radius-card)] px-4 py-3",
        "text-left no-underline transition-[background,box-shadow,transform,filter] duration-150",
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
      <span className="min-w-0">
        <span
          className={cn(
            "block text-[13px] font-bold leading-tight",
            primary ? "text-[var(--atc-click-fg)]" : "text-atc-text",
          )}
        >
          {title}
        </span>
        <span
          className={cn(
            "mt-1 block text-[11px] font-medium leading-snug",
            primary ? "text-[var(--atc-click-muted)]" : "text-atc-dim",
          )}
        >
          {description}
        </span>
      </span>
    </a>
  );
}
