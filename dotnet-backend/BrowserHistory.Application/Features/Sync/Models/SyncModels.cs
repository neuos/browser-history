using System.Text.Json;

namespace BrowserHistory.Application.Features.Sync.Models;

/// <summary>
/// Sync event data transfer object. Timestamp is Unix milliseconds (not an ISO date string) and
/// Data is a raw JSON element (not a pre-serialized string) to match what the browser extension
/// client actually sends and expects back.
/// </summary>
public sealed record SyncEventDto
{
    public Guid Id { get; init; }
    public string DeviceId { get; init; } = string.Empty;
    public long Timestamp { get; init; }
    public string EventType { get; init; } = string.Empty;
    public string EntityType { get; init; } = string.Empty;
    public string EntityId { get; init; } = string.Empty;
    public JsonElement? Data { get; init; }
    public string? Checksum { get; init; }
}

/// <summary>
/// Request to submit sync events
/// </summary>
public sealed record SubmitSyncEventsRequest
{
    public required IReadOnlyList<SyncEventDto> Events { get; init; }
}

/// <summary>
/// Sync status data transfer object
/// </summary>
public sealed record SyncStatusDto
{
    public string DeviceId { get; init; } = string.Empty;
    public bool IsActive { get; init; }
    public DateTime? LastSyncTimestamp { get; init; }
    public int PendingEventsCount { get; init; }
    public int TotalEventsCount { get; init; }
    public DateTime LastSeen { get; init; }
}
