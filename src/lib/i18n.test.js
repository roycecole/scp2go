import { describe, it, expect } from 'vitest'
import { t, LANGS, _STRINGS } from './i18n.js'

describe('t()', () => {
  it('returns the zh-Hant string by default', () => {
    expect(t('zh-Hant', 'output.title')).toBe('產生的指令')
  })
  it('returns the en string when lang is en', () => {
    expect(t('en', 'output.title')).toBe('Generated commands')
  })
  it('falls back to zh-Hant for an unknown language', () => {
    expect(t('fr', 'output.title')).toBe(t('zh-Hant', 'output.title'))
  })
  it('interpolates {vars}', () => {
    expect(t('zh-Hant', 'chip.remove', { name: 'a.txt' })).toBe('移除 a.txt')
    expect(t('en', 'chip.remove', { name: 'a.txt' })).toBe('Remove a.txt')
  })
  it('falls back to the raw key when missing from every language', () => {
    expect(t('en', 'nonexistent.key')).toBe('nonexistent.key')
  })
  it('every declared language has exactly the same key set (exhaustive, not a sample)', () => {
    const [first, ...rest] = LANGS
    const firstKeys = new Set(Object.keys(_STRINGS[first]))
    for (const lang of rest) {
      const keys = new Set(Object.keys(_STRINGS[lang]))
      const missingFromLang = [...firstKeys].filter((k) => !keys.has(k))
      const extraInLang = [...keys].filter((k) => !firstKeys.has(k))
      expect({ lang, missingFromLang, extraInLang }).toEqual({ lang, missingFromLang: [], extraInLang: [] })
    }
  })

  it('no string is empty/whitespace-only in any declared language', () => {
    for (const lang of LANGS) {
      for (const [key, value] of Object.entries(_STRINGS[lang])) {
        expect(value.trim(), `${lang}:${key}`).not.toBe('')
      }
    }
  })
})
