using BrowserHistory.Application.Features.Auth.Models;
using BrowserHistory.Infrastructure.Data;
using BrowserHistory.Infrastructure.Identity;
using FluentAssertions;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using System.Net;
using System.Net.Http.Json;

namespace BrowserHistory.Infrastructure.Tests.Integration;

public class AuthEndpointsIntegrationTests : IClassFixture<AuthWebApplicationFactory>
{
    private readonly HttpClient _client;
    private readonly AuthWebApplicationFactory _factory;

    public AuthEndpointsIntegrationTests(AuthWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task RegisterDevice_WithValidData_ShouldReturnSuccess()
    {
        // Arrange
        var request = new RegisterDeviceRequest("Integration Test Device", "test-shared-secret");

        // Act
        var response = await _client.PostAsJsonAsync("/api/v1/auth/register-device", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        
        var result = await response.Content.ReadFromJsonAsync<RegisterDeviceResponse>();
        result.Should().NotBeNull();
        result!.DeviceId.Should().NotBeNullOrEmpty();
        result.AccessToken.Should().NotBeNullOrEmpty();
        result.RefreshToken.Should().NotBeNullOrEmpty();
        result.TokenType.Should().Be("Bearer");
        result.ExpiresAt.Should().BeAfter(DateTime.UtcNow);
    }

    [Fact]
    public async Task RegisterDevice_WithInvalidSharedSecret_ShouldReturnUnauthorized()
    {
        // Arrange
        var request = new RegisterDeviceRequest("Test Device", "wrong-secret");

        // Act
        var response = await _client.PostAsJsonAsync("/api/v1/auth/register-device", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task RegisterDevice_WithInvalidDeviceName_ShouldReturnBadRequest()
    {
        // Arrange
        var request = new RegisterDeviceRequest("", "test-shared-secret");

        // Act
        var response = await _client.PostAsJsonAsync("/api/v1/auth/register-device", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task ValidateToken_WithValidToken_ShouldReturnDeviceInfo()
    {
        // Arrange - First register a device
        var registerRequest = new RegisterDeviceRequest("Validation Test Device", "test-shared-secret");
        var registerResponse = await _client.PostAsJsonAsync("/api/v1/auth/register-device", registerRequest);
        var registerResult = await registerResponse.Content.ReadFromJsonAsync<RegisterDeviceResponse>();

        // Add authorization header
        _client.DefaultRequestHeaders.Authorization = 
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", registerResult!.AccessToken);

        // Act
        var response = await _client.GetAsync("/api/v1/auth/validate-token");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        
        var result = await response.Content.ReadFromJsonAsync<DeviceInfoDto>();
        result.Should().NotBeNull();
        result!.DeviceId.Should().Be(registerResult.DeviceId);
        result.DeviceName.Should().Be("Validation Test Device");
    }

    [Fact]
    public async Task ValidateToken_WithoutToken_ShouldReturnUnauthorized()
    {
        // Act
        var response = await _client.GetAsync("/api/v1/auth/validate-token");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
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
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task RefreshToken_WithValidToken_ShouldReturnNewTokens()
    {
        // Arrange - First register a device
        var registerRequest = new RegisterDeviceRequest("Refresh Test Device", "test-shared-secret");
        var registerResponse = await _client.PostAsJsonAsync("/api/v1/auth/register-device", registerRequest);
        var registerResult = await registerResponse.Content.ReadFromJsonAsync<RegisterDeviceResponse>();

        var refreshRequest = new RefreshTokenRequest(registerResult!.RefreshToken);

        // Act
        var response = await _client.PostAsJsonAsync("/api/v1/auth/refresh-token", refreshRequest);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        
        var result = await response.Content.ReadFromJsonAsync<RefreshTokenResponse>();
        result.Should().NotBeNull();
        result!.AccessToken.Should().NotBeNullOrEmpty();
        result.AccessToken.Should().NotBe(registerResult.AccessToken); // Should be a new token
        result.RefreshToken.Should().NotBeNullOrEmpty();
        result.RefreshToken.Should().NotBe(registerResult.RefreshToken); // Should be a new refresh token
        result.TokenType.Should().Be("Bearer");
    }

    [Fact]
    public async Task RefreshToken_WithInvalidToken_ShouldReturnUnauthorized()
    {
        // Arrange
        var request = new RefreshTokenRequest("invalid-refresh-token");

        // Act
        var response = await _client.PostAsJsonAsync("/api/v1/auth/refresh-token", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GetDeviceInfo_WithValidToken_ShouldReturnDeviceInfo()
    {
        // Arrange - First register a device
        var registerRequest = new RegisterDeviceRequest("Device Info Test", "test-shared-secret");
        var registerResponse = await _client.PostAsJsonAsync("/api/v1/auth/register-device", registerRequest);
        var registerResult = await registerResponse.Content.ReadFromJsonAsync<RegisterDeviceResponse>();

        // Add authorization header
        _client.DefaultRequestHeaders.Authorization = 
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", registerResult!.AccessToken);

        // Act
        var response = await _client.GetAsync("/api/v1/auth/device-info");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        
        var result = await response.Content.ReadFromJsonAsync<DeviceInfoDto>();
        result.Should().NotBeNull();
        result!.DeviceId.Should().Be(registerResult.DeviceId);
        result.DeviceName.Should().Be("Device Info Test");
        result.LastSeen.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromMinutes(1));
    }
}
