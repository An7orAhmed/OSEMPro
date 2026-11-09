import 'dotenv/config'
import { randomUUID } from 'node:crypto'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client.ts'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  console.error('DATABASE_URL is missing')
  process.exitCode = 1
} else {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString })
  })

  let createdId: string | null = null

  try {
    const name = `osempro-smoke-${randomUUID()}`
    const project = await prisma.demoProject.create({
      data: { name, platform: 'avr' }
    })
    createdId = project.id

    const saved = await prisma.demoProject.findUnique({
      where: { id: project.id }
    })

    if (!saved || saved.name !== name || saved.platform !== 'avr') {
      throw new Error('DemoProject did not match the saved record')
    }

    await prisma.demoProject.delete({ where: { id: project.id } })
    createdId = null
    console.log('Prisma DemoProject create, read and delete passed')
  } catch (error) {
    const code = error && typeof error === 'object' && 'code' in error
      ? String(error.code)
      : 'query-error'
    console.error(`Prisma smoke test failed: ${code}`)
    process.exitCode = 1
  } finally {
    if (createdId) {
      await prisma.demoProject.delete({ where: { id: createdId } }).catch(() => {
        console.error('DemoProject cleanup failed')
        process.exitCode = 1
      })
    }
    await prisma.$disconnect()
  }
}
