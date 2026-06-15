import { useMemo } from "react";
import {
  useLocation,
  useNavigate,
  useSearchParams as useRouterSearchParams,
} from "react-router-dom";

type NavigateOptions = {
  scroll?: boolean;
};

function toHref(href: unknown) {
  if (typeof href === "string") return href;
  if (href instanceof URL) return `${href.pathname}${href.search}${href.hash}`;
  if (href && typeof href === "object") {
    const value = href as {
      pathname?: string;
      query?: Record<string, unknown>;
      hash?: string;
    };
    const pathname = value.pathname || "/";
    const search = new URLSearchParams();
    for (const [key, raw] of Object.entries(value.query || {})) {
      if (raw == null) continue;
      if (Array.isArray(raw)) {
        raw.forEach((item) => search.append(key, String(item)));
      } else {
        search.set(key, String(raw));
      }
    }
    const query = search.toString();
    const hash = value.hash
      ? String(value.hash).startsWith("#")
        ? value.hash
        : `#${value.hash}`
      : "";
    return `${pathname}${query ? `?${query}` : ""}${hash}`;
  }
  return String(href || "/");
}

function scrollAfterNavigation(options?: NavigateOptions) {
  if (options?.scroll === false || typeof window === "undefined") return;
  window.scrollTo({ top: 0, left: 0 });
}

export function useRouter() {
  const navigate = useNavigate();
  return useMemo(
    () => ({
      push(href: unknown, options?: NavigateOptions) {
        navigate(toHref(href));
        scrollAfterNavigation(options);
      },
      replace(href: unknown, options?: NavigateOptions) {
        navigate(toHref(href), { replace: true });
        scrollAfterNavigation(options);
      },
      back() {
        navigate(-1);
      },
      forward() {
        navigate(1);
      },
      refresh() {
        window.location.reload();
      },
      prefetch() {
        return Promise.resolve();
      },
    }),
    [navigate],
  );
}

export function usePathname() {
  return useLocation().pathname;
}

export function useSearchParams() {
  const [searchParams] = useRouterSearchParams();
  return searchParams;
}

export function notFound(): never {
  throw new Error("Not found");
}

export function redirect(href: string): never {
  window.location.assign(href);
  throw new Error(`Redirected to ${href}`);
}
