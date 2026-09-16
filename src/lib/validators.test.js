import { describe, it, expect } from 'vitest'
import { isValidHost, isValidPort, isValidUser, isValidJumpHost, isValidBwLimit } from './validators.js'

describe('isValidHost', () => {
  it('accepts empty (optional / fallback handled elsewhere)', () => {
    expect(isValidHost('')).toBe(true)
    expect(isValidHost('   ')).toBe(true)
  })
  it('accepts IPv4, hostnames, and loose IPv6', () => {
    expect(isValidHost('161.33.35.40')).toBe(true)
    expect(isValidHost('example.com')).toBe(true)
    expect(isValidHost('my-server.internal')).toBe(true)
    expect(isValidHost('::1')).toBe(true)
    expect(isValidHost('fe80::abcd')).toBe(true)
  })
  it('rejects out-of-range IPv4 octets rather than treating them as hostnames', () => {
    expect(isValidHost('999.1.1.1')).toBe(false)
  })
  it('rejects whitespace and dangling hyphens/dots', () => {
    expect(isValidHost('my server')).toBe(false)
    expect(isValidHost('-bad.com')).toBe(false)
    expect(isValidHost('bad-.com')).toBe(false)
  })
})

describe('isValidPort', () => {
  it('accepts empty and 1–65535', () => {
    expect(isValidPort('')).toBe(true)
    expect(isValidPort('22')).toBe(true)
    expect(isValidPort('65535')).toBe(true)
  })
  it('rejects 0, >65535, and non-numeric', () => {
    expect(isValidPort('0')).toBe(false)
    expect(isValidPort('65536')).toBe(false)
    expect(isValidPort('2a')).toBe(false)
  })
})

describe('isValidUser', () => {
  it('accepts empty and plain names', () => {
    expect(isValidUser('')).toBe(true)
    expect(isValidUser('ubuntu')).toBe(true)
    expect(isValidUser('deploy-bot_1')).toBe(true)
  })
  it('rejects whitespace, @ and :', () => {
    expect(isValidUser('a b')).toBe(false)
    expect(isValidUser('a@b')).toBe(false)
    expect(isValidUser('a:b')).toBe(false)
  })
})

describe('isValidJumpHost', () => {
  it('accepts empty, user@host:port, and multi-hop', () => {
    expect(isValidJumpHost('')).toBe(true)
    expect(isValidJumpHost('bastion.example.com')).toBe(true)
    expect(isValidJumpHost('u@bastion:2222')).toBe(true)
    expect(isValidJumpHost('a@h1,b@h2')).toBe(true)
  })
  it('rejects whitespace', () => {
    expect(isValidJumpHost('bad host')).toBe(false)
  })
})

describe('isValidBwLimit', () => {
  it('accepts empty, integers, decimals, and k/m/g suffixes', () => {
    expect(isValidBwLimit('')).toBe(true)
    expect(isValidBwLimit('5000')).toBe(true)
    expect(isValidBwLimit('1.5m')).toBe(true)
    expect(isValidBwLimit('100K')).toBe(true)
  })
  it('rejects units-only, negative, and junk', () => {
    expect(isValidBwLimit('m')).toBe(false)
    expect(isValidBwLimit('-5')).toBe(false)
    expect(isValidBwLimit('fast')).toBe(false)
  })
})
