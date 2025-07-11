using BrowserHistory.Application.Common.Interfaces;
using BrowserHistory.Application.Common.Models;
using BrowserHistory.Domain.ValueObjects;
using FluentValidation;
using MediatR;

namespace BrowserHistory.Application.Features.History.Queries;

public record GetHistoryEntriesQuery(
    DateTime? Since = null,
    DateTime? Until = null,
    int Skip = 0,
    int Take = 50) : IRequest<Result<GetHistoryEntriesResponse>>;

public record GetHistoryEntriesResponse(
    IEnumerable<HistoryEntryDto> Entries,
    int TotalCount,
    bool HasMore);

public record HistoryEntryDto(
    Guid Id,
    string Url,
    string Title,
    DateTime VisitedAt,
    int VisitCount,
    DateTime LastVisitedAt,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    bool IsBookmarked,
    string? FaviconUrl);

public class GetHistoryEntriesQueryValidator : AbstractValidator<GetHistoryEntriesQuery>
{
    public GetHistoryEntriesQueryValidator()
    {
        RuleFor(x => x.Skip)
            .GreaterThanOrEqualTo(0)
            .WithMessage("Skip must be greater than or equal to 0");

        RuleFor(x => x.Take)
            .GreaterThan(0)
            .WithMessage("Take must be greater than 0")
            .LessThanOrEqualTo(1000)
            .WithMessage("Take cannot exceed 1000");

        RuleFor(x => x.Since)
            .Must(since => since == null || since <= DateTime.UtcNow)
            .WithMessage("Since timestamp cannot be in the future");

        RuleFor(x => x.Until)
            .Must(until => until == null || until <= DateTime.UtcNow)
            .WithMessage("Until timestamp cannot be in the future");

        RuleFor(x => x)
            .Must(x => x.Since == null || x.Until == null || x.Since <= x.Until)
            .WithMessage("Since timestamp must be before Until timestamp");
    }
}

public class GetHistoryEntriesQueryHandler : IRequestHandler<GetHistoryEntriesQuery, Result<GetHistoryEntriesResponse>>
{
    private readonly IHistoryRepository _historyRepository;

    public GetHistoryEntriesQueryHandler(IHistoryRepository historyRepository)
    {
        _historyRepository = historyRepository;
    }

    public async Task<Result<GetHistoryEntriesResponse>> Handle(GetHistoryEntriesQuery request, CancellationToken cancellationToken)
    {
        try
        {
            var (entries, totalCount) = await _historyRepository.GetHistoryEntriesAsync(
                since: request.Since,
                until: request.Until,
                skip: request.Skip,
                take: request.Take,
                cancellationToken);

            var entryDtos = entries.Select(entry => new HistoryEntryDto(
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

            return Result<GetHistoryEntriesResponse>.Success(
                new GetHistoryEntriesResponse(entryDtos, totalCount, hasMore));
        }
        catch (Exception ex)
        {
            return Result<GetHistoryEntriesResponse>.Failure($"Failed to retrieve history entries: {ex.Message}");
        }
    }
}
