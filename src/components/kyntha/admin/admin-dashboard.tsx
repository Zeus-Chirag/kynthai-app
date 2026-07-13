'use client'

import * as React from 'react'
import {
  Stethoscope,
  Microscope,
  AlertTriangle,
  TrendingDown,
  ShieldAlert,
  Sun,
  Moon,
  CheckCircle2,
  XCircle,
  FileText,
  Clock,
  Loader2,
  Users,
  Wallet,
  TrendingUp,
  Banknote,
  Receipt,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { PRICING } from '@/lib/currency'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { useTheme } from 'next-themes'
import { useToast } from '@/hooks/use-toast'
import { KynthaBrand } from '@/components/kyntha/logo'
import { useAppStore, type AuthUser } from '@/lib/store'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  DOCTOR_BASE_FEE_PCT,
  LAB_BASE_FEE_PCT,
  LOYALTY_TIERS,
  type LoyaltyTier,
  resolveTier,
  effectiveFeePct,
  platformFee,
  PAYOUT_POLICY,
} from '@/lib/commission'

type AdminTab = 'revenue' | 'doctors' | 'labs' | 'retention' | 'fraud'

interface DoctorApp {
  id: string
  name: string
  email: string
  specialization: string
  licenseNumber: string
  city: string
  experience: number
  fee: number
  status: 'pending' | 'approved' | 'rejected'
  submittedAt: string
  documents: { name: string; type: string }[]
}

interface LabApp {
  id: string
  labName: string
  email: string
  licenseNumber: string
  city: string
  testCount: number
  status: 'pending' | 'approved' | 'rejected'
  submittedAt: string
  documents: { name: string; type: string }[]
}

const DOCTOR_APPS: DoctorApp[] = [
  {
    id: 'da1',
    name: 'Dr. Sarah Johnson',
    email: 'sarah.johnson@example.com',
    specialization: 'Family Medicine',
    licenseNumber: 'USMD-12345',
    city: 'Austin, TX',
    experience: 12,
    fee: 150,
    status: 'pending',
    submittedAt: '2 hours ago',
    documents: [
      { name: 'Medical_License.pdf', type: 'PDF' },
      { name: 'Degree.jpg', type: 'JPG' },
      { name: 'Govt_ID.pdf', type: 'PDF' },
      { name: 'Photo.jpg', type: 'JPG' },
    ],
  },
  {
    id: 'da2',
    name: 'Dr. Michael Chen',
    email: 'michael.chen@example.com',
    specialization: 'Internal Medicine',
    licenseNumber: 'USMD-98765',
    city: 'Chicago, IL',
    experience: 18,
    fee: 200,
    status: 'pending',
    submittedAt: '5 hours ago',
    documents: [
      { name: 'Medical_License.pdf', type: 'PDF' },
      { name: 'Degree.pdf', type: 'PDF' },
    ],
  },
  {
    id: 'da3',
    name: 'Dr. Emily Rodriguez',
    email: 'emily.rodriguez@example.com',
    specialization: 'Dermatology',
    licenseNumber: 'USMD-55443',
    city: 'San Francisco, CA',
    experience: 9,
    fee: 175,
    status: 'approved',
    submittedAt: '2 days ago',
    documents: [{ name: 'License.pdf', type: 'PDF' }],
  },
]

const LAB_APPS: LabApp[] = [
  {
    id: 'la1',
    labName: 'HealthStreet Labs',
    email: 'labs@healthstreet.example.com',
    licenseNumber: 'CLIA-1111',
    city: 'Austin, TX',
    testCount: 24,
    status: 'pending',
    submittedAt: '1 hour ago',
    documents: [
      { name: 'CLIA_Certificate.pdf', type: 'PDF' },
      { name: 'Business_Insurance.pdf', type: 'PDF' },
    ],
  },
  {
    id: 'la2',
    labName: 'National Diagnostic Network',
    email: 'ops@ndn.example.com',
    licenseNumber: 'CLIA-2222',
    city: 'Dallas, TX',
    testCount: 48,
    status: 'approved',
    submittedAt: '3 days ago',
    documents: [{ name: 'License.pdf', type: 'PDF' }],
  },
]

const CHURN_RISKS: { id: string; name: string; tier: string; days: number; reason: string; risk: 'high' | 'medium' | 'low' }[] = [
  { id: 'c1', name: 'Patient Jordan', tier: 'plus', days: 12, reason: 'No AI chats in 12 days', risk: 'high' },
  { id: 'c2', name: 'Patient Taylor', tier: 'free', days: 8, reason: 'Skipped 5 doses this week', risk: 'medium' },
  { id: 'c3', name: 'Patient Morgan', tier: 'plus', days: 5, reason: 'No medication adds', risk: 'low' },
]

const FRAUD_FLAGS: { id: string; entity: string; type: string; issue: string; severity: 'high' | 'medium' | 'low'; time: string }[] = [
  { id: 'f1', entity: 'Dr. Imran', type: 'Doctor', issue: 'License number not found in registry', severity: 'high', time: '3h ago' },
  { id: 'f2', entity: 'QuickLab', type: 'Lab', issue: 'Duplicate CLIA certificate', severity: 'high', time: '6h ago' },
  { id: 'f3', entity: 'Patient X', type: 'Patient', issue: 'Multiple accounts (same phone)', severity: 'medium', time: '1d ago' },
]

/* ------------------ Owner-level revenue model (demo data) ------------------ */
// In production these numbers come from aggregations over Payment + Appointment
// + LabBooking + MedicineOrder rows. The shape below mirrors what the owner
// dashboard would render against the real DB.

interface PartnerRevenueRow {
  id: string
  name: string
  type: 'Doctor' | 'Lab'
  lifetimeOrders: number
  grossUsd: number
  tier: LoyaltyTier
}

const PARTNER_REVENUE: PartnerRevenueRow[] = [
  { id: 'pr1', name: 'Dr. Anjali Mehta', type: 'Doctor', lifetimeOrders: 212, grossUsd: 18400, tier: resolveTier(212) },
  { id: 'pr2', name: 'Dr. Rajiv Khanna', type: 'Doctor', lifetimeOrders: 91, grossUsd: 9600, tier: resolveTier(91) },
  { id: 'pr3', name: 'Dr. Sara Pinto', type: 'Doctor', lifetimeOrders: 24, grossUsd: 1850, tier: resolveTier(24) },
  { id: 'pr4', name: 'MediTest Labs', type: 'Lab', lifetimeOrders: 178, grossUsd: 14200, tier: resolveTier(178) },
  { id: 'pr5', name: 'NorthInd PathLabs', type: 'Lab', lifetimeOrders: 322, grossUsd: 26800, tier: resolveTier(322) },
  { id: 'pr6', name: 'QuickLab', type: 'Lab', lifetimeOrders: 33, grossUsd: 2850, tier: resolveTier(33) },
]

// Subscription revenue (patient side) — monthly recurring.
// Uses USD pricing.
const SUB_REVENUE = {
  plusCount: 420,
  plusMonthlyUsd: 420 * PRICING.USD.plus.monthly,  // $9.99/month
  familyProCount: 130,
  familyProMonthlyUsd: 130 * PRICING.USD.family_pro.monthly,  // $19.99/month
}

export function AdminDashboard({ user }: { user: AuthUser }) {
  const { theme, setTheme } = useTheme()
  const { logout, setScreen } = useAppStore()
  const router = useRouter()
  const isDemo = !!user.isDemo
  const [tab, setTab] = React.useState<AdminTab>('revenue')
  const [reviewApp, setReviewApp] = React.useState<DoctorApp | LabApp | null>(null)
  const [reviewType, setReviewType] = React.useState<'doctor' | 'lab' | null>(null)

  const pendingDoctors = DOCTOR_APPS.filter((d) => d.status === 'pending').length
  const pendingLabs = LAB_APPS.filter((l) => l.status === 'pending').length
  const activeDoctors = DOCTOR_APPS.filter((d) => d.status === 'approved').length
  const churnCount = CHURN_RISKS.length
  const fraudCount = FRAUD_FLAGS.length

  // ---- Owner-level revenue aggregations ----
  const doctorCommission = PARTNER_REVENUE.filter((p) => p.type === 'Doctor').reduce(
    (s, p) => s + platformFee(p.grossUsd, effectiveFeePct(DOCTOR_BASE_FEE_PCT, p.tier)),
    0
  )
  const labCommission = PARTNER_REVENUE.filter((p) => p.type === 'Lab').reduce(
    (s, p) => s + platformFee(p.grossUsd, effectiveFeePct(LAB_BASE_FEE_PCT, p.tier)),
    0
  )
  const totalPartnerGross = PARTNER_REVENUE.reduce((s, p) => s + p.grossUsd, 0)
  const platformCommission = doctorCommission + labCommission
  const subscriptionMrr = SUB_REVENUE.plusMonthlyUsd + SUB_REVENUE.familyProMonthlyUsd
  const totalMrr = platformCommission / 12 + subscriptionMrr / 12
  const avgTakeRate = totalPartnerGross > 0 ? (platformCommission / totalPartnerGross) * 100 : 0

  const openReview = (app: DoctorApp | LabApp, type: 'doctor' | 'lab') => {
    setReviewApp(app)
    setReviewType(type)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50/40 via-background to-background dark:from-emerald-950/20">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border/40 bg-background/70 backdrop-blur-xl pt-safe">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <KynthaBrand iconSize={24} />
            <Avatar className="h-10 w-10 ring-2 ring-emerald-500/20">
              <AvatarFallback className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white font-semibold">
                {(user.name?.[0] ?? 'A').toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-xs text-muted-foreground leading-tight">Admin Console</p>
              <p className="text-sm font-semibold leading-tight">{user.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <ShieldAlert className="h-3 w-3" />
              Super admin
            </Badge>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              title="Toggle theme" aria-label="Toggle dark mode"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => router.push('/login')}
              title="Switch portal"
            >
              Switch
            </Button>
            <Button size="sm" variant="outline" onClick={logout}>
              Sign out
            </Button>
          </div>
        </div>
      </header>

      {/* Demo banner */}
      {isDemo && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-1.5 text-center text-[11px] text-amber-700 dark:text-amber-300">
          Demo mode — sample data, changes won&apos;t be saved
        </div>
      )}

      <main id="main-content" className="mx-auto max-w-5xl px-4 pb-12 pt-4 space-y-5">
        {/* Stats — owner view: revenue first */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            icon={<Wallet className="h-4 w-4" />}
            label="Platform revenue"
            value={`$${(platformCommission / 1000).toFixed(0)}K`}
            sub={`avg take ${avgTakeRate.toFixed(1)}%`}
            tint="emerald"
          />
          <StatCard
            icon={<Stethoscope className="h-4 w-4" />}
            label="Doctors pending"
            value={pendingDoctors}
            sub={`${activeDoctors} active`}
            tint="teal"
          />
          <StatCard
            icon={<Microscope className="h-4 w-4" />}
            label="Labs pending"
            value={pendingLabs}
            sub={`${LAB_APPS.length} total`}
            tint="amber"
          />
          <StatCard
            icon={<AlertTriangle className="h-4 w-4" />}
            label="Fraud flags"
            value={fraudCount}
            sub={`${churnCount} churn risks`}
            tint="rose"
          />
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as AdminTab)} className="w-full">
          {/* Mobile: 2-col grid so labels stay readable; sm+: 5-col strip */}
          <TabsList className="grid w-full grid-cols-3 sm:grid-cols-5 h-auto p-1 gap-1">
            <TabsTrigger value="revenue" className="py-1.5 text-xs col-span-3 sm:col-span-1">
              <Wallet className="h-3.5 w-3.5" />
              Revenue
            </TabsTrigger>
            <TabsTrigger value="doctors" className="py-1.5 text-xs">
              <Stethoscope className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Doctors</span>
            </TabsTrigger>
            <TabsTrigger value="labs" className="py-1.5 text-xs">
              <Microscope className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Labs</span>
            </TabsTrigger>
            <TabsTrigger value="retention" className="py-1.5 text-xs">
              <Users className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Retention</span>
            </TabsTrigger>
            <TabsTrigger value="fraud" className="py-1.5 text-xs">
              <ShieldAlert className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Fraud</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="revenue" className="mt-4">
            <RevenueTab
              platformCommission={platformCommission}
              doctorCommission={doctorCommission}
              labCommission={labCommission}
              totalPartnerGross={totalPartnerGross}
              subscriptionMrr={subscriptionMrr}
              totalMrr={totalMrr}
              avgTakeRate={avgTakeRate}
              partners={PARTNER_REVENUE}
            />
          </TabsContent>

          <TabsContent value="doctors" className="mt-4">
            <ApplicationsTab
              title="Doctor applications"
              apps={DOCTOR_APPS.map((d) => ({
                id: d.id,
                name: d.name,
                subtitle: d.specialization,
                meta: `${d.city} · ${d.experience}y exp · $${d.fee}`,
                license: d.licenseNumber,
                status: d.status,
                submittedAt: d.submittedAt,
                documents: d.documents,
              }))}
              onReview={(id) => {
                const app = DOCTOR_APPS.find((d) => d.id === id)
                if (app) openReview(app, 'doctor')
              }}
            />
          </TabsContent>

          <TabsContent value="labs" className="mt-4">
            <ApplicationsTab
              title="Lab applications"
              apps={LAB_APPS.map((l) => ({
                id: l.id,
                name: l.labName,
                subtitle: `${l.testCount} tests`,
                meta: `${l.city} · NABL: ${l.licenseNumber}`,
                license: l.licenseNumber,
                status: l.status,
                submittedAt: l.submittedAt,
                documents: l.documents,
              }))}
              onReview={(id) => {
                const app = LAB_APPS.find((l) => l.id === id)
                if (app) openReview(app, 'lab')
              }}
            />
          </TabsContent>

          <TabsContent value="retention" className="mt-4">
            <RetentionTab risks={CHURN_RISKS} />
          </TabsContent>

          <TabsContent value="fraud" className="mt-4">
            <FraudTab flags={FRAUD_FLAGS} />
          </TabsContent>
        </Tabs>
      </main>

      <ReviewDialog
        app={reviewApp}
        type={reviewType}
        onClose={() => {
          setReviewApp(null)
          setReviewType(null)
        }}
      />
    </div>
  )
}

/* ------------------------------- Revenue tab -------------------------------- */

function RevenueTab({
  platformCommission,
  doctorCommission,
  labCommission,
  totalPartnerGross,
  subscriptionMrr,
  totalMrr,
  avgTakeRate,
  partners,
}: {
  platformCommission: number
  doctorCommission: number
  labCommission: number
  totalPartnerGross: number
  subscriptionMrr: number
  totalMrr: number
  avgTakeRate: number
  partners: PartnerRevenueRow[]
}) {
  const fmtUsd = (n: number) => `${n.toLocaleString('en-US')}`
  const doctorShare = platformCommission > 0 ? (doctorCommission / platformCommission) * 100 : 0
  const labShare = platformCommission > 0 ? (labCommission / platformCommission) * 100 : 0

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold flex items-center gap-2">
          <Wallet className="h-4 w-4 text-emerald-600" />
          Platform revenue
        </h2>
        <p className="text-xs text-muted-foreground">
          Owner view — commission from partners + subscription MRR from patients.
        </p>
      </div>

      {/* Headline cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Wallet className="h-3.5 w-3.5" />
              </span>
              <span className="font-medium truncate">Commission (FY)</span>
            </div>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{fmtUsd(platformCommission)}</div>
            <p className="text-[11px] text-muted-foreground mt-1">From partners</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                <TrendingUp className="h-3.5 w-3.5" />
              </span>
              <span className="font-medium truncate">Avg take rate</span>
            </div>
            <div className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">{avgTakeRate.toFixed(1)}%</div>
            <p className="text-[11px] text-muted-foreground mt-1">Blended</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-teal-500/10 text-teal-600 dark:text-teal-400">
                <Receipt className="h-3.5 w-3.5" />
              </span>
              <span className="font-medium truncate">Sub MRR</span>
            </div>
            <div className="text-2xl font-bold text-teal-600 dark:text-teal-400">{fmtUsd(subscriptionMrr)}</div>
            <p className="text-[11px] text-muted-foreground mt-1">Patient subscriptions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Banknote className="h-3.5 w-3.5" />
              </span>
              <span className="font-medium truncate">Est. total MRR</span>
            </div>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{fmtUsd(Math.round(totalMrr))}</div>
            <p className="text-[11px] text-muted-foreground mt-1">Commission ÷ 12 + subs</p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue split card */}
      <Card>
        <CardContent className="p-4 sm:p-5">
          <h3 className="text-sm font-semibold mb-3">Commission split by partner type</h3>
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="flex items-center gap-1.5">
                  <Stethoscope className="h-3 w-3 text-emerald-600" />
                  Doctors ({DOCTOR_BASE_FEE_PCT}% base fee)
                </span>
                <span className="font-semibold">{fmtUsd(doctorCommission)} · {doctorShare.toFixed(0)}%</span>
              </div>
              <Progress value={doctorShare} className="h-2" />
            </div>
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="flex items-center gap-1.5">
                  <Microscope className="h-3 w-3 text-teal-600" />
                  Labs ({LAB_BASE_FEE_PCT}% base fee)
                </span>
                <span className="font-semibold">{fmtUsd(labCommission)} · {labShare.toFixed(0)}%</span>
              </div>
              <Progress value={labShare} className="h-2" />
            </div>
          </div>
          <Separator className="my-4" />
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Total partner gross processed</span>
            <span className="font-semibold">{fmtUsd(totalPartnerGross)}</span>
          </div>
          <div className="flex items-center justify-between text-xs mt-1">
            <span className="text-muted-foreground">Total platform commission</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">{fmtUsd(platformCommission)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Partner leaderboard */}
      <Card>
        <CardContent className="p-4 sm:p-5">
          <h3 className="text-sm font-semibold mb-3">Top partners by gross volume</h3>
          <div className="space-y-2">
            {partners
              .slice()
              .sort((a, b) => b.grossUsd - a.grossUsd)
              .map((p) => {
                const baseFee = p.type === 'Doctor' ? DOCTOR_BASE_FEE_PCT : LAB_BASE_FEE_PCT
                const effFee = effectiveFeePct(baseFee, p.tier)
                const fee = platformFee(p.grossUsd, effFee)
                return (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 rounded-xl border border-border/60 p-3"
                  >
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarFallback className={cn(
                        'bg-gradient-to-br text-white text-xs',
                        p.type === 'Doctor' ? 'from-emerald-500 to-teal-600' : 'from-teal-500 to-emerald-600'
                      )}>
                        {p.name.replace(/^Dr\.\s*/, '')[0] ?? 'P'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium truncate">{p.name}</p>
                        <Badge variant="outline" className="text-[10px]">{p.type}</Badge>
                        <Badge
                          variant="secondary"
                          className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        >
                          {LOYALTY_TIERS[p.tier].icon} {p.tier}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {p.lifetimeOrders} orders · fee {effFee}% (-{baseFee - effFee}% loyalty)
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold">{fmtUsd(p.grossUsd)}</p>
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400">+{fmtUsd(fee)} fee</p>
                    </div>
                  </div>
                )
              })}
          </div>
        </CardContent>
      </Card>

      {/* Payout policy reminder */}
      <Card className="border-dashed">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Banknote className="h-4 w-4" />
            </span>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold">Payout policy</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Partners are paid on a <span className="font-medium text-foreground">{PAYOUT_POLICY.cadence}</span> schedule
                with a minimum of <span className="font-medium text-foreground">${PAYOUT_POLICY.minPayoutUsd}</span> via{' '}
                {PAYOUT_POLICY.methods.join(', ')}. Withholding tax deducted per US tax law.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

/* ----------------------------- Applications tab ----------------------------- */

interface AppRow {
  id: string
  name: string
  subtitle: string
  meta: string
  license: string
  status: 'pending' | 'approved' | 'rejected'
  submittedAt: string
  documents: { name: string; type: string }[]
}

function ApplicationsTab({
  title,
  apps,
  onReview,
}: {
  title: string
  apps: AppRow[]
  onReview: (id: string) => void
}) {
  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="text-xs text-muted-foreground">Review applications and approve or reject.</p>
      </div>
      {apps.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <CheckCircle2 className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>No applications to review.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {apps.map((a) => (
            <Card key={a.id} className={cn(a.status === 'pending' && 'ring-1 ring-amber-500/30')}>
              <CardContent className="p-3">
                <div className="flex items-start gap-3">
                  <Avatar className="h-11 w-11 shrink-0">
                    <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                      {a.name.replace(/^Dr\.\s*/, '')[0] ?? 'A'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-sm">{a.name}</h3>
                      <StatusBadge status={a.status} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{a.subtitle}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{a.meta}</p>
                    <div className="flex items-center gap-2 mt-2 text-[11px] text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      Submitted {a.submittedAt}
                      <span>·</span>
                      <FileText className="h-3 w-3" />
                      {a.documents.length} docs
                    </div>
                  </div>
                  {a.status === 'pending' && (
                    <Button size="sm" onClick={() => onReview(a.id)} className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
                      Review
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

/* ------------------------------- Retention tab ------------------------------ */

function RetentionTab({
  risks,
}: {
  risks: { id: string; name: string; tier: string; days: number; reason: string; risk: 'high' | 'medium' | 'low' }[]
}) {
  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-base font-semibold">Churn risks</h2>
        <p className="text-xs text-muted-foreground">
          Users showing signs of disengagement in the last 7 days.
        </p>
      </div>
      {risks.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <CheckCircle2 className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>No churn risks detected.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {risks.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-3 flex items-center gap-3">
                <span className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                  r.risk === 'high'
                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                    : r.risk === 'medium'
                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                      : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                )}>
                  <TrendingDown className="h-5 w-5" />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-sm">{r.name}</h3>
                    <Badge variant="secondary" className="text-[10px] capitalize">{r.tier}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{r.reason}</p>
                </div>
                <div className="text-right">
                  <Badge
                    variant="secondary"
                    className={cn(
                      'text-[10px] capitalize',
                      r.risk === 'high' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' :
                      r.risk === 'medium' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                      'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    )}
                  >
                    {r.risk} risk
                  </Badge>
                  <p className="text-[11px] text-muted-foreground mt-1">{r.days}d inactive</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

/* -------------------------------- Fraud tab -------------------------------- */

function FraudTab({
  flags,
}: {
  flags: { id: string; entity: string; type: string; issue: string; severity: 'high' | 'medium' | 'low'; time: string }[]
}) {
  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-base font-semibold">Fraud flags</h2>
        <p className="text-xs text-muted-foreground">
          Automated flags requiring manual review.
        </p>
      </div>
      {flags.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <CheckCircle2 className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>No fraud flags. All clear.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {flags.map((f) => (
            <Card key={f.id} className={cn(f.severity === 'high' && 'ring-1 ring-rose-500/30')}>
              <CardContent className="p-3 flex items-center gap-3">
                <span className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                  f.severity === 'high'
                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                    : f.severity === 'medium'
                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                      : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                )}>
                  <ShieldAlert className="h-5 w-5" />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-sm">{f.entity}</h3>
                    <Badge variant="outline" className="text-[10px]">{f.type}</Badge>
                    <span className="text-[11px] text-muted-foreground">{f.time}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{f.issue}</p>
                </div>
                <Badge
                  variant="secondary"
                  className={cn(
                    'text-[10px] capitalize',
                    f.severity === 'high' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' :
                    f.severity === 'medium' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                    'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  )}
                >
                  {f.severity}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

/* ------------------------------- Review modal ------------------------------- */

function ReviewDialog({
  app,
  type,
  onClose,
}: {
  app: DoctorApp | LabApp | null
  type: 'doctor' | 'lab' | null
  onClose: () => void
}) {
  const { toast } = useToast()
  const [reason, setReason] = React.useState('')
  const [acting, setActing] = React.useState<'approve' | 'reject' | null>(null)

  React.useEffect(() => {
    setReason('')
    setActing(null)
  }, [app])

  if (!app || !type) return null

  const isDoctor = type === 'doctor'
  const docApp = isDoctor ? (app as DoctorApp) : null
  const labApp = !isDoctor ? (app as LabApp) : null
  const displayName = docApp?.name ?? labApp?.labName ?? 'Applicant'
  const documents = app.documents

  const act = (action: 'approve' | 'reject') => {
    if (action === 'reject' && !reason.trim()) {
      toast({ title: 'Reason required', description: 'Provide a reason for rejection.', variant: 'destructive' })
      return
    }
    setActing(action)
    setTimeout(() => {
      setActing(null)
      toast({
        title: action === 'approve' ? 'Application approved' : 'Application rejected',
        description:
          action === 'approve'
            ? `${displayName} has been notified and activated.`
            : `${displayName} has been notified with your reason.`,
      })
      onClose()
    }, 800)
  }

  return (
    <Dialog open={!!app} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto custom-scroll">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isDoctor ? <Stethoscope className="h-4 w-4 text-emerald-600" /> : <Microscope className="h-4 w-4 text-emerald-600" />}
            Review application
          </DialogTitle>
          <DialogDescription>
            {displayName} · submitted {app.submittedAt}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {/* Profile info */}
          <Card className="bg-muted/40">
            <CardContent className="p-3 space-y-1.5 text-xs">
              {docApp && (
                <>
                  <Row label="Specialization" value={docApp.specialization} />
                  <Row label="License" value={docApp.licenseNumber} />
                  <Row label="City" value={docApp.city} />
                  <Row label="Experience" value={`${docApp.experience} years`} />
                  <Row label="Consultation fee" value={`$${docApp.fee}`} />
                </>
              )}
              {labApp && (
                <>
                  <Row label="Lab name" value={labApp.labName} />
                  <Row label="License" value={labApp.licenseNumber} />
                  <Row label="City" value={labApp.city} />
                  <Row label="Tests offered" value={`${labApp.testCount}`} />
                </>
              )}
            </CardContent>
          </Card>

          {/* Documents */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Documents ({documents.length})
            </p>
            <div className="grid grid-cols-2 gap-2">
              {documents.map((d, i) => (
                <button
                  key={i}
                  className="flex items-center gap-2 rounded-xl border border-border/60 p-2.5 text-left hover:border-emerald-500/40 transition-all"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <FileText className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{d.name}</p>
                    <p className="text-[10px] text-muted-foreground">{d.type} · preview</p>
                  </div>
                </button>
              ))}
            </div>
            <div className="mt-2 rounded-xl border border-dashed border-border p-4 text-center">
              <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground/60" />
              <p className="text-xs text-muted-foreground">
                Document preview will open in a new tab (secure viewer).
              </p>
            </div>
          </div>

          {/* Rejection reason */}
          <div className="space-y-1.5">
            <Label htmlFor="reason" className="text-xs">
              Reason (required for rejection)
            </Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. License not found in registry. Please resubmit with a valid KMC number."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => act('reject')}
            disabled={!!acting}
            className="border-destructive/30 text-destructive hover:bg-destructive/10"
          >
            {acting === 'reject' ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
            Reject
          </Button>
          <Button
            onClick={() => act('approve')}
            disabled={!!acting}
            className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white"
          >
            {acting === 'approve' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Approve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  )
}

/* --------------------------------- Helpers --------------------------------- */

function StatusBadge({ status }: { status: 'pending' | 'approved' | 'rejected' }) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        'text-[10px] capitalize',
        status === 'approved' && 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
        status === 'pending' && 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
        status === 'rejected' && 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
      )}
    >
      {status}
    </Badge>
  )
}

function StatCard({
  icon,
  label,
  value,
  sub,
  tint,
}: {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
  sub: string
  tint: 'emerald' | 'teal' | 'amber' | 'rose'
}) {
  const cls = {
    emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    teal: 'bg-teal-500/10 text-teal-600 dark:text-teal-400',
    amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    rose: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
  }[tint]
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
          <span className={cn('inline-flex h-6 w-6 items-center justify-center rounded-md', cls)}>
            {icon}
          </span>
          <span className="font-medium truncate">{label}</span>
        </div>
        <div className={cn('text-2xl font-bold', cls.split(' ').slice(1).join(' '))}>{value}</div>
        <p className="text-[11px] text-muted-foreground mt-1">{sub}</p>
      </CardContent>
    </Card>
  )
}
