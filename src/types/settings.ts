export interface ChildProfile {
  name: string
  grade: number
  weakSubjects: string[]
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
