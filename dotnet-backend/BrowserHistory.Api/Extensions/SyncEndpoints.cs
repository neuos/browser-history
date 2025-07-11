using BrowserHistory.Application.Features.Sync.Commands;
using BrowserHistory.Application.Features.Sync.Queries;
using BrowserHistory.Application.Common.Models;
using BrowserHistory.Domain.ValueObjects;
using MediatR;

namespace BrowserHistory.Api.Extensions;

/// <summary>
/// Sync-related API endpoints
/// </summary>
public static class SyncEndpoints
{
    public static void MapSyncEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/sync")
            .WithTags("Sync");

        // GET /api/v1/sync/events - Get sync events
        group.MapGet("/events", async (
            IMediator mediator,
            Guid? excludeDeviceId = null,
            DateTime? since = null,
            int skip = 0,
            int take = 100) =>
        {
            var query = new GetSyncEventsQuery(
                excludeDeviceId.HasValue ? DeviceId.From(excludeDeviceId.Value) : null,
                since,
                skip,
                take
            );
            
            var result = await mediator.Send(query);
            
            if (!result.IsSuccess)
                return Results.Problem(result.Error);
                
            return Results.Ok(result.Value);
        })
        .WithName("GetSyncEvents")
        .WithSummary("Get sync events with optional filtering");

        // POST /api/v1/sync/events - Submit sync events
        group.MapPost("/events", async (SubmitSyncEventsCommand command, IMediator mediator) =>
        {
            var result = await mediator.Send(command);
            
            if (!result.IsSuccess)
                return Results.BadRequest(result.Error);
                
            return Results.Ok(result.Value);
        })
        .WithName("SubmitSyncEvents")
        .WithSummary("Submit sync events from a device")
        .Produces<SubmitSyncEventsResponse>()
        .Produces(400);

        // GET /api/v1/sync/status/{deviceId} - Get sync status for device
        group.MapGet("/status/{deviceId:guid}", async (Guid deviceId, IMediator mediator) =>
        {
            var query = new GetSyncStatusQuery(DeviceId.From(deviceId));
            var result = await mediator.Send(query);
            
            if (!result.IsSuccess)
                return Results.Problem(result.Error);
                
            return Results.Ok(result.Value);
        })
        .WithName("GetSyncStatus")
        .WithSummary("Get sync status for a specific device");
    }
}
