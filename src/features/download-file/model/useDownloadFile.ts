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
import {
  type DownloadInput,
  type DownloadResult,
  type ExecutableDownloadPlan,
  resolveDownloadPlan,
  runDownload,
} from './engine'

export function useDownloadFile(artifact: DownloadArtifact) {
  const platform = useMemo(() => getPlatform(), [])
  const bridgeAvailable = useMemo(
    () => platform.isWebview && hasDownloadBridge(),
    [platform],
  )
  const plan = useMemo(
    () => resolveDownloadPlan(platform, bridgeAvailable),
    [bridgeAvailable, platform],
  )
  const query = useArtifactBlob(artifact, { enabled: plan.requiresBlob })
  const [result, setResult] = useState<DownloadResult | null>(null)
  const [bridgeOutcome, setBridgeOutcome] = useState<BridgeOutcome | null>(null)
  const [guideOpen, setGuideOpen] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const [queued, setQueued] = useState(false)
  const [busy, setBusy] = useState(false)
  const busyRef = useRef(false)
  const resultRef = useRef<DownloadResult | null>(null)

  const downloadUrl = resolveArtifactUrl(artifact.endpoint)

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
    (input: DownloadInput, executablePlan: ExecutableDownloadPlan) => {
      busyRef.current = true
      setBusy(true)
      void runDownload(
        input,
        platform,
        executablePlan,
        createBrowserDownloadDeps(),
      )
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

    if (plan.route === 'server') {
      const outcome: DownloadResult = { method: 'server', uncertain: true }
      resultRef.current = outcome
      setResult(outcome)
      return
    }

    if (plan.route === 'bridge') {
      execute(
        {
          url: downloadUrl,
          blob: query.data?.blob ?? null,
          filename: query.data?.filename ?? artifact.filename,
          mimeType: query.data?.mimeType ?? artifact.mimeType,
        },
        plan,
      )
      return
    }

    if (!query.data) {
      setQueued(true)
      void query.refetch()
      return
    }

    execute(
      {
        url: downloadUrl,
        blob: query.data.blob,
        filename: query.data.filename ?? artifact.filename,
        mimeType: query.data.mimeType ?? artifact.mimeType,
      },
      plan,
    )
  }, [
    artifact.filename,
    artifact.mimeType,
    downloadUrl,
    execute,
    plan,
    query,
    queued,
  ])

  useEffect(() => {
    if (plan.route !== 'local' || !queued || !query.data) return
    setQueued(false)
    execute(
      {
        url: downloadUrl,
        blob: query.data.blob,
        filename: query.data.filename ?? artifact.filename,
        mimeType: query.data.mimeType ?? artifact.mimeType,
      },
      plan,
    )
  }, [
    artifact.filename,
    artifact.mimeType,
    downloadUrl,
    execute,
    plan,
    query.data,
    queued,
  ])

  useEffect(() => {
    if (
      plan.route === 'local' &&
      queued &&
      query.isError &&
      !query.isFetching
    ) {
      setQueued(false)
    }
  }, [plan, queued, query.isError, query.isFetching])

  const openGuide = useCallback(() => setGuideOpen(true), [])
  const closeGuide = useCallback(() => setGuideOpen(false), [])
  const copyLink = useCallback(() => {
    const absoluteUrl = new URL(downloadUrl, window.location.href).href
    void copyTextToClipboard(absoluteUrl).then(setLinkCopied)
  }, [downloadUrl])

  const preparing = plan.route === 'server' ? false : queued || busy
  const disabled =
    plan.route === 'server'
      ? false
      : plan.route === 'bridge'
        ? busy
        : query.isPending || queued || busy
  const error = plan.route === 'local' && query.isError && !queued

  return {
    platform,
    plan,
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
