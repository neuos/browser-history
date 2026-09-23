namespace BrowserHistory.Application.Common.Models;

/// <summary>
/// Device data transfer object
/// </summary>
public record DeviceDto
{
    public required string Id { get; init; }
    public required string DeviceName { get; init; }
    public required DateTime RegisteredAt { get; init; }
    public required DateTime LastSeen { get; init; }
    public required bool IsActive { get; init; }
}

/// <summary>
/// Paginated result wrapper
/// </summary>
public record PaginatedResult<T>
{
    public required IEnumerable<T> Items { get; init; }
    public required int TotalCount { get; init; }
    public required int PageNumber { get; init; }
    public required int PageSize { get; init; }
    public int TotalPages => (int)Math.Ceiling((double)TotalCount / PageSize);
    public bool HasNextPage => PageNumber < TotalPages;
    public bool HasPreviousPage => PageNumber > 1;
}

/// <summary>
/// Generic result wrapper for operations
/// </summary>
public record Result<T>
{
    public bool IsSuccess { get; init; }
    public T? Value { get; init; }
    public string? Error { get; init; }
    public string[]? ValidationErrors { get; init; }

    public static Result<T> Success(T value) => new() { IsSuccess = true, Value = value };
    public static Result<T> Failure(string error) => new() { IsSuccess = false, Error = error };
    public static Result<T> ValidationFailure(params string[] errors) => new() { IsSuccess = false, ValidationErrors = errors };
}

/// <summary>
/// Result wrapper for operations without return value
/// </summary>
public record Result
{
    public bool IsSuccess { get; init; }
    public string? Error { get; init; }
    public string[]? ValidationErrors { get; init; }

    public static Result Success() => new() { IsSuccess = true };
    public static Result Failure(string error) => new() { IsSuccess = false, Error = error };
    public static Result ValidationFailure(params string[] errors) => new() { IsSuccess = false, ValidationErrors = errors };
}

/// <summary>
/// Generic API response wrapper for consistent response format
/// </summary>
public sealed record ApiResponse<T>
{
    public bool Success { get; init; }
    public T? Data { get; init; }
    public string? Message { get; init; }
    public IReadOnlyList<string> Errors { get; init; } = Array.Empty<string>();
    public DateTime Timestamp { get; init; } = DateTime.UtcNow;

    public static ApiResponse<T> CreateSuccess(T data, string? message = null) =>
        new() { Success = true, Data = data, Message = message };

    public static ApiResponse<T> CreateError(string message, IReadOnlyList<string>? errors = null) =>
        new() { Success = false, Message = message, Errors = errors ?? Array.Empty<string>() };

    public static ApiResponse<T> CreateError(IReadOnlyList<string> errors) =>
        new() { Success = false, Errors = errors };
}
