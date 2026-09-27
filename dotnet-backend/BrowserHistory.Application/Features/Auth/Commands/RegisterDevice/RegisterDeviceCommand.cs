using BrowserHistory.Domain.ValueObjects;
using MediatR;

namespace BrowserHistory.Application.Features.Auth.Commands.RegisterDevice;

public sealed record RegisterDeviceCommand(
    string DeviceName,
    string SharedSecret
) : IRequest<RegisterDeviceResult>;

public sealed record RegisterDeviceResult(
    DeviceId DeviceId,
    string AccessToken,
    DateTime ExpiresAt
);
