'use client'

import * as React from 'react'
import { Share2, Copy, Check, MessageCircle, MoreHorizontal, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ResponsiveSheet } from './responsive-sheet'
import { useToast } from '@/hooks/use-toast'

interface ShareSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  shareText: string
  shareUrl?: string
  title?: string
}

export function ShareSheet({
  open,
  onOpenChange,
  shareText,
  shareUrl,
  title = 'Share your achievement',
}: ShareSheetProps) {
  const { toast } = useToast()
  const [copied, setCopied] = React.useState(false)

  const encodedText = encodeURIComponent(shareText)
  const encodedUrl = shareUrl ? encodeURIComponent(shareUrl) : ''
  const fullShareText = shareUrl ? `${shareText} ${shareUrl}` : shareText
  const encodedFull = encodeURIComponent(fullShareText)

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(fullShareText)
      setCopied(true)
      toast({ title: 'Copied to clipboard!' })
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast({ title: 'Failed to copy', variant: 'destructive' })
    }
  }

  const shareOptions = [
    {
      id: 'whatsapp',
      label: 'WhatsApp',
      icon: MessageCircle,
      color: 'text-green-600',
      bg: 'bg-green-50 dark:bg-green-950/30',
      action: () => {
        window.open(`https://wa.me/?text=${encodedFull}`, '_blank', 'noopener')
        onOpenChange(false)
      },
    },
    {
      id: 'copy',
      label: copied ? 'Copied!' : 'Copy Link',
      icon: copied ? Check : Copy,
      color: copied ? 'text-emerald-600' : 'text-foreground',
      bg: copied ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'bg-muted/50',
      action: copyToClipboard,
    },
    {
      id: 'more',
      label: 'More Options',
      icon: MoreHorizontal,
      color: 'text-foreground',
      bg: 'bg-muted/50',
      action: async () => {
        if (navigator.share) {
          try {
            await navigator.share({
              title,
              text: fullShareText,
              url: shareUrl,
            })
          } catch {
            // User cancelled — no action needed
          }
        } else {
          copyToClipboard()
        }
        onOpenChange(false)
      },
    },
  ]

  return (
    <ResponsiveSheet open={open} onOpenChange={onOpenChange}>
      {/* Handle drag area */}
      <div className="flex justify-center pt-3 pb-1">
        <div className="h-[5px] w-9 rounded-full bg-foreground/20" aria-hidden />
      </div>

      <div className="px-4 pb-4">
        {/* Header */}
        <div className="flex items-center justify-between py-3">
          <h3 className="text-lg font-semibold">{title}</h3>
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11 rounded-full"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Share preview text */}
        <div className="mb-4 rounded-xl border border-border/60 bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground mb-1">Preview</p>
          <p className="text-sm leading-relaxed">{shareText}</p>
          {shareUrl && (
            <p className="text-xs text-emerald-600 mt-1 truncate">{shareUrl}</p>
          )}
        </div>

        {/* Share options grid */}
        <div className="grid grid-cols-3 gap-3">
          {shareOptions.map((opt) => {
            const Icon = opt.icon
            return (
              <button
                key={opt.id}
                onClick={opt.action}
                className="flex flex-col items-center gap-2 rounded-2xl border border-border/60 p-4 transition-all hover:shadow-md hover:border-emerald-500/30 active:scale-95"
              >
                <div className={`flex h-12 w-12 items-center justify-center rounded-full ${opt.bg}`}>
                  <Icon className={`h-5 w-5 ${opt.color}`} />
                </div>
                <span className="text-xs font-medium">{opt.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </ResponsiveSheet>
  )
}
