using BrowserHistory.Domain.ValueObjects;

namespace BrowserHistory.Domain.Entities;

/// <summary>
/// A content-addressed favicon image, stored once per unique SHA-256 hash and shared across
/// every Page that references it. Favicons are per-domain, not per-page, so this is the
/// dedication point: visiting many pages on the same site never stores the icon more than once.
/// </summary>
public class FaviconBlob
{
    private FaviconBlob() { } // EF Constructor

    private FaviconBlob(string hash, string contentType, byte[] data)
    {
        Hash = hash;
        ContentType = ValidateContentType(contentType);
        Data = ValidateData(data);
        SizeBytes = data.Length;
        CreatedAt = DateTime.UtcNow;
    }

    // Stored as a plain string (hex-encoded SHA-256), matching how SyncEvent.Checksum is mapped
    // elsewhere in this codebase - the Checksum value object has no EF value converter registered,
    // so it's used here only internally, for hashing/validation, not as the mapped property type.
    public string Hash { get; private set; } = string.Empty;
    public string ContentType { get; private set; } = string.Empty;
    public byte[] Data { get; private set; } = Array.Empty<byte>();
    public long SizeBytes { get; private set; }
    public DateTime CreatedAt { get; private set; }

    /// <summary>
    /// Creates a new favicon blob, verifying the supplied hash actually matches the content -
    /// a client claiming the wrong hash for its bytes would otherwise poison the shared cache
    /// under someone else's identity.
    /// </summary>
    public static FaviconBlob Create(string hash, string contentType, byte[] data)
    {
        var expectedHash = Checksum.FromString(hash);
        var actualHash = Checksum.FromBytes(data);
        if (actualHash != expectedHash)
        {
            throw new ArgumentException(
                $"Supplied hash {expectedHash} does not match the actual content hash {actualHash}.",
                nameof(hash));
        }

        return new FaviconBlob(expectedHash.Value, contentType, data);
    }

    private static string ValidateContentType(string contentType)
    {
        if (string.IsNullOrWhiteSpace(contentType))
            throw new ArgumentException("Content type cannot be null or empty.", nameof(contentType));

        if (contentType.Length > 100)
            throw new ArgumentException("Content type cannot exceed 100 characters.", nameof(contentType));

        return contentType.Trim();
    }

    private static byte[] ValidateData(byte[] data)
    {
        if (data == null || data.Length == 0)
            throw new ArgumentException("Favicon data cannot be null or empty.", nameof(data));

        // A generous ceiling, not a tuned limit - real favicons are a few KB, this just rejects
        // something clearly wrong (or abusive) rather than accepting arbitrarily large blobs.
        const int maxSizeBytes = 5 * 1024 * 1024; // 5 MB
        if (data.Length > maxSizeBytes)
            throw new ArgumentException($"Favicon data cannot exceed {maxSizeBytes} bytes.", nameof(data));

        return data;
    }
}
