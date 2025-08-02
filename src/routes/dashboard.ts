import { Hono } from 'hono'

type Env = {
  DB: any // D1Database type - using any for now to avoid type issues
}

const dashboard = new Hono<{ Bindings: Env }>()

dashboard.get('/stats', async (c) => {
  try {
    const [usersResult, medicationsResult, recordsResult, alertRulesResult, intakeResultsResult] = await Promise.all([
      c.env.DB.prepare('SELECT COUNT(*) as count FROM users').first(),
      c.env.DB.prepare('SELECT COUNT(*) as count FROM medications').first(),
      c.env.DB.prepare('SELECT COUNT(*) as count FROM records').first(),
      c.env.DB.prepare('SELECT COUNT(*) as count FROM alert_rules').first(),
      c.env.DB.prepare('SELECT COUNT(*) as count FROM intake_results').first()
    ])

    const recentRecordsResult = await c.env.DB.prepare(`
      SELECT r.*, u.name as user_name
      FROM records r 
      JOIN users u ON r.user_id = u.id
      ORDER BY r.id DESC
      LIMIT 5
    `).all()

    const recentIntakeResults = await c.env.DB.prepare(`
      SELECT ir.*, al.occurred_at, u.name as user_name, m.name as medication_name
      FROM intake_results ir
      JOIN activity_logs al ON ir.activity_log_id = al.id
      JOIN users u ON al.user_id = u.id
      JOIN alert_rules ar ON ir.alert_rule_id = ar.id
      JOIN medications m ON ar.medication_id = m.id
      ORDER BY al.occurred_at DESC
      LIMIT 5
    `).all()

    return c.json({
      totalUsers: usersResult?.count || 0,
      totalMedications: medicationsResult?.count || 0,
      totalRecords: recordsResult?.count || 0,
      totalAlertRules: alertRulesResult?.count || 0,
      totalIntakeResults: intakeResultsResult?.count || 0,
      recentRecords: recentRecordsResult.results || [],
      recentIntakeResults: recentIntakeResults.results || []
    })
  } catch (error) {
    return c.json({ error: 'Failed to fetch dashboard stats' }, 500)
  }
})

dashboard.get('/analytics/:userId', async (c) => {
  try {
    const userId = c.req.param('userId')
    
    const recordsCount = await c.env.DB.prepare(`
      SELECT COUNT(*) as count 
      FROM records r 
      WHERE r.user_id = ?
    `).bind(userId).first()

    const conditionStats = await c.env.DB.prepare(`
      SELECT r.condition, COUNT(*) as count 
      FROM records r 
      WHERE r.user_id = ? 
      GROUP BY r.condition
    `).bind(userId).all()

    const intakeStats = await c.env.DB.prepare(`
      SELECT ir.intake_status, COUNT(*) as count 
      FROM intake_results ir
      JOIN activity_logs al ON ir.activity_log_id = al.id
      WHERE al.user_id = ? 
      GROUP BY ir.intake_status
    `).bind(userId).all()

    const recentActivity = await c.env.DB.prepare(`
      SELECT 'record' as type, r.condition, r.form, r.id as activity_time, NULL as medication_name
      FROM records r 
      WHERE r.user_id = ?
      ORDER BY r.id DESC
      LIMIT 10
    `).bind(userId).all()

    return c.json({
      totalRecords: recordsCount?.count || 0,
      conditionBreakdown: conditionStats.results || [],
      intakeBreakdown: intakeStats.results || [],
      recentActivity: recentActivity.results || []
    })
  } catch (error) {
    return c.json({ error: 'Failed to fetch user analytics' }, 500)
  }
})

export default dashboard