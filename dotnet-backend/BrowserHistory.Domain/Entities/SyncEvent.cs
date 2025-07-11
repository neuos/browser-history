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
        Guid entityId,
        DeviceId deviceId, 
        DateTime timestamp,
        SyncEventType eventType, 
        SyncEntityType entityType,
        string entityReference,
        string data,
        string checksum,
        string? metadata = null)
    {
        Id = Guid.NewGuid();
        EntityId = entityId;
        DeviceId = deviceId;
        Timestamp = timestamp;
        EventType = eventType;
        EntityType = entityType;
        EntityReference = entityReference;
        Data = data;
        Checksum = checksum;
        Metadata = metadata;
    }

    // Legacy constructor for backward compatibility
    private SyncEvent(DeviceId deviceId, SyncEventType eventType, string? metadata = null)
    {
        Id = Guid.NewGuid();
        EntityId = Guid.NewGuid();
        DeviceId = deviceId;
        EventType = eventType;
        EntityType = SyncEntityType.History; // Default for legacy events
        EntityReference = string.Empty;
        Data = string.Empty;
        Checksum = string.Empty;
        Metadata = metadata;
        Timestamp = DateTime.UtcNow;
    }

    public Guid Id { get; private set; }
    public Guid EntityId { get; private set; }
    public DeviceId DeviceId { get; private set; } = default!;
    public DateTime Timestamp { get; private set; }
    public SyncEventType EventType { get; private set; }
    public SyncEntityType EntityType { get; private set; }
    public string EntityReference { get; private set; } = string.Empty;
    public string Data { get; private set; } = string.Empty;
    public string Checksum { get; private set; } = string.Empty;
    public string? Metadata { get; private set; }

    /// <summary>
    /// Creates a new detailed sync event
    /// </summary>
    public static SyncEvent Create(
        Guid entityId,
        DeviceId deviceId,
        DateTime timestamp,
        SyncEventType eventType,
        SyncEntityType entityType,
        string entityReference,
        string data,
        string checksum,
        string? metadata = null)
    {
        if (string.IsNullOrWhiteSpace(entityReference))
            throw new ArgumentException("Entity reference cannot be null or empty", nameof(entityReference));
        
        if (string.IsNullOrWhiteSpace(data))
            throw new ArgumentException("Data cannot be null or empty", nameof(data));
        
        if (string.IsNullOrWhiteSpace(checksum))
            throw new ArgumentException("Checksum cannot be null or empty", nameof(checksum));

        return new SyncEvent(entityId, deviceId, timestamp, eventType, entityType, 
            entityReference, data, checksum, metadata);
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
