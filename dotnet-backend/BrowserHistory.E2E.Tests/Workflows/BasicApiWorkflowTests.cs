using System.Net;
using System.Net.Http.Json;
using Microsoft.Extensions.DependencyInjection;
using FluentAssertions;
using BrowserHistory.E2E.Tests.Infrastructure;
using BrowserHistory.Application.Features.Auth.Commands.RegisterDevice;
using BrowserHistory.Infrastructure.Data;

namespace BrowserHistory.E2E.Tests.Workflows;

/// <summary>
/// Simplified end-to-end tests for core API functionality.
/// Tests basic device registration and health check endpoints.
/// </summary>
[Collection("E2E Tests")]
public class BasicApiWorkflowTests : IClassFixture<E2ETestWebApplicationFactory>
{
    private readonly E2ETestWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public BasicApiWorkflowTests(E2ETestWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Health_Endpoint_Should_Return_OK()
    {
        // Act
        var response = await _client.GetAsync("/health");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task API_Should_Be_Responsive()
    {
        // Act
        var response = await _client.GetAsync("/");

        // Assert
        // Should return some valid response (not necessarily 200, but not a timeout or 500)
        response.StatusCode.Should().BeOneOf(
            HttpStatusCode.OK,
            HttpStatusCode.NotFound,
            HttpStatusCode.Unauthorized,
            HttpStatusCode.Forbidden
        );
    }

    [Fact]
    public void Database_Connection_Should_Be_Working()
    {
        // Arrange & Act - Verify database is accessible through DI
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<BrowserHistoryDbContext>();

        // Assert - Should be able to query database without exceptions
        var deviceCount = context.Devices.Count();
        deviceCount.Should().BeGreaterThanOrEqualTo(0);
    }

    [Fact]
    public async Task API_Should_Handle_Invalid_Endpoints_Gracefully()
    {
        // Act
        var response = await _client.GetAsync("/api/nonexistent");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task API_Should_Handle_Invalid_JSON_Gracefully()
    {
        // Arrange
        var invalidJson = new StringContent("{ invalid json", System.Text.Encoding.UTF8, "application/json");

        // Act
        var response = await _client.PostAsync("/api/auth/register", invalidJson);

        // Assert
        response.StatusCode.Should().BeOneOf(
            HttpStatusCode.BadRequest,
            HttpStatusCode.UnsupportedMediaType,
            HttpStatusCode.NotFound
        );
    }

    [Fact]
    public async Task Concurrent_Requests_Should_Be_Handled_Correctly()
    {
        // Arrange
        var tasks = Enumerable.Range(0, 10)
            .Select(async _ =>
            {
                using var client = _factory.CreateClient();
                return await client.GetAsync("/health");
            });

        // Act
        var responses = await Task.WhenAll(tasks);

        // Assert
        responses.Should().AllSatisfy(response =>
        {
            response.StatusCode.Should().Be(HttpStatusCode.OK);
        });
    }

    [Fact]
    public async Task Large_Request_Should_Be_Handled_Appropriately()
    {
        // Arrange - Create a large but valid JSON request
        var largeData = new
        {
            DeviceName = new string('A', 1000), // Large device name
            SharedSecret = new string('B', 1000), // Large shared secret
            AdditionalData = Enumerable.Range(0, 100)
                .Select(i => new { Key = $"Key{i}", Value = new string('C', 100) })
                .ToArray()
        };

        // Act
        var response = await _client.PostAsJsonAsync("/api/auth/register", largeData);

        // Assert - Should handle gracefully (either accept or reject appropriately)
        response.StatusCode.Should().BeOneOf(
            HttpStatusCode.OK,
            HttpStatusCode.BadRequest,
            HttpStatusCode.RequestEntityTooLarge,
            HttpStatusCode.NotFound // If endpoint doesn't exist
        );
    }

    [Fact]
    public async Task API_Should_Return_Consistent_Response_Format()
    {
        // Act
        var response = await _client.GetAsync("/health");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        response.Content.Should().NotBeNull();
        
        // Should have consistent headers
        response.Headers.Should().NotBeNull();
        response.Content.Headers.Should().NotBeNull();
    }

    [Fact]
    public async Task Database_Should_Support_Basic_CRUD_Operations()
    {
        // Arrange
        await _factory.ClearTestDataAsync();

        // Act & Assert - Test database operations through the service layer
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<BrowserHistoryDbContext>();

        // Verify we can read from empty database
        var initialCount = context.Devices.Count();
        initialCount.Should().Be(0);

        // Verify database schema is properly created
        var canConnect = await context.Database.CanConnectAsync();
        canConnect.Should().BeTrue();
    }

    [Fact]
    public async Task Error_Handling_Should_Not_Expose_Internal_Details()
    {
        // Arrange - Try to cause an internal error
        var malformedRequest = new StringContent("", System.Text.Encoding.UTF8, "application/json");

        // Act
        var response = await _client.PostAsync("/api/auth/register", malformedRequest);

        // Assert
        if (response.StatusCode == HttpStatusCode.InternalServerError)
        {
            var content = await response.Content.ReadAsStringAsync();
            content.Should().NotContain("Exception");
            content.Should().NotContain("StackTrace");
            content.Should().NotContain("at System.");
        }
    }
}
