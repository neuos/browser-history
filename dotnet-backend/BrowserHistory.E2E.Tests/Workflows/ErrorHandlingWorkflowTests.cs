using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using BrowserHistory.E2E.Tests.Infrastructure;
using BrowserHistory.Application.Features.Auth.Models;

namespace BrowserHistory.E2E.Tests.Workflows;

/// <summary>
/// End-to-end tests for error handling and edge cases against the real /api/v1/sync/events and
/// /api/v1/devices/register endpoints.
/// </summary>
[Collection("E2E Tests")]
public class ErrorHandlingWorkflowTests : IClassFixture<E2ETestWebApplicationFactory>
{
    private const string SharedSecret = "your-shared-secret-for-device-registration";

    private readonly E2ETestWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public ErrorHandlingWorkflowTests(E2ETestWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Submit_With_Invalid_EntityType_Should_Return_BadRequest()
    {
        // Arrange
        await _factory.ClearTestDataAsync();
        var (_, token) = await RegisterDeviceAsync();

        var payload = new
        {
            events = new[]
            {
                new
                {
                    id = Guid.NewGuid(),
                    timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
                    eventType = "CREATE",
                    entityType = "not-a-real-entity-type",
                    entityId = "https://example.com",
                    data = new { url = "https://example.com" }
                }
            }
        };

        // Act
        var response = await AuthorizedPostAsync("/api/v1/sync/events", payload, token);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Submit_With_Invalid_EventType_Should_Return_BadRequest()
    {
        // Arrange
        await _factory.ClearTestDataAsync();
        var (_, token) = await RegisterDeviceAsync();

        var payload = new
        {
            events = new[]
            {
                new
                {
                    id = Guid.NewGuid(),
                    timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
                    eventType = "EXPLODE",
                    entityType = "history",
                    entityId = Guid.NewGuid().ToString(),
                    data = new { url = "https://example.com" }
                }
            }
        };

        // Act
        var response = await AuthorizedPostAsync("/api/v1/sync/events", payload, token);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Submit_With_Missing_EntityId_Should_Return_BadRequest()
    {
        // Arrange
        await _factory.ClearTestDataAsync();
        var (_, token) = await RegisterDeviceAsync();

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
                    entityId = "",
                    data = new { url = "https://example.com" }
                }
            }
        };

        // Act
        var response = await AuthorizedPostAsync("/api/v1/sync/events", payload, token);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Submit_Large_Batch_Should_Succeed()
    {
        // Arrange
        await _factory.ClearTestDataAsync();
        var (_, token) = await RegisterDeviceAsync();

        var events = Enumerable.Range(0, 200).Select(i => new
        {
            id = Guid.NewGuid(),
            timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
            eventType = "CREATE",
            entityType = "history",
            entityId = Guid.NewGuid().ToString(),
            data = new { url = $"https://site{i}.example.com" }
        }).ToArray();

        // Act
        var response = await AuthorizedPostAsync("/api/v1/sync/events", new { events }, token);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await response.Content.ReadFromJsonAsync<JsonElement>();
        result.GetProperty("processedCount").GetInt32().Should().Be(200);
    }

    [Fact]
    public async Task Concurrent_Submits_From_Same_Device_Should_All_Succeed()
    {
        // Arrange
        await _factory.ClearTestDataAsync();
        var (_, token) = await RegisterDeviceAsync();

        // Act - fire 20 independent single-event submissions concurrently
        var tasks = Enumerable.Range(0, 20).Select(async i =>
        {
            using var client = _factory.CreateClient();
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
                        entityId = Guid.NewGuid().ToString(),
                        data = new { url = $"https://concurrent{i}.example.com" }
                    }
                }
            };
            return await AuthorizedPostAsync("/api/v1/sync/events", payload, token, client);
        });

        var responses = await Task.WhenAll(tasks);

        // Assert - no lost updates / race-condition failures
        responses.Should().AllSatisfy(r => r.StatusCode.Should().Be(HttpStatusCode.OK));
    }

    [Fact]
    public async Task Resubmitting_Same_Event_Id_Should_Report_Conflict_Not_Duplicate()
    {
        // Arrange
        await _factory.ClearTestDataAsync();
        var (_, token) = await RegisterDeviceAsync();
        var eventId = Guid.NewGuid();
        var payload = new
        {
            events = new[]
            {
                new
                {
                    id = eventId,
                    timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
                    eventType = "CREATE",
                    entityType = "history",
                    entityId = Guid.NewGuid().ToString(),
                    data = new { url = "https://example.com/dup" }
                }
            }
        };

        // Act - submit the same event id twice
        var firstResponse = await AuthorizedPostAsync("/api/v1/sync/events", payload, token);
        var secondResponse = await AuthorizedPostAsync("/api/v1/sync/events", payload, token);

        // Assert
        firstResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var firstResult = await firstResponse.Content.ReadFromJsonAsync<JsonElement>();
        firstResult.GetProperty("processedCount").GetInt32().Should().Be(1);

        secondResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var secondResult = await secondResponse.Content.ReadFromJsonAsync<JsonElement>();
        secondResult.GetProperty("processedCount").GetInt32().Should().Be(0);
        secondResult.GetProperty("conflicts").EnumerateArray()
            .Should().ContainSingle(c => c.GetString() == eventId.ToString());
    }

    [Fact]
    public async Task Malformed_Request_Bodies_Should_Return_BadRequest()
    {
        // Arrange
        await _factory.ClearTestDataAsync();
        var (_, token) = await RegisterDeviceAsync();

        var malformedBodies = new[] { "{ invalid json", "null", "[]", "{}" };

        foreach (var body in malformedBodies)
        {
            var request = new HttpRequestMessage(HttpMethod.Post, "/api/v1/sync/events")
            {
                Content = new StringContent(body, System.Text.Encoding.UTF8, "application/json")
            };
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

            // Act
            var response = await _client.SendAsync(request);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest, $"body '{body}' should be rejected");
        }
    }

    [Fact]
    public async Task Submit_Without_Authorization_Should_Return_Unauthorized()
    {
        // Arrange
        await _factory.ClearTestDataAsync();
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
                    entityId = Guid.NewGuid().ToString(),
                    data = new { url = "https://example.com" }
                }
            }
        };

        // Act - no Authorization header at all
        var response = await _client.PostAsJsonAsync("/api/v1/sync/events", payload);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Global_Rate_Limit_Should_Eventually_Return_TooManyRequests()
    {
        // Arrange - the global limiter allows 100 requests/minute + a queue of 10 per partition;
        // anonymous TestServer requests all share one partition (no device claim, fixed "IP").
        // 150 concurrent requests should be enough to see at least one 429.
        var requests = Enumerable.Range(0, 150).Select(async _ =>
        {
            using var client = _factory.CreateClient();
            return await client.GetAsync("/health");
        });

        // Act
        var responses = await Task.WhenAll(requests);

        // Assert
        var statusCodes = responses.Select(r => r.StatusCode).ToArray();
        statusCodes.Should().Contain(HttpStatusCode.OK);
        statusCodes.Should().Contain(HttpStatusCode.TooManyRequests);
    }

    private async Task<(string DeviceId, string Token)> RegisterDeviceAsync()
    {
        var response = await _client.PostAsJsonAsync("/api/v1/auth/register-device",
            new { deviceName = $"Error-Handling-Test-Device-{Guid.NewGuid()}", secret = SharedSecret });
        response.EnsureSuccessStatusCode();
        var result = await response.Content.ReadFromJsonAsync<RegisterDeviceResponse>();
        return (result!.DeviceId, result.Token);
    }

    private async Task<HttpResponseMessage> AuthorizedPostAsync(string url, object payload, string token, HttpClient? client = null)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = JsonContent.Create(payload)
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return await (client ?? _client).SendAsync(request);
    }
}
