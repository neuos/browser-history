using Microsoft.AspNetCore.ResponseCompression;
using System.IO.Compression;

namespace BrowserHistory.Api.Extensions;

public static class PerformanceExtensions
{
    public static IServiceCollection AddResponseCompression(this IServiceCollection services)
    {
        services.AddResponseCompression(options =>
        {
            options.EnableForHttps = true;
            options.Providers.Add<BrotliCompressionProvider>();
            options.Providers.Add<GzipCompressionProvider>();

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
}
