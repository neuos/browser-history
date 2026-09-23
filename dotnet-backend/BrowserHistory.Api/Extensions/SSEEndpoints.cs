using BrowserHistory.Application.Common.Interfaces;
using BrowserHistory.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;

namespace BrowserHistory.Api.Extensions;

/// <summary>
/// Server-Sent Events API endpoints
/// </summary>
public static class SSEEndpoints
{
    public static void MapSSEEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/sse")
            .WithTags("Server-Sent Events")
            .RequireAuthorization("DevicePolicy");

        // GET /api/v1/sse/events - SSE endpoint with authentication
        group.MapGet("/events", async (HttpContext context, 
            ISSEConnectionManager connectionManager,
            ICurrentUserService currentUserService) =>
        {
            var deviceId = currentUserService.DeviceId?.ToString();
            if (string.IsNullOrEmpty(deviceId))
            {
                return Results.Unauthorized();
            }

            // Set up SSE response
            context.Response.Headers["Content-Type"] = "text/event-stream";
            context.Response.Headers["Cache-Control"] = "no-cache";
            context.Response.Headers["Connection"] = "keep-alive";
            context.Response.Headers["Access-Control-Allow-Origin"] = "*";
            context.Response.Headers["Access-Control-Allow-Headers"] = "Cache-Control";

            // Add connection to SSE service
            var connectionAdded = await connectionManager.AddConnectionAsync(deviceId, context.Response, context.RequestAborted);
            if (!connectionAdded)
            {
                return Results.Problem("Failed to establish SSE connection");
            }

            try
            {
                // Keep connection alive until cancelled
                await connectionManager.KeepConnectionAliveAsync(deviceId, context.RequestAborted);
            }
            catch (OperationCanceledException)
            {
                // Expected when client disconnects
            }
            finally
            {
                connectionManager.RemoveConnection(deviceId);
            }

            // The SSE loop above already wrote directly to the response stream, so the
            // response has already started by the time we get here - Results.Ok() would
            // try to set the status code again and throw InvalidOperationException.
            // Results.Empty is a no-op result for endpoints that manage their own response.
            return Results.Empty;
        })
        .WithName("SSEEvents")
        .WithSummary("Establish Server-Sent Events connection for real-time notifications")
        .Produces(200)
        .Produces(401)
        .Produces(500);

        // GET /api/v1/sse/connections - Get active SSE connections (admin only)
        group.MapGet("/connections", (IServerSentEventService sseService) =>
        {
            var connections = sseService.GetConnectedDevices();
            return Results.Ok(new
            {
                connectedDevices = connections,
                totalConnections = sseService.GetConnectionCount(),
                timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
            });
        })
        .WithName("GetSSEConnections")
        .WithSummary("Get list of active SSE connections")
        .Produces<object>()
        .Produces(401);
    }
}
