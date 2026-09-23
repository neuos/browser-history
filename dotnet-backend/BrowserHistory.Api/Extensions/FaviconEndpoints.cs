using BrowserHistory.Application.Features.Favicons.Commands;
using BrowserHistory.Application.Features.Favicons.Models;
using BrowserHistory.Application.Features.Favicons.Queries;
using MediatR;

namespace BrowserHistory.Api.Extensions;

/// <summary>
/// Endpoints for content-addressed, deduplicated favicon storage.
/// </summary>
public static class FaviconEndpoints
{
    public static IEndpointRouteBuilder MapFaviconEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/favicons")
            .WithTags("Favicons")
            .RequireAuthorization("DevicePolicy");

        group.MapPost("/", UploadFavicon)
            .WithName("UploadFavicon")
            .WithSummary("Upload a favicon blob (idempotent by content hash)")
            .Produces<UploadFaviconResponse>()
            .ProducesValidationProblem()
            .Produces(401);

        group.MapGet("/{hash}", GetFaviconByHash)
            .WithName("GetFaviconByHash")
            .WithSummary("Fetch a favicon blob's raw bytes by content hash")
            .Produces(200, contentType: "application/octet-stream")
            .Produces(404)
            .Produces(401);

        return app;
    }

    private static async Task<IResult> UploadFavicon(
        UploadFaviconRequest request,
        IMediator mediator,
        CancellationToken cancellationToken)
    {
        var command = new UploadFaviconCommand
        {
            Hash = request.Hash,
            ContentType = request.ContentType,
            DataBase64 = request.DataBase64
        };
        var result = await mediator.Send(command, cancellationToken);
        return Results.Ok(result);
    }

    private static async Task<IResult> GetFaviconByHash(
        string hash,
        IMediator mediator,
        CancellationToken cancellationToken)
    {
        var result = await mediator.Send(new GetFaviconByHashQuery(hash), cancellationToken);
        return result == null
            ? Results.NotFound()
            : Results.File(result.Data, result.ContentType);
    }
}
