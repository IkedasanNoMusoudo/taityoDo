// 時間帯の型を追加 - 動的に対応するためstringに変更
export type TimeSlot = string

// 投薬レベルの型
export type MedicationLevel = | '多く飲んだ'  | '飲んだ'  | '少なめに飲んだ'  | '飲んでない'

export const medicationLevel: Record<MedicationLevel, number> = {
  '多く飲んだ': 3,
  '飲んだ': 2,
  '少なめに飲んだ': 1,
  '飲んでない': 0,
}

export type HealthCondition = '〇' | '×' | '△'

export interface DiagnosisData {
  medicationLevel: Record<string, MedicationLevel | null>
  healthCondition: HealthCondition | null
  consultation: string
  timestamp: string
  tonyoUsed: boolean
}

export interface ReportData extends DiagnosisData {
  id: string
  aiRecommendation?: string
} 