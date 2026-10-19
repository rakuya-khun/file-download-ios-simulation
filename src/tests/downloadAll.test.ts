import { describe, expect, it } from 'vitest'
import {
  buildBulkStatusMessage,
  type DownloadResult,
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
      '1 of 2 handled — tap the rest below.',
    )
  })

  it('does not count uncertain octet-stream downloads as saved', () => {
    const outcomes: DownloadResult[] = [
      { method: 'share', uncertain: false },
      { method: 'octet-stream', uncertain: true },
    ]

    expect(buildBulkStatusMessage(outcomes, 2)).toBe(
      '1 of 2 handled — tap the rest below.',
    )
  })

  it('directs to the rows when nothing was saved', () => {
    expect(buildBulkStatusMessage([], 2)).toBe(
      'Nothing was saved — tap each file below.',
    )
    expect(
      buildBulkStatusMessage([{ method: 'guide', uncertain: true }], 2),
    ).toBe('Nothing was saved — tap each file below.')
  })
})
