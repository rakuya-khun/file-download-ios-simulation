import type { DownloadArtifact } from '@/entities/download-artifact'
import { Button } from '@/shared/ui/Button'
import type { BridgeOutcome } from '../model/bridge'
import type { DownloadMethod } from '../model/engine'
import { useDownloadFile } from '../model/useDownloadFile'
import { SaveGuideDialog } from './SaveGuideDialog'

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

interface DownloadArtifactRowProps {
  artifact: DownloadArtifact
}

export function DownloadArtifactRow({ artifact }: DownloadArtifactRowProps) {
  const download = useDownloadFile(artifact)
  const bridgeOutcomeMessage = download.bridgeOutcome
    ? BRIDGE_OUTCOME_MESSAGES[download.bridgeOutcome.status]
    : null

  return (
    <li
      data-testid={`artifact-${artifact.id}`}
      className="flex flex-col gap-3 rounded-lg border border-white/10 bg-surface p-4"
    >
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-base font-semibold">
          {artifact.label}
        </h2>
        <p className="text-sm text-muted">
          {artifact.mimeType} · saves as {artifact.filename}
        </p>
        <p className="text-sm text-muted">{artifact.description}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          data-testid={`download-${artifact.id}`}
          disabled={download.pending}
          onClick={download.start}
        >
          {download.pending ? 'Preparing…' : 'Download'}
        </Button>
        <Button asChild variant="secondary">
          <a
            data-testid={`direct-link-${artifact.id}`}
            href={download.downloadUrl}
          >
            Direct link
          </a>
        </Button>
        <button
          type="button"
          onClick={download.openGuide}
          className="cursor-pointer text-sm underline underline-offset-2 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          Not working? Show guide
        </button>
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

      {download.result ? (
        <p
          role="status"
          data-testid={`status-${artifact.id}`}
          className="text-sm text-muted"
        >
          {bridgeOutcomeMessage ?? METHOD_MESSAGES[download.result.method]}
          {!bridgeOutcomeMessage && download.result.uncertain
            ? ' If nothing happened, use the guide.'
            : ''}
        </p>
      ) : null}

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
