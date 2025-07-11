using BrowserHistory.Domain.ValueObjects;

namespace BrowserHistory.Application.Common.Interfaces;

/// <summary>
/// Interface for accessing current user/device context
/// </summary>
public interface ICurrentUserService
{
    /// <summary>
    /// Gets the current device ID from the authenticated context
    /// </summary>
    DeviceId? DeviceId { get; }

    /// <summary>
    /// Gets the current device name from the authenticated context
    /// </summary>
    string? DeviceName { get; }

    /// <summary>
    /// Checks if a device is currently authenticated
    /// </summary>
    bool IsAuthenticated { get; }
}
