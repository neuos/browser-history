using FsCheck;
using BrowserHistory.Domain.Entities;
using BrowserHistory.Domain.Enums;
using BrowserHistory.Domain.ValueObjects;

namespace BrowserHistory.E2E.Tests.PropertyBased;

/// <summary>
/// Property-based tests for Device entity invariants.
/// These tests generate many random inputs to verify business rules.
///
/// Device no longer accepts externally-supplied RegisteredAt/LastSeen timestamps (both are always
/// DateTime.UtcNow, set internally) - properties here only vary what's actually controllable:
/// the device name and id.
/// </summary>
public class DevicePropertyTests
{
    /// <summary>
    /// Property: LastSeen is never before RegisteredAt, no matter how many times it's updated.
    /// </summary>
    [Property]
    public Property LastSeenShouldNeverBeBeforeRegisteredAt()
    {
        return Prop.ForAll<PositiveInt>(updateCount =>
        {
            var device = Device.Create("Test Device");

            for (var i = 0; i < updateCount.Get % 20; i++)
            {
                device.UpdateLastSeen();
            }

            return device.LastSeen >= device.RegisteredAt;
        });
    }

    /// <summary>
    /// Property: Device names are trimmed and non-empty after creation.
    /// </summary>
    [Property]
    public Property DeviceNameShouldBeTrimmedAndNonEmpty()
    {
        return Prop.ForAll<NonEmptyString>(nonEmptyName =>
        {
            // Whitespace-only names would fail validation, so pad a genuinely non-blank name.
            // The 4 padding characters count against Device's 100-char limit too.
            var trimmedInput = nonEmptyName.Get.Trim();
            var nameWithWhitespace = $"  {trimmedInput}  ";
            if (trimmedInput.Length == 0 || nameWithWhitespace.Length > 100) return true; // out of scope for this property

            var device = Device.Create(nameWithWhitespace);

            return !string.IsNullOrWhiteSpace(device.DeviceName) &&
                   device.DeviceName == trimmedInput;
        });
    }

    /// <summary>
    /// Property: A freshly created device is always active, and stays active through updates
    /// that aren't Deactivate().
    /// </summary>
    [Property]
    public Property DeviceShouldRemainActiveAfterNonDeactivatingUpdates()
    {
        return Prop.ForAll<NonEmptyString, PositiveInt>((name, updateCount) =>
        {
            var trimmedInput = name.Get.Trim();
            if (trimmedInput.Length == 0 || trimmedInput.Length > 100) return true;

            var device = Device.Create(trimmedInput);
            for (var i = 0; i < updateCount.Get % 20; i++)
            {
                device.UpdateLastSeen();
            }

            return device.IsActive;
        });
    }

    /// <summary>
    /// Property: DeviceId is immutable and always returns the same underlying value.
    /// </summary>
    [Property]
    public Property DeviceIdShouldBeImmutable()
    {
        return Prop.ForAll<Guid>(guidValue =>
        {
            if (guidValue == Guid.Empty) return true; // DeviceId disallows Guid.Empty by design

            var deviceId = DeviceId.From(guidValue);
            var device = Device.Create(deviceId, "Test Device");

            return device.Id.Value == guidValue && device.Id.Value == deviceId.Value;
        });
    }

    /// <summary>
    /// Property: two Device instances constructed with the same DeviceId represent the same
    /// logical device, even though Device itself uses reference equality (it's an entity, not a
    /// value object) - identity is carried by DeviceId, which does have value equality.
    /// </summary>
    [Property]
    public Property DevicesWithSameIdShouldShareIdentity()
    {
        return Prop.ForAll<Guid, NonEmptyString, NonEmptyString>((id, name1, name2) =>
        {
            if (id == Guid.Empty) return true;
            var n1 = name1.Get.Trim();
            var n2 = name2.Get.Trim();
            if (n1.Length is 0 or > 100 || n2.Length is 0 or > 100) return true;

            var deviceId = DeviceId.From(id);
            var device1 = Device.Create(deviceId, n1);
            var device2 = Device.Create(deviceId, n2);

            return device1.Id.Equals(device2.Id) && device1.Id.GetHashCode() == device2.Id.GetHashCode();
        });
    }
}

/// <summary>
/// Property-based tests for SyncEvent entity invariants.
/// </summary>
public class SyncEventPropertyTests
{
    private static Checksum ValidChecksum() => Checksum.FromContent(Guid.NewGuid().ToString());

    /// <summary>
    /// Property: SyncEvent timestamp is preserved exactly.
    /// </summary>
    [Property]
    public Property SyncEventTimestampShouldBePreserved()
    {
        return Prop.ForAll<DateTime, Guid>((timestamp, deviceGuid) =>
        {
            if (deviceGuid == Guid.Empty) return true;

            var syncEvent = SyncEvent.Create(
                Guid.NewGuid(),
                "test-entity-id",
                DeviceId.From(deviceGuid),
                timestamp,
                SyncEventType.Create,
                SyncEntityType.History,
                "{}",
                ValidChecksum());

            return syncEvent.Timestamp == timestamp;
        });
    }

    /// <summary>
    /// Property: SyncEvent data is never null or empty (Create rejects blank data).
    /// </summary>
    [Property]
    public Property SyncEventDataShouldNeverBeNullOrEmpty()
    {
        return Prop.ForAll<NonEmptyString>(data =>
        {
            if (string.IsNullOrWhiteSpace(data.Get)) return true; // Create rejects this by design

            var syncEvent = SyncEvent.Create(
                Guid.NewGuid(),
                "test-entity-id",
                DeviceId.New(),
                DateTime.UtcNow,
                SyncEventType.Update,
                SyncEntityType.History,
                data.Get,
                ValidChecksum());

            return !string.IsNullOrEmpty(syncEvent.Data);
        });
    }

    /// <summary>
    /// Property: two events created with the same entityId/entityType are otherwise independent -
    /// each gets its own server-generated Id and can carry its own checksum.
    /// </summary>
    [Property]
    public Property SyncEventsShouldGetIndependentServerGeneratedIds()
    {
        return Prop.ForAll<NonEmptyString>(data =>
        {
            if (string.IsNullOrWhiteSpace(data.Get)) return true;

            var event1 = SyncEvent.Create(
                Guid.NewGuid(), "shared-entity-id", DeviceId.New(), DateTime.UtcNow,
                SyncEventType.Create, SyncEntityType.History, data.Get, ValidChecksum());
            var event2 = SyncEvent.Create(
                Guid.NewGuid(), "shared-entity-id", DeviceId.New(), DateTime.UtcNow,
                SyncEventType.Create, SyncEntityType.History, data.Get, ValidChecksum());

            return event1.Id != event2.Id && event1.EntityId == event2.EntityId;
        });
    }
}
