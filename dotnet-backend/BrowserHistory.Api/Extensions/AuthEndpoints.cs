using BrowserHistory.Application.Features.Auth.Commands.RegisterDevice;
using BrowserHistory.Application.Features.Auth.Commands.RefreshToken;
using BrowserHistory.Application.Features.Auth.Queries.GetDeviceInfo;
using BrowserHistory.Application.Features.Auth.Queries.ValidateToken;
using BrowserHistory.Application.Features.Auth.Models;
using MediatR;
using Microsoft.AspNetCore.Authorization;

namespace BrowserHistory.Api.Extensions;

/// <summary>
/// Authentication endpoints for device registration and token management.
/// </summary>
public static class AuthEndpoints
{
    public static IEndpointRouteBuilder MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/auth")
            .WithTags("Authentication");

        group.MapPost("/register-device", RegisterDevice)
            .WithName("AuthRegisterDevice")
            .WithSummary("Register a new device")
            .WithDescription("Registers a new device with the provided shared secret and returns authentication tokens.")
            .Produces<RegisterDeviceResponse>()
            .ProducesValidationProblem()
            .Produces(401);

        group.MapPost("/refresh-token", RefreshToken)
            .WithName("AuthRefreshToken")
            .WithSummary("Refresh access token")
            .WithDescription("Refreshes an access token using a valid refresh token.")
            .Produces<RefreshTokenResponse>()
            .ProducesValidationProblem()
            .Produces(401);

        group.MapGet("/validate-token", ValidateToken)
            .WithName("AuthValidateToken")
            .WithSummary("Validate access token")
            .WithDescription("Validates an access token and returns device information if valid.")
            .RequireAuthorization("DevicePolicy")
            .Produces<DeviceInfoDto>()
            .Produces(401);

        group.MapGet("/device-info", GetDeviceInfo)
            .WithName("AuthGetDeviceInfo")
            .WithSummary("Get device information")
            .WithDescription("Gets device information from the authenticated token.")
            .RequireAuthorization("DevicePolicy")
            .Produces<DeviceInfoDto>()
            .Produces(401);

        return app;
    }

    private static async Task<IResult> RegisterDevice(
        RegisterDeviceRequest request,
        IMediator mediator,
        CancellationToken cancellationToken)
    {
        try
        {
            var command = new RegisterDeviceCommand(request.DeviceName, request.Secret);
            var result = await mediator.Send(command, cancellationToken);

            var response = new RegisterDeviceResponse
            {
                DeviceId = result.DeviceId.Value.ToString(),
                Token = result.AccessToken,
                ExpiresIn = (int)(result.ExpiresAt - DateTime.UtcNow).TotalSeconds
            };

            return Results.Ok(response);
        }
        catch (UnauthorizedAccessException)
        {
            return Results.Unauthorized();
        }
        catch (Exception ex)
        {
            return Results.Problem(
                title: "Registration failed",
                detail: ex.Message,
                statusCode: 500);
        }
    }

    private static async Task<IResult> RefreshToken(
        HttpContext context,
        IMediator mediator,
        CancellationToken cancellationToken)
    {
        try
        {
            // Extract token from Authorization header
            var authHeader = context.Request.Headers.Authorization.FirstOrDefault();
            if (string.IsNullOrEmpty(authHeader) || !authHeader.StartsWith("Bearer "))
            {
                return Results.Unauthorized();
            }

            var token = authHeader["Bearer ".Length..];
            var command = new RefreshTokenCommand(token);
            var result = await mediator.Send(command, cancellationToken);

            var response = new RefreshTokenResponse
            {
                Token = result.AccessToken,
                ExpiresIn = (int)(result.ExpiresAt - DateTime.UtcNow).TotalSeconds
            };

            return Results.Ok(response);
        }
        catch (UnauthorizedAccessException)
        {
            return Results.Unauthorized();
        }
        catch (Exception ex)
        {
            return Results.Problem(
                title: "Token refresh failed",
                detail: ex.Message,
                statusCode: 500);
        }
    }

    private static async Task<IResult> ValidateToken(
        HttpContext context,
        IMediator mediator,
        CancellationToken cancellationToken)
    {
        try
        {
            var authHeader = context.Request.Headers.Authorization.FirstOrDefault();
            if (authHeader == null || !authHeader.StartsWith("Bearer "))
            {
                return Results.Unauthorized();
            }

            var token = authHeader["Bearer ".Length..];
            var query = new ValidateTokenQuery(token);
            var result = await mediator.Send(query, cancellationToken);

            if (!result.IsValid || result.DeviceId == null)
            {
                return Results.Unauthorized();
            }

            // Get device info
            var deviceInfoQuery = new GetDeviceInfoQuery(token);
            var deviceInfo = await mediator.Send(deviceInfoQuery, cancellationToken);

            if (deviceInfo == null)
            {
                return Results.Unauthorized();
            }

            var response = new DeviceInfoDto
            {
                DeviceId = deviceInfo.DeviceId.Value.ToString(),
                DeviceName = deviceInfo.DeviceName,
                RegisteredAt = deviceInfo.RegisteredAt,
                LastSeen = deviceInfo.LastSeen,
                IsActive = deviceInfo.IsActive
            };

            return Results.Ok(response);
        }
        catch (Exception ex)
        {
            return Results.Problem(
                title: "Token validation failed",
                detail: ex.Message,
                statusCode: 500);
        }
    }

    private static async Task<IResult> GetDeviceInfo(
        HttpContext context,
        IMediator mediator,
        CancellationToken cancellationToken)
    {
        try
        {
            var authHeader = context.Request.Headers.Authorization.FirstOrDefault();
            if (authHeader == null || !authHeader.StartsWith("Bearer "))
            {
                return Results.Unauthorized();
            }

            var token = authHeader["Bearer ".Length..];
            var query = new GetDeviceInfoQuery(token);
            var result = await mediator.Send(query, cancellationToken);

            if (result == null)
            {
                return Results.Unauthorized();
            }

            var response = new DeviceInfoDto
            {
                DeviceId = result.DeviceId.Value.ToString(),
                DeviceName = result.DeviceName,
                RegisteredAt = result.RegisteredAt,
                LastSeen = result.LastSeen,
                IsActive = result.IsActive
            };

            return Results.Ok(response);
        }
        catch (Exception ex)
        {
            return Results.Problem(
                title: "Failed to get device info",
                detail: ex.Message,
                statusCode: 500);
        }
    }
}
