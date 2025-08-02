import { GoogleGenerativeAI } from '@google/generative-ai';

export interface PatientContext {
  userId: number;
  recentRecords: Array<{
    date: string;
    timeSlot: string;
    condition: string;
    medicationStatus: string;
    freeText?: string;
  }>;
  currentRecord: {
    date: string;
    timeSlot: string;
    condition: string;
    medicationStatus: string;
    freeText?: string;
  };
}

export interface MedicalReportContext {
  userId: number;
  periodStart: string;
  periodEnd: string;
  allRecords: Array<{
    date: string;
    timeSlot: string;
    condition: string;
    medicationStatus: string;
    freeText?: string;
  }>;
}

export class RAGService {
  private genAI: GoogleGenerativeAI;
  private db: any;

  constructor(apiKey: string, db: any) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.db = db;
  }

  async getRecentPatientRecords(userId: number, daysBack: number = 7): Promise<Array<{
    date: string;
    timeSlot: string;
    condition: string;
    medicationStatus: string;
    freeText?: string;
  }>> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);
    const cutoffDateStr = cutoffDate.toISOString().split('T')[0];

    const query = `
      SELECT 
        DATE(al.occurred_at) as date,
        TIME(al.occurred_at) as timeSlot,
        r.condition,
        COALESCE(ir.intake_status, 'データなし') as medicationStatus,
        r.form as freeText
      FROM activity_logs al
      LEFT JOIN records r ON r.activity_log_id = al.id
      LEFT JOIN intake_results ir ON ir.activity_log_id = al.id
      WHERE al.user_id = ? 
        AND DATE(al.occurred_at) >= ?
        AND (r.id IS NOT NULL OR ir.id IS NOT NULL)
      ORDER BY al.occurred_at DESC
      LIMIT 20
    `;

    const result = await this.db.prepare(query).bind(userId, cutoffDateStr).all();
    return result.results as any[];
  }

  async getPeriodRecords(userId: number, startDate: string, endDate: string): Promise<Array<{
    date: string;
    timeSlot: string;
    condition: string;
    medicationStatus: string;
    freeText?: string;
  }>> {
    const query = `
      SELECT 
        DATE(al.occurred_at) as date,
        TIME(al.occurred_at) as timeSlot,
        r.condition,
        COALESCE(ir.intake_status, 'データなし') as medicationStatus,
        r.form as freeText
      FROM activity_logs al
      LEFT JOIN records r ON r.activity_log_id = al.id
      LEFT JOIN intake_results ir ON ir.activity_log_id = al.id
      WHERE al.user_id = ? 
        AND DATE(al.occurred_at) BETWEEN ? AND ?
        AND (r.id IS NOT NULL OR ir.id IS NOT NULL)
      ORDER BY al.occurred_at ASC
    `;

    const result = await this.db.prepare(query).bind(userId, startDate, endDate).all();
    return result.results as any[];
  }

  private buildPatientFeedbackPrompt(context: PatientContext): string {
    const recentRecordsText = context.recentRecords
      .map(record => `${record.date} (${record.timeSlot}): 体調${record.condition}, 服薬${record.medicationStatus}${record.freeText ? `, 「${record.freeText}」` : ''}`)
      .join('\n');

    const currentRecordText = `${context.currentRecord.date} (${context.currentRecord.timeSlot}): 体調${context.currentRecord.condition}, 服薬${context.currentRecord.medicationStatus}${context.currentRecord.freeText ? `, 「${context.currentRecord.freeText}」` : ''}`;

    return `# 指示
あなたは優しいメンタルヘルスケアサポーターです。以下のユーザーの過去の記録と今日の記録を参考にして、ユーザーを励ます温かいメッセージを生成してください。

# 過去の記録
${recentRecordsText}

# 今日の記録
${currentRecordText}

# 生成するメッセージの要件:
- 50文字以内で簡潔に
- 服薬遵守を褒める
- 体調の変化に共感する
- 自由記述があれば応答する
- 温かく励ましの言葉をかける

# 生成するメッセージ:`;
  }

  private buildObjectiveSummaryPrompt(context: MedicalReportContext): string {
    const recordsText = context.allRecords
      .map(record => `${record.date} (${record.timeSlot}): 体調${record.condition}, 服薬${record.medicationStatus}${record.freeText ? `, 「${record.freeText}」` : ''}`)
      .join('\n');

    return `# 指示
以下の活動記録を、日付や体調の変化がわかるように客観的に要約してください。

# 対象期間
${context.periodStart} ～ ${context.periodEnd}

# 活動記録
${recordsText}

# 要約の要件:
- 客観的事実のみを記載
- 日付順に時系列で整理
- 体調の変化パターンを明記
- 服薬遵守率の傾向を記載
- 推測や主観的判断は避ける

# 客観的要約:`;
  }

  private buildMedicalSummaryPrompt(context: MedicalReportContext): string {
    const recordsText = context.allRecords
      .map(record => `${record.date} (${record.timeSlot}): 体調${record.condition}, 服薬${record.medicationStatus}${record.freeText ? `, 「${record.freeText}」` : ''}`)
      .join('\n');

    return `# 指示
以下の活動記録から、医師が次の診察で特に注目すべき症状、副作用の可能性、患者が抱える重要な悩みなどを箇条書きで抽出してください。

# 対象期間
${context.periodStart} ～ ${context.periodEnd}

# 活動記録
${recordsText}

# 抽出の要件:
- 医師が短時間で把握すべき重要事項のみ
- 箇条書きで簡潔に
- 症状の悪化傾向があれば必ず記載
- 服薬に関する問題があれば記載
- 患者の重要な訴えがあれば記載
- 事実と推測を明確に区別

# 医師向け重要事項:`;
  }

  async generatePatientFeedback(context: PatientContext): Promise<string> {
    const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = this.buildPatientFeedbackPrompt(context);

    try {
      const result = await model.generateContent(prompt);
      const response = result.response;
      return response.text().trim();
    } catch (error) {
      console.error('Error generating patient feedback:', error);
      return 'お疲れ様です。記録をつけていただき、ありがとうございます。';
    }
  }

  async generateMedicalReport(context: MedicalReportContext): Promise<{
    objectiveSummary: string;
    medicalSummary: string;
  }> {
    const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    try {
      const [objectiveResult, medicalResult] = await Promise.all([
        model.generateContent(this.buildObjectiveSummaryPrompt(context)),
        model.generateContent(this.buildMedicalSummaryPrompt(context))
      ]);

      const objectiveSummary = objectiveResult.response.text().trim();
      const medicalSummary = medicalResult.response.text().trim();

      return {
        objectiveSummary,
        medicalSummary
      };
    } catch (error) {
      console.error('Error generating medical report:', error);
      return {
        objectiveSummary: '記録の要約生成中にエラーが発生しました。',
        medicalSummary: '医師向けサマリー生成中にエラーが発生しました。'
      };
    }
  }
}