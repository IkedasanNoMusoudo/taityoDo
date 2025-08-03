import { Hono } from 'hono'
import {
	MessageAPIResponseBase,
	TextMessage,
	WebhookEvent,
} from "@line/bot-sdk";

type Env = {
	DB: any // D1Database type - using any for now to avoid type issues
	LINE_CHANNEL_ACCESS_TOKEN: string;
}

// ユーザー情報の型定義
interface UserInfo {
	line_user_id: string;
	name: string;
	email: string;
	password: string;
	notification_times: string; // カンマ区切りの時刻文字列 (例: "08:00,12:00,20:00")
}

// TODO: LINE APIのURLを実装時に使用
const REPLY_URL = 'https://api.line.me/v2/bot/message/reply'
const PUSH_URL = 'https://api.line.me/v2/bot/message/push'
const REPLY_MOCK_URL = 'https://api.example.com/v2/bot/message/reply'
const PUSH_MOCK_URL = 'https://api.example.com/v2/bot/message/push'
const IS_MOCK = false

// IS_MOCKフラグに基づいてURLを選択
const getReplyUrl = () => IS_MOCK ? REPLY_MOCK_URL : REPLY_URL
const getPushUrl = () => IS_MOCK ? PUSH_MOCK_URL : PUSH_URL

// 時刻テキストのバリデーション関数
const validateNotificationTimes = (timesText: string): { isValid: boolean; error?: string; times?: string[] } => {
	try {
		// 空文字チェック
		if (!timesText || timesText.trim() === '') {
			return { isValid: false, error: '時刻が入力されていません' };
		}

		// 「なし」の場合は有効
		if (timesText.trim() === 'なし') {
			return { isValid: true, times: [] };
		}

		// カンマで分割
		const times = timesText.split(',').map(t => t.trim()).filter(t => t !== '');
		
		// 最低1つの時刻が必要
		if (times.length === 0) {
			return { isValid: false, error: '少なくとも1つの時刻を入力してください' };
		}

		// 各時刻の形式チェックと整形
		const formattedTimes: string[] = [];
		for (const time of times) {
			// hh:mm形式の正規表現（より柔軟に）
			const timeRegex = /^([0-9]|0[0-9]|1[0-9]|2[0-3]):([0-5][0-9])$/;
			if (!timeRegex.test(time)) {
				return { isValid: false, error: `時刻の形式が正しくありません: ${time} (hh:mm形式で入力してください)` };
			}

			// 時刻の範囲チェック（00:00-23:59）
			const [hours, minutes] = time.split(':').map(Number);
			if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
				return { isValid: false, error: `時刻の範囲が正しくありません: ${time} (00:00-23:59の範囲で入力してください)` };
			}

			// HH:MM形式に整形（2桁ゼロ埋め）
			const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
			formattedTimes.push(formattedTime);
		}

		// 重複チェック
		const uniqueTimes = [...new Set(formattedTimes)];
		if (uniqueTimes.length !== formattedTimes.length) {
			return { isValid: false, error: '重複した時刻が含まれています' };
		}

		// 時刻の順序チェック（昇順にソート）
		const sortedTimes = [...formattedTimes].sort();
		if (JSON.stringify(sortedTimes) !== JSON.stringify(formattedTimes)) {
			return { isValid: false, error: '時刻は昇順（早い時刻から）で入力してください' };
		}

		return { isValid: true, times: formattedTimes };
	} catch (error) {
		return { isValid: false, error: '時刻の検証中にエラーが発生しました' };
	}
};

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
		
		// 3. record_reminder_rulesテーブルに通知時刻を挿入
		if (userInfo.notification_times.trim() === 'なし') {
			// 「なし」の場合は空文字で1つのレコードを作成
			const reminderResult = await db.prepare(`
				INSERT INTO record_reminder_rules (user_id, alert_time, enabled)
				VALUES (?, ?, 0)
			`).bind(
				userResult.meta.last_row_id,
				''  // 空文字
			).run();
			
			if (!reminderResult.success) {
				console.error('通知時刻の登録に失敗しました（なしの場合）');
				// ユーザーとアカウントを削除を試みる
				try {
					await db.prepare('DELETE FROM users WHERE id = ?').bind(userResult.meta.last_row_id).run();
					await db.prepare('DELETE FROM accounts WHERE id = ?').bind(accountResult.meta.last_row_id).run();
				} catch (deleteError) {
					console.error('削除エラー:', deleteError);
				}
				return false;
			}
		} else {
			// 時刻が指定されている場合（バリデーション済みの整形された時刻を使用）
			const timeValidation = validateNotificationTimes(userInfo.notification_times);
			if (!timeValidation.isValid || !timeValidation.times) {
				console.error('時刻のバリデーションに失敗しました');
				return false;
			}
			
			for (const time of timeValidation.times) {
				const reminderResult = await db.prepare(`
					INSERT INTO record_reminder_rules (user_id, alert_time, enabled)
					VALUES (?, ?, 1)
				`).bind(
					userResult.meta.last_row_id,
					time
				).run();
				
				if (!reminderResult.success) {
					console.error(`通知時刻の登録に失敗しました: ${time}`);
					// ユーザーとアカウントを削除を試みる
					try {
						await db.prepare('DELETE FROM users WHERE id = ?').bind(userResult.meta.last_row_id).run();
						await db.prepare('DELETE FROM accounts WHERE id = ?').bind(accountResult.meta.last_row_id).run();
					} catch (deleteError) {
						console.error('削除エラー:', deleteError);
					}
					return false;
				}
			}
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
				text: `${userInfo.name}さん、体調記録は以下のURLからお願いします：\nhttps://ed6df3b3.taicho-do-31587351.pages.dev/`,
			};
			await fetch(getReplyUrl(), {
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
		if (lines.length >= 4) {
			const [name, email, password, notificationTimes] = lines;
			
			// 時刻のバリデーション
			const timeValidation = validateNotificationTimes(notificationTimes);
			if (!timeValidation.isValid) {
				const response: TextMessage = {
					type: "text",
					text: `時刻の入力に問題があります：${timeValidation.error}\n\n正しい形式：\n名前（漢字）\nメールアドレス\nパスワード\n通知時刻（hh:mm形式、カンマ区切り、例：08:00,12:00,20:00 または なし）`,
				};
				await fetch(getReplyUrl(), {
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
				return;
			}
			
			// 簡単なバリデーション
			if (name && email && password && email.includes('@')) {
				const userInfo = {
					line_user_id: userid,
					name: name.trim(),
					email: email.trim(),
					password: password.trim(),
					notification_times: notificationTimes.trim()
				};
				console.log(userInfo);
				
				const registered = await register_user(db, userInfo);
				if (registered) {
					const response: TextMessage = {
						type: "text",
						text: `${name}さん、登録が完了しました！これから体調管理をサポートさせていただきます。`,
					};
					await fetch(getReplyUrl(), {
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
					await fetch(getReplyUrl(), {
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
					text: "正しい形式で入力してください：\n名前（漢字）\nメールアドレス\nパスワード\n通知時刻（hh:mm形式、カンマ区切り、例：08:00,12:00,20:00 または なし）",
				};
				await fetch(getReplyUrl(), {
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
				text: "以下の形式で入力してください：\n名前（漢字）\nメールアドレス\nパスワード\n通知時刻（hh:mm形式、カンマ区切り、例：08:00,12:00,20:00 または なし）",
			};
			await fetch(getReplyUrl(), {
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

	const text = '友だち追加ありがとうございます。連携のため、以下の形式に従って情報を送信してください。\n名前（漢字）\nメールアドレス\nパスワード\n通知時刻（hh:mm形式、カンマ区切り、例：08:00,12:00,20:00 または なし）'
	const response: TextMessage = {
		type: "text",
		text: text,
	};
	await fetch(getReplyUrl(), {
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
	const db = env.DB;
	const utc = new Date(controller.scheduledTime);
	
	// 現在時刻をHH:MM形式に整形
	const currentTime = `${utc.getHours().toString().padStart(2, '0')}:${utc.getMinutes().toString().padStart(2, '0')}`;
	
	try {
		// 全ユーザーの名前、line_user_id、通知時刻をDBから取得（line_idがnullでないもののみ）
		const usersResult = await db.prepare(`
			SELECT u.name, a.line_id as line_user_id, rrr.alert_time, rrr.enabled
			FROM users u
			JOIN accounts a ON u.account_id = a.id
			LEFT JOIN record_reminder_rules rrr ON u.id = rrr.user_id
			WHERE a.line_id IS NOT NULL
		`).all();
		
		if (usersResult.results && usersResult.results.length > 0) {
			// 現在時刻に通知を希望しているユーザーをフィルタリング
			const usersToNotify = usersResult.results.filter((user: any) => {
				return user.alert_time === currentTime && user.enabled === 1;
			});
			
			if (usersToNotify.length > 0) {
				// 該当するユーザーにメッセージを送信
				await Promise.all(
					usersToNotify.map(async (user: any) => {
						try {
							await fetch(getPushUrl(), {
								body: JSON.stringify({
									to: user.line_user_id,
									messages: [{
										"type": "text",
										"text": `${user.name}さん、こんばんは。今日の体調記録をお願いします。以下のURLから入力してください：\nhttps://ed6df3b3.taicho-do-31587351.pages.dev/`
									}],
								}),
								method: "POST",
								headers: {
									Authorization: `Bearer ${accessToken}`,
									"Content-Type": "application/json",
								},
							});
						} catch (error) {
							console.error(`メッセージ送信エラー (${user.line_user_id}):`, error);
						}
					})
				);
			}
		}
	} catch (error) {
		console.error('スケジュールタスクエラー:', error);
	}
}



export default {
	fetch: app.fetch,
	scheduled,
}