/**
 * Per-device display metadata - name and an optional user-chosen emoji - learned either from
 * this device's own config or from a 'device' sync event broadcast by another device. Used to
 * render a per-entry "which device captured this" indicator in the history list.
 */
export interface DeviceMetadata {
    deviceId: string;
    deviceName: string;
    emoji?: string;
}
