using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using System.Net;
using System.Threading.RateLimiting;

namespace BrowserHistory.Api.Extensions;

public static class RateLimitingExtensions
{
    public static IServiceCollection AddRateLimiting(this IServiceCollection services)
    {
        services.AddRateLimiter(options =>
        {
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
