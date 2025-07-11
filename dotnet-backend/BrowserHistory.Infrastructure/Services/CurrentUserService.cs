using System.Security.Claims;
using BrowserHistory.Application.Common.Interfaces;
using BrowserHistory.Domain.ValueObjects;
using Microsoft.AspNetCore.Http;

namespace BrowserHistory.Infrastructure.Services;

/// <summary>
/// Service for accessing current user/device context from HTTP context
/// </summary>
public class CurrentUserService : ICurrentUserService
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public CurrentUserService(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public DeviceId? DeviceId
    {
        get
        {
            var context = _httpContextAccessor.HttpContext;
            if (context?.User?.Identity?.IsAuthenticated == true)
            {
                var deviceIdClaim = context.User.FindFirst("deviceId")?.Value;
                if (!string.IsNullOrEmpty(deviceIdClaim) && Guid.TryParse(deviceIdClaim, out var deviceGuid))
                {
                    return Domain.ValueObjects.DeviceId.From(deviceGuid);
                }
            }
            return null;
        }
    }

    public string? DeviceName
    {
        get
        {
            var context = _httpContextAccessor.HttpContext;
            if (context?.User?.Identity?.IsAuthenticated == true)
            {
                return context.User.FindFirst("deviceName")?.Value;
            }
            return null;
        }
    }

    public bool IsAuthenticated
    {
        get
        {
            var context = _httpContextAccessor.HttpContext;
            return context?.User?.Identity?.IsAuthenticated == true;
        }
    }
}
