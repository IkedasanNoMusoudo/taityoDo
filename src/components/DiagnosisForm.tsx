import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { DiagnosisData, MedicationLevel, HealthCondition, TimeSlot } from '../types'

const DiagnosisForm = () => {
  const navigate = useNavigate()
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState<DiagnosisData>({
    medicationLevel: {},
    healthCondition: null,
    consultation: '',
    timestamp: new Date().toISOString(),
    tonyoUsed: false, // 初期値
  })
  const medicationLevels: MedicationLevel[] = ['多く飲んだ', '飲んだ', '少なめに飲んだ', '飲んでない']
  const healthConditions: HealthCondition[] = ['〇', '×', '△']

  const [isModalOpen, setIsModalOpen] = useState(false)

  // DBからtimeslotsを取得
  useEffect(() => {
    const fetchTimeSlots = async () => {
      try {
        const response = await fetch('/api/timeslots')
        const data = await response.json()
        
        if (data.timeslots && data.timeslots.length > 0) {
          const slots = data.timeslots.map((slot: any) => slot.name)
          setTimeSlots(slots)
          
          // 初期のmedicationLevelオブジェクトを設定
          const initialMedicationLevel: { [key: string]: MedicationLevel | null } = {}
          slots.forEach((slot: string) => {
            initialMedicationLevel[slot] = null
          })
          
          setFormData(prev => ({
            ...prev,
            medicationLevel: initialMedicationLevel
          }))
        } else {
          // DBにデータがない場合はデフォルトを使用
          const defaultSlots: TimeSlot[] = ['起きた時', '朝', '昼', '夜', '寝る前']
          setTimeSlots(defaultSlots)
          
          const initialMedicationLevel: { [key: string]: MedicationLevel | null } = {}
          defaultSlots.forEach((slot: string) => {
            initialMedicationLevel[slot] = null
          })
          
          setFormData(prev => ({
            ...prev,
            medicationLevel: initialMedicationLevel
          }))
        }
      } catch (error) {
        console.error('Error fetching timeslots:', error)
        // エラー時はデフォルトを使用
        const defaultSlots: TimeSlot[] = ['起きた時', '朝', '昼', '夜', '寝る前']
        setTimeSlots(defaultSlots)
        
        const initialMedicationLevel: { [key: string]: MedicationLevel | null } = {}
        defaultSlots.forEach((slot: string) => {
          initialMedicationLevel[slot] = null
        })
        
        setFormData(prev => ({
          ...prev,
          medicationLevel: initialMedicationLevel
        }))
      } finally {
        setLoading(false)
      }
    }

    fetchTimeSlots()
  }, [])

  //フォームリセットのためのデータ
  const getInitialFormData = (): DiagnosisData => {
    const initialMedicationLevel: { [key: string]: MedicationLevel | null } = {}
    timeSlots.forEach((slot: string) => {
      initialMedicationLevel[slot] = null
    })
    
    return {
      medicationLevel: initialMedicationLevel,
      healthCondition: null,
      consultation: '',
      timestamp: '',
      tonyoUsed: false
    }
  }


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      // DB経由のtimeslotsのみ送信するようにフィルタリング
      const filteredMedicationLevel: { [key: string]: string | null } = {}
      timeSlots.forEach(slot => {
        filteredMedicationLevel[slot] = formData.medicationLevel[slot]
      })

      const submissionData = {
        ...formData,
        medicationLevel: filteredMedicationLevel,
        timestamp: new Date().toISOString()
      }

      // DBに保存
      const response = await fetch('/api/diagnosis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(submissionData)
      })

      if (!response.ok) {
        throw new Error('送信に失敗しました')
      }

      const result = await response.json()
      
      // JSONファイルとしてダウンロード
      downloadAsJson(result.data)

      setIsModalOpen(true)  // モーダルを表示
      setFormData(getInitialFormData())  // フォームリセット
      } catch(error) {
        console.error("送信エラー:", error)
        alert("送信に失敗しました。もう一度お試しください。")
      }
  }

  // JSONファイルダウンロード機能
  const downloadAsJson = (data: any) => {
    const jsonString = JSON.stringify(data, null, 2)
    const blob = new Blob([jsonString], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `diagnosis_${new Date().getTime()}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-8 text-center">
            診断後ケアフォーム
          </h1>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">時間帯情報を読み込み中...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-8 text-center">
          診断後ケアフォーム
        </h1>
        
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* 時間帯ごとの薬の投与量 */}
          <div>
            <h2 className="text-xl font-semibold text-gray-700 mb-4">
              1. 時間帯別の薬の投与量を記録してください
            </h2>
            {timeSlots.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>設定された時間帯がありません。</p>
                <p className="text-sm mt-2">管理者にお問い合わせください。</p>
              </div>
            ) : (
              timeSlots.map((slot) => (
              <div key={slot} className="mb-6">
                <h3 className="font-semibold text-gray-700 mb-2">{slot}</h3>
                <div className="grid grid-cols-2 gap-4">
                  {medicationLevels.map((level) => (
                    <label
                      key={level}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                        formData.medicationLevel[slot] === level
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`${slot}`}
                        value={level}
                        checked={formData.medicationLevel[slot] === level}
                        onChange={() =>
                          setFormData((prev) => ({
                            ...prev,
                            medicationLevel: {
                              ...prev.medicationLevel,
                              [slot]: level
                            }
                          }))
                        }
                        className="sr-only"
                      />
                      <span className="block text-center">{level}</span>
                    </label>
                  ))}
                </div>
              </div>
              ))
            )}
          </div>

          {/* 体調 */}
          <div>
            <h2 className="text-xl font-semibold text-gray-700 mb-4">
              2. 体調はどうですか？
            </h2>
            <div className="flex gap-4">
              {healthConditions.map((condition) => (
                <label
                  key={condition}
                  className={`flex-1 p-4 border-2 rounded-lg cursor-pointer transition-colors text-center ${
                    formData.healthCondition === condition
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="healthCondition"
                    value={condition}
                    checked={formData.healthCondition === condition}
                    onChange={(e) => setFormData({ ...formData, healthCondition: e.target.value as HealthCondition })}
                    className="sr-only"
                  />
                  <span className="text-2xl font-bold">{condition}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <label className="font-semibold text-gray-700">4. 屯用（とんよう）を使用しましたか？</label>
            <div className="mt-2">
              <label className="inline-flex items-center">
                <input
                  type="checkbox"
                  checked={formData.tonyoUsed}
                  onChange={(e) =>
                    setFormData({ ...formData, tonyoUsed: e.target.checked })
                  }
                  className="form-checkbox h-5 w-5 text-blue-600"
                />
                <span className="ml-2 text-gray-800">使用した</span>
              </label>
            </div>
          </div>



          {/* 相談・対応策 */}
          <div>
            <h2 className="text-xl font-semibold text-gray-700 mb-4">
              4. 次回の診断までにあったことを記録してください
            </h2>
            <textarea
              value={formData.consultation}
              onChange={(e) => setFormData({ ...formData, consultation: e.target.value })}
              placeholder="相談したいことや対応策について自由に記述してください..."
              className="w-full p-4 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none resize-none"
              rows={6}
            />
          </div>

          {/* 送信ボタン */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={!formData.healthCondition ||
                Object.values(formData.medicationLevel).some((v) => v === null)}
              className="w-full bg-blue-600 text-white py-4 px-6 rounded-lg font-semibold text-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              レポートを出す
            </button>
          </div>
          
          {/* モーダル（送信後） */}
          {isModalOpen && (
            <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
              <div className="bg-white p-8 rounded-lg shadow-xl max-w-sm w-full text-center">
                <h2 className="text-2xl font-bold text-green-700 mb-4">お疲れさまでした！</h2>
                <p className="text-gray-700 mb-6">今日もよく記録できました 😊</p>
                <button
                  onClick={() => {
                    setIsModalOpen(false)
                    navigate('/report') // モーダル閉じた後にreportに遷移
                  }}
                  className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition"
                >
                  閉じる
                </button>
              </div>
            </div>
          )}

        </form>
      </div>
    </div>
  )
}

export default DiagnosisForm 