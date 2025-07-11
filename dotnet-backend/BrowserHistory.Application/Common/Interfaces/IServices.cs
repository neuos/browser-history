namespace BrowserHistory.Application.Common.Interfaces;

/// <summary>
/// Interface for date/time operations to support testing
/// </summary>
public interface IDateTimeProvider
{
    DateTime UtcNow { get; }
    DateTime Now { get; }
}

/// <summary>
/// Interface for notification services (SSE, WebSockets, etc.)
/// </summary>
public interface INotificationService
{
    Task NotifyDeviceConnectedAsync(string deviceId, string deviceName, CancellationToken cancellationToken = default);
    Task NotifyDeviceDisconnectedAsync(string deviceId, string deviceName, CancellationToken cancellationToken = default);
    Task NotifyHistorySyncStartedAsync(string deviceId, CancellationToken cancellationToken = default);
    Task NotifyHistorySyncCompletedAsync(string deviceId, int itemsProcessed, CancellationToken cancellationToken = default);
    Task NotifySyncErrorAsync(string deviceId, string errorMessage, CancellationToken cancellationToken = default);
}
