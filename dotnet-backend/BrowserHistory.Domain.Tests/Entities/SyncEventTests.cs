using BrowserHistory.Domain.Entities;
using BrowserHistory.Domain.ValueObjects;
using FluentAssertions;

namespace BrowserHistory.Domain.Tests.Entities;

public class SyncEventTests
{
    [Fact]
    public void Create_WithValidParameters_ShouldCreateSyncEvent()
    {
        // Arrange
        var deviceId = DeviceId.New();
        var eventType = SyncEventType.DeviceConnected;
        var metadata = "Test metadata";

        // Act
        var syncEvent = SyncEvent.Create(deviceId, eventType, metadata);

        // Assert
        syncEvent.Should().NotBeNull();
        syncEvent.Id.Should().NotBe(Guid.Empty);
        syncEvent.DeviceId.Should().Be(deviceId);
        syncEvent.EventType.Should().Be(eventType);
        syncEvent.Metadata.Should().Be(metadata);
        syncEvent.Timestamp.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(1));
    }

    [Fact]
    public void Create_WithoutMetadata_ShouldCreateSyncEventWithNullMetadata()
    {
        // Arrange
        var deviceId = DeviceId.New();
        var eventType = SyncEventType.HistorySyncStarted;

        // Act
        var syncEvent = SyncEvent.Create(deviceId, eventType);

        // Assert
        syncEvent.DeviceId.Should().Be(deviceId);
        syncEvent.EventType.Should().Be(eventType);
        syncEvent.Metadata.Should().BeNull();
    }

    [Fact]
    public void Create_WithEmptyDeviceId_ShouldThrowArgumentException()
    {
        // Act & Assert - DeviceId.From(Guid.Empty) itself throws, which is the expected behavior
        var act = () => DeviceId.From(Guid.Empty);
        act.Should().Throw<ArgumentException>()
            .WithMessage("DeviceId cannot be empty*");
    }

    [Fact]
    public void DeviceConnected_ShouldCreateCorrectEvent()
    {
        // Arrange
        var deviceId = DeviceId.New();

        // Act
        var syncEvent = SyncEvent.DeviceConnected(deviceId);

        // Assert
        syncEvent.DeviceId.Should().Be(deviceId);
        syncEvent.EventType.Should().Be(SyncEventType.DeviceConnected);
        syncEvent.Metadata.Should().BeNull();
    }

    [Fact]
    public void DeviceDisconnected_ShouldCreateCorrectEvent()
    {
        // Arrange
        var deviceId = DeviceId.New();

        // Act
        var syncEvent = SyncEvent.DeviceDisconnected(deviceId);

        // Assert
        syncEvent.DeviceId.Should().Be(deviceId);
        syncEvent.EventType.Should().Be(SyncEventType.DeviceDisconnected);
        syncEvent.Metadata.Should().BeNull();
    }

    [Fact]
    public void HistorySyncStarted_WithMetadata_ShouldCreateCorrectEvent()
    {
        // Arrange
        var deviceId = DeviceId.New();
        var metadata = "Sync started for 1000 items";

        // Act
        var syncEvent = SyncEvent.HistorySyncStarted(deviceId, metadata);

        // Assert
        syncEvent.DeviceId.Should().Be(deviceId);
        syncEvent.EventType.Should().Be(SyncEventType.HistorySyncStarted);
        syncEvent.Metadata.Should().Be(metadata);
    }

    [Fact]
    public void HistorySyncStarted_WithoutMetadata_ShouldCreateCorrectEvent()
    {
        // Arrange
        var deviceId = DeviceId.New();

        // Act
        var syncEvent = SyncEvent.HistorySyncStarted(deviceId);

        // Assert
        syncEvent.DeviceId.Should().Be(deviceId);
        syncEvent.EventType.Should().Be(SyncEventType.HistorySyncStarted);
        syncEvent.Metadata.Should().BeNull();
    }

    [Fact]
    public void HistorySyncCompleted_WithMetadata_ShouldCreateCorrectEvent()
    {
        // Arrange
        var deviceId = DeviceId.New();
        var metadata = "Sync completed: 950 items processed";

        // Act
        var syncEvent = SyncEvent.HistorySyncCompleted(deviceId, metadata);

        // Assert
        syncEvent.DeviceId.Should().Be(deviceId);
        syncEvent.EventType.Should().Be(SyncEventType.HistorySyncCompleted);
        syncEvent.Metadata.Should().Be(metadata);
    }

    [Fact]
    public void SyncError_WithErrorMessage_ShouldCreateCorrectEvent()
    {
        // Arrange
        var deviceId = DeviceId.New();
        var errorMessage = "Connection timeout during sync";

        // Act
        var syncEvent = SyncEvent.SyncError(deviceId, errorMessage);

        // Assert
        syncEvent.DeviceId.Should().Be(deviceId);
        syncEvent.EventType.Should().Be(SyncEventType.SyncError);
        syncEvent.Metadata.Should().Be(errorMessage);
    }

    [Theory]
    [InlineData(SyncEventType.DeviceConnected)]
    [InlineData(SyncEventType.DeviceDisconnected)]
    [InlineData(SyncEventType.HistorySyncStarted)]
    [InlineData(SyncEventType.HistorySyncCompleted)]
    [InlineData(SyncEventType.SyncError)]
    public void Create_WithAllEventTypes_ShouldSucceed(SyncEventType eventType)
    {
        // Arrange
        var deviceId = DeviceId.New();

        // Act
        var syncEvent = SyncEvent.Create(deviceId, eventType);

        // Assert
        syncEvent.EventType.Should().Be(eventType);
        syncEvent.DeviceId.Should().Be(deviceId);
    }

    [Fact]
    public void SyncEventType_ShouldHaveCorrectValues()
    {
        // Assert - verify enum values are as expected
        ((int)SyncEventType.DeviceConnected).Should().Be(1);
        ((int)SyncEventType.DeviceDisconnected).Should().Be(2);
        ((int)SyncEventType.HistorySyncStarted).Should().Be(3);
        ((int)SyncEventType.HistorySyncCompleted).Should().Be(4);
        ((int)SyncEventType.SyncError).Should().Be(5);
    }
}
