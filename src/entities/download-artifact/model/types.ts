export type ArtifactKind = 'json' | 'pdf' | 'csv' | 'txt'

export interface DownloadArtifact {
  id: ArtifactKind
  label: string
  description: string
  endpoint: string
  filename: string
  mimeType: string
}
