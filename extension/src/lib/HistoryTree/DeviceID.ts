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
  // Bug fixed: this used to write the shorthand key "deviceID" (capital ID) while the read
  // above looks up "deviceId" (lowercase d) - two different storage keys, so the persisted
  // value was never actually found on the next load. Every background-script restart (routine
  // on Chrome's MV3 service worker, less so on Firefox's persistent MV2 page, but still happens
  // on any browser/extension restart) silently generated a brand-new random device ID instead
  // of reusing the real one, with no error - it always "worked", just as the wrong identity.
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
