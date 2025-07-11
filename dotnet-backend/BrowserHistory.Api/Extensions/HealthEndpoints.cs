using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace BrowserHistory.Api.Extensions;

/// <summary>
/// Health check endpoints
/// </summary>
public static class HealthEndpoints
{
    public static void MapHealthEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/health")
            .WithTags("Health");

        // GET /health - Basic health check
        group.MapGet("/", () =>
        {
            return Results.Ok(new { status = "healthy", timestamp = DateTime.UtcNow });
        })
        .WithName("HealthCheck")
        .WithSummary("Basic health check")
        .Produces<object>();

        // GET /health/ready - Readiness check
        group.MapGet("/ready", (IServiceProvider serviceProvider) =>
        {
            try
            {
                // Check if we can resolve core services
                var mediator = serviceProvider.GetRequiredService<MediatR.IMediator>();
                
                return Results.Ok(new 
                { 
                    status = "ready", 
                    timestamp = DateTime.UtcNow,
                    checks = new
                    {
                        mediator = "healthy"
                    }
                });
            }
            catch (Exception ex)
            {
                return Results.Problem(
                    title: "Service not ready",
                    detail: ex.Message,
                    statusCode: 503
                );
            }
        })
        .WithName("ReadinessCheck")
        .WithSummary("Service readiness check")
        .Produces<object>()
        .Produces(503);
    }
}
