import { Metadata } from 'next'
import NotFoundClient from './not-found-client'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Page not found — Kyntha',
  description: 'The page you are looking for does not exist on Kyntha.com.',
  robots: { index: false, follow: true },
}

export default function NotFound() {
  return <NotFoundClient />
}