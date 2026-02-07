import { Palette, Settings2, ShieldCheck } from 'lucide-react'

export function SettingsPage() {
  return (
    <section className="page">
      <h1 className="page__title page__title--with-icon">
        <Settings2 size={20} />
        设置
      </h1>
      <p className="page__desc">维护系统级偏好与安全策略，确保家庭使用体验稳定可靠。</p>

      <div className="feature-grid">
        <article className="feature-card">
          <div className="feature-card__title">
            <Palette size={16} /> 视觉与偏好
          </div>
          <p>支持主题、界面密度和默认入口偏好，适配不同使用习惯。</p>
        </article>

        <article className="feature-card">
          <div className="feature-card__title">
            <ShieldCheck size={16} /> 安全策略
          </div>
          <p>集中管理密钥、请求域名白名单和本地数据保护策略。</p>
        </article>
      </div>
    </section>
  )
}
