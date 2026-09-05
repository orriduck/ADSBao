import { useState } from "react";
import { Camera } from "lucide-react";
import { flagEmoji } from "@/utils/flag";
import { useI18n } from "@/features/app-shell/i18n/useI18n";

type Props = {
  photo?: { src?: unknown; link?: unknown; photographer?: unknown } | null;
  country?: string;
};

export default function IdentityBackdrop({ photo, country = "" }: Props) {
  const src = typeof photo?.src === "string" ? photo.src : "";
  // Remount only the media when its identity changes, clearing load/error state
  // without flashing the previous aircraft or airport behind the new heading.
  return <BackdropMedia key={`${src}:${country}`} photo={photo} country={country} />;
}

function BackdropMedia({ photo, country }: Props) {
  const { t } = useI18n();
  const [status, setStatus] = useState<"loading" | "loaded" | "failed">("loading");
  const src = typeof photo?.src === "string" ? photo.src : "";
  const link = typeof photo?.link === "string" && /^https:\/\//.test(photo.link) ? photo.link : "";
  const credit = String(photo?.photographer || "Photo");
  const creditLabel = t("preview.backgroundPhotoCredit", { credit });
  const flag = flagEmoji(country);
  const loaded = Boolean(src) && status === "loaded";

  return (
    <>
      <div className="identity-backdrop" aria-hidden="true">
        {flag && !loaded ? <span className="identity-backdrop__flag">{flag}</span> : null}
        {src && status !== "failed" ? (
          <img
            src={src}
            alt=""
            decoding="async"
            className="identity-backdrop__photo"
            data-loaded={loaded}
            onLoad={() => setStatus("loaded")}
            onError={() => setStatus("failed")}
          />
        ) : null}
      </div>
      {loaded && link ? (
        <a
          className="identity-backdrop__credit"
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={creditLabel}
          title={creditLabel}
        >
          <Camera size={12} aria-hidden="true" />
        </a>
      ) : null}
    </>
  );
}
