namespace BrowserHistory.Application.Common.Interfaces;

public interface IServerSentEventService : IDisposable
{
    Task<bool> SendToDeviceAsync(string deviceId, object message, CancellationToken cancellationToken = default);
    Task BroadcastToOthersAsync(string excludeDeviceId, object message, CancellationToken cancellationToken = default);
    Task BroadcastToAllAsync(object message, CancellationToken cancellationToken = default);
    IEnumerable<string> GetConnectedDevices();
    int GetConnectionCount();
}
