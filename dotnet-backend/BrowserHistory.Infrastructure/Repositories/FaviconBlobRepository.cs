using BrowserHistory.Application.Common.Interfaces;
using BrowserHistory.Domain.Entities;
using BrowserHistory.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace BrowserHistory.Infrastructure.Repositories;

/// <summary>
/// Repository implementation for FaviconBlob operations
/// </summary>
public class FaviconBlobRepository : IFaviconBlobRepository
{
    private readonly BrowserHistoryDbContext _context;

    public FaviconBlobRepository(BrowserHistoryDbContext context)
    {
        _context = context;
    }

    public async Task<FaviconBlob?> GetByHashAsync(string hash, CancellationToken cancellationToken = default)
    {
        return await _context.FaviconBlobs
            .FirstOrDefaultAsync(f => f.Hash == hash, cancellationToken);
    }

    public async Task<bool> ExistsAsync(string hash, CancellationToken cancellationToken = default)
    {
        return await _context.FaviconBlobs
            .AnyAsync(f => f.Hash == hash, cancellationToken);
    }

    public async Task<bool> CreateIfNotExistsAsync(FaviconBlob faviconBlob, CancellationToken cancellationToken = default)
    {
        _context.FaviconBlobs.Add(faviconBlob);
        try
        {
            await _context.SaveChangesAsync(cancellationToken);
            return false; // inserted
        }
        catch (DbUpdateException)
        {
            // Another request inserted the same hash between our ExistsAsync check and this
            // save - detach the entity we tried to add so the context doesn't keep tracking a
            // row that was never actually written, and treat it the same as "already existed".
            _context.Entry(faviconBlob).State = EntityState.Detached;
            return true;
        }
    }
}
