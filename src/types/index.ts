// 時間帯の型を追加
export type TimeSlot = '起きた時' | '朝' | '昼' | '夜' | '寝る前'

// 投薬レベルの型
export type MedicationLevel = | '多く飲んだ'  | '飲んだ'  | '少なめに飲んだ'  | '飲んでない'

export const medicationLevel: Record<MedicationLevel, number> = {
  '多く飲んだ': 3,
  '飲んだ': 2,
  '少なめに飲んだ': 1,
  '飲んでない': 0,
}

export type HealthCondition = '○' | '×' | '△'

export interface DiagnosisData {
  medicationLevel: Record<TimeSlot, MedicationLevel | null>
  healthCondition: HealthCondition | null
  consultation: string
  timestamp: string
  tonyoUsed: boolean
  skipMedication: boolean 
}

export interface ReportData extends DiagnosisData {
  id: string
  aiRecommendation?: string
} 