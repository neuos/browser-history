namespace BrowserHistory.Application.Common.Interfaces;

/// <summary>
/// Interface for Server-Sent Events service - Application layer abstraction
/// </summary>
public interface IServerSentEventService : IDisposable
{
    /// <summary>
    /// Send a message to a specific device
    /// </summary>
    Task<bool> SendToDeviceAsync(string deviceId, object message, CancellationToken cancellationToken = default);

    /// <summary>
    /// Broadcast a message to all devices except the specified one
    /// </summary>
    Task BroadcastToOthersAsync(string excludeDeviceId, object message, CancellationToken cancellationToken = default);

    /// <summary>
    /// Broadcast a message to all connected devices
    /// </summary>
    Task BroadcastToAllAsync(object message, CancellationToken cancellationToken = default);

    /// <summary>
    /// Get list of connected device IDs
    /// </summary>
    IEnumerable<string> GetConnectedDevices();

    /// <summary>
    /// Get total number of active connections
    /// </summary>
    int GetConnectionCount();
}
