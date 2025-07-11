namespace BrowserHistory.Api.Middleware;

/// <summary>
/// Middleware that adds a correlation ID to each request for tracing and logging purposes.
/// The correlation ID can be provided by the client or generated automatically.
/// </summary>
public class CorrelationIdMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<CorrelationIdMiddleware> _logger;
    private const string CorrelationIdHeaderName = "X-Correlation-ID";

    public CorrelationIdMiddleware(RequestDelegate next, ILogger<CorrelationIdMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // Get correlation ID from request header or generate a new one
        var correlationId = GetOrGenerateCorrelationId(context);

        // Add correlation ID to the response headers
        context.Response.Headers.TryAdd(CorrelationIdHeaderName, correlationId);

        // Add correlation ID to the logging scope
        using (_logger.BeginScope(new Dictionary<string, object>
        {
            ["CorrelationId"] = correlationId,
            ["RequestPath"] = context.Request.Path,
            ["RequestMethod"] = context.Request.Method
        }))
        {
            // Store correlation ID in HttpContext.Items for use in other parts of the application
            context.Items[CorrelationIdHeaderName] = correlationId;

            await _next(context);
        }
    }

    private static string GetOrGenerateCorrelationId(HttpContext context)
    {
        // Try to get correlation ID from request headers
        if (context.Request.Headers.TryGetValue(CorrelationIdHeaderName, out var correlationIdValue))
        {
            var correlationId = correlationIdValue.FirstOrDefault();
            if (!string.IsNullOrWhiteSpace(correlationId))
            {
                return correlationId;
            }
        }

        // Generate a new correlation ID if not provided
        return Guid.NewGuid().ToString();
    }
}
