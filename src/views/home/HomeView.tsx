import { useMemo } from 'react'
import { DOWNLOAD_ARTIFACTS } from '@/entities/download-artifact'
import { DownloadArtifactRow } from '@/features/download-file'
import { describePlatform, getPlatform } from '@/shared/lib/platform'

export function HomeView() {
  const platform = useMemo(() => getPlatform(), [])

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-3xl flex-col gap-6 px-4 py-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">File Download Test</h1>
        <p data-testid="platform-line" className="text-sm text-muted">
          Detected: {describePlatform(platform)}
        </p>
        <p className="text-sm text-muted">
          Simulates a backend endpoint such as /v3/verification/qr.json and
          verifies the file actually reaches the device.
        </p>
      </header>

      <ul
        data-testid="artifact-list"
        className="flex list-none flex-col gap-4 p-0"
      >
        {DOWNLOAD_ARTIFACTS.map((artifact) => (
          <DownloadArtifactRow key={artifact.id} artifact={artifact} />
        ))}
      </ul>

      <footer className="text-xs text-muted">
        Preview another device strategy with ?simulate=ios, ?simulate=ipados,
        ?simulate=android, ?simulate=ios-webview, or ?simulate=android-webview.
      </footer>
    </main>
  )
}
