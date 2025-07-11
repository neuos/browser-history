using BrowserHistory.Domain.Entities;
using BrowserHistory.Domain.ValueObjects;

namespace BrowserHistory.Domain.Repositories;

/// <summary>
/// Repository interface for Page entities
/// </summary>
public interface IPageRepository
{
    /// <summary>
    /// Gets a page by its ID
    /// </summary>
    Task<Page?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets a page by its URL
    /// </summary>
    Task<Page?> GetByUrlAsync(Url url, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets pages that match the search criteria
    /// </summary>
    Task<IEnumerable<Page>> SearchAsync(
        string? searchTerm = null,
        string? language = null,
        DateTime? indexedAfter = null,
        int skip = 0,
        int take = 50,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets pages that need re-indexing
    /// </summary>
    Task<IEnumerable<Page>> GetStalePages(
        TimeSpan maxAge,
        int batchSize = 100,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Adds a new page
    /// </summary>
    Task<Page> AddAsync(Page page, CancellationToken cancellationToken = default);

    /// <summary>
    /// Updates an existing page
    /// </summary>
    Task<Page> UpdateAsync(Page page, CancellationToken cancellationToken = default);

    /// <summary>
    /// Deletes a page
    /// </summary>
    Task DeleteAsync(Guid id, CancellationToken cancellationToken = default);

    /// <summary>
    /// Checks if a page exists for the given URL
    /// </summary>
    Task<bool> ExistsAsync(Url url, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets the total count of pages
    /// </summary>
    Task<int> GetCountAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets pages with content larger than the specified size
    /// </summary>
    Task<IEnumerable<Page>> GetLargePagesAsync(
        long minContentLength,
        int batchSize = 100,
        CancellationToken cancellationToken = default);
}
