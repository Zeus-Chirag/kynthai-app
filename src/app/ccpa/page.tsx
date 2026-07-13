import { Metadata } from 'next'
import { CcpaOptOutPage } from '@/components/kyntha/legal/privacy-policy'

export const metadata: Metadata = {
  title: 'Do Not Sell My Personal Information | Kyntha',
  description: 'CCPA/VCDPA/CDPA/UCPA/CTDPA opt-out rights — data sale and sharing preferences.',
}

export default function CcpaPage() {
  return (
    <CcpaOptOutPage />
  )
}
