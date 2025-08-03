import { Hono } from 'hono'
import { cors } from 'hono/cors'
import routes from './routes'
import webhook from './routes/webhook'

type Env = {
  DB: any // D1Database type - using any for now to avoid type issues
  GEMINI_API_KEY: string
  LINE_CHANNEL_ACCESS_TOKEN: string
  USER_ID_MOCK: string
}

const app = new Hono<{ Bindings: Env }>()

app.use('*', cors())

app.get('/', (c) => {
  return c.text('After Care API Server')
})

app.route('/api', routes)

// Webhook endpoint
app.post('/webhook', async (c) => {
  return webhook.fetch(c.req.raw, c.env, c.executionCtx)
})

export default {
  fetch: app.fetch,
  scheduled: webhook.scheduled,
}