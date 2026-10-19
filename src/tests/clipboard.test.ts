import { afterEach, describe, expect, it, vi } from 'vitest'
import { copyTextToClipboard } from '@/shared/lib/clipboard'

afterEach(() => {
  vi.restoreAllMocks()
})

function stubLegacyExecCommand(result: boolean): ReturnType<typeof vi.fn> {
  const execCommand = vi.fn(() => result)
  Object.defineProperty(document, 'execCommand', {
    value: execCommand,
    configurable: true,
  })
  return execCommand
}

describe('copyTextToClipboard', () => {
  it('uses the async clipboard API when available', async () => {
    const writeText = vi.fn(async () => undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    })

    await expect(copyTextToClipboard('hello')).resolves.toBe(true)
    expect(writeText).toHaveBeenCalledWith('hello')
  })

  it('falls back to execCommand when the clipboard API rejects', async () => {
    const writeText = vi.fn(async () => {
      throw new Error('denied')
    })
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    })
    const execCommand = stubLegacyExecCommand(true)

    await expect(copyTextToClipboard('hello')).resolves.toBe(true)
    expect(execCommand).toHaveBeenCalledWith('copy')
  })

  it('falls back to execCommand when the clipboard API is missing', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: undefined,
      configurable: true,
    })
    const execCommand = stubLegacyExecCommand(true)

    await expect(copyTextToClipboard('hello')).resolves.toBe(true)
    expect(execCommand).toHaveBeenCalledWith('copy')
    expect(document.querySelector('textarea')).toBeNull()
  })

  it('reports failure when both strategies fail', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: undefined,
      configurable: true,
    })
    stubLegacyExecCommand(false)

    await expect(copyTextToClipboard('hello')).resolves.toBe(false)
  })
})
