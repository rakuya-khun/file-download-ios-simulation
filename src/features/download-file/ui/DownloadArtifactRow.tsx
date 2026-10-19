import type { DownloadArtifact } from '@/entities/download-artifact'
import { formatBytes } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/Button'
import type { BridgeOutcome } from '../model/bridge'
import type { DownloadMethod } from '../model/engine'
import { useDownloadFile } from '../model/useDownloadFile'
import { SaveGuideDialog } from './SaveGuideDialog'

const KIND_LABELS: Record<DownloadArtifact['id'], string> = {
  json: 'JSON',
  pdf: 'PDF',
}

const METHOD_MESSAGES: Record<DownloadMethod, string> = {
  bridge: 'Handed to the app — it will save the file to your phone.',
  share: 'Share sheet opened — choose "Save to Files".',
  'octet-stream': 'Download triggered (octet-stream fallback).',
  anchor: 'Download triggered.',
  'data-uri': 'Download triggered (data URI fallback).',
  guide: 'This screen cannot download directly.',
  cancelled: 'Cancelled.',
}

const BRIDGE_OUTCOME_MESSAGES: Record<BridgeOutcome['status'], string> = {
  saved: 'Saved to your phone.',
  failed: 'The app could not save the file — use the guide.',
  cancelled: 'Cancelled in the app.',
}

const UNCERTAIN_SUFFIX =
  ' If nothing happened, use the direct link or copy the link into your browser.'

interface DownloadArtifactRowProps {
  artifact: DownloadArtifact
}

export function DownloadArtifactRow({ artifact }: DownloadArtifactRowProps) {
  const download = useDownloadFile(artifact)
  const bridgeOutcomeMessage = download.bridgeOutcome
    ? BRIDGE_OUTCOME_MESSAGES[download.bridgeOutcome.status]
    : null

  const buttonLabel = download.error
    ? 'Retry'
    : download.preparing
      ? 'Preparing…'
      : 'Download'

  const meta = [artifact.mimeType, download.size]
    .filter((part) => part !== null)
    .map((part) => (typeof part === 'number' ? formatBytes(part) : part))
    .join(' · ')

  return (
    <li
      data-testid={`artifact-${artifact.id}`}
      className="flex flex-col gap-4 rounded-xl border border-white/10 bg-surface p-5"
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 font-display text-xs font-bold tracking-wide"
        >
          {KIND_LABELS[artifact.id]}
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="font-display text-base font-semibold">
            {artifact.label}
          </h2>
          <p className="text-sm text-muted">{artifact.description}</p>
          <p className="text-xs text-muted">
            {meta} · saves as {artifact.filename}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          data-testid={`download-${artifact.id}`}
          disabled={download.disabled}
          onClick={download.start}
        >
          {buttonLabel}
        </Button>
        <Button asChild variant="secondary">
          <a
            data-testid={`direct-link-${artifact.id}`}
            href={download.downloadUrl}
          >
            Direct link
          </a>
        </Button>
        <Button
          type="button"
          variant="ghost"
          data-testid={`copy-link-${artifact.id}`}
          onClick={download.copyLink}
        >
          {download.linkCopied ? 'Link copied' : 'Copy link'}
        </Button>
      </div>

      {download.error ? (
        <p
          role="alert"
          data-testid={`error-${artifact.id}`}
          className="text-sm text-red-400"
        >
          Could not prepare the file. Check your connection and retry.
        </p>
      ) : null}

      {!download.error && (download.result || download.preparing) ? (
        <p
          role="status"
          data-testid={`status-${artifact.id}`}
          className="text-sm text-muted"
        >
          {download.result
            ? `${bridgeOutcomeMessage ?? METHOD_MESSAGES[download.result.method]}${
                !bridgeOutcomeMessage && download.result.uncertain
                  ? UNCERTAIN_SUFFIX
                  : ''
              }`
            : 'Preparing the file…'}
        </p>
      ) : null}

      <button
        type="button"
        onClick={download.openGuide}
        className="cursor-pointer self-start text-sm underline underline-offset-2 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        Not working? Show guide
      </button>

      <SaveGuideDialog
        open={download.guideOpen}
        platform={download.platform}
        downloadUrl={download.downloadUrl}
        linkCopied={download.linkCopied}
        onCopyLink={download.copyLink}
        onClose={download.closeGuide}
      />
    </li>
  )
}
