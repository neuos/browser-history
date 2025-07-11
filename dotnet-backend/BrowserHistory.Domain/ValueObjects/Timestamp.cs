namespace BrowserHistory.Domain.ValueObjects;

/// <summary>
/// Represents a UTC timestamp wrapper that ensures all dates are stored and compared in UTC.
/// Provides type safety and consistent timezone handling throughout the domain.
/// </summary>
public sealed record Timestamp : IComparable<Timestamp>
{
    /// <summary>
    /// Gets the UTC DateTime value.
    /// </summary>
    public DateTime Value { get; }

    /// <summary>
    /// Initializes a new instance of the Timestamp class.
    /// </summary>
    /// <param name="value">The DateTime value, which will be converted to UTC if not already.</param>
    private Timestamp(DateTime value)
    {
        Value = value.Kind switch
        {
            DateTimeKind.Utc => value,
            DateTimeKind.Local => value.ToUniversalTime(),
            DateTimeKind.Unspecified => DateTime.SpecifyKind(value, DateTimeKind.Utc),
            _ => throw new ArgumentException("Invalid DateTimeKind.", nameof(value))
        };
    }

    /// <summary>
    /// Creates a timestamp from a DateTime value.
    /// </summary>
    /// <param name="value">The DateTime value to wrap.</param>
    /// <returns>A new Timestamp instance with the value converted to UTC.</returns>
    public static Timestamp FromDateTime(DateTime value)
    {
        return new Timestamp(value);
    }

    /// <summary>
    /// Creates a timestamp representing the current UTC time.
    /// </summary>
    /// <returns>A new Timestamp instance with the current UTC time.</returns>
    public static Timestamp Now() => new(DateTime.UtcNow);

    /// <summary>
    /// Creates a timestamp from a DateTimeOffset value.
    /// </summary>
    /// <param name="value">The DateTimeOffset value to convert.</param>
    /// <returns>A new Timestamp instance with the UTC equivalent of the DateTimeOffset.</returns>
    public static Timestamp FromDateTimeOffset(DateTimeOffset value)
    {
        return new Timestamp(value.UtcDateTime);
    }

    /// <summary>
    /// Creates a timestamp from a Unix timestamp (seconds since epoch).
    /// </summary>
    /// <param name="unixTimestamp">The Unix timestamp in seconds.</param>
    /// <returns>A new Timestamp instance representing the Unix timestamp.</returns>
    public static Timestamp FromUnixTimestamp(long unixTimestamp)
    {
        var dateTime = DateTimeOffset.FromUnixTimeSeconds(unixTimestamp).UtcDateTime;
        return new Timestamp(dateTime);
    }

    /// <summary>
    /// Creates a timestamp from a Unix timestamp in milliseconds.
    /// </summary>
    /// <param name="unixTimestampMs">The Unix timestamp in milliseconds.</param>
    /// <returns>A new Timestamp instance representing the Unix timestamp.</returns>
    public static Timestamp FromUnixTimestampMs(long unixTimestampMs)
    {
        var dateTime = DateTimeOffset.FromUnixTimeMilliseconds(unixTimestampMs).UtcDateTime;
        return new Timestamp(dateTime);
    }

    /// <summary>
    /// Creates a timestamp from an ISO 8601 string.
    /// </summary>
    /// <param name="iso8601String">The ISO 8601 formatted string.</param>
    /// <returns>A new Timestamp instance representing the parsed date.</returns>
    /// <exception cref="ArgumentException">Thrown when the string is not a valid ISO 8601 format.</exception>
    public static Timestamp FromIso8601String(string iso8601String)
    {
        if (string.IsNullOrWhiteSpace(iso8601String))
            throw new ArgumentException("ISO 8601 string cannot be null or empty.", nameof(iso8601String));

        if (!DateTimeOffset.TryParse(iso8601String, out var dateTimeOffset))
            throw new ArgumentException("Invalid ISO 8601 format.", nameof(iso8601String));

        return FromDateTimeOffset(dateTimeOffset);
    }

    /// <summary>
    /// Adds the specified TimeSpan to this timestamp.
    /// </summary>
    /// <param name="timeSpan">The TimeSpan to add.</param>
    /// <returns>A new Timestamp instance with the added time.</returns>
    public Timestamp Add(TimeSpan timeSpan)
    {
        return new Timestamp(Value.Add(timeSpan));
    }

    /// <summary>
    /// Subtracts the specified TimeSpan from this timestamp.
    /// </summary>
    /// <param name="timeSpan">The TimeSpan to subtract.</param>
    /// <returns>A new Timestamp instance with the subtracted time.</returns>
    public Timestamp Subtract(TimeSpan timeSpan)
    {
        return new Timestamp(Value.Subtract(timeSpan));
    }

    /// <summary>
    /// Gets the difference between this timestamp and another timestamp.
    /// </summary>
    /// <param name="other">The other timestamp to compare with.</param>
    /// <returns>A TimeSpan representing the difference.</returns>
    public TimeSpan Subtract(Timestamp other)
    {
        return Value.Subtract(other.Value);
    }

    /// <summary>
    /// Determines whether this timestamp is before the specified timestamp.
    /// </summary>
    /// <param name="other">The timestamp to compare with.</param>
    /// <returns>True if this timestamp is before the other; otherwise, false.</returns>
    public bool IsBefore(Timestamp other) => Value < other.Value;

    /// <summary>
    /// Determines whether this timestamp is after the specified timestamp.
    /// </summary>
    /// <param name="other">The timestamp to compare with.</param>
    /// <returns>True if this timestamp is after the other; otherwise, false.</returns>
    public bool IsAfter(Timestamp other) => Value > other.Value;

    /// <summary>
    /// Converts the timestamp to Unix time (seconds since epoch).
    /// </summary>
    /// <returns>The Unix timestamp in seconds.</returns>
    public long ToUnixTimestamp()
    {
        return new DateTimeOffset(Value).ToUnixTimeSeconds();
    }

    /// <summary>
    /// Converts the timestamp to Unix time in milliseconds.
    /// </summary>
    /// <returns>The Unix timestamp in milliseconds.</returns>
    public long ToUnixTimestampMs()
    {
        return new DateTimeOffset(Value).ToUnixTimeMilliseconds();
    }

    /// <summary>
    /// Converts the timestamp to an ISO 8601 formatted string.
    /// </summary>
    /// <returns>The ISO 8601 formatted string representation.</returns>
    public string ToIso8601String()
    {
        return Value.ToString("yyyy-MM-ddTHH:mm:ss.fffZ");
    }

    /// <summary>
    /// Compares this timestamp with another timestamp.
    /// </summary>
    /// <param name="other">The timestamp to compare with.</param>
    /// <returns>A value indicating the relative order of the timestamps.</returns>
    public int CompareTo(Timestamp? other)
    {
        if (other is null) return 1;
        return Value.CompareTo(other.Value);
    }

    /// <summary>
    /// Returns the string representation of the timestamp in ISO 8601 format.
    /// </summary>
    /// <returns>The ISO 8601 formatted string.</returns>
    public override string ToString() => ToIso8601String();

    /// <summary>
    /// Implicit conversion from Timestamp to DateTime.
    /// </summary>
    /// <param name="timestamp">The timestamp to convert.</param>
    /// <returns>The UTC DateTime value.</returns>
    public static implicit operator DateTime(Timestamp timestamp) => timestamp.Value;

    /// <summary>
    /// Implicit conversion from DateTime to Timestamp.
    /// </summary>
    /// <param name="dateTime">The DateTime to convert.</param>
    /// <returns>A new Timestamp instance.</returns>
    public static implicit operator Timestamp(DateTime dateTime) => FromDateTime(dateTime);

    /// <summary>
    /// Addition operator for Timestamp and TimeSpan.
    /// </summary>
    /// <param name="timestamp">The timestamp.</param>
    /// <param name="timeSpan">The time span to add.</param>
    /// <returns>A new Timestamp with the added time.</returns>
    public static Timestamp operator +(Timestamp timestamp, TimeSpan timeSpan)
        => timestamp.Add(timeSpan);

    /// <summary>
    /// Subtraction operator for Timestamp and TimeSpan.
    /// </summary>
    /// <param name="timestamp">The timestamp.</param>
    /// <param name="timeSpan">The time span to subtract.</param>
    /// <returns>A new Timestamp with the subtracted time.</returns>
    public static Timestamp operator -(Timestamp timestamp, TimeSpan timeSpan)
        => timestamp.Subtract(timeSpan);

    /// <summary>
    /// Subtraction operator for two Timestamps.
    /// </summary>
    /// <param name="left">The first timestamp.</param>
    /// <param name="right">The second timestamp.</param>
    /// <returns>The TimeSpan difference between the timestamps.</returns>
    public static TimeSpan operator -(Timestamp left, Timestamp right)
        => left.Subtract(right);

    /// <summary>
    /// Less than operator for Timestamps.
    /// </summary>
    /// <param name="left">The first timestamp.</param>
    /// <param name="right">The second timestamp.</param>
    /// <returns>True if the first timestamp is before the second; otherwise, false.</returns>
    public static bool operator <(Timestamp left, Timestamp right)
        => left.CompareTo(right) < 0;

    /// <summary>
    /// Greater than operator for Timestamps.
    /// </summary>
    /// <param name="left">The first timestamp.</param>
    /// <param name="right">The second timestamp.</param>
    /// <returns>True if the first timestamp is after the second; otherwise, false.</returns>
    public static bool operator >(Timestamp left, Timestamp right)
        => left.CompareTo(right) > 0;

    /// <summary>
    /// Less than or equal operator for Timestamps.
    /// </summary>
    /// <param name="left">The first timestamp.</param>
    /// <param name="right">The second timestamp.</param>
    /// <returns>True if the first timestamp is before or equal to the second; otherwise, false.</returns>
    public static bool operator <=(Timestamp left, Timestamp right)
        => left.CompareTo(right) <= 0;

    /// <summary>
    /// Greater than or equal operator for Timestamps.
    /// </summary>
    /// <param name="left">The first timestamp.</param>
    /// <param name="right">The second timestamp.</param>
    /// <returns>True if the first timestamp is after or equal to the second; otherwise, false.</returns>
    public static bool operator >=(Timestamp left, Timestamp right)
        => left.CompareTo(right) >= 0;
}
