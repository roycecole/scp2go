import { describe, it, expect } from 'vitest'
import { formatFileSize, formatFileDate, sortFiles, getFileCategory } from './fileFormat.js'

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

describe('sortFiles', () => {
  const files = [
    { name: 'banana.txt', size: 200, lastModified: 300, addedAt: 20 },
    { name: 'Cherry.txt', size: 100, lastModified: 100, addedAt: 30 },
    { name: 'apple.txt', isDir: true }, // no size/lastModified/addedAt
  ]

  it('returns the same array reference when sortKey is falsy (no sort applied yet)', () => {
    expect(sortFiles(files, null, 'asc')).toBe(files)
  })

  it('sorts by name case-insensitively via localeCompare, not raw code-point order', () => {
    // Naive `<` comparison would put 'Cherry.txt' first (capital C sorts
    // before any lowercase letter by code point) — locale-aware compare
    // must not.
    const sorted = sortFiles(files, 'name', 'asc')
    expect(sorted.map((f) => f.name)).toEqual(['apple.txt', 'banana.txt', 'Cherry.txt'])
  })

  it('reverses order for desc direction', () => {
    const sorted = sortFiles(files, 'name', 'desc')
    expect(sorted.map((f) => f.name)).toEqual(['Cherry.txt', 'banana.txt', 'apple.txt'])
  })

  it('sorts by size, a missing value first as if smaller than any real size', () => {
    const sorted = sortFiles(files, 'size', 'asc')
    expect(sorted.map((f) => f.name)).toEqual(['apple.txt', 'Cherry.txt', 'banana.txt'])
  })

  it('sorts by lastModified', () => {
    const sorted = sortFiles(files, 'lastModified', 'asc')
    expect(sorted.map((f) => f.name)).toEqual(['apple.txt', 'Cherry.txt', 'banana.txt'])
  })

  it('sorts by addedAt', () => {
    const sorted = sortFiles(files, 'addedAt', 'asc')
    expect(sorted.map((f) => f.name)).toEqual(['apple.txt', 'banana.txt', 'Cherry.txt'])
  })

  it('does not mutate the input array', () => {
    const original = [...files]
    sortFiles(files, 'name', 'asc')
    expect(files).toEqual(original)
  })
})

describe('getFileCategory', () => {
  it('recognizes an image', () => {
    expect(getFileCategory('photo.png')).toBe('image')
    expect(getFileCategory('logo.SVG')).toBe('image')
  })
  it('recognizes an archive', () => {
    expect(getFileCategory('backup.tar.gz')).toBe('archive')
    expect(getFileCategory('site.zip')).toBe('archive')
  })
  it('recognizes source code', () => {
    expect(getFileCategory('index.js')).toBe('code')
    expect(getFileCategory('config.yaml')).toBe('code')
  })
  it('recognizes a PDF', () => {
    expect(getFileCategory('invoice.pdf')).toBe('pdf')
  })
  it('recognizes audio and video', () => {
    expect(getFileCategory('song.mp3')).toBe('audio')
    expect(getFileCategory('clip.mp4')).toBe('video')
  })
  it('recognizes an office/text document', () => {
    expect(getFileCategory('report.docx')).toBe('document')
    expect(getFileCategory('notes.md')).toBe('document')
  })
  it('falls back to the generic "file" category for an unknown or missing extension', () => {
    expect(getFileCategory('README')).toBe('file')
    expect(getFileCategory('data.xyz')).toBe('file')
    expect(getFileCategory('')).toBe('file')
    expect(getFileCategory(undefined)).toBe('file')
  })
  it('matches only the final extension, e.g. a .tar.gz archive is archive, not "tar"', () => {
    expect(getFileCategory('backup.tar.gz')).toBe('archive')
  })
})
