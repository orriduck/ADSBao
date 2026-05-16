import { readResponseJson } from "../../../app/api/_shared/apiProxySecurity.js"

import { withAuditLogging } from "../../../utils/apiLogger.js"

const WIKIPEDIA_SUMMARY_BASE = 'https://en.wikipedia.org/api/rest_v1/page/summary'

const cleanText = (value) => String(value || '').replace(/\s+/g, ' ').trim()

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

export const getWikipediaSummaryUrl = (title) => {
  return `${WIKIPEDIA_SUMMARY_BASE}/${encodeURIComponent(cleanText(title))}`
}

export const normalizeWikipediaSummary = (payload) => {
  const title = cleanText(payload?.title)
  const extract = cleanText(payload?.extract)
  const url = payload?.content_urls?.desktop?.page || payload?.content_urls?.mobile?.page || ''

  if (!title || !extract) return null

  return { title, extract, url }
}

export const fetchAirportWikiSummary = async (airport, fetchImpl = fetch) => {
  const candidates = getAirportWikiTitleCandidates(airport)
  const auditedFetch = withAuditLogging(fetchImpl, {
    service: 'Wikipedia',
  })

  for (const title of candidates) {
    try {
      const response = await auditedFetch(getWikipediaSummaryUrl(title), {
        headers: { Accept: 'application/json' },
      })
      if (!response.ok) continue
      const summary = normalizeWikipediaSummary(
        await readResponseJson(response, {
          label: `Wikipedia summary for ${title}`,
          maxBytes: 512 * 1024,
        }),
      )
      if (summary) return summary
    } catch {
      // Try the next candidate; wiki content is supplemental.
    }
  }

  return null
}
