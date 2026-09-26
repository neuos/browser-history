import { parse, stringify } from 'uuid'

/**
 * Branded types so a GUID's string form and its raw-byte form can never be silently substituted
 * for a plain `string`/`Uint8Array` (or for each other) - conversion must go through parseGuid/
 * formatGuid below, enforced by the compiler rather than by convention. This exists because a
 * same-device GUID differing only in letter case (uppercase from one code path, lowercase from
 * another) used to compare unequal everywhere a plain `string` was used for it - see the
 * device-color/device-metadata lookup bug this was built to close.
 */
export type UuidString = string & { readonly __brand: 'UuidString' }
export type UuidBytes = Uint8Array & { readonly __brand: 'UuidBytes' }

/** Parses a canonical hyphenated GUID string (any casing) into its raw 16 bytes. Throws on invalid input. */
export function parseGuid(id: string): UuidBytes {
  return parse(id) as UuidBytes
}

/** Formats raw bytes back into the canonical lowercase hyphenated GUID string form. */
export function formatGuid(bytes: Uint8Array): UuidString {
  return stringify(bytes) as UuidString
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

/** Canonical (lowercase) string form - use to normalize a GUID string before storing/comparing
 * it anywhere it must remain text (network payloads, browser.storage.local - see DeviceID.ts). */
export function normalizeGuid(id: string): UuidString {
  return formatGuid(parseGuid(id))
}

const ZERO_GUID_BYTES = new Uint8Array(16) as UuidBytes

/**
 * Tolerant variant of parseGuid for data this code doesn't control the shape of - a synced
 * history event from another (possibly much older) device, which may predate this field
 * existing, or be malformed in some other way that's out of scope to recover here. Falls back to
 * an all-zero placeholder (renders as "Unknown device" with a deterministic fallback color,
 * same as any other unrecognized ID) rather than throwing and aborting the whole batch it's
 * part of - one bad historical row should never cost every other event in the same sync.
 */
export function parseGuidOrZero(id: unknown): UuidBytes {
  if (typeof id !== 'string') return ZERO_GUID_BYTES
  try {
    return parseGuid(id)
  } catch {
    console.warn('guid: could not parse device ID, using placeholder:', id)
    return ZERO_GUID_BYTES
  }
}
