import { Bot, Puzzle, Route, Workflow } from 'lucide-react'

export function AgentPage() {
  return (
    <section className="page">
      <h1 className="page__title page__title--with-icon">
        <Bot size={20} />
        Agent
      </h1>
      <p className="page__desc">按角色管理 Router 与执行 Agent，统一编排提示词、技能与工具接入。</p>

      <div className="feature-grid">
        <article className="feature-card">
          <div className="feature-card__title">
            <Route size={16} /> 路由策略
          </div>
          <p>根据问题类型和孩子画像，自动选择最匹配的 Agent。</p>
        </article>

        <article className="feature-card">
          <div className="feature-card__title">
            <Puzzle size={16} /> 能力拼装
          </div>
          <p>为 Agent 挂载技能、MCP 工具和知识库，形成可复用能力包。</p>
        </article>

        <article className="feature-card">
          <div className="feature-card__title">
            <Workflow size={16} /> 执行链路
          </div>
          <p>可视化查看任务从路由、检索到回答输出的执行路径。</p>
        </article>
      </div>
    </section>
  )
}
