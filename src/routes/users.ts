import { Hono } from 'hono'

type Env = {
  DB: any // D1Database type - using any for now to avoid type issues
}

const users = new Hono<{ Bindings: Env }>()

users.get('/', async (c) => {
  try {
    const { results } = await c.env.DB.prepare('SELECT * FROM users').all()
    return c.json(results)
  } catch (error) {
    return c.json({ error: 'Failed to fetch users' }, 500)
  }
})

users.get('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const { results } = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?')
      .bind(id)
      .all()
    
    if (results.length === 0) {
      return c.json({ error: 'User not found' }, 404)
    }
    
    return c.json(results[0])
  } catch (error) {
    return c.json({ error: 'Failed to fetch user' }, 500)
  }
})

users.post('/', async (c) => {
  try {
    const { name, account_id } = await c.req.json()
    if (!name || !account_id) {
      return c.json({ error: 'Name and account_id are required' }, 400)
    }
    
    const { success } = await c.env.DB.prepare('INSERT INTO users (name, account_id) VALUES (?, ?)')
      .bind(name, account_id)
      .run()
    
    if (success) {
      return c.json({ message: 'User created successfully' }, 201)
    } else {
      return c.json({ error: 'Failed to create user' }, 500)
    }
  } catch (error) {
    return c.json({ error: 'Failed to create user' }, 500)
  }
})

users.put('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const { name } = await c.req.json()
    
    if (!name) {
      return c.json({ error: 'Name is required' }, 400)
    }
    
    const { success } = await c.env.DB.prepare('UPDATE users SET name = ? WHERE id = ?')
      .bind(name, id)
      .run()
    
    if (success) {
      return c.json({ message: 'User updated successfully' })
    } else {
      return c.json({ error: 'Failed to update user' }, 500)
    }
  } catch (error) {
    return c.json({ error: 'Failed to update user' }, 500)
  }
})

users.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    
    const { success } = await c.env.DB.prepare('DELETE FROM users WHERE id = ?')
      .bind(id)
      .run()
    
    if (success) {
      return c.json({ message: 'User deleted successfully' })
    } else {
      return c.json({ error: 'Failed to delete user' }, 500)
    }
  } catch (error) {
    return c.json({ error: 'Failed to delete user' }, 500)
  }
})

export default users