export type PresetType = 'translate' | 'simple' | 'agent' | null

export interface FileItem {
  file: File
  name: string
  size: number
  status: 'waiting' | 'translating' | 'completed' | 'failed'
  progress: number
  originalContent: string
  translatedContent: string
  error?: string
}
