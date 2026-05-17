import {
  TRANSLATION_GLOSSARY_ENTRIES,
  groupTranslationGlossaryEntries,
} from "@/config/translationGlossary.js";

const SURFACE_LABELS = {
  sidebar: "Sidebar",
  "map-scale": "Map scale",
  "preview-card": "Preview card",
};

export default function TranslationGlossary() {
  const grouped = groupTranslationGlossaryEntries(TRANSLATION_GLOSSARY_ENTRIES);

  return (
    <section
      className="sr-only"
      aria-hidden="true"
      data-translation-glossary="en-zh-Hans"
    >
      <h2>ADSBao English to Simplified Chinese glossary</h2>
      <p>
        Preferred translations for Google Translate and human review. Airport,
        runway, callsign, route, ICAO, and IATA codes should remain untranslated.
      </p>
      {Object.entries(grouped).map(([surface, entries]) => (
        <table key={surface} data-translation-surface={surface}>
          <caption>{SURFACE_LABELS[surface] || surface}</caption>
          <thead>
            <tr>
              <th scope="col">English term</th>
              <th scope="col">Preferred Simplified Chinese</th>
              <th scope="col">Context</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={`${entry.surface}:${entry.source}`}>
                <th scope="row" lang="en">
                  {entry.source}
                </th>
                <td lang="zh-Hans" className="notranslate" translate="no">
                  {entry.zhHans}
                </td>
                <td lang="en">{entry.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ))}
    </section>
  );
}
