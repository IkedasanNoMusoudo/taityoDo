// Quick test to verify Google Gemini API connectivity
import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = process.env.GEMINI_API_KEY;

async function testGeminiAPI() {
  console.log('🧪 Testing Google Gemini API...');
  
  try {
    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    const prompt = `あなたは優しいメンタルヘルスケアサポーターです。
以下のユーザーの記録に対して、30文字以内で励ましのメッセージを生成してください。

今日の記録: 体調○、「今日は調子が良いです」

メッセージ:`;
    
    console.log('📤 Sending request to Gemini API...');
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    
    console.log('✅ API Response received:');
    console.log('   Generated text:', text.trim());
    
  } catch (error) {
    console.error('❌ Gemini API test failed:');
    console.error('   Error:', error.message);
    console.error('   Full error:', error);
  }
}

testGeminiAPI();