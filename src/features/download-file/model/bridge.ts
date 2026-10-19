export interface BridgeDownloadPayload {
  type: 'download'
  version: 1
  url: string
  filename: string
  mimeType: string
}

export interface BridgeOutcome {
  status: 'saved' | 'failed' | 'cancelled'
  filename?: string
}

interface DownloadBridgeChannel {
  postMessage: (message: string) => void
}

interface InAppWebViewBridge {
  callHandler: (name: string, ...args: unknown[]) => Promise<unknown>
}

declare global {
  interface Window {
    DownloadBridge?: DownloadBridgeChannel
    flutter_inappwebview?: InAppWebViewBridge
    onDownloadBridgeResult?: (message: string) => void
  }
}

export function hasDownloadBridge(): boolean {
  if (typeof window === 'undefined') return false
  return (
    typeof window.DownloadBridge?.postMessage === 'function' ||
    typeof window.flutter_inappwebview?.callHandler === 'function'
  )
}

export function postDownloadToBridge(payload: BridgeDownloadPayload): boolean {
  if (typeof window === 'undefined') return false

  if (typeof window.DownloadBridge?.postMessage === 'function') {
    window.DownloadBridge.postMessage(JSON.stringify(payload))
    return true
  }

  const inAppWebView = window.flutter_inappwebview
  if (typeof inAppWebView?.callHandler === 'function') {
    void inAppWebView
      .callHandler('downloadBridge', payload)
      .then((result) => {
        if (
          typeof result === 'string' &&
          typeof window.onDownloadBridgeResult === 'function'
        ) {
          window.onDownloadBridgeResult(result)
        }
      })
      .catch(() => undefined)
    return true
  }

  return false
}

export function parseBridgeOutcome(raw: string): BridgeOutcome | null {
  try {
    const parsed = JSON.parse(raw) as {
      status?: unknown
      filename?: unknown
    }
    if (
      parsed.status === 'saved' ||
      parsed.status === 'failed' ||
      parsed.status === 'cancelled'
    ) {
      return {
        status: parsed.status,
        filename:
          typeof parsed.filename === 'string' ? parsed.filename : undefined,
      }
    }
    return null
  } catch {
    return null
  }
}

export type BridgeOutcomeListener = (outcome: BridgeOutcome) => void

const outcomeListeners = new Set<BridgeOutcomeListener>()

function ensureGlobalOutcomeHandler(): void {
  if (typeof window === 'undefined') return
  if (typeof window.onDownloadBridgeResult === 'function') return

  window.onDownloadBridgeResult = (raw: string) => {
    const outcome = parseBridgeOutcome(raw)
    if (!outcome) return
    for (const listener of outcomeListeners) {
      listener(outcome)
    }
  }
}

export function subscribeToBridgeOutcome(
  listener: BridgeOutcomeListener,
): () => void {
  outcomeListeners.add(listener)
  ensureGlobalOutcomeHandler()
  return () => {
    outcomeListeners.delete(listener)
  }
}
