using BrowserHistory.Application.Common.Interfaces;
using BrowserHistory.Application.Features.Sync.Commands;
using BrowserHistory.Application.Features.Sync.Models;
using BrowserHistory.Application.Features.Sync.Queries;
using BrowserHistory.Domain.ValueObjects;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace BrowserHistory.Api.Extensions;

/// <summary>
/// Sync-related API endpoints
/// </summary>
public static class SyncEndpoints
{
    public static void MapSyncEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/sync")
            .WithTags("Sync")
            .RequireAuthorization("DevicePolicy");

        // GET /api/v1/sync/events - Get sync events for the authenticated device.
        // `since` is Unix milliseconds (matches the client, not an ISO date string) and
        // `exclude_device=true` means "exclude my own device's events", resolved from the JWT -
        // the client never has another device's id to pass explicitly.
        group.MapGet("/events", async (
            ICurrentUserService currentUserService,
            IMediator mediator,
            long? since = null,
            [FromQuery(Name = "exclude_device")] bool excludeDevice = false,
            int skip = 0,
            int take = 100) =>
        {
            if (currentUserService.DeviceId is not { } currentDeviceId)
            {
                return Results.Unauthorized();
            }

            var query = new GetSyncEventsQuery(
                excludeDevice ? currentDeviceId : null,
                since.HasValue ? DateTimeOffset.FromUnixTimeMilliseconds(since.Value).UtcDateTime : null,
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

        // POST /api/v1/sync/events - Submit sync events from the authenticated device.
        // DeviceId comes from the JWT, never from the request body, to prevent device spoofing.
        group.MapPost("/events", async (
            SubmitSyncEventsRequest request,
            ICurrentUserService currentUserService,
            IMediator mediator) =>
        {
            if (currentUserService.DeviceId is not { } currentDeviceId)
            {
                return Results.Unauthorized();
            }

            var command = new SubmitSyncEventsCommand(currentDeviceId, request.Events);
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
