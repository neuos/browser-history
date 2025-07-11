using BrowserHistory.Application.Common.Interfaces;
using BrowserHistory.Application.Common.Models;
using BrowserHistory.Domain.Entities;
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
            .NotEmpty()
            .WithMessage("Timestamp is required")
            .Must(timestamp => timestamp <= DateTime.UtcNow.AddMinutes(5))
            .WithMessage("Timestamp cannot be more than 5 minutes in the future");

        RuleFor(x => x.EventType)
            .IsInEnum()
            .WithMessage("Invalid event type");

        RuleFor(x => x.Metadata)
            .MaximumLength(1000)
            .WithMessage("Metadata cannot exceed 1000 characters");
    }
}

public class SubmitSyncEventsCommandHandler : IRequestHandler<SubmitSyncEventsCommand, Result<SubmitSyncEventsResponse>>
{
    private readonly ISyncEventRepository _syncEventRepository;
    private readonly IDeviceRepository _deviceRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IDateTimeProvider _dateTimeProvider;

    public SubmitSyncEventsCommandHandler(
        ISyncEventRepository syncEventRepository,
        IDeviceRepository deviceRepository,
        IUnitOfWork unitOfWork,
        IDateTimeProvider dateTimeProvider)
    {
        _syncEventRepository = syncEventRepository;
        _deviceRepository = deviceRepository;
        _unitOfWork = unitOfWork;
        _dateTimeProvider = dateTimeProvider;
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

                // Create domain entity from DTO
                var syncEvent = SyncEvent.Create(
                    request.DeviceId,
                    eventDto.EventType,
                    eventDto.Metadata);

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
