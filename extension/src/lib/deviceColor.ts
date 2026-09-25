/**
 * Deterministically derives a fallback indicator for a device ID, for devices that haven't
 * picked their own emoji yet. Same ID always produces the same result (not re-randomized per
 * render), so a device's fallback stays visually consistent across the history list. The
 * fallback is one of the standard colored-circle emoji rather than a custom-drawn swatch, so
 * every device indicator - chosen or fallback - renders as the exact same kind of thing: text.
 */
const FALLBACK_EMOJI = ['🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '🟤', '⚫', '⚪'];

export function emojiForDeviceId(deviceId: string): string {
  let hash = 0;
  for (let i = 0; i < deviceId.length; i++) {
    hash = (hash * 31 + deviceId.charCodeAt(i)) | 0;
  }
  return FALLBACK_EMOJI[Math.abs(hash) % FALLBACK_EMOJI.length];
}
