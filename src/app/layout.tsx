import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import './globals.css'

export const metadata: Metadata = {
  title: 'OSEMPro | Open Source Embedded Project',
  description: 'Discover, build, simulate, and debug open source embedded firmware projects in your browser.',
  applicationName: 'OSEMPro',
  icons: {
    icon: '/logo-sq.png'
  }
}

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
