import { Hono } from 'hono'
import { cors } from 'hono/cors'
import routes from './routes'

type Env = {
  DB: any // D1Database type - using any for now to avoid type issues
  GEMINI_API_KEY: string
}

const app = new Hono<{ Bindings: Env }>()

app.use('*', cors())

app.get('/', (c) => {
  return c.text('After Care API Server')
})

app.route('/api', routes)

export default app