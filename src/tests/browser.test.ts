import { afterEach, describe, expect, it, vi } from 'vitest'
import { createBrowserDownloadDeps } from '@/features/download-file'

function stubNavigatorProperty(name: 'share' | 'canShare', value: unknown) {
  Object.defineProperty(window.navigator, name, {
    value,
    configurable: true,
  })
}

afterEach(() => {
  Reflect.deleteProperty(window.navigator, 'share')
  Reflect.deleteProperty(window.navigator, 'canShare')
})

describe('createBrowserDownloadDeps', () => {
  it('shares only the file — extra members like title create save-sheet artifacts on iOS', async () => {
    const share = vi.fn(async () => {})
    stubNavigatorProperty('share', share)

    const file = new File(['{}'], 'verification-qr.json', {
      type: 'application/json',
    })
    await createBrowserDownloadDeps().shareFile(file)

    expect(share).toHaveBeenCalledTimes(1)
    expect(share).toHaveBeenCalledWith({ files: [file] })
  })

  it('gates sharing on navigator.canShare with files', () => {
    const canShare = vi.fn(() => true)
    stubNavigatorProperty('canShare', canShare)

    const file = new File(['{}'], 'verification-qr.json')
    expect(createBrowserDownloadDeps().canShareFile(file)).toBe(true)
    expect(canShare).toHaveBeenCalledWith({ files: [file] })
  })

  it('reports no share support when the platform lacks navigator.canShare', () => {
    stubNavigatorProperty('canShare', undefined)

    expect(
      createBrowserDownloadDeps().canShareFile(
        new File(['{}'], 'verification-qr.json'),
      ),
    ).toBe(false)
  })
})
