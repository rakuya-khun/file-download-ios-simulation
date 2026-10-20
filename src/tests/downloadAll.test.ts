import { describe, expect, it } from 'vitest'
import {
  buildBulkStatusMessage,
  type DownloadResult,
  SERVER_BULK_MESSAGE,
} from '@/features/download-file'

describe('buildBulkStatusMessage', () => {
  it('reports success when every file was handled', () => {
    const outcomes: DownloadResult[] = [
      { method: 'share', uncertain: false },
      { method: 'anchor', uncertain: false },
    ]

    expect(buildBulkStatusMessage(outcomes, 2)).toBe(
      'All 2 files are on their way.',
    )
  })

  it('reports partial success when a download was cancelled', () => {
    const outcomes: DownloadResult[] = [
      { method: 'share', uncertain: false },
      { method: 'cancelled', uncertain: false },
    ]

    expect(buildBulkStatusMessage(outcomes, 2)).toBe(
      '1 of 2 confirmed — use each file below.',
    )
  })

  it('does not count uncertain downloads as confirmed', () => {
    const outcomes: DownloadResult[] = [
      { method: 'share', uncertain: false },
      { method: 'octet-stream', uncertain: true },
    ]

    expect(buildBulkStatusMessage(outcomes, 2)).toBe(
      '1 of 2 confirmed — use each file below.',
    )
    expect(
      buildBulkStatusMessage(
        [
          { method: 'data-uri', uncertain: true },
          { method: 'server', uncertain: true },
        ],
        2,
      ),
    ).toBe('No download was confirmed — use each file below.')
  })

  it('directs to the rows when nothing was saved', () => {
    expect(buildBulkStatusMessage([], 2)).toBe(
      'No download was confirmed — use each file below.',
    )
    expect(
      buildBulkStatusMessage([{ method: 'guide', uncertain: true }], 2),
    ).toBe('No download was confirmed — use each file below.')
  })

  it('explains that bulk downloads are unavailable on server routes', () => {
    expect(SERVER_BULK_MESSAGE).toContain('use each Download button')
  })
})
