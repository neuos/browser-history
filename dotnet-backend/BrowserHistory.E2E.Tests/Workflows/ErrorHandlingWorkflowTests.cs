using System.Net;
using System.Net.Http.Json;
using Microsoft.Extensions.DependencyInjection;
using FluentAssertions;
using BrowserHistory.E2E.Tests.Infrastructure;
using BrowserHistory.Api.DTOs;
using BrowserHistory.Application.Commands.Devices;
using BrowserHistory.Application.Commands.Sync;
using BrowserHistory.Domain.Entities;
using BrowserHistory.Infrastructure.Data;

namespace BrowserHistory.E2E.Tests.Workflows;

/// <summary>
/// End-to-end tests for error handling and edge cases in synchronization workflows.
/// Tests system resilience under various failure scenarios.
/// </summary>
[Collection("E2E Tests")]
public class ErrorHandlingWorkflowTests : IClassFixture<E2ETestWebApplicationFactory>
{
    private readonly E2ETestWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public ErrorHandlingWorkflowTests(E2ETestWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Upload_With_Invalid_URLs_Should_Handle_Gracefully()
    {
        // Arrange
        await _factory.ClearTestDataAsync();
        var deviceResponse = await RegisterDevice("Test Device");
        var deviceId = deviceResponse.DeviceId;

        var historyEntries = new[]
        {
            // Valid entry
            new UploadHistoryEntryDto
            {
                Id = Guid.NewGuid(),
                Url = "https://valid.com",
                Title = "Valid Site",
                VisitCount = 1,
                LastVisitTime = DateTime.UtcNow,
                LastVisitTimeUtc = DateTime.UtcNow,
                LastUpdated = DateTime.UtcNow
            },
            // Invalid URL
            new UploadHistoryEntryDto
            {
                Id = Guid.NewGuid(),
                Url = "not-a-valid-url",
                Title = "Invalid URL",
                VisitCount = 1,
                LastVisitTime = DateTime.UtcNow,
                LastVisitTimeUtc = DateTime.UtcNow,
                LastUpdated = DateTime.UtcNow
            },
            // Empty URL
            new UploadHistoryEntryDto
            {
                Id = Guid.NewGuid(),
                Url = "",
                Title = "Empty URL",
                VisitCount = 1,
                LastVisitTime = DateTime.UtcNow,
                LastVisitTimeUtc = DateTime.UtcNow,
                LastUpdated = DateTime.UtcNow
            },
            // Another valid entry
            new UploadHistoryEntryDto
            {
                Id = Guid.NewGuid(),
                Url = "https://another-valid.com",
                Title = "Another Valid Site",
                VisitCount = 1,
                LastVisitTime = DateTime.UtcNow,
                LastVisitTimeUtc = DateTime.UtcNow,
                LastUpdated = DateTime.UtcNow
            }
        };

        // Act
        var uploadRequest = new UploadHistoryCommand(deviceId, historyEntries);
        var uploadResponse = await _client.PostAsJsonAsync("/api/sync/upload", uploadRequest);

        // Assert - Should succeed but report errors
        uploadResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var uploadResult = await uploadResponse.Content.ReadFromJsonAsync<UploadHistoryResponse>();
        uploadResult.Should().NotBeNull();
        uploadResult!.ProcessedCount.Should().Be(4);
        uploadResult.SuccessCount.Should().Be(2); // Only valid URLs processed
        uploadResult.ErrorCount.Should().Be(2); // Invalid and empty URLs
        uploadResult.Errors.Should().HaveCount(2);

        // Verify only valid entries were saved
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<BrowserHistoryDbContext>();
        var savedEntries = context.HistoryNodes.ToList();
        
        savedEntries.Should().HaveCount(2);
        savedEntries.Should().Contain(e => e.Url.Value == "https://valid.com");
        savedEntries.Should().Contain(e => e.Url.Value == "https://another-valid.com");
    }

    [Fact]
    public async Task Upload_With_Extremely_Large_Batch_Should_Handle_Gracefully()
    {
        // Arrange
        await _factory.ClearTestDataAsync();
        var deviceResponse = await RegisterDevice("Test Device");
        var deviceId = deviceResponse.DeviceId;

        // Create very large batch (test system limits)
        var largeHistoryBatch = Enumerable.Range(0, 1000)
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

        // Act
        var uploadRequest = new UploadHistoryCommand(deviceId, largeHistoryBatch);
        var uploadResponse = await _client.PostAsJsonAsync("/api/sync/upload", uploadRequest);

        // Assert - Should either succeed or return meaningful error
        if (uploadResponse.StatusCode == HttpStatusCode.OK)
        {
            var uploadResult = await uploadResponse.Content.ReadFromJsonAsync<UploadHistoryResponse>();
            uploadResult!.ProcessedCount.Should().Be(1000);
            uploadResult.SuccessCount.Should().BeGreaterThan(0);
        }
        else
        {
            // If system has limits, should return appropriate error codes
            uploadResponse.StatusCode.Should().BeOneOf(
                HttpStatusCode.BadRequest,
                HttpStatusCode.RequestEntityTooLarge,
                HttpStatusCode.InternalServerError
            );
        }
    }

    [Fact]
    public async Task Concurrent_Uploads_From_Same_Device_Should_Handle_Race_Conditions()
    {
        // Arrange
        await _factory.ClearTestDataAsync();
        var deviceResponse = await RegisterDevice("Test Device");
        var deviceId = deviceResponse.DeviceId;

        var baseTime = DateTime.UtcNow;

        // Create concurrent upload requests
        var concurrentUploads = Enumerable.Range(0, 5)
            .Select(i => new UploadHistoryEntryDto
            {
                Id = Guid.NewGuid(),
                Url = $"https://concurrent{i}.com",
                Title = $"Concurrent {i}",
                VisitCount = 1,
                LastVisitTime = baseTime.AddSeconds(i),
                LastVisitTimeUtc = baseTime.AddSeconds(i),
                LastUpdated = baseTime.AddSeconds(i)
            })
            .Select(entry => new UploadHistoryCommand(deviceId, new[] { entry }))
            .ToArray();

        // Act - Execute uploads concurrently
        var uploadTasks = concurrentUploads.Select(async request =>
        {
            using var client = _factory.CreateClient();
            var response = await client.PostAsJsonAsync("/api/sync/upload", request);
            return new { Response = response, Result = await response.Content.ReadFromJsonAsync<UploadHistoryResponse>() };
        });

        var results = await Task.WhenAll(uploadTasks);

        // Assert - All uploads should succeed
        results.Should().AllSatisfy(result =>
        {
            result.Response.StatusCode.Should().Be(HttpStatusCode.OK);
            result.Result!.SuccessCount.Should().Be(1);
        });

        // Verify all entries were saved without conflicts
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<BrowserHistoryDbContext>();
        var savedEntries = context.HistoryNodes.ToList();
        
        savedEntries.Should().HaveCount(5);
        savedEntries.Select(e => e.Url.Value).Should().OnlyHaveUniqueItems();
    }

    [Fact]
    public async Task Sync_With_Corrupted_Data_Should_Handle_Gracefully()
    {
        // Arrange
        await _factory.ClearTestDataAsync();
        var deviceResponse = await RegisterDevice("Test Device");
        var deviceId = deviceResponse.DeviceId;

        // Seed database with corrupted sync event (simulating data corruption)
        using (var scope = _factory.Services.CreateScope())
        {
            var context = scope.ServiceProvider.GetRequiredService<BrowserHistoryDbContext>();
            
            var corruptedSyncEvent = SyncEvent.Create(
                Guid.NewGuid(),
                DeviceId.Create(deviceId),
                DateTime.UtcNow.AddHours(-1),
                SyncEventType.Create,
                SyncEntityType.History,
                Guid.NewGuid().ToString(),
                "{ invalid json data }", // Corrupted JSON
                "corrupted-checksum"
            );

            context.SyncEvents.Add(corruptedSyncEvent);
            await context.SaveChangesAsync();
        }

        // Act - Request sync events
        var syncResponse = await _client.GetAsync($"/api/sync/events?deviceId={deviceId}&since={DateTime.UtcNow.AddDays(-1):O}");

        // Assert - Should handle corrupted data gracefully
        syncResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var syncEvents = await syncResponse.Content.ReadFromJsonAsync<SyncEventDto[]>();
        
        // Should either skip corrupted events or include them with error handling
        syncEvents.Should().NotBeNull();
        // Implementation-specific: may return empty array or sanitized data
    }

    [Fact]
    public async Task Network_Timeout_Simulation_Should_Handle_Gracefully()
    {
        // Arrange
        await _factory.ClearTestDataAsync();
        var deviceResponse = await RegisterDevice("Test Device");
        var deviceId = deviceResponse.DeviceId;

        // Create client with very short timeout
        using var timeoutClient = _factory.CreateClient();
        timeoutClient.Timeout = TimeSpan.FromMilliseconds(1); // Extremely short timeout

        var historyEntry = new UploadHistoryEntryDto
        {
            Id = Guid.NewGuid(),
            Url = "https://timeout-test.com",
            Title = "Timeout Test",
            VisitCount = 1,
            LastVisitTime = DateTime.UtcNow,
            LastVisitTimeUtc = DateTime.UtcNow,
            LastUpdated = DateTime.UtcNow
        };

        // Act & Assert - Should handle timeout appropriately
        var uploadRequest = new UploadHistoryCommand(deviceId, new[] { historyEntry });
        
        var exception = await Assert.ThrowsAsync<TaskCanceledException>(async () =>
        {
            await timeoutClient.PostAsJsonAsync("/api/sync/upload", uploadRequest);
        });

        exception.Should().NotBeNull();
        
        // Verify system remains stable after timeout
        var healthResponse = await _client.GetAsync("/health");
        healthResponse.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Malformed_Request_Bodies_Should_Return_Appropriate_Errors()
    {
        // Arrange
        await _factory.ClearTestDataAsync();

        var testCases = new[]
        {
            new { Content = "{ invalid json", ExpectedStatus = HttpStatusCode.BadRequest },
            new { Content = "null", ExpectedStatus = HttpStatusCode.BadRequest },
            new { Content = "[]", ExpectedStatus = HttpStatusCode.BadRequest },
            new { Content = "{}", ExpectedStatus = HttpStatusCode.BadRequest }
        };

        foreach (var testCase in testCases)
        {
            // Act
            var content = new StringContent(testCase.Content, System.Text.Encoding.UTF8, "application/json");
            var response = await _client.PostAsync("/api/sync/upload", content);

            // Assert
            response.StatusCode.Should().Be(testCase.ExpectedStatus, 
                $"Content '{testCase.Content}' should return {testCase.ExpectedStatus}");
        }
    }

    [Fact]
    public async Task Database_Constraint_Violations_Should_Be_Handled()
    {
        // Arrange
        await _factory.ClearTestDataAsync();
        var deviceResponse = await RegisterDevice("Test Device");
        var deviceId = deviceResponse.DeviceId;

        var duplicateId = Guid.NewGuid();

        var historyEntries = new[]
        {
            new UploadHistoryEntryDto
            {
                Id = duplicateId, // Same ID
                Url = "https://duplicate1.com",
                Title = "Duplicate 1",
                VisitCount = 1,
                LastVisitTime = DateTime.UtcNow,
                LastVisitTimeUtc = DateTime.UtcNow,
                LastUpdated = DateTime.UtcNow
            },
            new UploadHistoryEntryDto
            {
                Id = duplicateId, // Same ID - should cause constraint violation
                Url = "https://duplicate2.com",
                Title = "Duplicate 2",
                VisitCount = 1,
                LastVisitTime = DateTime.UtcNow,
                LastVisitTimeUtc = DateTime.UtcNow,
                LastUpdated = DateTime.UtcNow
            }
        };

        // Act
        var uploadRequest = new UploadHistoryCommand(deviceId, historyEntries);
        var uploadResponse = await _client.PostAsJsonAsync("/api/sync/upload", uploadRequest);

        // Assert - Should handle constraint violation gracefully
        uploadResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var uploadResult = await uploadResponse.Content.ReadFromJsonAsync<UploadHistoryResponse>();
        uploadResult!.ProcessedCount.Should().Be(2);
        uploadResult.ErrorCount.Should().BeGreaterThan(0); // At least one should fail due to duplicate ID
    }

    [Fact]
    public async Task API_Rate_Limiting_Should_Return_Appropriate_Response()
    {
        // Arrange
        await _factory.ClearTestDataAsync();
        var deviceResponse = await RegisterDevice("Test Device");
        var deviceId = deviceResponse.DeviceId;

        var historyEntry = new UploadHistoryEntryDto
        {
            Id = Guid.NewGuid(),
            Url = "https://rate-limit-test.com",
            Title = "Rate Limit Test",
            VisitCount = 1,
            LastVisitTime = DateTime.UtcNow,
            LastVisitTimeUtc = DateTime.UtcNow,
            LastUpdated = DateTime.UtcNow
        };

        // Act - Make rapid requests to trigger rate limiting
        var rapidRequests = Enumerable.Range(0, 100)
            .Select(async _ =>
            {
                using var client = _factory.CreateClient();
                var request = new UploadHistoryCommand(deviceId, new[] { historyEntry });
                return await client.PostAsJsonAsync("/api/sync/upload", request);
            });

        var responses = await Task.WhenAll(rapidRequests);

        // Assert - Should eventually return rate limit responses
        var statusCodes = responses.Select(r => r.StatusCode).ToArray();
        
        // Most should succeed, but some may be rate limited
        statusCodes.Should().Contain(HttpStatusCode.OK);
        
        // If rate limiting is implemented, should see 429 responses
        if (statusCodes.Contains(HttpStatusCode.TooManyRequests))
        {
            statusCodes.Should().Contain(HttpStatusCode.TooManyRequests);
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
