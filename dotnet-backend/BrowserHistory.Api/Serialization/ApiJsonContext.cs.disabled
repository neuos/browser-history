using System.Text.Json.Serialization;
using BrowserHistory.Application.Common.Models;
using BrowserHistory.Application.Features.Auth.Models;
using BrowserHistory.Application.Features.Sync.Models;
using BrowserHistory.Application.Features.History.Models;
using BrowserHistory.Application.Features.Device.Models;

namespace BrowserHistory.Api.Serialization;

/// <summary>
/// JSON source generator context for Native AOT compatibility.
/// This provides compile-time JSON serialization support without reflection.
/// </summary>
[JsonSourceGenerationOptions(
    WriteIndented = false,
    PropertyNamingPolicy = JsonKnownNamingPolicy.CamelCase,
    DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    IncludeFields = false)]
[JsonSerializable(typeof(RegisterDeviceRequest))]
[JsonSerializable(typeof(RegisterDeviceResponse))]
[JsonSerializable(typeof(RefreshTokenRequest))]
[JsonSerializable(typeof(RefreshTokenResponse))]
[JsonSerializable(typeof(DeviceInfoDto))]
[JsonSerializable(typeof(SubmitSyncEventsRequest))]
[JsonSerializable(typeof(SubmitSyncEventsResponse))]
[JsonSerializable(typeof(SyncEventDto))]
[JsonSerializable(typeof(SyncStatusDto))]
[JsonSerializable(typeof(GetHistoryResponse))]
[JsonSerializable(typeof(HistoryEntryDto))]
[JsonSerializable(typeof(SearchHistoryResponse))]
[JsonSerializable(typeof(DeviceDto))]
[JsonSerializable(typeof(GetDevicesResponse))]
[JsonSerializable(typeof(ApiResponse<object>))]
[JsonSerializable(typeof(ApiResponse<RegisterDeviceResponse>))]
[JsonSerializable(typeof(ApiResponse<RefreshTokenResponse>))]
[JsonSerializable(typeof(ApiResponse<DeviceInfoDto>))]
[JsonSerializable(typeof(ApiResponse<SubmitSyncEventsResponse>))]
[JsonSerializable(typeof(ApiResponse<SyncStatusDto>))]
[JsonSerializable(typeof(ApiResponse<GetHistoryResponse>))]
[JsonSerializable(typeof(ApiResponse<SearchHistoryResponse>))]
[JsonSerializable(typeof(ApiResponse<GetDevicesResponse>))]
[JsonSerializable(typeof(List<SyncEventDto>))]
[JsonSerializable(typeof(List<HistoryEntryDto>))]
[JsonSerializable(typeof(List<DeviceDto>))]
[JsonSerializable(typeof(Dictionary<string, object>))]
[JsonSerializable(typeof(string[]))]
[JsonSerializable(typeof(Guid))]
[JsonSerializable(typeof(DateTime))]
[JsonSerializable(typeof(int))]
[JsonSerializable(typeof(bool))]
public partial class ApiJsonContext : JsonSerializerContext
{
}

/// <summary>
/// Extension methods for configuring JSON serialization with AOT support.
/// </summary>
public static class JsonConfigurationExtensions
{
    /// <summary>
    /// Configures JSON serialization options for Native AOT compatibility.
    /// </summary>
    public static IServiceCollection ConfigureJsonSerialization(this IServiceCollection services)
    {
        services.ConfigureHttpJsonOptions(options =>
        {
            options.SerializerOptions.TypeInfoResolverChain.Insert(0, ApiJsonContext.Default);
            options.SerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
            options.SerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
            options.SerializerOptions.WriteIndented = false;
        });

        services.Configure<JsonOptions>(options =>
        {
            options.SerializerOptions.TypeInfoResolverChain.Insert(0, ApiJsonContext.Default);
            options.SerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
            options.SerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
            options.SerializerOptions.WriteIndented = false;
        });

        return services;
    }
}
