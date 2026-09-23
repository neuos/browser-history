using BrowserHistory.Application.Common.Interfaces;
using BrowserHistory.Domain.Entities;
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
    private readonly IDeviceRepository _deviceRepository;
    private readonly IUnitOfWork _unitOfWork;

    public RegisterDeviceCommandHandler(
        IAuthService authService,
        IConfiguration configuration,
        IDeviceRepository deviceRepository,
        IUnitOfWork unitOfWork)
    {
        _authService = authService;
        _configuration = configuration;
        _deviceRepository = deviceRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<RegisterDeviceResult> Handle(
        RegisterDeviceCommand request,
        CancellationToken cancellationToken)
    {
        // Register the device (identity/auth) using the auth service - this issues the JWT
        // and stores the device in the separate Identity database.
        var (deviceId, accessToken, refreshToken) = await _authService.RegisterDeviceAsync(
            request.DeviceName,
            request.SharedSecret,
            cancellationToken);

        // The Sync/History/Page features all look devices up in the main database via
        // IDeviceRepository, which the Identity database above doesn't populate - create the
        // matching domain aggregate here so a freshly-registered device can actually sync.
        // AuthService.RegisterDeviceAsync is idempotent by device name (re-authenticates an
        // existing device rather than erroring), so this can be called again for a device that
        // already has a domain Device row - only create it the first time, or this would violate
        // the DeviceName uniqueness constraint.
        var existingDevice = await _deviceRepository.GetByIdAsync(deviceId, cancellationToken);
        if (existingDevice == null)
        {
            var device = Device.Create(deviceId, request.DeviceName);
            await _deviceRepository.CreateAsync(device, cancellationToken);
            var syncEvent = SyncEvent.DeviceConnected(deviceId);
            await _unitOfWork.SyncEvents.CreateAsync(syncEvent, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
        }

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
