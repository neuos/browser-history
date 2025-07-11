using BrowserHistory.Domain.ValueObjects;
using FluentAssertions;

namespace BrowserHistory.Domain.Tests.ValueObjects;

public class TimestampTests
{
    [Fact]
    public void FromDateTime_WithUtcDateTime_ShouldPreserveUtcTime()
    {
        // Arrange
        var utcDateTime = new DateTime(2024, 1, 15, 10, 30, 45, DateTimeKind.Utc);

        // Act
        var timestamp = Timestamp.FromDateTime(utcDateTime);

        // Assert
        timestamp.Value.Should().Be(utcDateTime);
        timestamp.Value.Kind.Should().Be(DateTimeKind.Utc);
    }

    [Fact]
    public void FromDateTime_WithLocalDateTime_ShouldConvertToUtc()
    {
        // Arrange
        var localDateTime = new DateTime(2024, 1, 15, 10, 30, 45, DateTimeKind.Local);
        var expectedUtc = localDateTime.ToUniversalTime();

        // Act
        var timestamp = Timestamp.FromDateTime(localDateTime);

        // Assert
        timestamp.Value.Should().Be(expectedUtc);
        timestamp.Value.Kind.Should().Be(DateTimeKind.Utc);
    }

    [Fact]
    public void FromDateTime_WithUnspecifiedDateTime_ShouldTreatAsUtc()
    {
        // Arrange
        var unspecifiedDateTime = new DateTime(2024, 1, 15, 10, 30, 45, DateTimeKind.Unspecified);

        // Act
        var timestamp = Timestamp.FromDateTime(unspecifiedDateTime);

        // Assert
        timestamp.Value.Should().Be(unspecifiedDateTime);
        timestamp.Value.Kind.Should().Be(DateTimeKind.Utc);
    }

    [Fact]
    public void Now_ShouldReturnCurrentUtcTime()
    {
        // Arrange
        var before = DateTime.UtcNow;

        // Act
        var timestamp = Timestamp.Now();

        // Assert
        var after = DateTime.UtcNow;
        timestamp.Value.Should().BeOnOrAfter(before).And.BeOnOrBefore(after);
        timestamp.Value.Kind.Should().Be(DateTimeKind.Utc);
    }

    [Fact]
    public void FromDateTimeOffset_ShouldConvertToUtc()
    {
        // Arrange
        var offset = new DateTimeOffset(2024, 1, 15, 10, 30, 45, TimeSpan.FromHours(-5));
        var expectedUtc = offset.UtcDateTime;

        // Act
        var timestamp = Timestamp.FromDateTimeOffset(offset);

        // Assert
        timestamp.Value.Should().Be(expectedUtc);
        timestamp.Value.Kind.Should().Be(DateTimeKind.Utc);
    }

    [Fact]
    public void FromUnixTimestamp_ShouldConvertCorrectly()
    {
        // Arrange
        const long unixTimestamp = 1705315845; // 2024-01-15 10:50:45 UTC
        var expectedDateTime = new DateTime(2024, 1, 15, 10, 50, 45, DateTimeKind.Utc);

        // Act
        var timestamp = Timestamp.FromUnixTimestamp(unixTimestamp);

        // Assert
        timestamp.Value.Should().Be(expectedDateTime);
    }

    [Fact]
    public void FromUnixTimestampMs_ShouldConvertCorrectly()
    {
        // Arrange
        const long unixTimestampMs = 1705315845123; // 2024-01-15 10:50:45.123 UTC
        var expectedDateTime = new DateTime(2024, 1, 15, 10, 50, 45, 123, DateTimeKind.Utc);

        // Act
        var timestamp = Timestamp.FromUnixTimestampMs(unixTimestampMs);

        // Assert
        timestamp.Value.Should().Be(expectedDateTime);
    }

    [Fact]
    public void FromIso8601String_WithValidString_ShouldParseCorrectly()
    {
        // Arrange
        const string iso8601 = "2024-01-15T10:30:45.123Z";
        var expectedDateTime = new DateTime(2024, 1, 15, 10, 30, 45, 123, DateTimeKind.Utc);

        // Act
        var timestamp = Timestamp.FromIso8601String(iso8601);

        // Assert
        timestamp.Value.Should().Be(expectedDateTime);
    }

    [Fact]
    public void FromIso8601String_WithOffset_ShouldConvertToUtc()
    {
        // Arrange
        const string iso8601 = "2024-01-15T15:30:45.123+05:00";
        var expectedDateTime = new DateTime(2024, 1, 15, 10, 30, 45, 123, DateTimeKind.Utc);

        // Act
        var timestamp = Timestamp.FromIso8601String(iso8601);

        // Assert
        timestamp.Value.Should().Be(expectedDateTime);
    }

    [Theory]
    [InlineData("")]
    [InlineData(" ")]
    [InlineData("invalid-date")]
    [InlineData("2024-13-15T10:30:45Z")]
    public void FromIso8601String_WithInvalidString_ShouldThrowArgumentException(string invalidString)
    {
        // Act & Assert
        var act = () => Timestamp.FromIso8601String(invalidString);
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void FromIso8601String_WithNullString_ShouldThrowArgumentException()
    {
        // Act & Assert
        var act = () => Timestamp.FromIso8601String(null!);
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Add_ShouldReturnNewTimestampWithAddedTime()
    {
        // Arrange
        var timestamp = Timestamp.FromDateTime(new DateTime(2024, 1, 15, 10, 30, 45, DateTimeKind.Utc));
        var timeSpan = TimeSpan.FromHours(2);
        var expectedDateTime = new DateTime(2024, 1, 15, 12, 30, 45, DateTimeKind.Utc);

        // Act
        var result = timestamp.Add(timeSpan);

        // Assert
        result.Value.Should().Be(expectedDateTime);
    }

    [Fact]
    public void Subtract_WithTimeSpan_ShouldReturnNewTimestampWithSubtractedTime()
    {
        // Arrange
        var timestamp = Timestamp.FromDateTime(new DateTime(2024, 1, 15, 10, 30, 45, DateTimeKind.Utc));
        var timeSpan = TimeSpan.FromHours(2);
        var expectedDateTime = new DateTime(2024, 1, 15, 8, 30, 45, DateTimeKind.Utc);

        // Act
        var result = timestamp.Subtract(timeSpan);

        // Assert
        result.Value.Should().Be(expectedDateTime);
    }

    [Fact]
    public void Subtract_WithTimestamp_ShouldReturnTimeSpanDifference()
    {
        // Arrange
        var timestamp1 = Timestamp.FromDateTime(new DateTime(2024, 1, 15, 12, 30, 45, DateTimeKind.Utc));
        var timestamp2 = Timestamp.FromDateTime(new DateTime(2024, 1, 15, 10, 30, 45, DateTimeKind.Utc));
        var expectedDifference = TimeSpan.FromHours(2);

        // Act
        var result = timestamp1.Subtract(timestamp2);

        // Assert
        result.Should().Be(expectedDifference);
    }

    [Fact]
    public void IsBefore_WithEarlierTimestamp_ShouldReturnTrue()
    {
        // Arrange
        var earlier = Timestamp.FromDateTime(new DateTime(2024, 1, 15, 10, 30, 45, DateTimeKind.Utc));
        var later = Timestamp.FromDateTime(new DateTime(2024, 1, 15, 11, 30, 45, DateTimeKind.Utc));

        // Act & Assert
        earlier.IsBefore(later).Should().BeTrue();
        later.IsBefore(earlier).Should().BeFalse();
    }

    [Fact]
    public void IsAfter_WithLaterTimestamp_ShouldReturnTrue()
    {
        // Arrange
        var earlier = Timestamp.FromDateTime(new DateTime(2024, 1, 15, 10, 30, 45, DateTimeKind.Utc));
        var later = Timestamp.FromDateTime(new DateTime(2024, 1, 15, 11, 30, 45, DateTimeKind.Utc));

        // Act & Assert
        later.IsAfter(earlier).Should().BeTrue();
        earlier.IsAfter(later).Should().BeFalse();
    }

    [Fact]
    public void ToUnixTimestamp_ShouldConvertCorrectly()
    {
        // Arrange
        var timestamp = Timestamp.FromDateTime(new DateTime(2024, 1, 15, 10, 30, 45, DateTimeKind.Utc));
        const long expectedUnixTimestamp = 1705314645;

        // Act
        var result = timestamp.ToUnixTimestamp();

        // Assert
        result.Should().Be(expectedUnixTimestamp);
    }

    [Fact]
    public void ToUnixTimestampMs_ShouldConvertCorrectly()
    {
        // Arrange
        var timestamp = Timestamp.FromDateTime(new DateTime(2024, 1, 15, 10, 30, 45, 123, DateTimeKind.Utc));
        const long expectedUnixTimestampMs = 1705314645123;

        // Act
        var result = timestamp.ToUnixTimestampMs();

        // Assert
        result.Should().Be(expectedUnixTimestampMs);
    }

    [Fact]
    public void ToIso8601String_ShouldFormatCorrectly()
    {
        // Arrange
        var timestamp = Timestamp.FromDateTime(new DateTime(2024, 1, 15, 10, 30, 45, 123, DateTimeKind.Utc));
        const string expectedIso8601 = "2024-01-15T10:30:45.123Z";

        // Act
        var result = timestamp.ToIso8601String();

        // Assert
        result.Should().Be(expectedIso8601);
    }

    [Fact]
    public void ToString_ShouldReturnIso8601Format()
    {
        // Arrange
        var timestamp = Timestamp.FromDateTime(new DateTime(2024, 1, 15, 10, 30, 45, 123, DateTimeKind.Utc));
        const string expectedIso8601 = "2024-01-15T10:30:45.123Z";

        // Act
        var result = timestamp.ToString();

        // Assert
        result.Should().Be(expectedIso8601);
    }

    [Fact]
    public void CompareTo_WithDifferentTimestamps_ShouldReturnCorrectComparison()
    {
        // Arrange
        var earlier = Timestamp.FromDateTime(new DateTime(2024, 1, 15, 10, 30, 45, DateTimeKind.Utc));
        var later = Timestamp.FromDateTime(new DateTime(2024, 1, 15, 11, 30, 45, DateTimeKind.Utc));

        // Act & Assert
        earlier.CompareTo(later).Should().BeLessThan(0);
        later.CompareTo(earlier).Should().BeGreaterThan(0);
        earlier.CompareTo(earlier).Should().Be(0);
    }

    [Fact]
    public void CompareTo_WithNull_ShouldReturnPositive()
    {
        // Arrange
        var timestamp = Timestamp.Now();

        // Act & Assert
        timestamp.CompareTo(null).Should().BeGreaterThan(0);
    }

    [Fact]
    public void ImplicitConversion_ToDateTime_ShouldReturnValue()
    {
        // Arrange
        var dateTime = new DateTime(2024, 1, 15, 10, 30, 45, DateTimeKind.Utc);
        var timestamp = Timestamp.FromDateTime(dateTime);

        // Act
        DateTime result = timestamp;

        // Assert
        result.Should().Be(dateTime);
    }

    [Fact]
    public void ImplicitConversion_FromDateTime_ShouldCreateTimestamp()
    {
        // Arrange
        var dateTime = new DateTime(2024, 1, 15, 10, 30, 45, DateTimeKind.Utc);

        // Act
        Timestamp timestamp = dateTime;

        // Assert
        timestamp.Value.Should().Be(dateTime);
    }

    [Fact]
    public void AdditionOperator_ShouldAddTimeSpan()
    {
        // Arrange
        var timestamp = Timestamp.FromDateTime(new DateTime(2024, 1, 15, 10, 30, 45, DateTimeKind.Utc));
        var timeSpan = TimeSpan.FromHours(2);
        var expectedDateTime = new DateTime(2024, 1, 15, 12, 30, 45, DateTimeKind.Utc);

        // Act
        var result = timestamp + timeSpan;

        // Assert
        result.Value.Should().Be(expectedDateTime);
    }

    [Fact]
    public void SubtractionOperator_WithTimeSpan_ShouldSubtractTimeSpan()
    {
        // Arrange
        var timestamp = Timestamp.FromDateTime(new DateTime(2024, 1, 15, 10, 30, 45, DateTimeKind.Utc));
        var timeSpan = TimeSpan.FromHours(2);
        var expectedDateTime = new DateTime(2024, 1, 15, 8, 30, 45, DateTimeKind.Utc);

        // Act
        var result = timestamp - timeSpan;

        // Assert
        result.Value.Should().Be(expectedDateTime);
    }

    [Fact]
    public void SubtractionOperator_WithTimestamp_ShouldReturnTimeSpanDifference()
    {
        // Arrange
        var timestamp1 = Timestamp.FromDateTime(new DateTime(2024, 1, 15, 12, 30, 45, DateTimeKind.Utc));
        var timestamp2 = Timestamp.FromDateTime(new DateTime(2024, 1, 15, 10, 30, 45, DateTimeKind.Utc));
        var expectedDifference = TimeSpan.FromHours(2);

        // Act
        var result = timestamp1 - timestamp2;

        // Assert
        result.Should().Be(expectedDifference);
    }

    [Fact]
    public void ComparisonOperators_ShouldWorkCorrectly()
    {
        // Arrange
        var earlier = Timestamp.FromDateTime(new DateTime(2024, 1, 15, 10, 30, 45, DateTimeKind.Utc));
        var later = Timestamp.FromDateTime(new DateTime(2024, 1, 15, 11, 30, 45, DateTimeKind.Utc));

        // Act & Assert
        // Less than and greater than
        (earlier < later).Should().BeTrue();
        (later > earlier).Should().BeTrue();
        
        // Less than or equal and greater than or equal
        (earlier <= later).Should().BeTrue();
        (later >= earlier).Should().BeTrue();
        
        // Self comparison (equal)
        var same = Timestamp.FromDateTime(new DateTime(2024, 1, 15, 10, 30, 45, DateTimeKind.Utc));
        (earlier <= same).Should().BeTrue();
        (earlier >= same).Should().BeTrue();
    }

    [Fact]
    public void Equality_WithSameTimestamp_ShouldBeEqual()
    {
        // Arrange
        var dateTime = new DateTime(2024, 1, 15, 10, 30, 45, DateTimeKind.Utc);
        var timestamp1 = Timestamp.FromDateTime(dateTime);
        var timestamp2 = Timestamp.FromDateTime(dateTime);

        // Act & Assert
        timestamp1.Should().Be(timestamp2);
        (timestamp1 == timestamp2).Should().BeTrue();
        (timestamp1 != timestamp2).Should().BeFalse();
    }

    [Fact]
    public void Equality_WithDifferentTimestamp_ShouldNotBeEqual()
    {
        // Arrange
        var timestamp1 = Timestamp.FromDateTime(new DateTime(2024, 1, 15, 10, 30, 45, DateTimeKind.Utc));
        var timestamp2 = Timestamp.FromDateTime(new DateTime(2024, 1, 15, 11, 30, 45, DateTimeKind.Utc));

        // Act & Assert
        timestamp1.Should().NotBe(timestamp2);
        (timestamp1 == timestamp2).Should().BeFalse();
        (timestamp1 != timestamp2).Should().BeTrue();
    }

    [Fact]
    public void GetHashCode_WithSameValue_ShouldReturnSameHashCode()
    {
        // Arrange
        var dateTime = new DateTime(2024, 1, 15, 10, 30, 45, DateTimeKind.Utc);
        var timestamp1 = Timestamp.FromDateTime(dateTime);
        var timestamp2 = Timestamp.FromDateTime(dateTime);

        // Act & Assert
        timestamp1.GetHashCode().Should().Be(timestamp2.GetHashCode());
    }
}
