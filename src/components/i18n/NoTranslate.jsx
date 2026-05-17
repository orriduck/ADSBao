// Marks a span of text as non-translatable. Browsers that auto-translate
// (Chrome, Safari, Edge) honor `translate="no"` and the matching
// `notranslate` class — combined, these reliably tell the translator
// to leave identifiers alone: callsigns, ICAO/IATA codes, type
// designators, registrations, frequencies, etc. See
// docs/translation-glossary.md for the full list of categories.
export default function NoTranslate({ as: Tag = "span", className, children, ...rest }) {
  const composedClassName = ["notranslate", className].filter(Boolean).join(" ");
  return (
    <Tag translate="no" className={composedClassName} {...rest}>
      {children}
    </Tag>
  );
}
