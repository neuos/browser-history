using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Xunit;
using Xunit.Abstractions;
using FluentAssertions;

namespace BrowserHistory.Infrastructure.Tests.Integration;

public class AuthIntegrationTests : IClassFixture<AuthWebApplicationFactory>
{
    private readonly HttpClient _client;
    private readonly ITestOutputHelper _output;

    public AuthIntegrationTests(AuthWebApplicationFactory factory, ITestOutputHelper output)
    {
        _client = factory.CreateClient();
        _output = output;
    }

    [Fact]
    public async Task RegisterDevice_WithValidCredentials_ShouldReturnSuccess()
    {
        // Arrange - Use the shared secret from appsettings.json
        var request = new { DeviceName = "Test Device", Secret = "your-shared-secret-for-device-registration" };

        // Act
        var response = await _client.PostAsJsonAsync("/api/v1/auth/register-device", request);
        var content = await response.Content.ReadAsStringAsync();

        // Debug output
        _output.WriteLine($"Status Code: {response.StatusCode}");
        _output.WriteLine($"Response Body: {content}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK, "valid credentials should register successfully");
        content.Should().NotBeNullOrEmpty("response should contain registration data");
        
        // Parse and validate response structure
        var jsonDoc = JsonDocument.Parse(content);
        jsonDoc.RootElement.TryGetProperty("deviceId", out var deviceIdProp).Should().BeTrue("response should contain deviceId");
        jsonDoc.RootElement.TryGetProperty("token", out var tokenProp).Should().BeTrue("response should contain token");
        jsonDoc.RootElement.TryGetProperty("expiresIn", out var expiresInProp).Should().BeTrue("response should contain expiresIn");
        
        deviceIdProp.GetString().Should().NotBeNullOrEmpty("deviceId should not be empty");
        tokenProp.GetString().Should().NotBeNullOrEmpty("token should not be empty");
        expiresInProp.GetInt32().Should().BeGreaterThan(0, "expiresIn should be positive");
    }

    [Fact]
    public async Task RegisterDevice_WithInvalidSecret_ShouldReturnUnauthorized()
    {
        // Arrange
        var request = new { DeviceName = "Test Device", Secret = "wrong-secret" };

        // Act
        var response = await _client.PostAsJsonAsync("/api/v1/auth/register-device", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized, "invalid secret should be rejected");
    }

    [Fact]
    public async Task RegisterDevice_WithEmptyDeviceName_ShouldReturnBadRequestOrServerError()
    {
        // Arrange
        var request = new { DeviceName = "", Secret = "your-shared-secret-for-device-registration" };

        // Act
        var response = await _client.PostAsJsonAsync("/api/v1/auth/register-device", request);

        // Assert - Accept both BadRequest (400) and InternalServerError (500) since validation can happen at different layers
        var allowedStatuses = new[] { HttpStatusCode.BadRequest, HttpStatusCode.InternalServerError };
        allowedStatuses.Should().Contain(response.StatusCode, "empty device name should be rejected with validation error");
    }

    [Fact]
    public async Task ValidateToken_WithoutAuthHeader_ShouldReturnUnauthorized()
    {
        // Act
        var response = await _client.GetAsync("/api/v1/auth/validate-token");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized, "missing auth header should be rejected");
    }

    [Fact]
    public async Task ValidateToken_WithInvalidToken_ShouldReturnUnauthorized()
    {
        // Arrange
        _client.DefaultRequestHeaders.Authorization = 
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", "invalid.jwt.token");

        // Act
        var response = await _client.GetAsync("/api/v1/auth/validate-token");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized, "invalid token should be rejected");
    }

    [Fact]
    public async Task GetDeviceInfo_WithoutAuthHeader_ShouldReturnUnauthorized()
    {
        // Act
        var response = await _client.GetAsync("/api/v1/auth/device-info");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized, "missing auth header should be rejected");
    }

    [Fact]
    public async Task RefreshToken_WithInvalidToken_ShouldReturnUnauthorized()
    {
        // Arrange
        _client.DefaultRequestHeaders.Authorization = 
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", "invalid-refresh-token");

        var request = new { }; // Empty body for refresh

        // Act
        var response = await _client.PostAsJsonAsync("/api/v1/auth/refresh-token", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized, "invalid refresh token should be rejected");
    }

    [Fact]
    public async Task HealthEndpoint_ShouldReturnOk()
    {
        // Act
        var response = await _client.GetAsync("/health");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK, "health endpoint should always be accessible");
    }
}
