using BrowserHistory.Domain.ValueObjects;
using BrowserHistory.Domain.Enums;

namespace BrowserHistory.Domain.Entities;

/// <summary>
/// Represents a sync event that tracks data synchronization between devices
/// </summary>
public class SyncEvent
{
    private SyncEvent() { } // For EF Core

    private SyncEvent(
        Guid id,
        string entityId,
        DeviceId deviceId,
        DateTime timestamp,
        SyncEventType eventType,
        SyncEntityType entityType,
        string data,
        string checksum,
        string? metadata = null)
    {
        Id = id;
        EntityId = entityId;
        DeviceId = deviceId;
        Timestamp = timestamp;
        EventType = eventType;
        EntityType = entityType;
        Data = data;
        Checksum = checksum;
        Metadata = metadata;
    }

    // Legacy constructor for device-lifecycle events that aren't tied to a specific entity
    private SyncEvent(DeviceId deviceId, SyncEventType eventType, string? metadata = null)
    {
        Id = Guid.NewGuid();
        EntityId = string.Empty;
        DeviceId = deviceId;
        EventType = eventType;
        EntityType = SyncEntityType.History; // Default for legacy events
        Data = string.Empty;
        Checksum = string.Empty;
        Metadata = metadata;
        Timestamp = DateTime.UtcNow;
    }

    public Guid Id { get; private set; }
    public string EntityId { get; private set; } = string.Empty;
    public DeviceId DeviceId { get; private set; } = default!;
    public DateTime Timestamp { get; private set; }
    public SyncEventType EventType { get; private set; }
    public SyncEntityType EntityType { get; private set; }
    public string Data { get; private set; } = string.Empty;
    public string Checksum { get; private set; } = string.Empty;
    public string? Metadata { get; private set; }

    /// <summary>
    /// Creates a new detailed sync event tied to a specific entity (a history node or page).
    /// EntityId is a string because entities are keyed differently: history nodes use a GUID,
    /// pages use their URL. The caller (client) supplies `id`, not the server: it's the
    /// idempotency key that lets a client safely resubmit the same event (e.g. after a timeout
    /// where it doesn't know whether the first attempt landed) without creating a duplicate -
    /// resubmission detection in SubmitSyncEventsCommandHandler only works because this id is
    /// also the EF primary key, so a second submission is a genuine, checkable conflict.
    /// </summary>
    public static SyncEvent Create(
        Guid id,
        string entityId,
        DeviceId deviceId,
        DateTime timestamp,
        SyncEventType eventType,
        SyncEntityType entityType,
        string data,
        string checksum,
        string? metadata = null)
    {
        if (id == Guid.Empty)
            throw new ArgumentException("Id cannot be empty", nameof(id));

        if (string.IsNullOrWhiteSpace(entityId))
            throw new ArgumentException("Entity id cannot be null or empty", nameof(entityId));

        if (string.IsNullOrWhiteSpace(data))
            throw new ArgumentException("Data cannot be null or empty", nameof(data));

        if (string.IsNullOrWhiteSpace(checksum))
            throw new ArgumentException("Checksum cannot be null or empty", nameof(checksum));

        return new SyncEvent(id, entityId, deviceId, timestamp, eventType, entityType,
            data, checksum, metadata);
    }

    /// <summary>
    /// Creates a new sync event (legacy method for backward compatibility)
    /// </summary>
    public static SyncEvent Create(DeviceId deviceId, SyncEventType eventType, string? metadata = null)
    {
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
    SyncError = 5,
    Create = 6,
    Update = 7,
    Delete = 8
}
