using BrowserHistory.Application.Common.Interfaces;
using BrowserHistory.Domain.Entities;
using BrowserHistory.Domain.ValueObjects;
using BrowserHistory.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace BrowserHistory.Infrastructure.Repositories;

/// <summary>
/// Repository implementation for SyncEvent operations
/// </summary>
public class SyncEventRepository : ISyncEventRepository
{
    private readonly BrowserHistoryDbContext _context;

    public SyncEventRepository(BrowserHistoryDbContext context)
    {
        _context = context;
    }

    public async Task<SyncEvent?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _context.SyncEvents
            .FirstOrDefaultAsync(s => s.Id == id, cancellationToken);
    }

    public async Task<IEnumerable<SyncEvent>> GetByDeviceAsync(DeviceId deviceId, CancellationToken cancellationToken = default)
    {
        return await _context.SyncEvents
            .Where(s => s.DeviceId == deviceId)
            .OrderByDescending(s => s.Timestamp)
            .ToListAsync(cancellationToken);
    }

    public async Task<IEnumerable<SyncEvent>> GetRecentAsync(int count = 100, CancellationToken cancellationToken = default)
    {
        return await _context.SyncEvents
            .OrderByDescending(s => s.Timestamp)
            .Take(count)
            .ToListAsync(cancellationToken);
    }

    public async Task<SyncEvent> CreateAsync(SyncEvent syncEvent, CancellationToken cancellationToken = default)
    {
        var entry = await _context.SyncEvents.AddAsync(syncEvent, cancellationToken);
        return entry.Entity;
    }
}
