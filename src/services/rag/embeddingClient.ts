export class EmbeddingClient {
  async embed(texts: string[]): Promise<number[][]> {
    return texts.map(() => [])
  }
}
