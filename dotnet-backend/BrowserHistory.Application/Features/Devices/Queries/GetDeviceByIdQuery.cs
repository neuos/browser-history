using BrowserHistory.Application.Common.Interfaces;
using BrowserHistory.Application.Common.Models;
using BrowserHistory.Domain.ValueObjects;
using FluentValidation;
using MediatR;

namespace BrowserHistory.Application.Features.Devices.Queries;

/// <summary>
/// Query to get device by ID
/// </summary>
public record GetDeviceByIdQuery : IRequest<Result<DeviceDto?>>
{
    public required string DeviceId { get; init; }
}

/// <summary>
/// Validator for GetDeviceByIdQuery
/// </summary>
public class GetDeviceByIdQueryValidator : AbstractValidator<GetDeviceByIdQuery>
{
    public GetDeviceByIdQueryValidator()
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
/// Handler for GetDeviceByIdQuery
/// </summary>
public class GetDeviceByIdQueryHandler : IRequestHandler<GetDeviceByIdQuery, Result<DeviceDto?>>
{
    private readonly IUnitOfWork _unitOfWork;

    public GetDeviceByIdQueryHandler(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<DeviceDto?>> Handle(GetDeviceByIdQuery request, CancellationToken cancellationToken)
    {
        try
        {
            var deviceId = DeviceId.From(Guid.Parse(request.DeviceId));
            var device = await _unitOfWork.Devices.GetByIdAsync(deviceId, cancellationToken);

            if (device == null)
            {
                return Result<DeviceDto?>.Success(null);
            }

            var deviceDto = new DeviceDto
            {
                Id = device.Id.Value.ToString(),
                DeviceName = device.DeviceName,
                RegisteredAt = device.RegisteredAt,
                LastSeen = device.LastSeen,
                IsActive = device.IsActive
            };

            return Result<DeviceDto?>.Success(deviceDto);
        }
        catch (ArgumentException ex)
        {
            return Result<DeviceDto?>.Failure(ex.Message);
        }
        catch (Exception ex)
        {
            return Result<DeviceDto?>.Failure($"An error occurred while retrieving device: {ex.Message}");
        }
    }
}
