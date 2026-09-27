using BrowserHistory.Api.Middleware;

namespace BrowserHistory.Api.Extensions;

public static class MiddlewareExtensions
{
    public static WebApplication UseCustomMiddleware(this WebApplication app)
    {
        // Order matters: correlation ID first (for request tracking), then exception handling
        // (to log errors with that correlation ID), then request logging (to include it and
        // measure request timing).
        app.UseMiddleware<CorrelationIdMiddleware>();
        app.UseMiddleware<ExceptionHandlingMiddleware>();
        app.UseMiddleware<RequestLoggingMiddleware>();

        return app;
    }
}
