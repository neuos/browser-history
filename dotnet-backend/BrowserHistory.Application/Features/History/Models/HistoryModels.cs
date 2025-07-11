using BrowserHistory.Domain.Entities;
using BrowserHistory.Domain.ValueObjects;

namespace BrowserHistory.Application.Features.History.Models;

/// <summary>
/// Browser history entry data transfer object
/// </summary>
public sealed record HistoryEntryDto
{
    public string Url { get; init; } = string.Empty;
    public string Title { get; init; } = string.Empty;
    public DateTime VisitTime { get; init; }
    public int VisitCount { get; init; }
    public bool IsTyped { get; init; }
    public TimeSpan? Duration { get; init; }
    public string DeviceId { get; init; } = string.Empty;
    public string BrowserType { get; init; } = string.Empty;
    public string? Referrer { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime UpdatedAt { get; init; }
}

/// <summary>
/// Request to get browser history entries
/// </summary>
public sealed record GetHistoryRequest
{
    public DateTime? StartDate { get; init; }
    public DateTime? EndDate { get; init; }
    public string? SearchQuery { get; init; }
    public string? DeviceId { get; init; }
    public string? BrowserType { get; init; }
    public int PageSize { get; init; } = 50;
    public int PageNumber { get; init; } = 1;
    public string? SortBy { get; init; } = "VisitTime";
    public bool SortDescending { get; init; } = true;
}

/// <summary>
/// Response containing browser history entries
/// </summary>
public sealed record GetHistoryResponse
{
    public IReadOnlyList<HistoryEntryDto> Entries { get; init; } = Array.Empty<HistoryEntryDto>();
    public int TotalCount { get; init; }
    public int PageNumber { get; init; }
    public int PageSize { get; init; }
    public int TotalPages { get; init; }
    public bool HasNextPage { get; init; }
    public bool HasPreviousPage { get; init; }
}

/// <summary>
/// Request to add a history entry
/// </summary>
public sealed record AddHistoryEntryRequest
{
    public required string Url { get; init; }
    public required string Title { get; init; }
    public DateTime VisitTime { get; init; }
    public int VisitCount { get; init; } = 1;
    public bool IsTyped { get; init; }
    public TimeSpan? Duration { get; init; }
    public required string DeviceId { get; init; }
    public required string BrowserType { get; init; }
    public string? Referrer { get; init; }
}

/// <summary>
/// Request to bulk add history entries
/// </summary>
public sealed record BulkAddHistoryRequest
{
    public required IReadOnlyList<AddHistoryEntryRequest> Entries { get; init; }
}

/// <summary>
/// Response for bulk add history operation
/// </summary>
public sealed record BulkAddHistoryResponse
{
    public int ProcessedCount { get; init; }
    public int SkippedCount { get; init; }
    public int ErrorCount { get; init; }
    public IReadOnlyList<string> Errors { get; init; } = Array.Empty<string>();
    public DateTime ProcessedAt { get; init; }
}

/// <summary>
/// History statistics data transfer object
/// </summary>
public sealed record HistoryStatsDto
{
    public int TotalEntries { get; init; }
    public int UniqueUrls { get; init; }
    public int DeviceCount { get; init; }
    public DateTime? FirstVisit { get; init; }
    public DateTime? LastVisit { get; init; }
    public IReadOnlyList<DailyVisitStatsDto> DailyStats { get; init; } = Array.Empty<DailyVisitStatsDto>();
    public IReadOnlyList<TopDomainDto> TopDomains { get; init; } = Array.Empty<TopDomainDto>();
}

/// <summary>
/// Daily visit statistics
/// </summary>
public sealed record DailyVisitStatsDto
{
    public DateOnly Date { get; init; }
    public int VisitCount { get; init; }
    public int UniqueUrls { get; init; }
}

/// <summary>
/// Top domain statistics
/// </summary>
public sealed record TopDomainDto
{
    public string Domain { get; init; } = string.Empty;
    public int VisitCount { get; init; }
    public DateTime LastVisit { get; init; }
}
