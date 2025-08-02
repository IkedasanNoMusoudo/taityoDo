import { Hono } from 'hono'

type Env = {
  DB: any // D1Database type - using any for now to avoid type issues
}

const accounts = new Hono<{ Bindings: Env }>()

accounts.get('/', async (c) => {
  try {
    const { results } = await c.env.DB.prepare('SELECT id, email FROM accounts').all()
    return c.json(results)
  } catch (error) {
    return c.json({ error: 'Failed to fetch accounts' }, 500)
  }
})

accounts.post('/', async (c) => {
  try {
    const { email, hashed_password } = await c.req.json()
    if (!email || !hashed_password) {
      return c.json({ error: 'Email and hashed_password are required' }, 400)
    }
    
    const { success } = await c.env.DB.prepare('INSERT INTO accounts (email, hashed_password) VALUES (?, ?)')
      .bind(email, hashed_password)
      .run()
    
    if (success) {
      return c.json({ message: 'Account created successfully' }, 201)
    } else {
      return c.json({ error: 'Failed to create account' }, 500)
    }
  } catch (error) {
    return c.json({ error: 'Failed to create account' }, 500)
  }
})

export default accounts