using BrowserHistory.Application.Common.Interfaces;
using BrowserHistory.Application.Features.Sync.Queries;
using BrowserHistory.Domain.Entities;
using BrowserHistory.Domain.Enums;
using BrowserHistory.Domain.ValueObjects;
using FluentAssertions;
using Moq;

namespace BrowserHistory.Application.Tests.Features.Sync.Queries;

public class GetSyncEventsHandlerTests
{
    private readonly Mock<ISyncEventRepository> _syncEventRepositoryMock = new();
    private readonly GetSyncEventsQueryHandler _handler;

    public GetSyncEventsHandlerTests()
    {
        _handler = new GetSyncEventsQueryHandler(_syncEventRepositoryMock.Object);
    }

    [Fact]
    public async Task Handle_MapsTimestampAsUnixMilliseconds_NotIsoString()
    {
        // Arrange - the extension client treats event.timestamp as a JS number
        // (Date.now()-style), never an ISO date string.
        var timestamp = new DateTime(2026, 1, 1, 12, 0, 0, DateTimeKind.Utc);
        var syncEvent = SyncEvent.Create(
            Guid.NewGuid(),
            "https://example.com/page",
            DeviceId.New(),
            timestamp,
            SyncEventType.Create,
            SyncEntityType.Page,
            "{\"url\":\"https://example.com/page\"}",
            "a".PadRight(64, 'a'));

        _syncEventRepositoryMock.Setup(x => x.GetEventsAsync(
                null, null, 0, 100, It.IsAny<CancellationToken>()))
            .ReturnsAsync((new[] { syncEvent }, 1));

        var query = new GetSyncEventsQuery();

        // Act
        var result = await _handler.Handle(query, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        var dto = result.Value!.Events.Single();
        dto.Timestamp.Should().Be(new DateTimeOffset(timestamp).ToUnixTimeMilliseconds());
        dto.EntityType.Should().Be("page");
        dto.EntityId.Should().Be("https://example.com/page");
        dto.Data!.Value.GetProperty("url").GetString().Should().Be("https://example.com/page");
    }
}
