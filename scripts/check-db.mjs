import 'dotenv/config'
import pg from 'pg'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  console.error('DATABASE_URL is missing')
  process.exitCode = 1
} else {
  const client = new pg.Client({
    connectionString,
    connectionTimeoutMillis: 8000
  })

  try {
    await client.connect()
    const result = await client.query(
      'SELECT current_database() AS database, current_user AS role, current_setting($1) AS version',
      ['server_version']
    )
    const { database, role, version } = result.rows[0]
    console.log(`PostgreSQL connected: database=${database}, role=${role}, version=${version}`)
  } catch (error) {
    const code = error && typeof error === 'object' && 'code' in error
      ? String(error.code)
      : 'unknown'
    console.error(`PostgreSQL connection failed: ${code}`)
    process.exitCode = 1
  } finally {
    await client.end().catch(() => {})
  }
}
