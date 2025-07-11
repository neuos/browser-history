using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Http.Json;
using BrowserHistory.Application.Common.Models;
using BrowserHistory.Application.Features.Pages.Models;
using BrowserHistory.Application.Features.Sync.Models;
using BrowserHistory.Application.Features.History.Models;
using BrowserHistory.Application.Features.Devices.Models;

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
// Sync Models
[JsonSerializable(typeof(BrowserHistory.Application.Features.Sync.Models.SubmitSyncEventsRequest))]
[JsonSerializable(typeof(BrowserHistory.Application.Features.Sync.Models.SubmitSyncEventsResponse))]
[JsonSerializable(typeof(BrowserHistory.Application.Features.Sync.Models.SyncEventDto))]
[JsonSerializable(typeof(BrowserHistory.Application.Features.Sync.Models.SyncStatusDto))]
// History Models
[JsonSerializable(typeof(GetHistoryRequest))]
[JsonSerializable(typeof(GetHistoryResponse))]
[JsonSerializable(typeof(HistoryEntryDto))]
[JsonSerializable(typeof(AddHistoryEntryRequest))]
[JsonSerializable(typeof(BulkAddHistoryRequest))]
[JsonSerializable(typeof(BulkAddHistoryResponse))]
[JsonSerializable(typeof(HistoryStatsDto))]
[JsonSerializable(typeof(DailyVisitStatsDto))]
[JsonSerializable(typeof(TopDomainDto))]
// Device Models
[JsonSerializable(typeof(BrowserHistory.Application.Features.Devices.Models.DeviceDto))]
[JsonSerializable(typeof(BrowserHistory.Application.Features.Devices.Models.RegisterDeviceRequest))]
[JsonSerializable(typeof(BrowserHistory.Application.Features.Devices.Models.UpdateDeviceRequest))]
[JsonSerializable(typeof(BrowserHistory.Application.Features.Devices.Models.DeviceRegistrationResponse))]
[JsonSerializable(typeof(BrowserHistory.Application.Features.Devices.Models.DeviceStatusDto))]
[JsonSerializable(typeof(BrowserHistory.Application.Features.Devices.Models.GetDevicesRequest))]
[JsonSerializable(typeof(BrowserHistory.Application.Features.Devices.Models.GetDevicesResponse))]
// Page Models
[JsonSerializable(typeof(PageDto))]
[JsonSerializable(typeof(CreateOrUpdatePageRequest))]
[JsonSerializable(typeof(GetPagesRequest))]
[JsonSerializable(typeof(GetPagesResponse))]
[JsonSerializable(typeof(PageStatsDto))]
// Common Models
[JsonSerializable(typeof(BrowserHistory.Application.Common.Models.ApiResponse<object>))]
[JsonSerializable(typeof(BrowserHistory.Application.Common.Models.ApiResponse<BrowserHistory.Application.Features.Sync.Models.SubmitSyncEventsResponse>))]
[JsonSerializable(typeof(BrowserHistory.Application.Common.Models.ApiResponse<BrowserHistory.Application.Features.Sync.Models.SyncStatusDto>))]
[JsonSerializable(typeof(BrowserHistory.Application.Common.Models.ApiResponse<BrowserHistory.Application.Features.History.Models.GetHistoryResponse>))]
[JsonSerializable(typeof(BrowserHistory.Application.Common.Models.ApiResponse<BrowserHistory.Application.Features.History.Models.HistoryStatsDto>))]
[JsonSerializable(typeof(BrowserHistory.Application.Common.Models.ApiResponse<BrowserHistory.Application.Features.Devices.Models.DeviceRegistrationResponse>))]
[JsonSerializable(typeof(BrowserHistory.Application.Common.Models.ApiResponse<BrowserHistory.Application.Features.Devices.Models.DeviceStatusDto>))]
[JsonSerializable(typeof(BrowserHistory.Application.Common.Models.ApiResponse<BrowserHistory.Application.Features.Devices.Models.GetDevicesResponse>))]
[JsonSerializable(typeof(BrowserHistory.Application.Common.Models.ApiResponse<BrowserHistory.Application.Features.Pages.Models.PageDto>))]
[JsonSerializable(typeof(BrowserHistory.Application.Common.Models.ApiResponse<BrowserHistory.Application.Features.Pages.Models.GetPagesResponse>))]
[JsonSerializable(typeof(BrowserHistory.Application.Common.Models.ApiResponse<BrowserHistory.Application.Common.Models.PageStatsDto>))]
// Collections
[JsonSerializable(typeof(List<BrowserHistory.Application.Features.Sync.Models.SyncEventDto>))]
[JsonSerializable(typeof(List<BrowserHistory.Application.Features.History.Models.HistoryEntryDto>))]
[JsonSerializable(typeof(List<BrowserHistory.Application.Features.Devices.Models.DeviceDto>))]
[JsonSerializable(typeof(List<BrowserHistory.Application.Features.Pages.Models.PageDto>))]
[JsonSerializable(typeof(List<BrowserHistory.Application.Features.History.Models.DailyVisitStatsDto>))]
[JsonSerializable(typeof(List<BrowserHistory.Application.Features.History.Models.TopDomainDto>))]
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
