using System.Security.Cryptography;
using System.Text;

namespace BrowserHistory.Domain.ValueObjects;

/// <summary>
/// Represents a content checksum for data integrity validation.
/// Provides SHA-256 hashing for content verification and comparison.
/// </summary>
public sealed record Checksum
{
    private const int ChecksumLength = 64; // SHA-256 hex string length
    
    /// <summary>
    /// Gets the hex-encoded checksum value.
    /// </summary>
    public string Value { get; }

    /// <summary>
    /// Initializes a new instance of the Checksum class.
    /// </summary>
    /// <param name="value">The hex-encoded checksum value.</param>
    /// <exception cref="ArgumentException">Thrown when the checksum format is invalid.</exception>
    private Checksum(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
            throw new ArgumentException("Checksum cannot be null or empty.", nameof(value));

        if (value.Length != ChecksumLength)
            throw new ArgumentException($"Checksum must be exactly {ChecksumLength} characters long.", nameof(value));

        if (!IsValidHex(value))
            throw new ArgumentException("Checksum must contain only hexadecimal characters.", nameof(value));

        Value = value.ToLowerInvariant();
    }

    /// <summary>
    /// Creates a checksum from a hex-encoded string.
    /// </summary>
    /// <param name="value">The hex-encoded checksum value.</param>
    /// <returns>A new Checksum instance.</returns>
    /// <exception cref="ArgumentException">Thrown when the checksum format is invalid.</exception>
    public static Checksum FromString(string value)
    {
        return new Checksum(value);
    }

    /// <summary>
    /// Computes a checksum from the given content.
    /// </summary>
    /// <param name="content">The content to compute the checksum for.</param>
    /// <returns>A new Checksum instance representing the SHA-256 hash of the content.</returns>
    /// <exception cref="ArgumentNullException">Thrown when content is null.</exception>
    public static Checksum FromContent(string content)
    {
        if (content == null)
            throw new ArgumentNullException(nameof(content));

        var bytes = Encoding.UTF8.GetBytes(content);
        return FromBytes(bytes);
    }

    /// <summary>
    /// Computes a checksum from the given byte array.
    /// </summary>
    /// <param name="bytes">The bytes to compute the checksum for.</param>
    /// <returns>A new Checksum instance representing the SHA-256 hash of the bytes.</returns>
    /// <exception cref="ArgumentNullException">Thrown when bytes is null.</exception>
    public static Checksum FromBytes(byte[] bytes)
    {
        if (bytes == null)
            throw new ArgumentNullException(nameof(bytes));

        using var sha256 = SHA256.Create();
        var hash = sha256.ComputeHash(bytes);
        var hex = Convert.ToHexString(hash).ToLowerInvariant();
        
        return new Checksum(hex);
    }

    /// <summary>
    /// Verifies that the given content matches this checksum.
    /// </summary>
    /// <param name="content">The content to verify.</param>
    /// <returns>True if the content matches this checksum; otherwise, false.</returns>
    /// <exception cref="ArgumentNullException">Thrown when content is null.</exception>
    public bool VerifyContent(string content)
    {
        if (content == null)
            throw new ArgumentNullException(nameof(content));

        var contentChecksum = FromContent(content);
        return this == contentChecksum;
    }

    /// <summary>
    /// Verifies that the given bytes match this checksum.
    /// </summary>
    /// <param name="bytes">The bytes to verify.</param>
    /// <returns>True if the bytes match this checksum; otherwise, false.</returns>
    /// <exception cref="ArgumentNullException">Thrown when bytes is null.</exception>
    public bool VerifyBytes(byte[] bytes)
    {
        if (bytes == null)
            throw new ArgumentNullException(nameof(bytes));

        var bytesChecksum = FromBytes(bytes);
        return this == bytesChecksum;
    }

    /// <summary>
    /// Determines whether the specified string is a valid hexadecimal string.
    /// </summary>
    /// <param name="value">The string to validate.</param>
    /// <returns>True if the string contains only hexadecimal characters; otherwise, false.</returns>
    private static bool IsValidHex(string value)
    {
        return value.All(c => (c >= '0' && c <= '9') || 
                              (c >= 'a' && c <= 'f') || 
                              (c >= 'A' && c <= 'F'));
    }

    /// <summary>
    /// Returns the checksum value as a string.
    /// </summary>
    /// <returns>The hex-encoded checksum value.</returns>
    public override string ToString() => Value;

    /// <summary>
    /// Implicit conversion from Checksum to string.
    /// </summary>
    /// <param name="checksum">The checksum to convert.</param>
    /// <returns>The checksum value as a string.</returns>
    public static implicit operator string(Checksum checksum) => checksum.Value;
}
