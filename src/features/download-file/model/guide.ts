import type { PlatformInfo } from '@/shared/lib/platform'

export interface GuideContent {
  title: string
  steps: string[]
}

export function getGuideContent(platform: PlatformInfo): GuideContent {
  if (platform.isWebview) {
    return {
      title: 'This screen cannot save files to your phone',
      steps: [
        'Tap "Copy link" below.',
        platform.isIosFamily
          ? 'Open Safari and paste the link in the address bar.'
          : 'Open Chrome and paste the link in the address bar.',
        'The file saves to Files (iOS) or Downloads (Android) when it opens.',
        'If a browser opens from "Open in browser", download the file there.',
      ],
    }
  }

  if (platform.isIosFamily) {
    return {
      title: 'Save manually on iPhone or iPad',
      steps: [
        'Tap the Share icon in the toolbar (square with an arrow).',
        'Scroll down and tap "Save to Files".',
        'Pick a folder and tap "Save".',
      ],
    }
  }

  if (platform.isAndroid) {
    return {
      title: 'Find the file on Android',
      steps: [
        'Open the "Files" app or the downloads list in Chrome.',
        'Look in "Downloads" or the folder you chose.',
        'If nothing was saved, long-press the "Direct link" and pick "Download link file".',
      ],
    }
  }

  return {
    title: 'Find the file on desktop',
    steps: [
      'Open your browser downloads (Ctrl+J or Cmd+Shift+J).',
      'Files land in the default Downloads folder.',
      'Allow "Keep" prompts if your browser asked about this file type.',
    ],
  }
}
