import { readResponseJson } from "../../../app/api/_shared/apiProxySecurity.js"
import { buildAdsbaoUserAgent } from "../../../config/siteMeta.js"

import { withAuditLogging } from "../../../utils/apiLogger.js"

const WIKIPEDIA_USER_AGENT = buildAdsbaoUserAgent("wikipedia/summary")

// Map our app locales onto Wikipedia language subdomains. Wikipedia's zh
// edition does its own simplified/traditional variant conversion via
// Accept-Language, so we only need the language code here.
const wikiHost = (locale) => {
  if (locale === "zh-CN") return "zh.wikipedia.org"
  return "en.wikipedia.org"
}

const wikiLangCode = (locale) => {
  if (locale === "zh-CN") return "zh"
  return "en"
}

const acceptLanguageFor = (locale) => {
  if (locale === "zh-CN") return "zh-CN,zh;q=0.9"
  return "en-US,en;q=0.9"
}

const cleanText = (value) => String(value || '').replace(/\s+/g, ' ').trim()

const HTML_ENTITY_MAP = Object.freeze({
  amp: "&",
  gt: ">",
  lt: "<",
  quot: '"',
  apos: "'",
  nbsp: " ",
})

const decodeHtmlEntity = (match, entity) => {
  if (entity.startsWith("#x") || entity.startsWith("#X")) {
    const codePoint = Number.parseInt(entity.slice(2), 16)
    return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match
  }
  if (entity.startsWith("#")) {
    const codePoint = Number.parseInt(entity.slice(1), 10)
    return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match
  }
  return HTML_ENTITY_MAP[entity] || match
}

const plainTextFromHtml = (value) =>
  cleanText(String(value || "")
    .replace(/<[^>]*>/g, "")
    .replace(/&(#x?[0-9a-fA-F]+|\w+);/g, decodeHtmlEntity))

const expandAirportName = (name) => {
  const cleaned = cleanText(name)
  if (!cleaned) return ''
  return cleaned
    .replace(/\bIntl\b\.?/i, 'International')
    .replace(/\bInt'l\b/i, 'International')
}

const unique = (values) => {
  const seen = new Set()
  return values.filter((value) => {
    const key = value.toUpperCase()
    if (!value || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export const getAirportWikiTitleCandidates = (airport) => {
  const name = cleanText(airport?.name)
  const expandedName = expandAirportName(name)
  const expandedAirportName = expandedName && !/\bAirport\b/i.test(expandedName)
    ? `${expandedName} Airport`
    : expandedName
  const icao = cleanText(airport?.icao)
  const iata = cleanText(airport?.iata)

  return unique([
    expandedAirportName,
    name && !/\bAirport\b/i.test(name) ? `${name} Airport` : name,
    icao ? `${icao.toUpperCase()} Airport` : '',
    iata ? `${iata.toUpperCase()} Airport` : '',
  ])
}

export const getWikipediaSummaryUrl = (title, locale = "en") => {
  return `https://${wikiHost(locale)}/api/rest_v1/page/summary/${encodeURIComponent(cleanText(title))}`
}

export const normalizeWikipediaSummary = (payload) => {
  const title = plainTextFromHtml(payload?.displaytitle) || cleanText(payload?.title)
  const extract = cleanText(payload?.extract)
  const url = payload?.content_urls?.desktop?.page || payload?.content_urls?.mobile?.page || ''

  if (!title || !extract) return null

  return { title, extract, url }
}

// English Wikipedia returns langlinks via the MediaWiki action API. We use
// it to translate an English title (e.g. "Chicago O'Hare International
// Airport") into the matching article title on the requested wiki (e.g.
// "芝加哥奥黑尔国际机场" on zh.wikipedia.org).
export const getCrossLangTitleUrl = (enTitle, targetLang) => {
  const params = new URLSearchParams({
    action: "query",
    prop: "langlinks",
    titles: cleanText(enTitle),
    lllang: targetLang,
    redirects: "1",
    format: "json",
    origin: "*",
  })
  return `https://en.wikipedia.org/w/api.php?${params.toString()}`
}

export const extractCrossLangTitle = (payload) => {
  const pages = payload?.query?.pages
  if (!pages || typeof pages !== "object") return ""
  const page = Object.values(pages)[0]
  const link = Array.isArray(page?.langlinks) ? page.langlinks[0] : null
  return cleanText(link?.["*"])
}

const fetchCrossLangTitle = async ({ enTitle, targetLang, fetchImpl }) => {
  try {
    const response = await fetchImpl(getCrossLangTitleUrl(enTitle, targetLang), {
      headers: {
        Accept: "application/json",
        "User-Agent": WIKIPEDIA_USER_AGENT,
      },
    })
    if (!response.ok) return ""
    const payload = await readResponseJson(response, {
      label: `Wikipedia langlinks for ${enTitle}`,
      maxBytes: 512 * 1024,
    })
    return extractCrossLangTitle(payload)
  } catch {
    return ""
  }
}

const fetchSummary = async ({ title, locale, fetchImpl }) => {
  const response = await fetchImpl(getWikipediaSummaryUrl(title, locale), {
    headers: {
      Accept: "application/json",
      "Accept-Language": acceptLanguageFor(locale),
      "User-Agent": WIKIPEDIA_USER_AGENT,
    },
  })
  if (!response.ok) return null
  return normalizeWikipediaSummary(
    await readResponseJson(response, {
      label: `Wikipedia summary for ${title}`,
      maxBytes: 512 * 1024,
    }),
  )
}

// For non-English locales we first ask en.wikipedia for the corresponding
// title on the target wiki (Wikidata-backed langlinks), then hit that wiki
// directly. This gives us the natively-written Chinese article instead of
// a machine translation — and it gracefully falls back to English when no
// langlink exists.
export const fetchAirportWikiSummary = async (
  airport,
  fetchImpl = fetch,
  { locale = "en" } = {},
) => {
  const candidates = getAirportWikiTitleCandidates(airport)
  const auditedFetch = withAuditLogging(fetchImpl, {
    service: `Wikipedia[${wikiLangCode(locale)}]`,
  })

  const targetLang = wikiLangCode(locale)
  const sameAsEnglish = targetLang === "en"

  for (const enTitle of candidates) {
    try {
      let title = enTitle
      if (!sameAsEnglish) {
        title = await fetchCrossLangTitle({
          enTitle,
          targetLang,
          fetchImpl: auditedFetch,
        })
        if (!title) continue
      }
      const summary = await fetchSummary({
        title,
        locale,
        fetchImpl: auditedFetch,
      })
      if (summary) return summary
    } catch {
      // Try the next candidate; wiki content is supplemental.
    }
  }

  // Last-ditch: zh lookup failed for every candidate. Fall back to
  // English so the user still sees a summary instead of an empty card.
  if (!sameAsEnglish) {
    for (const enTitle of candidates) {
      try {
        const summary = await fetchSummary({
          title: enTitle,
          locale: "en",
          fetchImpl: auditedFetch,
        })
        if (summary) return summary
      } catch {
        // Same supplemental behavior — fall through.
      }
    }
  }

  return null
}
