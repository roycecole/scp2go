import { SegmentedControl } from './primitives/SegmentedControl.jsx'
import { t } from '../lib/i18n.js'

const THEME_OPTIONS = (lang) => [
  { value: 'system', label: t(lang, 'theme.system') },
  { value: 'light', label: t(lang, 'theme.light') },
  { value: 'dark', label: t(lang, 'theme.dark') },
]

const LANG_OPTIONS = [
  { value: 'zh-Hant', label: t('zh-Hant', 'lang.zh-Hant') },
  { value: 'en', label: t('en', 'lang.en') },
]

export function Header({ theme, lang, onThemeChange, onLangChange }) {
  return (
    <header className="app__header">
      <div>
        <h1 className="app__title">{t(lang, 'app.title')}</h1>
        <p className="app__tagline">{t(lang, 'app.tagline')}</p>
      </div>
      <div className="app__controls">
        <SegmentedControl name="lang" legend={t(lang, 'lang.legend')} options={LANG_OPTIONS} value={lang} onChange={onLangChange} />
        <SegmentedControl name="theme" legend={t(lang, 'theme.legend')} options={THEME_OPTIONS(lang)} value={theme} onChange={onThemeChange} />
      </div>
    </header>
  )
}
