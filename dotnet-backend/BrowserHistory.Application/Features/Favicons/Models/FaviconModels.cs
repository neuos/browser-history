namespace BrowserHistory.Application.Features.Favicons.Models;

/// <summary>
/// Request to upload a favicon blob for deduplicated storage.
/// </summary>
public sealed record UploadFaviconRequest
{
    /// <summary>Hex-encoded SHA-256 hash of the raw favicon bytes, computed client-side.</summary>
    public required string Hash { get; init; }

    /// <summary>MIME type of the image, e.g. "image/png", "image/x-icon", "image/svg+xml".</summary>
    public required string ContentType { get; init; }

    /// <summary>Base64-encoded raw image bytes.</summary>
    public required string DataBase64 { get; init; }
}

/// <summary>
/// Response to a favicon upload - tells the client whether this exact content was already
/// cached server-side (from any device), so it knows the dedup actually happened.
/// </summary>
public sealed record UploadFaviconResponse
{
    public required string Hash { get; init; }
    public required bool AlreadyExisted { get; init; }
}
