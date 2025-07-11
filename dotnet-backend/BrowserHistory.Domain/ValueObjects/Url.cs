namespace BrowserHistory.Domain.ValueObjects;

/// <summary>
/// URL value object with validation and normalization
/// </summary>
public readonly record struct Url
{
    private readonly string _value;

    private Url(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
            throw new ArgumentException("URL cannot be null or empty", nameof(value));

        if (!IsValidUrl(value))
            throw new ArgumentException("Invalid URL format", nameof(value));

        _value = NormalizeUrl(value);
    }

    /// <summary>
    /// Creates a URL from a string
    /// </summary>
    public static Url From(string value) => new(value);

    /// <summary>
    /// Creates a URL from a string (alias for From)
    /// </summary>
    public static Url Create(string value) => new(value);

    /// <summary>
    /// Creates a URL from a Uri
    /// </summary>
    public static Url From(Uri uri) => new(uri?.ToString() ?? throw new ArgumentNullException(nameof(uri)));

    public string Value => _value;

    public Uri ToUri() => new(_value);

    public override string ToString() => _value;

    private static bool IsValidUrl(string url)
    {
        return Uri.TryCreate(url, UriKind.Absolute, out var uri) &&
               (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps);
    }

    private static string NormalizeUrl(string url)
    {
        var uri = new Uri(url);
        
        // Remove fragment (hash) for consistency
        var builder = new UriBuilder(uri)
        {
            Fragment = string.Empty,
            Scheme = uri.Scheme.ToLowerInvariant(),
            Host = uri.Host.ToLowerInvariant(),
            Port = uri.IsDefaultPort ? -1 : uri.Port
        };

        // Keep trailing slash for root paths, remove for others
        var normalized = builder.Uri.ToString();
        if (normalized.EndsWith('/') && uri.AbsolutePath != "/")
        {
            normalized = normalized.TrimEnd('/');
        }
        
        return normalized;
    }

    public static implicit operator string(Url url) => url._value;
    public static explicit operator Url(string value) => From(value);
    public static explicit operator Url(Uri uri) => From(uri);
}
