import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HomeView } from '@/views/home'

function renderHome() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <HomeView />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      new Response('{}', {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    ),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
  window.history.replaceState(null, '', '/')
})

describe('HomeView', () => {
  it('renders the heading and detected platform line', () => {
    renderHome()
    expect(
      screen.getByRole('heading', { name: /verification files/i }),
    ).toBeInTheDocument()
    expect(screen.getByTestId('platform-line')).toHaveTextContent(/detected/i)
  })

  it('renders the json and pdf artifact rows', () => {
    renderHome()
    expect(screen.getByTestId('artifact-list').children).toHaveLength(2)
    for (const id of ['json', 'pdf']) {
      expect(screen.getByTestId(`artifact-${id}`)).toBeInTheDocument()
    }
  })

  it('direct links point at the simulated backend endpoints', () => {
    renderHome()
    expect(screen.getByTestId('direct-link-json')).toHaveAttribute(
      'href',
      '/v3/verification/qr.json',
    )
    expect(screen.getByTestId('direct-link-pdf')).toHaveAttribute(
      'href',
      '/v3/verification/qr.pdf',
    )
  })

  it('offers a download-all action', () => {
    renderHome()
    expect(screen.getByTestId('download-all')).toBeInTheDocument()
  })

  it('uses the server link for Android webview downloads', () => {
    window.history.replaceState(null, '', '/?simulate=android-webview')
    renderHome()

    const download = screen.getByTestId('download-json')
    expect(download.tagName).toBe('A')
    expect(download).toHaveAttribute('href', '/v3/verification/qr.json')
    expect(download).not.toHaveAttribute('download')
    expect(vi.mocked(fetch)).not.toHaveBeenCalled()
  })

  it('honors ?simulate to preview another platform', () => {
    window.history.replaceState(null, '', '/?simulate=ios-webview')
    renderHome()
    expect(screen.getByTestId('platform-line')).toHaveTextContent('iOS')
    expect(screen.getByTestId('platform-line')).toHaveTextContent(
      'in-app browser: ios-webview',
    )
  })
})
