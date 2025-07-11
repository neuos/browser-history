using BrowserHistory.Application.Common.Interfaces;
using BrowserHistory.Domain.Entities;
using BrowserHistory.Domain.ValueObjects;
using BrowserHistory.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace BrowserHistory.Infrastructure.Repositories;

/// <summary>
/// Repository implementation for Device operations
/// </summary>
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

    public async Task<Device?> GetByNameAsync(string deviceName, CancellationToken cancellationToken = default)
    {
        return await _context.Devices
            .FirstOrDefaultAsync(d => d.DeviceName == deviceName, cancellationToken);
    }

    public async Task<IEnumerable<Device>> GetAllActiveAsync(CancellationToken cancellationToken = default)
    {
        return await _context.Devices
            .Where(d => d.IsActive)
            .OrderByDescending(d => d.LastSeen)
            .ToListAsync(cancellationToken);
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

    public async Task DeleteAsync(DeviceId deviceId, CancellationToken cancellationToken = default)
    {
        var device = await GetByIdAsync(deviceId, cancellationToken);
        if (device != null)
        {
            _context.Devices.Remove(device);
        }
    }
}
