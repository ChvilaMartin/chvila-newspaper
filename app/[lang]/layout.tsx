import type { Metadata } from 'next'
import '../globals.css'

export async function generateStaticParams() {
  return [{ lang: 'en' }, { lang: 'cs' }]
}

export const metadata: Metadata = {
  title: 'Martin Chvila',
  description: 'Founder, Software Engineer & AI Integrator',
}

export default async function RootLayout({
  children,
  params,
}: LayoutProps<'/[lang]'>) {
  return (
    <html lang={(await params).lang}>
      <body>{children}</body>
    </html>
  )
}
