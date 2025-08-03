import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DiagnosisData, MedicationLevel, HealthCondition, TimeSlot } from '../types'
import { useAuth } from '../contexts/AuthContext'
import { apiService } from '../services/api'

const DiagnosisForm = () => {
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()
  const [formData, setFormData] = useState<DiagnosisData>({
    medicationLevel: {
      '起きた時': null,
      '朝': null,
      '昼': null,
      '夜': null,
      '寝る前': null
    },
    healthCondition: null,
    consultation: '',
    timestamp: new Date().toISOString(),
    tonyoUsed: false, // 初期値
    skipMedication: false
  })

  const timeSlots: TimeSlot[] = ['起きた時', '朝', '昼', '夜', '寝る前']
  const medicationLevels: MedicationLevel[] = ['多く飲んだ', '飲んだ', '少なめに飲んだ', '飲んでない']
  const healthConditions: HealthCondition[] = ['○', '×', '△']
  // 診断後の励ましコメントのためのuseState
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [ragFeedback, setRagFeedback] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string>('')


  //フォームリセットのためのデータ
  const initialFormData: DiagnosisData = {
    medicationLevel: {
      '起きた時': null,
      '朝': null,
      '昼': null,
      '夜': null,
      '寝る前': null
    },
    healthCondition: null,
    consultation: '',
    timestamp: new Date().toISOString(),
    tonyoUsed: false,
    skipMedication: false
  }


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!isAuthenticated || !user) {
      setSubmitError('ログインが必要です')
      return
    }

    setIsSubmitting(true)
    setSubmitError('')
    
    try {
      // まずlocalStorageに保存（バックアップとして）
      const existingData = localStorage.getItem('diagnosisData')
      const dataArray = existingData ? JSON.parse(existingData) : []
      const newData = {
        ...formData,
        id: Date.now().toString()
      }
      dataArray.push(newData)
      localStorage.setItem('diagnosisData', JSON.stringify(dataArray))

      // バックエンドAPIを呼び出してRAGフィードバックを取得
      const response = await apiService.createRecord(formData, user.id)
      
      if (response.error) {
        setSubmitError(`送信エラー: ${response.error}`)
        setRagFeedback('記録は保存されました。励ましメッセージを取得できませんでしたが、頑張っていますね！')
      } else if (response.data) {
        setRagFeedback(response.data.feedback)
      }

      setIsModalOpen(true)  // モーダルを表示
      setFormData(initialFormData)  // フォームリセット
      
    } catch(error) {
      console.error("送信エラー:", error)
      setSubmitError('送信中にエラーが発生しました')
      setRagFeedback('記録は保存されました。頑張りましたね！')
      setIsModalOpen(true)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-8 text-center">
          中間チェックフォーム
        </h1>
        
        <form onSubmit={handleSubmit} className="space-y-8">
          {/**　薬をそもそも使用しなかった時に薬の記録は取らないための機能 */}
          <div className="mt-4">
            <label className="font-semibold text-gray-700">薬を使っていませんか？</label>
              <div className='mt-2'>
                <label className="inline-flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.skipMedication}
                    onChange={(e) => {
                      const checked = e.target.checked
                      const resetMedicationLevel = Object.fromEntries(
                        timeSlots.map((slot) => [slot, null])
                      ) as Record<TimeSlot, MedicationLevel | null>

                      setFormData((prev) => ({
                        ...prev,
                        skipMedication: checked,
                        tonyoUsed: checked ? false : prev.tonyoUsed,
                        medicationLevel: checked ? resetMedicationLevel : prev.medicationLevel
                      }))
                    }}
                    className="form-checkbox h-5 w-5 text-blue-600"
                  />
                  <span className="ml-2 text-gray-800">薬を使わなかった
                  </span>
                </label>
              </div>
          </div>
          
          {/* 時間帯別投与記録（屯用使用時のみ有効化）*/}
          <div>
            <h2 className="text-xl font-semibold text-gray-700 mb-4">
              1. 時間帯別の薬の投与量を記録してください
            </h2>
            <div className='grid grid-rows-5 gap-1 mb-3'>
              <p className="text-gray-500">各項目でポイント換算し、多い項目をグラフで示します。</p>
              <p className="text-gray-500"> 多く飲んだ → 3ポイント</p>
              <p className="text-gray-500">飲んだ → 2ポイント</p>
              <p className="text-gray-500">少なめに飲んだ → １ポイント</p>
              <p className="text-gray-500">飲んでいない → ０ポイント</p>
            </div>
            {formData.skipMedication ? (
              <p className="text-gray-500 italic mb-4">
                ※「薬を使わない」が選択されているため、入力できません。
              </p>
            ) : null}
            {timeSlots.map((slot) => (
              <fieldset key={slot} className="mb-6" disabled={formData.skipMedication}>
                <legend className="font-semibold text-gray-700 mb-2">{slot}</legend>
                {/* 屯用されていない場合は見た目だけ無効 */}
                <div className="grid grid-cols-2 gap-4 ${!formData.tonyoUsed ? 'opacity-50 pointer-events-none' : ''}`}">
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
              </fieldset>
            ))}
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

          {/* 屯用チェック */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">3. 屯用（とんよう）を使用しましたか？</h2>
            <div className="mt-2">
              <label className="inline-flex items-center cursor-pointer select-none">
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

          {/* 時間帯別投与記録（屯用使用時のみ表示）*/}
          {formData.tonyoUsed && (
            <div>
              <h2 className="text-xl font-semibold text-gray-700 mb-4">
                3.1. 時間帯別の屯用薬の投与量を記録してください
              </h2>
              <div className='grid grid-rows-5 gap-1 mb-3'>
                <p className="text-gray-500">各項目でポイント換算し、多い項目をグラフで示します。</p>
                <p className="text-gray-500">多く飲んだ → 3ポイント</p>
                <p className="text-gray-500">飲んだ → 2ポイント</p>
                <p className="text-gray-500">少なめに飲んだ → 1ポイント</p>
                <p className="text-gray-500">飲んでいない → 0ポイント</p>
              </div>
              {timeSlots.map((slot) => (
                <fieldset key={slot} className="mb-6">
                  <legend className="font-semibold text-gray-700 mb-2">{slot}</legend>
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
                </fieldset>
              ))}
            </div>
          )}



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

          {/* エラー表示 */}
          {submitError && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {submitError}
            </div>
          )}

          {!isAuthenticated && (
            <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
              ログインしてRAG機能をお使いください
            </div>
          )}

          {/* 送信ボタン */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={
                isSubmitting ||
                !formData.healthCondition ||
                (!formData.skipMedication && Object.values(formData.medicationLevel).some((v) => v === null))
              }
              className="w-full bg-blue-600 text-white py-4 px-6 rounded-lg font-semibold text-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? '送信中...' : 'レポートを出す'}
            </button>
          </div>
          
          {/* RAGフィードバック付きモーダル（送信後） */}
          {isModalOpen && (
            <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
              <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full text-center mx-4">
                <h2 className="text-2xl font-bold text-green-700 mb-4">お疲れさまでした！</h2>
                
                {/* RAGフィードバック表示 */}
                {ragFeedback && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <h3 className="text-lg font-semibold text-blue-800 mb-2">💬 AIからのメッセージ</h3>
                    <p className="text-blue-700 whitespace-pre-line leading-relaxed">
                      {ragFeedback}
                    </p>
                  </div>
                )}
                
                <p className="text-gray-700 mb-6">今日もよく記録できました 😊</p>
                
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => {
                      setIsModalOpen(false)
                      setRagFeedback('')
                      setSubmitError('')
                    }}
                    className="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600 transition"
                  >
                    続けて記録
                  </button>
                  <button
                    onClick={() => {
                      setIsModalOpen(false)
                      setRagFeedback('')
                      setSubmitError('')
                      navigate('/report')
                    }}
                    className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition"
                  >
                    レポートを見る
                  </button>
                </div>
              </div>
            </div>
          )}

        </form>
      </div>
    </div>
  )
}

export default DiagnosisForm 