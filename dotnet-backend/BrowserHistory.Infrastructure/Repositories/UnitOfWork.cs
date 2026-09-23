using BrowserHistory.Application.Common.Interfaces;
using BrowserHistory.Infrastructure.Data;
using Microsoft.EntityFrameworkCore.Storage;

namespace BrowserHistory.Infrastructure.Repositories;

/// <summary>
/// Unit of Work implementation coordinating multiple repository operations
/// </summary>
public class UnitOfWork : IUnitOfWork, IDisposable
{
    private readonly BrowserHistoryDbContext _context;
    private IDbContextTransaction? _transaction;

    private IDeviceRepository? _devices;
    private ISyncEventRepository? _syncEvents;

    public UnitOfWork(BrowserHistoryDbContext context)
    {
        _context = context;
    }

    public IDeviceRepository Devices => _devices ??= new DeviceRepository(_context);
    public ISyncEventRepository SyncEvents => _syncEvents ??= new SyncEventRepository(_context);

    public async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        return await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task BeginTransactionAsync(CancellationToken cancellationToken = default)
    {
        _transaction = await _context.Database.BeginTransactionAsync(cancellationToken);
    }

    public async Task CommitTransactionAsync(CancellationToken cancellationToken = default)
    {
        if (_transaction != null)
        {
            await _transaction.CommitAsync(cancellationToken);
            await _transaction.DisposeAsync();
            _transaction = null;
        }
    }

    public async Task RollbackTransactionAsync(CancellationToken cancellationToken = default)
    {
        if (_transaction != null)
        {
            await _transaction.RollbackAsync(cancellationToken);
            await _transaction.DisposeAsync();
            _transaction = null;
        }
    }

    public void Dispose()
    {
        _transaction?.Dispose();
        _context.Dispose();
    }
}
