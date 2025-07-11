using System.Net;
using System.Net.Http.Json;
using System.Text;
using Microsoft.Extensions.DependencyInjection;
using FluentAssertions;
using BrowserHistory.E2E.Tests.Infrastructure;
using BrowserHistory.Api.DTOs;
using BrowserHistory.Application.Commands.Devices;
using BrowserHistory.Application.Commands.Sync;

namespace BrowserHistory.E2E.Tests.Workflows;

/// <summary>
/// End-to-end tests for real-time synchronization using Server-Sent Events (SSE).
/// Tests bidirectional real-time sync scenarios between multiple devices.
/// </summary>
[Collection("E2E Tests")]
public class RealTimeSyncWorkflowTests : IClassFixture<E2ETestWebApplicationFactory>
{
    private readonly E2ETestWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public RealTimeSyncWorkflowTests(E2ETestWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Real_Time_Sync_Should_Notify_Connected_Devices()
    {
        // Arrange
        await _factory.ClearTestDataAsync();
        
        var device1Response = await RegisterDevice("Device 1");
        var device2Response = await RegisterDevice("Device 2");

        var device1Id = device1Response.DeviceId;
        var device2Id = device2Response.DeviceId;

        var syncNotificationReceived = new TaskCompletionSource<bool>();
        var receivedEvents = new List<string>();

        // Act - Device 2 connects to SSE stream
        using var sseClient = _factory.CreateClient();
        var sseRequest = new HttpRequestMessage(HttpMethod.Get, $"/api/sync/events/stream?deviceId={device2Id}");
        sseRequest.Headers.Add("Accept", "text/event-stream");
        sseRequest.Headers.Add("Cache-Control", "no-cache");

        var sseResponse = await sseClient.SendAsync(sseRequest, HttpCompletionOption.ResponseHeadersRead);
        sseResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        sseResponse.Content.Headers.ContentType?.MediaType.Should().Be("text/event-stream");

        // Start reading SSE stream in background
        var streamReadingTask = Task.Run(async () =>
        {
            using var stream = await sseResponse.Content.ReadAsStreamAsync();
            using var reader = new StreamReader(stream, Encoding.UTF8);
            
            string? line;
            var eventBuilder = new StringBuilder();
            
            while ((line = await reader.ReadLineAsync()) != null)
            {
                if (string.IsNullOrEmpty(line))
                {
                    // Empty line indicates end of event
                    if (eventBuilder.Length > 0)
                    {
                        var eventData = eventBuilder.ToString();
                        receivedEvents.Add(eventData);
                        
                        if (eventData.Contains("github.com"))
                        {
                            syncNotificationReceived.SetResult(true);
                            break;
                        }
                        
                        eventBuilder.Clear();
                    }
                }
                else
                {
                    eventBuilder.AppendLine(line);
                }
            }
        });

        // Wait a moment for SSE connection to establish
        await Task.Delay(100);

        // Device 1 uploads new history (should trigger real-time notification to Device 2)
        var historyEntry = new UploadHistoryEntryDto
        {
            Id = Guid.NewGuid(),
            Url = "https://github.com",
            Title = "GitHub",
            VisitCount = 1,
            LastVisitTime = DateTime.UtcNow,
            LastVisitTimeUtc = DateTime.UtcNow,
            LastUpdated = DateTime.UtcNow
        };

        var uploadRequest = new UploadHistoryCommand(device1Id, new[] { historyEntry });
        var uploadResponse = await _client.PostAsJsonAsync("/api/sync/upload", uploadRequest);
        uploadResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        // Assert - Device 2 should receive real-time notification
        var notificationReceived = await Task.WhenAny(
            syncNotificationReceived.Task,
            Task.Delay(TimeSpan.FromSeconds(10))
        );

        notificationReceived.Should().Be(syncNotificationReceived.Task);
        syncNotificationReceived.Task.Result.Should().BeTrue();

        receivedEvents.Should().NotBeEmpty();
        var lastEvent = receivedEvents.Last();
        lastEvent.Should().Contain("github.com");
        lastEvent.Should().Contain("Create");
        lastEvent.Should().Contain("History");
    }

    [Fact]
    public async Task SSE_Connection_Should_Handle_Device_Reconnection()
    {
        // Arrange
        await _factory.ClearTestDataAsync();
        var deviceResponse = await RegisterDevice("Test Device");
        var deviceId = deviceResponse.DeviceId;

        // Act - Initial SSE connection
        using var firstClient = _factory.CreateClient();
        var firstRequest = new HttpRequestMessage(HttpMethod.Get, $"/api/sync/events/stream?deviceId={deviceId}");
        firstRequest.Headers.Add("Accept", "text/event-stream");

        var firstResponse = await firstClient.SendAsync(firstRequest, HttpCompletionOption.ResponseHeadersRead);
        firstResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        // Simulate disconnection by disposing client
        firstClient.Dispose();

        // Reconnect with new client
        using var secondClient = _factory.CreateClient();
        var secondRequest = new HttpRequestMessage(HttpMethod.Get, $"/api/sync/events/stream?deviceId={deviceId}");
        secondRequest.Headers.Add("Accept", "text/event-stream");

        var secondResponse = await secondClient.SendAsync(secondRequest, HttpCompletionOption.ResponseHeadersRead);

        // Assert - Reconnection should succeed
        secondResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        secondResponse.Content.Headers.ContentType?.MediaType.Should().Be("text/event-stream");
    }

    [Fact]
    public async Task SSE_Should_Only_Notify_Changes_From_Other_Devices()
    {
        // Arrange
        await _factory.ClearTestDataAsync();
        var deviceResponse = await RegisterDevice("Test Device");
        var deviceId = deviceResponse.DeviceId;

        var eventReceived = new TaskCompletionSource<bool>();
        var receivedEvents = new List<string>();

        // Device connects to its own SSE stream
        using var sseClient = _factory.CreateClient();
        var sseRequest = new HttpRequestMessage(HttpMethod.Get, $"/api/sync/events/stream?deviceId={deviceId}");
        sseRequest.Headers.Add("Accept", "text/event-stream");

        var sseResponse = await sseClient.SendAsync(sseRequest, HttpCompletionOption.ResponseHeadersRead);

        // Start reading SSE stream
        var streamReadingTask = Task.Run(async () =>
        {
            using var stream = await sseResponse.Content.ReadAsStreamAsync();
            using var reader = new StreamReader(stream, Encoding.UTF8);
            
            // Set a timeout for reading
            var timeoutCts = new CancellationTokenSource(TimeSpan.FromSeconds(3));
            
            try
            {
                string? line;
                while ((line = await reader.ReadLineAsync()) != null && !timeoutCts.Token.IsCancellationRequested)
                {
                    if (!string.IsNullOrEmpty(line))
                    {
                        receivedEvents.Add(line);
                        eventReceived.SetResult(true);
                    }
                }
            }
            catch (OperationCanceledException)
            {
                // Expected timeout
            }
        });

        // Wait for stream to be established
        await Task.Delay(100);

        // Act - Device uploads its own history (should NOT receive notification)
        var historyEntry = new UploadHistoryEntryDto
        {
            Id = Guid.NewGuid(),
            Url = "https://self-upload.com",
            Title = "Self Upload",
            VisitCount = 1,
            LastVisitTime = DateTime.UtcNow,
            LastVisitTimeUtc = DateTime.UtcNow,
            LastUpdated = DateTime.UtcNow
        };

        var uploadRequest = new UploadHistoryCommand(deviceId, new[] { historyEntry });
        await _client.PostAsJsonAsync("/api/sync/upload", uploadRequest);

        // Wait to see if any events are received (there shouldn't be any)
        var completedTask = await Task.WhenAny(
            eventReceived.Task,
            Task.Delay(TimeSpan.FromSeconds(2))
        );

        // Assert - Device should NOT receive notifications for its own changes
        completedTask.Should().NotBe(eventReceived.Task);
        receivedEvents.Should().BeEmpty();
    }

    [Fact]
    public async Task Multiple_Devices_SSE_Should_Receive_Independent_Notifications()
    {
        // Arrange
        await _factory.ClearTestDataAsync();
        
        var device1Response = await RegisterDevice("Device 1");
        var device2Response = await RegisterDevice("Device 2");
        var device3Response = await RegisterDevice("Device 3");

        var device1Id = device1Response.DeviceId;
        var device2Id = device2Response.DeviceId;
        var device3Id = device3Response.DeviceId;

        var device2Notification = new TaskCompletionSource<bool>();
        var device3Notification = new TaskCompletionSource<bool>();

        // Device 2 connects to SSE
        using var device2Client = _factory.CreateClient();
        var device2Request = new HttpRequestMessage(HttpMethod.Get, $"/api/sync/events/stream?deviceId={device2Id}");
        device2Request.Headers.Add("Accept", "text/event-stream");
        var device2Response = await device2Client.SendAsync(device2Request, HttpCompletionOption.ResponseHeadersRead);

        // Device 3 connects to SSE
        using var device3Client = _factory.CreateClient();
        var device3Request = new HttpRequestMessage(HttpMethod.Get, $"/api/sync/events/stream?deviceId={device3Id}");
        device3Request.Headers.Add("Accept", "text/event-stream");
        var device3ResponseMessage = await device3Client.SendAsync(device3Request, HttpCompletionOption.ResponseHeadersRead);

        // Start monitoring both streams
        var device2Task = MonitorSSEStream(device2Response, device2Notification, "github.com");
        var device3Task = MonitorSSEStream(device3ResponseMessage, device3Notification, "github.com");

        // Wait for connections to establish
        await Task.Delay(100);

        // Act - Device 1 uploads history
        var historyEntry = new UploadHistoryEntryDto
        {
            Id = Guid.NewGuid(),
            Url = "https://github.com",
            Title = "GitHub",
            VisitCount = 1,
            LastVisitTime = DateTime.UtcNow,
            LastVisitTimeUtc = DateTime.UtcNow,
            LastUpdated = DateTime.UtcNow
        };

        var uploadRequest = new UploadHistoryCommand(device1Id, new[] { historyEntry });
        await _client.PostAsJsonAsync("/api/sync/upload", uploadRequest);

        // Assert - Both devices should receive notifications
        var device2Notified = await Task.WhenAny(device2Notification.Task, Task.Delay(TimeSpan.FromSeconds(5)));
        var device3Notified = await Task.WhenAny(device3Notification.Task, Task.Delay(TimeSpan.FromSeconds(5)));

        device2Notified.Should().Be(device2Notification.Task);
        device3Notified.Should().Be(device3Notification.Task);
        
        device2Notification.Task.Result.Should().BeTrue();
        device3Notification.Task.Result.Should().BeTrue();
    }

    [Fact]
    public async Task SSE_Should_Handle_Invalid_Device_Id()
    {
        // Arrange
        var invalidDeviceId = Guid.NewGuid();

        // Act
        using var client = _factory.CreateClient();
        var request = new HttpRequestMessage(HttpMethod.Get, $"/api/sync/events/stream?deviceId={invalidDeviceId}");
        request.Headers.Add("Accept", "text/event-stream");

        var response = await client.SendAsync(request, HttpCompletionOption.ResponseHeadersRead);

        // Assert - Should handle invalid device gracefully
        // The exact behavior depends on implementation - could be 404, 400, or empty stream
        response.StatusCode.Should().BeOneOf(HttpStatusCode.NotFound, HttpStatusCode.BadRequest, HttpStatusCode.OK);
    }

    private async Task MonitorSSEStream(HttpResponseMessage response, TaskCompletionSource<bool> completionSource, string searchTerm)
    {
        try
        {
            using var stream = await response.Content.ReadAsStreamAsync();
            using var reader = new StreamReader(stream, Encoding.UTF8);
            
            var timeoutCts = new CancellationTokenSource(TimeSpan.FromSeconds(10));
            
            string? line;
            while ((line = await reader.ReadLineAsync()) != null && !timeoutCts.Token.IsCancellationRequested)
            {
                if (!string.IsNullOrEmpty(line) && line.Contains(searchTerm))
                {
                    completionSource.SetResult(true);
                    return;
                }
            }
        }
        catch (Exception ex)
        {
            completionSource.SetException(ex);
        }
    }

    private async Task<RegisterDeviceResponse> RegisterDevice(string deviceName)
    {
        var request = new RegisterDeviceCommand(deviceName);
        var response = await _client.PostAsJsonAsync("/api/devices/register", request);
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<RegisterDeviceResponse>())!;
    }
}
