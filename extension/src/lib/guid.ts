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

/** Canonical (lowercase) string form - use to normalize a GUID string before storing/comparing
 * it anywhere it must remain text (network payloads, browser.storage.local - see DeviceID.ts). */
export function normalizeGuid(id: string): UuidString {
  return formatGuid(parseGuid(id))
}
