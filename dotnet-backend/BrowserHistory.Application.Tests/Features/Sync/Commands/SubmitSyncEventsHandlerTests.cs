using System.Text.Json;
using BrowserHistory.Application.Common.Interfaces;
using BrowserHistory.Application.Features.Sync.Commands;
using BrowserHistory.Application.Features.Sync.Models;
using BrowserHistory.Domain.Entities;
using BrowserHistory.Domain.ValueObjects;
using FluentAssertions;
using Moq;

namespace BrowserHistory.Application.Tests.Features.Sync.Commands;

public class SubmitSyncEventsHandlerTests
{
    private readonly Mock<ISyncEventRepository> _syncEventRepositoryMock = new();
    private readonly Mock<IDeviceRepository> _deviceRepositoryMock = new();
    private readonly Mock<IUnitOfWork> _unitOfWorkMock = new();
    private readonly Mock<IDateTimeProvider> _dateTimeProviderMock = new();
    private readonly Mock<IServerSentEventService> _sseServiceMock = new();
    private readonly SubmitSyncEventsCommandHandler _handler;
    private readonly DeviceId _deviceId = DeviceId.New();

    public SubmitSyncEventsHandlerTests()
    {
        var device = Device.Create(_deviceId, "Test Device");
        _deviceRepositoryMock.Setup(x => x.GetByIdAsync(_deviceId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(device);
        _syncEventRepositoryMock.Setup(x => x.GetExistingEventIdsAsync(It.IsAny<IEnumerable<Guid>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<Guid>());

        _handler = new SubmitSyncEventsCommandHandler(
            _syncEventRepositoryMock.Object,
            _deviceRepositoryMock.Object,
            _unitOfWorkMock.Object,
            _dateTimeProviderMock.Object,
            _sseServiceMock.Object);
    }

    private static SyncEventDto MakePageEvent(string url = "https://example.com/article") => new()
    {
        Id = Guid.NewGuid(),
        Timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
        EventType = "CREATE",
        EntityType = "page",
        EntityId = url, // pages are keyed by URL, not a GUID
        Data = JsonSerializer.Deserialize<JsonElement>(JsonSerializer.Serialize(new { url, title = "Example" }))
    };

    [Fact]
    public async Task Handle_WithPageEvent_PreservesUrlAsEntityId()
    {
        // Arrange
        var dto = MakePageEvent();
        var command = new SubmitSyncEventsCommand(_deviceId, new[] { dto });
        List<SyncEvent>? savedEvents = null;
        _syncEventRepositoryMock.Setup(x => x.AddRangeAsync(It.IsAny<IEnumerable<SyncEvent>>(), It.IsAny<CancellationToken>()))
            .Callback<IEnumerable<SyncEvent>, CancellationToken>((events, _) => savedEvents = events.ToList())
            .Returns(Task.CompletedTask);

        // Act
        var result = await _handler.Handle(command, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value!.ProcessedCount.Should().Be(1);
        savedEvents.Should().ContainSingle();
        savedEvents![0].EntityId.Should().Be(dto.EntityId);
        savedEvents[0].EntityType.Should().Be(BrowserHistory.Domain.Enums.SyncEntityType.Page);
        savedEvents[0].Checksum.Should().NotBeNullOrEmpty();
        savedEvents[0].Data.Should().Contain("Example");
    }

    [Fact]
    public async Task Handle_BroadcastsRealEntityTypeAndData_NotHardcodedHistory()
    {
        // Arrange - this is a regression test for a bug where the SSE broadcast always
        // claimed entityType "history" and sent null data regardless of the real event.
        var dto = MakePageEvent("https://example.com/other");
        var command = new SubmitSyncEventsCommand(_deviceId, new[] { dto });
        _syncEventRepositoryMock.Setup(x => x.AddRangeAsync(It.IsAny<IEnumerable<SyncEvent>>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        object? broadcastPayload = null;
        _sseServiceMock.Setup(x => x.BroadcastToOthersAsync(It.IsAny<string>(), It.IsAny<object>(), It.IsAny<CancellationToken>()))
            .Callback<string, object, CancellationToken>((_, payload, _) => broadcastPayload = payload)
            .Returns(Task.CompletedTask);

        // Act
        await _handler.Handle(command, CancellationToken.None);

        // Assert
        broadcastPayload.Should().NotBeNull();
        var json = JsonSerializer.Serialize(broadcastPayload);
        json.Should().Contain("\"entityType\":\"page\"");
        json.Should().Contain(dto.EntityId);
        json.Should().Contain("Example");
    }

    [Fact]
    public async Task Handle_WithDuplicateEventId_SkipsAsConflictInsteadOfThrowing()
    {
        // Arrange
        var dto = MakePageEvent();
        var command = new SubmitSyncEventsCommand(_deviceId, new[] { dto });
        _syncEventRepositoryMock.Setup(x => x.GetExistingEventIdsAsync(It.IsAny<IEnumerable<Guid>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[] { dto.Id });

        // Act
        var result = await _handler.Handle(command, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value!.ProcessedCount.Should().Be(0);
        result.Value.Conflicts.Should().ContainSingle(c => c == dto.Id.ToString());
    }
}
