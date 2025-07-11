using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using System.Net;
using System.Net.Http.Json;
using Xunit;
using Xunit.Abstractions;

namespace BrowserHistory.Infrastructure.Tests.Integration;

public class SimpleAuthTest : IClassFixture<AuthWebApplicationFactory>
{
    private readonly HttpClient _client;
    private readonly ITestOutputHelper _output;

    public SimpleAuthTest(AuthWebApplicationFactory factory, ITestOutputHelper output)
    {
        _client = factory.CreateClient();
        _output = output;
    }

    [Fact]
    public async Task DebugRegisterEndpoint()
    {
        // Arrange - Use the shared secret from appsettings.json
        var request = new { DeviceName = "Test Device", Secret = "your-shared-secret-for-device-registration" };

        // Act
        var response = await _client.PostAsJsonAsync("/api/v1/auth/register-device", request);
        var content = await response.Content.ReadAsStringAsync();

        // Debug output
        _output.WriteLine($"Status Code: {response.StatusCode}");
        _output.WriteLine($"Response Body: {content}");
        _output.WriteLine($"Response Headers: {response.Headers}");

        // Check if authentication succeeded
        if (response.StatusCode == System.Net.HttpStatusCode.Unauthorized)
        {
            Assert.Fail($"Authentication failed - check if shared secret is configured correctly. Status: {response.StatusCode}, Body: {content}");
        }
        
        // If we get here, the API is working! Check for success
        response.EnsureSuccessStatusCode();
        Assert.NotEmpty(content);
    }
}
