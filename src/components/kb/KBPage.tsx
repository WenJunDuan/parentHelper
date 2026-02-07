import { useEffect, useMemo, useState } from 'react'
import { BookOpenText, CirclePlus, FileText, Loader2, Trash2 } from 'lucide-react'
import { useKBStore } from '../../stores/useKBStore'
import {
  loadDocumentSnapshot,
  loadKnowledgeBaseSnapshot,
  saveDocumentSnapshot,
  saveKnowledgeBaseSnapshot,
} from '../../services/persistence'
import type { Document, KnowledgeBase } from '../../types'

type SubjectTag = {
  label: string
  className: string
}

function subjectTag(subject: KnowledgeBase['subject']): SubjectTag {
  if (subject === 'math') {
    return { label: '数学', className: 'kb-tag kb-tag--math' }
  }
  if (subject === 'chinese') {
    return { label: '语文', className: 'kb-tag kb-tag--chinese' }
  }
  if (subject === 'english') {
    return { label: '英语', className: 'kb-tag kb-tag--english' }
  }
  if (subject === 'science') {
    return { label: '科学', className: 'kb-tag kb-tag--science' }
  }

  return { label: '综合', className: 'kb-tag kb-tag--other' }
}

function statusLabel(status: KnowledgeBase['status']) {
  if (status === 'ready') {
    return '已就绪'
  }
  if (status === 'processing') {
    return '处理中'
  }
  if (status === 'partial') {
    return '部分可用'
  }
  return '空'
}

function statusClass(status: KnowledgeBase['status']) {
  if (status === 'ready') {
    return 'kb-status kb-status--ready'
  }
  if (status === 'processing') {
    return 'kb-status kb-status--processing'
  }
  if (status === 'partial') {
    return 'kb-status kb-status--partial'
  }
  return 'kb-status'
}

const kbTemplates: KnowledgeBase[] = [
  {
    id: 'kb-math-3a',
    name: '三年级数学上册',
    subject: 'math',
    grade: 3,
    documentCount: 5,
    status: 'ready',
    createdAt: '2026-02-06T00:00:00.000Z',
    updatedAt: '2026-02-07T00:00:00.000Z',
  },
  {
    id: 'kb-chinese-3a',
    name: '三年级语文上册',
    subject: 'chinese',
    grade: 3,
    documentCount: 4,
    status: 'ready',
    createdAt: '2026-02-06T00:00:00.000Z',
    updatedAt: '2026-02-07T00:00:00.000Z',
  },
  {
    id: 'kb-english-3a',
    name: '三年级英语上册',
    subject: 'english',
    grade: 3,
    documentCount: 2,
    status: 'processing',
    createdAt: '2026-02-06T00:00:00.000Z',
    updatedAt: '2026-02-07T00:00:00.000Z',
  },
]

const documentTemplates: Document[] = [
  {
    id: 'doc-math-1',
    knowledgeBaseId: 'kb-math-3a',
    fileName: '第1章-时分秒.pdf',
    fileSize: 1024 * 1024,
    fileType: 'pdf',
    status: 'ready',
    progress: 100,
    chunkCount: 96,
    createdAt: '2026-02-06T00:00:00.000Z',
  },
  {
    id: 'doc-math-2',
    knowledgeBaseId: 'kb-math-3a',
    fileName: '第2章-万以内加减法.pdf',
    fileSize: 1200 * 1024,
    fileType: 'pdf',
    status: 'ready',
    progress: 100,
    chunkCount: 114,
    createdAt: '2026-02-06T00:00:00.000Z',
  },
  {
    id: 'doc-cn-1',
    knowledgeBaseId: 'kb-chinese-3a',
    fileName: '古诗词课文整理.docx',
    fileSize: 768 * 1024,
    fileType: 'docx',
    status: 'ready',
    progress: 100,
    chunkCount: 58,
    createdAt: '2026-02-06T00:00:00.000Z',
  },
  {
    id: 'doc-en-1',
    knowledgeBaseId: 'kb-english-3a',
    fileName: 'Unit1-Unit3词汇.pdf',
    fileSize: 600 * 1024,
    fileType: 'pdf',
    status: 'embedding',
    progress: 72,
    chunkCount: 24,
    createdAt: '2026-02-06T00:00:00.000Z',
  },
]

export function KBPage() {
  const { knowledgeBases, documents, setKnowledgeBases, setDocuments } = useKBStore()
  const [activeKbId, setActiveKbId] = useState('')
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    let active = true

    const initialize = async () => {
      const [storedKnowledgeBases, storedDocuments] = await Promise.all([
        loadKnowledgeBaseSnapshot(),
        loadDocumentSnapshot(),
      ])

      if (!active) {
        return
      }

      setKnowledgeBases(storedKnowledgeBases.length > 0 ? storedKnowledgeBases : kbTemplates)
      setDocuments(storedDocuments.length > 0 ? storedDocuments : documentTemplates)
      setInitialized(true)
    }

    void initialize()

    return () => {
      active = false
    }
  }, [setDocuments, setKnowledgeBases])

  useEffect(() => {
    if (!initialized) {
      return
    }

    void saveKnowledgeBaseSnapshot(knowledgeBases)
  }, [initialized, knowledgeBases])

  useEffect(() => {
    if (!initialized) {
      return
    }

    void saveDocumentSnapshot(documents)
  }, [documents, initialized])

  const initializedKbs = knowledgeBases.length > 0 ? knowledgeBases : kbTemplates
  const initializedDocs = documents.length > 0 ? documents : documentTemplates

  const docsByKb = useMemo(() => {
    const grouped: Record<string, Document[]> = {}
    for (const item of initializedDocs) {
      if (!grouped[item.knowledgeBaseId]) {
        grouped[item.knowledgeBaseId] = []
      }
      grouped[item.knowledgeBaseId].push(item)
    }
    return grouped
  }, [initializedDocs])

  const resolvedActiveKbId =
    activeKbId && initializedKbs.some((item) => item.id === activeKbId)
      ? activeKbId
      : initializedKbs[0]?.id ?? ''

  const activeDocuments = useMemo(
    () => initializedDocs.filter((item) => item.knowledgeBaseId === resolvedActiveKbId),
    [initializedDocs, resolvedActiveKbId],
  )

  return (
    <section className="page kb-page">
      <header className="model-header">
        <div>
          <h1 className="page__title page__title--with-icon">
            <BookOpenText size={20} /> 学习资料
          </h1>
          <p className="page__desc">上传课本与讲义后，Bot 可按资料片段进行学科辅导。</p>
        </div>
        <button className="home-btn home-btn--primary" type="button">
          <CirclePlus size={16} /> 创建学习资料库
        </button>
      </header>

      <div className="kb-grid">
        {initializedKbs.map((knowledgeBase) => {
          const tag = subjectTag(knowledgeBase.subject)
          const isActive = knowledgeBase.id === resolvedActiveKbId

          return (
            <article
              key={knowledgeBase.id}
              className={`kb-card${isActive ? ' kb-card--active' : ''}`}
              onClick={() => setActiveKbId(knowledgeBase.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  setActiveKbId(knowledgeBase.id)
                }
              }}
            >
              <div className="kb-card__head">
                <div className="kb-card__tags">
                  <span className={tag.className}>{tag.label}</span>
                  <span className="kb-tag kb-tag--grade">{knowledgeBase.grade}年级</span>
                </div>
                <span className={statusClass(knowledgeBase.status)}>{statusLabel(knowledgeBase.status)}</span>
              </div>

              <strong className="kb-card__title">{knowledgeBase.name}</strong>
              <p className="kb-card__meta">
                {(docsByKb[knowledgeBase.id] ?? []).length || knowledgeBase.documentCount} 个文档 ·
                {(docsByKb[knowledgeBase.id] ?? []).reduce((acc, item) => acc + (item.chunkCount ?? 0), 0)} 个知识片段
              </p>

              <div className="kb-doc-strip">
                {(docsByKb[knowledgeBase.id] ?? []).slice(0, 3).map((item) => (
                    <span key={item.id} className="kb-doc-strip__item">
                      📄 {item.fileName}
                    </span>
                  ))}
              </div>

              <div className="kb-card__actions">
                <button className="ghost-btn" type="button">
                  <FileText size={13} /> 管理文档
                </button>
                <button className="ghost-btn kb-delete-btn" type="button">
                  <Trash2 size={13} /> 删除
                </button>
              </div>
            </article>
          )
        })}
      </div>

      <article className="model-panel kb-doc-panel">
        <div className="model-panel__title">
          <FileText size={18} /> 文档详情 ({activeDocuments.length})
        </div>

        <div className="kb-doc-list">
          {activeDocuments.map((item) => (
            <div key={item.id} className="kb-doc-item">
              <div className="kb-doc-item__main">
                <strong>{item.fileName}</strong>
                <span>
                  {item.fileType.toUpperCase()} · {Math.round(item.fileSize / 1024)} KB ·
                  {item.chunkCount ?? 0} chunks
                </span>
              </div>

              <div className="kb-doc-item__status">
                {item.status === 'ready' ? (
                  <span className="model-status-chip model-status-chip--connected">已就绪</span>
                ) : (
                  <span className="model-status-chip">
                    <Loader2 size={12} /> {item.progress}%
                  </span>
                )}
              </div>
            </div>
          ))}

          {activeDocuments.length === 0 && <div className="model-empty">当前学习资料库暂无文档。</div>}
        </div>
      </article>
    </section>
  )
}
