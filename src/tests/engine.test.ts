import { describe, expect, it, type Mock, vi } from 'vitest'
import {
  type DownloadDeps,
  type DownloadInput,
  type ExecutableDownloadPlan,
  resolveDownloadPlan,
  runDownload,
} from '@/features/download-file'
import { detectPlatform, type PlatformInfo } from '@/shared/lib/platform'

const IPHONE_SAFARI =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
const IPHONE_WEBVIEW =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148'
const ANDROID_WEBVIEW =
  'Mozilla/5.0 (Linux; Android 13; Pixel 6 Build/TQ3A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/118.0.0.0 Mobile Safari/537.36'
const ANDROID_CHROME =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.230 Mobile Safari/537.36'
const DESKTOP_CHROME =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

interface TestDeps {
  deps: DownloadDeps
  canShareFile: Mock
  shareFile: Mock
  triggerBlobDownload: Mock
  triggerDataUriDownload: Mock
  handOffToBridge: Mock
}

function makeDeps(
  options: { canShare?: boolean; shareError?: unknown; bridge?: boolean } = {},
): TestDeps {
  const canShareFile = vi.fn(() => options.canShare ?? false)
  const shareFile = vi.fn(async () => {
    if (options.shareError) throw options.shareError
  })
  const triggerBlobDownload = vi.fn()
  const triggerDataUriDownload = vi.fn(async () => {})
  const handOffToBridge = vi.fn(() => options.bridge ?? false)

  return {
    deps: {
      canShareFile,
      shareFile,
      triggerBlobDownload,
      triggerDataUriDownload,
      handOffToBridge,
    },
    canShareFile,
    shareFile,
    triggerBlobDownload,
    triggerDataUriDownload,
    handOffToBridge,
  }
}

const input: DownloadInput = {
  url: '/v3/verification/qr.json',
  blob: new Blob(['{"ok":true}'], { type: 'application/json' }),
  filename: 'verification-qr.json',
  mimeType: 'application/json',
}

function platformFor(ua: string, maxTouchPoints = 0): PlatformInfo {
  return detectPlatform(ua, maxTouchPoints)
}

function planFor(ua: string, bridge = false): ExecutableDownloadPlan {
  const plan = resolveDownloadPlan(platformFor(ua), bridge)
  if (plan.route === 'server') {
    throw new Error('Server plans must be executed by a real anchor')
  }
  return plan
}

describe('runDownload strategy chain', () => {
  it('uses Web Share on iOS when available', async () => {
    const deps = makeDeps({ canShare: true })
    const result = await runDownload(
      input,
      platformFor(IPHONE_SAFARI),
      planFor(IPHONE_SAFARI),
      deps.deps,
    )

    expect(result).toEqual({ method: 'share', uncertain: false })
    expect(deps.shareFile).toHaveBeenCalledTimes(1)
    const shared = deps.shareFile.mock.calls[0]?.[0] as File
    expect(shared.name).toBe('verification-qr.json')
    expect(deps.triggerBlobDownload).not.toHaveBeenCalled()
  })

  it('reports cancellation when the share sheet is dismissed', async () => {
    const abort = new DOMException('cancelled', 'AbortError')
    const deps = makeDeps({ canShare: true, shareError: abort })
    const result = await runDownload(
      input,
      platformFor(IPHONE_SAFARI),
      planFor(IPHONE_SAFARI),
      deps.deps,
    )

    expect(result.method).toBe('cancelled')
    expect(deps.triggerBlobDownload).not.toHaveBeenCalled()
  })

  it('falls back to octet-stream when share throws unexpectedly', async () => {
    const deps = makeDeps({ canShare: true, shareError: new Error('denied') })
    const result = await runDownload(
      input,
      platformFor(IPHONE_SAFARI),
      planFor(IPHONE_SAFARI),
      deps.deps,
    )

    expect(result.method).toBe('octet-stream')
    expect(result.uncertain).toBe(true)
    const [blob, filename] = deps.triggerBlobDownload.mock.calls[0] as [
      Blob,
      string,
    ]
    expect(blob.type).toBe('application/octet-stream')
    expect(filename).toBe('verification-qr.json')
  })

  it('uses octet-stream on iOS without share support', async () => {
    const deps = makeDeps({ canShare: false })
    const result = await runDownload(
      input,
      platformFor(IPHONE_SAFARI),
      planFor(IPHONE_SAFARI),
      deps.deps,
    )

    expect(result.method).toBe('octet-stream')
    expect(deps.shareFile).not.toHaveBeenCalled()
  })

  it('uses data URI inside iOS webviews', async () => {
    const deps = makeDeps({ canShare: false })
    const result = await runDownload(
      input,
      platformFor(IPHONE_WEBVIEW),
      planFor(IPHONE_WEBVIEW),
      deps.deps,
    )

    expect(result).toEqual({ method: 'data-uri', uncertain: true })
    expect(deps.triggerDataUriDownload).toHaveBeenCalledTimes(1)
    expect(deps.triggerBlobDownload).not.toHaveBeenCalled()
  })

  it('hands off to the native bridge inside iOS webviews when available', async () => {
    const deps = makeDeps({ canShare: true, bridge: true })
    const result = await runDownload(
      input,
      platformFor(IPHONE_WEBVIEW),
      planFor(IPHONE_WEBVIEW, true),
      deps.deps,
    )

    expect(result).toEqual({ method: 'bridge', uncertain: false })
    expect(deps.handOffToBridge).toHaveBeenCalledWith(input)
    expect(deps.canShareFile).not.toHaveBeenCalled()
    expect(deps.shareFile).not.toHaveBeenCalled()
    expect(deps.triggerBlobDownload).not.toHaveBeenCalled()
    expect(deps.triggerDataUriDownload).not.toHaveBeenCalled()
  })

  it('hands off to the native bridge inside Android webviews when available', async () => {
    const deps = makeDeps({ bridge: true })
    const result = await runDownload(
      input,
      platformFor(ANDROID_WEBVIEW),
      planFor(ANDROID_WEBVIEW, true),
      deps.deps,
    )

    expect(result).toEqual({ method: 'bridge', uncertain: false })
    expect(deps.triggerBlobDownload).not.toHaveBeenCalled()
  })

  it('never calls the bridge outside webviews', async () => {
    const deps = makeDeps({ canShare: true, bridge: true })
    const result = await runDownload(
      input,
      platformFor(IPHONE_SAFARI),
      planFor(IPHONE_SAFARI),
      deps.deps,
    )

    expect(deps.handOffToBridge).not.toHaveBeenCalled()
    expect(result).toEqual({ method: 'share', uncertain: false })
  })

  it('hands off to the bridge even before the blob is ready', async () => {
    const deps = makeDeps({ bridge: true })
    const result = await runDownload(
      { ...input, blob: null },
      platformFor(IPHONE_WEBVIEW),
      planFor(IPHONE_WEBVIEW, true),
      deps.deps,
    )

    expect(result).toEqual({ method: 'bridge', uncertain: false })
    expect(deps.handOffToBridge).toHaveBeenCalledWith({ ...input, blob: null })
  })

  it('falls back to the guide when no blob is available', async () => {
    const deps = makeDeps({ canShare: true })
    const result = await runDownload(
      { ...input, blob: null },
      platformFor(DESKTOP_CHROME),
      planFor(DESKTOP_CHROME),
      deps.deps,
    )

    expect(result).toEqual({ method: 'guide', uncertain: true })
    expect(deps.shareFile).not.toHaveBeenCalled()
    expect(deps.triggerBlobDownload).not.toHaveBeenCalled()
  })

  it('uses a direct blob download on desktop', async () => {
    const deps = makeDeps()
    const result = await runDownload(
      input,
      platformFor(DESKTOP_CHROME),
      planFor(DESKTOP_CHROME),
      deps.deps,
    )

    expect(result).toEqual({ method: 'anchor', uncertain: false })
    expect(deps.canShareFile).not.toHaveBeenCalled()
    expect(deps.triggerBlobDownload).toHaveBeenCalledTimes(1)
  })

  it('uses a direct blob download on Android browsers', async () => {
    const deps = makeDeps()
    const result = await runDownload(
      input,
      platformFor(ANDROID_CHROME),
      planFor(ANDROID_CHROME),
      deps.deps,
    )

    expect(result).toEqual({ method: 'anchor', uncertain: false })
  })
})

describe('resolveDownloadPlan', () => {
  it('uses a server anchor for Android webviews without a bridge', () => {
    expect(resolveDownloadPlan(platformFor(ANDROID_WEBVIEW), false)).toEqual({
      route: 'server',
      requiresBlob: false,
    })
  })

  it('prefers the bridge inside Android webviews', () => {
    expect(resolveDownloadPlan(platformFor(ANDROID_WEBVIEW), true)).toEqual({
      route: 'bridge',
      requiresBlob: false,
    })
  })

  it('keeps local strategies on iOS webviews', () => {
    expect(resolveDownloadPlan(platformFor(IPHONE_WEBVIEW), false)).toEqual({
      route: 'local',
      requiresBlob: true,
    })
  })

  it('keeps local strategies on Android browsers', () => {
    expect(resolveDownloadPlan(platformFor(ANDROID_CHROME), false)).toEqual({
      route: 'local',
      requiresBlob: true,
    })
  })

  it('keeps local strategies on desktop', () => {
    expect(resolveDownloadPlan(platformFor(DESKTOP_CHROME), false)).toEqual({
      route: 'local',
      requiresBlob: true,
    })
  })

  it('guards against executing a server plan through runDownload', async () => {
    const deps = makeDeps()
    const result = await runDownload(
      input,
      platformFor(ANDROID_WEBVIEW),
      { route: 'local', requiresBlob: true },
      deps.deps,
    )

    expect(result).toEqual({ method: 'guide', uncertain: true })
    expect(deps.triggerBlobDownload).not.toHaveBeenCalled()
  })
})
