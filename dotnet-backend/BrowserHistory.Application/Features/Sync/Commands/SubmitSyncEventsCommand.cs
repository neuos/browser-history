using BrowserHistory.Application.Common.Interfaces;
using BrowserHistory.Application.Common.Models;
using BrowserHistory.Application.Features.Sync.Models;
using BrowserHistory.Domain.Entities;
using BrowserHistory.Domain.Enums;
using BrowserHistory.Domain.ValueObjects;
using FluentValidation;
using MediatR;

namespace BrowserHistory.Application.Features.Sync.Commands;

public record SubmitSyncEventsCommand(DeviceId DeviceId, IEnumerable<SyncEventDto> Events) : IRequest<Result<SubmitSyncEventsResponse>>;

public record SubmitSyncEventsResponse(int ProcessedCount, IEnumerable<string> Conflicts);

public class SubmitSyncEventsCommandValidator : AbstractValidator<SubmitSyncEventsCommand>
{
    public SubmitSyncEventsCommandValidator()
    {
        RuleFor(x => x.DeviceId)
            .NotNull()
            .WithMessage("DeviceId is required");

        RuleFor(x => x.Events)
            .NotNull()
            .WithMessage("Events collection cannot be null")
            .Must(events => events.Any())
            .WithMessage("At least one sync event is required");

        RuleForEach(x => x.Events)
            .SetValidator(new SyncEventDtoValidator());
    }
}

public class SyncEventDtoValidator : AbstractValidator<SyncEventDto>
{
    public SyncEventDtoValidator()
    {
        RuleFor(x => x.Id)
            .NotEmpty()
            .WithMessage("SyncEvent Id is required");

        RuleFor(x => x.Timestamp)
            .GreaterThan(0)
            .WithMessage("Timestamp is required")
            .Must(timestamp => timestamp <= DateTimeOffset.UtcNow.AddMinutes(5).ToUnixTimeMilliseconds())
            .WithMessage("Timestamp cannot be more than 5 minutes in the future");

        RuleFor(x => x.EventType)
            .Must(eventType => Enum.TryParse<SyncEventType>(eventType, ignoreCase: true, out _))
            .WithMessage("Invalid event type");

        RuleFor(x => x.EntityType)
            .Must(entityType => Enum.TryParse<SyncEntityType>(entityType, ignoreCase: true, out _))
            .WithMessage("Invalid entity type");

        RuleFor(x => x.EntityId)
            .NotEmpty()
            .WithMessage("EntityId is required");
    }
}

public class SubmitSyncEventsCommandHandler : IRequestHandler<SubmitSyncEventsCommand, Result<SubmitSyncEventsResponse>>
{
    private readonly ISyncEventRepository _syncEventRepository;
    private readonly IDeviceRepository _deviceRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IDateTimeProvider _dateTimeProvider;
    private readonly IServerSentEventService? _sseService;

    public SubmitSyncEventsCommandHandler(
        ISyncEventRepository syncEventRepository,
        IDeviceRepository deviceRepository,
        IUnitOfWork unitOfWork,
        IDateTimeProvider dateTimeProvider,
        IServerSentEventService? sseService = null)
    {
        _syncEventRepository = syncEventRepository;
        _deviceRepository = deviceRepository;
        _unitOfWork = unitOfWork;
        _dateTimeProvider = dateTimeProvider;
        _sseService = sseService;
    }

    public async Task<Result<SubmitSyncEventsResponse>> Handle(SubmitSyncEventsCommand request, CancellationToken cancellationToken)
    {
        try
        {
            // Verify device exists and is active
            var device = await _deviceRepository.GetByIdAsync(request.DeviceId, cancellationToken);
            if (device == null)
            {
                return Result<SubmitSyncEventsResponse>.Failure("Device not found");
            }

            if (!device.IsActive)
            {
                return Result<SubmitSyncEventsResponse>.Failure("Device is not active");
            }

            // Check for existing sync events to detect conflicts
            var existingEventIds = await _syncEventRepository.GetExistingEventIdsAsync(
                request.Events.Select(e => e.Id), cancellationToken);

            var conflicts = new List<string>();
            var eventsToProcess = new List<SyncEvent>();

            foreach (var eventDto in request.Events)
            {
                if (existingEventIds.Contains(eventDto.Id))
                {
                    conflicts.Add(eventDto.Id.ToString());
                    continue;
                }

                var eventType = Enum.Parse<SyncEventType>(eventDto.EventType, ignoreCase: true);
                var entityType = Enum.Parse<SyncEntityType>(eventDto.EntityType, ignoreCase: true);
                var dataJson = eventDto.Data?.GetRawText() ?? "{}";
                var checksum = Checksum.FromContent(dataJson).ToString();
                var timestamp = DateTimeOffset.FromUnixTimeMilliseconds(eventDto.Timestamp).UtcDateTime;

                // Create domain entity from DTO - eventDto.Id becomes the SyncEvent's own Id
                // (the EF primary key), which is what makes the existingEventIds check above a
                // real idempotency/conflict check instead of comparing against an unrelated value.
                var syncEvent = SyncEvent.Create(
                    eventDto.Id,
                    eventDto.EntityId,
                    request.DeviceId,
                    timestamp,
                    eventType,
                    entityType,
                    dataJson,
                    checksum);

                eventsToProcess.Add(syncEvent);
            }

            // Save new sync events
            if (eventsToProcess.Any())
            {
                await _syncEventRepository.AddRangeAsync(eventsToProcess, cancellationToken);

                // Update device last seen timestamp
                device.UpdateLastSeen();
                await _deviceRepository.UpdateAsync(device, cancellationToken);

                await _unitOfWork.SaveChangesAsync(cancellationToken);

                // Broadcast events to other connected devices via SSE
                if (_sseService != null)
                {
                    var eventDtos = eventsToProcess.Select(e => new
                    {
                        id = e.Id,
                        deviceId = e.DeviceId.ToString(),
                        timestamp = new DateTimeOffset(e.Timestamp, TimeSpan.Zero).ToUnixTimeMilliseconds(),
                        eventType = e.EventType.ToString().ToUpperInvariant(),
                        entityType = e.EntityType.ToString().ToLowerInvariant(),
                        entityId = e.EntityId,
                        data = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(e.Data)
                    }).ToArray();

                    await _sseService.BroadcastToOthersAsync(request.DeviceId.ToString(), new
                    {
                        type = "sync_batch",
                        data = new { events = eventDtos },
                        timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
                    }, cancellationToken);
                }
            }

            return Result<SubmitSyncEventsResponse>.Success(
                new SubmitSyncEventsResponse(eventsToProcess.Count, conflicts));
        }
        catch (Exception ex)
        {
            return Result<SubmitSyncEventsResponse>.Failure($"Failed to submit sync events: {ex.Message}");
        }
    }
}
