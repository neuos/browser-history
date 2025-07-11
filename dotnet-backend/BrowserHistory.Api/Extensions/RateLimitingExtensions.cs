using BrowserHistory.Application.Common.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using System.Net;
using System.Threading.RateLimiting;

namespace BrowserHistory.Api.Extensions;

/// <summary>
/// Extension methods for configuring rate limiting.
/// </summary>
public static class RateLimitingExtensions
{
    /// <summary>
    /// Adds rate limiting services to the DI container.
    /// </summary>
    public static IServiceCollection AddRateLimiting(this IServiceCollection services)
    {
        services.AddRateLimiter(options =>
        {
            // Global rate limiter
            options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
            {
                var userIdentifier = GetUserIdentifier(context);
                
                return RateLimitPartition.GetFixedWindowLimiter(
                    partitionKey: userIdentifier,
                    factory: _ => new FixedWindowRateLimiterOptions
                    {
                        PermitLimit = 100,
                        Window = TimeSpan.FromMinutes(1),
                        QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                        QueueLimit = 10
                    });
            });

            // API endpoints rate limiter
            options.AddPolicy("ApiEndpoints", context =>
            {
                var userIdentifier = GetUserIdentifier(context);
                
                return RateLimitPartition.GetFixedWindowLimiter(
                    partitionKey: userIdentifier,
                    factory: _ => new FixedWindowRateLimiterOptions
                    {
                        PermitLimit = 60,
                        Window = TimeSpan.FromMinutes(1),
                        QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                        QueueLimit = 5
                    });
            });

            // Authentication endpoints rate limiter (more restrictive)
            options.AddPolicy("Authentication", context =>
            {
                var userIdentifier = GetUserIdentifier(context);
                
                return RateLimitPartition.GetFixedWindowLimiter(
                    partitionKey: userIdentifier,
                    factory: _ => new FixedWindowRateLimiterOptions
                    {
                        PermitLimit = 5,
                        Window = TimeSpan.FromMinutes(1),
                        QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                        QueueLimit = 2
                    });
            });

            // SSE connections rate limiter
            options.AddPolicy("SSE", context =>
            {
                var userIdentifier = GetUserIdentifier(context);
                
                return RateLimitPartition.GetFixedWindowLimiter(
                    partitionKey: userIdentifier,
                    factory: _ => new FixedWindowRateLimiterOptions
                    {
                        PermitLimit = 10,
                        Window = TimeSpan.FromMinutes(1),
                        QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                        QueueLimit = 3
                    });
            });

            // History endpoints rate limiter (moderate restrictions)
            options.AddPolicy("History", context =>
            {
                var userIdentifier = GetUserIdentifier(context);
                
                return RateLimitPartition.GetTokenBucketLimiter(
                    partitionKey: userIdentifier,
                    factory: _ => new TokenBucketRateLimiterOptions
                    {
                        TokenLimit = 100,
                        QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                        QueueLimit = 10,
                        ReplenishmentPeriod = TimeSpan.FromSeconds(10),
                        TokensPerPeriod = 20,
                        AutoReplenishment = true
                    });
            });

            // Upload endpoints rate limiter (very restrictive)
            options.AddPolicy("Upload", context =>
            {
                var userIdentifier = GetUserIdentifier(context);
                
                return RateLimitPartition.GetSlidingWindowLimiter(
                    partitionKey: userIdentifier,
                    factory: _ => new SlidingWindowRateLimiterOptions
                    {
                        PermitLimit = 10,
                        Window = TimeSpan.FromMinutes(5),
                        SegmentsPerWindow = 5,
                        QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                        QueueLimit = 2
                    });
            });

            // Rate limit exceeded response
            options.OnRejected = async (context, cancellationToken) =>
            {
                var logger = context.HttpContext.RequestServices.GetService<ILogger<Program>>();
                
                if (context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter))
                {
                    context.HttpContext.Response.Headers.RetryAfter = retryAfter.TotalSeconds.ToString();
                }

                context.HttpContext.Response.StatusCode = (int)HttpStatusCode.TooManyRequests;
                context.HttpContext.Response.ContentType = "application/json";

                var response = new
                {
                    error = "Rate limit exceeded",
                    message = "Too many requests. Please try again later.",
                    retryAfter = retryAfter.TotalSeconds.ToString()
                };

                var userIdentifier = GetUserIdentifier(context.HttpContext);
                logger?.LogWarning("Rate limit exceeded for user {UserIdentifier} on endpoint {Endpoint}", 
                    userIdentifier, context.HttpContext.Request.Path);

                await context.HttpContext.Response.WriteAsJsonAsync(response, cancellationToken);
            };
        });

        return services;
    }

    /// <summary>
    /// Gets a user identifier for rate limiting partitioning.
    /// </summary>
    private static string GetUserIdentifier(HttpContext context)
    {
        // Try to get device ID from claims first
        var deviceId = context.User?.FindFirst("deviceId")?.Value;
        if (!string.IsNullOrEmpty(deviceId))
        {
            return $"device:{deviceId}";
        }

        // Try to get device ID from headers
        if (context.Request.Headers.TryGetValue("Device-Id", out var headerDeviceId) && !string.IsNullOrEmpty(headerDeviceId))
        {
            return $"device:{headerDeviceId}";
        }

        // Fall back to IP address
        var ipAddress = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        
        // Check for forwarded IP addresses
        if (context.Request.Headers.TryGetValue("X-Forwarded-For", out var forwardedFor))
        {
            var forwarded = forwardedFor.FirstOrDefault();
            if (!string.IsNullOrEmpty(forwarded))
            {
                ipAddress = forwarded.Split(',')[0].Trim();
            }
        }
        else if (context.Request.Headers.TryGetValue("X-Real-IP", out var realIp))
        {
            var real = realIp.FirstOrDefault();
            if (!string.IsNullOrEmpty(real))
            {
                ipAddress = real;
            }
        }

        return $"ip:{ipAddress}";
    }
}

/// <summary>
/// Middleware for advanced rate limiting with caching and monitoring.
/// </summary>
public class AdvancedRateLimitingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<AdvancedRateLimitingMiddleware> _logger;
    private readonly ICacheService _cacheService;

    public AdvancedRateLimitingMiddleware(
        RequestDelegate next,
        ILogger<AdvancedRateLimitingMiddleware> logger,
        ICacheService cacheService)
    {
        _next = next;
        _logger = logger;
        _cacheService = cacheService;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // Track rate limiting metrics
        var userIdentifier = GetUserIdentifier(context);
        var endpoint = context.Request.Path.Value ?? "unknown";
        
        // Increment request counter
        var requestCountKey = $"rate_limit:requests:{userIdentifier}:{DateTime.UtcNow:yyyy-MM-dd-HH}";
        var currentCount = _cacheService.GetOrSet(requestCountKey, () => 0, TimeSpan.FromHours(1));
        _cacheService.Remove(requestCountKey);
        _cacheService.GetOrSet(requestCountKey, () => currentCount + 1, TimeSpan.FromHours(1));

        // Log high-frequency users
        if (currentCount > 500) // Threshold for monitoring
        {
            _logger.LogWarning("High request volume detected for user {UserIdentifier}: {RequestCount} requests in current hour", 
                userIdentifier, currentCount);
        }

        await _next(context);
    }

    private static string GetUserIdentifier(HttpContext context)
    {
        var deviceId = context.User?.FindFirst("deviceId")?.Value;
        if (!string.IsNullOrEmpty(deviceId))
        {
            return $"device:{deviceId}";
        }

        if (context.Request.Headers.TryGetValue("Device-Id", out var headerDeviceId) && !string.IsNullOrEmpty(headerDeviceId))
        {
            return $"device:{headerDeviceId}";
        }

        var ipAddress = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        
        if (context.Request.Headers.TryGetValue("X-Forwarded-For", out var forwardedFor))
        {
            var forwarded = forwardedFor.FirstOrDefault();
            if (!string.IsNullOrEmpty(forwarded))
            {
                ipAddress = forwarded.Split(',')[0].Trim();
            }
        }
        else if (context.Request.Headers.TryGetValue("X-Real-IP", out var realIp))
        {
            var real = realIp.FirstOrDefault();
            if (!string.IsNullOrEmpty(real))
            {
                ipAddress = real;
            }
        }

        return $"ip:{ipAddress}";
    }
}
