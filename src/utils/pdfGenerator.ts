import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { ReportData } from '../types'

export const generatePDF = async (report: ReportData) => {
  try {  
    const doc = new jsPDF()
    
    // フォントバッファを Base64 に変換する関数
    function arrayBufferToBase64(buffer: ArrayBuffer): string {
      let binary = ''
      const bytes = new Uint8Array(buffer)
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i])
      }
      return btoa(binary)
    }

    // フォント読み込みとPDF生成
    const response = await fetch('/fonts/NotoSansJP-Regular.ttf')
    if (!response.ok) throw new Error('フォント取得失敗')

    const fontBuffer = await response.arrayBuffer()
    const fontBase64 = arrayBufferToBase64(fontBuffer)

    // jsPDF にフォント登録
    doc.addFileToVFS('NotoSansJP-Regular.ttf', fontBase64)
    doc.addFont('NotoSansJP-Regular.ttf', 'NotoSansJP', 'normal')
    doc.setFont('NotoSansJP')

    // タイトル
    doc.setFontSize(20)
    doc.text('daigyoDo - 診断後ケアレポート', 20, 30)
    
    // 日時
    doc.setFontSize(12)
    doc.text(`記録日時: ${new Date(report.timestamp).toLocaleDateString('ja-JP')}`, 20, 50)
    
    // 投与量オブジェクトを文字列に変換
    const medicationText = Object.entries(report.medicationLevel)
      .map(([slot, level]) => `${slot}: ${level ?? '未記録'}`)
      .join(', ')

    // 基本情報テーブル
    const tableData = [
      ['薬の投与量', medicationText],
      ['体調', report.healthCondition ?? '未記録'],
    ]
    
    autoTable(doc, {
      head: [['項目', '内容']],
      body: tableData,
      startY: 70,
      styles: {
        font: 'NotoSansJP',
        fontSize: 12,
        cellPadding: 5,
      },
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: 255,
      },
    })
    
    // 相談・対応策
    doc.setFontSize(14)
    doc.text('相談・対応策', 20, 130)
    
    doc.setFontSize(10)
    const consultationText = report.consultation || '記録なし'
    const splitText = doc.splitTextToSize(consultationText, 170)
    doc.text(splitText, 20, 140)
    
    // AI推奨事項
    doc.setFontSize(14)
    doc.text('AI推奨事項', 20, 180)
    
    doc.setFontSize(10)
    const aiText = report.aiRecommendation || 'あなたに似たBさんは○○をして解決していました（AI機能は将来的に実装予定）'
    const splitAiText = doc.splitTextToSize(aiText, 170)
    doc.text(splitAiText, 20, 190)
    
    // フッター
    doc.setFontSize(8)
    doc.text('daigyoDo - 診断後ケアアプリ', 20, 280)
    
    // PDFをダウンロード
    doc.save(`daigyoDo_report_${new Date(report.timestamp).toISOString().split('T')[0]}.pdf`)
  } catch (error) {
    console.error('PDF生成エラー:', error)
  }
} 