import {
  forwardRef,
  type AnchorHTMLAttributes,
  type MouseEvent,
} from "react";
import { Link as RouterLink } from "react-router-dom";

type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: string | URL | { pathname?: string; query?: Record<string, unknown>; hash?: string };
  replace?: boolean;
  scroll?: boolean;
  prefetch?: boolean;
};

function toHref(href: LinkProps["href"]) {
  if (typeof href === "string") return href;
  if (href instanceof URL) return `${href.pathname}${href.search}${href.hash}`;
  const pathname = href.pathname || "/";
  const search = new URLSearchParams();
  for (const [key, raw] of Object.entries(href.query || {})) {
    if (raw == null) continue;
    if (Array.isArray(raw)) {
      raw.forEach((item) => search.append(key, String(item)));
    } else {
      search.set(key, String(raw));
    }
  }
  const query = search.toString();
  const hash = href.hash
    ? String(href.hash).startsWith("#")
      ? href.hash
      : `#${href.hash}`
    : "";
  return `${pathname}${query ? `?${query}` : ""}${hash}`;
}

const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  {
    href,
    replace = false,
    scroll = true,
    prefetch: _prefetch,
    onClick,
    target,
    ...props
  },
  ref,
) {
  const to = toHref(href);
  const external = /^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(to);
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (!event.defaultPrevented && scroll && !external && !target) {
      window.setTimeout(() => window.scrollTo({ top: 0, left: 0 }), 0);
    }
  };

  if (external || target) {
    return (
      <a
        ref={ref}
        href={to}
        target={target}
        onClick={handleClick}
        {...props}
      />
    );
  }

  return (
    <RouterLink
      ref={ref}
      to={to}
      replace={replace}
      onClick={handleClick}
      {...props}
    />
  );
});

export default Link;
