using BrowserHistory.Domain.Entities;
using BrowserHistory.Domain.ValueObjects;

namespace BrowserHistory.Application.Features.Sync.Models;

/// <summary>
/// Sync event data transfer object
/// </summary>
public sealed record SyncEventDto
{
    public Guid Id { get; init; }
    public string DeviceId { get; init; } = string.Empty;
    public DateTime Timestamp { get; init; }
    public string EventType { get; init; } = string.Empty;
    public string EntityType { get; init; } = string.Empty;
    public string EntityId { get; init; } = string.Empty;
    public string? Data { get; init; }
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
/// Response for sync events submission
/// </summary>
public sealed record SubmitSyncEventsResponse
{
    public int ProcessedCount { get; init; }
    public int SkippedCount { get; init; }
    public int ErrorCount { get; init; }
    public IReadOnlyList<string> Errors { get; init; } = Array.Empty<string>();
    public DateTime ProcessedAt { get; init; }
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
