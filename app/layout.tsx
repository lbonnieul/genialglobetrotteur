import type { Metadata } from 'next'
import './globals.css'
import { Navbar } from '@/components/Navbar'

export const metadata: Metadata = {
  title: 'Genial Globe-Trotter',
  description: 'Tracker de parties LoL par région de Runeterra',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <div className="page">
          <Navbar />
          {children}
        </div>
      </body>
    </html>
  )
}
