export type PlatformOs = 'ios' | 'ipados' | 'android' | 'desktop'

export type WebviewVendor =
  | 'facebook'
  | 'instagram'
  | 'tiktok'
  | 'line'
  | 'twitter'
  | 'whatsapp'
  | 'android-webview'
  | 'ios-webview'

export interface PlatformInfo {
  os: PlatformOs
  isIosFamily: boolean
  isAndroid: boolean
  isWebview: boolean
  webviewVendor: WebviewVendor | null
  isSimulated: boolean
}

const SIMULATIONS: Record<string, Omit<PlatformInfo, 'isSimulated'>> = {
  desktop: {
    os: 'desktop',
    isIosFamily: false,
    isAndroid: false,
    isWebview: false,
    webviewVendor: null,
  },
  ios: {
    os: 'ios',
    isIosFamily: true,
    isAndroid: false,
    isWebview: false,
    webviewVendor: null,
  },
  ipados: {
    os: 'ipados',
    isIosFamily: true,
    isAndroid: false,
    isWebview: false,
    webviewVendor: null,
  },
  android: {
    os: 'android',
    isIosFamily: false,
    isAndroid: true,
    isWebview: false,
    webviewVendor: null,
  },
  'ios-webview': {
    os: 'ios',
    isIosFamily: true,
    isAndroid: false,
    isWebview: true,
    webviewVendor: 'ios-webview',
  },
  'android-webview': {
    os: 'android',
    isIosFamily: false,
    isAndroid: true,
    isWebview: true,
    webviewVendor: 'android-webview',
  },
  instagram: {
    os: 'ios',
    isIosFamily: true,
    isAndroid: false,
    isWebview: true,
    webviewVendor: 'instagram',
  },
  facebook: {
    os: 'ios',
    isIosFamily: true,
    isAndroid: false,
    isWebview: true,
    webviewVendor: 'facebook',
  },
}

function detectWebviewVendor(
  userAgent: string,
  isIosFamily: boolean,
): WebviewVendor | null {
  if (/Instagram/i.test(userAgent)) return 'instagram'
  if (/FBAN|FBAV|FB_IAB/i.test(userAgent)) return 'facebook'
  if (/BytedanceWebview|musical_ly|TikTok/i.test(userAgent)) return 'tiktok'
  if (/\bLine\//i.test(userAgent)) return 'line'
  if (/Twitter/i.test(userAgent)) return 'twitter'
  if (/WhatsApp/i.test(userAgent)) return 'whatsapp'
  if (/;\s?wv\)/i.test(userAgent)) return 'android-webview'
  if (isIosFamily && !/Safari\//i.test(userAgent)) return 'ios-webview'
  return null
}

export function detectPlatform(
  userAgent: string,
  maxTouchPoints = 0,
  simulate?: string | null,
): PlatformInfo {
  const simulation = simulate ? SIMULATIONS[simulate] : undefined
  if (simulation) {
    return { ...simulation, isSimulated: true }
  }

  const isIpad =
    /iPad/i.test(userAgent) ||
    (/Macintosh/i.test(userAgent) && maxTouchPoints > 1)
  const isIos = /iPhone|iPod/i.test(userAgent) || isIpad
  const isAndroid = /Android/i.test(userAgent)

  const os: PlatformOs = isIpad
    ? 'ipados'
    : isIos
      ? 'ios'
      : isAndroid
        ? 'android'
        : 'desktop'

  const webviewVendor = detectWebviewVendor(userAgent, isIos)

  return {
    os,
    isIosFamily: isIos,
    isAndroid,
    isWebview: webviewVendor !== null,
    webviewVendor,
    isSimulated: false,
  }
}

export function getPlatform(): PlatformInfo {
  if (typeof navigator === 'undefined') {
    return {
      os: 'desktop',
      isIosFamily: false,
      isAndroid: false,
      isWebview: false,
      webviewVendor: null,
      isSimulated: false,
    }
  }

  const simulate =
    typeof window === 'undefined'
      ? null
      : new URLSearchParams(window.location.search).get('simulate')

  return detectPlatform(
    navigator.userAgent,
    navigator.maxTouchPoints ?? 0,
    simulate,
  )
}

export function describePlatform(platform: PlatformInfo): string {
  const osLabel =
    platform.os === 'ios'
      ? 'iOS'
      : platform.os === 'ipados'
        ? 'iPadOS'
        : platform.os === 'android'
          ? 'Android'
          : 'Desktop'
  const webviewLabel = platform.webviewVendor
    ? ` · in-app browser: ${platform.webviewVendor}`
    : ''
  const simulatedLabel = platform.isSimulated ? ' (simulated)' : ''
  return `${osLabel}${webviewLabel}${simulatedLabel}`
}
