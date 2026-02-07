import { useEffect, useMemo, useState } from 'react'
import {
  BarChart3,
  CalendarClock,
  CheckCircle2,
  Minus,
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
  examName: string
  score: number
  fullScore: number
  examDate: string
  note: string
}

type BlendedSeriesPoint = {
  label: string
  score: number
  blendedScore: number
  objectiveScore: number
  subjectiveScore: number
  date: string
  subject: string
}

type ChartPoint = BlendedSeriesPoint & {
  x: number
  y: number
}

const defaultExamDraft: ExamDraft = {
  source: 'school',
  subject: '数学',
  examName: '',
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

function formatChartDate(date: string) {
  const parsed = new Date(date)

  if (Number.isNaN(parsed.getTime())) {
    return date
  }

  return parsed.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

function createChildProfile(index: number): ChildProfile {
  return {
    id: createChildId(),
    name: `孩子${index}`,
    grade: 3,
    weakSubjects: [],
    subjectScores: {},
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
    weakSubjects: Array.isArray(profile.weakSubjects) ? profile.weakSubjects : [],
    subjectScores: typeof profile.subjectScores === 'object' && profile.subjectScores ? profile.subjectScores : {},
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

function calculateObjectiveScore(examRecords: ExamRecord[], stats: ChildLearningStats) {
  const examAverage =
    examRecords.length > 0
      ? Math.round(
          examRecords.reduce((sum, record) => sum + (record.score / Math.max(1, record.fullScore)) * 100, 0) /
            examRecords.length,
        )
      : stats.avgExamScore

  return Math.max(0, Math.min(100, examAverage))
}

function calculateSubjectiveScore(assessment: SubjectiveAssessment) {
  const dialogueLength = assessment.dialogue.trim().length
  const judgementLength = assessment.aiJudgement.trim().length
  const focusLength = assessment.focusDirection.trim().length
  const total = dialogueLength * 0.5 + judgementLength * 0.25 + focusLength * 0.25
  return Math.max(0, Math.min(100, Math.round(total / 3.6)))
}

function calculateComposedAssessment(
  profile: Pick<ChildProfile, 'examRecords' | 'learningStats' | 'subjectiveAssessment'>,
): AbilityAssessmentSnapshot {
  const objectiveScore = calculateObjectiveScore(profile.examRecords, profile.learningStats)
  const subjectiveScore = calculateSubjectiveScore(profile.subjectiveAssessment)
  const overall = Math.round((objectiveScore + subjectiveScore) / 2)

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
  if (dialogue.trim().length < 20) {
    return '建议补充更完整的学习状态描述（专注度、错题类型、完成作业习惯）以获得更准确判断。'
  }

  if (objectiveScore >= 80) {
    return '孩子学习基础较稳，注意在高阶题与综合题上提升思考深度。'
  }

  if (objectiveScore >= 60) {
    return '当前处于稳步提升阶段，建议继续夯实基础并加强错题复盘频率。'
  }

  return '基础能力波动较大，建议先缩小学习范围，分模块补齐核心知识点。'
}

function buildFocusDirection(profile: ChildProfile, objectiveScore: number) {
  const weakest = [...profile.examRecords]
    .sort((a, b) => (a.score / Math.max(1, a.fullScore)) * 100 - (b.score / Math.max(1, b.fullScore)) * 100)
    .slice(0, 2)
    .map((item) => item.subject)

  if (objectiveScore >= 80) {
    return `当前基础较稳，下一阶段建议强化${weakest.join('、') || '核心学科'}的综合应用与跨题型迁移。`
  }

  if (objectiveScore >= 60) {
    return `建议围绕${weakest.join('、') || '核心学科'}做“基础巩固 + 每周小测”双线推进。`
  }

  return `建议优先提升${weakest.join('、') || '核心学科'}基础正确率，并固定每日 20 分钟错题复盘。`
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
  const [historyCollapsed, setHistoryCollapsed] = useState(true)
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null)

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
    if ((draft.parentNotes ?? '').trim()) {
      done += 1
    }
    if (draft.examRecords.length > 0) {
      done += 1
    }

    return Math.round((done / 4) * 100)
  }, [draft])

  const objectiveScore = useMemo(() => {
    if (!draft) {
      return 0
    }

    return calculateObjectiveScore(draft.examRecords, draft.learningStats)
  }, [draft])

  const subjectiveDialogue = useMemo(() => {
    if (!draft) {
      return ''
    }

    return (draft.parentNotes ?? '').trim() || draft.subjectiveAssessment.dialogue
  }, [draft])

  const aiJudgementText = useMemo(() => {
    return buildAiJudgement(subjectiveDialogue, objectiveScore)
  }, [objectiveScore, subjectiveDialogue])

  const focusDirectionText = useMemo(() => {
    if (!draft) {
      return '建议先补充考试记录后再生成学习侧重点。'
    }

    return buildFocusDirection(draft, objectiveScore)
  }, [draft, objectiveScore])

  const subjectiveScore = useMemo(() => {
    if (!draft) {
      return 0
    }

    return calculateSubjectiveScore({
      ...draft.subjectiveAssessment,
      dialogue: subjectiveDialogue,
      aiJudgement: aiJudgementText,
      focusDirection: focusDirectionText,
    })
  }, [aiJudgementText, draft, focusDirectionText, subjectiveDialogue])

  const blendedSeries = useMemo<BlendedSeriesPoint[]>(() => {
    if (!draft) {
      return []
    }

    const objectiveBase = objectiveScore
    const subjectiveBase = subjectiveScore

    if (draft.examRecords.length === 0) {
      return [
        {
          label: '当前',
          score: Math.round((objectiveBase + subjectiveBase) / 2),
          blendedScore: Math.round((objectiveBase + subjectiveBase) / 2),
          objectiveScore: objectiveBase,
          subjectiveScore: subjectiveBase,
          date: new Date().toISOString(),
          subject: '综合',
        },
      ]
    }

    return [...draft.examRecords]
      .sort((a, b) => a.examDate.localeCompare(b.examDate))
      .map((record, index) => {
        const objectiveAtPoint = Math.round((record.score / Math.max(1, record.fullScore)) * 100)
        const blended = Math.round((objectiveAtPoint + subjectiveBase) / 2)
        return {
          label: `${index + 1}`,
          score: blended,
          blendedScore: blended,
          objectiveScore: objectiveAtPoint,
          subjectiveScore: subjectiveBase,
          date: record.examDate,
          subject: record.subject,
        }
      })
  }, [draft, objectiveScore, subjectiveScore])

  const chartSeries = useMemo<ChartPoint[]>(() => {
    if (blendedSeries.length === 0) {
      return []
    }

    const width = 420
    const height = 140
    const paddingX = 18
    const paddingY = 18
    const usableWidth = width - paddingX * 2
    const usableHeight = height - paddingY * 2

    return blendedSeries.map((item, index) => {
      const x =
        blendedSeries.length === 1 ? width / 2 : paddingX + (usableWidth / (blendedSeries.length - 1)) * index
      const y = paddingY + ((100 - item.score) / 100) * usableHeight

      return {
        ...item,
        x,
        y,
      }
    })
  }, [blendedSeries])

  const chartPoints = useMemo(() => {
    if (chartSeries.length === 0) {
      return ''
    }

    return chartSeries.map((item) => `${item.x},${item.y}`).join(' ')
  }, [chartSeries])

  useEffect(() => {
    if (hoveredPointIndex === null) {
      return
    }

    if (hoveredPointIndex >= chartSeries.length) {
      setHoveredPointIndex(null)
    }
  }, [chartSeries.length, hoveredPointIndex])

  const hoveredPoint = hoveredPointIndex === null ? null : chartSeries[hoveredPointIndex] ?? null

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

    const subjectiveAssessment: SubjectiveAssessment = {
      ...draft.subjectiveAssessment,
      dialogue: subjectiveDialogue,
      aiJudgement: aiJudgementText,
      focusDirection: focusDirectionText,
      updatedAt: new Date().toISOString(),
    }

    const composed = calculateComposedAssessment({
      examRecords: draft.examRecords,
      learningStats: draft.learningStats,
      subjectiveAssessment,
    })

    upsertChildProfile({
      ...draft,
      subjectiveAssessment,
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
      note:
        [examDraft.examName.trim(), examDraft.note.trim()]
          .filter((item) => item.length > 0)
          .join(' ｜ ') || undefined,
    }

    const nextExamRecords = [nextRecord, ...draft.examRecords]
    const nextStats: ChildLearningStats = {
      ...draft.learningStats,
      examCount: nextExamRecords.length,
      avgExamScore: Math.round(
        nextExamRecords.reduce((sum, item) => sum + (item.score / Math.max(1, item.fullScore)) * 100, 0) /
          nextExamRecords.length,
      ),
    }

    setDraft({
      ...draft,
      examRecords: nextExamRecords,
      learningStats: nextStats,
      assessment: calculateComposedAssessment({
        examRecords: nextExamRecords,
        learningStats: nextStats,
        subjectiveAssessment: draft.subjectiveAssessment,
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
              nextExamRecords.reduce((sum, item) => sum + (item.score / Math.max(1, item.fullScore)) * 100, 0) /
                nextExamRecords.length,
            )
          : 0,
    }

    setDraft({
      ...draft,
      examRecords: nextExamRecords,
      learningStats: nextStats,
      assessment: calculateComposedAssessment({
        examRecords: nextExamRecords,
        learningStats: nextStats,
        subjectiveAssessment: draft.subjectiveAssessment,
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
          <p className="page__desc">左侧维护基础档案与考试成绩，右侧展示 AI 评估、历史评价成绩与学习侧重点建议。</p>
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
            <UserRound size={18} /> 学生基础信息
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
            <span className="field__label">家长备注</span>
            <textarea
              className="field__input child-textarea"
              value={draft.parentNotes ?? ''}
              onChange={(event) =>
                setDraft((prev) => (prev ? { ...prev, parentNotes: event.target.value } : prev))
              }
              placeholder="记录孩子学习习惯、近期状态与注意事项"
            />
          </label>

          <div className="child-card__title">
            <CalendarClock size={18} /> 客观考试录入
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
              <span className="field__label">考试名称</span>
              <input
                className="field__input"
                value={examDraft.examName}
                onChange={(event) => setExamDraft((prev) => ({ ...prev, examName: event.target.value }))}
                placeholder="例如：期中考试 / 第三次单元测"
              />
            </label>

            <label className="field">
              <span className="field__label">考试时间</span>
              <input
                className="field__input"
                type="date"
                value={examDraft.examDate}
                onChange={(event) => setExamDraft((prev) => ({ ...prev, examDate: event.target.value }))}
              />
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
          </div>

          <label className="field">
            <span className="field__label">补充说明（可选）</span>
            <input
              className="field__input"
              value={examDraft.note}
              onChange={(event) => setExamDraft((prev) => ({ ...prev, note: event.target.value }))}
              placeholder="例如：粗心失分较多 / 完成速度偏慢"
            />
          </label>

          <button className="home-btn" type="button" onClick={handleAddExamRecord}>
            <Plus size={16} /> 录入成绩
          </button>

          <div className="child-actions-inline">
            <button className="home-btn" type="button" onClick={() => setHistoryCollapsed((value) => !value)}>
              {historyCollapsed ? <Plus size={16} /> : <Minus size={16} />}
              {historyCollapsed ? '展开历史成绩' : '收起历史成绩'}
            </button>
          </div>

          {!historyCollapsed && (
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

              {draft.examRecords.length === 0 && <div className="model-empty">暂无历史考试记录。</div>}
            </div>
          )}

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
            <BarChart3 size={18} /> 平均成绩与 AI 评估分析
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

            <div className="child-insight-card">
              <span>AI 评估分析</span>
              <strong>{aiJudgementText}</strong>
            </div>

            <div className="child-insight-card">
              <span>学习侧重点建议</span>
              <strong>{focusDirectionText}</strong>
            </div>
          </div>

          <div className="child-insight-grid">
            <div className="child-insight-card">
              <span>历史评价成绩</span>
              <strong>{subjectiveScore}</strong>
            </div>
            <div className="child-insight-card">
              <span>客观平均成绩</span>
              <strong>{objectiveScore}</strong>
            </div>
            <div className="child-insight-card">
              <span>主客观平均</span>
              <strong>{Math.round((objectiveScore + subjectiveScore) / 2)}</strong>
            </div>
          </div>

          <div className="child-line-chart">
            <div className="child-line-chart__title">历史评价成绩趋势</div>
            {chartPoints ? (
              <svg viewBox="0 0 420 140" role="img" aria-label="主客观平均成绩折线图">
                <line x1="18" y1="122" x2="402" y2="122" className="chart-axis" />
                <line x1="18" y1="18" x2="18" y2="122" className="chart-axis" />
                <polyline points={chartPoints} className="chart-line" />
                {chartSeries.map((item, index) => (
                  <g
                    key={`${item.label}-${item.date}`}
                    onMouseEnter={() => setHoveredPointIndex(index)}
                    onMouseLeave={() => setHoveredPointIndex(null)}
                  >
                    <circle
                      cx={item.x}
                      cy={item.y}
                      r={hoveredPointIndex === index ? 5 : 3.8}
                      className={`chart-dot${hoveredPointIndex === index ? ' chart-dot--active' : ''}`}
                    />
                    <text x={item.x} y={136} className="chart-label">
                      {item.label}
                    </text>
                  </g>
                ))}

                {hoveredPoint && (
                  <g className="chart-tooltip" pointerEvents="none">
                    <rect
                      x={Math.max(20, Math.min(252, hoveredPoint.x - 84))}
                      y={Math.max(12, hoveredPoint.y - 70)}
                      width="168"
                      height="64"
                      rx="8"
                      className="chart-tooltip__box"
                    />
                    <text
                      x={Math.max(30, Math.min(262, hoveredPoint.x - 74))}
                      y={Math.max(28, hoveredPoint.y - 54)}
                      className="chart-tooltip__title"
                    >
                      {hoveredPoint.subject}
                    </text>
                    <text
                      x={Math.max(30, Math.min(262, hoveredPoint.x - 74))}
                      y={Math.max(42, hoveredPoint.y - 40)}
                      className="chart-tooltip__text"
                    >
                      日期：{formatChartDate(hoveredPoint.date)}
                    </text>
                    <text
                      x={Math.max(30, Math.min(262, hoveredPoint.x - 74))}
                      y={Math.max(54, hoveredPoint.y - 28)}
                      className="chart-tooltip__text"
                    >
                      客观：{hoveredPoint.objectiveScore} 主观：{hoveredPoint.subjectiveScore}
                    </text>
                    <text
                      x={Math.max(30, Math.min(262, hoveredPoint.x - 74))}
                      y={Math.max(66, hoveredPoint.y - 16)}
                      className="chart-tooltip__text chart-tooltip__text--strong"
                    >
                      平均：{hoveredPoint.blendedScore}
                    </text>
                  </g>
                )}
              </svg>
            ) : (
              <div className="model-empty">暂无可绘制数据</div>
            )}
          </div>
        </article>
      </div>
    </section>
  )
}
