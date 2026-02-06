import { DocumentParser } from './documentParser'
import { EmbeddingClient } from './embeddingClient'
import { TextSplitter } from './textSplitter'
import type { VectorStore } from './vectorStore'
import type { Document } from '../../types'

export class RAGPipeline {
  constructor(
    private readonly vectorStore: VectorStore,
    private readonly parser = new DocumentParser(),
    private readonly splitter = new TextSplitter(),
    private readonly embeddingClient = new EmbeddingClient(),
  ) {}

  async ingest(document: Document, onProgress?: (progress: number) => void): Promise<void> {
    onProgress?.(10)
    const text = await this.parser.parse(document)

    onProgress?.(30)
    const chunks = this.splitter.split(text, { chunkSize: 512, overlap: 128 })

    onProgress?.(60)
    const embeddings = await this.embeddingClient.embed(chunks)

    onProgress?.(90)
    await this.vectorStore.upsert(
      document.knowledgeBaseId,
      chunks.map((chunk, index) => ({
        id: `${document.id}-${index}`,
        text: chunk,
        embedding: embeddings[index] ?? [],
        metadata: {
          docId: document.id,
          docName: document.fileName,
          kbId: document.knowledgeBaseId,
        },
      })),
    )

    onProgress?.(100)
  }

  async search(query: string, kbIds: string[], topK = 5) {
    const queryEmbedding = await this.embeddingClient.embed([query])
    return this.vectorStore.search(kbIds, queryEmbedding[0] ?? [], topK)
  }
}
