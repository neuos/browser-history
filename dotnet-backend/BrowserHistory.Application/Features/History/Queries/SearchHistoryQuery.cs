using BrowserHistory.Application.Common.Interfaces;
using BrowserHistory.Application.Common.Models;
using BrowserHistory.Domain.ValueObjects;
using FluentValidation;
using MediatR;

namespace BrowserHistory.Application.Features.History.Queries;

public record SearchHistoryQuery(
    string SearchTerm,
    int Skip = 0,
    int Take = 50) : IRequest<Result<SearchHistoryResponse>>;

public record SearchHistoryResponse(
    IEnumerable<HistoryEntryDto> Results,
    int TotalCount,
    bool HasMore,
    string SearchTerm);

public class SearchHistoryQueryValidator : AbstractValidator<SearchHistoryQuery>
{
    public SearchHistoryQueryValidator()
    {
        RuleFor(x => x.SearchTerm)
            .NotEmpty()
            .WithMessage("Search term is required")
            .MinimumLength(2)
            .WithMessage("Search term must be at least 2 characters")
            .MaximumLength(200)
            .WithMessage("Search term cannot exceed 200 characters");

        RuleFor(x => x.Skip)
            .GreaterThanOrEqualTo(0)
            .WithMessage("Skip must be greater than or equal to 0");

        RuleFor(x => x.Take)
            .GreaterThan(0)
            .WithMessage("Take must be greater than 0")
            .LessThanOrEqualTo(500)
            .WithMessage("Take cannot exceed 500 for search operations");
    }
}

public class SearchHistoryQueryHandler : IRequestHandler<SearchHistoryQuery, Result<SearchHistoryResponse>>
{
    private readonly IHistoryRepository _historyRepository;

    public SearchHistoryQueryHandler(IHistoryRepository historyRepository)
    {
        _historyRepository = historyRepository;
    }

    public async Task<Result<SearchHistoryResponse>> Handle(SearchHistoryQuery request, CancellationToken cancellationToken)
    {
        try
        {
            var (results, totalCount) = await _historyRepository.SearchHistoryAsync(
                searchTerm: request.SearchTerm.Trim(),
                skip: request.Skip,
                take: request.Take,
                cancellationToken);

            var resultDtos = results.Select(entry => new HistoryEntryDto(
                entry.Id,
                entry.Url.Value,
                entry.Title,
                entry.VisitedAt,
                entry.VisitCount,
                entry.LastVisitedAt,
                entry.CreatedAt,
                entry.UpdatedAt,
                entry.IsBookmarked,
                entry.FaviconUrl)).ToList();

            var hasMore = request.Skip + request.Take < totalCount;

            return Result<SearchHistoryResponse>.Success(
                new SearchHistoryResponse(resultDtos, totalCount, hasMore, request.SearchTerm));
        }
        catch (Exception ex)
        {
            return Result<SearchHistoryResponse>.Failure($"Failed to search history: {ex.Message}");
        }
    }
}
