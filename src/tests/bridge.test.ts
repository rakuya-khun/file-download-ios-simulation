import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  type BridgeDownloadPayload,
  hasDownloadBridge,
  parseBridgeOutcome,
  postDownloadToBridge,
  subscribeToBridgeOutcome,
} from '@/features/download-file'

const payload: BridgeDownloadPayload = {
  type: 'download',
  url: '/v3/verification/qr.json',
  filename: 'verification-qr.json',
  mimeType: 'application/json',
}

afterEach(() => {
  delete window.DownloadBridge
  delete window.flutter_inappwebview
  delete window.onDownloadBridgeResult
})

describe('hasDownloadBridge', () => {
  it('is false without any bridge', () => {
    expect(hasDownloadBridge()).toBe(false)
  })

  it('detects the DownloadBridge channel', () => {
    window.DownloadBridge = { postMessage: vi.fn() }
    expect(hasDownloadBridge()).toBe(true)
  })

  it('detects flutter_inappwebview', () => {
    window.flutter_inappwebview = { callHandler: vi.fn(async () => undefined) }
    expect(hasDownloadBridge()).toBe(true)
  })
})

describe('postDownloadToBridge', () => {
  it('serializes the payload through DownloadBridge.postMessage', () => {
    const postMessage = vi.fn()
    window.DownloadBridge = { postMessage }

    expect(postDownloadToBridge(payload)).toBe(true)
    expect(postMessage).toHaveBeenCalledTimes(1)
    expect(JSON.parse(postMessage.mock.calls[0]?.[0] as string)).toEqual(
      payload,
    )
  })

  it('prefers DownloadBridge over flutter_inappwebview', () => {
    const postMessage = vi.fn()
    const callHandler = vi.fn(async () => undefined)
    window.DownloadBridge = { postMessage }
    window.flutter_inappwebview = { callHandler }

    expect(postDownloadToBridge(payload)).toBe(true)
    expect(postMessage).toHaveBeenCalledTimes(1)
    expect(callHandler).not.toHaveBeenCalled()
  })

  it('calls the flutter_inappwebview handler as a fallback', () => {
    const callHandler = vi.fn(async () => undefined)
    window.flutter_inappwebview = { callHandler }

    expect(postDownloadToBridge(payload)).toBe(true)
    expect(callHandler).toHaveBeenCalledWith('downloadBridge', payload)
  })

  it('forwards the flutter_inappwebview return value as an outcome', async () => {
    const callHandler = vi.fn(
      async () => '{"status":"saved","filename":"verification-qr.json"}',
    )
    window.flutter_inappwebview = { callHandler }
    const listener = vi.fn()
    const unsubscribe = subscribeToBridgeOutcome(listener)

    postDownloadToBridge(payload)

    await vi.waitFor(() =>
      expect(listener).toHaveBeenCalledWith({
        status: 'saved',
        filename: 'verification-qr.json',
      }),
    )
    unsubscribe()
  })

  it('returns false when no bridge exists', () => {
    expect(postDownloadToBridge(payload)).toBe(false)
  })
})

describe('parseBridgeOutcome', () => {
  it('parses a saved outcome with filename', () => {
    expect(
      parseBridgeOutcome(
        '{"status":"saved","filename":"verification-qr.json"}',
      ),
    ).toEqual({ status: 'saved', filename: 'verification-qr.json' })
  })

  it('parses outcomes without a filename', () => {
    expect(parseBridgeOutcome('{"status":"cancelled"}')).toEqual({
      status: 'cancelled',
      filename: undefined,
    })
  })

  it('rejects unknown statuses and invalid JSON', () => {
    expect(parseBridgeOutcome('{"status":"exploded"}')).toBeNull()
    expect(parseBridgeOutcome('not-json')).toBeNull()
  })
})

describe('subscribeToBridgeOutcome', () => {
  it('fans a single callback out to every subscriber', () => {
    const first = vi.fn()
    const second = vi.fn()
    const unsubscribeFirst = subscribeToBridgeOutcome(first)
    const unsubscribeSecond = subscribeToBridgeOutcome(second)

    window.onDownloadBridgeResult?.('{"status":"saved"}')

    expect(first).toHaveBeenCalledWith({
      status: 'saved',
      filename: undefined,
    })
    expect(second).toHaveBeenCalledWith({
      status: 'saved',
      filename: undefined,
    })

    unsubscribeFirst()
    unsubscribeSecond()
    window.onDownloadBridgeResult?.('{"status":"saved"}')
    expect(first).toHaveBeenCalledTimes(1)
    expect(second).toHaveBeenCalledTimes(1)
  })

  it('ignores replies that are not valid outcomes', () => {
    const listener = vi.fn()
    const unsubscribe = subscribeToBridgeOutcome(listener)

    window.onDownloadBridgeResult?.('garbage')

    expect(listener).not.toHaveBeenCalled()
    unsubscribe()
  })
})
