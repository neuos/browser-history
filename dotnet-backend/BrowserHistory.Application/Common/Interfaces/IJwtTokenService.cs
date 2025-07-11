namespace BrowserHistory.Application.Common.Interfaces;

/// <summary>
/// Service for JWT token operations
/// </summary>
public interface IJwtTokenService
{
    /// <summary>
    /// Generate a JWT token for a device
    /// </summary>
    /// <param name="deviceId">The device identifier</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>JWT token and expiration time</returns>
    Task<(string Token, int ExpiresIn)> GenerateTokenAsync(string deviceId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Validate and parse a JWT token
    /// </summary>
    /// <param name="token">The JWT token to validate</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Device ID if valid, null otherwise</returns>
    Task<string?> ValidateTokenAsync(string token, CancellationToken cancellationToken = default);

    /// <summary>
    /// Extract device ID from token without full validation (for expired token refresh)
    /// </summary>
    /// <param name="token">The JWT token</param>
    /// <returns>Device ID if token is properly formatted, null otherwise</returns>
    string? ExtractDeviceIdFromToken(string token);
}
