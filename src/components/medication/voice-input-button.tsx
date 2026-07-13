'use client'

import { useState } from 'react'
import { Mic, MicOff, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useVoiceRecorder } from '@/hooks/use-voice-recorder'
import { useToast } from '@/hooks/use-toast'

interface VoiceInputButtonProps {
  onTranscript: (text: string) => void
  label?: string
  className?: string
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

/**
 * Microphone button that records audio, sends it to /api/asr for
 * transcription, and returns the text via onTranscript.
 */
export function VoiceInputButton({
  onTranscript,
  label,
  className,
  size = 'icon',
}: VoiceInputButtonProps) {
  const [transcribing, setTranscribing] = useState(false)
  const { toast } = useToast()

  const recorder = useVoiceRecorder({
    onComplete: async (base64) => {
      setTranscribing(true)
      try {
        const res = await fetch('/api/asr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ audio: base64 }),
        })
        if (!res.ok) throw new Error('Transcription failed')
        const data = await res.json()
        if (data.text && data.text.trim().length > 0) {
          onTranscript(data.text.trim())
          toast({ title: 'Transcribed', description: data.text.slice(0, 80) })
        } else {
          toast({ title: 'No speech detected', variant: 'destructive' })
        }
      } catch (e) {
        toast({
          title: 'Voice input failed',
          description: e instanceof Error ? e.message : 'Unknown error',
          variant: 'destructive',
        })
      } finally {
        setTranscribing(false)
      }
    },
    onError: (err) => {
      toast({ title: 'Microphone error', description: err, variant: 'destructive' })
    },
  })

  if (transcribing) {
    return (
      <Button
        type="button"
        size={size}
        variant="secondary"
        className={className}
        disabled
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        {label && <span className="ml-2">{label}</span>}
      </Button>
    )
  }

  if (recorder.isRecording) {
    return (
      <Button
        type="button"
        size={size}
        variant="destructive"
        className={className}
        onClick={recorder.stop}
        title={`Recording... ${recorder.seconds}s (click to stop)`}
      >
        <MicOff className="h-4 w-4" />
        {label && <span className="ml-2">{recorder.seconds}s</span>}
      </Button>
    )
  }

  return (
    <Button
      type="button"
      size={size}
      variant="outline"
      className={className}
      onClick={recorder.start}
      title="Speak to input"
    >
      <Mic className="h-4 w-4" />
      {label && <span className="ml-2">{label}</span>}
    </Button>
  )
}
