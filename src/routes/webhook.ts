import { Hono } from 'hono'
import {
	MessageAPIResponseBase,
	TextMessage,
	WebhookEvent,
} from "@line/bot-sdk";

type Env = {
  DB: any // D1Database type - using any for now to avoid type issues
  LINE_CHANNEL_ACCESS_TOKEN: string;
  USER_ID_MOCK: string;
}

// ユーザー情報の型定義
interface UserInfo {
	line_user_id: string;
	name: string;
	email: string;
	password: string;
}

// TODO: LINE APIのURLを実装時に使用
// const REPLY_URL = 'https://api.line.me/v2/bot/message/reply'
// const PUSH_URL = 'https://api.line.me/v2/bot/message/push'

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


const app = new Hono<{ Bindings: Env }>();

app.post("/webhook", async (c) => {
	const data = await c.req.json();
	const events: WebhookEvent[] = (data as any).events;
	const accessToken: string = c.env.LINE_CHANNEL_ACCESS_TOKEN;

	await Promise.all(
		events.map(async (event: WebhookEvent) => {
			try {
				await textEventHandler(event, accessToken, c.env.DB);
				await followEventHandler(event, accessToken);
			} catch (err: unknown) {
				if (err instanceof Error) {
					console.error(err);
				}
				return c.json({
					status: "error",
				});
			}
		})
	);
	return c.json({ message: "ok" });
});


const user_registered = async (db: any, userid: string): Promise<boolean> => {
	try {
		// accountsテーブルでline_idを使ってユーザーが登録済みかチェック
		const result = await db.prepare(
			'SELECT id FROM accounts WHERE line_id = ?'
		).bind(userid).first();
		
		return result !== null;
	} catch (error) {
		console.error('ユーザー登録確認エラー:', error);
		return false;
	}
};

// ユーザー情報を取得する関数
const get_user_info = async (db: any, userid: string): Promise<UserInfo | null> => {
	try {
		// accountsテーブルとusersテーブルをJOINしてユーザー情報を取得
		const result = await db.prepare(`
			SELECT a.line_id as line_user_id, u.name, a.email, a.hashed_password as password
			FROM accounts a
			JOIN users u ON a.id = u.account_id
			WHERE a.line_id = ?
		`).bind(userid).first();
		
		return result;
	} catch (error) {
		console.error('ユーザー情報取得エラー:', error);
		return null;
	}
};



// ユーザーを登録する関数
const register_user = async (db: any, userInfo: UserInfo): Promise<boolean> => {
	try {
		// 1. accountsテーブルにアカウント情報を挿入
		const accountResult = await db.prepare(`
			INSERT INTO accounts (email, hashed_password, line_id)
			VALUES (?, ?, ?)
		`).bind(
			userInfo.email,
			userInfo.password, // 実際の運用ではハッシュ化が必要
			userInfo.line_user_id
		).run();
		
		if (!accountResult.success) {
			console.error('アカウント登録に失敗しました');
			return false;
		}
		
		// 2. usersテーブルにユーザー情報を挿入
		const userResult = await db.prepare(`
			INSERT INTO users (name, account_id)
			VALUES (?, ?)
		`).bind(
			userInfo.name,
			accountResult.meta.last_row_id
		).run();
		
		if (!userResult.success) {
			console.error('ユーザー登録に失敗しました');
			// アカウントは作成済みなので、削除を試みる
			try {
				await db.prepare('DELETE FROM accounts WHERE id = ?').bind(accountResult.meta.last_row_id).run();
			} catch (deleteError) {
				console.error('アカウント削除エラー:', deleteError);
			}
			return false;
		}
		
		return true;
	} catch (error) {
		console.error('ユーザー登録エラー:', error);
		return false;
	}
};


const textEventHandler = async (
	event: WebhookEvent,
	accessToken: string,
	db: any
): Promise<MessageAPIResponseBase | undefined> => {
	if (event.type !== "message" || event.message.type !== "text" || event.source.type !== 'user') {
		return;
	}
	const userid: string = event.source.userId;
	const { replyToken } = event;
	const { text } = event.message;

	// ユーザーが登録済みかチェック
	const isRegistered = await user_registered(db, userid);
	
	if (isRegistered) {
		// 登録済みユーザーの場合：ウェブサイトへの案内
		const userInfo = await get_user_info(db, userid);
		if (userInfo) {
			const response: TextMessage = {
				type: "text",
				text: `${userInfo.name}さん、体調記録は以下のURLからお願いします：\nhttps://example.com/diagnosis`,
			};
			await fetch("https://api.example.com/v2/bot/message/reply", {
				body: JSON.stringify({
					replyToken: replyToken,
					messages: [response],
				}),
				method: "POST",
				headers: {
					Authorization: `Bearer ${accessToken}`,
					"Content-Type": "application/json",
				},
			});
		}
	} else {
		// 未登録ユーザーの場合：登録処理
		const lines = text.split('\n');
		if (lines.length >= 3) {
			const [name, email, password] = lines;
			
			// 簡単なバリデーション
			if (name && email && password && email.includes('@')) {
				const userInfo = {
					line_user_id: userid,
					name: name.trim(),
					email: email.trim(),
					password: password.trim()
				};
				console.log(userInfo);
				
				const registered = await register_user(db, userInfo);
				if (registered) {
					const response: TextMessage = {
						type: "text",
						text: `${name}さん、登録が完了しました！これから体調管理をサポートさせていただきます。`,
					};
					await fetch("https://api.example.com/v2/bot/message/reply", {
						body: JSON.stringify({
							replyToken: replyToken,
							messages: [response],
						}),
						method: "POST",
						headers: {
							Authorization: `Bearer ${accessToken}`,
							"Content-Type": "application/json",
						},
					});
				} else {
					const response: TextMessage = {
						type: "text",
						text: "登録に失敗しました。もう一度お試しください。",
					};
					await fetch("https://api.example.com/v2/bot/message/reply", {
						body: JSON.stringify({
							replyToken: replyToken,
							messages: [response],
						}),
						method: "POST",
						headers: {
							Authorization: `Bearer ${accessToken}`,
							"Content-Type": "application/json",
						},
					});
				}
			} else {
				const response: TextMessage = {
					type: "text",
					text: "正しい形式で入力してください：\n名前（漢字）\nメールアドレス\nパスワード",
				};
				await fetch("https://api.example.com/v2/bot/message/reply", {
					body: JSON.stringify({
						replyToken: replyToken,
						messages: [response],
					}),
					method: "POST",
					headers: {
						Authorization: `Bearer ${accessToken}`,
						"Content-Type": "application/json",
					},
				});
			}
		} else {
			const response: TextMessage = {
				type: "text",
				text: "以下の形式で入力してください：\n名前（漢字）\nメールアドレス\nパスワード",
			};
			await fetch("https://api.example.com/v2/bot/message/reply", {
				body: JSON.stringify({
					replyToken: replyToken,
					messages: [response],
				}),
				method: "POST",
				headers: {
					Authorization: `Bearer ${accessToken}`,
					"Content-Type": "application/json",
				},
			});
		}
	}
};

const followEventHandler = async (
	event: WebhookEvent,
	accessToken: string
) => {
	if (event.type !== "follow" || event.source.type !== 'user') {
		return;
	}
	const replyToken: string = event.replyToken;
	const userid: string = event.source.userId;
	const timestamp = new Date(event.timestamp);

	console.log('follow ' + userid + timestamp.toISOString());

	const text = '友だち追加ありがとうございます。連携のため、以下の形式に従って情報を送信してください。\n名前（漢字）\nメールアドレス\nパスワード'
	const response: TextMessage = {
		type: "text",
		text: text,
	};
	await fetch("https://api.example.com/v2/bot/message/reply", {
		body: JSON.stringify({
			replyToken: replyToken,
			messages: [response],
		}),
		method: "POST",
		headers: {
			Authorization: `Bearer ${accessToken}`,
			"Content-Type": "application/json",
		},
	});

}

const scheduled = async (
	controller: any,
    env: Env,
    _ctx: any,
) => {
	const accessToken: string = env.LINE_CHANNEL_ACCESS_TOKEN;
	// TODO: DBを使用してユーザー情報を取得
	// const db = env.DB;
	const utc = new Date(controller.scheduledTime);
	console.log("cron " + utc.toISOString());
	
	try {
		// TODO: 登録済みユーザー全員取得のSQL文を実装
		// SELECT line_user_id, name FROM users
		const users = { results: [] };
		
		if (users.results && users.results.length > 0) {
			// 各ユーザーにメッセージを送信
			await Promise.all(
				users.results.map(async (user: { line_user_id: string; name: string }) => {
					try {
						await fetch("https://api.example.com/v2/bot/message/push", {
							body: JSON.stringify({
								to: user.line_user_id,
								messages: [{
									"type": "text",
									"text": `${user.name}さん、こんばんは。今日の体調記録をお願いします。以下のURLから入力してください：\nhttps://example.com/diagnosis`
								}],
							}),
							method: "POST",
							headers: {
								Authorization: `Bearer ${accessToken}`,
								"Content-Type": "application/json",
							},
						});
						console.log(`体調確認メッセージを送信: ${user.name} (${user.line_user_id})`);
					} catch (error) {
						console.error(`メッセージ送信エラー (${user.line_user_id}):`, error);
					}
				})
			);
			console.log(`${users.results.length}人のユーザーに体調確認メッセージを送信しました`);
		} else {
			console.log('登録済みユーザーがいません');
		}
	} catch (error) {
		console.error('スケジュールタスクエラー:', error);
	}
}


export default {
	fetch: app.fetch,
	scheduled,
}