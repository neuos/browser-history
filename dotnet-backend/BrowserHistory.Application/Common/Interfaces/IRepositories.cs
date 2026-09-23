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
/// Repository interface for SyncEvent operations
/// </summary>
public interface ISyncEventRepository
{
    Task<SyncEvent?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<IEnumerable<SyncEvent>> GetByDeviceAsync(DeviceId deviceId, CancellationToken cancellationToken = default);
    Task<IEnumerable<SyncEvent>> GetRecentAsync(int count = 100, CancellationToken cancellationToken = default);
    Task<SyncEvent> CreateAsync(SyncEvent syncEvent, CancellationToken cancellationToken = default);
    Task AddRangeAsync(IEnumerable<SyncEvent> syncEvents, CancellationToken cancellationToken = default);
    Task<IEnumerable<Guid>> GetExistingEventIdsAsync(IEnumerable<Guid> eventIds, CancellationToken cancellationToken = default);
    Task<(IEnumerable<SyncEvent> Events, int TotalCount)> GetEventsAsync(
        DeviceId? excludeDeviceId = null,
        DateTime? since = null,
        int skip = 0,
        int take = 100,
        CancellationToken cancellationToken = default);
    Task<SyncEvent?> GetLastEventForDeviceAsync(DeviceId deviceId, CancellationToken cancellationToken = default);
    Task<int> GetPendingEventsCountAsync(DeviceId deviceId, CancellationToken cancellationToken = default);
    Task<int> GetTotalEventsCountForDeviceAsync(DeviceId deviceId, CancellationToken cancellationToken = default);
}

/// <summary>
/// Repository interface for FaviconBlob operations
/// </summary>
public interface IFaviconBlobRepository
{
    Task<FaviconBlob?> GetByHashAsync(string hash, CancellationToken cancellationToken = default);
    Task<bool> ExistsAsync(string hash, CancellationToken cancellationToken = default);

    /// <summary>
    /// Inserts the blob unless one with this hash already exists (checked again at the database
    /// level, not just via a prior ExistsAsync call, to absorb the race between two devices
    /// independently uploading the same new favicon at nearly the same time). Returns true if a
    /// row with this hash already existed (nothing was inserted), false if this call inserted it.
    /// </summary>
    Task<bool> CreateIfNotExistsAsync(FaviconBlob faviconBlob, CancellationToken cancellationToken = default);
}

/// <summary>
/// Unit of Work pattern for coordinating multiple repository operations
/// </summary>
public interface IUnitOfWork
{
    IDeviceRepository Devices { get; }
    ISyncEventRepository SyncEvents { get; }
    
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
    Task BeginTransactionAsync(CancellationToken cancellationToken = default);
    Task CommitTransactionAsync(CancellationToken cancellationToken = default);
    Task RollbackTransactionAsync(CancellationToken cancellationToken = default);
}
