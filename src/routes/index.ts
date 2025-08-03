import { Hono } from 'hono'
import accounts from './accounts'
import users from './users'
import medications from './medications'
import medicationInstances from './medication-instances'
import records from './records'
import dashboard from './dashboard'
import diagnosis from './diagnosis'
import { getTimeslots } from './timeslots'

type Env = {
  DB: any // D1Database type - using any for now to avoid type issues
}

const routes = new Hono<{ Bindings: Env }>()

// API routes
routes.route('/accounts', accounts)
routes.route('/users', users)
routes.route('/medications', medications)
routes.route('/medication-instances', medicationInstances)
routes.route('/records', records)
routes.route('/dashboard', dashboard)
routes.route('/diagnosis', diagnosis)
routes.get('/timeslots', getTimeslots)

export default routes