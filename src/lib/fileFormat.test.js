import { describe, it, expect } from 'vitest'
import { formatFileSize, formatFileDate } from './fileFormat.js'

describe('formatFileSize', () => {
  it('formats bytes under 1024 as plain bytes', () => {
    expect(formatFileSize(0)).toBe('0 B')
    expect(formatFileSize(512)).toBe('512 B')
    expect(formatFileSize(1023)).toBe('1023 B')
  })
  it('formats KB with one decimal', () => {
    expect(formatFileSize(1024)).toBe('1.0 KB')
    expect(formatFileSize(1536)).toBe('1.5 KB')
  })
  it('formats MB/GB with one decimal', () => {
    expect(formatFileSize(1024 * 1024 * 2.5)).toBe('2.5 MB')
    expect(formatFileSize(1024 * 1024 * 1024 * 3)).toBe('3.0 GB')
  })
  it('caps at TB for absurdly large values rather than overflowing the unit table', () => {
    expect(formatFileSize(1024 ** 5 * 7)).toBe('7168.0 TB')
  })
  it('returns "" for invalid input', () => {
    expect(formatFileSize(undefined)).toBe('')
    expect(formatFileSize(NaN)).toBe('')
    expect(formatFileSize(-1)).toBe('')
    expect(formatFileSize('512')).toBe('')
  })
})

describe('formatFileDate', () => {
  it('returns a non-empty string for a valid timestamp, in both languages', () => {
    const ts = Date.UTC(2026, 8, 15, 14, 30)
    expect(formatFileDate(ts, 'zh-Hant')).not.toBe('')
    expect(formatFileDate(ts, 'en')).not.toBe('')
  })
  it('returns "" for invalid input', () => {
    expect(formatFileDate(undefined, 'en')).toBe('')
    expect(formatFileDate(NaN, 'en')).toBe('')
  })
})
