export interface VectorRecord {
  id: string
  text: string
  embedding: number[]
  metadata?: Record<string, unknown>
}

export interface VectorSearchResult {
  id: string
  text: string
  score: number
  metadata?: Record<string, unknown>
}

export interface VectorStore {
  upsert(namespace: string, records: VectorRecord[]): Promise<void>
  search(namespace: string[], queryEmbedding: number[], topK: number): Promise<VectorSearchResult[]>
}
