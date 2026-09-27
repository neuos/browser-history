using BrowserHistory.Application.Common.Interfaces;
using BrowserHistory.Domain.Entities;
using BrowserHistory.Domain.ValueObjects;
using BrowserHistory.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace BrowserHistory.Infrastructure.Repositories;

public class SyncEventRepository : ISyncEventRepository
{
    private readonly BrowserHistoryDbContext _context;

    public SyncEventRepository(BrowserHistoryDbContext context)
    {
        _context = context;
    }

    public async Task AddRangeAsync(IEnumerable<SyncEvent> syncEvents, CancellationToken cancellationToken = default)
    {
        await _context.SyncEvents.AddRangeAsync(syncEvents, cancellationToken);
    }

    public async Task<IEnumerable<Guid>> GetExistingEventIdsAsync(IEnumerable<Guid> eventIds, CancellationToken cancellationToken = default)
    {
        return await _context.SyncEvents
            .Where(s => eventIds.Contains(s.Id))
            .Select(s => s.Id)
            .ToListAsync(cancellationToken);
    }

    public async Task<(IEnumerable<SyncEvent> Events, int TotalCount)> GetEventsAsync(
        DeviceId? excludeDeviceId = null,
        DateTime? since = null,
        int skip = 0,
        int take = 100,
        CancellationToken cancellationToken = default)
    {
        // Only entity sync events (Create/Update/Delete) carry real Data/EntityId for clients to
        // apply; device-lifecycle events (DeviceConnected, HistorySyncStarted, ...) are internal
        // bookkeeping and must never be handed to a client as if they were history/page data.
        var query = _context.SyncEvents.AsQueryable()
            .Where(s => s.EventType == SyncEventType.Create
                     || s.EventType == SyncEventType.Update
                     || s.EventType == SyncEventType.Delete);

        if (excludeDeviceId != null)
        {
            query = query.Where(s => s.DeviceId != excludeDeviceId);
        }

        if (since.HasValue)
        {
            query = query.Where(s => s.Timestamp > since.Value);
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var events = await query
            .OrderBy(s => s.Timestamp)
            .Skip(skip)
            .Take(take)
            .ToListAsync(cancellationToken);

        return (events, totalCount);
    }
}
