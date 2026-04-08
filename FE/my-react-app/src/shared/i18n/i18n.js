import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { resources } from './resources'

const LANG_KEY = 'it4409_lang'

function getInitialLanguage() {
  try {
    const saved = window.localStorage.getItem(LANG_KEY)
    if (saved === 'vi' || saved === 'en') return saved
  } catch {
    // ignore storage access errors
  }
  return 'vi'
}

i18n.use(initReactI18next).init({
  resources,
  lng: getInitialLanguage(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

i18n.on('languageChanged', (lang) => {
  try {
    window.localStorage.setItem(LANG_KEY, lang)
  } catch {
    // ignore storage access errors
  }
})

export default i18n
