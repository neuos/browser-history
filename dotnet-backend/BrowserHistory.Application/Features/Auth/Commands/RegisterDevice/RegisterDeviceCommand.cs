using BrowserHistory.Domain.ValueObjects;
using MediatR;

namespace BrowserHistory.Application.Features.Auth.Commands.RegisterDevice;

/// <summary>
/// Command to register a new device for authentication.
/// </summary>
public sealed record RegisterDeviceCommand(
    string DeviceName,
    string SharedSecret
) : IRequest<RegisterDeviceResult>;

/// <summary>
/// Result of device registration.
/// </summary>
public sealed record RegisterDeviceResult(
    DeviceId DeviceId,
    string AccessToken,
    string RefreshToken,
    DateTime ExpiresAt
);
