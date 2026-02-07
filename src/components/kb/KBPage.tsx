import { BookOpenText, Files, SearchCheck } from 'lucide-react'

export function KBPage() {
  return (
    <section className="page">
      <h1 className="page__title page__title--with-icon">
        <BookOpenText size={20} />
        学习资料
      </h1>
      <p className="page__desc">管理教材、试卷和讲义等资料，形成可检索的学习资料底座。</p>

      <div className="feature-grid">
        <article className="feature-card">
          <div className="feature-card__title">
            <Files size={16} /> 资料入库
          </div>
          <p>支持按年级、学科、版本管理文档，便于后续检索路由。</p>
        </article>

        <article className="feature-card">
          <div className="feature-card__title">
            <SearchCheck size={16} /> 检索命中
          </div>
          <p>展示命中文档、段落与置信度，帮助家长快速判断引用质量。</p>
        </article>
      </div>
    </section>
  )
}
