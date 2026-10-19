import { describe, expect, it } from 'vitest'
import { describePlatform, detectPlatform } from '@/shared/lib/platform'

const IPHONE_SAFARI =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
const IPAD_DESKTOP_MODE =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'
const ANDROID_CHROME =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.230 Mobile Safari/537.36'
const ANDROID_WEBVIEW =
  'Mozilla/5.0 (Linux; Android 13; Pixel 6 Build/TQ3A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/118.0.0.0 Mobile Safari/537.36'
const IPHONE_WEBVIEW =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148'
const INSTAGRAM_IOS =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 320.0.0.37.101'
const FACEBOOK_IOS =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/450.0.0.44.107]'
const DESKTOP_CHROME =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

describe('detectPlatform', () => {
  it('detects iPhone Safari as iOS browser', () => {
    const platform = detectPlatform(IPHONE_SAFARI)
    expect(platform.os).toBe('ios')
    expect(platform.isIosFamily).toBe(true)
    expect(platform.isWebview).toBe(false)
  })

  it('detects iPadOS desktop-mode user agent via touch points', () => {
    const platform = detectPlatform(IPAD_DESKTOP_MODE, 5)
    expect(platform.os).toBe('ipados')
    expect(platform.isIosFamily).toBe(true)
  })

  it('treats the same user agent without touch as macOS desktop', () => {
    const platform = detectPlatform(IPAD_DESKTOP_MODE, 0)
    expect(platform.os).toBe('desktop')
    expect(platform.isWebview).toBe(false)
  })

  it('detects Android Chrome as browser, not webview', () => {
    const platform = detectPlatform(ANDROID_CHROME)
    expect(platform.os).toBe('android')
    expect(platform.isAndroid).toBe(true)
    expect(platform.isWebview).toBe(false)
  })

  it('detects Android WebView', () => {
    const platform = detectPlatform(ANDROID_WEBVIEW)
    expect(platform.os).toBe('android')
    expect(platform.isWebview).toBe(true)
    expect(platform.webviewVendor).toBe('android-webview')
  })

  it('detects a generic iOS webview (no Safari token)', () => {
    const platform = detectPlatform(IPHONE_WEBVIEW)
    expect(platform.os).toBe('ios')
    expect(platform.isWebview).toBe(true)
    expect(platform.webviewVendor).toBe('ios-webview')
  })

  it('detects Instagram in-app browser', () => {
    const platform = detectPlatform(INSTAGRAM_IOS)
    expect(platform.webviewVendor).toBe('instagram')
    expect(platform.isWebview).toBe(true)
  })

  it('detects Facebook in-app browser', () => {
    const platform = detectPlatform(FACEBOOK_IOS)
    expect(platform.webviewVendor).toBe('facebook')
  })

  it('detects plain desktop', () => {
    const platform = detectPlatform(DESKTOP_CHROME)
    expect(platform.os).toBe('desktop')
    expect(platform.isIosFamily).toBe(false)
    expect(platform.isAndroid).toBe(false)
  })

  it('honors the simulate override', () => {
    const platform = detectPlatform(DESKTOP_CHROME, 0, 'ios-webview')
    expect(platform.isIosFamily).toBe(true)
    expect(platform.isWebview).toBe(true)
    expect(platform.isSimulated).toBe(true)
  })

  it('ignores unknown simulate values', () => {
    const platform = detectPlatform(DESKTOP_CHROME, 0, 'blackberry')
    expect(platform.os).toBe('desktop')
    expect(platform.isSimulated).toBe(false)
  })
})

describe('describePlatform', () => {
  it('labels os and webview vendor', () => {
    const platform = detectPlatform(INSTAGRAM_IOS)
    expect(describePlatform(platform)).toContain('iOS')
    expect(describePlatform(platform)).toContain('instagram')
  })
})
