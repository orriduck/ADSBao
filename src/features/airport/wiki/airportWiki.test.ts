import assert from 'node:assert/strict'

import {
  fetchAirportWikiSummary,
} from './airportWiki'

{
  const requests: string[] = []
  const fetchImpl = async (url: string) => {
    requests.push(url)
    if (url.includes('/Los%20Angeles%20International%20Airport')) {
      return {
        ok: true,
        status: 200,
        headers: { get: () => null },
        async text() {
          return JSON.stringify({
            title: 'Los Angeles International Airport',
            extract: 'Los Angeles International Airport is an airport in California.',
            content_urls: {
              desktop: { page: 'https://en.wikipedia.org/wiki/Los_Angeles_International_Airport' },
            },
          })
        },
      }
    }
    return { ok: false, status: 404, headers: { get: () => null } }
  }

  const summary = await fetchAirportWikiSummary({
    name: 'Los Angeles Intl',
    icao: 'KLAX',
    iata: 'LAX',
  }, fetchImpl)

  assert.equal(summary?.title, 'Los Angeles International Airport')
  assert.equal(summary?.url, 'https://en.wikipedia.org/wiki/Los_Angeles_International_Airport')
  assert.ok(requests[0].includes('/Los%20Angeles%20International%20Airport'))
}

// fetchAirportWikiSummary with locale=zh-CN walks the langlinks lookup,
// uses the zh title to hit zh.wikipedia, and includes the Accept-Language
// header so Wikipedia variant-converts to simplified.
{
  const requests: any[] = []
  const fetchImpl = async (url: string, options: Record<string, any> = {}) => {
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
  assert.match(requests[0].headers['User-Agent'], /^ADSBao\//)
  assert.match(requests[1].headers['User-Agent'], /^ADSBao\//)
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
