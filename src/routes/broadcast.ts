import { Hono } from 'hono'

type Env = {
  DB: any
  LINE_CHANNEL_ACCESS_TOKEN: string
  USER_ID_MOCK: string
}

const app = new Hono<{ Bindings: Env }>()

// LINE API URL設定
const PUSH_URL = 'https://api.line.me/v2/bot/message/push'
const PUSH_MOCK_URL = 'https://api.example.com/v2/bot/message/push'
const IS_MOCK = true

if (typeof globalThis.fetch === 'function' && IS_MOCK) {
    console.log('ローカル開発環境のため、fetchをモック化します。');
    globalThis.fetch = async (url: RequestInfo | URL, init?: RequestInit) => {
      // リクエストされたURLに応じてダミーデータを返す
      const request = new Request(url, init);
      const clonedRequest = request.clone();
      // bodyを読み込んでログに出力
      try {
        const body = await clonedRequest.json();
        console.log('--- [モックされたfetchのリクエストbody] ---');
        console.log(JSON.stringify(body));
        console.log('--- [モックされたfetchのリクエストbody] ---');
      } catch (e) {
        console.log('リクエストbodyはJSON形式ではありませんでした。');
      }
  
      // if (url.toString().includes('https://api.example.com')) {
      if (true) {
        console.log(`モックされたfetchが呼び出されました: ${url}`);
        return new Response(JSON.stringify({ weather: '晴れ' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
  
      // モック対象外のURLはエラーを返す
      throw new Error(`fetch: 外部APIへのアクセスを禁止しています。URL: ${url}`);
    };
  }

// IS_MOCKフラグに基づいてURLを選択
const getPushUrl = () => IS_MOCK ? PUSH_MOCK_URL : PUSH_URL

// 全ユーザーに一斉通知を送信する関数
const sendNotificationToAllUsers = async (env: Env, message: string) => {
	const accessToken: string = env.LINE_CHANNEL_ACCESS_TOKEN;
	const db = env.DB;
	
	try {
		// 全ユーザーの名前、line_user_idをDBから取得
		const usersResult = await db.prepare(`
			SELECT u.name, a.line_id as line_user_id
			FROM users u
			JOIN accounts a ON u.account_id = a.id
		`).all();
		
		if (usersResult.results && usersResult.results.length > 0) {
			console.log(`${usersResult.results.length}人のユーザーに一斉通知を送信します`);
			
			// 全ユーザーにメッセージを送信
			const results = await Promise.allSettled(
				usersResult.results.map(async (user: any) => {
					try {
						await fetch(getPushUrl(), {
							body: JSON.stringify({
								to: user.line_user_id,
								messages: [{
									"type": "text",
									"text": message
								}],
							}),
							method: "POST",
							headers: {
								Authorization: `Bearer ${accessToken}`,
								"Content-Type": "application/json",
							},
						});
						return { success: true, user: user.name, line_user_id: user.line_user_id };
					} catch (error) {
						console.error(`メッセージ送信エラー (${user.line_user_id}):`, error);
						return { success: false, user: user.name, line_user_id: user.line_user_id, error: error };
					}
				})
			);
			
			const successCount = results.filter(result => result.status === 'fulfilled' && result.value.success).length;
			const failureCount = results.length - successCount;
			
			console.log(`一斉通知完了: 成功 ${successCount}件, 失敗 ${failureCount}件`);
			
			return {
				total: results.length,
				success: successCount,
				failure: failureCount,
				results: results.map(result => 
					result.status === 'fulfilled' ? result.value : { success: false, error: result.reason }
				)
			};
		} else {
			console.log('通知対象のユーザーがいません');
			return { total: 0, success: 0, failure: 0, results: [] };
		}
	} catch (error) {
		console.error('一斉通知エラー:', error);
		throw error;
	}
}

// デバッグ用エンドポイント
app.get('/test', (c) => {
	return c.json({ message: 'broadcast route is working' });
});

// 一斉通知エンドポイント
app.post('/', async (c) => {
	try {
		const body = await c.req.json();
		const { message } = body;
		
		if (!message || typeof message !== 'string') {
			return c.json({ 
				success: false, 
				error: 'メッセージが正しく指定されていません' 
			}, 400);
		}
		
		const result = await sendNotificationToAllUsers(c.env, message);
		
		return c.json({
			success: true,
			message: '一斉通知が完了しました',
			data: result
		});
		
	} catch (error) {
		console.error('一斉通知エンドポイントエラー:', error);
		return c.json({ 
			success: false, 
			error: '一斉通知の実行中にエラーが発生しました' 
		}, 500);
	}
});

export default app 