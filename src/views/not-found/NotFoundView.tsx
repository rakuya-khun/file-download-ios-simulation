import { Link } from 'react-router'

export function NotFoundView() {
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-5xl flex-col items-start justify-center gap-4 px-4 sm:px-6">
      <p className="font-display text-sm font-semibold uppercase tracking-[0.2em]">
        404
      </p>
      <h1 className="text-3xl font-bold">Page not found</h1>
      <p className="text-muted">The page you are looking for does not exist.</p>
      <Link
        to="/"
        className="cursor-pointer underline transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        Back to the download test
      </Link>
    </main>
  )
}
