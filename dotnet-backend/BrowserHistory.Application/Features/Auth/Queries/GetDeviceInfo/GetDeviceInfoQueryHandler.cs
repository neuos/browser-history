using BrowserHistory.Application.Common.Interfaces;
using MediatR;

namespace BrowserHistory.Application.Features.Auth.Queries.GetDeviceInfo;

/// <summary>
/// Handler for GetDeviceInfoQuery.
/// </summary>
public sealed class GetDeviceInfoQueryHandler : IRequestHandler<GetDeviceInfoQuery, GetDeviceInfoResult?>
{
    private readonly IAuthService _authService;

    public GetDeviceInfoQueryHandler(IAuthService authService)
    {
        _authService = authService;
    }

    public async Task<GetDeviceInfoResult?> Handle(
        GetDeviceInfoQuery request,
        CancellationToken cancellationToken)
    {
        var deviceInfo = await _authService.GetDeviceInfoAsync(
            request.AccessToken,
            cancellationToken);

        if (deviceInfo == null)
        {
            return null;
        }

        var (deviceId, deviceName, registeredAt, lastSeen, isActive) = deviceInfo.Value;

        return new GetDeviceInfoResult(
            deviceId,
            deviceName,
            registeredAt,
            lastSeen,
            isActive);
    }
}
