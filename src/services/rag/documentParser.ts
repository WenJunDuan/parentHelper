import type { Document } from '../../types'

export class DocumentParser {
  async parse(document: Document): Promise<string> {
    return `[TODO] parse document: ${document.fileName}`
  }
}
