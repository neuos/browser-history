using BrowserHistory.Domain.ValueObjects;
using FluentAssertions;

namespace BrowserHistory.Domain.Tests.ValueObjects;

public class DeviceIdTests
{
    [Fact]
    public void New_ShouldCreateUniqueDeviceIds()
    {
        // Act
        var deviceId1 = DeviceId.New();
        var deviceId2 = DeviceId.New();

        // Assert
        deviceId1.Should().NotBe(deviceId2);
        deviceId1.Value.Should().NotBe(Guid.Empty);
        deviceId2.Value.Should().NotBe(Guid.Empty);
    }

    [Fact]
    public void From_WithValidGuid_ShouldCreateDeviceId()
    {
        // Arrange
        var guid = Guid.NewGuid();

        // Act
        var deviceId = DeviceId.From(guid);

        // Assert
        deviceId.Value.Should().Be(guid);
    }

    [Fact]
    public void From_WithEmptyGuid_ShouldThrowArgumentException()
    {
        // Act & Assert
        var act = () => DeviceId.From(Guid.Empty);
        act.Should().Throw<ArgumentException>()
            .WithMessage("DeviceId cannot be empty*");
    }

    [Fact]
    public void From_WithValidString_ShouldCreateDeviceId()
    {
        // Arrange
        var guid = Guid.NewGuid();
        var guidString = guid.ToString();

        // Act
        var deviceId = DeviceId.From(guidString);

        // Assert
        deviceId.Value.Should().Be(guid);
    }

    [Theory]
    [InlineData("")]
    [InlineData(" ")]
    [InlineData("invalid-guid")]
    [InlineData("12345")]
    public void From_WithInvalidString_ShouldThrowArgumentException(string invalidValue)
    {
        // Act & Assert
        var act = () => DeviceId.From(invalidValue);
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void ToString_ShouldReturnGuidString()
    {
        // Arrange
        var guid = Guid.NewGuid();
        var deviceId = DeviceId.From(guid);

        // Act
        var result = deviceId.ToString();

        // Assert
        result.Should().Be(guid.ToString());
    }

    [Fact]
    public void ImplicitConversion_ToGuid_ShouldWork()
    {
        // Arrange
        var guid = Guid.NewGuid();
        var deviceId = DeviceId.From(guid);

        // Act
        Guid convertedGuid = deviceId;

        // Assert
        convertedGuid.Should().Be(guid);
    }

    [Fact]
    public void ExplicitConversion_FromGuid_ShouldWork()
    {
        // Arrange
        var guid = Guid.NewGuid();

        // Act
        var deviceId = (DeviceId)guid;

        // Assert
        deviceId.Value.Should().Be(guid);
    }

    [Fact]
    public void ExplicitConversion_FromString_ShouldWork()
    {
        // Arrange
        var guid = Guid.NewGuid();
        var guidString = guid.ToString();

        // Act
        var deviceId = (DeviceId)guidString;

        // Assert
        deviceId.Value.Should().Be(guid);
    }

    [Fact]
    public void Equality_ShouldWorkCorrectly()
    {
        // Arrange
        var guid = Guid.NewGuid();
        var deviceId1 = DeviceId.From(guid);
        var deviceId2 = DeviceId.From(guid);
        var deviceId3 = DeviceId.New();

        // Assert
        deviceId1.Should().Be(deviceId2);
        deviceId1.Should().NotBe(deviceId3);
        (deviceId1 == deviceId2).Should().BeTrue();
        (deviceId1 != deviceId3).Should().BeTrue();
    }
}
