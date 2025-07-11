using BrowserHistory.Application.Common.Interfaces;
using BrowserHistory.Domain.Entities;
using BrowserHistory.Domain.ValueObjects;
using BrowserHistory.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace BrowserHistory.Infrastructure.Repositories;

/// <summary>
/// Repository implementation for HistoryNode operations
/// </summary>
public class HistoryRepository : IHistoryRepository
{
    private readonly BrowserHistoryDbContext _context;

    public HistoryRepository(BrowserHistoryDbContext context)
    {
        _context = context;
    }

    public async Task<HistoryNode?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _context.HistoryNodes
            .FirstOrDefaultAsync(h => h.Id == id, cancellationToken);
    }

    public async Task<HistoryNode?> GetByUrlAsync(Url url, CancellationToken cancellationToken = default)
    {
        return await _context.HistoryNodes
            .FirstOrDefaultAsync(h => h.Url == url, cancellationToken);
    }

    public async Task<IEnumerable<HistoryNode>> GetRecentAsync(int count = 100, CancellationToken cancellationToken = default)
    {
        return await _context.HistoryNodes
            .OrderByDescending(h => h.LastVisitedAt)
            .Take(count)
            .ToListAsync(cancellationToken);
    }

    public async Task<IEnumerable<HistoryNode>> GetByDeviceAsync(DeviceId deviceId, CancellationToken cancellationToken = default)
    {
        // Note: This would require a relationship between HistoryNode and Device
        // For now, returning all history nodes as there's no direct device relationship in the current model
        // This can be enhanced by adding a DeviceId to HistoryNode if needed
        return await _context.HistoryNodes
            .OrderByDescending(h => h.LastVisitedAt)
            .ToListAsync(cancellationToken);
    }

    public async Task<IEnumerable<HistoryNode>> SearchAsync(string searchTerm, int limit = 50, CancellationToken cancellationToken = default)
    {
        var normalizedSearchTerm = searchTerm.ToLowerInvariant();
        
        return await _context.HistoryNodes
            .Where(h => h.Title.ToLower().Contains(normalizedSearchTerm) || 
                       h.Url.Value.ToLower().Contains(normalizedSearchTerm))
            .OrderByDescending(h => h.LastVisitedAt)
            .Take(limit)
            .ToListAsync(cancellationToken);
    }

    public async Task<HistoryNode> CreateAsync(HistoryNode historyNode, CancellationToken cancellationToken = default)
    {
        var entry = await _context.HistoryNodes.AddAsync(historyNode, cancellationToken);
        return entry.Entity;
    }

    public Task<HistoryNode> UpdateAsync(HistoryNode historyNode, CancellationToken cancellationToken = default)
    {
        _context.HistoryNodes.Update(historyNode);
        return Task.FromResult(historyNode);
    }

    public async Task DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var historyNode = await GetByIdAsync(id, cancellationToken);
        if (historyNode != null)
        {
            _context.HistoryNodes.Remove(historyNode);
        }
    }
}
