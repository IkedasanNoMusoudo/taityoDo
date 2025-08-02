import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DiagnosisData, MedicationLevel, TimeSlot } from '../types'

const RegisterForm = () => {
  const navigate = useNavigate()

  const timeSlots: TimeSlot[] = ['起きた時', '朝', '昼', '夜', '寝る前']
  const medicationLevels: MedicationLevel[] = ['多く飲んだ', '飲んだ', '少なめに飲んだ', '飲んでない']

  const initialMedication = Object.fromEntries(
    timeSlots.map((slot) => [slot, null])
  ) as Record<TimeSlot, MedicationLevel | null>

  const [formData, setFormData] = useState<DiagnosisData>({
    medicationLevel: initialMedication,
    healthCondition: null,
    consultation: '',
    timestamp: new Date().toISOString(),
    tonyoUsed: false,
    skipMedication: false
  })

  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const existingData = localStorage.getItem('diagnosisData')
      const dataArray = existingData ? JSON.parse(existingData) : []
      const newData = {
        ...formData,
        id: Date.now().toString()
      }
      dataArray.push(newData)
      localStorage.setItem('diagnosisData', JSON.stringify(dataArray))

      setIsModalOpen(true)
      setFormData({
        ...formData,
        medicationLevel: initialMedication,
        skipMedication: false,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      console.error("送信エラー:", error)
    }
  }

  return (
    <div className="max-w-xl mx-auto p-6 bg-white rounded shadow">
      <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">
        薬の投与量事前登録フォーム
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 薬を使っていない */}
        <div>
          <label className="font-semibold text-gray-700">薬を使っていませんか？</label>
          <div className="mt-2">
            <label className="inline-flex items-center">
              <input
                type="checkbox"
                checked={formData.skipMedication}
                onChange={(e) => {
                  const checked = e.target.checked
                  setFormData((prev) => ({
                    ...prev,
                    skipMedication: checked,
                    medicationLevel: checked ? initialMedication : prev.medicationLevel
                  }))
                }}
                className="form-checkbox h-5 w-5 text-blue-600"
              />
              <span className="ml-2 text-gray-800">薬を使わなかった</span>
            </label>
          </div>
        </div>

        {/* 投与量選択 */}
        <div>
          <h2 className="text-lg  font-semibold text-gray-700 mb-5">
            時間帯別の薬の投与量(実際に飲んだという想定でお願いします)
          </h2>
          <div className='grid grid-rows-5 gap-1'>
            <p className="text-gray-500">各項目でポイント換算し、多い項目をグラフで示すために使用します。</p>
            <p className="text-gray-500"> 多く飲んだ → 3ポイント</p>
            <p className="text-gray-500">飲んだ → 2ポイント</p>
            <p className="text-gray-500">少なめに飲んだ → １ポイント</p>
            <p className="text-gray-500">飲んでいない → ０ポイント</p>
          </div>
          {formData.skipMedication && (
            <p className="text-gray-500 italic mb-2">
              ※「薬を使わない」が選択されているため、入力できません。
            </p>
          )}
          {timeSlots.map((slot) => (
            <fieldset key={slot} className="mb-4" disabled={formData.skipMedication}>
              <legend className="font-semibold text-gray-700 mb-1">{slot}</legend>
              <div className="grid grid-cols-2 gap-3">
                {medicationLevels.map((level) => (
                  <label
                    key={level}
                    className={`p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                      formData.medicationLevel[slot] === level
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name={slot}
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

        {/* 送信 */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={
              !formData.skipMedication &&
              Object.values(formData.medicationLevel).some((v) => v === null)
            }
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold text-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            レポートを出す
          </button>
        </div>

        {/* モーダル */}
        {isModalOpen && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg max-w-sm text-center">
              <h2 className="text-2xl font-bold text-green-700 mb-4">記録完了！</h2>
              <p className="text-gray-700 mb-6">ご記録ありがとうございました 😊</p>
              <button
                onClick={() => {
                  setIsModalOpen(false)
                  navigate('/report')
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
  )
}


export default RegisterForm