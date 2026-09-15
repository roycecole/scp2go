import { describe, it, expect } from 'vitest'
import { shouldLoadFonts } from './fonts.js'

describe('shouldLoadFonts', () => {
  it('loads fonts when the Network Information API is unavailable', () => {
    expect(shouldLoadFonts(undefined)).toBe(true)
    expect(shouldLoadFonts(null)).toBe(true)
  })
  it('loads fonts on a fast connection', () => {
    expect(shouldLoadFonts({ effectiveType: '4g', saveData: false })).toBe(true)
  })
  it('skips fonts when saveData is on, regardless of effectiveType', () => {
    expect(shouldLoadFonts({ effectiveType: '4g', saveData: true })).toBe(false)
  })
  it('skips fonts on slow-2g / 2g', () => {
    expect(shouldLoadFonts({ effectiveType: 'slow-2g' })).toBe(false)
    expect(shouldLoadFonts({ effectiveType: '2g' })).toBe(false)
  })
  it('loads fonts on 3g/4g', () => {
    expect(shouldLoadFonts({ effectiveType: '3g' })).toBe(true)
    expect(shouldLoadFonts({ effectiveType: '4g' })).toBe(true)
  })
  it('loads fonts when connection exists but reports no effectiveType/saveData', () => {
    expect(shouldLoadFonts({})).toBe(true)
  })
})
