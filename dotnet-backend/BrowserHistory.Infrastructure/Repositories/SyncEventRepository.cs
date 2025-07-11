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

    public async Task AddRangeAsync(IEnumerable<SyncEvent> syncEvents, CancellationToken cancellationToken = default)
    {
        await _context.SyncEvents.AddRangeAsync(syncEvents, cancellationToken);
    }

    public async Task<IEnumerable<Guid>> GetExistingEventIdsAsync(IEnumerable<Guid> eventIds, CancellationToken cancellationToken = default)
    {
        var existingIds = await _context.SyncEvents
            .Where(s => eventIds.Contains(s.Id))
            .Select(s => s.Id)
            .ToListAsync(cancellationToken);

        return existingIds;
    }

    public async Task<(IEnumerable<SyncEvent> Events, int TotalCount)> GetEventsAsync(
        DeviceId? excludeDeviceId = null, 
        DateTime? since = null, 
        int skip = 0, 
        int take = 100, 
        CancellationToken cancellationToken = default)
    {
        var query = _context.SyncEvents.AsQueryable();

        // Exclude events from specific device if specified
        if (excludeDeviceId != null)
        {
            query = query.Where(s => s.DeviceId != excludeDeviceId);
        }

        // Filter by timestamp if specified
        if (since.HasValue)
        {
            query = query.Where(s => s.Timestamp > since.Value);
        }

        // Get total count before pagination
        var totalCount = await query.CountAsync(cancellationToken);

        // Apply pagination and ordering
        var events = await query
            .OrderBy(s => s.Timestamp)
            .Skip(skip)
            .Take(take)
            .ToListAsync(cancellationToken);

        return (events, totalCount);
    }

    public async Task<SyncEvent?> GetLastEventForDeviceAsync(DeviceId deviceId, CancellationToken cancellationToken = default)
    {
        return await _context.SyncEvents
            .Where(s => s.DeviceId == deviceId)
            .OrderByDescending(s => s.Timestamp)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<int> GetPendingEventsCountAsync(DeviceId deviceId, CancellationToken cancellationToken = default)
    {
        // Get the last processed event timestamp for this device
        var lastEvent = await GetLastEventForDeviceAsync(deviceId, cancellationToken);
        var lastTimestamp = lastEvent?.Timestamp ?? DateTime.MinValue;

        // Count events from other devices that are newer than this device's last event
        return await _context.SyncEvents
            .Where(s => s.DeviceId != deviceId && s.Timestamp > lastTimestamp)
            .CountAsync(cancellationToken);
    }

    public async Task<int> GetTotalEventsCountForDeviceAsync(DeviceId deviceId, CancellationToken cancellationToken = default)
    {
        return await _context.SyncEvents
            .Where(s => s.DeviceId == deviceId)
            .CountAsync(cancellationToken);
    }
}
