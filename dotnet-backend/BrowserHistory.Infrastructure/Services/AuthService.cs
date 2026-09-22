using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using BrowserHistory.Application.Common.Interfaces;
using BrowserHistory.Domain.ValueObjects;
using BrowserHistory.Infrastructure.Identity;

namespace BrowserHistory.Infrastructure.Services;

/// <summary>
/// Authentication service implementation using ASP.NET Core Identity and JWT tokens.
/// </summary>
public class AuthService : IAuthService
{
    private readonly UserManager<DeviceUser> _userManager;
    private readonly IConfiguration _configuration;
    private readonly string _jwtSecret;
    private readonly string _jwtIssuer;
    private readonly string _jwtAudience;
    private readonly int _accessTokenExpiryMinutes;
    private readonly int _refreshTokenExpiryDays;

    public AuthService(
        UserManager<DeviceUser> userManager,
        IConfiguration configuration)
    {
        _userManager = userManager;
        _configuration = configuration;
        
        _jwtSecret = _configuration["Jwt:Secret"] 
            ?? throw new InvalidOperationException("JWT Secret not configured");
        _jwtIssuer = _configuration["Jwt:Issuer"] 
            ?? throw new InvalidOperationException("JWT Issuer not configured");
        _jwtAudience = _configuration["Jwt:Audience"] 
            ?? throw new InvalidOperationException("JWT Audience not configured");
        _accessTokenExpiryMinutes = int.TryParse(_configuration["Jwt:AccessTokenExpiryMinutes"], out var accessMinutes) ? accessMinutes : 60;
        _refreshTokenExpiryDays = int.TryParse(_configuration["Jwt:RefreshTokenExpiryDays"], out var refreshDays) ? refreshDays : 7;
    }

    public async Task<(DeviceId DeviceId, string AccessToken, string RefreshToken)> RegisterDeviceAsync(
        string deviceName, 
        string sharedSecret,
        CancellationToken cancellationToken = default)
    {
        // Validate shared secret against configured value
        var expectedSecret = _configuration["Auth:SharedSecret"];
        if (string.IsNullOrEmpty(expectedSecret) || expectedSecret != sharedSecret)
        {
            throw new UnauthorizedAccessException("Invalid shared secret");
        }

        // Generate new device ID
        var deviceId = DeviceId.New();
        
        // Hash the shared secret for storage
        var hashedSecret = HashSharedSecret(sharedSecret);

        // Create device user
        var deviceUser = new DeviceUser(deviceId, deviceName, hashedSecret);

        // Register the device user
        var result = await _userManager.CreateAsync(deviceUser);
        if (!result.Succeeded)
        {
            var errors = string.Join(", ", result.Errors.Select(e => e.Description));
            throw new InvalidOperationException($"Failed to register device: {errors}");
        }

        // Generate tokens
        var accessToken = GenerateAccessToken(deviceUser);
        var refreshToken = GenerateRefreshToken();

        // Store refresh token
        await _userManager.SetAuthenticationTokenAsync(
            deviceUser, 
            "BrowserHistory", 
            "RefreshToken", 
            refreshToken);

        return (deviceId, accessToken, refreshToken);
    }

    public async Task<(string AccessToken, string RefreshToken)> RefreshTokenAsync(
        string accessToken,
        CancellationToken cancellationToken = default)
    {
        // The client only ever holds its (still-valid but nearing expiry) access token - there is
        // no separate refresh-token secret handed back at registration for it to send instead - so
        // "refresh" means "prove you hold a currently-valid access token, get a new one".
        var deviceId = await ValidateTokenAsync(accessToken, cancellationToken);
        if (deviceId == null)
        {
            throw new UnauthorizedAccessException("Invalid or expired access token");
        }

        var deviceUser = await _userManager.FindByIdAsync(deviceId.Value.Value.ToString());
        if (deviceUser == null)
        {
            throw new UnauthorizedAccessException("Invalid or expired access token");
        }

        // Update last seen
        deviceUser.UpdateLastSeen();
        await _userManager.UpdateAsync(deviceUser);

        // Generate new tokens
        var newAccessToken = GenerateAccessToken(deviceUser);
        var newRefreshToken = GenerateRefreshToken();

        // Update stored refresh token
        await _userManager.RemoveAuthenticationTokenAsync(
            deviceUser, 
            "BrowserHistory", 
            "RefreshToken");
        
        await _userManager.SetAuthenticationTokenAsync(
            deviceUser, 
            "BrowserHistory", 
            "RefreshToken", 
            newRefreshToken);

        return (newAccessToken, newRefreshToken);
    }

    public Task<DeviceId?> ValidateTokenAsync(
        string accessToken,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.ASCII.GetBytes(_jwtSecret);

            var validationParameters = new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(key),
                ValidateIssuer = true,
                ValidIssuer = _jwtIssuer,
                ValidateAudience = true,
                ValidAudience = _jwtAudience,
                ValidateLifetime = true,
                ClockSkew = TimeSpan.Zero
            };

            var principal = tokenHandler.ValidateToken(accessToken, validationParameters, out _);
            var deviceIdClaim = principal.FindFirst("deviceId")?.Value;

            if (deviceIdClaim != null && Guid.TryParse(deviceIdClaim, out var deviceGuid))
            {
                return Task.FromResult<DeviceId?>(DeviceId.From(deviceGuid));
            }

            return Task.FromResult<DeviceId?>(null);
        }
        catch
        {
            return Task.FromResult<DeviceId?>(null);
        }
    }

    public async Task<(DeviceId DeviceId, string DeviceName, DateTime RegisteredAt, DateTime LastSeen, bool IsActive)?> GetDeviceInfoAsync(
        string accessToken,
        CancellationToken cancellationToken = default)
    {
        var deviceId = await ValidateTokenAsync(accessToken, cancellationToken);
        if (deviceId == null)
        {
            return null;
        }

        var deviceUser = await _userManager.FindByIdAsync(deviceId.Value.ToString());
        if (deviceUser == null)
        {
            return null;
        }

        return (deviceUser.DeviceId, deviceUser.DeviceName, deviceUser.RegisteredAt, deviceUser.LastSeen, deviceUser.IsActive);
    }

    public async Task UpdateLastSeenAsync(
        DeviceId deviceId,
        CancellationToken cancellationToken = default)
    {
        var deviceUser = await _userManager.FindByIdAsync(deviceId.Value.ToString());
        if (deviceUser != null)
        {
            deviceUser.UpdateLastSeen();
            await _userManager.UpdateAsync(deviceUser);
        }
    }

    public async Task RevokeDeviceTokensAsync(
        DeviceId deviceId,
        CancellationToken cancellationToken = default)
    {
        var deviceUser = await _userManager.FindByIdAsync(deviceId.Value.ToString());
        if (deviceUser != null)
        {
            // Remove all authentication tokens
            await _userManager.RemoveAuthenticationTokenAsync(
                deviceUser, 
                "BrowserHistory", 
                "RefreshToken");

            // Optionally deactivate the device
            deviceUser.Deactivate();
            await _userManager.UpdateAsync(deviceUser);
        }
    }

    private string GenerateAccessToken(DeviceUser deviceUser)
    {
        var tokenHandler = new JwtSecurityTokenHandler();
        var key = Encoding.ASCII.GetBytes(_jwtSecret);

        var claims = new[]
        {
            new Claim("deviceId", deviceUser.DeviceId.Value.ToString()),
            new Claim("deviceName", deviceUser.DeviceName),
            new Claim(ClaimTypes.NameIdentifier, deviceUser.Id.ToString()),
            new Claim(ClaimTypes.Name, deviceUser.UserName!),
            new Claim("jti", Guid.NewGuid().ToString()),
            new Claim("iat", DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString(), ClaimValueTypes.Integer64)
        };

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Expires = DateTime.UtcNow.AddMinutes(_accessTokenExpiryMinutes),
            Issuer = _jwtIssuer,
            Audience = _jwtAudience,
            SigningCredentials = new SigningCredentials(
                new SymmetricSecurityKey(key), 
                SecurityAlgorithms.HmacSha256Signature)
        };

        var token = tokenHandler.CreateToken(tokenDescriptor);
        return tokenHandler.WriteToken(token);
    }

    private static string GenerateRefreshToken()
    {
        var randomBytes = new byte[64];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(randomBytes);
        return Convert.ToBase64String(randomBytes);
    }

    private static string HashSharedSecret(string sharedSecret)
    {
        using var sha256 = SHA256.Create();
        var hashedBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(sharedSecret));
        return Convert.ToBase64String(hashedBytes);
    }
}
