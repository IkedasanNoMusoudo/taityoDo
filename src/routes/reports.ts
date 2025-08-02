import { Hono } from 'hono'
import { RAGService } from '../services/rag'

type Env = {
  DB: any // D1Database type - using any for now to avoid type issues
  GEMINI_API_KEY: string
}

const reports = new Hono<{ Bindings: Env }>()

reports.post('/generate', async (c) => {
  try {
    const { user_id, start_date, end_date } = await c.req.json()
    
    if (!user_id || !start_date || !end_date) {
      return c.json({ error: 'user_id, start_date, and end_date are required' }, 400)
    }
    
    const ragService = new RAGService(c.env.GEMINI_API_KEY, c.env.DB)
    
    // Get all records for the period
    const periodRecords = await ragService.getPeriodRecords(user_id, start_date, end_date)
    
    if (periodRecords.length === 0) {
      return c.json({ 
        error: 'No records found for the specified period',
        objectiveSummary: '指定期間内に記録が見つかりませんでした。',
        medicalSummary: '評価可能なデータがありません。'
      }, 404)
    }
    
    // Generate medical report using RAG
    const reportContext = {
      userId: user_id,
      periodStart: start_date,
      periodEnd: end_date,
      allRecords: periodRecords
    }
    
    const { objectiveSummary, medicalSummary } = await ragService.generateMedicalReport(reportContext)
    
    return c.json({
      userId: user_id,
      periodStart: start_date,
      periodEnd: end_date,
      recordCount: periodRecords.length,
      objectiveSummary,
      medicalSummary,
      generatedAt: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Error generating medical report:', error)
    return c.json({ error: 'Failed to generate medical report' }, 500)
  }
})

reports.get('/preview/:userId/:startDate/:endDate', async (c) => {
  try {
    const userId = c.req.param('userId')
    const startDate = c.req.param('startDate')
    const endDate = c.req.param('endDate')
    
    const ragService = new RAGService(c.env.GEMINI_API_KEY, c.env.DB)
    
    // Get records for preview
    const periodRecords = await ragService.getPeriodRecords(parseInt(userId), startDate, endDate)
    
    return c.json({
      userId,
      periodStart: startDate,
      periodEnd: endDate,
      recordCount: periodRecords.length,
      records: periodRecords
    })
    
  } catch (error) {
    console.error('Error getting report preview:', error)
    return c.json({ error: 'Failed to get report preview' }, 500)
  }
})

export default reports