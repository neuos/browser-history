using BrowserHistory.Domain.ValueObjects;

namespace BrowserHistory.Domain.Entities;

/// <summary>
/// Represents a browser history entry
/// </summary>
public class HistoryNode
{
    public Guid Id { get; private set; }
    public Url Url { get; private set; }
    public string Title { get; private set; } = string.Empty;
    public DateTime VisitedAt { get; private set; }
    public int VisitCount { get; private set; }
    public DateTime LastVisitedAt { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public DateTime UpdatedAt { get; private set; }
    public bool IsBookmarked { get; private set; }
    public string? FaviconUrl { get; private set; }

    private HistoryNode() { } // For EF Core

    private HistoryNode(Url url, string title, DateTime visitedAt)
    {
        Id = Guid.NewGuid();
        Url = url;
        Title = title;
        VisitedAt = visitedAt;
        VisitCount = 1;
        LastVisitedAt = visitedAt;
        CreatedAt = DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;
        IsBookmarked = false;
    }

    /// <summary>
    /// Creates a new history node
    /// </summary>
    public static HistoryNode Create(Url url, string title, DateTime visitedAt)
    {
        if (string.IsNullOrWhiteSpace(title))
            throw new ArgumentException("Title cannot be null or empty", nameof(title));

        if (title.Length > 500)
            throw new ArgumentException("Title cannot exceed 500 characters", nameof(title));

        if (visitedAt > DateTime.UtcNow)
            throw new ArgumentException("Visit time cannot be in the future", nameof(visitedAt));

        return new HistoryNode(url, title.Trim(), visitedAt);
    }

    /// <summary>
    /// Records a new visit to this URL
    /// </summary>
    public void RecordVisit(DateTime visitedAt)
    {
        if (visitedAt > DateTime.UtcNow)
            throw new ArgumentException("Visit time cannot be in the future", nameof(visitedAt));

        VisitCount++;
        if (visitedAt > LastVisitedAt)
        {
            LastVisitedAt = visitedAt;
        }
        UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>
    /// Updates the title
    /// </summary>
    public void UpdateTitle(string newTitle)
    {
        if (string.IsNullOrWhiteSpace(newTitle))
            throw new ArgumentException("Title cannot be null or empty", nameof(newTitle));

        if (newTitle.Length > 500)
            throw new ArgumentException("Title cannot exceed 500 characters", nameof(newTitle));

        Title = newTitle.Trim();
        UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>
    /// Sets or updates the favicon URL
    /// </summary>
    public void SetFavicon(string? faviconUrl)
    {
        if (!string.IsNullOrWhiteSpace(faviconUrl))
        {
            if (!Uri.TryCreate(faviconUrl, UriKind.Absolute, out var uri) ||
                (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps))
            {
                throw new ArgumentException("Invalid favicon URL format", nameof(faviconUrl));
            }
        }

        FaviconUrl = faviconUrl?.Trim();
        UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>
    /// Marks this entry as bookmarked
    /// </summary>
    public void Bookmark()
    {
        IsBookmarked = true;
        UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>
    /// Removes bookmark status
    /// </summary>
    public void RemoveBookmark()
    {
        IsBookmarked = false;
        UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>
    /// Merges visit data from another history node for the same URL
    /// </summary>
    public void MergeVisits(HistoryNode other)
    {
        if (other.Url.Value != Url.Value)
            throw new ArgumentException("Cannot merge visits from different URLs", nameof(other));

        VisitCount += other.VisitCount;
        
        if (other.LastVisitedAt > LastVisitedAt)
        {
            LastVisitedAt = other.LastVisitedAt;
        }

        if (other.VisitedAt < VisitedAt)
        {
            VisitedAt = other.VisitedAt;
        }

        // Keep the most recent title
        if (other.UpdatedAt > UpdatedAt)
        {
            Title = other.Title;
        }

        // Preserve bookmark status if either is bookmarked
        if (other.IsBookmarked)
        {
            IsBookmarked = true;
        }

        // Keep favicon if we don't have one
        if (string.IsNullOrWhiteSpace(FaviconUrl) && !string.IsNullOrWhiteSpace(other.FaviconUrl))
        {
            FaviconUrl = other.FaviconUrl;
        }

        UpdatedAt = DateTime.UtcNow;
    }
}
