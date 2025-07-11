using BrowserHistory.Domain.ValueObjects;

namespace BrowserHistory.Application.Features.Pages.Models;

/// <summary>
/// Data transfer object for Page entity
/// </summary>
public sealed record PageDto
{
    public Guid Id { get; init; }
    public required string Url { get; init; }
    public required string Title { get; init; }
    public string? Description { get; init; }
    public string? Content { get; init; }
    public string? FaviconUrl { get; init; }
    public string? Language { get; init; }
    public string? Keywords { get; init; }
    public DateTime LastIndexedAt { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime UpdatedAt { get; init; }
    public int ContentLength { get; init; }
    public string? ContentType { get; init; }
    public int? StatusCode { get; init; }
    public bool IsStale { get; init; }
    public string? Summary { get; init; }
}

/// <summary>
/// Request model for creating or updating a page
/// </summary>
public sealed record CreateOrUpdatePageRequest
{
    public required string Url { get; init; }
    public required string Title { get; init; }
    public string? Description { get; init; }
    public string? Content { get; init; }
    public string? FaviconUrl { get; init; }
    public string? Language { get; init; }
    public string? Keywords { get; init; }
    public string? ContentType { get; init; }
    public int? StatusCode { get; init; }
}

/// <summary>
/// Request model for getting pages with filtering and pagination
/// </summary>
public sealed record GetPagesRequest
{
    public string? SearchTerm { get; init; }
    public string? Language { get; init; }
    public bool? OnlyStale { get; init; }
    public bool? OnlyLarge { get; init; }
    public int Page { get; init; } = 1;
    public int PageSize { get; init; } = 20;
    public string? SortBy { get; init; } = "UpdatedAt";
    public bool SortDescending { get; init; } = true;
}

/// <summary>
/// Response model for paginated pages
/// </summary>
public sealed record GetPagesResponse
{
    public required IReadOnlyList<PageDto> Pages { get; init; }
    public int TotalCount { get; init; }
    public int Page { get; init; }
    public int PageSize { get; init; }
    public int TotalPages { get; init; }
    public bool HasNext { get; init; }
    public bool HasPrevious { get; init; }
}

/// <summary>
/// Response model for page operations
/// </summary>
public sealed record PageResponse
{
    public required PageDto Page { get; init; }
    public bool WasCreated { get; init; }
    public string? Message { get; init; }
}
