import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  type DownloadArtifact,
  useArtifactBlob,
} from '@/entities/download-artifact'
import { resolveArtifactUrl } from '@/shared/api/client'
import { copyTextToClipboard } from '@/shared/lib/clipboard'
import { getPlatform } from '@/shared/lib/platform'
import { type BridgeOutcome, subscribeToBridgeOutcome } from './bridge'
import { createBrowserDownloadDeps } from './browser'
import { type DownloadResult, runDownload } from './engine'

export function useDownloadFile(artifact: DownloadArtifact) {
  const platform = useMemo(() => getPlatform(), [])
  const query = useArtifactBlob(artifact)
  const [result, setResult] = useState<DownloadResult | null>(null)
  const [bridgeOutcome, setBridgeOutcome] = useState<BridgeOutcome | null>(null)
  const [guideOpen, setGuideOpen] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const busyRef = useRef(false)

  const downloadUrl = resolveArtifactUrl(artifact.endpoint)

  useEffect(
    () =>
      subscribeToBridgeOutcome((outcome) => {
        if (outcome.filename && outcome.filename !== artifact.filename) return
        setBridgeOutcome(outcome)
      }),
    [artifact.filename],
  )

  const start = useCallback(() => {
    if (!query.data || busyRef.current) return
    busyRef.current = true
    setResult(null)
    setBridgeOutcome(null)
    void runDownload(
      {
        url: downloadUrl,
        blob: query.data.blob,
        filename: query.data.filename ?? artifact.filename,
        mimeType: query.data.mimeType ?? artifact.mimeType,
      },
      platform,
      createBrowserDownloadDeps(),
    )
      .then((outcome) => {
        setResult(outcome)
        const needsGuide =
          outcome.method === 'guide' ||
          (outcome.uncertain && platform.isWebview && platform.isIosFamily)
        if (needsGuide) setGuideOpen(true)
      })
      .catch(() => {
        setResult({ method: 'guide', uncertain: true })
        setGuideOpen(true)
      })
      .finally(() => {
        busyRef.current = false
      })
  }, [artifact.filename, artifact.mimeType, downloadUrl, platform, query.data])

  const openGuide = useCallback(() => setGuideOpen(true), [])
  const closeGuide = useCallback(() => setGuideOpen(false), [])
  const copyLink = useCallback(() => {
    void copyTextToClipboard(downloadUrl).then(setLinkCopied)
  }, [downloadUrl])

  return {
    platform,
    downloadUrl,
    pending: query.isPending,
    error: query.isError,
    result,
    bridgeOutcome,
    start,
    guideOpen,
    openGuide,
    closeGuide,
    copyLink,
    linkCopied,
  }
}
