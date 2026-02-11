import dotenv from 'dotenv'
import express from 'express'
import cors from 'cors'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import multer from 'multer'
import rateLimit from 'express-rate-limit'
import mysql from 'mysql2/promise'
import { parse } from 'csv-parse/sync'

dotenv.config()

const app = express()

const {
  PORT = 3001,
  DB_HOST = 'localhost',
  DB_USER = 'root',
  DB_PASSWORD = '',
  DB_NAME = 'party_invite',
  DB_PORT = 3306,
  JWT_SECRET = 'change_me',
  FRONTEND_ORIGIN = 'http://localhost:5173'
} = process.env

const pool = mysql.createPool({
  host: DB_HOST,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  port: Number(DB_PORT),
  waitForConnections: true,
  connectionLimit: 10
})

app.use(cors({ origin: FRONTEND_ORIGIN }))
app.use(express.json({ limit: '1mb' }))

const rsvpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50
})

const upload = multer({ storage: multer.memoryStorage() })

const authMiddleware = (req, res, next) => {
  const header = req.headers.authorization
  if (!header) return res.status(401).send('Missing authorization')
  const token = header.replace('Bearer ', '')
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    req.admin = payload
    return next()
  } catch (err) {
    return res.status(401).send('Invalid token')
  }
}

app.get('/api/event', async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM event_settings WHERE id = 1')
  res.json(rows[0])
})

app.get('/api/food-choices', async (req, res) => {
  const [rows] = await pool.query(
    'SELECT id, label FROM food_choices WHERE active = 1 ORDER BY id'
  )
  res.json(rows)
})

app.post('/api/rsvp', rsvpLimiter, async (req, res) => {
  const { invite_name_entered, phone, children } = req.body || {}
  if (!invite_name_entered || !phone || !Array.isArray(children)) {
    return res.status(400).send('Missing required fields')
  }
  if (children.length === 0) {
    return res.status(400).send('At least one child is required')
  }
  if (
    children.some(
      (child) =>
        !child.child_name ||
        !child.food_choice_id ||
        Number.isNaN(Number(child.food_choice_id))
    )
  ) {
    return res.status(400).send('Invalid child entries')
  }

  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    const [result] = await connection.query(
      'INSERT INTO rsvps (invite_name_entered, phone) VALUES (?, ?)',
      [invite_name_entered, phone]
    )
    const rsvpId = result.insertId

    for (const child of children) {
      await connection.query(
        'INSERT INTO rsvp_children (rsvp_id, child_name, food_choice_id) VALUES (?, ?, ?)',
        [rsvpId, child.child_name, child.food_choice_id]
      )
    }

    await connection.commit()

    res.json({ ok: true })
  } catch (err) {
    await connection.rollback()
    res.status(500).send('Failed to save RSVP')
  } finally {
    connection.release()
  }
})

app.post('/api/admin/login', async (req, res) => {
  const { email, password } = req.body || {}
  if (!email || !password) return res.status(400).send('Missing credentials')

  const [rows] = await pool.query('SELECT * FROM admins WHERE email = ?', [
    email
  ])
  const admin = rows[0]
  if (!admin) return res.status(401).send('Invalid credentials')

  const ok = await bcrypt.compare(password, admin.password_hash)
  if (!ok) return res.status(401).send('Invalid credentials')

  const token = jwt.sign(
    { id: admin.id, email: admin.email },
    JWT_SECRET,
    { expiresIn: '7d' }
  )
  res.json({ token })
})

app.get('/api/admin/event', authMiddleware, async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM event_settings WHERE id = 1')
  res.json(rows[0])
})

app.put('/api/admin/event', authMiddleware, async (req, res) => {
  const { title, event_date, party_time, intro_text, location } = req.body || {}
  if (!title || !event_date || !party_time || !intro_text || !location) {
    return res.status(400).send('Missing event details')
  }
  await pool.query(
    'UPDATE event_settings SET title = ?, event_date = ?, party_time = ?, intro_text = ?, location = ? WHERE id = 1',
    [title, event_date, party_time, intro_text, location]
  )
  const [rows] = await pool.query('SELECT * FROM event_settings WHERE id = 1')
  res.json(rows[0])
})

app.get('/api/admin/food-choices', authMiddleware, async (req, res) => {
  const [rows] = await pool.query(
    'SELECT id, label, active FROM food_choices ORDER BY id'
  )
  res.json(rows)
})

app.post('/api/admin/food-choices', authMiddleware, async (req, res) => {
  const { label } = req.body || {}
  if (!label) return res.status(400).send('Label required')
  const [result] = await pool.query(
    'INSERT INTO food_choices (label, active) VALUES (?, 1)',
    [label]
  )
  const [rows] = await pool.query('SELECT * FROM food_choices WHERE id = ?', [
    result.insertId
  ])
  res.json(rows[0])
})

app.put('/api/admin/food-choices/:id', authMiddleware, async (req, res) => {
  const { id } = req.params
  const { label, active } = req.body || {}
  await pool.query(
    'UPDATE food_choices SET label = ?, active = ? WHERE id = ?',
    [label, active ? 1 : 0, id]
  )
  const [rows] = await pool.query('SELECT * FROM food_choices WHERE id = ?', [
    id
  ])
  res.json(rows[0])
})

app.delete('/api/admin/food-choices/:id', authMiddleware, async (req, res) => {
  const { id } = req.params
  await pool.query('DELETE FROM food_choices WHERE id = ?', [id])
  res.json({ ok: true })
})

app.get('/api/admin/invites', authMiddleware, async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM invites ORDER BY created_at')
  res.json(rows)
})

app.post(
  '/api/admin/invites/import',
  authMiddleware,
  upload.single('file'),
  async (req, res) => {
    if (!req.file) return res.status(400).send('Missing file')
    const content = req.file.buffer.toString('utf-8')
    const records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    })

    let inserted = 0
    let skipped = 0

    for (const record of records) {
      const inviteName = record.invite_name || record.name
      if (!inviteName) {
        skipped += 1
        continue
      }
      const [result] = await pool.query(
        'INSERT IGNORE INTO invites (invite_name, phone) VALUES (?, ?)',
        [inviteName, record.phone || null]
      )
      if (result.affectedRows === 1) inserted += 1
      else skipped += 1
    }

    res.json({ inserted, skipped })
  }
)

app.get('/api/admin/rsvps', authMiddleware, async (req, res) => {
  const [rsvpRows] = await pool.query(
    'SELECT * FROM rsvps ORDER BY created_at DESC'
  )
  const [childRows] = await pool.query(
    `SELECT rc.*, fc.label AS food_choice_label
     FROM rsvp_children rc
     JOIN food_choices fc ON rc.food_choice_id = fc.id`
  )

  const childrenByRsvp = childRows.reduce((acc, row) => {
    acc[row.rsvp_id] = acc[row.rsvp_id] || []
    acc[row.rsvp_id].push(row)
    return acc
  }, {})

  const payload = rsvpRows.map((rsvp) => ({
    ...rsvp,
    children: childrenByRsvp[rsvp.id] || []
  }))

  res.json(payload)
})

app.get('/api/admin/metrics', authMiddleware, async (req, res) => {
  const [[{ invited }]] = await pool.query(
    'SELECT COUNT(*) AS invited FROM invites'
  )
  const [[{ rsvps }]] = await pool.query(
    'SELECT COUNT(*) AS rsvps FROM rsvps'
  )
  const [foodRows] = await pool.query(
    `SELECT fc.label, COUNT(rc.id) AS count
     FROM food_choices fc
     LEFT JOIN rsvp_children rc ON rc.food_choice_id = fc.id
     GROUP BY fc.id
     ORDER BY fc.id`
  )

  res.json({ invited, rsvps, foodTotals: foodRows })
})

app.listen(Number(PORT), () => {
  console.log(`API running on port ${PORT}`)
})
