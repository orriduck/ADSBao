import assert from 'node:assert/strict'

import {
  getAirportWikiTitleCandidates,
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

