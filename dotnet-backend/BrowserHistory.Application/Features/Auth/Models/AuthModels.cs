namespace BrowserHistory.Application.Features.Auth.Models;

/// <summary>
/// Device registration request
/// </summary>
public record RegisterDeviceRequest
{
    public required string DeviceName { get; init; }
    public required string Secret { get; init; }
}

/// <summary>
/// Device registration response
/// </summary>
public record RegisterDeviceResponse
{
    public required string DeviceId { get; init; }
    public required string Token { get; init; }
    public required int ExpiresIn { get; init; }
}

/// <summary>
/// Token refresh response
/// </summary>
public record RefreshTokenResponse
{
    public required string Token { get; init; }
    public required int ExpiresIn { get; init; }
}

/// <summary>
/// Device info DTO for authenticated device
/// </summary>
public record DeviceInfoDto
{
    public required string DeviceId { get; init; }
    public required string DeviceName { get; init; }
    public required DateTime RegisteredAt { get; init; }
    public required DateTime LastSeen { get; init; }
    public required bool IsActive { get; init; }
}
