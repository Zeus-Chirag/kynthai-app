'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

interface UseVoiceRecorderOptions {
  onComplete?: (base64: string, blob: Blob) => void
  onError?: (error: string) => void
}

/**
 * Records audio from the microphone and produces a base64-encoded WAV
 * payload suitable for posting to the /api/asr endpoint.
 */
export function useVoiceRecorder(
  opts: UseVoiceRecorderOptions = {}
) {
  const { onComplete, onError } = opts
  const [isRecording, setIsRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    mediaRecorderRef.current = null
    chunksRef.current = []
  }, [])

  useEffect(() => {
    return cleanup
  }, [cleanup])

  const start = useCallback(async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        onError?.('Microphone not supported in this browser')
        return
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      })
      streamRef.current = stream

      const mr = new MediaRecorder(stream)
      chunksRef.current = []

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mr.onstop = async () => {
        const blob = new Blob(chunksRef.current, {
          type: mr.mimeType || 'audio/webm',
        })
        // Convert to WAV (PCM 16-bit, mono) for the ASR service
        const wavBlob = await toWav(blob)
        const reader = new FileReader()
        reader.onloadend = () => {
          const dataUri = reader.result as string
          const base64 = dataUri.split(',')[1]
          onComplete?.(base64 ?? '', wavBlob)
        }
        reader.readAsDataURL(wavBlob)
        cleanup()
      }

      mr.onerror = () => {
        onError?.('Recording failed')
        cleanup()
      }

      mr.start()
      mediaRecorderRef.current = mr
      setIsRecording(true)
      setSeconds(0)
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000)
    } catch (e) {
      onError?.(
        e instanceof Error ? e.message : 'Could not access microphone'
      )
      cleanup()
    }
  }, [onComplete, onError, cleanup])

  const stop = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }, [isRecording])

  return { isRecording, seconds, start, stop }
}

/**
 * Convert an audio Blob (webm/opus from MediaRecorder) to a 16-bit PCM WAV
 * Blob (mono, 16 kHz) using the Web Audio API.
 */
async function toWav(blob: Blob): Promise<Blob> {
  const arrayBuffer = await blob.arrayBuffer()
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext })
      .webkitAudioContext
  const audioCtx = new AudioCtx()
  try {
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer)
    const targetRate = 16000
    const offline = new OfflineAudioContext(
      1,
      Math.ceil(audioBuffer.duration * targetRate),
      targetRate
    )
    const source = offline.createBufferSource()
    source.buffer = audioBuffer
    source.connect(offline.destination)
    source.start()
    const rendered = await offline.startRendering()
    const pcm = encodePcm16(rendered.getChannelData(0))
    return new Blob([pcm], { type: 'audio/wav' })
  } finally {
    audioCtx.close()
  }
}

function encodePcm16(samples: Float32Array): ArrayBuffer {
  const buffer = new ArrayBuffer(44 + samples.length * 2)
  const view = new DataView(buffer)

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i))
    }
  }

  writeString(0, 'RIFF')
  view.setUint32(4, 36 + samples.length * 2, true)
  writeString(8, 'WAVE')
  writeString(12, 'fmt ')
  view.setUint32(16, 16, true) // PCM chunk size
  view.setUint16(20, 1, true) // PCM format
  view.setUint16(22, 1, true) // mono
  view.setUint32(24, 16000, true) // sample rate
  view.setUint32(28, 16000 * 2, true) // byte rate
  view.setUint16(32, 2, true) // block align
  view.setUint16(34, 16, true) // bits per sample
  writeString(36, 'data')
  view.setUint32(40, samples.length * 2, true)

  let offset = 44
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]!))
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
    offset += 2
  }

  return buffer
}
