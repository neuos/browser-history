using BrowserHistory.Domain.Entities;
using BrowserHistory.Domain.ValueObjects;

namespace BrowserHistory.Application.Common.Interfaces;

public interface IDeviceRepository
{
    Task<Device?> GetByIdAsync(DeviceId deviceId, CancellationToken cancellationToken = default);
    Task<Device> CreateAsync(Device device, CancellationToken cancellationToken = default);
    Task<Device> UpdateAsync(Device device, CancellationToken cancellationToken = default);
}

public interface ISyncEventRepository
{
    Task AddRangeAsync(IEnumerable<SyncEvent> syncEvents, CancellationToken cancellationToken = default);
    Task<IEnumerable<Guid>> GetExistingEventIdsAsync(IEnumerable<Guid> eventIds, CancellationToken cancellationToken = default);
    Task<(IEnumerable<SyncEvent> Events, int TotalCount)> GetEventsAsync(
        DeviceId? excludeDeviceId = null,
        DateTime? since = null,
        int skip = 0,
        int take = 100,
        CancellationToken cancellationToken = default);
}

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

public interface IUnitOfWork
{
    IDeviceRepository Devices { get; }
    ISyncEventRepository SyncEvents { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
