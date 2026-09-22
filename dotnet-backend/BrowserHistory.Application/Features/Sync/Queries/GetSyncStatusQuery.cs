using BrowserHistory.Application.Common.Interfaces;
using BrowserHistory.Application.Common.Models;
using BrowserHistory.Application.Features.Sync.Models;
using BrowserHistory.Domain.ValueObjects;
using FluentValidation;
using MediatR;

namespace BrowserHistory.Application.Features.Sync.Queries;

public record GetSyncStatusQuery(DeviceId DeviceId) : IRequest<Result<SyncStatusDto>>;

public class GetSyncStatusQueryValidator : AbstractValidator<GetSyncStatusQuery>
{
    public GetSyncStatusQueryValidator()
    {
        RuleFor(x => x.DeviceId)
            .NotNull()
            .WithMessage("DeviceId is required");
    }
}

public class GetSyncStatusQueryHandler : IRequestHandler<GetSyncStatusQuery, Result<SyncStatusDto>>
{
    private readonly ISyncEventRepository _syncEventRepository;
    private readonly IDeviceRepository _deviceRepository;

    public GetSyncStatusQueryHandler(
        ISyncEventRepository syncEventRepository,
        IDeviceRepository deviceRepository)
    {
        _syncEventRepository = syncEventRepository;
        _deviceRepository = deviceRepository;
    }

    public async Task<Result<SyncStatusDto>> Handle(GetSyncStatusQuery request, CancellationToken cancellationToken)
    {
        try
        {
            // Verify device exists
            var device = await _deviceRepository.GetByIdAsync(request.DeviceId, cancellationToken);
            if (device == null)
            {
                return Result<SyncStatusDto>.Failure("Device not found");
            }

            // Get sync statistics
            var lastSyncEvent = await _syncEventRepository.GetLastEventForDeviceAsync(request.DeviceId, cancellationToken);
            var pendingEventsCount = await _syncEventRepository.GetPendingEventsCountAsync(request.DeviceId, cancellationToken);
            var totalEventsCount = await _syncEventRepository.GetTotalEventsCountForDeviceAsync(request.DeviceId, cancellationToken);

            var syncStatus = new SyncStatusDto
            {
                DeviceId = request.DeviceId.ToString(),
                IsActive = device.IsActive,
                LastSyncTimestamp = lastSyncEvent?.Timestamp,
                PendingEventsCount = pendingEventsCount,
                TotalEventsCount = totalEventsCount,
                LastSeen = device.LastSeen
            };

            return Result<SyncStatusDto>.Success(syncStatus);
        }
        catch (Exception ex)
        {
            return Result<SyncStatusDto>.Failure($"Failed to retrieve sync status: {ex.Message}");
        }
    }
}
