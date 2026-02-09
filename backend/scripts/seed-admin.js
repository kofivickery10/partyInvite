import dotenv from 'dotenv'
import bcrypt from 'bcryptjs'
import mysql from 'mysql2/promise'

dotenv.config()

const {
  DB_HOST = 'localhost',
  DB_USER = 'root',
  DB_PASSWORD = '',
  DB_NAME = 'party_invite',
  DB_PORT = 3306,
  ADMIN_EMAIL,
  ADMIN_PASSWORD
} = process.env

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('Missing ADMIN_EMAIL or ADMIN_PASSWORD')
  process.exit(1)
}

const run = async () => {
  const pool = await mysql.createPool({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    port: Number(DB_PORT)
  })

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10)
  await pool.query(
    `INSERT INTO admins (email, password_hash)
     VALUES (?, ?)
     ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)`,
    [ADMIN_EMAIL, passwordHash]
  )

  console.log(`Admin seeded for ${ADMIN_EMAIL}`)
  await pool.end()
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
