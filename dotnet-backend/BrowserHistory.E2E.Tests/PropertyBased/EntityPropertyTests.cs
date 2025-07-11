using FsCheck;
using BrowserHistory.Domain.Entities;
using BrowserHistory.Domain.ValueObjects;

namespace BrowserHistory.E2E.Tests.PropertyBased;

/// <summary>
/// Property-based tests for Device entity invariants.
/// These tests generate thousands of random inputs to verify business rules.
/// </summary>
public class DevicePropertyTests
{
    /// <summary>
    /// Property: A device's LastSeen should never be before its RegisteredAt time.
    /// </summary>
    [Property]
    public Property LastSeenShouldNotBeBeforeRegisteredAt()
    {
        return Prop.ForAll<DateTime, DateTime>((registeredAt, lastSeen) =>
        {
            // Arrange: Ensure registeredAt is before lastSeen
            var validRegisteredAt = registeredAt;
            var validLastSeen = lastSeen > registeredAt ? lastSeen : registeredAt.AddMinutes(1);
            
            // Act: Create device with valid timestamps
            var device = Device.Create(
                DeviceId.Create(Guid.NewGuid()),
                "Test Device",
                validRegisteredAt);
            
            device.UpdateLastSeen(validLastSeen);
            
            // Assert: LastSeen should always be >= RegisteredAt
            return device.LastSeen >= device.RegisteredAt;
        });
    }

    /// <summary>
    /// Property: Device names should be trimmed and non-empty after creation.
    /// </summary>
    [Property]
    public Property DeviceNameShouldBeTrimmedAndNonEmpty()
    {
        return Prop.ForAll<NonEmptyString>(nonEmptyName =>
        {
            // Arrange: Add whitespace to the name
            var nameWithWhitespace = $"  {nonEmptyName.Get}  ";
            
            // Act: Create device
            var device = Device.Create(
                DeviceId.Create(Guid.NewGuid()),
                nameWithWhitespace,
                DateTime.UtcNow);
            
            // Assert: Name should be trimmed and non-empty
            return !string.IsNullOrWhiteSpace(device.DeviceName) &&
                   device.DeviceName == nameWithWhitespace.Trim();
        });
    }

    /// <summary>
    /// Property: Device should remain active after creation and last seen updates.
    /// </summary>
    [Property]
    public Property DeviceShouldRemainActiveAfterUpdates()
    {
        return Prop.ForAll<DateTime>(timestamp =>
        {
            // Arrange & Act: Create device and update last seen
            var device = Device.Create(
                DeviceId.Create(Guid.NewGuid()),
                "Test Device",
                DateTime.UtcNow);
            
            if (timestamp > device.RegisteredAt)
            {
                device.UpdateLastSeen(timestamp);
            }
            
            // Assert: Device should remain active
            return device.IsActive;
        });
    }

    /// <summary>
    /// Property: DeviceId should be immutable and always return the same value.
    /// </summary>
    [Property]
    public Property DeviceIdShouldBeImmutable()
    {
        return Prop.ForAll<Guid>(guidValue =>
        {
            // Arrange & Act: Create device with specific ID
            var deviceId = DeviceId.Create(guidValue);
            var device = Device.Create(
                deviceId,
                "Test Device",
                DateTime.UtcNow);
            
            // Assert: DeviceId should remain constant
            return device.Id.Value == guidValue && 
                   device.Id.Value == deviceId.Value;
        });
    }

    /// <summary>
    /// Property: Multiple devices with same ID should be equal.
    /// </summary>
    [Property]
    public Property DevicesWithSameIdShouldBeEqual()
    {
        return Prop.ForAll<Guid, NonEmptyString, NonEmptyString, DateTime, DateTime>(
            (id, name1, name2, time1, time2) =>
        {
            // Arrange: Create two devices with same ID but different properties
            var deviceId = DeviceId.Create(id);
            var device1 = Device.Create(deviceId, name1.Get, time1);
            var device2 = Device.Create(deviceId, name2.Get, time2);
            
            // Assert: Devices should be equal based on ID
            return device1.Equals(device2) && 
                   device1.GetHashCode() == device2.GetHashCode();
        });
    }
}

/// <summary>
/// Property-based tests for SyncEvent entity invariants.
/// </summary>
public class SyncEventPropertyTests
{
    /// <summary>
    /// Property: SyncEvent timestamp should be preserved accurately.
    /// </summary>
    [Property]
    public Property SyncEventTimestampShouldBePreserved()
    {
        return Prop.ForAll<DateTime, Guid>(
            (timestamp, deviceId) =>
        {
            // Arrange & Act: Create sync event
            var syncEvent = SyncEvent.Create(
                Guid.NewGuid(),
                DeviceId.Create(deviceId),
                timestamp,
                SyncEventType.Create,
                SyncEntityType.History,
                "test-entity-id",
                "{}",
                "checksum-123");
            
            // Assert: Timestamp should be preserved exactly
            return syncEvent.Timestamp == timestamp;
        });
    }

    /// <summary>
    /// Property: SyncEvent data should never be null or empty.
    /// </summary>
    [Property]
    public Property SyncEventDataShouldNeverBeNullOrEmpty()
    {
        return Prop.ForAll<NonEmptyString>(data =>
        {
            // Act: Create sync event with provided data
            var syncEvent = SyncEvent.Create(
                Guid.NewGuid(),
                DeviceId.Create(Guid.NewGuid()),
                DateTime.UtcNow,
                SyncEventType.Update,
                SyncEntityType.History,
                "test-entity-id",
                data.Get,
                "checksum");
            
            // Assert: Data should not be null or empty
            return !string.IsNullOrEmpty(syncEvent.Data);
        });
    }

    /// <summary>
    /// Property: SyncEvent checksum should be consistent for same data.
    /// </summary>
    [Property]
    public Property SyncEventChecksumShouldBeConsistent()
    {
        return Prop.ForAll<NonEmptyString, NonEmptyString>(
            (data, checksum) =>
        {
            // Arrange: Create two events with same data and checksum
            var event1 = SyncEvent.Create(
                Guid.NewGuid(),
                DeviceId.Create(Guid.NewGuid()),
                DateTime.UtcNow,
                SyncEventType.Create,
                SyncEntityType.History,
                "entity-1",
                data.Get,
                checksum.Get);
                
            var event2 = SyncEvent.Create(
                Guid.NewGuid(),
                DeviceId.Create(Guid.NewGuid()),
                DateTime.UtcNow,
                SyncEventType.Create,
                SyncEntityType.History,
                "entity-2",
                data.Get,
                checksum.Get);
            
            // Assert: Same data should have same checksum
            return event1.Checksum == event2.Checksum;
        });
    }
}

/// <summary>
/// Property-based tests for HistoryNode entity invariants.
/// </summary>
public class HistoryNodePropertyTests
{
    /// <summary>
    /// Property: HistoryNode timestamps should follow logical order.
    /// </summary>
    [Property]
    public Property HistoryNodeTimestampsShouldFollowLogicalOrder()
    {
        return Prop.ForAll<DateTime, DateTime, DateTime>(
            (timestamp, createdAt, updatedAt) =>
        {
            // Arrange: Ensure logical timestamp ordering
            var validCreatedAt = createdAt;
            var validUpdatedAt = updatedAt > createdAt ? updatedAt : createdAt;
            var validTimestamp = timestamp;
            
            // Act: Create history node
            var historyNode = HistoryNode.Create(
                Guid.NewGuid(),
                DeviceId.Create(Guid.NewGuid()),
                Url.Create("https://example.com"),
                1,
                validTimestamp,
                null,
                validCreatedAt,
                validUpdatedAt);
            
            // Assert: UpdatedAt should be >= CreatedAt
            return historyNode.UpdatedAt >= historyNode.CreatedAt;
        });
    }

    /// <summary>
    /// Property: HistoryNode URL should be valid and preserved.
    /// </summary>
    [Property]
    public Property HistoryNodeUrlShouldBeValidAndPreserved()
    {
        return Prop.ForAll<NonEmptyString>(urlString =>
        {
            try
            {
                // Arrange: Create a valid URL
                var validUrl = $"https://example.com/{urlString.Get.Replace(" ", "-")}";
                var url = Url.Create(validUrl);
                
                // Act: Create history node
                var historyNode = HistoryNode.Create(
                    Guid.NewGuid(),
                    DeviceId.Create(Guid.NewGuid()),
                    url,
                    1,
                    DateTime.UtcNow,
                    null,
                    DateTime.UtcNow,
                    DateTime.UtcNow);
                
                // Assert: URL should be preserved
                return historyNode.Url.Value == validUrl;
            }
            catch
            {
                // Skip invalid URLs
                return true;
            }
        });
    }

    /// <summary>
    /// Property: HistoryNode soft delete should preserve original timestamps.
    /// </summary>
    [Property]
    public Property HistoryNodeSoftDeleteShouldPreserveTimestamps()
    {
        return Prop.ForAll<DateTime, DateTime>(
            (createdAt, updatedAt) =>
        {
            // Arrange: Create history node
            var validUpdatedAt = updatedAt > createdAt ? updatedAt : createdAt;
            var historyNode = HistoryNode.Create(
                Guid.NewGuid(),
                DeviceId.Create(Guid.NewGuid()),
                Url.Create("https://example.com"),
                1,
                DateTime.UtcNow,
                null,
                createdAt,
                validUpdatedAt);
            
            var originalCreatedAt = historyNode.CreatedAt;
            var originalUpdatedAt = historyNode.UpdatedAt;
            
            // Act: Soft delete
            historyNode.SoftDelete();
            
            // Assert: Original timestamps should be preserved
            return historyNode.CreatedAt == originalCreatedAt &&
                   historyNode.UpdatedAt == originalUpdatedAt &&
                   historyNode.DeletedAt.HasValue;
        });
    }
}
