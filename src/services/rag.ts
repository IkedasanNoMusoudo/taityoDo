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

  async getRecentPatientRecords(userId: number, _daysBack: number = 7): Promise<Array<{
    date: string;
    timeSlot: string;
    condition: string;
    medicationStatus: string;
    freeText?: string;
  }>> {
    // Use current table structure (user_id based)
    const query = `
      SELECT 
        r.id,
        r.condition,
        r.form as freeText,
        'データなし' as medicationStatus
      FROM records r
      WHERE r.user_id = ? 
      ORDER BY r.id DESC
      LIMIT 20
    `;

    const result = await this.db.prepare(query).bind(userId).all();
    
    // Add realistic timestamps for demo purposes
    const records = (result.results as any[]).map((record, index) => {
      const daysAgo = Math.floor(index / 3); // 3 records per day
      const timeSlots = ['08:00', '12:00', '20:00'];
      const timeSlot = timeSlots[index % 3];
      
      const date = new Date();
      date.setDate(date.getDate() - daysAgo);
      
      return {
        date: date.toISOString().split('T')[0],
        timeSlot,
        condition: record.condition,
        medicationStatus: record.medicationStatus,
        freeText: record.freeText
      };
    });
    
    return records;
  }

  async getPeriodRecords(userId: number, startDate: string, _endDate: string): Promise<Array<{
    date: string;
    timeSlot: string;
    condition: string;
    medicationStatus: string;
    freeText?: string;
  }>> {
    // Use current table structure (user_id based)
    const query = `
      SELECT 
        r.id,
        r.condition,
        r.form as freeText,
        'データなし' as medicationStatus
      FROM records r
      WHERE r.user_id = ? 
      ORDER BY r.id ASC
    `;

    const result = await this.db.prepare(query).bind(userId).all();
    
    // Add realistic timestamps for demo purposes
    const records = (result.results as any[]).map((record, index) => {
      const startDateObj = new Date(startDate);
      const daysSinceStart = Math.floor(index / 3); // 3 records per day
      const timeSlots = ['08:00', '12:00', '20:00'];
      const timeSlot = timeSlots[index % 3];
      
      const recordDate = new Date(startDateObj);
      recordDate.setDate(recordDate.getDate() + daysSinceStart);
      
      return {
        date: recordDate.toISOString().split('T')[0],
        timeSlot,
        condition: record.condition,
        medicationStatus: record.medicationStatus,
        freeText: record.freeText
      };
    });
    
    return records;
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