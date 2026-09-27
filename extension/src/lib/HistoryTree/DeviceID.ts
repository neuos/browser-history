import { UuidBytes, parseGuid, normalizeGuid } from "../guid";

// Generate on first extension run and store in persistent storage. Held in memory as raw bytes
// (see guid.ts) since that's what every HistoryNode this device captures gets tagged with -
// browser.storage.local can only hold a string (verified empirically: a Uint8Array written there
// comes back as undefined, not coerced), so the persisted form is always the canonical string.
let deviceID: UuidBytes | undefined;
export async function initializeDeviceID() {
  if (deviceID) {
    return deviceID;
  }

  const data = await browser.storage.local.get('deviceId');
  if (data.deviceId) {
    deviceID = parseGuid(data.deviceId);
    return deviceID;
  }

  // Generate a new UUID v4
  const generated = crypto.randomUUID();
  deviceID = parseGuid(generated);
  // Key must match the read above ("deviceId") - a mismatched key here would silently generate a
  // fresh random device ID on every background-script restart, with no error.
  await browser.storage.local.set({ deviceId: generated });
  return deviceID;
}

export function getDeviceId(): UuidBytes {
  if (deviceID) {
    return deviceID;
  }
  throw new Error('Device ID not initialized. Call initializeDeviceID first.');
}

/**
 * Reconciles the locally-generated device ID with the server-registered one, so the ID this
 * device stamps onto its own captured HistoryNodes always matches the ID the server (and every
 * other device) actually knows it by. Without this, a device could locally tag its own history
 * with one UUID while syncing under a completely different, server-assigned identity.
 */
export async function setDeviceId(id: string): Promise<void> {
  // Normalized to the canonical (lowercase) form for the persisted string - this is what other
  // devices' equality checks/lookups expect regardless of whatever casing the server happened to
  // send this particular time. The in-memory value is the actual bytes, not text.
  const normalized = normalizeGuid(id);
  deviceID = parseGuid(normalized);
  await browser.storage.local.set({ deviceId: normalized });
}
