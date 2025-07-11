using BrowserHistory.Api.Middleware;

namespace BrowserHistory.Api.Extensions;

/// <summary>
/// Extension methods for configuring middleware components in the application pipeline.
/// </summary>
public static class MiddlewareExtensions
{
    /// <summary>
    /// Adds global exception handling middleware to the application pipeline.
    /// This should be added early in the pipeline to catch all unhandled exceptions.
    /// </summary>
    /// <param name="app">The web application builder</param>
    /// <returns>The web application builder for method chaining</returns>
    public static WebApplication UseGlobalExceptionHandling(this WebApplication app)
    {
        app.UseMiddleware<ExceptionHandlingMiddleware>();
        return app;
    }

    /// <summary>
    /// Adds correlation ID middleware to the application pipeline.
    /// This should be added very early in the pipeline to ensure all subsequent middleware
    /// and application components have access to the correlation ID.
    /// </summary>
    /// <param name="app">The web application builder</param>
    /// <returns>The web application builder for method chaining</returns>
    public static WebApplication UseCorrelationId(this WebApplication app)
    {
        app.UseMiddleware<CorrelationIdMiddleware>();
        return app;
    }

    /// <summary>
    /// Adds enhanced request logging middleware to the application pipeline.
    /// This provides detailed structured logging for all HTTP requests with timing information.
    /// Should be added after correlation ID middleware to include correlation IDs in logs.
    /// </summary>
    /// <param name="app">The web application builder</param>
    /// <returns>The web application builder for method chaining</returns>
    public static WebApplication UseEnhancedRequestLogging(this WebApplication app)
    {
        app.UseMiddleware<RequestLoggingMiddleware>();
        return app;
    }

    /// <summary>
    /// Configures the complete middleware pipeline with all custom middleware components
    /// in the correct order for optimal functionality and observability.
    /// </summary>
    /// <param name="app">The web application builder</param>
    /// <returns>The web application builder for method chaining</returns>
    public static WebApplication UseCustomMiddleware(this WebApplication app)
    {
        // Order is important: 
        // 1. Correlation ID first (for request tracking)
        // 2. Exception handling (to catch all errors with correlation ID)
        // 3. Enhanced logging (to log with correlation ID and handle timing)
        app.UseCorrelationId();
        app.UseGlobalExceptionHandling();
        app.UseEnhancedRequestLogging();
        
        return app;
    }
}
