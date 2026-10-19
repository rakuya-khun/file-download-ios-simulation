export const downloadArtifactKeys = {
  all: ['download-artifact'] as const,
  file: (id: string) => [...downloadArtifactKeys.all, id] as const,
}
