import type { PlatformInfo } from '@/shared/lib/platform'

export type DownloadMethod =
  | 'bridge'
  | 'share'
  | 'octet-stream'
  | 'anchor'
  | 'data-uri'
  | 'guide'
  | 'cancelled'

export interface DownloadInput {
  url: string
  blob: Blob
  filename: string
  mimeType: string
}

export interface DownloadResult {
  method: DownloadMethod
  uncertain: boolean
}

export interface DownloadDeps {
  canShareFile: (file: File) => boolean
  shareFile: (file: File) => Promise<void>
  triggerBlobDownload: (blob: Blob, filename: string) => void
  triggerDataUriDownload: (blob: Blob, filename: string) => Promise<void>
  handOffToBridge: (input: DownloadInput) => boolean
}

function isAbortError(error: unknown): boolean {
  if (error instanceof DOMException) {
    return error.name === 'AbortError'
  }
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    (error as { name?: unknown }).name === 'AbortError'
  )
}

export async function runDownload(
  input: DownloadInput,
  platform: PlatformInfo,
  deps: DownloadDeps,
): Promise<DownloadResult> {
  if (platform.isWebview && deps.handOffToBridge(input)) {
    return { method: 'bridge', uncertain: false }
  }

  const file = new File([input.blob], input.filename, { type: input.mimeType })

  if (platform.isIosFamily && deps.canShareFile(file)) {
    try {
      await deps.shareFile(file)
      return { method: 'share', uncertain: false }
    } catch (error) {
      if (isAbortError(error)) {
        return { method: 'cancelled', uncertain: false }
      }
    }
  }

  if (platform.isIosFamily && platform.isWebview) {
    await deps.triggerDataUriDownload(input.blob, input.filename)
    return { method: 'data-uri', uncertain: true }
  }

  if (platform.isIosFamily) {
    const octetStream = new Blob([input.blob], {
      type: 'application/octet-stream',
    })
    deps.triggerBlobDownload(octetStream, input.filename)
    return { method: 'octet-stream', uncertain: true }
  }

  if (platform.isWebview && !platform.isAndroid) {
    return { method: 'guide', uncertain: true }
  }

  deps.triggerBlobDownload(input.blob, input.filename)
  return { method: 'anchor', uncertain: platform.isWebview }
}
