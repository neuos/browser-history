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
}

/// <summary>
/// Types of sync events that can occur. Values 1-5 (device-lifecycle/audit markers with no
/// associated entity) were removed as dead code - nothing constructed them once the one real
/// caller (device registration) stopped, and the repository's own query already excluded them
/// from ever being read back (see SyncEventRepository). Kept the numeric values of the ones that
/// remain unchanged, since they're persisted as raw integers in already-live production data.
/// </summary>
public enum SyncEventType
{
    Create = 6,
    Update = 7,
    Delete = 8
}
