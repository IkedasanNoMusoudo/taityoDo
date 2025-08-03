import { RAGService } from '../services/rag';
import { createMockDB } from './testRag';

// ローカルでRAG機能をテストする関数
async function testRAGLocally() {
  console.log('🧪 Starting RAG local test...');
  
  const mockDB = createMockDB();
  const ragService = new RAGService('AIzaSyDBlxBGfbq-1iDV7H0mh5-0rH5TTt1aj9M', mockDB);
  
  try {
    console.log('📝 Testing patient feedback generation...');
    
    const mockContext = {
      userId: 1,
      recentRecords: [
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
        }
      ],
      currentRecord: {
        date: '2025-08-02',
        timeSlot: '08:00',
        condition: '○',
        medicationStatus: '飲めた',
        freeText: 'よく眠れた気がする'
      }
    };
    
    const feedback = await ragService.generatePatientFeedback(mockContext);
    console.log('✅ Feedback generated:', feedback);
    
    console.log('📊 Testing medical report generation...');
    
    const reportContext = {
      userId: 1,
      periodStart: '2025-07-19',
      periodEnd: '2025-08-02',
      allRecords: [
        {
          date: '2025-07-19',
          timeSlot: '08:00',
          condition: '×',
          medicationStatus: '飲んでない',
          freeText: '全然眠れなかった。不安が強い'
        },
        {
          date: '2025-07-20',
          timeSlot: '08:00',
          condition: '△',
          medicationStatus: '少なめに飲んだ',
          freeText: '朝起きるのがとても辛い'
        },
        {
          date: '2025-08-01',
          timeSlot: '08:00',
          condition: '○',
          medicationStatus: '飲めた',
          freeText: '今日は調子が良い'
        }
      ]
    };
    
    const report = await ragService.generateMedicalReport(reportContext);
    console.log('✅ Medical report generated:');
    console.log('   Objective Summary:', report.objectiveSummary);
    console.log('   Medical Summary:', report.medicalSummary);
    
  } catch (error) {
    console.error('❌ RAG test failed:', error);
  }
}

// Export for testing
export { testRAGLocally };