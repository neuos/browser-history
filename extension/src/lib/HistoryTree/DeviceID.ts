import { guid } from "../guid";

// Generate on first extension run and store in persistent storage
let deviceID: guid | undefined;
export async function initializeDeviceID() {
  if(deviceID) {
    return deviceID;
  }

  const data = await browser.storage.local.get('deviceId');
  if (data.deviceId) {
    deviceID = data.deviceId;
    return deviceID;
  }

  // Generate a new UUID v4
  deviceID = crypto.randomUUID();
  // Bug fixed: this used to write the shorthand key "deviceID" (capital ID) while the read
  // above looks up "deviceId" (lowercase d) - two different storage keys, so the persisted
  // value was never actually found on the next load. Every background-script restart (routine
  // on Chrome's MV3 service worker, less so on Firefox's persistent MV2 page, but still happens
  // on any browser/extension restart) silently generated a brand-new random device ID instead
  // of reusing the real one, with no error - it always "worked", just as the wrong identity.
  await browser.storage.local.set({ deviceId: deviceID });
  return deviceID;
}

export function getDeviceId() {
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
  // Cast: the server-assigned ID is always a real UUID at runtime, but arrives typed as a plain
  // string (it's just JSON off the wire) rather than the guid template-literal type.
  deviceID = id as guid;
  await browser.storage.local.set({ deviceId: id });
}
