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
    Page = 2,

    /// <summary>
    /// Per-device display metadata (name, emoji) broadcast so other devices can show it -
    /// opaque to the server like every other entity type, just relayed through the event log.
    /// </summary>
    Device = 3
}
