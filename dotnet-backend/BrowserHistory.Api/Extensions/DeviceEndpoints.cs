using BrowserHistory.Application.Features.Devices.Commands;
using BrowserHistory.Application.Features.Devices.Queries;
using BrowserHistory.Application.Common.Models;
using MediatR;

namespace BrowserHistory.Api.Extensions;

/// <summary>
/// Device-related API endpoints
/// </summary>
public static class DeviceEndpoints
{
    public static void MapDeviceEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/devices")
            .WithTags("Devices");

        // GET /api/v1/devices - Get all active devices
        group.MapGet("/", async (IMediator mediator) =>
        {
            var query = new GetActiveDevicesQuery();
            var result = await mediator.Send(query);
            
            if (result.IsSuccess)
                return Results.Ok(result.Value);
                
            return Results.Problem(result.Error);
        })
        .WithName("GetActiveDevices")
        .WithSummary("Get all active devices");

        // GET /api/v1/devices/{deviceId} - Get device by ID
        group.MapGet("/{deviceId:guid}", async (Guid deviceId, IMediator mediator) =>
        {
            var query = new GetDeviceByIdQuery { DeviceId = deviceId.ToString() };
            var result = await mediator.Send(query);
            
            if (!result.IsSuccess)
                return Results.Problem(result.Error);
                
            if (result.Value == null)
                return Results.NotFound($"Device with ID {deviceId} not found");
                
            return Results.Ok(result.Value);
        })
        .WithName("GetDeviceById")
        .WithSummary("Get device by ID");

        // POST /api/v1/devices/register - Register a new device
        group.MapPost("/register", async (RegisterDeviceCommand command, IMediator mediator) =>
        {
            var result = await mediator.Send(command);
            
            if (!result.IsSuccess)
                return Results.BadRequest(result.Error);

            var device = result.Value;
            if (device == null)
                return Results.Problem("Device creation succeeded but returned null");
                
            return Results.Created($"/api/v1/devices/{device.Id}", device);
        })
        .WithName("RegisterDevice")
        .WithSummary("Register a new device");

        // PUT /api/v1/devices/{deviceId}/last-seen - Update device last seen timestamp
        group.MapPut("/{deviceId:guid}/last-seen", async (Guid deviceId, IMediator mediator) =>
        {
            var command = new UpdateDeviceLastSeenCommand { DeviceId = deviceId.ToString() };
            var result = await mediator.Send(command);
            
            if (!result.IsSuccess)
                return Results.Problem(result.Error);
                
            return Results.Ok();
        })
        .WithName("UpdateDeviceLastSeen")
        .WithSummary("Update device last seen timestamp");
    }
}
