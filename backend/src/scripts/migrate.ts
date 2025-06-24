import { Database } from '../database/database.ts'

console.log('🔄 Running database migrations...')

const db = new Database()
await db.init()

console.log('✅ Database migrations completed!')

db.close()
