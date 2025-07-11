using BrowserHistory.Application.Common.Interfaces;
using BrowserHistory.Application.Common.Models;
using MediatR;

namespace BrowserHistory.Application.Features.Devices.Queries;

/// <summary>
/// Query to get all active devices
/// </summary>
public record GetActiveDevicesQuery : IRequest<Result<IEnumerable<DeviceDto>>>;

/// <summary>
/// Handler for GetActiveDevicesQuery
/// </summary>
public class GetActiveDevicesQueryHandler : IRequestHandler<GetActiveDevicesQuery, Result<IEnumerable<DeviceDto>>>
{
    private readonly IUnitOfWork _unitOfWork;

    public GetActiveDevicesQueryHandler(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<IEnumerable<DeviceDto>>> Handle(GetActiveDevicesQuery request, CancellationToken cancellationToken)
    {
        try
        {
            var devices = await _unitOfWork.Devices.GetAllActiveAsync(cancellationToken);

            var deviceDtos = devices.Select(device => new DeviceDto
            {
                Id = device.Id.Value.ToString(),
                DeviceName = device.DeviceName,
                RegisteredAt = device.RegisteredAt,
                LastSeen = device.LastSeen,
                IsActive = device.IsActive
            });

            return Result<IEnumerable<DeviceDto>>.Success(deviceDtos);
        }
        catch (Exception ex)
        {
            return Result<IEnumerable<DeviceDto>>.Failure($"An error occurred while retrieving active devices: {ex.Message}");
        }
    }
}
