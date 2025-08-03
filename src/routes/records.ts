import { Hono } from 'hono'
import { RAGService } from '../services/rag'

type Env = {
  DB: any // D1Database type - using any for now to avoid type issues
  GEMINI_API_KEY: string
}

const records = new Hono<{ Bindings: Env }>()

records.get('/', async (c) => {
  try {
    const query = `
      SELECT r.*, u.name as user_name
      FROM records r 
      JOIN users u ON r.user_id = u.id
      ORDER BY r.id DESC
    `
    const { results } = await c.env.DB.prepare(query).all()
    return c.json(results)
  } catch (error) {
    return c.json({ error: 'Failed to fetch records' }, 500)
  }
})

records.get('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const query = `
      SELECT r.*, u.name as user_name
      FROM records r 
      JOIN users u ON r.user_id = u.id
      WHERE r.id = ?
    `
    const { results } = await c.env.DB.prepare(query).bind(id).all()
    
    if (results.length === 0) {
      return c.json({ error: 'Record not found' }, 404)
    }
    
    return c.json(results[0])
  } catch (error) {
    return c.json({ error: 'Failed to fetch record' }, 500)
  }
})

records.get('/user/:userId', async (c) => {
  try {
    const userId = c.req.param('userId')
    const query = `
      SELECT r.*, u.name as user_name
      FROM records r 
      JOIN users u ON r.user_id = u.id
      WHERE r.user_id = ?
      ORDER BY r.id DESC
    `
    const { results } = await c.env.DB.prepare(query).bind(userId).all()
    return c.json(results)
  } catch (error) {
    return c.json({ error: 'Failed to fetch user records' }, 500)
  }
})

records.post('/', async (c) => {
  try {
    const { user_id, condition, form, occurred_at } = await c.req.json()
    
    const validConditions = ['〇', '△', '×']
    if (!user_id || !condition || !validConditions.includes(condition)) {
      return c.json({ error: `user_id and valid condition (${validConditions.join(', ')}) are required` }, 400)
    }
    
    const timestamp = occurred_at || new Date().toISOString()
    
    // Create activity log first
    const activityResult = await c.env.DB.prepare(`
      INSERT INTO activity_logs (user_id, occurred_at) 
      VALUES (?, ?)
    `)
      .bind(user_id, timestamp)
      .run()
    
    if (!activityResult.success) {
      return c.json({ error: 'Failed to create activity log' }, 500)
    }
    
    const activityLogId = activityResult.meta.last_row_id
    
    // Create the record
    const recordResult = await c.env.DB.prepare(`
      INSERT INTO records (activity_log_id, condition, form) 
      VALUES (?, ?, ?)
    `)
      .bind(activityLogId, condition, form)
      .run()
    
    if (!recordResult.success) {
      return c.json({ error: 'Failed to create record' }, 500)
    }
    
    // Generate RAG feedback
    try {
      const ragService = new RAGService(c.env.GEMINI_API_KEY, c.env.DB)
      const recentRecords = await ragService.getRecentPatientRecords(user_id, 7)
      
      const currentRecord = {
        date: timestamp.split('T')[0],
        timeSlot: new Date(timestamp).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
        condition,
        medicationStatus: 'データなし',
        freeText: form
      }
      
      const feedback = await ragService.generatePatientFeedback({
        userId: user_id,
        recentRecords,
        currentRecord
      })
      
      return c.json({ 
        message: 'Record created successfully',
        feedback: feedback
      }, 201)
      
    } catch (ragError) {
      console.error('RAG feedback generation failed:', ragError)
      return c.json({ 
        message: 'Record created successfully',
        feedback: 'お疲れ様です。記録をつけていただき、ありがとうございます。'
      }, 201)
    }
    
  } catch (error) {
    return c.json({ error: 'Failed to create record' }, 500)
  }
})

records.put('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const { condition, form, medication_instance_id } = await c.req.json()
    
    const validConditions = ['〇', '△', '×']
    if (!condition || !validConditions.includes(condition)) {
      return c.json({ error: `Valid condition (${validConditions.join(', ')}) is required` }, 400)
    }
    
    const { success } = await c.env.DB.prepare(`
      UPDATE records 
      SET condition = ?, form = ?, medication_instance_id = ?
      WHERE id = ?
    `)
      .bind(condition, form, medication_instance_id, id)
      .run()
    
    if (success) {
      return c.json({ message: 'Record updated successfully' })
    } else {
      return c.json({ error: 'Failed to update record' }, 500)
    }
  } catch (error) {
    return c.json({ error: 'Failed to update record' }, 500)
  }
})

records.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    
    const { success } = await c.env.DB.prepare('DELETE FROM records WHERE id = ?')
      .bind(id)
      .run()
    
    if (success) {
      return c.json({ message: 'Record deleted successfully' })
    } else {
      return c.json({ error: 'Failed to delete record' }, 500)
    }
  } catch (error) {
    return c.json({ error: 'Failed to delete record' }, 500)
  }
})

export default records