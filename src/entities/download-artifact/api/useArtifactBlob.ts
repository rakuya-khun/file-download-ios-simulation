import { useQuery } from '@tanstack/react-query'
import { fetchFile } from '@/shared/api/client'
import { downloadArtifactKeys } from '../api/keys'
import type { DownloadArtifact } from '../model/types'

export function useArtifactBlob(
  artifact: DownloadArtifact,
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: downloadArtifactKeys.file(artifact.id),
    queryFn: () => fetchFile(artifact.endpoint),
    enabled: options.enabled ?? true,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
  })
}
