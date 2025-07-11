using BrowserHistory.Domain.ValueObjects;

namespace BrowserHistory.Domain.Entities;

/// <summary>
/// Represents page metadata and content for browser pages
/// </summary>
public class Page
{
    public Guid Id { get; private set; }
    public Url Url { get; private set; }
    public string Title { get; private set; } = string.Empty;
    public string? Description { get; private set; }
    public string? Content { get; private set; }
    public string? FaviconUrl { get; private set; }
    public string? Language { get; private set; }
    public string? Keywords { get; private set; }
    public DateTime LastIndexedAt { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public DateTime UpdatedAt { get; private set; }
    public long ContentLength { get; private set; }
    public string? ContentType { get; private set; }
    public int? StatusCode { get; private set; }

    private Page() { } // For EF Core

    private Page(Url url, string title)
    {
        Id = Guid.NewGuid();
        Url = url;
        Title = title;
        LastIndexedAt = DateTime.UtcNow;
        CreatedAt = DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;
        ContentLength = 0;
    }

    /// <summary>
    /// Creates a new page entry
    /// </summary>
    public static Page Create(Url url, string title)
    {
        if (string.IsNullOrWhiteSpace(title))
            throw new ArgumentException("Title cannot be null or empty", nameof(title));

        if (title.Length > 1000)
            throw new ArgumentException("Title cannot exceed 1000 characters", nameof(title));

        return new Page(url, title.Trim());
    }

    /// <summary>
    /// Updates the page title
    /// </summary>
    public void UpdateTitle(string newTitle)
    {
        if (string.IsNullOrWhiteSpace(newTitle))
            throw new ArgumentException("Title cannot be null or empty", nameof(newTitle));

        if (newTitle.Length > 1000)
            throw new ArgumentException("Title cannot exceed 1000 characters", nameof(newTitle));

        Title = newTitle.Trim();
        UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>
    /// Updates the page description (meta description)
    /// </summary>
    public void UpdateDescription(string? description)
    {
        if (!string.IsNullOrWhiteSpace(description) && description.Length > 2000)
            throw new ArgumentException("Description cannot exceed 2000 characters", nameof(description));

        Description = description?.Trim();
        UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>
    /// Updates the page content
    /// </summary>
    public void UpdateContent(string? content, string? contentType = null)
    {
        Content = content;
        ContentType = contentType?.Trim();
        ContentLength = content?.Length ?? 0;
        LastIndexedAt = DateTime.UtcNow;
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
    /// Sets the page language
    /// </summary>
    public void SetLanguage(string? language)
    {
        if (!string.IsNullOrWhiteSpace(language) && language.Length > 10)
            throw new ArgumentException("Language code cannot exceed 10 characters", nameof(language));

        Language = language?.Trim().ToLowerInvariant();
        UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>
    /// Sets page keywords
    /// </summary>
    public void SetKeywords(string? keywords)
    {
        if (!string.IsNullOrWhiteSpace(keywords) && keywords.Length > 2000)
            throw new ArgumentException("Keywords cannot exceed 2000 characters", nameof(keywords));

        Keywords = keywords?.Trim();
        UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>
    /// Sets HTTP status information
    /// </summary>
    public void SetHttpStatus(int statusCode)
    {
        if (statusCode < 100 || statusCode > 599)
            throw new ArgumentException("Status code must be between 100 and 599", nameof(statusCode));

        StatusCode = statusCode;
        UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>
    /// Updates the last indexed timestamp
    /// </summary>
    public void MarkAsIndexed()
    {
        LastIndexedAt = DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>
    /// Checks if the page content is stale and needs re-indexing
    /// </summary>
    public bool IsContentStale(TimeSpan maxAge)
    {
        return DateTime.UtcNow - LastIndexedAt > maxAge;
    }

    /// <summary>
    /// Gets a summary of the page for display purposes
    /// </summary>
    public string GetSummary(int maxLength = 200)
    {
        if (string.IsNullOrWhiteSpace(Description))
            return Title;

        if (Description.Length <= maxLength)
            return Description;

        return Description.Substring(0, maxLength - 3) + "...";
    }
}
