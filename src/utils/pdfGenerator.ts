import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { toPng } from 'html-to-image'
import { ReportData } from '../types'


export const generatePDF = async (report: ReportData, chartElement: HTMLElement) => {
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
    doc.text('daijyoDo - 診断後ケアレポート 中間チェックレポート', 20, 30)

    // 日時
    doc.setFontSize(12)
    doc.text(`記録日時: ${new Date(report.timestamp).toLocaleDateString('ja-JP')}`, 20, 40)

    

    // 基本情報テーブル
    const tableData = [
      ['薬の投与量', Object.entries(report.medicationLevel).map(([k, v]) => `${k}: ${v ?? '未記録'}`).join(', ')],
      ['体調', report.healthCondition],
      ['屯用薬使用', report.tonyoUsed ? '使用した' : '使用していない'],
      
    ]
    
    autoTable(doc, {
      head: [['項目', '内容']],
      body: tableData,
      startY: 50,
      styles: {
        font: 'NotoSansJP',
        fontSize: 12,
      },
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: 255,
      },
    })

    // Y位置を追跡（autoTable後）
    let y = (doc as any).lastAutoTable.finalY + 10
    
    // 相談・対応策
    doc.setFontSize(14)
    doc.text('相談・対応策', 20, y)
    y += 10
    
    doc.setFontSize(10)
    const consultationText = report.consultation || '記録なし'
    const splitConsultation = doc.splitTextToSize(consultationText, 170)
    doc.text(splitConsultation, 20, y)
    y += splitConsultation.length * 5 + 10
    
    // AI推奨事項
    doc.setFontSize(14)
    doc.text('AI推奨事項', 20, y)
    y += 10
    
    doc.setFontSize(10)
    const aiText = report.aiRecommendation || '前のあなたは○○な感じでした!（AI機能は将来的に実装予定）'
    const splitAiText = doc.splitTextToSize(aiText, 170)
    doc.text(splitAiText, 20, y)
    y += splitAiText.length * 5 + 10

    // グラフを最後に貼り付け
    if (chartElement) {
        const imgData = await toPng(chartElement)
        doc.setFontSize(14)
        doc.text('投薬傾向グラフ', 20, y)
        y += 5
        doc.addImage(imgData, 'PNG', 20, y, 185, 120)
        y += 90
    }
    
    // フッター
    doc.setFontSize(8)
    doc.text('daijyoDo - 診断後ケアアプリ', 20, 285)
    
    // PDFをダウンロード
    doc.save(`daijyoDo_report_${new Date(report.timestamp).toISOString().split('T')[0]}.pdf`)
  } catch (error) {
    console.error('PDF生成エラー:', error)
  }
} 