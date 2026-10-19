import { useEffect, useRef } from 'react'
import type { PlatformInfo } from '@/shared/lib/platform'
import { Button } from '@/shared/ui/Button'
import { getGuideContent } from '../model/guide'

interface SaveGuideDialogProps {
  open: boolean
  platform: PlatformInfo
  downloadUrl: string
  linkCopied: boolean
  onCopyLink: () => void
  onClose: () => void
}

export function SaveGuideDialog({
  open,
  platform,
  downloadUrl,
  linkCopied,
  onCopyLink,
  onClose,
}: SaveGuideDialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const content = getGuideContent(platform)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return

    if (open && !dialog.open) {
      try {
        dialog.showModal()
      } catch {
        dialog.setAttribute('open', '')
      }
    } else if (!open && dialog.open) {
      try {
        dialog.close()
      } catch {
        dialog.removeAttribute('open')
      }
    }
  }, [open])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby="save-guide-title"
      className="m-auto w-[min(90vw,26rem)] rounded-lg border border-white/10 bg-surface p-5 text-text backdrop:bg-black/60"
    >
      <h2
        id="save-guide-title"
        className="font-display text-base font-semibold"
      >
        {content.title}
      </h2>
      <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm">
        {content.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button type="button" onClick={onCopyLink} data-testid="copy-link">
          {linkCopied ? 'Link copied' : 'Copy link'}
        </Button>
        <Button asChild variant="secondary">
          <a
            href={downloadUrl}
            target="_blank"
            rel="noreferrer"
            data-testid="open-in-browser"
          >
            Open in browser
          </a>
        </Button>
        <Button type="button" variant="secondary" onClick={onClose}>
          Close
        </Button>
      </div>
    </dialog>
  )
}
