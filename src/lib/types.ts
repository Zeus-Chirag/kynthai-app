export interface Medication {
  id: string
  name: string
  dosage: string
  times: string[] // ["08:00", "20:00"]
  frequency: string
  instructions?: string | null
  notes?: string | null
  color: string
  imageUrl?: string | null
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface Reminder {
  id: string
  medicationId: string
  medication?: Medication
  date: string
  time: string
  status: 'pending' | 'taken' | 'skipped'
  takenAt?: string | null
  createdAt: string
  updatedAt: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}

export interface ReminderStats {
  total: number
  taken: number
  skipped: number
  pending: number
  adherence: number // percentage 0-100
}

export const MEDICATION_COLORS = [
  'emerald',
  'rose',
  'amber',
  'violet',
  'cyan',
  'orange',
  'pink',
  'teal',
] as const

export const COLOR_CLASSES: Record<
  string,
  { bg: string; text: string; ring: string; dot: string }
> = {
  emerald: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-600 dark:text-emerald-400',
    ring: 'ring-emerald-500/30',
    dot: 'bg-emerald-500',
  },
  rose: {
    bg: 'bg-rose-500/10',
    text: 'text-rose-600 dark:text-rose-400',
    ring: 'ring-rose-500/30',
    dot: 'bg-rose-500',
  },
  amber: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-600 dark:text-amber-400',
    ring: 'ring-amber-500/30',
    dot: 'bg-amber-500',
  },
  violet: {
    bg: 'bg-violet-500/10',
    text: 'text-violet-600 dark:text-violet-400',
    ring: 'ring-violet-500/30',
    dot: 'bg-violet-500',
  },
  cyan: {
    bg: 'bg-cyan-500/10',
    text: 'text-cyan-600 dark:text-cyan-400',
    ring: 'ring-cyan-500/30',
    dot: 'bg-cyan-500',
  },
  orange: {
    bg: 'bg-orange-500/10',
    text: 'text-orange-600 dark:text-orange-400',
    ring: 'ring-orange-500/30',
    dot: 'bg-orange-500',
  },
  pink: {
    bg: 'bg-pink-500/10',
    text: 'text-pink-600 dark:text-pink-400',
    ring: 'ring-pink-500/30',
    dot: 'bg-pink-500',
  },
  teal: {
    bg: 'bg-teal-500/10',
    text: 'text-teal-600 dark:text-teal-400',
    ring: 'ring-teal-500/30',
    dot: 'bg-teal-500',
  },
}

export function getColorClasses(
  color: string
): { bg: string; text: string; ring: string; dot: string } {
  return (COLOR_CLASSES[color] ?? COLOR_CLASSES.emerald)!
}
