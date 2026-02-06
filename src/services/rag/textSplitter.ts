export interface SplitOptions {
  chunkSize: number
  overlap: number
}

export class TextSplitter {
  split(text: string, options: SplitOptions): string[] {
    if (!text) {
      return []
    }

    const step = Math.max(1, options.chunkSize - options.overlap)
    const chunks: string[] = []

    for (let index = 0; index < text.length; index += step) {
      chunks.push(text.slice(index, index + options.chunkSize))
      if (index + options.chunkSize >= text.length) {
        break
      }
    }

    return chunks
  }
}
