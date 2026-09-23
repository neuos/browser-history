using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using BrowserHistory.E2E.Tests.Infrastructure;
using BrowserHistory.Application.Features.Auth.Models;
using BrowserHistory.Application.Features.Sync.Models;
using BrowserHistory.Infrastructure.Data;

namespace BrowserHistory.E2E.Tests.Workflows;

/// <summary>
/// End-to-end tests for multi-device synchronization over /api/v1/sync/events - the real
/// event-sourcing model (submit an event, other devices poll/download it), not a
/// full-history-upload-and-download or server-side conflict-resolution model. The server never
/// materializes synced content into a queryable HistoryNodes table server-side - it only relays
/// events - so these tests verify the event feed itself, which is what the extension relies on.
/// </summary>
[Collection("E2E Tests")]
public class SynchronizationWorkflowTests : IClassFixture<E2ETestWebApplicationFactory>
{
    private const string SharedSecret = "your-shared-secret-for-device-registration";

    private readonly E2ETestWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public SynchronizationWorkflowTests(E2ETestWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Complete_Multi_Device_Sync_Workflow_Should_Succeed()
    {
        // Arrange
        await _factory.ClearTestDataAsync();
        var device1 = await RegisterDeviceAsync("Chrome Desktop");
        var device2 = await RegisterDeviceAsync("Firefox Mobile");

        // Act & Assert - Step 1: Device 1 submits two history events
        var githubId = Guid.NewGuid().ToString();
        var soId = Guid.NewGuid().ToString();
        var submitResponse = await SubmitEventsAsync(device1.Token,
            HistoryEvent(githubId, "https://github.com", "GitHub"),
            HistoryEvent(soId, "https://stackoverflow.com", "Stack Overflow"));
        submitResponse.processedCount.Should().Be(2);

        // Step 2: Device 2 downloads events since the beginning of time, excluding its own
        var (events, _, _) = await GetEventsAsync(device2.Token, since: 0);
        events.Should().HaveCount(2);
        events.Should().AllSatisfy(e =>
        {
            e.DeviceId.Should().Be(device1.DeviceId);
            e.EventType.Should().Be("CREATE");
            e.EntityType.Should().Be("history");
        });
        events.Should().Contain(e => e.EntityId == githubId);
        events.Should().Contain(e => e.EntityId == soId);

        // Step 3: Device 2 submits its own event
        var redditId = Guid.NewGuid().ToString();
        await SubmitEventsAsync(device2.Token, HistoryEvent(redditId, "https://reddit.com", "Reddit"));

        // Step 4: Device 1 downloads, excluding its own device - should see only device 2's event
        var (device1View, _, _) = await GetEventsAsync(device1.Token, since: 0, excludeDevice: true);
        device1View.Should().ContainSingle(e => e.EntityId == redditId && e.DeviceId == device2.DeviceId);

        // Verify total events persisted in the database
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<BrowserHistoryDbContext>();
        context.SyncEvents.Count(e => e.EventType == BrowserHistory.Domain.Entities.SyncEventType.Create)
            .Should().Be(3);
    }

    [Fact]
    public async Task Registering_Same_Device_Name_Again_Should_Reauthenticate_Not_Duplicate()
    {
        // A device whose access token has fully expired (routine for a phone offline for hours -
        // the refresh endpoint can only extend a token that hasn't expired yet, so it has no
        // other way back in) falls back to registering again. That must re-authenticate the
        // existing device - same DeviceId, so its sync history stays attributed to it - rather
        // than failing on the DeviceName uniqueness constraint or creating a duplicate Device row.
        await _factory.ClearTestDataAsync();
        var deviceName = $"Re-registration Test-{Guid.NewGuid()}";

        var first = await _client.PostAsJsonAsync("/api/v1/auth/register-device",
            new { deviceName, secret = SharedSecret });
        first.StatusCode.Should().Be(HttpStatusCode.OK);
        var firstResult = await first.Content.ReadFromJsonAsync<RegisterDeviceResponse>();

        var second = await _client.PostAsJsonAsync("/api/v1/auth/register-device",
            new { deviceName, secret = SharedSecret });
        second.StatusCode.Should().Be(HttpStatusCode.OK);
        var secondResult = await second.Content.ReadFromJsonAsync<RegisterDeviceResponse>();

        secondResult!.DeviceId.Should().Be(firstResult!.DeviceId, "re-registration must reuse the same device identity");
        secondResult.Token.Should().NotBe(firstResult.Token, "each registration should still issue a fresh token");

        // The re-issued token must actually work end to end, not just look well-formed.
        var submitResponse = await SubmitEventsAsync(secondResult.Token,
            HistoryEvent(Guid.NewGuid().ToString(), "https://example.com", "Example"));
        submitResponse.processedCount.Should().Be(1);

        // Exactly one Device row for this name - no duplicate created on the second registration.
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<BrowserHistoryDbContext>();
        context.Devices.Count(d => d.DeviceName == deviceName).Should().Be(1);
    }

    [Fact]
    public async Task Incremental_Sync_Should_Only_Return_Events_Since_Given_Timestamp()
    {
        // Arrange
        await _factory.ClearTestDataAsync();
        var device = await RegisterDeviceAsync("Test Device");

        await SubmitEventsAsync(device.Token, HistoryEvent(Guid.NewGuid().ToString(), "https://old.example.com", "Old"));
        await Task.Delay(10); // ensure a distinguishable timestamp boundary
        var cutoff = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        await Task.Delay(10);
        var newId = Guid.NewGuid().ToString();
        await SubmitEventsAsync(device.Token, HistoryEvent(newId, "https://new.example.com", "New"));

        // Act
        var (events, _, _) = await GetEventsAsync(device.Token, since: cutoff);

        // Assert
        events.Should().ContainSingle(e => e.EntityId == newId);
    }

    [Fact]
    public async Task Sync_Events_Should_Be_Returned_In_Chronological_Order()
    {
        // Arrange
        await _factory.ClearTestDataAsync();
        var device = await RegisterDeviceAsync("Test Device");
        var ids = new[] { Guid.NewGuid().ToString(), Guid.NewGuid().ToString(), Guid.NewGuid().ToString() };

        // Act - submit out of order, each with an explicit, distinct timestamp
        var baseTime = DateTimeOffset.UtcNow.AddHours(-1).ToUnixTimeMilliseconds();
        await SubmitEventsAsync(device.Token, HistoryEvent(ids[2], "https://third.example.com", "Third", baseTime + 30_000));
        await SubmitEventsAsync(device.Token, HistoryEvent(ids[0], "https://first.example.com", "First", baseTime));
        await SubmitEventsAsync(device.Token, HistoryEvent(ids[1], "https://second.example.com", "Second", baseTime + 15_000));

        var (events, _, _) = await GetEventsAsync(device.Token, since: 0);

        // Assert
        events.Should().HaveCount(3);
        events.Should().BeInAscendingOrder(e => e.Timestamp);
        events.Select(e => e.EntityId).Should().ContainInOrder(ids[0], ids[1], ids[2]);
    }

    [Fact]
    public async Task Large_Batch_Sync_Should_Be_Fully_Downloadable()
    {
        // Arrange
        await _factory.ClearTestDataAsync();
        var device = await RegisterDeviceAsync("Test Device");
        var payloadEvents = Enumerable.Range(0, 150)
            .Select(i => HistoryEvent(Guid.NewGuid().ToString(), $"https://site{i}.example.com", $"Site {i}"))
            .ToArray();

        // Act
        var submitResult = await SubmitEventsAsync(device.Token, payloadEvents);
        submitResult.processedCount.Should().Be(150);

        var other = await RegisterDeviceAsync("Other Device");
        var (events, totalCount, _) = await GetEventsAsync(other.Token, since: 0, take: 1000);

        // Assert
        events.Should().HaveCount(150);
        totalCount.Should().Be(150);
        events.Select(e => e.EntityId).Should().OnlyHaveUniqueItems();
    }

    [Fact]
    public async Task Page_Sync_Events_Use_Url_As_EntityId_Not_A_Guid()
    {
        // Arrange - the whole reason SyncEvent.EntityId is a string: pages are keyed by URL.
        await _factory.ClearTestDataAsync();
        var device1 = await RegisterDeviceAsync("Device A");
        var device2 = await RegisterDeviceAsync("Device B");
        const string pageUrl = "https://example.com/some/article";

        var payload = new
        {
            events = new[]
            {
                new
                {
                    id = Guid.NewGuid(),
                    timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
                    eventType = "CREATE",
                    entityType = "page",
                    entityId = pageUrl,
                    data = new { url = pageUrl, title = "Some Article" }
                }
            }
        };

        // Act
        await AuthorizedPostAsync("/api/v1/sync/events", payload, device1.Token);
        var (events, _, _) = await GetEventsAsync(device2.Token, since: 0);

        // Assert
        var pageEvent = events.Should().ContainSingle(e => e.EntityType == "page").Subject;
        pageEvent.EntityId.Should().Be(pageUrl);
        pageEvent.Data!.Value.GetProperty("title").GetString().Should().Be("Some Article");
    }

    private static object HistoryEvent(string entityId, string url, string title, long? timestamp = null) => new
    {
        id = Guid.NewGuid(),
        timestamp = timestamp ?? DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
        eventType = "CREATE",
        entityType = "history",
        entityId,
        data = new { url, title }
    };

    private async Task<(int processedCount, string[] conflicts)> SubmitEventsAsync(string token, params object[] events)
    {
        var response = await AuthorizedPostAsync("/api/v1/sync/events", new { events }, token);
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await response.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>();
        var processedCount = result.GetProperty("processedCount").GetInt32();
        var conflicts = result.GetProperty("conflicts").EnumerateArray().Select(c => c.GetString()!).ToArray();
        return (processedCount, conflicts);
    }

    private async Task<(List<SyncEventDto> Events, int TotalCount, bool HasMore)> GetEventsAsync(
        string token, long since, bool excludeDevice = false, int take = 100)
    {
        var url = $"/api/v1/sync/events?since={since}&exclude_device={(excludeDevice ? "true" : "false")}&take={take}";
        var request = new HttpRequestMessage(HttpMethod.Get, url);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var response = await _client.SendAsync(request);
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var result = await response.Content.ReadFromJsonAsync<GetSyncEventsResponseBody>();
        return (result!.Events, result.TotalCount, result.HasMore);
    }

    private async Task<HttpResponseMessage> AuthorizedPostAsync(string url, object payload, string token)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, url) { Content = JsonContent.Create(payload) };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return await _client.SendAsync(request);
    }

    private async Task<(string DeviceId, string Token)> RegisterDeviceAsync(string namePrefix)
    {
        var response = await _client.PostAsJsonAsync("/api/v1/auth/register-device",
            new { deviceName = $"{namePrefix}-{Guid.NewGuid()}", secret = SharedSecret });
        response.EnsureSuccessStatusCode();
        var result = await response.Content.ReadFromJsonAsync<RegisterDeviceResponse>();
        return (result!.DeviceId, result.Token);
    }

    private sealed record GetSyncEventsResponseBody(List<SyncEventDto> Events, int TotalCount, bool HasMore);
}
