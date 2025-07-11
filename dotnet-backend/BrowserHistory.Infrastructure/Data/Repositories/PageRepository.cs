using BrowserHistory.Domain.Entities;
using BrowserHistory.Domain.Repositories;
using BrowserHistory.Domain.ValueObjects;
using Microsoft.EntityFrameworkCore;

namespace BrowserHistory.Infrastructure.Data.Repositories;

/// <summary>
/// Entity Framework implementation of IPageRepository
/// </summary>
public class PageRepository : IPageRepository
{
    private readonly BrowserHistoryDbContext _context;

    public PageRepository(BrowserHistoryDbContext context)
    {
        _context = context ?? throw new ArgumentNullException(nameof(context));
    }

    public async Task<Page?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _context.Pages
            .FirstOrDefaultAsync(p => p.Id == id, cancellationToken);
    }

    public async Task<Page?> GetByUrlAsync(Url url, CancellationToken cancellationToken = default)
    {
        return await _context.Pages
            .FirstOrDefaultAsync(p => p.Url.Value == url.Value, cancellationToken);
    }

    public async Task<IEnumerable<Page>> SearchAsync(
        string? searchTerm = null,
        string? language = null,
        DateTime? indexedAfter = null,
        int skip = 0,
        int take = 50,
        CancellationToken cancellationToken = default)
    {
        var query = _context.Pages.AsQueryable();

        if (!string.IsNullOrWhiteSpace(searchTerm))
        {
            var lowerSearchTerm = searchTerm.ToLowerInvariant();
            query = query.Where(p => 
                p.Title.ToLower().Contains(lowerSearchTerm) ||
                (p.Description != null && p.Description.ToLower().Contains(lowerSearchTerm)) ||
                (p.Keywords != null && p.Keywords.ToLower().Contains(lowerSearchTerm)));
        }

        if (!string.IsNullOrWhiteSpace(language))
        {
            query = query.Where(p => p.Language == language.ToLowerInvariant());
        }

        if (indexedAfter.HasValue)
        {
            query = query.Where(p => p.LastIndexedAt > indexedAfter.Value);
        }

        return await query
            .OrderByDescending(p => p.LastIndexedAt)
            .Skip(skip)
            .Take(take)
            .ToListAsync(cancellationToken);
    }

    public async Task<IEnumerable<Page>> GetStalePages(
        TimeSpan maxAge,
        int batchSize = 100,
        CancellationToken cancellationToken = default)
    {
        var cutoffTime = DateTime.UtcNow - maxAge;
        
        return await _context.Pages
            .Where(p => p.LastIndexedAt < cutoffTime)
            .OrderBy(p => p.LastIndexedAt)
            .Take(batchSize)
            .ToListAsync(cancellationToken);
    }

    public async Task<Page> AddAsync(Page page, CancellationToken cancellationToken = default)
    {
        _context.Pages.Add(page);
        await _context.SaveChangesAsync(cancellationToken);
        return page;
    }

    public async Task<Page> UpdateAsync(Page page, CancellationToken cancellationToken = default)
    {
        _context.Pages.Update(page);
        await _context.SaveChangesAsync(cancellationToken);
        return page;
    }

    public async Task DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var page = await GetByIdAsync(id, cancellationToken);
        if (page != null)
        {
            _context.Pages.Remove(page);
            await _context.SaveChangesAsync(cancellationToken);
        }
    }

    public async Task<bool> ExistsAsync(Url url, CancellationToken cancellationToken = default)
    {
        return await _context.Pages
            .AnyAsync(p => p.Url.Value == url.Value, cancellationToken);
    }

    public async Task<int> GetCountAsync(CancellationToken cancellationToken = default)
    {
        return await _context.Pages.CountAsync(cancellationToken);
    }

    public async Task<IEnumerable<Page>> GetLargePagesAsync(
        long minContentLength,
        int batchSize = 100,
        CancellationToken cancellationToken = default)
    {
        return await _context.Pages
            .Where(p => p.ContentLength >= minContentLength)
            .OrderByDescending(p => p.ContentLength)
            .Take(batchSize)
            .ToListAsync(cancellationToken);
    }
}
