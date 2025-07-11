using System.Collections.Concurrent;
using System.Text;
using System.Text.Json;
using BrowserHistory.Application.Common.Interfaces;
using BrowserHistory.Domain.ValueObjects;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;

namespace BrowserHistory.Infrastructure.Services;

/// <summary>
/// Server-Sent Events service for real-time notifications
/// </summary>
public class ServerSentEventService : IServerSentEventService, ISSEConnectionManager
{
    private readonly ConcurrentDictionary<string, SSEConnection> _connections = new();
    private readonly ILogger<ServerSentEventService> _logger;
    private readonly Timer _pingTimer;

    public ServerSentEventService(ILogger<ServerSentEventService> logger)
    {
        _logger = logger;
        
        // Start ping timer to keep connections alive (every 30 seconds)
        _pingTimer = new Timer(PingAllConnections, null, TimeSpan.FromSeconds(30), TimeSpan.FromSeconds(30));
    }

    public async Task<bool> AddConnectionAsync(string deviceId, HttpResponse response, CancellationToken cancellationToken = default)
    {
        try
        {
            // Remove any existing connection for this device
            RemoveConnection(deviceId);

            // Configure response for SSE
            response.Headers["Content-Type"] = "text/event-stream";
            response.Headers["Cache-Control"] = "no-cache";
            response.Headers["Connection"] = "keep-alive";
            response.Headers["Access-Control-Allow-Origin"] = "*";
            response.Headers["Access-Control-Allow-Headers"] = "Cache-Control";

            var connection = new SSEConnection
            {
                DeviceId = deviceId,
                Response = response,
                LastPing = DateTime.UtcNow,
                CancellationToken = cancellationToken
            };

            _connections.TryAdd(deviceId, connection);
            
            _logger.LogInformation("SSE connection added for device: {DeviceId}", deviceId);

            // Send initial connection confirmation
            await SendToDeviceAsync(deviceId, new
            {
                type = "connected",
                data = new { deviceId, timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() }
            }, cancellationToken);

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to add SSE connection for device: {DeviceId}", deviceId);
            return false;
        }
    }

    public bool RemoveConnection(string deviceId)
    {
        if (_connections.TryRemove(deviceId, out var connection))
        {
            try
            {
                connection.CancellationTokenSource?.Cancel();
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Error cancelling SSE connection for device: {DeviceId}", deviceId);
            }
            
            _logger.LogInformation("SSE connection removed for device: {DeviceId}", deviceId);
            return true;
        }
        return false;
    }

    public async Task<bool> SendToDeviceAsync(string deviceId, object message, CancellationToken cancellationToken = default)
    {
        if (!_connections.TryGetValue(deviceId, out var connection))
        {
            return false;
        }

        try
        {
            var json = JsonSerializer.Serialize(message);
            var data = $"data: {json}\n\n";
            var bytes = Encoding.UTF8.GetBytes(data);

            await connection.Response.Body.WriteAsync(bytes, cancellationToken);
            await connection.Response.Body.FlushAsync(cancellationToken);
            
            connection.LastPing = DateTime.UtcNow;
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send SSE message to device: {DeviceId}", deviceId);
            RemoveConnection(deviceId);
            return false;
        }
    }

    public async Task BroadcastToOthersAsync(string excludeDeviceId, object message, CancellationToken cancellationToken = default)
    {
        var tasks = new List<Task>();
        
        foreach (var (deviceId, _) in _connections)
        {
            if (deviceId != excludeDeviceId)
            {
                tasks.Add(SendToDeviceAsync(deviceId, message, cancellationToken));
            }
        }

        if (tasks.Any())
        {
            await Task.WhenAll(tasks);
        }
    }

    public async Task BroadcastToAllAsync(object message, CancellationToken cancellationToken = default)
    {
        var tasks = _connections.Keys.Select(deviceId => 
            SendToDeviceAsync(deviceId, message, cancellationToken)).ToList();

        if (tasks.Any())
        {
            await Task.WhenAll(tasks);
        }
    }

    public IEnumerable<string> GetConnectedDevices()
    {
        return _connections.Keys.ToList();
    }

    public int GetConnectionCount()
    {
        return _connections.Count;
    }

    public async Task KeepConnectionAliveAsync(string deviceId, CancellationToken cancellationToken = default)
    {
        if (!_connections.TryGetValue(deviceId, out var connection))
        {
            return;
        }

        try
        {
            // Keep the connection alive by waiting for cancellation
            await Task.Delay(Timeout.Infinite, cancellationToken);
        }
        catch (OperationCanceledException)
        {
            // Expected when connection is cancelled
            _logger.LogDebug("SSE connection cancelled for device: {DeviceId}", deviceId);
        }
        finally
        {
            RemoveConnection(deviceId);
        }
    }

    private async void PingAllConnections(object? state)
    {
        var now = DateTime.UtcNow;
        var staleThreshold = TimeSpan.FromMinutes(2);
        var staleConnections = new List<string>();

        foreach (var (deviceId, connection) in _connections)
        {
            try
            {
                // Send ping
                await SendToDeviceAsync(deviceId, new
                {
                    type = "ping",
                    timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
                });

                // Check if connection is stale
                if (now - connection.LastPing > staleThreshold)
                {
                    staleConnections.Add(deviceId);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to ping SSE device: {DeviceId}", deviceId);
                staleConnections.Add(deviceId);
            }
        }

        // Remove stale connections
        foreach (var deviceId in staleConnections)
        {
            _logger.LogInformation("Removing stale SSE connection for device: {DeviceId}", deviceId);
            RemoveConnection(deviceId);
        }
    }

    public void Dispose()
    {
        _pingTimer?.Dispose();
        
        // Close all connections
        foreach (var deviceId in _connections.Keys.ToList())
        {
            RemoveConnection(deviceId);
        }
        
        _connections.Clear();
    }
}

/// <summary>
/// Represents an active SSE connection
/// </summary>
internal class SSEConnection
{
    public required string DeviceId { get; init; }
    public required HttpResponse Response { get; init; }
    public DateTime LastPing { get; set; }
    public CancellationToken CancellationToken { get; init; }
    public CancellationTokenSource? CancellationTokenSource { get; init; }
}
