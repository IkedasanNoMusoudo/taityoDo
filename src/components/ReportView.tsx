import { useState, useEffect } from 'react'
import { ReportData } from '../types'
import { generatePDF } from '../utils/pdfGenerator'

const ReportView = () => {
  const [reports, setReports] = useState<ReportData[]>([])
  const [selectedReport, setSelectedReport] = useState<ReportData | null>(null)

  useEffect(() => {
    const savedData = localStorage.getItem('diagnosisData')
    if (savedData) {
      const data = JSON.parse(savedData)
      setReports(data)
      if (data.length > 0) {
        setSelectedReport(data[data.length - 1]) // 最新のレポートを選択
      }
    }
  }, [])

  const handleGeneratePDF = () => {
    if (selectedReport) {
      generatePDF(selectedReport)
    }
  }

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (reports.length === 0) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            レポートがありません
          </h1>
          <p className="text-gray-600 mb-6">
            診断フォームからデータを入力してください。
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-8 text-center">
          診断レポート
        </h1>

        {/* レポート選択 */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">
            レポートを選択
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reports.map((report) => (
              <button
                key={report.id}
                onClick={() => setSelectedReport(report)}
                className={`p-4 border-2 rounded-lg text-left transition-colors ${
                  selectedReport?.id === report.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-semibold text-gray-800">
                  {formatDate(report.timestamp)}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  薬: {report.medicationLevel} | 体調: {report.healthCondition}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 選択されたレポートの詳細表示 */}
        {selectedReport && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-800">
                レポート詳細
              </h2>
              <button
                onClick={handleGeneratePDF}
                className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors"
              >
                PDF出力
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 基本情報 */}
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-700 mb-2">記録日時</h3>
                  <p className="text-gray-800">{formatDate(selectedReport.timestamp)}</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-700 mb-2">薬の投与量</h3>
                  <p className="text-gray-800">{selectedReport.medicationLevel}</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-700 mb-2">体調</h3>
                  <p className="text-gray-800">{selectedReport.healthCondition}</p>
                </div>
              </div>

              {/* 相談・対応策 */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-700 mb-2">相談・対応策</h3>
                <p className="text-gray-800 whitespace-pre-wrap">
                  {selectedReport.consultation || '記録なし'}
                </p>
              </div>
            </div>

            {/* AI推奨事項（将来的な実装） */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-700 mb-2">AI推奨事項</h3>
              <p className="text-blue-800">
                {selectedReport.aiRecommendation || 
                  '前回のあなたは○○をして解決していました（AI機能は将来的に実装予定）'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ReportView 