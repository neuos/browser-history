using System.Net;
using System.Net.Http.Json;
using Microsoft.Extensions.DependencyInjection;
using FluentAssertions;
using BrowserHistory.E2E.Tests.Infrastructure;
using BrowserHistory.Application.Common.Models;
using BrowserHistory.Application.Features.Devices.Commands;
using BrowserHistory.Domain.ValueObjects;
using BrowserHistory.Infrastructure.Data;

namespace BrowserHistory.E2E.Tests.Workflows;

/// <summary>
/// End-to-end tests for the (unauthenticated) device management endpoints under
/// /api/v1/devices - registration, listing, lookup, and last-seen updates.
///
/// This is a separate device concept from /api/v1/auth/register-device: it creates a
/// domain Device directly with no shared-secret check and issues no token. Nothing in the
/// extension calls it today, but it is real, mounted API surface, so it's tested as such.
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
        var deviceName = $"Test Chrome Browser {Guid.NewGuid()}";

        // Act & Assert - Step 1: Register new device
        var registerResponse = await _client.PostAsJsonAsync("/api/v1/devices/register",
            new RegisterDeviceCommand { DeviceName = deviceName });
        registerResponse.StatusCode.Should().Be(HttpStatusCode.Created);

        var registered = await registerResponse.Content.ReadFromJsonAsync<DeviceDto>();
        registered.Should().NotBeNull();
        Guid.TryParse(registered!.Id, out _).Should().BeTrue();
        registered.DeviceName.Should().Be(deviceName);
        registered.IsActive.Should().BeTrue();
        registered.LastSeen.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromMinutes(1));

        var deviceId = registered.Id;

        // Act & Assert - Step 2: Verify device appears in the active devices list
        var listResponse = await _client.GetAsync("/api/v1/devices");
        listResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var devices = await listResponse.Content.ReadFromJsonAsync<DeviceDto[]>();
        devices.Should().ContainSingle(d => d.Id == deviceId && d.DeviceName == deviceName);

        // Act & Assert - Step 3: Get specific device details
        var getResponse = await _client.GetAsync($"/api/v1/devices/{deviceId}");
        getResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var device = await getResponse.Content.ReadFromJsonAsync<DeviceDto>();
        device!.Id.Should().Be(deviceId);
        device.DeviceName.Should().Be(deviceName);

        // Act & Assert - Step 4: Update device last-seen timestamp
        var updateResponse = await _client.PutAsync($"/api/v1/devices/{deviceId}/last-seen", null);
        updateResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var updatedResponse = await _client.GetAsync($"/api/v1/devices/{deviceId}");
        var updatedDevice = await updatedResponse.Content.ReadFromJsonAsync<DeviceDto>();
        updatedDevice!.LastSeen.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(30));

        // Verify device persisted in the database
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<BrowserHistoryDbContext>();
        var persistedDevice = await context.Devices.FindAsync(DeviceId.From(Guid.Parse(deviceId)));
        persistedDevice.Should().NotBeNull();
        persistedDevice!.DeviceName.Should().Be(deviceName);
    }

    [Fact]
    public async Task Multiple_Device_Registration_Should_Support_Concurrent_Devices()
    {
        // Arrange
        await _factory.ClearTestDataAsync();
        var suffix = Guid.NewGuid();
        var deviceNames = new[] { $"Chrome Desktop {suffix}", $"Firefox Mobile {suffix}", $"Safari iPad {suffix}" };

        // Act - Register multiple devices concurrently
        var registrationTasks = deviceNames.Select(async deviceName =>
        {
            var response = await _client.PostAsJsonAsync("/api/v1/devices/register",
                new RegisterDeviceCommand { DeviceName = deviceName });
            response.StatusCode.Should().Be(HttpStatusCode.Created);
            return await response.Content.ReadFromJsonAsync<DeviceDto>();
        });

        var results = await Task.WhenAll(registrationTasks);

        // Assert - all devices registered with unique IDs
        results.Should().AllSatisfy(r => r.Should().NotBeNull());
        results.Select(r => r!.Id).Should().OnlyHaveUniqueItems();

        var listResponse = await _client.GetAsync("/api/v1/devices");
        var deviceList = await listResponse.Content.ReadFromJsonAsync<DeviceDto[]>();
        foreach (var expectedName in deviceNames)
        {
            deviceList.Should().Contain(d => d.DeviceName == expectedName);
        }
    }

    [Fact]
    public async Task Device_Registration_With_Duplicate_Name_Should_Return_BadRequest()
    {
        // Arrange - Device.DeviceName is unique (IX_Devices_DeviceName), enforced by the handler
        // before it ever reaches the database.
        await _factory.ClearTestDataAsync();
        var deviceName = $"Chrome Browser {Guid.NewGuid()}";
        var firstResponse = await _client.PostAsJsonAsync("/api/v1/devices/register",
            new RegisterDeviceCommand { DeviceName = deviceName });
        firstResponse.StatusCode.Should().Be(HttpStatusCode.Created);

        // Act - Register a second device with the same name
        var secondResponse = await _client.PostAsJsonAsync("/api/v1/devices/register",
            new RegisterDeviceCommand { DeviceName = deviceName });

        // Assert
        secondResponse.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var error = await secondResponse.Content.ReadFromJsonAsync<string>();
        error.Should().Contain(deviceName);

        var listResponse = await _client.GetAsync("/api/v1/devices");
        var devices = await listResponse.Content.ReadFromJsonAsync<DeviceDto[]>();
        devices.Should().ContainSingle(d => d.DeviceName == deviceName);
    }

    [Fact]
    public async Task Get_Nonexistent_Device_Should_Return_NotFound()
    {
        // Arrange
        var nonexistentDeviceId = Guid.NewGuid();

        // Act
        var response = await _client.GetAsync($"/api/v1/devices/{nonexistentDeviceId}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Update_Last_Seen_For_Nonexistent_Device_Should_Return_ServerError()
    {
        // Arrange - unlike GET /devices/{id}, this endpoint doesn't distinguish "not found" from
        // any other handler failure: UpdateDeviceLastSeenCommandHandler returns Result.Failure,
        // and the endpoint maps any failed Result straight to Results.Problem() (500). Documented
        // here as the real, current behavior, not the ideal one.
        var nonexistentDeviceId = Guid.NewGuid();

        // Act
        var response = await _client.PutAsync($"/api/v1/devices/{nonexistentDeviceId}/last-seen", null);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.InternalServerError);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public async Task Device_Registration_With_Invalid_Name_Should_Return_BadRequest(string invalidName)
    {
        // Act
        var response = await _client.PostAsJsonAsync("/api/v1/devices/register",
            new RegisterDeviceCommand { DeviceName = invalidName });

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Device_Registration_With_Name_Over_100_Characters_Should_Return_BadRequest()
    {
        // Act
        var response = await _client.PostAsJsonAsync("/api/v1/devices/register",
            new RegisterDeviceCommand { DeviceName = new string('A', 101) });

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }
}
