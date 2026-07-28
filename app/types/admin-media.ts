export type AdminMediaItem = {
  id: number
  originalName: string
  url: string
  mimeType: string
  size: number
  width?: number | null
  height?: number | null
  category: 'IMAGE' | 'DOCUMENT' | 'OTHER'
  createdAt: string
}
