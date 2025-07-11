using System.Net;
using System.Net.Http.Json;
using Microsoft.Extensions.DependencyInjection;
using FluentAssertions;
using BrowserHistory.E2E.Tests.Infrastructure;
using BrowserHistory.Api.DTOs;
using BrowserHistory.Application.Commands.Devices;
using BrowserHistory.Domain.Entities;
using BrowserHistory.Infrastructure.Data;

namespace BrowserHistory.E2E.Tests.Workflows;

/// <summary>
/// End-to-end tests for device registration and management workflows.
/// Tests complete user journeys for device registration, authentication, and status updates.
/// </summary>
[Collection("E2E Tests")]
public class DeviceManagementWorkflowTests : IClassFixture<E2ETestWebApplicationFactory>
{
    private readonly E2ETestWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public DeviceManagementWorkflowTests(E2ETestWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Complete_Device_Registration_Workflow_Should_Succeed()
    {
        // Arrange
        await _factory.ClearTestDataAsync();
        var deviceName = "Test Chrome Browser";
        var registerRequest = new RegisterDeviceCommand(deviceName);

        // Act & Assert - Step 1: Register new device
        var registerResponse = await _client.PostAsJsonAsync("/api/devices/register", registerRequest);
        registerResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var registerResult = await registerResponse.Content.ReadFromJsonAsync<RegisterDeviceResponse>();
        registerResult.Should().NotBeNull();
        registerResult!.DeviceId.Should().NotBeEmpty();
        registerResult.Name.Should().Be(deviceName);
        registerResult.LastSeen.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromMinutes(1));

        var deviceId = registerResult.DeviceId;

        // Act & Assert - Step 2: Verify device appears in devices list
        var getDevicesResponse = await _client.GetAsync("/api/devices");
        getDevicesResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var devices = await getDevicesResponse.Content.ReadFromJsonAsync<DeviceResponse[]>();
        devices.Should().NotBeNull();
        devices!.Should().HaveCount(1);
        devices[0].Id.Should().Be(deviceId);
        devices[0].Name.Should().Be(deviceName);

        // Act & Assert - Step 3: Get specific device details
        var getDeviceResponse = await _client.GetAsync($"/api/devices/{deviceId}");
        getDeviceResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var device = await getDeviceResponse.Content.ReadFromJsonAsync<DeviceResponse>();
        device.Should().NotBeNull();
        device!.Id.Should().Be(deviceId);
        device.Name.Should().Be(deviceName);
        device.IsOnline.Should().BeTrue(); // Recently registered device should be considered online

        // Act & Assert - Step 4: Update device last seen timestamp
        var updateLastSeenResponse = await _client.PatchAsync($"/api/devices/{deviceId}/last-seen", null);
        updateLastSeenResponse.StatusCode.Should().Be(HttpStatusCode.NoContent);

        // Verify timestamp was updated
        var updatedDeviceResponse = await _client.GetAsync($"/api/devices/{deviceId}");
        var updatedDevice = await updatedDeviceResponse.Content.ReadFromJsonAsync<DeviceResponse>();
        updatedDevice!.LastSeen.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(30));

        // Verify device persisted in database
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<BrowserHistoryDbContext>();
        var persistedDevice = await context.Devices.FindAsync(DeviceId.Create(deviceId));
        persistedDevice.Should().NotBeNull();
        persistedDevice!.Name.Value.Should().Be(deviceName);
    }

    [Fact]
    public async Task Multiple_Device_Registration_Should_Support_Concurrent_Devices()
    {
        // Arrange
        await _factory.ClearTestDataAsync();
        var devices = new[]
        {
            "Chrome Desktop",
            "Firefox Mobile",
            "Safari iPad"
        };

        // Act - Register multiple devices concurrently
        var registrationTasks = devices.Select(async deviceName =>
        {
            var request = new RegisterDeviceCommand(deviceName);
            var response = await _client.PostAsJsonAsync("/api/devices/register", request);
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            return await response.Content.ReadFromJsonAsync<RegisterDeviceResponse>();
        });

        var results = await Task.WhenAll(registrationTasks);

        // Assert - All devices registered successfully
        results.Should().HaveCount(3);
        results.Should().AllSatisfy(result =>
        {
            result.Should().NotBeNull();
            result!.DeviceId.Should().NotBeEmpty();
        });

        // Verify unique device IDs
        var deviceIds = results.Select(r => r!.DeviceId).ToArray();
        deviceIds.Should().OnlyHaveUniqueItems();

        // Verify all devices appear in list
        var getDevicesResponse = await _client.GetAsync("/api/devices");
        var deviceList = await getDevicesResponse.Content.ReadFromJsonAsync<DeviceResponse[]>();
        deviceList.Should().HaveCount(3);
        
        foreach (var expectedName in devices)
        {
            deviceList.Should().Contain(d => d.Name == expectedName);
        }
    }

    [Fact]
    public async Task Device_Registration_With_Duplicate_Name_Should_Create_Separate_Devices()
    {
        // Arrange
        await _factory.ClearTestDataAsync();
        var deviceName = "Chrome Browser";

        // Act - Register two devices with same name
        var firstRequest = new RegisterDeviceCommand(deviceName);
        var firstResponse = await _client.PostAsJsonAsync("/api/devices/register", firstRequest);
        var firstResult = await firstResponse.Content.ReadFromJsonAsync<RegisterDeviceResponse>();

        var secondRequest = new RegisterDeviceCommand(deviceName);
        var secondResponse = await _client.PostAsJsonAsync("/api/devices/register", secondRequest);
        var secondResult = await secondResponse.Content.ReadFromJsonAsync<RegisterDeviceResponse>();

        // Assert - Both registrations successful with different IDs
        firstResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        secondResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        
        firstResult!.DeviceId.Should().NotBe(secondResult!.DeviceId);
        firstResult.Name.Should().Be(deviceName);
        secondResult.Name.Should().Be(deviceName);

        // Verify both devices exist in system
        var getDevicesResponse = await _client.GetAsync("/api/devices");
        var devices = await getDevicesResponse.Content.ReadFromJsonAsync<DeviceResponse[]>();
        devices.Should().HaveCount(2);
        devices.Should().AllSatisfy(d => d.Name.Should().Be(deviceName));
    }

    [Fact]
    public async Task Get_Nonexistent_Device_Should_Return_NotFound()
    {
        // Arrange
        var nonexistentDeviceId = Guid.NewGuid();

        // Act
        var response = await _client.GetAsync($"/api/devices/{nonexistentDeviceId}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Update_Last_Seen_For_Nonexistent_Device_Should_Return_NotFound()
    {
        // Arrange
        var nonexistentDeviceId = Guid.NewGuid();

        // Act
        var response = await _client.PatchAsync($"/api/devices/{nonexistentDeviceId}/last-seen", null);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData(null)]
    public async Task Device_Registration_With_Invalid_Name_Should_Return_BadRequest(string? invalidName)
    {
        // Arrange
        var request = new RegisterDeviceCommand(invalidName!);

        // Act
        var response = await _client.PostAsJsonAsync("/api/devices/register", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Device_Online_Status_Should_Reflect_Recent_Activity()
    {
        // Arrange
        await _factory.ClearTestDataAsync();
        var request = new RegisterDeviceCommand("Test Device");

        // Act - Register device (should be online)
        var registerResponse = await _client.PostAsJsonAsync("/api/devices/register", request);
        var registerResult = await registerResponse.Content.ReadFromJsonAsync<RegisterDeviceResponse>();
        var deviceId = registerResult!.DeviceId;

        // Assert - Device should be online initially
        var getDeviceResponse = await _client.GetAsync($"/api/devices/{deviceId}");
        var device = await getDeviceResponse.Content.ReadFromJsonAsync<DeviceResponse>();
        device!.IsOnline.Should().BeTrue();

        // Simulate device going offline by manipulating last seen timestamp
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<BrowserHistoryDbContext>();
        var persistedDevice = await context.Devices.FindAsync(DeviceId.Create(deviceId));
        persistedDevice!.UpdateLastSeen(DateTime.UtcNow.AddMinutes(-10)); // Set to 10 minutes ago
        await context.SaveChangesAsync();

        // Assert - Device should now be offline
        var offlineDeviceResponse = await _client.GetAsync($"/api/devices/{deviceId}");
        var offlineDevice = await offlineDeviceResponse.Content.ReadFromJsonAsync<DeviceResponse>();
        offlineDevice!.IsOnline.Should().BeFalse();
    }
}
