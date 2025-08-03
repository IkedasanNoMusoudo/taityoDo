import { Context } from 'hono'

// 時間帯（タイムスロット）の一覧を取得
export async function getTimeslots(c: Context) {
  try {
    // ユーザーIDは固定（本来は認証から取得）
    const userId = 1

    // alert_rulesテーブルから該当ユーザーの時間帯を取得
    const timeslots = await c.env.DB.prepare(`
      SELECT DISTINCT 
        ar.alert_time,
        m.name as medication_name
      FROM alert_rules ar
      JOIN medications m ON ar.medication_id = m.id
      WHERE ar.user_id = ?
      ORDER BY ar.alert_time
    `).bind(userId).all()

    if (!timeslots.success) {
      return new Response(JSON.stringify({ error: 'Failed to fetch timeslots' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // 時間を表示用の名前にマッピング
    const timeSlotNames: { [key: string]: string } = {
      '06:30': '起きた時',
      '07:00': '朝', 
      '12:00': '昼',
      '18:00': '夜',
      '22:00': '寝る前'
    }

    const formattedTimeslots = timeslots.results.map((slot: any) => ({
      id: slot.alert_time,
      name: timeSlotNames[slot.alert_time] || slot.alert_time,
      medication_name: slot.medication_name,
      alert_time: slot.alert_time
    }))

    return new Response(JSON.stringify({ 
      timeslots: formattedTimeslots 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error fetching timeslots:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}