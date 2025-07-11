using System.Diagnostics;
using System.Text;

namespace BrowserHistory.Api.Middleware;

/// <summary>
/// Enhanced request logging middleware that provides detailed structured logging
/// for all HTTP requests with timing, request/response details, and correlation tracking.
/// </summary>
public class RequestLoggingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<RequestLoggingMiddleware> _logger;

    public RequestLoggingMiddleware(RequestDelegate next, ILogger<RequestLoggingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var stopwatch = Stopwatch.StartNew();
        var requestBody = await ReadRequestBodyAsync(context);

        // Log the incoming request
        _logger.LogInformation("HTTP {Method} {Path} started {CorrelationId}",
            context.Request.Method,
            context.Request.Path,
            context.Items["X-Correlation-ID"]);

        try
        {
            await _next(context);
        }
        finally
        {
            stopwatch.Stop();

            // Log the completed request with timing and status
            var logLevel = GetLogLevel(context.Response.StatusCode);
            _logger.Log(logLevel, 
                "HTTP {Method} {Path} responded {StatusCode} in {ElapsedMilliseconds}ms {CorrelationId}",
                context.Request.Method,
                context.Request.Path,
                context.Response.StatusCode,
                stopwatch.ElapsedMilliseconds,
                context.Items["X-Correlation-ID"]);

            // Log additional details for errors
            if (context.Response.StatusCode >= 400)
            {
                _logger.LogWarning("Request failed with status {StatusCode}. " +
                    "Method: {Method}, Path: {Path}, QueryString: {QueryString}, " +
                    "RequestBody: {RequestBody}, UserAgent: {UserAgent}, " +
                    "RemoteIpAddress: {RemoteIpAddress}, CorrelationId: {CorrelationId}",
                    context.Response.StatusCode,
                    context.Request.Method,
                    context.Request.Path,
                    context.Request.QueryString,
                    requestBody,
                    context.Request.Headers.UserAgent.ToString(),
                    context.Connection.RemoteIpAddress?.ToString(),
                    context.Items["X-Correlation-ID"]);
            }
        }
    }

    private static async Task<string> ReadRequestBodyAsync(HttpContext context)
    {
        try
        {
            // Skip reading body for GET, DELETE, and other methods that typically don't have bodies
            if (context.Request.Method is "GET" or "DELETE" or "HEAD" or "OPTIONS")
            {
                return string.Empty;
            }

            // Skip reading body for multipart/form-data and other binary content
            var contentType = context.Request.ContentType?.ToLowerInvariant();
            if (contentType != null && (
                contentType.Contains("multipart/") ||
                contentType.Contains("application/octet-stream") ||
                contentType.Contains("image/") ||
                contentType.Contains("video/") ||
                contentType.Contains("audio/")))
            {
                return $"[Binary content: {contentType}]";
            }

            context.Request.EnableBuffering();
            
            using var reader = new StreamReader(context.Request.Body, Encoding.UTF8, leaveOpen: true);
            var body = await reader.ReadToEndAsync();
            context.Request.Body.Position = 0;

            // Truncate very long request bodies for logging
            return body.Length > 1000 ? body[..1000] + "... [truncated]" : body;
        }
        catch (Exception)
        {
            return "[Error reading request body]";
        }
    }

    private static LogLevel GetLogLevel(int statusCode)
    {
        return statusCode switch
        {
            >= 500 => LogLevel.Error,
            >= 400 => LogLevel.Warning,
            _ => LogLevel.Information
        };
    }
}
