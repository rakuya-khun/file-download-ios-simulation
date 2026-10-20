import type { PlatformInfo } from '@/shared/lib/platform'

export type DownloadMethod =
  | 'bridge'
  | 'server'
  | 'share'
  | 'octet-stream'
  | 'anchor'
  | 'data-uri'
  | 'guide'
  | 'cancelled'

export type DownloadRoute = 'bridge' | 'server' | 'local'

export type DownloadPlan =
  | { route: 'bridge'; requiresBlob: false }
  | { route: 'server'; requiresBlob: false }
  | { route: 'local'; requiresBlob: true }

export type ExecutableDownloadPlan = Exclude<DownloadPlan, { route: 'server' }>

export interface DownloadInput {
  url: string
  blob: Blob | null
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

export function resolveDownloadPlan(
  platform: PlatformInfo,
  bridgeAvailable: boolean,
): DownloadPlan {
  if (platform.isWebview && bridgeAvailable) {
    return { route: 'bridge', requiresBlob: false }
  }

  if (platform.isAndroid && platform.isWebview) {
    return { route: 'server', requiresBlob: false }
  }

  return { route: 'local', requiresBlob: true }
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
  plan: ExecutableDownloadPlan,
  deps: DownloadDeps,
): Promise<DownloadResult> {
  if (plan.route === 'bridge' && deps.handOffToBridge(input)) {
    return { method: 'bridge', uncertain: false }
  }

  if (platform.isAndroid && platform.isWebview) {
    return { method: 'guide', uncertain: true }
  }

  const blob = input.blob
  if (!blob) {
    return { method: 'guide', uncertain: true }
  }

  const file = new File([blob], input.filename, { type: input.mimeType })

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
    await deps.triggerDataUriDownload(blob, input.filename)
    return { method: 'data-uri', uncertain: true }
  }

  if (platform.isIosFamily) {
    const octetStream = new Blob([blob], {
      type: 'application/octet-stream',
    })
    deps.triggerBlobDownload(octetStream, input.filename)
    return { method: 'octet-stream', uncertain: true }
  }

  if (platform.isWebview && !platform.isAndroid) {
    return { method: 'guide', uncertain: true }
  }

  deps.triggerBlobDownload(blob, input.filename)
  return { method: 'anchor', uncertain: platform.isWebview }
}
