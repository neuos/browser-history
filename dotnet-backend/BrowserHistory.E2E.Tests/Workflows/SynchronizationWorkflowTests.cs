using System.Net;
using System.Net.Http.Json;
using Microsoft.Extensions.DependencyInjection;
using FluentAssertions;
using BrowserHistory.E2E.Tests.Infrastructure;
using BrowserHistory.Api.DTOs;
using BrowserHistory.Application.Commands.Sync;
using BrowserHistory.Domain.Entities;
using BrowserHistory.Infrastructure.Data;

namespace BrowserHistory.E2E.Tests.Workflows;

/// <summary>
/// End-to-end tests for multi-device synchronization workflows.
/// Tests real-world scenarios where multiple devices sync browser history.
/// </summary>
[Collection("E2E Tests")]
public class SynchronizationWorkflowTests : IClassFixture<E2ETestWebApplicationFactory>
{
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

        // Register two devices
        var device1Response = await RegisterDevice("Chrome Desktop");
        var device2Response = await RegisterDevice("Firefox Mobile");
        
        var device1Id = device1Response.DeviceId;
        var device2Id = device2Response.DeviceId;

        // Act & Assert - Step 1: Device 1 uploads history
        var historyEntries = new[]
        {
            new UploadHistoryEntryDto
            {
                Id = Guid.NewGuid(),
                Url = "https://github.com",
                Title = "GitHub",
                VisitCount = 5,
                LastVisitTime = DateTime.UtcNow.AddHours(-2),
                LastVisitTimeUtc = DateTime.UtcNow.AddHours(-2),
                LastUpdated = DateTime.UtcNow.AddHours(-2)
            },
            new UploadHistoryEntryDto
            {
                Id = Guid.NewGuid(),
                Url = "https://stackoverflow.com",
                Title = "Stack Overflow",
                VisitCount = 3,
                LastVisitTime = DateTime.UtcNow.AddHours(-1),
                LastVisitTimeUtc = DateTime.UtcNow.AddHours(-1),
                LastUpdated = DateTime.UtcNow.AddHours(-1)
            }
        };

        var uploadRequest = new UploadHistoryCommand(device1Id, historyEntries);
        var uploadResponse = await _client.PostAsJsonAsync("/api/sync/upload", uploadRequest);
        uploadResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var uploadResult = await uploadResponse.Content.ReadFromJsonAsync<UploadHistoryResponse>();
        uploadResult!.ProcessedCount.Should().Be(2);
        uploadResult.SuccessCount.Should().Be(2);
        uploadResult.ErrorCount.Should().Be(0);

        // Step 2: Device 2 requests sync updates
        var syncResponse = await _client.GetAsync($"/api/sync/events?deviceId={device2Id}&since={DateTime.UtcNow.AddDays(-1):O}");
        syncResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var syncEvents = await syncResponse.Content.ReadFromJsonAsync<SyncEventDto[]>();
        syncEvents.Should().NotBeNull();
        syncEvents!.Should().HaveCount(2); // Two create events from device 1
        syncEvents.Should().AllSatisfy(e =>
        {
            e.DeviceId.Should().Be(device1Id);
            e.EventType.Should().Be("Create");
            e.EntityType.Should().Be("History");
        });

        // Step 3: Device 2 downloads history
        var downloadResponse = await _client.GetAsync($"/api/sync/download?deviceId={device2Id}&since={DateTime.UtcNow.AddDays(-1):O}");
        downloadResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var downloadResult = await downloadResponse.Content.ReadFromJsonAsync<DownloadHistoryResponse>();
        downloadResult!.Entries.Should().HaveCount(2);
        downloadResult.Entries.Should().Contain(e => e.Url == "https://github.com");
        downloadResult.Entries.Should().Contain(e => e.Url == "https://stackoverflow.com");

        // Step 4: Device 2 uploads its own history
        var device2History = new[]
        {
            new UploadHistoryEntryDto
            {
                Id = Guid.NewGuid(),
                Url = "https://reddit.com",
                Title = "Reddit",
                VisitCount = 1,
                LastVisitTime = DateTime.UtcNow.AddMinutes(-30),
                LastVisitTimeUtc = DateTime.UtcNow.AddMinutes(-30),
                LastUpdated = DateTime.UtcNow.AddMinutes(-30)
            }
        };

        var device2UploadRequest = new UploadHistoryCommand(device2Id, device2History);
        var device2UploadResponse = await _client.PostAsJsonAsync("/api/sync/upload", device2UploadRequest);
        device2UploadResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        // Step 5: Device 1 syncs to get device 2's history
        var device1SyncResponse = await _client.GetAsync($"/api/sync/download?deviceId={device1Id}&since={DateTime.UtcNow.AddMinutes(-45):O}");
        var device1Download = await device1SyncResponse.Content.ReadFromJsonAsync<DownloadHistoryResponse>();
        
        device1Download!.Entries.Should().HaveCount(3); // All entries from both devices
        device1Download.Entries.Should().Contain(e => e.Url == "https://reddit.com");

        // Verify complete sync state in database
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<BrowserHistoryDbContext>();
        
        var allHistory = context.HistoryNodes.ToList();
        allHistory.Should().HaveCount(3);
        
        var allSyncEvents = context.SyncEvents.ToList();
        allSyncEvents.Should().HaveCount(3); // 2 from device 1, 1 from device 2
    }

    [Fact]
    public async Task Incremental_Sync_Should_Only_Return_New_Changes()
    {
        // Arrange
        await _factory.ClearTestDataAsync();
        var deviceResponse = await RegisterDevice("Test Device");
        var deviceId = deviceResponse.DeviceId;

        var baselineTime = DateTime.UtcNow.AddHours(-2);

        // Upload initial history
        var initialHistory = new[]
        {
            new UploadHistoryEntryDto
            {
                Id = Guid.NewGuid(),
                Url = "https://example.com",
                Title = "Example",
                VisitCount = 1,
                LastVisitTime = baselineTime,
                LastVisitTimeUtc = baselineTime,
                LastUpdated = baselineTime
            }
        };

        await _client.PostAsJsonAsync("/api/sync/upload", new UploadHistoryCommand(deviceId, initialHistory));

        // Act - Add new history after baseline
        var newHistory = new[]
        {
            new UploadHistoryEntryDto
            {
                Id = Guid.NewGuid(),
                Url = "https://newsite.com",
                Title = "New Site",
                VisitCount = 1,
                LastVisitTime = DateTime.UtcNow.AddMinutes(-10),
                LastVisitTimeUtc = DateTime.UtcNow.AddMinutes(-10),
                LastUpdated = DateTime.UtcNow.AddMinutes(-10)
            }
        };

        await _client.PostAsJsonAsync("/api/sync/upload", new UploadHistoryCommand(deviceId, newHistory));

        // Request incremental sync since baseline
        var incrementalTime = DateTime.UtcNow.AddHours(-1);
        var syncResponse = await _client.GetAsync($"/api/sync/events?deviceId={deviceId}&since={incrementalTime:O}");
        var syncEvents = await syncResponse.Content.ReadFromJsonAsync<SyncEventDto[]>();

        // Assert - Only new changes returned
        syncEvents.Should().HaveCount(1);
        syncEvents![0].EntityData.Should().Contain("newsite.com");

        // Verify download also respects incremental sync
        var downloadResponse = await _client.GetAsync($"/api/sync/download?deviceId={deviceId}&since={incrementalTime:O}");
        var downloadResult = await downloadResponse.Content.ReadFromJsonAsync<DownloadHistoryResponse>();
        
        downloadResult!.Entries.Should().HaveCount(1);
        downloadResult.Entries[0].Url.Should().Be("https://newsite.com");
    }

    [Fact]
    public async Task Sync_With_Conflicting_Updates_Should_Use_Last_Writer_Wins()
    {
        // Arrange
        await _factory.ClearTestDataAsync();
        var device1Response = await RegisterDevice("Device 1");
        var device2Response = await RegisterDevice("Device 2");

        var sharedEntryId = Guid.NewGuid();
        var baseTime = DateTime.UtcNow.AddHours(-1);

        // Both devices upload same entry with different data
        var device1Entry = new UploadHistoryEntryDto
        {
            Id = sharedEntryId,
            Url = "https://shared.com",
            Title = "Device 1 Title",
            VisitCount = 5,
            LastVisitTime = baseTime,
            LastVisitTimeUtc = baseTime,
            LastUpdated = baseTime
        };

        var device2Entry = new UploadHistoryEntryDto
        {
            Id = sharedEntryId,
            Url = "https://shared.com",
            Title = "Device 2 Title", // Different title
            VisitCount = 3, // Different visit count
            LastVisitTime = baseTime.AddMinutes(30), // Later timestamp
            LastVisitTimeUtc = baseTime.AddMinutes(30),
            LastUpdated = baseTime.AddMinutes(30)
        };

        // Act - Upload from device 1 first
        await _client.PostAsJsonAsync("/api/sync/upload", 
            new UploadHistoryCommand(device1Response.DeviceId, new[] { device1Entry }));

        // Then upload from device 2 (later timestamp should win)
        await _client.PostAsJsonAsync("/api/sync/upload", 
            new UploadHistoryCommand(device2Response.DeviceId, new[] { device2Entry }));

        // Assert - Device 2's version should be the final state
        var downloadResponse = await _client.GetAsync($"/api/sync/download?deviceId={device1Response.DeviceId}&since={DateTime.UtcNow.AddDays(-1):O}");
        var downloadResult = await downloadResponse.Content.ReadFromJsonAsync<DownloadHistoryResponse>();

        var finalEntry = downloadResult!.Entries.Single(e => e.Id == sharedEntryId);
        finalEntry.Title.Should().Be("Device 2 Title");
        finalEntry.VisitCount.Should().Be(3);
        finalEntry.LastVisitTime.Should().BeCloseTo(baseTime.AddMinutes(30), TimeSpan.FromSeconds(1));
    }

    [Fact]
    public async Task Large_Batch_Sync_Should_Handle_Pagination()
    {
        // Arrange
        await _factory.ClearTestDataAsync();
        var deviceResponse = await RegisterDevice("Test Device");
        var deviceId = deviceResponse.DeviceId;

        // Create large batch of history entries (more than typical page size)
        var largeHistoryBatch = Enumerable.Range(0, 150)
            .Select(i => new UploadHistoryEntryDto
            {
                Id = Guid.NewGuid(),
                Url = $"https://site{i}.com",
                Title = $"Site {i}",
                VisitCount = 1,
                LastVisitTime = DateTime.UtcNow.AddMinutes(-i),
                LastVisitTimeUtc = DateTime.UtcNow.AddMinutes(-i),
                LastUpdated = DateTime.UtcNow.AddMinutes(-i)
            })
            .ToArray();

        // Act - Upload large batch
        var uploadResponse = await _client.PostAsJsonAsync("/api/sync/upload", 
            new UploadHistoryCommand(deviceId, largeHistoryBatch));
        uploadResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var uploadResult = await uploadResponse.Content.ReadFromJsonAsync<UploadHistoryResponse>();
        uploadResult!.ProcessedCount.Should().Be(150);
        uploadResult.SuccessCount.Should().Be(150);

        // Verify all entries can be downloaded
        var downloadResponse = await _client.GetAsync($"/api/sync/download?deviceId={deviceId}&since={DateTime.UtcNow.AddDays(-1):O}");
        var downloadResult = await downloadResponse.Content.ReadFromJsonAsync<DownloadHistoryResponse>();

        downloadResult!.Entries.Should().HaveCount(150);
        downloadResult.Entries.Should().OnlyHaveUniqueItems(e => e.Url);
    }

    [Fact]
    public async Task Sync_Events_Should_Maintain_Chronological_Order()
    {
        // Arrange
        await _factory.ClearTestDataAsync();
        var deviceResponse = await RegisterDevice("Test Device");
        var deviceId = deviceResponse.DeviceId;

        var baseTime = DateTime.UtcNow.AddHours(-1);

        // Upload entries with specific timestamps in non-chronological order
        var entries = new[]
        {
            new UploadHistoryEntryDto
            {
                Id = Guid.NewGuid(),
                Url = "https://third.com",
                Title = "Third",
                VisitCount = 1,
                LastVisitTime = baseTime.AddMinutes(30),
                LastVisitTimeUtc = baseTime.AddMinutes(30),
                LastUpdated = baseTime.AddMinutes(30)
            },
            new UploadHistoryEntryDto
            {
                Id = Guid.NewGuid(),
                Url = "https://first.com",
                Title = "First",
                VisitCount = 1,
                LastVisitTime = baseTime,
                LastVisitTimeUtc = baseTime,
                LastUpdated = baseTime
            },
            new UploadHistoryEntryDto
            {
                Id = Guid.NewGuid(),
                Url = "https://second.com",
                Title = "Second",
                VisitCount = 1,
                LastVisitTime = baseTime.AddMinutes(15),
                LastVisitTimeUtc = baseTime.AddMinutes(15),
                LastUpdated = baseTime.AddMinutes(15)
            }
        };

        await _client.PostAsJsonAsync("/api/sync/upload", new UploadHistoryCommand(deviceId, entries));

        // Act - Get sync events
        var syncResponse = await _client.GetAsync($"/api/sync/events?deviceId={deviceId}&since={DateTime.UtcNow.AddDays(-1):O}");
        var syncEvents = await syncResponse.Content.ReadFromJsonAsync<SyncEventDto[]>();

        // Assert - Events should be in chronological order by timestamp
        syncEvents.Should().HaveCount(3);
        syncEvents.Should().BeInAscendingOrder(e => e.Timestamp);
        
        // Verify the order matches our expected chronological sequence
        syncEvents[0].EntityData.Should().Contain("first.com");
        syncEvents[1].EntityData.Should().Contain("second.com");
        syncEvents[2].EntityData.Should().Contain("third.com");
    }

    private async Task<RegisterDeviceResponse> RegisterDevice(string deviceName)
    {
        var request = new RegisterDeviceCommand(deviceName);
        var response = await _client.PostAsJsonAsync("/api/devices/register", request);
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<RegisterDeviceResponse>())!;
    }
}
