const APP_CHROME_COLOR_TOKEN = "--app-page-chrome-bg";

type DocumentThemeColorOptions = {
  documentRef?: Document;
  getComputedStyleFn?: typeof window.getComputedStyle;
};

export function resolveDocumentChromeColor({
  documentRef = document,
  getComputedStyleFn = window.getComputedStyle,
}: DocumentThemeColorOptions = {}) {
  return getComputedStyleFn(documentRef.documentElement)
    .getPropertyValue(APP_CHROME_COLOR_TOKEN)
    .trim();
}

export function syncDocumentThemeColor(
  options: DocumentThemeColorOptions = {},
) {
  const documentRef = options.documentRef || document;
  const meta = documentRef.querySelector<HTMLMetaElement>(
    'meta[name="theme-color"]',
  );
  const color = resolveDocumentChromeColor({
    ...options,
    documentRef,
  });
  if (!meta || !color) return null;
  meta.content = color;
  return color;
}

export function startDocumentThemeColorSync(
  options: DocumentThemeColorOptions = {},
) {
  const documentRef = options.documentRef || document;
  syncDocumentThemeColor({ ...options, documentRef });
  const observer = new MutationObserver(() => {
    syncDocumentThemeColor({ ...options, documentRef });
  });
  observer.observe(documentRef.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => observer.disconnect();
}
