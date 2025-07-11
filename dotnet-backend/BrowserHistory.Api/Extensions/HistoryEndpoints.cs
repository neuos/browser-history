using BrowserHistory.Application.Features.History.Queries;
using MediatR;

namespace BrowserHistory.Api.Extensions;

/// <summary>
/// History-related API endpoints
/// </summary>
public static class HistoryEndpoints
{
    public static void MapHistoryEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/history")
            .WithTags("History");

        // GET /api/v1/history - Get history entries
        group.MapGet("/", async (
            IMediator mediator,
            DateTime? startDate = null,
            DateTime? endDate = null,
            int skip = 0,
            int take = 100) =>
        {
            var query = new GetHistoryEntriesQuery(
                startDate,
                endDate,
                skip,
                take
            );
            
            var result = await mediator.Send(query);
            
            if (!result.IsSuccess)
                return Results.Problem(result.Error);
                
            return Results.Ok(result.Value);
        })
        .WithName("GetHistoryEntries")
        .WithSummary("Get history entries with optional date filtering and pagination");

        // GET /api/v1/history/search - Search history entries
        group.MapGet("/search", async (
            IMediator mediator,
            string? searchTerm = null,
            int skip = 0,
            int take = 50) =>
        {
            if (string.IsNullOrWhiteSpace(searchTerm))
            {
                return Results.BadRequest("Search term is required");
            }

            var query = new SearchHistoryQuery(
                searchTerm,
                skip,
                take
            );
            
            var result = await mediator.Send(query);
            
            if (!result.IsSuccess)
                return Results.Problem(result.Error);
                
            return Results.Ok(result.Value);
        })
        .WithName("SearchHistory")
        .WithSummary("Search history entries by URL or title");
    }
}
