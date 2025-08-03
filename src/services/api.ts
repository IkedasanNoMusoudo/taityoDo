// API client service for backend communication
import { DiagnosisData } from '../types/index';

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8787/api';

export interface APIResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface RAGFeedbackResponse {
  message: string;
  feedback: string;
}

export interface MedicalReportResponse {
  userId: number;
  periodStart: string;
  periodEnd: string;
  recordCount: number;
  objectiveSummary: string;
  medicalSummary: string;
  generatedAt: string;
}

class APIService {
  // Map frontend condition symbols to backend format
  private mapConditionToBackend(condition: string): string {
    const conditionMap: Record<string, string> = {
      '○': '〇',  // Full-width circle
      '×': '×',   // Same symbol
      '△': '△'   // Same symbol
    };
    return conditionMap[condition] || condition;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<APIResponse<T>> {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { data };
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      return { error: error instanceof Error ? error.message : 'API request failed' };
    }
  }

  // Create a new record and get RAG feedback
  async createRecord(diagnosisData: DiagnosisData, userId: number = 3): Promise<APIResponse<RAGFeedbackResponse>> {
    // Convert frontend DiagnosisData to backend format
    
    // Format medication data for RAG context
    const medicationInfo = Object.entries(diagnosisData.medicationLevel)
      .filter(([_, detail]) => detail && detail.level !== '飲んでない')
      .map(([timeSlot, detail]) => {
        const parts = [timeSlot, detail.level];
        if (detail.name) parts.push(`薬名: ${detail.name}`);
        if (detail.amount) parts.push(`${detail.amount}錠`);
        return parts.join(' ');
      })
      .join(', ');
    
    // Combine consultation and medication info
    const fullForm = [
      diagnosisData.consultation,
      medicationInfo ? `【服薬状況】${medicationInfo}` : '',
      diagnosisData.tonyoUsed ? '【頓用薬使用】あり' : '',
      diagnosisData.skipMedication ? '【服薬スキップ】あり' : ''
    ].filter(Boolean).join('\n');
    
    const recordData = {
      user_id: userId,
      condition: diagnosisData.healthCondition ? this.mapConditionToBackend(diagnosisData.healthCondition) : null,
      form: fullForm,
      occurred_at: diagnosisData.timestamp || new Date().toISOString(),
    };

    // Debug log for troubleshooting
    console.log('Sending record data:', recordData);
    console.log('Original diagnosis data:', diagnosisData);

    return this.request<RAGFeedbackResponse>('/records', {
      method: 'POST',
      body: JSON.stringify(recordData),
    });
  }

  // Get user's records
  async getUserRecords(userId: number = 3): Promise<APIResponse<any[]>> {
    return this.request<any[]>(`/records/user/${userId}`);
  }

  // Generate medical report with RAG
  async generateMedicalReport(
    userId: number = 3,
    startDate: string,
    endDate: string
  ): Promise<APIResponse<MedicalReportResponse>> {
    const reportData = {
      user_id: userId,
      start_date: startDate,
      end_date: endDate,
    };

    return this.request<MedicalReportResponse>('/reports/generate', {
      method: 'POST',
      body: JSON.stringify(reportData),
    });
  }

  // Preview report data
  async previewReport(
    userId: number = 3,
    startDate: string,
    endDate: string
  ): Promise<APIResponse<any>> {
    return this.request<any>(`/reports/preview/${userId}/${startDate}/${endDate}`);
  }

  // Health check
  async healthCheck(): Promise<APIResponse<string>> {
    return this.request<string>('/');
  }
}

export const apiService = new APIService();
export default apiService;