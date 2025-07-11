namespace BrowserHistory.Application.Common.Interfaces;

/// <summary>
/// Interface for application-level caching operations.
/// </summary>
public interface ICacheService
{
    /// <summary>
    /// Gets a cached value or computes and caches it if not present.
    /// </summary>
    Task<T> GetOrSetAsync<T>(string key, Func<Task<T>> factory, TimeSpan? expiration = null, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets a cached value or computes and caches it if not present (synchronous version).
    /// </summary>
    T GetOrSet<T>(string key, Func<T> factory, TimeSpan? expiration = null);

    /// <summary>
    /// Removes a specific item from the cache.
    /// </summary>
    void Remove(string key);

    /// <summary>
    /// Removes all items with keys that match the pattern.
    /// </summary>
    void RemoveByPattern(string pattern);

    /// <summary>
    /// Clears all cached items.
    /// </summary>
    void Clear();

    /// <summary>
    /// Gets cache statistics for monitoring.
    /// </summary>
    CacheStatistics GetStatistics();
}

/// <summary>
/// Cache statistics for monitoring and diagnostics.
/// </summary>
public class CacheStatistics
{
    public int TotalItems { get; set; }
    public long TotalHits { get; set; }
    public long TotalMisses { get; set; }
    public double HitRatio => TotalHits + TotalMisses > 0 ? (double)TotalHits / (TotalHits + TotalMisses) : 0;
    public DateTime LastAccess { get; set; }
}
