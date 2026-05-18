import assert from 'node:assert/strict'

import {
  extractCrossLangTitle,
  fetchAirportWikiSummary,
  getAirportWikiTitleCandidates,
  getCrossLangTitleUrl,
  getWikipediaSummaryUrl,
  normalizeWikipediaSummary,
} from './airportWiki.js'

{
  const candidates = getAirportWikiTitleCandidates({
    name: 'Los Angeles Intl',
    icao: 'KLAX',
    iata: 'LAX',
  })

  assert.deepEqual(candidates, [
    'Los Angeles International Airport',
    'Los Angeles Intl Airport',
    'KLAX Airport',
    'LAX Airport',
  ])
}

{
  const url = getWikipediaSummaryUrl('John F. Kennedy International Airport')
  assert.equal(
    url,
    'https://en.wikipedia.org/api/rest_v1/page/summary/John%20F.%20Kennedy%20International%20Airport',
  )
}

{
  const summary = normalizeWikipediaSummary({
    title: 'John F. Kennedy International Airport',
    extract: 'John F. Kennedy International Airport is an international airport serving New York City.',
    content_urls: {
      desktop: {
        page: 'https://en.wikipedia.org/wiki/John_F._Kennedy_International_Airport',
      },
    },
  })

  assert.equal(summary.title, 'John F. Kennedy International Airport')
  assert.equal(summary.url, 'https://en.wikipedia.org/wiki/John_F._Kennedy_International_Airport')
  assert.ok(summary.extract.includes('serving New York City'))
}

{
  assert.equal(normalizeWikipediaSummary({ title: 'Missing page' }), null)
}

// Cross-language URL: zh.wikipedia summary lives on the zh subdomain.
{
  const url = getWikipediaSummaryUrl('芝加哥奥黑尔国际机场', 'zh-CN')
  assert.equal(
    url,
    'https://zh.wikipedia.org/api/rest_v1/page/summary/%E8%8A%9D%E5%8A%A0%E5%93%A5%E5%A5%A5%E9%BB%91%E5%B0%94%E5%9B%BD%E9%99%85%E6%9C%BA%E5%9C%BA',
  )
}

// langlinks URL: ask en.wikipedia for the zh-wiki page title.
{
  const url = getCrossLangTitleUrl('Chicago O’Hare International Airport', 'zh')
  assert.match(url, /^https:\/\/en\.wikipedia\.org\/w\/api\.php\?/)
  assert.match(url, /action=query/)
  assert.match(url, /prop=langlinks/)
  assert.match(url, /lllang=zh/)
  assert.match(url, /redirects=1/)
}

// extractCrossLangTitle reads the first langlink from the MediaWiki action
// API shape. Returns "" when the page has none so the caller can fall back
// to English without a try/catch dance.
{
  const title = extractCrossLangTitle({
    query: {
      pages: {
        12345: {
          pageid: 12345,
          title: "Chicago O'Hare International Airport",
          langlinks: [{ lang: "zh", "*": "芝加哥奥黑尔国际机场" }],
        },
      },
    },
  })
  assert.equal(title, '芝加哥奥黑尔国际机场')
}
{
  assert.equal(
    extractCrossLangTitle({ query: { pages: { 1: { title: 'No links' } } } }),
    '',
  )
  assert.equal(extractCrossLangTitle({}), '')
  assert.equal(extractCrossLangTitle(null), '')
}

// fetchAirportWikiSummary with locale=zh-CN walks the langlinks lookup,
// uses the zh title to hit zh.wikipedia, and includes the Accept-Language
// header so Wikipedia variant-converts to simplified.
{
  const requests = []
  const fetchImpl = async (url, options = {}) => {
    requests.push({ url, headers: options.headers || {} })
    if (url.startsWith('https://en.wikipedia.org/w/api.php')) {
      return {
        ok: true,
        status: 200,
        headers: { get: () => null },
        async text() {
          return JSON.stringify({
            query: {
              pages: {
                42: {
                  langlinks: [{ lang: 'zh', '*': '芝加哥奥黑尔国际机场' }],
                },
              },
            },
          })
        },
      }
    }
    if (url.startsWith('https://zh.wikipedia.org/api/rest_v1/page/summary/')) {
      return {
        ok: true,
        status: 200,
        headers: { get: () => null },
        async text() {
          return JSON.stringify({
            title: '芝加哥奥黑尔国际机场',
            extract: '芝加哥奥黑尔国际机场是位于美国伊利诺伊州芝加哥的国际机场。',
            content_urls: {
              desktop: { page: 'https://zh.wikipedia.org/wiki/芝加哥奥黑尔国际机场' },
            },
          })
        },
      }
    }
    return { ok: false, status: 404, headers: { get: () => null } }
  }

  const summary = await fetchAirportWikiSummary(
    { name: "Chicago O’Hare International Airport", icao: 'KORD', iata: 'ORD' },
    fetchImpl,
    { locale: 'zh-CN' },
  )

  assert.ok(summary)
  assert.equal(summary.title, '芝加哥奥黑尔国际机场')
  assert.match(summary.extract, /国际机场/)
  assert.equal(summary.url, 'https://zh.wikipedia.org/wiki/芝加哥奥黑尔国际机场')

  // First request was the langlinks lookup on en.wikipedia, second hit
  // zh.wikipedia with the zh-CN Accept-Language header.
  assert.match(requests[0].url, /en\.wikipedia\.org\/w\/api\.php/)
  assert.match(requests[1].url, /zh\.wikipedia\.org\/api\/rest_v1\/page\/summary\//)
  assert.equal(requests[1].headers['Accept-Language'], 'zh-CN,zh;q=0.9')
}

// When no langlink exists, fall back to English so the card never shows
// blank. Important: a totally missing translation shouldn't break the UI.
{
  const requests = []
  const fetchImpl = async (url) => {
    requests.push(url)
    if (url.startsWith('https://en.wikipedia.org/w/api.php')) {
      return {
        ok: true,
        status: 200,
        headers: { get: () => null },
        async text() {
          return JSON.stringify({ query: { pages: { 1: { title: 'No links' } } } })
        },
      }
    }
    if (url.startsWith('https://en.wikipedia.org/api/rest_v1/page/summary/')) {
      return {
        ok: true,
        status: 200,
        headers: { get: () => null },
        async text() {
          return JSON.stringify({
            title: 'Some Airport',
            extract: 'Some Airport is a small regional airport.',
            content_urls: {
              desktop: { page: 'https://en.wikipedia.org/wiki/Some_Airport' },
            },
          })
        },
      }
    }
    return { ok: false, status: 404, headers: { get: () => null } }
  }

  const summary = await fetchAirportWikiSummary(
    { name: 'Some Airport', icao: 'KXYZ', iata: 'XYZ' },
    fetchImpl,
    { locale: 'zh-CN' },
  )

  assert.ok(summary)
  assert.equal(summary.title, 'Some Airport')
  // langlinks lookup happened first, then English summary fallback.
  assert.ok(requests.some((url) => url.includes('en.wikipedia.org/w/api.php')))
  assert.ok(requests.some((url) => url.includes('en.wikipedia.org/api/rest_v1/page/summary/')))
}

