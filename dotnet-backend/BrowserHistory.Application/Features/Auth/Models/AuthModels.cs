namespace BrowserHistory.Application.Features.Auth.Models;

public record RegisterDeviceRequest
{
    public required string DeviceName { get; init; }
    public required string Secret { get; init; }
}

public record RegisterDeviceResponse
{
    public required string DeviceId { get; init; }
    public required string Token { get; init; }
    public required int ExpiresIn { get; init; }
}

public record RefreshTokenResponse
{
    public required string Token { get; init; }
    public required int ExpiresIn { get; init; }
}
