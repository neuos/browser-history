using BrowserHistory.Application.Common.Interfaces;
using MediatR;
using Microsoft.Extensions.Configuration;

namespace BrowserHistory.Application.Features.Auth.Commands.RegisterDevice;

/// <summary>
/// Handler for RegisterDeviceCommand.
/// </summary>
public sealed class RegisterDeviceCommandHandler : IRequestHandler<RegisterDeviceCommand, RegisterDeviceResult>
{
    private readonly IAuthService _authService;
    private readonly IConfiguration _configuration;

    public RegisterDeviceCommandHandler(
        IAuthService authService,
        IConfiguration configuration)
    {
        _authService = authService;
        _configuration = configuration;
    }

    public async Task<RegisterDeviceResult> Handle(
        RegisterDeviceCommand request,
        CancellationToken cancellationToken)
    {
        // Register the device using the auth service
        var (deviceId, accessToken, refreshToken) = await _authService.RegisterDeviceAsync(
            request.DeviceName,
            request.SharedSecret,
            cancellationToken);

        // Calculate expiry time based on configuration
        var accessTokenExpiryMinutes = int.TryParse(_configuration["Jwt:AccessTokenExpiryMinutes"], out var minutes) ? minutes : 60;
        var expiresAt = DateTime.UtcNow.AddMinutes(accessTokenExpiryMinutes);

        return new RegisterDeviceResult(
            deviceId,
            accessToken,
            refreshToken,
            expiresAt);
    }
}
