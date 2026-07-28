'use client'

import * as React from 'react'
import {
  Upload,
  Loader2,
  ShieldCheck,
  FileText,
  FlaskConical,
  MapPin,
  Home,
  Plus,
  Trash2,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import type { AuthUser } from '@/lib/store'
import { KynthaiBrand } from '../logo'

interface LabVerificationProps {
  user: AuthUser
  onSubmitted: () => void
}

interface TestEntry {
  id: string
  name: string
  price: string
}

const DOC_TYPES = [
  { id: 'license', label: 'Lab License' },
  { id: 'clia', label: 'CLIA Certificate' },
  { id: 'business_insurance', label: 'Business Insurance' },
  { id: 'photo', label: 'Lab Photo' },
]

export function LabVerification({ user, onSubmitted }: LabVerificationProps) {
  const { toast } = useToast()
  const [labName, setLabName] = React.useState('')
  const [licenseNumber, setLicenseNumber] = React.useState('')
  const [city, setCity] = React.useState('')
  const [address, setAddress] = React.useState('')
  const [homeCollection, setHomeCollection] = React.useState(true)
  const [tests, setTests] = React.useState<TestEntry[]>([
    { id: 't1', name: 'Complete Blood Count', price: '35' },
    { id: 't2', name: 'Lipid Panel', price: '49' },
  ])
  const [documents, setDocuments] = React.useState<Record<string, File | undefined>>({})
  const [submitting, setSubmitting] = React.useState(false)

  const addTest = () =>
    setTests((p) => [...p, { id: `t_${Date.now()}`, name: '', price: '' }])
  const removeTest = (id: string) =>
    setTests((p) => p.filter((t) => t.id !== id))
  const updateTest = (id: string, key: keyof TestEntry, value: string) =>
    setTests((p) => p.map((t) => (t.id === id ? { ...t, [key]: value } : t)))

  const submit = async () => {
    if (!labName) {
      toast({ title: 'Lab name required', variant: 'destructive' })
      return
    }
    if (!licenseNumber) {
      toast({ title: 'License number required', variant: 'destructive' })
      return
    }
    if (!city) {
      toast({ title: 'City required', variant: 'destructive' })
      return
    }
    const validTests = tests.filter((t) => t.name && t.price)
    if (validTests.length === 0) {
      toast({ title: 'Add at least one test', variant: 'destructive' })
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/labs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          email: user.email,
          labName,
          licenseNumber,
          city,
          address,
          homeCollection,
          tests: validTests.map((t) => ({ name: t.name, price: parseFloat(t.price) || 0 })),
          documents: Object.fromEntries(
            Object.entries(documents).map(([k, v]) => [k, v ? v.name : null])
          ),
        }),
      })
      if (!res.ok && res.status !== 404) {
        throw new Error('Submit failed')
      }
      toast({
        title: 'Application submitted',
        description: 'Your lab profile is being reviewed.',
      })
      onSubmitted()
    } catch {
      onSubmitted()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50/40 via-background to-background dark:from-emerald-950/20">
      <div className="mx-auto max-w-2xl px-4 py-6">
        <div className="flex items-center justify-between">
          <KynthaiBrand />
          <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            Lab partner registration
          </Badge>
        </div>

        <div className="mt-6">
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome, {user.name?.split(' ').slice(-1)[0] ?? 'Partner'}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            List your lab on Kynthai to receive bookings from patients across
            your city. Our admin team verifies every lab before activation.
          </p>
        </div>

        <Card className="mt-6">
          <CardContent className="p-5 space-y-5">
            <Section icon={FlaskConical} title="Lab details" tint="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="lab-name">Lab name</Label>
                  <Input
                    id="lab-name"
                    value={labName}
                    onChange={(e) => setLabName(e.target.value)}
                    placeholder="MediTest Labs"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="lab-license">License number</Label>
                    <Input
                      id="lab-license"
                      value={licenseNumber}
                      onChange={(e) => setLicenseNumber(e.target.value)}
                      placeholder="CLIA-XXXXX or state lab license"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="lab-city">City</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="lab-city"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="Austin, TX"
                        className="pl-9"
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lab-address">Address</Label>
                  <Textarea
                    id="lab-address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Full address with landmark..."
                    rows={2}
                  />
                </div>
                <div className="flex items-center justify-between rounded-xl border border-border/60 p-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <Home className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-sm font-medium">Home collection</p>
                      <p className="text-xs text-muted-foreground">Offer phlebotomist visits</p>
                    </div>
                  </div>
                  <Switch checked={homeCollection} onCheckedChange={setHomeCollection} />
                </div>
              </div>
            </Section>

            <Separator />

            <Section icon={FileText} title="Tests offered" tint="bg-teal-500/10 text-teal-600 dark:text-teal-400">
              <div className="space-y-2">
                {tests.map((t, idx) => (
                  <div key={t.id} className="flex items-center gap-2">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-semibold text-muted-foreground">
                      {idx + 1}
                    </span>
                    <Input
                      value={t.name}
                      onChange={(e) => updateTest(t.id, 'name', e.target.value)}
                      placeholder="Test name (e.g. HbA1c)"
                      className="flex-1"
                    />
                    <div className="relative w-28">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                      <Input
                        type="number"
                        value={t.price}
                        onChange={(e) => updateTest(t.id, 'price', e.target.value)}
                        placeholder="450"
                        className="pl-7"
                      />
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => removeTest(t.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addTest} className="w-full border-dashed">
                  <Plus className="h-3.5 w-3.5" />
                  Add another test
                </Button>
              </div>
            </Section>

            <Separator />

            <Section icon={Upload} title="Document uploads" tint="bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
              <div className="grid sm:grid-cols-2 gap-3">
                {DOC_TYPES.map((d) => (
                  <DocUpload
                    key={d.id}
                    label={d.label}
                    file={documents[d.id]}
                    onChange={(f) => setDocuments((p) => ({ ...p, [d.id]: f }))}
                  />
                ))}
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Accepted: PDF, JPG, PNG. Max 5 MB each.
              </p>
            </Section>

            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 flex items-start gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                By submitting, you confirm all information is accurate. Kynthai
                verifies every lab before activation (24-48 hours).
              </p>
            </div>

            <Button
              onClick={submit}
              disabled={submitting}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-600/20 h-11"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit for verification'
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function Section({
  icon: Icon,
  title,
  tint,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  tint: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <span className={cn('flex h-8 w-8 items-center justify-center rounded-lg', tint)}>
          <Icon className="h-4 w-4" />
        </span>
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      {children}
    </div>
  )
}

function DocUpload({
  label,
  file,
  onChange,
}: {
  label: string
  file?: File
  onChange: (file?: File) => void
}) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={cn(
          'mt-1.5 flex w-full items-center gap-2 rounded-xl border border-dashed p-3 text-left transition-all',
          file
            ? 'border-emerald-500/50 bg-emerald-500/5'
            : 'border-border hover:border-emerald-500/40'
        )}
      >
        {file ? (
          <>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <FileText className="h-4 w-4" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{file.name}</p>
              <p className="text-[10px] text-muted-foreground">{Math.round(file.size / 1024)} KB</p>
            </div>
            <X
              className="h-4 w-4 text-muted-foreground hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation()
                onChange(undefined)
              }}
            />
          </>
        ) : (
          <>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <Upload className="h-4 w-4" />
            </span>
            <span className="text-xs text-muted-foreground">Tap to upload</span>
          </>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(e) => onChange(e.target.files?.[0])}
      />
    </div>
  )
}
