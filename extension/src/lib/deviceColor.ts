/**
 * Deterministically derives a display color from a device ID, for devices that haven't picked
 * an emoji yet. Same ID always produces the same color (not re-randomized per render), so a
 * device's fallback indicator stays visually consistent across the history list.
 */
export function colorForDeviceId(deviceId: string): string {
  let hash = 0;
  for (let i = 0; i < deviceId.length; i++) {
    hash = (hash * 31 + deviceId.charCodeAt(i)) | 0;
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 65%, 55%)`;
}
