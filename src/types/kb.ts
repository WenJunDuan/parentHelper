export interface KnowledgeBase {
  id: string
  name: string
  subject: 'chinese' | 'math' | 'english' | 'science' | 'other'
  grade: number
  documentCount: number
  status: 'empty' | 'processing' | 'ready' | 'partial'
  createdAt: string
  updatedAt: string
}

export interface Document {
  id: string
  knowledgeBaseId: string
  fileName: string
  fileSize: number
  fileType: 'pdf' | 'image' | 'docx'
  status: 'queued' | 'parsing' | 'embedding' | 'ready' | 'failed'
  progress: number
  chunkCount?: number
  errorMessage?: string
  createdAt: string
}
