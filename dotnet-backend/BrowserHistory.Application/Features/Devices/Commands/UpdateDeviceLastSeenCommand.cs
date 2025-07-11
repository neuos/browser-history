using BrowserHistory.Application.Common.Interfaces;
using BrowserHistory.Application.Common.Models;
using BrowserHistory.Domain.ValueObjects;
using FluentValidation;
using MediatR;

namespace BrowserHistory.Application.Features.Devices.Commands;

/// <summary>
/// Command to update device last seen timestamp
/// </summary>
public record UpdateDeviceLastSeenCommand : IRequest<Result>
{
    public required string DeviceId { get; init; }
}

/// <summary>
/// Validator for UpdateDeviceLastSeenCommand
/// </summary>
public class UpdateDeviceLastSeenCommandValidator : AbstractValidator<UpdateDeviceLastSeenCommand>
{
    public UpdateDeviceLastSeenCommandValidator()
    {
        RuleFor(x => x.DeviceId)
            .NotEmpty()
            .WithMessage("Device ID is required")
            .Must(BeValidGuid)
            .WithMessage("Device ID must be a valid GUID");
    }

    private static bool BeValidGuid(string deviceId)
    {
        return Guid.TryParse(deviceId, out _);
    }
}

/// <summary>
/// Handler for UpdateDeviceLastSeenCommand
/// </summary>
public class UpdateDeviceLastSeenCommandHandler : IRequestHandler<UpdateDeviceLastSeenCommand, Result>
{
    private readonly IUnitOfWork _unitOfWork;

    public UpdateDeviceLastSeenCommandHandler(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<Result> Handle(UpdateDeviceLastSeenCommand request, CancellationToken cancellationToken)
    {
        try
        {
            var deviceId = DeviceId.From(Guid.Parse(request.DeviceId));
            var device = await _unitOfWork.Devices.GetByIdAsync(deviceId, cancellationToken);

            if (device == null)
            {
                return Result.Failure($"Device with ID '{request.DeviceId}' not found");
            }

            device.UpdateLastSeen();
            await _unitOfWork.Devices.UpdateAsync(device, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            return Result.Success();
        }
        catch (ArgumentException ex)
        {
            return Result.Failure(ex.Message);
        }
        catch (Exception ex)
        {
            return Result.Failure($"An error occurred while updating device: {ex.Message}");
        }
    }
}
