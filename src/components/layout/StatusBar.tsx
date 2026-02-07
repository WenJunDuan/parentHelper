import { Bot, CheckCircle2, Database, Sparkles } from 'lucide-react'

export function StatusBar() {
  return (
    <footer className="statusbar">
      <span className="statusbar__item">
        <Sparkles size={14} /> Claude Sonnet
      </span>
      <span className="statusbar__sep">·</span>
      <span className="statusbar__item">
        <Database size={14} /> 学习资料 0 个就绪
      </span>
      <span className="statusbar__sep">·</span>
      <span className="statusbar__item">
        <Bot size={14} /> 4 Agents 活跃
      </span>
      <span className="statusbar__sep">·</span>
      <span className="statusbar__item">
        <CheckCircle2 size={14} /> 今日待办 0 个
      </span>
    </footer>
  )
}
