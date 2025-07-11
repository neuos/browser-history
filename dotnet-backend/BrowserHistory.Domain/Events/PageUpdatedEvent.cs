using BrowserHistory.Domain.ValueObjects;

namespace BrowserHistory.Domain.Events;

/// <summary>
/// Domain event raised when a page is updated
/// </summary>
/// <param name="PageId">The ID of the page that was updated</param>
/// <param name="Url">The URL of the page</param>
/// <param name="Title">The updated title</param>
/// <param name="UpdatedAt">When the page was updated</param>
/// <param name="UpdateType">The type of update performed</param>
public record PageUpdatedEvent(
    Guid PageId,
    Url Url,
    string Title,
    DateTime UpdatedAt,
    PageUpdateType UpdateType) : IDomainEvent;

/// <summary>
/// Types of page updates
/// </summary>
public enum PageUpdateType
{
    TitleChanged,
    ContentChanged,
    MetadataChanged,
    FaviconChanged,
    LanguageChanged,
    StatusChanged
}
