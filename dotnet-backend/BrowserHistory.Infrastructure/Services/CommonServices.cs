using BrowserHistory.Application.Common.Interfaces;

namespace BrowserHistory.Infrastructure.Services;

public class DateTimeProvider : IDateTimeProvider
{
    public DateTime UtcNow => DateTime.UtcNow;
    public DateTime Now => DateTime.Now;
}
