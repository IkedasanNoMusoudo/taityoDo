import { useState, useEffect, useRef } from 'react'
import { ReportData, MedicationLevel, TimeSlot } from '../types'
import { BarChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { generatePDF } from '../utils/pdfGenerator'
import { useAuth } from '../contexts/AuthContext'
import { apiService, MedicalReportResponse } from '../services/api'

const ReportView = () => {
  const { user, isAuthenticated } = useAuth()
  const [reports, setReports] = useState<ReportData[]>([])
  const [selectedReport, setSelectedReport] = useState<ReportData | null>(null)
  const [medicalReport, setMedicalReport] = useState<MedicalReportResponse | null>(null)
  const [isLoadingReport, setIsLoadingReport] = useState(false)
  const [reportError, setReportError] = useState<string>('')

  // データ取得（localStorage + API）
  useEffect(() => {
    const loadReports = async () => {
      // まずlocalStorageから取得（オフライン対応）
      const savedData = localStorage.getItem('diagnosisData')
      if (savedData) {
        const data = JSON.parse(savedData)
        setReports(data)
        if (data.length > 0) {
          setSelectedReport(data[data.length - 1]) // 最新のレポートを選択
        }
      }

      // 認証済みなら医療レポートも生成
      if (isAuthenticated && user) {
        await generateMedicalReport()
      }
    }

    loadReports()
  }, [isAuthenticated, user])

  // AI医療レポート生成
  const generateMedicalReport = async () => {
    if (!isAuthenticated || !user) return

    setIsLoadingReport(true)
    setReportError('')

    try {
      const endDate = new Date().toISOString().split('T')[0]
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      
      const response = await apiService.generateMedicalReport(user.id, startDate, endDate)
      
      if (response.error) {
        setReportError(response.error)
      } else if (response.data) {
        setMedicalReport(response.data)
      }
    } catch (error) {
      console.error('Medical report generation failed:', error)
      setReportError('医療レポートの生成に失敗しました')
    } finally {
      setIsLoadingReport(false)
    }
  }

  // 折線グラフ情報の取得のための仕組み
  const chartRef = useRef<HTMLDivElement>(null)
 
  // PDF出力
  const handleGeneratePDF = () => {
    if (selectedReport && chartRef.current) {
      generatePDF(selectedReport, chartRef.current!)
    }
  }


  //　レポートの出力日付
  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  //薬の投与量のグラフ
  const medicationLevel = (level: MedicationLevel | null) => {
    switch (level) {
      case '多く飲んだ': return 3
      case '飲んだ': return 2
      case '少なめに飲んだ': return 1
      case '飲んでない': return 0
      default: return 0
    }
  }

  const generateChartData = (data: ReportData[]) => {
    const timeSlots: TimeSlot[] = ['起きた時', '朝', '昼', '夜', '寝る前']

    return timeSlots.map((slot) => ({
      name: slot,
      value: data.filter(report => report.tonyoUsed).reduce(
        (sum, report) => {
          const level = report.medicationLevel?.[slot]?.level ?? '飲んでない'
          return sum + medicationLevel(level)
        }, 0)
    }))
  }

  // レポートがなかった時の表示
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
    <div className="max-w-5xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-8 text-center">
          診断結果
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
                   薬:{" "}
                  {Object.entries(report.medicationLevel)
                    .map(([time, level]) => `${time}: ${level ?? '未記録'}`)
                    .join(' / ')}
                  {" "} | 体調: {report.healthCondition}
                  {' '}| 屯用: {report.tonyoUsed ? '使用あり' : 'なし'}
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
                  <p className="text-gray-800">
                    {Object.entries(selectedReport.medicationLevel).map(([time, detail]) => {
                      const slot = time as TimeSlot;
                      return (
                        <p key={slot}>
                          {slot}: {detail.level} （{detail.name}  量: {detail.amount ?? '未記録'}）
                        </p>
                      );
                    })}
                  </p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-700 mb-2">体調</h3>
                  <p className="text-gray-800">{selectedReport.healthCondition}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-700 mb-2">屯用（とんよう）使用</h3>
                  <p className="text-gray-800">
                    {selectedReport.tonyoUsed ? '使用した' : '使用していない'}
                  </p>
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
            
            {/** 屯用薬を使用した場合のレポート表示 */}
            {selectedReport.tonyoUsed && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-700 mb-2">薬の投与量（屯用薬）</h3>
                {Object.entries(selectedReport.medicationLevel).map(([time, detail]) => {
                  const slot = time as TimeSlot;
                  return (
                    <p key={slot}>
                      {slot}: {detail.level} （{detail.name}  量: {detail.amount ?? '未記録'}）
                    </p>
                  );
                })}
              </div>
            )}

            {/* AIレポートセクション */}
            {isAuthenticated ? (
              <div className="space-y-4">
                {/* 医師向けAIレポート */}
                <div className="bg-green-50 border border-green-200 p-6 rounded-lg">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-semibold text-green-700">🏥 AI医療レポート</h3>
                    <button
                      onClick={generateMedicalReport}
                      disabled={isLoadingReport}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-300"
                    >
                      {isLoadingReport ? 'AIレポート生成中...' : 'AIレポートを生成'}
                    </button>
                  </div>

                  {reportError && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-red-600">AIレポート生成エラー: {reportError}</p>
                    </div>
                  )}

                  {medicalReport ? (
                    <div className="space-y-4">
                      <div className="bg-white p-4 rounded border">
                        <h4 className="font-semibold text-gray-700 mb-2">📊 客観的要約</h4>
                        <p className="text-gray-800 whitespace-pre-line">{medicalReport.objectiveSummary}</p>
                      </div>
                      <div className="bg-white p-4 rounded border">
                        <h4 className="font-semibold text-gray-700 mb-2">🩺 医学的サマリー</h4>
                        <p className="text-gray-800 whitespace-pre-line">{medicalReport.medicalSummary}</p>
                      </div>
                      <div className="text-sm text-gray-500">
                        対象期間: {medicalReport.periodStart} ～ {medicalReport.periodEnd} 
                        ({medicalReport.recordCount}件の記録)
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-600">AIレポートを生成してください</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-700 mb-2">AI推奨事項</h3>
                <p className="text-blue-800">
                  {selectedReport.aiRecommendation || 
                    '前回のあなたは○○をして解決していました（AI機能は将来的に実装予定）'}
                </p>
              </div>
            )}

            {/* 投薬量グラフ */}
            <div className="bg-white rounded-lg shadow p-6" ref={chartRef}>
              <h3 className="text-xl font-semibold text-gray-700 mb-4">投薬傾向（時間帯別）</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={generateChartData(reports)}>
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="value" stroke="#3B82F6" name="スコア合計" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            {/** 後で削除してもよい */}
            <div className="pt-4">
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('本当に保存されたレポートを削除しますか？')) {
                    localStorage.removeItem('diagnosisData')
                    alert('保存されたレポートデータを削除しました')
                  }
                }}
                className="w-full bg-red-500 text-white py-3 px-6 rounded-lg font-semibold text-lg hover:bg-red-600 transition-colors"
              >
                レポートデータをリセット
              </button>
            </div>

          </div>
        )}
      </div>
    </div>
  )
}

export default ReportView 