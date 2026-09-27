using BrowserHistory.Application.Common.Interfaces;
using BrowserHistory.Infrastructure.Data;

namespace BrowserHistory.Infrastructure.Repositories;

public class UnitOfWork : IUnitOfWork, IDisposable
{
    private readonly BrowserHistoryDbContext _context;

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

    public void Dispose()
    {
        _context.Dispose();
    }
}
