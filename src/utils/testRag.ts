// Test utility for RAG functionality
// This file is for development testing only

export interface MockDatabase {
  prepare: (query: string) => {
    bind: (...params: any[]) => {
      all: () => Promise<{ results: any[] }>;
      run: () => Promise<{ success: boolean; meta?: { last_row_id: number } }>;
    };
  };
}

export const createMockDB = (): MockDatabase => {
  const mockRecords = [
    {
      date: '2025-08-01',
      timeSlot: '08:00',
      condition: '△',
      medicationStatus: '飲めた',
      freeText: 'なかなか寝付けなかった'
    },
    {
      date: '2025-08-01',
      timeSlot: '20:00',
      condition: '○',
      medicationStatus: '飲めた',
      freeText: '夜は調子が良い'
    },
    {
      date: '2025-08-02',
      timeSlot: '08:00',
      condition: '○',
      medicationStatus: '飲めた',
      freeText: 'よく眠れた気がする'
    }
  ];

  return {
    prepare: (_query: string) => ({
      bind: (..._params: any[]) => ({
        all: async () => ({ results: mockRecords }),
        run: async () => ({ success: true, meta: { last_row_id: 1 } })
      })
    })
  };
};

export const testRAGFeedback = async () => {
  console.log('Testing RAG feedback generation...');
  
  // This would be used for local testing
  // Import and test RAGService here
  
  console.log('RAG feedback test completed');
};

export const testRAGReport = async () => {
  console.log('Testing RAG report generation...');
  
  // This would be used for local testing
  // Import and test RAGService report generation here
  
  console.log('RAG report test completed');
};