import type { WorkspacePreset } from '@state/types'

export const workspacePresets: Array<{ id: WorkspacePreset; label: string }> = [
  { id: 'balanced', label: 'Balanced' },
  { id: 'flight', label: 'Flight' },
  { id: 'combat', label: 'Combat' },
  { id: 'mining', label: 'Mining' },
  { id: 'analysis', label: 'Analysis' },
  { id: 'labFirst', label: 'Lab-First' },
]
