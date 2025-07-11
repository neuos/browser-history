using BrowserHistory.Domain.Entities;
using BrowserHistory.Domain.ValueObjects;

namespace BrowserHistory.Application.Features.Devices.Models;

/// <summary>
/// Device data transfer object
/// </summary>
public sealed record DeviceDto
{
    public string Id { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string OperatingSystem { get; init; } = string.Empty;
    public string? BrowserVersion { get; init; }
    public bool IsActive { get; init; }
    public DateTime FirstSeen { get; init; }
    public DateTime LastSeen { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime UpdatedAt { get; init; }
}

/// <summary>
/// Request to register a new device
/// </summary>
public sealed record RegisterDeviceRequest
{
    public required string Id { get; init; }
    public required string Name { get; init; }
    public required string OperatingSystem { get; init; }
    public string? BrowserVersion { get; init; }
}

/// <summary>
/// Request to update device information
/// </summary>
public sealed record UpdateDeviceRequest
{
    public required string Name { get; init; }
    public required string OperatingSystem { get; init; }
    public string? BrowserVersion { get; init; }
}

/// <summary>
/// Response for device registration
/// </summary>
public sealed record DeviceRegistrationResponse
{
    public string DeviceId { get; init; } = string.Empty;
    public bool IsNew { get; init; }
    public DateTime RegisteredAt { get; init; }
}

/// <summary>
/// Device status data transfer object
/// </summary>
public sealed record DeviceStatusDto
{
    public string DeviceId { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public bool IsOnline { get; init; }
    public DateTime LastActivity { get; init; }
    public int HistoryCount { get; init; }
    public int SyncEventCount { get; init; }
    public DateTime? LastSyncTime { get; init; }
}

/// <summary>
/// Request to get device list
/// </summary>
public sealed record GetDevicesRequest
{
    public bool? ActiveOnly { get; init; }
    public DateTime? LastSeenSince { get; init; }
    public string? SearchQuery { get; init; }
    public int PageSize { get; init; } = 50;
    public int PageNumber { get; init; } = 1;
    public string? SortBy { get; init; } = "LastSeen";
    public bool SortDescending { get; init; } = true;
}

/// <summary>
/// Response containing device list
/// </summary>
public sealed record GetDevicesResponse
{
    public IReadOnlyList<DeviceDto> Devices { get; init; } = Array.Empty<DeviceDto>();
    public int TotalCount { get; init; }
    public int PageNumber { get; init; }
    public int PageSize { get; init; }
    public int TotalPages { get; init; }
    public bool HasNextPage { get; init; }
    public bool HasPreviousPage { get; init; }
}
