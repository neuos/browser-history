using BrowserHistory.Application.Common.Interfaces;
using BrowserHistory.Domain.Entities;
using BrowserHistory.Domain.ValueObjects;
using BrowserHistory.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace BrowserHistory.Infrastructure.Repositories;

public class DeviceRepository : IDeviceRepository
{
    private readonly BrowserHistoryDbContext _context;

    public DeviceRepository(BrowserHistoryDbContext context)
    {
        _context = context;
    }

    public async Task<Device?> GetByIdAsync(DeviceId deviceId, CancellationToken cancellationToken = default)
    {
        return await _context.Devices
            .FirstOrDefaultAsync(d => d.Id == deviceId, cancellationToken);
    }

    public async Task<Device> CreateAsync(Device device, CancellationToken cancellationToken = default)
    {
        var entry = await _context.Devices.AddAsync(device, cancellationToken);
        return entry.Entity;
    }

    public Task<Device> UpdateAsync(Device device, CancellationToken cancellationToken = default)
    {
        _context.Devices.Update(device);
        return Task.FromResult(device);
    }
}
