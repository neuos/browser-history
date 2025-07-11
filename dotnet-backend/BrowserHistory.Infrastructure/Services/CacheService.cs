using BrowserHistory.Application.Common.Interfaces;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using System.Collections.Concurrent;

namespace BrowserHistory.Infrastructure.Services;

/// <summary>
/// Configuration options for the caching service.
/// </summary>
public class CacheOptions
{
    public const string SectionName = "Caching";

    /// <summary>
    /// Default cache duration for device information.
    /// </summary>
    public TimeSpan DeviceCacheDuration { get; set; } = TimeSpan.FromMinutes(30);

    /// <summary>
    /// Default cache duration for sync events.
    /// </summary>
    public TimeSpan SyncEventsCacheDuration { get; set; } = TimeSpan.FromMinutes(5);

    /// <summary>
    /// Default cache duration for history queries.
    /// </summary>
    public TimeSpan HistoryCacheDuration { get; set; } = TimeSpan.FromMinutes(10);

    /// <summary>
    /// Maximum number of cached items per category.
    /// </summary>
    public int MaxItemsPerCategory { get; set; } = 1000;
}

/// <summary>
/// In-memory cache service implementation with statistics tracking.
/// </summary>
public class CacheService : ICacheService
{
    private readonly IMemoryCache _memoryCache;
    private readonly CacheOptions _options;
    private readonly ILogger<CacheService> _logger;
    private readonly ConcurrentDictionary<string, bool> _cacheKeys;
    private long _hits;
    private long _misses;
    private DateTime _lastAccess;

    public CacheService(
        IMemoryCache memoryCache,
        IOptions<CacheOptions> options,
        ILogger<CacheService> logger)
    {
        _memoryCache = memoryCache;
        _options = options.Value;
        _logger = logger;
        _cacheKeys = new ConcurrentDictionary<string, bool>();
        _lastAccess = DateTime.UtcNow;
    }

    public async Task<T> GetOrSetAsync<T>(string key, Func<Task<T>> factory, TimeSpan? expiration = null, CancellationToken cancellationToken = default)
    {
        if (_memoryCache.TryGetValue(key, out T? cachedValue))
        {
            Interlocked.Increment(ref _hits);
            _lastAccess = DateTime.UtcNow;
            _logger.LogDebug("Cache hit for key: {CacheKey}", key);
            return cachedValue!;
        }

        Interlocked.Increment(ref _misses);
        _lastAccess = DateTime.UtcNow;
        _logger.LogDebug("Cache miss for key: {CacheKey}", key);

        var value = await factory();
        
        var cacheEntryOptions = new MemoryCacheEntryOptions
        {
            AbsoluteExpirationRelativeToNow = expiration ?? TimeSpan.FromMinutes(10),
            Size = 1 // Simple size estimation
        };

        // Add removal callback to track keys
        cacheEntryOptions.PostEvictionCallbacks.Add(new PostEvictionCallbackRegistration
        {
            EvictionCallback = (key, value, reason, state) =>
            {
                _cacheKeys.TryRemove(key.ToString()!, out _);
                _logger.LogDebug("Cache entry evicted for key: {CacheKey}, Reason: {EvictionReason}", key, reason);
            }
        });

        _memoryCache.Set(key, value, cacheEntryOptions);
        _cacheKeys[key] = true;

        _logger.LogDebug("Cache set for key: {CacheKey}, Expiration: {Expiration}", key, expiration);
        return value;
    }

    public T GetOrSet<T>(string key, Func<T> factory, TimeSpan? expiration = null)
    {
        if (_memoryCache.TryGetValue(key, out T? cachedValue))
        {
            Interlocked.Increment(ref _hits);
            _lastAccess = DateTime.UtcNow;
            _logger.LogDebug("Cache hit for key: {CacheKey}", key);
            return cachedValue!;
        }

        Interlocked.Increment(ref _misses);
        _lastAccess = DateTime.UtcNow;
        _logger.LogDebug("Cache miss for key: {CacheKey}", key);

        var value = factory();
        
        var cacheEntryOptions = new MemoryCacheEntryOptions
        {
            AbsoluteExpirationRelativeToNow = expiration ?? TimeSpan.FromMinutes(10),
            Size = 1
        };

        cacheEntryOptions.PostEvictionCallbacks.Add(new PostEvictionCallbackRegistration
        {
            EvictionCallback = (key, value, reason, state) =>
            {
                _cacheKeys.TryRemove(key.ToString()!, out _);
                _logger.LogDebug("Cache entry evicted for key: {CacheKey}, Reason: {EvictionReason}", key, reason);
            }
        });

        _memoryCache.Set(key, value, cacheEntryOptions);
        _cacheKeys[key] = true;

        _logger.LogDebug("Cache set for key: {CacheKey}, Expiration: {Expiration}", key, expiration);
        return value;
    }

    public void Remove(string key)
    {
        _memoryCache.Remove(key);
        _cacheKeys.TryRemove(key, out _);
        _logger.LogDebug("Cache removed for key: {CacheKey}", key);
    }

    public void RemoveByPattern(string pattern)
    {
        var keysToRemove = _cacheKeys.Keys
            .Where(key => key.Contains(pattern, StringComparison.OrdinalIgnoreCase))
            .ToList();

        foreach (var key in keysToRemove)
        {
            Remove(key);
        }

        _logger.LogDebug("Cache removed for pattern: {Pattern}, Keys removed: {KeyCount}", pattern, keysToRemove.Count);
    }

    public void Clear()
    {
        var keyCount = _cacheKeys.Count;
        
        // Create a new memory cache by disposing the current one (if possible)
        // For IMemoryCache, we can only remove individual items
        var keysToRemove = _cacheKeys.Keys.ToList();
        foreach (var key in keysToRemove)
        {
            _memoryCache.Remove(key);
        }
        
        _cacheKeys.Clear();
        _logger.LogInformation("Cache cleared, {KeyCount} items removed", keyCount);
    }

    public CacheStatistics GetStatistics()
    {
        return new CacheStatistics
        {
            TotalItems = _cacheKeys.Count,
            TotalHits = _hits,
            TotalMisses = _misses,
            LastAccess = _lastAccess
        };
    }
}
