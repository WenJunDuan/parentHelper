import { useEffect, useMemo, useState } from 'react'
import {
  BarChart3,
  BookOpenText,
  Bot,
  CheckCircle2,
  Clock3,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  TrendingDown,
  TrendingUp,
  UserRound,
} from 'lucide-react'
import { useSettingsStore } from '../../stores/useSettingsStore'
import type {
  AbilityAssessmentSnapshot,
  AbilityLevel,
  AbilityTrend,
  ChildLearningStats,
  ChildProfile,
  ExamRecord,
  SubjectiveAssessment,
} from '../../types'
import {
  loadActiveChildIdSnapshot,
  loadChildProfilesSnapshot,
  saveActiveChildIdSnapshot,
  saveChildProfilesSnapshot,
} from '../../services/persistence/settingsPersistence'

const gradeOptions = [
  { value: 1, label: '一年级' },
  { value: 2, label: '二年级' },
  { value: 3, label: '三年级' },
  { value: 4, label: '四年级' },
  { value: 5, label: '五年级' },
  { value: 6, label: '六年级' },
  { value: 7, label: '初一' },
  { value: 8, label: '初二' },
  { value: 9, label: '初三' },
]

const subjectOptions = [
  '数学',
  '语文',
  '英语',
  '物理',
  '化学',
  '生物',
  '历史',
  '地理',
  '政治',
  '科学',
  '信息技术',
  '艺术',
]

type ExamDraft = {
  source: 'school' | 'self-test'
  subject: string
  score: number
  fullScore: number
  examDate: string
  note: string
}

const defaultExamDraft: ExamDraft = {
  source: 'school',
  subject: '数学',
  score: 0,
  fullScore: 100,
  examDate: new Date().toISOString().slice(0, 10),
  note: '',
}

function createChildId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `child-${crypto.randomUUID()}`
  }

  return `child-${Date.now()}`
}

function createExamId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `exam-${crypto.randomUUID()}`
  }

  return `exam-${Date.now()}`
}

function createDefaultStats(): ChildLearningStats {
  return {
    practiceQuestionCount: 0,
    quizCount: 0,
    examCount: 0,
    avgExamScore: 0,
  }
}

function createDefaultSubjectiveAssessment(): SubjectiveAssessment {
  return {
    dialogue: '',
    aiJudgement: '先补充学习表现对话内容，AI 将自动给出能力判断。',
    focusDirection: '建议先稳定基础题准确率，再逐步增加综合应用题。',
    updatedAt: new Date().toISOString(),
  }
}

function createDefaultSubjectScores() {
  return subjectOptions.reduce<Record<string, number>>((acc, subject) => {
    acc[subject] = subject === '数学' || subject === '英语' ? 58 : 66
    return acc
  }, {})
}

function createChildProfile(index: number): ChildProfile {
  return {
    id: createChildId(),
    name: `孩子${index}`,
    grade: 3,
    weakSubjects: ['数学', '英语'],
    subjectScores: createDefaultSubjectScores(),
    examRecords: [],
    subjectiveAssessment: createDefaultSubjectiveAssessment(),
    dailyGoalMinutes: 45,
    parentNotes: '',
    learningStats: createDefaultStats(),
    assessment: {
      overallScore: 0,
      level: '待评估',
      trend: 'steady',
      summary: '当前学习数据不足，补充主观对话与考试记录后即可生成评估。',
      updatedAt: new Date().toISOString(),
    },
  }
}

function normalizeChildProfile(rawProfile: ChildProfile): ChildProfile {
  const profile = rawProfile as ChildProfile & {
    examRecords?: ExamRecord[]
    subjectiveAssessment?: SubjectiveAssessment
  }

  return {
    ...profile,
    examRecords: Array.isArray(profile.examRecords) ? profile.examRecords : [],
    subjectiveAssessment: profile.subjectiveAssessment
      ? {
          dialogue: profile.subjectiveAssessment.dialogue ?? '',
          aiJudgement:
            profile.subjectiveAssessment.aiJudgement ??
            '先补充学习表现对话内容，AI 将自动给出能力判断。',
          focusDirection:
            profile.subjectiveAssessment.focusDirection ??
            '建议先稳定基础题准确率，再逐步增加综合应用题。',
          updatedAt: profile.subjectiveAssessment.updatedAt ?? new Date().toISOString(),
        }
      : createDefaultSubjectiveAssessment(),
  }
}

function calculateObjectiveScore(
  examRecords: ExamRecord[],
  stats: ChildLearningStats,
  subjectScores: Record<string, number>,
) {
  const subjectValues = Object.values(subjectScores)
  const subjectAverage =
    subjectValues.length > 0
      ? Math.round(subjectValues.reduce((sum, value) => sum + value, 0) / subjectValues.length)
      : 0

  const examAverage =
    examRecords.length > 0
      ? Math.round(
          examRecords.reduce((sum, record) => sum + (record.score / Math.max(1, record.fullScore)) * 100, 0) /
            examRecords.length,
        )
      : stats.avgExamScore

  const totalActivity = stats.practiceQuestionCount + stats.quizCount * 3 + stats.examCount * 8
  const activityBonus = Math.min(12, Math.round(totalActivity * 0.12))

  return Math.max(
    0,
    Math.min(100, Math.round(examAverage * 0.55 + subjectAverage * 0.35 + activityBonus)),
  )
}

function calculateSubjectiveScore(assessment: SubjectiveAssessment) {
  const dialogueLength = assessment.dialogue.trim().length
  const judgementLength = assessment.aiJudgement.trim().length
  const focusLength = assessment.focusDirection.trim().length
  const total = dialogueLength * 0.35 + judgementLength * 0.35 + focusLength * 0.3
  return Math.max(0, Math.min(100, Math.round(total / 3.2)))
}

function calculateComposedAssessment(
  profile: Pick<ChildProfile, 'examRecords' | 'learningStats' | 'subjectScores' | 'subjectiveAssessment'>,
): AbilityAssessmentSnapshot {
  const objectiveScore = calculateObjectiveScore(
    profile.examRecords,
    profile.learningStats,
    profile.subjectScores,
  )
  const subjectiveScore = calculateSubjectiveScore(profile.subjectiveAssessment)
  const overall = Math.round(objectiveScore * 0.7 + subjectiveScore * 0.3)

  let level: AbilityLevel = '基础'
  if (overall >= 85) {
    level = '优秀'
  } else if (overall >= 70) {
    level = '稳定'
  } else if (overall >= 55) {
    level = '提升中'
  } else if (overall < 35) {
    level = '待评估'
  }

  const trend: AbilityTrend = overall >= 72 ? 'up' : overall >= 45 ? 'steady' : 'down'
  const summary =
    `综合评估 ${overall} 分（客观 ${objectiveScore} / 主观 ${subjectiveScore}）。` +
    `${profile.subjectiveAssessment.focusDirection || '建议保持错题复盘与阶段测评节奏。'}`

  return {
    overallScore: overall,
    level,
    trend,
    summary,
    updatedAt: new Date().toISOString(),
  }
}

function buildAiJudgement(dialogue: string, objectiveScore: number) {
  const normalized = dialogue.toLowerCase()
  const strongSignals = ['主动', '坚持', '稳定', '独立', '高效']
  const weakSignals = ['拖延', '粗心', '畏难', '焦虑', '分心']

  const positiveCount = strongSignals.filter((token) => normalized.includes(token)).length
  const negativeCount = weakSignals.filter((token) => normalized.includes(token)).length

  if (!dialogue.trim()) {
    return '请先补充一段关于孩子学习表现的对话，AI 才能给出判断。'
  }

  if (positiveCount >= negativeCount + 2 && objectiveScore >= 70) {
    return '主观表现积极且执行稳定，具备持续冲高能力。'
  }

  if (negativeCount > positiveCount) {
    return '存在学习习惯波动，建议先稳住执行节奏再提升难度。'
  }

  return '学习状态中性偏稳，建议以阶段目标驱动持续改进。'
}

function buildFocusDirection(profile: ChildProfile, objectiveScore: number) {
  const weakest = Object.entries(profile.subjectScores)
    .sort((a, b) => a[1] - b[1])
    .slice(0, 2)
    .map(([subject]) => subject)

  if (objectiveScore >= 80) {
    return `当前基础较稳，下一阶段建议强化${weakest.join('、')}的综合应用与跨题型迁移。`
  }

  if (objectiveScore >= 60) {
    return `建议围绕${weakest.join('、')}做“基础巩固 + 每周小测”双线推进。`
  }

  return `建议优先提升${weakest.join('、')}基础正确率，并固定每日 20 分钟错题复盘。`
}

function copyProfile(profile: ChildProfile): ChildProfile {
  const normalized = normalizeChildProfile(profile)

  return {
    ...normalized,
    weakSubjects: [...normalized.weakSubjects],
    subjectScores: { ...normalized.subjectScores },
    examRecords: normalized.examRecords.map((item) => ({ ...item })),
    learningStats: { ...normalized.learningStats },
    subjectiveAssessment: { ...normalized.subjectiveAssessment },
    assessment: normalized.assessment ? { ...normalized.assessment } : undefined,
  }
}

export function ChildProfilePage() {
  const {
    childProfiles,
    activeChildId,
    setChildProfiles,
    upsertChildProfile,
    removeChildProfile,
    setActiveChildId,
  } = useSettingsStore()

  const [initialized, setInitialized] = useState(false)
  const [draft, setDraft] = useState<ChildProfile | null>(null)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [examDraft, setExamDraft] = useState<ExamDraft>(defaultExamDraft)

  useEffect(() => {
    let active = true

    const initialize = async () => {
      const [storedProfiles, storedActiveChildId] = await Promise.all([
        loadChildProfilesSnapshot(),
        loadActiveChildIdSnapshot(),
      ])

      if (!active) {
        return
      }

      if (storedProfiles.length > 0) {
        const normalizedProfiles = storedProfiles.map(normalizeChildProfile)
        setChildProfiles(normalizedProfiles)

        const targetActive = normalizedProfiles.some((item) => item.id === storedActiveChildId)
          ? storedActiveChildId
          : normalizedProfiles[0].id
        setActiveChildId(targetActive)
        setInitialized(true)
        return
      }

      const initial = createChildProfile(1)
      setChildProfiles([initial])
      setActiveChildId(initial.id)
      setInitialized(true)
    }

    void initialize()

    return () => {
      active = false
    }
  }, [setActiveChildId, setChildProfiles])

  useEffect(() => {
    if (!initialized) {
      return
    }

    void saveChildProfilesSnapshot(childProfiles)
  }, [childProfiles, initialized])

  useEffect(() => {
    if (!initialized) {
      return
    }

    void saveActiveChildIdSnapshot(activeChildId)
  }, [activeChildId, initialized])

  const activeProfile = useMemo(
    () => childProfiles.find((item) => item.id === activeChildId) ?? childProfiles[0],
    [activeChildId, childProfiles],
  )

  useEffect(() => {
    if (!activeProfile) {
      setDraft(null)
      return
    }

    setDraft(copyProfile(activeProfile))
    setExamDraft(defaultExamDraft)
  }, [activeProfile])

  const completion = useMemo(() => {
    if (!draft) {
      return 0
    }

    let done = 0
    if (draft.name.trim()) {
      done += 1
    }
    if (draft.grade > 0) {
      done += 1
    }
    if (draft.subjectiveAssessment.dialogue.trim()) {
      done += 1
    }
    if (draft.examRecords.length > 0) {
      done += 1
    }
    if ((draft.dailyGoalMinutes ?? 0) > 0) {
      done += 1
    }

    return Math.round((done / 5) * 100)
  }, [draft])

  const topSubjects = useMemo(() => {
    if (!draft) {
      return []
    }

    return Object.entries(draft.subjectScores)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([name]) => name)
  }, [draft])

  const weakSubjects = useMemo(() => {
    if (!draft) {
      return []
    }

    return Object.entries(draft.subjectScores)
      .sort((a, b) => a[1] - b[1])
      .slice(0, 2)
      .map(([name]) => name)
  }, [draft])

  const objectiveScore = useMemo(() => {
    if (!draft) {
      return 0
    }

    return calculateObjectiveScore(draft.examRecords, draft.learningStats, draft.subjectScores)
  }, [draft])

  const subjectiveScore = useMemo(() => {
    if (!draft) {
      return 0
    }

    return calculateSubjectiveScore(draft.subjectiveAssessment)
  }, [draft])

  const handleAddChild = () => {
    const next = createChildProfile(childProfiles.length + 1)
    upsertChildProfile(next)
    setActiveChildId(next.id)
  }

  const handleDeleteChild = () => {
    if (!activeProfile) {
      return
    }

    removeChildProfile(activeProfile.id)
    setSavedAt(null)
  }

  const handleSave = () => {
    if (!draft) {
      return
    }

    const composed = calculateComposedAssessment(draft)
    upsertChildProfile({
      ...draft,
      assessment: composed,
    })
    setSavedAt(new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }))
  }

  const handleReset = () => {
    if (!activeProfile) {
      return
    }

    setDraft(copyProfile(activeProfile))
    setExamDraft(defaultExamDraft)
  }

  const handleGenerateAiAssessment = () => {
    if (!draft) {
      return
    }

    const aiJudgement = buildAiJudgement(draft.subjectiveAssessment.dialogue, objectiveScore)
    const focusDirection = buildFocusDirection(draft, objectiveScore)

    setDraft((prev) =>
      prev
        ? {
            ...prev,
            subjectiveAssessment: {
              ...prev.subjectiveAssessment,
              aiJudgement,
              focusDirection,
              updatedAt: new Date().toISOString(),
            },
            assessment: calculateComposedAssessment({
              ...prev,
              subjectiveAssessment: {
                ...prev.subjectiveAssessment,
                aiJudgement,
                focusDirection,
                updatedAt: new Date().toISOString(),
              },
            }),
          }
        : prev,
    )
  }

  const handleAddExamRecord = () => {
    if (!draft) {
      return
    }

    const fullScore = Math.max(1, Number(examDraft.fullScore) || 100)
    const score = Math.max(0, Math.min(fullScore, Number(examDraft.score) || 0))

    const nextRecord: ExamRecord = {
      id: createExamId(),
      source: examDraft.source,
      subject: examDraft.subject,
      score,
      fullScore,
      examDate: examDraft.examDate,
      note: examDraft.note.trim() || undefined,
    }

    const nextExamRecords = [nextRecord, ...draft.examRecords]
    const nextStats: ChildLearningStats = {
      ...draft.learningStats,
      examCount: nextExamRecords.length,
      avgExamScore: Math.round(
        nextExamRecords.reduce(
          (sum, item) => sum + (item.score / Math.max(1, item.fullScore)) * 100,
          0,
        ) / nextExamRecords.length,
      ),
    }

    setDraft({
      ...draft,
      examRecords: nextExamRecords,
      learningStats: nextStats,
      assessment: calculateComposedAssessment({
        ...draft,
        examRecords: nextExamRecords,
        learningStats: nextStats,
      }),
    })

    setExamDraft(defaultExamDraft)
  }

  const handleRemoveExamRecord = (recordId: string) => {
    if (!draft) {
      return
    }

    const nextExamRecords = draft.examRecords.filter((item) => item.id !== recordId)
    const nextStats: ChildLearningStats = {
      ...draft.learningStats,
      examCount: nextExamRecords.length,
      avgExamScore:
        nextExamRecords.length > 0
          ? Math.round(
              nextExamRecords.reduce(
                (sum, item) => sum + (item.score / Math.max(1, item.fullScore)) * 100,
                0,
              ) / nextExamRecords.length,
            )
          : 0,
    }

    setDraft({
      ...draft,
      examRecords: nextExamRecords,
      learningStats: nextStats,
      assessment: calculateComposedAssessment({
        ...draft,
        examRecords: nextExamRecords,
        learningStats: nextStats,
      }),
    })
  }

  if (!draft) {
    return (
      <section className="page child-page">
        <header className="child-header">
          <h1 className="page__title page__title--with-icon">
            <UserRound size={20} /> 学习档案
          </h1>
        </header>
      </section>
    )
  }

  return (
    <section className="page child-page">
      <header className="child-header">
        <div>
          <h1 className="page__title page__title--with-icon">
            <UserRound size={20} />
            学习档案
          </h1>
          <p className="page__desc">
            合并主观能力画像与客观成绩记录：AI 判断学习状态并给出下阶段学习侧重点。
          </p>
        </div>
      </header>

      <div className="child-tabs-bar">
        <div className="child-tabs" role="tablist" aria-label="孩子标签">
          {childProfiles.map((child) => {
            const active = child.id === activeProfile.id

            return (
              <button
                key={child.id}
                className={`child-tab${active ? ' child-tab--active' : ''}`}
                role="tab"
                aria-selected={active}
                type="button"
                onClick={() => setActiveChildId(child.id)}
              >
                {child.name || '未命名'}
              </button>
            )
          })}
        </div>

        <div className="child-tab-actions">
          <button className="home-btn" type="button" onClick={handleAddChild}>
            <Plus size={16} /> 新增孩子
          </button>
          <button
            className="home-btn model-btn-danger"
            type="button"
            disabled={childProfiles.length <= 1}
            onClick={handleDeleteChild}
          >
            <Trash2 size={16} /> 删除当前
          </button>
        </div>
      </div>

      <div className="child-layout child-layout--tabs">
        <article className="child-card child-card--editor">
          <div className="child-card__title">
            <BookOpenText size={18} /> 基础学习画像
          </div>

          <div className="field-row">
            <label className="field">
              <span className="field__label">孩子姓名</span>
              <input
                className="field__input"
                value={draft.name}
                onChange={(event) => setDraft((prev) => (prev ? { ...prev, name: event.target.value } : prev))}
                placeholder="例如：小明"
              />
            </label>

            <label className="field">
              <span className="field__label">当前年级</span>
              <select
                className="field__input"
                value={draft.grade}
                onChange={(event) =>
                  setDraft((prev) => (prev ? { ...prev, grade: Number(event.target.value) || 1 } : prev))
                }
              >
                {gradeOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="field">
            <span className="field__label">每日学习目标（分钟）</span>
            <input
              className="field__input"
              type="number"
              min={10}
              max={240}
              value={draft.dailyGoalMinutes ?? 0}
              onChange={(event) =>
                setDraft((prev) =>
                  prev ? { ...prev, dailyGoalMinutes: Number(event.target.value) || undefined } : prev,
                )
              }
            />
          </label>

          <label className="field">
            <span className="field__label">家长备注</span>
            <textarea
              className="field__input child-textarea"
              value={draft.parentNotes ?? ''}
              onChange={(event) =>
                setDraft((prev) => (prev ? { ...prev, parentNotes: event.target.value } : prev))
              }
              placeholder="记录学习习惯、近期状态、注意事项"
            />
          </label>

          <div className="child-card__title">
            <BarChart3 size={18} /> 主观能力画像（AI 判断）
          </div>

          <label className="field">
            <span className="field__label">学习情况对话（主观输入）</span>
            <textarea
              className="field__input child-textarea"
              value={draft.subjectiveAssessment.dialogue}
              onChange={(event) =>
                setDraft((prev) =>
                  prev
                    ? {
                        ...prev,
                        subjectiveAssessment: {
                          ...prev.subjectiveAssessment,
                          dialogue: event.target.value,
                        },
                      }
                    : prev,
                )
              }
              placeholder="例如：最近数学计算正确率提升，但语文阅读理解容易走神..."
            />
          </label>

          <div className="child-actions-inline">
            <button className="home-btn" type="button" onClick={handleGenerateAiAssessment}>
              <Bot size={16} /> AI 生成判断
            </button>
          </div>

          <div className="child-insight-grid">
            <div className="child-insight-card">
              <span>AI 能力判断</span>
              <strong>{draft.subjectiveAssessment.aiJudgement}</strong>
            </div>
            <div className="child-insight-card">
              <span>下阶段学习侧重点</span>
              <strong>{draft.subjectiveAssessment.focusDirection}</strong>
            </div>
          </div>

          <div className="child-card__title">
            <Clock3 size={18} /> 客观评分记录
          </div>

          <div className="field-row">
            <label className="field">
              <span className="field__label">来源</span>
              <select
                className="field__input"
                value={examDraft.source}
                onChange={(event) =>
                  setExamDraft((prev) => ({
                    ...prev,
                    source: event.target.value as ExamDraft['source'],
                  }))
                }
              >
                <option value="school">学校考试</option>
                <option value="self-test">自测成绩</option>
              </select>
            </label>

            <label className="field">
              <span className="field__label">学科</span>
              <select
                className="field__input"
                value={examDraft.subject}
                onChange={(event) => setExamDraft((prev) => ({ ...prev, subject: event.target.value }))}
              >
                {subjectOptions.map((subject) => (
                  <option key={subject} value={subject}>
                    {subject}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="field-row">
            <label className="field">
              <span className="field__label">得分</span>
              <input
                className="field__input"
                type="number"
                min={0}
                value={examDraft.score}
                onChange={(event) =>
                  setExamDraft((prev) => ({ ...prev, score: Number(event.target.value) || 0 }))
                }
              />
            </label>

            <label className="field">
              <span className="field__label">满分</span>
              <input
                className="field__input"
                type="number"
                min={1}
                value={examDraft.fullScore}
                onChange={(event) =>
                  setExamDraft((prev) => ({ ...prev, fullScore: Number(event.target.value) || 100 }))
                }
              />
            </label>

            <label className="field">
              <span className="field__label">日期</span>
              <input
                className="field__input"
                type="date"
                value={examDraft.examDate}
                onChange={(event) => setExamDraft((prev) => ({ ...prev, examDate: event.target.value }))}
              />
            </label>
          </div>

          <label className="field">
            <span className="field__label">备注</span>
            <input
              className="field__input"
              value={examDraft.note}
              onChange={(event) => setExamDraft((prev) => ({ ...prev, note: event.target.value }))}
              placeholder="例如：期中考试 / 周末自测"
            />
          </label>

          <button className="home-btn" type="button" onClick={handleAddExamRecord}>
            <Plus size={16} /> 录入成绩
          </button>

          <div className="task-list">
            {draft.examRecords.map((record) => (
              <div key={record.id} className="task-row">
                <span className="task-toggle">{record.source === 'school' ? '学校' : '自测'}</span>
                <div className="task-row__main">
                  <strong>
                    {record.subject} · {record.score}/{record.fullScore}
                  </strong>
                  <span>{record.examDate}</span>
                  {record.note && <p>{record.note}</p>}
                </div>
                <button
                  className="model-icon-btn model-icon-btn--danger"
                  type="button"
                  onClick={() => handleRemoveExamRecord(record.id)}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}

            {draft.examRecords.length === 0 && (
              <div className="model-empty">暂无成绩记录，请先录入学校考试或自测分数。</div>
            )}
          </div>

          <div className="child-actions">
            <button className="home-btn" type="button" onClick={handleReset}>
              <RotateCcw size={16} /> 重置
            </button>
            <button className="home-btn home-btn--primary" type="button" onClick={handleSave}>
              <Save size={16} /> 保存档案
            </button>
          </div>

          {savedAt && (
            <div className="child-saved-tip">
              <CheckCircle2 size={14} /> 已保存（{savedAt}）
            </div>
          )}
        </article>

        <article className="child-card child-card--assessment">
          <div className="child-card__title">
            <BarChart3 size={18} /> 综合能力评估（主观 + 客观）
          </div>

          <div className="child-progress">
            <strong>档案完成度 {completion}%</strong>
            <div className="child-progress__bar">
              <span style={{ width: `${completion}%` }} />
            </div>
          </div>

          <div className="child-assessment-card">
            <div className="child-assessment-head">
              <strong>综合能力：{draft.assessment?.level ?? '待评估'}</strong>
              <span className="child-assessment-score">{draft.assessment?.overallScore ?? 0}</span>
            </div>

            <div className="child-assessment-trend">
              {draft.assessment?.trend === 'up' && <TrendingUp size={14} />}
              {draft.assessment?.trend === 'down' && <TrendingDown size={14} />}
              <span>
                趋势：
                {draft.assessment?.trend === 'up'
                  ? '上升'
                  : draft.assessment?.trend === 'down'
                    ? '下降'
                    : '稳定'}
              </span>
            </div>

            <p>{draft.assessment?.summary ?? '暂无评估结论'}</p>
          </div>

          <div className="child-insight-grid">
            <div className="child-insight-card">
              <span>客观评分</span>
              <strong>{objectiveScore}</strong>
            </div>
            <div className="child-insight-card">
              <span>主观画像评分</span>
              <strong>{subjectiveScore}</strong>
            </div>
            <div className="child-insight-card">
              <span>优势学科</span>
              <strong>{topSubjects.join('、') || '暂无'}</strong>
            </div>
            <div className="child-insight-card">
              <span>待提升学科</span>
              <strong>{weakSubjects.join('、') || '暂无'}</strong>
            </div>
          </div>
        </article>
      </div>
    </section>
  )
}
