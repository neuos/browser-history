using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using BrowserHistory.E2E.Tests.Infrastructure;
using BrowserHistory.Application.Features.Auth.Models;

namespace BrowserHistory.E2E.Tests.Workflows;

/// <summary>
/// End-to-end tests for the real-time (SSE) side of sync: /api/v1/sse/events. Connects a real
/// HttpClient to the streaming endpoint (HttpCompletionOption.ResponseHeadersRead, so the body
/// can be read incrementally against TestServer's in-process transport) and asserts what actually
/// arrives on the wire when another device submits a sync event.
/// </summary>
[Collection("E2E Tests")]
public class RealTimeSyncWorkflowTests : IClassFixture<E2ETestWebApplicationFactory>
{
    private const string SharedSecret = "your-shared-secret-for-device-registration";
    private static readonly TimeSpan SseWaitTimeout = TimeSpan.FromSeconds(10);

    private readonly E2ETestWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public RealTimeSyncWorkflowTests(E2ETestWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task SSE_Connection_Sends_Connected_Event_On_Open()
    {
        // Arrange
        await _factory.ClearTestDataAsync();
        var device = await RegisterDeviceAsync("SSE Device");

        // Act
        await using var sse = await ConnectSseAsync(device.Token);
        var firstMessage = await sse.ReadNextMessageAsync(SseWaitTimeout);

        // Assert
        firstMessage.GetProperty("type").GetString().Should().Be("connected");
        firstMessage.GetProperty("data").GetProperty("deviceId").GetString().Should().Be(device.DeviceId);
    }

    [Fact]
    public async Task SSE_Should_Notify_Connected_Device_Of_Sync_Event_From_Another_Device()
    {
        // Arrange
        await _factory.ClearTestDataAsync();
        var listener = await RegisterDeviceAsync("Listener Device");
        var sender = await RegisterDeviceAsync("Sender Device");

        await using var sse = await ConnectSseAsync(listener.Token);
        await sse.ReadNextMessageAsync(SseWaitTimeout); // "connected"

        var entityId = Guid.NewGuid().ToString();

        // Act
        await SubmitHistoryEventAsync(sender.Token, entityId, "https://realtime.example.com");
        var message = await sse.ReadNextMessageAsync(SseWaitTimeout);

        // Assert
        message.GetProperty("type").GetString().Should().Be("sync_batch");
        var events = message.GetProperty("data").GetProperty("events");
        events.GetArrayLength().Should().Be(1);
        var evt = events[0];
        evt.GetProperty("deviceId").GetString().Should().Be(sender.DeviceId);
        evt.GetProperty("entityType").GetString().Should().Be("history");
        evt.GetProperty("entityId").GetString().Should().Be(entityId);
        evt.GetProperty("data").GetProperty("url").GetString().Should().Be("https://realtime.example.com");
    }

    [Fact]
    public async Task SSE_Should_Not_Notify_Sender_Of_Its_Own_Sync_Event()
    {
        // Arrange
        await _factory.ClearTestDataAsync();
        var device = await RegisterDeviceAsync("Self Device");

        await using var sse = await ConnectSseAsync(device.Token);
        await sse.ReadNextMessageAsync(SseWaitTimeout); // "connected"

        // Act - device submits its own event while listening on its own SSE connection
        await SubmitHistoryEventAsync(device.Token, Guid.NewGuid().ToString(), "https://self.example.com");

        // A ping is expected eventually, but no sync_batch should ever arrive for this device's
        // own event. Give it a short, bounded window to prove absence rather than waiting forever.
        var sawSyncBatch = await sse.WaitForMessageMatchingAsync(
            m => m.GetProperty("type").GetString() == "sync_batch",
            TimeSpan.FromSeconds(2));

        // Assert
        sawSyncBatch.Should().BeFalse("a device should never receive its own sync events back over SSE");
    }

    [Fact]
    public async Task Multiple_Listening_Devices_Should_Each_Receive_Independent_Notifications()
    {
        // Arrange
        await _factory.ClearTestDataAsync();
        var listenerA = await RegisterDeviceAsync("Listener A");
        var listenerB = await RegisterDeviceAsync("Listener B");
        var sender = await RegisterDeviceAsync("Broadcaster");

        await using var sseA = await ConnectSseAsync(listenerA.Token);
        await using var sseB = await ConnectSseAsync(listenerB.Token);
        await sseA.ReadNextMessageAsync(SseWaitTimeout);
        await sseB.ReadNextMessageAsync(SseWaitTimeout);

        var entityId = Guid.NewGuid().ToString();

        // Act
        await SubmitHistoryEventAsync(sender.Token, entityId, "https://broadcast.example.com");

        var messageA = await sseA.ReadNextMessageAsync(SseWaitTimeout);
        var messageB = await sseB.ReadNextMessageAsync(SseWaitTimeout);

        // Assert - both independent listeners got it, each on their own connection
        foreach (var message in new[] { messageA, messageB })
        {
            message.GetProperty("type").GetString().Should().Be("sync_batch");
            message.GetProperty("data").GetProperty("events")[0].GetProperty("entityId").GetString()
                .Should().Be(entityId);
        }
    }

    [Fact]
    public async Task SSE_Without_Token_Should_Return_Unauthorized()
    {
        // Act
        var response = await _client.GetAsync("/api/v1/sse/events");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task SSE_With_Invalid_Token_Should_Return_Unauthorized()
    {
        // Act
        var response = await _client.GetAsync("/api/v1/sse/events?token=not-a-real-jwt");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    private async Task SubmitHistoryEventAsync(string token, string entityId, string url)
    {
        var payload = new
        {
            events = new[]
            {
                new
                {
                    id = Guid.NewGuid(),
                    timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
                    eventType = "CREATE",
                    entityType = "history",
                    entityId,
                    data = new { url }
                }
            }
        };

        var request = new HttpRequestMessage(HttpMethod.Post, "/api/v1/sync/events")
        {
            Content = JsonContent.Create(payload)
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var response = await _client.SendAsync(request);
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    private async Task<SseConnection> ConnectSseAsync(string token)
    {
        var client = _factory.CreateClient();
        var request = new HttpRequestMessage(HttpMethod.Get, $"/api/v1/sse/events?token={token}");
        var response = await client.SendAsync(request, HttpCompletionOption.ResponseHeadersRead);
        response.EnsureSuccessStatusCode();
        var stream = await response.Content.ReadAsStreamAsync();
        return new SseConnection(client, response, new StreamReader(stream));
    }

    private async Task<(string DeviceId, string Token)> RegisterDeviceAsync(string namePrefix)
    {
        var response = await _client.PostAsJsonAsync("/api/v1/auth/register-device",
            new { deviceName = $"{namePrefix}-{Guid.NewGuid()}", secret = SharedSecret });
        response.EnsureSuccessStatusCode();
        var result = await response.Content.ReadFromJsonAsync<RegisterDeviceResponse>();
        return (result!.DeviceId, result.Token);
    }

    /// <summary>
    /// Thin reader over a live "text/event-stream" response body: each SSE frame is a line
    /// prefixed "data: " followed by a JSON payload and a blank line.
    /// </summary>
    private sealed class SseConnection : IAsyncDisposable
    {
        private readonly HttpClient _client;
        private readonly HttpResponseMessage _response;
        private readonly StreamReader _reader;

        public SseConnection(HttpClient client, HttpResponseMessage response, StreamReader reader)
        {
            _client = client;
            _response = response;
            _reader = reader;
        }

        public async Task<JsonElement> ReadNextMessageAsync(TimeSpan timeout)
        {
            using var cts = new CancellationTokenSource(timeout);
            while (!cts.IsCancellationRequested)
            {
                var line = await _reader.ReadLineAsync(cts.Token);
                if (line is null)
                    throw new InvalidOperationException("SSE stream ended before a message arrived");

                if (line.StartsWith("data: ", StringComparison.Ordinal))
                {
                    return JsonSerializer.Deserialize<JsonElement>(line["data: ".Length..]);
                }
            }

            throw new TimeoutException($"No SSE message received within {timeout}");
        }

        public async Task<bool> WaitForMessageMatchingAsync(Func<JsonElement, bool> predicate, TimeSpan timeout)
        {
            using var cts = new CancellationTokenSource(timeout);
            try
            {
                while (true)
                {
                    var line = await _reader.ReadLineAsync(cts.Token);
                    if (line is null) return false;
                    if (!line.StartsWith("data: ", StringComparison.Ordinal)) continue;

                    var message = JsonSerializer.Deserialize<JsonElement>(line["data: ".Length..]);
                    if (predicate(message)) return true;
                }
            }
            catch (OperationCanceledException)
            {
                return false;
            }
        }

        public ValueTask DisposeAsync()
        {
            _reader.Dispose();
            _response.Dispose();
            _client.Dispose();
            return ValueTask.CompletedTask;
        }
    }
}
