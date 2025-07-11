using Microsoft.AspNetCore.Http;

namespace BrowserHistory.Infrastructure.Services;

/// <summary>
/// Infrastructure layer interface for Server-Sent Events service with HTTP types
/// </summary>
public interface ISSEConnectionManager : IDisposable
{
    /// <summary>
    /// Add a new SSE connection for a device
    /// </summary>
    Task<bool> AddConnectionAsync(string deviceId, HttpResponse response, CancellationToken cancellationToken = default);

    /// <summary>
    /// Remove an SSE connection for a device
    /// </summary>
    bool RemoveConnection(string deviceId);

    /// <summary>
    /// Keep a connection alive until cancelled
    /// </summary>
    Task KeepConnectionAliveAsync(string deviceId, CancellationToken cancellationToken = default);
}
