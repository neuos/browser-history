using BrowserHistory.Domain.ValueObjects;

namespace BrowserHistory.Application.Common.Interfaces;

/// <summary>
/// Service for device authentication and token management.
/// </summary>
public interface IAuthService
{
    /// <summary>
    /// Registers a new device with the provided shared secret.
    /// </summary>
    /// <param name="deviceName">The name of the device.</param>
    /// <param name="sharedSecret">The shared secret for device authentication.</param>
    /// <returns>The device ID and access token.</returns>
    Task<(DeviceId DeviceId, string AccessToken, string RefreshToken)> RegisterDeviceAsync(
        string deviceName, 
        string sharedSecret,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Refreshes an access token using a refresh token.
    /// </summary>
    /// <param name="refreshToken">The refresh token.</param>
    /// <returns>New access and refresh tokens.</returns>
    Task<(string AccessToken, string RefreshToken)> RefreshTokenAsync(
        string refreshToken,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Validates an access token and returns the device ID.
    /// </summary>
    /// <param name="accessToken">The access token to validate.</param>
    /// <returns>The device ID if valid, null otherwise.</returns>
    Task<DeviceId?> ValidateTokenAsync(
        string accessToken,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets device information from a valid access token.
    /// </summary>
    /// <param name="accessToken">The access token.</param>
    /// <returns>Device information if valid, null otherwise.</returns>
    Task<(DeviceId DeviceId, string DeviceName, DateTime RegisteredAt, DateTime LastSeen, bool IsActive)?> GetDeviceInfoAsync(
        string accessToken,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Updates the last seen timestamp for a device.
    /// </summary>
    /// <param name="deviceId">The device ID.</param>
    Task UpdateLastSeenAsync(
        DeviceId deviceId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Revokes all tokens for a device (logout).
    /// </summary>
    /// <param name="deviceId">The device ID.</param>
    Task RevokeDeviceTokensAsync(
        DeviceId deviceId,
        CancellationToken cancellationToken = default);
}
