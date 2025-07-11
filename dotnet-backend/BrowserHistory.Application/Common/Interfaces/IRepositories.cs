using BrowserHistory.Domain.Entities;
using BrowserHistory.Domain.ValueObjects;

namespace BrowserHistory.Application.Common.Interfaces;

/// <summary>
/// Repository interface for Device operations
/// </summary>
public interface IDeviceRepository
{
    Task<Device?> GetByIdAsync(DeviceId deviceId, CancellationToken cancellationToken = default);
    Task<Device?> GetByNameAsync(string deviceName, CancellationToken cancellationToken = default);
    Task<IEnumerable<Device>> GetAllActiveAsync(CancellationToken cancellationToken = default);
    Task<Device> CreateAsync(Device device, CancellationToken cancellationToken = default);
    Task<Device> UpdateAsync(Device device, CancellationToken cancellationToken = default);
    Task DeleteAsync(DeviceId deviceId, CancellationToken cancellationToken = default);
}

/// <summary>
/// Repository interface for HistoryNode operations
/// </summary>
public interface IHistoryRepository
{
    Task<HistoryNode?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<HistoryNode?> GetByUrlAsync(Url url, CancellationToken cancellationToken = default);
    Task<IEnumerable<HistoryNode>> GetRecentAsync(int count = 100, CancellationToken cancellationToken = default);
    Task<IEnumerable<HistoryNode>> GetByDeviceAsync(DeviceId deviceId, CancellationToken cancellationToken = default);
    Task<IEnumerable<HistoryNode>> SearchAsync(string searchTerm, int limit = 50, CancellationToken cancellationToken = default);
    Task<HistoryNode> CreateAsync(HistoryNode historyNode, CancellationToken cancellationToken = default);
    Task<HistoryNode> UpdateAsync(HistoryNode historyNode, CancellationToken cancellationToken = default);
    Task DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}

/// <summary>
/// Repository interface for SyncEvent operations
/// </summary>
public interface ISyncEventRepository
{
    Task<SyncEvent?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<IEnumerable<SyncEvent>> GetByDeviceAsync(DeviceId deviceId, CancellationToken cancellationToken = default);
    Task<IEnumerable<SyncEvent>> GetRecentAsync(int count = 100, CancellationToken cancellationToken = default);
    Task<SyncEvent> CreateAsync(SyncEvent syncEvent, CancellationToken cancellationToken = default);
}

/// <summary>
/// Unit of Work pattern for coordinating multiple repository operations
/// </summary>
public interface IUnitOfWork
{
    IDeviceRepository Devices { get; }
    IHistoryRepository History { get; }
    ISyncEventRepository SyncEvents { get; }
    
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
    Task BeginTransactionAsync(CancellationToken cancellationToken = default);
    Task CommitTransactionAsync(CancellationToken cancellationToken = default);
    Task RollbackTransactionAsync(CancellationToken cancellationToken = default);
}
