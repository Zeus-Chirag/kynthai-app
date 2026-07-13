'use client'

import { useAppStore } from '@/lib/store'
import { getLocale, type Locale } from '@/lib/locales'

export function useTranslation() {
  const language = useAppStore((s) => s.language)
  const t = getLocale(language)

  const interpolate = (template: string, values: Record<string, string | number>): string => {
    return Object.entries(values).reduce(
      (result, [key, value]) => result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value)),
      template
    )
  }

  return { t, language, interpolate }
}
