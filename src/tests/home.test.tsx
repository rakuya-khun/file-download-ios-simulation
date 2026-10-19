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
      screen.getByRole('heading', { name: /file download test/i }),
    ).toBeInTheDocument()
    expect(screen.getByTestId('platform-line')).toHaveTextContent(/detected/i)
  })

  it('renders all four artifact rows', () => {
    renderHome()
    expect(screen.getByTestId('artifact-list').children).toHaveLength(4)
    for (const id of ['json', 'pdf', 'csv', 'txt']) {
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
    expect(screen.getByTestId('direct-link-csv')).toHaveAttribute(
      'href',
      '/v3/verification/qr.csv',
    )
    expect(screen.getByTestId('direct-link-txt')).toHaveAttribute(
      'href',
      '/v3/verification/qr.txt',
    )
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
