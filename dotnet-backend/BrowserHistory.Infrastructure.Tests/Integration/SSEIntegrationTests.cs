using System.Net.Http;
using System.Text;
using System.Text.Json;
using BrowserHistory.Application.Common.Interfaces;
using BrowserHistory.Infrastructure.Services;
using BrowserHistory.Infrastructure.Tests.Integration;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace BrowserHistory.Infrastructure.Tests.Integration;

/// <summary>
/// Integration tests for Server-Sent Events functionality
/// </summary>
public class SSEIntegrationTests : IClassFixture<AuthWebApplicationFactory>
{
    private readonly AuthWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public SSEIntegrationTests(AuthWebApplicationFactory factory)
    {
        _factory = factory;
        _client = _factory.CreateClient();
    }

    [Fact]
    public async Task SSEConnections_ShouldReturn401_WhenNotAuthenticated()
    {
        // Act
        var response = await _client.GetAsync("/api/v1/sse/connections");
        
        // Assert
        response.StatusCode.Should().Be(System.Net.HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task SSEConnections_ShouldReturnConnectedDevices_WhenAuthenticated()
    {
        // Arrange - Register a device to get auth token (using correct shared secret)
        var registerRequest = new
        {
            DeviceName = "Test Device",
            Secret = "your-shared-secret-for-device-registration"
        };

        var registerContent = new StringContent(
            JsonSerializer.Serialize(registerRequest),
            Encoding.UTF8,
            "application/json");

        var registerResponse = await _client.PostAsync("/api/v1/auth/register-device", registerContent);
        
        // Check registration response
        if (!registerResponse.IsSuccessStatusCode)
        {
            var errorContent = await registerResponse.Content.ReadAsStringAsync();
            throw new InvalidOperationException($"Device registration failed: {registerResponse.StatusCode} - {errorContent}");
        }

        var registerResult = await registerResponse.Content.ReadAsStringAsync();
        var registerData = JsonSerializer.Deserialize<JsonElement>(registerResult);
        var token = registerData.GetProperty("token").GetString();

        // Act - Call SSE connections endpoint with auth
        _client.DefaultRequestHeaders.Authorization = 
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

        var response = await _client.GetAsync("/api/v1/sse/connections");

        // Assert
        response.EnsureSuccessStatusCode();
        var content = await response.Content.ReadAsStringAsync();
        var data = JsonSerializer.Deserialize<JsonElement>(content);
        
        data.GetProperty("totalConnections").GetInt32().Should().Be(0);
        data.GetProperty("connectedDevices").EnumerateArray().Count().Should().Be(0);
        data.TryGetProperty("timestamp", out _).Should().BeTrue();
    }

    [Fact]
    public void SSEService_ShouldBeRegisteredAsSingleton()
    {
        // Act
        var sseService1 = _factory.Services.GetRequiredService<IServerSentEventService>();
        var sseService2 = _factory.Services.GetRequiredService<IServerSentEventService>();
        var connectionManager1 = _factory.Services.GetRequiredService<ISSEConnectionManager>();
        var connectionManager2 = _factory.Services.GetRequiredService<ISSEConnectionManager>();

        // Assert
        sseService1.Should().BeSameAs(sseService2);
        connectionManager1.Should().BeSameAs(connectionManager2);
        connectionManager1.Should().BeSameAs(sseService1);
    }

    [Fact]
    public async Task SSEService_ShouldSupportBasicOperations()
    {
        // Arrange
        var sseService = _factory.Services.GetRequiredService<IServerSentEventService>();

        // Act & Assert - Basic service operations should not throw
        var connectedDevices = sseService.GetConnectedDevices();
        var connectionCount = sseService.GetConnectionCount();

        connectedDevices.Should().NotBeNull();
        connectionCount.Should().Be(0);
        
        // Broadcasting to no devices should not throw
        await sseService.BroadcastToAllAsync(new { type = "test", data = "test" });
        await sseService.BroadcastToOthersAsync("device-1", new { type = "test", data = "test" });
        
        // Sending to non-existent device should return false
        var sendResult = await sseService.SendToDeviceAsync("non-existent", new { type = "test" });
        sendResult.Should().BeFalse();
    }
}
