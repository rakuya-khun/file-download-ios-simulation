import { postDownloadToBridge } from './bridge'
import type { DownloadDeps } from './engine'

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error ?? new Error('Blob read failed'))
    reader.readAsDataURL(blob)
  })
}

function clickAnchor(href: string, filename: string): void {
  const anchor = document.createElement('a')
  anchor.href = href
  anchor.download = filename
  anchor.rel = 'noopener'
  anchor.style.display = 'none'
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
}

export function createBrowserDownloadDeps(): DownloadDeps {
  return {
    canShareFile: (file) =>
      typeof navigator.canShare === 'function' &&
      navigator.canShare({ files: [file] }),
    shareFile: async (file) => {
      await navigator.share({ files: [file] })
    },
    triggerBlobDownload: (blob, filename) => {
      const url = URL.createObjectURL(blob)
      clickAnchor(url, filename)
      setTimeout(() => URL.revokeObjectURL(url), 40_000)
    },
    triggerDataUriDownload: async (blob, filename) => {
      const dataUrl = await blobToDataUrl(blob)
      clickAnchor(dataUrl, filename)
    },
    handOffToBridge: (input) =>
      postDownloadToBridge({
        type: 'download',
        version: 1,
        url: input.url,
        filename: input.filename,
        mimeType: input.mimeType,
      }),
  }
}
