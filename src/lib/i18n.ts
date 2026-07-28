import en from '@/locales/en.json'

const translations: Record<string, Record<string, string>> = { en }

let currentLang: string = 'en'

export function setLanguage(lang: string) {
  currentLang = lang
  if (typeof window !== 'undefined') {
    localStorage.setItem('kynthai-lang', lang)
  }
}

export function getLanguage(): string {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('kynthai-lang')
    if (stored && translations[stored]) {
      currentLang = stored
    }
  }
  return currentLang
}

export function t(key: string): string {
  const lang = getLanguage()
  return translations[lang]?.[key] ?? (translations.en as Record<string, string>)[key] ?? key
}

export function initLanguage() {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('kynthai-lang')
    if (stored && translations[stored]) {
      currentLang = stored
    }
  }
}
