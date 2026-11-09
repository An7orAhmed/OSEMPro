import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import EngineLabPage from './EngineLabPage'
import './engine-lab.css'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Engine Lab | OSEMPro',
  robots: { index: false, follow: false }
}

export default function Page() {
  if (process.env.NODE_ENV !== 'development') notFound()
  return <EngineLabPage />
}
