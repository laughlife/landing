import { describe, expect, it } from 'vitest'
import { isSafeExternalUrl, isSafeRelativeUploadPath } from '../../server/utils/security'

describe('server security utility contract', () => {
  it('only permits HTTP(S) external links', () => {
    expect(isSafeExternalUrl).toBeTypeOf('function')
    expect(isSafeExternalUrl('https://example.com/path')).toBe(true)
    expect(isSafeExternalUrl('http://example.com/path')).toBe(true)
    expect(isSafeExternalUrl('javascript:alert(1)')).toBe(false)
    expect(isSafeExternalUrl('data:text/html,<script>alert(1)</script>')).toBe(false)
    expect(isSafeExternalUrl('//example.com')).toBe(false)
  })

  it('rejects upload paths that can escape storage', () => {
    expect(isSafeRelativeUploadPath).toBeTypeOf('function')
    expect(isSafeRelativeUploadPath('2026/07/28/product.webp')).toBe(true)
    expect(isSafeRelativeUploadPath('../.env')).toBe(false)
    expect(isSafeRelativeUploadPath('2026/07/../secrets.txt')).toBe(false)
    expect(isSafeRelativeUploadPath('C:\\Windows\\System32\\cmd.exe')).toBe(false)
  })
})
