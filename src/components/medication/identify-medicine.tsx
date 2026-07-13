'use client'

import { useRef, useState } from 'react'
import {
  Upload,
  Loader2,
  ScanLine,
  Pill,
  AlertTriangle,
  CheckCircle2,
  Image as ImageIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { MedicalDisclaimer } from '@/components/kyntha/medical-disclaimer'

interface IdentifyResult {
  name?: string
  activeIngredient?: string | null
  dosage?: string | null
  form?: string | null
  manufacturer?: string | null
  batchNumber?: string | null
  expiryDate?: string | null
  description?: string
  possibleUses?: string[]
  confidence?: string
  safetyNote?: string
}

export function IdentifyMedicine() {
  const [preview, setPreview] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<IdentifyResult | null>(null)
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
      analyze(dataUri)
    }
    reader.readAsDataURL(file)
  }

  const analyze = async (dataUri: string) => {
    setAnalyzing(true)
    try {
      const res = await fetch('/api/identify-medicine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: dataUri }),
      })
      if (!res.ok) throw new Error('Analysis failed')
      const data = await res.json()
      setResult(data.result)
      toast({ title: 'Analysis complete' })
    } catch (e) {
      toast({
        title: 'Identification failed',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setAnalyzing(false)
    }
  }

  const confidenceColor = (c?: string) => {
    if (c === 'high') return 'default'
    if (c === 'medium') return 'secondary'
    return 'destructive'
  }

  return (
    <div className="space-y-4">
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-4 flex items-start gap-3">
          <ScanLine className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-primary">AI Medicine Identifier</p>
            <p className="text-muted-foreground text-xs mt-1">
              Upload a photo of a medicine (tablet, capsule, bottle, or
              packaging) and the vision AI will try to identify it and extract
              key details like dosage, manufacturer and expiry.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Upload area */}
      <Card>
        <CardContent className="p-4">
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
          {preview ? (
            <div className="space-y-3">
              <div className="relative rounded-xl overflow-hidden border bg-muted/30">
                <img
                  src={preview}
                  alt="Medicine preview"
                  className="w-full max-h-72 object-contain"
                />
                {analyzing && (
                  <div className="absolute inset-0 bg-background/60 flex flex-col items-center justify-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm font-medium">Analyzing image...</p>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => inputRef.current?.click()}
                  disabled={analyzing}
                  className="flex-1"
                >
                  <Upload className="h-4 w-4" />
                  <span className="ml-1">Choose another</span>
                </Button>
                <Button
                  onClick={() => analyze(preview)}
                  disabled={analyzing}
                  className="flex-1 bg-primary"
                >
                  {analyzing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ScanLine className="h-4 w-4" />
                  )}
                  <span className="ml-1">Re-analyze</span>
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="w-full border-2 border-dashed border-muted-foreground/30 rounded-xl py-12 flex flex-col items-center gap-3 hover:border-primary/50 hover:bg-primary/5 transition"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                <ImageIcon className="h-7 w-7" />
              </div>
              <div className="text-center">
                <p className="font-medium">Upload medicine photo</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Click to select · PNG, JPG, WebP up to 8MB
                </p>
              </div>
            </button>
          )}
        </CardContent>
      </Card>

      {/* Result */}
      {result && (
        <>
          <Card>
            <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Pill className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold leading-tight">
                    {result.name || 'Unknown'}
                  </h3>
                  {result.form && (
                    <p className="text-xs text-muted-foreground">{result.form}</p>
                  )}
                </div>
              </div>
              {result.confidence && (
                <Badge variant={confidenceColor(result.confidence)}>
                  {result.confidence} confidence
                </Badge>
              )}
            </div>

            {result.description && (
              <p className="text-sm text-muted-foreground">
                {result.description}
              </p>
            )}

            <div className="grid sm:grid-cols-2 gap-3">
              {result.activeIngredient && (
                <InfoItem label="Active ingredient" value={result.activeIngredient} />
              )}
              {result.dosage && (
                <InfoItem label="Dosage" value={result.dosage} />
              )}
              {result.manufacturer && (
                <InfoItem label="Manufacturer" value={result.manufacturer} />
              )}
              {result.batchNumber && (
                <InfoItem label="Batch No." value={result.batchNumber} />
              )}
              {result.expiryDate && (
                <InfoItem label="Expiry date" value={result.expiryDate} />
              )}
            </div>

            {result.possibleUses && result.possibleUses.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1.5">
                  Possible uses
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {result.possibleUses.map((u, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {u}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {result.safetyNote && (
              <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 p-3 text-amber-700 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <p className="text-xs">{result.safetyNote}</p>
              </div>
            )}

            {result.name && result.name !== 'Not a medicine' && (
              <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Identification complete. Always verify with a pharmacist.
              </div>
            )}
          </CardContent>
        </Card>
        <MedicalDisclaimer compact />
        </>
      )}
    </div>
  )
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium mt-0.5 break-words">{value}</p>
    </div>
  )
}
