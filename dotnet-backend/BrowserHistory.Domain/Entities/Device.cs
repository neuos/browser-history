using BrowserHistory.Domain.ValueObjects;

namespace BrowserHistory.Domain.Entities;

/// <summary>
/// Root aggregate representing a device that syncs browser history
/// </summary>
public class Device
{
    private Device() { } // EF Constructor

    private Device(DeviceId id, string deviceName)
    {
        Id = id;
        DeviceName = ValidateDeviceName(deviceName);
        RegisteredAt = DateTime.UtcNow;
        LastSeen = DateTime.UtcNow;
        IsActive = true;
    }

    public DeviceId Id { get; private set; }
    public string DeviceName { get; private set; } = string.Empty;
    public DateTime RegisteredAt { get; private set; }
    public DateTime LastSeen { get; private set; }
    public bool IsActive { get; private set; }

    /// <summary>
    /// Creates a new device with auto-generated ID
    /// </summary>
    public static Device Create(string deviceName)
    {
        return new Device(DeviceId.New(), deviceName);
    }

    /// <summary>
    /// Creates a device with specific ID (for testing or data migration)
    /// </summary>
    public static Device Create(DeviceId id, string deviceName)
    {
        return new Device(id, deviceName);
    }

    /// <summary>
    /// Updates the last seen timestamp
    /// </summary>
    public void UpdateLastSeen()
    {
        LastSeen = DateTime.UtcNow;
    }

    /// <summary>
    /// Updates the device name
    /// </summary>
    public void UpdateDeviceName(string newName)
    {
        DeviceName = ValidateDeviceName(newName);
        UpdateLastSeen();
    }

    /// <summary>
    /// Deactivates the device
    /// </summary>
    public void Deactivate()
    {
        IsActive = false;
        UpdateLastSeen();
    }

    /// <summary>
    /// Reactivates the device
    /// </summary>
    public void Reactivate()
    {
        IsActive = true;
        UpdateLastSeen();
    }

    private static string ValidateDeviceName(string deviceName)
    {
        if (string.IsNullOrWhiteSpace(deviceName))
            throw new ArgumentException("Device name cannot be null or empty", nameof(deviceName));

        if (deviceName.Length > 100)
            throw new ArgumentException("Device name cannot exceed 100 characters", nameof(deviceName));

        return deviceName.Trim();
    }
}
