using Microsoft.AspNetCore.Identity;
using BrowserHistory.Domain.ValueObjects;

namespace BrowserHistory.Infrastructure.Identity;

/// <summary>
/// Represents a device user in the ASP.NET Core Identity system.
/// Each device is treated as a user with JWT token authentication.
/// </summary>
public class DeviceUser : IdentityUser<Guid>
{
    /// <summary>
    /// The device identifier that links to the Domain Device entity.
    /// </summary>
    public DeviceId DeviceId { get; private set; } = default!;

    /// <summary>
    /// The display name of the device.
    /// </summary>
    public string DeviceName { get; private set; } = string.Empty;

    /// <summary>
    /// When the device was first registered.
    /// </summary>
    public DateTime RegisteredAt { get; private set; }

    /// <summary>
    /// The last time this device was active.
    /// </summary>
    public DateTime LastSeen { get; private set; }

    /// <summary>
    /// Whether the device is currently active.
    /// </summary>
    public bool IsActive { get; private set; }

    /// <summary>
    /// Shared secret used for device authentication during registration.
    /// This is hashed and stored securely.
    /// </summary>
    public string SharedSecretHash { get; private set; } = string.Empty;

    // Required for Entity Framework
    private DeviceUser() { }

    public DeviceUser(
        DeviceId deviceId,
        string deviceName,
        string sharedSecretHash,
        string email = "")
    {
        Id = deviceId.Value;
        DeviceId = deviceId;
        DeviceName = deviceName;
        SharedSecretHash = sharedSecretHash;
        RegisteredAt = DateTime.UtcNow;
        LastSeen = DateTime.UtcNow;
        IsActive = true;
        
        // Identity fields
        UserName = deviceId.Value.ToString();
        Email = string.IsNullOrEmpty(email) ? $"{deviceId.Value}@device.local" : email;
        EmailConfirmed = true; // Devices are auto-confirmed
        LockoutEnabled = false; // Devices cannot be locked out
        TwoFactorEnabled = false; // Devices don't support 2FA
    }

    /// <summary>
    /// Updates the last seen timestamp for the device.
    /// </summary>
    public void UpdateLastSeen()
    {
        LastSeen = DateTime.UtcNow;
    }

    /// <summary>
    /// Deactivates the device.
    /// </summary>
    public void Deactivate()
    {
        IsActive = false;
    }

    /// <summary>
    /// Reactivates the device.
    /// </summary>
    public void Reactivate()
    {
        IsActive = true;
        UpdateLastSeen();
    }
}
