using BrowserHistory.Application.Common.Interfaces;
using BrowserHistory.Application.Common.Models;
using BrowserHistory.Domain.Entities;
using BrowserHistory.Domain.ValueObjects;
using FluentValidation;
using MediatR;

namespace BrowserHistory.Application.Features.Devices.Commands;

/// <summary>
/// Command to register a new device
/// </summary>
public record RegisterDeviceCommand : IRequest<Result<DeviceDto>>
{
    public required string DeviceName { get; init; }
}

/// <summary>
/// Validator for RegisterDeviceCommand
/// </summary>
public class RegisterDeviceCommandValidator : AbstractValidator<RegisterDeviceCommand>
{
    public RegisterDeviceCommandValidator()
    {
        RuleFor(x => x.DeviceName)
            .NotEmpty()
            .WithMessage("Device name is required")
            .MaximumLength(100)
            .WithMessage("Device name cannot exceed 100 characters")
            .Must(name => !string.IsNullOrWhiteSpace(name))
            .WithMessage("Device name cannot be only whitespace");
    }
}

/// <summary>
/// Handler for RegisterDeviceCommand
/// </summary>
public class RegisterDeviceCommandHandler : IRequestHandler<RegisterDeviceCommand, Result<DeviceDto>>
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly INotificationService _notificationService;

    public RegisterDeviceCommandHandler(IUnitOfWork unitOfWork, INotificationService notificationService)
    {
        _unitOfWork = unitOfWork;
        _notificationService = notificationService;
    }

    public async Task<Result<DeviceDto>> Handle(RegisterDeviceCommand request, CancellationToken cancellationToken)
    {
        try
        {
            // Check if device with same name already exists
            var existingDevice = await _unitOfWork.Devices.GetByNameAsync(request.DeviceName, cancellationToken);
            if (existingDevice != null)
            {
                return Result<DeviceDto>.Failure($"Device with name '{request.DeviceName}' already exists");
            }

            // Create new device
            var device = Device.Create(request.DeviceName);
            
            // Save to repository
            var createdDevice = await _unitOfWork.Devices.CreateAsync(device, cancellationToken);
            
            // Create sync event
            var syncEvent = SyncEvent.DeviceConnected(device.Id);
            await _unitOfWork.SyncEvents.CreateAsync(syncEvent, cancellationToken);
            
            // Save changes
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            // Notify other services
            await _notificationService.NotifyDeviceConnectedAsync(
                device.Id.Value.ToString(), 
                device.DeviceName, 
                cancellationToken);

            // Map to DTO
            var deviceDto = new DeviceDto
            {
                Id = createdDevice.Id.Value.ToString(),
                DeviceName = createdDevice.DeviceName,
                RegisteredAt = createdDevice.RegisteredAt,
                LastSeen = createdDevice.LastSeen,
                IsActive = createdDevice.IsActive
            };

            return Result<DeviceDto>.Success(deviceDto);
        }
        catch (ArgumentException ex)
        {
            return Result<DeviceDto>.Failure(ex.Message);
        }
        catch (Exception ex)
        {
            return Result<DeviceDto>.Failure($"An error occurred while registering the device: {ex.Message}");
        }
    }
}
