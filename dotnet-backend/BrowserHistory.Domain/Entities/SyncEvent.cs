using BrowserHistory.Domain.ValueObjects;

namespace BrowserHistory.Domain.Entities;

/// <summary>
/// Represents a sync event that tracks history synchronization between devices
/// </summary>
public class SyncEvent
{
    private SyncEvent() { } // For EF Core

    private SyncEvent(DeviceId deviceId, SyncEventType eventType, string? metadata = null)
    {
        Id = Guid.NewGuid();
        DeviceId = deviceId;
        EventType = eventType;
        Metadata = metadata;
        Timestamp = DateTime.UtcNow;
    }

    public Guid Id { get; private set; }
    public DeviceId DeviceId { get; private set; } = default!;
    public SyncEventType EventType { get; private set; }
    public string? Metadata { get; private set; }
    public DateTime Timestamp { get; private set; }

    /// <summary>
    /// Creates a new sync event
    /// </summary>
    public static SyncEvent Create(DeviceId deviceId, SyncEventType eventType, string? metadata = null)
    {
        if (deviceId.Value == Guid.Empty)
            throw new ArgumentException("Device ID cannot be empty", nameof(deviceId));

        return new SyncEvent(deviceId, eventType, metadata);
    }

    /// <summary>
    /// Creates a device connected event
    /// </summary>
    public static SyncEvent DeviceConnected(DeviceId deviceId) =>
        Create(deviceId, SyncEventType.DeviceConnected);

    /// <summary>
    /// Creates a device disconnected event
    /// </summary>
    public static SyncEvent DeviceDisconnected(DeviceId deviceId) =>
        Create(deviceId, SyncEventType.DeviceDisconnected);

    /// <summary>
    /// Creates a history sync started event
    /// </summary>
    public static SyncEvent HistorySyncStarted(DeviceId deviceId, string? metadata = null) =>
        Create(deviceId, SyncEventType.HistorySyncStarted, metadata);

    /// <summary>
    /// Creates a history sync completed event
    /// </summary>
    public static SyncEvent HistorySyncCompleted(DeviceId deviceId, string? metadata = null) =>
        Create(deviceId, SyncEventType.HistorySyncCompleted, metadata);

    /// <summary>
    /// Creates a sync error event
    /// </summary>
    public static SyncEvent SyncError(DeviceId deviceId, string errorMessage) =>
        Create(deviceId, SyncEventType.SyncError, errorMessage);
}

/// <summary>
/// Types of sync events that can occur
/// </summary>
public enum SyncEventType
{
    DeviceConnected = 1,
    DeviceDisconnected = 2,
    HistorySyncStarted = 3,
    HistorySyncCompleted = 4,
    SyncError = 5
}
