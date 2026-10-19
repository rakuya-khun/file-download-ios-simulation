import { useMemo } from 'react'
import { DOWNLOAD_ARTIFACTS } from '@/entities/download-artifact'
import { DownloadArtifactRow, useDownloadAll } from '@/features/download-file'
import { describePlatform, getPlatform } from '@/shared/lib/platform'
import { Button } from '@/shared/ui/Button'

export function HomeView() {
  const platform = useMemo(() => getPlatform(), [])
  const downloadAll = useDownloadAll(DOWNLOAD_ARTIFACTS)

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-lg flex-col gap-6 px-4 py-10">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-2xl font-bold">Verification Files</h1>
        <p className="text-sm text-muted">
          Download the verification documents for this device.
        </p>
        <p data-testid="platform-line" className="text-xs text-muted">
          Detected: {describePlatform(platform)}
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="secondary"
          data-testid="download-all"
          disabled={downloadAll.running}
          onClick={() => void downloadAll.startAll()}
        >
          {downloadAll.running ? 'Downloading…' : 'Download both'}
        </Button>
        {downloadAll.status.kind === 'done' ? (
          <p
            role="status"
            data-testid="download-all-status"
            className="text-sm text-muted"
          >
            {downloadAll.status.message}
          </p>
        ) : null}
      </div>

      <ul
        data-testid="artifact-list"
        className="flex list-none flex-col gap-4 p-0"
      >
        {DOWNLOAD_ARTIFACTS.map((artifact) => (
          <DownloadArtifactRow key={artifact.id} artifact={artifact} />
        ))}
      </ul>

      <footer className="text-xs text-muted">
        QA: preview another device strategy with ?simulate=ios, ipados, android,
        ios-webview, or android-webview.
      </footer>
    </main>
  )
}
