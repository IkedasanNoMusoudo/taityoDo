import { Hono } from 'hono'

type Env = {
  DB: any // D1Database type - using any for now to avoid type issues
}

const diagnosis = new Hono<{ Bindings: Env }>()

// フロントエンドからの診断データ送信エンドポイント
diagnosis.post('/', async (c) => {
  try {
    const {
      medicationLevel,
      healthCondition,
      consultation,
      tonyoUsed,
      timestamp
    } = await c.req.json()

    // 固定ユーザーID（本来は認証から取得）
    const user_id = 1

    // 1. アクティビティログを作成
    const activityLogResult = await c.env.DB.prepare(`
      INSERT INTO activity_logs (user_id, occurred_at) 
      VALUES (?, ?)
    `)
      .bind(user_id, timestamp)
      .run()

    if (!activityLogResult.success) {
      return c.json({ error: 'Failed to create activity log' }, 500)
    }

    const activity_log_id = activityLogResult.meta.last_row_id

    // 2. 体調記録（records）を作成 - 一時的にスキップ
    // Note: 文字コード問題により一時的にコメントアウト
    /*
    if (healthCondition) {
      const recordResult = await c.env.DB.prepare(`
        INSERT INTO records (user_id, condition, form) 
        VALUES (?, ?, ?)
      `)
        .bind(user_id, healthCondition, consultation || '')
        .run()

      if (!recordResult.success) {
        console.error('Failed to create record:', recordResult.error)
      }
    }
    */

    // 3. 薬の摂取結果（intake_results）を作成
    const intakeResults = []
    if (medicationLevel && typeof medicationLevel === 'object') {
      for (const [timeSlot, level] of Object.entries(medicationLevel)) {
        if (level) {
          // 時間帯名を時刻にマッピング
          const timeMapping: { [key: string]: string } = {
            '起きた時': '06:30',
            '朝': '07:00',
            '昼': '12:00',
            '夜': '18:00',
            '寝る前': '22:00'
          }
          
          const alertTime = timeMapping[timeSlot] || timeSlot
          
          // 該当する時間帯のalert_ruleを検索
          const alertRule = await c.env.DB.prepare(`
            SELECT ar.id FROM alert_rules ar
            JOIN medications m ON ar.medication_id = m.id
            WHERE ar.user_id = ? AND ar.alert_time = ?
            LIMIT 1
          `)
            .bind(user_id, alertTime)
            .first()

          if (alertRule) {
            const intakeResult = await c.env.DB.prepare(`
              INSERT OR REPLACE INTO intake_results (activity_log_id, alert_rule_id, intake_status) 
              VALUES (?, ?, ?)
            `)
              .bind(activity_log_id, alertRule.id, level)
              .run()

            if (intakeResult.success) {
              intakeResults.push({
                timeSlot,
                level,
                alert_rule_id: alertRule.id
              })
            }
          }
        }
      }
    }

    // レスポンスデータ
    const responseData = {
      id: activity_log_id,
      user_id,
      timestamp,
      medicationLevel,
      healthCondition,
      consultation,
      tonyoUsed,
      intakeResults,
      created_at: new Date().toISOString()
    }

    return c.json({
      success: true,
      message: 'Diagnosis data saved successfully',
      data: responseData
    })

  } catch (error) {
    console.error('Error saving diagnosis data:', error)
    return c.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, 500)
  }
})

// 診断データ送信エンドポイント（既存）
diagnosis.post('/submit', async (c) => {
  try {
    const {
      user_id,
      medicationLevel,
      healthCondition,
      consultation,
      tonyoUsed,
      skipMedication
    } = await c.req.json()

    if (!user_id) {
      return c.json({ error: 'user_id is required' }, 400)
    }

    // 1. アクティビティログを作成
    const activityLogResult = await c.env.DB.prepare(`
      INSERT INTO activity_logs (user_id, occurred_at) 
      VALUES (?, datetime('now'))
    `)
      .bind(user_id)
      .run()

    if (!activityLogResult.success) {
      return c.json({ error: 'Failed to create activity log' }, 500)
    }

    const activity_log_id = activityLogResult.meta.last_row_id

    const results = {
      activity_log_id,
      records_created: false,
      intake_results_created: [] as Array<{
        type: string;
        time_slot?: string;
        alert_rule_id?: any;
        status: any;
      }>
    }

    // 2. 体調記録（records）を作成 - 現在のスキーマに合わせて修正
    if (healthCondition) {
      const recordResult = await c.env.DB.prepare(`
        INSERT INTO records (user_id, condition, form) 
        VALUES (?, ?, ?)
      `)
        .bind(user_id, healthCondition, consultation || null)
        .run()

      results.records_created = recordResult.success
    }

    // 3. 服薬記録（intake_results）を作成
    if (!skipMedication && medicationLevel) {
      // 時間帯ごとの服薬記録を処理
      for (const [timeSlot, level] of Object.entries(medicationLevel)) {
        if (level && level !== '飲んでない' && level !== '飲んでいない') {
          // 屯用薬かどうかで処理を分ける
          if (tonyoUsed) {
            // 屯用薬: alert_rule_id = NULL, taken_at = 時間帯
            const intakeResult = await c.env.DB.prepare(`
              INSERT INTO intake_results (activity_log_id, alert_rule_id, intake_status, taken_at) 
              VALUES (?, NULL, ?, ?)
            `)
              .bind(activity_log_id, level, timeSlot)
              .run()

            if (intakeResult.success) {
              results.intake_results_created.push({
                type: 'rescue',
                time_slot: timeSlot,
                status: level
              })
            }
          } else {
            // 定時薬: alert_rule_idを探して関連付け
            // まず対応するalert_ruleを探す
            const alertRuleResult = await c.env.DB.prepare(`
              SELECT ar.id FROM alert_rules ar
              JOIN medications m ON ar.medication_id = m.id
              WHERE ar.user_id = ?
              LIMIT 1
            `)
              .bind(user_id)
              .first()

            if (alertRuleResult) {
              const intakeResult = await c.env.DB.prepare(`
                INSERT INTO intake_results (activity_log_id, alert_rule_id, intake_status) 
                VALUES (?, ?, ?)
              `)
                .bind(activity_log_id, alertRuleResult.id, level)
                .run()

              if (intakeResult.success) {
                results.intake_results_created.push({
                  type: 'scheduled',
                  alert_rule_id: alertRuleResult.id,
                  status: level
                })
              }
            }
          }
        }
      }
    }

    return c.json({
      message: 'Diagnosis data submitted successfully',
      results
    }, 201)

  } catch (error) {
    console.error('Diagnosis submission error:', error)
    return c.json({ 
      error: 'Failed to submit diagnosis data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// 特定ユーザーの診断履歴取得
diagnosis.get('/history/:userId', async (c) => {
  try {
    const userId = c.req.param('userId')

    const query = `
      SELECT 
        al.id as activity_log_id,
        al.occurred_at,
        r.condition,
        r.form,
        ir.intake_status,
        ir.taken_at,
        ar.alert_time,
        m.name as medication_name,
        CASE 
          WHEN ir.alert_rule_id IS NULL THEN 'rescue'
          ELSE 'scheduled'
        END as medication_type
      FROM activity_logs al
      LEFT JOIN records r ON al.user_id = r.user_id
      LEFT JOIN intake_results ir ON al.id = ir.activity_log_id
      LEFT JOIN alert_rules ar ON ir.alert_rule_id = ar.id
      LEFT JOIN medications m ON ar.medication_id = m.id
      WHERE al.user_id = ?
      ORDER BY al.occurred_at DESC
    `

    const { results } = await c.env.DB.prepare(query).bind(userId).all()
    return c.json(results)

  } catch (error) {
    return c.json({ error: 'Failed to fetch diagnosis history' }, 500)
  }
})

export default diagnosis