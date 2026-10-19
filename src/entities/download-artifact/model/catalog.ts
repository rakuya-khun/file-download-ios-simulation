import type { DownloadArtifact } from './types'

export const DOWNLOAD_ARTIFACTS: DownloadArtifact[] = [
  {
    id: 'json',
    label: 'Verification QR (JSON)',
    description: 'Structured API response, the primary production payload.',
    endpoint: '/v3/verification/qr.json',
    filename: 'verification-qr.json',
    mimeType: 'application/json',
  },
  {
    id: 'pdf',
    label: 'Verification QR (PDF)',
    description: 'Printable document; iOS prefers to preview this inline.',
    endpoint: '/v3/verification/qr.pdf',
    filename: 'verification-qr.pdf',
    mimeType: 'application/pdf',
  },
  {
    id: 'csv',
    label: 'Verification QR (CSV)',
    description: 'Spreadsheet export; Safari renders text types in-tab.',
    endpoint: '/v3/verification/qr.csv',
    filename: 'verification-qr.csv',
    mimeType: 'text/csv',
  },
  {
    id: 'txt',
    label: 'Verification QR (TXT)',
    description: 'Plain text export; known WebKit download bug case.',
    endpoint: '/v3/verification/qr.txt',
    filename: 'verification-qr.txt',
    mimeType: 'text/plain',
  },
]
