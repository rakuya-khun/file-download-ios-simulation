import { expect, test } from '@playwright/test'

test.use({ permissions: ['clipboard-read', 'clipboard-write'] })

function disableShareApi() {
  Object.defineProperty(window.navigator, 'canShare', {
    value: undefined,
    configurable: true,
  })
  Object.defineProperty(window.navigator, 'share', {
    value: undefined,
    configurable: true,
  })
}

interface FakeBridgeWindow {
  __bridgeMessages: string[]
  DownloadBridge: { postMessage: (message: string) => void }
}

function installFakeBridge() {
  const fake = window as unknown as FakeBridgeWindow
  fake.__bridgeMessages = []
  fake.DownloadBridge = {
    postMessage: (message: string) => {
      fake.__bridgeMessages.push(message)
    },
  }
}

test('lists the verification artifacts with a detected platform line', async ({
  page,
}) => {
  await page.goto('/')
  await expect(
    page.getByRole('heading', { name: 'Verification Files' }),
  ).toBeVisible()
  await expect(page.getByTestId('platform-line')).toContainText('Detected:')
  for (const id of ['json', 'pdf']) {
    await expect(page.getByTestId(`artifact-${id}`)).toBeVisible()
  }
})

test('download triggers a download using the backend filename', async ({
  page,
}) => {
  await page.goto('/')
  const downloadButton = page.getByTestId('download-json')
  await expect(downloadButton).toBeEnabled()

  const downloadPromise = page.waitForEvent('download')
  await downloadButton.click()
  const download = await downloadPromise

  expect(download.suggestedFilename()).toBe('verification-qr.json')
  await expect(page.getByTestId('status-json')).toContainText('triggered')
})

test('downloads both files through the bulk action', async ({ page }) => {
  const filenames: string[] = []
  page.on('download', (download) => {
    filenames.push(download.suggestedFilename())
  })

  await page.goto('/')
  await expect(page.getByTestId('download-json')).toBeEnabled()

  await page.getByTestId('download-all').click()

  await expect.poll(() => filenames.length).toBe(2)
  expect([...filenames].sort()).toEqual([
    'verification-qr.json',
    'verification-qr.pdf',
  ])
  await expect(page.getByTestId('download-all-status')).toContainText(
    'All 2 files are on their way.',
  )
})

test('retries preparing the file after a fetch failure', async ({ page }) => {
  let attempts = 0
  await page.route('**/v3/verification/qr.json', (route) => {
    attempts += 1
    if (attempts <= 2) {
      return route.fulfill({ status: 500, body: 'boom' })
    }
    return route.fulfill({
      status: 200,
      headers: {
        'content-type': 'application/json',
        'content-disposition': 'attachment; filename="verification-qr.json"',
      },
      body: '{"ok":true}',
    })
  })

  await page.goto('/')
  await expect(page.getByTestId('error-json')).toBeVisible()

  const downloadButton = page.getByTestId('download-json')
  await expect(downloadButton).toHaveText('Retry')

  const downloadPromise = page.waitForEvent('download')
  await downloadButton.click()
  const download = await downloadPromise

  expect(download.suggestedFilename()).toBe('verification-qr.json')
  await expect(page.getByTestId('status-json')).toContainText('triggered')
})

test('direct link downloads through the attachment header', async ({
  page,
}) => {
  await page.goto('/')

  const downloadPromise = page.waitForEvent('download')
  await page.getByTestId('direct-link-json').click()
  const download = await downloadPromise

  expect(download.suggestedFilename()).toBe('verification-qr.json')
})

test('pdf direct link downloads through the attachment header', async ({
  page,
}) => {
  await page.goto('/')

  const downloadPromise = page.waitForEvent('download')
  await page.getByTestId('direct-link-pdf').click()
  const download = await downloadPromise

  expect(download.suggestedFilename()).toBe('verification-qr.pdf')
})

test('simulated iOS Safari falls back to octet-stream', async ({ page }) => {
  await page.addInitScript(disableShareApi)
  await page.goto('/?simulate=ios')
  await expect(page.getByTestId('platform-line')).toContainText('iOS')

  const downloadButton = page.getByTestId('download-json')
  await expect(downloadButton).toBeEnabled()

  const downloadPromise = page.waitForEvent('download')
  await downloadButton.click()
  const download = await downloadPromise

  expect(download.suggestedFilename()).toBe('verification-qr.json')
  await expect(page.getByTestId('status-json')).toContainText('octet-stream')
})

test('simulated iOS webview falls back to a data URI and auto-opens the guide', async ({
  page,
}) => {
  await page.addInitScript(disableShareApi)
  await page.goto('/?simulate=ios-webview')
  await expect(page.getByTestId('platform-line')).toContainText(
    'in-app browser: ios-webview',
  )

  const downloadButton = page.getByTestId('download-json')
  await expect(downloadButton).toBeEnabled()

  const downloadPromise = page.waitForEvent('download')
  await downloadButton.click()
  const download = await downloadPromise

  expect(download.suggestedFilename()).toBe('verification-qr.json')
  await expect(page.getByTestId('status-json')).toContainText('data URI')
  await expect(page.getByRole('dialog')).toContainText(
    'This screen cannot save files to your phone',
  )
})

test('hands the download to the native bridge inside a webview', async ({
  page,
}) => {
  await page.addInitScript(installFakeBridge)
  await page.goto('/?simulate=ios-webview')

  const downloadButton = page.getByTestId('download-json')
  await expect(downloadButton).toBeEnabled()
  await downloadButton.click()

  await expect(page.getByTestId('status-json')).toContainText(
    'Handed to the app',
  )
  await expect(page.getByRole('dialog')).not.toBeVisible()

  const messages = await page.evaluate(
    () =>
      (window as unknown as { __bridgeMessages: string[] }).__bridgeMessages,
  )
  expect(messages).toHaveLength(1)
  expect(JSON.parse(messages[0] ?? '{}')).toEqual({
    type: 'download',
    version: 1,
    url: '/v3/verification/qr.json',
    filename: 'verification-qr.json',
    mimeType: 'application/json',
  })
})

test('hands off to the bridge even when the file fetch fails', async ({
  page,
}) => {
  await page.addInitScript(installFakeBridge)
  await page.route('**/v3/verification/qr.json', (route) => route.abort())
  await page.goto('/?simulate=ios-webview')

  await page.getByTestId('download-json').click()

  await expect(page.getByTestId('status-json')).toContainText(
    'Handed to the app',
  )
  await expect(page.getByTestId('error-json')).toHaveCount(0)
  await expect(page.getByRole('dialog')).not.toBeVisible()

  const messages = await page.evaluate(
    () =>
      (window as unknown as { __bridgeMessages: string[] }).__bridgeMessages,
  )
  expect(messages).toHaveLength(1)
})

test('reflects the native bridge save result', async ({ page }) => {
  await page.addInitScript(installFakeBridge)
  await page.goto('/?simulate=ios-webview')

  await page.getByTestId('download-json').click()
  await expect(page.getByTestId('status-json')).toContainText(
    'Handed to the app',
  )

  await page.evaluate(() => {
    const handler = (
      window as unknown as {
        onDownloadBridgeResult?: (message: string) => void
      }
    ).onDownloadBridgeResult
    handler?.('{"status":"saved","filename":"verification-qr.json"}')
  })

  await expect(page.getByTestId('status-json')).toContainText(
    'Saved to your phone.',
  )
})

test('shows the save guide on request', async ({ page }) => {
  await page.goto('/?simulate=android-webview')
  await page
    .getByTestId('artifact-json')
    .getByRole('button', { name: /show guide/i })
    .click()
  await expect(page.getByRole('dialog')).toContainText(
    'This screen cannot save files to your phone',
  )
})

test('copies the direct link from a row', async ({ page }) => {
  await page.goto('/')

  const copyButton = page.getByTestId('copy-link-json')
  await copyButton.click()
  await expect(copyButton).toContainText('Link copied')

  const clipboardText = await page.evaluate(() =>
    navigator.clipboard.readText(),
  )
  expect(clipboardText).toBe('/v3/verification/qr.json')
})
