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
  await browser.storage.local.set({ deviceID });
  return deviceID;
}

export function getDeviceId() {
  if (deviceID) {
    return deviceID;
  }
  throw new Error('Device ID not initialized. Call initializeDeviceID first.');
}
