export type MedicationLevel = '多く飲んだ' | '飲んだ' | '少なめに飲んだ' | '飲んでない'

export type HealthCondition = '○' | '×' | '△'

export interface DiagnosisData {
  medicationLevel: MedicationLevel | null
  healthCondition: HealthCondition | null
  consultation: string
  timestamp: string
}

export interface ReportData extends DiagnosisData {
  id: string
  aiRecommendation?: string
} 