import { Hono } from 'hono'

type Env = {
  DB: any // D1Database type - using any for now to avoid type issues
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
    const { user_id, condition, form, medication_instance_id } = await c.req.json()
    
    const validConditions = ['〇', '△', '×']
    if (!user_id || !condition || !validConditions.includes(condition)) {
      return c.json({ error: `user_id and valid condition (${validConditions.join(', ')}) are required` }, 400)
    }
    
    const { success } = await c.env.DB.prepare(`
      INSERT INTO records (user_id, condition, form, medication_instance_id) 
      VALUES (?, ?, ?, ?)
    `)
      .bind(user_id, condition, form, medication_instance_id)
      .run()
    
    if (success) {
      return c.json({ message: 'Record created successfully' }, 201)
    } else {
      return c.json({ error: 'Failed to create record' }, 500)
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