export type guid = `${string}-${string}-${string}-${string}-${string}`

/**
 * JavaScript has no native GUID/UUID type - crypto.randomUUID() only ever returns a formatted
 * string, and every comparison against one (Map keys, IndexedDB keys, ===) is therefore plain
 * text comparison, not the value comparison a real 128-bit type would give you for free. This is
 * what let a same-device GUID in two different letter cases (uppercase from one code path,
 * lowercase from another - a real incident, see the browser-history-api server-side data fix)
 * silently fail every lookup instead of being recognized as equal. These helpers parse into the
 * actual 16 bytes and compare/normalize against those, so casing (or any other purely textual
 * difference) can't cause this again.
 */

/** Parses a canonical hyphenated GUID string (any casing) into its raw 16 bytes. */
export function parseGuid(id: string): Uint8Array {
  const hex = id.replace(/-/g, '')
  if (hex.length !== 32 || /[^0-9a-fA-F]/.test(hex)) {
    throw new Error(`Invalid GUID: ${id}`)
  }
  const bytes = new Uint8Array(16)
  for (let i = 0; i < 16; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16)
  }
  return bytes
}

/** Formats raw bytes back into the canonical lowercase hyphenated GUID string form. */
export function formatGuid(bytes: Uint8Array): string {
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}` as guid
}

/** True value equality - compares the actual 128-bit value, never the text representation. */
export function guidsEqual(a: string, b: string): boolean {
  const bytesA = parseGuid(a)
  const bytesB = parseGuid(b)
  for (let i = 0; i < 16; i++) {
    if (bytesA[i] !== bytesB[i]) return false
  }
  return true
}

/** Canonical (lowercase) string form - use as a normalized Map/IndexedDB key so any two textual
 * spellings of the same GUID always land on the same key. */
export function normalizeGuid(id: string): guid {
  return formatGuid(parseGuid(id)) as guid
}
