import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import type { Connect, Plugin } from 'vite'
import { defineConfig } from 'vitest/config'

const SIMULATED_FILES: Record<
  string,
  { contentType: string; filename: string }
> = {
  '/v3/verification/qr.json': {
    contentType: 'application/json; charset=utf-8',
    filename: 'verification-qr.json',
  },
  '/v3/verification/qr.pdf': {
    contentType: 'application/pdf',
    filename: 'verification-qr.pdf',
  },
  '/v3/verification/qr.csv': {
    contentType: 'text/csv; charset=utf-8',
    filename: 'verification-qr.csv',
  },
  '/v3/verification/qr.txt': {
    contentType: 'text/plain; charset=utf-8',
    filename: 'verification-qr.txt',
  },
}

function simulatedBackend(): Plugin {
  const middleware: Connect.NextHandleFunction = (req, res, next) => {
    const pathname = req.url?.split('?')[0] ?? ''
    const entry = SIMULATED_FILES[pathname]
    if (entry) {
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${entry.filename}"`,
      )
      res.setHeader('Content-Type', entry.contentType)
      res.setHeader('Cache-Control', 'no-store')
    }
    next()
  }

  return {
    name: 'simulated-backend',
    configureServer(server) {
      server.middlewares.use(middleware)
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware)
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [simulatedBackend(), react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.ts'],
    globals: true,
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
    },
  },
})
