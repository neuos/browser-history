using BrowserHistory.Domain.ValueObjects;

namespace BrowserHistory.Application.Common.Interfaces;

public interface IAuthService
{
    Task<(DeviceId DeviceId, string AccessToken)> RegisterDeviceAsync(
        string deviceName,
        string sharedSecret,
        CancellationToken cancellationToken = default);

    Task<string> RefreshTokenAsync(
        string accessToken,
        CancellationToken cancellationToken = default);

    Task<DeviceId?> ValidateTokenAsync(
        string accessToken,
        CancellationToken cancellationToken = default);

    Task UpdateLastSeenAsync(
        DeviceId deviceId,
        CancellationToken cancellationToken = default);
}
