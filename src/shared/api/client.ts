export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

export interface FetchedFile {
  blob: Blob
  filename: string | null
  mimeType: string | null
}

export function resolveArtifactUrl(path: string): string {
  return `${API_BASE_URL}${path}`
}

export function parseFilenameFromContentDisposition(
  header: string | null,
): string | null {
  if (!header) return null

  const utf8Match = header.match(/filename\*=UTF-8''([^;]+)/i)
  if (utf8Match?.[1]) {
    const encoded = utf8Match[1].trim()
    try {
      return decodeURIComponent(encoded)
    } catch {
      return encoded
    }
  }

  const plainMatch = header.match(/filename="?([^";]+)"?/i)
  return plainMatch?.[1]?.trim() ?? null
}

export async function fetchFile(
  path: string,
  init?: RequestInit,
): Promise<FetchedFile> {
  const response = await fetch(resolveArtifactUrl(path), init)

  if (!response.ok) {
    throw new Error(`File request failed: ${response.status} ${path}`)
  }

  const blob = await response.blob()

  return {
    blob,
    filename: parseFilenameFromContentDisposition(
      response.headers.get('content-disposition'),
    ),
    mimeType:
      response.headers.get('content-type')?.split(';')[0]?.trim() ?? null,
  }
}
