using BrowserHistory.Domain.ValueObjects;
using MediatR;

namespace BrowserHistory.Application.Features.Auth.Queries.GetDeviceInfo;

/// <summary>
/// Query to get device information from an access token.
/// </summary>
public sealed record GetDeviceInfoQuery(
    string AccessToken
) : IRequest<GetDeviceInfoResult?>;

/// <summary>
/// Result containing device information.
/// </summary>
public sealed record GetDeviceInfoResult(
    DeviceId DeviceId,
    string DeviceName,
    DateTime RegisteredAt,
    DateTime LastSeen,
    bool IsActive
);
