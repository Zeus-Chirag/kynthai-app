'use client'

import { useRef, useState } from 'react'
import {
  ScanLine,
  Loader2,
  Upload,
  CheckCircle2,
  Plus,
  FileText,
  AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { MedicalDisclaimer } from '@/components/kynthaii/medical-disclaimer'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'

interface ScannedMed {
  name: string
  dosage: string
  times: string[]
  frequency: string
  instructions: string | null
}

interface ScanResult {
  medications: ScannedMed[]
  prescriber: string | null
  date: string | null
  notes: string | null
  confidence: string
  warning: string
}

function formatTime(t: string) {
  const [h = 0, m = 0] = (t.split(':').map(Number) as [number, number])
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return `${hour12}:${String(m).padStart(2, '0')} ${ampm}`
}

export function PrescriptionScanner({ onImported }: { onImported?: () => void }) {
  const [preview, setPreview] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState<ScanResult | null>(null)
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState('')
  const [savedCount, setSavedCount] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Please upload an image', variant: 'destructive' })
      return
    }
    if (file.size > 8 * 1024 * 1024) {
      toast({
        title: 'Image too large',
        description: 'Please use an image under 8MB.',
        variant: 'destructive',
      })
      return
    }
    const reader = new FileReader()
    reader.onloadend = () => {
      const dataUri = reader.result as string
      setPreview(dataUri)
      setResult(null)
      setSavedCount(0)
      scan(dataUri)
    }
    reader.readAsDataURL(file)
  }

  const scan = async (dataUri: string) => {
    setScanning(true)
    try {
      const res = await fetch('/api/prescription-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: dataUri }),
      })
      if (!res.ok) throw new Error('Scan failed')
      const data = await res.json()
      setResult(data.result)
      toast({
        title: 'Prescription scanned',
        description: `${data.result.medications.length} medication(s) found`,
      })
    } catch (e) {
      toast({
        title: 'Scan failed',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setScanning(false)
    }
  }

  const importAll = async () => {
    if (!result || result.medications.length === 0) return
    setImporting(true)
    setImportProgress('')
    let count = 0
    const total = result.medications.length
    for (let i = 0; i < total; i++) {
      // result.medications.length === total is checked above
      const med = result.medications[i]!
      setImportProgress(`Importing ${i + 1} of ${total}...`)
      try {
        const res = await fetch('/api/medications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: med.name,
            dosage: med.dosage,
            times: med.times,
            frequency: med.frequency,
            instructions: med.instructions,
            color: 'emerald',
          }),
        })
        if (res.ok) count++
      } catch {
        /* skip individual failures */
      }
    }
    setImportProgress('')
    setImporting(false)
    setSavedCount(count)
    toast({
      title: `${count} medication(s) imported`,
      description: 'Review them in your Medications list.',
    })
    onImported?.()
  }

  const reset = () => {
    setPreview(null)
    setResult(null)
    setSavedCount(0)
  }

  const confidenceBadge = (c: string) => {
    if (c === 'high') return 'default'
    if (c === 'medium') return 'secondary'
    return 'destructive'
  }

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) handleFile(f)
        }}
      />

      {!preview ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full border-2 border-dashed border-primary/40 rounded-xl py-6 flex flex-col items-center gap-2 hover:border-primary hover:bg-primary/5 transition"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ScanLine className="h-5 w-5" />
          </div>
          <div className="text-center">
            <p className="font-medium text-sm">Scan prescription</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              AI extracts all medications at once
            </p>
          </div>
        </button>
      ) : (
        <Card>
          <CardContent className="p-3 space-y-3">
            <div className="relative rounded-lg overflow-hidden border bg-muted/30">
              <img
                src={preview}
                alt="Prescription"
                className="w-full max-h-48 object-contain"
              />
              {scanning && (
                <div className="absolute inset-0 bg-background/60 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <p className="text-xs font-medium">Scanning prescription...</p>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => inputRef.current?.click()}
                disabled={scanning}
                className="flex-1"
              >
                <Upload className="h-3.5 w-3.5" />
                <span className="ml-1">New image</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={reset}
                disabled={scanning}
              >
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scan result */}
      {scanning && !result && (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
        </div>
      )}

      {result && (
        <div className="space-y-3">
          {/* Prescription meta */}
          {(result.prescriber || result.date) && (
            <Card>
              <CardContent className="p-3 flex items-center gap-2 flex-wrap">
                <FileText className="h-4 w-4 text-primary" />
                {result.prescriber && (
                  <span className="text-xs text-muted-foreground">
                    Prescriber: <span className="font-medium text-foreground">{result.prescriber}</span>
                  </span>
                )}
                {result.date && (
                  <span className="text-xs text-muted-foreground">
                    Date: <span className="font-medium text-foreground">{result.date}</span>
                  </span>
                )}
                <Badge variant={confidenceBadge(result.confidence)} className="ml-auto text-[10px]">
                  {result.confidence} confidence
                </Badge>
              </CardContent>
            </Card>
          )}

          {result.medications.length === 0 ? (
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardContent className="p-4 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-sm">{result.notes || result.warning}</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <p className="text-xs font-semibold text-muted-foreground">
                {result.medications.length} medication(s) detected — review and import
              </p>
              <div className="space-y-2">
                {result.medications.map((med, i) => (
                  <Card key={i}>
                    <CardContent className="p-3">
                      <div className="flex items-start gap-2">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Plus className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm truncate">
                              {med.name}
                            </span>
                            <Badge variant="outline" className="text-[10px]">
                              {med.dosage}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1 flex-wrap mt-1">
                            <Badge variant="secondary" className="text-[10px]">
                              {med.frequency}
                            </Badge>
                            {med.times.map((t) => (
                              <span
                                key={t}
                                className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium"
                              >
                                {formatTime(t)}
                              </span>
                            ))}
                          </div>
                          {med.instructions && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {med.instructions}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Warning */}
              <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 p-2.5 text-amber-700 dark:text-amber-400">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <p className="text-xs">{result.warning}</p>
              </div>

              {/* Import button */}
              {savedCount > 0 ? (
                <Card className="border-emerald-500/30 bg-emerald-500/5">
                  <CardContent className="p-3 flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" />
                    {savedCount} medication(s) imported successfully
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  <Button
                    onClick={importAll}
                    disabled={importing}
                    className="w-full bg-primary"
                  >
                    {importing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    <span className="ml-1">
                      {importing ? 'Importing...' : `Import all ${result.medications.length} medication(s)`}
                    </span>
                  </Button>
                  {importing && importProgress && (
                    <p className="text-xs text-center text-muted-foreground">{importProgress}</p>
                  )}
                </div>
              )}
              <MedicalDisclaimer compact />
            </>
          )}
        </div>
      )}
    </div>
  )
}
