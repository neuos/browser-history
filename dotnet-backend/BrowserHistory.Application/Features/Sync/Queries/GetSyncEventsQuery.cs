using BrowserHistory.Application.Common.Interfaces;
using BrowserHistory.Application.Common.Models;
using BrowserHistory.Domain.ValueObjects;
using FluentValidation;
using MediatR;

namespace BrowserHistory.Application.Features.Sync.Queries;

public record GetSyncEventsQuery(
    DeviceId? ExcludeDeviceId = null,
    DateTime? Since = null,
    int Skip = 0,
    int Take = 100) : IRequest<Result<GetSyncEventsResponse>>;

public record GetSyncEventsResponse(
    IEnumerable<SyncEventDto> Events,
    int TotalCount,
    bool HasMore);

public class GetSyncEventsQueryValidator : AbstractValidator<GetSyncEventsQuery>
{
    public GetSyncEventsQueryValidator()
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
    }
}

public class GetSyncEventsQueryHandler : IRequestHandler<GetSyncEventsQuery, Result<GetSyncEventsResponse>>
{
    private readonly ISyncEventRepository _syncEventRepository;

    public GetSyncEventsQueryHandler(ISyncEventRepository syncEventRepository)
    {
        _syncEventRepository = syncEventRepository;
    }

    public async Task<Result<GetSyncEventsResponse>> Handle(GetSyncEventsQuery request, CancellationToken cancellationToken)
    {
        try
        {
            var (events, totalCount) = await _syncEventRepository.GetEventsAsync(
                excludeDeviceId: request.ExcludeDeviceId,
                since: request.Since,
                skip: request.Skip,
                take: request.Take,
                cancellationToken);

            var eventDtos = events.Select(e => new SyncEventDto(
                e.Id,
                e.DeviceId,
                e.Timestamp,
                e.EventType,
                e.Metadata)).ToList();

            var hasMore = request.Skip + request.Take < totalCount;

            return Result<GetSyncEventsResponse>.Success(
                new GetSyncEventsResponse(eventDtos, totalCount, hasMore));
        }
        catch (Exception ex)
        {
            return Result<GetSyncEventsResponse>.Failure($"Failed to retrieve sync events: {ex.Message}");
        }
    }
}
