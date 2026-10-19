import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  type DownloadArtifact,
  useArtifactBlob,
} from '@/entities/download-artifact'
import { resolveArtifactUrl } from '@/shared/api/client'
import { copyTextToClipboard } from '@/shared/lib/clipboard'
import { getPlatform } from '@/shared/lib/platform'
import {
  type BridgeOutcome,
  hasDownloadBridge,
  subscribeToBridgeOutcome,
} from './bridge'
import { createBrowserDownloadDeps } from './browser'
import { type DownloadInput, type DownloadResult, runDownload } from './engine'

export function useDownloadFile(artifact: DownloadArtifact) {
  const platform = useMemo(() => getPlatform(), [])
  const query = useArtifactBlob(artifact)
  const [result, setResult] = useState<DownloadResult | null>(null)
  const [bridgeOutcome, setBridgeOutcome] = useState<BridgeOutcome | null>(null)
  const [guideOpen, setGuideOpen] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const [queued, setQueued] = useState(false)
  const [busy, setBusy] = useState(false)
  const busyRef = useRef(false)
  const resultRef = useRef<DownloadResult | null>(null)

  const downloadUrl = resolveArtifactUrl(artifact.endpoint)
  const bridgeAvailable = useMemo(
    () => platform.isWebview && hasDownloadBridge(),
    [platform],
  )

  useEffect(
    () =>
      subscribeToBridgeOutcome((outcome) => {
        if (resultRef.current?.method !== 'bridge') return
        if (outcome.filename && outcome.filename !== artifact.filename) return
        setBridgeOutcome(outcome)
      }),
    [artifact.filename],
  )

  const execute = useCallback(
    (input: DownloadInput) => {
      busyRef.current = true
      setBusy(true)
      void runDownload(input, platform, createBrowserDownloadDeps())
        .then((outcome) => {
          resultRef.current = outcome
          setResult(outcome)
          const needsGuide =
            outcome.method === 'guide' ||
            (outcome.uncertain && platform.isWebview && platform.isIosFamily)
          if (needsGuide) setGuideOpen(true)
        })
        .catch(() => {
          const fallback: DownloadResult = { method: 'guide', uncertain: true }
          resultRef.current = fallback
          setResult(fallback)
          setGuideOpen(true)
        })
        .finally(() => {
          busyRef.current = false
          setBusy(false)
        })
    },
    [platform],
  )

  const start = useCallback(() => {
    if (busyRef.current || queued) return
    resultRef.current = null
    setResult(null)
    setBridgeOutcome(null)
    setLinkCopied(false)

    if (bridgeAvailable) {
      execute({
        url: downloadUrl,
        blob: query.data?.blob ?? null,
        filename: query.data?.filename ?? artifact.filename,
        mimeType: query.data?.mimeType ?? artifact.mimeType,
      })
      return
    }

    if (!query.data) {
      setQueued(true)
      void query.refetch()
      return
    }

    execute({
      url: downloadUrl,
      blob: query.data.blob,
      filename: query.data.filename ?? artifact.filename,
      mimeType: query.data.mimeType ?? artifact.mimeType,
    })
  }, [
    artifact.filename,
    artifact.mimeType,
    bridgeAvailable,
    downloadUrl,
    execute,
    query,
    queued,
  ])

  useEffect(() => {
    if (!queued || !query.data) return
    setQueued(false)
    execute({
      url: downloadUrl,
      blob: query.data.blob,
      filename: query.data.filename ?? artifact.filename,
      mimeType: query.data.mimeType ?? artifact.mimeType,
    })
  }, [
    artifact.filename,
    artifact.mimeType,
    downloadUrl,
    execute,
    query.data,
    queued,
  ])

  useEffect(() => {
    if (queued && query.isError && !query.isFetching) {
      setQueued(false)
    }
  }, [queued, query.isError, query.isFetching])

  const openGuide = useCallback(() => setGuideOpen(true), [])
  const closeGuide = useCallback(() => setGuideOpen(false), [])
  const copyLink = useCallback(() => {
    void copyTextToClipboard(downloadUrl).then(setLinkCopied)
  }, [downloadUrl])

  const preparing = queued || busy
  const disabled = bridgeAvailable ? busy : query.isPending || queued || busy
  const error = !bridgeAvailable && query.isError && !queued

  return {
    platform,
    downloadUrl,
    preparing,
    disabled,
    error,
    size: query.data?.blob.size ?? null,
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
