import { Hono } from 'hono'

type Env = {
  DB: any // D1Database type - using any for now to avoid type issues
}

const medicationInstances = new Hono<{ Bindings: Env }>()

medicationInstances.get('/', async (c) => {
  try {
    const query = `
      SELECT ar.*, m.name as medication_name, u.name as user_name,
             ir.intake_status, ir.id as intake_result_id
      FROM alert_rules ar 
      JOIN medications m ON ar.medication_id = m.id
      JOIN users u ON ar.user_id = u.id
      LEFT JOIN intake_results ir ON ar.id = ir.alert_rule_id
    `
    const { results } = await c.env.DB.prepare(query).all()
    return c.json(results)
  } catch (error) {
    return c.json({ error: 'Failed to fetch alert rules' }, 500)
  }
})

medicationInstances.get('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const query = `
      SELECT ar.*, m.name as medication_name, u.name as user_name,
             ir.intake_status, ir.id as intake_result_id
      FROM alert_rules ar 
      JOIN medications m ON ar.medication_id = m.id
      JOIN users u ON ar.user_id = u.id
      LEFT JOIN intake_results ir ON ar.id = ir.alert_rule_id
      WHERE ar.id = ?
    `
    const { results } = await c.env.DB.prepare(query).bind(id).all()
    
    if (results.length === 0) {
      return c.json({ error: 'Alert rule not found' }, 404)
    }
    
    return c.json(results[0])
  } catch (error) {
    return c.json({ error: 'Failed to fetch alert rule' }, 500)
  }
})

medicationInstances.post('/', async (c) => {
  try {
    const { user_id, medication_id, alert_time } = await c.req.json()
    
    if (!user_id || !medication_id || !alert_time) {
      return c.json({ error: 'user_id, medication_id, and alert_time are required' }, 400)
    }
    
    const { success } = await c.env.DB.prepare(`
      INSERT INTO alert_rules (user_id, medication_id, alert_time) 
      VALUES (?, ?, ?)
    `)
      .bind(user_id, medication_id, alert_time)
      .run()
    
    if (success) {
      return c.json({ message: 'Alert rule created successfully' }, 201)
    } else {
      return c.json({ error: 'Failed to create alert rule' }, 500)
    }
  } catch (error) {
    return c.json({ error: 'Failed to create alert rule' }, 500)
  }
})

medicationInstances.put('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const { user_id, medication_id, alert_time } = await c.req.json()
    
    if (!user_id || !medication_id || !alert_time) {
      return c.json({ error: 'user_id, medication_id, and alert_time are required' }, 400)
    }
    
    const { success } = await c.env.DB.prepare(`
      UPDATE alert_rules 
      SET user_id = ?, medication_id = ?, alert_time = ?
      WHERE id = ?
    `)
      .bind(user_id, medication_id, alert_time, id)
      .run()
    
    if (success) {
      return c.json({ message: 'Alert rule updated successfully' })
    } else {
      return c.json({ error: 'Failed to update alert rule' }, 500)
    }
  } catch (error) {
    return c.json({ error: 'Failed to update alert rule' }, 500)
  }
})

medicationInstances.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    
    const { success } = await c.env.DB.prepare('DELETE FROM alert_rules WHERE id = ?')
      .bind(id)
      .run()
    
    if (success) {
      return c.json({ message: 'Alert rule deleted successfully' })
    } else {
      return c.json({ error: 'Failed to delete alert rule' }, 500)
    }
  } catch (error) {
    return c.json({ error: 'Failed to delete alert rule' }, 500)
  }
})

medicationInstances.post('/:id/intake', async (c) => {
  try {
    const alertRuleId = c.req.param('id')
    const { intake_status } = await c.req.json()
    
    const validStatuses = ['多く飲んだ', '飲めた', '少なめに飲んだ', '飲んでない']
    if (!intake_status || !validStatuses.includes(intake_status)) {
      return c.json({ error: `intake_status must be one of: ${validStatuses.join(', ')}` }, 400)
    }
    
    const activityLogResult = await c.env.DB.prepare(`
      INSERT INTO activity_logs (user_id, occurred_at) 
      SELECT user_id, datetime('now') FROM alert_rules WHERE id = ?
    `)
      .bind(alertRuleId)
      .run()
    
    if (!activityLogResult.success) {
      return c.json({ error: 'Failed to create activity log' }, 500)
    }
    
    const { success } = await c.env.DB.prepare(`
      INSERT INTO intake_results (activity_log_id, alert_rule_id, intake_status) 
      VALUES (?, ?, ?)
    `)
      .bind(activityLogResult.meta.last_row_id, alertRuleId, intake_status)
      .run()
    
    if (success) {
      return c.json({ message: 'Intake result recorded successfully' }, 201)
    } else {
      return c.json({ error: 'Failed to record intake result' }, 500)
    }
  } catch (error) {
    return c.json({ error: 'Failed to record intake result' }, 500)
  }
})

export default medicationInstances