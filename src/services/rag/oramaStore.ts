import type { VectorSearchResult, VectorStore, VectorRecord } from './vectorStore'

export class OramaStore implements VectorStore {
  async upsert(namespace: string, records: VectorRecord[]): Promise<void> {
    void namespace
    void records
    return
  }

  async search(
    namespace: string[],
    queryEmbedding: number[],
    topK: number,
  ): Promise<VectorSearchResult[]> {
    void namespace
    void queryEmbedding
    void topK
    return []
  }
}
