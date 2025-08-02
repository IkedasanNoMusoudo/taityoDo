import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DiagnosisData, MedicationLevel, HealthCondition } from '../types'

const DiagnosisForm = () => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState<DiagnosisData>({
    medicationLevel: null,
    healthCondition: null,
    consultation: '',
    timestamp: new Date().toISOString()
  })

  const medicationLevels: MedicationLevel[] = ['多く飲んだ', '飲んだ', '少なめに飲んだ', '飲んでない']
  const healthConditions: HealthCondition[] = ['○', '×', '△']

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // ローカルストレージに保存
    const existingData = localStorage.getItem('diagnosisData')
    const dataArray = existingData ? JSON.parse(existingData) : []
    const newData = {
      ...formData,
      id: Date.now().toString()
    }
    dataArray.push(newData)
    localStorage.setItem('diagnosisData', JSON.stringify(dataArray))
    
    // レポートページに遷移
    navigate('/report')
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-8 text-center">
          診断後ケアフォーム
        </h1>
        
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* 薬の投与量 */}
          <div>
            <h2 className="text-xl font-semibold text-gray-700 mb-4">
              1. 薬をどのぐらい投与しましたか？
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {medicationLevels.map((level) => (
                <label
                  key={level}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                    formData.medicationLevel === level
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="medicationLevel"
                    value={level}
                    checked={formData.medicationLevel === level}
                    onChange={(e) => setFormData({ ...formData, medicationLevel: e.target.value as MedicationLevel })}
                    className="sr-only"
                  />
                  <span className="text-center block">{level}</span>
                </label>
              ))}
            </div>
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

          {/* 相談・対応策 */}
          <div>
            <h2 className="text-xl font-semibold text-gray-700 mb-4">
              3. 次回の診断までにあったことを記録してください
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
              disabled={!formData.medicationLevel || !formData.healthCondition}
              className="w-full bg-blue-600 text-white py-4 px-6 rounded-lg font-semibold text-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              レポートを生成
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default DiagnosisForm 