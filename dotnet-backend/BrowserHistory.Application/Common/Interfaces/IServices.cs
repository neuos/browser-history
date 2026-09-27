namespace BrowserHistory.Application.Common.Interfaces;

/// <summary>
/// Interface for date/time operations to support testing
/// </summary>
public interface IDateTimeProvider
{
    DateTime UtcNow { get; }
    DateTime Now { get; }
}
