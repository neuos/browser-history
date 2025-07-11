using BrowserHistory.Application.Common.Interfaces;
using Microsoft.Extensions.Logging;

namespace BrowserHistory.Infrastructure.Services;

/// <summary>
/// Date/time provider implementation
/// </summary>
public class DateTimeProvider : IDateTimeProvider
{
    public DateTime UtcNow => DateTime.UtcNow;
    public DateTime Now => DateTime.Now;
}

/// <summary>
/// Notification service implementation using Server-Sent Events
/// </summary>
public class NotificationService : INotificationService
{
    private readonly IServerSentEventService? _sseService;
    private readonly ILogger<NotificationService> _logger;

    public NotificationService(
        ILogger<NotificationService> logger,
        IServerSentEventService? sseService = null)
    {
        _logger = logger;
        _sseService = sseService;
    }

    public async Task NotifyDeviceConnectedAsync(string deviceId, string deviceName, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Device connected: {DeviceName} ({DeviceId})", deviceName, deviceId);
        
        if (_sseService != null)
        {
            await _sseService.BroadcastToOthersAsync(deviceId, new
            {
                type = "device_connected",
                data = new { deviceId, deviceName, timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() }
            }, cancellationToken);
        }
    }

    public async Task NotifyDeviceDisconnectedAsync(string deviceId, string deviceName, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Device disconnected: {DeviceName} ({DeviceId})", deviceName, deviceId);
        
        if (_sseService != null)
        {
            await _sseService.BroadcastToOthersAsync(deviceId, new
            {
                type = "device_disconnected",
                data = new { deviceId, deviceName, timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() }
            }, cancellationToken);
        }
    }

    public async Task NotifyHistorySyncStartedAsync(string deviceId, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("History sync started for device: {DeviceId}", deviceId);
        
        if (_sseService != null)
        {
            await _sseService.SendToDeviceAsync(deviceId, new
            {
                type = "sync_started",
                data = new { deviceId, timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() }
            }, cancellationToken);
        }
    }

    public async Task NotifyHistorySyncCompletedAsync(string deviceId, int itemsProcessed, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("History sync completed for device: {DeviceId}, items processed: {ItemsProcessed}", deviceId, itemsProcessed);
        
        if (_sseService != null)
        {
            await _sseService.SendToDeviceAsync(deviceId, new
            {
                type = "sync_completed",
                data = new { deviceId, itemsProcessed, timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() }
            }, cancellationToken);
        }
    }

    public async Task NotifySyncErrorAsync(string deviceId, string errorMessage, CancellationToken cancellationToken = default)
    {
        _logger.LogError("Sync error for device: {DeviceId}, error: {ErrorMessage}", deviceId, errorMessage);
        
        if (_sseService != null)
        {
            await _sseService.SendToDeviceAsync(deviceId, new
            {
                type = "sync_error",
                data = new { deviceId, error = errorMessage, timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() }
            }, cancellationToken);
        }
    }
}
