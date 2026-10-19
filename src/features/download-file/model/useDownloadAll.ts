import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo, useRef, useState } from 'react'
import {
  type DownloadArtifact,
  downloadArtifactKeys,
} from '@/entities/download-artifact'
import { fetchFile, resolveArtifactUrl } from '@/shared/api/client'
import { getPlatform } from '@/shared/lib/platform'
import { hasDownloadBridge } from './bridge'
import { createBrowserDownloadDeps } from './browser'
import { type DownloadResult, runDownload } from './engine'

export type DownloadAllStatus =
  | { kind: 'idle' }
  | { kind: 'running' }
  | { kind: 'done'; message: string }

export function buildBulkStatusMessage(
  outcomes: DownloadResult[],
  total: number,
): string {
  const saved = outcomes.filter(
    (outcome) =>
      outcome.method !== 'guide' &&
      outcome.method !== 'cancelled' &&
      !(outcome.method === 'octet-stream' && outcome.uncertain),
  ).length

  if (saved === total) return `All ${total} files are on their way.`
  if (saved === 0) return 'Nothing was saved — tap each file below.'
  return `${saved} of ${total} handled — tap the rest below.`
}

export function useDownloadAll(artifacts: DownloadArtifact[]) {
  const platform = useMemo(() => getPlatform(), [])
  const bridgeAvailable = useMemo(
    () => platform.isWebview && hasDownloadBridge(),
    [platform],
  )
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<DownloadAllStatus>({ kind: 'idle' })
  const runningRef = useRef(false)

  const startAll = useCallback(async () => {
    if (runningRef.current) return
    runningRef.current = true
    setStatus({ kind: 'running' })
    const outcomes: DownloadResult[] = []

    for (const artifact of artifacts) {
      const url = resolveArtifactUrl(artifact.endpoint)
      let blob: Blob | null = null
      let filename = artifact.filename
      let mimeType = artifact.mimeType

      if (!bridgeAvailable) {
        try {
          const data = await queryClient.fetchQuery({
            queryKey: downloadArtifactKeys.file(artifact.id),
            queryFn: () => fetchFile(artifact.endpoint),
            staleTime: Number.POSITIVE_INFINITY,
          })
          blob = data.blob
          filename = data.filename ?? artifact.filename
          mimeType = data.mimeType ?? artifact.mimeType
        } catch {
          continue
        }
      }

      try {
        const outcome = await runDownload(
          { url, blob, filename, mimeType },
          platform,
          createBrowserDownloadDeps(),
        )
        outcomes.push(outcome)
      } catch {
        // Unexpected failure — treated as not saved.
      }
    }

    runningRef.current = false
    setStatus({
      kind: 'done',
      message: buildBulkStatusMessage(outcomes, artifacts.length),
    })
  }, [artifacts, bridgeAvailable, platform, queryClient])

  return {
    startAll,
    status,
    running: status.kind === 'running',
    bridgeAvailable,
  }
}
