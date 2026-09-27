using BrowserHistory.Domain.Entities;
using BrowserHistory.Domain.ValueObjects;
using FluentAssertions;

namespace BrowserHistory.Domain.Tests.Entities;

public class DeviceTests
{
    [Fact]
    public void Create_WithValidDeviceName_ShouldCreateDevice()
    {
        // Arrange
        var deviceName = "Test Device";

        // Act
        var device = Device.Create(deviceName);

        // Assert
        device.Should().NotBeNull();
        device.Id.Value.Should().NotBe(Guid.Empty);
        device.DeviceName.Should().Be(deviceName);
        device.RegisteredAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(1));
        device.LastSeen.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(1));
        device.IsActive.Should().BeTrue();
    }

    [Fact]
    public void Create_WithSpecificId_ShouldCreateDeviceWithGivenId()
    {
        // Arrange
        var deviceId = DeviceId.New();
        var deviceName = "Test Device";

        // Act
        var device = Device.Create(deviceId, deviceName);

        // Assert
        device.Id.Should().Be(deviceId);
        device.DeviceName.Should().Be(deviceName);
        device.IsActive.Should().BeTrue();
    }

    [Theory]
    [InlineData("")]
    [InlineData(" ")]
    [InlineData("   ")]
    public void Create_WithInvalidDeviceName_ShouldThrowArgumentException(string invalidName)
    {
        // Act & Assert
        var act = () => Device.Create(invalidName);
        act.Should().Throw<ArgumentException>()
            .WithMessage("Device name cannot be null or empty*");
    }

    [Fact]
    public void Create_WithNullDeviceName_ShouldThrowArgumentException()
    {
        // Act & Assert
        var act = () => Device.Create(null!);
        act.Should().Throw<ArgumentException>()
            .WithMessage("Device name cannot be null or empty*");
    }

    [Fact]
    public void Create_WithTooLongDeviceName_ShouldThrowArgumentException()
    {
        // Arrange
        var longDeviceName = new string('a', 101); // 101 characters

        // Act & Assert
        var act = () => Device.Create(longDeviceName);
        act.Should().Throw<ArgumentException>()
            .WithMessage("Device name cannot exceed 100 characters*");
    }

    [Fact]
    public void Create_WithDeviceNameWithWhitespace_ShouldTrimWhitespace()
    {
        // Arrange
        var deviceNameWithWhitespace = "  Test Device  ";

        // Act
        var device = Device.Create(deviceNameWithWhitespace);

        // Assert
        device.DeviceName.Should().Be("Test Device");
    }

    [Fact]
    public void UpdateLastSeen_ShouldUpdateTimestamp()
    {
        // Arrange
        var device = Device.Create("Test Device");
        var originalLastSeen = device.LastSeen;
        
        // Wait a small amount to ensure timestamp difference
        Thread.Sleep(10);

        // Act
        device.UpdateLastSeen();

        // Assert
        device.LastSeen.Should().BeAfter(originalLastSeen);
        device.LastSeen.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(1));
    }

    [Fact]
    public void Create_WithMaxLengthDeviceName_ShouldSucceed()
    {
        // Arrange
        var maxLengthDeviceName = new string('a', 100); // 100 characters

        // Act
        var device = Device.Create(maxLengthDeviceName);

        // Assert
        device.DeviceName.Should().Be(maxLengthDeviceName);
    }
}
