import { AppleIcon } from '@/shared/ui/AppleIcon'
import { Button } from '@/shared/ui/Button'

interface DownloadCtaProps {
  downloadUrl: string
  version: string
}

export function DownloadCta({ downloadUrl, version }: DownloadCtaProps) {
  return (
    <div className="flex flex-col items-start gap-3">
      <Button asChild>
        <a
          href={downloadUrl}
          target="_blank"
          rel="noreferrer"
          data-testid="download-cta"
        >
          <AppleIcon />
          Download for iOS · v{version}
        </a>
      </Button>
      <p className="text-sm text-slate-600 dark:text-muted">
        Free on the App Store. Requires iOS 17.0 or later.
      </p>
    </div>
  )
}
