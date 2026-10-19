import { lazy, Suspense } from 'react'
import { createBrowserRouter } from 'react-router'
import { HomeView } from '@/views/home'

const NotFoundView = lazy(() =>
  import('@/views/not-found').then((module) => ({
    default: module.NotFoundView,
  })),
)

export const router = createBrowserRouter([
  {
    path: '/',
    element: <HomeView />,
  },
  {
    path: '*',
    element: (
      <Suspense fallback={<p role="status">Loading…</p>}>
        <NotFoundView />
      </Suspense>
    ),
  },
])
