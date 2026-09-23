using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using BrowserHistory.E2E.Tests.Infrastructure;
using BrowserHistory.Application.Features.Auth.Models;
using BrowserHistory.Application.Features.Favicons.Models;
using BrowserHistory.Infrastructure.Data;

namespace BrowserHistory.E2E.Tests.Workflows;

/// <summary>
/// End-to-end tests for content-addressed, deduplicated favicon storage over
/// /api/v1/favicons - upload is idempotent by content hash (dedup happens naturally when
/// multiple devices independently discover the same favicon), fetch returns raw bytes for a
/// device that received a hash reference via sync but doesn't have the blob locally yet.
/// </summary>
[Collection("E2E Tests")]
public class FaviconWorkflowTests : IClassFixture<E2ETestWebApplicationFactory>
{
    private const string SharedSecret = "your-shared-secret-for-device-registration";

    private readonly E2ETestWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public FaviconWorkflowTests(E2ETestWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Uploading_New_Favicon_Then_Fetching_It_Should_Round_Trip_Exactly()
    {
        await _factory.ClearTestDataAsync();
        var device = await RegisterDeviceAsync("Uploader");
        var bytes = Encoding.UTF8.GetBytes("fake-favicon-bytes-for-round-trip-test");
        var hash = ComputeHash(bytes);

        var uploadResponse = await UploadFaviconAsync(device.Token, hash, "image/png", bytes);
        uploadResponse.AlreadyExisted.Should().BeFalse();
        uploadResponse.Hash.Should().Be(hash);

        var fetchRequest = new HttpRequestMessage(HttpMethod.Get, $"/api/v1/favicons/{hash}");
        fetchRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", device.Token);
        var fetchResponse = await _client.SendAsync(fetchRequest);

        fetchResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        fetchResponse.Content.Headers.ContentType!.MediaType.Should().Be("image/png");
        var fetchedBytes = await fetchResponse.Content.ReadAsByteArrayAsync();
        fetchedBytes.Should().BeEquivalentTo(bytes);
    }

    [Fact]
    public async Task Uploading_Same_Content_Twice_Should_Dedup_Not_Duplicate()
    {
        await _factory.ClearTestDataAsync();
        var deviceA = await RegisterDeviceAsync("Device A");
        var deviceB = await RegisterDeviceAsync("Device B");
        var bytes = Encoding.UTF8.GetBytes("shared-favicon-both-devices-discover");
        var hash = ComputeHash(bytes);

        // Two different devices independently uploading the identical bytes - exactly the
        // real-world case this exists for (both visited the same site, both captured its icon).
        var first = await UploadFaviconAsync(deviceA.Token, hash, "image/x-icon", bytes);
        var second = await UploadFaviconAsync(deviceB.Token, hash, "image/x-icon", bytes);

        first.AlreadyExisted.Should().BeFalse();
        second.AlreadyExisted.Should().BeTrue();

        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<BrowserHistoryDbContext>();
        context.FaviconBlobs.Count(f => f.Hash == hash).Should().Be(1, "the blob must be stored exactly once regardless of how many devices upload it");
    }

    [Fact]
    public async Task Uploading_Data_That_Does_Not_Match_The_Claimed_Hash_Should_Be_Rejected()
    {
        await _factory.ClearTestDataAsync();
        var device = await RegisterDeviceAsync("Device");
        var realBytes = Encoding.UTF8.GetBytes("real-content");
        var wrongHash = ComputeHash(Encoding.UTF8.GetBytes("completely-different-content"));

        var request = new HttpRequestMessage(HttpMethod.Post, "/api/v1/favicons")
        {
            Content = JsonContent.Create(new UploadFaviconRequest
            {
                Hash = wrongHash,
                ContentType = "image/png",
                DataBase64 = Convert.ToBase64String(realBytes)
            })
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", device.Token);
        var response = await _client.SendAsync(request);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Fetching_Unknown_Hash_Should_Return_NotFound()
    {
        await _factory.ClearTestDataAsync();
        var device = await RegisterDeviceAsync("Device");
        var unknownHash = ComputeHash(Encoding.UTF8.GetBytes("never-uploaded"));

        var request = new HttpRequestMessage(HttpMethod.Get, $"/api/v1/favicons/{unknownHash}");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", device.Token);
        var response = await _client.SendAsync(request);

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Favicon_Endpoints_Should_Require_Authentication()
    {
        await _factory.ClearTestDataAsync();
        var bytes = Encoding.UTF8.GetBytes("no-auth-test");
        var hash = ComputeHash(bytes);

        var uploadResponse = await _client.PostAsJsonAsync("/api/v1/favicons", new UploadFaviconRequest
        {
            Hash = hash,
            ContentType = "image/png",
            DataBase64 = Convert.ToBase64String(bytes)
        });
        uploadResponse.StatusCode.Should().Be(HttpStatusCode.Unauthorized);

        var fetchResponse = await _client.GetAsync($"/api/v1/favicons/{hash}");
        fetchResponse.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    private static string ComputeHash(byte[] data) => Convert.ToHexString(SHA256.HashData(data)).ToLowerInvariant();

    private async Task<UploadFaviconResponse> UploadFaviconAsync(string token, string hash, string contentType, byte[] data)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, "/api/v1/favicons")
        {
            Content = JsonContent.Create(new UploadFaviconRequest
            {
                Hash = hash,
                ContentType = contentType,
                DataBase64 = Convert.ToBase64String(data)
            })
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var response = await _client.SendAsync(request);
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<UploadFaviconResponse>())!;
    }

    private async Task<(string DeviceId, string Token)> RegisterDeviceAsync(string namePrefix)
    {
        var response = await _client.PostAsJsonAsync("/api/v1/auth/register-device",
            new { deviceName = $"{namePrefix}-{Guid.NewGuid()}", secret = SharedSecret });
        response.EnsureSuccessStatusCode();
        var result = await response.Content.ReadFromJsonAsync<RegisterDeviceResponse>();
        return (result!.DeviceId, result.Token);
    }
}
