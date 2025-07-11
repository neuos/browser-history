using BrowserHistory.Application.Features.Pages.Commands;
using BrowserHistory.Application.Features.Pages.Models;
using BrowserHistory.Application.Features.Pages.Queries;
using BrowserHistory.Application.Common.Models;
using MediatR;
using Microsoft.AspNetCore.Authorization;

namespace BrowserHistory.Api.Extensions;

/// <summary>
/// Page-related API endpoints
/// </summary>
public static class PageEndpoints
{
    /// <summary>
    /// Configures page-related endpoints
    /// </summary>
    public static IEndpointRouteBuilder MapPageEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/v1/pages")
            .WithTags("Pages")
            .RequireAuthorization();

        // Get paginated pages
        group.MapGet("/", GetPages)
            .WithName("GetPages")
            .WithSummary("Get pages with filtering and pagination")
            .WithDescription("Retrieve pages with optional filtering by search term, language, stale status, and pagination")
            .Produces<ApiResponse<GetPagesResponse>>(200)
            .Produces<ProblemDetails>(400)
            .Produces<ProblemDetails>(401);

        // Get specific page by URL
        group.MapGet("/by-url", GetPageByUrl)
            .WithName("GetPageByUrl")
            .WithSummary("Get a specific page by URL")
            .WithDescription("Retrieve page metadata for a specific URL")
            .Produces<ApiResponse<PageDto>>(200)
            .Produces<ProblemDetails>(400)
            .Produces<ProblemDetails>(404)
            .Produces<ProblemDetails>(401);

        // Create or update page
        group.MapPost("/", CreateOrUpdatePage)
            .WithName("CreateOrUpdatePage")
            .WithSummary("Create or update page metadata")
            .WithDescription("Create a new page or update existing page metadata")
            .Produces<ApiResponse<PageResponse>>(200)
            .Produces<ApiResponse<PageResponse>>(201)
            .Produces<ProblemDetails>(400)
            .Produces<ProblemDetails>(401);

        // Delete page
        group.MapDelete("/by-url", DeletePage)
            .WithName("DeletePage")
            .WithSummary("Delete a page by URL")
            .WithDescription("Remove page metadata for a specific URL")
            .Produces<ApiResponse<bool>>(200)
            .Produces<ProblemDetails>(400)
            .Produces<ProblemDetails>(404)
            .Produces<ProblemDetails>(401);

        return endpoints;
    }

    /// <summary>
    /// Get pages with filtering and pagination
    /// </summary>
    [Authorize]
    private static async Task<IResult> GetPages(
        [AsParameters] GetPagesRequest request,
        IMediator mediator,
        CancellationToken cancellationToken)
    {
        var query = new GetPagesQuery
        {
            SearchTerm = request.SearchTerm,
            Language = request.Language,
            OnlyStale = request.OnlyStale,
            OnlyLarge = request.OnlyLarge,
            Page = request.Page,
            PageSize = request.PageSize,
            SortBy = request.SortBy,
            SortDescending = request.SortDescending
        };

        var result = await mediator.Send(query, cancellationToken);
        
        return Results.Ok(ApiResponse<GetPagesResponse>.Success(result));
    }

    /// <summary>
    /// Get a specific page by URL
    /// </summary>
    [Authorize]
    private static async Task<IResult> GetPageByUrl(
        string url,
        IMediator mediator,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(url))
        {
            return Results.BadRequest(ApiResponse<PageDto>.Error("URL parameter is required"));
        }

        var query = new GetPageByUrlQuery { Url = url };
        var result = await mediator.Send(query, cancellationToken);

        if (result is null)
        {
            return Results.NotFound(ApiResponse<PageDto>.Error("Page not found"));
        }

        return Results.Ok(ApiResponse<PageDto>.Success(result));
    }

    /// <summary>
    /// Create or update page metadata
    /// </summary>
    [Authorize]
    private static async Task<IResult> CreateOrUpdatePage(
        CreateOrUpdatePageRequest request,
        IMediator mediator,
        CancellationToken cancellationToken)
    {
        var command = new CreateOrUpdatePageCommand
        {
            Url = request.Url,
            Title = request.Title,
            Description = request.Description,
            Content = request.Content,
            FaviconUrl = request.FaviconUrl,
            Language = request.Language,
            Keywords = request.Keywords,
            ContentType = request.ContentType,
            StatusCode = request.StatusCode
        };

        var result = await mediator.Send(command, cancellationToken);
        
        var statusCode = result.WasCreated ? 201 : 200;
        return Results.Json(
            ApiResponse<PageResponse>.Success(result), 
            statusCode: statusCode);
    }

    /// <summary>
    /// Delete a page by URL
    /// </summary>
    [Authorize]
    private static async Task<IResult> DeletePage(
        string url,
        IMediator mediator,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(url))
        {
            return Results.BadRequest(ApiResponse<bool>.Error("URL parameter is required"));
        }

        var command = new DeletePageCommand { Url = url };
        var result = await mediator.Send(command, cancellationToken);

        if (!result)
        {
            return Results.NotFound(ApiResponse<bool>.Error("Page not found"));
        }

        return Results.Ok(ApiResponse<bool>.Success(result, "Page deleted successfully"));
    }
}
