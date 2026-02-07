export interface ChildLearningStats {
  practiceQuestionCount: number
  quizCount: number
  examCount: number
  avgExamScore: number
}

export type ExamRecordSource = 'school' | 'self-test'

export interface ExamRecord {
  id: string
  source: ExamRecordSource
  subject: string
  score: number
  fullScore: number
  examDate: string
  note?: string
}

export interface SubjectiveAssessment {
  dialogue: string
  aiJudgement: string
  focusDirection: string
  updatedAt: string
}

export type AbilityLevel = '待评估' | '基础' | '提升中' | '稳定' | '优秀'
export type AbilityTrend = 'up' | 'steady' | 'down'

export interface AbilityAssessmentSnapshot {
  overallScore: number
  level: AbilityLevel
  trend: AbilityTrend
  summary: string
  updatedAt: string
}

export interface ChildProfile {
  id: string
  name: string
  grade: number
  weakSubjects: string[]
  subjectScores: Record<string, number>
  examRecords: ExamRecord[]
  subjectiveAssessment: SubjectiveAssessment
  dailyGoalMinutes?: number
  parentNotes?: string
  learningStats: ChildLearningStats
  assessment?: AbilityAssessmentSnapshot
}

export interface VectorDBSettings {
  provider: 'supabase' | 'orama'
  endpoint?: string
  apiKey?: string
  enabled: boolean
}

export interface SettingsKV {
  key: string
  value: string
}
