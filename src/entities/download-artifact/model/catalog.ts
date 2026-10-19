import type { DownloadArtifact } from './types'

export const DOWNLOAD_ARTIFACTS: DownloadArtifact[] = [
  {
    id: 'json',
    label: 'Verification QR (JSON)',
    description: 'Structured API response used by the verification flow.',
    endpoint: '/v3/verification/qr.json',
    filename: 'verification-qr.json',
    mimeType: 'application/json',
  },
  {
    id: 'pdf',
    label: 'Verification QR (PDF)',
    description: 'Printable document version of the verification record.',
    endpoint: '/v3/verification/qr.pdf',
    filename: 'verification-qr.pdf',
    mimeType: 'application/pdf',
  },
]
