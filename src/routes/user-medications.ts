import { Hono } from 'hono'

type Env = {
  DB: any
}

const userMedications = new Hono<{ Bindings: Env }>()

userMedications.get('/:userId/medications', async (c) => {
  try {
    const userId = c.req.param('userId')
    
    if (!userId) {
      return c.json({ error: 'User ID is required' }, 400)
    }

    const { results } = await c.env.DB.prepare(`
      SELECT 
        ar.alert_time as time_slot,
        m.name as medication_name,
        ar.dosage as dosage_amount
      FROM alert_rules ar
      JOIN medications m ON ar.medication_id = m.id
      WHERE ar.user_id = ?
      ORDER BY ar.alert_time
    `).bind(userId).all()

    if (results.length === 0) {
      return c.json({ 
        message: 'No medications found for this user',
        data: []
      })
    }

    return c.json({
      user_id: userId,
      medications: results
    })
  } catch (error) {
    console.error('Error fetching user medications:', error)
    return c.json({ error: 'Failed to fetch user medications' }, 500)
  }
})

export default userMedications