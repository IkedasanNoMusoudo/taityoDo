import { Hono } from 'hono'

type Env = {
  DB: any // D1Database type - using any for now to avoid type issues
}

const medications = new Hono<{ Bindings: Env }>()

medications.get('/', async (c) => {
  try {
    const { results } = await c.env.DB.prepare('SELECT * FROM medications').all()
    return c.json(results)
  } catch (error) {
    return c.json({ error: 'Failed to fetch medications' }, 500)
  }
})

medications.get('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const { results } = await c.env.DB.prepare('SELECT * FROM medications WHERE id = ?')
      .bind(id)
      .all()
    
    if (results.length === 0) {
      return c.json({ error: 'Medication not found' }, 404)
    }
    
    return c.json(results[0])
  } catch (error) {
    return c.json({ error: 'Failed to fetch medication' }, 500)
  }
})

medications.post('/', async (c) => {
  try {
    const { name } = await c.req.json()
    if (!name) {
      return c.json({ error: 'Name is required' }, 400)
    }
    
    const { success } = await c.env.DB.prepare('INSERT INTO medications (name) VALUES (?)')
      .bind(name)
      .run()
    
    if (success) {
      return c.json({ message: 'Medication created successfully' }, 201)
    } else {
      return c.json({ error: 'Failed to create medication' }, 500)
    }
  } catch (error) {
    return c.json({ error: 'Failed to create medication' }, 500)
  }
})

medications.put('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const { name } = await c.req.json()
    
    if (!name) {
      return c.json({ error: 'Name is required' }, 400)
    }
    
    const { success } = await c.env.DB.prepare('UPDATE medications SET name = ? WHERE id = ?')
      .bind(name, id)
      .run()
    
    if (success) {
      return c.json({ message: 'Medication updated successfully' })
    } else {
      return c.json({ error: 'Failed to update medication' }, 500)
    }
  } catch (error) {
    return c.json({ error: 'Failed to update medication' }, 500)
  }
})

medications.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    
    const { success } = await c.env.DB.prepare('DELETE FROM medications WHERE id = ?')
      .bind(id)
      .run()
    
    if (success) {
      return c.json({ message: 'Medication deleted successfully' })
    } else {
      return c.json({ error: 'Failed to delete medication' }, 500)
    }
  } catch (error) {
    return c.json({ error: 'Failed to delete medication' }, 500)
  }
})

export default medications