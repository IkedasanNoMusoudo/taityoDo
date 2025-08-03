import { Hono } from 'hono'
import accounts from './accounts'
import users from './users'
import medications from './medications'
import medicationInstances from './medication-instances'
import records from './records'
import dashboard from './dashboard'
import reports from './reports'
import broadcast from './broadcast'

type Env = {
  DB: any // D1Database type - using any for now to avoid type issues
  LINE_CHANNEL_ACCESS_TOKEN: string
  USER_ID_MOCK: string
}

const routes = new Hono<{ Bindings: Env }>()

// API routes
routes.route('/accounts', accounts)
routes.route('/users', users)
routes.route('/medications', medications)
routes.route('/medication-instances', medicationInstances)
routes.route('/records', records)
routes.route('/dashboard', dashboard)
routes.route('/reports', reports)
routes.route('/broadcast', broadcast)

export default routes