namespace BrowserHistory.Domain.Enums;

/// <summary>
/// Types of entities that can be synchronized between devices
/// </summary>
public enum SyncEntityType
{
    /// <summary>
    /// Browser history entries
    /// </summary>
    History = 1,
    
    /// <summary>
    /// Page metadata and content
    /// </summary>
    Page = 2
}
