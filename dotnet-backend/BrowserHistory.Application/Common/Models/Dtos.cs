namespace BrowserHistory.Application.Common.Models;

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
