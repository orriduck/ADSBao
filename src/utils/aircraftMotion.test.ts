import assert from 'node:assert/strict'

import {
  parseAdsbPositionTime,
} from './aircraftMotion'

{
  const responseNow = 1_700_000_003_000
  const positionTime = parseAdsbPositionTime({ seen_pos: 1.25 }, responseNow, 1_700_000_003_200)
  assert.equal(positionTime, 1_700_000_001_750)
}

{
  const responseNowSeconds = 1_700_000_003
  const positionTime = parseAdsbPositionTime({ seen: 2 }, responseNowSeconds)
  assert.equal(positionTime, 1_700_000_001_000)
}
