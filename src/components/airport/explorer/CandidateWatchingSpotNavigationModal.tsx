import { useMemo, useRef } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { MapPinned, Navigation, X } from "lucide-react";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
import { buildSpotNavigationLinks } from "@/features/airport/watcher/spotNavigationLinks";
import { cn } from "@/lib/utils";

type CandidateWatchingSpotNavigationModalProps = {
  spot?: Record<string, any> | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mobile?: boolean;
};

export default function CandidateWatchingSpotNavigationModal({
  spot,
  open,
  onOpenChange,
  mobile = false,
}: CandidateWatchingSpotNavigationModalProps) {
  const { t } = useI18n();
  const returnFocusRef = useRef<HTMLElement | null>(null);
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
        <Dialog.Overlay className="soft-modal-overlay fixed inset-0 z-[var(--z-index-modal)] motion-reduce:animate-none" />
        <Dialog.Content
          className={cn(
            "soft-modal spot-navigation-modal fixed z-[var(--z-index-modal-content)]",
            mobile
              ? "inset-x-[env(safe-area-inset-left)] bottom-0"
              : "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
          )}
          data-mobile={mobile ? "true" : undefined}
          onOpenAutoFocus={() => {
            returnFocusRef.current = document.activeElement instanceof HTMLElement
              ? document.activeElement
              : null;
          }}
          onCloseAutoFocus={(event) => {
            if (returnFocusRef.current?.isConnected) {
              event.preventDefault();
              returnFocusRef.current.focus();
            }
          }}
        >
          <div className="spot-navigation-modal__heading">
            <span className="soft-icon-well"><MapPinned size={20} aria-hidden="true" /></span>
            <div className="min-w-0">
              <Dialog.Title className="text-[16px] font-medium leading-tight">{t("watcherMode.navigationTitle")}</Dialog.Title>
              <Dialog.Description className="mt-2 text-[12px] leading-relaxed text-atc-dim">{t("watcherMode.navigationDescription")}</Dialog.Description>
            </div>
          </div>
          <p className="notranslate spot-navigation-modal__place" translate="no">{links.label}</p>
          <Dialog.Close asChild>
            <button type="button" className="soft-modal-close" aria-label={t("watcherMode.navigationClose")}><X size={16} aria-hidden="true" /></button>
          </Dialog.Close>
          <div className="grid grid-cols-2 gap-3">
            <NavigationLink href={links.nativeMapUrl} icon={Navigation} title={t("watcherMode.navigationNative")} primary onOpenChange={onOpenChange} />
            <NavigationLink href={links.googleMapsUrl} icon={MapPinned} title={t("watcherMode.navigationGoogle")} onOpenChange={onOpenChange} />
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
      className="spot-navigation-link"
      data-primary={primary ? "true" : undefined}
    >
      <span className="soft-icon-well"><Icon size={20} aria-hidden="true" /></span>
      <span>{title}</span>
    </a>
  );
}
