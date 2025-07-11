using Microsoft.AspNetCore.ResponseCompression;
using System.IO.Compression;

namespace BrowserHistory.Api.Extensions;

/// <summary>
/// Extension methods for configuring performance optimizations including response compression.
/// </summary>
public static class PerformanceExtensions
{
    /// <summary>
    /// Adds response compression services with optimized configuration for API responses.
    /// Compresses JSON, text, and other common API response types.
    /// </summary>
    /// <param name="services">The service collection</param>
    /// <returns>The service collection for method chaining</returns>
    public static IServiceCollection AddResponseCompression(this IServiceCollection services)
    {
        services.AddResponseCompression(options =>
        {
            // Enable compression for HTTPS (secure by default)
            options.EnableForHttps = true;
            
            // Add compression providers
            options.Providers.Add<BrotliCompressionProvider>();
            options.Providers.Add<GzipCompressionProvider>();
            
            // Add MIME types to compress
            options.MimeTypes = ResponseCompressionDefaults.MimeTypes.Concat(new[]
            {
                "application/json",
                "application/problem+json",
                "text/plain",
                "text/html",
                "text/css",
                "text/javascript",
                "application/javascript",
                "text/event-stream" // For SSE
            });
        });

        // Configure compression levels
        services.Configure<BrotliCompressionProviderOptions>(options =>
        {
            options.Level = CompressionLevel.Optimal;
        });

        services.Configure<GzipCompressionProviderOptions>(options =>
        {
            options.Level = CompressionLevel.Optimal;
        });

        return services;
    }

    /// <summary>
    /// Adds memory caching services with optimized configuration for the application.
    /// </summary>
    /// <param name="services">The service collection</param>
    /// <param name="configuration">The application configuration</param>
    /// <returns>The service collection for method chaining</returns>
    public static IServiceCollection AddMemoryCaching(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddMemoryCache(options =>
        {
            // Configure memory cache options
            options.SizeLimit = configuration.GetValue<long?>("Caching:MemoryCache:SizeLimit") ?? 100_000_000; // 100MB default
            options.CompactionPercentage = 0.25; // Remove 25% of entries when limit is reached
            options.ExpirationScanFrequency = TimeSpan.FromMinutes(5);
        });

        return services;
    }

    /// <summary>
    /// Adds output caching services for API responses with sensible defaults.
    /// </summary>
    /// <param name="services">The service collection</param>
    /// <returns>The service collection for method chaining</returns>
    public static IServiceCollection AddApiOutputCaching(this IServiceCollection services)
    {
        services.AddOutputCache(options =>
        {
            // Default policy for general API responses
            options.AddBasePolicy(builder => builder
                .With(context => context.HttpContext.Request.Method == "GET")
                .Expire(TimeSpan.FromMinutes(5))
                .SetVaryByQuery("*")
                .Tag("api"));

            // Short-term cache for frequently accessed data
            options.AddPolicy("ShortTerm", builder => builder
                .Expire(TimeSpan.FromMinutes(1))
                .SetVaryByQuery("*")
                .Tag("short-term"));

            // Medium-term cache for relatively stable data
            options.AddPolicy("MediumTerm", builder => builder
                .Expire(TimeSpan.FromMinutes(15))
                .SetVaryByQuery("*")
                .Tag("medium-term"));

            // Long-term cache for very stable data
            options.AddPolicy("LongTerm", builder => builder
                .Expire(TimeSpan.FromHours(1))
                .SetVaryByQuery("*")
                .Tag("long-term"));

            // Cache per device for user-specific data
            options.AddPolicy("PerDevice", builder => builder
                .Expire(TimeSpan.FromMinutes(10))
                .SetVaryByQuery("*")
                .SetVaryByHeader("Authorization")
                .Tag("per-device"));
        });

        return services;
    }
}
