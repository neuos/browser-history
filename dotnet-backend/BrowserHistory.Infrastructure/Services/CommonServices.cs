using BrowserHistory.Application.Common.Interfaces;

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
    // This will be enhanced when we implement the API layer with SSE
    // For now, providing basic logging implementation

    public Task NotifyDeviceConnectedAsync(string deviceId, string deviceName, CancellationToken cancellationToken = default)
    {
        // TODO: Implement SSE notification
        Console.WriteLine($"Device connected: {deviceName} ({deviceId})");
        return Task.CompletedTask;
    }

    public Task NotifyDeviceDisconnectedAsync(string deviceId, string deviceName, CancellationToken cancellationToken = default)
    {
        // TODO: Implement SSE notification
        Console.WriteLine($"Device disconnected: {deviceName} ({deviceId})");
        return Task.CompletedTask;
    }

    public Task NotifyHistorySyncStartedAsync(string deviceId, CancellationToken cancellationToken = default)
    {
        // TODO: Implement SSE notification
        Console.WriteLine($"History sync started for device: {deviceId}");
        return Task.CompletedTask;
    }

    public Task NotifyHistorySyncCompletedAsync(string deviceId, int itemsProcessed, CancellationToken cancellationToken = default)
    {
        // TODO: Implement SSE notification
        Console.WriteLine($"History sync completed for device: {deviceId}, items processed: {itemsProcessed}");
        return Task.CompletedTask;
    }

    public Task NotifySyncErrorAsync(string deviceId, string errorMessage, CancellationToken cancellationToken = default)
    {
        // TODO: Implement SSE notification
        Console.WriteLine($"Sync error for device: {deviceId}, error: {errorMessage}");
        return Task.CompletedTask;
    }
}
